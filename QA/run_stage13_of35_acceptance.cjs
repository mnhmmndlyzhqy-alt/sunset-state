'use strict';
/* Actual game-world + interior-scene CPU validation. Real GPU/WebGL/FPS is not tested. */
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const checks=[],ids=[1,24,35,50,62,67,78],correct=new Set(ids);
function check(id,passed,info){checks.push({id,pass:!!passed});if(!passed)console.error('FAIL',id,JSON.stringify(info||'').slice(0,300));}
g.updateHUD=()=>{}; // Fake canvas lacks raster readback; gameplay state is still genuine.
const st=w.stage13NarrowLobbyStats;
check('installed_and_enabled',!!st&&!H.stage13NarrowLobbies.off());
check('exact_seven_missing',st?.unfurnishedFoyersFound===7&&st?.repairedFoyers===7);
check('expected_original_portal_ids',st?.portalIDs.join(',')===ids.join(','));
check('all_previous_CITY20_11_76_preserved',w.city20Stage11Stats?.decoratedLobbies===76);
check('active_214_preserved',w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('roads_52_preserved',w.roads461.length===52);
check('buildings_130_preserved',w.city20DistrictBuildings.length===130);
check('collision_solids_unchanged',w.solids.length===3230&&w.propSolids.length===796);
check('stage12_props_preserved',w.stage12PropAudit?.collisionCount===360);
check('stage11_lamps_preserved',w.stage11LampAudit?.unsafeHorizontalSites===0);
check('stage10_planters_preserved',w.stage10PlanterAudit?.unsafeSites===0);
check('zero_new_world_collision',st?.newCollisionBodies===0);
check('eleven_world_meshes_per_foyer',st?.worldMeshesAdded===77);
check('world_mesh_count',w.boxes.length===194555);
check('no_false_GPU_or_FPS_claims',st?.gpuVisualVerified===false&&st?.real1080p50FpsVerified===false);
const allWorld=w.boxes.filter(o=>o.stage13NarrowLobby===true);
check('no_unintended_world_portal',allWorld.every(o=>correct.has(o.stage13NarrowPortal)));
const oldId=new Set(w.boxes.filter(o=>o.city20Stage11).map(o=>o.city20Stage11Portal));
check('new_foyers_distinct_from_old',ids.every(id=>!oldId.has(id)));
const details=[];
for(const id of ids){
 const p=w.entrancePortals[id],plan=w.structuralPlans.find(v=>v.outerShell.x===p.buildingX&&v.outerShell.z===p.buildingZ);
 const pieces=allWorld.filter(o=>o.stage13NarrowPortal===id),f=plan.foyer;
 check('world_11_'+id,pieces.length===11);
 check('world_noncolliding_'+id,pieces.every(o=>!w.solids.includes(o)&&!w.propSolids.includes(o)));
 check('world_meshes_in_foyer_'+id,pieces.every(o=>Math.abs(o.x-f.x)<f.w*.5+.21&&Math.abs(o.z-f.z)<f.d*.5+.21));
 const scene=g.sceneForFloor(plan,0),indoor=scene.boxes.filter(o=>o.stage13NarrowLobby===true);
 check('indoor_10_'+id,indoor.length===10&&scene.stage13NarrowFurnished?.portalId===id,{length:indoor.length});
 check('indoor_safe_site_'+id,!!scene.stage13NarrowFurnished?.seatSite);
 const site=scene.stage13NarrowFurnished.seatSite,hw=.43,hd=.61;
 check('indoor_seat_clear_solids_'+id,scene.solids.every(v=>!(Math.abs(v.x-site.x)<v.hw+hw+.09&&Math.abs(v.z-site.z)<v.hd+hd+.09)));
 check('indoor_route_clear_'+id,Math.hypot(site.x-scene.entrance.x,site.z-scene.entrance.z)>3.3&&Math.hypot(site.x-scene.lift.x,site.z-scene.lift.z)>3);
 check('indoor_geometry_finite_'+id,indoor.every(v=>[v.x,v.y,v.z,v.w,v.h,v.d].every(Number.isFinite)&&Math.min(v.w,v.h,v.d)>.015));
 check('door_infrastructure_retained_'+id,!!p.interiorReady&&scene.entrance&&scene.lift&&scene.rooms.length===4);
 const before=scene.boxes.length;H.stage13NarrowLobbies.decorateScene(scene,plan,0);
 check('repeat_is_idempotent_'+id,before===scene.boxes.length);
 const upper=g.sceneForFloor(plan,1);
 check('upper_floor_untouched_'+id,upper.boxes.every(o=>!o.stage13NarrowLobby));
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;
 const entered=g.enterBuilding(id);
 check('can_enter_building_'+id,entered&&g.indoor?.portalId===id&&!!g.indoor.scene.stage13NarrowFurnished);
 if(entered){g.avatar.x=g.indoor.scene.entrance.x;g.avatar.z=g.indoor.scene.entrance.z;
   check('can_initiate_exit_'+id,g.exitBuilding()===true);g.exitTransition=null;g.indoor=null;}
 details.push({id,foyer:f,worldPieces:pieces.length,indoorPieces:indoor.length,sceneBoxes:scene.boxes.length,sceneSolids:scene.solids.length,seat:site});
}
const other=w.entrancePortals.find(p=>p.interiorReady&&!correct.has(p.id)&&!p.stage05City20);
const otherPlan=w.structuralPlans.find(pl=>pl.outerShell.x===other.buildingX&&pl.outerShell.z===other.buildingZ);
check('other_legacy_unmodified',g.sceneForFloor(otherPlan,0).boxes.every(v=>!v.stage13NarrowLobby));
check('all_world_furniture_nonblocking_center',allWorld.filter(o=>o.stage13NarrowKind.includes('seat')||o.stage13NarrowKind==='compact-seat').every(v=>{
 const q=w.structuralPlans.find(pl=>w.entrancePortals[v.stage13NarrowPortal].buildingX===pl.outerShell.x&&w.entrancePortals[v.stage13NarrowPortal].buildingZ===pl.outerShell.z);
 return Math.abs(v.x-q.foyer.x)>1.94;
}));
const result={stage:13,issue:'S01-IN-01',tested:checks.length,passed:checks.filter(x=>x.pass).length,
  failed:checks.filter(x=>!x.pass),stats:st,details,
  context:'real game physics and interior scene generation with mock renderer; no WebGL/GPU/FPS claims'};
fs.writeFileSync('QA/STAGE13_OF35_ACCEPTANCE.json',JSON.stringify(result,null,2)+'\n');
console.log('Stage13:',result.passed+'/'+result.tested,'failures:',result.failed.length);
if(result.failed.length)process.exitCode=1;
