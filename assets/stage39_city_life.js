/* SUNSET STATE — Stage 39: a lived-in, inviting coastal city (GTA-6 inspired,
 * original content). Everything is generated procedurally from the existing
 * world data and placed on the real ground height:
 *  - gentle rolling terrain (realistic 2-5% street grades),
 *  - palm-lined avenues, flower planters, hydrants, bins, bike racks, kiosks,
 *    food carts, café terraces with umbrellas and string lights, neon signs,
 *  - building balconies with railings and plants, AC units, cornices,
 *    rooftop water tanks / antennas / solar panels / roof gardens,
 *  - lobby entrances with canopies, wall lights, steps, planters, door frames,
 *  - a finished elevator cab and furnished apartment rooms.
 * Disable with ?cityLifeOff=1 (terrain: ?terrainFlat=1).
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  const OFF = params.has('cityLifeOff') || params.has('realismOff');
  const stats = RC.cityStats = { boxes: 0, palms: 0, planters: 0, cafes: 0, entrances: 0, balconies: 0, rooftops: 0, neon: 0, solids: 0, interiors: 0 };
  if (OFF) return;

  /* ---------------- Terrain: realistic rolling relief ---------------- */
  if (!params.has('terrainFlat') && typeof H.hills442 === 'function' && !H.hills442.__rc39) {
    const base = H.hills442;
    const relief = (x, z) =>
      5.2 * Math.sin(x / 292 + .6) * Math.sin(z / 341 - .3) +
      3.1 * Math.sin((x * .8 + z * .6) / 233 + 1.9) +
      1.7 * Math.sin((x - 1.7 * z) / 186 + .4);
    const wrapped = (x, z) => base(x, z) + relief(x, z) + 2.4;
    wrapped.__rc39 = true;
    H.hills442 = wrapped;
    RC.terrainRelief = relief;
  }

  /* ---------------- helpers ---------------- */
  const hash = (a, b) => { let h = Math.imul(Math.round(a * 7.3) | 0, 73856093) ^ Math.imul(Math.round(b * 7.3) | 0, 19349663); h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ground = (x, z) => { const y = H.outdoorHeight(x, z); return Number.isFinite(y) ? y : 0; };

  function makeEmitter(world) {
    const out = [];
    const add = (x, y, z, w, h, d, color, material, opts = {}) => {
      const b = H.box(x, y, z, w, h, d, color, opts.yaw || 0, opts.layer ?? 4, opts.glow || 0);
      if (opts.shape) b.shape = opts.shape;
      if (material) b.material = material;
      if (opts.pitch) b.pitch = opts.pitch;
      if (opts.roll) b.roll = opts.roll;
      b.visibilityCap = opts.cap ?? 260;
      if (opts.lodMax) b.lodMax = opts.lodMax;
      b.cityLife39 = true;
      out.push(b);
      return b;
    };
    return { out, add };
  }
  // Local frame: origin (ox,oz), yaw (forward -z rotated), returns world coords.
  const frame = (ox, oz, yaw) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return (lx, lz) => [ox + c * lx + s * lz, oz - s * lx + c * lz];
  };

  /* ---------------- props ---------------- */
  function palm(E, x, z, y, seed) {
    const h = 7.5 + seed * 4.5, lean = (seed - .5) * .35, dir = seed * 6.28;
    const segs = 7;
    let px = x, pz = z, py = y;
    for (let i = 0; i < segs; i++) {
      const t = i / segs, sh = h / segs;
      const bend = lean * t * t;
      const nx = x + Math.cos(dir) * bend * h * .35, nz = z + Math.sin(dir) * bend * h * .35;
      const r = .34 - .12 * t;
      E.add((px + nx) / 2, py + sh / 2, (pz + nz) / 2, r, sh * 1.05, r, i % 2 ? '#8a7356' : '#7d6750', 'bark', { shape: 'cylinder', cap: 400 });
      px = nx; pz = nz; py += sh;
    }
    E.add(px, py + .2, pz, .55, .5, .55, '#6b5a3c', 'bark', { shape: 'rounded', cap: 400 });
    const fronds = 11;
    for (let i = 0; i < fronds; i++) {
      const a = i / fronds * 6.283 + seed * 3;
      const len = 3.6 + hash(i, seed * 99) * 1.2;
      const droop = .35 + hash(seed * 51, i) * .35;
      const cx = px + Math.cos(a) * len * .45, cz = pz + Math.sin(a) * len * .45;
      E.add(cx, py + .25 - droop * .9, cz, .62, .07, len, i % 3 ? '#4d7a31' : '#5f8a37', 'foliage',
        { yaw: -a + Math.PI / 2, pitch: droop, cap: 400 });
    }
    for (let i = 0; i < 3; i++) E.add(px + Math.cos(i * 2.1) * .3, py - .15, pz + Math.sin(i * 2.1) * .3, .2, .2, .2, '#7a5a2a', 'wood', { shape: 'rounded', cap: 120 });
    stats.palms++;
    return { x, z, hw: .4, hd: .4 };
  }
  function planter(E, x, z, y, yaw, seed) {
    const L = frame(x, z, yaw);
    E.add(x, y + .3, z, 2.4, .6, 1.0, '#d9d2c3', 'concrete', { yaw });
    E.add(x, y + .62, z, 2.25, .08, .86, '#4a3527', 'wood', { yaw });
    const flowers = ['#e84a7a', '#f2c230', '#ff7a3a', '#c05ad8', '#f5f0e6', '#e8343a'];
    for (let i = 0; i < 5; i++) {
      const [bx, bz] = L(-.9 + i * .45, (hash(i, seed * 7) - .5) * .3);
      E.add(bx, y + .85, bz, .5, .45, .5, i % 2 ? '#4f7f35' : '#3f6d2e', 'foliage', { shape: 'sphere_lod38', cap: 200 });
      E.add(bx, y + 1.06, bz, .16, .12, .16, flowers[(i + Math.floor(seed * 6)) % flowers.length], 'fabric', { shape: 'rounded', cap: 90 });
    }
    stats.planters++;
    return { x, z, hw: 1.15, hd: 1.15 };
  }
  function hydrant(E, x, z, y) {
    E.add(x, y + .38, z, .26, .76, .26, '#c8322a', 'paint', { shape: 'cylinder', cap: 140 });
    E.add(x, y + .8, z, .3, .14, .3, '#c8322a', 'paint', { shape: 'rounded', cap: 140 });
    E.add(x, y + .5, z, .46, .1, .1, '#d9b43a', 'metal', { cap: 120 });
  }
  function bin(E, x, z, y, yaw) {
    E.add(x, y + .5, z, .62, 1.0, .62, '#2f5a46', 'paint', { yaw, shape: 'rounded', cap: 160 });
    E.add(x, y + 1.04, z, .66, .08, .66, '#24272a', 'metal', { yaw, cap: 160 });
  }
  function bikeRack(E, x, z, y, yaw, seed) {
    const L = frame(x, z, yaw);
    for (let i = 0; i < 4; i++) {
      const [bx, bz] = L(-1.2 + i * .8, 0);
      E.add(bx, y + .45, bz, .06, .9, .7, '#9aa3a8', 'metal', { yaw, cap: 120 });
      if (hash(seed * 31, i) > .45) {
        const col = ['#c43d3d', '#2f6aa8', '#e2b23a', '#2f2f33', '#3d8a5a'][i];
        E.add(bx + .02, y + .55, bz, .05, .5, 1.6, col, 'paint', { yaw, cap: 110 });
        for (const s of [-.55, .55]) { const [wx, wz] = L(-1.2 + i * .8, s); E.add(wx, y + .34, wz, .05, .66, .66, '#1d1e20', 'rubber', { yaw: yaw + Math.PI / 2, shape: 'cylinder', cap: 110 }); }
      }
    }
  }
  function kiosk(E, x, z, y, yaw, seed) {
    const L = frame(x, z, yaw);
    const tone = ['#e86a4a', '#3aa6a0', '#f2b43a', '#e85a8a'][Math.floor(seed * 4)];
    E.add(x, y + 1.1, z, 2.6, 2.2, 2.0, '#f4efe4', 'paint', { yaw, cap: 320 });
    E.add(x, y + 2.35, z, 3.3, .18, 2.7, tone, 'paint', { yaw, cap: 320 });
    const [fx, fz] = L(0, -1.02);
    E.add(fx, y + 1.25, fz, 2.2, .9, .05, '#1c2a30', 'glass', { yaw, cap: 200 });
    E.add(fx, y + 2.05, fz, 2.4, .32, .06, tone, null, { yaw, glow: .9, cap: 300 });
    const [cx, cz] = L(0, -1.35);
    E.add(cx, y + .95, cz, 2.6, .08, .5, '#c9b08a', 'wood', { yaw, cap: 160 });
    return { x, z, hw: 1.5, hd: 1.5 };
  }
  function umbrellaTable(E, x, z, y, seed) {
    const stripes = [['#e8473f', '#f6efe2'], ['#2a8fb0', '#f6efe2'], ['#f2b230', '#2b5a50'], ['#e0608a', '#fff4e8']][Math.floor(seed * 4)];
    E.add(x, y + .37, z, .9, .05, .9, '#f2eee6', 'paint', { shape: 'cylinder', cap: 150 });
    E.add(x, y + .19, z, .08, .38, .08, '#3a3d40', 'metal', { cap: 150 });
    E.add(x, y + 1.25, z, .05, 2.5, .05, '#d6d2c8', 'metal', { cap: 200 });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283;
      E.add(x + Math.cos(a) * .72, y + 2.38, z + Math.sin(a) * .72, .95, .04, 1.5, stripes[i % 2], 'fabric', { yaw: -a + Math.PI / 2, pitch: .32, cap: 240 });
    }
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + seed;
      E.add(x + Math.cos(a) * .85, y + .23, z + Math.sin(a) * .85, .45, .46, .45, '#c8a27a', 'wood', { cap: 120 });
    }
  }
  function stringLights(E, x0, z0, x1, z1, y, seed) {
    const n = Math.max(4, Math.round(Math.hypot(x1 - x0, z1 - z0) / .8));
    for (let i = 0; i <= n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * .55;
      const col = ['#ffd9a0', '#ffe8c2', '#ffc98a'][(i + Math.floor(seed * 3)) % 3];
      E.add(x0 + (x1 - x0) * t, y - sag, z0 + (z1 - z0) * t, .09, .12, .09, col, null, { glow: 1.25, cap: 200 });
    }
  }
  function neonBlade(E, x, y, z, yaw, seed) {
    const L = frame(x, z, yaw);
    const col = ['#ff3fa4', '#36e0ff', '#ff9a2e', '#b46bff', '#3dff9c'][Math.floor(seed * 5)];
    E.add(x, y, z, .18, 4.2, 1.1, '#1a1d22', 'metal', { yaw, cap: 700 });
    for (const s of [-1, 1]) {
      const [nx, nz] = L(s * .1, 0);
      E.add(nx, y, nz, .05, 3.8, .9, col, null, { yaw, glow: 1.6, cap: 550 });
    }
    stats.neon++;
  }

  /* ---------------- streets ---------------- */
  function buildStreets(world, E, solids) {
    const roads = (world.roads461 || []).filter(r => Array.isArray(r.points) && r.points.length > 1);
    const segs = [];
    for (const r of roads) for (let i = 1; i < r.points.length; i++) segs.push({ a: r.points[i - 1], b: r.points[i], hw: (r.width || 14) / 2, road: r });
    const cell = 40, grid = new Map();
    const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    for (const s of segs) {
      const minx = Math.min(s.a.x, s.b.x) - s.hw - 4, maxx = Math.max(s.a.x, s.b.x) + s.hw + 4;
      const minz = Math.min(s.a.z, s.b.z) - s.hw - 4, maxz = Math.max(s.a.z, s.b.z) + s.hw + 4;
      for (let gx = Math.floor(minx / cell); gx <= Math.floor(maxx / cell); gx++)
        for (let gz = Math.floor(minz / cell); gz <= Math.floor(maxz / cell); gz++) {
          const k = gx + ',' + gz; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(s);
        }
    }
    const onRoad = (x, z, pad) => {
      for (const s of grid.get(key(x, z)) || []) {
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / L2));
        const ex = s.a.x + dx * t - x, ez = s.a.z + dz * t - z;
        if (ex * ex + ez * ez < (s.hw + pad) ** 2) return true;
      }
      return false;
    };
    const blds = (world.buildings || []).concat(world.annexBuildings || []).filter(b => Number.isFinite(b.x) && b.w && b.d);
    const inBuilding = (x, z, pad) => blds.some(b => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);
    const taken = new Set();
    const spot = (x, z, r) => { const k = `${Math.round(x / r)},${Math.round(z / r)}`; if (taken.has(k)) return false; taken.add(k); return true; };
    for (const l of world.lights || []) spot(l.x, l.z, 4);
    const land = (x, z) => { try { return H.coast461?.land ? H.coast461.land(x, z) !== false : true; } catch { return true; } };
    let slot = 0;
    for (const r of roads) {
      const hw = (r.width || 14) / 2;
      const avenue = hw > 7.5;
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1], b = r.points[i];
        const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
        if (len < 8) continue;
        const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
        const yaw = Math.atan2(-ux, -uz);
        for (let t = 9; t < len - 9; t += 7) {
          for (const side of [-1, 1]) {
            slot++;
            const off = hw + 2.3;
            const x = a.x + ux * t + nx * off * side, z = a.z + uz * t + nz * off * side;
            if (Math.abs(x) > 1000 || Math.abs(z) > 800) continue;
            if (onRoad(x, z, 1.0) || inBuilding(x, z, 1.4) || !land(x, z)) continue;
            if (!spot(x, z, 5)) continue;
            const y = ground(x, z);
            const h = hash(x, z);
            if (avenue && slot % 3 === 0) { solids.push(palm(E, x, z, y, h)); continue; }
            if (h < .16) solids.push(planter(E, x, z, y, yaw, h));
            else if (h < .26) hydrant(E, x, z, y);
            else if (h < .38) bin(E, x, z, y, yaw);
            else if (h < .45) bikeRack(E, x, z, y, yaw, h);
            else if (h < .49 && !onRoad(x + nx * side * 3, z + nz * side * 3, 1)) solids.push(kiosk(E, x + nx * side * 1.2, z + nz * side * 1.2, y, yaw + (side > 0 ? 0 : Math.PI), h));
            else if (!avenue && h > .82) solids.push(palm(E, x, z, y, h));
          }
        }
      }
    }
  }

  /* ---------------- cafés, awnings, neon ---------------- */
  function buildFrontages(world, E, solids) {
    const blds = world.buildings || [];
    const shops = (world.retailShops || []).concat(world.streetVenues || []);
    const seen = new Set();
    for (const v of shops) {
      const fx = v.frontageX ?? v.x, fz = v.frontageZ ?? v.z;
      if (!Number.isFinite(fx) || !Number.isFinite(fz)) continue;
      const k = Math.round(fx / 6) + ',' + Math.round(fz / 6);
      if (seen.has(k)) continue; seen.add(k);
      const b = blds[v.buildingId];
      let ox = 0, oz = 0;
      if (b) { const ddx = fx - b.x, ddz = fz - b.z; if (Math.abs(ddx) / (b.w || 1) > Math.abs(ddz) / (b.d || 1)) ox = Math.sign(ddx); else oz = Math.sign(ddz); }
      else if (Number.isFinite(v.x)) { const ddx = fx - v.x, ddz = fz - v.z; if (Math.abs(ddx) > Math.abs(ddz)) ox = Math.sign(ddx); else oz = Math.sign(ddz); }
      if (!ox && !oz) oz = 1;
      const yaw = Math.atan2(-ox, -oz); // local -z points away from the facade
      const L = frame(fx, fz, yaw);
      const y = ground(fx, fz);
      const h = hash(fx, fz);
      const stripe = [['#d8473d', '#f3ecdf'], ['#22708a', '#efe9dc'], ['#3d7a4a', '#f2eadb'], ['#e0a33a', '#3a2f2a'], ['#8a3d6a', '#f4e9e0']][Math.floor(h * 5)];
      // Striped awning over the shop front.
      for (let i = 0; i < 8; i++) {
        const [ax, az] = L(-3.15 + i * .9, -1.0);
        E.add(ax, y + 3.05, az, .9, .06, 2.2, stripe[i % 2], 'fabric', { yaw, pitch: -.38, cap: 320 });
      }
      const [vx, vz] = L(0, -2.05);
      E.add(vx, y + 2.6, vz, 7.2, .28, .06, stripe[0], 'fabric', { yaw, cap: 260 });
      // Terrace: tables with umbrellas, string lights, planters.
      if (h > .35) {
        for (let i = 0; i < 3; i++) { const [tx, tz] = L(-3 + i * 3, -4.2); umbrellaTable(E, tx, tz, ground(tx, tz), hash(i, h * 77)); }
        const [s0x, s0z] = L(-4.5, -2.2), [s1x, s1z] = L(4.5, -6.5);
        stringLights(E, s0x, s0z, s1x, s1z, y + 3.4, h);
        const [p0x, p0z] = L(-4.6, -6.4);
        E.add(p0x, y + 1.7, p0z, .08, 3.4, .08, '#2a2c2e', 'metal', { cap: 200 });
        for (let i = 0; i < 2; i++) { const [cx, cz] = L(5.4 + i * .9, -1.6); scooter(E, cx, cz, ground(cx, cz), yaw + Math.PI / 2, hash(i, h * 13)); }
        stats.cafes++;
      }
      // Glowing shop sign over the awning.
      const [sx, sz] = L(0, -.25);
      E.add(sx, y + 3.75, sz, 3.6, .55, .08, ['#ffd27a', '#7ae0ff', '#ff7ab8', '#a7ff8a'][Math.floor(h * 4)], null, { yaw, glow: 1.1, cap: 420 });
    }
    // Vertical neon blades on commercial corners.
    for (const b of blds) {
      if (!(b.h > 12) || hash(b.x, b.z) < .45) continue;
      const kind = String(b.kind || '');
      if (/prison|industrial|service|warehouse/.test(kind)) continue;
      const sx = Math.sign(hash(b.z, b.x) - .5) || 1;
      const x = b.x + sx * (b.w / 2 + .6), z = b.z + b.d / 2 - 2.5;
      const base = (b.stage42Ground ?? ground(b.x, b.z));
      neonBlade(E, x, base + 6.5, z, Math.PI / 2, hash(x, z));
    }
  }

  /* ---------------- buildings: balconies, AC, rooftops, cornices ---------------- */
  function buildArchitecture(world, E) {
    for (const b of world.buildings || []) {
      if (!(b.h > 8) || !b.w || !b.d) continue;
      const base = b.stage42Ground ?? ground(b.x, b.z);
      const roof = base + b.h;
      const seed = hash(b.x, b.z);
      const residential = /resid|apart|home|hotel/i.test(String(b.kind || '')) || seed > .55;
      const floors = Math.floor((b.h - 4) / 3.28);
      // Cornice band at the roof line.
      E.add(b.x, roof + .15, b.z, b.w + .5, .3, b.d + .5, '#e6dfd2', 'concrete', { cap: 1400 });
      // Balconies on the two long facades.
      if (residential && floors >= 2) {
        const faces = b.w >= b.d ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
        for (const [fx, fz] of faces) {
          const span = fx ? b.d : b.w;
          const bays = Math.max(1, Math.floor(span / 6.2));
          for (let f = 1; f < Math.min(floors, 14); f++) {
            const y = base + 1.1 + f * 3.28;
            for (let k = 0; k < bays; k++) {
              if (hash(k + f * 13, seed * 97) < .30) continue;
              const along = -span / 2 + (k + .5) * span / bays;
              const x = b.x + (fx ? fx * (b.w / 2 + .75) : along), z = b.z + (fz ? fz * (b.d / 2 + .75) : along);
              const w = 3.4, yaw = fx ? Math.PI / 2 : 0;
              E.add(x, y - .1, z, w, .16, 1.5, '#ddd7cc', 'concrete', { yaw, cap: 400 });
              const L = frame(x, z, yaw);
              const [rx, rz] = L(0, (fz || fx) > 0 ? .72 : -.72);
              E.add(rx, y + .45, rz, w, .95, .04, '#9fb6bf', 'glass', { yaw, cap: 260 });
              E.add(rx, y + .95, rz, w + .04, .06, .08, '#2b2f33', 'metal', { yaw, cap: 260 });
              if (hash(k, f + seed) > .55) E.add(x + (fx ? 0 : .9), y + .32, z + (fz ? 0 : .9), .55, .5, .55, '#4b7a34', 'foliage', { shape: 'sphere_lod38', cap: 200 });
              if (hash(f, k + seed * 3) > .7) {
                const [ax, az] = L(1.25, (fz || fx) > 0 ? -.25 : .25);
                E.add(ax, y + .3, az, .8, .55, .35, '#cfd2d0', 'metal', { yaw, cap: 220 });
              }
              stats.balconies++;
            }
          }
        }
      }
      // Wall-mounted AC units on the short facades.
      for (let i = 0; i < Math.min(10, floors); i++) {
        if (hash(i, seed * 41) > .55) continue;
        const side = i % 2 ? 1 : -1;
        const along = (hash(seed, i) - .5) * (b.w >= b.d ? b.d : b.w) * .7;
        const y = base + 2 + i * 3.28;
        if (b.w >= b.d) E.add(b.x + side * (b.w / 2 + .3), y, b.z + along, .55, .55, .85, '#d8dad6', 'metal', { cap: 260 });
        else E.add(b.x + along, y, b.z + side * (b.d / 2 + .3), .85, .55, .55, '#d8dad6', 'metal', { cap: 260 });
      }
      // Rooftop equipment.
      const L = frame(b.x, b.z, 0);
      const tanks = 1 + Math.floor(seed * 3);
      for (let i = 0; i < tanks; i++) {
        const [tx, tz] = L((hash(i, seed) - .5) * b.w * .5, (hash(seed, i * 7) - .5) * b.d * .5);
        E.add(tx, roof + 1.5, tz, 2.4, 2.6, 2.4, '#8c7a62', 'wood', { shape: 'cylinder', cap: 550 });
        E.add(tx, roof + 2.95, tz, 2.6, .5, 2.6, '#3e3a36', 'metal', { shape: 'wedge', cap: 550 });
        for (const [lx, lz] of [[-.9, -.9], [.9, -.9], [-.9, .9], [.9, .9]]) E.add(tx + lx, roof + .2, tz + lz, .12, .4, .12, '#3a3a3a', 'metal', { cap: 300 });
      }
      for (let i = 0; i < 2 + Math.floor(seed * 4); i++) {
        const [ux, uz] = L((hash(i * 3, seed) - .5) * b.w * .7, (hash(seed * 5, i) - .5) * b.d * .7);
        E.add(ux, roof + .55, uz, 1.6, 1.1, 1.0, '#b9bdbb', 'metal', { cap: 380 });
      }
      if (seed > .5) E.add(b.x + b.w * .3, roof + 4, b.z - b.d * .25, .08, 8, .08, '#c9cbcc', 'metal', { cap: 1200 });
      if (seed > .3 && seed < .65) {
        for (let i = 0; i < 6; i++) {
          const [px, pz] = L(-b.w * .3 + (i % 3) * 2.2, b.d * .2 + Math.floor(i / 3) * 1.5);
          E.add(px, roof + .6, pz, 2, .06, 1.2, '#20304a', 'glass', { pitch: -.45, cap: 600 });
        }
      } else if (seed >= .65) {
        // Roof garden with deck and planting.
        const [gx, gz] = L(0, -b.d * .15);
        E.add(gx, roof + .12, gz, b.w * .45, .2, b.d * .3, '#a07a54', 'wood', { cap: 700 });
        for (let i = 0; i < 6; i++) {
          const [px, pz] = L((hash(i, seed * 9) - .5) * b.w * .4, -b.d * .15 + (hash(seed * 9, i) - .5) * b.d * .25);
          E.add(px, roof + .7, pz, 1.1, 1.0, 1.1, '#4f8536', 'foliage', { shape: 'sphere_lod38', cap: 500 });
        }
      }
      stats.rooftops++;
    }
  }

  /* ---------------- lobby entrances ---------------- */
  const FACING = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };
  function buildEntrances(world, E) {
    for (const p of world.entrancePortals || []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
      let [ox, oz] = FACING[p.facing] || [0, 1];
      if (Number.isFinite(p.buildingX)) {
        const dx = p.x - p.buildingX, dz = p.z - p.buildingZ;
        if (ox && Math.sign(dx) && Math.sign(dx) !== ox) ox = -ox;
        if (oz && Math.sign(dz) && Math.sign(dz) !== oz) oz = -oz;
      }
      const yaw = Math.atan2(-ox, -oz);
      const L = frame(p.x, p.z, yaw);
      const y = ground(p.x, p.z);
      const w = Math.max(3, (p.width || 3.6) + 1.2);
      const [cx, cz] = L(0, -1.35);
      E.add(cx, y + 3.35, cz, w + .6, .16, 2.9, '#2d3236', 'metal', { yaw, cap: 320 });
      E.add(cx, y + 3.25, cz, w + .4, .04, 2.7, '#e9f1f4', 'glass', { yaw, cap: 260 });
      for (const s of [-1, 1]) {
        const [lx, lz] = L(s * (w / 2 + .35), -.12);
        E.add(lx, y + 2.3, lz, .18, .42, .16, '#ffe2b0', null, { yaw, glow: 1.3, cap: 320 });
        const [fx, fz] = L(s * (w / 2 + .05), -.08);
        E.add(fx, y + 1.55, fz, .16, 3.1, .18, '#8a6a42', 'bronze471', { yaw, cap: 220 });
        const [px, pz] = L(s * (w / 2 + 1.1), -1.0);
        E.add(px, y + .42, pz, .7, .84, .7, '#cfc7b8', 'concrete', { yaw, shape: 'cylinder', cap: 200 });
        E.add(px, y + 1.15, pz, .85, .9, .85, '#477a33', 'foliage', { shape: 'sphere_lod38', cap: 200 });
      }
      const [sx, sz] = L(0, -.8);
      E.add(sx, y + .07, sz, w + .4, .14, 1.6, '#d8d3c8', 'travertine471', { yaw, cap: 200 });
      const [mx, mz] = L(0, -.45);
      E.add(mx, y + .15, mz, 1.6, .02, .9, '#3a2f2a', 'fabric', { yaw, cap: 80 });
      const [nx, nz] = L(0, -.1);
      E.add(nx, y + 3.75, nz, 1.2, .28, .05, '#f6efe0', null, { yaw, glow: .9, cap: 260 });
      stats.entrances++;
    }
  }


  /* ---------------- building articulation: plinths, pilasters, parapets, billboards ---------------- */
  function buildArticulation(world, E) {
    const ads = [['#ff4f8b', '#ffd23f', '#2ec4d6'], ['#3a86ff', '#f1f1f1', '#ff006e'], ['#06d6a0', '#073b4c', '#ffd166'], ['#ff7b00', '#fff3e0', '#7b2cbf']];
    for (const b of world.buildings || []) {
      if (!(b.h > 6) || !b.w || !b.d) continue;
      const base = b.stage42Ground ?? ground(b.x, b.z), roof = base + b.h, seed = hash(b.z, b.x);
      const stone = ['#b9ad98', '#a89f92', '#c4b8a2', '#8f8a82'][Math.floor(seed * 4)];
      const hw = b.w / 2, hd = b.d / 2;
      // Stone plinth (ground-floor base) and roof parapet on all four sides.
      for (const [x, z, w, d] of [[b.x, b.z - hd - .08, b.w + .3, .3], [b.x, b.z + hd + .08, b.w + .3, .3], [b.x - hw - .08, b.z, .3, b.d + .3], [b.x + hw + .08, b.z, .3, b.d + .3]]) {
        E.add(x, base + .7, z, w, 1.4, d, stone, 'concrete', { cap: 520 });
        E.add(x, roof + .45, z, w, .9, d, '#d9d3c7', 'concrete', { cap: 1200 });
      }
      // Vice-City style neon roof outline on towers; warm uplights at the base.
      if (b.h > 24 && seed > .35) {
        const neon = ['#ff2fa0', '#29e3ff', '#b45cff', '#ff8a2b', '#2bff9c'][Math.floor(hash(seed, b.h) * 5)];
        for (const [x, z, w, d] of [[b.x, b.z - hd - .2, b.w + .5, .12], [b.x, b.z + hd + .2, b.w + .5, .12], [b.x - hw - .2, b.z, .12, b.d + .5], [b.x + hw + .2, b.z, .12, b.d + .5]])
          E.add(x, roof + .95, z, w, .14, d, neon, null, { glow: 1.4, cap: 2400 });
        stats.neonOutlines = (stats.neonOutlines || 0) + 1;
      }
      if (seed < .5) for (const [x, z, w, d] of [[b.x, b.z - hd - .25, b.w * .9, .1], [b.x, b.z + hd + .25, b.w * .9, .1]])
        E.add(x, base + 1.45, z, w, .08, d, '#ffd6a0', null, { glow: .9, cap: 420 });
      // Hedges in front of residential facades, clear of the lobby doors.
      if (/resid|apart|home/i.test(String(b.kind || '')) || seed > .6) {
        const doors = (world.entrancePortals || []).filter(p => Math.abs(p.x - b.x) < hw + 6 && Math.abs(p.z - b.z) < hd + 6);
        for (const sz of [-1, 1]) {
          const z = b.z + sz * (hd + 1.15);
          for (let x = b.x - hw + 1.2; x < b.x + hw - 1.2; x += 1.8) {
            if (doors.some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
            const y = ground(x, z);
            E.add(x, y + .45, z, 1.75, .9, .8, hash(x, z) > .5 ? '#3f6e31' : '#4a7a36', 'foliage', { shape: 'rounded', cap: 260 });
          }
        }
        stats.hedges = (stats.hedges || 0) + 1;
      }
      // Corner pilasters.
      if (b.h > 12) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        E.add(b.x + sx * (hw + .1), base + b.h / 2, b.z + sz * (hd + .1), .7, b.h, .7, '#e3ddd1', 'concrete', { cap: 1500 });
      // Lit rooftop billboard on some mid-rise buildings.
      if (b.h > 16 && b.h < 70 && seed > .72) {
        const pal = ads[Math.floor(hash(b.x, seed) * ads.length)];
        const along = b.w >= b.d, w = Math.min(14, (along ? b.w : b.d) * .6);
        const yaw = along ? 0 : Math.PI / 2;
        const bx = b.x + (along ? 0 : hw * .35), bz = b.z + (along ? hd * .35 : 0);
        for (const s of [-1, 1]) {
          const L = frame(bx, bz, yaw); const [lx, lz] = L(s * w * .35, 0);
          E.add(lx, roof + 2.2, lz, .25, 4.4, .25, '#3b3f44', 'metal', { yaw, cap: 1200 });
        }
        E.add(bx, roof + 6.2, bz, w + .4, 4.4, .35, '#2a2d31', 'metal', { yaw, cap: 1400 });
        const L = frame(bx, bz, yaw);
        for (let i = 0; i < 3; i++) {
          const [px, pz] = L(-w / 3 + i * w / 3, -.2);
          E.add(px, roof + 6.2, pz, w / 3 - .15, 3.9, .06, pal[i], null, { yaw, glow: .55, cap: 1500 });
          const [qx, qz] = L(-w / 3 + i * w / 3, .2);
          E.add(qx, roof + 6.2, qz, w / 3 - .15, 3.9, .06, pal[2 - i], null, { yaw, glow: .55, cap: 1500 });
        }
        stats.billboards = (stats.billboards || 0) + 1;
      }
    }
  }
  function scooter(E, x, z, y, yaw, seed) {
    const L = frame(x, z, yaw), col = ['#e63946', '#f1faee', '#a8dadc', '#ffb703', '#2a9d8f'][Math.floor(seed * 5)];
    E.add(x, y + .45, z, .32, .35, 1.1, col, 'paint', { yaw, shape: 'rounded', cap: 130 });
    const [sx, sz] = L(0, .15); E.add(sx, y + .72, sz, .3, .1, .55, '#1d1d1f', 'fabric', { yaw, cap: 110 });
    const [hx, hz] = L(0, -.55); E.add(hx, y + .85, hz, .5, .06, .06, '#2b2b2b', 'metal', { yaw, cap: 110 });
    for (const t of [-.5, .5]) { const [wx, wz] = L(0, t); E.add(wx, y + .2, wz, .1, .4, .4, '#151515', 'rubber', { yaw, cap: 110 }); }
  }
  function lightenLegacySpheres(world) {
    let n = 0;
    for (const b of world.boxes) if (b.shape === 'sphere' && b.lodMin === undefined && b.lodMax === undefined && Math.max(b.w, b.h, b.d) < 2.2) { b.shape = 'sphere_lod38'; n++; }
    stats.spheresLightened = n;
  }
  /* ---------------- interiors ---------------- */
  function decorateInterior(scene, plan) {
    if (!scene || scene.__rc39 || !Array.isArray(scene.boxes)) return scene;
    scene.__rc39 = true;
    const boxes = scene.boxes;
    const add = (x, y, z, w, h, d, color, material, glow = 0, shape) => {
      const b = H.box(x, y, z, w, h, d, color, 0, 4, glow);
      if (material) b.material = material;
      if (shape) b.shape = shape;
      boxes.push(b); return b;
    };
    const floorTop = (x, z) => {
      let best = -Infinity;
      for (const b of boxes) {
        if (b.h > .45 || Math.abs(x - b.x) > b.w / 2 || Math.abs(z - b.z) > b.d / 2) continue;
        const top = b.y + b.h / 2;
        if (top > best && (best === -Infinity || top < best + 1.2)) best = Math.max(best, top);
      }
      return best;
    };
    const rugs = ['#8a3b2e', '#2e4a6a', '#6a5a3a', '#3a5a4a', '#7a2f4a'];
    for (const [i, r] of (scene.rooms || []).entries()) {
      if (!Number.isFinite(r.x) || !Number.isFinite(r.z)) continue;
      const y = floorTop(r.x, r.z);
      if (!Number.isFinite(y)) continue;
      const seed = hash(r.x, r.z);
      add(r.x, y + .012, r.z, 2.6, .02, 1.8, rugs[i % rugs.length], 'fabric');
      add(r.x + .9, y + .02, r.z + .55, .8, .015, .5, '#e8dcc0', 'fabric');
      const ceiling = y + (plan.floorHeight || 3.28) - .35;
      add(r.x, ceiling - .25, r.z, .02, .5, .02, '#2a2a2a', 'metal');
      add(r.x, ceiling - .55, r.z, .45, .22, .45, '#fff1d6', null, 1.2, 'sphere');
      const px = r.x + (seed > .5 ? 1.6 : -1.6), pz = r.z - 1.1;
      add(px, y + .25, pz, .42, .5, .42, '#c7b9a4', 'concrete', 0, 'cylinder');
      add(px, y + .85, pz, .7, .9, .7, '#3f7a35', 'foliage', 0, 'sphere_lod38');
      if (r.use === 'home' || r.use === 'suite' || r.use === 'reading') {
        add(r.x - 1.5, y + .75, r.z + 1.2, .05, 1.5, .05, '#2a2a2a', 'metal');
        add(r.x - 1.5, y + 1.55, r.z + 1.2, .38, .3, .38, '#ffe6bd', null, 1.0, 'cylinder');
      }
    }
    stats.interiors++;
    return scene;
  }
  function decorateCabin(original) {
    return function (x, z, footY, out, open = 0) {
      const result = original.call(this, x, z, footY, out, open);
      try {
        const add = (xx, yy, zz, w, h, d, col, mat, glow = 0) => { const b = H.box(xx, yy, zz, w, h, d, col, 0, 4, glow); if (mat) b.material = mat; out.push(b); };
        add(x, footY + 2.42, z + .43, 1.15, .03, 1.0, '#fff6e6', null, 1.4);
        add(x, footY + .95, z + 1.2, 1.3, .05, .06, '#c9a46a', 'bronze471');
        add(x, footY + 1.45, z + 1.24, .9, 1.2, .02, '#d8e4ea', 'metal');
        add(x + .66, footY + 1.2, z + .2, .02, .32, .14, '#20262a', 'metal');
        for (let i = 0; i < 4; i++) add(x + .675, footY + 1.08 + i * .07, z + .2, .01, .03, .03, '#9fe0ff', null, 1.2);
        add(x, footY + .012, z + .43, 1.25, .02, 1.05, '#5a4636', 'wood');
      } catch { }
      return result;
    };
  }

  /* ---------------- install ---------------- */
  RC.installers.push(function installCityLife(Game) {
    if (typeof H.makeElevatorCabin === 'function' && !H.makeElevatorCabin.__rc39) {
      H.makeElevatorCabin = decorateCabin(H.makeElevatorCabin);
      H.makeElevatorCabin.__rc39 = true;
    }
    // Seagull flocks gliding and flapping over the city (dynamic, a few boxes each).
    const build = Game.prototype.buildDynamic;
    Game.prototype.buildDynamic = function () {
      const out = build.call(this);
      if (this.inside || params.has('birdsOff')) return out;
      try {
        const c = this.cam, t = this.seconds || 0;
        for (let f = 0; f < 3; f++) {
          const cx = Math.round(c.x / 120) * 120 + (f - 1) * 90, cz = Math.round(c.z / 120) * 120 + (f % 2 ? 60 : -50);
          for (let i = 0; i < 6; i++) {
            const ph = t * (.16 + f * .03) + i * .55 + f * 2.1, r = 22 + i * 3 + f * 6;
            const x = cx + Math.cos(ph) * r, z = cz + Math.sin(ph) * r, y = 30 + f * 9 + Math.sin(t * .7 + i) * 2.5;
            const yaw = Math.PI - ph, flap = Math.sin(t * 9 + i * 1.3) * .55 * (Math.sin(t * .9 + i) > .2 ? 1 : .15);
            const body = H.box(x, y, z, .16, .14, .5, '#eceae4', yaw, 4); body.material = 'paint'; out.push(body);
            for (const sd of [-1, 1]) {
              const wx = x + Math.cos(yaw) * sd * .42, wz = z + Math.sin(yaw) * sd * .42;
              const wing = H.box(wx, y + Math.abs(flap) * .18, wz, .78, .025, .22, sd > 0 ? '#d9d7d0' : '#d4d2cb', yaw, 4);
              wing.roll = flap * sd; wing.material = 'paint'; out.push(wing);
            }
          }
        }
      } catch { }
      return out;
    };
    const sceneForFloor = Game.prototype.sceneForFloor;
    Game.prototype.sceneForFloor = function (plan, floor) {
      const scene = sceneForFloor.call(this, plan, floor);
      try { decorateInterior(scene, plan); } catch (error) { console.warn('[CityLife39] interior', error); }
      return scene;
    };
    const attach = Game.prototype.attachImportedModels441;
    // A restart builds a brand-new world: decorate whichever world is current.
    const upd = Game.prototype.update;
    Game.prototype.update = function (dt) { if (this.world && !this.world.__rcCityLife) decorate.call(this); return upd.call(this, dt); };
    Game.prototype.attachImportedModels441 = function () { const result = attach.call(this); decorate.call(this); return result; };
    function decorate() {
      const world = this.world;
      if (world && !world.__rcCityLife) {
        world.__rcCityLife = true;
        const t0 = performance.now();
        try {
          const E = makeEmitter(world), solids = [];
          buildStreets(world, E, solids);
          buildFrontages(world, E, solids);
          buildArchitecture(world, E);
          buildEntrances(world, E);
          buildArticulation(world, E);
          lightenLegacySpheres(world);
          for (const b of E.out) world.boxes.push(b);
          for (const s of solids) if (s && Number.isFinite(s.x)) world.solids.push(s);
          if (world.nearbyRegions473 instanceof Map) world.nearbyRegions473 = new Map();
          stats.boxes = E.out.length; stats.solids = solids.length;
        } catch (error) { console.warn('[CityLife39] city details failed', error); }
        stats.ms = Math.round(performance.now() - t0);
      }
    }
  });
})(Heatline);
