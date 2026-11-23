'use strict';
/* User-facing QA collector tests with fake DOM/renderer; no WebGL or browser screenshot claimed. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'QA/STAGE26_25_FINDINGS_BROWSER.js'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'QA/STAGE01_15_BUG_REGISTER.json'),'utf8'));
let checks=[];const verify=(label,condition,extra)=>{checks.push({label,passed:!!condition});if(!condition)console.error('FAIL',label,JSON.stringify(extra)?.slice(0,250));};
function fakeEnv(search){
 const items=[],ls=new Map(),timers=[],calls={canvas:0,draw:0,downloads:0,persist:0};
 class Elem{constructor(tag='div'){this.tag=tag;this.style={};this.children=[];this.listeners={};this.value='';this._text='';this.id='';this.href='';this.download='';this.parent=null;}
  get textContent(){return this._text;}set textContent(v){this._text=String(v);}
  append(...a){for(const c of a){c.parent=this;this.children.push(c);}}appendChild(c){this.append(c);return c;}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}click(){calls.downloads++;}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(v=>v!==this);this.parent=null;}}
  setAttribute(a,b){this[a]=b;}
 }
 const body=new Elem('body'),document={readyState:'complete',body,activeElement:null,createElement:t=>new Elem(t),addEventListener(){}};
 const window={};let draw=function(){calls.draw++;return 'ok';};
 const canvas={width:1920,height:1080,toDataURL(){calls.canvas++;return 'data:image/png;base64,'+'A'.repeat(6000);}};
 const game={running:true,inside:false,retailVisit:null,world:{roads461:new Array(52),entrancePortals:[{interiorReady:true},{interiorReady:false}],retailShops:new Array(59),glassPanels:new Array(988),boxes:new Array(194555),solids:new Array(3230),propSolids:new Array(796)},
  avatar:{x:100,z:42},stage39Life:{wildlife:[{kind:'crocodile'}]},renderer:{canvas,name:'Test WebGL2 fixture',gl:{VERSION:1,RENDERER:2,VENDOR:3,getParameter(x){return({1:'WebGL 2.0 fixture',2:'Test Device',3:'Test Vendor'})[x];}},draw}};
 const ctx={window,globalThis:window,document,location:{search},URLSearchParams,Math,JSON,Date,Blob:class{constructor(data,opts){this.data=data;this.opts=opts;}},
 URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},localStorage:{getItem(k){return ls.get(k)||null},setItem(k,v){calls.persist++;ls.set(k,v);}},
 setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},console};
 Object.assign(window,{window,globalThis:window,document,location:ctx.location,URLSearchParams,Blob:ctx.Blob,URL:ctx.URL,localStorage:ctx.localStorage,setTimeout:ctx.setTimeout,console});
 vm.createContext(ctx);new vm.Script(src,{filename:'STAGE26_25_FINDINGS_BROWSER.js'}).runInContext(ctx,{timeout:3000});
 return{ctx,window,game,body,ls,calls,timers};
}
const baseline=fakeEnv('');
verify('normal gameplay no QA globals',!baseline.window.__SUNSET_STAGE26_QA);
verify('normal gameplay untouched DOM',baseline.body.children.length===0);
verify('normal gameplay no timers',baseline.timers.length===0);
verify('normal gameplay no extra storage',baseline.calls.persist===0);
const e=fakeEnv('?stage26qa=1');const S=e.window.__SUNSET_STAGE26_QA;
verify('explicit query enables diagnostics',!!S);
verify('25 original issues present',S.issues.length===25);
verify('issue IDs identical to original register',S.issues.map(x=>x.id).join('|')===registry.findings.map(x=>x.id).join('|'));
verify('QA overlay created',!!e.body.children.find(x=>x.id==='sunset-stage26-evidence'));
verify('no screenshot before game starts',S.captureFrame().ok===false);
verify('missing game diagnostic is not forged',S.snapshot().gameLoaded===false);
verify('initial report not tested',S.exportReport().byStatus.notTested===25);
verify('initial report has no GPU claims',!S.exportReport().certified50Fps1080p&&!S.exportReport().verifiedHardwareGpuByThisTool);
verify('reject unknown issue id',S.setMark('BOGUS','pass','bad')===false);
verify('reject noncanonical mark',S.setMark(S.issues[0].id,'gpu_verified','bad')===false);
e.window.__SUNSET_PERFORMANCE06_GAME=e.game;
verify('game snapshot uses real in-memory game',S.snapshot().gameLoaded&&S.snapshot().world.roads===52&&S.snapshot().world.glass===988);
verify('fullHD canvas dimensions recorded without passing GPU',S.snapshot().display.canvas.join(',')==='1920,1080'&&!S.exportReport().verifiedHardwareGpuByThisTool);
verify('manual PASS can be recorded',S.setMark(S.issues[0].id,'pass','checked visible entrance'));
verify('PASS is marked as user judgment',S.records[S.issues[0].id].provenance.includes('manual judgement'));
verify('manual record keeps scene position',S.records[S.issues[0].id].snapshot.position.join(',')==='100,42');
verify('manual counts right',S.exportReport().byStatus.pass===1&&S.exportReport().byStatus.notTested===24);
verify('manual records persisted',e.calls.persist>=1);
const renderer=e.game.renderer,drawRef=renderer.draw;const started=S.captureFrame(S.issues[0].id);
verify('real frame capture is queued',started.ok&&started.pending&&renderer.draw!==drawRef);
renderer.draw();
verify('capture executes real draw first',e.calls.draw===1&&e.calls.canvas===1);
verify('capture restores original renderer',renderer.draw===drawRef);
verify('capture triggers local image download',e.calls.downloads===1&&S.capturedFrames===1);
verify('capture tracks file by manual finding',S.records[S.issues[0].id].screenshots.length===1&&S.records[S.issues[0].id].screenshots[0].includes(S.issues[0].id));
verify('capture does not assert hardware validation',!S.exportReport().verifiedHardwareGpuByThisTool);
const existing=S.exportReport();verify('export preserves original 25 scenarios',existing.originalIssueCount===25&&Object.keys(existing.results).length===1);
verify('client script does not move game entities',e.game.avatar.x===100&&e.game.avatar.z===42&&e.game.world.roads461.length===52);
verify('actual project index preserved after QA-only optin',fs.readFileSync(path.join(root,'index.html'),'utf8')===fs.readFileSync(path.join(root,'START_GAME.html'),'utf8'));
verify('QA module opt-in script not eagerly fetched',fs.readFileSync(path.join(root,'START_GAME.html'),'utf8').includes('if(new URLSearchParams(location.search).get("stage26qa")==="1")'));
verify('script file names and paths use exact case',fs.existsSync(path.join(root,'QA/STAGE26_25_FINDINGS_BROWSER.js')));
const r={stage:26,source:'Fixture DOM, renderer and frame; NOT actual browser WebGL/GPU',date:new Date().toISOString(),passed:checks.filter(x=>x.passed).length,checks:checks.length,details:checks};
fs.writeFileSync(path.join(root,'QA/STAGE26_BROWSER_COLLECTOR_UNIT_RESULT.json'),JSON.stringify(r,null,2)+'\n');
console.log('STAGE26 BROWSER MODULE UNIT',r.passed+'/'+r.checks);
if(r.passed!==r.checks)process.exitCode=1;
