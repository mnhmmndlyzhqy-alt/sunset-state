'use strict';
/* Stage 36 isolated opt-in real frame profiler tests. Synthetic frames are NOT
 * hardware FPS measurements and results never certify the actual game. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/stage36_performance_audit.js'),'utf8');
const checks=[];function ok(name,pass,note=''){checks.push({name,pass:!!pass,note});if(!pass)console.error('FAILED',name,note);}
function load(search='',flag=false){let t=0;const g={console,URLSearchParams,Math,Date,performance:{now:()=>t},location:{search},__SUNSET_STAGE36_QA:flag};g.globalThis=g;g.window=g;vm.createContext(g);new vm.Script(code,{filename:'stage36_performance_audit.js'}).runInContext(g);return {g,get t(){return t},set t(n){t=n},H:g.Heatline};}
const off=load(),H0=off.H.stage36PerformanceAudit;
ok('module_present_without_flag',!!H0);
ok('default_is_disabled',H0.enabled()===false);
class BareGame{tick() {}}
const before=BareGame.prototype.tick;
ok('default_install_returns_false',H0.install(BareGame)===false);
ok('default_does_not_patch_tick',BareGame.prototype.tick===before);
ok('six_explicit_scenes',H0.scenes.length===6);
ok('percentile_p95',H0.percentile([10,20,30,40,50,60,70,80,90,100],.95)===100);
ok('metrics_does_not_guess_missing',H0.metrics([]).mean===null&&H0.metrics([]).p95===null);
ok('software_gpu_detected',H0.classifyGpu('Google SwiftShader (Vulkan)')==='software');
ok('hardware_gpu_detected',H0.classifyGpu('NVIDIA GeForce RTX FAKE')==='hardware-reported');
ok('unknown_gpu_not_accepted',H0.classifyGpu(null)==='unidentified');
const mockResult=H0.packSummary(Array.from({length:1200},()=>({active:true,drawn:true,deltaMs:16.67,
 native1080:true,sceneValid:true,cpuTickMs:7,cpuUpdateMs:2,cpuDrawMs:4,glDrawCalls:11,bufferUploadBytes:4096})),
 {scene:H0.scenes[0],confirmed:true,elapsedMs:20000,gpuInfo:{hardwareGpuVerified:true},gpuTimingsMs:[6],
  heapSamples:[123456789],observedStart:{player:{x:12,z:31}},observedEnd:{player:{x:20,z:31}}});
ok('synthetic_summary_expected_pacing',mockResult.averageFps===60&&mockResult.frameIntervalMs.p95>16);
ok('synthetic_summary_qualifies_only_under_all_conditions',mockResult.native1080Average50FpsVerified===true);
ok('synthetic_summary_clearly_labels_manual_scene',mockResult.locationAutomaticallyVerified===false&&mockResult.manualSceneConfirmation===true);
const lowRes=H0.packSummary([{active:true,drawn:true,deltaMs:20,native1080:false,sceneValid:false}],
 {scene:H0.scenes[0],confirmed:true,elapsedMs:20000,gpuInfo:{hardwareGpuVerified:true},gpuTimingsMs:[]});
ok('false_fullhd_never_certified',lowRes.native1080Average50FpsVerified===false);
ok('invalid_game_mode_not_certified',lowRes.limitations.some(x=>x.includes('mode')));
const missingGpu=H0.packSummary(Array.from({length:1200},()=>({active:true,drawn:true,deltaMs:16.67,native1080:true,sceneValid:true})),
 {scene:H0.scenes[0],confirmed:true,elapsedMs:20000,gpuInfo:{hardwareGpuVerified:false},gpuTimingsMs:[]});
ok('missing_hardware_identity_not_certified',!missingGpu.native1080Average50FpsVerified);
const l=load('?stage36qa=1');const H=l.H.stage36PerformanceAudit;
let drawCalls=0,deleteQueries=0;
const gl={VERSION:1,RENDERER:2,drawingBufferWidth:1920,drawingBufferHeight:1080,
 TRIANGLES:4,ARRAY_BUFFER:34962,
 getParameter:k=>k===1?'WebGL 2.0 Mock':k===2?'Unmasked Mock':'',
 getExtension:k=>k==='WEBGL_debug_renderer_info'?{UNMASKED_RENDERER_WEBGL:2}:null,
 drawArrays(){drawCalls++;},bufferData(){},bufferSubData(){},drawElements(){},
 drawArraysInstanced(){},drawElementsInstanced(){},deleteQuery(){deleteQueries++;}};
const originalGlDraw=gl.drawArrays;
class FakeGame{constructor(){this.renderer={canvas:{width:1920,height:1080},gl,renderNative475:true,draw(){gl.drawArrays(gl.TRIANGLES,0,6);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(32),0);}};
 this.cam={x:20,y:3,z:40};this.avatar={x:23,z:44};this.activeFrames=0;this.inside=false;this.inVehicle=false;
 this.paused=false;this.over=false;this.garageOpen=false;this.missionBoardOpen=false;this.showFullMap=false;
 this.visualMode450='native1080';this.lastPaint=0;this.weather={visual:{rain:0,cloud:0}};}
 update() { l.t+=.3; }
 tick(time){this.update();this.renderer.draw();this.lastPaint=time;this.activeFrames++;}}
const oldTick=FakeGame.prototype.tick;
ok('optin_installs_once',H.install(FakeGame)===true&&H.install(FakeGame)===false);
ok('optin_wraps_real_game_tick',FakeGame.prototype.tick!==oldTick);
const game=new FakeGame(),oldUpdate=game.update,oldDraw=game.renderer.draw;
ok('begin_requires_manual_confirmation',H.begin(game,'downtown_walk',false).ok===false);
ok('begin_refuses_invalid_scene',H.begin(game,'not-a-scene',true).ok===false);
const start=H.begin(game,'downtown_walk',true,{warmupMs:0,captureMs:150});
ok('begin_capture_accepts_valid_scene',start.ok===true);
for(let i=1;i<=12;i++){l.t=16.67*i;game.tick(l.t);}
const rec=H.records[0]||H.finish('unit-test');
ok('capture_generates_record',rec&&rec.activeDrawnFrames>0);
ok('capture_counts_real_wrapped_webgl_calls',rec?.webglDrawCallsPerFrame?.p95>=1);
ok('capture_counts_real_buffer_upload_bytes',rec?.webglBufferUploadsBytesPerFrame?.p95>=32);
ok('capture_includes_player_and_camera_positions',rec?.observedStart?.player?.x===23&&rec?.observedEnd?.camera?.z===40);
ok('capture_does_not_certify_fake_gpu',rec?.native1080Average50FpsVerified===false);
ok('capture_recovers_original_update',game.update===oldUpdate);
ok('capture_recovers_original_draw',game.renderer.draw===oldDraw);
ok('capture_recovers_original_gl',gl.drawArrays===originalGlDraw);
ok('capture_stops_without_residual_state',H.run===null);
ok('csv_has_scene_and_frame_columns',H.csv().includes('sceneId')&&H.csv().includes('downtown_walk'));
ok('export_report_only_records_not_telemetry',H.report().captures.length===1);
ok('game_update_still_runs',drawCalls>=10);
const out={stage:36,kind:'synthetic unit tests; NOT real GPU',checks,passed:checks.filter(x=>x.pass).length,total:checks.length};
fs.writeFileSync(path.join(__dirname,'STAGE36_PROFILER_ACCEPTANCE_RESULT.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.passed,total:out.total,drawCalls,failed:checks.filter(x=>!x.pass)},null,2));
if(out.passed!==out.total)process.exitCode=1;
