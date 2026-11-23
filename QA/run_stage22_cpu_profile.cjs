'use strict';
/* Reproducible REAL game-world CPU profiling with FAKE renderer.
 * No claim about GPU draw time, FPS or actual game frames.
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),start=performance.now();
const {g,H}=require('./stage05_bootstrap.cjs');
const constructorAndScriptLoadMs=performance.now()-start;
const checks=[];
function verify(id,yes){checks.push({id,pass:!!yes});if(!yes)console.error('FAIL',id);}
function percent(vals,p){const v=vals.slice().sort((a,b)=>a-b);return v[Math.max(0,Math.ceil(p*v.length)-1)];}
function measure(label,fn,warmup=6,runs=45){
 for(let i=0;i<warmup;i++)fn();
 const readings=[];let count=null;
 for(let i=0;i<runs;i++){
  const t=performance.now();const result=fn();const ms=performance.now()-t;
  readings.push(ms);if(i===0&&result&&typeof result.length==='number')count=result.length;
 }
 return {label,samples:runs,sourceItems:count,p50Ms:+percent(readings,.5).toFixed(3),
    p95Ms:+percent(readings,.95).toFixed(3),worstMs:+Math.max(...readings).toFixed(3),
    meanMs:+(readings.reduce((a,b)=>a+b,0)/readings.length).toFixed(3)};
}
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
const scriptNames=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
verify('real_cumulative_game_constructor_succeeded',!!g?.world&&!!g?.player&&!!g?.renderer);
verify('all_loaded_scripts_present',scriptNames.every(x=>fs.existsSync(path.join(root,x))));
verify('original_roads_retained',g.world.roads461.length===52);
verify('all_portal_descriptors_retained',g.world.entrancePortals.length===429);
verify('full_world_geometry_retained',g.world.boxes.length>194000);
verify('cumulative_NPCs_present',g.pedestrians.length>=180);
verify('stage22_unmodified_in_normal_play',H.stage22Benchmark?.enabled()===false);
verify('no_real_GPU_renderer_in_CPU_profile',g.renderer.name==='FAKE RENDERER FOR CPU QA');
const benches=[
 measure('active outdoor dynamic geometry',()=>g.buildDynamic(),8,90),
 measure('outdoor lights',()=>g.sceneLights(),8,100),
 measure('real scene selection',()=>g.stage42ViewScene(),8,100)
];
const mem=process.memoryUsage();
const report={stage:22,createdAt:new Date().toISOString(),environment:'Node/V8 and real SUNSET Game + world, fake renderer',
 instrumentation:'elapsed CPU wall clock for constructor and selected hot paths',
 hardwareGPUAvailable:false,measuredFramesPerSecond:null,gpuExecutionMilliseconds:null,
 native1920x1080Fps50Verified:false,simulatedCanvas1920x1080Only:true,
 scriptAndWorldInitMs:+constructorAndScriptLoadMs.toFixed(1),
 loadedExternalGameScripts:scriptNames.length,
 world:{staticBoxes:g.world.boxes.length,entranceDescriptors:g.world.entrancePortals.length,
  roadSegments:g.world.roads461.length,pedestrians:g.pedestrians.length},
 processMemoryMB:{heapUsed:+(mem.heapUsed/1048576).toFixed(1),rss:+(mem.rss/1048576).toFixed(1),
 external:+(mem.external/1048576).toFixed(1)},
 cpuBenchmarks:benches,checks,passed:checks.filter(c=>c.pass).length,total:checks.length,
 warning:'Simulation is CPU/JS-only with a fake rendering backend; NEVER extrapolate these timings to game FPS or GPU throughput.'};
fs.writeFileSync(path.join(__dirname,'STAGE22_CPU_PROFILE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,world:report.world,
 initMs:report.scriptAndWorldInitMs,processMemoryMB:report.processMemoryMB,cpuBenchmarks:benches},null,2));
if(report.passed!==report.total)process.exitCode=1;
