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
ctx.__setMockTime=(ms)=>{current=ms;};
if(process.env.STAGE18_CROC_LOD_OFF==='1')ctx.__SUNSET_STAGE18_LOD_OFF=true;
if(process.env.STAGE20_NAV_OFF==='1')ctx.__SUNSET_STAGE20_NAV_OFF=true;
if(process.env.STAGE21_CCD_OFF==='1')ctx.__SUNSET_STAGE21_CCD_OFF=true;
if(process.env.STAGE27_ROADS_OFF==='1')ctx.__SUNSET_STAGE27_ROADS_OFF=true;
if(process.env.STAGE28_FACADES_OFF==='1')ctx.__SUNSET_STAGE28_FACADES_OFF=true;
if(process.env.STAGE29_INTERIORS_OFF==='1')ctx.__SUNSET_STAGE29_INTERIORS_OFF=true;
if(process.env.STAGE06_DOORS_OFF==='1')ctx.__SUNSET_STAGE06_DOORS_OFF=true;
if(process.env.STAGE07_ALIGNMENT_OFF==='1')ctx.__SUNSET_STAGE07_ALIGN_OFF=true;
if(process.env.STAGE08_WINDOWS_OFF==='1')ctx.__SUNSET_STAGE08_WINDOWS_OFF=true;
if(process.env.STAGE09_AUDIT_OFF==='1')ctx.__SUNSET_STAGE09_AUDIT_OFF=true;
if(process.env.STAGE10_PLANTERS_OFF==='1')ctx.__SUNSET_STAGE10_PLANTERS_OFF=true;
if(process.env.STAGE11_LAMPS_OFF==='1')ctx.__SUNSET_STAGE11_LAMPS_OFF=true;
if(process.env.STAGE12_PROPS_OFF==='1')ctx.__SUNSET_STAGE12_PROPS_OFF=true;
if(process.env.STAGE13_LOBBIES_OFF==='1')ctx.__SUNSET_STAGE13_LOBBIES_OFF=true;
if(process.env.STAGE14_LIGHTS_OFF==='1')ctx.__SUNSET_STAGE14_LIGHTS_OFF=true;
if(process.env.STAGE15_INTERIORS_OFF==='1')ctx.__SUNSET_STAGE15_INTERIORS_OFF=true;
if(process.env.STAGE16_GLASS_OFF==='1')ctx.__SUNSET_STAGE16_GLASS_OFF=true;
if(process.env.STAGE17_RETAIL_OFF==='1')ctx.__SUNSET_STAGE17_RETAIL_OFF=true;
if(process.env.STAGE05_ENTRIES_OFF==='1')ctx.__SUNSET_STAGE05_ENTRIES_OFF=true;
if(process.env.STAGE04_ACCESS_OFF==='1')ctx.__SUNSET_STAGE04_ACCESS_OFF=true;ctx.addEventListener=()=>{};ctx.matchMedia=()=>({matches:false});ctx.innerWidth=1920;ctx.innerHeight=1080;
vm.createContext(ctx);
const scripts=[...html.matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
for(const script of scripts){let code=read(script);if(script==='engine44.js')code=code.replace('if (typeof Heatline.installPhysicsRecovery4', 'globalThis.__Recovery07GameClass=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(code,{filename:script}).runInContext(ctx,{timeout:60000});}
const H=ctx.Heatline;class Renderer{constructor(canvas){this.canvas=canvas;this.name='FAKE RENDERER FOR CPU QA';this.renderNative475=true;this.renderPolicy475='native1080';this.nativeTier475=0;this.superSample450=1;this.visibleObjects=[];this.width=1920;this.height=1080;}setQuality(){}resize(){}draw(){} }
// Render backend intentionally replaced, the real game world/movement/updateHUD stays intact.
ctx.__Stage23RealGLRenderer=H.GLRenderer;
H.GLRenderer=Renderer;
H.CanvasRenderer=Renderer;
ctx.__Stage18OriginalWildlifeRenderer=H.Wildlife43Renderer;
H.Wildlife43Renderer=class{constructor(){this.ready=false;}prepare(){}has(){return false}selectUrban(){return false}draw(){}status(){return {supported:false}}};


module.exports={H:ctx.Heatline,ctx,g:new ctx.__Recovery07GameClass};
