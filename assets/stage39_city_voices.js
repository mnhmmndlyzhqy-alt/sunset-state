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
  for (const ev of ['pointerdown', 'keydown', 'touchend']) globalThis.addEventListener?.(ev, () => ensureEngine(), { once: false, capture: true, passive: true });
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

  function say(game, who, text, o = {}) {
    const E = V.engine;
    if (!E || !V.enabled || !who) return;
    const muted = typeof document !== 'undefined' && document.getElementById('sound-button')?.dataset.off === '1';
    if (muted || game.inside) return;
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
      if (!E) return r;
      try {
        const c = this.cam;
        const fx = c.tx - c.x, fz = c.tz - c.z, fl = Math.hypot(fx, fz) || 1;
        E.setListener({ x: c.x, y: c.y, z: c.z, yaw: Math.atan2(-fx / fl, -fz / fl) });
        E.update();
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
