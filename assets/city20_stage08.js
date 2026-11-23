/* CITY20 stage 08: distance-filtered material microdetail. No extra geometry or textures. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const disabled=typeof location!=='undefined'&&typeof URLSearchParams==='function'&&new URLSearchParams(location.search).has('city20materialsOff');
if(disabled)globalThis.__SUNSET_CITY20_DISABLE_STAGE08=true;
const anchor='          vec3 albedo=vColor.rgb;';
const detail=String.raw`
          // CITY20 stage08: world-space, derivative-filtered architectural surfaces.
          // Avoid aliasing at distance and preserve authored per-object colors.
          if(uQuality>=.64){
            bool concrete=matId==1.0||matId==4.0||matId==6.0;
            bool stone=matId==5.0||matId==12.0;
            bool asphalt=matId==13.0||matId==27.0;
            bool architecturalMetal=matId==3.0||matId==18.0||matId==22.0;
            vec3 p=vPosition;
            float footprint=max(length(fwidth(p.xz)),length(fwidth(p.xy)));
            float microFade=1.0-smoothstep(.14,.92,footprint);
            float midFade=1.0-smoothstep(.75,4.2,footprint);
            if(concrete||stone){
              float coarse=smoothNoise(p.xz*.41+p.y*.19);
              float pores=smoothNoise(p.xz*4.8+p.y*.85);
              float grain=(coarse-.5)*.085*midFade+(pores-.5)*.065*microFade;
              albedo*=1.0+grain;
              rough=clamp(rough+(.5-coarse)*.09*midFade,.08,.98);
            }
            if(asphalt){
              float aggregate=smoothNoise(p.xz*2.15);
              float fine=smoothNoise(p.xz*9.1);
              albedo*=1.0+(.5-aggregate)*.085*midFade+(.5-fine)*.055*microFade;
              rough=clamp(rough+(.5-aggregate)*.055*midFade,.15,.99);
            }
            if(architecturalMetal){
              float brushed=smoothNoise(vec2(p.x*.43+p.y*5.8,p.z*.43+p.y*.13));
              albedo*=1.0+(brushed-.5)*.048*microFade;
              rough=clamp(rough+(.5-brushed)*.065*microFade,.08,.96);
            }
            if(glassMat){
              // Subtle angle-dependent tint; keep existing alpha and reflections.
              float facing=clamp(abs(dot(normalize(n),normalize(v))),0.0,1.0);
              albedo*=mix(vec3(.93,.975,1.035),vec3(1.01,1.015,1.02),facing);
              rough=clamp(rough,.065,.16);
            }
          }
`;
H.city20Stage08MaterialFragment=function(source){
 if(globalThis.__SUNSET_CITY20_DISABLE_STAGE08===true)return source;
 if(typeof source!=='string')throw Error('stage08 missing fragment shader');
 const i=source.indexOf(anchor);
 if(i<0||source.indexOf(anchor,i+anchor.length)>=0)throw Error('stage08 material insertion point not unique');
 const result=source.slice(0,i+anchor.length)+'\n'+detail+source.slice(i+anchor.length);
 H.city20Stage08Stats={stage:8,shaderInserted:true,additionalTextures:0,additionalGeometry:0,additionalDrawCalls:0,usesDerivativeFiltering:true,qualityGated:true,materialFamilies:5};
 return result;
};
H.city20Stage08={enabled:()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE08!==true};
})(Heatline);
