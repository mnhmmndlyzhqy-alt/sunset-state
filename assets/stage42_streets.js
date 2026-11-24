/* SUNSET STATE — Stage 43: streets and storefronts.
 * Streets are detected from the real top surface of the world (asphalt / sidewalk /
 * building), so every detail sits exactly on the road edges:
 *  - granite curbs + dark gutters, solid lane-edge lines, manholes and drains,
 *  - street trees in iron tree-pit grates along the sidewalks,
 *  - cars parked along the curb in the parking lane (real, collidable cars),
 *  - glass storefronts with mullions, lit signs and canopies on street-facing
 *    ground floors (skipping lobby entrances).
 * Disable: ?streetsOff=1
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('streetsOff') || params.has('realismOff') || params.has('cityLifeOff')) return;
  const stats = RC.streetStats = { curbs: 0, lines: 0, manholes: 0, trees: 0, parked: 0, shopfronts: 0 };
  const hash = (a, b) => { let h = Math.imul(Math.round(a * 7.3) | 0, 73856093) ^ Math.imul(Math.round(b * 7.3) | 0, 19349663); h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // Top-surface sampler over the static world.
  function makeSampler(world) {
    const C = 8, idx = new Map();
    for (const b of world.boxes) {
      if (b.cityLife39 || b.street42 || b.sea461 || b.yaw || b.pitch || b.roll) continue;
      const big = b.w * b.d >= 4;
      if (!big && !(b.h > 6)) continue;
      for (let x = Math.floor((b.x - b.w / 2) / C); x <= Math.floor((b.x + b.w / 2) / C); x++)
        for (let z = Math.floor((b.z - b.d / 2) / C); z <= Math.floor((b.z + b.d / 2) / C); z++) {
          const k = x * 100003 + z; let l = idx.get(k); if (!l) idx.set(k, l = []); l.push(b);
        }
    }
    return (x, z) => {
      const list = idx.get(Math.floor(x / C) * 100003 + Math.floor(z / C));
      let top = -1e9, mat = null, tall = false;
      if (list) for (const b of list) {
        if (Math.abs(x - b.x) > b.w / 2 || Math.abs(z - b.z) > b.d / 2) continue;
        if (b.h > 6 && b.layer >= 4) { tall = true; continue; }
        const t = b.y + b.h / 2 + (b.gradeX || 0) * (x - b.x) + (b.gradeZ || 0) * (z - b.z);
        if (t > top + .005) { top = t; mat = b.material || 'concrete'; }
      }
      return { top, mat: tall ? 'building' : mat };
    };
  }
  const isRoad = m => m === 'asphalt';
  const isWalk = m => m === 'paving' || m === 'concrete' || m === 'tactile_paving473';

  function build(game, world, E) {
    const S = makeSampler(world);
    const BLOCK = H.BLOCK || 108, LIM = Math.min(H.WORLD_LIMIT || 1188, 900);
    const newParked = [];
    const taken = new Set(), spot = (x, z, r) => { const k = Math.round(x / r) + ',' + Math.round(z / r); if (taken.has(k)) return false; taken.add(k); return true; };
    for (const c of game.parked || []) spot(c.x, c.z, 5);
    for (let k = -9; k <= 9; k++) for (const vertical of [true, false]) {
      const axis = k * BLOCK;
      let runStart = null, prev = null;
      const flush = (endT) => {
        if (runStart == null || endT - runStart.t < 6) { runStart = null; return; }
        const hw = runStart.hw, pieces = Math.max(1, Math.round((endT - runStart.t) / 10));
        const plen = (endT - runStart.t) / pieces;
        for (let pi = 0; pi < pieces; pi++) {
          const a0 = runStart.t + pi * plen, a1 = a0 + plen, mid = (a0 + a1) / 2;
          for (const side of [-1, 1]) {
            const edge = axis + side * (hw - .6);
            const y0 = S(vertical ? edge : a0, vertical ? a0 : edge).top, y1 = S(vertical ? edge : a1, vertical ? a1 : edge).top;
            if (!(y0 > -1e8 && y1 > -1e8)) continue;
            const y = (y0 + y1) / 2, slope = (y1 - y0) / plen;
            const g = vertical ? { gradeZ: slope } : { gradeX: slope };
            const off = axis + side * (hw + .15);
            E.add(vertical ? off : mid, y + .07, vertical ? mid : off, vertical ? .3 : plen, .16, vertical ? plen : .3, '#b8b4ab', 'concrete', { cap: 420, ...g });
            const goff = axis + side * (hw - .3);
            E.add(vertical ? goff : mid, y + .03, vertical ? mid : goff, vertical ? .45 : plen, .03, vertical ? plen : .45, '#3a3b3c', 'concrete', { cap: 170, ...g });
            const loff = axis + side * (hw - 1.1);
            E.add(vertical ? loff : mid, y + .035, vertical ? mid : loff, vertical ? .14 : plen, .03, vertical ? plen : .14, '#e9e6dc', 'paint', { cap: 190, ...g });
            stats.curbs++; stats.lines++;
          }
        }
        runStart = null;
      };
      for (let t = -LIM; t <= LIM; t += 2) {
        const cx = vertical ? axis : t, cz = vertical ? t : axis;
        const c = S(cx, cz);
        if (!isRoad(c.mat)) { if (runStart) flush(t - 2); continue; }
        // Find the road edge by scanning outward.
        let hw = 0;
        for (let o = 4; o <= 15; o += .5) {
          const s = S(vertical ? axis + o : t, vertical ? t : axis + o);
          if (!isRoad(s.mat)) { hw = o - .25; break; }
        }
        const edgeOk = hw > 5;
        if (!edgeOk || (runStart && Math.abs(runStart.hw - hw) > .6)) { if (runStart) flush(t - 2); continue; }
        if (!runStart) runStart = { t, hw, y: c.top };
        prev = t;
        // Every ~10 m: manholes/drains, trees on the sidewalk, parked cars.
        if (t % 10 !== 0) continue;
        const h = hash(axis + t * .37, t);
        if (h < .25) {
          const lo = (h - .125) * 6;
          E.add(vertical ? axis + lo : t, c.top + .03, vertical ? t : axis + lo, .72, .03, .72, '#2c2d2e', 'metal', { shape: 'cylinder', cap: 110, street42: true });
          stats.manholes++;
        }
        for (const side of [-1, 1]) {
          const hs = hash(t * 1.3 + side, axis);
          // Drain grate at the gutter.
          if (hs < .18) E.add(vertical ? axis + side * (hw - .35) : t, c.top + .045, vertical ? t : axis + side * (hw - .35), vertical ? .4 : .9, .03, vertical ? .9 : .4, '#1f2021', 'metal', { cap: 100, street42: true });
          // Street tree in a grate, 3.3 m into the sidewalk.
          const tx = vertical ? axis + side * (hw + 3.3) : t, tz = vertical ? t : axis + side * (hw + 3.3);
          const w = S(tx, tz);
          if (t % 20 === 0 && isWalk(w.mat) && spot(tx, tz, 7)) {
            const y = w.top;
            E.add(tx, y + .03, tz, 1.5, .04, 1.5, '#2a2b2c', 'metal', { cap: 140, street42: true });
            const th = 3.2 + hs * 1.6;
            E.add(tx, y + th / 2, tz, .26, th, .26, '#5b4a3a', 'bark', { shape: 'cylinder', cap: 600, street42: true });
            const cw = 3.6 + hs * 1.8;
            E.add(tx, y + th + cw * .38, tz, cw, cw * .85, cw, hs > .5 ? '#4e7a35' : '#5a8238', 'foliage', { shape: 'urban_crown', cap: 700, street42: true });
            stats.trees++;
          }
          // Parked cars in the parking lane (wide avenues only, never at junctions).
          if (hw >= 9.25 && hs > .45 && newParked.length < 90) {
            const px = vertical ? axis + side * (hw - 1.55) : t + 3, pz = vertical ? t + 3 : axis + side * (hw - 1.55);
            if (!spot(px, pz, 6)) continue;
            const cross = S(vertical ? axis + side * (hw + 6) : t, vertical ? t : axis + side * (hw + 6));
            if (isRoad(cross.mat)) continue; // junction
            const yaw = vertical ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
            const car = H.makeCar('civilian', px, pz, yaw, Math.floor(hs * 97) % 7);
            car.speed = 0; car.vx = car.vz = 0; car.parked43 = true;
            newParked.push(car);
          }
        }
      }
      if (runStart) flush(LIM);
    }
    world.__parked43 = newParked;
    stats.parked = newParked.length;
  }

  // Glass storefronts on street-facing ground floors.
  function shopfronts(world, E) {
    const S = makeSampler(world);
    const doors = world.entrancePortals || [];
    for (const b of world.buildings || []) {
      if (!b.w || !b.d || !(b.h > 7)) continue;
      const faces = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [fx, fz] of faces) {
        const span = fx ? b.d : b.w;
        const ox = b.x + fx * (b.w / 2 + .12), oz = b.z + fz * (b.d / 2 + .12);
        // Street-facing only: sidewalk or road within 14 m in front of the face.
        const probe = S(ox + fx * 6, oz + fz * 6), probe2 = S(ox + fx * 13, oz + fz * 13);
        if (!(isWalk(probe.mat) || isRoad(probe.mat)) || !(isRoad(probe2.mat) || isRoad(probe.mat))) continue;
        if (hash(b.x + fx, b.z + fz) < .25) continue;
        const base = isWalk(probe.mat) && probe.top > -1e8 ? probe.top : (b.stage42Ground ?? H.outdoorHeight(b.x, b.z));
        const bays = Math.max(1, Math.floor((span - 3) / 4.2));
        const yaw = fx ? Math.PI / 2 : 0;
        const tint = ['#ffd9a8', '#ffe9c9', '#cfe8ff', '#ffd0e0'][Math.floor(hash(b.z, fx + fz) * 4)];
        for (let i = 0; i < bays; i++) {
          const along = -span / 2 + 1.5 + (i + .5) * (span - 3) / bays;
          const x = fx ? ox : b.x + along, z = fz ? oz : b.z + along;
          if (doors.some(p => Math.hypot(p.x - x, p.z - z) < 4.2)) continue;
          const w = (span - 3) / bays - .35;
          // Interior glow plane (shop interior), glass, mullions, sign band, canopy.
          E.add(x - fx * .05, base + 1.75, z - fz * .05, fx ? .04 : w, 2.9, fx ? w : .04, tint, null, { glow: .32, cap: 260, street42: true });
          E.add(x + fx * .02, base + 1.75, z + fz * .02, fx ? .03 : w, 2.9, fx ? w : .03, '#9fb8c4', 'glass', { cap: 260, street42: true });
          E.add(x + fx * .05, base + 3.3, z + fz * .05, fx ? .08 : w + .35, .22, fx ? w + .35 : .08, '#2a2d30', 'metal', { cap: 300, street42: true });
          E.add(x + fx * .05, base + .2, z + fz * .05, fx ? .1 : w + .35, .4, fx ? w + .35 : .1, '#2a2d30', 'metal', { cap: 220, street42: true });
          for (const s of [-.5, .5]) E.add(x + (fz ? s * (w + .3) : fx * .05), base + 1.75, z + (fx ? s * (w + .3) : fz * .05), fx ? .1 : .14, 3.3, fx ? .14 : .1, '#2a2d30', 'metal', { cap: 220, street42: true });
          if (hash(i, b.x) > .45) E.add(x + fx * .7, base + 3.7, z + fz * .7, fx ? 1.4 : w + .3, .08, fx ? w + .3 : 1.4, '#30363a', 'metal', { pitch: fz ? .14 * fz : 0, roll: fx ? -.14 * fx : 0, cap: 260, street42: true });
          E.add(x + fx * .08, base + 3.75, z + fz * .08, fx ? .05 : w * .7, .45, fx ? w * .7 : .05, ['#ffcc66', '#7fe0ff', '#ff8fb8', '#b6ff8a', '#ffffff'][Math.floor(hash(x, z) * 5)], null, { glow: .9, cap: 320, street42: true });
          stats.shopfronts++;
        }
      }
    }
  }

  RC.installers.push(function installStreets(Game) {
    // The game rebuilds its parked list after world creation: add ours on the first update.
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      if (this.world && !this.world.__street43) decorate.call(this);
      const list = this.world && this.world.__parked43;
      if (list && this.parked && !this.parked.__p43) {
        this.parked.__p43 = true;
        for (const c of list) if (!this.parked.includes(c)) this.parked.push(c);
      }
      return update.call(this, dt);
    };
    const attach = Game.prototype.attachImportedModels441;
    Game.prototype.attachImportedModels441 = function () { const r = attach.call(this); decorate.call(this); return r; };
    function decorate() {
      const world = this.world;
      if (world && !world.__street43) {
        world.__street43 = true;
        const t0 = performance.now(), out = [];
        const E = { add: (x, y, z, w, h, d, color, material, o = {}) => {
          const b = H.box(x, y, z, w, h, d, color, o.yaw || 0, 4, o.glow || 0);
          if (material) b.material = material; if (o.shape) b.shape = o.shape;
          if (o.pitch) b.pitch = o.pitch; if (o.roll) b.roll = o.roll; if (o.gradeX) b.gradeX = o.gradeX; if (o.gradeZ) b.gradeZ = o.gradeZ;
          b.visibilityCap = o.cap || 260; b.street42 = true; b.cityLife39 = true; out.push(b); return b;
        } };
        try { shopfronts(world, E); build(this, world, E); } catch (error) { console.warn('[Streets43]', error); }
        for (const b of out) world.boxes.push(b);
        stats.boxes = out.length; stats.ms = Math.round(performance.now() - t0);
      }
    }
  });
})(Heatline);
