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
ctx.globalThis=ctx;ctx.window=ctx;
if(process.env.STAGE04_ACCESS_OFF==='1')ctx.__SUNSET_STAGE04_ACCESS_OFF=true;ctx.addEventListener=()=>{};ctx.matchMedia=()=>({matches:false});ctx.innerWidth=1920;ctx.innerHeight=1080;
vm.createContext(ctx);
const scripts=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
for(const script of scripts){let code=read(script);if(script==='engine44.js')code=code.replace('if (typeof Heatline.installPhysicsRecovery4', 'globalThis.__Recovery07GameClass=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(code,{filename:script}).runInContext(ctx,{timeout:60000});}
const H=ctx.Heatline;class Renderer{constructor(canvas){this.canvas=canvas;this.name='FAKE RENDERER FOR CPU QA';this.renderNative475=true;this.renderPolicy475='native1080';this.nativeTier475=0;this.superSample450=1;this.visibleObjects=[];this.width=1920;this.height=1080;}setQuality(){}resize(){}draw(){} }
// Render backend intentionally replaced, the real game world/movement/updateHUD stays intact.
H.GLRenderer=Renderer;
H.CanvasRenderer=Renderer;
H.Wildlife43Renderer=class{constructor(){this.ready=false;}prepare(){}has(){return false}selectUrban(){return false}draw(){}status(){return {supported:false}}};

const Hh=ctx.Heatline, g=new ctx.__Recovery07GameClass,w=g.world;
g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
const ready=w.entrancePortals.filter(p=>p.interiorReady);
const active=new Set(w.buildings.map(b=>`${b.x},${b.z}`));
const liveReady=ready.filter(p=>active.has(`${p.buildingX},${p.buildingZ}`));
const stale=w.entrancePortals.filter(p=>!p.interiorReady&&!active.has(`${p.buildingX},${p.buildingZ}`));
const stageOn=process.env.STAGE04_ACCESS_OFF!=='1';
const expectedReady=stageOn?84:83,expectedCount=stageOn?299:298;
const cases=[];function check(name,pass,e){cases.push({name,pass:!!pass,details:e||null});if(!pass)console.error('FAIL',name,JSON.stringify(e||{}));}
check('real_game_constructor',!!g);
check('road_count_preserved',w.roads461.length===52,{count:w.roads461.length});
check('legacy_84_buildings_preserved',w.buildings.length===84,{count:w.buildings.length});
check('city20_130_structures_preserved',w.city20DistrictBuildings.length===130);
check('portal_records_exact',w.entrancePortals.length===expectedCount,{count:w.entrancePortals.length});
check('old_298_portal_ids_fixed',w.entrancePortals.slice(0,298).every((p,i)=>p.id===i));
check('active_portal_count',ready.length===expectedReady,{ready:ready.length});
check('ready_portals_have_actual_world_buildings',ready.every(p=>active.has(`${p.buildingX},${p.buildingZ}`)));
check('stale_215_portals_still_disabled',stale.length===215,{stale:stale.length});
check('all_active_entrances_have_matching_plans',ready.every(p=>w.structuralPlans.some(s=>s.interiorReady&&s.outerShell.x===p.buildingX&&s.outerShell.z===p.buildingZ)));
check('unique_portal_ids',new Set(w.entrancePortals.map(p=>p.id)).size===expectedCount);
check('all_live_portals_have_real_door_records',ready.every(p=>w.stage42Doors.some(d=>d.id===p.id)));
check('all_live_doors_indexed_in_spatial_map',ready.every(p=>[...w.lobbyDoors443.values()].some(a=>a.some(d=>d.id===p.id))));
check('stage2_northRing_route_preserved',w.roads461.find(r=>r.id==='northRing')?.points.length>1);
check('stage3_privateSpine_route_preserved',w.roads461.find(r=>r.id==='privateSpine469')?.points.length===13);
check('orphan_portal_visual_frames_eliminated_when_enabled',
 stageOn?w.boxes.every(o=>o.city20Stage10Portal===undefined||w.entrancePortals[o.city20Stage10Portal]?.interiorReady):
 w.boxes.some(o=>o.city20Stage10Portal!==undefined&&!w.entrancePortals[o.city20Stage10Portal]?.interiorReady));
check('orphan_planter_green_pieces_removed_when_enabled',
 stageOn?w.boxes.every(o=>o.city20Stage16Portal===undefined||w.entrancePortals[o.city20Stage16Portal]?.interiorReady):
 w.boxes.some(o=>o.city20Stage16Portal!==undefined&&!w.entrancePortals[o.city20Stage16Portal]?.interiorReady));
check('orphan_portal_street_pieces_eliminated_when_enabled',
 stageOn?w.boxes.every(o=>o.city20Stage15Portal===undefined||w.entrancePortals[o.city20Stage15Portal]?.interiorReady):
 w.boxes.some(o=>o.city20Stage15Portal!==undefined&&!w.entrancePortals[o.city20Stage15Portal]?.interiorReady));
const entrances=[];
for(const p of ready){
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
 g.avatar.x=p.x;g.avatar.z=p.z-2.5;g.avatar.y=Hh.outdoorHeight(p.x,p.z-2.5);
 let found=g.nearestEntrance()?.id===p.id,begin=false,inside=false,exit=false,lift=false,error=null;
 try{
  begin=g.beginBuildingEntry(p.id);
  if(begin){g.updateBuildingEntry(2);const v=g.indoor;inside=v?.portalId===p.id&&!!v.scene;
   if(inside){
     const bounds=v.scene.bounds,b=w.buildings.find(b=>b.x===p.buildingX&&b.z===p.buildingZ);
     if(p.stage04CompactHotel) {
      const {X,Z}=Hh.interiorExtents450(v.plan.outerShell);
      check('hotel_compact_foyer_inside_existing_footprint',
       X<=b.w*.5-.25&&Z<=b.d*.5-.25,{X,Z,footprint:[b.w,b.d]});
      check('hotel_interior_collision_geometry_exists',v.scene.solids.length>7&&v.scene.boxes.length>35);
      const door=w.stage42Doors.find(d=>d.id===p.id);
      check('hotel_door_visibly_registered',!!door&&door.stage04&&door.width>=3.65);
     }
     const l=v.scene.lift;g.avatar.x=l.x;g.avatar.z=l.z+.45;
     const started=g.startElevatorTo(1);
     if(started){for(let j=0;j<200&&g.indoor?.liftRide;j++)g.updateInterior(.05,0,0);
       lift=g.indoor.floor===1;
       const home=g.indoor.scene.lift;g.avatar.x=home.x;g.avatar.z=home.z+.45;
       if(g.startElevatorTo(0))for(let j=0;j<200&&g.indoor?.liftRide;j++)g.updateInterior(.05,0,0);
     }
     g.avatar.x=g.indoor.scene.entrance.x;g.avatar.z=g.indoor.scene.entrance.z;
     const triggered=g.exitBuilding();
     if(triggered){for(let j=0;j<40&&g.exitTransition;j++)g.stage42UpdateExit(.05);
       exit=!g.indoor&&!g.exitTransition;}
   }
  }
 }catch(e){error=String(e);}
 entrances.push({id:p.id,found,begin,inside,exit,lift,error});
}
for(const [name,key] of [['all_active_doors_locatable','found'],['all_active_entry_transitions','begin'],['all_foyer_scenes_generated','inside'],['all_real_elevators_reach_floor_one','lift'],['all_exit_transitions_return_to_street','exit']])
 check(name,entrances.every(x=>x[key]),{failures:entrances.filter(x=>!x[key]).slice(0,8)});
if(stageOn){
 const p=w.entrancePortals[298],b=w.buildings.find(v=>v.x===p?.buildingX&&v.z===p?.buildingZ);
 check('hotel_not_a_fake_orphan_portal',!!p&&p.interiorReady&&!!b&&b.stage04AccessibleHotel);
 check('hotel_has_actual_open_ground_level_colliders',w.solids.some(s=>Math.abs(s.x+270)<2&&s.z>-18));
 check('hotel_new_entrance_on_land_not_car_lane',Hh.reference469.coast(p.x,p.z)>3&&!Hh.coast461.isRouteRoad(p.x,p.z-1.85));
 check('hotel_new_entry_is_indexed_at_end',p.id===298);
 check('stage04_report_records_real_surgery',w.stage04AccessStats?.oneCompactHotelOpened===true&&w.stage04AccessStats?.orphanVisualsRemoved===3152,w.stage04AccessStats);
 check('surviving_84_buildings_100percent_access',liveReady.length===w.buildings.length);
 check('no_existing_portals_reclassified_ready_without_buildings',w.entrancePortals.slice(0,298).filter(p=>p.interiorReady).length===83);
 const y=Hh.cityTerrain42(b.x,b.z), half=1.8,z0=p.z-1.9,z1=b.z+2.5;
 const blocked=[];
 for(let z=z0;z<=z1+.01;z+=.43){
   const nearest=w.nearby(p.x,z);
   const hit=nearest.filter(s=>Math.abs(s.x-p.x)<s.hw+.65&&Math.abs(s.z-z)<s.hd+.65);
   if(hit.length)blocked.push({z,hit:hit.length});
 }
 check('hotel_doorway_cleared_in_actual_collision_index',blocked.length===0,{blocked:blocked.slice(0,10)});
}
const report={stage:4,mode:stageOn?'enabled':'disabled',scope:'Real game logic + FAKE renderer: CPU-only, not real WebGL',total:cases.length,passed:cases.filter(t=>t.pass).length,results:cases,summary:{active:ready.length,totalPortals:w.entrancePortals.length,activeWorldBuildings:w.buildings.length,orphanRecords:stale.length,removedOrphanVisuals:w.stage04AccessStats?.orphanVisualsRemoved||0,gameplayPathsTested:entrances.length}};
const file=require('path').join(root,`QA/STAGE04_${stageOn?'ENABLED':'DISABLED'}_ACCEPTANCE.json`);
require('fs').writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mode:report.mode,total:report.total,passed:report.passed,summary:report.summary,failures:cases.filter(t=>!t.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
