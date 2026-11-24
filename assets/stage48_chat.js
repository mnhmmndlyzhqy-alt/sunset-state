/* SUNSET STATE — Stage 48: "Sunset Mind", an offline conversation AI for city people.
 *  Walk up to someone and press E: they are marked, stop, face you, and a chat opens
 *  (bottom right). Type anything in Hebrew; they answer in text and in their own recorded
 *  voice at the same time. 🔇 keeps the chat text-only.
 *  Everything runs locally: Hebrew normalisation, intent scoring, a persona per person
 *  (name, job, temper, chattiness), conversation memory and affinity, and varied replies
 *  composed from a recorded sentence bank (assets/chat48_bank.json). No server.
 *  Off with ?chat48Off.
 */
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('chat48Off') || params.has('realismOff')) return;

  let BANK = null;
  fetch('assets/chat48_bank.json').then(r => r.json()).then(b => { BANK = b; }).catch(e => console.warn('[Chat48] bank', e));
  const game = () => globalThis.__SUNSET_PERFORMANCE06_GAME;

  // ---------- language ----------
  const normalize = s => ' ' + String(s || '').replace(/[֑-ׇ]/g, '').replace(/[״"׳']/g, '').toLowerCase()
    .replace(/[^א-תa-z0-9?\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  // Allow Hebrew prefix letters (ו ה ש ב ל מ כ) in front of a keyword.
  function has(norm, key) {
    // A key ending in a space must end a word ("אי " is an island, not the start of "איך").
    const k = normalize(key).trim(), whole = /\s$/.test(key) || k.length <= 2;
    if (!k) return false;
    return new RegExp('\\s(?:[והשבלמכ]{1,2})?' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (whole ? '(?=\\s)' : '')).test(norm);
  }
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };

  // ---------- persona & memory ----------
  const minds = new WeakMap();
  function mindOf(w) {
    let m = minds.get(w);
    if (m) return m;
    const a = (w.appearance ?? ((Math.round(w.x * 7) * 73856093) ^ (Math.round(w.z * 7) * 19349663))) >>> 0, h = hash(a);
    const profile = RC.voiceForWalker ? RC.voiceForWalker(w) : 'man_calm';
    const female = /woman|girl|_f/.test(profile);
    m = { profile, female, h, grumpy: h % 5 === 0, chatty: (h >>> 3) % 3 === 0, shy: (h >>> 5) % 4 === 0,
      affinity: (h >>> 7) % 3 - 1, turns: 0, used: new Set(), told: false, playerName: '', last: '' };
    minds.set(w, m);
    return m;
  }
  const fem = (m, t) => { if (!m.female || !BANK) return t; for (const [a, b] of BANK.fem) t = t.split(a).join(b); return t; };
  function pickFrom(m, list) {
    if (!list || !list.length) return null;
    const fresh = list.filter(t => !m.used.has(t));
    const pool = fresh.length ? fresh : list;
    const t = pool[(Math.random() * pool.length) | 0];
    m.used.add(t);
    return t;
  }
  function placeCoords(g, key) {
    const w = g.world, site = n => (w.stage38Sites || []).find(s => s.name === n);
    switch (key) {
      case 'beach': return { x: 898, z: -41 };
      case 'bank': return w.stage44Bank;
      case 'estate': return w.office48;
      case 'cars': return w.stage44Depot;
      case 'hospital': return site('HOSPITAL');
      case 'airport': return site('AIRPORT');
      case 'police': return site('POLICE');
      case 'port': return site('CARGO PORT');
      case 'library': return site('LIBRARY');
      case 'school': return site('SCHOOL');
      case 'cityhall': return site('CITY HALL');
      case 'mall': return (w.landmarks || []).find(l => l.kind === 'mall' || l.label === 'mall' || l.name === 'mall');
    }
    return null;
  }
  function directions(g, who, key) {
    const p = placeCoords(g, key), D = BANK.dirs;
    if (!p || !Number.isFinite(p.x)) return D.unknown;
    const dx = p.x - who.x, dz = p.z - who.z, d = Math.hypot(dx, dz);
    if (d < 35) return D.here;
    const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz < 0 ? 'n' : 's');
    return D[dir + (d < 260 ? '_near' : '_far')];
  }

  /** The brain: returns { parts: [sentences], end: bool } */
  function think(g, who, input) {
    const m = mindOf(who), B = BANK, norm = normalize(input);
    m.turns++;
    let best = null, score = 0;
    for (const [id, it] of Object.entries(B.intents)) {
      let s = 0;
      for (const k of it.keys) if (has(norm, k)) s += k.length > 4 ? 2 : 1;
      if (s > score) { score = s; best = id; }
    }
    let place = null;
    for (const [k, p] of Object.entries(B.places)) if (p.keys.some(key => has(norm, key))) { place = k; break; }
    const asks = /איפה|איך מגיע|איך הולכים|לאן|כיוון|דרך ל/.test(input);
    if (place && (best === 'where' || asks || !best)) best = 'where';
    if (best === 'myname') {
      const mm = input.match(/(?:קוראים לי|השם שלי|שמי)\s+([^\s,.!?]+)/);
      if (mm) m.playerName = mm[1];
    }
    if (best === 'compliment') m.affinity += 2;
    else if (best === 'thanks') m.affinity += 1;
    else if (best === 'insult') m.affinity -= 3;
    const mood = (m.grumpy && m.affinity < 3) || m.affinity <= -3 ? 'grumpy' : 'friendly';
    const parts = [];
    let end = false;
    if (m.affinity <= -6) return { parts: [fem(m, pickFrom(m, B.busy))], end: true };
    const it = best && B.intents[best];
    const opener = Math.random() < (m.chatty ? .38 : m.shy ? .12 : .24) && best !== 'greet' && best !== 'bye';
    if (opener) parts.push(pickFrom(m, B.open));
    if (best === 'where') {
      if (place) { parts.push(B.places[place].echo); parts.push(directions(g, who, place)); }
      else parts.push(pickFrom(m, B.intents.help.friendly));
    } else if (best === 'name') {
      if (mood === 'grumpy' && !m.told && Math.random() < .5) parts.push(pickFrom(m, it.grumpy));
      else { m.told = true; const list = m.female ? B.names_f : B.names_m; parts.push(list[m.h % list.length]); }
    } else if (best === 'job') {
      const list = m.female ? it.f : it.m; parts.push(list[(m.h >>> 9) % list.length]);
    } else if (it) {
      parts.push(fem(m, pickFrom(m, it[mood]) || pickFrom(m, it.friendly) || pickFrom(m, B.fallback[mood])));
      if (best === 'bye') end = true;
    } else parts.push(fem(m, pickFrom(m, B.fallback[mood])));
    if (!end && mood === 'friendly' && (m.chatty || Math.random() < .2) && m.turns < 7 && Math.random() < .35 && best !== 'where')
      parts.push(fem(m, pickFrom(m, B.follow)));
    if (!end && m.turns > 11 && Math.random() < .3) { parts.push(fem(m, pickFrom(m, B.busy))); end = true; }
    return { parts: parts.filter(Boolean), end };
  }

  // ---------- UI ----------
  let box, log, input, title, muteBtn, marker, active = null, muted = false, typing = null, dotsEl = null;
  try { muted = localStorage.getItem('chat48Mute') === '1'; } catch { }
  const css = `#chat48{position:fixed;right:16px;bottom:16px;width:min(330px,86vw);z-index:61;direction:rtl;background:rgba(9,20,28,.93);border:1px solid #2c6f86;border-radius:14px;color:#eef6f8;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.45);display:flex;flex-direction:column}
#chat48 header{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08)}#chat48 header b{flex:1}
#chat48 header button{background:none;border:none;color:#eef6f8;font-size:17px;cursor:pointer;padding:2px 4px}
#chat48 .log{height:190px;overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
#chat48 .m{max-width:85%;padding:6px 10px;border-radius:12px;line-height:1.35;word-wrap:break-word}
#chat48 .me{align-self:flex-start;background:#1f6f8b}#chat48 .them{align-self:flex-end;background:#2b3440}#chat48 .sys{align-self:center;opacity:.6;font-size:12px}
#chat48 form{display:flex;gap:6px;padding:8px}#chat48 input{flex:1;background:#0f2a36;border:1px solid #2c6f86;color:#fff;border-radius:10px;padding:7px 9px;font:inherit}
#chat48 form button{background:#2c8fae;border:none;color:#fff;border-radius:10px;padding:0 12px;cursor:pointer;font:inherit}
#mark48{position:fixed;z-index:58;pointer-events:none;color:#ffd36b;font-size:26px;text-shadow:0 0 8px rgba(0,0,0,.7);transform:translate(-50%,-100%);animation:mark48 1s ease-in-out infinite}
@keyframes mark48{50%{margin-top:-6px}}`;
  function ensureDom() {
    if (box || typeof document === 'undefined') return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'chat48'; box.hidden = true;
    box.innerHTML = '<header><b>💬</b><button data-c="mute" title="השתק קול"></button><button data-c="close" title="סגור">✕</button></header><div class="log"></div><form><input maxlength="140" placeholder="כתוב הודעה..." autocomplete="off"><button>שלח</button></form>';
    document.body.appendChild(box);
    log = box.querySelector('.log'); input = box.querySelector('input'); title = box.querySelector('header b'); muteBtn = box.querySelector('[data-c=mute]');
    marker = document.createElement('div'); marker.id = 'mark48'; marker.textContent = '▼'; marker.hidden = true; document.body.appendChild(marker);
    for (const ev of ['keydown', 'keyup', 'keypress', 'pointerdown', 'mousedown', 'click', 'wheel']) box.addEventListener(ev, e => e.stopPropagation());
    box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); send(); });
    box.querySelector('[data-c=close]').addEventListener('click', () => close());
    muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('chat48Mute', muted ? '1' : '0'); } catch { } if (muted && active) RC.chatStop && RC.chatStop(active.who); paintMute(); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    paintMute();
  }
  const paintMute = () => { if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊'; };
  function add(cls, text) {
    const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function open(g, who) {
    ensureDom();
    if (!BANK) { g.showInfo('המוח של התושבים עוד נטען...', 2); return; }
    if (active && active.who !== who) close();
    const m = mindOf(who);
    active = { who, m, until: 0 };
    log.replaceChildren();
    title.textContent = '💬 ' + (m.told ? 'שיחה' : 'אדם ברחוב') + (m.grumpy ? ' · נראה עצבני' : '');
    add('sys', 'כתוב משהו בעברית · Esc לסגירה');
    box.hidden = false;
    try { document.exitPointerLock && document.exitPointerLock(); } catch { }
    g.keys && g.keys.clear && g.keys.clear();
    setTimeout(() => input.focus(), 30);
    if (m.turns === 0 && Math.random() < .6) reply(g, { parts: [fem(m, pickFrom(m, BANK.intents.greet[m.grumpy ? 'grumpy' : 'friendly']))], end: false });
  }
  function close() {
    if (!box) return;
    if (active) { RC.chatStop && RC.chatStop(active.who); active.who.pause = Math.min(active.who.pause || 0, .4); }
    clearTimeout(typing); typing = null;
    active = null; box.hidden = true; marker.hidden = true;
    input.blur();
  }
  function send() {
    const g = game(), text = input.value.trim();
    if (!g || !active || !text) return;
    input.value = '';
    add('me', text);
    const res = think(g, active.who, text);
    reply(g, res);
  }
  function reply(g, res) {
    const who = active && active.who;
    if (!who) return;
    clearTimeout(typing); if (dotsEl) dotsEl.remove();
    const dots = dotsEl = add('them', '...');
    const delay = Math.min(2200, 450 + res.parts.join(' ').length * 22 + Math.random() * 500);
    typing = setTimeout(() => {
      dots.remove(); dotsEl = null;
      const sound = !muted && document.getElementById('sound-button')?.dataset.off !== '1' && RC.chatSpeak && RC.hasClip && res.parts.some(t => RC.hasClip(t));
      if (sound) {
        const m = mindOf(who);
        const bubbles = [];
        RC.chatSpeak(who, res.parts, m.profile, (i, t) => { if (active && active.who === who) bubbles[i] = add('them', t); },
          () => { if (res.end) setTimeout(() => { if (active && active.who === who) close(); }, 1200); });
      } else {
        res.parts.forEach((t, i) => setTimeout(() => { if (active && active.who === who) add('them', t); }, i * 700));
        if (res.end) setTimeout(() => { if (active && active.who === who) close(); }, 2200 + res.parts.length * 700);
      }
    }, delay);
  }
  function project(g, x, y, z) {
    const M = g.renderer && g.renderer.rcViewProjection, cv = g.renderer && (g.renderer.canvas || document.querySelector('canvas'));
    if (!M || !cv) return null;
    const cx = M[0] * x + M[4] * y + M[8] * z + M[12], cy = M[1] * x + M[5] * y + M[9] * z + M[13], cw = M[3] * x + M[7] * y + M[11] * z + M[15];
    if (cw <= .1) return null;
    const r = cv.getBoundingClientRect();
    return { x: r.left + (cx / cw * .5 + .5) * r.width, y: r.top + (1 - (cy / cw * .5 + .5)) * r.height };
  }
  function nearestPerson(g) {
    const a = g.avatar, fx = -Math.sin(g.footCameraYaw || 0), fz = -Math.cos(g.footCameraYaw || 0);
    let best = null, bs = 1e9;
    for (const w of g.pedestrians || []) {
      if (w.injuryState !== 'walking') continue;
      const dx = w.x - a.x, dz = w.z - a.z, d = Math.hypot(dx, dz);
      if (d > 2.8) continue;
      const s = d - .4 * ((dx * fx + dz * fz) / (d || 1));
      if (s < bs) { bs = s; best = w; }
    }
    return best;
  }

  RC.installers.push(function installChat48(Game) {
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      const r = update.call(this, dt);
      try {
        if (!active || !box) return r;
        const w = active.who, a = this.avatar;
        const d = Math.hypot(w.x - a.x, w.z - a.z);
        if (d > 7 || this.inVehicle || this.inside || w.injuryState !== 'walking' || !this.running) { close(); return r; }
        // Stay, face the player.
        w.pause = Math.max(w.pause || 0, .6); w.vx = 0; w.vz = 0; w.navActivity = 'talk';
        w.yaw = Math.atan2(a.x - w.x, a.z - w.z);
        const p = project(this, w.x, (w.y || 0) + 2.15, w.z);
        marker.hidden = !p;
        if (p) { marker.style.left = p.x + 'px'; marker.style.top = p.y + 'px'; }
      } catch (e) { if (!RC.__c48warn) { RC.__c48warn = true; console.warn('[Chat48]', e); } }
      return r;
    };
    globalThis.addEventListener('keydown', e => {
      if (e.code !== 'KeyE' || e.repeat) return;
      const g = game();
      if (!g || !g.running || g.paused || g.inVehicle || g.inside) return;
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const w = nearestPerson(g);
      if (!w) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (active && active.who === w) close(); else open(g, w);
    }, true);
  });
  RC.chat48 = { think: (who, text) => think(game(), who, text), open: w => open(game(), w), close, mindOf, normalize, get active() { return active; } };
})(Heatline);
