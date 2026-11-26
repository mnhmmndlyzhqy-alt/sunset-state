'use strict';
/* Genuine Stage 51 scripts and Game, with a deliberately simulated DOM/render
 * surface. This exercises integration and simulation, NOT browser pixels/GPU. */
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=process.env.STAGE51_SOURCE_ROOT?fs.realpathSync(process.env.STAGE51_SOURCE_ROOT):path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');
const warnings=[], errors=[], listeners=new Map(), elements=new Map();
let time=0, timerId=0;
const timers=new Map();
class Classes {
  constructor(value=''){this.val=new Set(value.split(/\s+/).filter(Boolean));}
  add(...s){for(const x of s)this.val.add(x);}
  remove(...s){for(const x of s)this.val.delete(x);}
  contains(x){return this.val.has(x);}
  toggle(x,b){if(b===undefined)b=!this.val.has(x);b?this.val.add(x):this.val.delete(x);return b;}
}
function matches(el,sel){
  sel=sel.trim();
  if(sel.includes(','))return sel.split(',').some(s=>matches(el,s));
  if(/\s/.test(sel)&&!sel.startsWith('[')){
    const parts=sel.split(/\s+/),last=parts.pop();
    if(!matches(el,last))return false;
    for(let parent=el.parentElement;parent;parent=parent.parentElement)if(matches(parent,parts.join(' ')))return true;
    return false;
  }
  if(sel.startsWith('#'))return el.id===sel.slice(1);
  if(sel.startsWith('.'))return el.classList.contains(sel.slice(1));
  const a=sel.match(/^\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if(a)return a[2]===undefined?el.getAttribute(a[1])!==null:el.getAttribute(a[1])===a[2];
  if(/^[a-z][a-z0-9-]*$/i.test(sel))return el.tagName===sel.toUpperCase();
  return false;
}
const ctx2d=new Proxy({measureText:t=>({width:String(t).length*7}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
class El {
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();this.id='';this.style={setProperty(){},removeProperty(){}};this.classList=new Classes();this.dataset={};this.children=[];this.listeners={};this.attributes={};
    this.parentElement=null;this.value='';this._text='';this._html='';this.width=1920;this.height=1080;this.hidden=false;this.disabled=false;this.scrollTop=0;this.scrollHeight=1000;this.clientHeight=500;this.clientWidth=1920;
  }
  get className(){return [...this.classList.val].join(' ');}set className(v){this.classList=new Classes(v);}
  get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('');}set textContent(v){this._text=String(v);this.children=[];}
  get innerText(){return this.textContent;}get innerHTML(){return this._html;}set innerHTML(v){this._html=String(v);this._text='';this.children=[];parseMarkup(this,this._html);}
  addEventListener(k,f,opts){(this.listeners[k]||=[]).push({f,once:!!opts?.once});}
  removeEventListener(k,f){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x.f!==f);}
  dispatchEvent(e){e.target||=this;for(const l of [...(this.listeners[e.type]||[])]){l.f(e);if(l.once)this.removeEventListener(e.type,l.f);}return true;}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);elements.set(this.id,this);}if(k==='class')this.className=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=String(v);}
  getAttribute(k){return Object.hasOwn(this.attributes,k)?this.attributes[k]:null;}
  removeAttribute(k){delete this.attributes[k];}
  append(...nodes){for(const x of nodes)this.appendChild(x);}prepend(...nodes){for(const x of nodes.reverse()){x.parentElement=this;this.children.unshift(x);}}
  appendChild(x){x.parentElement=this;this.children.push(x);if(x.id)elements.set(x.id,x);return x;}
  replaceChildren(...xs){this.children=[];this.append(...xs);}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
  replaceWith(x){if(this.parentElement){const p=this.parentElement,i=p.children.indexOf(this);p.children[i]=x;x.parentElement=p;}}
  cloneNode(){const x=new El(this.tagName);x.id=this.id;return x;}
  querySelectorAll(s){return this.children.flatMap(x=>[...(matches(x,s)?[x]:[]),...x.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){return matches(this,s)?this:this.parentElement?.closest(s)||null;}
  matches(s){return matches(this,s);}
  contains(x){return x===this||this.children.some(c=>c.contains(x));}
  focus(){document.activeElement=this;}blur(){if(document.activeElement===this)document.activeElement=null;}
  click(){this.dispatchEvent({type:'click',target:this,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});}
  setPointerCapture(){}releasePointerCapture(){}hasPointerCapture(){return false;}scrollIntoView(){}
  getBoundingClientRect(){return {left:0,top:0,right:1920,bottom:1080,width:1920,height:1080};}
  getContext(type){return type==='webgl2'?null:ctx2d;}
}
const body=new El('body'),head=new El('head');
class HTMLInputElement extends El {constructor(){super('input');}}
class HTMLTextAreaElement extends El {constructor(){super('textarea');}}
class HTMLSelectElement extends El {constructor(){super('select');}}
const createElement=tag=>({input:()=>new HTMLInputElement(),textarea:()=>new HTMLTextAreaElement(),select:()=>new HTMLSelectElement()}[tag.toLowerCase()]?.()||new El(tag));
// Parse ordinary UI templates only. This supports real chat/modal DOM wiring,
// but deliberately supplies no layout engine, browser event loop or rendering.
function parseMarkup(parent,html){
 const stack=[parent],voids=new Set(['input','br','img','meta','link','hr','area','base','col','embed','param','source','track','wbr']);
 for(const token of html.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)){
  const m=token[0].match(/^<(\/?)([a-z][\w-]*)\b([^>]*)>/i);
  if(!m){stack.at(-1)._text+=token[0].replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');continue;}
  const tag=m[2].toLowerCase();
  if(m[1]){for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===tag.toUpperCase()){stack.length=i;break;}continue;}
  const el=createElement(tag);
  for(const a of m[3].matchAll(/([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)'|\s*=\s*([^\s>]+))?/g))el.setAttribute(a[1],a[2]??a[3]??a[4]??'');
  el.value=el.getAttribute('value')||'';el.type=el.getAttribute('type')||'';el.hidden=el.getAttribute('hidden')!==null;el.disabled=el.getAttribute('disabled')!==null;
  stack.at(-1).appendChild(el);if(!voids.has(tag)&&!token[0].endsWith('/>'))stack.push(el);
 }
}
const document={hidden:false,visibilityState:'visible',readyState:'loading',body,head,activeElement:null,
 createElement,getElementById:id=>elements.get(id)||null,
 querySelectorAll:s=>[...head.querySelectorAll(s),...body.querySelectorAll(s)],
 querySelector:s=>document.querySelectorAll(s)[0]||null,
 addEventListener:(k,f,o)=>addListener('document:'+k,f,o),removeEventListener:(k,f)=>removeListener('document:'+k,f),
 createTextNode:t=>{const e=new El('#text');e.textContent=t;return e;},exitPointerLock(){},documentElement:new El('html')};
document.documentElement.append(head,body);
// IDs, dataset, controls, and nesting from the actual HTML before game scripts.
const stack=[body];
const surface=html.slice(html.indexOf('<body'),html.indexOf('<script>globalThis.__SUNSET44_SPLIT'));
for(const m of surface.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)){
 const closing=m[0][1]==='/',tag=m[1].toLowerCase();if(tag==='body')continue;
 if(closing){if(stack.length>1&&stack.at(-1).tagName===tag.toUpperCase())stack.pop();continue;}
 const el=createElement(tag);for(const a of m[2].matchAll(/([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g)){el.setAttribute(a[1],a[2]??a[3]??'');}
 el.value=el.getAttribute('value')||'';el.hidden=el.getAttribute('hidden')!==null;el.disabled=el.getAttribute('disabled')!==null;
 stack.at(-1).appendChild(el);if(!['input','br','img','meta','link','hr','path','circle','rect','i'].includes(tag)&&!m[0].endsWith('/>'))stack.push(el);
}
// SVG parsing above is intentionally minimal; controller lookup uses real ids.
for(const m of html.matchAll(/\bid="([^"]+)"/g))if(!elements.has(m[1])){const e=new El();e.setAttribute('id',m[1]);body.appendChild(e);}
if(elements.get('heat-lamps'))elements.get('heat-lamps').replaceChildren(...Array.from({length:6},()=>new El('i')));
function addListener(k,f,o){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push({f,once:!!o?.once});}
function removeListener(k,f){listeners.set(k,(listeners.get(k)||[]).filter(x=>x.f!==f));}
function dispatch(k,e={}){e.type||=k; e.preventDefault||=()=>{};e.stopPropagation||=()=>{};e.stopImmediatePropagation||=()=>{};for(const l of [...(listeners.get(k)||[])]){l.f(e);if(l.once)removeListener(k,l.f);}}
const storage=new Map();
const ctx={console:{log:console.log,warn:(...x)=>warnings.push(x.map(String).join(' ')),error:(...x)=>errors.push(x.map(String).join(' '))},
 Buffer,structuredClone,Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,TextEncoder,TextDecoder,Math,Date,URL,URLSearchParams,Blob,AbortController,AbortSignal,DOMException,document,HTMLInputElement,HTMLTextAreaElement,HTMLSelectElement,
 Event:class {constructor(type,o={}){this.type=type;Object.assign(this,o);}preventDefault(){}stopPropagation(){}stopImmediatePropagation(){}},
 screen:{width:1920,height:1080},devicePixelRatio:1,innerWidth:1920,innerHeight:1080,navigator:{userAgent:'STAGE51 CPU integration; no browser renderer'},
 Image:class {constructor(){this.complete=true;this.width=1024;this.height=1024;}set src(s){this._src=s;}get src(){return this._src||'';}},
 Audio:class {constructor(){this.paused=true;this.ended=false;this.volume=0;}addEventListener(){}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}},
 performance:{now:()=>time},requestAnimationFrame:()=>0,cancelAnimationFrame(){},location:{search:process.env.STAGE51_QUERY||'',protocol:'http:',href:'http://localhost:8765/'},
 localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
 setTimeout:(f,ms=0)=>{const id=++timerId;timers.set(id,{f,at:time+Math.max(0,ms)});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++timerId,clearInterval(){},
 atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
 addEventListener:(k,f,o)=>addListener(k,f,o),removeEventListener:removeListener,dispatchEvent:e=>dispatch(e.type,e),matchMedia:()=>({matches:false}),confirm:()=>true,
 fetch:async url=>{const rel=String(url).replace(/^https?:\/\/[^/]+\//,'').split('?')[0];const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return {ok:false,status:404};const b=fs.readFileSync(file);return {ok:true,status:200,json:async()=>JSON.parse(b.toString('utf8')),text:async()=>b.toString('utf8'),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}
};
ctx.globalThis=ctx;ctx.window=ctx;ctx.KeyboardEvent=ctx.Event;
// Reproducible CPU-only scenarios can opt into a stable random stream.
if(process.env.SUNSET_QA_SEED!==undefined){
 let seed=Number(process.env.SUNSET_QA_SEED)>>>0;
 ctx.Math=Object.create(Math);
 ctx.Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^(seed>>>15),1|seed);x^=x+Math.imul(x^(x>>>7),61|x);return ((x^(x>>>14))>>>0)/4294967296;};
}
vm.createContext(ctx);
const scripts=[...html.matchAll(/<script\b([^>]*?)src="([^"\n]+)"([^>]*)>/g)].filter(m=>!m[1].includes('module')&&!m[3].includes('module')).map(m=>m[2].split('?')[0]);
for(const extra of (process.env.SUNSET_QA_EXTRA_SCRIPTS||'').split(',').filter(Boolean)){
 if(!/^assets\/stage5[234]_[a-z_]+\.js$/.test(extra))throw Error('Invalid extra QA script: '+extra);
 if(!scripts.includes(extra))scripts.push(extra);
}
for(const script of scripts){
 let code=read(script);
 if(script==='engine44.js')code=code.replace('if (typeof Heatline.installPhysicsRecovery4','globalThis.__Stage51Game=Game; if (typeof Heatline.installPhysicsRecovery4');
 new vm.Script(code,{filename:script}).runInContext(ctx,{timeout:90000});
}
const H=ctx.Heatline;
const realRenderer=H.GLRenderer, realWildlife=H.Wildlife43Renderer;
class Renderer {
 constructor(canvas){this.canvas=canvas;this.name='CPU TEST SURFACE; NO GPU';this.renderNative475=true;this.renderPolicy475='native1080';this.nativeTier475=0;this.superSample450=1;this.visibleObjects=[];this.width=1920;this.height=1080;this.qualityScale=1;this.rcResScale=1;this.premium43=null;}
 setQuality(){}resize(){}draw(){}setResolutionScale(v){this.rcResScale=v;}
}
H.GLRenderer=Renderer;H.CanvasRenderer=Renderer;
H.Wildlife43Renderer=class{constructor(){this.ready=false;}prepare(){}has(){return false;}selectUrban(){return false;}draw(){}status(){return {supported:false};}};
H.installRealismCore(ctx.__Stage51Game);
const g=new ctx.__Stage51Game();ctx.__SUNSET_PERFORMANCE06_GAME=g;
document.readyState='complete';
dispatch('document:DOMContentLoaded');
// Cosmetic canvases are stubs; full gameplay and all original HUD methods stay real.
function advance(ms){time+=ms;for(const [id,t] of [...timers])if(t.at<=time){timers.delete(id);t.f();}}
module.exports={H,g,ctx,document,El,storage,elements,warnings,errors,dispatch,advance,scripts,realRenderer,realWildlife,root};
