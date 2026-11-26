/* SUNSET STATE — Street conversations
 * E opens a Hebrew chat with a nearby resident. Replies use the local sentence bank,
 * with a consistent persona, remembered directions and preferred recorded voice.
 * A missing recording uses built-in Hebrew speech. Off with ?chat48Off.
 */
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('chat48Off') || params.has('realismOff')) return;

  let BANK = null, bankPending;
  function loadBank() {
    if (BANK || bankPending) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    bankPending = fetch('assets/chat48_bank.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(bank => {
        if (!bank?.intents || !bank?.places || !Array.isArray(bank.fem)) throw new Error('Invalid reply bank');
        BANK = bank;
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); bankPending = null; });
  }
  const game = () => globalThis.__SUNSET_PERFORMANCE06_GAME;
  loadBank();

  // ---------- language ----------
  const normalize = s => ' ' + String(s || '').normalize('NFKC').replace(/[֑-ׇ]/g, '').replace(/[״"׳']/g, '').toLowerCase()
    .replace(/[^א-תa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const keywordCache = new Map();
  function keywordScore(norm, key) {
    let token = keywordCache.get(key);
    if (!token) {
      const k = normalize(key).trim(), whole = /\s$/.test(key) || k.length <= 3;
      const root = '\\s(?:[והשבלמכ]{1,2})?' + k;
      token = { exact: new RegExp(root + '(?=\\s)'), prefix: whole ? null : new RegExp(root), weight: 2 + k.split(' ').length * 4 + Math.min(8, k.length) / 8 };
      keywordCache.set(key, token);
    }
    if (token.exact.test(norm)) return token.weight + 1;
    return token.prefix?.test(norm) ? token.weight : 0;
  }
  function strongest(norm, groups) {
    let winner = null, best = 0;
    for (const [id, group] of Object.entries(groups)) {
      const score = Math.max(0, ...group.keys.map(key => keywordScore(norm, key)));
      if (score > best) { winner = id; best = score; }
    }
    return winner;
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
      affinity: (h >>> 7) % 3 - 1, turns: 0, used: new Map(), phraseClock: 0, told: false, playerName: '', last: '', lastPlace: null };
    minds.set(w, m);
    return m;
  }
  const fem = (m, t) => { if (!m.female || !BANK) return t; for (const [a, b] of BANK.fem) t = t.split(a).join(b); return t; };
  function pickFrom(m, list) {
    if (!list?.length) return null;
    const recent = text => m.used.get(text) || 0;
    const oldest = Math.min(...list.map(recent));
    const pool = list.filter(text => recent(text) === oldest);
    const text = pool[Math.floor(Math.random() * pool.length)];
    m.used.set(text, ++m.phraseClock);
    return text;
  }
  function nameLine(m) {
    const list = m.female ? BANK.names_f : BANK.names_m;
    return list[m.h % list.length];
  }
  function placeCoords(g, key) {
    const w = g?.world || {}, site = n => (w.stage38Sites || []).find(s => s.name === n);
    switch (key) {
      case 'beach': return { x: 898, z: -41 };
      case 'bank': return w.stage44Bank;
      case 'estate': return w.office48;
      case 'cars': return w.stage44Depot;
      case 'hospital': return site('HOSPITAL');
      case 'airport': return g?.flight51?.site || site('AIRPORT');
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
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return D.unknown;
    const dx = p.x - who.x, dz = p.z - who.z, d = Math.hypot(dx, dz);
    if (d < 35) return D.here;
    const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz < 0 ? 'n' : 's');
    return D[dir + (d < 260 ? '_near' : '_far')];
  }

  /** Returns the bank lines selected for one turn. */
  function think(g, who, input) {
    if (!BANK) return { parts: [], end: false, mood: 'neutral' };
    const m = mindOf(who), B = BANK, norm = normalize(input);
    const session = active?.who === who ? active : null;
    m.turns++;
    if (session) session.turns++;
    const contextual=H.airport54Services?.reply(g,who,input,m)||H.residentDialogue53?.reply(g,who,input,m);
    if(contextual)return {...contextual,parts:contextual.parts.map(text=>fem(m,text))};
    let best = strongest(norm, B.intents);
    let place = strongest(norm, B.places);
    const recall = /^ (?:אתה זוכר את השם שלי|את זוכרת את השם שלי|מה השם שלי|איך קוראים לי)(?: |$)/.test(norm);
    const introduction = !recall && norm.match(/^ (?:קוראים לי|השם שלי|שמי) ([א-תa-z]{2,24})(?: |$)/);
    const asks = /(?:^| )(איפה|לאן|כיוון|איך מגיע(?:ים|ות)?|איך הולכים|דרך ל)(?: |$)/.test(norm);
    const placeFollow = /^ (?:ו?שם|לשם|איך מגיעים לשם|זה רחוק|זה קרוב|זה ליד|צריך רכב|ברגל|אפשר ברגל|כמה רחוק|כמה קרוב)(?: |$)/.test(norm);
    if (recall) best = 'recall';
    else if (introduction) { best = 'myname'; m.playerName = introduction[1]; }
    else if (placeFollow && m.lastPlace) { best = 'where'; place = m.lastPlace; }
    else if (place && (asks || !best && norm.trim().split(' ').length <= 3)) best = 'where';
    if (best === 'myname' && !introduction) best = null;
    if (best === 'where' && !place && /(?:^| )לשם(?: |$)/.test(norm)) place = m.lastPlace;
    if (best === 'where' && place) m.lastPlace = place;
    if (best === 'compliment') m.affinity = Math.min(6, m.affinity + 2);
    else if (best === 'thanks') m.affinity = Math.min(6, m.affinity + 1);
    else if (best === 'insult') m.affinity -= 3;
    const mood = (m.grumpy && m.affinity < 3) || m.affinity <= -3 ? 'grumpy' : 'friendly';
    const tone = mood === 'grumpy' ? 'annoyed' : 'neutral';
    const parts = [];
    let end = false;
    if (m.affinity <= -6) {
      m.affinity = -4; // A later encounter can recover through a friendlier exchange.
      return { parts: [fem(m, pickFrom(m, B.busy))], end: true, mood: tone };
    }
    const it = best && B.intents[best];
    const repeated = best === m.last;
    if (best === 'where') {
      if (place) {
        if (!placeFollow) parts.push(B.places[place].echo);
        parts.push(directions(g, who, place));
      } else parts.push(pickFrom(m, B.intents.help.friendly));
    } else if (best === 'name') {
      if (mood === 'grumpy' && !m.told && Math.random() < .5) parts.push(pickFrom(m, it.grumpy));
      else { m.told = true; parts.push(nameLine(m)); }
    } else if (best === 'recall') {
      parts.push(m.playerName ? 'קוראים לך ' + m.playerName + '.' : 'איך קוראים לך?');
    } else if (best === 'job') {
      const list = m.female ? it.f : it.m;
      parts.push(list[(m.h >>> 9) % list.length]);
    } else if (it) {
      parts.push(pickFrom(m, it[mood] || it.friendly || B.fallback[mood]));
      end = best === 'bye';
    } else parts.push(pickFrom(m, B.fallback[mood]));

    if (session && !end && mood === 'friendly' && !repeated && ['city', 'howareyou', 'hobby', 'job', 'weather'].includes(best) &&
        session.turns <= 6 && session.turns - session.lastQuestion > 1 && Math.random() < (m.chatty ? .55 : .22) &&
        parts.every(text => !text?.includes('?'))) {
      const followups = best === 'city' ? B.follow.filter(t => /מפה|העיר|מביא/.test(t)) : B.follow.filter(t => /ואתה|איתך|עוד שאלות/.test(t));
      parts.push(pickFrom(m, followups));
      session.lastQuestion = session.turns;
    }
    if (session && !end && session.turns > 12 && (m.shy || Math.random() < .4)) {
      parts.push(pickFrom(m, B.busy));
      end = true;
    }
    m.last = best;
    return { parts: parts.filter(Boolean).map(text => fem(m, text)), end, mood: tone };
  }

  // ---------- UI ----------
  let box, log, input, title, muteBtn, sendBtn, marker, active = null, muted = false;
  try { muted = localStorage.getItem('chat48Mute') === '1'; } catch { }
  const css = `#chat48{position:fixed;right:16px;bottom:16px;width:min(330px,86vw);z-index:61;direction:rtl;background:rgba(9,20,28,.93);border:1px solid #2c6f86;border-radius:14px;color:#eef6f8;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.45);display:flex;flex-direction:column}
#chat48[hidden]{display:none}#chat48 header{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08)}#chat48 header b{flex:1}
#chat48 header button{background:none;border:none;color:#eef6f8;font-size:17px;cursor:pointer;padding:2px 4px}
#chat48 .log{height:min(190px,32vh);overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
#chat48 .m{max-width:85%;padding:6px 10px;border-radius:12px;line-height:1.35;word-wrap:break-word}
#chat48 .me{align-self:flex-start;background:#1f6f8b}#chat48 .them{align-self:flex-end;background:#2b3440}#chat48 .sys{align-self:center;opacity:.6;font-size:12px}
#chat48 form{display:flex;gap:6px;padding:8px}#chat48 input{flex:1;min-width:0;background:#0f2a36;border:1px solid #2c6f86;color:#fff;border-radius:10px;padding:7px 9px;font:inherit}
#chat48 form button{background:#2c8fae;border:none;color:#fff;border-radius:10px;padding:0 12px;cursor:pointer;font:inherit}
#mark48{position:fixed;z-index:58;pointer-events:none;color:#ffd36b;font-size:26px;text-shadow:0 0 8px rgba(0,0,0,.7);transform:translate(-50%,-100%);animation:mark48 1s ease-in-out infinite}
@keyframes mark48{50%{margin-top:-6px}}`;
  function ensureDom() {
    if (box || typeof document === 'undefined') return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'chat48'; box.hidden = true; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'שיחה עם תושב');
    box.innerHTML = '<header><b>💬</b><button type="button" data-c="mute"></button><button type="button" data-c="close" title="סגור" aria-label="סגור שיחה">✕</button></header><div class="log" role="log" aria-live="polite"></div><form><input maxlength="140" placeholder="כתוב הודעה..." aria-label="הודעה לתושב" autocomplete="off"><button type="submit">שלח</button></form>';
    document.body.appendChild(box);
    log = box.querySelector('.log'); input = box.querySelector('input'); title = box.querySelector('header b'); muteBtn = box.querySelector('[data-c=mute]');
    sendBtn = box.querySelector('form button');
    marker = document.createElement('div'); marker.id = 'mark48'; marker.textContent = '▼'; marker.hidden = true; document.body.appendChild(marker);
    for (const ev of ['keydown', 'keyup', 'keypress', 'pointerdown', 'mousedown', 'click', 'wheel']) box.addEventListener(ev, e => {
      e.stopPropagation();
      if (ev === 'keydown' && e.key === 'Escape') { e.preventDefault(); close(); }
    });
    box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); send(); });
    box.querySelector('[data-c=close]').addEventListener('click', () => close());
    muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('chat48Mute', muted ? '1' : '0'); } catch { } if (muted && active) RC.chatStop && RC.chatStop(active.who); paintMute(); });
    paintMute();
  }
  function paintMute() {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.title = muted ? 'הפעל דיבור בשיחה' : 'השתק דיבור בשיחה';
    muteBtn.setAttribute('aria-label', 'השתק דיבור בשיחה');
    muteBtn.setAttribute('aria-pressed', String(muted));
  }
  function add(cls, text) {
    const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function open(g, who) {
    if (!g || !who || document.hidden || !g.running || g.paused || g.over) return;
    if (!BANK) { loadBank(); g.showInfo('תשובות התושבים נטענות. אפשר לנסות שוב בעוד רגע.', 2.5); return; }
    ensureDom();
    if (!box || active?.who === who) return;
    close();
    RC.chatStop?.(who);
    const m = mindOf(who);
    active = { who, game: g, m, busy: false, ending: false, turns: 0, lastQuestion: -2 };
    log.replaceChildren();
    paintTitle(m);
    add('sys', 'כתוב משהו בעברית · Esc לסגירה');
    box.hidden = false;
    sendBtn.disabled = false;
    input.value = '';
    try { document.exitPointerLock?.(); } catch { }
    g.keys?.clear();
    input.focus({ preventScroll: true });
    if (!m.greeted) {
      m.greeted = true;
      reply({ parts: [fem(m, pickFrom(m, BANK.intents.greet[m.grumpy ? 'grumpy' : 'friendly']))], end: false });
    }
  }
  function paintTitle(m) {
    const identity=active&&(H.airport54Services?.name(active.game,active.who)||H.residentDialogue53?.name(active.game,active.who));
    if(identity){title.textContent='💬 '+identity;return;}
    const name = m.told && nameLine(m).match(/^(?:קוראים לי|אני) ([א-ת]+)/)?.[1];
    title.textContent = '💬 ' + (name || 'אדם ברחוב');
  }
  function close() {
    const session = active;
    if (!session) return;
    active = null;
    clearTimeout(session.typing);
    clearTimeout(session.dismiss);
    RC.chatStop?.(session.who);
    const w = session.who;
    if (!(w.panic > 0)) w.pause = Math.min(w.pause || 0, .4);
    if (w.navActivity === 'talk') w.navActivity = 'walk';
    box.hidden = true;
    marker.hidden = true;
    input.blur();
  }
  function send() {
    const session = active, text = input.value.trim();
    if (!session || session.busy || session.ending || !text) return;
    if (!canContinue(session.game, session.who)) { close(); return; }
    input.value = '';
    add('me', text);
    RC.chatStop?.(session.who);
    reply(think(session.game, session.who, text));
  }
  function reply(res) {
    const session = active;
    if (!session) return;
    const { who, game: g } = session;
    const dots = add('them', '…');
    const delay = Math.min(1150, 280 + res.parts.join(' ').length * 11);
    session.busy = true;
    session.ending = res.end;
    sendBtn.disabled = true;
    session.typing = setTimeout(() => {
      if (active !== session) return;
      if (!canContinue(g, who)) { close(); return; }
      dots.remove();
      session.busy = false;
      sendBtn.disabled = res.end;
      paintTitle(session.m);
      res.parts.forEach(text => add('them', text));
      const dismiss = ms => {
        if (active !== session || !res.end) return;
        clearTimeout(session.dismiss);
        session.dismiss = setTimeout(close, ms);
      };
      dismiss(12000);
      const speaking = !muted && RC.chatSpeak?.(who, res.parts, session.m.profile, null, played => dismiss(played ? 2200 : 3800), res.mood);
      if (!speaking) dismiss(3800);
    }, delay);
  }
  function* people(g){
    yield*(g.pedestrians||[]);
    yield*(g.world?.estate53?.actors?.values()||[]);
    yield*(H.islands53?.states?.get(g.world)?.actors||[]);
    yield*(H.airport54Life?.actors(g)||[]);
  }
  function belongs(g,w){
    return g.pedestrians.includes(w)||g.world?.estate53?.actors?.get(w.estateResident)===w||
      !!H.islands53?.states?.get(g.world)?.actors.includes(w)||!!H.airport54Life?.has(g,w);
  }
  function canContinue(g, w) {
    return g.running && !g.paused && !g.over && !g.showFullMap && !g.missionBoardOpen &&
      !g.inVehicle && !g.inside && !g.boat444 && !g.avatar.swim445 && !g.entryTransition && !g.flight51?.pilot &&
      !g.exitTransition && !g.vehicleEntry && !g.roofVisit && !g.garageOpen && g.onBus < 0 && g.onTram < 0 &&
      w.injuryState === 'walking' && !(w.panic > 0) && !w._witness460 && belongs(g,w) &&
      Math.hypot(w.x - g.avatar.x, w.z - g.avatar.z) <= 5 && Math.abs(w.y-g.avatar.y) < 2.4 &&
      H.sameRoadLevel443(g.avatar,w) && H.officerSightClear(g.avatar.x,g.avatar.z,w.x,w.z,g.world.nearby(g.avatar.x,g.avatar.z)) && !document.hidden;
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
    for (const w of people(g)) {
      if (w.injuryState !== 'walking' || w.panic > 0 || w._witness460 || w.storyContact445) continue;
      const dx = w.x - a.x, dz = w.z - a.z, d = Math.hypot(dx, dz);
      if (d > 2.8 || !H.sameRoadLevel443(a, w) ||
          !H.officerSightClear(a.x, a.z, w.x, w.z, g.world.nearby(a.x, a.z))) continue;
      const s = d - .4 * ((dx * fx + dz * fz) / (d || 1));
      if (s < bs) { bs = s; best = w; }
    }
    return best;
  }

  RC.installers.push(function installChat48(Game) {
    const restart = Game.prototype.restart;
    Game.prototype.restart = function () {
      close();
      return restart.apply(this, arguments);
    };
    const togglePause = Game.prototype.togglePause;
    Game.prototype.togglePause = function () {
      const r = togglePause.apply(this, arguments);
      if (this.paused) close();
      return r;
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      const r = update.call(this, dt);
      try {
        if (!active || !box) return r;
        const w = active.who, a = this.avatar;
        if (active.game !== this || !canContinue(this, w)) { close(); return r; }
        // Stay, face the player.
        w.pause = Math.max(w.pause || 0, .6); w.vx = 0; w.vz = 0; w.navActivity = 'talk';
        const yaw = Math.atan2(w.x - a.x, w.z - a.z);
        w.yaw += H.angleDiff(w.yaw, yaw) * (1 - Math.exp(-dt * 10));
        const p = project(this, w.x, (w.y || 0) + 2.15, w.z);
        marker.hidden = !p;
        if (p) { marker.style.left = p.x + 'px'; marker.style.top = p.y + 'px'; }
      } catch (e) { if (!RC.__c48warn) { RC.__c48warn = true; console.warn('[Chat48]', e); } }
      return r;
    };
    const talk = e => {
      const g = game();
      if (!g || !g.running || g.paused || g.over || g.inVehicle || g.inside || g.missionBoardOpen || g.showFullMap ||
          g.boat444 || g.avatar.swim445 || g.roofVisit || g.entryTransition || g.vehicleEntry ||
          g.onBus >= 0 || g.onTram >= 0 || g.story445?.near() || g.flight51?.ownsInteraction() || H.transport53?.ownsInteraction(g) || H.stadium53?.ownsInteraction(g) || H.estate53World?.ownsInteraction(g) || H.airport54Services?.ownsInteraction(g)) return;
      if (e.type === 'keydown' && (document.activeElement?.matches?.('input, textarea, select, [contenteditable]') ||
          box?.contains(e.target))) return;
      const w = nearestPerson(g);
      if (!w) return;
      const door = g.nearestEntrance(), shop = g.preferredRetailDoor(door), car = g.nearestCar();
      if (shop || door && Math.hypot(door.x - g.avatar.x, door.z - g.avatar.z) < 2.2 ||
          car?.distance < 2.9) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (active?.who === w) close(); else open(g, w);
    };
    globalThis.addEventListener('keydown', e => {
      if (e.code === 'KeyE' && !e.repeat) talk(e);
    }, true);
    document.addEventListener('pointerdown', e => {
      if (e.target.closest?.('[data-press="KeyE"]')) talk(e);
    }, true);
  });
  RC.chat48 = { think: (who, text) => think(game(), who, text), open: w => open(game(), w), close, mindOf, normalize, nearestPerson, canContinue, get active() { return active; } };
})(Heatline);
