/* SUNSET STATE — Stage 39: Realism Core / rendering foundation.
 *
 * Replaces the renderer's lighting foundation instead of decorating it:
 *  - HDR float scene target, exposure, filmic tonemapping and grading in post.
 *  - Linear-light, energy-aware PBR shading (GGX/Smith/Schlick + split-sum
 *    environment) for every generic material: ground, roads, lawn, trees,
 *    cars, props, people, masonry, metals and stone.
 *  - A physically based atmosphere (Rayleigh + Mie single scattering with a
 *    multiple-scattering boost) evaluated on the CPU into a sky LUT that is
 *    shared by the sky, aerial-perspective fog, ambient light and reflections,
 *    so the whole frame is lit by the same sky.
 *  - Soft Poisson PCF sun shadows with normal-offset bias and edge fade.
 *  - Procedural lit cumulus clouds, sun/moon discs, stars.
 *  - Foliage wind animation in the vertex shader.
 *  - Bloom, ground-contact AO, vignette, grain and dynamic resolution that
 *    lowers pixels (never shader quality) on weak GPUs.
 *
 * Legacy shader branches that were authored in display space are decoded into
 * the HDR buffer with the exact inverse of the final tone curve, so they keep
 * their designed look. Disable everything with ?realismOff=1.
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const OFF = params.has('realismOff');
  const RC = H.realism39 = H.realism39 || {};
  RC.version = '39.0';
  RC.enabled = !OFF;
  RC.passes = RC.passes || { opaque: [], shadow: [] };
  RC.stats = { shaderPatches: [], shaderFailures: [], hdr: false, lutBuilds: 0 };
  if (OFF || typeof WebGL2RenderingContext === 'undefined') return;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const TEX_LUT = 10;
  // Depth precision: 0.25 m near plane z-fought centimetre offsets beyond ~150 m.
  if (H.SCENE_NEAR !== undefined && H.SCENE_NEAR < .45) H.SCENE_NEAR = .45;

  /* ------------------------------------------------------------------ */
  /*  Shared GLSL                                                         */
  /* ------------------------------------------------------------------ */
  const RC_UNIFORMS = `
uniform sampler2D rcSkyLUT;
uniform vec3 rcSunDir;
uniform vec3 rcSunColor;
uniform vec3 rcSkyUp;
uniform vec3 rcSkySun;
uniform vec3 rcSkyAway;
uniform vec3 rcGround;
uniform vec4 rcFog;
uniform vec4 rcExposure;
uniform vec3 rcCam;
`;
  const RC_FUNCS = `
vec3 rcToLinear(vec3 c){return pow(max(c,vec3(0.0)),vec3(2.2));}
vec3 rcAces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
vec3 rcEmit(vec3 exposed){
#if RC_HDR
  return exposed;
#else
  return pow(rcAces(exposed),vec3(1.0/2.2));
#endif
}
vec3 rcSkyLUTSample(vec3 d){
  vec2 sh=rcSunDir.xz;float sl=length(sh);
  vec2 dh=d.xz;float dl=length(dh);
  float cosAz=(sl>1e-4&&dl>1e-4)?dot(dh/dl,sh/sl):1.0;
  float u=acos(clamp(cosAz,-1.0,1.0))*.318309886;
  float el=asin(clamp(d.y,-1.0,1.0));
  float vv=.5+.5*sign(el)*sqrt(abs(el)*.636619772);
  return texture(rcSkyLUT,vec2(u,vv)).rgb;
}
vec3 rcAmbient(vec3 n){
  vec2 sh=rcSunDir.xz;float l=length(sh);sh=l>1e-4?sh/l:vec2(1.0,0.0);
  float hor=length(n.xz);
  float side=hor>1e-3?dot(n.xz/hor,sh):0.0;
  vec3 vert=mix(rcSkyAway,rcSkySun,clamp(side*.5+.5,0.0,1.0));
  vec3 sky=n.y>=0.0?mix(vert,rcSkyUp,n.y):vert*(1.0+n.y);
  vec3 grd=n.y>=0.0?rcGround*.5*(1.0-n.y):rcGround*(.5-.5*n.y);
  return sky+grd;
}
vec3 rcEnvRadiance(vec3 r,float rough){
  vec3 up=normalize(vec3(r.x,max(r.y,.015),r.z));
  vec3 sky=rcSkyLUTSample(up);
  vec3 blurred=rcAmbient(r);
  vec3 env=mix(sky,blurred,smoothstep(.12,.72,rough));
  // The city skyline occupies the lowest part of every reflected horizon.
  float skyline=smoothstep(.30,.0,r.y)*(1.0-rcExposure.z);
  env=mix(env,env*.42+rcGround*.35,skyline*.55);
  float below=smoothstep(.03,-.14,r.y);
  return mix(env,rcGround*.85,below);
}
vec2 rcEnvBRDF(float rough,float NoV){
  const vec4 c0=vec4(-1.0,-.0275,-.572,.022);
  const vec4 c1=vec4(1.0,.0425,1.04,-.04);
  vec4 r=rough*c0+c1;
  float a004=min(r.x*r.x,exp2(-9.28*NoV))*r.x+r.y;
  return vec2(-1.04,1.04)*a004+r.zw;
}
vec3 rcFogApply(vec3 col,vec3 p){
  vec3 d=p-rcCam;float dist=length(d);
  if(dist<1.0)return col;
  vec3 dir=d/dist;
  float fh=rcFog.y;
  float base=rcFog.x*exp(-max(rcCam.y,0.0)*fh);
  float k=d.y*fh;
  float integral=abs(k)>.001?(1.0-exp(-k))/k:1.0;
  float od=base*dist*max(integral,0.0);
  float T=exp(-od);
  vec3 ins=rcSkyLUTSample(normalize(vec3(dir.x,max(dir.y,.035),dir.z)));
  ins*=1.0-.25*rcExposure.z;
  return col*T+ins*(1.0-T)*rcFog.w;
}
float rcGGX(float NoH,float a2){float d=NoH*NoH*(a2-1.0)+1.0;return a2/(3.14159265*d*d);}
float rcVis(float NoL,float NoV,float rough){
  float k=(rough+1.0)*(rough+1.0)*.125;
  return .25/((NoL*(1.0-k)+k)*(NoV*(1.0-k)+k));
}
`;
  // Inverse of the final tone curve: maps a legacy display-space colour into
  // the HDR buffer so composite(tonemap(x)) reproduces it exactly.
  const RC_DECODE = `
vec3 rcInvAces_(vec3 y){
  y=clamp(y,0.0,.985);
  vec3 a=2.43*y-2.51,b=.59*y-.03,c=.14*y;
  vec3 disc=sqrt(max(b*b-4.0*a*c,0.0));
  return (-b-disc)/(2.0*a);
}
vec3 rcDecodeLegacy_(vec3 display){return rcInvAces_(pow(clamp(display,0.0,1.0),vec3(2.2)));}
`;

  /* ------------------------------------------------------------------ */
  /*  Main world shader: new linear-light PBR tail                        */
  /* ------------------------------------------------------------------ */
  const SHADOW_FUNC = `
const vec2 rcPoisson[12]=vec2[12](
  vec2(-.326,-.406),vec2(-.840,-.074),vec2(-.696,.457),vec2(-.203,.621),
  vec2(.962,-.195),vec2(.473,-.480),vec2(.519,.767),vec2(.185,-.893),
  vec2(.507,.064),vec2(.896,.412),vec2(-.322,-.933),vec2(-.792,-.598));
uniform float rcShadowTexel;
float rcShadow(vec3 world,vec3 n,vec3 sun,float dist){
  if(uShadowsActive==0)return 1.0;
  float NoL=clamp(dot(n,sun),0.0,1.0);
  vec3 offsetPos=world+n*(rcShadowTexel*(1.4+2.0*(1.0-NoL)))+sun*rcShadowTexel*.6;
  vec4 projected=uSunViewProjection*vec4(offsetPos,1.0);
  vec3 uv=projected.xyz/max(projected.w,.0001)*.5+.5;
  float edge=max(abs(uv.x-.5),abs(uv.y-.5));
  if(edge>=.497||uv.z>=.999||uv.z<=.001)return 1.0;
  float fadeOut=smoothstep(.43,.497,edge);
  float reference=uv.z-(.00010+.00030*(1.0-NoL));
  if(uShadowsActive==3)return mix(texture(uShadow,vec3(uv.xy,reference)),1.0,fadeOut);
  float radius=(1.35+dist*.010)*rcShadowTexel/260.0;
  float sum=0.0;
  int taps=uShadowsActive==2?6:12;
  for(int i=0;i<12;i++){
    if(i>=taps)break;
    sum+=texture(uShadow,vec3(uv.xy+rcPoisson[i]*radius,reference));
  }
  return mix(sum/float(taps),1.0,fadeOut);
}
`;

  // Linear-light facades for the four procedural City20 facade families.
  const FACADE_FUNC = `
vec3 rcCityFacade(float material,vec3 n,vec3 v,vec3 sun,float dist){
  bool curtain=material==35.0, hotel=material==36.0, brick=material==38.0;
  float floorHeight=curtain?3.55:3.28;
  float height=vPosition.y-vObjectCentre.y+vWindowSize.y*.5;
  float span=vWindowSize.x;
  float front=abs(n.z)>abs(n.x)?vWindowPlane.x:vWindowPlane.y;
  vec2 plane=vec2((front+.5)*span,height);
  vec3 wallAlbedo=vColor.rgb;
  float close=1.0-smoothstep(42.0,104.0,dist);
  if(close>.004&&(!curtain||height<floorHeight||abs(n.y)>.85)){
    float grain=texture(uConcreteAlbedo,vPosition.xz*.46+vPosition.xy*.31).r;
    wallAlbedo*=mix(1.0,.89+.24*grain,close);
    if(brick&&abs(n.y)<.65){
      vec2 courses=plane/vec2(.41,.135);
      courses.x+=mod(floor(courses.y),2.0)*.5;
      vec2 edge=min(fract(courses),1.0-fract(courses));
      float unit=smoothstep(.036,.083,min(edge.x,edge.y));
      float range=1.0-smoothstep(.16,.52,length(fwidth(courses)));
      wallAlbedo=mix(wallAlbedo,mix(wallAlbedo*.81,wallAlbedo*(.90+.15*hash(floor(courses))),unit),range*close);
    }
  }
  float NoL=dot(n,sun);
  float sunUp=smoothstep(-.035,.06,sun.y);
  float vis=NoL>0.0&&sunUp>0.0?rcShadow(vPosition,n,sun,dist):0.0;
  vec3 sunLight=rcSunColor*sunUp*max(NoL,0.0)*vis;
  vec3 irr=rcAmbient(n);
  vec3 wall=rcToLinear(wallAlbedo)*(sunLight+irr);
  vec3 result=wall;
  if(abs(n.y)<=.84){
    float bays=max(2.0,floor(span/(curtain?2.72:hotel?4.45:3.72)+.5));
    float width=span/bays;
    vec2 grid=vec2(plane.x/width,height/floorHeight);
    vec2 cell=fract(grid);
    vec2 margin=min(cell,1.0-cell)*vec2(width,floorHeight);
    vec2 opening=vec2(curtain?.026:hotel?.32:width*.205,curtain?.145:hotel?.66:.71);
    vec2 edge=margin-opening;
    float reveal=min(edge.x,edge.y);
    float px=max(.012,max(fwidth(plane.x),fwidth(plane.y)));
    float angled=1.0-smoothstep(1.05,1.30,abs(n.x)+abs(n.z));
    float presence=smoothstep(floorHeight-.06,floorHeight+.12,height)*smoothstep(.05,.28,span*.5-abs(front*span))*angled;
    if(vWindowSize.y<floorHeight*1.8)presence=smoothstep(.25,.42,height);
    float aperture=smoothstep(-px,px,reveal)*presence;
    float frame=smoothstep(.036,.085+px,reveal);
    float tint=hash(floor(grid)+vObjectCentre.xz*.021);
    vec3 reflected=reflect(-v,n);
    float NoV=max(dot(n,v),.02);
    float fresnel=.04+.96*pow(1.0-NoV,5.0);
    vec3 env=rcEnvRadiance(reflected,.04+.05*tint)*mix(vec3(.80,.90,.96),vec3(.90,.95,.95),tint);
    vec3 hv=normalize(sun+v);
    float glint=rcGGX(max(dot(n,hv),0.0),.0009)*rcVis(max(NoL,0.0),NoV,.03)*max(NoL,0.0)*vis*3.14159;
    // Interior: dim daylight rooms, warm occupied rooms at night.
    vec3 interior=rcToLinear(vec3(.10,.12,.13)*(.65+tint*.45))*(irr*.55+.02);
    if(close>.03){
      float side=abs(n.z)>abs(n.x)?v.x:v.z;
      vec2 room=cell-vec2(side/width,v.y/floorHeight)*1.25/max(.38,1.0-NoV);
      float ceiling=smoothstep(.70,.93,room.y+abs(room.x-.5)*.17);
      float desk=(1.0-smoothstep(.23,.26,room.y))*smoothstep(.11,.15,room.x)*(1.0-smoothstep(.63,.74,room.x));
      interior*=1.0+ceiling*.9+desk*.4;
    }
    float occupied=step(.62,tint)*rcExposure.y;
    vec3 lamp=rcToLinear(vec3(.95,.66,.38))*occupied*(.18+.10*tint)/max(rcExposure.x,.05);
    vec3 glass=mix(interior+lamp,env,fresnel)+rcSunColor*glint*min(fresnel*4.0,1.0);
    glass*=.86+.14*smoothstep(.04,.22,reveal);
    vec3 trim=rcToLinear(vec3(.09,.10,.11))*(sunLight+irr);
    result=mix(wall,mix(trim,glass,frame),aperture);
  }
  return rcFogApply(result,vPosition)*rcExposure.x;
}
`;

  const MAIN_TAIL = `          // ===== Stage39 Realism Core: linear-light physically based shading =====
          {
          if((matId==6.0||matId==7.0||matId==20.0)&&vObjH>7.0&&abs(n.y)<.35&&dist<200.0){
            // Facade articulation: floor slabs, panel joints, rain streaks, street grime.
            float hy=vPosition.y-(vObjectCentre.y-vObjH*.5);
            float along=abs(n.x)>abs(n.z)?vPosition.z:vPosition.x;
            float fl=fract(hy/3.3);
            float fade=1.0-smoothstep(90.0,200.0,dist);
            float slab=(1.0-smoothstep(.0,.036+fwidth(fl),fl))*step(2.6,hy);
            float jd=abs(fract(along/5.6+.5)-.5)*5.6;
            float joint=1.0-smoothstep(.025,.05+fwidth(along),jd);
            albedo=mix(albedo,albedo*1.16+.02,slab*fade);
            albedo*=1.0-.09*joint*fade;
            float streak=smoothNoise(vec2(along*1.6,hy*.12));
            albedo*=1.0-.14*smoothstep(.6,.92,streak)*(1.0-fl)*fade;
            albedo*=mix(.72,1.0,smoothstep(.0,1.3,hy));
            if(slab>.5)n=normalize(n+vec3(0.0,.3,0.0));
          }
          if(matId==5.0&&dist<140.0){
            // Asphalt wear: hairline cracks and repair patches.
            vec2 pw=vPosition.xz;
            float cr=abs(smoothNoise(pw*.55)-.5)+abs(smoothNoise(pw*1.3+7.0)-.5)*.5;
            float crack=(1.0-smoothstep(.0,.022+length(fwidth(pw))*.05,cr))*smoothstep(.55,.75,smoothNoise(pw*.09+3.0));
            albedo*=1.0-.38*crack*(1.0-smoothstep(40.0,140.0,dist));
            float patchN=smoothNoise(floor(pw/vec2(3.2,2.1))*.7);
            albedo*=mix(1.0,.84+.22*patchN,step(.8,smoothNoise(pw*.03+11.0)));
          }
          vec3 albedoL=rcToLinear(clamp(albedo,0.0,1.0));
          if(matId==4.0)albedoL*=.62;
          if(matId==27.0||matId==15.0){float lum=dot(albedoL,vec3(.2126,.7152,.0722));albedoL=mix(vec3(lum),albedoL,matId==27.0?.72:.82)*(matId==27.0?.80:.90);}
          float rcVar=min(.25,max(dot(dFdx(n),dFdx(n)),dot(dFdy(n),dFdy(n))));
          rough=clamp(sqrt(rough*rough+.45*rcVar),max(rough,.045),1.0);
          float NoV=max(dot(n,v),1e-3);
          float NoL=dot(n,sun);
          float sunUp=smoothstep(-.035,.06,sun.y)*(1.0-uInterior);
          float shadowVis=1.0;
          if(NoL>0.0&&sunUp>0.0)shadowVis=rcShadow(vPosition,n,sun,dist);
          float cloudSoft=rcFog.z;
          float softVis=mix(shadowVis,1.0,cloudSoft*.55);
          vec3 sunE=rcSunColor*sunUp;
          float a=rough*rough,a2=a*a;
          vec3 F0=mix(vec3(.04),albedoL,metal);
          if(glassMat)F0=vec3(.045);
          vec3 diffuseAlbedo=albedoL*(1.0-metal);
          // Foliage, lawn and canopy occlusion: darker toward the inside/underside.
          float occl=1.0;
          if(matId==15.0){
            vec3 outward=normalize(vPosition-vObjectCentre+vec3(0.0,.001,0.0));
            occl=mix(.42,1.0,clamp(dot(n,outward)*.5+.5,0.0,1.0))*mix(.62,1.0,clamp(outward.y*.5+.5,0.0,1.0));
          }
          if(matId==27.0)occl=.86;
          vec3 color=vec3(0.0);
          if(NoL>0.0){
            vec3 hv=normalize(sun+v);
            float NoH=max(dot(n,hv),0.0),VoH=max(dot(v,hv),0.0);
            vec3 F=F0+(1.0-F0)*pow(1.0-VoH,5.0);
            vec3 spec=rcGGX(NoH,max(a2,.0004))*rcVis(NoL,NoV,rough)*F*3.14159265;
            color+=(diffuseAlbedo*(1.0-F)+min(spec,vec3(48.0)))*sunE*NoL*softVis;
          }
          if(matId==15.0||matId==27.0){
            float through=max(0.0,dot(-n,sun))*.55+pow(max(0.0,dot(-v,sun)),4.0)*.45;
            color+=albedoL*vec3(.85,1.0,.42)*sunE*through*mix(.25,1.0,softVis)*(matId==15.0?.55:.25);
          }
          if(matId==12.0){
            float wrap=max(0.0,(NoL+.4)/1.4)-max(NoL,0.0);
            color+=albedoL*vec3(1.0,.42,.28)*sunE*wrap*.75*mix(.4,1.0,softVis);
          }
          vec3 interiorIrr=rcToLinear(vec3(.39,.35,.30))*(clamp(.35+.42*n.y,.18,.82)+.63)*1.25;
          vec3 irr=mix(rcAmbient(n),interiorIrr,uInterior);
          color+=diffuseAlbedo*irr*occl;
          vec3 R=reflect(-v,n);
          vec3 env=mix(rcEnvRadiance(R,rough),interiorIrr*.6,uInterior);
          vec2 AB=rcEnvBRDF(rough,NoV);
          float specOcc=clamp(pow(NoV+occl,exp2(-16.0*rough-1.0))-1.0+occl,0.0,1.0);
          color+=env*(F0*AB.x+AB.y)*specOcc;
          // Street lamps, headlights, interior fixtures: inverse-square-like windowed falloff.
          for(int i=0;i<12;i++){
            if(i>=uLightCount)break;
            vec3 toL=uLightData[i].xyz-vPosition;
            float dL=length(toL);
            vec3 l=toL/max(dL,.001);
            float w=clamp(1.0-pow(dL/uLightData[i].w,4.0),0.0,1.0);
            float att=w*w/(1.0+dL*dL*.22);
            if(uLightCone[i].w>.0){
              vec3 beam=normalize(uLightCone[i].xyz);
              att*=smoothstep(uLightCone[i].w,min(1.0,uLightCone[i].w+.12),dot(-l,beam));
            }
            float nl=max(dot(n,l),0.0)*.92+.08;
            vec3 Lc=uLightRGB[i]*mix(1.6,2.6,uInterior);
            vec3 hl=normalize(l+v);
            float sp=rcGGX(max(dot(n,hl),0.0),max(a2,.002))*rcVis(nl,NoV,rough);
            color+=(diffuseAlbedo+F0*sp*3.14159)*Lc*nl*att;
          }
          float fresnel=pow(1.0-NoV,5.0);
          if(matId==18.0||matId==22.0){
            // Automotive clear coat over the base paint.
            float Fc=.04+.96*fresnel;
            vec3 coatEnv=rcEnvRadiance(R,.03);
            vec3 coat=coatEnv*Fc*(matId==22.0?1.0:.85);
            if(NoL>0.0){
              vec3 hv=normalize(sun+v);
              coat+=rcGGX(max(dot(n,hv),0.0),.0016)*rcVis(NoL,NoV,.06)*Fc*sunE*NoL*shadowVis*3.14159;
            }
            color=color*(1.0-Fc)+coat;
            if(matId==18.0){
              float flake=hash(floor(vPosition.xz*39.0)+floor(vPosition.y*39.0));
              color+=sunE*pow(flake,14.0)*.08*max(NoL,0.0)*shadowVis;
            }
          }else if(matId==28.0){
            float Fg=.05+.95*fresnel;
            vec3 refl=rcEnvRadiance(R,.03);
            vec3 hv=normalize(sun+v);
            float glint=NoL>0.0?rcGGX(max(dot(n,hv),0.0),.0004)*rcVis(NoL,NoV,.02)*NoL*shadowVis*3.14159:0.0;
            color=diffuseAlbedo*irr*.18+refl*mix(.20,1.0,Fg)+sunE*glint*Fg;
          }else if(glassMat){
            float Fg=.05+.95*fresnel;
            vec3 refl=rcEnvRadiance(R,.04)*mix(vec3(.80,.90,.97),albedoL*.9+.25,.35);
            color=mix(color*.55,refl,clamp(Fg*1.25+.12,0.0,1.0));
          }else if(matId==3.0){
            color+=env*albedoL*.25*(1.0-rough);
          }
          if(matId==5.0&&puddle>.001){
            float Fw=.02+.98*fresnel;
            vec3 wetRefl=rcEnvRadiance(reflect(-v,vec3(0.0,1.0,0.0)),.02);
            color=mix(color,color*.55+wetRefl*Fw*1.4,puddle);
            if(NoL>0.0){
              vec3 hv=normalize(sun+v);
              color+=sunE*rcGGX(max(hv.y,0.0),.0006)*Fw*puddle*shadowVis*.9;
            }
          }
          color=mix(rcFogApply(color,vPosition),color,uInterior);
          color*=rcExposure.x;
          float night=rcExposure.y;
          if(matId==11.0)color+=albedoL*(.10+night*1.9);
          if(emission>.0)color+=albedoL*emission*mix(.85,2.6,max(night,uInterior*.5));
          if(matId==9.0||matId==10.0)color=albedoL*mix(.7,3.2,night);
          color+=vec3(.42,.46,.55)*uWeather.z*.55;
          float shaft=(.64+.36*(1.0-fresnel))*mix(.53,1.0,night);
          float alphaOut=matId==9.0?.12*shaft:matId==10.0?.15*shaft:matId==8.0?.46:matId==16.0?.16+fresnel*.23:1.0;
          if(uUnderwater445>.5){
            float fogWater=1.0-exp(-dist*.076);
            color=mix(color*vec3(.55,.80,.82),vec3(.012,.07,.085),fogWater*.96);
            float caustic=sin(vPosition.x*3.81+sin(vPosition.z*2.36)+uTime*1.57)*sin(vPosition.z*4.6+uTime*.63);
            color+=vec3(.02,.06,.05)*smoothstep(.6,.99,caustic)*(1.0-fogWater)*max(.18,abs(n.y));
          }
          outputColor=vec4(rcEmit(color),alphaOut);
          rcLinear_=true;
          }
        }`;

  const BLOCK34 = `          if(matId==34.0){
            vec2 face=abs(n.y)>.65?vPosition.xz:abs(n.x)>abs(n.z)?vPosition.zy:vPosition.xy;
            float fine=1.0-smoothstep(31.0,mix(85.0,187.0,uQuality),dist);
            vec3 concrete=vColor.rgb;
            if(fine>.002){
              vec2 slab=face/vec2(5.80,4.38),cell=fract(slab),edges=min(cell,1.0-cell);
              vec2 aa=fwidth(slab)*.68+.003;
              vec2 seam=smoothstep(vec2(.007)-aa,vec2(.020)+aa,edges);
              float batch=hash(floor(slab));
              float aggregate=texture(uConcreteAlbedo,face*.49).r;
              float dirt=smoothNoise(face*vec2(.28,.33));
              concrete*=mix(1.0,(.85+batch*.105+aggregate*.15+dirt*.046)*mix(.77,1.0,seam.x*seam.y),fine);
            }
            rcOverride=vec4(concrete,mix(.78,.55,uWeather.y));rcOverrideMetal=0.0;
          }
`;
  const BLOCK30 = `          if(matId>=30.0&&matId<=32.0){
            float fineRange=mix(74.0,168.0,smoothstep(.55,.88,uQuality));
            float distanceFade=1.0-smoothstep(fineRange*.48,fineRange,dist);
            vec2 surface=abs(n.y)>.69?vPosition.xz:abs(n.x)>abs(n.z)?vPosition.zy:vPosition.xy;
            if(matId==30.0){
              vec3 mineral=vColor.rgb*vec3(1.07,1.02,.96);
              if(distanceFade>.001){
                float flow=smoothNoise(surface*vec2(.26,1.6));
                float bed=sin(surface.y*15.8+flow*3.1);
                float veins=smoothstep(.36,.82,bed)*smoothstep(.33,.65,flow);
                vec2 panel=surface/vec2(1.84,.99),grid=fract(panel);
                float slab=hash(floor(panel));
                float joint=smoothstep(.009,.037,min(min(grid.x,1.0-grid.x),min(grid.y,1.0-grid.y)));
                mineral=mix(mineral,vec3(.51,.41,.30),veins*distanceFade*.25);
                mineral*=mix(1.0,.91+.14*slab,distanceFade)*mix(.76,1.0,mix(1.0,joint,distanceFade));
              }
              rcOverride=vec4(clamp(mineral,0.0,1.0),.52);rcOverrideMetal=0.0;
            }else{
              vec3 finish=matId==32.0?vec3(.86,.60,.38):mix(vec3(.86,.88,.90),clamp(vColor.rgb*1.35,0.0,1.0),.45);
              float streak=distanceFade>.001?(sin(surface.y*42.0+surface.x*.82)*.5+.5)*distanceFade:0.0;
              rcOverride=vec4(finish*(.94+.06*streak),matId==32.0?.36:.27+.06*streak);rcOverrideMetal=1.0;
            }
          }
`;

  const WATER39 = `          if(matId==23.0){
            vec2 p=vPosition.xz;
            vec2 cuv=p/vec2(2600.0,1920.0)+.5;
            vec2 coast=texture(uCoastalDepth461,cuv).rg;
            float outside=max(abs(cuv.x-.5),abs(cuv.y-.5));
            if(outside<=.5&&coast.g>.56)discard;
            float deep=outside>.5?1.0:coast.r;
            float d=distance(vPosition,uCamera);
            float canals=(1.0-smoothstep(-515.0,-430.0,p.x))*smoothstep(-585.0,-505.0,p.y)*(1.0-smoothstep(725.0,820.0,p.y));
            float marsh=smoothstep(158.0,238.0,p.x)*(1.0-smoothstep(642.0,725.0,p.x))*(1.0-smoothstep(-510.0,-446.0,p.y));
            float calm=clamp((canals*.8+marsh*.9)*(1.0-smoothstep(.23,.78,deep)),0.0,.9);
            float wind=.55+clamp(uWeather.w,0.0,1.5)*.6+uWeather.y*.4;
            float amp=mix(1.0,.25,calm)*wind;
            // Directional wind-wave spectrum (analytic slopes), filtered by pixel footprint.
            float foot=length(fwidth(p));
            vec2 slope=vec2(0.0);
            vec2 dirs[6]=vec2[6](vec2(.94,.34),vec2(.71,-.70),vec2(.20,.98),vec2(-.55,.83),vec2(.99,-.12),vec2(-.31,-.95));
            float lens[6]=float[6](38.0,23.0,14.0,8.6,4.9,2.7);
            float wsum=0.0;
            for(int i=0;i<6;i++){
              float k=6.2831853/lens[i];
              float aa=1.0-smoothstep(.15,.5,foot*k*.25);
              float c=sqrt(9.81/k);
              float ph=dot(dirs[i],p)*k-uTime*c*k+float(i)*1.7;
              float a=.0085*lens[i]*.5*aa;
              slope+=dirs[i]*cos(ph)*a*k;
              wsum+=sin(ph)*a;
            }
            vec2 q=p*1.9+vec2(uTime*.6,-uTime*.45);
            float rip=smoothNoise(q)-smoothNoise(q*1.7+3.1);
            slope+=vec2(rip,smoothNoise(q.yx*1.3)-.5)*.035*(1.0-smoothstep(.04,.25,foot));
            slope*=amp*(1.0-smoothstep(600.0,2600.0,d)*.7);
            vec3 wn=normalize(vec3(-slope.x,1.0,-slope.y));
            float NoV=max(dot(wn,v),.02);
            float F=.02+.98*pow(1.0-NoV,5.0);
            vec3 R=reflect(-v,wn);R.y=abs(R.y);
            vec3 refl=rcEnvRadiance(R,.03);
            float sunUp=smoothstep(-.035,.06,sun.y);
            float NoL=max(dot(wn,sun),0.0);
            vec3 hv=normalize(sun+v);
            float rgh=clamp(.06+.05*wind+foot*.004,.05,.3);
            float glint=rcGGX(max(dot(wn,hv),0.0),pow(rgh,4.0))*rcVis(NoL,NoV,rgh)*F*NoL*3.14159;
            // Water body: absorption/scattering, turquoise shallows to deep ocean blue.
            vec3 shallowC=vec3(.040,.205,.185),deepC=vec3(.004,.030,.055);
            vec3 body=mix(shallowC,deepC,smoothstep(.04,.85,deep))*(rcSkyUp*.9+rcSunColor*max(sun.y,0.0)*.35);
            body+=vec3(.02,.10,.08)*rcSunColor*sunUp*pow(max(0.0,dot(-v,sun)),3.0)*(.5+wsum*4.0)*.25;
            vec3 col=mix(body,refl,F)+rcSunColor*sunUp*min(glint,60.0);
            // Breaking foam along the shore.
            float shore=outside>.5?0.0:smoothstep(.36,.54,coast.g);
            float foamN=smoothNoise(p*.45+vec2(uTime*.35,0.0))*.6+smoothNoise(p*1.3-uTime*.25)*.4;
            float foam=shore*smoothstep(.45,.75,foamN+.25*sin(deep*70.0-uTime*1.6))*(1.0-calm*.7);
            col=mix(col,(rcSkyUp+rcSunColor*max(sun.y,0.0))*.75,foam*.65);
            col=rcFogApply(col,vPosition)*rcExposure.x;
            if(uUnderwater445>.5)col=mix(col,vec3(.01,.06,.075)*rcExposure.x,.5);
            outputColor=vec4(rcEmit(col),1.0);rcLinear_=true;return;
          }
`;
  const TOWER29 = `          if(matId==29.0){
            float face=abs(n.x)>.65?vPosition.z:vPosition.x;
            float pane=fract(face/2.36),pixel=fwidth(face),index=floor(face/2.36);
            float seam=min(pane,1.0-pane)*2.36;
            float frame=(1.0-smoothstep(.037,.071+pixel,seam))*(1.0-smoothstep(.08,.40,pixel));
            float height=vPosition.y-vObjectCentre.y+vWindowSize.y*.5;
            float floorIndex=floor(height/3.55);
            float band=fract(height/3.55),floorPixel=fwidth(height);
            float spandrel=(1.0-smoothstep(.10,.15+floorPixel*.17,band))*step(5.0,vWindowSize.y);
            float grade=hash(vec2(index,vObjectCentre.y+floorIndex));
            vec3 pn=normalize(n+vec3(n.z,0.0,-n.x)*(grade-.5)*.04);
            float NoV=max(dot(pn,v),.02);
            float F=mix(.18,1.0,pow(1.0-NoV,5.0));
            vec3 env=rcEnvRadiance(reflect(-v,pn),.02)*mix(vec3(.62,.80,.90),clamp(vColor.rgb*1.3+.15,0.0,1.0),.3);
            float sunUp=smoothstep(-.035,.06,sun.y);
            float NoL=max(dot(pn,sun),0.0);
            float vis=NoL>0.0&&sunUp>0.0?rcShadow(vPosition,n,sun,dist):0.0;
            vec3 hv=normalize(sun+v);
            float glint=rcGGX(max(dot(pn,hv),0.0),.00004)*rcVis(NoL,NoV,.015)*NoL*3.14159*F;
            vec3 inside=rcToLinear(vColor.rgb*.22)*rcAmbient(n)*.35;
            float occupied=step(.68,hash(vec2(index*1.7,floorIndex)))*rcExposure.y;
            inside+=rcToLinear(vec3(.95,.72,.45))*occupied*.24/max(rcExposure.x,.05);
            vec3 glass=mix(inside,env,F)+rcSunColor*sunUp*min(glint,80.0)*vis;
            vec3 lit=rcAmbient(n)+rcSunColor*max(dot(n,sun),0.0)*vis*sunUp;
            vec3 col=mix(glass,rcToLinear(vColor.rgb*.55)*lit*.7+env*.06,spandrel*.85);
            col=mix(col,rcToLinear(vec3(.20,.22,.23))*lit,frame*.85);
            outputColor=vec4(rcEmit(rcFogApply(col,vPosition)*rcExposure.x),1.0);rcLinear_=true;return;
          }
`;
  const WINDOW_FUNC = `
vec3 rcWindow(vec3 n,vec3 v,float seed,float feature,float dist){
  vec2 uv=vWindowPlane+.5;
  vec2 edge=min(uv,1.0-uv)*vWindowSize;
  float reveal=min(edge.x,edge.y);
  float panes=clamp(floor(vWindowSize.x/1.78+.20),1.0,26.0);
  float floors=clamp(floor(vWindowSize.y/3.48+.14),1.0,32.0);
  vec2 sections=vec2(panes,floors);
  vec2 panel=fract(uv*sections);
  vec2 pe=min(panel,1.0-panel)*vWindowSize/sections;
  float pixel=max(.006,max(fwidth(uv.x)*vWindowSize.x,fwidth(uv.y)*vWindowSize.y));
  float detail=(1.0-smoothstep(74.0,202.0,dist))*(1.0-smoothstep(.040,.186,pixel));
  float vertical=panes>1.0?(1.0-smoothstep(.021,.041+pixel,pe.x))*.68:0.0;
  float horizontal=floors>1.0?(1.0-smoothstep(.050,.107+pixel,pe.y))*.56:0.0;
  float frame=max(max(vertical,horizontal),1.0-smoothstep(.028,.079+pixel,reveal))*detail;
  float paneIndex=floor(uv.x*panes)+floor(uv.y*floors)*.419;
  float occ=fract(seed*17.93+paneIndex*.414);
  vec3 pn=normalize(n+vec3(n.z,0.0,-n.x)*(occ-.5)*.03);
  float NoV=max(dot(pn,v),.02);
  float F=mix(.08,1.0,pow(1.0-NoV,5.0));
  vec3 env=rcEnvRadiance(reflect(-v,pn),.03)*vec3(.80,.90,.95);
  vec3 amb=rcAmbient(n);
  vec3 interior=rcToLinear(vec3(.05,.06,.065))*(amb*.5+.01);
  float blinds=step(.46,occ)*step(.52+occ*.34,panel.y);
  interior=mix(interior,rcToLinear(vec3(.30,.26,.21))*amb*.4,blinds*.7);
  float lit=step(.70,occ+.17*feature);
  vec3 lamp=mix(vec3(.95,.62,.33),vec3(.62,.80,.92),step(.80,fract(seed*11.67)));
  interior+=rcToLinear(lamp)*lit*rcExposure.y*.22/max(rcExposure.x,.05);
  vec3 sun=rcSunDir;float sunUp=smoothstep(-.035,.06,sun.y);
  float NoL=max(dot(pn,sun),0.0);vec3 hv=normalize(sun+v);
  float glint=rcGGX(max(dot(pn,hv),0.0),.00008)*rcVis(NoL,NoV,.02)*NoL*3.14159*F;
  vec3 glass=mix(interior,env,F)+rcSunColor*sunUp*min(glint,40.0);
  vec3 trim=rcToLinear(vec3(.20,.21,.21))*(amb+rcSunColor*max(dot(n,sun),0.0)*sunUp*.8);
  return rcFogApply(mix(glass,trim,frame),vPosition)*rcExposure.x;
}
`;
  function between(src, start, end) {
    const i = src.indexOf(start);
    if (i < 0 || src.indexOf(start, i + start.length) >= 0) throw Error('anchor not unique: ' + start.slice(0, 40));
    const j = src.indexOf(end, i + start.length);
    if (j < 0) throw Error('end anchor missing: ' + end.slice(0, 40));
    return [i, j];
  }
  function replaceUnique(src, anchor, replacement) {
    const i = src.indexOf(anchor);
    if (i < 0 || src.indexOf(anchor, i + anchor.length) >= 0) throw Error('anchor not unique: ' + anchor.slice(0, 50));
    return src.slice(0, i) + replacement + src.slice(i + anchor.length);
  }

  function patchMainFragment(src, hdr) {
    let s = src;
    // 1. HDR output wrapper.
    s = replaceUnique(s, '        out vec4 outputColor;', '        layout(location=0) out vec4 rcFragOut_;\n        vec4 outputColor;\n        bool rcLinear_=false;');
    // 2. Realism uniforms + functions.
    s = replaceUnique(s, '        uniform int uShadowsActive;',
      '        uniform int uShadowsActive;\n' + '        flat in float vObjH;\n' + RC_UNIFORMS + RC_FUNCS + SHADOW_FUNC + RC_DECODE);
    // 3. Material overrides for travertine / metals / sealed concrete.
    s = replaceUnique(s, '          float matId=floor(materialKey+.001);',
      '          float matId=floor(materialKey+.001);\n          vec4 rcOverride=vec4(-1.0);float rcOverrideMetal=0.0;');
    let [a, b] = between(s, '          if(matId==34.0){', '          if(matId==29.0){');
    s = s.slice(0, a) + BLOCK34 + s.slice(b);
    [a, b] = between(s, '          if(matId==29.0){', '          if(matId>=30.0&&matId<=32.0){');
    s = s.slice(0, a) + TOWER29 + s.slice(b);
    s = replaceUnique(s, '            outputColor=vec4(buildingWindow(n,v,hash(vObjectCentre.xz+vObjectCentre.y*vec2(2.83,.79)),fract(materialKey),dist),1.0);',
      '            outputColor=vec4(rcEmit(rcWindow(n,v,hash(vObjectCentre.xz+vObjectCentre.y*vec2(2.83,.79)),fract(materialKey),dist)),1.0);rcLinear_=true;');
    [a, b] = between(s, '          if(matId>=30.0&&matId<=32.0){', '          if(matId==17.0){');
    s = s.slice(0, a) + BLOCK30 + s.slice(b);
    [a, b] = between(s, '          if(matId==23.0){', '          float emission=max(0.0,vColor.a);');
    s = s.slice(0, a) + WATER39 + s.slice(b);
    s = replaceUnique(s, '          vec3 albedo=vColor.rgb;',
      `          vec3 albedo=vColor.rgb;
          if(rcOverride.x>=0.0){albedo=rcOverride.rgb;rough=rcOverride.a;metal=rcOverrideMetal;}
          if(matId==15.0&&dist<220.0){
            // Leaf clusters: break the smooth crown silhouette and bend normals per cluster.
            vec3 q=vPosition*2.6;
            float leafN=smoothNoise(q.xz+q.y*.7)*.6+smoothNoise(q.xy*1.9+q.zx*.4)*.4;
            float rim=smoothstep(.45,.92,1.0-abs(dot(normalize(vNormal),v)));
            if(leafN<rim*.62*(1.0-smoothstep(120.0,220.0,dist)))discard;
            vec3 cl=vec3(smoothNoise(q.xz*1.7),smoothNoise(q.zy*1.7+5.0),smoothNoise(q.xy*1.7+9.0))-.5;
            n=normalize(n+cl*1.1*(1.0-smoothstep(60.0,200.0,dist)));
            albedo*=.82+.36*smoothNoise(q.xz*3.3+q.y);
          }`);
    // 4. Facades in linear light.
    s = replaceUnique(s, '            outputColor=vec4(cityFacade473(matId,n,v,sun,dist),1.0);',
      '            outputColor=vec4(rcEmit(rcCityFacade(matId,n,v,sun,dist)),1.0);rcLinear_=true;');
    // 5. New generic tail.
    const tailStart = s.indexOf('          vec3 h=normalize(v+sun);');
    if (tailStart < 0 || s.indexOf('          vec3 h=normalize(v+sun);', tailStart + 5) >= 0) throw Error('tail anchor');
    s = s.slice(0, tailStart) + MAIN_TAIL;
    // 6. Legacy main -> helper, new main encodes for the HDR target.
    const mainIdx = s.lastIndexOf('        void main(){');
    if (mainIdx < 0) throw Error('main missing');
    s = s.slice(0, mainIdx) + FACADE_FUNC + WINDOW_FUNC + '        void rcLegacyMain_(){' + s.slice(mainIdx + '        void main(){'.length);
    s += `
        void main(){
          outputColor=vec4(0.0,0.0,0.0,1.0);
          rcLegacyMain_();
          vec3 c=outputColor.rgb;
#if RC_HDR
          if(!rcLinear_)c=rcDecodeLegacy_(c);
#endif
          if(any(isnan(c))||any(isinf(c)))c=vec3(0.0);
          rcFragOut_=vec4(c,clamp(outputColor.a,0.0,1.0));
        }`;
    s = s.replace('#version 300 es', '#version 300 es\n#define RC_HDR ' + (hdr ? 1 : 0));
    return s;
  }

  function patchMainVertex(src) {
    let s = replaceUnique(src, '        uniform mat4 uViewProj;',
      '        uniform mat4 uViewProj;\n        uniform float uTime; uniform vec4 uWeather;\n        invariant gl_Position;');
    s = replaceUnique(s, '          vColor=iColor;', '          vColor=iColor;vObjH=length(iCol1.xyz);');
    s = replaceUnique(s, '        out vec3 vNormal; out vec3 vPosition; out vec4 vColor;', '        out vec3 vNormal; out vec3 vPosition; out vec4 vColor; flat out float vObjH;');
    s = replaceUnique(s, '          vec4 p=model*vec4(aPosition,1.0);', `          vec4 p=model*vec4(aPosition,1.0);
          if(iColor.a<-14.5&&iColor.a>-15.5){
            // Stage39: canopy sways as a whole and individual leaves flutter.
            float hgt=clamp(aPosition.y+.5,0.0,1.0);
            float wind=.30+clamp(uWeather.w,0.0,1.5)*1.25;
            float size=min(length(iCol1.xyz),7.0);
            float ph=uTime*1.35+dot(iCol3.xz,vec2(.19,.23));
            vec2 sway=vec2(sin(ph)+.35*sin(ph*2.31+1.1),cos(ph*.83)+.30*sin(ph*1.87))*.050*wind;
            float flutter=sin(uTime*6.7+dot(p.xyz,vec3(3.1,2.3,2.7)))*.022*wind;
            p.xz+=sway*hgt*hgt*size*.22+vec2(flutter)*hgt;
            p.y+=flutter*.6*hgt;
          }`);
    return s;
  }

  /* ------------------------------------------------------------------ */
  /*  Sky                                                                 */
  /* ------------------------------------------------------------------ */
  function skyFragment(hdr) {
    return `#version 300 es
// RC-NATIVE sky
#define RC_HDR ${hdr ? 1 : 0}
precision highp float;
uniform vec2 uResolution;
uniform float uSkyField,uSkyQuality;
uniform vec3 uSkyFW,uSkyRight,uSkyUp; uniform float uDaylight; uniform float uUnderwater445;
uniform vec4 uWeather; uniform vec3 uSunDirection; uniform float uTime;
uniform sampler2D uSkyTexture;
${RC_UNIFORMS}
${RC_FUNCS}
out vec4 outputColor;
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.0;mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){s+=a*vnoise(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=(gl_FragCoord.xy/uResolution)*2.0-1.0;
  vec3 ray=normalize(uSkyFW+uSkyRight*uv.x*(uResolution.x/uResolution.y)*uSkyField+uSkyUp*uv.y*uSkyField);
  if(uUnderwater445>.5){
    vec3 gradient=mix(vec3(.004,.030,.040),vec3(.035,.17,.19),smoothstep(-.44,.69,ray.y));
    outputColor=vec4(rcEmit(gradient*rcExposure.x*2.0),1.0);return;
  }
  vec3 sky=rcSkyLUTSample(ray);
  float night=rcExposure.y;
  float cloudCover=uWeather.x;
  // Stars, strongest straight up and on clear nights.
  if(night>.01&&ray.y>0.0){
    vec2 cell=vec2(atan(ray.z,ray.x)*420.0,asin(ray.y)*420.0);
    vec2 id=floor(cell);
    float h=hash12(id);
    float star=step(.9965,h)*smoothstep(.45,.0,length(fract(cell)-.5));
    float tw=.65+.35*sin(uTime*(2.0+h*5.0)+h*40.0);
    sky+=vec3(.75,.82,1.0)*star*tw*.06*night*(1.0-cloudCover)*smoothstep(.0,.25,ray.y);
  }
  // Sun disc with limb darkening, moon disc opposite.
  float cs=dot(ray,rcSunDir);
  float sunR=.00012;
  float disc=smoothstep(1.0-sunR*1.25,1.0-sunR*.75,cs);
  float limb=sqrt(max(0.0,1.0-(1.0-cs)/sunR));
  vec3 moonDir=normalize(vec3(-rcSunDir.x,abs(rcSunDir.y)*.8+.25,-rcSunDir.z*.6+.3));
  float cm=dot(ray,moonDir);
  float moon=smoothstep(.99985,.99992,cm)*night;
  // Fair-weather cumulus layer, lit from the sun with self shadowing.
  float clouds=0.0;vec3 cloudCol=vec3(0.0);
  if(ray.y>.005){
    float t=1650.0/ray.y;
    vec2 wind=vec2(uTime*(6.0+uWeather.w*18.0),uTime*2.0);
    vec2 p=(ray.xz*t+wind)*.00042;
    float coverage=mix(.36,.96,cloudCover);
    float n=fbm(p);
    float dens=smoothstep(1.0-coverage,1.0-coverage+.32,n);
    if(dens>.002){
      vec2 sh=rcSunDir.xz;float sl=length(sh);sh=sl>1e-4?sh/sl:vec2(1.0,0.0);
      float n2=fbm(p+sh*.09*(1.0-rcSunDir.y));
      float selfShadow=exp(-max(0.0,n2-n+.06)*7.0);
      float phase=.55+.45*pow(max(0.0,cs),6.0)+.6*pow(max(0.0,cs),32.0);
      vec3 sunLit=rcSunColor*selfShadow*phase*.80;
      vec3 ambient=rcSkyUp*1.05+rcGround*.25;
      float thick=mix(.55,1.0,dens);
      cloudCol=(sunLit+ambient)*mix(1.0,.55,thick*cloudCover);
      cloudCol=mix(cloudCol,(rcSkyUp+rcSunColor*.06)*.85,cloudCover*.55);
      float horizonFade=smoothstep(.0,.16,ray.y);
      clouds=dens*horizonFade;
      // Distant clouds take on the haze of the atmosphere in front of them.
      cloudCol=mix(cloudCol,sky,1.0-exp(-t*.00006));
    }
  }
  vec3 sunRad=rcSunColor*mix(.4,1.0,limb)*1400.0*disc;
  vec3 col=mix(sky,cloudCol,clouds*.96);
  col+=sunRad*(1.0-clouds)*(1.0-cloudCover*.92);
  col+=vec3(.55,.58,.62)*moon*(1.0-clouds)*.35;
  col+=vec3(.36,.43,.56)*uWeather.z*.6;
  outputColor=vec4(rcEmit(min(col*rcExposure.x,vec3(60000.0))),1.0);
}`;
  }

  /* ------------------------------------------------------------------ */
  /*  Generic legacy fragment wrapper                                     */
  /* ------------------------------------------------------------------ */
  function wrapLegacyFragment(src) {
    const re = /\bout\s+vec4\s+([A-Za-z_]\w*)\s*;/g;
    const all = [...src.matchAll(re)];
    if (all.length !== 1) return null;
    const name = all[0][1];
    const mains = src.match(/void\s+main\s*\(\s*\)/g);
    if (!mains || mains.length !== 1) return null;
    let s = src.replace(all[0][0], `layout(location=0) out vec4 rcFragOut_;\nvec4 ${name};`);
    s = s.replace(/void\s+main\s*\(\s*\)/, 'void rcLegacyMain_()');
    s += `\n${RC_DECODE}\nvoid main(){${name}=vec4(0.0,0.0,0.0,1.0);rcLegacyMain_();vec3 rcC_=rcDecodeLegacy_(${name}.rgb);if(any(isnan(rcC_)))rcC_=vec3(0.0);rcFragOut_=vec4(rcC_,${name}.a);}\n`;
    return s;
  }

  /* ------------------------------------------------------------------ */
  /*  shaderSource interception with safe compile fallback                */
  /* ------------------------------------------------------------------ */
  const nativeShaderSource = WebGL2RenderingContext.prototype.shaderSource;
  function gameContext(gl) {
    try { return gl.canvas && gl.canvas.id === 'game'; } catch { return false; }
  }
  function hdrCapable(gl) {
    if (gl.__rcHdr !== undefined) return gl.__rcHdr;
    let ok = false;
    try {
      ok = !!gl.getExtension('EXT_color_buffer_float');
      if (ok) {
        const t = gl.createTexture(), f = gl.createFramebuffer();
        const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING), prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
        gl.bindTexture(gl.TEXTURE_2D, prevTex);
        gl.deleteFramebuffer(f); gl.deleteTexture(t);
      }
    } catch { ok = false; }
    if (params.has('realismLdr')) ok = false;
    gl.__rcHdr = ok;
    RC.stats.hdr = ok;
    return ok;
  }
  function compiles(gl, type, source) {
    const test = gl.createShader(type);
    nativeShaderSource.call(gl, test, source);
    gl.compileShader(test);
    const ok = gl.getShaderParameter(test, gl.COMPILE_STATUS);
    const log = ok ? '' : gl.getShaderInfoLog(test);
    gl.deleteShader(test);
    return { ok, log };
  }
  RC.transformShader = function (gl, type, source) {
    if (!RC.enabled || typeof source !== 'string' || !gameContext(gl)) return source;
    if (source.includes('RC-NATIVE')) return source;
    const hdr = hdrCapable(gl);
    let out = null, label = '';
    try {
      if (type === gl.VERTEX_SHADER) {
        if (source.includes('flat out vec3 vDistanceBands;flat out vec3 vObjectCentre;')) { out = patchMainVertex(source); label = 'main-vs'; }
      } else {
        if (source.includes('flat in vec3 vDistanceBands;flat in vec3 vObjectCentre;')) { out = patchMainFragment(source, hdr); label = 'main-fs'; }
        else if (source.includes('uniform sampler2D uSkyTexture;') && source.includes('uSkyField')) { out = skyFragment(hdr); label = 'sky-fs'; }
        else if (source.includes('uniform sampler2D sceneColor,sceneDepth')) { out = null; }
        else if (hdr) { out = wrapLegacyFragment(source); label = 'legacy-fs'; }
      }
    } catch (error) {
      RC.stats.shaderFailures.push({ label, error: String(error) });
      console.warn('[Realism39] shader patch skipped', label, error);
      return source;
    }
    if (!out) return source;
    const test = compiles(gl, type, out);
    if (!test.ok) {
      RC.stats.shaderFailures.push({ label, error: test.log });
      console.warn('[Realism39] patched shader failed to compile, using original:', label, test.log);
      return source;
    }
    RC.stats.shaderPatches.push(label);
    return out;
  };
  WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
    let transformed = source;
    try {
      if (RC.enabled && gameContext(this)) {
        const type = this.getShaderParameter(shader, this.SHADER_TYPE);
        transformed = RC.transformShader(this, type, source);
      }
    } catch (error) { transformed = source; }
    return nativeShaderSource.call(this, shader, transformed);
  };

  /* ------------------------------------------------------------------ */
  /*  Atmosphere: physically based sky LUT on the CPU                     */
  /* ------------------------------------------------------------------ */
  const ATM = {
    R0: 6360e3, RT: 6420e3, h0: 45,
    betaR: [5.802e-6, 13.558e-6, 33.1e-6], HR: 8000,
    betaM: 11.0e-6, betaMExt: 12.2e-6, HM: 1400, g: .80,
    ozone: [0.65e-6, 1.881e-6, 0.085e-6],
    E0: 9.2, MS: 1.85, groundAlbedo: .16
  };
  function lightDepth(px, py, pz, sx, sy, sz) {
    // Optical depth from p to the top of the atmosphere along s; null if Earth blocks it.
    const b = px * sx + py * sy + pz * sz;
    const r2 = px * px + py * py + pz * pz;
    const cg = r2 - ATM.R0 * ATM.R0, dg = b * b - cg;
    if (dg > 0 && -b - Math.sqrt(dg) > 0) return null;
    const ct = r2 - ATM.RT * ATM.RT, t = -b + Math.sqrt(Math.max(0, b * b - ct));
    const N = 6; let oR = 0, oM = 0;
    for (let i = 0; i < N; i++) {
      const tt = t * (i + .5) / N, dt = t / N;
      const x = px + sx * tt, y = py + sy * tt, z = pz + sz * tt;
      const h = Math.sqrt(x * x + y * y + z * z) - ATM.R0;
      oR += Math.exp(-h / ATM.HR) * dt; oM += Math.exp(-h / ATM.HM) * dt;
    }
    return [oR, oM];
  }
  function transmittanceSun(sx, sy, sz) {
    const d = lightDepth(0, ATM.R0 + ATM.h0, 0, sx, sy, sz);
    if (!d) return [0, 0, 0];
    return [0, 1, 2].map(c => Math.exp(-(ATM.betaR[c] * d[0] + ATM.betaMExt * d[1] + ATM.ozone[c] * d[0] * .4)));
  }
  function singleScatter(dx, dy, dz, sx, sy, sz, out) {
    const oy = ATM.R0 + ATM.h0;
    const b = dy * oy;
    const tTop = -b + Math.sqrt(Math.max(0, b * b - (oy * oy - ATM.RT * ATM.RT)));
    const dg = b * b - (oy * oy - ATM.R0 * ATM.R0);
    let tEnd = tTop, ground = false;
    if (dg > 0) { const tg = -b - Math.sqrt(dg); if (tg > 0) { tEnd = tg; ground = true; } }
    const N = 22; let vR = 0, vM = 0;
    const sR = [0, 0, 0], sM = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const t0 = tEnd * (i / N) ** 2, t1 = tEnd * ((i + 1) / N) ** 2, t = (t0 + t1) * .5, dt = t1 - t0;
      const x = dx * t, y = oy + dy * t, z = dz * t;
      const h = Math.sqrt(x * x + y * y + z * z) - ATM.R0;
      const hr = Math.exp(-h / ATM.HR) * dt, hm = Math.exp(-h / ATM.HM) * dt;
      vR += hr * .5; vM += hm * .5;
      const l = lightDepth(x, y, z, sx, sy, sz);
      if (l) {
        for (let c = 0; c < 3; c++) {
          const tau = ATM.betaR[c] * (vR + l[0]) + ATM.betaMExt * (vM + l[1]) + ATM.ozone[c] * (vR + l[0]) * .4;
          const att = Math.exp(-tau);
          sR[c] += hr * att; sM[c] += hm * att;
        }
      }
      vR += hr * .5; vM += hm * .5;
    }
    const mu = dx * sx + dy * sy + dz * sz;
    const pR = 3 / (16 * Math.PI) * (1 + mu * mu);
    const g = ATM.g, g2 = g * g;
    const pM = 3 / (8 * Math.PI) * ((1 - g2) * (1 + mu * mu)) / ((2 + g2) * Math.pow(Math.max(1e-4, 1 + g2 - 2 * g * mu), 1.5));
    for (let c = 0; c < 3; c++) out[c] = ATM.E0 * ATM.MS * (sR[c] * ATM.betaR[c] * pR + sM[c] * ATM.betaM * pM);
    if (ground) {
      const tv = [0, 1, 2].map(c => Math.exp(-(ATM.betaR[c] * vR + ATM.betaMExt * vM)));
      const ts = transmittanceSun(sx, sy, sz);
      for (let c = 0; c < 3; c++) out[c] += ATM.groundAlbedo / Math.PI * ATM.E0 * ts[c] * Math.max(sy, 0) * tv[c];
    }
    return out;
  }

  class Atmosphere {
    constructor() {
      this.W = 48; this.H = 40;
      this.work = new Float32Array(this.W * this.H * 4);
      this.lut = new Float32Array(this.W * this.H * 4);
      this.progress = -1; this.target = null; this.current = null;
      this.ready = false; this.dirty = false;
      this.state = {
        sunColor: [0, 0, 0], skyUp: [0, 0, 0], skySun: [0, 0, 0], skyAway: [0, 0, 0], ground: [0, 0, 0],
        exposure: .8, night: 0
      };
      this.smoothExposure = null;
      // Hemisphere sample directions (uniform), for irradiance integrals.
      this.hemi = [];
      const n = 96;
      for (let i = 0; i < n; i++) {
        const y = (i + .5) / n, r = Math.sqrt(1 - y * y), phi = i * 2.399963;
        this.hemi.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
      }
    }
    key(sun, weather) {
      return [sun[0], sun[1], sun[2], weather.cloud, weather.rain];
    }
    needsRebuild(k) {
      if (!this.current) return true;
      const c = this.current;
      const ang = Math.acos(clamp(k[0] * c[0] + k[1] * c[1] + k[2] * c[2], -1, 1));
      return ang > .0035 || Math.abs(k[3] - c[3]) > .02 || Math.abs(k[4] - c[4]) > .02;
    }
    elevationAt(v) { const s = (v - .5) * 2; return Math.sign(s) * s * s * Math.PI / 2; }
    // Overcast and night additions applied to clear-sky single scattering.
    finishTexel(rgb, el, sun, weather) {
      const cloud = clamp(weather.cloud, 0, 1), rain = clamp(weather.rain, 0, 1);
      const night = 1 - clamp((sun[1] + .10) / .18, 0, 1);
      const lum = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      const grey = lum * (.9 + .25 * Math.max(0, Math.sin(el)));
      const over = clamp(cloud * .88 + rain * .1, 0, 1);
      const nightSky = [.0030, .0045, .0095];
      const glow = Math.exp(-Math.max(0, el) * 9) * night;
      for (let c = 0; c < 3; c++) {
        const tint = [.93, .97, 1.04][c];
        rgb[c] = rgb[c] * (1 - over) + grey * tint * over * (1 - rain * .25);
        rgb[c] += nightSky[c] * night + [.0045, .0030, .0018][c] * glow;
      }
      if (RC.tropical) { const w = Math.exp(-Math.max(0, el) * 2.2); rgb[0] *= 1 + .26 * w; rgb[1] *= 1 + .06 * w; rgb[2] *= 1 - .26 * w; }
      return rgb;
    }
    step(sun, weather, budget = 220) {
      const k = this.key(sun, weather);
      if (this.progress < 0) {
        if (!this.needsRebuild(k) && this.ready) return false;
        this.target = k; this.progress = 0; this.targetSun = sun.slice(); this.targetWeather = { ...weather };
      }
      const sx0 = this.targetSun, sh = Math.hypot(sx0[0], sx0[2]);
      // LUT frame: sun azimuth along +x.
      const s = [sh, sx0[1], 0];
      const total = this.W * this.H, tmp = [0, 0, 0];
      let count = 0;
      while (this.progress < total && count < budget) {
        const i = this.progress % this.W, j = (this.progress / this.W) | 0;
        const az = (i + .5) / this.W * Math.PI;
        const el = this.elevationAt((j + .5) / this.H);
        const ce = Math.cos(el);
        singleScatter(ce * Math.cos(az), Math.sin(el), ce * Math.sin(az), s[0], s[1], s[2], tmp);
        this.finishTexel(tmp, el, sx0, this.targetWeather);
        const o = this.progress * 4;
        this.work[o] = tmp[0]; this.work[o + 1] = tmp[1]; this.work[o + 2] = tmp[2]; this.work[o + 3] = 1;
        this.progress++; count++;
      }
      if (this.progress >= total) {
        const swap = this.lut; this.lut = this.work; this.work = swap;
        this.current = this.target; this.progress = -1; this.ready = true; this.dirty = true;
        RC.stats.lutBuilds++;
        this.integrate();
      }
      return this.dirty;
    }
    sample(dx, dy, dz) {
      // Direction in LUT frame (sun azimuth along +x).
      const ts = this.targetSun || [1, 0, 0];
      const sh = Math.hypot(ts[0], ts[2]) || 1, ux = ts[0] / sh, uz = ts[2] / sh;
      const dh = Math.hypot(dx, dz) || 1e-6;
      const cosAz = clamp((dx * ux + dz * uz) / dh, -1, 1);
      const u = Math.acos(cosAz) / Math.PI;
      const el = Math.asin(clamp(dy, -1, 1));
      const v = .5 + .5 * Math.sign(el) * Math.sqrt(Math.abs(el) / (Math.PI / 2));
      const i = clamp(Math.floor(u * this.W), 0, this.W - 1), j = clamp(Math.floor(v * this.H), 0, this.H - 1);
      const o = (j * this.W + i) * 4;
      return [this.lut[o], this.lut[o + 1], this.lut[o + 2]];
    }
    integrate() {
      const sun = this.targetSun, w = this.targetWeather;
      const sh = Math.hypot(sun[0], sun[2]) || 1, nx = sun[0] / sh, nz = sun[2] / sh;
      const up = [0, 0, 0], ts = [0, 0, 0], ta = [0, 0, 0];
      const N = this.hemi.length;
      for (const d of this.hemi) {
        const L = this.sample(d[0], d[1], d[2]);
        const cu = d[1], cs = Math.max(0, d[0] * nx + d[2] * nz), ca = Math.max(0, -(d[0] * nx + d[2] * nz));
        for (let c = 0; c < 3; c++) { up[c] += L[c] * cu; ts[c] += L[c] * cs; ta[c] += L[c] * ca; }
      }
      for (let c = 0; c < 3; c++) { up[c] *= 2 / N; ts[c] *= 2 / N; ta[c] *= 2 / N; }
      const T = transmittanceSun(sun[0], sun[1], sun[2]);
      const cloud = clamp(w.cloud, 0, 1), rain = clamp(w.rain, 0, 1);
      const sunVis = (1 - .86 * cloud) * (1 - .35 * rain);
      const sunColor = T.map(t => ATM.E0 / Math.PI * t * sunVis);
      const ground = [0, 1, 2].map(c => ATM.groundAlbedo * (sunColor[c] * Math.max(sun[1], 0) * .82 + up[c]));
      Object.assign(this.state, { sunColor, skyUp: up, skySun: ts, skyAway: ta, ground });
      const sunH = sunColor[0] * .2126 + sunColor[1] * .7152 + sunColor[2] * .0722;
      const skyL = up[0] * .2126 + up[1] * .7152 + up[2] * .0722;
      const avg = sunH * Math.max(sun[1], 0) * .55 + skyL + .0008;
      this.targetExposure = clamp(1.18 * Math.pow(avg, -.72), .35, 8);
      this.state.night = 1 - clamp((sun[1] + .06) / .16, 0, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  HDR composite: MSAA resolve, bloom, AO, tonemap, grading            */
  /* ------------------------------------------------------------------ */
  const FULLSCREEN_VS = `#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);uv=p*.5+.5;gl_Position=vec4(p,0.0,1.0);}`;
  const DOWN_FS = `#version 300 es
// RC-NATIVE
precision highp float;
uniform sampler2D src;uniform vec2 texel;uniform int prefilter;
in vec2 uv;out vec4 o;
vec3 karis(vec3 c){return c/(1.0+dot(c,vec3(.2126,.7152,.0722)));}
void main(){
  vec3 a=texture(src,uv+texel*vec2(-1.0,-1.0)).rgb,b=texture(src,uv+texel*vec2(1.0,-1.0)).rgb;
  vec3 c=texture(src,uv+texel*vec2(-1.0,1.0)).rgb,d=texture(src,uv+texel*vec2(1.0,1.0)).rgb;
  vec3 e=texture(src,uv).rgb;
  if(any(isnan(a+b+c+d+e))||any(isinf(a+b+c+d+e))){o=vec4(0.0,0.0,0.0,1.0);return;}
  vec3 col;
  if(prefilter==1){
    vec3 ka=karis(a),kb=karis(b),kc=karis(c),kd=karis(d),ke=karis(e);
    col=(ka+kb+kc+kd)*.125+ke*.5;
    col=col/max(1.0-dot(col,vec3(.2126,.7152,.0722)),.02);
  }else col=(a+b+c+d)*.125+e*.5;
  o=vec4(min(col,vec3(4000.0)),1.0);
}`;
  const UP_FS = `#version 300 es
// RC-NATIVE
precision highp float;
uniform sampler2D src;uniform vec2 texel;uniform float radius;
in vec2 uv;out vec4 o;
void main(){
  vec2 t=texel*radius;
  vec3 s=texture(src,uv+vec2(-t.x,0.0)).rgb+texture(src,uv+vec2(t.x,0.0)).rgb+texture(src,uv+vec2(0.0,-t.y)).rgb+texture(src,uv+vec2(0.0,t.y)).rgb;
  s*=2.0;
  s+=texture(src,uv+vec2(-t.x,-t.y)).rgb+texture(src,uv+vec2(t.x,-t.y)).rgb+texture(src,uv+vec2(-t.x,t.y)).rgb+texture(src,uv+vec2(t.x,t.y)).rgb;
  s+=texture(src,uv).rgb*4.0;
  o=vec4(s/16.0,1.0);
}`;
  const FINAL_FS = `#version 300 es
// RC-NATIVE
precision highp float;
uniform sampler2D sceneColor,sceneDepth,bloomTex;
uniform vec2 pixelSize,projectionScale;
uniform float nearPlane,aoStrength,bloomStrength,grain,time,vignette,saturation,contrast;
uniform vec3 whiteBalance,lift;
uniform vec2 sunUV;uniform float sunVis;uniform vec3 sunCol;
uniform bool antialias;
uniform bool hdrInput;
uniform float sharpen;
in vec2 uv;out vec4 result;
const float farPlane=${H.SCENE_FAR ? H.SCENE_FAR.toFixed(1) : '5050.0'};
const vec2 kernel[8]=vec2[8](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1),
  vec2(.707,.707),vec2(-.707,.707),vec2(.707,-.707),vec2(-.707,-.707));
float depthAt(vec2 p){return nearPlane*farPlane/(farPlane-texture(sceneDepth,p).r*(farPlane-nearPlane));}
vec3 positionAt(vec2 p,float depth){return vec3((2.0*p-1.0)*projectionScale*depth,-depth);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 tone(vec3 c){return hdrInput?pow(aces(c),vec3(1.0/2.2)):c;}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  vec3 color=texture(sceneColor,uv).rgb;
  if(any(isnan(color))||any(isinf(color)))color=vec3(0.0);
  if(sharpen>.001){
    // Contrast-adaptive sharpening of the upscaled scene (luma-weighted, clamped).
    vec3 n4=texture(sceneColor,uv+vec2(pixelSize.x,0.0)).rgb+texture(sceneColor,uv-vec2(pixelSize.x,0.0)).rgb+
            texture(sceneColor,uv+vec2(0.0,pixelSize.y)).rgb+texture(sceneColor,uv-vec2(0.0,pixelSize.y)).rgb;
    vec3 detail=color-n4*.25;
    float lc=dot(color,vec3(.2126,.7152,.0722));
    color=max(vec3(0.0),color+detail*sharpen/(1.0+lc*.6));
  }
  vec2 dx=vec2(pixelSize.x,0.0),dy=vec2(0.0,pixelSize.y);
  if(antialias){
    vec3 l=texture(sceneColor,uv-dx).rgb,r=texture(sceneColor,uv+dx).rgb;
    vec3 b=texture(sceneColor,uv-dy).rgb,t=texture(sceneColor,uv+dy).rgb;
    float ll=luma(tone(l)),lr=luma(tone(r)),lb=luma(tone(b)),lt=luma(tone(t)),lm=luma(tone(color));
    float span=max(lm,max(max(ll,lr),max(lb,lt)))-min(lm,min(min(ll,lr),min(lb,lt)));
    if(span>.06){
      vec3 across=abs(ll-lr)>abs(lb-lt)?(l+r)*.5:(t+b)*.5;
      color=mix(color,across,smoothstep(.06,.30,span)*.42);
    }
  }
  float depth=depthAt(uv);
  if(aoStrength>.02&&depth<60.0){
    vec3 centre=positionAt(uv,depth);
    float dl=depthAt(uv-dx),dr=depthAt(uv+dx),db=depthAt(uv-dy),dt=depthAt(uv+dy);
    vec3 tx=abs(dr-depth)<abs(dl-depth)?positionAt(uv+dx,dr)-centre:centre-positionAt(uv-dx,dl);
    vec3 ty=abs(dt-depth)<abs(db-depth)?positionAt(uv+dy,dt)-centre:centre-positionAt(uv-dy,db);
    vec3 normal=normalize(cross(tx,ty));
    float radius=clamp(depth*.022,.07,1.0);
    vec2 sr=clamp(radius/(2.0*projectionScale*depth),pixelSize*2.0,pixelSize*26.0);
    float a=ign(gl_FragCoord.xy)*6.2831853;
    mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));
    float shade=0.0;
    for(int i=0;i<8;i++){
      vec2 off=rot*kernel[i]*sr*(i<4?.45:1.0);
      vec2 pick=uv+off;
      float sd=depthAt(pick);
      if(abs(sd-depth)>radius*1.4||sd>62.0)continue;
      vec3 delta=positionAt(pick,sd)-centre;
      float dist=length(delta);
      float w=1.0-smoothstep(.06,radius*1.4,dist);
      shade+=max(0.0,dot(normal,delta)/max(.03,dist)-.10)*w;
    }
    color*=1.0-clamp(shade*.22,0.0,.42)*aoStrength*(1.0-smoothstep(30.0,60.0,depth))*smoothstep(1.2,4.5,depth);
  }
  if(hdrInput&&sunVis>.01){
    // Crepuscular rays: march toward the sun through open sky (depth==far).
    vec2 delta=(sunUV-uv);float L=length(delta);
    vec2 stepv=delta/22.0;vec2 p=uv+stepv*ign(gl_FragCoord.xy);float illum=0.0,w=1.0;
    for(int i=0;i<22;i++){
      p+=stepv;
      if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0)break;
      illum+=step(.99999,texture(sceneDepth,p).r)*w;w*=.93;
    }
    color+=sunCol*illum*(1.0/11.0)*exp(-L*2.4)*sunVis*.42;
    // Lens flare ghosts, only when the sun disc itself is unobstructed.
    float open=step(.99999,texture(sceneDepth,clamp(sunUV,vec2(0.0),vec2(1.0))).r);
    if(open>0.0){
      vec2 axis=vec2(.5)-sunUV;
      for(int k=0;k<4;k++){
        float f=float(k);
        vec2 gp=sunUV+axis*(.55+f*.45);
        float r=.018+f*.012;
        vec2 dd=(uv-gp)*vec2(pixelSize.y/pixelSize.x,1.0);
        float disc=smoothstep(r,r*.55,length(dd));
        vec3 tint=k==0?vec3(1.0,.62,.3):k==1?vec3(.4,.8,1.0):k==2?vec3(1.0,.45,.75):vec3(.6,1.0,.6);
        color+=sunCol*tint*disc*.010*sunVis;
      }
      vec2 hd=(uv-sunUV)*vec2(pixelSize.y/pixelSize.x,1.0);
      color+=sunCol*vec3(1.0,.75,.5)*exp(-abs(hd.y)*260.0)*exp(-abs(hd.x)*3.5)*.04*sunVis;
    }
  }
  if(hdrInput){
    vec3 bloom=texture(bloomTex,uv).rgb;
    color=mix(color,bloom,bloomStrength);
    color*=whiteBalance;
    color=aces(color);
    color=pow(color,vec3(1.0/2.2));
  }
  // Grading in display space: gentle S-curve, saturation, lift.
  float y=luma(color);
  color=mix(vec3(y),color,saturation);
  color=clamp(color,0.0,1.0);
  vec3 s=color*color*(3.0-2.0*color);
  color=mix(color,s,contrast);
  color=color+lift*(1.0-color);
  vec2 vc=uv-.5;
  color*=1.0-vignette*smoothstep(.25,.85,dot(vc,vc)*2.2);
  color+=(ign(gl_FragCoord.xy+fract(time*7.31)*97.0)-.5)*grain;
  result=vec4(clamp(color,0.0,1.0),1.0);
}`;

  function makeProgram(gl, vs, fs, label) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      nativeShaderSource.call(gl, sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw Error(label + ': ' + gl.getShaderInfoLog(sh));
      return sh;
    };
    const v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(label + ' link: ' + gl.getProgramInfoLog(p));
    gl.deleteShader(v); gl.deleteShader(f);
    return p;
  }
  RC.makeProgram = makeProgram;
  RC.GLSL = { uniforms: RC_UNIFORMS, funcs: RC_FUNCS };

  class HDRComposite {
    constructor(gl, hdr) {
      this.gl = gl; this.hdr = hdr;
      this.width = 0; this.height = 0; this.ready = false; this.multisample = null;
      this.final = makeProgram(gl, FULLSCREEN_VS, FINAL_FS, 'rc-final');
      this.down = makeProgram(gl, FULLSCREEN_VS, DOWN_FS, 'rc-down');
      this.up = makeProgram(gl, FULLSCREEN_VS, UP_FS, 'rc-up');
      this.vao = gl.createVertexArray();
      this.target = gl.createFramebuffer();
      this.color = gl.createTexture();
      this.depth = gl.createTexture();
      this.levels = [];
      this.loc = {};
      for (const name of ['sceneColor', 'sceneDepth', 'bloomTex', 'pixelSize', 'projectionScale', 'nearPlane', 'aoStrength',
        'bloomStrength', 'grain', 'time', 'vignette', 'saturation', 'contrast', 'whiteBalance', 'lift', 'antialias', 'hdrInput', 'sunUV', 'sunVis', 'sunCol', 'sharpen'])
        this.loc[name] = gl.getUniformLocation(this.final, name);
      this.downLoc = { src: gl.getUniformLocation(this.down, 'src'), texel: gl.getUniformLocation(this.down, 'texel'), prefilter: gl.getUniformLocation(this.down, 'prefilter') };
      this.upLoc = { src: gl.getUniformLocation(this.up, 'src'), texel: gl.getUniformLocation(this.up, 'texel'), radius: gl.getUniformLocation(this.up, 'radius') };
      const internal = hdr ? gl.RGBA16F : gl.RGBA8;
      let colorSamples = [];
      try { colorSamples = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, internal, gl.SAMPLES) || []); } catch { colorSamples = []; }
      const depthSamples = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.SAMPLES) || []);
      this.availableSamples = colorSamples.filter(n => depthSamples.includes(n)).sort((a, b) => b - a);
      this.maxSamplesOverride = null;
    }
    texture(tex, w, h, internal, format, type, filter) {
      const g = this.gl;
      g.bindTexture(g.TEXTURE_2D, tex);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, filter);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, filter);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.texImage2D(g.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    }
    begin(width, height) {
      const g = this.gl;
      if (width !== this.width || height !== this.height) {
        this.width = width; this.height = height;
        g.bindFramebuffer(g.FRAMEBUFFER, this.target);
        if (this.hdr) this.texture(this.color, width, height, g.RGBA16F, g.RGBA, g.HALF_FLOAT, g.LINEAR);
        else this.texture(this.color, width, height, g.RGBA8, g.RGBA, g.UNSIGNED_BYTE, g.LINEAR);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, this.color, 0);
        this.texture(this.depth, width, height, g.DEPTH_COMPONENT24, g.DEPTH_COMPONENT, g.UNSIGNED_INT, g.NEAREST);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.TEXTURE_2D, this.depth, 0);
        this.ready = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
        this.resizeMultisample();
        this.resizeBloom();
      }
      g.bindFramebuffer(g.FRAMEBUFFER, this.ready ? (this.multisample?.target ?? this.target) : null);
      g.viewport(0, 0, width, height);
      return this.ready;
    }
    resizeMultisample() {
      const g = this.gl, pixels = this.width * this.height;
      const cap = this.maxSamplesOverride ?? (pixels <= 1100000 ? 4 : pixels <= 2300000 ? 2 : 0);
      const samples = this.availableSamples.find(n => n >= 2 && n <= cap);
      if (this.multisample) {
        g.deleteFramebuffer(this.multisample.target); g.deleteRenderbuffer(this.multisample.color); g.deleteRenderbuffer(this.multisample.depth);
        this.multisample = null;
      }
      if (!this.ready || !samples) return;
      const target = g.createFramebuffer(), color = g.createRenderbuffer(), depth = g.createRenderbuffer();
      g.bindFramebuffer(g.FRAMEBUFFER, target);
      g.bindRenderbuffer(g.RENDERBUFFER, color);
      g.renderbufferStorageMultisample(g.RENDERBUFFER, samples, this.hdr ? g.RGBA16F : g.RGBA8, this.width, this.height);
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.RENDERBUFFER, color);
      g.bindRenderbuffer(g.RENDERBUFFER, depth);
      g.renderbufferStorageMultisample(g.RENDERBUFFER, samples, g.DEPTH_COMPONENT24, this.width, this.height);
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, depth);
      g.bindRenderbuffer(g.RENDERBUFFER, null);
      if (g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE) { this.multisample = { target, color, depth, samples }; return; }
      g.deleteFramebuffer(target); g.deleteRenderbuffer(color); g.deleteRenderbuffer(depth);
    }
    resizeBloom() {
      const g = this.gl;
      for (const l of this.levels) { g.deleteFramebuffer(l.fb); g.deleteTexture(l.tex); }
      this.levels = [];
      if (!this.hdr) return;
      let w = this.width >> 1, h = this.height >> 1;
      for (let i = 0; i < 6 && w >= 8 && h >= 8; i++) {
        const tex = g.createTexture(), fb = g.createFramebuffer();
        this.texture(tex, w, h, g.RGBA16F, g.RGBA, g.HALF_FLOAT, g.LINEAR);
        g.bindFramebuffer(g.FRAMEBUFFER, fb);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
        this.levels.push({ tex, fb, w, h });
        w >>= 1; h >>= 1;
      }
    }
    bloom() {
      const g = this.gl, L = this.levels;
      if (!L.length) return null;
      g.bindVertexArray(this.vao);
      g.useProgram(this.down);
      g.uniform1i(this.downLoc.src, 0);
      g.activeTexture(g.TEXTURE0);
      let srcTex = this.color, sw = this.width, sh = this.height;
      for (let i = 0; i < L.length; i++) {
        g.bindFramebuffer(g.FRAMEBUFFER, L[i].fb);
        g.viewport(0, 0, L[i].w, L[i].h);
        g.bindTexture(g.TEXTURE_2D, srcTex);
        g.uniform2f(this.downLoc.texel, 1 / sw, 1 / sh);
        g.uniform1i(this.downLoc.prefilter, i === 0 ? 1 : 0);
        g.drawArrays(g.TRIANGLES, 0, 3);
        srcTex = L[i].tex; sw = L[i].w; sh = L[i].h;
      }
      g.useProgram(this.up);
      g.uniform1i(this.upLoc.src, 0);
      g.uniform1f(this.upLoc.radius, 1.0);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE);
      for (let i = L.length - 1; i > 0; i--) {
        g.bindFramebuffer(g.FRAMEBUFFER, L[i - 1].fb);
        g.viewport(0, 0, L[i - 1].w, L[i - 1].h);
        g.bindTexture(g.TEXTURE_2D, L[i].tex);
        g.uniform2f(this.upLoc.texel, 1 / L[i].w, 1 / L[i].h);
        g.drawArrays(g.TRIANGLES, 0, 3);
      }
      g.disable(g.BLEND);
      return L[0].tex;
    }
    present(field, indoors, nearPlane, grade) {
      const g = this.gl;
      if (this.multisample) {
        g.bindFramebuffer(g.READ_FRAMEBUFFER, this.multisample.target);
        g.bindFramebuffer(g.DRAW_FRAMEBUFFER, this.target);
        g.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT, g.NEAREST);
      }
      g.disable(g.DEPTH_TEST);
      g.depthMask(false);
      g.disable(g.CULL_FACE);
      const bloomTex = this.hdr ? this.bloom() : null;
      g.bindFramebuffer(g.FRAMEBUFFER, null);
      g.viewport(0, 0, grade.outW || this.width, grade.outH || this.height);
      g.useProgram(this.final);
      g.bindVertexArray(this.vao);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, this.color);
      g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, this.depth);
      g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, bloomTex || this.color);
      const L = this.loc;
      g.uniform1i(L.sceneColor, 0); g.uniform1i(L.sceneDepth, 1); g.uniform1i(L.bloomTex, 2);
      g.uniform2f(L.pixelSize, 1 / this.width, 1 / this.height);
      g.uniform2f(L.projectionScale, field * this.width / this.height, field);
      g.uniform1f(L.nearPlane, nearPlane);
      g.uniform1f(L.aoStrength, indoors ? 1.0 : .85);
      g.uniform1f(L.bloomStrength, bloomTex ? grade.bloom : 0);
      g.uniform1f(L.grain, grade.grain);
      g.uniform1f(L.time, grade.time);
      g.uniform1f(L.vignette, grade.vignette);
      g.uniform1f(L.saturation, grade.saturation);
      g.uniform1f(L.contrast, grade.contrast);
      g.uniform3fv(L.whiteBalance, grade.whiteBalance);
      g.uniform3fv(L.lift, grade.lift);
      g.uniform1i(L.antialias, this.multisample ? 0 : 1);
      g.uniform1i(L.hdrInput, this.hdr ? 1 : 0);
      g.uniform1f(L.sharpen, grade.sharpen || 0);
      g.uniform2fv(L.sunUV, grade.sunUV || [0, 0]); g.uniform1f(L.sunVis, grade.sunVis || 0); g.uniform3fv(L.sunCol, grade.sunCol || [0, 0, 0]);
      g.drawArrays(g.TRIANGLES, 0, 3);
      g.bindVertexArray(null);
      g.activeTexture(g.TEXTURE0);
      g.depthMask(true);
      g.enable(g.DEPTH_TEST);
      g.enable(g.CULL_FACE);
    }
  }
  RC.HDRComposite = HDRComposite;

  /* ------------------------------------------------------------------ */
  /*  Per-frame shared state + uniform upload helper                      */
  /* ------------------------------------------------------------------ */
  RC.frame = {
    sunDir: [0, 1, 0], sunColor: [0, 0, 0], skyUp: [0, 0, 0], skySun: [0, 0, 0], skyAway: [0, 0, 0], ground: [0, 0, 0],
    fog: [1 / 11000, 1 / 380, 0, 1], exposure: [1, 0, 0, 0], cam: [0, 0, 0], shadowTexel: 260 / 4096,
    lutTexture: null
  };
  const programLocations = new WeakMap();
  RC.applyUniforms = function (gl, program) {
    let L = programLocations.get(program);
    if (!L) {
      L = {};
      for (const n of ['rcSkyLUT', 'rcSunDir', 'rcSunColor', 'rcSkyUp', 'rcSkySun', 'rcSkyAway', 'rcGround', 'rcFog', 'rcExposure', 'rcCam', 'rcShadowTexel'])
        L[n] = gl.getUniformLocation(program, n);
      programLocations.set(program, L);
    }
    const F = RC.frame;
    if (L.rcSkyLUT) gl.uniform1i(L.rcSkyLUT, TEX_LUT);
    if (L.rcSunDir) gl.uniform3fv(L.rcSunDir, F.sunDir);
    if (L.rcSunColor) gl.uniform3fv(L.rcSunColor, F.sunColor);
    if (L.rcSkyUp) gl.uniform3fv(L.rcSkyUp, F.skyUp);
    if (L.rcSkySun) gl.uniform3fv(L.rcSkySun, F.skySun);
    if (L.rcSkyAway) gl.uniform3fv(L.rcSkyAway, F.skyAway);
    if (L.rcGround) gl.uniform3fv(L.rcGround, F.ground);
    if (L.rcFog) gl.uniform4fv(L.rcFog, F.fog);
    if (L.rcExposure) gl.uniform4fv(L.rcExposure, F.exposure);
    if (L.rcCam) gl.uniform3fv(L.rcCam, F.cam);
    if (L.rcShadowTexel) gl.uniform1f(L.rcShadowTexel, F.shadowTexel);
  };

  /* ------------------------------------------------------------------ */
  /*  Renderer subclass                                                   */
  /* ------------------------------------------------------------------ */
  function installRenderer() {
    const Base = H.GLRenderer;
    if (!Base || Base.__realism39) return;
    const viewProjOf = (c, aspect) => {
      // Re-derive the engine's projection (identical to the internal viewProj).
      if (c.satellite468) {
        const half = c.satellite468, span = 1100;
        return new Float32Array([1 / half, 0, 0, 0, 0, 0, -2 / span, 0, 0, -aspect / half, 0, 0, -c.x / half, c.z * aspect / half, 2 * c.y / span - 1, 1]);
      }
      const norm = (x, y, z) => { const d = Math.hypot(x, y, z) || 1; return [x / d, y / d, z / d]; };
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const fw = norm(c.tx - c.x, c.ty - c.y, c.tz - c.z), right = norm(...cross(fw, [0, 1, 0])), up = norm(...cross(right, fw));
      const back = [-fw[0], -fw[1], -fw[2]], eye = [c.x, c.y, c.z];
      const v = new Float32Array([right[0], up[0], back[0], 0, right[1], up[1], back[1], 0, right[2], up[2], back[2], 0, -dot(right, eye), -dot(up, eye), -dot(back, eye), 1]);
      const f = 1 / Math.tan(clamp(c.fov || 67, 54, 92) * Math.PI / 360);
      const n = Math.min(45, H.SCENE_NEAR + Math.max(0, c.y - 155) * .026), far = H.SCENE_FAR;
      const p = new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, (2 * far * n) / (n - far), 0]);
      const o = new Float32Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += p[k * 4 + j] * v[i * 4 + k]; o[i * 4 + j] = s; }
      return o;
    };
    const nearPlaneOf = c => Math.min(45, H.SCENE_NEAR + Math.max(0, c.y - 155) * .026);
    const basisOf = c => {
      const norm = (x, y, z) => { const d = Math.hypot(x, y, z) || 1; return [x / d, y / d, z / d]; };
      const fw = norm(c.tx - c.x, c.ty - c.y, c.tz - c.z);
      const right = norm(fw[2] * 0 - fw[1] * 0 + (-fw[2]), 0, fw[0]);
      const rx = -fw[2], rz = fw[0], rl = Math.hypot(rx, rz) || 1;
      const r = [rx / rl, 0, rz / rl];
      const up = norm(r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]);
      void right;
      return { fw, right: r, up };
    };
    const TWO_SIDED = shape => shape.startsWith('i31_') && !shape.startsWith('i31_taxi_');

    class RealismRenderer extends Base {
      constructor(canvas) {
        super(canvas);
        const g = this.gl;
        this.name = 'WebGL2 Realism Core (HDR PBR)';
        this.rcHdr = hdrCapable(g);
        this.rcResScale = 1;
        this.atmosphere = new Atmosphere();
        this.rcLUT = g.createTexture();
        g.activeTexture(g.TEXTURE0 + TEX_LUT);
        g.bindTexture(g.TEXTURE_2D, this.rcLUT);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA16F, 1, 1, 0, g.RGBA, g.FLOAT, new Float32Array([.3, .45, .8, 1]));
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.activeTexture(g.TEXTURE0);
        // Prime the atmosphere synchronously so the very first frame is lit correctly.
        const sun0 = H.sunDirectionAtHour29(17.5);
        while (!this.atmosphere.ready) this.atmosphere.step(sun0, { cloud: 0, rain: 0 }, 4096);
        this.uploadLUT();
        this.exposureState = this.atmosphere.targetExposure;
        try { this.rcComposite = new HDRComposite(g, this.rcHdr); }
        catch (error) { console.warn('[Realism39] HDR composite unavailable', error); this.rcComposite = null; }
        // Integrated-GPU profile: same shaders and look, lighter fixed costs.
        let adapter = '';
        try { const info = g.getExtension('WEBGL_debug_renderer_info'); adapter = info ? String(g.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''; } catch { }
        this.rcIntegrated = params.has('realismHigh') ? false :
          params.has('realismLow') || /intel|uhd|iris|hd graphics|radeon\(tm\) graphics|vega \d+ graphics|mali|adreno|apple gpu|swiftshader|llvmpipe/i.test(adapter);
        RC.stats.adapter = adapter; RC.stats.integratedProfile = this.rcIntegrated;
        if (this.rcIntegrated) {
          if (this.rcComposite) this.rcComposite.maxSamplesOverride = 0;
          this.rcResScale = params.has('realismFullRes') ? 1 : .8;
          if (this.shadowReady && this.shadowSize > 2048) {
            const oldTex = this.shadowTexture, oldFb = this.shadowFrame;
            this.shadowSize = 2048;
            this.installShadows();
            if (this.shadowReady) { g.deleteTexture(oldTex); g.deleteFramebuffer(oldFb); }
          }
        }
        this.composite = null;
        this.rcGrade = { bloom: .045, grain: .012, time: 0, vignette: .22, saturation: 1.06, contrast: .16,
          whiteBalance: [1, 1, 1], lift: [0, 0, 0] };
        RC.renderer = this;
        try { this.rcTimerExt = params.has('realismNoTimer') ? null : g.getExtension('EXT_disjoint_timer_query_webgl2'); } catch { this.rcTimerExt = null; }
        try { canvas.style.filter = 'none'; } catch {}
        this.resize();
      }
      rcPrepassProgram() {
        if (this.rcPrepass !== undefined) return this.rcPrepass;
        this.rcPrepass = null;
        if (!params.has('realismPrepass')) return null;
        try {
          const g = this.gl;
          const vsSrc = (g.getAttachedShaders(this.prog) || []).map(sh => g.getShaderSource(sh))
            .find(src => src && src.includes('flat out vec3 vDistanceBands;') && src.includes('invariant gl_Position'));
          if (!vsSrc) return null;
          const fs = `#version 300 es
// RC-NATIVE prepass
precision highp float;
flat in vec3 vDistanceBands;flat in vec3 vObjectCentre;
uniform vec3 uCamera;
float vsm(float a,float b,float x){float t=clamp((x-a)/max(.001,b-a),0.0,1.0);return t*t*(3.0-2.0*t);}
void main(){
  float dist=distance(vObjectCentre.xz,uCamera.xz);
  float visible=1.0;
  if(vDistanceBands.x>.0)visible*=vsm(max(0.0,vDistanceBands.x-42.0),vDistanceBands.x+42.0,dist);
  if(vDistanceBands.y>.0)visible*=1.0-vsm(max(0.0,vDistanceBands.y-42.0),vDistanceBands.y+42.0,dist);
  if(vDistanceBands.z>.0)visible*=1.0-vsm(max(0.0,vDistanceBands.z-70.0),vDistanceBands.z,dist);
  if(visible<.9999){
    int col=int(mod(floor(gl_FragCoord.x),4.0));
    int row=int(mod(floor(gl_FragCoord.y),4.0));
    const float bayer[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    float threshold=(bayer[row*4+col]+.5)/16.0;
    if(vDistanceBands.x>.0)threshold=1.0-threshold;
    if(visible<threshold)discard;
  }
}`;
          const prog = makeProgram(g, vsSrc, fs, 'rc-prepass');
          this.rcPrepass = { prog, vp: g.getUniformLocation(prog, 'uViewProj'), time: g.getUniformLocation(prog, 'uTime'),
            weather: g.getUniformLocation(prog, 'uWeather'), cam: g.getUniformLocation(prog, 'uCamera') };
        } catch (error) { console.warn('[Realism39] depth prepass unavailable', error); this.rcPrepass = null; }
        RC.stats.prepass = !!this.rcPrepass;
        return this.rcPrepass;
      }
      pack(objects, reuse = false) {
        // Unknown material names (e.g. 'stone') used to upload NaN, which blanked the
        // whole frame once such an object entered view. Map them to concrete.
        // Root cause of the "pink screen when turning the camera": 166 recovery
        // facade pieces carry no colour, so packing threw every frame once one
        // entered view and the canvas stayed empty (page background showed).
        for (const o of objects) {
          if (typeof o.color !== 'string') o.color = '#a8a296';
          if (o.material === 'stone') o.material = 'concrete';
        }
        const out = super.pack(objects, reuse);
        for (let i = 19; i < out.length; i += 20) if (out[i] !== out[i]) out[i] = -6;
        return out;
      }
      uploadLUT() {
        const g = this.gl, A = this.atmosphere;
        g.activeTexture(g.TEXTURE0 + TEX_LUT);
        g.bindTexture(g.TEXTURE_2D, this.rcLUT);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA16F, A.W, A.H, 0, g.RGBA, g.FLOAT, A.lut);
        g.activeTexture(g.TEXTURE0);
        A.dirty = false;
      }
      resize() {
        if (!this.atmosphere) return super.resize();
        const cssW = Math.max(1, this.canvas.clientWidth || 1), cssH = Math.max(1, this.canvas.clientHeight || 1);
        this.displayRatio463 = window.devicePixelRatio || 1;
        const maxSide = this.maxSide463 || 4096;
        const maxRatio = Math.min(maxSide / cssW, maxSide / cssH, Math.sqrt(8300000 / (cssW * cssH)));
        // The canvas always stays at full display resolution (crisp UI/edges); the 3-D
        // scene renders at rcResScale internally and the composite upscales + sharpens.
        const outRatio = Math.min(Math.min(this.displayRatio463, 1.5), maxRatio);
        const ow = Math.max(1, Math.round(cssW * outRatio)), oh = Math.max(1, Math.round(cssH * outRatio));
        const scale = this.rcComposite ? clamp(this.rcResScale || 1, .5, 1) : 1;
        const w = Math.max(1, Math.round(ow * scale)), h = Math.max(1, Math.round(oh * scale));
        this.renderNative475 = true; this.framebufferLimited475 = false; this.realPixelRatio475 = outRatio * scale;
        if (this.canvas.width !== ow || this.canvas.height !== oh) { this.canvas.width = ow; this.canvas.height = oh; }
        this.rcOutW = ow; this.rcOutH = oh;
        if (this.glWidth === w && this.glHeight === h) return;
        this.glWidth = w;
        this.glHeight = h;
        this.gl.viewport(0, 0, w, h);
      }
      setResolutionScale(scale) {
        const next = clamp(scale, .5, 1);
        if (Math.abs(next - this.rcResScale) < .01) return;
        this.rcResScale = next;
        this.resize();
      }
      updateAtmosphere(hour, weather, indoors, c, t) {
        const sun = H.sunDirectionAtHour29(hour);
        const A = this.atmosphere;
        A.step(sun, { cloud: weather.cloud || 0, rain: weather.rain || 0 }, 160);
        if (A.dirty) this.uploadLUT();
        const S = A.state, F = RC.frame;
        // The LUT/irradiance are rebuilt progressively; the sun itself moves every frame.
        F.sunDir = sun;
        const T = transmittanceSun(sun[0], sun[1], sun[2]);
        const cloud = clamp(weather.cloud || 0, 0, 1), rain = clamp(weather.rain || 0, 0, 1);
        const sunVis = (1 - .86 * cloud) * (1 - .35 * rain);
        F.sunColor = T.map(v => ATM.E0 / Math.PI * v * sunVis);
        F.skyUp = S.skyUp; F.skySun = S.skySun; F.skyAway = S.skyAway; F.ground = S.ground;
        const fogDensity = (1 / 16000) * (1 + rain * 7 + cloud * .8) * (1 + (1 - clamp(sun[1] * 4, 0, 1)) * .6);
        F.fog = [fogDensity, 1 / 420, clamp(cloud * .9 + rain * .4, 0, 1), indoors ? 0 : 1];
        F.cam = [c.x, c.y, c.z];
        const now = performance.now();
        const dt = this.lastExposureMs ? clamp((now - this.lastExposureMs) / 1000, 0, .25) : 0;
        this.lastExposureMs = now;
        const target = indoors ? .8 : A.targetExposure;
        this.exposureState = this.exposureState == null ? target :
          Math.exp(Math.log(this.exposureState) + (Math.log(target) - Math.log(this.exposureState)) * (1 - Math.exp(-dt * 2.2)));
        const night = 1 - clamp((sun[1] + .06) / .16, 0, 1);
        F.exposure = [this.exposureState, night, indoors ? 1 : 0, rain];
        F.shadowTexel = c.satellite468 ? (c.satellite468 * 2.36) / this.shadowSize : 260 / this.shadowSize;
        // Grading drifts warm at golden hour, cool and slightly desaturated at night.
        const golden = clamp(1 - Math.abs(sun[1] - .12) / .22, 0, 1) * (1 - night);
        const G = this.rcGrade;
        G.whiteBalance = RC.tropical ? [1.07, 1.0, .9] : [1 + .035 * golden - .05 * night, 1 - .005 * golden - .01 * night, 1 - .05 * golden + .07 * night];
        G.saturation = 1.07 - .14 * night - .12 * cloud;
        G.contrast = .17 - .05 * cloud;
        G.lift = [.006 * night, .008 * night, .014 * night];
        G.bloom = .040 + .030 * night + .02 * rain;
        G.time = t;
      }
      drawSunShadows(statics, dynamics, c) {
        // Tiny decorative parts (bulbs, flowers, rails) cost GPU time in the
        // shadow map but cast no visible shadow: skip them.
        if (statics !== this.rcShadowSource) {
          this.rcShadowSource = statics;
          this.rcShadowCasters = statics.filter(o => !(Math.max(o.w, o.h, o.d) < 1.1 || (o.cityLife39 && o.h < .5 && Math.min(o.w, o.d) < 2)));
        }
        super.drawSunShadows(this.rcShadowCasters, dynamics, c);
        if (!this.shadowReady || !RC.passes.shadow.length) return;
        const g = this.gl;
        g.bindFramebuffer(g.FRAMEBUFFER, this.shadowFrame);
        g.viewport(0, 0, this.shadowSize, this.shadowSize);
        g.colorMask(false, false, false, false);
        g.enable(g.DEPTH_TEST);
        g.depthMask(true);
        for (const pass of RC.passes.shadow) {
          try { pass(this, this.shadowMatrix, c); } catch (error) { if (!pass.__warned) { pass.__warned = true; console.warn('[Realism39] shadow pass', error); } }
        }
        g.colorMask(true, true, true, true);
        g.bindFramebuffer(g.FRAMEBUFFER, null);
        g.viewport(0, 0, this.glWidth, this.glHeight);
      }
      runOpaquePasses(frame) {
        if (!RC.passes.opaque.length) return;
        const g = this.gl;
        for (const pass of RC.passes.opaque) {
          try { pass(this, frame); } catch (error) { if (!pass.__warned) { pass.__warned = true; console.warn('[Realism39] opaque pass', error); } }
        }
        g.useProgram(this.prog);
        for (let slot = 0; slot < this.materialTextures.length; slot++) {
          g.activeTexture(g.TEXTURE0 + slot);
          g.bindTexture(g.TEXTURE_2D, this.materialTextures[slot]);
        }
        g.enable(g.CULL_FACE); g.cullFace(g.BACK); g.enable(g.DEPTH_TEST); g.depthMask(true); g.disable(g.BLEND);
        g.bindVertexArray(this.vao);
      }
      draw(staticObjects, dynamicObjects, c, t, lights = [], decals = [], particles = [], hour = 17.5, weather = { cloud: 0, rain: 0, wind: 0, flash: 0 }, indoors = false) {
        const g = this.gl;
        if (this.displayRatio463 !== (window.devicePixelRatio || 1) || !this.glWidth || !this.glHeight) this.resize();
        if (!this.glWidth || !this.glHeight) return;
        const scene = indoors ? this.indoorStatic : this.outdoorStatic;
        if (this.activeStaticScene !== scene) this.shadowFrameIndex = 0;
        this.activeStaticScene = scene;
        const tq = this.rcTimerExt;
        if (tq) {
          if (this.rcQuery && g.getQueryParameter(this.rcQuery, g.QUERY_RESULT_AVAILABLE)) {
            if (!g.getParameter(tq.GPU_DISJOINT_EXT)) {
              const ms = g.getQueryParameter(this.rcQuery, g.QUERY_RESULT) / 1e6;
              this.rcGpuMs = this.rcGpuMs == null ? ms : this.rcGpuMs * .85 + ms * .15;
            }
            g.deleteQuery(this.rcQuery); this.rcQuery = null;
          }
          if (!this.rcQuery) { this.rcQuery = g.createQuery(); g.beginQuery(tq.TIME_ELAPSED_EXT, this.rcQuery); this.rcQueryOpen = true; }
        }
        const nearStatic = this.getVisibleStatic(staticObjects, c, scene);
        // Screen-size LOD for moving parts: car bodies are 12k triangles and each
        // alloy rim 3.7k; far away they are a few pixels. Lights always stay.
        if (!params.has('realismDynLodOff') && dynamicObjects.length) {
          const px = .92 * Math.min(this.glWidth, this.glHeight) / Math.tan(clamp(c.fov || 67, 54, 92) * Math.PI / 360) * .5;
          const mr = this.modelRanges, keepList = [];
          for (const o of dynamicObjects) {
            if (o.glow > .3 || o.material === 'light_beam' || o.material === 'light_core') { keepList.push(o); continue; }
            const dx = o.x - c.x, dz = o.z - c.z, d = Math.sqrt(dx * dx + dz * dz) + .001;
            const size = Math.max(o.w, o.h, o.d) * px / d;
            if (size < 1.5) continue;
            const shape = o.shape;
            if (shape && size < 14) {
              const tris = (mr.get(shape)?.count || 0) / 3;
              if (tris > 2500 && size < 10) continue;
              if (size < 8 && /_rim_|alloy_rim/.test(shape)) continue;
            }
            keepList.push(o);
          }
          dynamicObjects = keepList;
        }
        const daylight = H.daylightFromHour(hour);
        window.__SUNSET_STAGE17_VISIBILITY = { renderer: this.name, gpuMs: this.rcGpuMs, ...this.getVisibilityInfo(),
          staticInstances: scene.cubeCount, quality: this.qualityScale, fadeMeters: 70, lodBlendMeters: 84, resolutionScale: this.rcResScale };
        this.sunlightHour = hour;
        this.updateAtmosphere(hour, weather, indoors, c, t);
        const sun29 = RC.frame.sunDir;
        const sunUp = sun29[1] > -.02;
        const shadowMode = this.shadowReady && c.satellite468 ? 3 :
          this.shadowReady && !indoors && c.y < 140 && sunUp ? (this.rcIntegrated || this.rcResScale < .62 ? 2 : 1) : 0;
        const nowShadow = performance.now();
        const shadowTravel = Math.hypot(c.x - (this.shadowX ?? c.x), c.z - (this.shadowZ ?? c.z));
        const shadowAge = nowShadow - (this.lastShadowMs ?? -Infinity);
        // Characters move every frame: refresh the map often when they cast into it.
        const dynamicCasters = RC.passes.shadow.length > 0;
        if (shadowMode && (shadowTravel > 6 || shadowAge > (dynamicCasters ? (this.rcShadowPeriod || 160) : 260) ||
          Math.abs(hour - (this.lastShadowHour ?? hour)) > .02 || this.shadowFrameIndex === 0)) {
          this.drawSunShadows(nearStatic, dynamicObjects, c);
          this.lastShadowMs = nowShadow; this.shadowX = c.x; this.shadowZ = c.z; this.lastShadowHour = hour;
          this.shadowFrameIndex = 1;
        }
        const composited = !!this.rcComposite && this.glWidth * this.glHeight <= 16600000 && this.rcComposite.begin(this.glWidth, this.glHeight);
        if (!composited) { g.bindFramebuffer(g.FRAMEBUFFER, null); g.viewport(0, 0, this.glWidth, this.glHeight); }
        const projectionField = Math.tan(clamp(c.fov || 67, 54, 92) * Math.PI / 360);
        const viewProjection = viewProjOf(c, this.glWidth / this.glHeight);
        this.rcViewProjection = viewProjection;
        g.clearColor(indoors ? .02 : .3, indoors ? .018 : .4, indoors ? .016 : .55, 1);
        g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
        g.activeTexture(g.TEXTURE0 + TEX_LUT);
        g.bindTexture(g.TEXTURE_2D, this.rcLUT);
        g.useProgram(this.prog);
        RC.applyUniforms(g, this.prog);
        g.uniformMatrix4fv(this.vpLoc, false, viewProjection);
        for (let slot = 0; slot < this.materialTextures.length; slot++) {
          g.activeTexture(g.TEXTURE0 + slot);
          g.bindTexture(g.TEXTURE_2D, this.materialTextures[slot]);
        }
        g.activeTexture(g.TEXTURE8); g.bindTexture(g.TEXTURE_2D, this.coastalTexture461);
        g.uniform1i(this.shadowActiveLoc, shadowMode);
        if (this.shadowReady) {
          g.activeTexture(g.TEXTURE7);
          g.bindTexture(g.TEXTURE_2D, this.shadowTexture);
          g.uniformMatrix4fv(this.shadowMatrixLoc, false, this.shadowMatrix);
        }
        g.uniform3f(this.camLoc, c.x, c.y, c.z);
        g.uniform1f(this.timeLoc, t);
        g.uniform1f(this.worldDay, daylight);
        g.uniform4f(this.worldWeather, weather.cloud, weather.rain, weather.flash, weather.wind);
        g.uniform1f(this.worldInterior, indoors ? 1 : 0);
        g.uniform1f(this.worldQuality, 1);
        g.uniform1f(this.worldUnderwater445, c.underwater445 ? 1 : 0);
        g.uniform3f(this.worldSun, ...sun29);
        // In daylight street lamps are invisible next to the sun; skipping them
        // saves 12 per-pixel light evaluations. Headlight cones stay.
        const dayFactor = indoors ? 0 : clamp((sun29[1] - .04) / .12, 0, 1);
        if (dayFactor >= 1) lights = lights.filter(l => l.cone > 0);
        else if (dayFactor > 0) lights = lights.filter(l => l.cone > 0 || (l.r + l.g + l.b) * (1 - dayFactor) > .3);
        const closest = H.stage34RenderSoundPolish?.enabled() ?
          H.stage34RenderSoundPolish.selectLights(lights, c, 12) :
          lights.map(l => ({ l, dist: (l.x - c.x) ** 2 + (l.z - c.z) ** 2 }))
            .sort((a, b) => (b.l.priority || 0) - (a.l.priority || 0) || a.dist - b.dist).slice(0, 12);
        closest.forEach(({ l }, i) => {
          const k = i * 4, rgb = i * 3;
          this.lightData[k] = l.x; this.lightData[k + 1] = l.y; this.lightData[k + 2] = l.z; this.lightData[k + 3] = l.radius;
          this.lightColors[rgb] = l.r; this.lightColors[rgb + 1] = l.g; this.lightColors[rgb + 2] = l.b;
          this.lightCones[k] = l.dirX || 0; this.lightCones[k + 1] = l.dirY || 0; this.lightCones[k + 2] = l.dirZ || 0; this.lightCones[k + 3] = l.cone || 0;
        });
        g.uniform1i(this.lightCountLoc, closest.length);
        g.uniform4fv(this.lightDataLoc, this.lightData);
        g.uniform3fv(this.lightColorLoc, this.lightColors);
        g.uniform4fv(this.lightConeLoc, this.lightCones);
        RC.frame.lights = closest.map(e => e.l);
        g.bindVertexArray(this.vao);
        const opt37 = H.stage37RenderOptimizer?.enabled();
        const upload = (buffer, list) => {
          if (opt37) H.stage37RenderOptimizer.uploadStatic(g, buffer, this.pack(list, this.reuseStaticPacking475 === true), g.STATIC_DRAW);
          else g.bufferData(g.ARRAY_BUFFER, this.pack(list, this.reuseStaticPacking475 === true), g.STATIC_DRAW);
        };
        if (scene.uploaded !== nearStatic) {
          g.bindBuffer(g.ARRAY_BUFFER, scene.cubes);
          const groups = new Map(), sea = [];
          scene.glazing = [];
          for (const item of nearStatic) {
            if (item.sea461) { sea.push(item); continue; }
            if (item.material === 'shop_glazing') { scene.glazing.push(item); continue; }
            const key = item.shape || 'cube';
            const a = groups.get(key) || [];
            a.push(item); groups.set(key, a);
          }
          const cubes = groups.get('cube') || [], wedges = groups.get('wedge') || [];
          upload(scene.cubes, cubes);
          g.bindBuffer(g.ARRAY_BUFFER, scene.sea); upload(scene.sea, sea);
          g.bindBuffer(g.ARRAY_BUFFER, scene.wedges); upload(scene.wedges, wedges);
          for (const entry of scene.extra.values()) entry.count = 0;
          for (const [shape, list] of groups) {
            if (shape === 'cube' || shape === 'wedge' || !this.modelRanges.has(shape)) continue;
            let entry = scene.extra.get(shape);
            if (!entry) { entry = { buffer: g.createBuffer(), count: 0 }; scene.extra.set(shape, entry); }
            g.bindBuffer(g.ARRAY_BUFFER, entry.buffer); upload(entry.buffer, list);
            entry.count = list.length;
          }
          scene.cubeCount = cubes.length; scene.wedgeCount = wedges.length; scene.seaCount = sea.length;
          scene.uploaded = nearStatic;
        }
        const drawStatics = () => {
          this.bindInstances(scene.cubes);
          if (scene.cubeCount) g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, scene.cubeCount);
          if (scene.wedgeCount) { this.bindInstances(scene.wedges); g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 144, scene.wedgeCount); }
          for (const [name, entry] of scene.extra) {
            if (entry.count === 0) continue;
            const range = this.modelRanges.get(name);
            this.bindInstances(entry.buffer);
            g.drawElementsInstanced(g.TRIANGLES, range.count, g.UNSIGNED_INT, range.offset, entry.count);
          }
        };
        // Depth pre-pass: identical (invariant) vertex shader + LOD dither only.
        // The expensive PBR shader then runs once per visible pixel.
        const pre = this.rcPrepassProgram();
        if (pre) {
          g.useProgram(pre.prog);
          g.uniformMatrix4fv(pre.vp, false, viewProjection);
          g.uniform1f(pre.time, t);
          g.uniform4f(pre.weather, weather.cloud, weather.rain, weather.flash, weather.wind);
          g.uniform3f(pre.cam, c.x, c.y, c.z);
          g.colorMask(false, false, false, false);
          drawStatics();
          g.colorMask(true, true, true, true);
          g.useProgram(this.prog);
          g.depthMask(false);
          g.depthFunc(g.LEQUAL);
        }
        drawStatics();
        if (pre) { g.depthMask(true); g.depthFunc(g.LESS); }
        if (!indoors && staticObjects.shoreMesh463) {
          this.drawShore463(staticObjects.shoreMesh463, viewProjection, c, sun29, daylight, weather, shadowMode, this.shadowMatrix);
          g.useProgram(this.prog); g.bindVertexArray(this.vao);
        }
        const glassObjects = scene.glazing.filter(o => (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 125 ** 2);
        const dg = new Map();
        for (const o of dynamicObjects) {
          if (o.material === 'translucent_glass' || o.material === 'clear_glass472' || o.material === 'light_beam' || o.material === 'light_core') { glassObjects.push(o); continue; }
          const k = o.shape === 'rim' ? 'wheel' : (o.shape || 'cube');
          const a = dg.get(k) || [];
          a.push(o); dg.set(k, a);
        }
        const cubes = dg.get('cube') || [], wedges = dg.get('wedge') || [], wheels = dg.get('wheel') || [];
        if (cubes.length) {
          g.bindBuffer(g.ARRAY_BUFFER, this.dynamicBuffer);
          g.bufferData(g.ARRAY_BUFFER, this.pack(cubes, true), g.DYNAMIC_DRAW);
          this.bindInstances(this.dynamicBuffer);
          g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, cubes.length);
        }
        if (wedges.length) {
          g.bindBuffer(g.ARRAY_BUFFER, this.wedgeBuffer);
          g.bufferData(g.ARRAY_BUFFER, this.pack(wedges, true), g.DYNAMIC_DRAW);
          this.bindInstances(this.wedgeBuffer);
          g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 144, wedges.length);
        }
        if (wheels.length) {
          g.bindBuffer(g.ARRAY_BUFFER, this.wheelBuffer);
          g.bufferData(g.ARRAY_BUFFER, this.pack(wheels, true), g.DYNAMIC_DRAW);
          this.bindInstances(this.wheelBuffer);
          g.drawElementsInstanced(g.TRIANGLES, this.wheelIndexCount, g.UNSIGNED_INT, 288, wheels.length);
        }
        // All per-shape dynamic instances go up in ONE buffer upload; each shape
        // then draws from its offset (was ~170 separate uploads per frame).
        let twoSided = false;
        const batches = [];
        let floats = 0;
        for (const [shape, list] of dg) {
          const range = this.modelRanges.get(shape);
          if (!range) continue;
          batches.push({ shape, list, range, first: floats / 20 });
          floats += list.length * 20;
        }
        if (batches.length) {
          if (!this.rcDynArray || this.rcDynArray.length < floats) this.rcDynArray = new Float32Array(Math.max(floats, (this.rcDynArray?.length || 0) * 2, 4096));
          let o = 0;
          for (const b of batches) { const packed = this.pack(b.list, true); this.rcDynArray.set(packed, o); o += packed.length; }
          if (!this.rcDynBuffer) this.rcDynBuffer = g.createBuffer();
          g.bindBuffer(g.ARRAY_BUFFER, this.rcDynBuffer);
          g.bufferData(g.ARRAY_BUFFER, this.rcDynArray.subarray(0, floats), g.STREAM_DRAW);
          for (const b of batches) {
            const both = TWO_SIDED(b.shape);
            if (both !== twoSided) { twoSided = both; if (twoSided) g.disable(g.CULL_FACE); else g.enable(g.CULL_FACE); }
            for (let i = 0; i < 5; i++) {
              g.enableVertexAttribArray(2 + i);
              g.vertexAttribPointer(2 + i, 4, g.FLOAT, false, 80, b.first * 80 + i * 16);
              g.vertexAttribDivisor(2 + i, 1);
            }
            g.drawElementsInstanced(g.TRIANGLES, b.range.count, g.UNSIGNED_INT, b.range.offset, b.list.length);
          }
        }
        if (twoSided) g.enable(g.CULL_FACE);
        const frame = { viewProjection, c, t, hour, weather, indoors, daylight, shadowMode, sun: sun29, width: this.glWidth, height: this.glHeight };
        RC.lastFrame = frame;
        this.runOpaquePasses(frame);
        if (this.premium43) {
          try { this.premium43.draw(viewProjection, c, hour, t, weather); }
          catch (wildlifeError) { if (!this.premium43Error) console.warn('[SUNSET 4.3] wildlife renderer:', wildlifeError); this.premium43Error = true; }
          g.useProgram(this.prog);
          for (let slot = 0; slot < this.materialTextures.length; slot++) { g.activeTexture(g.TEXTURE0 + slot); g.bindTexture(g.TEXTURE_2D, this.materialTextures[slot]); }
          g.bindVertexArray(this.vao);
        }
        if (scene.seaCount) {
          this.bindInstances(scene.sea);
          g.drawElementsInstanced(g.TRIANGLES, 36, g.UNSIGNED_INT, 0, scene.seaCount);
        }
        if (!indoors) {
          g.depthFunc(g.LEQUAL);
          g.depthMask(false);
          g.useProgram(this.skyProgram);
          RC.applyUniforms(g, this.skyProgram);
          g.uniform2f(this.skyResolution, this.glWidth, this.glHeight);
          g.uniform1f(this.skyDay, daylight);
          g.uniform1f(this.skyUnderwater445, c.underwater445 ? 1 : 0);
          g.uniform1f(this.skyQuality, 1);
          g.uniform1f(this.skyField, projectionField);
          g.uniform4f(this.skyWeather, weather.cloud, weather.rain, weather.flash, weather.wind);
          g.uniform3f(this.skySun, ...sun29);
          g.uniform1f(this.skyTime, t);
          const basis = basisOf(c);
          g.uniform3fv(this.skyFW, basis.fw);
          g.uniform3fv(this.skyRight, basis.right);
          g.uniform3fv(this.skyUp, basis.up);
          g.activeTexture(g.TEXTURE6);
          g.bindTexture(g.TEXTURE_2D, this.materialTextures[6]);
          g.bindVertexArray(this.skyVAO);
          g.drawArrays(g.TRIANGLES, 0, 3);
          g.bindVertexArray(null);
          g.depthMask(true);
          g.depthFunc(g.LESS);
          g.useProgram(this.prog);
          g.bindVertexArray(this.vao);
        }
        if (glassObjects.length) {
          glassObjects.sort((a, b) => ((b.x - c.x) ** 2 + (b.z - c.z) ** 2) - ((a.x - c.x) ** 2 + (a.z - c.z) ** 2));
          const panes = new Map();
          for (const o of glassObjects) { const shape = o.shape || 'cube'; const list = panes.get(shape) || []; list.push(o); panes.set(shape, list); }
          g.enable(g.BLEND);
          g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
          g.depthMask(false);
          g.disable(g.CULL_FACE);
          for (const [shape, list] of panes) {
            const range = shape === 'cube' ? { offset: 0, count: 36 } : shape === 'wedge' ? { offset: 144, count: 36 } :
              shape === 'wheel' ? { offset: 288, count: this.wheelIndexCount } : this.modelRanges.get(shape);
            if (!range) continue;
            let buffer = this.modelBuffers.get('glass:' + shape);
            if (!buffer) { buffer = g.createBuffer(); this.modelBuffers.set('glass:' + shape, buffer); }
            g.bindBuffer(g.ARRAY_BUFFER, buffer);
            g.bufferData(g.ARRAY_BUFFER, this.pack(list, true), g.DYNAMIC_DRAW);
            this.bindInstances(buffer);
            g.drawElementsInstanced(g.TRIANGLES, range.count, g.UNSIGNED_INT, range.offset, list.length);
          }
          g.depthMask(true);
          g.disable(g.BLEND);
          g.enable(g.CULL_FACE);
        }
        g.bindVertexArray(null);
        if (decals.length) {
          const vertices = [];
          for (const m of decals) {
            if ((m.x0 - c.x) ** 2 + (m.z0 - c.z) ** 2 > 225 * 225) continue;
            const fade = clamp((95 - m.age) / 36, 0, 1);
            if (fade <= 0) continue;
            const data = H.tireMarkVertices(m);
            for (let i = 0; i < data.length; i += 6) data[i + 5] *= fade;
            for (let i = 0; i < data.length; i++) vertices.push(data[i]);
          }
          if (vertices.length) {
            g.useProgram(this.tireProgram);
            g.uniformMatrix4fv(this.tireVP, false, viewProjection);
            g.uniform1f(this.tireTime, t);
            g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
            g.depthMask(false); g.disable(g.CULL_FACE);
            g.bindVertexArray(this.tireVAO);
            g.bindBuffer(g.ARRAY_BUFFER, this.tireBuffer);
            g.bufferData(g.ARRAY_BUFFER, new Float32Array(vertices), g.DYNAMIC_DRAW);
            g.drawArrays(g.TRIANGLES, 0, vertices.length / 6);
            g.bindVertexArray(null);
            g.depthMask(true); g.disable(g.BLEND); g.enable(g.CULL_FACE);
          }
        }
        if (particles.length) {
          const verts = [];
          for (const p of particles) {
            if (p.kind === 'debris' || p.kind === 'glass' || p.kind === 'panel' || p.kind === 'casing') continue;
            if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 > 165 * 165) continue;
            const [r, gg, b] = H.rgb(p.color);
            const fade = clamp(p.life / p.max, 0, 1);
            const kind = p.kind === 'spark' ? 1 : p.kind === 'dust' ? 2 : p.kind === 'glow' ? 3 : p.kind === 'flame' ? 4 : 0;
            const radius = p.size * (p.kind === 'smoke' || p.kind === 'dust' ? 1 + (1 - fade) * 1.2 : 1);
            verts.push(p.x, p.y, p.z, r, gg, b, radius, fade, kind);
          }
          if (verts.length) {
            g.useProgram(this.fxProgram);
            g.uniformMatrix4fv(this.fxVP, false, viewProjection);
            g.uniform3f(this.fxCam, c.x, c.y, c.z);
            g.uniform1f(this.fxHeight, this.glHeight);
            g.uniform1f(this.fxTime, t);
            g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
            g.depthMask(false); g.disable(g.CULL_FACE);
            g.bindVertexArray(this.fxVAO);
            g.bindBuffer(g.ARRAY_BUFFER, this.fxBuffer);
            g.bufferData(g.ARRAY_BUFFER, new Float32Array(verts), g.DYNAMIC_DRAW);
            g.drawArrays(g.POINTS, 0, verts.length / 9);
            g.bindVertexArray(null);
            g.depthMask(true); g.disable(g.BLEND); g.enable(g.CULL_FACE);
          }
        }
        if (composited) {
          // Sun screen position for shafts / flare.
          const sd = RC.frame.sunDir, P = viewProjection;
          const wx = c.x + sd[0] * 4000, wy = c.y + sd[1] * 4000, wz = c.z + sd[2] * 4000;
          const cx = P[0] * wx + P[4] * wy + P[8] * wz + P[12], cy = P[1] * wx + P[5] * wy + P[9] * wz + P[13], cw = P[3] * wx + P[7] * wy + P[11] * wz + P[15];
          const G = this.rcGrade;
          if (cw > 0 && !indoors && sd[1] > -.02) {
            const u = cx / cw * .5 + .5, v = cy / cw * .5 + .5;
            G.sunUV = [u, v];
            G.sunVis = Math.max(0, 1 - Math.max(0, Math.max(Math.abs(u - .5), Math.abs(v - .5)) - .5) / .35) * (1 - (weather.cloud || 0) * .8);
            const e = RC.frame.exposure[0];
            G.sunCol = RC.frame.sunColor.map(x => x * e);
          } else G.sunVis = 0;
          G.outW = this.rcOutW; G.outH = this.rcOutH; G.sharpen = this.rcResScale < .99 ? .45 + (1 - this.rcResScale) * .9 : .2;
          this.rcComposite.present(projectionField, indoors, nearPlaneOf(c), G);
        }
        if (this.rcQueryOpen) { g.endQuery(this.rcTimerExt.TIME_ELAPSED_EXT); this.rcQueryOpen = false; }
      }
    }
    // Tighter static culling: the legacy culler kept a 170 m circle behind the
    // camera and a ~120 deg side margin, sending ~47k instances to a GPU that is
    // vertex-bound on integrated graphics. Derive the margin from the real FOV.
    try {
      let src = Base.prototype.getVisibleStatic.toString();
      const swaps = [
        ['getVisibleStatic(objects, c, scene = this.activeStaticScene) {', 'function getVisibleStatic(objects, c, scene = this.activeStaticScene) {\nconst __rcHalf=Math.atan(Math.tan(Math.max(54,Math.min(92,c.fov||67))*Math.PI/360)*((this.glWidth||16)/(this.glHeight||9)));\nconst __rcSlope=Math.tan(Math.min(1.42,__rcHalf+.27));'],
        ['if(dx*dx+dz*dz<(fast?68:170)**2)return true;', 'if(dx*dx+dz*dz<(fast?48:62)**2)return true;'],
        ['if(side>Math.max(195,Math.max(0,depth)*1.75+radius))return false;', 'if(side>Math.max(62,Math.max(0,depth)*__rcSlope+radius))return false;'],
        ['Math.abs(c.y-(scene.cullY??c.y))<7 && turn<.38)', 'Math.abs(c.y-(scene.cullY??c.y))<7 && turn<.21)'],
        ['rotateBoxLocal(', 'Heatline.rotateBoxLocal('],
        ['if (o.lodMin !== undefined && o.lodMin > lodPreload &&',
          'if(d2>150*150&&o.layer>=3&&!(o.glow>.5)&&!o.stage450Proxy&&!o.terrainTile42){const a=o.w,b=o.h,e=o.d;const mid=a>b?(b>e?b:(a>e?e:a)):(a>e?a:(b>e?e:b));if(mid*pixelScale475<(Heatline.realism39.cullPx||2.6)*Math.sqrt(d2))return false;}\n                if (o.lodMin !== undefined && o.lodMin > lodPreload &&']
      ];
      for (const [a, b] of swaps) {
        if (src.split(a).length !== 2) throw Error('cull anchor: ' + a.slice(0, 40));
        src = src.replace(a, b);
      }
      const fn = new Function('Heatline', 'return ' + src)(H);
      if (!params.has('realismCullOff')) RealismRenderer.prototype.getVisibleStatic = fn;
    } catch (error) { console.warn('[Realism39] culling upgrade skipped', error); }
    RealismRenderer.__realism39 = true;
    H.GLRenderer = RealismRenderer;
    H.GLRendererLegacy39 = Base;
  }

  /* ------------------------------------------------------------------ */
  /*  Game integration: dynamic resolution instead of shader downgrades   */
  /* ------------------------------------------------------------------ */
  RC.installGame = function (Game) {
    if (!Game || Game.prototype.__realism39Render) return;
    Game.prototype.__realism39Render = true;
    // Fixed tropical afternoon: no day/night cycle, warm golden light, clear skies.
    RC.tropical = !params.has('dayNight');
    if (RC.tropical) {
      const TROPICAL_HOUR = 17.35;
      const upd = Game.prototype.update;
      Game.prototype.update = function (dt) {
        this.worldHour = TROPICAL_HOUR; this.clockRunning = false;
        if (!this.rcWeatherSet && this.weather?.setControl) { this.rcWeatherSet = true; try { this.weather.setControl('clear'); } catch { } }
        return upd.call(this, dt);
      };
      const hide = () => { for (const id of ['clock-display', 'clock-range', 'clock-toggle', 'day-phase']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; } };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide); else hide();
    }
    const legacyQuality = Game.prototype.manageVisualQuality450;
    Game.prototype.manageVisualQuality450 = function (active, now) {
      const r = this.renderer;
      if (!r || !r.atmosphere) return legacyQuality.call(this, active, now);
      this.nativeTier475 = 0; r.nativeTier475 = 0;
      if (!active || this.graphicsLost || this.activeFrames < 240 || now - (this.rcQualityLast || 0) < 4000) return;
      this.rcQualityLast = now;
      const frame = this.frameTimeMs || 16;
      // Preferred: real GPU time from a timer query (target ~36 ms GPU / frame).
      if (r.rcGpuMs != null) {
        if (r.rcGpuMs > 38 && r.rcResScale > .62) r.setResolutionScale(r.rcResScale - (r.rcGpuMs > 70 ? .12 : .06));
        else if (r.rcGpuMs < 22 && r.rcResScale < 1) r.setResolutionScale(r.rcResScale + .05);
        return;
      }
      // A resize reallocates every render target, so it must never oscillate.
      // After a drop, verify it actually helped; if the frame is CPU-bound,
      // restore full resolution and stop probing for a while.
      const probe = this.rcResProbe;
      if (probe) {
        this.rcResProbe = null;
        if (frame > probe.frame * .9) { r.setResolutionScale(probe.scale); this.rcResLockUntil = now + 45000; return; }
      }
      if (now < (this.rcResLockUntil || 0)) return;
      if (frame > 30 && r.rcResScale > .55) {
        this.rcResProbe = { frame, scale: r.rcResScale };
        r.setResolutionScale(r.rcResScale - (frame > 45 ? .15 : .08));
      } else if (frame < 17 && r.rcResScale < 1) r.setResolutionScale(r.rcResScale + .05);
    };
  };

  installRenderer();
})(Heatline);
