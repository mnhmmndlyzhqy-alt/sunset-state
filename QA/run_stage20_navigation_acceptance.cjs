'use strict';
/* Stage20: actual Game/World, real CPU movement and collision. Fake renderer; no GPU claims. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {H,ctx,g}=require('./stage05_bootstrap.cjs');
const checks=[],failures=[];
function ok(name,cond,detail){checks.push({name,ok:!!cond});if(!cond){failures.push({name,detail});console.error('FAIL',name,JSON.stringify(detail).slice(0,350));}}
const A=H.stage20Pedestrian;
ok('stage20 module installed after original Recovery05',A?.stats.installed===true&&H.cityLifeRecovery5?.stats.installed===true);
ok('existing world has 52 roads',g.world.roads461.length===52);
ok('existing active portals retained',g.world.entrancePortals.filter(p=>p.interiorReady).length===214);
ok('existing stores retained',g.world.retailShops.length===59);
ok('existing glass preserved',g.world.glassPanels.length===988);
ok('existing collision preserved',g.world.solids.length===3230&&g.world.propSolids.length===796);
ok('crocodiles preserved',g.stage39Life.wildlife.filter(x=>x.kind==='crocodile').length===8);
const fixture={nearby(x,z){return [solid]}};
const solid={x:19.3,z:-35,hw:.85,hd:1.2};
const walker=H.createWalker(19.3,-44,Math.PI,3);
walker.y=H.walkerGround473(walker);walker.navAxis='z';walker.navRoad=19.3;
walker.navDir=1;walker.navNode=0;walker.navSide=1;walker.navState='sidewalk';
walker.navTargetX=19.3;walker.navTargetZ=-19.3;
const direct=walker.navTargetZ;
const planned=A.detourPlan({...walker,z:-40},fixture,[]);
ok('bounded obstacle detour candidate exists',!!planned,planned);
if(planned){
 ok('two waypoint plan',planned.waypoints.length===2);
 ok('detour endpoint clear',planned.waypoints.every(p=>A.safe(p.x,p.z,fixture,walker)));
 ok('detour remains local',planned.waypoints.every(p=>Math.hypot(p.x-19.3,p.z+40)<12));
}
let minDistance=Infinity,detourEntered=0,maxXDeviation=0;const originalX=walker.x;
for(let i=0;i<520;i++){
 H.walkPedestrianRoute(walker,{world:fixture,simDt:.05,cars:[],trams:[],others:[]});
 if(A.getState(walker).detour)detourEntered++;
 maxXDeviation=Math.max(maxXDeviation,Math.abs(walker.x-originalX));
 minDistance=Math.min(minDistance,Math.abs(walker.z-direct));
 if(!Number.isFinite(walker.x+walker.z+walker.y+walker.yaw)){failures.push({name:'NaN in obstructed walker',at:i});break;}
}
console.log('STAGE20 OBSTACLE',JSON.stringify({x:walker.x,z:walker.z,minDistance,detourEntered,maxXDeviation,stats:A.stats}));
ok('walker moves in real collision solver',Math.abs(walker.z+44)>3);
ok('detour plan actually used',detourEntered>0||A.stats.detourPlans>0,{detourEntered});
ok('never teleported outside sidewalk corridor',maxXDeviation<8,{maxXDeviation});
ok('walker can progress around blocker',minDistance<15,{minDistance});
// A stationarily obstructed zebra must not eventually become an unsafe crossing.
const blocked=H.createWalker(19.3,-19.3,0,1);blocked.y=H.walkerGround473(blocked);
Object.assign(blocked,{navAxis:'z',navRoad:19.3,navDir:1,navNode:0,navSide:1,navState:'waiting',navTargetX:19.3,navTargetZ:-19.3,navWait:0});
const car={x:19.3,z:0,vx:0,vz:0,speed:0,alive:true,wrecked:false};
let crossed=false,reversed=false;
for(let i=0;i<230;i++){
 H.walkPedestrianRoute(blocked,{world:g.world,simDt:.05,cars:[car],trams:[],others:[]});
 if(blocked.navState==='crossing')crossed=true;
 if(blocked.navDir===-1)reversed=true;
}
ok('blocked zebra never crossed while a car occupied it',!crossed);
ok('long occupied crossing re-routes along sidewalk',reversed);
ok('occupied-crossing pedestrian finite',Number.isFinite(blocked.x+blocked.z+blocked.yaw));
// Stress a mixed cohort in live collision world (rendering disabled).
const people=H.spawnPedestrians(new H.RNG(20261122),60,g.world);
const positions=people.map(w=>({x:w.x,z:w.z}));
let bad=null;
for(let i=0;i<180;i++){
 const grid=H.pedestrianBuckets(people);
 for(const w of people){
  try{H.walkPedestrianRoute(w,{world:g.world,simDt:.05,cars:[],trams:[],others:H.pedestrianNeighbours(w,grid)});}catch(e){bad=e.stack;break;}
 }
 if(bad)break;
}
const moved=people.filter((w,i)=>Math.hypot(w.x-positions[i].x,w.z-positions[i].z)>1).length;
const noNaN=people.every(w=>[w.x,w.z,w.yaw,w.y].every(Number.isFinite));
console.log('STAGE20 CROWD',{people:people.length,moved,bad,stats:A.stats});
ok('stress cohort all finite',noNaN&&!bad);
ok('stress cohort initialized routes',people.every(w=>w.navAxis!==null));
ok('9s cohort shows actual navigation',moved>=people.length*.6,{moved,count:people.length});
ok('stress cohort no synthetic world mutations',g.world.roads461.length===52&&g.world.solids.length===3230);
const result={stage:20,source:'Actual Game World / real movement & Recovery05 with CPU fake GL renderer',checks:checks.length,passed:checks.length-failures.length,failures,obstacle:{maxXDeviation,minDistance,detourEntered},blockedCrossing:{crossed,reversed},crowd:{actors:people.length,ticks:180,seconds:9,moved},navigationStats:A.stats,realGPU:false};
fs.writeFileSync(root+'/QA/STAGE20_ACCEPTANCE.json',JSON.stringify(result,null,2)+'\n');
console.log('STAGE20 ACCEPTANCE',result.passed+'/'+result.checks);if(failures.length)process.exitCode=1;
