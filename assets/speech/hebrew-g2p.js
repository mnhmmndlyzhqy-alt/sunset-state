/**
 * hebrew-g2p.js — Hebrew text → phoneme units for the formant synthesizer.
 * Unvocalized Hebrew is ambiguous, so known words come from a lexicon written in a
 * simple Latin phonemic spelling; unknown words fall back to letter rules with
 * default vowel insertion.
 *
 * Phonemes: a e i o u | b v g d h z x t y k l m n s p f c(ts) r S(sh) j(dj) Z(zh) C(ch) ' (glottal) | _ (pause)
 */
const LEX = new Map();

/** word (Hebrew, no niqqud) → phonemic Latin spelling, e.g. "שלום" → "SHAlom" (capitals = stress) */
export function addPronunciation(word, ph) { LEX.set(normalizeWord(word), String(ph)); }

const BASE_LEXICON = {
  // core / greetings
  "שלום": "shaLOM", "היי": "HAY", "בוקר": "BOker", "טוב": "TOV", "ערב": "Erev", "מה": "MA", "נשמע": "nishMA", "שלומך": "shloMXa",
  "יום": "YOM", "יפה": "yaFE", "היום": "haYOM", "איזה": "Eize", "חום": "XOM", "כן": "KEN", "לא": "LO", "תודה": "toDA", "סליחה": "sliXA",
  "בבקשה": "bevakaSHA", "אחי": "aXI", "אחותי": "aXOti", "יאללה": "YAla", "וואו": "WAU", "וואי": "WAY", "נו": "NU", "כבר": "KVAR",
  // anger / traffic
  "יש": "YESH", "לך": "LEXa", "לכם": "laXEM", "אתה": "aTA", "את": "AT", "עיוור": "iVER", "עיוורת": "iVEret", "תסתכל": "tistaKEL", "תסתכלי": "tistakLI",
  "על": "AL", "הכביש": "hakviSH", "לאן": "leAN", "נוסע": "noSEa", "נוסעת": "noSAat", "נהג": "naHAG", "גרוע": "gaRUa", "באמת": "beEmet",
  "זוז": "ZUZ", "זוזי": "ZUzi", "קדימה": "kaDIma", "מהדרך": "meadaREX", "תזוז": "taZUZ", "תיזהר": "tizaHER", "תיזהרי": "tizaharI",
  "לאט": "leAT", "תאט": "taAT", "כמעט": "kimAT", "דרסת": "daRASta", "אותי": "oTI", "הצילו": "haTSIlu", "תברחו": "tivreXU", "תעצור": "taaTSOR",
  "עצור": "aTSOR", "משטרה": "mishtaRA", "בצד": "baTSAD", "ידיים": "yaDAyim", "למעלה": "LEmala", "האוטו": "haOto", "שלי": "sheLI",
  "זה": "ZE", "תחזיר": "taxZIR", "תחזירי": "taxziRI", "הרכב": "haREXev", "גנב": "gaNAV", "מישהו": "MISHehu", "תעזרו": "taazRU",
  "רגע": "REga", "מה'": "MA", "הבעיה": "habaaYA", "שלך": "sheLXA", "בסדר": "beSEder", "קרה": "kaRA", "פה": "PO", "שם": "SHAM",
  "איפה": "Eyfo", "החוף": "haXOF", "קפה": "kaFE", "טעים": "taIM", "מושלם": "mushLAM", "שמש": "SHEmesh", "ים": "YAM", "תמונה": "tmuNA",
  "אפשר": "efSHAR", "לעזור": "laaZOR", "עוד": "OD", "פעם": "PAam", "אחת": "aXAT", "די": "DAY", "מספיק": "masPIK", "חלאס": "XAlas",
  "אוי": "OY", "אויש": "OYsh", "מצטער": "mitstaER", "מצטערת": "mitstaEret", "סע": "SA", "בשקט": "besheKET", "רעש": "RAash",
  "הלו": "haLO", "כאן": "KAN", "עכשיו": "aXSHAV", "מהר": "maHER", "ממש": "MAMash", "מגניב": "magNIV", "אוטו": "Oto", "יפהפה": "yefeFE",
  "וואלה": "WAla", "טירוף": "teRUF", "ביי": "BAY", "להתראות": "lehitraOT", "נשימה": "nesheMA", "אמא": "Ima", "שלומות": "shloMOT"
};
for (const [w, p] of Object.entries(BASE_LEXICON)) LEX.set(w, p);

