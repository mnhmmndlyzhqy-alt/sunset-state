/* SUNSET STATE City20 Stage 06 QA: opt-in only with ?city20qa=1.
   Measures the real display frame cadence and drawing buffer size, not GPU draw cost.
   Requires player to visit the chosen scene manually. No game state mutation. */
(()=>{
  'use strict';
  if (!new URLSearchParams(location.search).has('city20qa'))return;
  if (window.__CITY20_BENCHMARK__)return;
  const startWhenReady=()=>{
    const gameCanvas=document.querySelector('canvas#game');
    if(!gameCanvas)return;
    const host=document.createElement('aside');
    host.setAttribute('role','region');host.setAttribute('aria-label','SUNSET STATE performance test');
    host.id='city20-bench-ui';
    host.style.cssText='position:fixed;z-index:500;top:110px;left:16px;max-width:330px;width:calc(100vw - 32px);padding:12px;border-radius:12px;background:#102733eb;color:#f5f8ef;font:12px/1.45 system-ui,Arial,sans-serif;border:1px solid #9ad9d2;direction:rtl;box-shadow:0 12px 35px #0008;';
    const heading=document.createElement('div'); heading.textContent='CITY20 · בדיקת 1080p / FPS'; heading.style.cssText='font-weight:750;font-size:14px;';host.append(heading);
    const note=document.createElement('p');note.textContent='היכנס למשחק, בחר סצנה, לחץ התחל והסתובב כרגיל. 20 שניות לכל סצנה. הבדיקה אינה מורידה רזולוציה.';host.append(note);
    const picker=document.createElement('select');picker.setAttribute('aria-label','בחר סצנה');picker.style.cssText='width:100%;padding:8px;background:#1b4249;color:#fff;border:1px solid #95c3bf;border-radius:7px';
    const scenes=['הליכה במרכז העיר','נהיגה בצומת','נסיעה על גשר','מסוק מעל מרכז העיר','הליכה בתוך לובי','נמל וחוף'];
    for(const s of scenes){const o=document.createElement('option');o.value=s;o.textContent=s;picker.appendChild(o);}host.append(picker);
    const info=document.createElement('p');info.setAttribute('aria-live','polite');host.append(info);
    const row=document.createElement('div');row.style.cssText='display:flex;gap:7px;flex-wrap:wrap;';host.append(row);
    function btn(label){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:38px;padding:7px 11px;border-radius:7px;background:#355962;color:#fff;border:1px solid #80aaa9;cursor:pointer;';row.appendChild(b);return b;}
    const start=btn('התחל מדידה'),stop=btn('עצור'),download=btn('שמור JSON');
    document.body.appendChild(host);
    let running=false,started=0,last=0,req=0,intervals=[],samples=[],pixels=[],record=[];
    const targetMs=20000;
    function dims(){return {width:gameCanvas.width,height:gameCanvas.height};}
    function finish(reason){if(!running)return;running=false;cancelAnimationFrame(req);const elapsed=performance.now()-started;const frames=intervals.length;
      const sorted=intervals.filter(Number.isFinite).slice().sort((a,b)=>a-b);
      function percentile(q){if(!sorted.length)return null;return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))];}
      const fps=elapsed>0?frames*1000/elapsed:0;
      const worst=sorted.length?sorted[sorted.length-1]:null;
      const atLeastNative=pixels.length>0&&pixels.every(a=>a.width>=1920&&a.height>=1080);
      const result={scene:picker.value,startedAt:new Date().toISOString(),elapsedMs:Math.round(elapsed),frames,avgFps:+fps.toFixed(2),
       p95FrameMs:percentile(.95),p99FrameMs:percentile(.99),worstFrameMs:worst,internalBufferStart:pixels[0]||dims(),internalBufferEnd:dims(),
       native1080AllSamples:atLeastNative,meetsAvg50Fps:fps>=50,measurementMethod:'display requestAnimationFrame cadence (not GPU timing)',
       targetPass:atLeastNative&&fps>=50,manualContext:true,gpuProfilerVerified:false,skylineStage06Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE06),waterStage05Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE05),terrainStage03Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE03),roadStage04Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE04),
       hardware:{devicePixelRatio:window.devicePixelRatio,viewport:[innerWidth,innerHeight],userAgent:navigator.userAgent},
       caveat:'Display rAF timings: use multiple runs and check F3 internal resolution. Not a deterministic GPU profiler.'};
      record.push(result);info.textContent=`${picker.value}: ${fps.toFixed(1)}FPS | ${result.internalBufferEnd.width}×${result.internalBufferEnd.height} | ${result.targetPass?'היעד נמדד בסצנה':'היעד לא הושג/לא נמדד'}`;
      start.disabled=false;stop.disabled=true;
      window.__CITY20_BENCHMARK__.last=result;
    }
    function tick(t){if(!running)return;const d=t-last;last=t;if(d>0&&d<500){intervals.push(d);if(intervals.length%24===0){pixels.push(dims());info.textContent=`מודד ${picker.value}: ${Math.round((t-started)/1000)} / 20 שניות | ${dims().width}×${dims().height}`;}}
     if(t-started>=targetMs){finish('time');return;}req=requestAnimationFrame(tick);
    }
    start.addEventListener('click',()=>{if(running)return;running=true;started=performance.now();last=started;intervals=[];pixels=[dims()];start.disabled=true;stop.disabled=false;info.textContent='מודד...';req=requestAnimationFrame(tick);});
    stop.addEventListener('click',()=>finish('manual'));
    download.addEventListener('click',()=>{
     const report={project:'SUNSET STATE City20',base:'4.7.9 + CITY20',stage:20,skylineStage06Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE06),waterStage05Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE05),terrainStage03Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE03),roadStage04Enabled:!Boolean(window.__SUNSET_CITY20_DISABLE_STAGE04),target:{width:1920,height:1080,minFps:50},record,
       gpuProfilerVerified:false,allScenesComplete:scenes.every(s=>record.some(x=>x.scene===s)),allSamplesPass:scenes.every(s=>record.some(x=>x.scene===s&&x.targetPass))};
     const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
     const a=document.createElement('a');a.href=url;a.download='SUNSET_CITY20_REAL_GPU_TEST.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    });
    stop.disabled=true;
    window.__CITY20_BENCHMARK__={records:record,last:null,version:'stage20',scenes};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startWhenReady,{once:true});else startWhenReady();
})();
