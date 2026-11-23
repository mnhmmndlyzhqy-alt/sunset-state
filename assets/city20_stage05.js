/* SUNSET STATE / CITY20 Stage 05 — reference water, canals, shore transition.
 * Works with the original WebGL2 engine and its authored coastline mask.
 * Zero added water geometry / draw calls / textures. GPU shader changes only
 * for matId==23.0, during one-time shader construction. A/B switch:
 * ?city20waterOff=1 (applies to both water and shoreline palette).
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const disabled=typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
  new URLSearchParams(location.search).has('city20waterOff');
if(disabled)globalThis.__SUNSET_CITY20_DISABLE_STAGE05=true;
const enabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE05!==true;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const G=H.coast461, R=H.reference469;
if(!G||!R||typeof H.buildShoreMesh463!=='function')
 throw Error('CITY20 stage05 requires the cumulative Stage 04 coastal and terrain engine');
const toHex=(v)=>'#'+v.map(c=>Math.round(clamp(c,0,1)*255).toString(16).padStart(2,'0')).join('');
const blend=(v,c,t)=>v.map((x,i)=>x*(1-t)+c[i]*t);
const sourceShore=H.buildShoreMesh463;
H.buildShoreMesh463=function city20Stage05Shore(world,colorForPoint,addFallback){
 const stats={stage:5,modifiedShoreColorSamples:0,wetlandBankSamples:0,
  canalBankSamples:0,beachBankSamples:0,preservedStreetAndRoadSamples:0,
  addedLandMeshes:0,addedLandDrawCalls:0,addedTerrainTriangles:0};
 if(!enabled())return sourceShore(world,colorForPoint,addFallback);
 function waterlineColor(x,z,shore){
  const base=colorForPoint(x,z,shore);
  if(!base||shore<0||shore>43||G.roadAt(x,z)||H.onCorePavement463?.(x,z)){
   stats.preservedStreetAndRoadSamples++;return base;
  }
  const canal=x< -485&&x> -1055&&z> -570&&z<780;
  const wetland=x>165&&x<700&&z< -460;
  const isBeach=R.sandAt(x,z,shore)>.44&&x>540;
  // Damp bank transitions are gentle and spatially continuous. No random
  // objects or displacement at the zero-elevation shore/water boundary.
  const bank=1-smooth(3,34,shore);
  if(bank<=.005)return base;
  const waviness=.5+.5*Math.sin(x*.067+Math.sin(z*.032)*.7)*Math.cos(z*.061-x*.023);
  const strength=bank*(.08+.075*waviness);
  let current=H.rgb(base.color),target;
  if(wetland){target=[.27,.39,.31];stats.wetlandBankSamples++;}
  else if(canal){target=[.35,.38,.32];stats.canalBankSamples++;}
  else if(isBeach){target=[.72,.66,.49];stats.beachBankSamples++;}
  else {target=[.40,.46,.39];}
  current=blend(current,target,strength*(isBeach?1.8:1.35));
  stats.modifiedShoreColorSamples++;
  return {...base,color:toHex(current)};
 }
 const result=sourceShore(world,waterlineColor,addFallback);
 world.city20Stage05ShoreStats=stats;
 return result;
};
// One-time substitution of the EXISTING water material branch. Water depth
// mask (uCoastalDepth461) is unchanged: its shore/land test remains exact.
// This patch is not evaluated per frame in JS. It is compiled once by WebGL.
const WATER_BRANCH=String.raw`          if(matId==23.0){
            vec2 p=vPosition.xz;
            vec2 uv=p/vec2(2600.0,1920.0)+.5;
            vec2 coast=texture(uCoastalDepth461,uv).rg;
            float outside=max(abs(uv.x-.5),abs(uv.y-.5));
            if(outside<=.5&&coast.g>.56)discard;
            float deep=outside>.5?1.0:coast.r;
            float d=distance(vPosition,uCamera);
            float light=clamp(uDaylight,.38,1.0);
            // Calmer waterways derive from authored world zones AND the
            // coastline depth band, avoiding broad flat boxes over open sea.
            float nearBank=1.0-smoothstep(.23,.78,deep);
            float canals=(1.0-smoothstep(-515.0,-430.0,p.x))*
                smoothstep(-585.0,-505.0,p.y)*(1.0-smoothstep(725.0,820.0,p.y));
            float marsh=smoothstep(158.0,238.0,p.x)*
                (1.0-smoothstep(642.0,725.0,p.x))*
                (1.0-smoothstep(-510.0,-446.0,p.y));
            float sheltered=clamp((canals*.79+marsh*.91)*nearBank,0.0,.92);
            float clearWater=1.0-sheltered;
            // World-space phase warp breaks the repeated ruler-straight
            // stripes seen from aircraft. No new texture sampling or mesh.
            float bend=sin(dot(p,vec2(.0091,.0057))+uTime*.027)*.68+
                        cos(dot(p,vec2(-.0068,.0106))-uTime*.019)*.35;
            vec2 warp=p+vec2(sin(p.y*.018+p.x*.011+bend),
                              cos(p.x*.016-p.y*.009-bend))*(4.7+2.3*sheltered);
            float speed=.67-.41*sheltered;
            float phaseA=dot(warp,vec2(.131,.089))+uTime*speed;
            float phaseB=dot(warp,vec2(-.075,.173))-uTime*(.53-.33*sheltered);
            float phaseC=dot(warp,vec2(.039,-.068))+bend*.85+uTime*.23;
            // Resolve only wave frequencies represented by screen pixels.
            float antiAlias=1.0-smoothstep(.82,7.0,length(fwidth(p)));
            float near=1.0-smoothstep(230.0,870.0,d);
            float strength=mix(.94,.21,sheltered)*antiAlias;
            vec2 slope=(vec2(cos(phaseA)*.022-cos(phaseB)*.014,
                             sin(phaseA)*.014+cos(phaseB)*.012)+
                        vec2(.010,-.012)*cos(phaseC))*strength*near;
            vec3 wn=normalize(vec3(-slope.x,1.0,-slope.y));
            float fresnel=pow(1.0-clamp(dot(wn,v),0.0,1.0),4.0);
            vec3 shallow=mix(vec3(.105,.382,.382),vec3(.163,.555,.515),light);
            vec3 offshore=mix(vec3(.049,.198,.295),vec3(.083,.320,.423),light);
            vec3 water=mix(shallow,offshore,smoothstep(.045,.88,deep));
            vec3 canalColor=mix(vec3(.098,.256,.249),vec3(.132,.361,.318),light);
            vec3 marshColor=mix(vec3(.132,.257,.213),vec3(.177,.379,.305),light);
            water=mix(water,canalColor,canals*nearBank*.60);
            water=mix(water,marshColor,marsh*nearBank*.69);
            // Foam hugs the physical depth mask and uses an irregular,
            // camera-filtered breakup; no regular repeating shore stripes.
            float surfZone=smoothstep(.010,.050,deep)*
                           (1.0-smoothstep(.071,.163,deep));
            if(surfZone>.001&&d<700.0){
              float breaker=sin(phaseA*.65+phaseB*.43-bend*.87-deep*15.0);
              float irregular=smoothNoise(p*.091+vec2(bend*.48,uTime*.016));
              float spray=smoothstep(.34,.89,breaker)*
                  smoothstep(.30,.77,irregular)*surfZone*near*antiAlias;
              spray*=1.0-.86*sheltered;
              water+=vec3(.15,.225,.205)*spray;
            }
            vec3 sky=mix(vec3(.17,.29,.40),vec3(.55,.715,.79),light);
            water=mix(water,sky,.075+.49*fresnel);
            float spec=pow(max(0.0,dot(reflect(-sun,wn),v)),166.0)*near;
            water+=vec3(.84,.65,.47)*spec*.48*light*clearWater;
            float haze=smoothstep(380.0,4600.0,d);
            water=mix(water,mix(vec3(.29,.38,.46),vec3(.55,.65,.70),light),haze*.78);
            if(uUnderwater445>.5)water=mix(water,vec3(.065,.235,.28),.48);
            outputColor=vec4(water,1.0);return;
          }
`;
const OPEN='          if(matId==23.0){';
const NEXT='          float emission=max(0.0,vColor.a);';
H.city20Stage05WaterFragment=function waterFragment05(original){
 if(!enabled())return original;
 if(typeof original!=='string')throw Error('stage05 water shader input missing');
 const start=original.indexOf(OPEN),end=original.indexOf(NEXT,start);
 if(start<0||end<=start||original.indexOf(OPEN,start+OPEN.length)!==-1)
   throw Error('stage05 cannot locate the original water shader block');
 H.city20Stage05Stats={stage:5,originalWaterBranchChars:end-start,
   patchedWaterBranchChars:WATER_BRANCH.length,extraTextureSamples:0,
   extraDrawCalls:0,addedWorldGeometry:0,retainsOriginalDepthMask:true,
   regionalWaterCategories:3,oldWaterBranchIntactInSource:true};
 return original.slice(0,start)+WATER_BRANCH+original.slice(end);
};
H.city20Stage05={enabled,shaderBranch:WATER_BRANCH,stats:()=>H.city20Stage05Stats};
})(Heatline);
