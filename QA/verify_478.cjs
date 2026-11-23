'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),start=Date.now();
const scriptSources=[...fs.readFileSync(root+'/START_GAME.html','utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
const context={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}};
context.globalThis=context;context.window=context;context.location={search:'?qa=478'};vm.createContext(context);
for(const src of scriptSources)vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'),context,{filename:src,timeout:35000});
const H=context.Heatline,G=H.coast461,world=new H.World(),life=new H.Stage39Life(world);
const cases=[];function assert(id,pass,details){cases.push({id,passed:!!pass,details});if(!pass)console.error('FAILED',id,details);}
assert('script_loaded_once',scriptSources.filter(s=>s==='assets/continuation_478.js').length===1,{scripts:scriptSources.length});
assert('real_roads_preserved',world.roads461.length===52,{count:world.roads461.length});
assert('native_full_hd_code_kept',fs.readFileSync(path.join(root,'engine44.js'),'utf8').includes("this.graphicsMode = 'native1080'"),{setting:'native1080'});
assert('new_guards_are_versioned',typeof H.PerformanceGuard475==='function'&&H.PerformanceGuard475.toString().includes('PerformanceGuard478'),{});
let grade=0;
for(const road of world.roads461)for(let i=1;i<road.samples.length;i++){
  const a=road.samples[i],b=road.samples[i-1],d=Math.hypot(a.x-b.x,a.z-b.z);if(d>.03)grade=Math.max(grade,Math.abs(a.y-b.y)/d);
}
assert('grade_cap_not_regressed',grade<.09001,{maxSlope:grade});
const features=world.boxes.filter(o=>o.sunset478===true);
assert('bounded_optional_detail',features.length>35&&features.length<150,{meshes:features.length,stats:world.stage478Stats});
assert('new_details_have_no_colliders',features.every(o=>o.stage475Optional===true&&o.visibilityCap<=180&&o.lodMax<=180),{});
assert('all_new_detail_on_dry_land',features.every(o=>G.coast(o.x,o.z)>.5&&!G.roadAt(o.x,o.z)),{});
assert('no_fake_water_or_timber_path',features.every(o=>o.material!=='wood'&&o.material!=='water39')&&world.stage478Stats.noTimberPlatformAdded,{});
const crocs=life.wildlife.filter(x=>x.kind==='crocodile');
assert('crocodiles_still_in_water',crocs.length===8&&crocs.every(a=>G.coast(a.x,a.z)<-.5),{animals:crocs.length});
const game={world,rng:new H.RNG(777),inVehicle:false,avatar:{x:0,z:0},player:{x:0,z:0,vx:0,vz:0,alive:true},civilian:[],police:[],parked:[]};
const cars=[];for(let i=0;i<25;i++){const c=H.spawnRoadTraffic477(game);if(!c)break;cars.push(c);game.civilian.push(c);}
assert('traffic_still_spawns_on_roads',cars.length===25&&cars.every(c=>G.roadAt(c.x,c.z)),{cars:cars.length});
const car=cars[0],oldSpeed=car.speed;
car.speed=14;car.vx=-Math.sin(car.yaw)*14;car.vz=-Math.cos(car.yaw)*14;
const lead=H.makeCar('civilian',car.x-Math.sin(car.yaw)*8,car.z-Math.cos(car.yaw)*8,car.yaw);
lead.speed=0;lead.vx=0;lead.vz=0;game.civilian=[car,lead];
const brake=H.trafficControl477(game,car,{mustStop:false,giveWay:false,emergency:false});
assert('npc_predictive_braking',brake.brake===true&&brake.gas===0,{brake:brake.brake,gas:brake.gas});
const oldData={x:lead.x,z:lead.z};lead.x=car.x+Math.cos(car.yaw)*12;lead.z=car.z-Math.sin(car.yaw)*12;
const free=H.trafficControl477(game,car,{mustStop:false,giveWay:false,emergency:false});
assert('npc_does_not_brake_for_sidecar',free.brake!==true,{brake:free.brake,gas:free.gas});
car.speed=oldSpeed;game.civilian=[];
const testCars=[];let off=0,invalid=0;
for(let i=0;i<22;i++){
  const c=H.spawnRoadTraffic477(game);if(!c)continue;
  let outside=0;
  for(let k=0;k<550;k++){
    const ox=c.x,oz=c.z;
    const ctl=H.trafficControl477(game,c,{mustStop:false,giveWay:false,emergency:false});
    if(c.route477.finished)break;
    H.stepCar(c,ctl,.03);H.guardBridgeRails477(c,ox,oz);
    if(!G.roadAt(c.x,c.z)){off++;outside++;}
    if(!Number.isFinite(c.x+c.z+c.speed)){invalid++;break;}
  }
  testCars.push({road:c.route477.road.id,offroad:outside});game.civilian.push(c);
}
assert('npc_regression_22_routes',testCars.length===22&&off===0&&invalid===0,{total:testCars.length,offroad:off,invalid});
const result={version:'4.7.8',date:'2026-11-21',testType:'code/CPU simulation, not GPU rasterization',checksPassed:cases.filter(x=>x.passed).length,checksTotal:cases.length,allPassed:cases.every(x=>x.passed),durationMs:Date.now()-start,worldAdded:world.stage478Stats,traffic:testCars,checks:cases,gpuFpsVerified:false,native1080GpuVerified:false,notes:['No complete user GPU 1920x1080/50FPS benchmark.','Optional new details use the existing FPS rollback guard.','Physical gameplay and visual QA remain necessary.']};
fs.writeFileSync(root+'/QA/SUNSET_STATE_4_7_8_CPU_ACCEPTANCE.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({version:result.version,passed:result.checksPassed,total:result.checksTotal,ms:result.durationMs,details:world.stage478Stats,trafficOffroad:off,checks:cases.map(x=>[x.id,x.passed])},null,2));
if(!result.allPassed)process.exitCode=2;
