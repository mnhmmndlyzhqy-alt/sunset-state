'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const scripts=[...read('START_GAME.html').matchAll(/<script src="([^"]+\.js)"/g)].map(m=>m[1]);
const c={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,location:{search:''},URLSearchParams,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}};
c.window=c;c.globalThis=c;vm.createContext(c);for(const s of scripts)new vm.Script(read(s),{filename:s}).runInContext(c,{timeout:60000});
const H=c.Heatline,world=new H.World(),people=H.spawnPedestrians(new H.RNG(65114),180,world);
const before=people.map(w=>({x:w.x,z:w.z})),start=Date.now(),dt=.033;
let steps=0,error=null;try{
 for(let n=0;n<150;n++){
  const bucket=H.pedestrianBuckets(people);
  for(const w of people){
   H.walkPedestrianRoute(w,{simDt:dt,world,cars:[],trams:[],others:H.pedestrianNeighbours(w,bucket)});
   steps++;
  }
 }
}catch(e){error=e.stack;}
const distance=people.map((w,i)=>Math.hypot(w.x-before[i].x,w.z-before[i].z));
const began=people.filter(w=>w.navAxis!==null).length,active=distance.filter(d=>d>1).length;
const startWater=before.filter(p=>!H.coast461.land(p.x,p.z)&&!H.coast461.isRouteRoad(p.x,p.z)).length;
const finalWater=people.filter(p=>!H.coast461.land(p.x,p.z)&&!H.coast461.isRouteRoad(p.x,p.z)).length;
const result={phase:5,scope:'180 pedestrians on full world, 150 simulated 33ms ticks, CPU only',elapsedMs:Date.now()-start,actors:people.length,ticks:150,steps,initializedRoutes:began,movedOver1m:active,totalTravelMeters:Math.round(distance.reduce((a,b)=>a+b,0)),waterClassified:{before:startWater,after:finalWater},finite:people.every(w=>[w.x,w.y,w.z,w.yaw,w.vx,w.vz].every(Number.isFinite)),error};
fs.writeFileSync(path.join(root,'QA/CITY_LIFE_RECOVERY05_CROWD.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
if(error||!result.finite||began<80||active<45)process.exitCode=2;
