/**
 * speech-engine.js — מנוע דיבור עברי למשחק (v2): 24 קולות, מצבי רוח, תלת-ממד חי, lip-sync, תור עדיפויות, ריבוי ערוצים.
 *
 *   const engine = await new SpeechEngine().init();
 *   // בלולאת המשחק, כל פריים (position יכול להיות גם פונקציה):
 *   engine.setListener({ x, y, z, yaw });  engine.update();
 *   engine.speak("תזוז מהדרך!", { voice: "gangster_2", mood: "angry", position: npc.pos, speakerId: npc.id });
 *   const { viseme, loudness } = engine.lipSync(npc.id) ?? {};   // לסנכרון שפתיים
 *
 * מצבים: "formant" (מובנה, אופליין, ברירת מחדל) | "system" (Web Speech) | "auto".
 *
 * מה חדש לעומת v1:
 *  • channels — כמה דוברים בו-זמנית (ברירת מחדל 3 ב-formant); דובר לא מדבר עם עצמו פעמיים במקביל.
 *  • update() — פאן/עוצמה/סינון מתעדכנים בזמן שהדובר מדבר (גם כשהשחקן או ה-NPC זזים). position יכול להיות פונקציה.
 *  • חיסכון בעבודה: שורות שלא נשמעות בכלל לא מסונתזות; TTL לשורות ממתינות; דובר אחד = שורה אחת בתור (ambient).
 *  • מטמון לפי זיכרון (בייטים) + AudioBuffer ממוטמן; חימום ברקע לשורות ממתינות; prebakeAsync בלי קפיצות פריימים.
 *  • occlusion (0..1, מספר או פונקציה): קיר/דלת = קול עמום ושקט יותר. דובר רקע רחוק ושקט מפונה לטובת דובר קרוב וברור.
 *  • sequence(lines): שיחה/קטסצנה רציפה. stats(): נתוני ביצועים. lipSync מוחלק. השהיה אוטומטית כשהלשונית מוסתרת.
 *  • ducking: שורות IMPORTANT/CRITICAL מנמיכות דיבור רקע. unlock() אוטומטי של AudioContext (מדיניות autoplay).
 */
import { VOICE_PROFILES, MOODS, resolveMood } from "./voices.js";
import { DEFAULT_SYNTH, synthesizeText, toWav, hashSeed } from "./formant-synth.js";
import { normalizeText, splitSentences, textToUnits, addPronunciation, phonemesOf } from "./hebrew-g2p.js";

export { VOICE_PROFILES, MOODS, normalizeText, splitSentences, textToUnits, addPronunciation, phonemesOf, toWav };

export const Priority = Object.freeze({ AMBIENT: 0, NORMAL: 1, IMPORTANT: 2, CRITICAL: 3 });

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const now = () => globalThis.performance?.now?.() ?? Date.now();
const idle = fn => (globalThis.requestIdleCallback ? globalThis.requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 0));
const DROPPED = Promise.resolve("dropped");

// ───────────────────────── Backends ─────────────────────────
/** @interface SpeechBackend
 *  wholeText?: bool · init() · getVoices() · speak(text, params, hooks) · cancel()
 *  אופציונלי: fork() (ערוץ נוסף) · setSpatial({volume,pan,lowpass}) · warm(text, synth, seed)
 *  params: {voiceId, lang, pitch, rate, volume, pan, lowpass, synth, seed}
 */
export class WebSpeechBackend {
  constructor(synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
    this.synth = synth; this.Utterance = Utterance; this._voices = [];
  }
  async init() {
    if (!this.synth) throw new Error("Web Speech API לא זמין בסביבה הזו");
    const load = () => (this._voices = this.synth.getVoices()).length;
    if (load()) return;
    await new Promise(res => {
      const done = () => { load(); res(); };
      this.synth.addEventListener?.("voiceschanged", done, { once: true });
      setTimeout(done, 1500);
    });
  }
  getVoices() { return this._voices.map(v => ({ id: v.voiceURI, name: v.name, lang: v.lang })); }
  speak(text, p, hooks = {}) {
    const u = new this.Utterance(text);
    const v = this._voices.find(x => x.voiceURI === p.voiceId);
    if (v) u.voice = v;
    u.lang = p.lang || "he-IL"; u.pitch = p.pitch; u.rate = p.rate; u.volume = p.volume;
    u.onstart = () => hooks.onStart?.(); u.onend = hooks.onEnd; u.onerror = hooks.onError;
    this.synth.speak(u);
    return u;
  }
  cancel() { this.synth.cancel(); }
}

