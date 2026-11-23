'use strict';
/* Acceptance: real game/world/interiors run under a fake renderer, NOT GPU QA. */
const fs=require('fs'),path=require('path'),{H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,sa=w.stage06OrientationStats||{},tests=[],errors=[],access=[];
g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
const check=(name,pass,detail={})=>{const v={name,pass:!!pass,detail};tests.push(v);if(!pass){errors.push(v);console.error('FAILED',name,JSON.stringify(detail).slice(0,1500));}};
function collides(solids,x,z,r=.40){return solids.some(s=>{
  const cx=Math.max(s.x-s.hw,Math.min(s.x+s.hw,x)),cz=Math.max(s.z-s.hd,Math.min(s.z+s.hd,z));
  return (x-cx)**2+(z-cz)**2<r*r;
});}
function outdoorsClear(p){let bad=[];const n=H.stage06Orientation.dir(p);
 for(const v of [.4,1.0,1.6,2.25,3.15]){
  const x=p.x+n.x*v,z=p.z+n.z*v;
  const collision=w.nearby(x,z).filter(s=>Math.abs(s.x-x)<s.hw+.4&&Math.abs(s.z-z)<s.hd+.4);
  if(collision.length)bad.push({v,x,z,collisions:collision.length});
 }return bad;
}
function insidePassage(p,scene){const n=H.stage06Orientation.dir(p),bad=[];
 for(const t of [2.1,2.5,3,3.5,4,4.5]){
  const x=p.x-n.x*t,z=p.z-n.z*t;
  if(collides(scene.solids,x,z,.28))bad.push({t,x,z});
 }return bad;
}
check('stage06_road_facing_stage_loaded',sa.stage===6);
check('stage06_world_counts_stable',w.city20DistrictBuildings.length===130&&w.buildings.length===84&&w.roads461.length===52);
check('stage06_legacy_and_new_portals_stable',w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('all_215_obsolete_ids_stay_disabled',w.entrancePortals.slice(0,298).filter(p=>!p.interiorReady).length===215);
check('stage06_found_no_geometry_errors',sa.errors?.length===0,sa.errors?.slice(0,5));
check('stage06_oriented_a_meaningful_number',sa.oriented>=50,{oriented:sa.oriented,legacy:sa.legacyOriented,new:sa.city20Oriented});
check('stage06_oriented_legacy_and_city20',sa.legacyOriented>10&&sa.city20Oriented>20);
check('stage06_kept_road_count_and_shape',w.roads461.length===52&&w.roads461.find(r=>r.id==='privateSpine469')?.points.length===13);
check('stage06_annotated_all_reoriented_doors',sa.updated.every(u=>{
 const p=w.entrancePortals[u.id],door=w.stage42Doors.find(d=>d.id===u.id);
 return p.stage06Oriented&&p.facing===u.to&&door.facing===u.to&&
  Math.hypot(p.x-door.x,p.z-door.z)<.40&&w.lobbyDoors443.size>0;
}));
check('stage06_original_north_labels_not_faked',w.entrancePortals.filter(p=>p.interiorReady&&p.facing==='north').length===214-sa.oriented);
for(const p of w.entrancePortals.filter(p=>p.interiorReady)){
 const plan=w.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);
 let begin=false,entered=false,exit=false,nearest=false,sceneFit=false,scene=null,interiorBad=[],externalBad=[],error=null,directOK=false,facadeSolidOK=false;
 const n=H.stage06Orientation.dir(p),position={x:p.x+n.x*1.9,z:p.z+n.z*1.9};
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
 g.avatar.x=position.x;g.avatar.z=position.z;g.avatar.y=H.outdoorHeight(position.x,position.z);
 try{
  nearest=g.nearestEntrance()?.id===p.id;
  begin=g.beginBuildingEntry(p.id);
  if(begin){g.updateBuildingEntry(2);entered=g.indoor?.portalId===p.id;
   if(entered){scene=g.indoor.scene;const b=plan.outerShell;
    sceneFit=scene.bounds.xmin>=b.x-b.w*.5-.10&&scene.bounds.xmax<=b.x+b.w*.5+.10&&
     scene.bounds.zmin>=b.z-b.d*.5-.10&&scene.bounds.zmax<=b.z+b.d*.5+.10;
    if(p.stage06Oriented){
      const interior=H.stage06Orientation.pos(p,-2.7);
      sceneFit=sceneFit&&scene.stage06SceneUpdated===true&&Math.hypot(scene.entrance.x-interior.x,scene.entrance.z-interior.z)<.1;
      externalBad=outdoorsClear(p);interiorBad=insidePassage(p,scene);
    }
    g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z;
    const yes=g.exitBuilding();if(yes)for(let i=0;i<65&&g.exitTransition;i++)g.stage42UpdateExit(.045);
    exit=yes&&!g.indoor&&!g.exitTransition;
   }
  }
  if(p.stage06Oriented){
   g.indoor=null;g.entryTransition=null;g.exitTransition=null;
   g.avatar.x=position.x;g.avatar.z=position.z;
   directOK=g.enterBuilding(p.id);
   if(directOK){directOK=Math.hypot(g.avatar.x-(p.x-n.x*3.65),g.avatar.z-(p.z-n.z*3.65))<.2;}
  }
 }catch(e){error=e.stack||String(e);}
 access.push({id:p.id,facing:p.facing,oriented:!!p.stage06Oriented,legacy:!p.stage05City20,begin,entered,exit,nearest,sceneFit,
  exteriorBad:externalBad,insideBad:interiorBad,directOK,error});
}
const bad=k=>access.filter(a=>!a[k]);
for(const [key,title] of [['begin','all_214_game_begin_entries'],['entered','all_214_enter_interiors'],['exit','all_214_exit_to_street'],['sceneFit','all_214_interiors_fit_shell'],['nearest','all_214_portals_discoverable_from_facades']])
 check(title,bad(key).length===0,bad(key).slice(0,12));
check('all_173_oriented_entries_collision_free_outside',access.filter(a=>a.oriented&&a.exteriorBad.length>0).length===0,access.filter(a=>a.oriented&&a.exteriorBad.length>0).slice(0,12));
check('all_oriented_entries_interior_passage_clear',access.filter(a=>a.oriented&&a.insideBad.length>0).length===0,access.filter(a=>a.oriented&&a.insideBad.length>0).slice(0,12));
check('oriented_portals_support_direct_manual_entry',access.filter(a=>a.oriented&&!a.directOK).length===0,access.filter(a=>a.oriented&&!a.directOK).slice(0,12));
check('no_runtime_game_exceptions',access.filter(a=>a.error).length===0,access.filter(a=>a.error).slice(0,5));
check('stage06_all_world_meshes_numeric',w.boxes.every(o=>[o.x,o.y,o.z,o.w,o.h,o.d].every(Number.isFinite)));
check('stage06_exterior_meshes_all_positive',w.boxes.filter(o=>o.stage06Entry).every(o=>o.w>.04&&o.h>.04&&o.d>.04));
let meshCount=0,meshOK=true;
for(const p of w.entrancePortals.filter(p=>p.stage06Oriented)){
 const door=w.stage42Doors.find(d=>d.id===p.id),arr=[];
 H.stage06Orientation.drawDoor(g,door,arr);meshCount+=arr.length;
 if(arr.length!==4||arr.some(o=>![o.x,o.y,o.z,o.w,o.h,o.d,o.yaw].every(Number.isFinite)))meshOK=false;
}
check('oriented_3d_double_animated_door_leaves_valid',meshOK,{drawnParts:meshCount});
const result={stage:6,description:'CPU Game/world physics test only; no real GPU or visual QA',gpuVerified:false,tests,pass:tests.filter(x=>x.pass).length,total:tests.length,failed:errors.length,
 summary:{oriented:sa.oriented,legacy:sa.legacyOriented,new:sa.city20Oriented,retainedNorth:sa.northPreserved,totalAccessible:214,roadCount:w.roads461.length},access};
fs.writeFileSync(path.join(__dirname,'STAGE06_OF35_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,total:result.total,errors:errors.map(v=>v.name),summary:result.summary},null,2));
if(errors.length)process.exitCode=1;
