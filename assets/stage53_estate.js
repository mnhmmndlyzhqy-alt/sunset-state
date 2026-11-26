/* SUNSET STATE — owned island development, rental agreements and upkeep. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled || new URLSearchParams(location.search).has('estate53Off')) return;
  const CYCLE = 120, CHECKPOINT_INTERVAL = 24, MIN_RENT = 12, MAX_RENT = 260;
  const upgrades = {
    housing: { label: 'דירות להשכרה', detail: 'שתי דירות נוספות בכל שלב', costs: [260, 460, 680], upkeep: 8 },
    furniture: { label: 'ריהוט', detail: 'ריהוט, מטבח ואיכות מגורים גבוהה יותר', costs: [105, 240], upkeep: 3 },
    water: { label: 'מים', detail: 'אספקת מים ושירות לדירות', costs: [80, 180], upkeep: 4 },
    power: { label: 'חשמל', detail: 'חשמל ותאורה, גם בשעות הערב', costs: [105, 230], upkeep: 5 },
    garden: { label: 'גינה וגידולים', detail: 'ערוגות וגינה משותפת לדיירים', costs: [95, 190], upkeep: 2 },
    cafe: { label: 'בית קפה', detail: 'מקום מפגש ושירות לתושבים', costs: [310], upkeep: 6 },
    harbor: { label: 'מרינה', detail: 'מקומות אחסון נוספים לסירות', costs: [240, 530], upkeep: 4 },
    garage: { label: 'מוסך', detail: 'מקומות חניה נוספים לרכבים', costs: [170, 390], upkeep: 3 },
    hangar: { label: 'האנגר', detail: 'מקומות אחסון נוספים למטוסים', costs: [315, 585], upkeep: 5 },
    security: { label: 'אבטחת האי', detail: 'מגינה על מצב התשתיות כשנוצר חוב תחזוקה', costs: [150, 285], upkeep: 3 }
  };
  const profiles = [
    { id: 'maya', name: 'מאיה ברק', appearance: 530117, budget: 65, min: 23, needs: [], likes: ['water', 'garden'], prefer: 'garden' },
    { id: 'noam', name: 'נועם שחר', appearance: 534313, budget: 74, min: 28, needs: [], likes: ['power', 'harbor'], prefer: 'view' },
    { id: 'lior', name: 'ליאור שלו', appearance: 536728, budget: 93, min: 40, needs: ['water'], likes: ['garden', 'furniture'], prefer: 'garden' },
    { id: 'rina', name: 'רינה מזרחי', appearance: 538640, budget: 98, min: 44, needs: ['furniture'], likes: ['power', 'cafe'], prefer: 'quiet' },
    { id: 'omer', name: 'עומר רם', appearance: 539112, budget: 113, min: 50, needs: ['power'], likes: ['garage', 'security'], prefer: 'view' },
    { id: 'yael', name: 'יעל נווה', appearance: 536342, budget: 128, min: 56, needs: ['water', 'garden'], likes: ['furniture', 'security'], prefer: 'garden' },
    { id: 'dalia', name: 'דליה חן', appearance: 530504, budget: 155, min: 66, needs: ['water', 'power', 'furniture'], likes: ['cafe', 'harbor'], prefer: 'quiet' },
    { id: 'amir', name: 'אמיר הראל', appearance: 531331, budget: 188, min: 72, needs: ['water', 'power', 'security'], likes: ['hangar', 'cafe'], prefer: 'view' },
    { id: 'sara', name: 'שרה בן־אור', appearance: 534790, budget: 215, min: 79, needs: ['water', 'power', 'garden', 'furniture'], likes: ['cafe', 'security'], prefer: 'garden' }
  ];
  const layouts = [
    ['a1', 'א׳ 1 · מרפסת גינה', 'garden', 0], ['a2', 'א׳ 2 · נוף לנמל', 'view', 3],
    ['b1', 'ב׳ 1 · פינת הגינה', 'garden', 7], ['b2', 'ב׳ 2 · אגף שקט', 'quiet', 9],
    ['c1', 'ג׳ 1 · נוף למפרץ', 'view', 13], ['c2', 'ג׳ 2 · חצר שקטה', 'quiet', 15]
  ];
  const amenityNames = { garden: 'גינה', quiet: 'אזור שקט', view: 'נוף למים' };
  const femaleResidents = new Set(['maya','rina','yael','dalia','sara']);
  for(const p of profiles){
    p.female=femaleResidents.has(p.id);
    p.appearance=(p.appearance&~(3<<9))|(p.female?1<<9:0);
  }
  const byId = new Map(profiles.map(p => [p.id, p])), unitIds = new Map(layouts.map(([id], i) => [id, i]));
  const finite = (x, low, high, fallback = low) => Number.isFinite(x) ? Math.min(high, Math.max(low, x)) : fallback;
  const int = (x, low, high, fallback) => Math.round(finite(x, low, high, fallback));
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const formatted = n => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n);
  const blank = () => ({
    schema: 53, owned: true, upgrades: Object.fromEntries(Object.keys(upgrades).map(id => [id, 0])),
    leases: [], negotiations: [], condition: 100, debt: 0, upkeepElapsed: 0,
    rentTotal: 0, upkeepTotal: 0, investmentTotal: 0
  });
  let state = blank();
  let ui, tab = 'build', currentGame, message = '', periodic = 0;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function snapshot() { return clone(state); }
  function restore(data) {
    const next = blank();
    if (plain(data) && data.schema === 53) {
      for (const [key, upgrade] of Object.entries(upgrades))
        next.upgrades[key] = int(data.upgrades?.[key], 0, upgrade.costs.length);
      next.condition = int(data.condition, 0, 100, 100);
      next.debt = int(data.debt, 0, 100000);
      next.upkeepElapsed = finite(data.upkeepElapsed, 0, CYCLE - .000001);
      for (const key of ['rentTotal', 'upkeepTotal', 'investmentTotal'])
        next[key] = int(data[key], 0, 100000000);
      const housed = new Set(), involved = new Set(), reserved = new Set();
      const validOffer = x => plain(x) && byId.has(x.applicant) && unitIds.has(x.unit) &&
        unitIds.get(x.unit) < next.upgrades.housing * 2 && Number.isInteger(x.rent) && x.rent >= MIN_RENT && x.rent <= MAX_RENT;
      for (const x of (Array.isArray(data.leases) ? data.leases : []).slice(0, layouts.length * 2)) {
        if (!validOffer(x) || involved.has(x.applicant) || housed.has(x.unit) || x.rent > byId.get(x.applicant).budget) continue;
        next.leases.push({ applicant: x.applicant, unit: x.unit, rent: x.rent, accrued: finite(x.accrued, 0, CYCLE - .000001) });
        housed.add(x.unit);
        involved.add(x.applicant);
      }
      for (const x of (Array.isArray(data.negotiations) ? data.negotiations : []).slice(0, profiles.length * 2)) {
        if (!validOffer(x) || involved.has(x.applicant) || !['accepted', 'counter', 'declined'].includes(x.status)) continue;
        const applicant = byId.get(x.applicant);
        if (x.status !== 'declined' && (housed.has(x.unit) || reserved.has(x.unit) || x.rent > applicant.budget)) continue;
        involved.add(x.applicant);
        if (x.status !== 'declined') reserved.add(x.unit);
        const reason = x.status === 'declined'
          ? (['quality', 'budget', 'services'].includes(x.reason) ? x.reason : 'budget')
          : x.status;
        const proposal = { applicant: x.applicant, unit: x.unit, rent: x.rent, status: x.status, reason };
        if (reason === 'services' && Array.isArray(x.missingServices)) {
          const missing = applicant.needs.filter(key => x.missingServices.includes(key));
          if (missing.length) proposal.missingServices = missing;
        }
        next.negotiations.push(proposal);
      }
    }
    const changed = Object.keys(upgrades).some(key => state.upgrades[key] !== next.upgrades[key]);
    state = next;
    periodic = 0;
    if (ui) closePanel();
    return changed;
  }

  function units() {
    const l = state.upgrades, service = l.water * 6 + l.power * 6 + l.garden * 5 + l.cafe * 5 + l.security * 3;
    return layouts.slice(0, l.housing * 2).map(([id, name, amenity, rank]) => {
      const quality = int(31 + rank + service + l.furniture * 9 - (100 - state.condition) * .37, 1, 100);
      return { id, name, amenity, quality, furnished: l.furniture,
        occupiedBy: state.leases.find(x => x.unit === id)?.applicant || null,
        reservedBy: state.negotiations.find(x => x.unit === id && x.status !== 'declined')?.applicant || null };
    });
  }
  function residents() {
    return state.leases.map(({ applicant, unit, rent }) => {
      const p = byId.get(applicant);
      return { id: applicant, name: p.name, appearance: p.appearance, unit, rent };
    });
  }
  function upgradeLevel(key) { return state.upgrades[key] || 0; }
  function capacity(kind) {
    const key = { car: 'garage', plane: 'hangar', boat: 'harbor' }[kind];
    return key ? 1 + 2 * state.upgrades[key] : 0;
  }
  function recurringCost() {
    return Object.entries(upgrades).reduce((sum, [key, upgrade]) => sum + state.upgrades[key] * upgrade.upkeep, 0);
  }
  function finances() {
    const gross = state.leases.reduce((sum, lease) => sum + lease.rent, 0), upkeep = recurringCost();
    return { gross, upkeep, net: gross - upkeep, debt: state.debt, condition: state.condition, nextUpkeep: CYCLE - state.upkeepElapsed,
      rentTotal: state.rentTotal, upkeepTotal: state.upkeepTotal, investmentTotal: state.investmentTotal };
  }

  function onOffice(g) {
    if (!g?.running || !g.avatar || g.paused || g.over || g.showFullMap || g.missionBoardOpen || g.garageOpen ||
        g.inside || g.inVehicle || g.onTram >= 0 || g.onBus >= 0 || g.boat444 || g.roofVisit ||
        g.flight51?.pilot || g.flight53?.pilot || g.avatar.swim445 || g.entryTransition || g.exitTransition || g.vehicleEntry) return false;
    const { x, z } = g.world.estate53?.office ?? { x: 1750, z: 480 };
    const dx = g.avatar.x - x, dz = g.avatar.z - z;
    if (!(dx * dx + dz * dz <= 49)) return false;
    const ground = H.walkerGround473(g.avatar);
    return Math.abs(g.avatar.y - ground) < 2;
  }
  const ok = (message, extra) => ({ ok: true, message, ...extra });
  const fail = message => ({ ok: false, message });
  function paid(g, amount) {
    if (!Number.isFinite(g.profile?.credits) || g.profile.credits < amount) return false;
    g.profile.credits -= amount;
    return true;
  }
  function checkpoint(g) {
    const result = g.stage19SaveSystem?.saveAuto?.();
    periodic = result?.deferred ? CHECKPOINT_INTERVAL : 0;
    return result;
  }
  function commit(g, affectWorld = false) {
    if (affectWorld) H.estate53World?.sync?.(g);
    g.saveProfile?.();
    g.updateHUD?.();
    checkpoint(g);
  }
  function purchase(g, key) {
    if (!onOffice(g)) return fail('אפשר לרכוש שדרוגים רק ליד משרד האי');
    const design = Object.hasOwn(upgrades, key) && upgrades[key];
    if (!design) return fail('השדרוג אינו זמין');
    const level = state.upgrades[key], amount = design.costs[level];
    if (amount === undefined) return fail('השדרוג כבר הושלם');
    if (key === 'furniture' && state.upgrades.housing === 0) return fail('בנה דירות לפני רכישת ריהוט');
    if (key === 'cafe' && (!state.upgrades.water || !state.upgrades.power)) return fail('בית הקפה זקוק למים ולחשמל');
    if (!paid(g, amount)) return fail('חסרים קרדיטים לרכישה');
    state.upgrades[key] = level + 1;
    state.investmentTotal = Math.min(100000000, state.investmentTotal + amount);
    commit(g, true);
    return ok(design.label + ' · רמה ' + (level + 1) + ' · ' + formatted(amount) + ' קרדיטים');
  }
  function payDebt(g) {
    if (!onOffice(g)) return fail('תשלום חוב זמין במשרד האי');
    const amount = Math.min(Math.floor(g.profile.credits), state.debt);
    if (amount <= 0) return fail(state.debt ? 'אין קרדיטים לתשלום חוב' : 'אין חוב תחזוקה');
    state.debt -= amount;
    state.upkeepTotal = Math.min(100000000, state.upkeepTotal + amount);
    paid(g, amount);
    commit(g);
    return ok('שולמו ' + formatted(amount) + ' קרדיטים על תחזוקה');
  }
  function repair(g) {
    if (!onOffice(g)) return fail('תחזוקה זמינה במשרד האי');
    if (state.condition >= 100) return fail('התשתיות במצב מלא');
    const amount = Math.min(30, (100 - state.condition) * 2);
    if (!paid(g, amount)) return fail('חסרים קרדיטים לתחזוקה');
    state.condition = Math.min(100, state.condition + Math.ceil(amount / 2));
    state.upkeepTotal = Math.min(100000000, state.upkeepTotal + amount);
    commit(g);
    return ok('שולם טיפול לתשתיות · מצב ' + state.condition + '%');
  }

  function quote(applicant, unit) {
    const missingServices = applicant.needs.filter(key => !state.upgrades[key]);
    if (missingServices.length) return { reason: 'services', missingServices,
      explanation: 'חסרים ' + missingServices.map(key => upgrades[key].label).join(', '), limit: 0, attraction: 0 };
    if (unit.quality < applicant.min)
      return { reason: 'quality', explanation: 'נדרשת איכות ' + applicant.min + ' ומעלה', limit: 0, attraction: 0 };
    const preference = Number(unit.amenity === applicant.prefer), extras = applicant.likes.filter(key => state.upgrades[key]).length;
    const attraction = .55 * (unit.quality - applicant.min) + preference * 6 + extras * 3;
    const limit = Math.min(applicant.budget, Math.floor(.70 * applicant.budget + attraction));
    return { reason: 'accepted', explanation: 'מתאימה להעדפות ולתקציב', limit, attraction };
  }
  function available(applicant, unit) {
    return unit && !unit.occupiedBy && (!unit.reservedBy || unit.reservedBy === applicant);
  }
  function invite(g, id) {
    if (!onOffice(g)) return fail('הזמן דיירים ממשרד האי');
    const applicant = byId.get(id);
    if (!applicant || state.leases.some(x => x.applicant === id)) return fail('כבר קיים חוזה לדייר הזה');
    let choice = null, highest = -Infinity, obstacle;
    for (const unit of units()) {
      if (!available(id, unit)) continue;
      const match = quote(applicant, unit);
      if (!match.limit) { obstacle ??= match.explanation; continue; }
      const estimatedRent = Math.max(MIN_RENT, Math.floor(match.limit * .87));
      const score = match.attraction + (applicant.budget - estimatedRent) * .18;
      if (score > highest) { highest = score; choice = { unit, rent: estimatedRent, limit: match.limit }; }
    }
    if (!choice) return fail(obstacle || 'אין דירה פנויה להצעה');
    return ok(applicant.name + ' מעדיף את ' + choice.unit.name, choice);
  }
  function proposalState(id) { return state.negotiations.find(p => p.applicant === id); }
  function setProposal(info) {
    state.negotiations = state.negotiations.filter(x => x.applicant !== info.applicant);
    state.negotiations.push(info);
  }
  function explain(p) {
    if (p.reason === 'services') return 'ההצעה נדחתה · בעת ההצעה חסרו ' +
      (p.missingServices?.map(key => upgrades[key].label).join(', ') || 'שירותים שהדייר דרש');
    if (p.reason === 'quality') return 'ההצעה נדחתה · נדרשת איכות ' + byId.get(p.applicant).min + ' ומעלה';
    if (p.status === 'declined') return 'ההצעה נדחתה · שכר הדירה גבוה מהתקציב';
    if (p.status === 'counter') return 'הצעת נגד · ' + formatted(p.rent) + ' קרדיטים למחזור';
    return 'הדייר מסכים למחיר · החוזה ממתין לאישור שלך';
  }
  function offer(g, id, unitId, rent) {
    if (!onOffice(g)) return fail('משא ומתן זמין במשרד האי');
    const applicant = byId.get(id), unit = units().find(u => u.id === unitId);
    if (!applicant || state.leases.some(x => x.applicant === id)) return fail('כבר קיים חוזה לדייר הזה');
    if (!available(id, unit)) return fail('הדירה אינה פנויה למשא ומתן');
    if (!Number.isInteger(rent) || rent < MIN_RENT || rent > MAX_RENT) return fail('שכר הדירה חייב להיות בין 12 ל־260 קרדיטים');
    const match = quote(applicant, unit);
    let p;
    if (!match.limit) {
      p = { applicant: id, unit: unitId, rent, status: 'declined', reason: match.reason };
      if (match.missingServices) p.missingServices = match.missingServices;
    } else if (rent <= match.limit) p = { applicant: id, unit: unitId, rent, status: 'accepted', reason: 'accepted' };
    else if (rent <= applicant.budget + 15) p = { applicant: id, unit: unitId, rent: match.limit, status: 'counter', reason: 'counter' };
    else p = { applicant: id, unit: unitId, rent, status: 'declined', reason: 'budget' };
    setProposal(p);
    commit(g);
    return ok(explain(p), { status: p.status, rent: p.rent });
  }
  function acceptCounter(g, id) {
    if (!onOffice(g)) return fail('משא ומתן זמין במשרד האי');
    const p = proposalState(id), a = byId.get(id), u = units().find(unit => unit.id === p?.unit);
    if (p?.status !== 'counter' || !available(id, u) || quote(a, u).limit < p.rent)
      return fail('ההצעה כבר אינה בתוקף. אפשר להציע עסקה חדשה');
    setProposal({ ...p, status: 'accepted', reason: 'accepted' });
    commit(g);
    return ok('קיבלת את הצעת הנגד. אשר את החוזה כדי לאכלס את הדירה');
  }
  function cancel(g, id) {
    if (!onOffice(g) || !proposalState(id)) return fail('אין הצעה פעילה לביטול');
    state.negotiations = state.negotiations.filter(p => p.applicant !== id);
    commit(g);
    return ok('המשא ומתן בוטל והדירה זמינה');
  }
  function approve(g, id) {
    if (!onOffice(g)) return fail('אישור דיירים זמין במשרד האי');
    const p = proposalState(id), a = byId.get(id), u = units().find(unit => unit.id === p?.unit);
    if (p?.status !== 'accepted') return fail('הדייר צריך להסכים למחיר לפני החתימה');
    if (!available(id, u) || state.leases.some(x => x.applicant === id) || quote(a, u).limit < p.rent)
      return fail('הדירה או ההסכמה אינן זמינות. יש להגיש הצעה חדשה');
    state.leases.push({ applicant: id, unit: p.unit, rent: p.rent, accrued: 0 });
    state.negotiations = state.negotiations.filter(x => x !== p);
    commit(g, true);
    return ok(a.name + ' הצטרף לאי · ' + formatted(p.rent) + ' קרדיטים בכל 120 שניות משחק');
  }

  function tick(g, dt) {
    if (!g.running || g.paused || g.over || g.showFullMap || g.missionBoardOpen || document.hidden ||
        !Number.isFinite(dt) || dt <= 0) return;
    const due = recurringCost();
    if (!due && !state.leases.length) return;
    const step = Math.min(dt, 1);
    let income = 0, accounting = false;
    for (const x of state.leases) {
      x.accrued += step;
      if (x.accrued + 1e-9 < CYCLE) continue;
      x.accrued = Math.max(0, x.accrued - CYCLE);
      income += x.rent;
    }
    if (income) {
      const before = g.profile.credits;
      H.awardCredits(g.profile, income);
      state.rentTotal = Math.min(100000000, state.rentTotal + (g.profile.credits - before));
      accounting = true;
    }
    state.upkeepElapsed += step;
    if (state.upkeepElapsed + 1e-9 >= CYCLE) {
      state.upkeepElapsed = Math.max(0, state.upkeepElapsed - CYCLE);
      const amount = Math.min(Math.max(0, Math.floor(g.profile.credits)), due);
      paid(g, amount);
      state.upkeepTotal = Math.min(100000000, state.upkeepTotal + amount);
      state.debt = Math.min(100000, state.debt + due - amount);
      if (amount < due) state.condition = Math.max(0, state.condition - Math.max(1, 5 - state.upgrades.security * 2));
      else if (!state.debt) state.condition = Math.min(100, state.condition + 1);
      accounting = true;
    }
    periodic += step;
    if (accounting) { g.saveProfile?.(); g.updateHUD?.(); }
    if (accounting || (periodic >= CHECKPOINT_INTERVAL && !g.entryTransition && !g.exitTransition && !g.vehicleEntry))
      checkpoint(g);
  }

  function ensureUI(g) {
    if (ui || !document.body) return ui;
    const style = document.createElement('style');
    style.textContent = `
#estate53{position:fixed;z-index:65;right:max(12px,calc((100vw - 960px)/2));bottom:22px;width:min(650px,calc(100vw - 24px));max-height:min(78vh,630px);overflow:auto;direction:rtl;background:#101e27f8;color:#f1f7f5;border:1px solid #517e80;border-radius:15px;padding:14px;font:14px Arial,sans-serif;box-shadow:0 12px 42px #000a}
#estate53[hidden],#estate-board53[hidden]{display:none!important}#estate53 header,#estate53 nav,#estate53 .estate-row53{display:flex;align-items:center;gap:8px}#estate53 header b{flex:1;font-size:19px}
#estate53 button,#estate53 select,#estate53 input,#estate-board53{min-height:34px;color:#f1f7f5;background:#203d4b;border:1px solid #4b747b;border-radius:8px;padding:6px 9px;font:inherit}#estate53 button:disabled{opacity:.46}#estate53 button[aria-pressed=true]{background:#467c79}#estate53 small,#estate53 p{display:block;color:#c3ddda}#estate53 nav{margin:.7rem 0;flex-wrap:wrap}
#estate53 .estate-row53{border-top:1px solid #38525c;padding:.65rem .1rem;flex-wrap:wrap}#estate53 .estate-row53 div{flex:1;min-width:165px}#estate53 input[type=number]{width:88px}#estate53 .estate-current53{color:#f2d7a1}
#estate-board53{position:fixed;z-index:55;bottom:78px;left:50%;transform:translateX(-50%);cursor:pointer;white-space:nowrap}
`;
    document.head.appendChild(style);
    const root = document.createElement('section');
    root.id = 'estate53'; root.hidden = true; root.setAttribute('aria-label', 'ניהול האי הפרטי');
    const board = document.createElement('button');
    board.id = 'estate-board53'; board.type = 'button'; board.textContent = 'I · ניהול האי הפרטי'; board.hidden = true;
    board.addEventListener('click', () => openPanel(currentGame || g));
    document.body.append(root, board);
    ui = { root, board, selected: null, unit: null, rent: null };
    for (const k of ['keydown', 'keyup', 'click', 'pointerdown', 'wheel']) root.addEventListener(k, e => {
      e.stopPropagation();
      if (k === 'keydown' && e.key === 'Escape') closePanel();
    });
    root.addEventListener('change', e => {
      if (e.target.matches?.('[data-estate-applicant]')) {
        ui.selected = e.target.value; ui.unit = ui.rent = null; render(g);
      }
      if (e.target.matches?.('[data-estate-unit]')) ui.unit = e.target.value;
      if (e.target.matches?.('[data-estate-rent]')) ui.rent = Number(e.target.value);
    });
    root.addEventListener('click', e => {
      const button = e.target.closest?.('[data-estate-action]');
      if (!button) return;
      const action = button.dataset.estateAction, arg = button.dataset.value;
      if (action === 'close') { closePanel(); return; }
      if (action === 'tab') { tab = arg; message = ''; render(g); return; }
      const id = ui.selected;
      const response = action === 'upgrade' ? purchase(g, arg) : action === 'invite' ? invite(g, id) :
        action === 'offer' ? offer(g, id, ui.root.querySelector('[data-estate-unit]')?.value,
          Number(ui.root.querySelector('[data-estate-rent]')?.value)) :
          action === 'counter' ? acceptCounter(g, id) : action === 'approve' ? approve(g, id) :
            action === 'cancel' ? cancel(g, id) : action === 'pay' ? payDebt(g) : repair(g);
      if (action === 'invite' && response.ok) { ui.unit = response.unit.id; ui.rent = response.rent; }
      message = response.message;
      render(g);
    });
    return ui;
  }
  function closePanel() {
    if (!ui) return;
    ui.root.hidden = true;
    document.activeElement?.blur?.();
    currentGame?.keys.clear();
  }
  function openPanel(g) {
    if (!onOffice(g)) return false;
    currentGame = g;
    ensureUI(g).root.hidden = false;
    ui.board.hidden = true;
    g.keys.clear();
    document.exitPointerLock?.();
    render(g);
    return true;
  }

  const button = (action, label, value = '', disabled = false, attr = '') =>
    `<button type="button" data-estate-action="${action}" data-value="${value}" ${disabled ? 'disabled' : ''} ${attr}>${label}</button>`;
  function statusHTML(g) {
    const f = finances();
    return `קרדיטים ${formatted(g.profile.credits)} · שכירות ${formatted(f.gross)} · תחזוקה ${formatted(f.upkeep)} · נטו ${formatted(f.net)} למחזור · חוב ${formatted(f.debt)}`;
  }
  function render(g) {
    if (!ui || ui.root.hidden) return;
    let section = '';
    if (tab === 'build') {
      section = Object.entries(upgrades).map(([key, row]) => {
        const level = state.upgrades[key], cost = row.costs[level];
        return `<div class="estate-row53"><div><b>${row.label} · ${level}/${row.costs.length}</b><small>${row.detail}</small></div>` +
          button('upgrade', cost === undefined ? 'הושלם' : 'רכישה · ' + formatted(cost), key,
            cost === undefined || g.profile.credits < cost || key === 'furniture' && !state.upgrades.housing ||
            key === 'cafe' && (!state.upgrades.water || !state.upgrades.power)) + '</div>';
      }).join('');
    } else if (tab === 'rent') {
      const valid = profiles.filter(a => !state.leases.some(l => l.applicant === a.id));
      if (!valid.some(a => a.id === ui.selected)) { ui.selected = valid[0]?.id; ui.unit = ui.rent = null; }
      const a = byId.get(ui.selected), rows = units(), p = proposalState(ui.selected);
      const vacancy = rows.filter(u => available(ui.selected, u));
      section = rows.map(u => `<div class="estate-row53"><div><b>${u.name}</b><small>איכות ${u.quality}/100 · ${u.furnished ? 'מרוהטת' : 'ריהוט בסיסי'} · ${u.occupiedBy ? byId.get(u.occupiedBy).name : u.reservedBy ? 'בהצעה' : 'פנויה'}</small></div></div>`).join('');
      if (!rows.length) section += '<p>בנה דירות כדי להזמין מועמדים.</p>';
      else if (a) {
        section += `<label>מועמד <select data-estate-applicant>${valid.map(n => `<option value="${n.id}" ${n === a ? 'selected' : ''}>${n.name}</option>`).join('')}</select></label>
          <small>תקציב ${a.budget} · איכות מינימלית ${a.min} · מעדיף ${amenityNames[a.prefer]} · ${a.needs.length ? 'דורש ' + a.needs.map(k => upgrades[k].label).join(', ') : 'פתוח להצעות בסיסיות'}</small>
          <div class="estate-row53">${button('invite', 'הצע דירה מתאימה', '', !vacancy.length)}
          <label>דירה <select data-estate-unit>${vacancy.map(u => `<option value="${u.id}" ${u.id === (ui.unit || p?.unit) ? 'selected' : ''}>${u.name}</option>`).join('')}</select></label>
          <label>שכירות <input data-estate-rent type="number" min="12" max="260" value="${ui.rent ?? p?.rent ?? 35}"></label>
          ${button('offer', 'שלח הצעה', '', !vacancy.length)}</div>`;
        if (p) section += `<div class="estate-row53"><div class="estate-current53">${explain(p)}</div>${p.status === 'counter' ? button('counter', 'קבל הצעת נגד') : ''}${p.status === 'accepted' ? button('approve', 'חתום ואשר מעבר') : ''}${button('cancel', 'בטל הצעה')}</div>`;
      }
    } else {
      section = `<p>מחזור של 120 שניות משחק. אין התקדמות בזמן השהיה או כשהלשונית מוסתרת.</p>
        <p id="estate-maintenance53">מצב התשתיות ${state.condition}% · תחזוקה בעוד ${Math.ceil(CYCLE - state.upkeepElapsed)} שניות</p>
        <p>הצטברו ${formatted(state.rentTotal)} משכירות · שולמו ${formatted(state.upkeepTotal)} תחזוקה · הושקעו ${formatted(state.investmentTotal)} בשדרוגים</p>
        <div class="estate-row53">${button('pay', 'שלם חוב', '', !state.debt || !g.profile.credits)}${button('repair', 'תקן תשתיות', '', state.condition >= 100)}</div>` +
        state.leases.map(l => `<div class="estate-row53"><div><b>${byId.get(l.applicant).name}</b><small id="estate-due-${l.applicant}">${formatted(l.rent)} קרדיטים · תשלום בעוד ${Math.ceil(CYCLE - l.accrued)} שניות</small></div></div>`).join('');
    }
    ui.root.innerHTML = `<header><b>ניהול האי הפרטי</b>${button('close', 'סגור')}</header>
      <small id="estate-wallet53">${statusHTML(g)}</small><nav>${[['build','בנייה ושדרוגים'],['rent','דירות ודיירים'],['balance','תחזוקה וחשבון']].map(([id, name]) => button('tab', name, id, false, 'aria-pressed="' + String(tab === id) + '"')).join('')}</nav>
      ${section}<p role="status">${message}</p>`;
  }
  RC.installers.push(Game => {
    const P = Game.prototype, update = P.update, restart = P.restart, hud = P.updateHUD;
    P.restart = function (...args) {
      closePanel();
      return restart.apply(this, args);
    };
    P.update = function (dt) {
      const result = update.call(this, dt);
      tick(this, dt);
      if (ui && !ui.root.hidden && !onOffice(this)) closePanel();
      return result;
    };
    P.updateHUD = function () {
      const result = hud.call(this);
      if (!ui && !onOffice(this)) return result;
      const panel = ensureUI(this);
      panel.board.hidden = !onOffice(this) || !panel.root.hidden;
      const totals = panel.root.querySelector('#estate-wallet53');
      if (totals && !panel.root.hidden) {
        totals.textContent = statusHTML(this);
        const clock = panel.root.querySelector('#estate-maintenance53');
        if (clock) {
          clock.textContent = 'מצב התשתיות ' + state.condition + '% · תחזוקה בעוד ' + Math.ceil(CYCLE - state.upkeepElapsed) + ' שניות';
          for (const l of state.leases) {
            const due = panel.root.querySelector('#estate-due-' + l.applicant);
            if (due) due.textContent = formatted(l.rent) + ' קרדיטים · תשלום בעוד ' + Math.ceil(CYCLE - l.accrued) + ' שניות';
          }
        }
      }
      return result;
    };
    globalThis.addEventListener('keydown', e => {
      const g = globalThis.__SUNSET_PERFORMANCE06_GAME;
      if (e.code !== 'KeyI' || e.repeat || e.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
      if (!onOffice(g)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (ui?.root.hidden === false) closePanel(); else openPanel(g);
    }, true);
  });
  H.estate53 = RC.estate53 = {
    snapshot, restore, units, residents, upgradeLevel, capacity, finances, purchase, invite, offer, acceptCounter,
    approve, cancel, payDebt, repair, tick, openPanel, onOffice, cycle: CYCLE, applicants: () => clone(profiles)
  };
})(Heatline);
