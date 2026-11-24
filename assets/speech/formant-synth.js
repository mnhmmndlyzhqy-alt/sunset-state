/**
 * formant-synth.js — compact source-filter speech synthesizer for Hebrew phoneme units.
 * Glottal pulse source (jitter, shimmer, breathiness, roughness) → cascade of 3 formant
 * resonators (+ nasal pole) with smooth coarticulation; filtered noise for fricatives,
 * bursts for plosives; intonation: declination, stress accents, question/exclamation tails.
 * Returns samples + lip-sync timeline (visemes) + loudness envelope.
 */
import { textToUnits } from "./hebrew-g2p.js";

export const DEFAULT_SYNTH = {
  f0: 118, f0Range: 0.22, formantShift: 1.0, breath: 0.06, jitter: 0.012, shimmer: 0.04, roughness: 0.0,
  rate: 1.0, tension: 0.5, nasality: 0.0, volume: 0.85, vibrato: 0.0, brightness: 0.5
};

export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9E3779B9 >>> 0) / 4294967296); }

// [F1, F2, F3, type, voiced, durationMs, noiseCentre, viseme]
const P = {
  a: [800, 1300, 2550, "v", 1, 95, 0, "aa"], e: [520, 1850, 2550, "v", 1, 85, 0, "E"], i: [310, 2250, 3000, "v", 1, 80, 0, "I"],
  o: [520, 880, 2450, "v", 1, 95, 0, "O"], u: [340, 760, 2300, "v", 1, 85, 0, "U"],
  m: [270, 1050, 2300, "n", 1, 70, 0, "PP"], n: [270, 1500, 2500, "n", 1, 65, 0, "nn"],
  l: [360, 1150, 2650, "l", 1, 60, 0, "DD"], y: [300, 2200, 3000, "l", 1, 45, 0, "I"], r: [450, 1250, 2300, "r", 1, 60, 1400, "RR"],
  b: [250, 900, 2300, "p", 1, 70, 900, "PP"], d: [280, 1700, 2600, "p", 1, 65, 3200, "DD"], g: [280, 1500, 2300, "p", 1, 70, 1800, "kk"],
  p: [400, 1000, 2400, "p", 0, 75, 1100, "PP"], t: [400, 1700, 2600, "p", 0, 70, 4200, "DD"], k: [400, 1500, 2400, "p", 0, 75, 2000, "kk"],
  "'": [600, 1300, 2500, "q", 0, 35, 0, "sil"],
  v: [300, 1100, 2400, "f", 1, 70, 3500, "FF"], z: [300, 1700, 2600, "f", 1, 80, 6000, "SS"], Z: [300, 1700, 2600, "f", 1, 80, 3200, "CH"],
  f: [400, 1100, 2400, "f", 0, 85, 4500, "FF"], s: [400, 1700, 2600, "f", 0, 95, 6500, "SS"], S: [400, 1800, 2600, "f", 0, 95, 3300, "CH"],
  x: [500, 1300, 2400, "f", 0, 85, 1500, "kk"], h: [600, 1400, 2500, "h", 0, 50, 2000, "sil"],
  c: [400, 1700, 2600, "a", 0, 105, 6200, "SS"], C: [400, 1800, 2600, "a", 0, 105, 3300, "CH"], j: [300, 1800, 2600, "a", 1, 95, 3200, "CH"]
};

