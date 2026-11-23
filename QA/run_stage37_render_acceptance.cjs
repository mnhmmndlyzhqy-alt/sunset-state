'use strict';
/* Stage37: genuine Stage36 world + genuine GLRenderer culler and draw path.
 * CPU and simulated WebGL2 only; never labels simulated calls as a GPU benchmark. */
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..'),{ctx,H,g}=require('./stage05_bootstrap.cjs');
const GL=ctx.__Stage23RealGLRenderer,mod=H.stage37RenderOptimizer;
const tests=[];function check(name,result,details){let pass=!!result;tests.push({name,pass,details});if(!pass)console.error('FAIL',name,details||'');}
const source=g.world.boxes,step=14,sample=source.filter((o,i)=>i%step===0);
function scene(){return {source:null,cells:new Map(),global:[],skyline:[],visible:[],glazing:[],cullX:NaN,cullZ:NaN};}
function renderer(){const r=Object.create(GL.prototype);Object.assign(r,{qualityScale:1,glWidth:1920,glHeight:1080,
  cullSquared475:true,detailEnabled475:false,groupFlags476:{},instanceScratch:new Float32Array(0)});return r;}
const rend=renderer(),p=g.cam;
function camera(x,y,z){return {...p,x,y,z,tx:x+(p.tx-p.x),ty:p.ty,tz:z+(p.tz-p.z)};}
const cameras=[['spawn',camera(p.x,p.y,p.z)],['east',camera(p.x+200,p.y,p.z)],
 ['north',camera(p.x,p.y,p.z-400)],['aerial',camera(p.x+150,150,p.z)],
 ['west',camera(p.x-390,p.y,p.z+180)],['retail',camera(p.x+90,p.y,p.z+115)]];
function pct(vals,q){const s=vals.slice().sort((a,b)=>a-b);return +(s[Math.ceil(s.length*q)-1]||0).toFixed(3);}
check('module_loaded_before_engine',!!mod&&typeof mod.grid==='function');
check('baseline_source_over_190k',source.length>190000,source.length);
check('world_roads_preserved',g.world.roads461.length===52);
check('world_shops_preserved',g.world.retailShops.length===59);
check('world_portals_preserved',g.world.entrancePortals.length>=214);
check('stage36_monitor_preserved',!!H.stage36PerformanceAudit);
check('stage34_material_polish_preserved',!!H.stage34RenderSoundPolish);
check('default_enabled',mod.enabled()===true);
check('renderer_uses_stage37_index',GL.prototype.getVisibleStatic.toString().includes('indexedRows37'));
check('renderer_uses_stage37_static_upload',GL.prototype.draw.toString().includes('uploadStatic'));
const sampleResults=[];
for(const [name,cam] of cameras){
 const oldS=scene(),newS=scene();ctx.__SUNSET_STAGE37_RENDER_OFF=true;
 const startA=performance.now(),old=rend.getVisibleStatic(sample,cam,oldS),oldMs=performance.now()-startA;
 ctx.__SUNSET_STAGE37_RENDER_OFF=false;
 const startB=performance.now(),updated=rend.getVisibleStatic(sample,cam,newS),newMs=performance.now()-startB;
 check('visibility_reference_parity_'+name,old.length===updated.length&&old.every((o,i)=>o===updated[i]),{old:old.length,new:updated.length});
 check('canonical_cells_unchanged_'+name,oldS.cells.size===newS.cells.size,oldS.cells.size);
 // Same-world source, another camera point, and original traversal order.
 const moved={...cam,x:cam.x+65,tx:cam.tx+65};
 ctx.__SUNSET_STAGE37_RENDER_OFF=true;
 const oldMoved=rend.getVisibleStatic(sample,moved,oldS);
 ctx.__SUNSET_STAGE37_RENDER_OFF=false;
 const newMoved=rend.getVisibleStatic(sample,moved,newS);
 check('movement_reference_parity_'+name,oldMoved.length===newMoved.length&&oldMoved.every((o,i)=>o===newMoved[i]));
 check('index_has_numeric_rows_'+name,mod.grid(newS)?.size>0);
 sampleResults.push({scene:name,sourceObjects:sample.length,visible:old.length,oldInitMs:+oldMs.toFixed(3),newInitMs:+newMs.toFixed(3),oldMoved:oldMoved.length,newMoved:newMoved.length});
}
// Bounded microbenchmark: use several representative moves in the exact same
// 14k-world sample, compare arrays on every cull and report medians (not FPS).
const benchCamera=camera(p.x+300,p.y,p.z+85);const scenes=[scene(),scene()];const traces=[[],[]];
for(let iteration=0;iteration<16;iteration++){
 const pos={...benchCamera,x:benchCamera.x+iteration*36,tx:benchCamera.tx+iteration*36,
  z:benchCamera.z+Math.sin(iteration*.42)*20,tz:benchCamera.tz+Math.sin(iteration*.42)*20};
 const out=[];
 for(let j=0;j<2;j++){
  ctx.__SUNSET_STAGE37_RENDER_OFF=(j===0);
  const start=performance.now();out[j]=rend.getVisibleStatic(sample,pos,scenes[j]);traces[j].push(performance.now()-start);
 }
 check('repeat_frame_exact_visibility_'+iteration,out[0].length===out[1].length&&out[0].every((o,i)=>o===out[1][i]));
}
ctx.__SUNSET_STAGE37_RENDER_OFF=false;
check('index_cache_used',mod.stats.gridReuses>10,mod.stats.gridReuses);
check('disabled_lookup_returns_null',(()=>{ctx.__SUNSET_STAGE37_RENDER_OFF=true;
 let v=mod.grid(scenes[1]);ctx.__SUNSET_STAGE37_RENDER_OFF=false;return v===null;})());
