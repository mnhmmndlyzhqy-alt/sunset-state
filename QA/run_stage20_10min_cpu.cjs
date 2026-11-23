'use strict';
/* 600 seconds simulated in the CPU navigator; NOT 10 minutes of live GPU gameplay. */
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs');
const people=H.spawnPedestrians(new H.RNG(2001122),8,g.world);
const baseline=people.map(w=>({x:w.x,z:w.z}));
const farthest=people.map(()=>0),nearWater=[];let failures=[],maxRouteStall=0;
const steps=3000,dt=.2,start=Date.now();
for(let i=0;i<steps;i++){
 const grid=H.pedestrianBuckets(people);
 for(let k=0;k<people.length;k++){
  const w=people[k];
  try{H.walkPedestrianRoute(w,{world:g.world,simDt:dt,cars:[],trams:[],others:H.pedestrianNeighbours(w,grid)});}catch(e){failures.push('walker '+k+' step '+i+': '+e.stack);break;}
  if(![w.x,w.y,w.z,w.yaw,w.vx,w.vz].every(Number.isFinite)){failures.push('nonfinite walker '+k);break;}
  const d=Math.hypot(w.x-baseline[k].x,w.z-baseline[k].z);
  farthest[k]=Math.max(farthest[k],d);
  maxRouteStall=Math.max(maxRouteStall,w.navStall||0);
 }
 if(failures.length)break;
}
const traveledOver20m=farthest.filter(d=>d>20).length;
const report={stage:20,category:'long CPU-only pedestrian routing',simulatedSeconds:steps*dt,
 actors:people.length,steps,actorTicks:steps*people.length,elapsedWallMs:Date.now()-start,
 traveledOver20m,initialPositions:baseline,finalPositions:people.map(w=>({x:w.x,z:w.z})),
 maxDistances:farthest,maxRouteStall,allRoutesInitialized:people.every(w=>w.navAxis!=null),
 worldRoads:g.world.roads461.length,realGPU:false,realHumanPlaytime:false,
 diagnostics:{...H.stage20Pedestrian.stats},failures};
fs.writeFileSync('QA/STAGE20_10MIN_CPU_STRESS.json',JSON.stringify(report,null,2)+'\n');
console.log('STAGE20 simulated 10min',JSON.stringify({simulatedSeconds:report.simulatedSeconds,actors:people.length,actorTicks:report.actorTicks,traveledOver20m,elapsedWallMs:report.elapsedWallMs,nav:report.diagnostics,failures:failures.length}));
if(failures.length||traveledOver20m<5||report.worldRoads!==52||!report.allRoutesInitialized)process.exitCode=1;
