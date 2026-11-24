/* SUNSET STATE — Stage 39: living-city voices (GTA-style ambient speech).
 * Uses the Hebrew SpeechEngine (assets/speech). Every citizen, driver and officer
 * gets a voice that matches how they look (gender, age, tourist, police, luxury
 * car owner...). They react to what the player does:
 *  - you hit their car          -> "מה יש לך?!"
 *  - you bump into them on foot -> "היי, תיזהר!"
 *  - near miss with your car    -> "וואי! כמעט דרסת אותי!"
 *  - you take a car             -> the owner shouts "היי! זה האוטו שלי!"
 *  - police chase               -> "עצור! משטרה!"
 *  - you block traffic          -> horn + "נו כבר!"
 *  - walking past calm people   -> greetings / small talk; tourists ask for the beach
 *  - danger / panic             -> "הצילו!"
 * Speakers are 3-D positioned and their heads move while they talk (lip-sync envelope).
 * Disable with ?voicesOff=1.
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('voicesOff') || params.has('realismOff')) return;

  const LINES = {
    bumpedCar: ['מה יש לך?!', 'אתה עיוור?!', 'תסתכל על הכביש!', 'וואו, באמת?!', 'נהג גרוע!', 'מה הבעיה שלך?!'],
    bumpedFoot: ['היי, תיזהר!', 'סליחה?!', 'לאט לאט!', 'מה יש לך?!'],
    nearMiss: ['וואי! כמעט דרסת אותי!', 'תאט!', 'תסתכל לאן אתה נוסע!'],
    stolen: ['היי! זה האוטו שלי!', 'גנב! תחזיר את הרכב!', 'מישהו, תעזרו!'],
    police: ['עצור! משטרה!', 'תעצור בצד!', 'ידיים למעלה!'],
    greet: ['שלום', 'בוקר טוב', 'מה נשמע?', 'יום יפה היום', 'איזה חום היום', 'היי אחי'],
    tourist: ['סליחה, איפה החוף?', 'יפהפה!', 'אפשר תמונה?'],
    panic: ['הצילו!', 'תברחו!', 'אוי!'],
    honk: ['קדימה, זוז!', 'נו כבר!', 'זוז מהדרך!']
  };
  const pick = (list, seed) => list[Math.abs(Math.floor(seed)) % list.length];
  const hashOf = (o) => { const a = (o.appearance ?? ((Math.round((o.x || 0) * 7) * 73856093) ^ (Math.round((o.z || 0) * 7) * 19349663))) >>> 0; return a; };

  const ids = new WeakMap(); let nextId = 1;
  const idOf = o => { let i = ids.get(o); if (!i) { i = 'npc' + (nextId++); ids.set(o, i); } return i; };

  /** Voice that fits the character's look. */
  function voiceForWalker(w, kind) {
    const a = hashOf(w);
    if (kind === 'police') return ((a >>> 4) & 3) === 1 ? 'police_f1' : ((a >>> 6) & 1 ? 'police_m1' : 'police_m2');
    const female = ((a >>> 9) & 3) === 1;
    const grey = ((a >>> 15) % 7) === 5;
    const teen = ((a >>> 20) % 9) === 0;
    if (w.tourist) return female ? 'tourist_f' : 'tourist_m';
    if (grey) return female ? 'woman_elder' : 'man_elder';
    if (teen) return female ? 'teen_girl' : 'teen_boy';
    const m = ['man_calm', 'man_deep', 'man_bright', 'man_rough', 'man_calm', 'gangster_2'], f = ['woman_calm', 'woman_warm', 'woman_bright', 'woman_calm'];
    return female ? f[(a >>> 12) % f.length] : m[(a >>> 12) % m.length];
  }
  function voiceForCar(c) {
    const cls = H.carClass ? H.carClass(c) : 'standard';
    const a = ((c.paint || 0) * 2654435761 ^ Math.round((c.aiGoalX || c.x || 0) * 13)) >>> 0;
    if (cls === 'police') return 'police_m1';
    const female = (a & 3) === 1;
    if (cls === 'luxury' || cls === 'sport') return female ? 'woman_posh' : 'man_posh';
    if (cls === 'taxi') return 'driver_m';
    if (cls === 'utility') return female ? 'driver_f' : 'man_rough';
    return female ? 'driver_f' : (a & 4 ? 'driver_m' : 'man_bright');
  }

  const V = RC.voices = { engine: null, ready: false, enabled: true, speaking: new WeakMap(), stats: { spoken: 0, dropped: 0 } };
  let initStarted = false;
  async function ensureEngine() {
    if (V.engine || initStarted || !globalThis.SunsetSpeech) return V.engine;
    initStarted = true;
    try {
      const { SpeechEngine } = globalThis.SunsetSpeech;
      // Default: the engine's own per-character custom voices (formant). ?voices=system uses the OS voice.
      const mode = params.get('voices') === 'system' ? 'system' : params.get('voices') === 'auto' ? 'auto' : 'formant';
      V.engine = await new SpeechEngine({ mode, channels: 3, maxDistance: 42, speakerCooldownMs: 1800, ttlMs: 2500 }).init();
      V.ready = true;
    } catch (error) { console.warn('[Voices39] speech engine unavailable', error); V.engine = null; }
    return V.engine;
  }
  for (const ev of ['pointerdown', 'keydown', 'touchend']) globalThis.addEventListener?.(ev, () => { ensureEngine(); if (V.clips && V.clips.ctx && V.clips.ctx.state === 'suspended') V.clips.ctx.resume().catch(() => {}); }, { once: false, capture: true, passive: true });
  // The game ships with sound OFF, which silenced every voice. Pressing Play is a user
  // gesture (required by browsers for audio): switch sound on then, once. The speaker
  // button still mutes it afterwards.
  const enableSoundOnPlay = () => {
    const play = document.getElementById('play-button');
    if (!play || play.__rcSound) return;
    play.__rcSound = true;
    play.addEventListener('click', () => {
      if (V.soundAutoOn) return;
      V.soundAutoOn = true;
      ensureEngine();
      setTimeout(() => {
        const g = globalThis.__SUNSET_PERFORMANCE06_GAME, btn = document.getElementById('sound-button');
        if (g && btn && btn.dataset.off === '1' && !params.has('soundOff')) { try { g.muteSound(); } catch { } }
      }, 60);
    }, true);
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enableSoundOnPlay); else enableSoundOnPlay(); }

  // ---- Recorded neural voice clips (assets/voices, made by TOOLS/generate_voices.py) ----
  // Natural human timbre; played with HRTF 3-D audio. Lines without a clip use the formant engine.
  const CLIP_VOICE = {
    police_f1: 'f_mid', police_m1: 'm_tough', police_m2: 'm_deep', tourist_f: 'f_young', tourist_m: 'm_young',
    woman_elder: 'f_elder', man_elder: 'm_elder', teen_girl: 'teen_f', teen_boy: 'teen_m',
    man_calm: 'm_mid', man_deep: 'm_deep', man_bright: 'm_young', man_rough: 'm_tough', gangster_2: 'm_deep',
    woman_calm: 'f_mid', woman_warm: 'f_warm', woman_bright: 'f_young', woman_posh: 'f_warm', man_posh: 'm_mid',
    driver_m: 'm_mid', driver_f: 'f_mid'
  };
  const C = V.clips = { manifest: null, ctx: null, out: null, buffers: new Map(), active: [], last: new WeakMap(), failed: false };
  const BASE = 'assets/voices/';
  function loadManifest() {
    if (C.manifest || C.loading || C.failed || params.get('voices') === 'formant') return;
    C.loading = true;
    fetch(BASE + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null)
      .then(m => { if (m && m.lines) C.manifest = m; else C.failed = true; })
      .catch(() => { C.failed = true; }).finally(() => { C.loading = false; });
  }
  function clipCtx() {
    if (!C.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      C.ctx = new AC();
      C.out = C.ctx.createGain(); C.out.gain.value = .95;
      const comp = C.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      C.out.connect(comp); comp.connect(C.ctx.destination);
    }
    if (C.ctx.state === 'suspended') C.ctx.resume().catch(() => {});
    return C.ctx;
  }
  function clipBuffer(url) {
    let p = C.buffers.get(url);
    if (!p) {
      p = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => clipCtx().decodeAudioData(b));
      p.catch(() => C.buffers.delete(url));
      C.buffers.set(url, p);
      if (C.buffers.size > 160) C.buffers.delete(C.buffers.keys().next().value);
    }
    return p;
  }
  /** true when a recorded clip handles the line */
  function sayClip(who, text, o) {
    const m = C.manifest, entry = m && m.lines[text];
    if (!entry) return false;
    const voice = CLIP_VOICE[o.voice] || (/woman|girl|_f/.test(o.voice || '') ? 'f_mid' : 'm_mid');
    if (m.voices && !m.voices.includes(voice)) return false;
    const now = performance.now();
    if (now - (C.last.get(who) || -1e9) < 1800) return true;
    if (C.active.length >= 3) {
      if ((o.priority ?? 1) < 2) return true;
      const old = C.active.shift(); try { old.src.stop(); } catch { }
    }
    C.last.set(who, now);
    const ctx = clipCtx(); if (!ctx) return false;
    clipBuffer(BASE + voice + '/' + entry.id + '.mp3').then(buf => {
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = .97 + (((hashOf(who) >>> 3) % 7) * .01);
      const pan = ctx.createPanner();
      Object.assign(pan, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2.2, maxDistance: 60, rolloffFactor: 1.15 });
      const an = ctx.createAnalyser(); an.fftSize = 256;
      const g = ctx.createGain(); g.gain.value = o.priority >= 2 ? 1.15 : .95;
      src.connect(g); g.connect(an); an.connect(pan); pan.connect(C.out);
      const item = { src, pan, an, who, data: new Uint8Array(an.fftSize) };
      placeClip(item);
      C.active.push(item);
      V.speaking.set(who, 'clip');
      src.onended = () => { C.active = C.active.filter(x => x !== item); if (V.speaking.get(who) === 'clip') V.speaking.delete(who); V.stats.spoken++; };
      src.start();
    }).catch(() => { V.stats.dropped++; });
    return true;
  }
  function placeClip(it) {
    const w = it.who, t = C.ctx.currentTime;
    it.pan.positionX.setTargetAtTime(w.x || 0, t, .05);
    it.pan.positionY.setTargetAtTime((w.y || 0) + 1.6, t, .05);
    it.pan.positionZ.setTargetAtTime(w.z || 0, t, .05);
  }
  function tickClips(game) {
    if (!C.ctx) return;
    const c = game.cam, L = C.ctx.listener, t = C.ctx.currentTime;
    const fx = c.tx - c.x, fy = c.ty - c.y, fz = c.tz - c.z, fl = Math.hypot(fx, fy, fz) || 1;
    if (L.positionX) {
      L.positionX.setTargetAtTime(c.x, t, .05); L.positionY.setTargetAtTime(c.y, t, .05); L.positionZ.setTargetAtTime(c.z, t, .05);
      L.forwardX.setTargetAtTime(fx / fl, t, .05); L.forwardY.setTargetAtTime(fy / fl, t, .05); L.forwardZ.setTargetAtTime(fz / fl, t, .05);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(c.x, c.y, c.z); L.setOrientation(fx / fl, fy / fl, fz / fl, 0, 1, 0); }
    const muted = document.getElementById('sound-button')?.dataset.off === '1';
    C.out.gain.setTargetAtTime(muted || game.inside ? 0 : .95, t, .04);
    for (const it of C.active) placeClip(it);
  }
  function clipLoudness(w) {
    const it = C.active.find(x => x.who === w);
    if (!it) return 0;
    it.an.getByteTimeDomainData(it.data);
    let e = 0; for (let i = 0; i < it.data.length; i++) { const v = (it.data[i] - 128) / 128; e += v * v; }
    return Math.min(1, Math.sqrt(e / it.data.length) * 4.5);
  }
  loadManifest();

  function say(game, who, text, o = {}) {
    if (!V.enabled || !who) return;
    const muted = typeof document !== 'undefined' && document.getElementById('sound-button')?.dataset.off === '1';
    if (muted || game.inside) return;
    if (sayClip(who, text, o)) return;
    const E = V.engine;
    if (!E) return;
    const { Priority } = globalThis.SunsetSpeech;
    const id = idOf(who);
    const promise = E.speak(text, {
      voice: o.voice, mood: o.mood || 'neutral', speakerId: id, priority: o.priority ?? Priority.NORMAL,
      position: () => (who.alive === false && who.type ? undefined : { x: who.x, y: (who.y || 0) + 1.6, z: who.z }),
      seed: o.seed
    });
    V.speaking.set(who, id);
    promise.then(r => { if (r === 'done') V.stats.spoken++; else V.stats.dropped++; });
  }
  /** loudness 0..1 of a character currently speaking (drives head motion) */
  RC.speechLoudness = function (w) {
    const id = V.speaking.get(w);
    if (id === 'clip') return clipLoudness(w);
    if (!id || !V.engine) return 0;
    return V.engine.lipSync(id)?.loudness ?? 0;
  };
  function honk(game, car) {
    try {
      const ctx = V.engine?.backend?.ctx; if (!ctx) return;
      const t = ctx.currentTime, d = Math.hypot(car.x - game.cam.x, car.z - game.cam.z), vol = Math.max(0, .22 * (1 - d / 60));
      if (vol <= 0.01) return;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.setValueAtTime(vol, t + .38); g.gain.linearRampToValueAtTime(0, t + .45);
      for (const f of [392, 494]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; o.connect(lp); lp.connect(g); o.start(t); o.stop(t + .5); }
      g.connect(ctx.destination);
    } catch { }
  }

  RC.installers.push(function installVoices(Game) {
    const cool = new WeakMap();
    const ready = (o, s) => { const t = performance.now(); if ((cool.get(o) || 0) > t) return false; cool.set(o, t + s * 1000); return true; };
    let lastGreet = 0, lastPolice = 0, blockClock = 0;

    // Collisions involving the player's car.
    const crash = Game.prototype.crashVehicle;
    Game.prototype.crashVehicle = function (c, speed, nx, nz, kind, px, pz) {
      const r = crash.apply(this, arguments);
      try {
        if (this.inVehicle && kind === 'vehicle' && speed > 2.5) {
          const p = this.player;
          let victim = c !== p ? c : null;
          if (!victim) { let best = 9; for (const o of [...this.civilian, ...this.parked]) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < best) { best = d; victim = o; } } }
          if (victim && victim !== p && victim.type !== 'police' && ready(victim, 6))
            say(this, victim, pick(LINES.bumpedCar, speed * 7 + victim.x), { voice: voiceForCar(victim), mood: speed > 12 ? 'shout' : 'angry' });
        }
      } catch { }
      return r;
    };
    // Taking a car: the owner yells.
    const toggle = Game.prototype.toggleVehicle;
    Game.prototype.toggleVehicle = function () {
      const before = this.inVehicle, a = this.avatar;
      let near = null, best = 6;
      if (!before) for (const o of [...this.civilian, ...this.parked]) { const d = Math.hypot(o.x - a.x, o.z - a.z); if (d < best) { best = d; near = o; } }
      const r = toggle.apply(this, arguments);
      try {
        const take = () => {
          if (!this.inVehicle || !near || this.player !== near) return;
          const owner = { x: near.x + 2.2, y: a.y, z: near.z + 1.2, appearance: hashOf(near) };
          if (ready(near, 20)) say(this, owner, pick(LINES.stolen, near.paint || 1), { voice: voiceForCar(near), mood: 'shout' });
        };
        setTimeout(take, 1400);
      } catch { }
      return r;
    };
    // Per-step checks: bumps on foot, near misses, police, blocking, greetings, panic.
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      const r = update.call(this, dt);
      const E = V.engine;
      try { tickClips(this); } catch { }
      if (!E && !C.manifest) return r;
      try {
        const c = this.cam;
        const fx = c.tx - c.x, fz = c.tz - c.z, fl = Math.hypot(fx, fz) || 1;
        if (E) { E.setListener({ x: c.x, y: c.y, z: c.z, yaw: Math.atan2(-fx / fl, -fz / fl) }); E.update(); }
        if (this.inside) return r;
        const t = performance.now();
        const a = this.avatar, peds = this.pedestrians || [];
        if (!this.inVehicle) {
          const sp = Math.hypot(a.vx || 0, a.vz || 0);
          for (const w of peds) {
            const d = Math.hypot(w.x - a.x, w.z - a.z);
            if (d > 6) continue;
            if (d < .95 && sp > 2.2 && ready(w, 5)) { say(this, w, pick(LINES.bumpedFoot, t), { voice: voiceForWalker(w), mood: 'annoyed' }); continue; }
            if (d < 3.4 && sp < 4 && w.panic <= 0 && t - lastGreet > 7000 && Math.random() < dt * .6 && ready(w, 40)) {
              lastGreet = t;
              const line = w.tourist ? pick(LINES.tourist, t) : pick(LINES.greet, t);
              say(this, w, line, { voice: voiceForWalker(w), mood: 'happy', priority: 0 });
            }
          }
        } else {
          const p = this.player;
          if (p.speed > 9) for (const w of peds) {
            const d = Math.hypot(w.x - p.x, w.z - p.z);
            if (d < 4 && w.injuryState === 'walking' && ready(w, 6)) say(this, w, pick(LINES.nearMiss, t), { voice: voiceForWalker(w), mood: 'scared' });
          }
          // Blocking a waiting car: horn, then a shout.
          if (p.speed < .6) {
            const fwdX = -Math.sin(p.yaw), fwdZ = -Math.cos(p.yaw);
            const behind = this.civilian.find(o => o.speed < .8 && Math.hypot(o.x - p.x, o.z - p.z) < 11 && ((o.x - p.x) * fwdX + (o.z - p.z) * fwdZ) < -2);
            blockClock = behind ? blockClock + dt : 0;
            if (behind && blockClock > 3.5 && ready(behind, 9)) { honk(this, behind); setTimeout(() => say(this, behind, pick(LINES.honk, t), { voice: voiceForCar(behind), mood: 'annoyed' }), 600); }
          } else blockClock = 0;
        }
        // Police shouting during a chase.
        if (this.heat > 0 && t - lastPolice > 6500) {
          const focus = this.inVehicle ? this.player : a;
          const unit = this.police.find(u => u.alive && Math.hypot(u.x - focus.x, u.z - focus.z) < 34);
          if (unit) { lastPolice = t; say(this, unit, pick(LINES.police, t), { voice: 'police_m1', mood: 'shout', priority: 2 }); }
        }
        // Panicking citizens nearby.
        for (const w of peds) if (w.panic > 0 && Math.hypot(w.x - c.x, w.z - c.z) < 25 && ready(w, 12) && Math.random() < .3) { say(this, w, pick(LINES.panic, t), { voice: voiceForWalker(w), mood: 'scared' }); break; }
      } catch (error) { if (!V.warned) { V.warned = true; console.warn('[Voices39]', error); } }
      return r;
    };
  });
  RC.voiceForWalker = voiceForWalker; RC.voiceForCar = voiceForCar; RC.say = say; RC.LINES = LINES;
})(Heatline);
