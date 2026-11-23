'use strict';
/* Genuine game world with CPU physics; renderer is mocked, no browser GPU. */
const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,api=H.stage12StreetProps,checks=[];
function test(id,good,details){checks.push({id,pass:!!good});if(!good)console.error('FAIL',id,JSON.stringify(details||'').slice(0,300));}
const stats=w.stage12PropAudit;
test('stage12_active',!!stats&&stats.stage===12&&stats.issueId==='S01-ST-03');
test('stage12_enabled',!api.off());
test('exactly_360_collision_bodies',stats.collisionCount===360);
test('166_planter_bases',stats.byKind['planter-base']===166);
test('166_bollards',stats.byKind['safety-bollard']===166);
test('28_streetlight_posts',stats.byKind['streetlamp-post']===28);
test('full_visible_coverage',stats.covered===stats.visibleSolidCandidates&&stats.missing===0);
test('no_unsafe_candidate',stats.issues.length===0&&stats.unresolved.length===0);
test('native_spatial_prop_solids',w.propSolids.length===796&&stats.newPropSolids===360&&stats.originalPropSolids===436);
test('legacy_building_solids_retained',w.solids.length===3230&&stats.newLegacySolids===0);
test('no_visual_meshes_added_by_stage12',stats.visualMeshesAdded===0&&w.boxes.length===194478);
test('all_roads_preserved',w.roads461.length===52);
test('all_214_usable_entries_preserved',w.entrancePortals.filter(p=>p.interiorReady).length===214);
test('all_429_portals_preserved',w.entrancePortals.length===429);
test('rotated_34_buildings_preserved',w.stage07AlignmentStats?.realRotations===34);
test('stage08_windows_preserved',w.stage08FacadeStats?.windowBays===1586);
test('stage09_entrance_audit_preserved',w.stage09CoastalAudit?.activeWaterAtDoor===0);
test('stage10_planter_audit_preserved',H.stage10Planters.audit(w,{strict:true}).unsafeSites===0);
test('stage11_lamp_audit_preserved',H.stage11Lamps.audit(w,{strict:true}).unsafeHorizontalSites===0);
test('no_false_gpu_claims',stats.gpuVerified===false&&stats.real1080p50FpsVerified===false);
test('runtime_col_audit_strict',api.audit(w,{strict:true}).issues.length===0);
test('idempotent_install',api.install(w)===stats&&w.stage12StreetPropSolids.length===360);
const colliders=w.stage12StreetPropSolids;
for(const s of colliders){const name=s.stage12StreetKind+'_'+s.stage12StreetPortal;
 test('indexed_'+name,w.nearby(s.x,s.z).includes(s));
 test('correct_shape_'+name,Math.abs(s.hw-s.stage12Source.w*.5)<1e-8&&Math.abs(s.hd-s.stage12Source.d*.5)<1e-8);
 test('real_prop_collection_'+name,w.propSolids.includes(s)&&!w.solids.includes(s));
 test('not_road_or_water_'+name,!H.coast461.isRouteRoad(s.x,s.z)&&H.reference469.coast(s.x,s.z)>=.1);
}
for(const kind of ['planter-base','safety-bollard','streetlamp-post']){
 const b=w.boxes.find(b=>b.city20Stage15Kind===kind),s=colliders.find(s=>s.stage12Source===b);
 const car=H.makeCar('civilian',b.x,b.z,0,0);
 const contact=H.carBuildingContact(car,s);
 test('car_hits_'+kind,!!contact&&contact.depth>0);
 const response=H.carRectPush(car,s,H.carBuildingFootprint(car));
 test('car_resolves_'+kind,!!response&&!H.carBuildingContact(car,s));
 const foot=H.createWalker(b.x-b.w*.5-.85,b.z,-Math.PI/2);
 for(let i=0;i<75;i++)H.stepWalker(foot,{forward:1,strafe:0,viewYaw:-Math.PI/2,speedFactor:.25,outdoors:false},w.nearby(foot.x,foot.z),1/30);
 test('walker_blocked_'+kind,foot.x<=b.x-b.w*.5-.36&&Math.abs(foot.z-b.z)<.01,{x:foot.x,barrier:b.x-b.w*.5-.36});
}
// Only genuine solid props; low decorative curbs, leaves, glass lamp heads remain passable.
const anyDecor=w.boxes.filter(b=>['plant-canopy','streetlamp-head','curb-accent'].includes(b.city20Stage15Kind)||['planter-shrub','tree-crown','garden-shrub'].includes(b.city20Stage16Kind));
test('decor_is_not_collision',anyDecor.every(b=>!colliders.some(s=>s.stage12Source===b)));
const m=colliders[0],b=m.stage12Source,save=[b.x,b.z];
try{
 b.x+=.75;b.z+=.25;
 const syncResult=api.sync(w);
 test('reindex_after_future_relocation',syncResult.synced===360&&syncResult.moved===1&&w.nearby(b.x,b.z).includes(m)&&Math.abs(m.x-b.x)<1e-8);
}finally{[b.x,b.z]=save;api.sync(w);}
test('restored_index_after_test',Math.abs(m.x-b.x)<1e-8&&Math.abs(m.z-b.z)<1e-8);
const oldRoad=H.coast461.isRouteRoad;
try{
 const x=b.x,z=b.z;
 H.coast461.isRouteRoad=(px,pz)=>Math.hypot(px-x,pz-z)<.7||oldRoad(px,pz);
 const reasons=api.safety({nearby:()=>[],entrancePortals:[]},b,[],new Map([[b.city20Stage15Portal,{interiorReady:true}]]),[]);
 test('future_road_overlap_refused',reasons.includes('road'));
}finally{H.coast461.isRouteRoad=oldRoad;}
test('strict_world_valid_after_synthetic',api.audit(w,{strict:true}).issues.length===0);
const result={stage:12,issue:'S01-ST-03',total:checks.length,passed:checks.filter(c=>c.pass).length,
 failed:checks.filter(c=>!c.pass),baseline:{visualBoxes:194478,legacySolids:3230,originalPropSolids:436},
 final:{visualBoxes:w.boxes.length,legacySolids:w.solids.length,propSolids:w.propSolids.length,roads:w.roads461.length,activeDoors:w.entrancePortals.filter(p=>p.interiorReady).length},stats,tests:checks,
 validation:'Real game CPU collision, fake renderer; NOT WebGL/GPU/FPS'};
fs.writeFileSync('QA/STAGE12_OF35_ACCEPTANCE.json',JSON.stringify(result,null,2)+'\n');
console.log('Stage12 acceptance',result.passed+'/'+result.total,'failed:',result.failed.length);
if(result.failed.length){console.error(JSON.stringify(result.failed,null,2));process.exitCode=1;}
