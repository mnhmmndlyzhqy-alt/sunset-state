'use strict';
/* Deterministic tests of actual Stage23 optional module. All WebGL calls FAKE fixtures.
 * They never certify GPU/FPS or measure draw calls of the actual game renderer. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),checks=[];
const src=fs.readFileSync(path.join(root,'assets/stage23_geometry_draw_profiler.js'),'utf8');
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine44.js'),'utf8');
function check(id,okay,details){checks.push({id,pass:!!okay,details});if(!okay)console.error('FAIL',id,details);}
function makeContext(search){let clock=1;const context={Heatline:{},URLSearchParams,Math,Date,JSON,
 location:{search},console,performance:{now:()=>clock},
 document:{readyState:'loading',addEventListener(){}},window:null};
 context.globalThis=context;context.window=context;
 vm.createContext(context);new vm.Script(src,{filename:'stage23_geometry_draw_profiler.js'}).runInContext(context);
 return {context,H:context.Heatline,setTime(n){clock=n}};
}
const scripts=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
check('stage23_loaded_before_engine',scripts.indexOf('assets/stage23_geometry_draw_profiler.js')>0&&scripts.indexOf('assets/stage23_geometry_draw_profiler.js')<scripts.indexOf('engine44.js'));
check('stage22_legacy_load_order_unchanged',scripts.indexOf('assets/stage22_native1080_benchmark.js')===scripts.indexOf('engine44.js')-1);
check('stage21_legacy_load_order_unchanged',scripts.indexOf('assets/stage21_high_speed_ccd.js')===scripts.indexOf('assets/stage22_native1080_benchmark.js')-1);
check('stage23_installed_after_previous_patches',engine.indexOf('installStage22NativeBenchmark(Game)')<engine.indexOf('installStage23DrawProfiler(Game)')&&engine.indexOf('installStage23DrawProfiler(Game)')<engine.indexOf('new Game()'));
check('all_real_scripts_exist',scripts.every(x=>fs.existsSync(path.join(root,x))),{length:scripts.length});
check('source_never_mutates_world_saves_or_gfx_resolution',!/localStorage|sessionStorage|\.setQuality\(|\.world\.boxes\.push\(|\.visualMode450\s*=/.test(src));
const normal=makeContext('');class Ordinary{tick(){return 9;}}const origTick=Ordinary.prototype.tick;
check('default_run_is_disabled',normal.H.stage23Profiler.enabled()===false);
check('default_game_tick_remains_same',normal.H.stage23Profiler.install(Ordinary)===false&&Ordinary.prototype.tick===origTick);
const blocked=makeContext('?stage23qa=1&stage23ProfilerOff=1');
check('ab_disable_flag_restores_baseline',blocked.H.stage23Profiler.enabled()===false&&blocked.H.stage23Profiler.install(Ordinary)===false);
const opted=makeContext('?stage23qa=1'),api=opted.H.stage23Profiler;
check('explicit_url_optin',api.enabled()===true);
check('percentile_empty_is_null',api.percentile([],.95)===null);
check('percentile_median',api.percentile([3,8,4,1],.5)===3);
check('percentile_high',api.percentile([3,8,4,1],.95)===8);
check('byteLength_typed_array',api.byteLength(new Float32Array(7))===28);
check('byteLength_array_buffer',api.byteLength(new ArrayBuffer(17))===17);
check('byteLength_gl_size_number',api.byteLength(8192)===8192);
check('byteLength_null',api.byteLength(null)===0);
check('byteLength_negative_size_rejected',api.byteLength(-5)===0);
function makeGL(){
 const raw={TRIANGLES:4,LINES:1,POINTS:0,FRAMEBUFFER:36160,returnLog:[],
 drawElementsInstanced(...a){this.returnLog.push(['dei',...a]);return 100;},
 drawArraysInstanced(...a){this.returnLog.push(['dai',...a]);return 101;},
 drawElements(...a){this.returnLog.push(['de',...a]);return 102;},
 drawArrays(...a){this.returnLog.push(['da',...a]);return 103;},
 bufferData(...a){this.returnLog.push(['bd',...a]);return 104;},
 bufferSubData(...a){this.returnLog.push(['bs',...a]);return 105;},
 bindFramebuffer(...a){this.returnLog.push(['bf',...a]);return 106;}};
 return raw;
}
const fake=makeGL(),originalMethods={};
for(const key of ['drawElementsInstanced','drawArraysInstanced','drawElements','drawArrays','bufferData','bufferSubData','bindFramebuffer'])originalMethods[key]=fake[key];
const counters={drawCalls:0,instancedDrawCalls:0,nonInstancedDrawCalls:0,offscreenDrawCalls:0,trianglesEstimated:0,instances:0,
 bufferUploads:0,uploadBytes:0,subDataCalls:0,subDataBytes:0};
let active=counters;const h=api.instrumentGL(fake,()=>active);
check('fixture_gl_hooks_supported',h.ok&&h.wrapped===7);
check('original_return_of_draw_preserved',fake.drawElementsInstanced(fake.TRIANGLES,36,5125,0,7)===100);
check('triangles_instancing_correct',counters.trianglesEstimated===84&&counters.instances===7);
check('one_instanced_draw_recorded',counters.drawCalls===1&&counters.instancedDrawCalls===1);
fake.drawArrays(fake.TRIANGLES,0,9);
check('drawarrays_triangle_count',counters.drawCalls===2&&counters.trianglesEstimated===87);
fake.drawElements(fake.TRIANGLES,6,5125,0);
check('drawElements_count',counters.drawCalls===3&&counters.trianglesEstimated===89);
fake.drawArraysInstanced(fake.TRIANGLES,0,6,4);
check('drawarrays_instanced_count',counters.drawCalls===4&&counters.instancedDrawCalls===2&&counters.trianglesEstimated===97);
fake.bindFramebuffer(fake.FRAMEBUFFER,{});fake.drawArrays(fake.TRIANGLES,0,3);fake.bindFramebuffer(fake.FRAMEBUFFER,null);
check('offscreen_pass_tracked_without_gl_getparam',counters.offscreenDrawCalls===1);
check('zero_vertex_draw_still_counted',counters.drawCalls===5);
fake.bufferData(34962,new Float32Array(15),35044);fake.bufferData(34962,512,35044);
check('buffer_upload_byte_count',counters.bufferUploads===2&&counters.uploadBytes===572);
fake.bufferSubData(34962,0,new Uint8Array(45));
check('buffer_subdata_count',counters.subDataBytes===45&&counters.subDataCalls===1);
const previously=counters.drawCalls;active=null;fake.drawArrays(fake.TRIANGLES,0,3);
check('outside_capture_gl_events_ignored',counters.drawCalls===previously);
h.restore();
check('webgl_original_methods_restored',Object.entries(originalMethods).every(([k,f])=>fake[k]===f));
check('original_gl_called_exactly',fake.returnLog.filter(x=>x[0]==='dei').length===1&&fake.returnLog.filter(x=>x[0]==='bf').length===2);
const noGpu=api.instrumentGL({},()=>counters);
check('no_real_gl_refused',noGpu.ok===false&&noGpu.reason.includes('WebGL2'));
const readonly=makeGL(),originalReadonlyDraw=readonly.drawElementsInstanced;Object.defineProperty(readonly,'drawArrays',{value:readonly.drawArrays,writable:false});
const failure=api.instrumentGL(readonly,()=>counters);
check('read_only_gl_method_fails_closed',failure.ok===false);
check('failed_partial_install_restored',readonly.drawElementsInstanced===originalReadonlyDraw);
const metrics=[{...counters,drawCalls:5,uploadBytes:100,cpuTickMs:1.3,staticVisible:400},
 {...counters,drawCalls:15,uploadBytes:900,cpuTickMs:2.4,staticVisible:2000}];
const res=api.summarize(metrics,12500,{scene:'traffic',instrumented:true});
check('summary_counts_drawcalls',res.drawCallsPerFrame.p95===15&&res.drawCallsPerFrame.p50===5);
check('summary_reports_upload_bytes',res.uploadBytesPerFrame.p95===900&&res.totals.uploadBytes===1000);
check('summary_reports_static_candidates',res.visibleStaticCandidatesPerFrame.max===2000);
check('summary_does_not_forge_gpu_metrics',res.gpuExecutionTimeMs===null&&res.gpuResidentMemoryBytes===null&&res.hardwareFps50Verified===false);
check('summary_includes_original_frame_samples',res.rawFrameSamples.length===2);
class FakeGame{constructor(){this.tickTimes=[];this.renderer={gl:makeGL(),canvas:{width:1920,height:1080},activeStaticScene:{source:new Array(50),visible:new Array(20)}};}
 tick(t){this.tickTimes.push(t);this.buildDynamic();this.renderer.gl.drawElementsInstanced(4,36,5125,0,2);return 99;}
 buildDynamic(){return [1,2,3];}}
const nativeTick=FakeGame.prototype.tick;
check('optin_installs_frame_hook',api.install(FakeGame)===true&&FakeGame.prototype.tick!==nativeTick);
check('double_install_is_noop',api.install(FakeGame)===false);
const game=new FakeGame(),originalGameDraw=game.renderer.gl.drawElementsInstanced;
check('new_tick_keeps_original_value',game.tick(5)===99&&game.tickTimes.length===1);
check('no_hook_until_user_presses_start',api.results.length===0&&!api.running);
check('capture_can_start_after_real_tick',api.start('center')===true);
check('capture_hook_does_not_change_game_logic',game.tick(7)===99&&game.tickTimes.length===2);
const finished=api.stop('unit-test');
check('capture_stops_and_restores_gl',!api.running&&game.renderer.gl.drawElementsInstanced!==undefined&&game.renderer.gl.drawElementsInstanced===originalGameDraw);
check('capture_keeps_game_dynamic_function',Object.prototype.hasOwnProperty.call(game,'buildDynamic')===false);
check('capture_reports_draw_and_world_candidates',finished.frames===1&&finished.drawCallsPerFrame.p95===1&&finished.dynamicItemsPerFrame.p95===3&&finished.visibleStaticCandidatesPerFrame.p95===20);
check('capture_denies_real_gpu_proof',finished.gpuExecutionTimeMs===null&&!finished.hardwareFps50Verified);
check('second_stop_is_safe',api.stop()===null);
const record={stage:23,kind:'unit with FAKE WebGL fixtures; NO hardware profiling',
 generatedAt:new Date().toISOString(),hardwareFps50Verified:false,passed:checks.filter(x=>x.pass).length,total:checks.length,
 failures:checks.filter(x=>!x.pass).map(x=>x.id),checks};
fs.writeFileSync(path.join(__dirname,'STAGE23_PROFILER_ACCEPTANCE.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({passed:record.passed,total:record.total,failures:record.failures},null,2));
if(record.passed!==record.total)process.exitCode=1;
