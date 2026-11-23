'use strict';
/* Stage36: scene-based, bounded CPU-only comparison using actual cumulative Game
 * and original GLRenderer.cull/pack methods but a fake renderer and NO GPU.
 * The 6 camera scenarios are deterministic probes, NOT measured player journeys.
 */
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..'),init=performance.now();
const {g,H,ctx}=require('./stage05_bootstrap.cjs');
const initMs=performance.now()-init,renderClass=ctx.__Stage23RealGLRenderer;
const assert=(v,s)=>{if(!v)throw Error(s);};
assert(renderClass?.prototype?.getVisibleStatic,'original renderer culling not available');
const source=g.world.boxes,step=Math.max(1,Math.floor(source.length/7000));
const sampled=source.filter((_,i)=>i%step===0);
const renderer=Object.create(renderClass.prototype);
renderer.qualityScale=1;renderer.glWidth=1920;renderer.glHeight=1080;
renderer.cullSquared475=true;renderer.detailEnabled475=false;
renderer.groupFlags476={};renderer.instanceScratch=new Float32Array(0);
const point=g.cam,copy=(x,y,z)=>({...point,x,y,z,tx:x+(point.tx-point.x),ty:point.ty,tz:z+(point.tz-point.z)});
const retail=g.world.retailShops?.find(v=>Number.isFinite(v.retail?.doorX)&&Number.isFinite(v.retail?.frontZ));
const spots=[
 ['spawn_camera',copy(point.x,point.y,point.z)],
 ['shift_200m_east',copy(point.x+200,point.y,point.z)],
 ['shift_400m_north',copy(point.x,point.y,point.z-400)],
 ['high_aerial_camera',copy(point.x+150,150,point.z)],
 ['shift_390m_west',copy(point.x-390,point.y,point.z+180)],
 ['retail_door_camera',retail?copy(retail.retail.doorX,point.y,retail.retail.frontZ):copy(point.x+100,point.y,point.z+100)]
];
function scene(){return {source:null,cells:new Map(),global:[],skyline:[],visible:[],cullX:NaN,cullZ:NaN};}
function num(n){return +n.toFixed(3);}
function stats(v){v=v.slice().sort((a,b)=>a-b);return {samples:v.length,p50Ms:num(v[Math.ceil(v.length*.5)-1]),p95Ms:num(v[Math.ceil(v.length*.95)-1]),maxMs:num(v[v.length-1])};}
const rows=[],t0=performance.now();
for(const [label,cam] of spots){
 const s=scene();let start=performance.now(),first=renderer.getVisibleStatic(sampled,cam,s);const initCost=performance.now()-start;
 const cached=[];for(let i=0;i<4;i++){start=performance.now();renderer.getVisibleStatic(sampled,cam,s);cached.push(performance.now()-start);}
 const moved={...cam,x:cam.x+60,tx:cam.tx+60};start=performance.now();const next=renderer.getVisibleStatic(sampled,moved,s);const movedCost=performance.now()-start;
 rows.push({label,camera:[num(cam.x),num(cam.y),num(cam.z)],sampledSource:sampled.length,
  visibleCandidates:first.length,visibleAfter60mCameraShift:next.length,initCullingMs:num(initCost),
  cachedCulling:stats(cached),cullingAfter60mMs:num(movedCost),spatialCells:s.cells.size,
  note:'These numbers are real JS execution for a sampled subset only; do not extrapolate as whole-world frame time.'});
}
const packing=[];
for(const size of [512,2048]){
 const items=sampled.slice(0,size),times=[];
 for(let i=0;i<5;i++){const st=performance.now(),a=renderer.pack(items,true);times.push(performance.now()-st);
  assert(a.length===items.length*20,`unexpected packing float stride: ${a.length}`);}
 packing.push({objects:size,instanceBytes:size*80,scratchReuse:stats(times)});
}
const mem=process.memoryUsage(),report={stage:36,type:'BOUNDED_CPU_ONLY',createdAt:new Date().toISOString(),
 baseline:'SUNSET STATE Stage35 verified site + preserved Stage32 source and cumulative Stage35 docs',
 environment:{node:process.version,platform:process.platform,realGameConstructor:true,fakeRenderer:true,
    webglContext:false,gpuTimingsMeasured:false,measuredGameFps:false},
 initialScriptAndGameWorldLoadMs:num(initMs),cullingAuditElapsedMs:num(performance.now()-t0),
 world:{staticObjects:source.length,sampledStaticObjects:sampled.length,sampleMethod:`every ${step}th full-world object`,
    totalRoadSegments:g.world.roads461.length,entrancePortals:g.world.entrancePortals.length,
    pedestrians:g.pedestrians.length,retailShops:g.world.retailShops.length},
 cameraProbeScenarios:rows,instancePacker:packing,
 processMemoryMiB:{rss:num(mem.rss/1048576),heapUsed:num(mem.heapUsed/1048576),external:num(mem.external/1048576)},
 conclusions:['Six deterministic camera-position probes exercised the genuine renderer culling function on a bounded subset.',
   'The previous full-world Stage23 profiling attempt timed out; no full-world culling timing is claimed.',
   'This environment has no verified native hardware GPU capture; native1080 FPS and GPU execution time remain unknown.'],
 readyForUserHardwareAudit:true};
fs.writeFileSync(path.join(__dirname,'STAGE36_BOUNDED_CPU_PROFILE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stage:36,initMs:report.initialScriptAndGameWorldLoadMs,world:report.world,
 probes:rows.map(r=>({name:r.label,visible:r.visibleCandidates,initMs:r.initCullingMs,movedMs:r.cullingAfter60mMs})),memory:report.processMemoryMiB},null,2));