const NIQQUD = /[֑-ׇ]/g;
export function normalizeText(text) {
  return String(text ?? "").replace(NIQQUD, "").replace(/[״"]/g, "").replace(/\s+/g, " ").trim();
}
function normalizeWord(w) { return normalizeText(w).replace(/[^א-ת'׳a-z]/gi, ""); }

export function splitSentences(text) {
  const t = normalizeText(text);
  return t.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
}

const FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
/** letter rules for unknown words */
function rulesFor(word) {
  const chars = [...word].map(c => FINALS[c] || c);
  const out = [];
  const vowelAfter = (i) => { const n = chars[i + 1]; return n === "ו" || n === "י" || n === "א" || n === "ה" && i + 1 === chars.length - 1; };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], first = i === 0, last = i === chars.length - 1, gersh = chars[i + 1] === "'" || chars[i + 1] === "׳";
    if (c === "'" || c === "׳") continue;
    let p = "";
    switch (c) {
      case "א": p = first ? "'" : (last ? "a" : ""); break;
      case "ב": p = first ? "b" : "v"; break;
      case "ג": p = gersh ? "j" : "g"; break;
      case "ד": p = "d"; break;
      case "ה": p = last ? "a" : "h"; break;
      case "ו": p = first ? "v" : (chars[i + 1] === "ו" ? "v" : "o"); if (chars[i - 1] === "ו") p = ""; break;
      case "ז": p = gersh ? "Z" : "z"; break;
      case "ח": p = "x"; break;
      case "ט": p = "t"; break;
      case "י": p = first ? "y" : (last ? "i" : (chars[i + 1] === "י" ? "y" : "i")); if (chars[i - 1] === "י") p = ""; break;
      case "כ": p = first ? "k" : "x"; break;
      case "ל": p = "l"; break;
      case "מ": p = "m"; break;
      case "נ": p = "n"; break;
      case "ס": p = "s"; break;
      case "ע": p = first ? "'" : (last ? "a" : ""); break;
      case "פ": p = first ? "p" : "f"; break;
      case "צ": p = gersh ? "C" : "c"; break;
      case "ק": p = "k"; break;
      case "ר": p = "r"; break;
      case "ש": p = "S"; break;
      case "ת": p = "t"; break;
      default: p = /[a-z]/i.test(c) ? c.toLowerCase() : "";
    }
    if (!p) continue;
    out.push(p);
    // insert a default vowel between consonant clusters (Hebrew is written without vowels)
    const cons = !"aeiou".includes(p);
    if (cons && !last && !vowelAfter(i) && i % 2 === 0) out.push(i === 0 && chars.length > 3 ? "e" : "a");
  }
  if (out.length && !"aeiou".includes(out[out.length - 1]) && out.length <= 2) out.splice(1, 0, "a");
  return out.join("");
}

/** Latin phonemic spelling → unit list [{ph, stress}] */
function parseSpelling(sp) {
  const units = [];
  const s = String(sp);
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2).toLowerCase();
    const up = s[i] !== s[i].toLowerCase();
    if (two === "sh") { units.push({ ph: "S", stress: up }); i++; continue; }
    if (two === "ts") { units.push({ ph: "c", stress: up }); i++; continue; }
    if (two === "ch") { units.push({ ph: "C", stress: up }); i++; continue; }
    const c = s[i];
    if (c === "S" || c === "C" || c === "Z" || c === "j" || c === "c") { units.push({ ph: c, stress: false }); continue; }
    const l = c.toLowerCase();
    if (l === "w") { units.push({ ph: "u", stress: up, glide: true }); continue; }
    if ("abdefghiklmnoprstuvxyz'".includes(l)) units.push({ ph: l, stress: up });
  }
  return units;
}

/** text → [{ph, stress, word, boundary?}] including pauses ("_") at punctuation */
export function textToUnits(text) {
  const t = normalizeText(text);
  const units = [];
  const tokens = t.split(/(\s+|[,.!?…;:—-])/).filter(x => x && x.trim() !== "");
  for (const tok of tokens) {
    if (/^[,.!?…;:—-]$/.test(tok)) { units.push({ ph: "_", len: /[.!?…]/.test(tok) ? 1.6 : 0.9, punct: tok }); continue; }
    const w = normalizeWord(tok);
    if (!w) continue;
    const sp = LEX.get(w) ?? (/^[a-z']+$/i.test(w) ? w : rulesFor(w));
    const u = parseSpelling(sp);
    if (!u.some(x => x.stress)) { const v = [...u].reverse().find(x => "aeiou".includes(x.ph)); if (v) v.stress = true; }
    if (u.length) u[0].wordStart = true;
    units.push(...u);
    units.push({ ph: "_", len: 0.15 });
  }
  const end = /[?]\s*$/.test(t) ? "?" : /!\s*$/.test(t) ? "!" : ".";
  units.terminal = end;
  return units;
}

export function phonemesOf(text) { return textToUnits(text).map(u => u.ph).join(""); }
