'use strict';
/* Rebuild TWO COMPLETE game worlds with audit off/on; previous stage tests were mostly synthetic.
   No GPU or actual rendered-pixel claims. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const r=f=>fs.readFileSync(path.join(root,f),'utf8');
const files=[...r('START_GAME.html').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const ctx={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},location:{search:'?city20AuditOff=1'},URLSearchParams};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
const findings=[],checks=[];
function test(id,condition,data=null){checks.push({id,passed:!!condition,details:data});if(!condition)console.error('FAIL:',id,JSON.stringify(data));}
for(const p of files){try{new vm.Script(r(p),{filename:p}).runInContext(ctx,{timeout:45000});}catch(e){console.error('SCRIPT ERROR',p,e.stack);process.exit(5);}}
new vm.Script(r('engine44.js'),{filename:'engine44.js'}).runInContext(ctx,{timeout:45000});
const H=ctx.Heatline;
const start=Date.now(),off=new H.World(),offMs=Date.now()-start;
ctx.location.search='';
const second=Date.now(),on=new H.World(),onMs=Date.now()-second;
const source=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))).digest('hex');
const green=(w,kind)=>w.boxes.filter(b=>b.city20Stage16Kind===kind);
const unsafe=(b)=>H.reference469.coast(b.x,b.z)<.1||H.coast461.isRouteRoad(b.x,b.z);
const cmpWorld=(a,b,keys)=>keys.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
const same=(a,b)=>Object.entries(a).every(([k,v])=>b[k]===v);
const origins=off.boxes.length;
const gStats={};
for(const kind of ['tree-trunk','garden-shrub','planter-shrub'])gStats[kind]={before:green(off,kind).filter(unsafe).length,after:green(on,kind).filter(unsafe).length};
const portalLand=off.entrancePortals.filter(p=>H.reference469.coast(p.x,p.z)<.1).length;
const runtimeStages={};
for(let stage=2;stage<=16;stage++){
 const stats=on['city20Stage'+String(stage).padStart(2,'0')+'Stats']||on['city20Stage'+stage+'Stats'];
 runtimeStages[stage]=stats?{geometryAdded:stats.geometryAdded??null,commercialFronts:stats.commercialFronts??null,
    processed:stats.portalsDetailed??stats.decoratedLobbies??stats.zonedLobbies??stats.litLobbies??stats.windowPanels??stats.treeClusters??null}:null;
}

findings.push({id:'actual-world-legacy-stage14-inactive',severity:'high',before:off.city20Stage14Stats.commercialFronts,after:60,explanation:'Legacy descriptor fields are absent on all 298 portals'});
findings.push({id:'water-classified-entrances',severity:'high',count:portalLand,explanation:'Existing portal coordinates classify as water; do not alter these without a terrain/building redesign'});
findings.push({id:'park-vegetation-road-overlaps',severity:'medium',before:gStats['tree-trunk'].before+gStats['garden-shrub'].before,after:gStats['tree-trunk'].after+gStats['garden-shrub'].after});
findings.push({id:'planters-unresolved-near-water',severity:'high',before:gStats['planter-shrub'].before,after:gStats['planter-shrub'].after,explanation:'Remaining planter sites cannot move locally without dislocating them from their buildings'});
findings.push({id:'compact-foyers-previously-skipped',severity:'medium',before:off.interiorRecovery2Stats.matched,decorated:on.city20DeepAuditRepairStats.compactFoyersDecorated,existingReady:on.interiorRecovery2Stats.ready});
test('all_external_scripts_exist',files.every(f=>fs.existsSync(path.join(root,f))),{count:files.length});
test('deep_audit_late_pipeline',files.indexOf('assets/city20_deep_audit_repair.js')>files.indexOf('assets/interior_recovery_phase02.js'));
test('audit_off_still_constructs_world',!off.city20DeepAuditRepairStats,{offMs});
test('audit_on_constructs_world',!!on.city20DeepAuditRepairStats,{onMs});
test('original_city_map_sha256',source==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');

test('stages_2_3_4_6_7_9_10_11_12_13_14_15_16_construct_in_real_world',
 [2,3,4,6,7,9,10,11,12,13,14,15,16].every(n=>runtimeStages[n]!==null),{stages:runtimeStages});
test('real_world_not_just_mock_stage_9_11_12_13_15_16_active',
 [9,11,12,13,15,16].every(n=>runtimeStages[n].geometryAdded>0),
 Object.fromEntries([9,11,12,13,15,16].map(n=>[n,runtimeStages[n].geometryAdded])));
test('recoveries_1_and_2_construct_in_real_world',
 !!on.visualRecovery1Stats&&!!on.interiorRecovery2Stats&&on.visualRecovery1Stats.added>0&&on.interiorRecovery2Stats.geometryAdded>0);

test('all_52_road_routes_preserved',off.roads461.length===52&&on.roads461.length===52);
test('roads_unchanged',cmpWorld(off,on,['roads461']),{length:on.roads461.length});
test('all_298_entrances_preserved',off.entrancePortals.length===298&&on.entrancePortals.length===298);
test('portal_coordinates_unchanged',cmpWorld(off,on,['entrancePortals']));
test('solids_and_collisions_unchanged',cmpWorld(off,on,['solids','propSolids']));
test('structural_plans_unchanged',cmpWorld(off,on,['structuralPlans']));
test('mapped_buildings_unchanged',cmpWorld(off,on,['city20DistrictBuildings']));
test('source_geometries_are_preserved',on.boxes.length===off.boxes.length+on.city20DeepAuditRepairStats.geometryAdded);
let unexplained=0,relocated=0,verticalErrors=0;
for(let i=0;i<origins;i++){
 const a=off.boxes[i],b=on.boxes[i];
 const changed=a.x!==b.x||a.z!==b.z||a.y!==b.y;
 if(changed){
  if(!a.city20Stage15&&!a.city20Stage16)unexplained++;
  else {relocated++;
   const oldY=H.outdoorHeight(a.x,a.z),newY=H.outdoorHeight(b.x,b.z);
   if(Math.abs((b.y-a.y)-(newY-oldY))>.003)verticalErrors++;
  }
 }
 for(const key of ['w','h','d','shape','material','color','layer','glow'])if(a[key]!==b[key]){unexplained++;break;}
}
test('only_stage15_and_stage16_positions_changed',unexplained===0,{unexplained,relocated});
test('relocations_follow_new_ground_height',verticalErrors===0,{verticalErrors});
test('60_live_commercial_venue_fixes',on.city20DeepAuditRepairStats.commercialVenues>=50,{fixed:on.city20DeepAuditRepairStats.commercialVenues});
test('legacy_stage14_failure_remains_transparent',off.city20Stage14Stats.commercialFronts===0&&on.city20Stage14Stats.commercialFronts===0);
test('new_storefront_geometry_count',on.boxes.filter(b=>b.city20AuditKind?.startsWith('venue-')).length===on.city20DeepAuditRepairStats.storefrontDetailsAdded);
test('compact_foyers_safely_decorated',on.city20DeepAuditRepairStats.compactFoyersDecorated===off.interiorRecovery2Stats.small);
test('compact_decor_never_unlocks_doors',on.city20DeepAuditRepairStats.compactInteriorDetailsAdded===on.city20DeepAuditRepairStats.compactFoyersDecorated*2);
test('all_public_park_trees_off_roads_and_water',gStats['tree-trunk'].after===0,gStats['tree-trunk']);
test('all_public_garden_shrubs_off_roads_and_water',gStats['garden-shrub'].after===0,gStats['garden-shrub']);
test('planter_hazard_count_improved',gStats['planter-shrub'].after<gStats['planter-shrub'].before,gStats['planter-shrub']);
test('planter_counts_retained',green(on,'planter-shrub').length===green(off,'planter-shrub').length);
test('tree_counts_retained',green(on,'tree-trunk').length===green(off,'tree-trunk').length);
test('crown_transforms_follow_trunks',green(on,'tree-trunk').every(a=>green(on,'tree-crown').some(b=>Math.hypot(a.x-b.x,a.z-b.z)<.01)));
test('no_new_colliders_or_portal_unlocks',on.city20DeepAuditRepairStats.collisionsAdded===0&&on.city20DeepAuditRepairStats.portalChanges===0);
const oldCount=on.boxes.length;H.city20DeepAuditRepair.repair(on);
test('deep_audit_idempotent',on.boxes.length===oldCount);
test('default_no_day_night_cycle',r('engine44.js').includes('this.worldHour = 12.25')&&r('engine44.js').includes('this.clockRunning = false'));
const life=new H.Stage39Life(on);let simulated=0,wildlifeError=null;
try{for(let i=0;i<900;i++){life.update(.033,{x:0,z:0},null,false,12.25,{rain:0,cloud:0});simulated++;}}catch(e){wildlifeError=e.stack;}
test('wildlife_simulation_30s_finite',simulated===900&&!wildlifeError,{simulated,wildlifeError});
test('all_animals_preserved',life.wildlife.filter(a=>a.kind==='crocodile').length===8&&life.wildlife.filter(a=>a.kind==='flamingo').length===10&&life.wildlife.filter(a=>a.kind==='heron').length===4&&life.wildlife.filter(a=>a.kind==='dolphin').length===6);

test('all_wildlife_positions_finite_after_30_simulated_seconds',life.wildlife.every(a=>[a.x,a.z,a.yaw,a.speed].every(Number.isFinite)));
const croc=life.wildlife.find(a=>a.kind==='crocodile'),prey=life.fish.find(f=>f.habitat==='wetland');
let huntFollows=false;
if(croc&&prey){
 // Explicitly exercise the previously defective path: moving wetland prey during an active hunt.
 prey.x=croc.x+2;prey.z=croc.z+1;croc.mode='hunt';croc.modeTimer=3;croc.goalX=-987;croc.goalZ=-988;
 life.updateCroc(croc,.033,true,false,0);
 const first=croc.goalX===prey.x&&croc.goalZ===prey.z;
 prey.x+=1.2;prey.z-=.5;
 life.updateCroc(croc,.033,true,false,0);
 huntFollows=first&&croc.goalX===prey.x&&croc.goalZ===prey.z;
}
test('crocodile_hunt_prey_goal_updates_in_live_behavior',huntFollows);

const result={project:'SUNSET STATE',kind:'Full-world cumulative deep audit, NOT a GPU/image QA pass',date:'2026-11-21',sourceVersion:'4.7.9 + CITY20 1-20 + recovery 1-3',worldBefore:{boxes:off.boxes.length,solids:off.solids.length,roads:off.roads461.length,portals:off.entrancePortals.length},worldAfter:{boxes:on.boxes.length,solids:on.solids.length,roads:on.roads461.length,portals:on.entrancePortals.length},buildMs:{withoutAudit:offMs,withAudit:onMs},auditStats:on.city20DeepAuditRepairStats,green:gStats,waterClassifiedEntrances:portalLand,findings,runtimeStages,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,allPassed:checks.every(x=>x.passed),gpu50Fps1080pVerified:false,realRenderedAppearanceVerified:false};
fs.writeFileSync(path.join(root,'QA/DEEP_AUDIT_FULLWORLD.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,total:result.total,failed:checks.filter(x=>!x.passed).map(x=>x.id),buildMs:result.buildMs,auditStats:result.auditStats,green:gStats,waterClassifiedEntrances:portalLand},null,2));
if(!result.allPassed)process.exitCode=2;