/** backend לבדיקות: לא משמיע, מדמה משך לפי אורך הטקסט */
export class MockBackend {
  constructor({ voices, msPerChar = 1 } = {}) {
    this._voices = voices ?? [{ id: "mock-he-f", name: "Mock Hebrew Female", lang: "he-IL" }, { id: "mock-he-m", name: "Mock Hebrew Male", lang: "he-IL" }];
    this.msPerChar = msPerChar; this.log = []; this._timer = null;
  }
  async init() {}
  getVoices() { return this._voices; }
  speak(text, p, hooks = {}) {
    this.log.push({ text, ...p });
    hooks.onStart?.();
    this._timer = setTimeout(() => hooks.onEnd?.(), Math.max(1, text.length * this.msPerChar / p.rate));
    return { text };
  }
  cancel() { clearTimeout(this._timer); this._timer = null; }
}

/** הסינתיסייזר המובנה. בדפדפן — WebAudio; ב-Node — "מדמה" השמעה. fork() נותן ערוץ נוסף עם מטמון משותף. */
export class FormantBackend {
  /** @param {{sampleRate?, cacheSize?, maxCacheBytes?, audioContext?, timeScale?}} o */
  constructor({ sampleRate = 22050, cacheSize = 256, maxCacheBytes = 24e6, audioContext = null, timeScale = 1, _shared } = {}) {
    this.wholeText = true;
    this.sampleRate = sampleRate; this.cacheSize = cacheSize; this.maxCacheBytes = maxCacheBytes;
    this.ctx = audioContext; this.timeScale = timeScale;
    this._c = _shared ?? { map: new Map(), bytes: 0, hits: 0, misses: 0 };
    this._src = null; this._timer = null; this._n = null;
  }
  get stats() { return this._c; }
  async init() { this._ensureCtx(); }
  _ensureCtx() {
    if (!this.ctx && typeof globalThis.AudioContext !== "undefined") this.ctx = new globalThis.AudioContext();
    return this.ctx;
  }
  fork() {
    this._ensureCtx();
    return new FormantBackend({ sampleRate: this.sampleRate, cacheSize: this.cacheSize, maxCacheBytes: this.maxCacheBytes, audioContext: this.ctx, timeScale: this.timeScale, _shared: this._c });
  }
  getVoices() { return [{ id: "formant", name: "Built-in Hebrew formant synth", lang: "he-IL" }]; }

  _entry(text, synth = {}, seed) {
    const s = { ...DEFAULT_SYNTH, ...synth }, sd = seed ?? hashSeed(text), c = this._c;
    let key = `${this.sampleRate}|${sd}|${text}`;
    for (const v of Object.values(s)) key += "," + (typeof v === "number" ? +v.toFixed(3) : v);
    let e = c.map.get(key);
    if (e) { c.map.delete(key); c.map.set(key, e); c.hits++; return e; }
    c.misses++;
    const r = synthesizeText(text, s, { sampleRate: this.sampleRate, seed: sd });
    e = { r, buf: null, bytes: r.samples.byteLength + (r.envelope?.byteLength ?? 0) };
    c.map.set(key, e); c.bytes += e.bytes;
    for (const [k, v] of c.map) {                       // פינוי LRU לפי בייטים וכמות
      if (v === e || (c.bytes <= this.maxCacheBytes && c.map.size <= this.cacheSize)) break;
      c.map.delete(k); c.bytes -= v.bytes;
    }
    return e;
  }
  render(text, synth, seed) { return this._entry(text, synth, seed).r; }
  warm(text, synth, seed) { this._entry(text, synth, seed); }

