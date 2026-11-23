'use strict';
/* CPU-only, real Game constructor/update smoke with a strictly fake DOM and renderer.
   NO rendered pixels / real browser / WebGL are tested here. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('START_GAME.html');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
class Classes{constructor(){this.val=new Set(['hidden']);}add(x){this.val.add(x);}remove(x){this.val.delete(x);}contains(x){return this.val.has(x);}toggle(x,b){if(b===undefined)b=!this.val.has(x);b?this.add(x):this.remove(x);return b;}}
class El{constructor(id=''){this.id=id;this.style={setProperty(){}};this.classList=new Classes();this.dataset={};this.children=[];this.listeners={};this.parentElement={classList:new Classes(),parentElement:{classList:new Classes()}};this.value='';this.textContent='';this.innerHTML='';this.width=1920;this.height=1080;this.hidden=false;this.disabled=false;this.scrollTop=0;this.scrollHeight=1000;this.clientHeight=500;}
 addEventListener(k,f){(this.listeners[k]||=[]).push(f);}setAttribute(k,v){this[k]=v;}getAttribute(k){return this[k]||'';}replaceWith(){}cloneNode(){return new El(this.id);}append(...args){this.children.push(...args);}appendChild(x){this.children.push(x);return x;}remove(){}querySelectorAll(){return [];}querySelector(){return null;}setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:1920,height:1080}};getContext(){return {clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},rect(){},save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(){},fillText(){},strokeText(){},measureText(){return {width:20}},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};}
}
const els={};for(const id of ids)els[id]=new El(id);
for(const id of ['heat-lamps'])els[id].children=Array.from({length:6},()=>new El('lamp'));
const listeners=[];
const document={hidden:false,body:new El('body'),createElement:(tag)=>new El(tag),getElementById:(id)=>els[id]||null,querySelectorAll:()=>[],querySelector:(selector)=>selector.startsWith('[data-hold=')?new El(selector):null,addEventListener:(ev,f)=>listeners.push({ev,f}),createTextNode:()=>new El('text')};
let current=0;const storage=new Map();
const ctx={console,Buffer,Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,TextEncoder,Math,Date,URLSearchParams,document,KeyboardEvent:class{constructor(type,o){this.type=type;Object.assign(this,o)}},window:null,screen:{width:1920,height:1080},devicePixelRatio:1,navigator:{userAgent:'FAKE-CPU-SMOKE'},Image:class{constructor(){this.complete=true;this.width=1024;this.height=1024;}set src(s){this._src=s;}get src(){return this._src||''}},Audio:class{constructor(){this.paused=true;this.ended=false;this.volume=0;}addEventListener(){}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}},performance:{now:()=>current},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},location:{search:''},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};
ctx.globalThis=ctx;ctx.window=ctx;ctx.addEventListener=()=>{};ctx.matchMedia=()=>({matches:false});ctx.innerWidth=1920;ctx.innerHeight=1080;
vm.createContext(ctx);
const scripts=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
for(const script of scripts){let code=read(script);if(script==='engine44.js')code=code.replace('if (typeof Heatline.installPhysicsRecovery4', 'globalThis.__Recovery07GameClass=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(code,{filename:script}).runInContext(ctx,{timeout:60000});}
const H=ctx.Heatline;class Renderer{constructor(canvas){this.canvas=canvas;this.name='FAKE RENDERER FOR CPU QA';this.renderNative475=true;this.renderPolicy475='native1080';this.nativeTier475=0;this.superSample450=1;this.visibleObjects=[];this.width=1920;this.height=1080;}setQuality(){}resize(){}draw(){} }
// Render backend intentionally replaced, the real game world/movement/updateHUD stays intact.
H.GLRenderer=Renderer;
H.CanvasRenderer=Renderer;
H.Wildlife43Renderer=class{constructor(){this.ready=false;}prepare(){}has(){return false}selectUrban(){return false}draw(){}status(){return {supported:false}}};
const results=[];function check(name,pass,data){results.push({name,pass:!!pass,data:data||null});if(!pass)console.error('FAIL',name,JSON.stringify(data||{}));}
let g,constructorError=null;try{g=new ctx.__Recovery07GameClass;}catch(e){constructorError=String(e)+'\n'+e.stack;console.error('CONSTRUCTOR FAILED:',constructorError);}
check('game_constructor_no_error',!!g,{error:constructorError});
if(g){
 // Canvas2D map drawing is out of scope; game HUD logic remains real.
 g.nav445.draw=()=>{}; g.nav445.bake=()=>{};
 check('actual_world_built',g.world.roads461.length===52&&g.world.entrancePortals.length===298,{boxes:g.world.boxes.length,roads:g.world.roads461.length,portals:g.world.entrancePortals.length});
 check('correct_spawning_population',g.pedestrians.length>=180,{population:g.pedestrians.length});
 check('bright_cycle_disabled_on_start',g.worldHour===12.25&&g.clockRunning===false);
 try{g.restart({reuseWorld:true});check('start_game_no_error',true);}catch(e){check('start_game_no_error',false,{error:String(e),stack:e.stack?.slice(0,600)});}
 if(g.running){
  check('normal_start_on_foot',g.inVehicle===false);
  const originClock=g.worldHour;g.clockRunning=true;
  try{g.update(.05);check('optional_day_night_cycle_advances_clock',g.worldHour>originClock,{before:originClock,after:g.worldHour});}catch(e){check('optional_day_night_cycle_advances_clock',false,{error:String(e)})}
  g.clockRunning=false;const pausedClock=g.worldHour;
  try{g.update(.05);check('stopped_cycle_holds_hour',g.worldHour===pausedClock);}catch(e){check('stopped_cycle_holds_hour',false,{error:String(e)})}
  g.worldHour=12.25;
  check('starting_map_reference_present',!!g.world.entrancePortals.find(q=>q.interiorReady));
  try{
    const id=g.world.entrancePortals.findIndex(q=>q.interiorReady);
    const portal=g.world.entrancePortals[id];
    const oldPos={x:g.avatar.x,z:g.avatar.z};g.avatar.x=portal.x;g.avatar.z=portal.z;g.avatar.y=H.outdoorHeight(portal.x,portal.z);
    check('nearby_real_portal_detected',g.nearestEntrance()?.id===portal.id,{id,selected:g.nearestEntrance()?.id});
    const entry=g.enterBuilding(id);
    check('real_lobby_entered',entry&&g.indoor?.floor===0&&g.indoor.scene?.lift,{portal:id});
    if(entry){
      check('cannot_use_lift_from_corridor',!g.startElevatorTo(1));
      const lift=g.indoor.scene.lift;
      g.avatar.x=lift.x;g.avatar.z=lift.z+.45;
      const panel=g.openElevatorMenu();
      check('lift_control_works_at_car',panel===true,{opened:panel});
      const began=g.startElevatorTo(1);
      check('lift_starts_at_real_portal',began===true,{began,maximum:g.indoor.scene.maxFloor});
      if(began){for(let j=0;j<200&&g.indoor.liftRide;j++)g.updateInterior(.05,0,0);
       check('lift_reaches_floor_one',g.indoor.floor===1&&!g.indoor.liftRide,{floor:g.indoor.floor});}
      // Return to lobby via normal elevator mechanism.
      const home=g.indoor.scene.lift;g.avatar.x=home.x;g.avatar.z=home.z+.45;
      check('lift_returns_to_lobby',g.startElevatorTo(0)===true);
      for(let j=0;j<200&&g.indoor.liftRide;j++)g.updateInterior(.05,0,0);
      check('lift_reaches_ground_floor',g.indoor.floor===0);
      g.avatar.x=g.indoor.scene.entrance.x;g.avatar.z=g.indoor.scene.entrance.z;
      const exit=g.exitBuilding();check('building_exit_transition_started',exit&&!!g.exitTransition);
      for(let j=0;j<60&&g.exitTransition;j++)g.stage42UpdateExit(.05);
      check('building_exited_to_street',!g.inside&&!g.exitTransition);
    }
    g.returnToStreet(oldPos.x,oldPos.z);
  }catch(e){check('interior_lift_and_exit_smoke_complete',false,{error:String(e),stack:e.stack?.slice(0,650)});g.indoor=null;}

  try{g.updateHUD();check('HUD_update_real_game_no_error',true);}catch(e){check('HUD_update_real_game_no_error',false,{error:String(e),stack:e.stack?.slice(0,500)});}
  const p=g.avatar;const begin={x:p.x,z:p.z};g.keys.add('KeyW');
  try{for(let i=0;i<90;i++){current+=33;g.update(.033);}check('90_real_game_logic_frames_no_error',true)}catch(e){check('90_real_game_logic_frames_no_error',false,{error:String(e),stack:e.stack?.slice(0,600)})}
  g.keys.clear();
  check('avatar_moved_with_W',Math.hypot(g.avatar.x-begin.x,g.avatar.z-begin.z)>.2,{begin,after:{x:g.avatar.x,z:g.avatar.z}});
  check('all_NPC_positions_finite',g.pedestrians.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)),{count:g.pedestrians.length});
  check('day_still_paused_without_toggle',g.worldHour===12.25&&g.clockRunning===false,{hour:g.worldHour,cycle:g.clockRunning});
  try{g.tick(current+=34);check('tick_without_webgl_no_error',true)}catch(e){check('tick_without_webgl_no_error',false,{error:String(e),stack:e.stack?.slice(0,500)})}
 }
}
// Test the optional QA panel without claiming a rendered screenshot.
try{
  ctx.location.search='';
  new vm.Script(read('QA/recovery07_live_checklist.js'),{filename:'recovery07_live_checklist.js'}).runInContext(ctx);
  check('QA_panel_absent_in_normal_game',!ctx.__SUNSET_RECOVERY07_QA);
  ctx.location.search='?recovery7qa=1';ctx.document.readyState='complete';ctx.__SUNSET_PERFORMANCE06_GAME=g;
  new vm.Script(read('QA/recovery07_live_checklist.js'),{filename:'recovery07_live_checklist.js'}).runInContext(ctx);
  const panel=document.body.children.find(x=>x.id==='qa7-live-panel');
  check('QA_panel_opt_in_loads',!!panel&&ctx.__SUNSET_RECOVERY07_QA?.scenarios.length===8);
  const controls=panel?.children.find(x=>x.children?.some(y=>y.textContent==='Hide / show'));
  const toggle=controls?.children.find(x=>x.textContent==='Hide / show');
  if(toggle){toggle.listeners.click[0]();check('QA_collapse_keeps_reopen_button_visible',toggle.style.display!=='none'&&toggle.textContent==='Show QA tools');toggle.listeners.click[0]();check('QA_reopen_controls_works',toggle.textContent==='Hide / show');}
  const snap=ctx.__SUNSET_RECOVERY07_QA?.snap();
  check('QA_live_export_reads_real_game_state',snap?.game?.roads===52&&snap?.game?.portals===298&&snap?.scenarios.length===8);
}catch(e){check('QA_optional_panel_smoke_completed',false,{error:String(e),stack:e.stack?.slice(0,600)});}
const out={scope:'Game constructor/start/HUD/90 CPU frames/tick/lobby/real lift and optional QA panel with FAKE DOM/RENDERER; NOT BROWSER, NOT GPU, NOT FPS',date:'2026-11-22',total:results.length,passed:results.filter(x=>x.pass).length,results};
fs.writeFileSync(path.join(root,'QA/RECOVERY07_CPU_SMOKE.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({total:out.total,passed:out.passed,failures:results.filter(x=>!x.pass)},null,2));
if(out.passed!==out.total)process.exitCode=2;
