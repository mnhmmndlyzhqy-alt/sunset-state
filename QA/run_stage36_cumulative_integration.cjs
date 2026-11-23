'use strict';
/* Stage36 opt-in attaches to real cumulative Stage35 game world with FAKE renderer.
 * This proves API integration only, not hardware FPS or actual WebGL pixel output. */
const fs=require('fs'),path=require('path');
const {ctx,g,H}=require('./stage05_bootstrap.cjs');
const checks=[];function test(name,v){checks.push({name,pass:!!v});if(!v)console.error('FAIL',name);}
g.nav445.draw=()=>{};g.refreshMissionBoard=()=>{};g.restart({reuseWorld:true});
const C=ctx.__Recovery07GameClass,baseline={boxes:g.world.boxes.length,roads:g.world.roads461.length,
 portals:g.world.entrancePortals.length,shops:g.world.retailShops.length,
 pedestrians:g.pedestrians.length};
const baselineTick=C.prototype.tick,originalUpdate=g.update,originalDraw=g.renderer.draw;
ctx.location.search='?stage36qa=1';
const installed=H.installStage36PerformanceAudit(C);
test('installs_after_optin_for_real_game_class',installed===true);
test('installs_only_once',H.installStage36PerformanceAudit(C)===false);
test('real_game_world_baseline',baseline.boxes>190000&&baseline.roads===52&&baseline.shops===59);
test('game_tick_wrapped',C.prototype.tick!==baselineTick);
const monitor=H.stage36PerformanceAudit;
test('enabled_with_query_string',monitor.enabled());
test('no_save_format_changes',typeof g.stage19SaveNow==='function'&&H.stage19Save?.schema===19);
const result=monitor.begin(g,'downtown_walk',true,{warmupMs:0,captureMs:200});
test('begin_real_game_capture',result.ok);
g.running=true;g.paused=false;g.over=false;
for(let i=1;i<12;i++){
 const ms=16.67*i;
 ctx.__setMockTime(ms);
 try{g.tick(ms);}catch(err){console.error('runtime tick error',err);test('real_game_tick_'+i,false);break;}
}
const measured=monitor.finish('cpu-cumulative-integration');
test('capture_returns_result',!!measured);
test('renderer_restored',g.renderer.draw===originalDraw);
test('game_update_restored',g.update===originalUpdate);
test('no_hardware_claim_for_fake_renderer',measured?.native1080Average50FpsVerified===false);
test('no_game_world_geometry_mutation',g.world.boxes.length===baseline.boxes);
test('roads_retain_count',g.world.roads461.length===baseline.roads);
test('portals_retain_count',g.world.entrancePortals.length===baseline.portals);
test('shops_retain_count',g.world.retailShops.length===baseline.shops);
test('pedestrians_retain_count',g.pedestrians.length===baseline.pedestrians);
const out={stage:36,environment:'real cumulative game world; fake renderer and synthetic RAF timestamps',
 passed:checks.filter(x=>x.pass).length,total:checks.length,
 checks,activeFrames:measured?.activeDrawnFrames||0,
 nativeFpsClaim:false,world:baseline};
fs.writeFileSync(path.join(__dirname,'STAGE36_CUMULATIVE_INTEGRATION_RESULT.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.passed,total:out.total,activeFrames:out.activeFrames,world:baseline,failed:checks.filter(x=>!x.pass)},null,2));
if(out.passed!==out.total)process.exitCode=1;
