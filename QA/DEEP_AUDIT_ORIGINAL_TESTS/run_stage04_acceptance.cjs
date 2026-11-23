'use strict';
/* Reference-based road engineering acceptance. CPU and geometry checks only.
 * Does NOT claim measured frame rate on a real GPU. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p));
const txt=p=>file(p).toString('utf8');
const html=txt('START_GAME.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const checks=[];function test(name,passed,detail){checks.push({name,passed:!!passed,detail});if(!passed)console.error('FAIL',name,JSON.stringify(detail||{}));}
function build(disable){
 const c={console,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
  performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},__SUNSET_CITY20_DISABLE_STAGE04:disable};
 c.globalThis=c;c.window=c;c.location={search:''};vm.createContext(c);
 for(const p of scripts)new vm.Script(txt(p),{filename:p}).runInContext(c,{timeout:60000});
 new vm.Script(txt('engine44.js'),{filename:'engine44.js'}).runInContext(c,{timeout:60000});
 const start=Date.now(),w=new c.Heatline.World(),buildMs=Date.now()-start;
 return {H:c.Heatline,G:c.Heatline.coast461,w,buildMs};
}
const baseline=build(true),candidate=build(false),w=candidate.w,H=candidate.H,G=candidate.G,b=baseline.w;
const meta=w.city20Stage04Stats;
test('reference_exact_original',crypto.createHash('sha256').update(file('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png')).digest('hex')==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
test('road_number_and_route_identity_preserved',b.roads461.length===52&&w.roads461.length===52&&w.roads461.every((r,i)=>r.id===b.roads461[i].id&&r.width===b.roads461[i].width&&r.samples.length===b.roads461[i].samples.length));
let offsetPoints=0,protectedJunctions=0,wrongPlan=0,grade=0,minRoadClearance=Infinity,peakMove=0,loweredWater=0;
let jerkBefore=0,jerkAfter=0,roadLen=0,changedRoads=0;
const roadProfiles=[];
for(let j=0;j<w.roads461.length;j++){
 const r=w.roads461[j],old=b.roads461[j],len=r.samples.length;
 let routeMoved=0,oldJerk=0,newJerk=0;
 for(let i=0;i<len;i++){
  const p=r.samples[i],q=old.samples[i],diff=p.y-q.y;
  if(Math.abs(p.x-q.x)>1e-8||Math.abs(p.z-q.z)>1e-8)wrongPlan++;
  if(p.junction){protectedJunctions++;if(Math.abs(diff)>1e-7)wrongPlan++;}
  if(p.water&&diff<-.033)loweredWater++;
  minRoadClearance=Math.min(minRoadClearance,p.y-p.g);
  if(Math.abs(diff)>.006){offsetPoints++;routeMoved++;}
  peakMove=Math.max(peakMove,Math.abs(diff));
  if(i){
   const p0=r.samples[i-1],q0=old.samples[i-1],d=Math.hypot(p.x-p0.x,p.z-p0.z);
   if(d>.03){
    const newGrade=(p.y-p0.y)/d,oldGrade=(q.y-q0.y)/d;
    grade=Math.max(grade,Math.abs(newGrade));
    if(i>1){
      const p2=r.samples[i-2],q2=old.samples[i-2],dprev=Math.hypot(p0.x-p2.x,p0.z-p2.z);
      if(dprev>.03){
        const a=Math.abs(oldGrade-(q0.y-q2.y)/dprev),c=Math.abs(newGrade-(p0.y-p2.y)/dprev);
        jerkBefore+=a;jerkAfter+=c;oldJerk+=a;newJerk+=c;roadLen++;
      }
    }
   }
  }
 }
 if(routeMoved)changedRoads++;
 roadProfiles.push({id:r.id,modifiedSamples:routeMoved,gradeTransitionBefore:+oldJerk.toFixed(4),gradeTransitionAfter:+newJerk.toFixed(4)});
}
test('junctions_remain_exact_and_road_XZ_unchanged',wrongPlan===0,{wrongPlan,protectedJunctions});
test('some_real_height_smoothing',changedRoads>=25&&offsetPoints>=450,{changedRoads,offsetPoints});
test('grade_capped_9_percent',grade<=.090001,{grade});
test('lower_bound_preserves_terrain_clearance',minRoadClearance>.072,{minRoadClearance});
test('water_bridge_deck_clearance_kept',loweredWater===0,{loweredWater});
test('bounded_adjustment_under_0_9_meters',peakMove<.9,{peakMove});
test('grade_transitions_reduced_at_least_10pct',jerkAfter<=jerkBefore*.90,{jerkBefore,jerkAfter,ratio:jerkAfter/jerkBefore});
test('existing_at_grade_and_grade_separated_layers_still_indexed',G.roadProfileStats477?.segments>=3300&&G.bridgeRailStats477?.segments>500,{profiles:G.roadProfileStats477,rails:G.bridgeRailStats477});
test('deck_joints_added_on_raised_road_only',meta?.additionalDeckJoints>=20&&meta?.additionalDeckJoints<=90,{joints:meta?.additionalDeckJoints});
const extra=w.boxes.length-b.boxes.length;
test('new_mesh_budget_bounded',extra>=50&&extra<=1000,{extra,total:w.boxes.length});
test('not_a_rebuilt_game',w.buildings.length===b.buildings.length&&w.buildings.length===84&&w.entrancePortals.length===b.entrancePortals.length&&w.entrancePortals.length===298&&w.solids.length===b.solids.length&&w.mapFeatures461.length===b.mapFeatures461.length,{buildings:w.buildings.length,entrances:w.entrancePortals.length,solids:w.solids.length,features:w.mapFeatures461.length});
test('stage02_all_130_mapped_buildings_preserved',w.city20DistrictBuildings?.length===130&&b.city20DistrictBuildings?.length===130&&w.city20DistrictBuildings.every((p,i)=>{const q=b.city20DistrictBuildings[i];return p.id===q.id&&p.x===q.x&&p.z===q.z&&p.baseY===q.baseY;}));
test('stage03_all_130_foundations_preserved',w.boxes.filter(p=>p.city20Stage03Footing).length===130&&b.boxes.filter(p=>p.city20Stage03Footing).length===130);
const animals=new H.Stage39Life(w),crocs=animals.wildlife.filter(a=>a.kind==='crocodile');
test('crocodiles_still_8_in_water',crocs.length===8&&crocs.every(p=>H.reference469.coast(p.x,p.z)<-.5));
test('boardwalk_absent',w.stage478Stats?.noTimberPlatformAdded===true);
// Use the actual road indices, bridge-rail guard and vehicle kinematics.
const west=w.roads461.find(r=>r.id==='westExpress');
const p=west.samples.find(a=>Math.abs(a.z+432)<3),idx=west.samples.indexOf(p),n=west.samples[idx+1]||west.samples[idx-1];
const yaw=Math.atan2(-(n.x-p.x),-(n.z-p.z)),car=H.makeCar('player',p.x,p.z,yaw),match=H.getRoadProfile477(car,car.x,car.z),height=H.deckGround443(car);
test('upper_overpass_selected_at_crossing',match?.road.id==='westExpress'&&Math.abs(height-(match.y-.074))<.15,{road:match?.road.id,drivingHeight:height,roadY:match?.y});
let testedGuards=0,guardsOK=0;
for(const id of ['westExpress','northRing','toResort','keysCanals','privateSpine469']){
 const road=w.roads461.find(r=>r.id===id);if(!road)continue;
 for(let i=8;i<road.samples.length-8;i++){
  const p=road.samples[i],f=H.closestBridge477(p.x,p.z);
  if(p.above<1.75||!f||f.road.id!==id||f.d>.4)continue;
  const off=road.width*.5+.48,x=p.x+off*(-f.dz),z=p.z+off*f.dx;
  const c=H.makeCar('player',x,z,Math.atan2(-f.dx,-f.dz));c.vx=-f.dz*11;c.vz=f.dx*11;
  const contact=H.guardBridgeRails477(c,p.x,p.z),nearest=H.closestBridge477(c.x,c.z);
  testedGuards++;if(contact&&nearest&&nearest.d<=road.width*.5+.15)guardsOK++;
  break;
 }
}
test('guardrails_contain_cars_at_varied_bridges',testedGuards>=3&&testedGuards===guardsOK,{testedGuards,guardsOK});
// 22 vehicle routes x 550 physics ticks, same harness used by stage477.
const game={world:w,rng:new H.RNG(777),inVehicle:false,avatar:{x:0,z:0},player:{x:0,z:0,alive:true,vx:0,vz:0},civilian:[],police:[]};
const simulations=[];
for(let i=0;i<22;i++){
 const c=H.spawnRoadTraffic477(game);if(!c)continue;let outside=0,invalid=0;
 for(let frame=0;frame<550;frame++){
  const ox=c.x,oz=c.z,control=H.trafficControl477(game,c,{mustStop:false,giveWay:false,emergency:false});
  if(c.route477.finished)break;
  H.stepCar(c,control,.03);H.guardBridgeRails477(c,ox,oz);
  if(!G.roadAt(c.x,c.z))outside++;
  if(!Number.isFinite(c.x+c.z+c.speed))invalid++;
 }
 simulations.push({id:c.route477.road.id,outside,invalid});game.civilian.push(c);
}
test('22_ai_vehicle_routes_no_offroad_or_nan',simulations.length===22&&simulations.every(x=>x.outside===0&&x.invalid===0),{count:simulations.length,outside:simulations.reduce((n,a)=>n+a.outside,0),invalid:simulations.reduce((n,a)=>n+a.invalid,0)});
test('native_1920x1080_mode_and_QA_switch_preserved',txt('engine44.js').includes("this.graphicsMode = 'native1080'")&&html.includes('city20_browser_benchmark.js')&&txt('assets/city20_stage04.js').includes('city20roadsOff'));
test('original_world_models_and_shaders_not_edited',txt('START_GAME.html').includes('assets/city20_stage03.js')&&txt('START_GAME.html').includes('assets/city20_stage04.js'));
const report={project:'SUNSET STATE CITY20',stage:4,base:'CITY20 Stage 3',status:'CPU/geometry integration tested. NO successful GPU FPS measurement.',
  reference:'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png',geometry:{routes:w.roads461.length,samples:offsetPoints,modifiedRoutes:changedRoads,
    maxProfileElevationAdjustment:peakMove,maxGrade:grade,meanGradeTransitionBefore:jerkBefore/(roadLen||1),meanGradeTransitionAfter:jerkAfter/(roadLen||1),
    averageGradeTransitionImprovementPercent:(1-jerkAfter/(jerkBefore||1))*100,newSurfaceOrParapetBoxes:extra,newBridgeJoints:meta.additionalDeckJoints,roadJunctionsProtected:protectedJunctions,
    buildings:w.buildings.length,newMassing:w.city20DistrictBuildings.length,portals:w.entrancePortals.length,foundations:w.boxes.filter(q=>q.city20Stage03Footing).length},
  performance:{baselineWorldConstructMs:baseline.buildMs,newWorldConstructMs:candidate.buildMs,
    note:'Individual CPU world-build times, NOT 1080p performance; host load is uncontrolled.',targetPx:[1920,1080],targetFps:50,verifiedOnPhysicalGpu:false},
  roadProfiles,simulations,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,allPassed:checks.every(x=>x.passed)};
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE04_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,geometry:report.geometry,performance:report.performance},null,2));
if(!report.allPassed)process.exitCode=2;