  speak(text, p, hooks = {}) {
    const e = this._entry(text, p.synth, p.seed), r = e.r;
    const info = { duration: r.duration, timeline: r.timeline, envelope: r.envelope, envelopeHop: r.envelopeHop };
    const ctx = this._ensureCtx();
    if (!ctx) {                                         // Node / headless
      hooks.onStart?.(info);
      this._timer = setTimeout(() => hooks.onEnd?.(), r.duration * 1000 * this.timeScale);
      return info;
    }
    if (ctx.state === "suspended") ctx.resume?.();
    if (!e.buf) {                                       // AudioBuffer ממוטמן — בלי העתקה בכל השמעה
      e.buf = ctx.createBuffer(1, r.samples.length, r.sampleRate); e.buf.copyToChannel(r.samples, 0);
      e.bytes += r.samples.byteLength; this._c.bytes += r.samples.byteLength;
    }
    const src = ctx.createBufferSource(); src.buffer = e.buf;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = clamp(p.lowpass || 18000, 200, 20000);
    const gain = ctx.createGain(); gain.gain.value = p.volume;
    const pan = ctx.createStereoPanner?.(); if (pan) pan.pan.value = clamp(p.pan || 0, -1, 1);
    src.connect(lp); lp.connect(gain); pan ? (gain.connect(pan), pan.connect(ctx.destination)) : gain.connect(ctx.destination);
    this._n = { gain, pan, lp };
    src.onended = () => { if (this._src === src) { this._src = null; this._n = null; } hooks.onEnd?.(); };
    this._src = src;
    src.start();
    hooks.onStart?.(info);
    return info;
  }
  /** עדכון חי של עוצמה/פאן/סינון תוך כדי דיבור */
  setSpatial({ volume, pan, lowpass }) {
    const n = this._n, t = this.ctx?.currentTime;
    if (!n) return;
    n.gain.gain.setTargetAtTime(volume, t, 0.06);
    n.pan?.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.06);
    n.lp.frequency.setTargetAtTime(clamp(lowpass, 200, 20000), t, 0.06);
  }
  cancel() {
    clearTimeout(this._timer); this._timer = null; this._n = null;
    if (this._src) { const s = this._src; this._src = null; s.onended = null; try { s.stop(); } catch { /* already stopped */ } }
  }
}

// ───────────────────────── המנוע ─────────────────────────
const FEMALE_HINTS = /carmit|hila|female|woman|נקבה|כרמית|הילה|zira|yael|שירה/i;
const MALE_HINTS = /asaf|avri|male\b|man\b|זכר|אסף|אברי|david|ofer/i;
const EVENTS = ["pointerdown", "keydown", "touchend"];

export class SpeechEngine {
  /**
   * @param {object} o
   * @param {SpeechBackend} o.backend   backend מותאם (גובר על mode)
   * @param {'formant'|'system'|'auto'} o.mode
   * @param {object[]} o.profiles
   * @param {number} o.maxQueue
   * @param {number} o.channels           דוברים בו-זמנית (רק ל-backend עם fork, כלומר formant)
   * @param {number} o.speakerCooldownMs
   * @param {number} o.maxDistance        מעבר לזה לא שומעים (מטר)
   * @param {number} o.ttlMs              כמה זמן שורה רגילה/ambient מוכנה לחכות בתור
   * @param {number} o.minAudible         מתחת לעוצמה הזו שורה לא תסונתז (חוץ מ-IMPORTANT+)
   * @param {number} o.duck               מכפיל עוצמה לרקע בזמן שורה חשובה (0..1)
   */
  constructor({ backend, mode = "formant", profiles = VOICE_PROFILES, lang = "he-IL", maxQueue = 12, channels = 3,
    speakerCooldownMs = 400, maxDistance = 30, ttlMs = 4000, minAudible = 0.03, duck = 0.45, pauseOnHidden = true } = {}) {
    this.mode = mode;
    this.backend = backend ?? (mode === "system" ? new WebSpeechBackend() : new FormantBackend());
    this._customBackend = !!backend;
    this.profiles = new Map(profiles.map(p => [p.id, { ...p }]));
    Object.assign(this, { lang, maxQueue, speakerCooldownMs, maxDistance, ttlMs, minAudible, duck, pauseOnHidden, _wantChannels: channels });
    this.masterVolume = 1; this.muted = false;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this._queue = []; this._lastSpoke = new Map(); this._voiceFor = new Map(); this._seq = 0; this._renderer = null;
    this._channels = [{ backend: this.backend, item: null }];
  }