class Reson { // 2-pole resonator, coefficients updated per block
  constructor() { this.y1 = 0; this.y2 = 0; this.a = 0; this.b = 0; this.c = 0; }
  set(f, bw, sr) { const r = Math.exp(-Math.PI * bw / sr), th = 2 * Math.PI * f / sr; this.b = 2 * r * Math.cos(th); this.c = -r * r; this.a = 1 - this.b - this.c; }
  run(x) { const y = this.a * x + this.b * this.y1 + this.c * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
}

export function synthesizeText(text, synth = DEFAULT_SYNTH, { sampleRate = 22050, seed = hashSeed(text) } = {}) {
  const s = { ...DEFAULT_SYNTH, ...synth };
  const rand = rng(seed);
  const units = textToUnits(text);
  const terminal = units.terminal || ".";
  const segs = [];
  let t = 0.03;
  const rate = Math.max(0.35, s.rate);
  for (const u of units) {
    if (u.ph === "_") { const d = 0.07 * (u.len ?? 1) / rate; segs.push({ ph: "_", t0: t, t1: t + d, spec: null }); t += d; continue; }
    const spec = P[u.ph]; if (!spec) continue;
    let d = spec[5] / 1000 / rate * (u.stress && spec[3] === "v" ? 1.35 : 1) * (0.92 + rand() * 0.16);
    if (u.glide) d *= 0.6;
    segs.push({ ph: u.ph, t0: t, t1: t + d, spec, stress: !!u.stress });
    t += d;
  }
  const total = t + 0.12;
  const N = Math.max(1, Math.ceil(total * sampleRate));
  const out = new Float32Array(N);
  const F = [new Reson(), new Reson(), new Reson()], nasal = new Reson(), noiseF = new Reson(), noiseF2 = new Reson();
  const fs = s.formantShift;
  let phase = 0, period = 1, prevNoise = 0, lp = 0, hp = 0;
  let si = 0;
  const blk = 64;
  // smoothed parameters
  let f1 = 500 * fs, f2 = 1500 * fs, f3 = 2500 * fs, voiceAmp = 0, noiseAmp = 0, noiseC = 3000, nasalAmp = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  const voicedSegs = segs.filter(x => x.spec && x.spec[4]);
  const lastVoicedT = voicedSegs.length ? voicedSegs[voicedSegs.length - 1].t1 : total;
  for (let n0 = 0; n0 < N; n0 += blk) {
    const time = n0 / sampleRate;
    while (si < segs.length - 1 && time >= segs[si].t1) si++;
    const seg = segs[si];
    const local = seg ? Math.min(1, Math.max(0, (time - seg.t0) / Math.max(1e-3, seg.t1 - seg.t0))) : 1;
    let tf1 = f1, tf2 = f2, tf3 = f3, tv = 0, tn = 0, tnc = noiseC, tna = 0;
    if (seg && seg.spec && time < seg.t1 + 0.01) {
      const [a1, a2, a3, type, voiced, , nc] = seg.spec;
      tf1 = a1 * fs; tf2 = a2 * fs; tf3 = a3 * fs; tnc = nc * Math.min(1.25, fs);
      if (type === "v") tv = seg.stress ? 1 : 0.82;
      else if (type === "n") { tv = 0.55; tna = 0.6 + s.nasality; }
      else if (type === "l") tv = 0.6;
      else if (type === "r") { tv = 0.45; tn = 0.12; }
      else if (type === "f") { tv = voiced ? 0.35 : 0; tn = voiced ? 0.25 : 0.55; }
      else if (type === "h") { tn = 0.25; tv = 0.05; }
      else if (type === "p") { const closure = local < 0.55; tv = closure ? (voiced ? 0.12 : 0) : 0.2; tn = closure ? 0 : (local < 0.75 ? 0.9 : 0.15); }
      else if (type === "a") { const closure = local < 0.35; tv = voiced ? 0.2 : 0; tn = closure ? 0 : 0.6; }
      else if (type === "q") { tv = 0; tn = 0; }
    }
    const k = 0.22 * (blk / 64);
    f1 = lerp(f1, tf1, k * 1.2); f2 = lerp(f2, tf2, k); f3 = lerp(f3, tf3, k * 0.9);
    voiceAmp = lerp(voiceAmp, tv, 0.35); noiseAmp = lerp(noiseAmp, tn, 0.5); noiseC = lerp(noiseC, tnc, 0.4); nasalAmp = lerp(nasalAmp, tna, 0.3);
    F[0].set(f1, 60 + f1 * 0.08, sampleRate); F[1].set(f2, 80 + f2 * 0.06, sampleRate); F[2].set(f3, 120 + f3 * 0.04, sampleRate);
    nasal.set(260 * fs, 90, sampleRate);
    noiseF.set(Math.min(noiseC, sampleRate * 0.45), noiseC * 0.45, sampleRate); noiseF2.set(Math.min(noiseC * 1.4, sampleRate * 0.45), noiseC * 0.6, sampleRate);
    // intonation: declination + stress accent + terminal contour
    const prog = Math.min(1, time / Math.max(0.2, lastVoicedT));
    let f0 = s.f0 * (1 + s.f0Range * (0.12 - 0.22 * prog));
    if (seg && seg.stress) f0 *= 1 + s.f0Range * 0.55 * Math.sin(Math.PI * local);
    if (terminal === "?" && prog > 0.75) f0 *= 1 + s.f0Range * 2.2 * (prog - 0.75) / 0.25;
    if (terminal === "!") f0 *= 1 + s.f0Range * 0.5 * (1 - prog);
    if (s.vibrato) f0 *= 1 + s.vibrato * 0.03 * Math.sin(time * 34);
    const end = Math.min(N, n0 + blk);
    for (let n = n0; n < end; n++) {
      // glottal source (LF-like: rising ramp, sharp closure)
      phase += 1 / period;
      if (phase >= 1) { phase -= 1; period = sampleRate / (f0 * (1 + (rand() - 0.5) * 2 * s.jitter)); }
      const open = 0.6 - 0.15 * s.tension;
      let g = phase < open ? Math.sin(Math.PI * phase / open) ** 2 : 0;
      g = g - 0.5 * (phase < open ? 1 : 0) * (phase / open);
      g *= 1 + (rand() - 0.5) * 2 * s.shimmer;
      const noise = rand() * 2 - 1;
      const asp = noise * s.breath * (0.6 + voiceAmp);
      let src = (g + asp + (s.roughness ? (rand() - 0.5) * s.roughness * g : 0)) * voiceAmp;
      // vocal tract
      let y = F[2].run(F[1].run(F[0].run(src)));
      y = y * (1 - nasalAmp * 0.6) + nasal.run(src) * nasalAmp * 0.8;
      // fricative / burst noise
      const nn = noise - prevNoise * 0.6; prevNoise = noise;
      y += (noiseF.run(nn) * 0.7 + noiseF2.run(nn) * 0.35) * noiseAmp * 0.6;
      // spectral tilt (brightness) + DC block
      lp = lp + (y - lp) * (0.25 + 0.6 * s.brightness);
      const o = lp - hp; hp += (lp - hp) * 0.002;
      out[n] = o;
    }
  }
  // normalize & soft-limit
  let peak = 1e-6; for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(out[n]));
  const gain = s.volume * 0.9 / peak;
  for (let n = 0; n < N; n++) out[n] = Math.tanh(out[n] * gain * 1.2) / 1.05;
  // fades
  const fadeN = Math.min(N >> 2, Math.round(sampleRate * 0.01));
  for (let n = 0; n < fadeN; n++) { out[n] *= n / fadeN; out[N - 1 - n] *= n / fadeN; }
  // envelope for lip sync
  const hopS = 0.02, hop = Math.round(sampleRate * hopS), envelope = new Float32Array(Math.ceil(N / hop));
  for (let i = 0; i < envelope.length; i++) {
    let acc = 0; const a = i * hop, b = Math.min(N, a + hop);
    for (let n = a; n < b; n++) acc += out[n] * out[n];
    envelope[i] = Math.min(1, Math.sqrt(acc / Math.max(1, b - a)) * 2.2);
  }
  const timeline = segs.map(x => ({ t0: x.t0, t1: x.t1, ph: x.ph, viseme: x.spec ? x.spec[7] : "sil" }));
  return { samples: out, sampleRate, duration: N / sampleRate, timeline, envelope, envelopeHop: hopS };
}

export function toWav(samples, sampleRate) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return typeof Blob !== "undefined" ? new Blob([buf], { type: "audio/wav" }) : buf;
}
