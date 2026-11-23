'use strict';
/* Real, cumulative world + real renderer culling/packing FUNCTIONS run under
 * fake rendering backend. Absolutely NO measured WebGL draw calls/GPU/FPS here.
 */
const fs=require('fs'),path=require('path');
const {g,H,ctx}=require('./stage05_bootstrap.cjs');
const perf=require('perf_hooks').performance;
const out=path.join(__dirname,'STAGE23_GEOMETRY_CPU_PROFILE.json');
const checks=[];
function check(id,pass,detail){checks.push({id,pass:!!pass,detail});if(!pass)console.error('FAILED',id,detail);}
function count(array,selector){const m={};for(const row of array){const k=String(selector(row));m[k]=(m[k]||0)+1;}
 return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([key,value])=>({key,count:value}));}
function stat(vals){const s=vals.slice().sort((a,b)=>a-b),get=p=>s[Math.max(0,Math.ceil(s.length*p)-1)];
 return {runs:s.length,medianMs:+get(.5).toFixed(3),p95Ms:+get(.95).toFixed(3),maxMs:+s[s.length-1].toFixed(3)};}
const source=g.world.boxes, itemStrideBytes=80, C=ctx.__Stage23RealGLRenderer;
check('real_game_world_and_source_renderable',Array.isArray(source)&&source.length>194000);
check('real_production_renderer_prototype_exposed_in_QA',!!C?.prototype?.getVisibleStatic&&!!C?.prototype?.pack);
const p=Object.create(C.prototype);
p.qualityScale=1;p.glWidth=1920;p.glHeight=1080;p.cullSquared475=true;
p.detailEnabled475=false;p.groupFlags476={};p.instanceScratch=new Float32Array(0);
function scene(){return {source:null,cells:new Map,skyline:[],global:[],visible:[],cullX:NaN,cullZ:NaN};}
const cams=[
 {label:'spawn_district',cam:{...g.cam}},
 {label:'shift_200m_east',cam:{...g.cam,x:g.cam.x+200,tx:g.cam.tx+200}},
 {label:'shift_400m_north',cam:{...g.cam,z:g.cam.z-400,tz:g.cam.tz-400}},
 {label:'high_aerial_over_district',cam:{...g.cam,y:155,ty:0,x:g.cam.x+150,tx:g.cam.tx+150}},
 {label:'far_district_west',cam:{...g.cam,x:g.cam.x-390,tx:g.cam.tx-390,z:g.cam.z+180,tz:g.cam.tz+180}}
];
const scenes=[];
for(const v of cams){
 const s=scene();let sample,initMs;const start=perf.now();sample=p.getVisibleStatic(source,v.cam,s);initMs=perf.now()-start;
 const cached=[];for(let i=0;i<12;i++){const t=perf.now();p.getVisibleStatic(source,v.cam,s);cached.push(perf.now()-t);}
 const movedRefreshes=[];
 for(const delta of [35,75,115]){
  const moved={...v.cam,x:v.cam.x+delta,tx:v.cam.tx+delta};
  const refreshStart=perf.now(),fresh=p.getVisibleStatic(source,moved,s);
  movedRefreshes.push({cameraShiftMeters:delta,elapsedMs:+(perf.now()-refreshStart).toFixed(3),
   visibleStaticCandidates:fresh.length});
 }
 const shape=count(sample,o=>o.shape||'cube'),layer=count(sample,o=>o.layer===undefined?'unspecified':o.layer);
 scenes.push({name:v.label,origin:[+v.cam.x.toFixed(2),+v.cam.y.toFixed(2),+v.cam.z.toFixed(2)],
  fullWorldSource:source.length,visibleStaticCandidates:sample.length,spatialCells:s.cells.size,
  globalCandidates:s.global.length,skylineCandidates:s.skyline.length,
  cullingInitMs:+initMs.toFixed(3),cullCacheCalls:stat(cached),movedRefreshes,
  possibleStaticInstancePayloadMiB:+(sample.length*itemStrideBytes/1048576).toFixed(2),
  shapesTop12:shape.slice(0,12),layers:layer});
 check('view_visible_candidates_nonempty_'+v.label,sample.length>0);
 check('view_candidates_lte_full_world_plus_tiles_'+v.label,sample.length<=source.length+12000);
 check('renderer_scene_reused_during_camera_moves_'+v.label,s.source===source&&s.cells.size>0);
}
// Measure real renderer packing of geometry; GPU bufferData not called.
const packing=[];
for(const n of [512,4096,16000]){
 const items=source.slice(0,n);const fresh=[],reused=[];
 for(let i=0;i<8;i++){
  let t=perf.now();const a=p.pack(items,false);fresh.push(perf.now()-t);
  t=perf.now();const b=p.pack(items,true);reused.push(perf.now()-t);
  if(i===0){check('pack_bytes_'+n,a.byteLength===n*80&&b.byteLength===a.byteLength);
   let identical=true;for(let k=0;k<a.length;k++){if(!Object.is(a[k],b[k])){identical=false;break;}}
   check('pack_optin_reuse_numeric_equality_'+n,identical);}
 }
 packing.push({items:n,instanceBytes:n*80,allocateEveryTime:stat(fresh),scratchReuse:stat(reused)});
}
const dynamic=g.buildDynamic();
check('dynamic_geometry_real_game',Array.isArray(dynamic)&&dynamic.length>=200);
const runtimeMem=process.memoryUsage();
const report={stage:23,generatedAt:new Date().toISOString(),
 environment:'Actual cumulative SUNSET STATE world + real GLRenderer CPU culling & packing + FAKE GL',
 measurements:{actualWebGLDrawCalls:null,gpuRenderTimeMs:null,gpuResidentMemoryBytes:null,realFps:null,
  hardware1080p50FpsVerified:false,footprintIsEstimateNotMeasuredVRAM:true},
 world:{staticSourceObjects:source.length,dynamicSourceObjectsSnapshot:dynamic.length,
  pedestrianCount:g.pedestrians.length,roadCount:g.world.roads461.length,
  activePortalCount:g.world.entrancePortals.filter(x=>x.active!==false&&!x.disabled).length,
  geometryByLayer:count(source,o=>o.layer===undefined?'unspecified':o.layer),
  geometryByShapeTop25:count(source,o=>o.shape||'cube').slice(0,25),
  geometryByMaterialTop25:count(source,o=>o.material||'none').slice(0,25),
  staticInstancePayloadIfAllUploadedMiB:+(source.length*itemStrideBytes/1048576).toFixed(2),
  dynamicInstancePayloadSnapshotKiB:+(dynamic.length*itemStrideBytes/1024).toFixed(2),
  instanceBytesPerObject:itemStrideBytes},
 viewCulling:scenes,packingBenchmarks:packing,
 processMemoryMiB:{heapUsed:+(runtimeMem.heapUsed/1048576).toFixed(1),
  heapTotal:+(runtimeMem.heapTotal/1048576).toFixed(1),rss:+(runtimeMem.rss/1048576).toFixed(1)},
 caveats:['The static instance payload is a theoretical array size, NOT measured VRAM or GPU uploads',
  'Visible candidates use real renderer culling but do not imply drawn triangles or GL calls',
  'Shape grouping is instanced, and draw calls depend on actual GL pass execution',
  'CPU timing from this machine cannot establish 1920x1080 >=50FPS performance'],
 checks,passed:checks.filter(x=>x.pass).length,total:checks.length};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,
 static:source.length,dynamic:dynamic.length,views:scenes.map(v=>({name:v.name,visible:v.visibleStaticCandidates,
  payloadMiB:v.possibleStaticInstancePayloadMiB,cullMs:v.cullingInitMs})),
 memory:report.processMemoryMiB,packing},null,2));
if(report.passed!==report.total)process.exitCode=1;