  async init() {
    if (this.mode === "auto" && !this._customBackend) {
      try {
        const sys = new WebSpeechBackend(); await sys.init();
        this.backend = sys.getVoices().some(v => /^he/i.test(v.lang)) ? sys : new FormantBackend();
      } catch { this.backend = new FormantBackend(); }
    }
    await this.backend.init();
    const n = this.backend.fork ? Math.max(1, this._wantChannels | 0) : 1;
    this._channels = Array.from({ length: n }, (_, i) => ({ backend: i ? this.backend.fork() : this.backend, item: null }));
    this._assignBaseVoices();
    this._unlock();
    return this;
  }

  /** דפדפנים מחייבים מחווה משתמש לפני שמע — מחכים לראשונה ומשחררים */
  _unlock() {
    const g = globalThis; if (!g.addEventListener) return;
    const h = () => {
      const c = this.backend.ctx; c?.resume?.();
      if (!c || c.state === "running") EVENTS.forEach(e => g.removeEventListener(e, h, true));
    };
    EVENTS.forEach(e => g.addEventListener(e, h, true));
    g.document?.addEventListener("visibilitychange", () => {
      const c = this.backend.ctx;
      if (c && this.pauseOnHidden) g.document.hidden ? c.suspend?.() : c.resume?.();
    });
  }

  _assignBaseVoices() {
    const all = this.backend.getVoices();
    const he = all.filter(v => /^he\b|^iw\b/i.test(v.lang?.replace("_", "-")) || /hebrew|עברית/i.test(v.name));
    const pool = he.length ? he : all;
    this.hasHebrewVoice = he.length > 0;
    const f = pool.filter(v => FEMALE_HINTS.test(v.name)), m = pool.filter(v => MALE_HINTS.test(v.name));
    let i = 0;
    for (const p of this.profiles.values()) {
      const cand = p.gender === "f" ? (f.length ? f : pool) : (m.length ? m : pool);
      this._voiceFor.set(p.id, cand.length ? cand[i++ % cand.length].id : undefined);
    }
  }

  listVoices() { return [...this.profiles.values()]; }
  getProfile(id) { return this.profiles.get(id); }
  addProfile(profile) { this.profiles.set(profile.id, { volume: 1, ...profile }); this._assignBaseVoices(); }
  addPronunciation(word, ph) { addPronunciation(word, ph); }

