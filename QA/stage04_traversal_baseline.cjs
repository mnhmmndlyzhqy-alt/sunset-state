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

const g=new ctx.__Recovery07GameClass, Hh=ctx.Heatline,w=g.world;g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
const onFoot={running:g.running,inVehicle:g.inVehicle,onTram:g.onTram,onBus:g.onBus,inside:g.inside};
const portals=w.entrancePortals.filter(p=>p.interiorReady);
const statuses=[];
for(const p of portals){
 let success=false,entry=null,exited=false,plan=null,near=null,error=null;
 try {
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
 g.avatar.x=p.x;g.avatar.z=p.z-2.6;g.avatar.y=Hh.outdoorHeight(p.x,p.z-2.6);
 near=g.nearestEntrance()?.id??null;
 success=g.beginBuildingEntry(p.id);
 if(success){g.updateBuildingEntry(1.5);entry=g.indoor?.portalId===p.id;
 const scene=g.indoor?.scene;
 plan=g.indoor?.plan;
 const d=Math.hypot(g.avatar.x-(scene?.entrance?.x??0),g.avatar.z-(scene?.entrance?.z??0));
 g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z;
 exited=g.exitBuilding();for(let k=0;k<30&&g.exitTransition;k++)g.stage42UpdateExit(.1);
 exited=exited&&!g.indoor&&g.exitTransition===null;
 statuses.push({id:p.id,success,entry,exited,near,sceneEnterDistance:d,sceneBounds:scene.bounds,portal:[p.x,p.z],foyer:plan?.foyer});
 }else statuses.push({id:p.id,success,entry,exited,near});
 }catch(e){error=String(e);statuses.push({id:p.id,success,entry,exited,near,error});}
}
const found=x=>statuses.filter(s=>!s[x]).map(s=>({id:s.id,error:s.error,near:s.near}));
const stats={total:statuses.length,entryFailed:found('success'),sceneFailed:found('entry'),exitFailed:found('exited'),nearMismatch:statuses.filter(s=>s.near!==s.id).map(s=>({id:s.id,near:s.near})),sceneBoundIssues:statuses.filter(s=>s.sceneEnterDistance>4.2).map(s=>({id:s.id,d:s.sceneEnterDistance})),statuses};
console.log(JSON.stringify({total:stats.total,entryFailed:stats.entryFailed.length,sceneFailed:stats.sceneFailed.length,exitFailed:stats.exitFailed.length,nearMismatch:stats.nearMismatch.length,sceneBoundIssues:stats.sceneBoundIssues.length,failedSample:[...stats.entryFailed,...stats.sceneFailed,...stats.exitFailed,...stats.sceneBoundIssues].slice(0,8)},null,2));
require('fs').writeFileSync(require('path').join(root,'QA/STAGE04_BASELINE_TRAVERSAL.json'),JSON.stringify(stats,null,2));
