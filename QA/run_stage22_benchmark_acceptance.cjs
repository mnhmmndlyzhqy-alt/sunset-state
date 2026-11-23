'use strict';
/* Stage22 deterministic acceptance: tests the REAL opt-in module, not a second implementation.
   Fake WebGL adapter and frame timestamps are TEST FIXTURES, never GPU performance evidence. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/stage22_native1080_benchmark.js'),'utf8');
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine44.js'),'utf8');
const results=[];
function verify(id,condition,details=null){results.push({id,passed:!!condition,details});if(!condition)console.error('FAIL',id,details);}
function context(search){let time=0;const ctx={Heatline:{},console,URLSearchParams,location:{search},
 performance:{now(){return time}},Math,Date,Array,Map,Set,Number,String,Boolean,Object,JSON,
 document:{hidden:false,readyState:'loading',addEventListener(){}},
 window:null,innerWidth:1920,innerHeight:1080,navigator:{userAgent:'QA-FAKE-GPU'},
 setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}};
 ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);new vm.Script(code,{filename:'stage22_native1080_benchmark.js'}).runInContext(ctx);
 return {ctx,H:ctx.Heatline,advance(t){time=t},time(){return time}};}
const scripts=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
verify('new_module_loaded_immediately_before_game_engine',
 scripts.indexOf('assets/stage22_native1080_benchmark.js')===scripts.indexOf('engine44.js')-1);
verify('module_inserted_after_stage21_collision_guard',
 scripts.indexOf('assets/stage21_high_speed_ccd.js')+1===scripts.indexOf('assets/stage22_native1080_benchmark.js'));
verify('actual_engine_installs_benchmark_after_navigation',
 engine.indexOf('installStage20PedestrianNavigation(Game)')<engine.indexOf('installStage22NativeBenchmark(Game)')&&
 engine.indexOf('installStage22NativeBenchmark(Game)')<engine.indexOf('new Game()'));
verify('all_external_game_scripts_exist',scripts.every(x=>fs.existsSync(path.join(root,x))),{scripts:scripts.length});
verify('no_native_resolution_reduction_added',!code.includes('setQuality(')&&!code.includes('qualityScale=')&&!code.includes('visualMode450='));
verify('no_persistent_save_mutations_added',!code.includes('localStorage')&&!code.includes('sessionStorage'));
const inactive=context('');class Baseline{tick(){return 42;}}const original=Baseline.prototype.tick;
verify('not_loaded_in_normal_play',!inactive.H.stage22Benchmark.enabled()&&inactive.H.stage22Benchmark.install(Baseline)===false);
verify('normal_game_tick_unchanged_by_stage22',Baseline.prototype.tick===original);
const turnedOff=context('?stage22qa=1&stage22BenchOff=1');
verify('explicit_ab_off_restores_original_game_loop',turnedOff.H.stage22Benchmark.install(Baseline)===false&&Baseline.prototype.tick===original);
const v=context('?stage22qa=1');const api=v.H.stage22Benchmark;
verify('qa_mode_enables_opt_in',api.enabled()===true);
verify('software_swiftshader_rejected',api.classifyAdapter('ANGLE (Google, Vulkan SwiftShader)')==='software');
verify('software_llvmpipe_rejected',api.classifyAdapter('Mesa llvmpipe (LLVM 20)')==='software');
verify('physical_nvidia_recognized',api.classifyAdapter('ANGLE (NVIDIA GeForce RTX 3060)')==='hardware-reported');
verify('physical_amd_recognized',api.classifyAdapter('AMD Radeon 7900 XTX')==='hardware-reported');
verify('physical_intel_recognized',api.classifyAdapter('Intel(R) Arc(TM) Graphics')==='hardware-reported');
verify('unreported_adapter_not_assumed_hardware',api.classifyAdapter('ANGLE Generic')==='unidentified');
function makeGL(name='NVIDIA GeForce RTX 3060'){
 return {VERSION:1,VENDOR:2,RENDERER:3,drawingBufferWidth:1920,drawingBufferHeight:1080,
 getExtension(n){return n==='WEBGL_debug_renderer_info'?{UNMASKED_RENDERER_WEBGL:4}:null;},
 getParameter(n){return n===1?'WebGL 2.0 Chromium':n===2?'WebGL test vendor':n===3?'WebGL renderer':name;}};
}
const game={renderer:{gl:makeGL(),canvas:{width:1920,height:1080},name:'WebGL2 instancing / GLSL',renderNative475:true},
 visualMode450:'native1080',running:true,paused:false,over:false,inside:false,inVehicle:false};
const gpu=api.gpuInfo(game);
verify('physical_adapter_reported_from_webgl2',gpu.webgl2&&gpu.classification==='hardware-reported');
verify('hardware_native_framebuffer_exact',api.frameNative(game,gpu));
game.renderer.gl.drawingBufferWidth=1919;
verify('canvas_gl_buffer_mismatch_fails_native',!api.frameNative(game,api.gpuInfo(game)));
game.renderer.gl.drawingBufferWidth=1920;
game.renderer.canvas.width=1280;
verify('css_upscale_never_counts_as_1080p',!api.frameNative(game,gpu));
game.renderer.canvas.width=1920;
game.visualMode450='adaptive50';
verify('adaptive_mode_never_counts_as_native',!api.frameNative(game,gpu));
game.visualMode450='native1080';
const software=api.gpuInfo({...game,renderer:{...game.renderer,gl:makeGL('Google SwiftShader')}});
verify('software_adapter_identified',software.classification==='software');
verify('canvas_fallback_refused',!api.gpuInfo({...game,renderer:{canvas:{width:1920,height:1080}}}).webgl2);
verify('interior_scene_requires_real_interior',api.sceneValid(api.scenes[4],{inside:true,inVehicle:false})&&
 !api.sceneValid(api.scenes[4],game));
verify('driving_scene_requires_vehicle',!api.sceneValid(api.scenes[1],game)&&api.sceneValid(api.scenes[1],{inside:false,inVehicle:true}));
const rows=Array.from({length:1200},()=>({dt:16.66,cpuMs:4.1,painted:true,active:true,sceneValid:true,native:true}));
const settings={elapsedMs:20000,gpu,scene:api.scenes[0],manualConfirmed:true,
 firstBuffer:{canvas:[1920,1080]},lastBuffer:{canvas:[1920,1080]}};
const baselineResult=api.summarize(rows,settings);
verify('genuine_hardware_fixture_60fps_can_pass',baselineResult.allConditionsPassed&&baselineResult.averageFps===60);
verify('fake_gpu_timing_never_claimed',baselineResult.gpuExecutionTimeMs===null&&baselineResult.sceneLocationVerifiedAutomatically===false);
verify('p95_uses_intervals_not_cpu_cost',baselineResult.p95FrameMs===16.66&&baselineResult.cpuTickP95Ms===4.1);
verify('software_never_passes_despite_60fps',!api.summarize(rows,{...settings,gpu:software}).allConditionsPassed);
verify('unverified_gpu_never_passes_despite_60fps',!api.summarize(rows,{...settings,gpu:{webgl2:true,classification:'unidentified'}}).allConditionsPassed);
verify('hidden_or_paused_frame_rejects_run',!api.summarize([...rows.slice(0,-1),{...rows[0],active:false}],settings).allConditionsPassed);
verify('non_native_single_frame_rejects_run',!api.summarize([...rows.slice(0,-1),{...rows[0],native:false}],settings).allConditionsPassed);
verify('missing_scene_confirmation_rejects_run',!api.summarize(rows,{...settings,manualConfirmed:false}).allConditionsPassed);
verify('short_run_rejected',!api.summarize(rows,{...settings,elapsedMs:18000}).allConditionsPassed);
verify('low_fps_rejected',!api.summarize(rows.slice(0,850),settings).allConditionsPassed);
verify('p95_frame_above_20ms_rejected',!api.summarize(rows.map((x,i)=>i<150?{...x,dt:22}:x),settings).allConditionsPassed);
verify('empty_run_rejected',!api.summarize([],settings).allConditionsPassed);
verify('pixel_buffer_requirements_explicit',api.target.width===1920&&api.target.height===1080&&api.target.minimumAverageFps===50);
verify('six_required_scenes',api.scenes.length===6&&new Set(api.scenes.map(x=>x.id)).size===6);
class MockGame{constructor(){Object.assign(this,game);this.lastPaint=0;this.drawCount=0;}
 tick(t){this.lastPaint=t;this.drawCount++;return 42;}}
const originalTick=MockGame.prototype.tick;
verify('opt_in_installs_real_frame_hook',api.install(MockGame)===true&&MockGame.prototype.tick!==originalTick);
verify('install_is_idempotent',api.install(MockGame)===false);
const mock=new MockGame();v.advance(10);verify('wrapped_tick_preserves_original_return',mock.tick(10)===42&&mock.drawCount===1);
verify('cannot_start_wrong_driving_scene',!api.begin('downtown_drive',true));
verify('cannot_start_unconfirmed_scene',!api.begin('downtown_walk',false));
verify('can_start_real_game_foot_scene',api.begin('downtown_walk',true));
for(let i=1;i<=1450;i++){const t=10+i*16.667;v.advance(t);mock.tick(t);if(!api.recording)break;}
verify('records_only_after_warmup_and_capture',api.records.length===1,{recorded:api.records.length});
verify('observed_loop_average_fps_correct',api.records[0]?.averageFps>=59&&api.records[0]?.averageFps<=61,
 {fps:api.records[0]?.averageFps});
verify('mock_frame_cadence_proof_requires_true_painted_frame',api.records[0]?.activePaintedFrames>1000);
verify('live_capture_has_native_and_adapter_proof',api.records[0]?.allConditionsPassed===true);
verify('capture_never_mutates_game_profile_or_vehicle',mock.visualMode450==='native1080'&&!mock.inVehicle);
const report=api.exportReport();
verify('report_records_real_frame_provenance',report.results.length===1&&report.results[0].source.includes('Game.tick'));
verify('report_not_complete_until_six_scenes_pass',report.allSixScenesCaptured===false&&report.allSixScenesPassed===false);
const record={stage:22,kind:'deterministic-unit-acceptance-with-fixture-GPU',gpuHardwareBenchmarked:false,
 createdAt:new Date().toISOString(),passed:results.filter(x=>x.passed).length,total:results.length,
 allPassed:results.every(x=>x.passed),results};
fs.writeFileSync(path.join(__dirname,'STAGE22_BENCHMARK_UNIT_ACCEPTANCE.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({passed:record.passed,total:record.total,allPassed:record.allPassed,failures:results.filter(x=>!x.passed).map(x=>x.id)},null,2));
if(!record.allPassed)process.exitCode=1;
