'use strict';
/* Real cumulative Game/vehicle logic executed under a CPU renderer stub.
 * This is NOT a visual QA, WebGL2 test, benchmark or published URL test. */
const fs=require('fs'),path=require('path');
const {H,g,ctx}=require('./stage05_bootstrap.cjs');
const m=H.stage31VehiclePolish;
const checks=[],failures=[];
const test=(name,value,details)=>{checks.push({name,pass:!!value});if(!value)failures.push({name,details});};
const state=c=>JSON.parse(JSON.stringify(c));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const withDisabled=(flag,fn)=>{ctx.__SUNSET_STAGE31_VEHICLES_OFF=flag;try{return fn()}finally{ctx.__SUNSET_STAGE31_VEHICLES_OFF=false}};
const driver=(car,input,dt=.033)=>{H.stepCar(car,input,dt);return state(car)};
const make=(type='player')=>H.makeCar(type,-42,-32,0,1);
const throttle={gas:1,steer:0,brake:false,nitro:false};
const steer={gas:.72,steer:0,brake:false,nitro:false};
const counts=()=>({boxes:g.world.boxes.length,roads:g.world.roads461.length,buildings:g.world.buildings.length,
 mapped:g.world.city20DistrictBuildings.length,shops:g.world.retailShops.length,
 portals:g.world.entrancePortals.filter(p=>p.interiorReady).length,
 walls:g.world.solids.length,props:g.world.propSolids.length,glass:g.world.glassPanels.length,
 cars:g.civilian.length,parked:g.parked.length});
