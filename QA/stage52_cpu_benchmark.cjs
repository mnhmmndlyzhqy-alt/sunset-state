'use strict';
/* CPU simulation and geometry preparation only. No WebGL drawing, browser,
 * monitor, or GPU is measured. These numbers must never be labeled FPS. */
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
process.env.SUNSET_QA_SEED??='520126';
const env=require('./stage51_bootstrap.cjs');
const {H,g,advance}=env;
const samples=Math.max(20,Math.min(120,Number(process.env.SUNSET_BENCH_SAMPLES)||36));
g.renderer.name='WebGL2 CPU preparation harness; no GPU';
H.realism39.renderer={rcCharacters:true};
const clock=()=>performance.now();
const aggregate=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:a.length,medianMs:+s[Math.floor(s.length*.5)].toFixed(4),p95Ms:+s[Math.min(s.length-1,Math.floor(s.length*.95))].toFixed(4),meanMs:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(4)};};
let active=null;
function instrument(obj,name,label=name){
 const fn=obj[name];if(typeof fn!=='function')return;
 obj[name]=function(...args){const start=clock();try{return fn.apply(this,args);}finally{if(active){const stat=active[label]||={calls:0,ms:0};stat.calls++;stat.ms+=clock()-start;}}};
}
for(const name of ['updatePedestrians','updateCivilian','updatePolice','updateCamera','updateHUD','resolveCarCollisions','resolveTramCollisions','resolveBusCollisions'])instrument(g,name);
instrument(g.world,'nearby','world.nearby');
instrument(g.world,'nearbyLobbyDoors443','world.nearbyLobbyDoors443');
instrument(g.nav445,'update','navigator.update');
instrument(g.stage39Life,'step','ambient.step');
const stateCount=()=>({pedestrians:g.pedestrians.length,civilian:g.civilian.length,police:g.police.length,solids:g.world.solids.length,staticParts:g.world.boxes.length});
function frame(){
 advance(1000/60);
 H.realism39.characterQueue.length=0;
 const a=clock();g.update(1/60);const b=clock();
 const dynamic=g.buildDynamic();const c=clock();
 const lights=g.sceneLights();const d=clock();
 return {update:b-a,geometry:c-b,lights:d-c,total:d-a,parts:dynamic.length,characters:H.realism39.characterQueue.length,lightCount:lights.length};
}
function scenario(name,setup){
 g.restart({reuseWorld:true});
 g.renderer.name='WebGL2 CPU preparation harness; no GPU';
 H.realism39.renderer={rcCharacters:true};
 setup();
 for(let i=0;i<30;i++)frame();
 const metrics={update:[],geometry:[],lights:[],total:[]},parts=[],characters=[],calls={};
 active=calls;
 for(let i=0;i<samples;i++){const f=frame();for(const k in metrics)metrics[k].push(f[k]);parts.push(f.parts);characters.push(f.characters);}
 active=null;
 return {name,...stateCount(),parts:[Math.min(...parts),Math.max(...parts)],characters:[Math.min(...characters),Math.max(...characters)],
  metrics:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,aggregate(v)])),
  components:Object.fromEntries(Object.entries(calls).map(([k,s])=>[k,{calls:s.calls,totalMs:+s.ms.toFixed(3),perFrameMs:+(s.ms/samples).toFixed(3)}]))};
}
const place=(x,z,yaw=0)=>{Object.assign(g.avatar,{x,z,y:H.outdoorHeight(x,z),yaw,vx:0,vz:0,grounded:true});g.footCameraYaw=yaw;g.cameraTransfer=0;g.inVehicle=false;g.cam={x:x+Math.sin(yaw)*5,y:g.avatar.y+3.8,z:z+Math.cos(yaw)*5,tx:x,ty:g.avatar.y+1.4,tz:z,fov:65};};
const results=[
 scenario('downtown_on_foot',()=>place(-32,-32)),
 scenario('street_driver',()=>{g.inVehicle=true;Object.assign(g.player,{x:-32,z:-32,yaw:0,vx:0,vz:0,speed:0});g.updateCamera(.05);}),
 scenario('airport_flight',()=>{const f=g.flight51;place(f.site.x,f.site.z);f.interact();Object.assign(f.plane,{x:0,z:H.reference469.runway.z,y:110,yaw:Math.PI/2,airborne:true,speed:60,throttle:.5,gear:0});f.cameraHeading=undefined;g.updateCamera(.05);}),
 scenario('existing_lobby',()=>{const p=g.world.entrancePortals.find(p=>p.interiorReady);g.enterBuilding(p.id);})
];
const unexpected=env.warnings.filter(x=>x!=='Audio unavailable ReferenceError: AudioContext is not defined');
if(env.errors.length||unexpected.length)throw Error(JSON.stringify({warnings:unexpected,errors:env.errors}));
const report={kind:'Node.js CPU simulation and geometry preparation; not FPS',seed:Number(process.env.SUNSET_QA_SEED),samplesPerScene:samples,
 sourceScripts:env.scripts.length,node:process.version,hardwareClaim:false,webgl:false,results};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({kind:report.kind,results:results.map(r=>({name:r.name,metrics:r.metrics,parts:r.parts,components:r.components}))},null,2));