  // ── מרחב ──
  setListener(l) { Object.assign(this.listener, l); }
  /** @returns {{distance:number, pan:number}} — כותב ל-out אם ניתן (בלי הקצאות בלולאה) */
  spatialize(pos, listener = this.listener, out = {}) {
    const dx = pos.x - listener.x, dy = (pos.y ?? 0) - (listener.y ?? 0), dz = (pos.z ?? 0) - (listener.z ?? 0);
    const flat = Math.hypot(dx, dz), yaw = listener.yaw ?? 0;   // yaw=0 → מביט ל-+z; ימין = +x
    const right = flat > 1e-6 ? (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / flat : 0;
    out.distance = Math.hypot(dx, dy, dz);
    out.pan = clamp(right * Math.min(1, flat / 1.5), -1, 1);
    return out;
  }

  _effective(voice, mood) {
    const profile = this.profiles.get(voice);
    if (!profile) throw new Error(`פרופיל קול לא קיים: ${voice}`);
    const m = resolveMood(mood);
    return {
      profile,
      pitch: clamp(profile.pitch + m.pitch, 0.1, 2),
      rate: clamp(profile.rate + m.rate, 0.1, 3),
      synth: m.apply({ ...DEFAULT_SYNTH, ...profile.synth }),
    };
  }

  _refresh(it) {
    if (typeof it.occlusion === "function") it.occ = clamp(+it.occlusion() || 0, 0, 1);
    if (!it.position) return;
    const p = typeof it.position === "function" ? it.position() : it.position;
    if (p) this.spatialize(p, this.listener, it); else it.distance = Infinity;   // ה-NPC נעלם
  }

  _params(it, duck = 1) {
    const dn = clamp(it.distance / it.maxDistance, 0, 1), e = it.eff, lp = 16000 - 14200 * dn ** 0.7;
    return {
      voiceId: it.voiceId, lang: this.lang, pitch: e.pitch, rate: e.rate,
      volume: clamp((e.profile.volume ?? 1) * (1 - dn * dn) * (1 - 0.4 * it.occ) * this.masterVolume * duck, 0, 1),
      pan: it.pan, lowpass: Math.round(lp + (600 - lp) * it.occ), synth: e.synth, seed: it.seed,
    };
  }

  /**
   * @param {string} text
   * @param {object} o
   * @param {string} o.voice  @param {number} o.priority  @param {boolean} o.interrupt
   * @param {string|object} o.mood
   * @param {{x,y?,z}|(()=>{x,y?,z}|undefined)} o.position  מיקום הדובר (אובייקט חי או פונקציה) — מתעדכן ב-update()
   * @param {number} o.distance  @param {number} o.pan  חלופה סטטית ל-position
   * @param {string} o.speakerId  cooldown, ייחודיות ו-lipSync   @param {number} o.seed
   * @param {number} o.ttl  מילישניות המתנה מקסימליות בתור
   * @param {number|(()=>number)} o.occlusion  0..1 — חסימה בין הדובר לשחקן (פונקציה נקראת ב-update)
   * @param {Function} o.onStart  @param {Function} o.onEnd  @param {(info)=>void} o.onTimeline
   * @returns {Promise<'done'|'dropped'|'cancelled'>}
   */
  speak(text, o = {}) {
    const {
      voice = "woman_calm", priority = Priority.NORMAL, interrupt = false, mood, position, seed,
      maxDistance = this.maxDistance, speakerId = voice, ttl = this.ttlMs, occlusion = 0, onStart, onEnd, onTimeline,
    } = o;
    const eff = this._effective(voice, mood);
    const s = String(text ?? "").trim();
    if (this.muted || !/[\p{L}\p{N}]/u.test(s)) return DROPPED;

    const t = now(), soft = priority < Priority.IMPORTANT;
    if (soft && t - (this._lastSpoke.get(speakerId) ?? -1e9) < this.speakerCooldownMs) return DROPPED;
    if (soft && this._queue.some(q => q.speakerId === speakerId)) return DROPPED;   // דובר אחד — שורה אחת בתור

    const it = {
      id: ++this._seq, eff, voiceId: this._voiceFor.get(voice), priority, speakerId, position, seed, maxDistance, interrupt,
      parts: this.backend.wholeText ? [s] : splitSentences(s), distance: o.distance ?? 0, pan: o.pan ?? 0,
      expires: soft ? t + ttl : Infinity, onStart, onEnd, onTimeline, info: null, t0: 0, sig: "", ls: 0, occlusion, occ: typeof occlusion === "number" ? clamp(occlusion, 0, 1) : 0, started: 0,
    };
    if (!it.parts.length) return DROPPED;
    this._refresh(it);
    if (it.distance > maxDistance) return DROPPED;
    if (soft && this._params(it).volume < this.minAudible) return DROPPED;          // לא נשמע — לא מסנתזים

    return new Promise(resolve => {
      it.resolve = resolve;
      this._preempt(it);
      this._enqueue(it);
      this._pump();
    });
  }

  _enqueue(it) {
    const q = this._queue; let i = q.length;
    while (i && q[i - 1].priority < it.priority) i--;                // עדיפות יורדת, ובתוכה FIFO
    q.splice(i, 0, it);
    while (q.length > this.maxQueue) q.pop().resolve("dropped");
    if (q.includes(it) && !this._channels.some(c => !c.item) && this._channels[0].backend.warm) {   // יחכה — מחממים ברקע
      idle(() => { if (this._queue.includes(it)) this._channels[0].backend.warm(it.parts[0], it.eff.synth, it.seed); });
    }
  }

  /** CRITICAL (או interrupt) מפנה ערוץ: את הדובר עצמו, או את החלש/הוותיק ביותר כשאין ערוץ פנוי */
  _preempt(it) {
    const free = this._channels.some(c => !c.item);
    if (!it.interrupt && it.priority < Priority.CRITICAL) {   // אין ערוץ פנוי: דובר קרוב וברור דוחק דובר רקע חלש שכבר דיבר >0.6 שנ'
      if (free || it.priority < Priority.NORMAL) return;
      const vol = this._params(it).volume;
      let v = null, vv = 1;
      for (const c of this._channels) {
        const x = c.item; if (!x || x.priority !== Priority.AMBIENT || now() - x.started < 600) continue;
        const xv = this._params(x).volume;
        if (xv < vv && vol - xv > 0.3) { v = c; vv = xv; }
      }
      if (v) this._cancelChannel(v);
      return;
    }
    let v = null;
    for (const c of this._channels) {
      const x = c.item;
      if (!x || !(it.priority === Priority.CRITICAL || it.priority >= x.priority)) continue;
      if (free && x.speakerId !== it.speakerId) continue;
      if (!v || x.priority < v.item.priority || (x.priority === v.item.priority && x.id < v.item.id)) v = c;
    }
    if (v) this._cancelChannel(v);
  }

  _pump() {
    const q = this._queue, t = now();
    for (let i = 0; i < q.length;) {
      const it = q[i];
      if (it.expires < t) { q.splice(i, 1); it.resolve("dropped"); continue; }
      const ch = this._channels.find(c => !c.item);
      if (!ch) return;
      if (this._channels.some(c => c.item?.speakerId === it.speakerId)) { i++; continue; }
      q.splice(i, 1);
      this._refresh(it);
      if (it.distance > it.maxDistance) { it.resolve("dropped"); continue; }   // התרחק בזמן ההמתנה
      this._start(ch, it);
    }
  }

  _start(ch, it) {
    ch.item = it; it.started = it.t0 = now(); this._lastSpoke.set(it.speakerId, now());
    it.onStart?.();
    const next = i => {
      if (ch.item !== it) return;
      if (i >= it.parts.length) { ch.item = null; it.onEnd?.(); it.resolve("done"); return this._pump(); }
      let fired = false;
      const go = () => { if (!fired) { fired = true; next(i + 1); } };
      try {
        ch.backend.speak(it.parts[i], this._params(it, this._duckFor(it)), {
          onStart: info => { if (info && i === 0) { it.info = info; it.t0 = now(); it.onTimeline?.(info); } },
          onEnd: go, onError: go,
        });
      } catch { go(); }
    };
    next(0);
  }

  _cancelChannel(ch) { const it = ch.item; ch.item = null; ch.backend.cancel(); it?.resolve("cancelled"); }

  _duckFor(it) {
    if (it.priority >= Priority.IMPORTANT) return 1;
    for (const c of this._channels) if (c.item && c.item.priority >= Priority.IMPORTANT) return this.duck;
    return 1;
  }

  /** לקרוא מלולאת המשחק (כל פריים או כל כמה פריימים): מעדכן עוצמה/פאן/סינון של דוברים פעילים */
  update() {
    for (const c of this._channels) {
      const it = c.item;
      if (!it || !c.backend.setSpatial) continue;
      this._refresh(it);
      const p = this._params(it, this._duckFor(it));
      const sig = `${p.volume.toFixed(2)}|${p.pan.toFixed(2)}|${Math.round(p.lowpass / 100)}`;
      if (sig !== it.sig) { it.sig = sig; c.backend.setSpatial(p); }
    }
  }

  /** ויזמה ועוצמה נוכחיות של דובר פעיל (או null) — לסנכרון שפתיים בלולאת הרינדור */
  lipSync(speakerId) {
    const it = this._channels.find(c => c.item?.speakerId === speakerId)?.item;
    if (!it?.info) return null;
    const t = (now() - it.t0) / 1000;
    const raw = SpeechEngine.loudnessAt(it.info, t);
    it.ls += (raw - it.ls) * (raw > it.ls ? 0.6 : 0.25);      // attack מהיר, release איטי — לסת טבעית
    return { viseme: SpeechEngine.visemeAt(it.info.timeline, t), loudness: it.ls };
  }

  /** שיחה/קטסצנה: [{voice,text,speakerId?,mood?,position?,gap?}] ברצף. מפסיקה רק אם בוטלה (stop/interrupt). */
  async sequence(lines, { gapMs = 250, ...defaults } = {}) {
    for (const l of lines) {
      if (await this.speak(l.text, { ...defaults, ...l }) === "cancelled") return "cancelled";
      await new Promise(r => setTimeout(r, l.gap ?? gapMs));
    }
    return "done";
  }

  /** לכוונון ביצועים: תור, ערוצים פעילים ומטמון */
  stats() {
    const c = this.backend.stats;
    return { queued: this._queue.length, active: this._channels.filter(x => x.item).length, channels: this._channels.length,
      cacheMB: c ? +(c.bytes / 1e6).toFixed(2) : 0, hits: c?.hits ?? 0, misses: c?.misses ?? 0 };
  }

  isSpeaking(speakerId) { return this._channels.some(c => c.item && (speakerId == null || c.item.speakerId === speakerId)); }

  stop() {
    this._queue.splice(0).forEach(i => i.resolve("cancelled"));
    for (const c of this._channels) if (c.item) this._cancelChannel(c);
  }
  setMasterVolume(v) { this.masterVolume = clamp(v, 0, 1); }
  setMuted(b) { this.muted = !!b; if (b) this.stop(); }

  // ── רינדור לא-מקוון ──
  _synthBackend() {
    if (this.backend instanceof FormantBackend) return this.backend;
    return (this._renderer ??= new FormantBackend());
  }
  /** @returns {{samples:Float32Array, sampleRate:number, duration:number, timeline:object[], envelope:Float32Array}} */
  render(text, { voice = "woman_calm", mood, seed } = {}) {
    return this._synthBackend().render(text, this._effective(voice, mood).synth, seed);
  }
  renderWav(text, o) { const r = this.render(text, o); return toWav(r.samples, r.sampleRate); }
  /** מחמם את המטמון — שורות מוכרות ישמעו מיד (חוסם; לטעינה ראשונית) */
  prebake(lines) { for (const l of lines) this.render(l.text, l); return lines.length; }
  /** כמו prebake אבל מוותר על ה-thread כל budgetMs — בלי לתקוע פריימים באמצע משחק */
  async prebakeAsync(lines, budgetMs = 8) {
    let t = now();
    for (const l of lines) {
      this.render(l.text, l);
      if (now() - t > budgetMs) { await new Promise(r => setTimeout(r)); t = now(); }
    }
    return lines.length;
  }

  /** ויזמה פעילה בזמן t (שניות) */
  static visemeAt(timeline, t) {
    for (const e of timeline) if (t >= e.t0 && t < e.t1) return e.viseme;
    return "sil";
  }
  /** עוצמה (0–1 בערך) בזמן t — לתנועת לסת */
  static loudnessAt(info, t) { return info.envelope[Math.min(info.envelope.length - 1, Math.max(0, Math.floor(t / info.envelopeHop)))] ?? 0; }
}

export default SpeechEngine;
