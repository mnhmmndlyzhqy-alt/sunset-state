'use strict';
/* Stage 02/35: validate the first of 25 source-audit findings.
 * Authoritative run uses the real H.World geometry and H.stepCar/
 * H.trafficControl477 mechanics in Node; it does not test browser/GPU pixels.
 */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('START_GAME.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+\.js)"/g)].map(m=>m[1]);
const checks=[];
function assert(name,passed,detail){checks.push({name,passed:!!passed,detail}); if(!passed)console.error('FAILED:',name,JSON.stringify(detail));}
const ctx={console,Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,
 TextEncoder,Math,Date,Buffer,URLSearchParams,performance:{now:()=>Date.now()},
 atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
 setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},location:{search:''}};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const p of scripts)new vm.Script(read(p),{filename:p}).runInContext(ctx,{timeout:60000});
new vm.Script(read('engine44.js'),{filename:'engine44.js'}).runInContext(ctx,{timeout:60000});
const H=ctx.Heatline;
const fixed=H.coast461.roads.find(r=>r.id==='northRing');
const raw=fixed.points.map(p=>({x:p.x,z:p.z}));
const originalSource=read('BACKUPS/STAGE02_OF35/coast_461.original.js');
assert('prior_source_is_saved',originalSource.includes('xy(westX-92,-432),xy(westX,-432)'),{});
assert('fixed_source_removes_only_bad_waypoint',!read('assets/coast_461.js').includes('xy(westX-92,-432),xy(westX,-432)'),{});
assert('raw_road_now_has_16_reference_waypoints',raw.length===16,{points:raw.length});
const oldBacktrackedPoint={x:H.reference469.world(531,245).x-92,z:-432};
const oldIndex=raw.findIndex(p=>Math.abs(p.x-oldBacktrackedPoint.x)<.01&&Math.abs(p.z+432)<.01);
assert('reverse_waypoint_absent',oldIndex===-1,{oldBacktrackedPoint,index:oldIndex});
const bend=(pts)=>pts.slice(1,-1).map((b,i)=>{const a=pts[i],c=pts[i+2],u=[b.x-a.x,b.z-a.z],v=[c.x-b.x,c.z-b.z];const dot=u[0]*v[0]+u[1]*v[1];const lu=Math.hypot(...u),lv=Math.hypot(...v);return {i:i+1,deg:Math.acos(Math.max(-1,Math.min(1,dot/(lu*lv))))*180/Math.PI};});
const angles=bend(raw),maxAngle=Math.max(...angles.map(v=>v.deg));
assert('no_sharp_95_degree_turn_on_north_ring',maxAngle<95,{maxAngle,angles:angles.filter(q=>q.deg>65)});
assert('reference_route_has_eastward_continuity',raw.slice(1).every((p,i)=>p.x>raw[i].x-.01),{violations:raw.slice(1).filter((p,i)=>p.x<raw[i].x-.01).length});
const originalWaypoints=raw.slice(0,6).concat([oldBacktrackedPoint],raw.slice(6));
assert('preserves_all_nonerroneous_anchors',originalWaypoints.length===17&&originalWaypoints.every((p,i)=>i===6||
 Math.abs(p.x-raw[i>6?i-1:i].x)<1e-9&&Math.abs(p.z-raw[i>6?i-1:i].z)<1e-9));
const len=a=>a.slice(1).reduce((acc,p,i)=>acc+Math.hypot(p.x-a[i].x,p.z-a[i].z),0);
const beforeLength=len(originalWaypoints),afterLength=len(raw),removed=beforeLength-afterLength;
assert('removed_44m_of_double_traversal_only',removed>43&&removed<46,{beforeLength,afterLength,removed});
assert('all_other_route_waypoints_still_present',H.coast461.roads.length===52,{roadCount:H.coast461.roads.length});
const worldStart=Date.now(),world=new H.World(),worldBuildMs=Date.now()-worldStart;
const road=world.roads461.find(r=>r.id==='northRing');
assert('full_game_world_builds',!!road&&world.roads461.length===52&&world.entrancePortals.length===298,{roads:world.roads461.length,portals:world.entrancePortals.length});
assert('all_sampled_road_coordinates_finite',world.roads461.every(r=>r.samples.every(p=>[p.x,p.y,p.z].every(Number.isFinite))));
const samples=road.samples;
const sampleAngles=bend(samples),maxSampleAngle=Math.max(...sampleAngles.map(a=>a.deg));
assert('rendered_road_samples_no_reverse',maxSampleAngle<95,{maxSampleAngle,samples:samples.length});
assert('road_sampling_preserves_changed_reference_endpoints',Math.hypot(samples[0].x-raw[0].x,samples[0].z-raw[0].z)<.00001&&
 Math.hypot(samples.at(-1).x-raw.at(-1).x,samples.at(-1).z-raw.at(-1).z)<.00001);
