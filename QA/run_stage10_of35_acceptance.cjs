'use strict';
// Actual game World with fake renderer. Not an actual WebGL or screenshot test.
const fs=require('fs'),path=require('path');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,api=H.stage10Planters,stat=w.stage10PlanterAudit;
const checkList=[],failures=[];
function check(id,pass,notes){const item={id,pass:!!pass};if(notes!==undefined)item.notes=notes;checkList.push(item);
 if(!pass){failures.push(id);console.error('FAIL:',id,JSON.stringify(notes)?.slice(0,400));}}
const sort=arr=>arr.slice().sort();
const signature=(world)=>world.boxes.filter(b=>b.city20Stage15Kind==='planter-base'||b.city20Stage15Kind==='plant-canopy'||b.city20Stage15Kind==='safety-bollard'||b.city20Stage16Kind==='planter-shrub')
 .map(b=>[b.city20Stage15Portal??b.city20Stage16Portal,b.city20Stage15Kind||b.city20Stage16Kind,b.x,b.y,b.z]).sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));
const oldStats=w.city20DeepAuditRepairStats,oldStage4=w.stage04AccessStats;
const portals=w.entrancePortals,active=portals.filter(p=>p.interiorReady),c=api.context(w);
const beforeSign=JSON.stringify(signature(w));
const startSnapshot={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.map(r=>JSON.stringify(r.points)),active:active.length,doors:w.stage42Doors.length,portals:portals.length};
check('stage10_installed_and_reported',stat&&stat.stage===10&&stat.issueId==='S01-ST-01');
check('original_596_planters_logged',stat.historicalOriginallyAuthored===596);
check('historical_181_unresolved_distinguished_from_live',oldStats.unresolvedPlanters===181&&stat.historicalUnresolvedBeforeStage04===181);
check('orphan_decor_removed_at_prior_stage',oldStage4.orphanVisualsRemoved===3152);
check('exactly_166_live_planter_sites',stat.livePlanterSites===166);
check('exactly_166_live_shrubs',stat.liveShrubs===166);
check('exactly_166_live_canopies',stat.liveCanopies===166);
check('exactly_166_live_bollards',stat.liveBollards===166);
check('all_live_planters_owned_by_active_portals',stat.orphanSites===0&&stat.activeOwnedSites===166);
check('all_live_planters_pass_full_footprint',stat.unsafeFootprints===0);
check('no_live_planter_in_road',stat.unsafeRoad===0);
check('no_live_planter_in_water',stat.unsafeWater===0);
check('no_live_planter_in_front_of_usable_door',stat.blockedWalkways===0);
check('no_live_planter_collides_with_building',stat.solidOverlaps===0);
check('no_detached_canopy_or_shrub',stat.unpairedSites===0);
check('no_live_site_requires_relocation',stat.unsafeSites===0&&stat.movedSites===0&&stat.unresolvedAttempts.length===0);
check('stale_count_not_presented_as_current_error',stat.classification==='historical_orphan_decor_removed');
check('inspection_strict_replay_passes',api.audit(w,{strict:true}).unsafeSites===0);
check('relocation_module_is_idempotent',api.relocate(w)===stat);
check('no_geometry_was_changed',w.boxes.length===startSnapshot.boxes&&beforeSign===JSON.stringify(signature(w)));
check('no_collision_physics_changed',w.solids.length===startSnapshot.solids&&stat.newCollisions===0);
check('all_52_original_roads_unchanged',w.roads461.length===52&&w.roads461.every((r,i)=>JSON.stringify(r.points)===startSnapshot.roads[i]));
check('all_214_active_entries_preserved',active.length===214&&w.entrancePortals.filter(p=>p.interiorReady).length===startSnapshot.active);
check('429_portal_descriptors_preserved',w.entrancePortals.length===429&&startSnapshot.portals===429);
check('physical_door_count_preserved',w.stage42Doors.length===startSnapshot.doors);
check('34_rotated_buildings_preserved',w.stage07AlignmentStats?.realRotations===34);
check('1586_stage08_windows_preserved',w.stage08FacadeStats?.windowBays===1586);
check('stage09_coastal_safety_preserved',w.stage09CoastalAudit?.activeWaterAtDoor===0&&w.stage09CoastalAudit?.activeWaterWithin6m===0);
check('no_visual_or_gpu_qa_claim',stat.gpuVerified===false&&stat.frameRateVerified===false);
const originalRoad=H.coast461.isRouteRoad;
function fixture(){
 const p=portals[0],group=c.byPortal.get(p.id),base=group.base[0],link={base,...{
 canopy:group.canopy.find(b=>Math.hypot(b.x-base.x,b.z-base.z)<.09),
 shrub:group.shrub.find(b=>Math.hypot(b.x-base.x,b.z-base.z)<.09),
 bollard:group.bollard.find(b=>Math.hypot(b.x-base.x,b.z-base.z)<1.68)}};
 const f={boxes:[link.base,link.canopy,link.shrub,link.bollard].map(b=>({...b})),entrancePortals:[p],nearby:()=>[]};
 return f;
}
try {
 const f=fixture(),old={x:f.boxes[0].x,z:f.boxes[0].z},before=JSON.stringify(f.boxes.map(b=>[b.x,b.y,b.z]));
 H.coast461.isRouteRoad=(x,z)=>originalRoad(x,z)||Math.hypot(x-old.x,z-old.z)<.42;
 const unsafe=api.audit(f);
 check('synthetic_realistic_road_overlap_detected',unsafe.unsafeSites===1&&unsafe.unsafeRoad===1);
 let throws=false;try{api.audit(f,{strict:true})}catch(e){throws=String(e).includes('unsafe live planter')}
 check('strict_audit_fails_closed_on_introduced_road',throws);
 const fixed=api.relocate(f),end=f.boxes[0];
 check('future_unsafe_planter_is_moved',fixed.movedSites===1&&Math.hypot(end.x-old.x,end.z-old.z)>.1,fixed.relocationActions);
 check('future_repaired_planter_footprint_is_safe',api.audit(f,{strict:true}).unsafeSites===0);
 check('associated_canopy_and_shrub_move_with_planter',f.boxes.slice(1,3).every(b=>Math.hypot(b.x-end.x,b.z-end.z)<.05));
 check('related_bollard_moves_rigidly',Math.abs((f.boxes[3].x-end.x)-(c.byPortal.get(portals[0].id).bollard.find(b=>Math.hypot(b.x-old.x,b.z-old.z)<1.68).x-old.x))<.01&&
   Math.abs((f.boxes[3].z-end.z)-(c.byPortal.get(portals[0].id).bollard.find(b=>Math.hypot(b.x-old.x,b.z-old.z)<1.68).z-old.z))<.01);
 check('future_guard_does_not_add_collision_or_visual_mesh',fixed.worldGeometryAdded===0&&fixed.newCollisions===0&&f.boxes.length===4);
 const blocked=fixture(),blockOld=JSON.stringify(blocked.boxes.map(b=>[b.x,b.y,b.z]));
 H.coast461.isRouteRoad=()=>true;
 const unresolved=api.relocate(blocked);
 check('unfixable_future_overlap_is_reported_not_teleported',unresolved.movedSites===0&&unresolved.unresolvedAttempts.length===1&&unresolved.unsafeSites===1);
 check('unfixable_fixture_kept_unchanged_for_manual_review',JSON.stringify(blocked.boxes.map(b=>[b.x,b.y,b.z]))===blockOld);
}catch(e){check('synthetic_fixture_executes',false,e.stack)}finally{H.coast461.isRouteRoad=originalRoad}
const html=fs.readFileSync(path.join(__dirname,'../START_GAME.html'),'utf8');
check('stage10_loaded_after_stage09_and_before_engine',html.indexOf('stage09_coastal_entrance_audit.js')<html.indexOf('stage10_planter_safety.js')&&html.indexOf('stage10_planter_safety.js')<html.indexOf('engine44.js'));
const result={stage:10,passed:checkList.filter(c=>c.pass).length,total:checkList.length,failed:failures,
 worldSource:'actual full game world, fake renderer, NOT GPU',snapshot:startSnapshot,liveAudit:stat,checks:checkList};
fs.writeFileSync(path.join(__dirname,'STAGE10_OF35_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({stage:10,passed:result.passed,total:result.total,failed:failures,stats:stat},null,2));
if(failures.length)process.exitCode=1;
