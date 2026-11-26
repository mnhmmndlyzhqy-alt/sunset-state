/* SUNSET STATE — Stage 48: property, islands, cars, smart elevator
 *  - Real-estate office in the city centre ("SUNSET ESTATES"): buy one of five islands of
 *    different sizes, then build houses on it (beach hut / modern villa / luxury estate).
 *    Houses pay rent every two minutes. Owned islands: boat taxi from the office and back.
 *  - Car dealership (the existing car hall): buy a new car; it is yours (no theft).
 *  - Stealing a car: witnesses and traffic cameras may send a fine a few seconds later.
 *  - Smart elevator: doors open as you walk up, a floor panel appears inside the cabin
 *    (click or press 0–9).
 *  Saved in localStorage 'sunset_state_property_v48'. Off with ?property48Off.
 */
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('property48Off') || params.has('realismOff')) return;

  const KEY = 'sunset_state_property_v48';
  const ISLANDS = [
    { id: 'shell', name: 'אי הצדפים', cx: -1083, cz: 779, price: 6000, max: 3, note: 'אי קטן ושקט בדרום־מערב' },
    { id: 'reef', name: 'אי השונית', cx: -635, cz: 852, price: 7500, max: 3, note: 'מול חופי הדרום, מים צלולים' },
    { id: 'sunset', name: 'אי השקיעה', cx: 1088, cz: -649, price: 9500, max: 4, note: 'צפון־מזרח, נוף לשקיעה' },
    { id: 'dolphin', name: 'אי הדולפינים', cx: 1085, cz: -347, price: 18000, max: 6, note: 'אי גדול מול החוף המזרחי' },
    { id: 'palms', name: 'אי הדקלים', cx: -1127, cz: -14, price: 24000, max: 7, note: 'האי הגדול במערב, חופים פרטיים' }
  ];
  const HOUSES = {
    hut: { name: 'בקתת חוף', price: 2500, rent: 45, icon: '🛖' },
    villa: { name: 'וילה מודרנית', price: 6500, rent: 120, icon: '🏡' },
    estate: { name: 'אחוזת יוקרה עם בריכה', price: 14000, rent: 290, icon: '🏰' }
  };
  const CARS = [
    { cls: 'compact', name: 'עירונית קומפקטית', price: 1400 },
    { cls: 'standard', name: 'משפחתית', price: 2000 },
    { cls: 'wagon', name: 'סטיישן', price: 2400 },
    { cls: 'utility', name: 'רכב שטח', price: 3600 },
    { cls: 'sport', name: 'קופה ספורטיבית', price: 7500 },
    { cls: 'luxury', name: 'מכונית יוקרה', price: 11000 }
  ];
  const RENT_EVERY = 120;

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.schema === 48) return v; } catch { } return { schema: 48, islands: {}, cars: [] }; };
  const S = RC.property = load();
  const snapshot = () => JSON.parse(JSON.stringify(S));
  function restore(data) {
    if (data?.schema !== 48) return false;
    const islands = {}, cars = [];
    for (const island of ISLANDS) {
      const saved = data.islands?.[island.id];
      if (!saved) continue;
      const houses = Array.isArray(saved.houses) ? saved.houses.filter(h => h && Number.isInteger(h.plot) &&
        h.plot >= 0 && h.plot < island.max && Object.hasOwn(HOUSES, h.type)).slice(0, island.max) : [];
      islands[island.id] = { houses: houses.map(h => ({ plot: h.plot, type: h.type })) };
    }
    if (Array.isArray(data.cars)) for (const car of data.cars.slice(0, 6)) {
      if (car && CARS.some(spec => spec.cls === car.cls))
        cars.push({ cls: car.cls, paint: Number.isInteger(car.paint) ? H.clamp(car.paint, 0, 6) : 0 });
    }
    const changed = JSON.stringify(S.islands) !== JSON.stringify(islands);
    S.islands = islands;
    S.cars = cars;
    return changed;
  }

  // ---------- island plots from the coastal land mask ----------
  let mask = null;
  function landAt(x, z) {
    if (!mask) { const B = H.coastalDepth461 && H.coastalDepth461(); if (!B || !B.data) return false; mask = B; }
    const W = mask.width, Hh = mask.height;
    const i = Math.floor((x + 1300) / 2600 * W), j = Math.floor((z + 960) / 1920 * Hh);
    if (i < 0 || j < 0 || i >= W || j >= Hh) return false;
    return mask.data[(j * W + i) * 2 + 1] > 143;
  }
  const solidNear = (w, x, z, r) => w.solids.some(s => Math.abs(s.x - x) < r + (s.hw || 0) && Math.abs(s.z - z) < r + (s.hd || 0));
  function plotsFor(w, isl) {
    if (isl.plots) return isl.plots;
    const cand = [];
    for (let dz = -150; dz <= 150; dz += 6) for (let dx = -150; dx <= 150; dx += 6) {
      const x = isl.cx + dx, z = isl.cz + dz;
      let ok = true;
      for (const [ox, oz] of [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16], [11, 11], [-11, 11], [11, -11], [-11, -11]]) if (!landAt(x + ox, z + oz)) { ok = false; break; }
      if (ok) cand.push({ x, z, d: Math.hypot(dx, dz) });
    }
    cand.sort((a, b) => a.d - b.d);
    const plots = [], arrival = [];
    for (const c of cand) {
      if (plots.length >= isl.max + 1) break;
      if (plots.some(p => Math.hypot(p.x - c.x, p.z - c.z) < 30)) continue;
      if (solidNear(w, c.x, c.z, 10)) continue;
      plots.push({ x: c.x, z: c.z });
    }
    // First spot: arrival / dock area; the rest are building plots.
    isl.arrival = plots.shift() || { x: isl.cx, z: isl.cz };
    isl.plots = plots;
    return plots;
  }

  // ---------- builders ----------
  function emitter(w) {
    const out = [], solids = [];
    const ground = (x, z) => H.outdoorHeight ? H.outdoorHeight(x, z) : 0;
    const add = (x, y, z, sx, sy, sz, color, material, layer = 4, glow = 0, shape, yaw = 0) => {
      const b = H.box(x, y, z, sx, sy, sz, color, yaw, layer, glow);
      if (material) b.material = material; if (shape) b.shape = shape; b.visibilityCap = 1100; out.push(b); return b;
    };
    const palm = (x, z, h = 6.5) => {
      const y = ground(x, z);
      add(x, y + h / 2, z, .34, h, .34, '#8b6b4a', 'bark', 3);
      add(x, y + h + .3, z, 3.2, 1.1, 3.2, '#4f8f3a', 'foliage', 3, 0, 'urban_crown');
    };
    const flush = () => {
      for (const b of out) w.boxes.push(b);
      for (const s of solids) w.solids.push(s);
      if (w.nearbyRegions473 instanceof Map) w.nearbyRegions473 = new Map();
    };
    return { out, solids, add, palm, ground, flush };
  }
  function buildHouse(w, p, type, seed) {
    if (H.buildings52?.buildHouse(w, p, type, seed)) return;
    const E = emitter(w), { add, palm } = E, y = E.ground(p.x, p.z), x = p.x, z = p.z;
    const walls = ['#f4ead8', '#efe2c8', '#f7f3ec', '#e9d6bb'][seed % 4];
    const accent = ['#2f8fa8', '#c0603a', '#3f7d58', '#8a5fa8'][seed % 4];
    if (type === 'hut') {
      add(x, y + .2, z, 8, .4, 7, '#a98458', 'wood', 3);
      add(x, y + 1.8, z, 5.6, 2.8, 4.8, walls, 'concrete');
      add(x, y + 3.45, z, 6.6, .5, 5.8, '#8a6a42', 'fabric');
      add(x, y + 1.25, z + 2.42, 1.0, 2.0, .08, '#6b4a2e', 'wood', 5);
      for (const s of [-1.8, 1.8]) add(x + s, y + 2.0, z + 2.42, 1.2, .9, .06, '#9fd3e0', 'glass', 5, .2);
      add(x - 2.2, y + .9, z + 3.0, .6, .5, .6, accent, 'fabric', 3);
      palm(x + 5.5, z - 3); palm(x - 5, z + 4.5, 5.5);
      E.solids.push({ x, z, hw: 3, hd: 2.6 });
    } else if (type === 'villa') {
      add(x, y + .25, z, 16, .5, 12, '#d8cbb4', 'concrete', 3);
      add(x - 1.5, y + 2.1, z - 1, 11, 3.4, 8, walls, 'concrete');
      add(x + .8, y + 5.4, z - 1.6, 8.5, 3.0, 6.4, walls, 'concrete');
      add(x + .8, y + 7.05, z - 1.6, 9.4, .3, 7.2, '#3a3d42', 'metal');
      add(x - 1.5, y + 3.95, z - 1, 11.6, .3, 8.6, '#3a3d42', 'metal');
      add(x - 1.5, y + 2.0, z + 3.03, 9.0, 2.6, .08, '#8fc6d6', 'glass', 5, .15);
      add(x + .8, y + 5.4, z + 1.63, 7.0, 2.2, .08, '#8fc6d6', 'glass', 5, .15);
      add(x + .8, y + 4.4, z + 2.4, 8.5, .12, 1.6, '#cfc6b5', 'concrete');
      add(x + 4.6, y + .55, z + 4.2, 4.6, .12, 2.6, '#35b8d8', 'glass', 5, .35);
      add(x - 6.4, y + 1.3, z + 2.4, .5, 2.6, .5, accent, 'concrete');
      for (let i = 0; i < 4; i++) add(x - 5 + i * 1.6, y + .7, z + 5.4, .9, .9, .9, '#4e7d3c', 'foliage', 3, 0, 'sphere_lod38');
      palm(x + 7.5, z - 5); palm(x - 7.6, z - 4.4, 7.2); palm(x + 7.8, z + 5.2, 6);
      E.solids.push({ x: x - 1.5, z: z - 1, hw: 5.6, hd: 4.1 });
    } else {
      add(x, y + .3, z, 26, .6, 20, '#e2d6c0', 'concrete', 3);
      add(x - 3, y + 2.4, z - 3, 16, 4, 10, walls, 'concrete');
      add(x + 7, y + 2.4, z - 4, 6, 4, 8, walls, 'concrete');
      add(x - 1, y + 6.4, z - 3.5, 12, 4, 8, walls, 'concrete');
      add(x - 1, y + 8.6, z - 3.5, 13, .4, 9, '#2f3236', 'metal');
      add(x - 3, y + 4.6, z - 3, 16.8, .4, 10.8, '#2f3236', 'metal');
      add(x + 7, y + 4.6, z - 4, 6.6, .4, 8.6, '#2f3236', 'metal');
      add(x - 3, y + 2.3, z + 2.03, 14, 3.2, .08, '#8fc6d6', 'glass', 5, .15);
      add(x - 1, y + 6.4, z + .53, 10.5, 3.0, .08, '#8fc6d6', 'glass', 5, .15);
      for (const c of [-9, -5, -1, 3]) add(x + c, y + 2.4, z + 2.6, .35, 4, .35, '#f4efe6', 'concrete');
      add(x + 2, y + .62, z + 6.5, 10, .1, 4.4, '#2fb2d8', 'glass', 5, .4);
      add(x + 2, y + .55, z + 6.5, 10.8, .2, 5.2, '#f0eadf', 'concrete', 3);
      for (const s of [-1, 1]) add(x + 2 + s * 3.5, y + .9, z + 9.6, 1.9, .3, .8, '#f3f0ea', 'fabric', 3);
      for (let i = 0; i < 6; i++) add(x - 11 + i * 4.4, y + .9, z + 9.4, 1.0, 1.1, 1.0, '#4e7d3c', 'foliage', 3, 0, 'sphere_lod38');
      add(x - 10.5, y + 3.0, z + 9.5, .25, 2.4, .25, '#2a2a2a', 'metal', 3);
      add(x - 10.5, y + 4.3, z + 9.5, .5, .5, .5, '#ffe9c2', null, 5, 1.2, 'sphere');
      palm(x + 11, z - 8, 8); palm(x - 12, z - 8, 7.5); palm(x + 11.5, z + 8.5, 7); palm(x - 12.5, z + 7, 6.5);
      E.solids.push({ x: x - 3, z: z - 3, hw: 8.1, hd: 5.1 }, { x: x + 7, z: z - 4, hw: 3.1, hd: 4.1 });
    }
    E.flush();
  }
  function buildIslandBase(w, isl) {
    if (H.islands53?.ownedBase(w, isl)) return;
    const E = emitter(w), a = { x: isl.arrival.x + 6, z: isl.arrival.z - 4 }, y = E.ground(a.x, a.z);
    E.add(a.x, y + 3, a.z, .14, 6, .14, '#dcdcdc', 'metal', 3);
    E.add(a.x + .75, y + 5.5, a.z, 1.4, .9, .04, '#2f8fa8', 'fabric', 5, .5);
    E.add(a.x, y + 1.2, a.z + 2.5, 2.6, 1.0, .12, '#f5efe2', 'concrete', 5, .6);
    E.flush();
  }
  function buildOffice(w, o) {
    const E = emitter(w), y = E.ground(o.x, o.z), { add } = E;
    add(o.x, y + 1.7, o.z, 6, 3.4, 4.2, '#f2ede4', 'concrete');
    add(o.x, y + 3.55, o.z, 6.8, .3, 5, '#2b2e33', 'metal');
    add(o.x, y + 1.6, o.z + 2.12, 4.6, 2.2, .08, '#9fd3e0', 'glass', 5, .3);
    add(o.x, y + 4.15, o.z + 1.9, 5.4, .9, .16, '#123f52', 'concrete', 5, .9);
    add(o.x, y + 4.15, o.z + 1.99, 4.6, .45, .04, '#ffd36b', null, 5, 1.4);
    for (const s of [-1, 1]) add(o.x + s * 3.6, y + .5, o.z + 2.6, .8, 1.0, .8, '#4e7d3c', 'foliage', 3, 0, 'sphere_lod38');
    E.solids.push({ x: o.x, z: o.z, hw: 3.1, hd: 2.2 });
    E.flush();
  }
  function findOfficeSpot(g) {
    const w = g.world, sx = g.avatar.x, sz = g.avatar.z;
    const roads = w.roads461 || [];
    const nearRoad = (x, z) => roads.some(r => (r.samples || []).some(s => Math.hypot(s.x - x, s.z - z) < (r.width || 8) / 2 + 3));
    for (let r = 10; r < 160; r += 6) for (let a = 0; a < 6.28; a += .35) {
      const x = Math.round(sx + Math.cos(a) * r), z = Math.round(sz + Math.sin(a) * r);
      if (!landAt(x, z) || solidNear(w, x, z, 6) || nearRoad(x, z)) continue;
      return { x, z };
    }
    return { x: sx + 12, z: sz };
  }

  // ---------- world setup per world instance ----------
  function setupWorld(g) {
    const w = g.world;
    if (!w || w.__prop48) return;
    w.__prop48 = true;
    for (const isl of ISLANDS) { isl.plots = null; isl.arrival = null; }
    try {
      const o = w.office48 = findOfficeSpot(g);
      buildOffice(w, o);
      for (const isl of ISLANDS) {
        const own = S.islands[isl.id];
        if (!own) continue;
        const plots = plotsFor(w, isl);
        buildIslandBase(w, isl);
        for (const h of own.houses || []) if (plots[h.plot]) buildHouse(w, plots[h.plot], h.type, h.plot + isl.price);
      }
      w.__cars48 = false;
    } catch (e) { console.warn('[Property48] setup', e); }
  }
  function spawnOwnedCars(g) {
    const w = g.world, d = w.stage44Depot;
    if (w.__cars48 || !d || !g.parked || typeof g.createTraffic !== 'function') return;
    w.__cars48 = true;
    S.cars.forEach((c, i) => placeCar(g, c, i));
  }
  function placeCar(g, spec, i) {
    const d = g.world.stage44Depot, car = g.createTraffic();
    if (!car) return null;
    car.vehicleClass = spec.cls; car.paint = spec.paint;
    car.x = d.x + 6 + (i % 3) * 3.6; car.z = d.z + 6 + Math.floor(i / 3) * 6.5; car.yaw = 0;
    if ('y' in car) car.y = H.outdoorHeight ? H.outdoorHeight(car.x, car.z) : car.y;
    car.speed = 0; car.vx = 0; car.vz = 0; car.owned48 = true; car.market44 = 'owned';
    g.parked.push(car);
    return car;
  }

  // ---------- UI ----------
  let panel = null, prompt = null, liftPanel = null;
  const css = `#prop48,#lift48{position:fixed;z-index:60;direction:rtl;font-family:inherit;color:#eef6f8}
#prop48{inset:7% 50% auto auto;transform:translateX(50%);width:min(560px,92vw);max-height:80vh;overflow:auto;background:rgba(10,24,34,.94);border:1px solid #2c6f86;border-radius:14px;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#prop48 h2{margin:0 0 4px;font-size:20px;color:#ffd36b}#prop48 .sub{opacity:.8;font-size:13px;margin-bottom:10px}
#prop48 .tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}#prop48 .tabs button{flex:1}
#prop48 button{background:#164a5c;color:#eef6f8;border:1px solid #2c8fae;border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit;font-size:14px}
#prop48 button:disabled{opacity:.45;cursor:default}#prop48 button.on{background:#2c8fae}
#prop48 .row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}
#prop48 .row small{display:block;opacity:.75}#prop48 .x{position:absolute;left:12px;top:10px}
#prop48p{position:fixed;z-index:59;left:50%;bottom:22%;transform:translateX(-50%);background:rgba(10,24,34,.9);border:1px solid #ffd36b;color:#ffd36b;border-radius:20px;padding:8px 16px;cursor:pointer;direction:rtl;font-size:15px}
#lift48{left:50%;bottom:16%;transform:translateX(-50%);background:rgba(12,16,22,.92);border:1px solid #c9a95c;border-radius:14px;padding:10px 12px;text-align:center}
#lift48 .t{font-size:13px;opacity:.85;margin-bottom:6px}#lift48 .g{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:360px}
#lift48 button{width:52px;height:44px;border-radius:50%;background:#20262e;color:#f3e3b5;border:2px solid #c9a95c;font-size:16px;cursor:pointer}
#lift48 button.cur{background:#c9a95c;color:#111}`;
  function ensureDom() {
    if (panel || typeof document === 'undefined') return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    panel = document.createElement('div'); panel.id = 'prop48'; panel.hidden = true; document.body.appendChild(panel);
    prompt = document.createElement('div'); prompt.id = 'prop48p'; prompt.hidden = true; document.body.appendChild(prompt);
    liftPanel = document.createElement('div'); liftPanel.id = 'lift48'; liftPanel.hidden = true; document.body.appendChild(liftPanel);
    for (const el of [panel, prompt, liftPanel]) for (const ev of ['keydown', 'pointerdown', 'mousedown', 'click', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
    prompt.addEventListener('click', () => openPanel(game()));
    panel.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (b) act(game(), b.dataset.a, b.dataset.v); });
    liftPanel.addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) liftTo(game(), +b.dataset.f); });
  }
  const game = () => globalThis.__SUNSET_PERFORMANCE06_GAME;
  let tab = 'islands';
  const fmt = n => Math.round(n).toLocaleString('he-IL');
  function where(g) {
    const f = g.inVehicle ? g.player : g.avatar, w = g.world;
    const office = w.office48 && Math.hypot(f.x - w.office48.x, f.z - w.office48.z) < 9;
    const dealer = w.stage44Depot && Math.hypot(f.x - w.stage44Depot.x, f.z - w.stage44Depot.z) < 32;
    const island = ISLANDS.find(i => S.islands[i.id] && i.arrival && Math.hypot(f.x - i.arrival.x, f.z - i.arrival.z) < 170);
    return { office, dealer, island };
  }
  function openPanel(g) {
    if (!g || !g.running) return;
    ensureDom();
    const at = where(g);
    if (!at.office && !at.dealer && !at.island) { g.showInfo('🏢 משרד הנדל״ן SUNSET ESTATES נמצא במרכז העיר · אולם הרכב קונה ומוכר רכבים', 3.5); return; }
    tab = at.dealer && !at.office ? 'cars' : at.island && !at.office ? 'travel' : tab;
    try { document.exitPointerLock && document.exitPointerLock(); } catch { }
    g.keys && g.keys.clear && g.keys.clear();
    panel.hidden = false; render(g);
  }
  function closePanel() { if (panel) panel.hidden = true; }
  function render(g) {
    const at = where(g), credits = g.profile.credits;
    const tabs = [['islands', '🏝 איים'], ['houses', '🏡 בתים'], ['cars', '🚗 רכבים'], ['travel', '🚤 נסיעה']];
    let h = `<button class="x" data-a="close">✕</button><h2>SUNSET ESTATES</h2><div class="sub">🪙 ${fmt(credits)} קרדיטים · הכנסה משכירות: ${fmt(rentTotal())} כל 2 דקות</div><div class="tabs">` +
      tabs.map(([k, l]) => `<button data-a="tab" data-v="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('') + '</div>';
    if (tab === 'islands') {
      if (!at.office) h += '<div class="sub">קניית איים רק במשרד הנדל״ן במרכז העיר.</div>';
      for (const i of ISLANDS) {
        const own = S.islands[i.id];
        h += `<div class="row"><div><b>${i.name}</b><small>${i.note} · עד ${i.max} בתים</small></div>` +
          (own ? '<span>✓ בבעלותך</span>' : `<button data-a="buyIsland" data-v="${i.id}" ${!at.office || credits < i.price ? 'disabled' : ''}>${fmt(i.price)} 🪙</button>`) + '</div>';
      }
    } else if (tab === 'houses') {
      const mine = ISLANDS.filter(i => S.islands[i.id]);
      if (!mine.length) h += '<div class="sub">קודם קנה אי בלשונית "איים".</div>';
      if (!at.office && !at.island) h += '<div class="sub">בנייה מוזמנת במשרד הנדל״ן או על האי שלך.</div>';
      for (const i of mine) {
        const own = S.islands[i.id], plots = plotsFor(g.world, i), used = (own.houses || []).length, free = Math.min(i.max, plots.length) - used;
        h += `<div class="row"><div><b>${i.name}</b><small>${used} בתים · ${Math.max(0, free)} מגרשים פנויים</small></div><span></span></div>`;
        for (const [k, t] of Object.entries(HOUSES))
          h += `<div class="row"><div>${t.icon} ${t.name}<small>שכירות ${t.rent} כל 2 דקות</small></div><button data-a="build" data-v="${i.id}:${k}" ${free <= 0 || credits < t.price || (!at.office && at.island !== i) ? 'disabled' : ''}>${fmt(t.price)} 🪙</button></div>`;
      }
    } else if (tab === 'cars') {
      if (!at.dealer) h += '<div class="sub">רכבים חדשים נקנים באולם הרכב (קנייה ומכירה).</div>';
      for (const c of CARS)
        h += `<div class="row"><div><b>${c.name}</b><small>${(H.VEHICLE_CLASSES[c.cls] || {}).label || ''} · נשאר באולם הרכב, שלך לתמיד</small></div><button data-a="buyCar" data-v="${c.cls}" ${!at.dealer || credits < c.price || S.cars.length >= 6 ? 'disabled' : ''}>${fmt(c.price)} 🪙</button></div>`;
      h += `<div class="sub">הרכבים שלך: ${S.cars.length}/6. גניבת רכב עלולה לגרור קנס.</div>`;
    } else {
      for (const i of ISLANDS.filter(i => S.islands[i.id]))
        h += `<div class="row"><div>🚤 ${i.name}</div><button data-a="go" data-v="${i.id}" ${!at.office || g.inVehicle ? 'disabled' : ''}>סע לאי · 60 🪙</button></div>`;
      h += `<div class="row"><div>🏢 חזרה למשרד הנדל״ן</div><button data-a="back" ${!at.island || g.inVehicle ? 'disabled' : ''}>חזור · 60 🪙</button></div>`;
      if (g.inVehicle) h += '<div class="sub">צא מהרכב כדי לעלות על מונית הסירה.</div>';
    }
    panel.innerHTML = h;
  }
  function pay(g, n) { if (g.profile.credits < n) { g.showInfo('אין מספיק קרדיטים', 2.5); return false; } g.profile.credits -= n; g.saveProfile && g.saveProfile(); g.updateHUD && g.updateHUD(); return true; }
  function teleport(g, x, z) {
    const a = g.avatar;
    a.x = x; a.z = z; a.y = H.outdoorHeight ? H.outdoorHeight(x, z) : a.y; a.vx = a.vz = 0; if (a.rcLoco) a.rcLoco = { vx: 0, vz: 0 };
    const fade = document.getElementById('building-entry-fade');
    if (fade) { fade.classList.add('active'); fade.style.opacity = '1'; setTimeout(() => { fade.classList.remove('active'); fade.style.opacity = '0'; }, 600); }
  }
  function act(g, a, v) {
    if (!g) return;
    const w = g.world;
    if (a === 'close') return closePanel();
    if (a === 'tab') tab = v;
    else if (a === 'buyIsland') {
      const i = ISLANDS.find(i => i.id === v);
      if (i && !S.islands[i.id] && pay(g, i.price)) {
        S.islands[i.id] = { houses: [] };
        plotsFor(w, i); buildIslandBase(w, i);
        g.rewardFlash = 1; g.showInfo('🏝 ' + i.name + ' שלך! בנה עליו בתים בלשונית "בתים"', 5);
      }
    } else if (a === 'build') {
      const [id, type] = v.split(':'), i = ISLANDS.find(i => i.id === id), own = S.islands[id], t = HOUSES[type];
      const plots = i && plotsFor(w, i), n = own ? own.houses.length : 99;
      if (i && own && t && n < Math.min(i.max, plots.length) && pay(g, t.price)) {
        own.houses.push({ plot: n, type });
        buildHouse(w, plots[n], type, n + i.price);
        g.rewardFlash = 1; g.showInfo(t.icon + ' ' + t.name + ' נבנתה ב' + i.name + ' · +' + t.rent + ' שכירות', 5);
      }
    } else if (a === 'buyCar') {
      const c = CARS.find(c => c.cls === v);
      if (c && S.cars.length < 6 && pay(g, c.price)) {
        const spec = { cls: c.cls, paint: (Math.random() * 7) | 0 };
        S.cars.push(spec);
        placeCar(g, spec, S.cars.length - 1);
        g.rewardFlash = 1; g.showInfo('🚗 ' + c.name + ' חדשה מחכה לך במגרש של אולם הרכב', 5);
      }
    } else if (a === 'go') {
      const i = ISLANDS.find(i => i.id === v);
      if (i && !g.inVehicle && pay(g, 60)) { plotsFor(w, i); closePanel(); teleport(g, i.arrival.x, i.arrival.z); g.showInfo('🚤 הגעת ל' + i.name, 3.5); return; }
    } else if (a === 'back') {
      if (!g.inVehicle && w.office48 && pay(g, 60)) { closePanel(); teleport(g, w.office48.x, w.office48.z + 5); g.showInfo('🏢 חזרת למשרד הנדל״ן', 3); return; }
    }
    render(g);
  }
  function rentTotal() {
    let n = 0;
    for (const own of Object.values(S.islands)) for (const h of own.houses || []) n += (HOUSES[h.type] || {}).rent || 0;
    return n;
  }

  // ---------- smart elevator ----------
  function liftTo(g, f) {
    if (!g || !g.indoor) return;
    const ok = g.startElevatorTo(f);
    if (ok && liftPanel) liftPanel.hidden = true;
  }
  function tickLift(g) {
    const v = g.indoor;
    if (!v || !v.scene || !v.scene.lift || v.stairTrip) { if (liftPanel) liftPanel.hidden = true; return; }
    ensureDom();
    const d = Math.hypot(g.avatar.x - v.scene.lift.x, g.avatar.z - v.scene.lift.z);
    if (v.liftRide) { liftPanel.hidden = true; return; }
    // Doors open by themselves when you walk up to them.
    if (d < 3.2 && !v.liftMenuOpen && !v.__auto48) { v.__auto48 = true; try { g.openElevatorMenu(); } catch { } }
    if (d > 5) v.__auto48 = false;
    const inside = d < 3.8 && g.standingInsideElevator && g.standingInsideElevator(v);
    if (!inside) { liftPanel.hidden = true; return; }
    const top = (v.scene.maxFloor | 0) + 1, key = top + ':' + v.floor;
    if (liftPanel.dataset.k !== key) {
      liftPanel.dataset.k = key;
      let b = '';
      for (let f = top; f >= 0; f--) b += `<button data-f="${f}" class="${f === v.floor ? 'cur' : ''}">${f === 0 ? 'L' : f}</button>`;
      liftPanel.innerHTML = '<div class="t">🛗 בחר קומה · לחיצה או מקשי 0–9</div><div class="g">' + b + '</div>';
    }
    liftPanel.hidden = false;
  }

  // ---------- install ----------
  RC.installers.push(function installProperty48(Game) {
    const P = Game.prototype;
    // Owned cars are never "stolen"; anything else may bring a fine.
    const notice = P.noticeVehicleTransfer;
    if (notice) P.noticeVehicleTransfer = function (car, owner) {
      if (car && car.owned48) return;
      const r = notice.call(this, car, owner);
      try {
        if (car && H.carClass(car) !== 'police' && !car.fine48) {
          car.fine48 = true;
          const witnesses = (this.pedestrians || []).filter(w => w.injuryState === 'walking' && Math.hypot(w.x - car.x, w.z - car.z) < 18).length;
          const risk = Math.min(.8, .3 + witnesses * .12);
          if (Math.random() < risk) {
            const cls = H.carClass(car), fine = cls === 'luxury' || cls === 'sport' ? 650 : 350;
            const residents = this.pedestrians;
            setTimeout(() => {
              if (!this.running || this.pedestrians !== residents) return;
              const paid = Math.min(fine, Math.max(0, this.profile.credits));
              this.profile.credits -= paid; this.saveProfile && this.saveProfile(); this.updateHUD && this.updateHUD();
              this.showInfo((witnesses ? '📱 עד דיווח' : '📸 מצלמת תנועה זיהתה') + ' על גניבת רכב · קנס ' + paid + ' קרדיטים', 5);
            }, 5000 + Math.random() * 5000);
          }
        }
      } catch { }
      return r;
    };
    const update = P.update;
    let rentClock = 0;
    P.update = function (dt) {
      const r = update.call(this, dt);
      try {
        if (!this.world) return r;
        setupWorld(this);
        if (!this.running) return r;
        spawnOwnedCars(this);
        ensureDom();
        const at = where(this);
        const near = !this.inside && (at.office || at.dealer || at.island);
        prompt.hidden = !near || !panel.hidden;
        if (near) prompt.textContent = at.office ? '🏢 SUNSET ESTATES · נדל״ן ואיים · Enter' : at.dealer ? '🚗 קניית רכב חדש · Enter' : '🏝 האי שלך · בנייה ונסיעה · Enter';
        if (!panel.hidden && !near) closePanel();
        if (!document.body.classList.contains('elevator-city50')) tickLift(this);
        if (!this.paused && rentTotal() > 0) {
          rentClock += dt;
          if (rentClock >= RENT_EVERY) {
            rentClock = 0;
            const n = rentTotal();
            this.profile.credits += n; this.saveProfile && this.saveProfile(); this.updateHUD && this.updateHUD();
            this.showInfo('🏝 הכנסה משכירות הבתים שלך · +' + n + ' קרדיטים', 4);
          }
        }
      } catch (e) { if (!RC.__p48warn) { RC.__p48warn = true; console.warn('[Property48]', e); } }
      return r;
    };
    globalThis.addEventListener('keydown', e => {
      const g = game();
      if (!g || !g.running) return;
      if (e.code === 'Enter' && !e.repeat && !g.inside) { if (panel && !panel.hidden) closePanel(); else openPanel(g); }
      else if (e.code === 'Escape' && panel && !panel.hidden) closePanel();
      else if (/^Digit[0-9]$/.test(e.code) && liftPanel && !liftPanel.hidden) { e.preventDefault(); e.stopImmediatePropagation(); liftTo(g, +e.code.slice(5)); }
    }, true);
  });
  RC.property48 = { ISLANDS, HOUSES, CARS, state: S, snapshot, restore, open: () => openPanel(game()), act: (a, v) => act(game(), a, v), plotsFor, setupWorld };
})(Heatline);