// GPU-upload emulator. All WebGLBuffer payload bytes are compared exactly; this
// emulates API data transfer but does NOT represent driver stalls or GPU FPS.
class FakeGL{
 constructor(){this.ARRAY_BUFFER=34962;this.STATIC_DRAW=35044;this.DYNAMIC_DRAW=35048;this.bound=null;
  this.dataCalls=0;this.subCalls=0;this.drawCalls=[];}
 createBuffer(){return {data:new Uint8Array(0)};}
 bindBuffer(target,b){this.bound=b;}
 bufferData(target,data,usage){this.dataCalls++;
  const b=this.bound;if(typeof data==='number')b.data=new Uint8Array(data);
  else b.data=new Uint8Array(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));}
 bufferSubData(target,offset,data){this.subCalls++;
  const v=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  if(offset+v.byteLength>this.bound.data.length)throw Error('out-of-range WebGL upload');
  this.bound.data.set(v,offset);
 }
 drawElementsInstanced(mode,count,type,offset,instances){this.drawCalls.push({count,instances});}
}
const fake=new FakeGL(),buffer=fake.createBuffer();
let allocations=0,subUploads=0;
for(const count of [10,11,9,120,90,10,0,10,120,210]){
 const values=new Float32Array(count*20);
 for(let i=0;i<values.length;i++)values[i]=((i*33+count)%1731)/97;
 fake.bindBuffer(fake.ARRAY_BUFFER,buffer);
 const result=mod.uploadStatic(fake,buffer,values,fake.STATIC_DRAW);
 allocations+=result==='allocate'||result==='grow';subUploads+=result==='subdata'||result==='grow';
 const expected=Buffer.from(values.buffer,values.byteOffset,values.byteLength);
 const actual=Buffer.from(buffer.data.buffer,0,expected.length);
 check('upload_bytes_exact_'+count+'_'+tests.length,actual.equals(expected),result);
}
check('buffer_subdata_used',fake.subCalls>0,fake.subCalls);
check('capacity_reuse_observed',subUploads>=3,subUploads);
check('buffer_grew_as_needed',allocations>=2,allocations);
ctx.__SUNSET_STAGE37_RENDER_OFF=true;
const disabledPayload=new Float32Array(77);disabledPayload.fill(1.2345);
fake.bindBuffer(fake.ARRAY_BUFFER,buffer);const baseline=mod.uploadStatic(fake,buffer,disabledPayload,fake.STATIC_DRAW);
check('off_uses_original_bufferdata',baseline==='legacy');
ctx.__SUNSET_STAGE37_RENDER_OFF=false;
const newPayload=new Float32Array(67);newPayload.fill(2.5);
fake.bindBuffer(fake.ARRAY_BUFFER,buffer);mod.uploadStatic(fake,buffer,newPayload,fake.STATIC_DRAW);
check('toggle_recovers_true_gpu_buffer_size',Buffer.from(buffer.data.buffer,0,newPayload.byteLength).equals(Buffer.from(newPayload.buffer)));
// Real GLRenderer.draw with a no-op context checks that no empty draw commands
// are sent on the optimized path while the legacy path still sends its zero-instance commands.
function drawProxy(){
 const raw=new FakeGL();const gl=new Proxy(raw,{get(target,key){
  if(key in target){const x=target[key];return typeof x==='function'?x.bind(target):x;}
  if(typeof key==='string' && /^[A-Z][A-Z0-9_]*$/.test(key))return 1;
  return ()=>{};
 }});return {raw,gl};
}
function staticScene(gl){return {source:null,cells:new Map(),global:[],skyline:[],visible:[],glazing:[],
 cullX:NaN,cullZ:NaN,cubes:gl.createBuffer(),wedges:gl.createBuffer(),sea:gl.createBuffer(),
 extra:new Map(),cubeCount:0,wedgeCount:0,seaCount:0,uploaded:null};}
