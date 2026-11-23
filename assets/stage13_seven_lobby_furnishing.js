/* SUNSET STATE remediation 13/35: finish the SEVEN narrow legacy foyers omitted by CITY20-11.
 * World-shell details plus actual indoor scene decoration. No invented entry or collision.
 * The 214 active portals, stair/lift behavior, 52 roads and all prior stages are preserved.
 * A/B: ?stage13LobbiesOff=1 or STAGE13_LOBBIES_OFF=1 (Node QA).
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function')throw Error('Stage13/35 requires complete Stage12 pipeline');
 const off=()=>globalThis.__SUNSET_STAGE13_LOBBIES_OFF===true||
   (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage13LobbiesOff'));
 const key=(x,z)=>String(x)+','+String(z);
 const targets=new Map();
 const isNumber=n=>typeof n==='number'&&Number.isFinite(n);
 function mesh(arr,p,kind,x,y,z,w,h,d,color,material,shape){
   if(![x,y,z,w,h,d].every(isNumber)||Math.min(w,h,d)<.015)throw Error('Stage13 invalid narrow foyer part');
   const b=H.box(x,y,z,w,h,d,color,0,4,0);
   b.material=material;b.shape=shape||'reference_slab469';b.visibilityCap=180;b.lodMax=180;
   b.stage13NarrowLobby=true;b.stage13NarrowPortal=p.id;b.stage13NarrowKind=kind;
   arr.push(b);return b;
 }
 function eligible(w){
   const existing=new Set(w.boxes.filter(b=>b.city20Stage11===true).map(b=>b.city20Stage11Portal));
   const plans=new Map(w.structuralPlans.filter(p=>p?.outerShell&&p.foyer)
      .map(p=>[key(p.outerShell.x,p.outerShell.z),p]));
   return w.entrancePortals.filter(p=>p.interiorReady&&!p.stage05City20&&!p.stage04CompactHotel&&!existing.has(p.id))
     .map(p=>({portal:p,plan:plans.get(key(p.buildingX,p.buildingZ))}))
     .filter(({plan})=>plan?.interiorReady&&isNumber(plan.foyer.w)&&isNumber(plan.foyer.d)&&
       plan.foyer.w>=6.8&&plan.foyer.w<=7.6&&plan.foyer.d>=3.30&&plan.foyer.d<3.60);
 }
 function enhance(w){
   if(w.stage13NarrowLobbyStats)return w.stage13NarrowLobbyStats;
   const original={boxes:w.boxes.length,solids:w.solids.length,propSolids:w.propSolids.length,
     roads:w.roads461.length,portals:w.entrancePortals.length,ready:w.entrancePortals.filter(p=>p.interiorReady).length};
   const list=eligible(w),idList=list.map(t=>t.portal.id);
   if(list.length!==7)throw Error('Stage13 expected seven omitted, live narrow legacy foyers; found '+list.length);
   const results=[];
   for(const {portal:p,plan}of list){
     const f=plan.foyer,ground=H.outdoorHeight(f.x,f.z);
     if(!isNumber(ground))throw Error('Stage13 invalid ground '+p.id);
     const before=w.boxes.length,half=f.w*.5;
     // Low-profile floor inlay and furniture are within the 7.2 x 3.4m original foyer.
     // The central 3.9m-wide approach remains free of tall or solid decorations.
     mesh(w.boxes,p,'narrow-runner',f.x,ground+.040,f.z,f.w*.54,.045,f.d*.75,'#ada392','stone');
     for(const side of [-1,1]){
       const xx=f.x+side*(half-.60),zz=f.z+.14;
       mesh(w.boxes,p,'compact-seat',xx,ground+.46,zz,.60,.26,.95,
         plan.materialFamily==='hotel'?'#8b7868':'#8c928d','fabric','rounded_smooth');
       mesh(w.boxes,p,'seat-back',xx+side*.22,ground+.78,zz,.12,.64,1.00,'#81796e','wood','rounded_smooth');
       mesh(w.boxes,p,'wall-graphic',f.x+side*(half-.14),ground+1.76,zz,.055,.67,.82,
         '#627d81','metal');
       mesh(w.boxes,p,'wall-sconce',f.x+side*(half-.24),ground+2.52,zz+.40,.12,.16,.32,
         '#e9d6b0','light_emissive');
     }
     mesh(w.boxes,p,'ceiling-recess',f.x,ground+3.07,f.z,1.55,.075,.42,'#ded5c4','concrete');
     mesh(w.boxes,p,'directory',f.x,ground+2.76,f.z+f.d*.38,.95,.44,.07,'#849494','metal');
     targets.set(key(plan.outerShell.x,plan.outerShell.z),p.id);
     results.push({portal:p.id,foyerDepth:f.d,foyerWidth:f.w,parts:w.boxes.length-before});
   }
   if(w.solids.length!==original.solids||w.propSolids.length!==original.propSolids||
      w.roads461.length!==original.roads||w.entrancePortals.length!==original.portals||
      w.entrancePortals.filter(p=>p.interiorReady).length!==original.ready)
       throw Error('Stage13 changed access or collisions');
   const stats={stage:13,issue:'S01-IN-01',unfurnishedFoyersFound:list.length,
      originalCity20Stage11Decorated:w.city20Stage11Stats?.decoratedLobbies||null,
      repairedFoyers:results.length,portalIDs:idList,worldMeshesAdded:w.boxes.length-original.boxes,
      newCollisionBodies:0,existingActiveEntrances:original.ready,roadsUnchanged:true,
      results,gpuVisualVerified:false,real1080p50FpsVerified:false};
   w.stage13NarrowLobbyStats=stats;return stats;
 }
 function safeSpot(scene,plan){
   const b=plan.outerShell,{X,Z}=H.interiorExtents450(b),base=0;
   // The north-east lobby nook is away from each east-facing main entrance.
   for(const dx of [1.3,1.65,2.0,2.5])for(const dz of [1.4,1.6,2.1,2.6,3.0]){
     const x=b.x+X-dx,z=b.z-Z+dz,hw=.43,hd=.61;
     if(x-hw<scene.bounds.xmin+.15||x+hw>scene.bounds.xmax-.1||
        z-hd<scene.bounds.zmin+.15||z+hd>scene.bounds.zmax-.1)continue;
     if(Math.hypot(x-scene.entrance.x,z-scene.entrance.z)<3.3||
        Math.hypot(x-scene.lift.x,z-scene.lift.z)<3)continue;
     if(scene.solids.some(v=>Math.abs(v.x-x)<v.hw+hw+.10&&Math.abs(v.z-z)<v.hd+hd+.10))continue;
     if(scene.boxes.some(v=>v.layer===4&&v.h>.18&&v.h<2.2&&
        v.y-v.h*.5<base+1.9&&v.y+v.h*.5>base+.2&&
        Math.abs(v.x-x)<v.w*.5+hw+.10&&Math.abs(v.z-z)<v.d*.5+hd+.10))continue;
     return {x,z,dx,dz};
   }
   return null;
 }
 function decorateScene(scene,plan,floor){
   if(!scene||floor!==0||scene.stage13NarrowFurnished)return scene;
   const id=targets.get(key(plan.outerShell.x,plan.outerShell.z));
   if(!Number.isInteger(id))return scene;
   const before={solids:scene.solids.length,doors:scene.doors.length,rooms:scene.rooms.length,
     pickups:scene.pickups.length,lights:scene.lights.length,boxes:scene.boxes.length};
   const site=safeSpot(scene,plan);
   if(!site)throw Error('Stage13 no interior site clear of walls, route and existing furnishing for '+id);
   const p={id},x=site.x,z=site.z;
   // Compact built-in bench, cushion, backrest and feet: no fake interactive props.
   mesh(scene.boxes,p,'indoor-seat',x,.48,z,.66,.24,1.0,'#907968','fabric','rounded_smooth');
   mesh(scene.boxes,p,'indoor-cushion',x,.63,z,.62,.11,.95,'#c0aa95','fabric','rounded_smooth');
   mesh(scene.boxes,p,'indoor-back',x+.22,.91,z,.12,.74,1.02,'#7e827d','wood','rounded_smooth');
   for(const sx of [-1,1])for(const sz of [-1,1])
     mesh(scene.boxes,p,'indoor-leg',x+sx*.21,.25,z+sz*.38,.10,.48,.10,'#75827e','metal');
   const b=plan.outerShell,{Z}=H.interiorExtents450(b);
   mesh(scene.boxes,p,'indoor-wall-art',x,1.94,b.z-Z+.24,1.00,.62,.07,'#527880','metal');
   mesh(scene.boxes,p,'indoor-art-highlight',x,1.94,b.z-Z+.21,.65,.28,.038,'#c3d2ce','glass');
   mesh(scene.boxes,p,'indoor-wall-light',x,2.80,b.z-Z+.31,.80,.075,.18,'#f1ddba','light_emissive');
   if(scene.solids.length!==before.solids||scene.doors.length!==before.doors||scene.rooms.length!==before.rooms||
      scene.pickups.length!==before.pickups||scene.lights.length!==before.lights)
      throw Error('Stage13 changed scene gameplay systems for portal '+id);
   scene.stage13NarrowFurnished={portalId:id,parts:scene.boxes.length-before.boxes,seatSite:site,
     newCollisionBodies:0,entrancePreserved:true,liftPreserved:true};
   return scene;
 }
 function installInterior(){
   if(H.stage13NarrowLobbies.interiorInstalled)return;
   const prior=H.polishInterior461;
   if(typeof prior!=='function')throw Error('Stage13 requires real interior builder');
   H.polishInterior461=function stage13Polish(scene,plan,floor){
     const done=prior(scene,plan,floor);
     return off()?done:decorateScene(done,plan,floor);
   };
   H.stage13NarrowLobbies.interiorInstalled=true;
 }
 H.stage13NarrowLobbies={enhance,off,eligible,installInterior,targets,decorateScene,interiorInstalled:false};
 H.finishReferenceBuildings469=function stage13Finish(w){
   const result=previous(w);if(!off())enhance(w);return result;
 };
})(Heatline);
