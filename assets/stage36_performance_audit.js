/* SUNSET STATE — Stage 36/105, opt-in, real-browser performance audit.
 * Enable ONLY with ?stage36qa=1. Instruments the real game loop, not an RAF
 * simulation. Never changes graphics settings, game world, saves or physics.
 * CPU timings are real wall times; GPU timings only if EXT_disjoint_timer_query_webgl2
 * is supported and queries complete without disjoint. JS heap is browser-optional.
 * No phone-home, telemetry endpoint, or persistent browser storage.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const TARGET=Object.freeze({width:1920,height:1080,averageFps:50,p95FrameMs:20,
   warmupMs:3000,captureMs:20000,maxSamples:1800});
 const SCENES=Object.freeze([
  {id:'downtown_walk',name:'מרכז העיר · הליכה',mode:'walk'},
  {id:'downtown_drive',name:'מרכז העיר · נהיגה',mode:'drive'},
  {id:'bridge_drive',name:'גשר ומחלף · נהיגה',mode:'drive'},
  {id:'helicopter',name:'טיסה במסוק · תצפית',mode:'manual'},
  {id:'interior_lobby',name:'חלל פנים · לובי',mode:'interior'},
  {id:'harbor_coast',name:'נמל וחוף · הליכה',mode:'walk'}
 ]);
 const S={game:null,run:null,records:[],ui:null,diagnostics:[]};
 const round=(x,n=2)=>Number.isFinite(x)?+x.toFixed(n):null;
 function enabled(){try{return !!(globalThis.__SUNSET_STAGE36_QA===true ||
   (new URLSearchParams(globalThis.location?.search||'').get('stage36qa')==='1')) &&
   !(new URLSearchParams(globalThis.location?.search||'').get('stage36QaOff')==='1');}
  catch(_){return globalThis.__SUNSET_STAGE36_QA===true;}}
 function percentile(a,p){if(!a.length)return null;const sorted=a.filter(Number.isFinite).slice().sort((a,b)=>a-b);
   return sorted.length?sorted[Math.max(0,Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1))]:null;}
 function metrics(a){const v=a.filter(Number.isFinite);return {samples:v.length,mean:round(v.length?v.reduce((n,x)=>n+x,0)/v.length:NaN),
   p50:round(percentile(v,.5)),p95:round(percentile(v,.95)),p99:round(percentile(v,.99)),
   max:round(v.length?Math.max(...v):NaN)};}
 function classifyGpu(name){if(!name)return 'unidentified';
   if(/swiftshader|llvmpipe|softpipe|software|microsoft basic render|osmesa|lavapipe|warp|virgl|vmware/i.test(name))return 'software';
   if(/nvidia|geforce|radeon|intel|apple gpu|apple m\d|adreno|mali|qualcomm|powervr|arc graphics/i.test(name))return 'hardware-reported';
   return 'unidentified';}
 function info(game){const r=game?.renderer,gl=r?.gl||null,canvas=r?.canvas||null;
   const info={webgl2:false,version:null,renderer:null,adapter:null,adapterClassification:'unavailable',
     actualBuffer:canvas?[canvas.width,canvas.height]:null,devicePixelRatio:null,
     jsHeapAvailable:!!globalThis.performance?.memory?.usedJSHeapSize,
     deviceMemoryGiBReported:null,extensions:{gpuTimer:false},hardwareGpuVerified:false};
   if(typeof navigator!=='undefined')info.deviceMemoryGiBReported=Number.isFinite(navigator.deviceMemory)?navigator.deviceMemory:null;
   info.devicePixelRatio=Number.isFinite(globalThis.devicePixelRatio)?globalThis.devicePixelRatio:null;
   if(!gl||typeof gl.getParameter!=='function')return info;
   try{
    info.version=String(gl.getParameter(gl.VERSION)||'');
    info.renderer=String(gl.getParameter(gl.RENDERER)||'');
    info.webgl2=/webgl\s*2/i.test(info.version) || (typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext);
    const e=gl.getExtension?.('WEBGL_debug_renderer_info');
    info.adapter=e?String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)||''):null;
    info.adapterClassification=classifyGpu(info.adapter);
    info.hardwareGpuVerified=info.webgl2 && info.adapterClassification==='hardware-reported';
    info.extensions.gpuTimer=!!gl.getExtension?.('EXT_disjoint_timer_query_webgl2');
    info.actualBuffer=[Number(gl.drawingBufferWidth)||0,Number(gl.drawingBufferHeight)||0];
   }catch(err){info.readError=String(err.message||err);}
   return info;
 }
 function sceneOkay(scene,g){if(!scene||!g)return false;
   if(scene.mode==='interior')return !!g.inside;
   if(scene.mode==='walk')return !g.inside&&!g.inVehicle;
   if(scene.mode==='drive')return !g.inside&&!!g.inVehicle;
   return null; // Helicopter role cannot be inferred safely from generic flags.
 }
 function memory(){const m=globalThis.performance?.memory;return m&&Number.isFinite(m.usedJSHeapSize)?m.usedJSHeapSize:null;}
 function packSummary(frames,meta){const active=frames.filter(f=>f.active===true&&f.drawn===true);
   const validDt=active.map(f=>f.deltaMs).filter(x=>Number.isFinite(x)&&x>0);
   const elapsedMs=Math.max(0,meta.elapsedMs||0);
   const fps=elapsedMs>0?active.length*1000/elapsedMs:0;
   const p95=percentile(validDt,.95),frame=metrics(validDt);
   const cpuTick=metrics(active.map(f=>f.cpuTickMs));
   const cpuUpdate=metrics(active.map(f=>f.cpuUpdateMs));
   const cpuRender=metrics(active.map(f=>f.cpuDrawMs));
   const draws=metrics(active.map(f=>f.glDrawCalls));
   const uploads=metrics(active.map(f=>f.bufferUploadBytes));
   const gpu=metrics((meta.gpuTimingsMs||[]));
   const native=active.length>0&&active.every(f=>f.native1080);
   const heap=metrics((meta.heapSamples||[]).filter(Number.isFinite).map(x=>x/1048576));
   const reasons=[];
   if(!meta.confirmed)reasons.push('scene not manually confirmed');
   if(elapsedMs<TARGET.captureMs-200)reasons.push('capture shorter than 20 seconds');
   if(frames.some(f=>!f.active||!f.drawn))reasons.push('some frames were inactive or not painted');
   if(active.some(f=>f.sceneValid===false))reasons.push('game mode inconsistent with scene selection');
   if(!native)reasons.push('not native 1920x1080 throughout');
   if(!meta.gpuInfo?.hardwareGpuVerified)reasons.push('physical GPU not identifiable');
   if(!(fps>=TARGET.averageFps&&p95!==null&&p95<=TARGET.p95FrameMs))reasons.push('frame pacing below target');
   if(!meta.gpuTimingsMs?.length)reasons.push('GPU execution timer not available or did not resolve');
   return {sceneId:meta.scene?.id||null,sceneName:meta.scene?.name||null,
    manualSceneConfirmation:!!meta.confirmed,locationAutomaticallyVerified:false,
    observedStart:meta.observedStart||null,observedEnd:meta.observedEnd||null,
    elapsedMs:round(elapsedMs,1),measuredFrames:frames.length,activeDrawnFrames:active.length,
    averageFps:round(fps),frameIntervalMs:frame,cpuTickMs:cpuTick,cpuUpdateMs:cpuUpdate,
    cpuRendererDrawSubmissionMs:cpuRender,webglDrawCallsPerFrame:draws,
    webglBufferUploadsBytesPerFrame:uploads,
    gpuExecutionTimeMs:gpu.samples?gpu:null,jsHeapUsedMiB:heap.samples?heap:null,
    stutters:{over20Ms:validDt.filter(x=>x>20).length,over33Ms:validDt.filter(x=>x>33.3).length,
      over50Ms:validDt.filter(x=>x>50).length,over100Ms:validDt.filter(x=>x>100).length},
    resolutionEveryActiveFrameNative1080:native,gpuInfo:meta.gpuInfo||null,
    native1080Average50FpsVerified:reasons.filter(x=>x!=='GPU execution timer not available or did not resolve').length===0,
    limitations:reasons, gpuQueryIssued:meta.gpuIssued||0,gpuQueryResolved:meta.gpuTimingsMs?.length||0,
    note:'FPS measured from actual Game.tick with painted frames; profiler instrumentation adds overhead. CPU time is wall-clock time; GPU timer is an asynchronous GPU duration, if supported. JS heap is optional and is not VRAM. Independent Stage22 baseline and native GPU visual QA are still required for release signoff.'};
 }
 function safePoint(game){return {player:{x:round(game?.avatar?.x??game?.player?.x),z:round(game?.avatar?.z??game?.player?.z)},
   camera:{x:round(game?.cam?.x),y:round(game?.cam?.y),z:round(game?.cam?.z)},
   inside:!!game?.inside,inVehicle:!!game?.inVehicle,worldHour:round(game?.worldHour),
   weather:{rain:round(game?.weather?.visual?.rain??0),cloud:round(game?.weather?.visual?.cloud??0)}};}
 function addIssue(run,s){if(!run.notes.includes(s))run.notes.push(s);}
 function queryGpu(run,draw){const gl=run.gl,ext=run.timerExt;if(!gl||!ext||run.gpuPending.length>=5)return draw();
   let q=null,begun=false;
   try{q=gl.createQuery();if(q){gl.beginQuery(ext.TIME_ELAPSED_EXT,q);begun=true;run.gpuIssued++;}}
   catch(err){run.timerExt=null;addIssue(run,'timer query failed: '+String(err.message||err));}
   try{return draw();}
   finally{if(begun){try{gl.endQuery(ext.TIME_ELAPSED_EXT);run.gpuPending.push(q);}
     catch(err){run.timerExt=null;try{gl.deleteQuery(q);}catch(_){}}}
     else if(q)try{gl.deleteQuery(q);}catch(_){}
   }
 }
 function collectGpu(run){const gl=run.gl,ext=run.timerExt;
   if(!gl||!ext||!run.gpuPending.length)return;
   try{if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
      addIssue(run,'GPU timer disjoint; samples discarded');
      for(const q of run.gpuPending)try{gl.deleteQuery(q);}catch(_){}
      run.gpuPending=[];run.timerExt=null;return;
    }
    for(let i=0;i<run.gpuPending.length;){const q=run.gpuPending[i];
      if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){i++;continue;}
      const ns=gl.getQueryParameter(q,gl.QUERY_RESULT);
      if(Number.isFinite(ns)&&ns>=0)run.gpuTimes.push(ns/1000000);
      try{gl.deleteQuery(q);}catch(_){} run.gpuPending.splice(i,1);
    }
   }catch(err){addIssue(run,'GPU timer result read failed: '+String(err.message||err));run.timerExt=null;}
 }
 function instrumentGl(run){const gl=run.gl;if(!gl)return false;
   const methodNames=['drawElementsInstanced','drawArraysInstanced','drawElements','drawArrays','bufferData','bufferSubData'];
   const old=new Map();
   try{for(const name of methodNames){if(typeof gl[name]!=='function')continue;
      const orig=gl[name];old.set(name,orig);
      const wrapper=function(...args){const cur=run.current;
        if(cur){if(name.startsWith('draw'))cur.glDrawCalls++;
          else if(name==='bufferData'||name==='bufferSubData'){
            const v=name==='bufferData'?args[1]:args[2];
            cur.bufferUploadBytes+=(typeof v==='number'?v:v?.byteLength||0);
          }}
        return orig.apply(this,args);};
      gl[name]=wrapper;
      if(gl[name]!==wrapper)throw Error('WebGL method read-only: '+name);
    }
    run.restoreGl=()=>{for(const [name,orig] of old){try{gl[name]=orig;}catch(_){}}};
    return true;
   }catch(err){for(const [name,orig] of old){try{gl[name]=orig;}catch(_){}};
     addIssue(run,'GL call counters unavailable: '+String(err.message||err));return false;}
 }
 function prepareHooks(run){const game=run.game,renderer=game.renderer;
   const oldUpdate=game.update,oldDraw=renderer.draw;
   if(typeof oldUpdate!=='function'||typeof oldDraw!=='function'){
     addIssue(run,'Game.update or Renderer.draw missing');return false;}
   run.gl=renderer.gl||null;
   try{run.timerExt=run.gl?.getExtension?.('EXT_disjoint_timer_query_webgl2')||null;}catch(_){run.timerExt=null;}
   run.glInstrumented=instrumentGl(run);
   game.update=function stage36Update(...args){const now=performance.now();try{return oldUpdate.apply(this,args);}
     finally{if(run.current)run.current.cpuUpdateMs+=performance.now()-now;}};
   renderer.draw=function stage36Draw(...args){const now=performance.now(),cur=run.current;
     const original=()=>oldDraw.apply(this,args);
     try{return cur?queryGpu(run,original):original();}
     finally{if(cur){cur.cpuDrawMs+=performance.now()-now;cur.drawn=true;}}};
   run.restore=()=>{if(game.update!==oldUpdate)game.update=oldUpdate;
      if(renderer.draw!==oldDraw)renderer.draw=oldDraw;
      run.restoreGl?.();
      if(run.gl&&run.gpuPending.length)for(const q of run.gpuPending)try{run.gl.deleteQuery(q);}catch(_){}
      run.gpuPending.length=0;};
   return true;
 }
 function begin(game,sceneId,confirmed=true,options={}){
   if(S.run)return {ok:false,reason:'already-running'};
   if(!enabled())return {ok:false,reason:'enable with ?stage36qa=1'};
   if(H.stage22Benchmark?.recording||H.stage23Profiler?.running)return {ok:false,reason:'other GPU profiler active'};
   const scene=SCENES.find(x=>x.id===sceneId),r=game?.renderer;
   if(!scene||!confirmed||!game?.tick||!r)return {ok:false,reason:'select scene, confirm location and start the game'};
   const x={game,scene,confirmed:!!confirmed,phase:'warmup',beganAt:performance.now(),
     warmupMs:Number.isFinite(options.warmupMs)?Math.max(0,options.warmupMs):TARGET.warmupMs,
     captureMs:Number.isFinite(options.captureMs)?Math.max(100,options.captureMs):TARGET.captureMs,
     captureBeganAt:null,lastFrameTime:null,frames:[],gpuPending:[],gpuTimes:[],gpuIssued:0,
     heapSamples:[],current:null,notes:[],gl:null,restore:null,timerExt:null,
     gpuInfo:info(game),observedStart:safePoint(game)};
   if(!prepareHooks(x))return {ok:false,reason:'cannot instrument renderer'};
   S.run=x;S.game=game;status('מתחמם 3 שניות… הישאר באזור שבחרת.');
   return {ok:true,sceneId:scene.id};
 }
 function finish(reason='manual'){
   const run=S.run;if(!run)return null;S.run=null;
   try{collectGpu(run);}catch(_){}
   try{run.restore?.();}catch(err){run.notes.push('restore failure: '+String(err.message||err));}
   const elapsed=Math.max(0,(run.lastValidAt||performance.now())-(run.captureBeganAt||performance.now()));
   const summary=packSummary(run.frames,{scene:run.scene,confirmed:run.confirmed,elapsedMs:elapsed,
     gpuInfo:run.gpuInfo,gpuTimingsMs:run.gpuTimes,gpuIssued:run.gpuIssued,heapSamples:run.heapSamples,
     observedStart:run.observedStart,observedEnd:safePoint(run.game)});
   summary.reason=reason;summary.notes=run.notes;
   summary.samples=run.frames.slice(0,TARGET.maxSamples);
   S.records.push(summary);
   status('מדידה הסתיימה: '+(summary.averageFps??'—')+'FPS, ‏p95 '+(summary.frameIntervalMs.p95??'—')+
     'ms. '+(summary.native1080Average50FpsVerified?'עמד בדרישות המדידה':'לא אומת יעד 50FPS ב־1080p'));
   if(S.ui){S.ui.start.disabled=false;S.ui.stop.disabled=true;}
   return summary;
 }
 function observe(game,time,elapsedTick,activeFramesBefore){const run=S.run;if(!run||run.game!==game)return;
   const now=Number.isFinite(time)?time:performance.now();
   collectGpu(run);
   if(run.phase==='warmup'){
     if(now-run.beganAt<run.warmupMs)return;
     run.phase='capture';run.captureBeganAt=now;run.lastFrameTime=null;
     status('מודדים: 20 שניות במשחק.');
   }
   const dt=run.lastFrameTime===null?null:now-run.lastFrameTime;
   run.lastFrameTime=now;run.lastValidAt=now;
   if(dt!==null&&Number.isFinite(dt)&&dt>0){
    const renderer=game.renderer,canvas=renderer.canvas,gl=renderer.gl;
    const native=game.visualMode450==='native1080'&&renderer.renderNative475===true&&
      canvas?.width>=1920&&canvas?.height>=1080&&
      Math.abs(canvas.width/canvas.height-16/9)<.012&&
      gl?.drawingBufferWidth===canvas.width&&gl?.drawingBufferHeight===canvas.height;
    const active=game.activeFrames>activeFramesBefore&&!globalThis.document?.hidden&&
      !game.paused&&!game.over&&!game.garageOpen&&!game.missionBoardOpen&&!game.showFullMap;
    const frame=run.current||{}; // reset per tick from instrumented wrapper
    frame.deltaMs=dt;frame.cpuTickMs=elapsedTick;frame.active=active;
    frame.drawn=frame.drawn===true||game.lastPaint===now;
    frame.native1080=!!native;frame.sceneValid=sceneOkay(run.scene,game);
    if(run.frames.length<TARGET.maxSamples)run.frames.push(frame);
    if(run.frames.length===1||run.frames.length%45===0){const h=memory();if(h!==null)run.heapSamples.push(h);}
   }
   if(now-run.captureBeganAt>=run.captureMs||run.frames.length>=TARGET.maxSamples)finish('duration');
   else if(S.ui&&run.frames.length%30===0)status('נמדדים '+round((now-run.captureBeganAt)/1000,1)+' / '+run.captureMs/1000+' שניות');
 }
 function install(Game){if(!enabled()||!Game?.prototype?.tick||Game.prototype.__stage36PerfInstalled)return false;
   const before=Game.prototype.tick;
   Game.prototype.tick=function stage36MeasuredTick(t){S.game=this;
      if(!S.run||S.run.game!==this)return before.apply(this,arguments);
      const start=performance.now(),prior=this.activeFrames,run=S.run;
      run.current={cpuUpdateMs:0,cpuDrawMs:0,glDrawCalls:0,bufferUploadBytes:0,drawn:false};
      let v;try{v=before.apply(this,arguments);}finally{
        try{observe(this,t,performance.now()-start,prior);}catch(err){S.diagnostics.push(String(err.message||err));finish('capture-error');}
        finally{if(S.run===run)run.current=null;}}
      return v;
   };
   Game.prototype.__stage36PerfInstalled=true;
   if(typeof document!=='undefined'){
     if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui,{once:true});else ui();
   }
   return true;
 }
 function status(s){if(S.ui?.status)S.ui.status.textContent=s;}
 function button(text,parent,fn){const b=document.createElement('button');b.textContent=text;b.type='button';
   b.style.cssText='background:#27525e;color:white;border:1px solid #799ba6;border-radius:7px;padding:7px;cursor:pointer';
   parent.appendChild(b);b.addEventListener('click',fn);return b;}
 function download(name,body,type){if(typeof document==='undefined'||!globalThis.Blob||!globalThis.URL?.createObjectURL)return false;
   const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return true;}
 function report(){return {name:'SUNSET STATE Stage 36 Performance Audit',version:36,createdAt:new Date().toISOString(),
   target:TARGET,captures:S.records,observedOnActualHardware:S.records.some(r=>r.gpuInfo?.hardwareGpuVerified),
   allSixScenesCertified:SCENES.every(s=>S.records.some(r=>r.sceneId===s.id&&r.native1080Average50FpsVerified)),
   userAgent:typeof navigator!=='undefined'?navigator.userAgent:null,
   note:'No results are fabricated. Only a user-controlled run in a real WebGL2 browser can certify GPU/FPS.'};}
 function csv(){const cols=['sceneId','elapsedMs','activeDrawnFrames','averageFps','frameIntervalMs.p95','cpuTickMs.p95',
  'cpuUpdateMs.p95','cpuRendererDrawSubmissionMs.p95','webglDrawCallsPerFrame.p95','gpuExecutionTimeMs.p95',
  'jsHeapUsedMiB.max','stutters.over50Ms','resolutionEveryActiveFrameNative1080','native1080Average50FpsVerified'];
  const val=(r,path)=>path.split('.').reduce((a,k)=>a?.[k],r);
  return cols.join(',')+'\n'+S.records.map(r=>cols.map(k=>JSON.stringify(val(r,k)??'')).join(',')).join('\n')+'\n';}
 function ui(){if(S.ui||!document.body||!enabled())return;
   const root=document.createElement('aside');root.id='stage36-audit';root.dir='rtl';
   root.style.cssText='position:fixed;right:10px;top:78px;z-index:13000;max-height:calc(100vh - 98px);'+
     'overflow:auto;width:min(345px,calc(100vw - 20px));box-sizing:border-box;background:#112930f5;'+
     'border:1px solid #7eb5af;color:#f5f7f7;border-radius:12px;padding:12px;'+
     'font:13px/1.5 system-ui,Arial;box-shadow:0 6px 24px #0009';
   const title=document.createElement('strong');title.textContent='SUNSET STATE · שלב 36 | בדיקות ביצועים';root.appendChild(title);
   const p=document.createElement('p');p.textContent='עבור לסצנה ובחר אותה. כל מדידה: חימום 3 שניות + 20 שניות משחק. מומלץ מצב Native 1080p דרך F4.';root.appendChild(p);
   const select=document.createElement('select');select.style.cssText='background:#254550;color:#fff;padding:8px;width:100%';
   for(const scene of SCENES){const o=document.createElement('option');o.value=scene.id;o.textContent=scene.name;select.appendChild(o);}root.appendChild(select);
   const label=document.createElement('label');label.style.cssText='display:block;margin:9px 0';
   const check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(' אני נמצא בסצנה זו בפועל'));root.appendChild(label);
   select.addEventListener('change',()=>{check.checked=false;});
   const cmds=document.createElement('div');cmds.style.cssText='display:flex;gap:5px;flex-wrap:wrap';root.appendChild(cmds);
   const start=button('התחל מדידה',cmds,()=>{
     const result=begin(S.game,select.value,check.checked);
     if(!result.ok)status('לא התחיל: '+result.reason);else{start.disabled=true;stop.disabled=false;}
   });
   const stop=button('עצור',cmds,()=>finish('manual'));stop.disabled=true;
   button('ייצא JSON',cmds,()=>download('SUNSET_STATE_STAGE36_PERFORMANCE.json',JSON.stringify(report(),null,2),'application/json'));
   button('ייצא CSV',cmds,()=>download('SUNSET_STATE_STAGE36_PERFORMANCE.csv',csv(),'text/csv'));
   const stat=document.createElement('p');stat.style.cssText='color:#d1e4df;overflow-wrap:anywhere';
   stat.textContent='ממתין למדידה. מצב GPU וזיכרון זמינים רק אם הדפדפן מאפשר.';root.appendChild(stat);
   const foot=document.createElement('small');foot.textContent='ללא פרסום נתונים החוצה. אין שינוי בשמירה, במודלים, באיכות או ב־FPS.';
   root.appendChild(foot);document.body.appendChild(root);S.ui={root,start,stop,status:stat};
 }
 H.stage36PerformanceAudit={target:TARGET,scenes:SCENES,enabled,percentile,metrics,classifyGpu,info,sceneOkay,
   packSummary,install,begin,finish,report,csv,get records(){return S.records;},get run(){return S.run;},get game(){return S.game;}};
 H.installStage36PerformanceAudit=install;
})(Heatline);
