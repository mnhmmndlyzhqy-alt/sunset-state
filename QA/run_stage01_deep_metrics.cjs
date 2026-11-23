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

const g=new ctx.__Recovery07GameClass;
const w=g.world;
const count=(a)=>a?.length??null;
const stageNums=Array.from({length:15},(_,i)=>i+2);
const stats={source:'runtime built in isolated VM with fake renderer; not GPU',roads:count(w.roads461),portals:count(w.entrancePortals),collisions:count(w.solids),propertyCollisions:count(w.propSolids),geometry:count(w.boxes),glassPanels:count(w.glassPanels),buildingsMapped:count(w.city20DistrictBuildings),portalsReady:w.entrancePortals.filter(q=>q.interiorReady).length,portalsWaterClassified:w.entrancePortals.filter(p=>H.reference469.coast(p.x,p.z)<.1).length,portalsReadyInWater:w.entrancePortals.filter(p=>p.interiorReady&&H.reference469.coast(p.x,p.z)<.1).length,entranceFacingTypes:{},assets:{},stageGeometry:{},roadMetrics:{},game:{}};
for(const p of w.entrancePortals)stats.entranceFacingTypes[p.facing]=(stats.entranceFacingTypes[p.facing]||0)+1;
for(const n of stageNums){const s=w['city20Stage'+String(n).padStart(2,'0')+'Stats'];if(s)stats.stageGeometry[n]={added:s.geometryAdded??null,colliders:s.collisionAdded??s.collisionsAdded??null,portalsDetailed:s.portalsDetailed??null,windows:s.windowPanels??null,decorated:s.decoratedLobbies??null};}
for(const f of ['START_GAME.html','engine44.js',...scripts]){const st=fs.statSync(path.join(root,f));stats.assets[f]=st.size;}
const dir=path.join(root,'assets'),assets=fs.readdirSync(dir,{recursive:true,withFileTypes:true});let total=0,num=0;for(const it of assets){if(it.isFile()){const a=fs.statSync(path.join(it.parentPath,it.name));total+=a.size;num++;}}stats.assets.summary={assetFiles:num,assetsBytes:total,jsFileBytes:scripts.filter(s=>s.startsWith('assets/')).reduce((t,s)=>t+fs.statSync(path.join(root,s)).size,0)};
const sharp=[], steep=[], yjumps=[], turnStats=[];let roadSamples=0,verySteep=0,roadsWithSharp=0,zeroSampleSteps=0,segments=0;
for(const road of w.roads461){
 const pts=road.points||[],samp=road.samples||[];roadSamples+=samp.length;
 let bends=0;
 for(let j=1;j<pts.length-1;j++){
 const a=pts[j-1],b=pts[j],c=pts[j+1],d1=Math.hypot(b.x-a.x,b.z-a.z),d2=Math.hypot(c.x-b.x,c.z-b.z);
 if(d1<.02||d2<.02)continue;
 const cos=((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(d1*d2),degrees=Math.acos(Math.min(1,Math.max(-1,cos)))*180/Math.PI;
 if(degrees>95){bends++;sharp.push({route:road.id,index:j,angle:+degrees.toFixed(1),x:+b.x.toFixed(2),z:+b.z.toFixed(2),before:+d1.toFixed(1),after:+d2.toFixed(1)});}
 }
 if(bends)roadsWithSharp++;
 for(let j=1;j<samp.length;j++){
  const a=samp[j-1],b=samp[j],distance=Math.hypot(b.x-a.x,b.z-a.z),delta=(b.y??0)-(a.y??0);
  if(distance<.01){zeroSampleSteps++;continue;}
  segments++;
  const grade=Math.abs(delta)/distance;
  if(grade>.24){verySteep++;steep.push({route:road.id,index:j,percent:+(grade*100).toFixed(1),distance:+distance.toFixed(2),delta:+delta.toFixed(2),x:+a.x.toFixed(2),z:+a.z.toFixed(2)})}
  if(Math.abs(delta)>1.25&&distance<2){yjumps.push({route:road.id,index:j,dy:+delta.toFixed(2),horizontal:+distance.toFixed(2)})}
 }
}
stats.roadMetrics={samples:roadSamples,segments,sharpBendsOver95:sharp.length,roadsWithSharp,steepEdgesOver24Percent:verySteep,zeroLengthSampleSteps:zeroSampleSteps,sharp:sharp.sort((a,b)=>b.angle-a.angle).slice(0,24),steep:steep.sort((a,b)=>b.percent-a.percent).slice(0,24),yjumps:yjumps.slice(0,24)};
const unsafe=b=>H.reference469.coast(b.x,b.z)<.1||H.coast461.isRouteRoad(b.x,b.z);
for(const kind of ['planter-shrub','tree-trunk','garden-shrub']){const item=w.boxes.filter(b=>b.city20Stage16Kind===kind);stats.stageGeometry[kind]={total:item.length,unsafe:item.filter(unsafe).length};}
for(const kind of ['glazing','wall-panel','light-strip','store-sign-band','streetlamp-head']){stats.stageGeometry[kind]=w.boxes.filter(b=>b.city20Stage09Kind===kind||b.city20Stage11Kind===kind||b.city20Stage14Kind===kind||b.city20Stage15Kind===kind).length;}
stats.game={pedestrians:count(g.pedestrians),parked:count(g.parked),civilian:count(g.civilian),police:count(g.police),buses:count(g.buses),trams:count(g.trams),officers:count(g.officers),weather:g.weather,clock:g.worldHour};
console.log(JSON.stringify(stats,null,2));
fs.writeFileSync(path.join(root,'QA/STAGE01_15_DEEP_METRICS.json'),JSON.stringify(stats,null,2)+'\n');
