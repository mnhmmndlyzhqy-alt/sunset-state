'use strict';
/* SUNSET STATE recovery 4: real engine movement paths with a full world and A/B.
 * CPU kinematics/collision only; DOES NOT certify 1080p GPU frame rate. */
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('START_GAME.html');
const scripts=[...html.matchAll(/<script src="([^"]+\.js)"/g)].map(m=>m[1]);
const checks=[];
function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)console.error('FAIL',name,JSON.stringify(detail||{}));}
const ctx={console,URLSearchParams,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
 performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
 setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},location:{search:''}};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
check('all_game_scripts_present',scripts.every(s=>fs.existsSync(path.join(root,s))),{count:scripts.length});
check('physics_module_before_core_engine',scripts.indexOf('assets/physics_recovery_phase04.js')===scripts.indexOf('engine44.js')-1);
for(const s of scripts){
 const original=read(s);
 const source=s==='engine44.js'?original.replace('Heatline.installPhysicsRecovery4(Game);','Heatline.installPhysicsRecovery4(Game); globalThis.__PHASE4_TEST_GAME=Game;'):original;
 if(s==='engine44.js')check('engine_installer_present',source!==original);
 new vm.Script(source,{filename:s}).runInContext(ctx,{timeout:60000});
}
const H=ctx.Heatline, C=ctx.__PHASE4_TEST_GAME, P=H.physicsRecovery4;
check('installed_on_real_engine_game',!!C&&P.stats.installed&&H.installPhysicsRecovery4(C)===false);
check('old_engine_controls_remain',read('engine44.js').includes("const gas = this.is('KeyW', 'ArrowUp')")&&read('engine44.js').includes("this.is('KeyD', 'ArrowRight')")&&read('engine44.js').includes('Heatline.jumpWalker'));
const snapshot=(c)=>({x:c.x,z:c.z,vx:c.vx,vz:c.vz,speed:c.speed,hp:c.hp});
function fakeGame(obstacles=[]){
 const game=Object.create(C.prototype);
 game.weather={rain:0};game.world={nearby:()=>obstacles,impactNearby:()=>[],panesNearby:()=>[]};game.railGates=[];
 game.breakGlassOnCarContact=()=>{};game.crashVehicle=()=>null;game.synth={cue:()=>{},impact:()=>{}};
 game.bulletScars=[];game.impactDebris=()=>{};game.reportOffense=()=>{};
 game.buildingHitPoint=(c,s,nx,nz)=>({x:s.x,z:s.z});
 return game;
}
const input={gas:0.5,steer:0.22,brake:false,nitro:false};
let normal=H.makeCar('player',30,40,0),g=fakeGame();
for(let i=0;i<100;i++)g.moveCar(normal,.016,input);
check('steady_traffic_simulation_finite',Object.values(snapshot(normal)).every(Number.isFinite),snapshot(normal));
const microBefore=P.stats.carMicrosteps,callsBefore=P.stats.carCalls;
const fast=H.makeCar('player',0,17,0);fast.vz=-96;fast.speed=96;
const wall={x:0,z:9,hw:3,hd:.15};
const gate=fakeGame([wall]);gate.moveCar(fast,.045,{gas:0,steer:0,brake:false,nitro:false});
check('fast_vehicle_runs_collision_substeps',P.stats.carCalls===callsBefore+1&&P.stats.carMicrosteps-microBefore>=2,
 {microsteps:P.stats.carMicrosteps-microBefore,calls:P.stats.carCalls-callsBefore});
