/* SUNSET STATE 35-stage programme: Stage 22 honest, opt-in native-1080 GPU benchmark.
 * Only active with ?stage22qa=1; otherwise Game.prototype.tick is NEVER wrapped.
 * Measures real game-loop cadence after actual renderer.draw, NOT an independent
 * requestAnimationFrame counter. Rendering CPU time is not GPU execution time.
 * No changes to graphics quality, resolution, game progress, save data or AI.
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const TARGET = Object.freeze({width:1920,height:1080,minimumAverageFps:50,
    maximumP95FrameMs:20,minimumCaptureMs:19000,nominalCaptureMs:20000,warmupMs:3000});
  const SCENES = Object.freeze([
    {id:'downtown_walk',name:'הליכה במרכז העיר',type:'walk'},
    {id:'downtown_drive',name:'נהיגה בצומת עירוני',type:'drive'},
    {id:'bridge_drive',name:'נהיגה על גשר',type:'drive'},
    {id:'helicopter',name:'טיסה במסוק',type:'manual'},
    {id:'interior_lobby',name:'הליכה בתוך לובי',type:'interior'},
    {id:'harbor_coast',name:'הליכה בנמל ובחוף',type:'walk'}
  ]);
  function enabled(){
    try {const q=new URLSearchParams(globalThis.location?.search||'');
      return q.get('stage22qa')==='1'&&!q.has('stage22BenchOff');}
    catch(_){return false;}
  }
  function classifyAdapter(renderer){
    const r=String(renderer||'').trim();
    if(!r)return 'unidentified';
    if(/swiftshader|llvmpipe|softpipe|software raster|software renderer|warp|microsoft basic render|osmesa|virgl|virtualbox|vmware|lavapipe|cpu raster/i.test(r))return 'software';
    if(/nvidia|geforce|radeon|amd|intel|apple gpu|apple m\d|adreno|mali[- ]|powervr|qualcomm|arc\(tm\)|arc graphics/i.test(r))return 'hardware-reported';
    return 'unidentified';
  }
  function gpuInfo(game){
    const gl=game?.renderer?.gl;
    if(!gl||typeof gl.getParameter!=='function')return {webgl2:false,renderer:'',adapter:'unavailable',
      classification:'unavailable',debugAdapterAvailable:false,reason:'No real WebGL context (Canvas fallback, stub, or GPU unavailable)'};
    let version='',vendor='',renderer='',unmasked='',w=null,h=null;
    try{
      version=String(gl.getParameter(gl.VERSION)||'');
      vendor=String(gl.getParameter(gl.VENDOR)||'');
      renderer=String(gl.getParameter(gl.RENDERER)||'');
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      if(ext)unmasked=String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)||'');
      w=gl.drawingBufferWidth;h=gl.drawingBufferHeight;
    }catch(e){return {webgl2:false,renderer,adapter:'unavailable',classification:'unavailable',
      reason:String(e.message||e)};}
    const webgl2=/webgl\s*2/i.test(version);
    const classification=webgl2?classifyAdapter(unmasked):'unavailable';
    return {webgl2,version,vendor,renderer,adapter:unmasked||'hidden by browser',classification,
      debugAdapterAvailable:!!unmasked,drawingBuffer:[w,h],
      reason:webgl2?(!unmasked?'GPU adapter details not exposed; hardware NOT verified':
        classification==='software'?'Software rasterizer; NOT hardware GPU':
        classification==='hardware-reported'?'Physical adapter name reported by browser':'Unidentified renderer; hardware NOT verified'):
        'WebGL2 unavailable'};
  }
  function sceneValid(scene,game){
    if(!game||!scene)return false;
    if(scene.type==='walk')return !game.inside&&!game.inVehicle;
    if(scene.type==='drive')return !game.inside&&!!game.inVehicle;
    if(scene.type==='interior')return !!game.inside;
    return true; // helicopter location cannot be verified from a generic flag.
  }
  function frameNative(game,gpu){
    const r=game?.renderer,canvas=r?.canvas;
    if(!canvas||!gpu.webgl2||game.visualMode450!=='native1080'||r.renderNative475!==true)return false;
    const w=canvas.width,h=canvas.height;
    const actual=gpu.drawingBuffer||[];
    return w>=TARGET.width&&h>=TARGET.height&&Math.abs(w/h-16/9)<.012&&
      actual[0]===w&&actual[1]===h;
  }
  function percentile(input,p){
    if(!input.length)return null;
    const sorted=input.slice().sort((a,b)=>a-b);
    return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))];
  }
  function round(x,d=2){return Number.isFinite(x)?+x.toFixed(d):null;}
  function summarize(samples,settings){
    const elapsed=Math.max(0,settings.elapsedMs||0),gpu=settings.gpu||{webgl2:false,classification:'unavailable'};
    const measured=samples.filter(x=>x&&Number.isFinite(x.dt)&&x.dt>0&&x.dt<5000);
    const frames=measured.filter(x=>x.painted&&x.active);
    const frameMs=measured.map(x=>x.dt),cpuMs=measured.filter(x=>Number.isFinite(x.cpuMs)).map(x=>x.cpuMs);
    const avgFps=elapsed>0?frames.length*1000/elapsed:0;
    const valid=measured.length>0&&measured.every(x=>x.active&&x.painted&&x.sceneValid);
    const native=measured.length>0&&measured.every(x=>x.native===true);
    const adapterHardware=gpu.webgl2===true&&gpu.classification==='hardware-reported';
    const p95=percentile(frameMs,.95),p99=percentile(frameMs,.99);
    const pacing=avgFps>=TARGET.minimumAverageFps&&p95!==null&&p95<=TARGET.maximumP95FrameMs;
    const enough=elapsed>=TARGET.minimumCaptureMs;
    const result={sceneId:settings.scene?.id||'unknown',sceneName:settings.scene?.name||'',
      sceneType:settings.scene?.type||'',sceneLocationVerifiedAutomatically:false,
      sceneSelectionConfirmedByUser:!!settings.manualConfirmed,
      source:'real Game.tick after Game.renderer.draw; active frames only',
      capturedAt:new Date().toISOString(),elapsedMs:round(elapsed,0),measuredFrameIntervals:measured.length,
      activePaintedFrames:frames.length,averageFps:round(avgFps),p50FrameMs:round(percentile(frameMs,.5)),
      p95FrameMs:round(p95),p99FrameMs:round(p99),worstFrameMs:round(frameMs.length?Math.max(...frameMs):NaN),
      cpuTickP95Ms:round(percentile(cpuMs,.95)),gpuExecutionTimeMs:null,
      over20msFrames:frameMs.filter(x=>x>20).length,over50msFrames:frameMs.filter(x=>x>50).length,
      validSceneThroughout:valid,native1080Throughout:native,hardwareAdapterVerified:adapterHardware,
      allConditionsPassed:!!(enough&&settings.manualConfirmed&&valid&&native&&adapterHardware&&pacing),
      target:TARGET,gpu,firstBuffer:settings.firstBuffer||null,lastBuffer:settings.lastBuffer||null,
      invalidReasons:[!enough?'capture shorter than 19 s':null,!settings.manualConfirmed?'scene not user-confirmed':null,
        !valid?'paused/hidden/scene changed/render skipped':null,!native?'real WebGL2 native 1920x1080 buffer missing':null,
        !adapterHardware?'hardware GPU cannot be verified':null,!pacing?'average FPS <50 or p95 frame time >20ms':null].filter(Boolean),
      caveat:'On-machine cadence benchmark, NOT a GPU timer query, and scene location is chosen manually. Physical GPU identification requires exposed adapter information.'};
    return result;
  }
  const runtime={enabled,version:'22.0',target:TARGET,scenes:SCENES,records:[],game:null,
    run:null,ui:null,invalidatedCount:0};
  function describe(){
    const g=runtime.game,r=g?.renderer,can=r?.canvas,adapter=gpuInfo(g);
    const dimensions=can?`${can.width}×${can.height}`:'לא זמין';
    return `רינדור ${dimensions} · ${adapter.webgl2?'WebGL2':'ללא WebGL2'} · `+
      (adapter.classification==='hardware-reported'?'זוהה מתאם GPU':adapter.classification==='software'?'רינדור תוכנה':'GPU לא אומת');
  }
  function display(message){if(runtime.ui?.status)runtime.ui.status.textContent=message;}
  function snapshotBuffer(g){const c=g?.renderer?.canvas,gl=g?.renderer?.gl;
    return {canvas:[c?.width??null,c?.height??null],drawingBuffer:[gl?.drawingBufferWidth??null,gl?.drawingBufferHeight??null],
      policy:g?.visualMode450||null,renderer:g?.renderer?.name||null};
  }
  function finish(reason){
    const run=runtime.run;if(!run)return null;
    runtime.run=null;
    const elapsed=Math.max(0,performance.now()-run.measureStartedAt);
    const result=summarize(run.samples,{elapsedMs:elapsed,gpu:gpuInfo(runtime.game),scene:run.scene,
      manualConfirmed:run.confirmed,firstBuffer:run.firstBuffer,lastBuffer:snapshotBuffer(runtime.game)});
    result.endedBy=reason;
    result.hardware={devicePixelRatio:window.devicePixelRatio||1,screenSize:[innerWidth,innerHeight],
      userAgent:navigator.userAgent};
    runtime.records.push(result);
    if(runtime.ui){runtime.ui.start.disabled=false;runtime.ui.stop.disabled=true;}
    display(`${result.sceneName}: ${result.averageFps??0} FPS, p95 ${result.p95FrameMs??'—'}ms; `+
      (result.allConditionsPassed?'עבר את מדדי הדגימה':'לא אומת היעד')+` (${result.invalidReasons.join('; ')||'ללא ליקויים'})`);
    return result;
  }
  function observe(g,rafTime,cpuMs,painted){
    runtime.game=g;
    const run=runtime.run;
    if(!run)return;
    const time=performance.now();
    if(run.phase==='warmup'){
      if(time-run.createdAt<runtime.target.warmupMs)return;
      run.phase='capture';run.measureStartedAt=time;run.lastRAF=rafTime;
      run.firstBuffer=snapshotBuffer(g);display(`מודד ${run.scene.name} — 20 שניות...`);return;
    }
    const dt=rafTime-run.lastRAF;run.lastRAF=rafTime;
    const active=!!(g.running&&!g.paused&&!g.over&&!g.graphicsLost&&!g.garageOpen&&
      !g.missionBoardOpen&&!g.showFullMap&&!document.hidden);
    const adapter=gpuInfo(g);
    run.samples.push({dt,cpuMs,painted,active,sceneValid:sceneValid(run.scene,g),native:frameNative(g,adapter)});
    if(time-run.measureStartedAt>=runtime.target.nominalCaptureMs)finish('duration-complete');
    else if(run.samples.length%120===0)display(`מודד ${run.scene.name}: `+
      `${Math.floor((time-run.measureStartedAt)/1000)}/20 שניות · ${describe()}`);
  }
  function begin(sceneId,confirmed){
    if(runtime.run)return false;
    const scene=SCENES.find(s=>s.id===sceneId),g=runtime.game;
    if(!scene||!g||!confirmed){display('יש להתחיל את המשחק ולסמן שאתה נמצא בסצנה שבחרת.');return false;}
    const good=!!(g.running&&!g.paused&&!g.over);
    if(!good){display('הפעל את המשחק (לא במסך הפתיחה או בהשהיה) לפני המדידה.');return false;}
    if(!sceneValid(scene,g)){display('מצב השחקן אינו מתאים לסצנה: צריך הליכה, נהיגה או לובי בהתאם לבחירה.');return false;}
    runtime.run={phase:'warmup',createdAt:performance.now(),scene,confirmed:true,
      samples:[],measureStartedAt:0,firstBuffer:null,lastRAF:null};
    if(runtime.ui){runtime.ui.start.disabled=true;runtime.ui.stop.disabled=false;}
    display(`חימום 3 שניות · ${describe()} · לא משנים מצב איכות בזמן המדידה.`);
    return true;
  }
  function exportReport(){
    const rows=runtime.records,latestByScene=new Map(rows.map(r=>[r.sceneId,r]));
    const result={project:'SUNSET STATE',stage:22,build:'35-stage cumulative project',
      date:new Date().toISOString(),target:TARGET,method:'actual Game.tick cadence with native WebGL2 drawing-buffer proof',
      results:rows,scenesRequired:SCENES.map(x=>x.id),
      allSixScenesCaptured:SCENES.every(x=>latestByScene.has(x.id)),
      allSixScenesPassed:SCENES.every(x=>latestByScene.get(x.id)?.allConditionsPassed===true),
      nativeHardwareGpuBenchmarkPerformed:rows.some(x=>x.hardwareAdapterVerified&&x.native1080Throughout),
      disclaimer:'No fabricated FPS. Hardware GPU presence is checked from WebGL2 debug renderer; if hidden/unavailable, result stays unverified. Scene labels are user-selected.'};
    if(typeof Blob!=='undefined'&&globalThis.URL?.createObjectURL){
      const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='SUNSET_STATE_STAGE22_REAL_1080P_GPU_BENCHMARK.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    }
    return result;
  }
  function install(Game){
    if(!enabled()||!Game||Game.prototype.__stage22BenchInstalled)return false;
    const old=Game.prototype.tick;
    Game.prototype.tick=function stage22MeasuredTick(time){
      const before=performance.now(),oldPaint=this.lastPaint;
      let value;
      try {value=old.apply(this,arguments);}
      finally {try{observe(this,time,performance.now()-before,this.lastPaint!==oldPaint);}
        catch(error){runtime.invalidatedCount++;if(runtime.invalidatedCount===1)console.warn('Stage22 QA measurement failed (game retained):',error);}}
      return value;
    };
    Game.prototype.__stage22BenchInstalled=true;
    if(typeof document!=='undefined'){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',makeUI,{once:true});
      else makeUI();
    }
    return true;
  }
  function makeUI(){
    if(runtime.ui||!document.body)return;
    const host=document.createElement('aside');host.id='stage22-bench-panel';
    host.setAttribute('role','region');host.setAttribute('aria-label','בדיקת GPU מקומית 1080p');
    host.style.cssText='position:fixed;top:82px;right:12px;z-index:11000;background:#10252bea;'+
      'color:#f4f4ef;direction:rtl;font:12px/1.5 system-ui,Arial,sans-serif;'+
      'border:1px solid #9dc8bb;border-radius:12px;padding:12px;width:min(320px,calc(100vw - 24px));'+
      'box-shadow:0 10px 32px #0009;max-height:calc(100vh - 96px);overflow:auto';
    function element(tag,txt){const a=document.createElement(tag);if(txt)a.textContent=txt;host.appendChild(a);return a;}
    const heading=element('strong','שלב 22 · מדידת 1920×1080 / 50FPS');heading.style.fontSize='14px';
    const info=element('p','בחר סצנה, נכנסים אליה במשחק, ואז מודדים 3 שניות חימום ו־20 שניות משחק רגיל. אין הורדת רזולוציה.');
    info.style.margin='8px 0';
    const select=element('select');select.style.cssText='width:100%;background:#163d42;color:white;padding:8px;margin:4px 0;border:1px solid #71958d;';
    for(const scene of SCENES){const option=document.createElement('option');option.value=scene.id;option.textContent=scene.name;select.appendChild(option);}
    const consent=element('label');consent.style.cssText='display:flex;gap:7px;margin:8px 0;align-items:flex-start;';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.style.marginTop='3px';consent.append(checkbox,document.createTextNode('אני נמצא כעת בסצנה שבחרתי (בחירה ידנית).'));
    select.addEventListener('change',()=>{checkbox.checked=false;});
    const buttons=element('div');buttons.style.cssText='display:flex;gap:5px;flex-wrap:wrap;';
    function button(text){const b=document.createElement('button');b.type='button';b.textContent=text;
      b.style.cssText='border-radius:6px;border:1px solid #8dbab3;background:#27545b;color:white;padding:8px;cursor:pointer;';buttons.appendChild(b);return b;}
    const start=button('התחל'),stop=button('עצור'),download=button('ייצא דוח JSON');
    stop.disabled=true;
    const status=element('p','הפעל את המשחק. עבור למצב Native 1080p (F4), ודא שהמסך 1920×1080 לפחות.');
    status.setAttribute('aria-live','polite');status.style.cssText='font-size:11px;overflow-wrap:anywhere;color:#cde2d8';
    const footer=element('small','חומרת GPU לא תזוהה? הדוח יסומן "לא אומת". F3 מציג רזולוציה פנימית.');footer.style.color='#a6c4bc';
    document.body.appendChild(host);
    runtime.ui={host,start,stop,status,select,checkbox};
    start.addEventListener('click',()=>begin(select.value,checkbox.checked));
    stop.addEventListener('click',()=>finish('manually-stopped'));
    download.addEventListener('click',exportReport);
    setInterval(()=>{if(!runtime.run)return;const r=runtime.run;if(r.phase==='capture'&&
      performance.now()-r.measureStartedAt>runtime.target.nominalCaptureMs+1500)finish('watchdog-timeout');},1000);
  }
  H.stage22Benchmark={version:runtime.version,target:TARGET,scenes:SCENES,enabled,classifyAdapter,
    gpuInfo,frameNative,sceneValid,percentile,summarize,install,begin,finish,exportReport,
    get records(){return runtime.records;},get game(){return runtime.game;},get recording(){return !!runtime.run;},
    get panel(){return runtime.ui;}};
  H.installStage22NativeBenchmark=install;
})(Heatline);
