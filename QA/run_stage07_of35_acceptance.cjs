'use strict';
/* Uses REAL game logic and generated world, but a fake renderer. Does NOT assert GPU/FPS. */
const fs=require('fs'),path=require('path'),{H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,a=w.stage07AlignmentStats,tests=[],detail=[],failures=[];
function check(name,pass,data){tests.push({name,pass:!!pass,detail:data});if(!pass){failures.push(name);console.error('FAILED',name,JSON.stringify(data)?.slice(0,600));}}
const compact=w.city20DistrictBuildings.filter(s=>w.structuralPlans.find(q=>q.outerShell.x===s.x&&q.outerShell.z===s.z)?.floorCount===1);
const rotated=w.city20DistrictBuildings.filter(s=>!!s.streetAligned);
const approx=(x,y,t=.03)=>Math.abs(x-y)<=t;
const contact=(x,z,r=.33)=>w.nearby(x,z).filter(s=>{
 const cx=Math.max(s.x-s.hw,Math.min(s.x+s.hw,x)),cz=Math.max(s.z-s.hd,Math.min(s.z+s.hd,z));
 return Math.hypot(x-cx,z-cz)<r;
});
const indoorContact=(scene,x,z,r=.25)=>scene.solids.filter(s=>{
 const cx=Math.max(s.x-s.hw,Math.min(s.x+s.hw,x)),cz=Math.max(s.z-s.hd,Math.min(s.z+s.hd,z));
 return Math.hypot(x-cx,z-cz)<r;
});
check('stage07_loaded',a?.stage===7);
check('strictly_130_reference_mapped_buildings',w.city20DistrictBuildings.length===130);
check('all_52_road_routes_preserved',w.roads461.length===52&&w.roads461.find(r=>r.id==='privateSpine469')?.points.length===13);
check('historical_and_CITY20_portal_counts_unchanged',w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('original_84_legacy_buildings_preserved',w.buildings.length===84);
check('215_archived_portals_stay_disabled',w.entrancePortals.slice(0,298).filter(p=>!p.interiorReady).length===215);
check('stage04_stage05_stage06_still_present',w.stage04AccessStats?.oneCompactHotelOpened===true&&w.stage05City20Stats?.entrancesAdded===130&&w.stage06OrientationStats?.oriented===173);
check('all_new_rotations_are_noncardinal',rotated.length>=20&&rotated.length===a.realRotations&&rotated.every(s=>Math.abs(s.stage07Yaw)>.09&&Math.abs(s.stage07Yaw)<=.431),{rotated:rotated.length});
check('only_single_storey_compact_buildings_rotated',rotated.every(s=>w.structuralPlans.find(q=>q.outerShell.x===s.x&&q.outerShell.z===s.z)?.floorCount===1),{eligible:compact.length,rotated:rotated.length});
check('no_static_world_geometry_deleted',w.boxes.length>=a.boxesAtFinalize&&a.boxesAtFinalize>180000,{boxes:w.boxes.length,original:a.boxesAtFinalize});
check('rotated_collision_cells_are_indexed_and_finite',w.solids.filter(s=>s.stage07AlignedSolid).length===a.collisionCellsAdded&&w.solids.every(s=>[s.x,s.z,s.hw,s.hd].every(Number.isFinite)&&s.hw>0&&s.hd>0),{added:a.collisionCellsAdded,actual:w.solids.filter(s=>s.stage07AlignedSolid).length});
check('all_district_center_coordinates_remain_reference_locked',rotated.every(s=>s.x===w.city20Stage02Stats.placements.find(p=>p.id===s.id)?.x||approx(s.x,w.city20Stage02Stats.placements.find(p=>p.id===s.id)?.x,.001)));
check('no_rotated_site_has_empty_mesh_or_collision_footprint',a.updates.every(q=>q.meshesRotated>=4&&q.oldColliders===3&&q.newCollisionCells>=3));
check('stage07_source_did_not_change_legacy_entry_positions',w.entrancePortals.filter(p=>p.interiorReady&&!p.stage05City20).every(p=>!p.stage07Aligned));
check('all_214_exterior_doors_still_registered',w.stage42Doors.length===214&&rotated.every(s=>w.stage42Doors.some(d=>d.id===s.city20Stage05PortalId)));
check('single_floor_interiors_only',compact.length>=40&&a.singleFloorEligible===compact.length,{compact:compact.length});
check('none_of_65_multifloor_elevators_or_dynamic_door_motions_rotated',w.city20DistrictBuildings.filter(s=>w.structuralPlans.find(q=>q.outerShell.x===s.x&&q.outerShell.z===s.z)?.floorCount>1).every(s=>!s.streetAligned));
let doorPass=0,doorBad=[],exteriorBad=[],interiorBad=[],entryBad=[],sceneBad=[],gameErrors=[];
g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
for(const s of rotated){const portal=w.entrancePortals[s.city20Stage05PortalId],door=w.stage42Doors.find(d=>d.id===portal.id),n=H.stage06Orientation.dir(portal),boxes=[];
 H.stage06Orientation.drawDoor(g,door,boxes);
 if(boxes.length===4&&boxes.every(v=>[v.x,v.y,v.z,v.w,v.h,v.d,v.yaw].every(Number.isFinite)))doorPass++;
 else doorBad.push({id:portal.id,objects:boxes.length});
 for(const r of [.3,.8,1.3,2.05,2.85]){const x=portal.x+n.x*r,z=portal.z+n.z*r,bad=contact(x,z,.27);
  if(bad.length)exteriorBad.push({id:portal.id,distance:r,x,z,solids:bad.length});}
 try{g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
   g.avatar.x=portal.x+n.x*2.3;g.avatar.z=portal.z+n.z*2.3;
   const nearest=g.nearestEntrance();
   const ok=g.beginBuildingEntry(portal.id);if(ok)g.updateBuildingEntry(1.5);
   const entered=g.indoor?.portalId===portal.id,scene=g.indoor?.scene;
   if(!ok||!entered||!scene)entryBad.push({id:portal.id,ok,entered,nearest:nearest?.id});
   else{
    const correct=scene.stage07Aligned&&approx(scene.stage07Yaw,s.stage07Yaw,1e-4)&&
        Math.hypot(scene.entrance.x-H.stage06Orientation.pos(portal,-2.7).x,scene.entrance.z-H.stage06Orientation.pos(portal,-2.7).z)<3;
    if(!correct)sceneBad.push({id:portal.id,sceneYaw:scene.stage07Yaw,entrance:scene.entrance,portal:{x:portal.x,z:portal.z}});
    for(const r of [2.1,2.45,2.8,3.3]){
      const x=portal.x-n.x*r,z=portal.z-n.z*r,bad=indoorContact(scene,x,z,.23);
      if(bad.length)interiorBad.push({id:portal.id,distance:r,solids:bad.length});
    }
    g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z;
    const exit=g.exitBuilding();if(exit)for(let j=0;j<45&&g.exitTransition;j++)g.stage42UpdateExit(.04);
    if(!exit||g.indoor||g.exitTransition)entryBad.push({id:portal.id,exit,indoor:!!g.indoor,transition:!!g.exitTransition});
   }
 }catch(e){gameErrors.push({id:portal.id,error:e.stack||String(e)});}
 detail.push({id:s.id,portalId:portal.id,yawDeg:+(s.stage07Yaw*180/Math.PI).toFixed(1),street:s.nearestStreet});
}
check('all_noncardinal_animated_door_meshes_finite',doorPass===rotated.length,{doorPass,bad:doorBad.slice(0,8)});
check('all_noncardinal_entrances_have_clear_exterior_access',exteriorBad.length===0,exteriorBad.slice(0,10));
check('all_noncardinal_entrances_have_clear_indoor_approach',interiorBad.length===0,interiorBad.slice(0,10));
check('enter_and_leave_every_rotated_building',entryBad.length===0,entryBad.slice(0,8));
check('all_rotated_interior_scenes_match_exterior_orientation',sceneBad.length===0,sceneBad.slice(0,6));
check('no_game_logic_exceptions',gameErrors.length===0,gameErrors.slice(0,4));
const result={stage:7,engine:'real Game under CPU fake renderer',gpuVerified:false,renderedScreenshot:false,
 pass:tests.filter(t=>t.pass).length,total:tests.length,failed:failures,tests,summary:{rotated:rotated.length,
 unchanged:130-rotated.length,oneFloorEligible:compact.length,addedCollisionCells:a.collisionCellsAdded,
 originalBuildings:84,roads:52,activeEntrances:214},rotations:detail,
 unresolved:{exteriorBad,interiorBad,entryBad,sceneBad,gameErrors}};
fs.writeFileSync(path.join(__dirname,'STAGE07_OF35_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,total:result.total,failed:result.failed,summary:result.summary},null,2));
if(failures.length)process.exitCode=1;
