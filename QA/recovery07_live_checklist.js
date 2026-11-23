/* Optional manual visual QA: use START_GAME.html?recovery7qa=1.
   No instrumentation or extra rendering in normal gameplay. */
(() => {
 'use strict';
 const qs=new URLSearchParams(location.search);
 if(!qs.has('recovery7qa') || window.__SUNSET_RECOVERY07_QA) return;
 const boot=()=>{
  const game=window.__SUNSET_PERFORMANCE06_GAME;
  const canvas=document.getElementById('game');
  if(!canvas || !game) return;
  const scenarios=[
   'Downtown: walk, sprint, jump',
   'Traffic: drive, steer, brake, collisions',
   'Bridge: ramps, rails, cars below',
   'Shop doors, lobby, interiors',
   'Lift and stairs: two different floors',
   'Coast: crocodile near and far; birds',
   'Bright day, manual clock, night, weather',
   'Citizen talks, pursuits, moving crowd'
  ];
  const marked=new Map();
  const records=[];
  const issues=[];
  const wrap=document.createElement('section');wrap.id='qa7-live-panel';
  wrap.setAttribute('aria-label','Recovery 7 real visual QA checklist');
  wrap.style.cssText='position:fixed;z-index:990;bottom:15px;left:16px;width:min(382px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#0e2732ed;color:#f4f1e5;border:1px solid #96ccc7;border-radius:13px;padding:13px;font:12px/1.5 system-ui,Arial,sans-serif;box-shadow:0 10px 38px #0009;';
  const title=document.createElement('strong');title.textContent='RECOVERY 7 - live game QA';title.style.cssText='font-size:16px;display:block;margin-bottom:4px';wrap.appendChild(title);
  const help=document.createElement('div');help.textContent='Visual checks are manual. FPS uses display-frame timing, NOT GPU timestamps. Check each zone yourself.';wrap.appendChild(help);
  const select=document.createElement('select');select.setAttribute('aria-label','Choose QA scene');select.style.cssText='width:100%;background:#244754;color:#fff;border:1px solid #88c1c8;border-radius:6px;padding:7px;margin:8px 0';
  for(let i=0;i<scenarios.length;i++){const opt=document.createElement('option');opt.value=String(i);opt.textContent=(i+1)+'. '+scenarios[i];select.appendChild(opt);}wrap.appendChild(select);
  const state=document.createElement('div');state.setAttribute('aria-live','polite');state.style.cssText='padding:7px;margin:5px 0;background:#163b43;border-radius:7px';wrap.appendChild(state);
  const box=document.createElement('div');box.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';wrap.appendChild(box);
  const makeButton=(label,onClick)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#315d65;color:#fff;border:1px solid #83c6c0;border-radius:7px;padding:7px 9px;min-height:34px;cursor:pointer;display:inline-block';b.addEventListener('click',onClick);box.appendChild(b);return b;};
  const summary=()=>{
   const q=Number(select.value);let ok=0,fail=0;
   for(const v of marked.values()){if(v==='pass')ok++;if(v==='fail')fail++;}
   const g=game.renderer;
   state.textContent=`Scene ${q+1}: ${marked.get(q)||'unchecked'} | ${ok} pass / ${fail} fail | ${canvas.width}x${canvas.height} | ${g?.name||'unknown'} | clock ${game.worldHour?.toFixed(2)||'?'} | cycle ${game.clockRunning?'ON':'OFF'}`;
  };
  select.addEventListener('change',summary);
  makeButton('PASS scene',()=>{marked.set(Number(select.value),'pass');summary()});
  makeButton('FAIL scene',()=>{marked.set(Number(select.value),'fail');summary()});
  makeButton('Clear',()=>{marked.delete(Number(select.value));summary()});
  let measuring=false,last=0,started=0,intervals=[],sizes=[];
  const fpsBtn=makeButton('Measure 20 sec',()=>{
   if(measuring||!game.running){state.textContent='Start the game first.';return;}
   measuring=true;fpsBtn.disabled=true;intervals=[];sizes=[];started=performance.now();last=started;
   const scene=Number(select.value);
   function frame(t){
    if(!measuring)return;
    const dt=t-last;last=t;if(dt>0&&dt<1000)intervals.push(dt);
    if(intervals.length%30===0)sizes.push([canvas.width,canvas.height]);
    if(t-started<20000){requestAnimationFrame(frame);return;}
    const sorted=intervals.slice().sort((a,b)=>a-b),ms=t-started;
    const entry={scene,sceneLabel:scenarios[scene],elapsedMs:Math.round(ms),frames:intervals.length,displayFps:Number((intervals.length*1000/ms).toFixed(2)),p95FrameMs:sorted[Math.floor(.95*(sorted.length-1))]||null,
      bufferStart:sizes[0]||[canvas.width,canvas.height],bufferEnd:[canvas.width,canvas.height],allSamplesNative1080:sizes.length>0&&sizes.every(([w,h])=>w>=1920&&h>=1080),
      gpuFrameTimingMeasured:false,hardwareFpsVerified:false,method:'rAF display cadence on the computer where manually run'};
    entry.meetsDisplayTarget=entry.allSamplesNative1080&&entry.displayFps>=50;records.push(entry);measuring=false;fpsBtn.disabled=false;summary();
    state.textContent+=` | last measurement: ${entry.displayFps} display FPS; native ${entry.allSamplesNative1080}`;
   }
   requestAnimationFrame(frame);
  });
  const download=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const href=URL.createObjectURL(b);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),4000);};
  const snapshot=()=>({project:'SUNSET STATE',phase:7,source:'Live manual observation; NOT automatic visual validation',date:new Date().toISOString(),hardware:{screen:[screen.width,screen.height],pixelRatio:devicePixelRatio,userAgent:navigator.userAgent},renderer:{name:game.renderer?.name,buffer:[canvas.width,canvas.height],graphicsLost:game.graphicsLost,activeMode:game.visualMode450},game:{running:game.running,inside:game.inside,inVehicle:game.inVehicle,hour:game.worldHour,cycle:game.clockRunning,weather:game.weather?.label,pedestrians:game.pedestrians?.length,animals:game.stage39Life?.wildlife?.length,roads:game.world?.roads461?.length,portals:game.world?.entrancePortals?.length,visibleFrame:window.__SUNSET_STAGE17_VISIBILITY||null},scenarios:scenarios.map((label,i)=>({label,result:marked.get(i)||'not checked'})),measurements:records,issues,notVerifiedByModel:'Visual quality, sustained GPU FPS and full playthrough must be verified by user on running game'});
  makeButton('Export JSON',()=>download(snapshot(),'SUNSET_RECOVERY07_LIVE_QA.json'));
  makeButton('Capture game PNG',()=>{
   if(typeof canvas.toBlob!=='function'){state.textContent='Canvas capture unavailable; use OS screenshot.';return;}
   // WebGL preserveDrawingBuffer=false may yield a blank image in some browsers.
   canvas.toBlob(blob=>{
    if(!blob){state.textContent='Capture failed; use system screenshot.';return;}
    const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='SUNSET_RECOVERY07_REAL_CANVAS.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),4000);
    state.textContent='Canvas PNG saved. Verify it is not blank before using as visual evidence.';
   },'image/png');
  });
  const collapse=makeButton('Hide / show',()=>{const hidden=wrap.dataset.collapsed==='1';wrap.dataset.collapsed=hidden?'0':'1';help.hidden=!hidden;select.hidden=!hidden;state.hidden=!hidden;for(const child of box.children){if(child!==collapse)child.style.display=hidden?'inline-block':'none';}collapse.textContent=hidden?'Hide / show':'Show QA tools';});
  window.addEventListener('error',e=>{if(issues.length<60)issues.push({kind:'error',at:Date.now(),message:String(e.message),file:e.filename,line:e.lineno});});
  window.addEventListener('unhandledrejection',e=>{if(issues.length<60)issues.push({kind:'rejection',at:Date.now(),message:String(e.reason)});});
  document.body.appendChild(wrap);summary();
  window.__SUNSET_RECOVERY07_QA={snap:snapshot,records,marked,scenarios};
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
