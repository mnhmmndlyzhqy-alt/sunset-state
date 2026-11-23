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

const plans=new Map(w.structuralPlans.filter(p=>p?.outerShell).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
const buildings=new Map(w.buildings.map(b=>[`${b.x},${b.z}`,b]));
const all=w.entrancePortals;
const classify=p=>{
 const plan=plans.get(`${p.buildingX},${p.buildingZ}`),b=buildings.get(`${p.buildingX},${p.buildingZ}`);
 const shell=b?.shell38||b?.lobbyShell443;
 const d=Math.hypot((p.x-(b?.x??p.x)),(p.z-(b?.z??p.z)));
 const water=H.reference469.coast(p.x,p.z)<.1;
 const onRoad=!!H.coast461?.isRouteRoad?.(p.x,p.z);
 const before={x:p.x,z:p.z-2.1};
 const roadNear=!!H.coast461?.isRouteRoad?.(before.x,before.z);
 const near=w.nearby(before.x,before.z)||[];
 const obstacles=near.filter(s=>Math.abs(s.x-before.x)<s.hw+.8&&Math.abs(s.z-before.z)<s.hd+.8);
 return {id:p.id,ready:p.interiorReady,plan:!!plan,planReady:!!plan?.interiorReady, shell:!!shell, b:!!b, bw:b?.w,bd:b?.d,bh:b?.h,planFoyer:!!plan?.foyer,water,onRoad,roadNear,obstacles:obstacles.length,coords:[p.x,p.z],bcoords:[p.buildingX,p.buildingZ],entrance:plan?.entrance,dist:d};
};
const info=all.map(classify),unready=info.filter(x=>!x.ready),ready=info.filter(x=>x.ready);
const counts = arr => ({length:arr.length,withPlan:arr.filter(x=>x.plan).length,withShell:arr.filter(x=>x.shell).length,withPlanAndShell:arr.filter(x=>x.plan&&x.shell).length,withPlanUnready:arr.filter(x=>x.plan&&!x.planReady).length,withPlanAndFoyer:arr.filter(x=>x.plan&&x.planFoyer).length,nonwater:arr.filter(x=>!x.water).length,allPlanNonwater:arr.filter(x=>x.plan&&x.shell&&!x.water).length,withRoad:arr.filter(x=>x.roadNear).length,clearApproach:arr.filter(x=>!x.obstacles).length});
const out={counts:{ready:counts(ready),unready:counts(unready)},unready:unready.slice(0,60),candidates:unready.filter(x=>x.plan&&x.shell&&!x.water&&!x.roadNear).slice(0,100),world:{solids:w.solids.length,boxes:w.boxes.length,portals:w.entrancePortals.length,plans:w.structuralPlans.length,stage42DoorStats:w.stage42DoorStats}};
console.log(JSON.stringify(out.counts,null,2));console.log('world',JSON.stringify(out.world)); console.log('buildings', w.buildings.length, 'with valid portal',w.buildings.filter(b=>all.some(p=>p.interiorReady&&p.buildingX===b.x&&p.buildingZ===b.z)).length); console.log('buildings without accessible',JSON.stringify(w.buildings.filter(b=>!all.some(p=>p.interiorReady&&p.buildingX===b.x&&p.buildingZ===b.z)).slice(0,30).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d,h:b.h,shell:!!(b.shell38||b.lobbyShell443),kind:b.kind})))); console.log('city20mapped',w.city20DistrictBuildings?.length)
require('fs').writeFileSync(require('path').join(root,'QA/STAGE04_BASELINE_CANDIDATES.json'),JSON.stringify(out,null,2));

const b=w.buildings.find(b=>b.x===-270&&Math.abs(b.z+21.2)<1);
const qx=-270,qz=-21.2;
console.log('Hotel:',JSON.stringify(b));
console.log('nearby plans:',JSON.stringify(w.structuralPlans.filter(p=>Math.hypot(p.outerShell.x-qx,p.outerShell.z-qz)<80).map(p=>({x:p.outerShell.x,z:p.outerShell.z,interiorReady:p.interiorReady,foyer:p.foyer})).slice(0,12)));
console.log('nearby meshes',JSON.stringify(w.boxes.filter(o=>Math.hypot(o.x-qx,o.z-qz)<8&&o.h>3&&o.layer>=4).slice(0,35).map(o=>({x:o.x,y:o.y,z:o.z,w:o.w,h:o.h,d:o.d,shape:o.shape,material:o.material,layer:o.layer}))));
console.log('nearby solids',JSON.stringify(w.solids.filter(s=>Math.hypot(s.x-qx,s.z-qz)<45).slice(0,35)));
console.log('nearby retail',JSON.stringify(w.retailShops.filter(s=>Math.hypot(s.x-qx,s.z-qz)<60).slice(0,10)));

const d=w.buildings.find(b=>b.x===-270&&Math.abs(b.z+21.2)<1),z=d.z-d.d*.5-.57;
console.log('hotel terrain', JSON.stringify({door:[d.x,z],coast:H.reference469.coast(d.x,z),core:H.coast461.keepCity(d.x,z),land:H.coast461.land(d.x,z),road:H.coast461.isRouteRoad(d.x,z-1.85),cityTerrain:H.cityTerrain42(d.x,d.z),outdoorHeight:H.outdoorHeight(d.x,z),interiorExtents:H.interiorExtents450(d)}));

const validIds=new Set(w.entrancePortals.filter(p=>p.interiorReady).map(p=>p.id));
for(const name of ['city20Stage10Portal','city20Stage15Portal','city20Stage14Portal','city20Stage16Portal','interiorRecovery2Portal']){
 const items=w.boxes.filter(b=>b[name]!==undefined);
 console.log('orphan visuals',name,items.length,items.filter(b=>!validIds.has(b[name])).length);
}
