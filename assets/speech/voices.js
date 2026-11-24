/**
 * voices.js — 24 Hebrew voice profiles and moods for the formant synthesizer.
 * pitch/rate are Web-Speech style multipliers; synth holds formant-synth parameters.
 */
const v = (id, label, gender, age, f0, formantShift, extra = {}) => ({
  id, label, gender, age, volume: extra.volume ?? 1,
  pitch: extra.pitch ?? (gender === "f" ? 1.15 : 0.95), rate: extra.rate ?? 1.0,
  synth: { f0, formantShift, breath: extra.breath ?? 0.06, roughness: extra.roughness ?? 0, tension: extra.tension ?? 0.5,
    jitter: extra.jitter ?? 0.012, shimmer: extra.shimmer ?? 0.04, rate: extra.srate ?? 1.0, brightness: extra.brightness ?? 0.5,
    f0Range: extra.f0Range ?? 0.22, nasality: extra.nasality ?? 0 }
});

export const VOICE_PROFILES = [
  v("man_calm", "גבר רגוע", "m", "adult", 112, 1.0),
  v("man_deep", "גבר עמוק", "m", "adult", 92, 0.92, { brightness: 0.4 }),
  v("man_bright", "גבר צעיר", "m", "young", 132, 1.04, { srate: 1.1 }),
  v("man_rough", "גבר מחוספס", "m", "adult", 100, 0.96, { roughness: 0.35, breath: 0.1 }),
  v("man_posh", "גבר אלגנטי", "m", "adult", 108, 0.98, { srate: 0.92, f0Range: 0.3, brightness: 0.6 }),
  v("man_elder", "גבר מבוגר", "m", "elder", 104, 0.97, { jitter: 0.03, shimmer: 0.08, breath: 0.12, srate: 0.85 }),
  v("teen_boy", "נער", "m", "teen", 150, 1.08, { srate: 1.15, f0Range: 0.3 }),
  v("gangster_1", "בריון", "m", "adult", 96, 0.94, { roughness: 0.45, tension: 0.7, srate: 1.05 }),
  v("gangster_2", "עבריין", "m", "adult", 104, 0.95, { roughness: 0.3, nasality: 0.15, srate: 1.1 }),
  v("police_m1", "שוטר", "m", "adult", 108, 0.97, { tension: 0.75, srate: 1.05, brightness: 0.65 }),
  v("police_m2", "שוטר ותיק", "m", "adult", 96, 0.95, { tension: 0.7, roughness: 0.15 }),
  v("driver_m", "נהג", "m", "adult", 115, 1.0, { srate: 1.08 }),
  v("woman_calm", "אישה רגועה", "f", "adult", 205, 1.16),
  v("woman_warm", "אישה חמה", "f", "adult", 190, 1.13, { breath: 0.1, brightness: 0.45 }),
  v("woman_bright", "אישה צעירה", "f", "young", 225, 1.19, { srate: 1.1, f0Range: 0.28 }),
  v("woman_posh", "אישה אלגנטית", "f", "adult", 198, 1.15, { srate: 0.92, f0Range: 0.32, brightness: 0.62 }),
  v("woman_elder", "אישה מבוגרת", "f", "elder", 182, 1.1, { jitter: 0.03, shimmer: 0.08, breath: 0.14, srate: 0.85 }),
  v("teen_girl", "נערה", "f", "teen", 240, 1.22, { srate: 1.15, f0Range: 0.32 }),
  v("police_f1", "שוטרת", "f", "adult", 200, 1.14, { tension: 0.75, srate: 1.05, brightness: 0.65 }),
  v("driver_f", "נהגת", "f", "adult", 210, 1.16, { srate: 1.08 }),
  v("tourist_m", "תייר", "m", "adult", 120, 1.01, { nasality: 0.2, srate: 0.95 }),
  v("tourist_f", "תיירת", "f", "adult", 215, 1.17, { nasality: 0.2, srate: 0.95 }),
  v("vendor_m", "מוכר בשוק", "m", "adult", 118, 1.0, { srate: 1.2, f0Range: 0.35, brightness: 0.6 }),
  v("hero", "הגיבור", "m", "young", 120, 1.02, { srate: 1.02 })
];

const mood = (pitch, rate, apply) => ({ pitch, rate, apply });
export const MOODS = {
  neutral: mood(0, 0, s => s),
  calm: mood(-0.03, -0.08, s => ({ ...s, f0Range: s.f0Range * 0.8, breath: s.breath + 0.02 })),
  happy: mood(0.08, 0.06, s => ({ ...s, f0: s.f0 * 1.07, f0Range: s.f0Range * 1.35, brightness: Math.min(1, s.brightness + 0.1) })),
  angry: mood(0.05, 0.12, s => ({ ...s, f0: s.f0 * 1.12, f0Range: s.f0Range * 1.4, tension: Math.min(1, s.tension + 0.3), roughness: s.roughness + 0.15, rate: s.rate * 1.12, volume: 1 })),
  shout: mood(0.12, 0.05, s => ({ ...s, f0: s.f0 * 1.25, f0Range: s.f0Range * 1.2, tension: 0.95, brightness: 0.8, volume: 1 })),
  scared: mood(0.15, 0.18, s => ({ ...s, f0: s.f0 * 1.2, jitter: s.jitter * 2.2, vibrato: 0.6, rate: s.rate * 1.2, breath: s.breath + 0.06 })),
  sad: mood(-0.08, -0.15, s => ({ ...s, f0: s.f0 * 0.92, f0Range: s.f0Range * 0.6, rate: s.rate * 0.85, breath: s.breath + 0.05 })),
  annoyed: mood(0.02, 0.05, s => ({ ...s, f0Range: s.f0Range * 1.15, tension: Math.min(1, s.tension + 0.15), rate: s.rate * 1.05 })),
  whisper: mood(-0.05, -0.05, s => ({ ...s, breath: 0.9, volume: 0.5, tension: 0.2 }))
};

export function resolveMood(m) {
  if (!m) return MOODS.neutral;
  if (typeof m === "string") return MOODS[m] ?? MOODS.neutral;
  return { pitch: m.pitch ?? 0, rate: m.rate ?? 0, apply: m.apply ?? (s => ({ ...s, ...(m.synth || {}) })) };
}
