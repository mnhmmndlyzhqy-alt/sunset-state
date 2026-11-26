/* SUNSET STATE 54 — walk-up airport services, live departures and local conversations. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled || new URLSearchParams(location.search).has('airport54Off')) return;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const phaseNames = { 'check-in': 'צ׳ק-אין פתוח', boarding: 'עלייה למטוס', 'last-call': 'קריאה אחרונה', departed: 'יצאה' };
  const roles = { passenger: 'נוסע', 'check-in': 'צ׳ק-אין', screening: 'בידוק', security: 'בידוק',
    gate: 'צוות שער', cafe: 'בית הקפה', cleaner: 'תחזוקה', baggage: 'כבודה', claim: 'כבודה', info: 'מידע', information: 'מידע', staff: 'הטרמינל' };
  let panel, prompt, current = null, refreshAt = -1, previousFocus;
  const controls = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyE','KeyB','KeyF','KeyR','KeyI','KeyG','KeyM','KeyN','KeyK','Escape']);
  const gateName = gate => gate.label || 'שער ' + gate.id;

  function onFoot(g) {
    return !!(g?.running && !g.paused && !g.over && !document.hidden && !g.showFullMap && !g.missionBoardOpen &&
      !g.garageOpen && !g.inVehicle && !g.inside && !g.boat444 && !g.roofVisit && !g.flight51?.pilot &&
      !g.transport53?.trip && !g.avatar.swim445 && !g.entryTransition && !g.exitTransition && !g.vehicleEntry &&
      g.onBus < 0 && g.onTram < 0);
  }
  function spots(g) {
    const a = g.world?.airport54;
    if (!a) return [];
    const p = a.positions || {}, out = [];
    const add = (id, name, point, kind = 'info', radius = 3.1) => {
      if (point && Number.isFinite(point.x) && Number.isFinite(point.z)) out.push({ id, name, point, kind, radius });
    };
    add('entry', 'מידע וטיסות', a.entry?.inside, 'info', 3.3);
    add('information', 'דלפק מידע', p.infoDesk);
    for (const q of a.queues || []) if (q.zone === 'checkIn') add(q.id, 'דלפק צ׳ק-אין', q.service, 'check-in', 2.3);
    add('security', 'בידוק ביטחוני', p.security, 'security', 2.4);
    add('baggage', 'איסוף כבודה', p.baggage, 'baggage');
    add('cafe', 'בית הקפה בטרמינל', p.cafe, 'cafe');
    for (const gate of a.gates || []) add('gate-' + gate.id, gateName(gate), gate.desk || gate.point, 'gate', 3.3);
    return out;
  }
  function near(g) {
    if (!onFoot(g)) return null;
    const a = g.avatar, local = g.world?.airport54;
    if (!local || distance(a, local.entry.inside) > local.width + 35) return null;
    let best = null, d = Infinity;
    for (const s of spots(g)) {
      const gap = distance(a, s.point);
      if (gap > s.radius || gap >= d || Math.abs(a.y - (s.point.y ?? local.floorY)) > 2.1) continue;
      if (!H.officerSightClear(a.x, a.z, s.point.x, s.point.z, g.world.nearby(a.x, a.z))) continue;
      best = s; d = gap;
    }
    return best;
  }
  function flights(g) {
    return (H.airport54Life?.flights(g) || []).filter(f => f && f.code && f.destination && f.gate &&
      phaseNames[f.phase] && Number.isFinite(f.secondsToDeparture)).map(f => ({ ...f,
      secondsToDeparture: Math.max(0, f.secondsToDeparture), phaseLabel: phaseNames[f.phase] }));
  }
  function timeLeft(f) {
    if (f.phase === 'departed') return 'יצאה';
    if (f.secondsToDeparture < 1) return 'כעת';
    const seconds = Math.ceil(f.secondsToDeparture);
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  function destinations(g) {
    const a = g.world.airport54, p = a?.positions || {};
    if (!a) return [];
    const out = [{ id: 'entrance', name: 'כניסה לטרמינל', point: a.entry.outside },
      { id: 'check-in', name: 'צ׳ק-אין', point: (a.queues || []).find(q => q.zone === 'checkIn')?.entry },
      { id: 'security', name: 'בידוק ביטחוני', point: p.security },
      { id: 'cafe', name: 'בית הקפה', point: p.cafe },
      { id: 'baggage', name: 'איסוף כבודה', point: p.baggage }];
    for (const gate of a.gates || []) out.push({ id: 'gate-' + gate.id, name: gateName(gate), point: gate.point || gate.desk });
    const pad = g.world.airportPad53;
    if (pad) out.push({ id: 'helicopter', name: 'מנחת · טיסות לאיים', point: { x: pad.entryX, z: pad.entryZ, y: pad.y } });
    return out.filter(d => d.point && Number.isFinite(d.point.x) && Number.isFinite(d.point.z));
  }
  function guide(g, id) {
    const d = destinations(g).find(q => q.id === id);
    if (!d || !g.nav445) return false;
    const ok = g.nav445.select({ ...d.point, id: 'airport54:' + id, name: d.name, icon: id.startsWith('gate') ? '✈' : 'i', story: true });
    if (ok) { close(); g.showInfo('סומן במפה: ' + d.name, 3); }
    return ok;
  }

  const element = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function ensure() {
    if (panel) return;
    const css = element('style');
    css.textContent = `
      #airport-services54{position:fixed;inset:10% max(18px,env(safe-area-inset-right)) auto auto;width:min(620px,calc(100vw - 36px));max-height:82vh;overflow:auto;box-sizing:border-box;z-index:95;direction:rtl;background:#0e252ff5;color:#f3f1e8;border:1px solid #6b9d9d;border-radius:16px;box-shadow:0 20px 65px #03121bbf;padding:22px;font:15px/1.55 Arial,sans-serif;backdrop-filter:blur(12px)}
      #airport-services54[hidden],#airport-prompt54[hidden]{display:none}
      #airport-services54 header{display:flex;justify-content:space-between;align-items:start;gap:16px}
      #airport-services54 h2{font-size:23px;line-height:1.2;margin:4px 0 13px}
      #airport-services54 h3{font-size:16px;margin:18px 0 7px}
      #airport-services54 p{margin:8px 0;color:#c9d9d9}
      #airport-services54 .airport-kicker54{font-size:11px;letter-spacing:.16em;color:#8fdbce;direction:ltr;text-align:right}
      #airport-services54 button{font:inherit;border:1px solid #497278;background:#1e404b;color:#f5f3e9;cursor:pointer;border-radius:8px;padding:8px 12px;min-height:40px}
      #airport-services54 button:hover,#airport-services54 button:focus-visible{background:#345e68;outline:2px solid #b7e6cd;outline-offset:2px}
      #airport-services54 .airport-table54{overflow-x:auto;border:1px solid #36555d;border-radius:9px;margin-top:12px}
      #airport-services54 table{width:100%;border-collapse:collapse;text-align:right;white-space:nowrap;font-size:13px}
      #airport-services54 th{font-weight:400;color:#9dbabf;background:#132e39}
      #airport-services54 th,#airport-services54 td{padding:10px 9px;border-bottom:1px solid #36555d}
      #airport-services54 td[data-phase="boarding"],#airport-services54 td[data-phase="last-call"]{color:#ffce87}
      #airport-services54 tr:last-child td{border:0}
      #airport-services54 .airport-waypoints54{display:flex;gap:7px;flex-wrap:wrap}
      #airport-services54 .airport-note54{padding:10px 13px;background:#143540;border-right:3px solid #83cdbb;border-radius:5px;font-size:13px}
      #airport-prompt54{position:fixed;left:50%;bottom:17%;transform:translateX(-50%);z-index:26;direction:rtl;border:1px solid #86bdba;border-radius:9px;background:#102a35eb;color:#f9f3df;box-shadow:0 5px 22px #07151a80;padding:9px 15px;font:14px/1.3 Arial,sans-serif;cursor:pointer}
      @media(max-width:650px){#airport-services54{inset:7% 12px auto;width:calc(100vw - 24px);padding:15px;max-height:85vh}#airport-services54 th,#airport-services54 td{padding:8px 6px}#airport-prompt54{bottom:23%;max-width:80vw;white-space:normal}}
    `;
    document.head.appendChild(css);
    panel = element('section'); panel.id = 'airport-services54'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'airport-title54');
    prompt = element('button'); prompt.id = 'airport-prompt54'; prompt.type = 'button'; prompt.hidden = true;
    prompt.addEventListener('click', () => { const g = globalThis.__SUNSET_PERFORMANCE06_GAME; const spot = g && near(g); if (spot) open(g, spot); });
    document.body.append(panel, prompt);
  }
  function close() {
    if (!current) return false;
    const game = current.game;
    game.keys.clear(); current = null;
    if (panel) panel.hidden = true;
    if (prompt) prompt.hidden = !near(game);
    if (previousFocus && typeof previousFocus.focus === 'function' && !panel?.contains(previousFocus)) previousFocus.focus();
    previousFocus = null;
    return true;
  }
  function render(g, focus = false) {
    const spot = current?.spot;
    if (!spot) return;
    panel.replaceChildren();
    const header = element('header'), heading = element('div'), title = element('h2', spot.name);
    title.id = 'airport-title54';
    heading.append(element('div', 'SUNSET INTERNATIONAL', 'airport-kicker54'), title);
    const dismiss = element('button', 'סגור · Esc'); dismiss.type = 'button'; dismiss.addEventListener('click', close);
    header.append(heading, dismiss); panel.append(header);
    const notes = {
      info: 'ברוכים הבאים. צ׳ק-אין במרכז האולם, בידוק לפני השערים, בית קפה ואזורי המתנה בהמשך.',
      'check-in': 'כאן מוסרים כבודה לפני הבידוק. אפשר לראות את מצב הטיסות ולסמן את השער הרצוי במפה.',
      security: 'המעברים המסומנים בירוק מובילים לאולם השערים. השאר את המעבר פנוי לנוסעים.',
      baggage: 'איסוף הכבודה נמצא באולם הנכנסים. היציאה לעיר דרך החזית הצפונית של הטרמינל.',
      cafe: 'פינת ישיבה וקפה ליד אולם ההמתנה. מצב הטיסות מתעדכן בלוח שלמטה.',
      gate: 'בדוק את מספר הטיסה ואת מצב העלייה. מהשערים אפשר לצאת לרחבת המטוסים.'
    };
    panel.append(element('p', notes[spot.kind] || notes.info));
    const box = element('div', '', 'airport-table54'), table = element('table');
    table.setAttribute('aria-label', 'לוח טיסות יוצאות');
    const head = element('thead'), hr = element('tr');
    for (const label of ['טיסה', 'יעד', 'שער', 'מצב', 'יציאה בעוד']) hr.append(element('th', label));
    head.append(hr); table.append(head);
    const body = element('tbody');
    for (const f of flights(g)) {
      const row = element('tr');
      for (const value of [f.code, f.destination, f.gate, f.phaseLabel, timeLeft(f)]) row.append(element('td', value));
      row.children[3].setAttribute('data-phase', f.phase);
      body.append(row);
    }
    if (!body.children.length) { const row = element('tr'), cell = element('td', 'לוח הטיסות מתעדכן'); cell.setAttribute('colspan', '5'); row.append(cell); body.append(row); }
    table.append(body); box.append(table); panel.append(box);
    panel.append(element('h3', 'לאן ממשיכים?'));
    const ways = element('div', '', 'airport-waypoints54');
    for (const d of destinations(g)) {
      const button = element('button', d.name); button.type = 'button'; button.dataset.airportDestination = d.id;
      button.addEventListener('click', () => guide(g, d.id)); ways.append(button);
    }
    panel.append(ways, element('h3', 'לטוס בעצמך או להגיע לאיים'),
      element('p', 'לטיסה עצמאית, צא לרחבה והתקרב לדלת של מטוס פנוי. E לכניסה; W למצערת, ↑ להרמת האף ו־L להכוונת נחיתה. לטיסה כנוסע לאיים, גש למנחת ובחר יעד עם B.', 'airport-note54'));
    if (focus) dismiss.focus();
  }
  function open(g, spot = near(g)) {
    if (!spot || !onFoot(g)) return false;
    ensure(); RC.chat48?.close(); previousFocus = document.activeElement;
    current = { game: g, world: g.world, spot }; g.keys.clear();
    panel.hidden = false; prompt.hidden = true; refreshAt = g.seconds + 1;
    render(g, true); return true;
  }
  function tick(g) {
    if (current) {
      if (current.game !== g || current.world !== g.world || !onFoot(g) || distance(g.avatar, current.spot.point) > 6.2) { close(); return; }
      g.keys.clear();
      if (g.seconds >= refreshAt) {
        // Refresh only the live rows; retain keyboard focus and button identity.
        const rows = panel.querySelector('tbody');
        const data = flights(g);
        if (rows && rows.children.length === data.length) data.forEach((f, i) => {
          const cells = rows.children[i].children;
          [f.code, f.destination, f.gate, f.phaseLabel, timeLeft(f)].forEach((text, j) => { cells[j].textContent = text; });
          cells[3].setAttribute('data-phase', f.phase);
        });
        refreshAt = g.seconds + 1;
      }
      return;
    }
    const spot = near(g);
    if (!spot) { if (prompt) prompt.hidden = true; return; }
    ensure(); prompt.hidden = !!RC.chat48?.active;
    prompt.textContent = 'E · ' + spot.name + ' · לוח טיסות והכוונה';
  }
  function name(g, who) {
    return H.airport54Life?.has(g, who) ? (who.airport54Name || H.airport54Life.stateOf(who)?.name || null) : null;
  }
  function reply(g, who, input, memory) {
    if (!g || !who || !H.airport54Life?.has(g, who)) return null;
    const state = H.airport54Life.stateOf(who) || {}, text = RC.chat48?.normalize(input) || String(input);
    const respond = value => ({ parts: [value], mood: 'neutral', end: false });
    const flight = state.flight?.code ? state.flight : flights(g).find(f => f.code === (state.flightCode || state.flight));
    const role = state.role || who.airport54Role, activity = state.activity || '';
    if (/(?:איך קוראים לך|מה השם שלך|מה שמך|מי אתה|מי את)(?: |$)/.test(text)) {
      memory.told = true; return respond('קוראים לי ' + name(g, who) + '.');
    }
    if (/(?:טיסה|טס|טסה|שער|ממריא|ממריאה)/.test(text) && /(?:לאן|איזה|מתי|איפה|מה|כמה)/.test(text)) {
      if (flight) return respond('הטיסה שלי היא ' + flight.code + ' אל ' + flight.destination + ', משער ' + flight.gate + '. ' +
        (flight.phase === 'departed' ? 'העלייה כבר הסתיימה.' : flight.phase === 'check-in' ? 'הצ׳ק-אין פתוח עכשיו.' : 'הנוסעים כבר עולים למטוס.'));
      return respond('הטיסות והשערים מופיעים בלוח שבדלפק המידע. אפשר ללחוץ E ליד הדלפק ולסמן שער במפה.');
    }
    if (/(?:איפה|איך מגיע|איך הולכ|לאן|כיוון)/.test(text) && /(?:כבודה|מזווד|תיק)/.test(text))
      return respond('מסירת כבודה בדלפקי הצ׳ק-אין שבמרכז האולם. איסוף כבודה בצד הנכנסים, לפי השילוט.');
    if (/(?:איפה|איך מגיע|איך הולכ|לאן)/.test(text) && /(?:קפה|אוכל|לשתות|לאכול)/.test(text))
      return respond('בית הקפה בקצה המזרחי של הטרמינל. ליד דלפק המידע אפשר לסמן אותו במפה.');
    if (/(?:איך|איפה|אפשר)/.test(text) && /(?:להטיס|לטוס בעצמי|לנהוג במטוס)/.test(text))
      return respond('מהשערים יוצאים לרחבה. ליד דלת של מטוס פנוי לחץ E כדי להיכנס. אחרי הכניסה מופיע לוח שליטה עם מצערת, הגאים והכוונת נחיתה.');
    if (/(?:איפה|איך|לאן)/.test(text) && /(?:אי שלי|לאי שלי|אי פרטי|לאיים|מסוק)/.test(text))
      return respond('מנחת המסוקים נמצא מחוץ לטרמינל. בדלפק המידע אפשר לסמן אותו במפה; ליד המנחת לחץ B ובחר את האי שלך או אי ציבורי.');
    if (/(?:מה אתה עושה|מה את עושה|לאן אתה הולך|לאן את הולכת|למה עצרת|למה אתה מחכה|למה את מחכה|עובד כאן|עובדת כאן)/.test(text)) {
      if (role !== 'passenger') return respond('אני בצוות ' + (roles[role] || 'שדה התעופה') + '. אנחנו עוזרים לנוסעים להמשיך לטיסה שלהם.');
      const line = /board|gate/.test(activity) ? 'אני בדרך לשער העלייה למטוס.' : /check|queue/.test(activity) ? 'אני ממתין בתור כדי לסיים את הסידורים לטיסה.' :
        /secur|screen/.test(activity) ? 'אני עובר דרך הבידוק, ואז ממשיך לשער.' : /cafe|coffee/.test(activity) ? 'עצרתי לקפה לפני הטיסה.' :
          /seat|sit|wait|rest|lounge/.test(activity) ? 'אני נח כאן ומחכה לקריאה לשער.' : activity === 'claim' ? 'אני מחכה לכבודה שלי באולם הנכנסים.' :
            activity === 'leaving' ? 'סיימתי כאן ואני בדרך ליציאה.' : 'אני בדרך לטיסה שלי.';
      return respond(line + (flight ? ' זו טיסה ' + flight.code + ' אל ' + flight.destination + '.' : ''));
    }
    return null;
  }

  const N = H.Navigator445?.prototype;
  if (N) {
    const places = N.buildPlaces;
    N.buildPlaces = function () {
      const out = places.call(this);
      if (this.world.airport54) for (const d of destinations(this.game)) {
        const entry = { ...d.point, id: 'airport54:' + d.id, name: d.name,
          icon: d.id.startsWith('gate-') ? '✈' : 'i', level: 0, detail: d.id !== 'entrance' };
        const legacy = d.id === 'entrance' && out.find(p => p.id === 'airport');
        if (legacy) Object.assign(legacy, entry, { name: 'שדה תעופה · כניסה לטרמינל', icon: '✈' });
        else out.push(entry);
      }
      return out;
    };
    const update = N.update;
    N.update = function (...args) {
      const a = this.world.airport54, target = this.target, g = this.game;
      if (!a || !target?.id?.startsWith('airport54:') || !onFoot(g) || distance(g.avatar, a.entry.inside) > 255) return update.apply(this, args);
      const gap = distance(g.avatar, target), inside = a.contains(g.avatar.x, g.avatar.z), goalInside = a.contains(target.x, target.z);
      const entrance = a.entry.threshold;
      const previous = this.airportRoute54;
      if (!previous || previous.world !== this.world || previous.target !== target ||
          g.seconds - previous.at > .65 && distance(g.avatar, previous.origin) > .9) {
        const points = a.path?.(g.avatar, target) || [];
        this.airportRoute54 = { world: this.world, target, origin: { x: g.avatar.x, z: g.avatar.z }, at: g.seconds, points };
      }
      const points = this.airportRoute54.points;
      this.route = points.length > 1 ? { points, access: 0, finalWalk: 0 } : null;
      const remaining = this.route ? points.slice(1).reduce((total, p, i) => total + distance(i ? points[i] : g.avatar, p), 0) : gap;
      const cue = gap < 3.4 ? 'הגעת ליעד' : !inside && goalInside ? 'היכנס דרך כניסת הטרמינל המסומנת' :
        inside && !goalInside ? 'המשך ליציאה שבחזית הטרמינל' : 'המשך לפי שילוט הטרמינל אל ' + target.name;
      this.guide.hidden = false; this.icon.textContent = gap < 3.4 ? '✓' : '↗'; this.cue.textContent = cue;
      this.distance.textContent = target.name + ' · ' + Math.round(!inside && goalInside && !this.route ? distance(g.avatar, entrance) : remaining) + ' מ׳';
      this.info.textContent = this.distance.textContent;
    };
  }

  H.airport54Services = { near, spots, flights, destinations, guide, open, close, tick, name, reply,
    ownsInteraction: g => current?.game === g || !!near(g), get active() { return current; } };
  RC.installers.push(({ prototype: P }) => {
    const restart = P.restart;
    P.restart = function (...args) { close(); if (prompt) prompt.hidden = true; return restart.apply(this, args); };
    const update = P.update;
    P.update = function (dt) { const result = update.call(this, dt); tick(this); return result; };
    const is = P.is;
    P.is = function (...args) { return current?.game === this ? false : is.apply(this, args); };
    const keyDown = P.keyDown;
    P.keyDown = function (event) {
      if (current?.game === this) {
        if (event.code === 'Escape' || event.code === 'KeyE') close();
        if (controls.has(event.code)) event.preventDefault();
        return;
      }
      if (event.code === 'KeyE' && !event.repeat && near(this)) { event.preventDefault(); open(this); return; }
      return keyDown.call(this, event);
    };
    const toggle = P.toggleVehicle;
    P.toggleVehicle = function (...args) {
      if (current?.game === this) { close(); return; }
      if (near(this)) { open(this); return; }
      return toggle.apply(this, args);
    };
    const pause = P.togglePause;
    P.togglePause = function (...args) { close(); return pause.apply(this, args); };
    globalThis.addEventListener('keydown', event => {
      const g = globalThis.__SUNSET_PERFORMANCE06_GAME;
      if (!g) return;
      if (current?.game === g) {
        if (event.code === 'Tab') {
          const buttons = [...panel.querySelectorAll('button')];
          if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
          else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
        }
        // Preserve native button activation and focus traversal while stopping
        // every gameplay listener from acting behind this dialog.
        if ((event.code === 'Space' || event.code === 'Enter') && panel.contains(event.target) && event.target?.closest?.('button')) {
          event.stopImmediatePropagation(); return;
        }
        if (controls.has(event.code) || /^Key[A-Z]$/.test(event.code)) {
          event.preventDefault(); event.stopImmediatePropagation();
          if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyE')) close();
        }
        else event.stopImmediatePropagation();
        return;
      }
      if (event.code !== 'KeyE' || event.repeat || document.activeElement?.matches?.('input, textarea, select, [contenteditable]')) return;
      const spot = near(g);
      if (spot) { event.preventDefault(); event.stopImmediatePropagation(); open(g, spot); }
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  });
})(Heatline);