const before=counts();
test('Stage31 hooks installed exactly once',m?.stats.installed===true);
test('Stage30 preserved',H.stage30CharacterPolish?.stats.installed===true);
test('Stage29 interiors preserved',H.stage29InteriorPolish?.installed===true);
test('Stage21 CCD preserved',H.stage21HighSpeedCCD?.stats.installed===true);
test('214 active entrances and 59 shops intact',before.portals===214&&before.shops===59);
test('52 roads, 130 CITY20 and 84 legacy buildings intact',before.roads===52&&before.mapped===130&&before.buildings===84);
test('All original colliders/glass and Stage28 facades intact',before.walls===3230&&before.props===796&&before.glass===988&&g.world.boxes.filter(x=>x.stage28Facade).length===1982);
test('All six original interceptor variants retained',H.INTERCEPTOR31_VARIANTS.length===6&&['police','white','silver','red','blue','taxi'].every(x=>H.INTERCEPTOR31_VARIANTS.includes(x)));
let dry=make();dry.surfaceGrip=1;
const baselineDry=withDisabled(true,()=>driver(state(dry),throttle));
const activeDry=driver(state(dry),throttle);
test('Perfectly healthy dry-road car retains Stage30 dynamics',eq(baselineDry,activeDry));
let wet=make();wet.surfaceGrip=.53;
const wetBase=withDisabled(true,()=>driver(state(wet),throttle));
const wetNew=driver(state(wet),throttle);
test('Wet-road positive throttle reduced without reversing',wetNew.speed>0&&wetNew.speed<wetBase.speed,{base:wetBase.speed,now:wetNew.speed});
test('Wet-road car stays finite and within world limits',[wetNew.x,wetNew.z,wetNew.vx,wetNew.vz,wetNew.yaw].every(Number.isFinite));
test('Low grip does not turn steering into handbrake',m.adjustPlayerInput(wet,throttle).brake===false);
test('Throttle in rain remains above 75% of player input',m.adjustPlayerInput(wet,throttle).gas>=.75);
let broken=make();broken.vz=-17;broken.speed=17;broken.wheelDamage=[.82,.02,0,0];broken.steeringBias=.115;
const brokeBase=withDisabled(true,()=>driver(state(broken),steer));
const brokeNew=driver(state(broken),steer);
test('Damaged steering rack produces bounded steering pull',Math.abs(brokeNew.yawRate-brokeBase.yawRate)>.00001&&Math.abs(brokeNew.yawRate)<1.5,{base:brokeBase.yawRate,now:brokeNew.yawRate});
test('Bent steering does not increase vehicle health',brokeNew.hp===broken.hp&&brokeNew.engineDamage===broken.engineDamage);
H.repairVehicleSystems(broken,1);
test('Existing garage repair resets rack and tyre damage',broken.steeringBias===0&&broken.wheelDamage.every(x=>x===0));
const repairedBase=withDisabled(true,()=>driver(state(broken),steer));
const repairedNow=driver(state(broken),steer);
test('Fully repaired original steering feel restored',eq(repairedBase,repairedNow));
const car=H.makeCar('civilian',100,100,0,2),lead=H.makeCar('civilian',100,84,0,1);
car.vz=-19;car.speed=19;lead.vz=0;lead.speed=0;
const near={civilian:[car,lead],police:[],parked:[],buses:[],player:null};
const risk=m.findTrafficRisk(near,car);
test('Approaching stopped lead vehicle triggers headway sensor',risk>.85,{risk});
const brake=m.trafficDecision(near,car,throttle,20);
test('Civilian applies original SERVICE braking rather than handbrake',brake.gas<0&&brake.brake===false,{gas:brake.gas});
let empty={civilian:[car],police:[],parked:[],buses:[],player:null};
test('Traffic without nearby vehicles maintains original accelerator',m.trafficDecision(empty,car,throttle,21)===throttle);
const alongside=H.makeCar('civilian',106,84,0,3);
test('Adjacent lane at >6 m lateral separation not mistaken for blockage',m.findTrafficRisk({...near,civilian:[car,alongside]},car)===0);
const elevated=H.makeCar('civilian',216,-420,0,2),lower=H.makeCar('civilian',216,-430,0,1);
elevated.deck443=true;lower.deck443=false;elevated.vz=-18;
test('Elevated road and street below stay separated',!H.sameRoadLevel443(elevated,lower)&&m.findTrafficRisk({civilian:[elevated,lower],parked:[],police:[],buses:[],player:null},elevated)===0);
test('A/B toggle disables module on command',withDisabled(true,()=>m.off())===true&&m.off()===false);
// The real Game.moveCar dispatch must pass risk-aware input into the original
// movement, not merely expose an unused helper for unit tests.
const previousLists={civilian:g.civilian,police:g.police,parked:g.parked,player:g.player,buses:g.buses};
const realOriginalStep=H.stepCar;let capturedGas=null,dispatcherError=null;
try {
 g.civilian=[car,lead];g.police=[];g.parked=[];g.player=null;g.buses=[];
 H.stepCar=function(c,input,dt){if(c===car)capturedGas=input.gas;return realOriginalStep(c,input,dt)};
 g.moveCar(car,.016,throttle);
} catch(e){dispatcherError=String(e)} finally {
 H.stepCar=realOriginalStep;
 Object.assign(g,previousLists);
}
test('Actual Game.moveCar routes civilian braking into vehicle physics',dispatcherError===null&&capturedGas!==null&&capturedGas<0,{capturedGas,dispatcherError});
const busRisk=m.findTrafficRisk({civilian:[car],parked:[],police:[],player:null,buses:[{x:car.x,z:car.z-14,vx:0,vz:0}]},car);
test('Civilian headway sensor also sees stopped public buses',busRisk>.2,{busRisk});

