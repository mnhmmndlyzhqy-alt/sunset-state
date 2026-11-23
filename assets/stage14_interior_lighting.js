/* SUNSET STATE / Stage 14 of 35 - genuine, time-aware indoor light sources.
 * Existing WebGL2 uLightData/uLightRGB point lights do the shading. This is NOT
 * merely adding emissive materials. Keep the existing 12-light GPU budget.
 * Installed after Stage05/06/07/13 interior hooks. No edits to buildings,
 * entrances, navigation, colliders, or the chosen reference map.
 * A/B: ?stage14LightsOff=1 or __SUNSET_STAGE14_LIGHTS_OFF=true.
 */
var Heatline = globalThis.Heatline || {};
(function(H){
 'use strict';
 const off=()=>globalThis.__SUNSET_STAGE14_LIGHTS_OFF===true ||
   (typeof location!=='undefined' && new URLSearchParams(location.search).has('stage14LightsOff'));
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const isFinitePosition=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
 const MAX_SHADER_LIGHTS=12;
 let interiorsDecorated=0,retailDecorated=0;
 function rotate(x,z,cx,cz,angle){const dx=x-cx,dz=z-cz,c=Math.cos(angle),s=Math.sin(angle);
   return {x:cx+c*dx-s*dz,z:cz+s*dx+c*dz};}
 function decorativeFixture(boxes,x,z,y,kind,style,yaw=0){
   const body=H.box(x,y+.21,z,.72,.07,.65,style==='modern'?'#7c9295':'#87766b',yaw,4,0);
   body.material='metal';body.stage14Fixture=true;body.stage14FixtureKind=kind;
   const diffuser=H.box(x,y+.15,z,.59,.085,.53,style==='modern'?'#d9ebee':'#f6dfb6',yaw,5,.42);
   diffuser.material='light_emissive';diffuser.stage14Fixture=true;diffuser.stage14FixtureKind=kind;
   boxes.push(body,diffuser);
 }
 function addRealSource(scene,x,y,z,kind,modern){
   if(!isFinitePosition({x,y,z}))throw Error('Stage14 invalid light position');
   const light={x,y,z,radius:kind==='entrance'?8.3:modern?11.5:10.7,
      r:modern?.91:1.18,g:modern?1.02:.96,b:modern?1.09:.77,
      stage14Real:true,stage14Kind:kind};
   scene.lights.push(light);return light;
 }
 function decorateScene(scene,plan,floor){
   if(!scene||scene.stage14Lighting||!plan?.outerShell||!Array.isArray(scene.lights)||!Array.isArray(scene.boxes))return scene;
   const shell=plan.outerShell,base=floor*plan.floorHeight;
   const modern=['hotel','tech','glass'].includes(plan.materialFamily),style=modern?'modern':'warm';
   const yaw=scene.stage07Yaw||0;
   const safeHalfZ=Math.max(1.3,Math.min(shell.d*.20,3.6));
   const safeHalfX=Math.max(.75,Math.min(shell.w*.12,2.1));
   const oldLights=scene.lights.length,oldBoxes=scene.boxes.length;
   const sourceTypes=[];
   const add=(localX,localZ,kind)=>{
     const p=rotate(shell.x+localX,shell.z+localZ,shell.x,shell.z,yaw);
     // Lights and fixtures have the same physical position; these meshes have
     // no collision solids, avoiding unseen obstructions at door thresholds.
     const y=base+3.48;
     addRealSource(scene,p.x,y,p.z,kind,modern);
     decorativeFixture(scene.boxes,p.x,p.z,base+3.71,kind,style,yaw);
     sourceTypes.push(kind);
   };
   // Keep each corridor evenly illuminated, including small compact houses.
   add(-safeHalfX*.32,-safeHalfZ,'corridor-front');
   add(safeHalfX*.32,safeHalfZ,'corridor-rear');
   if(floor===0 && isFinitePosition({...scene.entrance,y:0})){
     const from=scene.entrance,to={x:shell.x,z:shell.z};
     const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
     if(length>2.1){
       const near={x:from.x+dx/length*2.1,z:from.z+dz/length*2.1};
       const close=scene.lights.slice(oldLights).some(l=>Math.hypot(l.x-near.x,l.z-near.z)<2.1);
       if(!close){
         addRealSource(scene,near.x,base+3.48,near.z,'entrance',modern);
         decorativeFixture(scene.boxes,near.x,near.z,base+3.71,'entrance',style,yaw);
         sourceTypes.push('entrance');
       }
     }
   }
   // Every scene is generated on demand. No world-scale lamps or extra shadow
   // maps are created; the shader still receives at most twelve local sources.
   const added=scene.lights.length-oldLights;
   if(added<2||added>3||scene.boxes.length-oldBoxes!==2*added)
     throw Error('Stage14 invalid emitter/fixture pairing');
   scene.stage14Lighting={buildingId:plan.buildingId,floor,modern,sourceTypes,
      physicalLightSources:added,fixtureMeshes:2*added,baselineLights:oldLights,
      gpuLightBudget:MAX_SHADER_LIGHTS,realWebGLVerified:false};
   interiorsDecorated++;
   return scene;
 }
 function decorateRetail(scene,unit){
   if(!scene||scene.stage14Lighting||!Array.isArray(scene.lights)||!unit)return scene;
   const initial=scene.lights.length,original=scene.boxes.length;
   for(const [i,dz]of [3.7,8.6].entries()){
     const x=unit.centerX,z=unit.frontZ+dz,y=3.28;
     addRealSource(scene,x,y,z,'retail-'+i,false);
     decorativeFixture(scene.boxes,x,z,3.50,'retail-'+i,'warm');
   }
   scene.stage14Lighting={retail:true,physicalLightSources:2,fixtureMeshes:4,
      baselineLights:initial,gpuLightBudget:MAX_SHADER_LIGHTS,realWebGLVerified:false};
   if(scene.lights.length!==initial+2||scene.boxes.length!==original+4)
     throw Error('Stage14 retail lights mismatch');
   retailDecorated++;
   return scene;
 }
 function resolve(game,original,type='building'){
   if(!Array.isArray(original)||off())return original;
   const daylight=clamp(H.daylightFromHour(Number.isFinite(game?.worldHour)?game.worldHour:12),0,1);
   const night=1-daylight,twilight=night*night*(3-2*night);
   const gain=.52+.60*twilight;
   const camera=game?.cam||game?.avatar||{x:0,y:0,z:0};
   // Ranking is per frame and per CAMERA (not object origin); the same already
   // existing shader limit is honored in huge lobbies with >12 authored lights.
   const selected=original.filter(isFinitePosition).map((l,i)=>{
     const dx=l.x-camera.x,dy=l.y-camera.y,dz=l.z-camera.z;
     const dist=dx*dx+dz*dz+dy*dy*.32;
     const radius=Math.max(1,Number.isFinite(l.radius)?l.radius:8);
     return {l,i,rank:dist/(radius*radius)-(l.stage14Real?.045:0)};
   }).sort((a,b)=>a.rank-b.rank||a.i-b.i).slice(0,MAX_SHADER_LIGHTS);
   const out=selected.map(({l})=>({
     ...l,
     r:clamp((Number(l.r)||0)*gain*(.92+.12*night),0,3.5),
     g:clamp((Number(l.g)||0)*gain*(1-.035*night),0,3.5),
     b:clamp((Number(l.b)||0)*gain*(1-.11*night),0,3.5),
   }));
   game.stage14LightingNow={type,hour:game.worldHour,daylight,nightGain:gain,
      authoredLights:original.length,shaderLights:out.length,
      selectedStage14Real:out.filter(l=>l.stage14Real).length};
   globalThis.__SUNSET_STAGE14_LIGHTING=game.stage14LightingNow;
   return out;
 }
 function install(){
   if(api.installed)return;
   const old=H.polishInterior461,retail=H.makeRetailScene;
   if(typeof old!=='function'||typeof retail!=='function')throw Error('Stage14 needs original interior and retail builders');
   H.polishInterior461=function stage14Interior(scene,plan,floor){
     const built=old(scene,plan,floor);
     return off()?built:decorateScene(built,plan,floor);
   };
   H.makeRetailScene=function stage14Retail(unit){
     const built=retail(unit);
     return off()?built:decorateRetail(built,unit);
   };
   api.installed=true;
 }
 const api={off,install,resolve,decorateScene,decorateRetail,MAX_SHADER_LIGHTS,
    get counts(){return {interiorsDecorated,retailDecorated}}};
 H.stage14Lighting=api;
 install();
})(Heatline);