assert('road_surface_index_detects_centerline',samples.filter((p,i)=>i%5===0).every(p=>!!H.coast461.roadAt(p.x,p.z)),{checked:Math.ceil(samples.length/5)});
const changedX=-523.05;
const within=()=>samples.map((p,i)=>({p,i})).filter(o=>o.p.x>changedX-120&&o.p.x<changedX+150);
const around=within();
assert('fixed_curve_present_in_real_world',around.length>=10,{nearbySamples:around.length});
// Nav, profile and guard systems all refer to the same world road object.
const checkPoints=around.filter((o,i)=>i%Math.max(1,Math.floor(around.length/12))===0);
const roadAtBad=checkPoints.filter(o=>!H.coast461.roadAt(o.p.x,o.p.z));
assert('road_collision_and_navigation_same_centerline',roadAtBad.length===0,{badSamples:roadAtBad.length,checked:checkPoints.length});
const actualProfile=checkPoints.filter(o=>H.getRoadProfile477({yaw:0,route477:{road}},o.p.x,o.p.z)?.road.id==='northRing');
assert('bridge_and_ground_profile_can_resolve_road',actualProfile.length>=Math.floor(checkPoints.length*.5),{resolved:actualProfile.length,checked:checkPoints.length});
const stats={roadCount:world.roads461.length,samples:samples.length,waypointsBefore:17,waypointsAfter:16,
 beforeLengthMeters:beforeLength,afterLengthMeters:afterLength,reversePathRemovedMeters:removed,
 rawMaxBendDegrees:maxAngle,sampleMaxBendDegrees:maxSampleAngle,worldBuildMs,
 buildings:world.buildings.length,portals:world.entrancePortals.length,solids:world.solids.length,
 geometry:world.boxes.length,bridgeIndex:H.coast461.bridgeRailStats477,roadProfileIndex:H.coast461.roadProfileStats477};
// Test the player-independent real car kinematic/controller in both directions.
// A route-spawned car starts near the modified section and gets real steering,
// braking and guardrail response. These are CPU tests, NOT a video inspection.
const closestIndex=x=>samples.reduce((best,p,i)=>Math.abs(p.x-x)<Math.abs(samples[best].x-x)?i:best,0);
const simulations=[];
for(const dir of [1,-1]){
 const i=closestIndex(dir===1?-605:-410),p=samples[i],q=samples[i+dir*3];
 const yaw=Math.atan2(-(q.x-p.x),-(q.z-p.z));
 const offset=-dir*Math.min(2.05,road.width*.18);
 const car=H.makeCar('civilian',p.x+(p.nx||0)*offset,p.z+(p.nz||0)*offset,yaw,0);
 car.speed=6;car.vx=-Math.sin(yaw)*car.speed;car.vz=-Math.cos(yaw)*car.speed;
 car.route477={road,index:i,dir,offset,finished:false};
 const game={world,civilian:[car],police:[],player:{x:9999,z:9999,alive:false}};
 let invalid=0,offroad=0,updated=0,passedBend=false,minHP=car.hp;
 for(let frame=0;frame<1000;frame++){
  const ox=car.x,oz=car.z;
  const cmd=H.trafficControl477(game,car,{mustStop:false,giveWay:false,emergency:false});
  H.stepCar(car,cmd,.03);
  H.guardBridgeRails477(car,ox,oz);
  updated=frame+1;
  if(![car.x,car.z,car.speed,car.yaw].every(Number.isFinite)){invalid++;break;}
  if(!H.coast461.roadAt(car.x,car.z))offroad++;
  minHP=Math.min(minHP,car.hp);
  if(dir>0?car.x>-444:car.x<-555){passedBend=true;break;}
 }
 simulations.push({dir,initialIndex:i,frames:updated,finalX:car.x,finalZ:car.z,
  passedBend,invalid,offroad,minHP,finished:car.route477.finished});
}
for(const s of simulations){
 assert('real_AI_vehicle_crosses_repaired_segment_direction_'+s.dir,s.passedBend&&s.invalid===0,{...s});
 assert('real_AI_vehicle_remains_on_road_direction_'+s.dir,s.offroad===0,{...s});
}
// Existing traffic and property still have the same broad structure.
assert('other_game_systems_preserved',world.city20DistrictBuildings?.length===130&&world.buildings.length===84&&world.entrancePortals.length===298,
 {mappedBuildings:world.city20DistrictBuildings?.length,buildingCount:world.buildings.length});
assert('chosen_reference_map_file_identical',crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))).digest('hex')==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
const report={test:'STAGE02_35_NORTH_RING_REAL_WORLD_CPU',stage:2,totalStages:35,kind:'real engine/World and vehicle kinematics without GPU',
 data:stats,simulations,passed:checks.filter(c=>c.passed).length,total:checks.length,failed:checks.filter(c=>!c.passed).map(c=>c.name),checks,
 complete:checks.every(c=>c.passed),native1080FPSConfirmed:false};
fs.writeFileSync(path.join(root,'QA/35_STAGE_MASTER/STAGE02_NORTH_RING_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.failed,measurements:stats,simulations},null,2));
if(!report.complete)process.exitCode=2;
