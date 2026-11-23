/* SUNSET STATE | Stage 23/35 | opt-in measured geometry/draw/upload profiling.
 * Instrumentation is installed only after ?stage23qa=1 AND the user presses Start.
 * Counts actual WebGL2 API invocations, NOT GPU execution time, video memory or FPS.
 * Wraps are removed after capture. Never changes objects, quality, culling, shaders,
 * physics, gameplay, camera, renderer resolution or stage22's native GPU benchmark.
 */
var Heatline = globalThis.Heatline || {};
(function(H){
 'use strict';
 const MAX_FRAMES=1800, CAPTURE_MS=12000;
 const SCENES=[['center','מרכז העיר'],['traffic','כביש עמוס'],['bridge','גשרים'],
               ['lobby','מבואה פנימית'],['shore','חוף ונמל'],['wildlife','אזור חיות']];
 const R={game:null,run:null,results:[],panel:null,status:null,startButton:null,stopButton:null};
 function enabled(){try{const p=new URLSearchParams(globalThis.location?.search||'');
   return p.get('stage23qa')==='1'&&!p.has('stage23ProfilerOff');}catch(_){return false;}}
 function percentile(arr,p){if(!arr.length)return null;const s=arr.slice().sort((a,b)=>a-b);
   return s[Math.min(s.length-1,Math.max(0,Math.ceil(p*s.length)-1))];}
 function round(n){return Number.isFinite(n)?Math.round(n*100)/100:null;}
 function byteLength(data){if(typeof data==='number')return data>=0&&Number.isFinite(data)?data:0;
   if(data&&typeof data.byteLength==='number')return data.byteLength;return 0;}
 function fresh(){return {drawCalls:0,instancedDrawCalls:0,nonInstancedDrawCalls:0,
   offscreenDrawCalls:0,trianglesSubmitted:null,trianglesEstimated:0,instances:0,
   bufferUploads:0,uploadBytes:0,subDataCalls:0,subDataBytes:0,dynamicObjects:null,
   staticVisible:null,staticSource:null,cpuTickMs:null,measuredGL:true};}
 // Invokes ORIGINAL methods with the exact arguments and receiver, preserving GL behavior.
 function instrumentGL(gl,collector){
   if(!gl||typeof gl.drawElementsInstanced!=='function'||typeof gl.bufferData!=='function')
     return {ok:false,reason:'A real WebGL2 context with instancing and bufferData is required'};
   const names=['drawElementsInstanced','drawArraysInstanced','drawElements','drawArrays',
     'bufferData','bufferSubData','bindFramebuffer'];
   const originals=new Map();let wrapped=0,offscreen=false;
   function countDraw(args,instanced,kind){
     const frame=collector();if(!frame)return;
     frame.drawCalls++;frame[instanced?'instancedDrawCalls':'nonInstancedDrawCalls']++;
     if(offscreen)frame.offscreenDrawCalls++;
     const mode=args[0],items=Math.max(0,+args[kind==='elements'?1:2]||0);
     const copies=instanced?Math.max(0,+args[kind==='elements'?4:3]||0):1;
     frame.instances+=copies;
     if(mode===gl.TRIANGLES)frame.trianglesEstimated+=Math.floor(items/3)*copies;
     // The number is a submission estimate; clipping and shader discard are unknown.
   }
   try{
    for(const name of names){
     if(typeof gl[name]!=='function')continue;
     const original=gl[name];originals.set(name,original);
     let wrapper;
     if(name==='drawElementsInstanced')wrapper=function(...args){countDraw(args,true,'elements');return original.apply(this,args);};
     else if(name==='drawArraysInstanced')wrapper=function(...args){countDraw(args,true,'arrays');return original.apply(this,args);};
     else if(name==='drawElements')wrapper=function(...args){countDraw(args,false,'elements');return original.apply(this,args);};
     else if(name==='drawArrays')wrapper=function(...args){countDraw(args,false,'arrays');return original.apply(this,args);};
     else if(name==='bufferData')wrapper=function(...args){const f=collector();if(f){f.bufferUploads++;f.uploadBytes+=byteLength(args[1]);}return original.apply(this,args);};
     else if(name==='bufferSubData')wrapper=function(...args){const f=collector();if(f){f.subDataCalls++;f.subDataBytes+=byteLength(args[2]);}return original.apply(this,args);};
     else wrapper=function(...args){if(args[0]===gl.FRAMEBUFFER)offscreen=args[1]!==null&&args[1]!==undefined;return original.apply(this,args);};
     gl[name]=wrapper;
     if(gl[name]!==wrapper)throw Error(`WebGL method ${name} is read-only`);
     wrapped++;
    }
   }catch(error){for(const [n,f]of originals){try{gl[n]=f;}catch(_){}}
     return {ok:false,reason:String(error.message||error)};}
   return {ok:true,wrapped,restore(){for(const [n,f]of originals){try{gl[n]=f;}catch(_){}}}};
 }
 function summarize(frames,elapsedMs,meta){
   const valid=frames.filter(x=>x&&Number.isFinite(x.drawCalls));
   const metric=k=>{const v=valid.map(f=>f[k]).filter(Number.isFinite);return {p50:round(percentile(v,.5)),p95:round(percentile(v,.95)),max:v.length?round(Math.max(...v)):null};};
   const total=k=>valid.reduce((a,f)=>a+(Number.isFinite(f[k])?f[k]:0),0);
   return {stage:23,profileType:'instrumented WebGL2 calls while original Game.tick runs',
     createdAt:new Date().toISOString(),scene:meta.scene,elapsedMs:round(elapsedMs),frames:valid.length,
     webglCallsActuallyInstrumented:!!meta.instrumented,adapter:meta.adapter||null,
     resolution:meta.resolution||null,hardwareFps50Verified:false,gpuExecutionTimeMs:null,
     gpuResidentMemoryBytes:null,drawCallsPerFrame:metric('drawCalls'),
     offscreenDrawCallsPerFrame:metric('offscreenDrawCalls'),
     instancedDrawCallsPerFrame:metric('instancedDrawCalls'),
     bufferUploadsPerFrame:metric('bufferUploads'),uploadBytesPerFrame:metric('uploadBytes'),
     subDataBytesPerFrame:metric('subDataBytes'),trianglesSubmittedEstimatePerFrame:metric('trianglesEstimated'),
     visibleStaticCandidatesPerFrame:metric('staticVisible'),dynamicItemsPerFrame:metric('dynamicObjects'),
     cpuTickMsPerFrame:metric('cpuTickMs'),totals:{drawCalls:total('drawCalls'),
       instancedDrawCalls:total('instancedDrawCalls'),uploadBytes:total('uploadBytes'),
       subDataBytes:total('subDataBytes')},
     rawFrameSamples:valid.slice(0,MAX_FRAMES),
     limitations:['API draw-call count is real only when WebGL2 wrappers succeeded',
       'Triangles are submissions including offscreen passes, not GPU-executed or visible triangles',
       'BufferData byte totals are uploads, NOT resident GPU VRAM or total textures',
       'CPU tick time is not GPU execution time or FPS',
       'Profiling adds overhead; do not use this capture to certify the 50FPS target',
       'The 50FPS goal must be evaluated independently by the Stage22 hardware benchmark']};
 }
 function note(s){if(R.status)R.status.textContent=s;}
 function stop(reason='manual'){
   const run=R.run;if(!run)return null;R.run=null;
   const elapsedMs=Math.max(0,performance.now()-run.started);
   try{run.glInstrumentation.restore();}finally{if(run.origBuildDynamic){
     if(run.hadOwnBuildDynamic)run.game.buildDynamic=run.origBuildDynamic;
     else delete run.game.buildDynamic;
   }}
   const renderer=run.game.renderer;
   const adapter=typeof H.stage22Benchmark?.gpuInfo==='function'?H.stage22Benchmark.gpuInfo(run.game):null;
   const data=summarize(run.frames,elapsedMs,{scene:run.scene,instrumented:true,adapter,
     resolution:{canvas:[renderer.canvas?.width??null,renderer.canvas?.height??null],
       drawingBuffer:[renderer.gl?.drawingBufferWidth??null,renderer.gl?.drawingBufferHeight??null]}});
   data.endedBy=reason;R.results.push(data);
   if(R.startButton)R.startButton.disabled=false;
   if(R.stopButton)R.stopButton.disabled=true;
   note(`נמדדו ${data.frames} פריימים · קריאות ציור p95: ${data.drawCallsPerFrame.p95??'?'} · העלאות p95: ${round((data.uploadBytesPerFrame.p95||0)/1048576)} MiB · ללא אישור FPS`);
   return data;
 }
 function start(scene='center'){
   if(R.run)return false;
   const game=R.game,gl=game?.renderer?.gl;
   if(!game||!gl){note('יש להפעיל את המשחק עם WebGL2 אמיתי לפני מדידה.');return false;}
   const run={game,scene,started:performance.now(),frames:[],current:null,glInstrumentation:null,origBuildDynamic:null,hadOwnBuildDynamic:false};
   const hooks=instrumentGL(gl,()=>run.current);
   if(!hooks.ok){note('לא ניתן למדוד WebGL2: '+hooks.reason);return false;}
   run.glInstrumentation=hooks;
   const old=game.buildDynamic;
   if(typeof old==='function'){
     run.origBuildDynamic=old;run.hadOwnBuildDynamic=Object.prototype.hasOwnProperty.call(game,'buildDynamic');
     game.buildDynamic=function(...args){const result=old.apply(this,args);
       if(run.current&&result&&typeof result.length==='number')run.current.dynamicObjects=result.length;
       return result;};
   }
   R.run=run;if(R.startButton)R.startButton.disabled=true;if(R.stopButton)R.stopButton.disabled=false;
   note('מודד קריאות ציור והעלאות זיכרון במשך 12 שניות. המדידה עצמה מוסיפה עומס.');return true;
 }
 function download(){
   if(!R.results.length){note('אין נתוני מדידה לייצוא.');return false;}
   const report={stage:23,createdAt:new Date().toISOString(),results:R.results,
     warning:'Not a GPU timing query. NOT a 1920x1080 >=50FPS certification.'};
   const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='SUNSET_STATE_STAGE23_WEBGL_DRAW_PROFILE.json';
   document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);return true;
 }
 function panel(){
   if(R.panel||!document.body)return;
   const root=document.createElement('aside');root.id='stage23-geometry-draw-profile';root.setAttribute('role','region');
   root.setAttribute('aria-label','ניתוח גאומטריה וקריאות ציור');
   root.style.cssText='position:fixed;bottom:12px;left:12px;z-index:11001;direction:rtl;'+
     'color:#f3f4ed;background:#17232ceb;border:1px solid #9ebcb2;border-radius:10px;'+
     'font:12px/1.4 system-ui,sans-serif;width:min(312px,calc(100vw - 24px));padding:12px;max-height:65vh;overflow:auto';
   const heading=document.createElement('strong');heading.textContent='שלב 23 · גאומטריה וקריאות ציור';root.appendChild(heading);
   const description=document.createElement('p');description.textContent='מודד קריאות WebGL והעלאות נתונים — לא זמן GPU או אישור 50FPS.';root.appendChild(description);
   const select=document.createElement('select');select.style.cssText='display:block;width:100%;padding:5px;background:#273e48;color:#fff';
   for(const [id,name]of SCENES){const item=document.createElement('option');item.value=id;item.textContent=name;select.appendChild(item);}root.appendChild(select);
   const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:5px;margin:9px 0;flex-wrap:wrap';
   function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;
     b.style.cssText='padding:6px;color:#fff;background:#285e67;border:1px solid #85aaa8;border-radius:5px';
     b.addEventListener('click',action);buttons.appendChild(b);return b;}
   R.startButton=button('מדוד 12 שניות',()=>start(select.value));
   R.stopButton=button('עצור',()=>stop());R.stopButton.disabled=true;
   button('ייצוא JSON',download);root.appendChild(buttons);
   R.status=document.createElement('p');R.status.setAttribute('aria-live','polite');
   R.status.textContent='הפעל את המשחק עם WebGL2. מדידה לפי בחירה בלבד.';root.appendChild(R.status);
   document.body.appendChild(root);R.panel=root;
 }
 function install(Game){
   if(!enabled()||!Game?.prototype?.tick||Game.prototype.__stage23DrawProfilerInstalled)return false;
   const previous=Game.prototype.tick;
   Game.prototype.tick=function stage23Tick(t){
     R.game=this;const run=R.run;
     if(!run||run.game!==this)return previous.apply(this,arguments);
     const frame=fresh(),started=performance.now();run.current=frame;
     try{return previous.apply(this,arguments);}finally{
       frame.cpuTickMs=performance.now()-started;
       const scene=this.renderer?.activeStaticScene;
       if(scene?.visible){frame.staticVisible=scene.visible.length;frame.staticSource=scene.source?.length??null;}
       run.frames.push(frame);run.current=null;
       if(run.frames.length>=MAX_FRAMES||performance.now()-run.started>=CAPTURE_MS)stop('duration');
     }
   };
   Game.prototype.__stage23DrawProfilerInstalled=true;
   if(typeof document!=='undefined'){
     if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',panel,{once:true});
     else panel();
   }
   return true;
 }
 H.stage23Profiler={version:'23.0',enabled,percentile,byteLength,summarize,instrumentGL,
    install,start,stop,download,get game(){return R.game;},get results(){return R.results;},
    get running(){return !!R.run;}};
 H.installStage23DrawProfiler=install;
})(Heatline);
