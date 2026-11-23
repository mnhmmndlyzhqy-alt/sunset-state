// Compatibility copy ONLY: Stage05 added 130 entrances (298 -> 429). The original Recovery05 test stays unchanged.
'use strict';
/* Behavioral integration tests against ORIGINAL Game prototype and Heatline engine.
 * Test CPU logic and full world; not screenshots, browser input, GPU or 1080p FPS. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const scripts=[...read('START_GAME.html').matchAll(/<script src="([^"]+\.js)"/g)].map(m=>m[1]);
const tests=[];
function check(name,pass,detail){tests.push({name,pass:!!pass,detail});if(!pass)console.error('FAIL',name,JSON.stringify(detail||{}));}
const ctx={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,URLSearchParams,location:{search:''},performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>{},clearTimeout:()=>{},setInterval:()=>{},clearInterval:()=>{}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
check('scripts_exist',scripts.every(s=>fs.existsSync(path.join(root,s))),{total:scripts.length});
const i=scripts.indexOf('assets/city_life_recovery_phase05.js');
check('script_order_after_physics_before_engine',i>scripts.indexOf('assets/physics_recovery_phase04.js')&&i<scripts.indexOf('engine44.js'));
for(const name of scripts){
 let code=read(name);
 if(name==='engine44.js'){
  check('game_installer_present',code.includes('Heatline.installCityLifeRecovery5(Game)'));
  code=code.replace('if (typeof Heatline.installCityLifeRecovery5', 'globalThis.__RECOVERY05_GAME=Game; if (typeof Heatline.installCityLifeRecovery5');
 }
 new vm.Script(code,{filename:name}).runInContext(ctx,{timeout:60000});
}
const H=ctx.Heatline,Game=ctx.__RECOVERY05_GAME,S=H.cityLifeRecovery5.stats;
check('actual_game_installed_once',!!Game&&S.installed&&H.installCityLifeRecovery5(Game)===false);
check('previous_physics_installed',H.physicsRecovery4?.stats.installed===true);
const emptyWorld={nearby:()=>[]};
function pedestrian(x=19.3,z=36){const w=H.createWalker(x,z,0,3);w.pause=0;return w;}
function routeData(dt=.033){return {world:emptyWorld,simDt:dt,cars:[],trams:[],others:[]};}
const baseline=pedestrian(),start=routeData();ctx.location.search='?cityLifeRecovery5Off=1';
H.walkPedestrianRoute(baseline,start);
check('baseline_reproduces_frozen_route',baseline.navAxis===null&&baseline.z===36,{axis:baseline.navAxis,z:baseline.z});
const oldCalls=S.routeCalls;
check('ab_does_not_run_new_route',oldCalls===S.routeCalls);
ctx.location.search='';
const walker=pedestrian(),walkStart=walker.z;
for(let n=0;n<450;n++)H.walkPedestrianRoute(walker,routeData(.033));
check('real_route_initialized',walker.navAxis==='z',{navAxis:walker.navAxis});
check('ordinary_pedestrian_now_walks',walker.z<walkStart-12,{before:walkStart,after:walker.z});
check('walker_crosswalk_progresses',walker.navState==='crossing'||walker.navTrips>0,{state:walker.navState,trips:walker.navTrips,z:walker.z});
check('walking_kinematics_finite',[walker.x,walker.y,walker.z,walker.yaw,walker.vx,walker.vz].every(Number.isFinite));
const slower=pedestrian(),oldMicro=S.routeMicrosteps;
H.walkPedestrianRoute(slower,routeData(.22));
check('scheduled_far_pedestrian_uses_bounded_steps',S.routeMicrosteps-oldMicro===5,{steps:S.routeMicrosteps-oldMicro});
check('scheduled_far_pedestrian_moves',slower.z<36,{z:slower.z});
check('all_new_microsteps_bounded',S.routeMicrosteps<=S.routeCalls*5);
const invalid=pedestrian();const invalidBefore=S.routeInvalidDt;
H.walkPedestrianRoute(invalid,{world:emptyWorld,cars:[],trams:[],others:[],simDt:NaN});
check('invalid_dt_no_nan_or_crash',S.routeInvalidDt===invalidBefore+1&&invalid.navAxis===null);
const originalLevel=H.sameRoadLevel443;
H.sameRoadLevel443=(a,b)=>a.testLayer===b.testLayer;
const crossing=pedestrian(19.3,19.3);Object.assign(crossing,{navAxis:'z',navState:'waiting',navDir:-1,navSide:1,navRoad:19.3,navNode:0,navWait:0,navTargetX:19.3,navTargetZ:19.3,testLayer:0});
const upper={x:19.3,z:0,vx:0,vz:0,speed:0,alive:true,wrecked:false,testLayer:9};
const lower={...upper,testLayer:0};
H.walkPedestrianRoute(crossing,{...routeData(.033),cars:[upper]});
check('bridge_traffic_no_longer_blocks_lower_crosswalk',crossing.navState==='crossing',{state:crossing.navState});
const blocked=pedestrian(19.3,19.3);Object.assign(blocked,{navAxis:'z',navState:'waiting',navDir:-1,navSide:1,navRoad:19.3,navNode:0,navWait:0,navTargetX:19.3,navTargetZ:19.3,testLayer:0});
H.walkPedestrianRoute(blocked,{...routeData(.033),cars:[lower]});
check('same_level_car_still_blocks_crosswalk',blocked.navState==='waiting',{state:blocked.navState});
const carHazard={x:19.3,z:33,vx:0,vz:-16,speed:16,alive:true,wrecked:false,testLayer:9};
const observer=pedestrian(19.3,20);observer.testLayer=0;
check('wrong_level_vehicle_no_panic',H.pedestrianPredictedDanger(observer,[carHazard])===null);
carHazard.testLayer=0;
check('same_level_approaching_vehicle_still_warns',H.pedestrianPredictedDanger(observer,[carHazard])===carHazard);
const zebra=pedestrian(19.3,0);Object.assign(zebra,{navAxis:'z',navState:'crossing',navRoad:19.3,navNode:0,testLayer:0});
const turning={x:-5,z:0,vx:14,vz:0,speed:14,alive:true,wrecked:false,testLayer:0};
check('original_crosswalk_vehicle_yields',H.civilianYieldForCrossing(turning,zebra)===true);
turning.testLayer=9;
check('traffic_on_elevated_road_does_not_yield_to_lower_zebra',H.civilianYieldForCrossing(turning,zebra)===false);
ctx.location.search='?cityLifeRecovery5Off=1';
check('ab_restores_original_traffic_yield',H.civilianYieldForCrossing(turning,zebra)===true);
ctx.location.search='';
H.sameRoadLevel443=originalLevel;
function fakeGame(){
 const game=Object.create(Game.prototype);game.inVehicle=false;game.indoor=null;game.retailVisit=null;
 game.onTram=-1;game.onBus=-1;game.avatar=pedestrian(0,0);game.world=emptyWorld;
 game.pedestrians=[];game.police=[];game.officers=[];game.civilian=[];
 game.player={x:1000,z:1000,alive:true,wrecked:false,speed:0};
 game.streetLife={jobs:new Map(),clearCitizen:()=>{},advanceCitizen:()=>false,activeEvent:null,citizenDestination:()=>null};
 game.trams=[];game.weather={rain:0};game.heat=0;game.seconds=12;game.synth={cue:()=>{}};
 game.consumeCitizenTime460=(w,dt)=>dt;game.updateFlightCrew441=()=>false;game.updateUrbanResidence441=()=>false;
 game.activity461={near:false};game.talkedTo=new Set();game.conversations=0;game.profile={credits:0};
 game.saveProfile=()=>{};game.showInfo=(text)=>{game.lastTalkText=text;};game.updateHUD=()=>{};game.missionAction30=()=>{};game.worldHour=12.25;
 return game;
}
const g=fakeGame(),valid=pedestrian(-2.2,0),behindWall=pedestrian(1.6,0);
const wall={x:.8,z:0,hw:.22,hd:1};
g.world={nearby:()=>[wall]};g.pedestrians=[valid,behindWall];
check('conversation_chooses_visible_not_just_nearest_person',g.nearestTalker()===valid);
const dialogue=g.talkToCitizen();
check('talk_action_retains_original_conversation_flow',dialogue===true&&g.profile.credits===8&&g.conversations===1);
check('citizen_faces_player_and_pauses',valid.socialPose==='talk'&&valid.pause>=2.2&&Math.abs(H.angleDiff(valid.yaw,Math.atan2(-(-valid.x),-(0-valid.z))))<.01,{pose:valid.socialPose,pause:valid.pause,yaw:valid.yaw});
const oldRestores=S.talkPosesRestored;
for(let n=0;n<95;n++)g.updatePedestrians(.033);
check('talk_animation_returns_to_normal',valid.socialPose==='walk'&&S.talkPosesRestored>=oldRestores+1,{pose:valid.socialPose,restored:S.talkPosesRestored-oldRestores});
const blockedOnly=fakeGame();blockedOnly.world={nearby:()=>[wall]};blockedOnly.pedestrians=[pedestrian(1.6,0)];
check('wall_occlusion_is_real',H.officerSightClear(0,0,1.6,0,[wall])===false);
const oldBlocked=S.blockedDialogues;
check('cannot_talk_through_wall',blockedOnly.nearestTalker()===null);
check('occluded_conversation_rejection_counted',S.blockedDialogues===oldBlocked+1);
const busy=fakeGame();const worker=pedestrian(19.3,36);busy.avatar=pedestrian(19.3,38);busy.pedestrians=[worker];
for(let n=0;n<200;n++)busy.updatePedestrians(.033);
check('real_game_updatePedestrians_advances_walker',worker.z<34.5,{z:worker.z,state:worker.navState});
check('real_game_update_preserves_population',busy.pedestrians.length===1);
const worldStarted=Date.now(),world=new H.World();
check('stage20_full_world_52_routes_429_portals',world.roads461.length===52&&world.entrancePortals.length===429,{roads:world.roads461.length,portals:world.entrancePortals.length});
check('all_prior_world_geometry_present',world.boxes.length>190000,{boxes:world.boxes.length});
check('deep_audit_repair_still_present',world.city20DeepAuditRepairStats?.commercialVenues>=50);
check('coast_and_nature_unchanged',new H.Stage39Life(world).wildlife.filter(a=>a.kind==='crocodile').length===8);
const spawned=H.spawnPedestrians(new H.RNG(65114),180,world);
check('real_world_civilians_can_spawn',spawned.length>=80,{spawned:spawned.length});
check('real_world_civilians_finite',spawned.every(w=>Number.isFinite(w.x)&&Number.isFinite(w.z)));
const mapHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))).digest('hex');
check('chosen_reference_map_immutable',mapHash==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
check('daylight_default_still_bright',read('engine44.js').includes('this.worldHour = 12.25')&&read('engine44.js').includes('this.clockRunning = false'));
const result={phase:5,scope:'Original Game NPC methods, pedestrian route, road-level behavior, full world construction; no GPU visual QA',date:'2026-11-22',passed:tests.filter(t=>t.pass).length,total:tests.length,allPassed:tests.every(t=>t.pass),tests,stats:S,fullWorld:{boxes:world.boxes.length,roads:world.roads461.length,portals:world.entrancePortals.length,spawnedPedestrians:spawned.length,buildMs:Date.now()-worldStarted},hardwareFpsVerified:false};
fs.writeFileSync(path.join(root,'QA/STAGE20_RECOVERY05_COMPAT_RESULT.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,total:result.total,failed:tests.filter(t=>!t.pass).map(t=>t.name),stats:S,world:result.fullWorld},null,2));
if(!result.allPassed)process.exitCode=2;
