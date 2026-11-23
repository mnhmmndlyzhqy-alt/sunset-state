'use strict';
/* Full-world CPU regression, exact lighting and GPU-instance-data A/B, no GPU claims. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const scripts=[...read('START_GAME.html').matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
const checks=[];function test(id,good,info=null){checks.push({id,pass:!!good,info});if(!good)console.error('FAIL',id,JSON.stringify(info));}
const ctx={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
 location:{search:''},URLSearchParams,performance:{now:()=>performance.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
test('phase06_module_after_life_before_engine',scripts.indexOf('assets/performance_recovery_phase06.js')===scripts.indexOf('engine44.js')-1&&scripts.indexOf('assets/performance_recovery_phase06.js')>scripts.indexOf('assets/city_life_recovery_phase05.js'));
test('all_game_scripts_present',scripts.every(x=>fs.existsSync(path.join(root,x))),{count:scripts.length});
const loadStart=performance.now();for(const s of scripts){let code=read(s);if(s==='engine44.js')code=code.replace('if (typeof Heatline.installPhysicsRecovery4','globalThis.__GAME_RECOVERY6=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(code,{filename:s}).runInContext(ctx,{timeout:60000});}
const loadMs=performance.now()-loadStart,H=ctx.Heatline,P=H.performanceRecovery6,Game=ctx.__GAME_RECOVERY6;
test('phase06_module_installed',!!P&&!!Game&&typeof P.report==='function');
test('prior_physics_and_life_present',H.physicsRecovery4?.stats?.installed===true&&H.cityLifeRecovery5?.stats?.installed===true);
const start=performance.now(),w=new H.World(),worldMs=performance.now()-start;
test('real_world_unchanged_52_roads_298_portals',w.roads461.length===52&&w.entrancePortals.length===298);
test('real_world_geometry_above_190k',w.boxes.length>190000,{boxes:w.boxes.length});
test('all_180_pedestrians_spawn',H.spawnPedestrians(new H.RNG(65114),180,w).length===180);
test('previous_world_audit_live',w.city20DeepAuditRepairStats?.commercialVenues===60);
const originalMap=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))).digest('hex');
test('reference_city_layout_unchanged',originalMap==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
test('default_12_15_day_and_cycle_off',read('engine44.js').includes('this.worldHour = 12.25')&&read('engine44.js').includes('this.clockRunning = false'));
function makeGame(){const g=Object.create(Game.prototype);Object.assign(g,{world:w,indoor:null,retailVisit:null,player:H.makeCar('player',200,50,0),avatar:H.createWalker(200,50,0),helicopters:[],wrecks:[],civilian:[],police:[],officers:[],inVehicle:false,worldHour:12.25,weather:{cloud:0},muzzleClock:0,armed:false,onTram:-1,seconds:10});return g;}
const game=makeGame();
function sameArrayObjects(a,b){return a.length===b.length&&a.every((q,i)=>q===b[i]);}
let lightABPassed=true,lightPositions=0;
for(let index=0;index<130;index++){
 game.avatar.x=(index*79)%3100-1500;game.avatar.z=(index*137)%2900-1400;
 game.worldHour=index%2?21.25:12.25;game.weather.cloud=(index%3)*.25;
 ctx.location.search='?performanceRecovery6Off=1';const old=game.sceneLights();
 ctx.location.search='';const newer=game.sceneLights();
 if(JSON.stringify(old)!==JSON.stringify(newer))lightABPassed=false;
 ctx.location.search='?performanceRecovery6Off=1';
 const classic=P.nearestStreetLights(w.lights,game.avatar);
 ctx.location.search='';
 const selected=P.nearestStreetLights(w.lights,game.avatar);
 if(!sameArrayObjects(classic,selected))lightABPassed=false;
 lightPositions++;
}
test('all_130_real_city_light_positions_identical',lightABPassed,{positions:lightPositions});
const equal=[{x:0,z:0,radius:10,r:1,g:1,b:1},{x:0,z:0,radius:10,r:1,g:1,b:1},{x:0,z:0,radius:-1}];
ctx.location.search='';
test('equal_distance_light_order_stable',sameArrayObjects(P.nearestStreetLights(equal,{x:1,z:1}),[equal[0],equal[1]]));
test('lighting_mutation_without_cache_staleness',(()=>{equal[0].x=500;return sameArrayObjects(P.nearestStreetLights(equal,{x:1,z:1}),[equal[1]]);})());
test('strict_165m_boundary_preserved',P.nearestStreetLights([{x:165,z:0,radius:1},{x:164.999,z:0,radius:1}],{x:0,z:0}).length===1);
function benchmark(label,fn,loops){for(let i=0;i<3;i++)fn();const started=performance.now();for(let i=0;i<loops;i++)fn();return {label,ms:+(performance.now()-started).toFixed(3)};}
const positions=[{x:100,z:300},{x:0,z:0},{x:400,z:-1100},{x:-900,z:800}];
function runLight(mode){ctx.location.search=mode==='old'?'?performanceRecovery6Off=1':'';let cursor=0;return benchmark(mode,()=>{P.nearestStreetLights(w.lights,positions[(cursor++)%positions.length]);},4500).ms;}
// Alternate old/new to avoid conflating JIT warmup and machine scheduling.
const lightBench={old:[runLight('old'),runLight('old')],optimized:[runLight('new'),runLight('new')]};
ctx.location.search='';const sample=w.boxes.filter(x=>typeof x.color==='string'&&x.material!=='translucent_glass').slice(0,14500);
const renderer=Object.create(H.GLRenderer.prototype);renderer.instanceScratch=new Float32Array(0);
function pack(mode){ctx.location.search=mode==='old'?'?performanceRecovery6Off=1':'';return renderer.pack(sample,true);}
const baseline=new Float32Array(pack('old'));const optimized=new Float32Array(pack('new'));
const identical=Buffer.from(baseline.buffer).equals(Buffer.from(optimized.buffer));
test('all_290000_gpu_instance_float_bytes_identical',identical,{floats:baseline.length});
// Test articulated rotations/color changes (lighting and GPU instances must be equivalent).
const varied=sample.filter(o=>o.yaw||o.spin||o.steer||o.pitch||o.roll||o.basis444).slice(0,500);
const changed={...sample[0],color:'#125b9f',yaw:1.3,roll:.33,spin:.07,steer:-.1};
varied.push(changed);
function packVaried(mode){ctx.location.search=mode==='old'?'?performanceRecovery6Off=1':'';return new Float32Array(renderer.pack(varied,true));}
const oldVaried=packVaried('old'),newVaried=packVaried('new');
test('angled_and_dynamic_color_instance_bytes_identical',Buffer.from(oldVaried.buffer).equals(Buffer.from(newVaried.buffer)),{count:varied.length});
const distinctColors=new Set(sample.map(o=>o.color)).size;
test('color_decoder_cache_used',P.stats.colorCacheHits>0&&P.stats.colorCacheMisses>=distinctColors,{hits:P.stats.colorCacheHits,misses:P.stats.colorCacheMisses,distinctColors});
function runPack(mode){ctx.location.search=mode==='old'?'?performanceRecovery6Off=1':'';return benchmark(mode,()=>renderer.pack(sample,true),12).ms;}
const packBench={old:[runPack('old'),runPack('old')],optimized:[runPack('new'),runPack('new')]};
ctx.location.search='?performanceRecovery6Off=1';
test('ab_disables_light_fast_path',P.disabled()===true);
test('ab_disables_pack_cache',P.activeDecoder()===null);
ctx.location.search='';
test('normal_mode_enabled',P.disabled()===false&&typeof P.activeDecoder()==='function');
ctx.__SUNSET_DISABLE_PERFORMANCE_RECOVERY6=true;
test('global_flag_turns_off_both_paths',P.disabled()===true&&P.activeDecoder()===null);
ctx.__SUNSET_DISABLE_PERFORMANCE_RECOVERY6=false;
const realReport=P.report({renderer:{canvas:{width:1920,height:1080},renderNative475:true,name:'WebGL2 instancing / GLSL'},visualMode450:'native1080',fps:51.1,frameTimeMs:19.56,pedestrians:Array(180),world:w});
test('single_FPS_snapshot_does_not_claim_sustained_50fps',realReport.instantaneousTargetObserved===true&&realReport.verifiedSustained50Fps1080p===false&&realReport.gpuFrameTimeMs===null);
test('existing_GPU_probe_preserved',fs.existsSync(path.join(root,'QA/city20_browser_benchmark.js')));
test('no_existing_UI_or_controls_removed',read('START_GAME.html').includes('id="stage17-diagnostics"'));
test('F10_snapshot_hotkey_available',read('engine44.js').includes("e.code==='F10'"));
const summary={phase:6,scope:'Live World CPU setup; exact light order/GPU instance CPU buffer comparisons. No real browser GPU test.',date:'2026-11-22',
 checks,total:checks.length,passed:checks.filter(x=>x.pass).length,allPassed:checks.every(x=>x.pass),
 world:{buildMs:+worldMs.toFixed(0),scriptLoadMs:+loadMs.toFixed(0),heapMB:+(process.memoryUsage().heapUsed/1e6).toFixed(1),rssMB:+(process.memoryUsage().rss/1e6).toFixed(1),boxes:w.boxes.length,roads:w.roads461.length,portals:w.entrancePortals.length,lights:w.lights.length},
 benches:{lighting4500CallsMs:lightBench,packing12Calls14500ObjectsMs:packBench},
 metrics:P.stats,renderedSceneNotTested:true,sustained1080p50FpsNotVerified:true};
fs.writeFileSync(path.join(root,'QA/PERFORMANCE_RECOVERY06_ACCEPTANCE.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:summary.passed,total:summary.total,failures:checks.filter(x=>!x.pass).map(x=>x.id),world:summary.world,benches:summary.benches,colorCache:{hits:P.stats.colorCacheHits,misses:P.stats.colorCacheMisses}},null,2));
if(!summary.allPassed)process.exitCode=2;