function realDrawOff(whenDisabled){
 ctx.__SUNSET_STAGE37_RENDER_OFF=whenDisabled;
 const {gl,raw}=drawProxy(),r=renderer();
 Object.assign(r,{gl,canvas:{width:1920,height:1080},glWidth:1920,glHeight:1080,displayRatio463:1,
  qualityScale:.7,shadowReady:false,shadowFrameIndex:0,renderPolicy475:'adaptive50',modelRanges:new Map(),
  modelBuffers:new Map(),worldQuality:null,materialTextures:[],composite:null,lightData:new Float32Array(48),
  lightColors:new Float32Array(36),lightCones:new Float32Array(48),vao:{},dynamicBuffer:gl.createBuffer(),
  wedgeBuffer:gl.createBuffer(),wheelBuffer:gl.createBuffer(),reuseStaticPacking475:true});
 r.outdoorStatic=staticScene(gl);r.indoorStatic=staticScene(gl);r.activeStaticScene=r.outdoorStatic;
 const cam=camera(p.x,p.y,p.z);r.draw([],[],cam,0,[],[],[],12,
  {cloud:0,rain:0,wind:0,flash:0},true);
 return raw.drawCalls;
}
try{
 const newCalls=realDrawOff(false),legacyCalls=realDrawOff(true);
 check('optimized_empty_frame_no_gl_draws',newCalls.every(x=>x.instances!==0),newCalls);
 check('fallback_keeps_legacy_zero_draw_calls',legacyCalls.filter(x=>x.instances===0).length>=2,legacyCalls);
 check('same_nonzero_draw_geometry',newCalls.filter(x=>x.instances>0).length===legacyCalls.filter(x=>x.instances>0).length);
}catch(e){check('real_renderer_draw_mock',false,e.stack||String(e));}
ctx.__SUNSET_STAGE37_RENDER_OFF=false;
const output={stage:37,checks:tests,passed:tests.filter(x=>x.pass).length,total:tests.length,
  environment:'real cumulative game with actual GLRenderer methods; fake CPU/GL emulator; no GPU',
  baselineStage:36,sampledStatic:sample.length,worldStatic:source.length,
  cameraScenarios:sampleResults,orderedRefParity:true,
  boundedRefreshMs:{legacy:{p50:pct(traces[0].slice(1),.5),p95:pct(traces[0].slice(1),.95)},
      optimized:{p50:pct(traces[1].slice(1),.5),p95:pct(traces[1].slice(1),.95)}},
  glUploadEmulator:{dataCalls:fake.dataCalls,subDataCalls:fake.subCalls,exactPayloadChecks:true},
  runtimeCounters:mod.stats,hardwareGpuMeasured:false,realFpsMeasured:false};
fs.writeFileSync(path.join(__dirname,'STAGE37_RENDER_ACCEPTANCE_RESULT.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({passed:output.passed,total:output.total,world:source.length,sampled:sample.length,
  boundedRefreshMs:output.boundedRefreshMs,cameraScenarios:sampleResults,
  glUpload:output.glUploadEmulator,failed:tests.filter(t=>!t.pass)},null,2));
if(output.passed!==output.total)process.exitCode=1;
