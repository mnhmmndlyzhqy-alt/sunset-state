'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const files=[...fs.readFileSync(root+'/START_GAME.html','utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
const s=Date.now(),c={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}};
c.globalThis=c;c.window=c;c.location={search:'?qa=477'};vm.createContext(c);
for(const file of files)vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),c,{filename:file,timeout:35000});
const H=c.Heatline,G=H.coast461,w=new H.World(),life=new H.Stage39Life(w);
const checks=[];const check=(id,value,details)=>{checks.push({id,passed:!!value,details});if(!value)console.error('FAILED',id,details);};
check('scripts_complete',files.length>=36,{count:files.length});
check('road_count_preserved',w.roads461.length===52,{count:w.roads461.length});
let maxGrade=0,segments=0,huge=0;
for(const road of w.roads461)for(let i=1;i<road.samples.length;i++){
  const a=road.samples[i-1],b=road.samples[i],length=Math.hypot(b.x-a.x,b.z-a.z);
  if(length>.03){let grade=Math.abs(b.y-a.y)/length;maxGrade=Math.max(maxGrade,grade);segments++;if(grade>.09001)huge++;}
}
check('road_grade_max_9_percent',maxGrade<=.09001,{maxGrade,segments,tooSteep:huge});
check('road_layers_indexed',G.roadProfileStats477?.segments>1500,G.roadProfileStats477);
const oldBoard=G.boardwalk[3];check('timber_boardwalk_collision_removed',G.trailAt(oldBoard.x,oldBoard.z)===null,{x:oldBoard.x,z:oldBoard.z});
const crocs=life.wildlife.filter(a=>a.kind==='crocodile'),flamingos=life.wildlife.filter(a=>a.kind==='flamingo');
const crocSites=crocs.map(a=>({x:a.x,z:a.z,waterLevel:G.coast(a.x,a.z)}));
check('all_crocodiles_in_real_water',crocs.length===8&&crocs.every(a=>G.coast(a.x,a.z)<-.5),crocSites);
let closestFlamingo=Infinity;for(const croc of crocs)for(const flamingo of flamingos)closestFlamingo=Math.min(closestFlamingo,Math.hypot(croc.x-flamingo.x,croc.z-flamingo.z));
check('crocodiles_separate_from_flamingos',closestFlamingo>80,{closestDistanceMeters:closestFlamingo});
const road=w.roads461.find(r=>r.id==='westExpress'),p=road.samples.find(a=>Math.abs(a.z+432)<3),idx=road.samples.indexOf(p),near=road.samples[idx+1]||road.samples[idx-1],yaw=Math.atan2(-(near.x-p.x),-(near.z-p.z)),vehicle=H.makeCar('player',p.x,p.z,yaw),layer=H.getRoadProfile477(vehicle,vehicle.x,vehicle.z),matchedY=H.deckGround443(vehicle);
check('bridge_crossing_selects_upper_layer',layer?.road.id==='westExpress'&&Math.abs(matchedY-(layer.y-.074))<.15,{matched:layer?.road.id,roadHeight:layer?.y,carSurface:matchedY});
let guardTest=null;
for(let i=7;i<road.samples.length-7;i++){
 const q=road.samples[i],b=H.closestBridge477(q.x,q.z);
 if(q.above>1.6&&b&&b.road.id===road.id&&b.d<.3){const limit=b.road.width*.5-.32,off=limit+1.2,x=q.x-off*b.dz,z=q.z+off*b.dx,car=H.makeCar('player',x,z,0);car.vx=10*(-b.dz);car.vz=10*b.dx;const trigger=H.guardBridgeRails477(car,q.x,q.z),after=H.closestBridge477(car.x,car.z);guardTest={trigger,after:after?.d,limit};break;}
}
check('bridge_guard_restricts_car_to_bridge',guardTest?.trigger&&guardTest.after<=guardTest.limit+.05,guardTest);
const game={world:w,rng:new H.RNG(777),inVehicle:false,avatar:{x:0,z:0},player:{x:0,z:0,alive:true,vx:0,vz:0},civilian:[],police:[]};
const cars=[];
for(let i=0;i<48;i++){const car=H.spawnRoadTraffic477(game);if(!car)break;cars.push(car);game.civilian.push(car);}
const offroad=cars.filter(car=>!G.roadAt(car.x,car.z));
check('traffic_48_valid_initial_positions',cars.length===48&&offroad.length===0,{cars:cars.length,offroad:offroad.length});
// Route-steering in the real vehicle physics. Traffic signal/nearby-car constraints
// are separately covered by the world game loop and cannot be verified headlessly.
game.civilian=[];const simulations=[];
for(let i=0;i<22;i++){
 const car=H.spawnRoadTraffic477(game);if(!car)continue;let outside=0,invalid=0;
 for(let frame=0;frame<550;frame++){
  const ox=car.x,oz=car.z,control=H.trafficControl477(game,car,{mustStop:false,giveWay:false,emergency:false});
  if(car.route477.finished)break;
  H.stepCar(car,control,.03);H.guardBridgeRails477(car,ox,oz);
  if(!G.roadAt(car.x,car.z))outside++;
  if(!Number.isFinite(car.x+car.z+car.speed))invalid++;
 }
 simulations.push({road:car.route477.road.id,outside,invalid});
 game.civilian.push(car);
}
check('ai_physics_routes_stay_on_road',simulations.length===22&&simulations.every(x=>x.outside===0&&x.invalid===0),{simulatedCars:simulations.length,framesPerCar:550,offroadTotal:simulations.reduce((a,x)=>a+x.outside,0),invalidTotal:simulations.reduce((a,x)=>a+x.invalid,0)});
const noChangeFiles=['assets/performance_476.js','assets/visual_450.js','assets/crocodile_hi.js'];
check('native_1080_pipeline_preserved',noChangeFiles.every(f=>fs.existsSync(path.join(root,f)))&&fs.readFileSync(root+'/engine44.js','utf8').includes("this.graphicsMode = 'native1080'"),{native1080:true,gpuFpsMeasured:false});
const out={version:'4.7.7',test:'read-only actual program scripts and game world CPU logic',date:'2026-11-21',durationMs:Date.now()-s,checksPassed:checks.filter(t=>t.passed).length,checksTotal:checks.length,allPassed:checks.every(t=>t.passed),checks,limitations:['no successful graphical browser test in this container','no proven 50 FPS at physical 1920x1080 device','actual game physics and visual regressions still need user GPU checks']};
fs.writeFileSync(root+'/QA/SUNSET_STATE_4_7_7_CPU_ACCEPTANCE.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({version:out.version,passed:out.checksPassed,total:out.checksTotal,durationMs:out.durationMs,results:checks.map(v=>[v.id,v.passed])},null,2));
if(!out.allPassed)process.exitCode=2;