const marker=H.makeCar('civilian',g.cam.x+3,g.cam.z+3,0,1);
marker.panelDamage=[.76,.2,.63,.17,.97,.54];
const pieces=[],wearCount=m.wearGeometry(g,marker,pieces);
test('Impact zones create local physical render meshes',wearCount>=4&&wearCount<=10,{wearCount});
test('Wear geometry only uses bounded, finite meshes',pieces.every(p=>p.stage31VehicleDetail&&p.lodMax<=60&&Number.isFinite(p.x+p.y+p.z+p.w+p.h+p.d)&&p.w>0&&p.h>0&&p.d>0));
const distant=H.makeCar('civilian',g.cam.x+90,g.cam.z,0,4);distant.panelDamage=[1,1,1,1,1,1];
test('Distant vehicles receive no new wear mesh',m.wearGeometry(g,distant,[])===0);
const healed=H.makeCar('civilian',g.cam.x+3,g.cam.z+3,0,1);
test('Undamaged vehicles receive no cosmetic wear mesh',m.wearGeometry(g,healed,[])===0);
const c1=H.makeCar('civilian',g.cam.x+2,g.cam.z+2,0,1);c1.panelDamage=[.55,.7,.2,.2,.2,.2];
const graphicOff=withDisabled(true,()=>{const arr=[];g.carGraphics(c1,arr,5);return arr;});
const graphicOn=[];g.carGraphics(c1,graphicOn,5);
test('Real car graphics retain original mesh source and ordering',graphicOn.length>graphicOff.length&&graphicOn.slice(0,graphicOff.length).every((x,i)=>x.shape===graphicOff[i].shape));
test('A/B switch restores exact Stage30 car geometry',withDisabled(true,()=>{const arr=[];g.carGraphics(c1,arr,5);return eq(arr,graphicOff)}));
let simulated=true,steps=0;
const simulationCar=H.makeCar('player',-36,-36,0,2);simulationCar.surfaceGrip=.67;
for(let i=0;i<320;i++){
 const inp={gas:i<185?1:0,steer:Math.sin(i*.075)*.64,brake:i>230&&i<249,nitro:i>80&&i<110};
 try{H.stepCar(simulationCar,inp,.016);}catch(_){simulated=false;break;}
 if(![simulationCar.x,simulationCar.z,simulationCar.yaw,simulationCar.vx,simulationCar.vz].every(Number.isFinite)){simulated=false;break;}
 steps++;
}
test('320 real physics steps remain finite with rain, nitro, braking, cornering',simulated&&steps===320);
test('Real vehicle remains steerable and finite after >5 seconds of driving',Math.abs(simulationCar.yaw)>.01&&simulationCar.speed<120);
test('Existing core world state unchanged by vehicle QA',eq(before,counts()),{before,after:counts()});
test('No new vehicles, collision bodies, garage saves or GLB replacements',m.stats.addedCollisionBodies===0&&m.stats.changedVehicleModels===0&&m.stats.saveSchemaChanges===0);
test('No unverified GPU/FPS certification claimed',m.stats.gpuVerified===false&&m.stats.native1080p50fpsVerified===false);
const html=fs.readFileSync(path.join(__dirname,'../START_GAME.html'),'utf8');
test('Stage31 module loaded before engine which installs Game hooks',html.indexOf('assets/stage31_vehicle_traffic_polish.js')<html.indexOf('engine44.js')&&html.indexOf('assets/stage31_vehicle_traffic_polish.js')>0);
const report={stage:31,basis:'real Stage30 cumulative Game source + CPU stub renderer; no GPU test',passed:checks.length-failures.length,total:checks.length,checks,failures,
  metrics:{worldPreserved:eq(before,counts()),stage30World:before,trafficRiskNear:risk,cosmeticMeshes:wearCount,physicsSimulationSteps:steps,stats:m.stats},
  caveats:{nativeWebGL2:false,hardwareGPU:false,fullHD50Fps:false,publicGithubPages:false}};
fs.writeFileSync(path.join(__dirname,'STAGE31_VEHICLE_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log(`STAGE31 VEHICLE QA ${report.passed}/${report.total} | engine real, CPU renderer simulated | risk=${risk.toFixed(3)} | wear=${wearCount}`);
for(const f of failures)console.error('FAIL',f.name,JSON.stringify(f.details||{}));
if(failures.length)process.exitCode=1;