check('fast_vehicle_does_not_cross_thin_wall',fast.z>wall.z+wall.hd+1.15,snapshot(fast));
check('vehicle_wall_impact_velocity_bounded',Number.isFinite(fast.vz)&&Number.isFinite(fast.x)&&fast.speed<=118,snapshot(fast));
const natural=H.makeCar('player',0,0,0),ab=H.makeCar('player',0,0,0);
for(const c of [natural,ab]){c.vz=-70;c.speed=70;}
const baseline=fakeGame([]),opt=fakeGame([]);
ctx.__SUNSET_DISABLE_PHYSICS_RECOVERY4=true;
baseline.moveCar(natural,.040,input);
ctx.__SUNSET_DISABLE_PHYSICS_RECOVERY4=false;
opt.moveCar(ab,.040,input);
const drift=Math.hypot(natural.x-ab.x,natural.z-ab.z);
check('vehicle_substeps_do_not_radically_change_driving',drift<.6&&Math.abs(natural.speed-ab.speed)<4,{before:snapshot(natural),after:snapshot(ab),drift});
const footInput={forward:1,strafe:0,run:true,viewYaw:0,outdoors:true,roadWorld:{nearby:()=>[]},allowWater:true};
const w=H.createWalker(0,0,0);w.y=H.walkerGround473(w);const count=P.stats.walkerMicrosteps;
H.stepWalker(w,footInput,[],.050,[]);
check('player_walking_uses_substeps',P.stats.walkerMicrosteps-count>=2,{microsteps:P.stats.walkerMicrosteps-count});
check('walker_motion_finite',Object.values({x:w.x,z:w.z,vx:w.vx,vz:w.vz,y:w.y}).every(Number.isFinite));
check('walking_forward_moves_negative_z',w.z<-.15,{z:w.z});
const left=H.createWalker(0,0,0),right=H.createWalker(0,0,0);
for(const v of [left,right])v.y=H.walkerGround473(v);
H.stepWalker(left,{...footInput,forward:0,strafe:-1,run:false},[],.045,[]);
H.stepWalker(right,{...footInput,forward:0,strafe:1,run:false},[],.045,[]);
check('A_and_D_not_reversed',left.x<-.1&&right.x>.1,{leftX:left.x,rightX:right.x});
const diagonal=H.createWalker(-.72,1.2,0);diagonal.y=H.walkerGround473(diagonal);
const obstacle={x:0,z:-1.0,hw:.14,hd:5};let requery=0;
const diagonalInput={...footInput,forward:1,strafe:1,roadWorld:{nearby:()=>{requery++;return [obstacle];}}};
for(let n=0;n<8;n++)H.stepWalker(diagonal,diagonalInput,[obstacle],.045,[]);
check('diagonal_walking_slides_along_wall',diagonal.x<-.42&&diagonal.z<.1,{x:diagonal.x,z:diagonal.z});
check('player_collision_cells_requeried_during_substeps',requery>8,{requery});
const resting=H.createWalker(0,0,0);resting.y=H.walkerGround473(resting);
const jumped=H.jumpWalker(resting),secondJump=H.jumpWalker(resting);
for(let n=0;n<50;n++)H.stepWalker(resting,{...footInput,forward:0,strafe:0,run:false},[],.02,[]);
check('jump_does_not_double_jump',jumped&&!secondJump&&resting.jumps===1,{jumps:resting.jumps});
check('jump_and_landing_stable',resting.grounded&&Number.isFinite(resting.y)&&resting.vy===0,{y:resting.y,grounded:resting.grounded});
// A/B disable must restore the EXACT previous movement call count.
const callsA=P.stats.walkerCalls,carCallsA=P.stats.carCalls;
ctx.location.search='?physicsRecovery4Off=1';
H.stepWalker(H.createWalker(0,0),footInput,[],.05,[]);
fakeGame().moveCar(H.makeCar('player',0,0,0),.03,input);
check('query_param_ab_returns_legacy_path',P.stats.walkerCalls===callsA&&P.stats.carCalls===carCallsA);
ctx.location.search='';
check('walker_world_limit_preserved',Math.abs(w.x)<H.WORLD_LIMIT&&Math.abs(w.z)<H.WORLD_LIMIT);
const map=fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'));
check('original_reference_unchanged',crypto.createHash('sha256').update(map).digest('hex')==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
const start=Date.now(),world=new H.World(),worldMs=Date.now()-start;
check('full_world_still_builds',world.boxes.length>190000&&world.roads461.length===52&&world.entrancePortals.length===298,
 {boxes:world.boxes.length,roads:world.roads461.length,portals:world.entrancePortals.length,worldMs});
check('existing_deep_audit_geometry_present',world.city20DeepAuditRepairStats?.commercialVenues>=50);
const life=new H.Stage39Life(world);
check('animal_models_still_integrated',life.wildlife.filter(a=>a.kind==='crocodile').length===8);
const roads=world.roads461;
check('road_geometry_still_finite',roads.every(r=>r.samples.every(p=>[p.x,p.y,p.z].every(Number.isFinite))));
// Use a real bridge segment from the full world to validate road-level guards.
let bridgeTest=null;
for(const road of roads){
 for(const point of road.samples){
  if((point.above||0)<1)continue;
  const b=H.closestBridge477(point.x,point.z);
  if(b&&b.road&&b.d<1){bridgeTest=b;break;}
 }
 if(bridgeTest)break;
}
check('actual_surveyed_bridge_available_for_test',!!bridgeTest,{road:bridgeTest?.road?.id});
if(bridgeTest){
 const oldSkips=P.stats.guardRouteSkips;
 const c={type:'civilian',x:bridgeTest.x,z:bridgeTest.z,vx:5,vz:0,speed:5,impact:0,alive:true,
  route477:{road:{id:'synthetic-lower-road'}}};
 H.guardBridgeRails477(c,bridgeTest.x,bridgeTest.z);
 check('lower_road_npc_not_snapped_to_other_bridge',P.stats.guardRouteSkips===oldSkips+1&&
  Math.abs(c.x-bridgeTest.x)<.001&&Math.abs(c.z-bridgeTest.z)<.001,{skips:P.stats.guardRouteSkips-oldSkips});
 const same={...c,route477:{road:bridgeTest.road}};
 H.guardBridgeRails477(same,bridgeTest.x,bridgeTest.z);
 check('route_matched_bridge_retains_guard',P.stats.guardRouteSkips===oldSkips+1);
 ctx.location.search='?physicsRecovery4Off=1';
 H.guardBridgeRails477({...c,route477:{road:{id:'synthetic-lower-road'}}},bridgeTest.x,bridgeTest.z);
 check('bridge_A_B_disable_restores_legacy_guard',P.stats.guardRouteSkips===oldSkips+1);
 ctx.location.search='';
}

const summary={scope:'real game kinematics/collisions in Node VM, one full world, no GPU validation',date:'2026-11-21',phase:4,
 passed:checks.filter(c=>c.passed).length,total:checks.length,allPassed:checks.every(c=>c.passed),checks,
 stats:P.stats,fullWorld:{geometry:world.boxes.length,roads:world.roads461.length,portals:world.entrancePortals.length,worldBuildMs:worldMs},gpu50FPSVerified:false};
fs.writeFileSync(path.join(root,'QA/PHYSICS_RECOVERY04_ACCEPTANCE.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({pass:summary.passed,total:summary.total,failed:checks.filter(c=>!c.passed).map(c=>c.name),stats:summary.stats,fullWorld:summary.fullWorld},null,2));
if(!summary.allPassed)process.exitCode=2;
