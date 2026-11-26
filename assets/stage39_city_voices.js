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
    greet: ['שלום', 'בוקר טוב', 'מה נשמע?', 'יום יפה היום', 'איזה חום היום', 'היי אחי', 'איזו שקיעה יפה היום!', 'ערב טוב'],
    admire: ['וואו, איזה רכב!', 'יפה הרכב הזה!', 'אחי, איזו מכונית!'],
    shots: ['מה זה היה?!', 'ירו! תתכופפו!', 'וואי וואי וואי!', 'תברחו, יורים!'],
    boom: ['פיצוץ! תברחו!', 'מה קרה שם?!', 'אלוהים, מה זה היה?!'],
    help: ['אלוהים, הוא בסדר?', 'תקראו לאמבולנס!', 'מישהו, תעזרו לו!'],
    fast: ['איפה אתה ממהר?!', 'תאט, יש פה אנשים!', 'וואו, איזו מהירות!'],
    tourist: ['סליחה, איפה החוף?', 'יפהפה!', 'אפשר תמונה?'],
    panic: ['הצילו!', 'תברחו!', 'אוי!'],
    honk: ['קדימה, זוז!', 'נו כבר!', 'זוז מהדרך!'],
    thanks: ['בכיף!', 'אין על מה.', 'בשמחה, באמת.'],
    browse: ['שלום. מה אתה צריך?', 'תגיד לי מה אתה מחפש.', 'היי, מה קורה?'],
    arrival: ['שלום שלום!', 'אהלן, איזה כיף.', 'מה מביא אותך לפה היום?'],
    recover: ['בסדר, לא נורא.', 'אוקיי, הבנתי.']
  };
  const REACTIONS = {
    greet: ['happy', 0, 12000], tourist: ['happy', 0, 15000], thanks: ['happy', 0, 8000],
    browse: ['neutral', 0, 12000], arrival: ['happy', 0, 12000], recover: ['calm', 0, 10000],
    admire: ['happy', 0, 12000], bumpedCar: ['angry', 1, 5500], bumpedFoot: ['annoyed', 1, 4500],
    fast: ['angry', 1, 9500], honk: ['annoyed', 1, 7000], warning: ['scared', 2, 7000],
    nearMiss: ['scared', 2, 6000], stolen: ['shout', 2, 7000], police: ['shout', 2, 6000],
    panic: ['scared', 2, 8500], help: ['scared', 2, 9500], boom: ['scared', 2, 8500], shots: ['scared', 2, 8500]
  };
  const WEATHER_GREET = { morning: 'בוקר טוב', evening: 'ערב טוב', sunset: 'איזו שקיעה יפה היום!' };
  const RATE_MOOD = { calm: .978, happy: 1.015, scared: 1.035, shout: 1.023, angry: 1.025, annoyed: 1.014 };
  const recentReactions = new WeakMap();
  const lastReaction = new Map();
  const hashOf = (o) => { const a = (o.appearance ?? ((Math.round((o.x || 0) * 7) * 73856093) ^ (Math.round((o.z || 0) * 7) * 19349663))) >>> 0; return a; };

  const ids = new WeakMap(); let nextId = 1;
  const idOf = o => { let i = ids.get(o); if (!i) { i = 'npc' + (nextId++); ids.set(o, i); } return i; };

  const walkerVoices = new WeakMap();
  const actorRates = new WeakMap();
  function actorRate(w) {
    if (!actorRates.has(w)) actorRates.set(w, .978 + (((hashOf(w) >>> 3) ^ (hashOf(w) >>> 17)) & 15) * .003);
    return actorRates.get(w);
  }

  /** Cache the same voice for introductions, reactions and subsequent conversations. */
  function voiceForWalker(w, kind) {
    if (!kind && Object.hasOwn(CLIP_VOICE, w.estateVoice53)) return w.estateVoice53;
    if (kind === 'police') return matchingVoice(w, kind);
    if (!walkerVoices.has(w)) walkerVoices.set(w, matchingVoice(w));
    return walkerVoices.get(w);
  }
  function matchingVoice(w, kind) {
    const a = hashOf(w);
    if (kind === 'police') return ((a >>> 4) & 3) === 1 ? 'police_f1' : ((a >>> 6) & 1 ? 'police_m1' : 'police_m2');
    // Same bits the body builder uses: gender, grey hair, build, height, beard.
    const female = ((a >>> 9) & 3) === 1;
    const grey = ((a >>> 15) % 7) === 5;
    const bulk = (a >>> 25) % 4, size = (a >>> 13) % (female ? 4 : 5), beard = !female && ((a >>> 27) % 4 === 0);
    if (grey) return female ? 'woman_elder' : 'man_elder';
    if (w.tourist) return female ? 'woman_bright' : 'man_bright';
    if (female) return size === 0 ? 'woman_bright' : bulk >= 3 ? 'woman_warm' : 'woman_calm';
    if (beard || bulk >= 3) return 'man_deep';
    return size >= 4 ? 'man_rough' : size === 0 ? 'man_bright' : 'man_calm';
  }
  const carVoices = new WeakMap();
  function voiceForCar(c) {
    if (carVoices.has(c)) return carVoices.get(c);
    const cls = H.carClass ? H.carClass(c) : 'standard';
    const a = ((c.paint || 0) * 2654435761 ^ Math.round(c.x * 13) ^ Math.round(c.z * 19)) >>> 0;
    const female = (a & 3) === 1;
    let voice = female ? 'driver_f' : (a & 4 ? 'driver_m' : 'man_bright');
    if (cls === 'police') voice = voiceForWalker(c, 'police');
    else if (cls === 'luxury' || cls === 'sport') voice = female ? 'woman_posh' : 'man_posh';
    else if (cls === 'utility' && !female) voice = 'man_rough';
    carVoices.set(c, voice);
    return voice;
  }

  const V = RC.voices = { engine: null, ready: false, enabled: true, stats: { spoken: 0, dropped: 0 } };
  const C = V.clips = { manifest: null, ctx: null, out: null, buffers: new Map(), active: [], last: new WeakMap(), chat: new Map() };
  const BASE = 'assets/voices/';
  const MODE = params.get('voices');
  const VOICE_VOLUME_KEY = 'sunset_state_voice_volume';
  const SOUND_OFF_KEY = 'sunset_state_sound_off';
  const gameNow = () => globalThis.__SUNSET_PERFORMANCE06_GAME;
  const node = id => globalThis.document?.getElementById(id);
  const masterMuted = () => node('sound-button')?.dataset.off === '1';
  const voiceFocus = g => g.flight51?.pilot ? g.flight51.plane : g.inVehicle ? g.player : g.avatar;
  function voiceDistance(g, who) {
    const focus = voiceFocus(g);
    return Math.hypot(who.x - focus.x, (who.y || 0) - (focus.y || 0), who.z - focus.z);
  }
  const paused = g => !g || !g.running || g.paused || g.over || g.showFullMap || globalThis.document?.hidden;
  function localSpeaker(g, who) {
    if (g.inside) return who === g.retailVisit?.clerk || who === g.retailVisit?.backupClerk;
    if(who.airport54Role) return !!H.airport54Life?.has(g,who);
    return !who.estateResident || g.world?.estate53?.actors?.get(who.estateResident) === who;
  }
  const inConversation = () => C.chat.size || RC.chat48?.active;
  const audible = g => V.enabled && !paused(g) && !masterMuted() && V.volume > 0;
  const timeout = (task, ms, onTimeout) => {
    let timer;
    const limit = new Promise((_, reject) => {
      timer = setTimeout(() => { onTimeout?.(); reject(new Error('Voice asset timed out')); }, ms);
    });
    return Promise.race([task, limit]).finally(() => clearTimeout(timer));
  };
  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { }
  }
  function volumeValue(v) {
    return Math.max(0, Math.min(100, Number.isFinite(+v) ? +v : 100));
  }
  V.volume = volumeValue(readPreference(VOICE_VOLUME_KEY) ?? 100) / 100;

  let enginePending, engineContext, manifestPending, manifestRetryAt = 0, speechEpoch = 0, soundStarted = false;
  const delayedVoices = new Set(), horns = new Set();
  function voiceDelay(fn, ms) {
    const timer = setTimeout(() => { delayedVoices.delete(timer); fn(); }, ms);
    delayedVoices.add(timer);
  }
  function audioContext() {
    if (C.ctx?.state === 'closed') {
      stopVoices();
      C.ctx = C.bus = C.out = C.cabin = null;
      C.buffers.clear();
      V.engine = null;
      V.ready = false;
    }
    if (!C.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (AC) {
        const ctx = C.ctx = new AC();
        let running = ctx.state === 'running';
        ctx.addEventListener?.('statechange', () => {
          if (C.ctx !== ctx) return;
          if (running && ctx.state !== 'running') stopVoices();
          running = ctx.state === 'running';
        });
      }
    }
    return C.ctx;
  }
  function ensureEngine() {
    const speech = globalThis.SunsetSpeech;
    const ctx = C.ctx;
    if (V.engine && engineContext === ctx) return Promise.resolve(V.engine);
    if (!speech || !ctx && !globalThis.speechSynthesis) return Promise.resolve(null);
    if (enginePending) return enginePending;
    const options = { audioContext: ctx, autoUnlock: false, pauseOnHidden: false, channels: 1, maxDistance: 42, speakerCooldownMs: 0, ttlMs: 2500 };
    const create = mode => new speech.SpeechEngine({ ...options, mode }).init();
    const mode = !ctx || MODE === 'system' ? 'system' : MODE === 'auto' ? 'auto' : 'formant';
    enginePending = (async () => {
      let engine;
      try { engine = await create(mode); } catch (error) { if (mode === 'formant' || !ctx) throw error; }
      if (ctx && (!engine || !engine.hasHebrewVoice && mode !== 'formant')) engine = await create('formant');
      if (C.ctx !== ctx || !engine || !ctx && !engine.hasHebrewVoice) return null;
      engineContext = ctx;
      V.engine = engine;
      V.ready = true;
      engine.setMasterVolume(V.volume);
      return engine;
    })().catch(error => {
      if (!V.engineWarning) { V.engineWarning = true; console.warn('[Voices39] speech engine unavailable', error); }
      return null;
    }).finally(() => { enginePending = null; });
    return enginePending;
  }
  function fetchVoiceAsset(url, read, ms) {
    const controller = new AbortController();
    const task = fetch(url, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error(String(r.status));
      return read(r);
    });
    return timeout(task, ms, () => controller.abort());
  }
  function loadManifest() {
    if (MODE === 'formant' || C.manifest || performance.now() < manifestRetryAt) return Promise.resolve(C.manifest);
    if (manifestPending) return manifestPending;
    manifestPending = fetchVoiceAsset(BASE + 'manifest.json', r => r.json(), 2400)
      .then(m => {
        if (!m?.lines || typeof m.lines !== 'object' || !Array.isArray(m.voices)) throw new Error('Invalid voice manifest');
        C.manifest = m;
        return m;
      })
      .catch(() => { manifestRetryAt = performance.now() + 2000; return null; })
      .finally(() => { manifestPending = null; });
    return manifestPending;
  }
  function prepareAudio() {
    if (!V.enabled || !V.volume || globalThis.document?.hidden) return;
    // Both construction and resume run in the input handler, even if the manifest and module are still loading.
    try {
      const ctx = audioContext();
      if (ctx && ctx.state !== 'running') ctx.resume()?.catch(() => {});
    } catch { /* The next user gesture can retry. */ }
    void ensureEngine();
    void loadManifest();
  }
  for (const ev of ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click']) globalThis.addEventListener?.(ev, e => {
    if (e.isTrusted !== false && !masterMuted()) prepareAudio();
  }, { capture: true, passive: true });
  globalThis.addEventListener?.('sunset-speech-ready', () => {
    if (C.ctx || gameNow()?.running && !masterMuted()) void ensureEngine();
  });
  globalThis.document?.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      RC.chat48?.close();
      stopVoices();
    }
  });

  function syncVoiceVolume() {
    if (C.out) C.out.gain.setTargetAtTime(.95 * V.volume, C.ctx.currentTime, .04);
    const engine = V.engine;
    if (engine) { engine.setMasterVolume(V.volume); engine.update(); }
  }
  function addVolumeControl() {
    const parent = node('settings51') || document.querySelector('.pause-controls');
    if (!parent || node('voice-volume51')) return;
    const label = document.createElement('label');
    label.dir = 'rtl';
    label.textContent = 'עוצמת דיבור ';
    const input = document.createElement('input');
    Object.assign(input, { id: 'voice-volume51', className: 'sound-slider', type: 'range', min: '0', max: '100', step: '1', value: String(V.volume * 100) });
    input.title = 'עוצמת הדיבור של התושבים';
    const value = document.createElement('output');
    value.setAttribute('for', input.id);
    value.value = input.value + '%';
    label.append(input, value);
    parent.appendChild(label);
    for (const event of ['keydown', 'keyup']) input.addEventListener(event, e => {
      if (e.key !== 'Escape') e.stopPropagation();
    });
    input.addEventListener('input', () => {
      V.volume = volumeValue(input.value) / 100;
      value.value = input.value + '%';
      savePreference(VOICE_VOLUME_KEY, input.value);
      if (!V.volume) stopVoices({ stopHorns: false });
      else if (!masterMuted()) prepareAudio();
      syncVoiceVolume();
    });
  }
  if (globalThis.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addVolumeControl);
    else addVolumeControl();
  }

  // Existing recorded lines use the character's matching preset and a spatial voice bus.
  const CLIP_VOICE = {
    police_f1: 'f_mid', police_m1: 'm_tough', police_m2: 'm_deep', tourist_f: 'f_young', tourist_m: 'm_young',
    woman_elder: 'f_elder', man_elder: 'm_elder', teen_girl: 'f_young', teen_boy: 'm_young',
    man_calm: 'm_mid', man_deep: 'm_deep', man_bright: 'm_young', man_rough: 'm_tough', gangster_2: 'm_deep',
    woman_calm: 'f_mid', woman_warm: 'f_warm', woman_bright: 'f_young', woman_posh: 'f_warm', man_posh: 'm_mid',
    driver_m: 'm_mid', driver_f: 'f_mid', gangster_1: 'm_tough', vendor_m: 'm_young', hero: 'm_young'
  };
  RC.clipVoiceFor = profile => CLIP_VOICE[profile] || (/woman|girl|_f/.test(profile || '') ? 'f_mid' : 'm_mid');
  RC.hasClip = text => !!C.manifest?.lines[text];
  function clipUrl(text, profile, manifest) {
    const entry = manifest?.lines[text];
    if (!entry?.id) return null;
    const want = RC.clipVoiceFor(profile);
    const voices = entry.voices || manifest.voices;
    return voices.includes(want) ? BASE + want + '/' + entry.id + '.mp3' : null;
  }
  function connectClipBus(ctx) {
    if (C.bus) return;
    const out = ctx.createGain(); out.gain.value = .95 * V.volume;
    const cabin = ctx.createBiquadFilter();
    cabin.type = 'lowpass'; cabin.frequency.value = 18000; cabin.Q.value = .56;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    out.connect(cabin); cabin.connect(comp); comp.connect(ctx.destination);
    // Cut boomy lows, add some presence, and retain the short outdoor reverb.
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 115; hp.Q.value = .6;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3000; pres.Q.value = .9; pres.gain.value = 2.5;
    const room = ctx.createConvolver(), wet = ctx.createGain(); wet.gain.value = .13;
    const sr = ctx.sampleRate, len = Math.floor(sr * .38), ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < sr * .012 ? .3 : 1);
    }
    room.buffer = ir;
    const bus = ctx.createGain();
    bus.connect(hp); hp.connect(pres); pres.connect(out); pres.connect(room); room.connect(wet); wet.connect(out);
    C.bus = bus; C.out = out; C.cabin = cabin; C.cabinCutoff = null;
  }
  function clipBuffer(ctx, url) {
    let pending = C.buffers.get(url);
    if (pending) return pending;
    pending = fetchVoiceAsset(url, r => r.arrayBuffer(), 2200)
      .then(b => timeout(ctx.decodeAudioData(b), 1500))
      .catch(error => {
        if (C.buffers.get(url) === pending) C.buffers.delete(url);
        throw error;
      });
    C.buffers.set(url, pending);
    if (C.buffers.size > 160) C.buffers.delete(C.buffers.keys().next().value);
    return pending;
  }
  function setPositionParam(param, value, time, initial) {
    if (initial) {
      param.cancelScheduledValues?.(time);
      param.value = value;
    } else param.setTargetAtTime(value, time, .05);
  }
  function placeClip(it, initial) {
    const w = it.who, t = C.ctx.currentTime, pan = it.pan;
    const x = w.x || 0, y = (w.y || 0) + 1.6, z = w.z || 0;
    if (!pan.positionX) { pan.setPosition(x, y, z); return; }
    setPositionParam(pan.positionX, x, t, initial);
    setPositionParam(pan.positionY, y, t, initial);
    setPositionParam(pan.positionZ, z, t, initial);
  }
  function roomOcclusion(game) {
    if (game.flight51?.pilot) return .72;
    if (game.inVehicle) return .42;
    if (game.avatar.swim445?.depth > .6) return .82;
    return game.inside ? .12 : 0;
  }
  function spatialVoice(game, who) {
    let occlusion = roomOcclusion(game), nextSight = 0, blocked = false;
    return () => {
      const now = performance.now();
      if (now >= nextSight) {
        nextSight = now + 180;
        const focus = voiceFocus(game), space = game.retailVisit?.scene || game.world;
        const solids = space?.nearby?.((focus.x + who.x) * .5, (focus.z + who.z) * .5) || (game.inside ? space?.solids : null);
        blocked = !game.flight51?.pilot && Math.abs((focus.y || 0) - (who.y || 0)) < 3 &&
          !!solids?.length && H.officerSightClear?.(focus.x, focus.z, who.x, who.z, solids) === false;
        occlusion = Math.max(roomOcclusion(game), blocked ? .62 : 0);
      }
      return occlusion;
    };
  }
  function startEnvelope(param, time, duration, peak) {
    if (duration > .06 && param.setValueAtTime && param.linearRampToValueAtTime) {
      param.setValueAtTime(0, time);
      param.linearRampToValueAtTime(peak, time + .022);
      param.setValueAtTime(peak, time + duration - .033);
      param.linearRampToValueAtTime(0, time + duration);
    } else param.value = peak;
  }
  function syncSynthListener(game, engine) {
    const c = game.cam, focus = voiceFocus(game);
    engine.setListener({ x: focus.x, y: (focus.y || 0) + 1.6, z: focus.z, yaw: Math.atan2(c.x - c.tx, c.z - c.tz) });
  }
  function tickClips(game, initial = false) {
    if (!C.bus || !C.active.length) return;
    const c = game.cam, L = C.ctx.listener, t = C.ctx.currentTime, focus = voiceFocus(game);
    const fx = c.tx - c.x, fy = c.ty - c.y, fz = c.tz - c.z, fl = Math.hypot(fx, fy, fz) || 1;
    if (L.positionX) {
      setPositionParam(L.positionX, focus.x, t, initial);
      setPositionParam(L.positionY, (focus.y || 0) + 1.6, t, initial);
      setPositionParam(L.positionZ, focus.z, t, initial);
      setPositionParam(L.forwardX, fx / fl, t, initial);
      setPositionParam(L.forwardY, fy / fl, t, initial);
      setPositionParam(L.forwardZ, fz / fl, t, initial);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(focus.x, (focus.y || 0) + 1.6, focus.z); L.setOrientation(fx / fl, fy / fl, fz / fl, 0, 1, 0); }
    const cutoff = game.flight51?.pilot ? 1600 : game.inVehicle ? 2700 :
      game.avatar.swim445?.depth > .6 ? 950 : game.inside || H.airport54World?.contains(focus.x,focus.z) ? 9500 : 18000;
    if (C.cabinCutoff !== cutoff) {
      C.cabinCutoff = cutoff;
      C.cabin.frequency.setTargetAtTime(cutoff, t, .13);
    }
    for (const it of C.active) {
      placeClip(it, initial);
      const occ = it.occlusion();
      if (it.occ !== occ) {
        it.occ = occ;
        it.obstruction.frequency.setTargetAtTime(occ >= .6 && cutoff > 2700 ? 1900 : 18000, t, .08);
        it.level.gain.setTargetAtTime(1 - occ * .45, t, .07);
      }
    }
  }
  async function playClip(g, who, text, o, valid) {
    const ctx = C.ctx, priority = o.priority ?? 1;
    if (ctx?.state !== 'running') return 'unavailable';
    try {
      const url = clipUrl(text, o.voice, await loadManifest());
      if (!valid()) return 'cancelled';
      if (!url) return 'unavailable';
      const buf = await clipBuffer(ctx, url);
      if (!valid()) return 'cancelled';
      if (ctx !== C.ctx || ctx.state !== 'running') return 'unavailable';
      connectClipBus(ctx);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const moodRate = Object.hasOwn(RATE_MOOD, o.mood) ? RATE_MOOD[o.mood] : 1;
      src.playbackRate.value = actorRate(who) * moodRate;
      const duration = buf.duration / src.playbackRate.value;
      const pan = ctx.createPanner();
      Object.assign(pan, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: o.chat ? 2.8 : 2.3, maxDistance: 42, rolloffFactor: o.chat ? .86 : 1.01 });
      const an = ctx.createAnalyser(); an.fftSize = 256;
      const gain = ctx.createGain(), level = ctx.createGain(), obstruction = ctx.createBiquadFilter();
      level.gain.value = 1;
      obstruction.type = 'lowpass'; obstruction.frequency.value = 18000; obstruction.Q.value = .55;
      startEnvelope(gain.gain, ctx.currentTime, duration, o.chat ? 1.05 : priority >= 2 ? 1.12 : .95);
      src.connect(gain); gain.connect(an); an.connect(obstruction);
      obstruction.connect(level); level.connect(pan); pan.connect(C.bus);
      return await new Promise(resolve => {
        let timer;
        const item = { pan, an, who, level, obstruction, occlusion: o.occlusion, data: new Uint8Array(an.fftSize), finish };
        function finish(result) {
          const index = C.active.indexOf(item);
          if (index < 0) return;
          C.active.splice(index, 1);
          clearTimeout(timer);
          src.onended = null;
          if (result !== 'done') { try { src.stop(); } catch { } }
          for (const n of [src, gain, an, obstruction, level, pan]) n.disconnect();
          resolve(result);
        }
        C.active.push(item);
        try {
          tickClips(g, true);
          src.onended = () => finish('done');
          src.start();
          timer = setTimeout(() => finish('unavailable'), (duration + 1.2) * 1000);
          o.onStart?.(duration);
        } catch { finish('unavailable'); }
      });
    } catch { return 'unavailable'; }
  }
  async function synthLine(game, who, text, o, valid) {
    const engine = await ensureEngine();
    if (!valid()) return 'cancelled';
    if (!engine || engine.backend.ctx && engine.backend.ctx.state !== 'running') return 'dropped';
    try {
      syncSynthListener(game, engine);
      return await engine.speak(text, {
        voice: o.voice, mood: o.mood || 'neutral', speakerId: idOf(who), priority: o.chat ? 2 : o.priority,
        maxDistance: o.chat ? 12 : game.inside ? 14 : 42, rateScale: actorRate(who),
        position: () => valid() ? { x: who.x, y: (who.y || 0) + 1.6, z: who.z } : undefined, seed: o.seed,
        onStart: () => o.onStart(), onTimeline: info => o.onStart(info.duration), occlusion: o.occlusion
      });
    } catch { return 'dropped'; }
  }
  async function speakLine(g, who, text, o, valid) {
    const clip = await playClip(g, who, text, o, valid);
    const result = clip === 'unavailable' && valid() ? await synthLine(g, who, text, o, valid) : clip;
    if (result === 'done') V.stats.spoken++;
    else if (result !== 'cancelled') V.stats.dropped++;
    return result;
  }

  const queue = [];
  let activeLine = null, duckedSynth = null;
  function setDucking(synth) {
    if (duckedSynth === synth) return;
    duckedSynth?.setVoiceDucking?.(1);
    duckedSynth = synth;
    duckedSynth?.setVoiceDucking?.(.74);
  }
  function interruptLine() {
    if (!activeLine) return;
    const job = activeLine;
    activeLine = null;
    job.cancelled = true;
    for (const item of C.active) item.finish('cancelled');
    const id = ids.get(job.who);
    if (id) V.engine?.stopSpeaker(id);
    if (job.started && !job.options.chat) {
      const target = node('voices-caption50');
      if (target) target.hidden = true;
    }
    setDucking(null);
    job.resolve('cancelled');
  }
  function clearQueue(predicate = () => true) {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (predicate(queue[i])) queue.splice(i, 1)[0].resolve('cancelled');
    }
  }
  function pumpQueue() {
    while (!activeLine && queue.length) {
      const job = queue.shift();
      if (performance.now() > job.expires || !job.valid()) { job.resolve('dropped'); continue; }
      activeLine = job;
      const valid = () => activeLine === job && !job.cancelled && job.valid();
      const { game, who, text, options } = job;
      const onStart = duration => {
        if (!valid()) return;
        if (!job.started && (options.chat || options.priority >= 2)) setDucking(game.synth || null);
        job.started = true;
        if (!options.chat) caption(game, who, text, duration ? Math.min(7, duration + .35) : 2.8);
      };
      const finish = result => {
        if (activeLine !== job) return;
        if (!job.started && result === 'dropped' && valid() && !options.chat) caption(game, who, text, 2.8);
        activeLine = null;
        if (!options.chat) setDucking(null);
        job.resolve(result);
        pumpQueue();
      };
      void speakLine(game, who, text, { ...options, occlusion: spatialVoice(game, who), onStart }, valid).then(finish, () => finish('dropped'));
    }
  }
  function enqueueLine(game, who, text, options, valid) {
    const { priority } = options;
    if (activeLine?.who === who && priority <= activeLine.options.priority) return null;
    const older = queue.find(job => job.who === who);
    if (older && older.options.priority >= priority) return null;
    if (older) clearQueue(job => job === older);
    if (queue.length >= 6) {
      const tail = queue.at(-1);
      if (tail.options.priority >= priority) return null;
      queue.pop().resolve('dropped');
    }
    const expires = performance.now() + (priority >= 2 ? 3200 : priority ? 2200 : 1450);
    const completion = new Promise(resolve => {
      const job = { game, who, text, options, valid, expires, resolve, started: false, cancelled: false };
      const index = queue.findIndex(other => other.options.priority < priority);
      queue.splice(index < 0 ? queue.length : index, 0, job);
      if (activeLine && priority >= 2 && priority > activeLine.options.priority) interruptLine();
      pumpQueue();
    });
    return completion;
  }

  function finishChat(who, chat, completed) {
    if (C.chat.get(who) !== chat) return;
    C.chat.delete(who);
    setDucking(null);
    clearTimeout(chat.timer);
    chat.release?.();
    chat.onDone?.(completed);
  }
  RC.chatStop = function (who) {
    clearQueue(job => job.who === who);
    if (activeLine?.who === who) interruptLine();
    const chat = C.chat.get(who);
    if (chat) finishChat(who, chat, false);
    pumpQueue();
  };
  const voiceScene = g => g.retailVisit || g.indoor || null;
  RC.chatSpeak = function (who, texts, profile, onLine, onDone, mood) {
    const g = gameNow();
    if (!who || !texts.length || !audible(g) || !localSpeaker(g, who)) { onDone?.(false); return false; }
    const scene = voiceScene(g), world = g.world;
    clearQueue();
    interruptLine();
    for (const [speaker, chat] of C.chat) finishChat(speaker, chat, false);
    const chat = { onDone, timer: null, release: null };
    C.chat.set(who, chat);
    const hidden = node('voices-caption50');
    if (hidden) hidden.hidden = true;
    const valid = () => C.chat.get(who) === chat && audible(g) && g.world === world && voiceScene(g) === scene && localSpeaker(g, who) &&
      who.alive !== false && who.injuryState !== 'down' && voiceDistance(g, who) <= 12;
    void (async () => {
      let heard = false;
      for (const [index, text] of texts.entries()) {
        if (!valid()) break;
        onLine?.(index, text);
        const r = await enqueueLine(g, who, text, { voice: profile || voiceForWalker(who), chat: true, mood, priority: 4 }, valid);
        if (r === 'done') heard = true;
        if (index + 1 < texts.length && valid()) await new Promise(resolve => {
          chat.release = resolve;
          chat.timer = setTimeout(resolve, 180);
        });
      }
      finishChat(who, chat, heard && valid());
    })().catch(() => finishChat(who, chat, false));
    return true;
  };
  function stopVoices({ stopHorns = true } = {}) {
    speechEpoch++;
    delayedVoices.forEach(clearTimeout);
    delayedVoices.clear();
    clearQueue();
    interruptLine();
    for (const [who, chat] of C.chat) finishChat(who, chat, false);
    if (stopHorns) for (const stop of horns) stop();
    V.engine?.stop();
    const captionNode = node('voices-caption50');
    if (captionNode) captionNode.hidden = true;
  }
  void loadManifest();

  function canTalk(game, who) {
    if (paused(game) || !localSpeaker(game, who) || inConversation()) return false;
    return who.injuryState !== 'down' && who.alive !== false && voiceDistance(game, who) < (game.inside ? 14 : 42);
  }
  function caption(game, who, text, duration) {
    const target = node('voices-caption50');
    if (!target || inConversation() || voiceDistance(game, who) > 22) return;
    target.textContent = text;
    target.hidden = false;
    game.city50CaptionUntil = game.seconds + duration;
  }
  function say(game, who, text, o = {}) {
    if (!V.enabled || !who || !text || !canTalk(game, who)) return false;
    const now = performance.now(), epoch = speechEpoch, scene = voiceScene(game), world = game.world;
    const priority = Math.max(0, Math.min(3, Number.isFinite(o.priority) ? o.priority : 1));
    const last = C.last.get(who);
    if (last && now - last.at < 1800 && priority <= last.priority) return false;
    if (!audible(game)) caption(game, who, text, 2.8);
    else {
      const valid = () => epoch === speechEpoch && game.world === world && voiceScene(game) === scene && audible(game) && canTalk(game, who);
      if (!enqueueLine(game, who, text, { ...o, voice: o.voice || voiceForWalker(who), priority }, valid)) return false;
    }
    C.last.set(who, { at: now, priority });
    return true;
  }
  function greetingLines(game, context) {
    const hour = (game.worldHour + 24) % 24, rain = context === 'rain' || (game.weather?.rain || 0) > .25;
    const clear = ['שלום', 'מה נשמע?', 'היי, מה קורה?', 'שלום שלום!'];
    if (hour > 5 && hour < 11) clear.unshift(WEATHER_GREET.morning, WEATHER_GREET.morning);
    if (!rain && hour >= 16.8 && hour < 18.7) clear.unshift(WEATHER_GREET.sunset, WEATHER_GREET.sunset);
    if (hour >= 18.7 || hour <= 5) clear.unshift(WEATHER_GREET.evening, WEATHER_GREET.evening);
    if (!rain && hour >= 11 && hour < 16.8) clear.push(LINES.greet[3], LINES.greet[4]);
    return clear;
  }
  function sayReaction53(game, who, kind, options = {}) {
    if (!V.enabled || !who || !Object.hasOwn(REACTIONS, kind) || !canTalk(game, who)) return false;
    const now = performance.now(), [mood, priority, cooldown] = REACTIONS[kind];
    const memory = recentReactions.get(who) || { at: new Map(), lines: [] };
    if (now - (memory.at.get(kind) ?? -Infinity) < cooldown) return false;
    const lines = kind === 'greet' ? greetingLines(game, options.context) : kind === 'warning' ? LINES.nearMiss : LINES[kind];
    const recentGlobal = lastReaction.get(kind);
    let candidates = lines.filter(line => !memory.lines.includes(line) && line !== recentGlobal);
    if (!candidates.length) candidates = lines.filter(line => line !== memory.lines.at(-1) && line !== recentGlobal);
    if (!candidates.length) candidates = lines.filter(line => line !== memory.lines.at(-1));
    const pool = candidates.length ? candidates : lines;
    const text = pool[Math.floor(Math.random() * pool.length)];
    if (!say(game, who, text, { mood, priority, ...options })) return false;
    memory.at.set(kind, now);
    memory.lines.push(text);
    if (memory.lines.length > 6) memory.lines.shift();
    recentReactions.set(who, memory);
    lastReaction.set(kind, text);
    return true;
  }
  /** loudness 0..1 of a character currently speaking (drives head motion) */
  RC.speechLoudness = function (w) {
    const it = C.active.find(x => x.who === w);
    if (it) {
      it.an.getByteTimeDomainData(it.data);
      let e = 0;
      for (const sample of it.data) { const v = (sample - 128) / 128; e += v * v; }
      return Math.min(1, Math.sqrt(e / it.data.length) * 4.5);
    }
    const id = ids.get(w);
    return id && V.engine ? V.engine.lipSync(id)?.loudness ?? 0 : 0;
  };
  function honk(game, car) {
    try {
      const ctx = game.synth?.ctx || C.ctx;
      if (ctx?.state !== 'running' || masterMuted() || paused(game)) return;
      const t = ctx.currentTime, d = Math.hypot(car.x - game.cam.x, car.z - game.cam.z);
      const vol = .22 * (1 - d / 60);
      if (vol <= .01) return;
      const g = ctx.createGain();
      const stop = () => { g.disconnect(); horns.delete(stop); };
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02);
      g.gain.setValueAtTime(vol, t + .38); g.gain.linearRampToValueAtTime(0, t + .45);
      g.connect(game.synth?.master || ctx.destination);
      horns.add(stop);
      for (const f of [392, 494]) {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
        o.connect(lp); lp.connect(g);
        o.onended = () => { o.disconnect(); lp.disconnect(); stop(); };
        o.start(t); o.stop(t + .5);
      }
    } catch { }
  }

  RC.installers.push(function installVoices(Game) {
    const cool = new WeakMap();
    const ready = (o, s) => { const t = performance.now(); if ((cool.get(o) || 0) > t) return false; cool.set(o, t + s * 1000); return true; };
    let lastGreet = 0, lastPolice = 0, lastAlarm = 0, blockClock = 0;
    const muteSound = Game.prototype.muteSound;
    Game.prototype.muteSound = function () {
      if (masterMuted()) prepareAudio();
      const result = muteSound.apply(this, arguments);
      savePreference(SOUND_OFF_KEY, masterMuted() ? '1' : '0');
      if (masterMuted()) stopVoices();
      return result;
    };
    const restart = Game.prototype.restart;
    Game.prototype.restart = function () {
      stopVoices();
      C.last = new WeakMap();
      lastGreet = lastPolice = lastAlarm = blockClock = 0;
      const startSound = !soundStarted && !params.has('soundOff') && readPreference(SOUND_OFF_KEY) !== '1';
      if (startSound || !masterMuted()) prepareAudio();
      const result = restart.apply(this, arguments);
      if (startSound && masterMuted()) muteSound.call(this);
      soundStarted = true;
      return result;
    };
    const pause = Game.prototype.togglePause;
    Game.prototype.togglePause = function () {
      const result = pause.apply(this, arguments);
      if (this.paused) stopVoices();
      else if (!masterMuted()) prepareAudio();
      return result;
    };

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
            sayReaction53(this, victim, 'bumpedCar', { voice: voiceForCar(victim), mood: speed > 12 ? 'shout' : 'angry' });
        }
      } catch { }
      return r;
    };
    // ---- Stage 49: situational reactions (shots, explosions, someone hurt, admiring cars, speed) ----
    const near = (g, x, z, r, max, skip) => {
      const out = [];
      for (const w of g.pedestrians || []) {
        if (w === skip || w.injuryState !== 'walking') continue;
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < r) out.push([d, w]);
      }
      return out.sort((a, b) => a[0] - b[0]).slice(0, max).map(e => e[1]);
    };
    // Humans react after a beat, not instantly, and not all at once.
    const later = (g, w, kind, o, base = 300) => {
      const timeline = g.pedestrians;
      voiceDelay(() => {
        if (g.pedestrians === timeline && timeline.includes(w))
          sayReaction53(g, w, kind, o);
      }, base + Math.random() * 450);
    };
    const fire = Game.prototype.fireWorldRay;
    Game.prototype.fireWorldRay = function () {
      this.city50Gunshot = true;
      try { return fire.apply(this, arguments); }
      finally { this.city50Gunshot = false; }
    };
    const alert = Game.prototype.alertCityAt;
    if (alert) Game.prototype.alertCityAt = function (x, z) {
      const r = alert.apply(this, arguments);
      const event = this.law460?.incidents.at(-1);
      const robbery = event && /robbery|shop threat/.test(event.type) && (this.seconds - event.at) < 1;
      const kind = this.city50Gunshot ? 'shots' : robbery ? 'panic' : 'boom';
      const crowd = near(this, x, z, this.city50Gunshot ? 38 : 47, 5);
      for (const [i, w] of crowd.entries()) {
        w.city50Notice = { x, z, strength: i < 2 ? .85 : .46, until: this.seconds + 1.1 };
        if (i < 2 && ready(w, 8)) later(this, w, kind, {}, 350 + i * 450);
      }
      return r;
    };
    const hit = H.pedestrianVehicleImpact;
    if (hit) H.pedestrianVehicleImpact = function (w, car, speed) {
      const out = hit.apply(this, arguments);
      try {
        const g = globalThis.__SUNSET_PERFORMANCE06_GAME;
        if (g && out && out !== 'none') for (const o of near(g, w.x, w.z, 18, 2, w)) if (ready(o, 10)) later(g, o, 'help', {}, 700);
      } catch { }
      return out;
    };
    // Taking a car: the owner yells.
    const toggle = Game.prototype.toggleVehicle;
    Game.prototype.toggleVehicle = function () {
      const before = this.inVehicle, a = this.avatar;
      let near = null, best = 6;
      if (!before) for (const o of [...this.civilian, ...this.parked]) { const d = Math.hypot(o.x - a.x, o.z - a.z); if (d < best) { best = d; near = o; } }
      const owner = near && { x: near.x + 2.2, y: a.y, z: near.z + 1.2, appearance: hashOf(near) };
      const r = toggle.apply(this, arguments);
      try {
        const take = () => {
          if (!this.inVehicle || !near || this.player !== near) return;
          if (ready(near, 20)) sayReaction53(this, owner, 'stolen', { voice: voiceForCar(near) });
        };
        if (!before && near && !near.owned48 && !near.garageOwned)
          voiceDelay(() => { if (!paused(this)) take(); }, 1400);
      } catch { }
      return r;
    };
    // Per-step checks: bumps on foot, near misses, police, blocking, greetings, panic.
    const update = Game.prototype.update;
    let suspended = true, piloting = false;
    Game.prototype.update = function (dt) {
      const r = update.call(this, dt);
      const captionNode = node('voices-caption50'), inactive = paused(this);
      if (captionNode && !captionNode.hidden && (inactive || RC.chat48?.active ||
          this.seconds >= (this.city50CaptionUntil || 0))) captionNode.hidden = true;
      if (inactive) {
        if (!suspended) stopVoices();
        suspended = true;
        return r;
      }
      suspended = false;
      const flight = !!this.flight51?.pilot;
      if (flight !== piloting) stopVoices();
      piloting = flight;
      try {
        if (activeLine?.game === this && !activeLine.valid()) {
          interruptLine();
          pumpQueue();
        }
        tickClips(this);
        const focus = voiceFocus(this), E = V.engine;
        if (E) { syncSynthListener(this, E); E.update(); }
        if (flight || this.inside) return r;
        const t = performance.now();
        const a = this.avatar, peds = this.pedestrians || [];
        for (const w of peds) if (w.city50Notice && w.city50Notice.until < this.seconds) w.city50Notice = null;
        if (!this.inVehicle) {
          const sp = Math.hypot(a.vx || 0, a.vz || 0);
          for (const w of peds) {
            const d = Math.hypot(w.x - a.x, w.z - a.z);
            if (d > 6 || w.injuryState !== 'walking' || w.panic > 0 || w._witness460 || RC.chat48?.active?.who === w) continue;
            if (d >= .95 && d < 2.4 && sp > 7 && ready(w, 12)) { later(this, w, 'fast', {}, 250); continue; }
            if (d < .95 && sp > 2.2 && ready(w, 5)) { sayReaction53(this, w, 'bumpedFoot'); continue; }
            if (d < 3.4 && sp < 4 && w.panic <= 0 && t - lastGreet > 7000 && Math.random() < dt * .6 && ready(w, 40)) {
              lastGreet = t;
              sayReaction53(this, w, w.tourist ? 'tourist' : 'greet');
            }
          }
        } else {
          const p = this.player;
          if (p.speed > 9) for (const w of peds) {
            const d = Math.hypot(w.x - p.x, w.z - p.z);
            const ahead = ((w.x - p.x) * p.vx + (w.z - p.z) * p.vz) / p.speed;
            if (d < 5.5 && ahead > 0 && d * d - ahead * ahead < 6 && w.injuryState === 'walking' &&
                H.sameRoadLevel443(w, p) && ready(w, 8)) {
              w.city50Notice = { x: p.x, z: p.z, strength: .65, until: this.seconds + .8 };
              sayReaction53(this, w, 'nearMiss');
            }
          }
          const cls = H.carClass ? H.carClass(p) : 'standard';
          if (p.speed > 4 && p.speed < 30 && (cls === 'luxury' || cls === 'sport') && Math.random() < dt * .35)
            for (const w of near(this, p.x, p.z, 13, 1)) if (ready(w, 30)) later(this, w, 'admire', {}, 500);
          if (p.speed > 24 && Math.random() < dt * .5)
            for (const w of near(this, p.x, p.z, 9, 1)) if (ready(w, 14)) later(this, w, 'fast', {}, 300);
          // Blocking a waiting car: horn, then a shout.
          if (p.speed < .6) {
            const fwdX = -Math.sin(p.yaw), fwdZ = -Math.cos(p.yaw);
            const behind = this.civilian.find(o => o.speed < .8 && Math.hypot(o.x - p.x, o.z - p.z) < 11 && ((o.x - p.x) * fwdX + (o.z - p.z) * fwdZ) < -2);
            blockClock = behind ? blockClock + dt : 0;
            if (behind && blockClock > 3.5 && ready(behind, 9)) { honk(this, behind); voiceDelay(() => sayReaction53(this, behind, 'honk', { voice: voiceForCar(behind) }), 600); }
          } else blockClock = 0;
        }
        // Police shouting during a chase.
        if (this.heat > 0 && t - lastPolice > 6500 && this.policeRadio.phase === 'pursuit' && this.policeInSight) {
          const focus = this.inVehicle ? this.player : a;
          const unit = this.police.find(u => u.alive && Math.hypot(u.x - focus.x, u.z - focus.z) < 34);
          if (unit) { lastPolice = t; sayReaction53(this, unit, 'police', { voice: voiceForCar(unit) }); }
        }
        // Panicking citizens nearby.
        if (t - lastAlarm > 3300) for (const w of peds) {
          if (w.panic <= 0 || Math.hypot(w.x - focus.x, w.z - focus.z) >= 25 || !ready(w, 12)) continue;
          lastAlarm = t;
          sayReaction53(this, w, 'panic');
          break;
        }
      } catch (error) { if (!V.warned) { V.warned = true; console.warn('[Voices39]', error); } }
      return r;
    };
  });
  RC.voiceForWalker = voiceForWalker; RC.voiceForCar = voiceForCar; RC.say = say; RC.sayReaction53 = sayReaction53; RC.LINES = LINES;
})(Heatline);
