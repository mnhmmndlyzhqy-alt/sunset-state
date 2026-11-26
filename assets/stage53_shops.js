/* SUNSET STATE — street-facing shop signs, displays and window browsing. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled || new URLSearchParams(location.search).has('shops53Off')) return;

  const styles = {
    bakery: { category: 'מאפייה', color: '#eab678', panel: '#55362e' },
    cafe: { category: 'בית קפה', color: '#aad8c9', panel: '#244e48' },
    bookshop: { category: 'ספרים', color: '#e4c1ef', panel: '#4a3b59' },
    flower: { category: 'פרחים', color: '#f1b9c5', panel: '#51394b' },
    grocery: { category: 'מכולת', color: '#c3dba5', panel: '#334d36' },
    pharmacy: { category: 'בית מרקחת', color: '#b0e9e8', panel: '#2a525b' },
    gallery: { category: 'גלריה', color: '#ded9ff', panel: '#343957' },
    bank: { category: 'בנק', color: '#fbe2ac', panel: '#343a4d' }
  };
  const graphs = new WeakMap(), visits = new WeakMap(), publicSigns = new WeakMap();
  const TILE = 34, SIGN_LIMIT = 5, BROWSE_LIMIT = 2;
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  const cellKey = (x, z) => x + ',' + z;
  const paintBox = (x, y, z, w, h, d, color, material = 'metal', glow = 0, shape) => {
    const box = H.box(x, y, z, w, h, d, color, 0, 4, glow);
    box.material = material;
    if (shape) box.shape = shape;
    return box;
  };
  function shopMeta(venue) {
    const front = venue.retail, kind = venue.bank44 ? 'bank' : front.kind;
    const style = styles[kind] || { category: 'חנות', color: '#b7ddd7', panel: '#375358' };
    const origin = { x: front.centerX, z: front.frontZ - .86 };
    const y = H.outdoorHeight(origin.x, front.frontZ);
    const name = venue.label || style.category;
    const label = name === style.category && venue.district ? venue.district : style.category;
    return { venue, front, kind, style, name, caption: label !== name ? label : '', origin,
      labelAt: { x: origin.x, y: y + 3.99, z: origin.z - .11 },
      door: { x: front.doorX, z: front.frontZ - .95 },
      window: { x: front.windowX, z: front.frontZ - .82 }, parts: null };
  }
  function graph(world) {
    let current = graphs.get(world);
    const stores = world.retailShops || [];
    if (current?.source === stores && current.entries.length === stores.length) return current;
    const entries = stores.filter(v => v.retail).map(shopMeta), cells = new Map(), keyed = new Map();
    for (const entry of entries) {
      const k = cellKey(Math.floor(entry.origin.x / TILE), Math.floor(entry.origin.z / TILE));
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(entry);
      keyed.set(entry.venue.id, entry);
    }
    current = { source: stores, entries, cells, keyed };
    graphs.set(world, current);
    return current;
  }
  function nearby(world, origin, radius) {
    const { cells } = graph(world), found = [];
    for (let x = Math.floor((origin.x - radius) / TILE); x <= Math.floor((origin.x + radius) / TILE); x++) {
      for (let z = Math.floor((origin.z - radius) / TILE); z <= Math.floor((origin.z + radius) / TILE); z++) {
        for (const shop of cells.get(cellKey(x, z)) || [])
          if (dist2(origin, shop.origin) <= radius * radius) found.push(shop);
      }
    }
    return found;
  }
  function sight(world, origin, target) {
    return H.officerSightClear(origin.x, origin.z, target.x, target.z,
      world.nearby((origin.x + target.x) * .5, (origin.z + target.z) * .5));
  }
  function street(g) {
    return g.running && !g.over && !g.inside && !g.roofVisit && !g.flight51?.pilot && !g.avatar.swim445 && !g.boat444;
  }
  function forFigure(g) {
    return street(g) && !g.inVehicle && g.onBus < 0 && g.onTram < 0 &&
      !g.paused && !g.garageOpen && !g.missionBoardOpen && !g.showFullMap && !g.entryTransition && !g.exitTransition;
  }

  function frontageParts(shop) {
    const { x, y, z } = shop.labelAt, { front, style, kind } = shop;
    const w = Math.max(2.7, Math.min(6.4, front.width * .88));
    const parts = [
      paintBox(x, y, z + .14, w, .76, .38, style.panel),
      paintBox(x, y + .34, z - .063, w - .15, .045, .052, style.color, 'metal', .15),
      paintBox(x, y - .32, z - .058, w - .15, .044, .052, style.color, 'metal', .12)
    ];
    const doorGround = H.outdoorHeight(shop.door.x, front.frontZ);
    for (const side of [-1, 1]) {
      parts.push(paintBox(shop.door.x + side * 1.014, doorGround + 1.37, front.frontZ - .467,
        .122, 2.62, .16, style.color, 'metal', .13));
    }
    parts.push(paintBox(shop.door.x, doorGround + 2.88, front.frontZ - .484,
      2.08, .055, .14, style.color, 'light_emissive', .65));
    const visible = front.windowWidth > 1.45 && Math.abs(front.windowX - front.doorX) > 1.8;
    if (!visible || kind === 'bank') return parts;

    const base = H.outdoorHeight(front.windowX, front.frontZ), wx = front.windowX, wz = front.frontZ - .694;
    const absoluteWidth = Math.min(front.windowWidth * .59, (Math.abs(wx - front.doorX) - 1.12) * 2);
    if (absoluteWidth < .9) return parts;
    const bench = (ox, yy, w, h, d, color, material = 'wood', shape) =>
      parts.push(paintBox(wx + ox, base + yy, wz - .10, w, h, d, color, material, 0, shape));
    bench(0, .76, absoluteWidth, .16, .35, style.panel);
    if (kind === 'flower') {
      for (const side of [-1, 1]) {
        bench(side * absoluteWidth * .27, .94, .23, .29, .24, '#a47865', 'concrete', 'cylinder');
        bench(side * absoluteWidth * .27, 1.18, .36, .31, .30, style.color, 'foliage', 'urban_crown');
      }
    } else if (kind === 'bakery' || kind === 'cafe' || kind === 'grocery') {
      for (const side of [-1, 0, 1])
        bench(side * absoluteWidth * .31, .92, Math.min(.33, absoluteWidth * .27), kind === 'grocery' ? .24 : .17,
          .31, side === 0 ? style.color : '#b88354', 'paint', 'rounded_smooth');
    } else {
      for (const side of [-1, 0, 1])
        bench(side * absoluteWidth * .32, .98 + (side === 0 ? .08 : 0), Math.min(.28, absoluteWidth * .27),
          side === 0 ? .43 : .32, .20, side === 0 ? style.color : '#a7babb', 'paint');
    }
    return parts;
  }
  function shopsInView(g) {
    const c = g.cam;
    return nearby(g.world, c, 69).filter(s => c.z < s.origin.z + .12 &&
      Math.abs(c.y - s.labelAt.y) < 23).sort((a, b) => dist2(c, a.origin) - dist2(c, b.origin));
  }

  function registerSign(world, info) {
    if (!world || !info?.name || ![info.x, info.y, info.z].every(Number.isFinite)) return false;
    let signs = publicSigns.get(world);
    if (!signs) { signs = new Map(); publicSigns.set(world, signs); }
    const { x, y, z, name } = info, origin = { x, z };
    signs.set(info.id ?? cellKey(x, z), { name, caption: info.caption || '', style: { color: info.color ?? '#fbdfaf' },
      origin, labelAt: { x, y, z }, reach: H.clamp(info.reach || 65, 6, 83),
      normalX: info.normalX ?? 0, normalZ: info.normalZ ?? 0 });
    return true;
  }
  function textSigns(g) {
    const c = g.cam, local = street(g) ? shopsInView(g) : [];
    for (const s of publicSigns.get(g.world)?.values() || []) {
      if (dist2(c, s.origin) > s.reach ** 2 || Math.abs(c.y - s.labelAt.y) > 28 ||
          (c.x - s.origin.x) * s.normalX + (c.z - s.origin.z) * s.normalZ < -.3) continue;
      local.push(s);
    }
    return local.sort((a, b) => dist2(c, a.origin) - dist2(c, b.origin));
  }

  function project(m, rect, p) {
    if (!m || m.length < 16 || !rect.width || !rect.height) return null;
    const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
    if (w <= .15) return null;
    const x = (m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12]) / w;
    const y = (m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13]) / w;
    if (Math.abs(x) > .98 || y < -.91 || y > .88) return null;
    return { x: rect.left + (1 + x) * rect.width * .5, y: rect.top + (1 - y) * rect.height * .5 };
  }
  function projectCamera(c, rect, p) {
    const dx = c.tx - c.x, dy = c.ty - c.y, dz = c.tz - c.z;
    const len = Math.hypot(dx, dy, dz), horizontal = Math.hypot(dx, dz);
    if (!len || !horizontal || !rect.width || !rect.height) return null;
    const fx = dx / len, fy = dy / len, fz = dz / len, rx = -dz / horizontal, rz = dx / horizontal;
    const x = p.x - c.x, y = p.y - c.y, z = p.z - c.z, depth = x * fx + y * fy + z * fz;
    if (depth <= .15) return null;
    const scale = depth * Math.tan((c.fov || 65) * Math.PI / 360);
    const nx = (x * rx + z * rz) * rect.height / (scale * rect.width);
    const ny = (-x * rz * fy + y * (rz * fx - rx * fz) + z * rx * fy) / scale;
    if (Math.abs(nx) > .98 || ny < -.91 || ny > .88) return null;
    return { x: rect.left + (1 + nx) * rect.width * .5, y: rect.top + (1 - ny) * rect.height * .5 };
  }
  function labelPool() {
    let root, rows, next = 0;
    function ensure() {
      if (root) return;
      const css = document.createElement('style');
      css.textContent = `
        #shop-signs53{position:fixed;inset:0;pointer-events:none;z-index:18}
        .shop-sign53{position:absolute;transform:translate(-50%,-50%);direction:rtl;text-align:center;min-width:5em;padding:.24em .54em;border:1px solid currentColor;border-radius:.33em;background:#19242bed;box-shadow:0 .12em .37em #08111688;font:700 13px/1.16 Arial,sans-serif;white-space:nowrap;text-shadow:0 1px 1px #131d24}
        .shop-sign53 small{display:block;font-size:.76em;line-height:1.10;font-weight:500;color:#f1ecdf;margin-top:.2em}
        .shop-sign53 small[hidden],.shop-sign53[hidden]{display:none}
      `;
      document.head.appendChild(css);
      root = document.createElement('div');
      root.id = 'shop-signs53';
      root.setAttribute('aria-hidden', 'true');
      rows = Array.from({ length: SIGN_LIMIT }, () => {
        const node = document.createElement('div'), title = document.createElement('strong'), category = document.createElement('small');
        node.className = 'shop-sign53';
        node.hidden = true;
        node.append(title, category);
        root.appendChild(node);
        return { node, title, category, shop: null };
      });
      document.body.appendChild(root);
    }
    return function draw(g, now) {
      ensure();
      const show = g.running && !g.over && !g.inside && !document.hidden && !g.paused &&
        !g.showFullMap && !g.missionBoardOpen && !g.garageOpen;
      const matrix = g.renderer.rcViewProjection;
      if (!show) { root.hidden = true; return; }
      root.hidden = false;
      if (now < next) return;
      next = now + 66;
      const screen = g.renderer.canvas.getBoundingClientRect(), placed = [];
      for (const shop of textSigns(g)) {
        const pos = matrix ? project(matrix, screen, shop.labelAt) : projectCamera(g.cam, screen, shop.labelAt);
        if (!pos || placed.some(q => (q.x - pos.x) ** 2 + (q.y - pos.y) ** 2 < 89 ** 2)) continue;
        if (!sight(g.world, g.cam, shop.origin)) continue;
        const row = rows[placed.length], d2 = dist2(g.cam, shop.origin);
        if (row.shop !== shop) {
          row.shop = shop;
          row.title.textContent = shop.name;
          row.category.textContent = shop.caption;
          row.category.hidden = !shop.caption;
          row.node.style.color = shop.style.color;
        }
        row.node.style.left = Math.round(pos.x) + 'px';
        row.node.style.top = Math.round(pos.y) + 'px';
        row.node.style.fontSize = H.clamp(22 - Math.sqrt(d2) * .20, 12, 18) + 'px';
        row.node.hidden = false;
        placed.push(pos);
        if (placed.length === rows.length) break;
      }
      for (const row of rows.slice(placed.length)) row.node.hidden = true;
    };
  }

  function socialState(g) {
    let state = visits.get(g);
    if (state?.world === g.world && state.pedestrians === g.pedestrians) return state;
    if (state) for (const w of state.active) release(state, w, true);
    state = { world: g.world, pedestrians: g.pedestrians, active: new Set(), last: new WeakMap(), probeAt: 0 };
    visits.set(g, state);
    return state;
  }
  function release(state, w, interrupted) {
    state.active.delete(w);
    const browse = w.windowBrowse53;
    if (interrupted && w.navActivity === 'window') {
      w.navActivity = 'walk';
      w.pause = 0;
    }
    delete w.windowBrowse53;
    if (browse) state.last.set(w, browse.until + 22);
  }
  function eligible(g, state, w) {
    return w.injuryState === 'walking' && w.navState === 'sidewalk' && w.pause <= 0 && !w.panic && !w.stumble &&
      !w.streetLifeSlot && !w.home441 && !w.shift441 && !w.storyContact445 && !w.prisonActor471 &&
      !w._witness460 && !w.deck443 && !w.coastDeck461 && !w.windowBrowse53 &&
      RC.chat48?.active?.who !== w && !g.streetLife.jobs.has(w) && !(state.last.get(w) > g.seconds);
  }
  function observeShops(g, dt) {
    const state = socialState(g), active = forFigure(g) && g.heat === 0 && g.weather.rain < .64;
    for (const w of state.active) {
      const look = w.windowBrowse53;
      const interrupted = !active || w.panic > 0 || w.injuryState !== 'walking' || RC.chat48?.active?.who === w;
      if (!look || interrupted || w.pause <= 0 || g.seconds >= look.until) { release(state, w, interrupted); continue; }
      const yaw = Math.atan2(w.x - look.x, w.z - look.z);
      w.yaw += H.angleDiff(w.yaw, yaw) * (1 - Math.exp(-dt * 3.6));
      w.vx = w.vz = 0;
    }
    if (!active || g.seconds < state.probeAt || state.active.size >= BROWSE_LIMIT) return;
    state.probeAt = g.seconds + .74;
    const stores = nearby(g.world, g.avatar, 38).filter(s => s.kind !== 'bank')
      .sort((a, b) => dist2(g.avatar, a.origin) - dist2(g.avatar, b.origin)).slice(0, 3);
    for (const shop of stores) {
      if ([...state.active].some(w => w.windowBrowse53?.venueId === shop.venue.id)) continue;
      const target = shop.window;
      let choice, best = 5.4 ** 2;
      for (const w of g.pedestrians) {
        if (w.z >= target.z - .95 || target.z - w.z > 5.4 || Math.abs(w.x - target.x) > 4.4 || !eligible(g, state, w)) continue;
        const d = dist2(w, target);
        if (d >= best || dist2(w, shop.door) < 1.8 ** 2 || !sight(g.world, w, target)) continue;
        if (H.coast461.isRouteRoad(w.x, w.z)) continue;
        choice = w;
        best = d;
      }
      if (!choice) continue;
      const pause = 2.2 + (choice.appearance % 5) * .31;
      choice.windowBrowse53 = { x: target.x, z: target.z, venueId: shop.venue.id, until: g.seconds + pause };
      choice.navActivity = 'window';
      choice.pause = pause;
      choice.vx = choice.vz = 0;
      state.active.add(choice);
      if (state.active.size >= BROWSE_LIMIT) break;
    }
  }

  RC.installers.push(Game => {
    const P = Game.prototype, tick = P.tick, drawLabels = labelPool();
    P.tick = function (now) {
      const result = tick.call(this, now);
      drawLabels(this, now);
      return result;
    };
    const build = P.buildDynamic;
    P.buildDynamic = function () {
      const result = build.call(this);
      if (street(this)) for (const shop of shopsInView(this).slice(0, SIGN_LIMIT)) {
        shop.parts ??= frontageParts(shop);
        result.push(...shop.parts);
      }
      return result;
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this);
      if (!forFigure(this)) return result;
      const venue = this.preferredRetailDoor(this.nearestEntrance());
      if (!venue || this.flight51?.ownsInteraction() || H.stadium53?.canInteract?.(this)) return result;
      const shop = graph(this.world).keyed.get(venue.id), hint = document.getElementById('interact-hint');
      if (shop && hint) {
        hint.textContent = 'E · ' + shop.name + (shop.caption ? ' · ' + shop.caption : '') + ' · כניסה';
        hint.classList.remove('hidden');
      }
      return result;
    };
    const people = P.updatePedestrians;
    P.updatePedestrians = function (dt) {
      const result = people.call(this, dt);
      observeShops(this, dt);
      return result;
    };
  });
  H.stage53Shops = { graph, frontageParts, project, projectCamera, observeShops, registerSign };
})(Heatline);
