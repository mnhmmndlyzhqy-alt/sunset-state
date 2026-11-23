/* SUNSET STATE: 15-stage polish programme, Stage 01 field test.
   Opt-in by ?stage1qa=1. No input simulation, no renderer mutation and no gameplay changes.
   FPS is requestAnimationFrame display cadence, NOT a GPU timestamp or automatic visual proof. */
(() => {
  'use strict';
  if (!new URLSearchParams(location.search).has('stage1qa') || window.__SUNSET_15_STAGE01_QA) return;
  const scenarios = [
    { id: 'walk', label: '1. הליכה במרכז העיר',
      steps: 'הפעל את המשחק; בדוק WASD, הליכה באלכסון, Shift לריצה, Space לקפיצה, מדרגות, מדרונות והתנגשות בקירות.',
      expected: 'תנועה רציפה וטבעית, בלי היתקעות, החלקה, שקיעה או מעבר דרך קירות.' },
    { id: 'drive', label: '2. נהיגה ותאונות',
      steps: 'עמוד ליד רכב ולחץ E; סע, פנה, בלום, בדוק כביש משופע, בלימת חירום ויציאה מהרכב.',
      expected: 'הרכב מגיב להיגוי ולאחיזה; נזק והתנגשויות הגיוניים, בלי ריחוף או חדירת משטחים.' },
    { id: 'bridge', label: '3. גשרים ומעקות',
      steps: 'סע על גשר מעוקל, במעלה ובמורד, ובדוק מעקות, חיבור לכביש, תנועה מתחת לגשר ומצלמה.',
      expected: 'אין קפיצות גובה, מכונית תלויה, מעקה שבור או רכב שקופץ ממפלס אחד לאחר.' },
    { id: 'shops', label: '4. חנויות וכניסות',
      steps: 'התקרב לדלת פעילה; לחץ E. בדוק כניסה דרך הפתח, רצפה, חלונות ראווה, קופה/אינטראקציה וחזרה לרחוב.',
      expected: 'דלת ניתנת לגישה, פנים במידות סבירות וללא טלפורט אל גג או מעבר דרך קיר.' },
    { id: 'lift', label: '5. לובי, מעליות ומדרגות',
      steps: 'היכנס למבנה פעיל, בדוק L ליד המעלית, כפתורי קומות, PageUp/PageDown, R/B למדרגות ו-X ליציאה.',
      expected: 'עלייה וירידה בין קומות, דלת/רצפה תקינות, חזרה ללובי ולרחוב באותה נקודת כניסה.' },
    { id: 'coast', label: '6. חוף, מים ובעלי חיים',
      steps: 'בדוק תנין ממרחק ~150/70/30/5 מטר, שחייה ומעבר LOD; בחן דולפינים, ציפורים, דגים וצמחייה מול המים.',
      expected: 'בעלי חיים במקומות מתאימים, בלי קפיצות מודל בולטות, מים/חוף רציפים וצמחייה לא בתוך כביש.' },
    { id: 'weather', label: '7. תאורה, שעון ומזג אוויר',
      steps: 'בדוק התחלה ב-12:15, מחזור יום/לילה כבוי; H להדלקת המחזור, [ ו-] לשינוי שעה, Y לשינוי מזג האוויר.',
      expected: 'אין שינויי תאורה מסנוורים או תמונה חיוורת; לילה/יום וגשם תואמים לתצוגת השעון.' },
    { id: 'npc', label: '8. תושבים, משטרה ומשימות',
      steps: 'בדוק חציית כבישים והולכי רגל, V לשיחה, K ללוח משימות, אירוע משטרה ומרדף בהתאם למעשי השחקן.',
      expected: 'תנועה טבעית ותגובות הגיוניות, בלי תקיעה; משימה ניתנת להשלמה והשוטרים אינם מציפים את העיר.' }
  ];
  const boot = () => {
    const canvas = document.getElementById('game');
    const game = window.__SUNSET_PERFORMANCE06_GAME || window.__SUNSET_QA443 || null;
    if (!canvas || !game) return false;
    if (window.__SUNSET_15_STAGE01_QA) return true;
    const records = {}, measurements = [], issues = [], failures = [];
    const startup = new Date().toISOString();
    let measuring = false, req = null;
    const storageKey = 'SUNSET_15_STAGE01_QA_V1';
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && saved.version === 1) {
        for (const [k, v] of Object.entries(saved.records || {})) if (scenarios.some(s => s.id === k)) records[k] = v;
        if (Array.isArray(saved.measurements)) measurements.push(...saved.measurements.slice(-80));
        if (Array.isArray(saved.issues)) issues.push(...saved.issues.slice(-80));
      }
    } catch (_) { /* QA remains usable if localStorage is denied */ }
    const persist = () => {
      try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, records, measurements, issues })); } catch (_) {}
    };
    const make = (tag, text, css) => {
      const node = document.createElement(tag);
      if (text != null) node.textContent = text;
      if (css) node.style.cssText = css;
      return node;
    };
    const host = make('section', null, 'position:fixed;top:74px;left:12px;z-index:9999;width:min(390px,calc(100vw - 24px));max-height:min(78vh,780px);overflow:auto;direction:rtl;text-align:right;background:#0d2530f4;border:1px solid #84cec9;border-radius:13px;padding:13px;color:#f4f7ed;font:13px/1.5 Arial,system-ui,sans-serif;box-shadow:0 15px 50px #000a;');
    host.id = 'sunset-stage01-qa-panel';
    host.setAttribute('aria-label', 'בדיקות שטח — שלב 1 מתוך 15');
    const h = make('strong', 'SUNSET STATE · בדיקות שטח 1/15', 'display:block;font-size:17px;margin-bottom:6px;color:#e7d4a3;');
    const warning = make('div', 'הבדיקה מבוססת על המשחק האמיתי במחשב שלך. תוצאות PASS הן דיווח שלך, לא אימות אוטומטי. FPS הוא קצב תצוגה, לא מדידת GPU.', 'font-size:11px;opacity:.88;margin-bottom:8px;');
    const badge = make('div', '', 'padding:7px;background:#213d47;border-radius:7px;margin-bottom:8px;white-space:pre-line;');
    const panel = make('div');
    const select = make('select', null, 'display:block;width:100%;margin:7px 0;padding:8px;background:#244854;color:white;border:1px solid #75bfc3;border-radius:7px;');
    for (const scene of scenarios) { const option = make('option', scene.label); option.value = scene.id; select.append(option); }
    const instructions = make('div', '', 'background:#1a3540;padding:9px;border-radius:8px;white-space:pre-line;min-height:125px;');
    const notes = make('textarea', null, 'margin:7px 0;width:100%;height:65px;resize:vertical;border-radius:7px;padding:8px;background:#172f38;color:#fff;border:1px solid #78abb0;font:12px Arial,sans-serif;');
    notes.placeholder = 'מיקום מדויק, התנהגות בפועל, מה היה צפוי, תיאור תקלה…';
    // The game listens to keydown on window; typing test notes must not drive the avatar.
    notes.addEventListener('keydown', e => e.stopPropagation());
    notes.addEventListener('keyup', e => e.stopPropagation());
    const controls = make('div', null, 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;');
    const makeButton = (label, fn) => {
      const btn = make('button', label, 'display:inline-block;padding:7px 10px;min-height:33px;border:1px solid #84b6b3;background:#2b535d;color:white;border-radius:7px;cursor:pointer;font:12px Arial,system-ui;');
      btn.type = 'button'; btn.addEventListener('click', fn); controls.append(btn); return btn;
    };
    const result = make('div', 'לא בוצעה מדידה.', 'background:#254853;padding:7px;border-radius:7px;margin-top:8px;font-size:11px;white-space:pre-wrap;');
    const extra = make('div', '', 'display:flex;gap:8px;align-items:center;margin-top:6px;');
    const minimize = make('button', 'מזער', 'border:1px solid #6aa4ae;border-radius:6px;padding:6px;background:#315763;color:white;font-size:12px;cursor:pointer;');
    extra.append(minimize);
    host.append(h, warning, badge, panel, extra);
    panel.append(select, instructions, notes, controls, result);
    document.body.append(host);

    const hardware = () => ({
      ua: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      memoryGB: navigator.deviceMemory ?? null, pixelRatio: devicePixelRatio,
      window: [innerWidth, innerHeight], screen: [screen.width, screen.height],
      buffer: [canvas.width, canvas.height], canvasCSS: [Math.round(canvas.getBoundingClientRect().width), Math.round(canvas.getBoundingClientRect().height)]
    });
    const snapshot = () => {
      const renderer = game.renderer || {};
      const gl = renderer.gl || null;
      let webgl = null;
      try { if (gl && gl.getParameter) webgl = { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR) }; } catch (_) {}
      const avatar = game.avatar || {};
      const player = game.player || {};
      return {
        time: new Date().toISOString(), device: hardware(),
        renderer: { name: renderer.name ?? null, webgl, internal: [canvas.width, canvas.height], mode: game.visualMode450 ?? null, graphicsLost: !!game.graphicsLost },
        game: { running: !!game.running, paused: !!game.paused, fpsReportedByEngine: Number.isFinite(game.fps) ? Number(game.fps.toFixed(2)) : null,
          inVehicle: !!game.inVehicle, inside: !!game.inside, retail: !!game.retailVisit, floor: game.indoor?.floor ?? null,
          position: { x: avatar.x ?? null, y: avatar.y ?? null, z: avatar.z ?? null },
          car: game.inVehicle ? { x: player.x ?? null, z: player.z ?? null, speed: player.speed ?? null } : null,
          worldHour: game.worldHour ?? null, cycleRunning: !!game.clockRunning, weather: game.weather?.label ?? null,
          civilians: game.pedestrians?.length ?? null, police: game.police?.length ?? null,
          portals: game.world?.entrancePortals?.length ?? null, readyPortals: game.world?.entrancePortals?.filter(p => p.interiorReady).length ?? null,
          roads: game.world?.roads461?.length ?? null, heat: game.heat ?? null, activeMissions: game.story445?.missions?.length ?? null }
      };
    };
    const current = () => scenarios.find(s => s.id === select.value) || scenarios[0];
    const sync = () => {
      const sc = current(); const info = records[sc.id] || {};
      instructions.textContent = 'מה עושים: ' + sc.steps + '\n\nמצופה: ' + sc.expected;
      notes.value = info.notes || '';
      const marked = scenarios.filter(s => records[s.id]?.status === 'PASS' || records[s.id]?.status === 'FAIL');
      const pass = marked.filter(s => records[s.id]?.status === 'PASS').length;
      badge.textContent = `${marked.length}/8 תרחישים תועדו · ${pass} עברו · ${marked.length - pass} נכשלו\nקנבס ${canvas.width}×${canvas.height} · ${game.running ? 'המשחק רץ' : 'יש להפעיל את המשחק'} · ${measurements.length} מדידות`;
      result.textContent = `${sc.label}: ${info.status || 'לא נבדק'}${info.at ? ` · ${info.at}` : ''}`;
    };
    const mark = status => {
      const sc = current(); records[sc.id] = { status, at: new Date().toISOString(), notes: notes.value.trim(), observed: snapshot() };
      persist(); sync();
    };
    select.addEventListener('change', sync);
    notes.addEventListener('blur', () => { if (records[current().id]) { records[current().id].notes = notes.value.trim(); persist(); } });
    makeButton('עבר ✓', () => mark('PASS'));
    makeButton('תקלה ✕', () => mark('FAIL'));
    makeButton('לא נבדק', () => mark('UNTESTED'));
    const measureBtn = makeButton('מדוד 20 שניות', () => {
      if (measuring) return;
      if (!game.running || game.paused || document.hidden) { result.textContent = 'יש להפעיל משחק גלוי ולא מושהה לפני מדידה.'; return; }
      measuring = true; measureBtn.disabled = true;
      const id = current().id; const sizes = [[canvas.width, canvas.height]], intervals = [];
      const ts = new Date().toISOString(), start = performance.now(); let previous = start, hidden = false, stopped = false;
      const onVisibility = () => { if (document.hidden) hidden = true; };
      document.addEventListener('visibilitychange', onVisibility);
      const finish = end => {
        document.removeEventListener('visibilitychange', onVisibility);
        measuring = false; measureBtn.disabled = false; req = null;
        const elapsed = end - start, sorted = intervals.slice().sort((a,b)=>a-b);
        const percentile = q => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))].toFixed(2) : null;
        const fps = elapsed > 0 ? +(intervals.length * 1000 / elapsed).toFixed(2) : 0;
        const native = sizes.every(v => v[0] >= 1920 && v[1] >= 1080), active = !hidden && !stopped && !!game.running && !game.paused;
        const rec = { id, scene: scenarios.find(s=>s.id===id)?.label, at: ts, seconds: +(elapsed/1000).toFixed(2),
          frames: intervals.length, displayFps: fps, p50FrameMs: percentile(.5), p95FrameMs: percentile(.95), p99FrameMs: percentile(.99),
          maxFrameMs: sorted.length ? +sorted.at(-1).toFixed(2) : null, native1080EverySample: native,
          allSamples: sizes, browserStayedVisible: !hidden, gameStayedActive: active, bufferEnd: [canvas.width, canvas.height],
          meetsDisplayTarget: active && native && fps >= 50 && percentile(.95) != null && percentile(.95) <= 20,
          method: '20-second real-browser requestAnimationFrame frame cadence; not GPU draw timing',
          gpuTimingMeasured: false, manuallyMovedInScene: 'USER MUST CONFIRM', device: hardware() };
        measurements.push(rec); persist(); sync();
        result.textContent = `${rec.scene}\n${rec.displayFps} FPS תצוגה | p95 ${rec.p95FrameMs}ms | 1080p ${native ? 'כן':'לא'} | ${rec.meetsDisplayTarget?'יעד תצוגה הושג':'יעד תצוגה לא אומת'}`;
      };
      const frame = now => {
        if (!measuring) return;
        if (!game.running || game.paused) stopped = true;
        const dt = now - previous; previous = now;
        // Include long frames: they are important evidence of stutter.
        if (dt > 0 && Number.isFinite(dt)) intervals.push(dt);
        if (intervals.length % 15 === 0) sizes.push([canvas.width, canvas.height]);
        if (now - start >= 20000 || stopped || hidden) finish(now);
        else { result.textContent = `מודד: ${Math.ceil((now-start)/1000)}/20 שניות. זוז כרגיל!`; req = requestAnimationFrame(frame); }
      };
      req = requestAnimationFrame(frame);
    });
    const download = (object, name) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(object,null,2)], {type: 'application/json'}));
      const a = document.createElement('a');a.href = url;a.download = name;document.body.append(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    const report = () => ({ schemaVersion: 1, project: 'SUNSET STATE 4.7.9 / CITY20 20/20 / Recovery 7/7',
      programme: '15-stage polish', stage: 1, source: 'User-operated running game; manual observations, display timings only',
      begunAt: startup, savedAt: new Date().toISOString(), environment: hardware(), stateNow: snapshot(),
      scenarios: scenarios.map(s => ({id:s.id,label:s.label,steps:s.steps,expected:s.expected, ...(records[s.id] || {status:'UNTESTED'})})),
      benchmarks: measurements, incidents: issues, jsFailures: failures, acceptance: {
        allEightManuallyChecked: scenarios.every(s => ['PASS','FAIL'].includes(records[s.id]?.status)),
        allEightManuallyPassed: scenarios.every(s => records[s.id]?.status === 'PASS'),
        threeDistinctNative1080ScenesMeasured: new Set(measurements.filter(m => m.native1080EverySample && m.gameStayedActive && m.seconds >= 19.5).map(m=>m.id)).size >= 3,
        allMeasuredScenes50DisplayFps: measurements.length>0 && measurements.every(m=>m.meetsDisplayTarget),
        actualHardwareGpuTimed: false,
        actualScreenshotsReviewedByAssistant: false
      }, note: 'Manual PASS is self-reported; not independently verified. To share evidence, export JSON plus real screenshots from the game.' });
    makeButton('ייצא דוח JSON', () => download(report(), 'SUNSET_STAGE01_15_LIVE_QA.json'));
    makeButton('צילום קנבס PNG', () => {
      if (!canvas.toBlob) { result.textContent = 'צילום קנבס אינו נתמך; השתמש ב-Win+Shift+S.'; return; }
      canvas.toBlob(blob => {
        if (!blob || blob.size < 256) { result.textContent = 'צילום הקנבס נכשל/ריק; השתמש ב-Win+Shift+S.'; return; }
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`SUNSET_STAGE01_${current().id}_GAME.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
        result.textContent = 'התמונה נשמרה. בדוק שאינה שחורה או ריקה; אחרת השתמש ב-Win+Shift+S.';
      }, 'image/png');
    });
    makeButton('איפוס תוצאות QA', () => {
      if (!window.confirm('למחוק רק את רשומות הבדיקה? המשחק והשמירות לא יושפעו.')) return;
      for (const k of Object.keys(records)) delete records[k]; measurements.length = 0; issues.length = 0; persist(); sync();
    });
    minimize.addEventListener('click', () => {
      panel.hidden = !panel.hidden; warning.hidden = panel.hidden; badge.hidden = panel.hidden;
      minimize.textContent = panel.hidden ? 'פתח בדיקות' : 'מזער';
    });
    window.addEventListener('error', e => { const x={at:new Date().toISOString(),kind:'error',message:String(e.message).slice(0,500),filename:e.filename,line:e.lineno}; failures.push(x); if (issues.length<100) issues.push(x);persist(); });
    window.addEventListener('unhandledrejection', e => { const x={at:new Date().toISOString(),kind:'promise',message:String(e.reason).slice(0,500)}; failures.push(x);if(issues.length<100)issues.push(x);persist(); });
    canvas.addEventListener('webglcontextlost', () => { issues.push({at:new Date().toISOString(),kind:'webglcontextlost'});persist(); }, false);
    window.__SUNSET_15_STAGE01_QA = {report, scenarios, measurements, records, issues, snapshot};
    sync(); return true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
