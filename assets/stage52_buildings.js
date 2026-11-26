/* SUNSET STATE — Existing entrances, furnished homes and safe thresholds. */
(function (H) {
  'use strict';
  const RC = H.realism39, query = new URLSearchParams(location.search);
  if (!RC?.enabled || query.has('buildings52Off') || query.has('city50Off')) return;

  const cell = 32, portals = new WeakMap(), homes = new WeakMap();
  const sq = x => x * x;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const normal = p => H.stage06Orientation?.isActive(p) ? H.stage06Orientation.dir(p) : { x: 0, z: -1 };
  function offset(p, along, across = 0) {
    const n = normal(p);
    return { x: p.x + n.x * along - n.z * across, z: p.z + n.z * along + n.x * across };
  }
  function project(p, a) {
    const n = normal(p), x = a.x - p.x, z = a.z - p.z;
    return { along: x * n.x + z * n.z, across: -x * n.z + z * n.x };
  }
  function box(x, y, z, w, h, d, color, material, yaw = 0, glow = 0) {
    const part = H.box(x, y, z, w, h, d, color, yaw, 4, glow);
    part.material = material;
    return part;
  }
  function clear(solids, p, radius = .46) {
    return !solids.some(s => sq(Math.max(0, Math.abs(p.x - s.x) - s.hw)) +
      sq(Math.max(0, Math.abs(p.z - s.z) - s.hd)) < sq(radius));
  }
  function trace(from, to, test) {
    const steps = Math.max(1, Math.ceil(distance(from, to) / .30));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!test({ x: H.lerp(from.x, to.x, t), z: H.lerp(from.z, to.z, t) })) return false;
    }
    return true;
  }
  const colors = {
    residential: ['#4b6155', '#d5c39d', '#aac4bc'],
    hotel: ['#5c444b', '#dcb689', '#b5c8cd'],
    tech: ['#3c5459', '#8ed4c7', '#b6ded9'],
    glass: ['#354e63', '#a0cad4', '#b9d7d8'],
    heritage: ['#6d5145', '#d8b78d', '#d7c0a0'],
    brick: ['#634842', '#d8bc98', '#c4b098']
  };
  const finish = plan => colors[plan.materialFamily] || colors.residential;
  function gridFor(world) {
    let index = portals.get(world);
    if (index) return index;
    const plans = new Map(world.structuralPlans.map(p => [p.outerShell.x + ',' + p.outerShell.z, p]));
    index = new Map();
    for (const p of world.entrancePortals) {
      if (!p.interiorReady) continue;
      const plan = plans.get(p.buildingX + ',' + p.buildingZ);
      if (!plan) continue;
      const key = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ p, plan, elevation: null, pieces: null });
    }
    portals.set(world, index);
    return index;
  }
  function* nearby(world, origin, radius) {
    const index = gridFor(world);
    for (let x = Math.floor((origin.x - radius) / cell); x <= Math.floor((origin.x + radius) / cell); x++) {
      for (let z = Math.floor((origin.z - radius) / cell); z <= Math.floor((origin.z + radius) / cell); z++) {
        for (const entry of index.get(x + ',' + z) || [])
          if (distance(origin, entry.p) <= radius) yield entry;
      }
    }
  }
  function ready(g) {
    return g.running && !g.over && !g.paused && !g.missionBoardOpen && !g.showFullMap &&
      !g.inVehicle && !g.boat444 && !g.flight51?.pilot && !g.roofVisit && !g.avatar.swim445 &&
      !g.avatar.deck443 && !g.avatar.coastDeck461 && !g.garageOpen && g.onBus < 0 && g.onTram < 0;
  }
  function frontApproach(g, p) {
    const a = g.avatar, u = project(p, a);
    if (u.along < -.80 || u.along > 4.55 || Math.abs(u.across) > Math.min(2.4, p.width * .50 + u.along * .20)) return false;
    if (Math.abs(a.y - H.walkerGround473(a)) > 1.25) return false;
    const staging = offset(p, u.along > .65 ? .65 : u.along);
    return trace(a, staging, q => clear(g.world.nearby(q.x, q.z), q));
  }

  function entryParts(p, plan) {
    const [frame, brass, glass] = finish(plan), base = H.outdoorHeight(p.x, p.z);
    const n = normal(p), yaw = Math.atan2(n.x, -n.z), w = Math.min(p.width + .48, 4.85);
    const parts = [];
    const add = (along, across, y, ww, hh, dd, color, material, glow = 0) => {
      const q = offset(p, along, across);
      parts.push(box(q.x, base + y, q.z, ww, hh, dd, color, material, yaw, glow));
    };
    add(.38, 0, 3.57, w, .19, .87, frame, 'metal');
    add(.77, 0, 3.54, w * .94, .055, .061, brass, 'metal');
    add(.48, 0, 3.45, w * .68, .035, .18, '#ffdfb1', 'light_emissive', .5);
    for (const side of [-1, 1]) {
      add(.17, side * (w / 2 - .09), 2.40, .12, .35, .13, glass, 'light_emissive', .32);
    }
    add(.10, w / 2 - .18, 1.86, .22, .14, .08, brass, 'metal');
    return parts;
  }
  function drawEntrances(g, out) {
    for (const entry of nearby(g.world, g.cam, 47)) {
      entry.elevation ??= H.outdoorHeight(entry.p.x, entry.p.z);
      if (Math.abs(g.cam.y - entry.elevation) > 14) continue;
      entry.pieces ??= entryParts(entry.p, entry.plan);
      out.push(...entry.pieces);
    }
  }

  function route(points) {
    const lengths = points.slice(1).map((p, i) => distance(p, points[i]));
    const total = lengths.reduce((a, b) => a + b, 0);
    return t => {
      let remain = H.clamp(t, 0, 1) * total;
      for (const [i, length] of lengths.entries()) {
        if (remain <= length && length > .001)
          return { x: H.lerp(points[i].x, points[i + 1].x, remain / length),
            z: H.lerp(points[i].z, points[i + 1].z, remain / length) };
        remain -= length;
      }
      return points.at(-1);
    };
  }
  function landing(scene, p) {
    return [3.65, 3.10, 2.60, 2.15, 4.20].map(d => offset(p, -d)).find(q =>
      trace(offset(p, -1.52), q, a => clear(scene.solids, a)));
  }
  function exitIsClear(g, p, target) {
    return trace(offset(p, .35), target, q => g.walkerPositionFree(q.x, q.z));
  }
  function streetExit(g, p) {
    return [2.10, 1.70, 2.80, 3.40].map(along => offset(p, along)).find(q => exitIsClear(g, p, q));
  }
  function facing(g, p, inward) {
    const n = normal(p), sign = inward ? 1 : -1;
    g.avatar.yaw = Math.atan2(n.x * sign, n.z * sign);
    g.avatar.vx = g.avatar.vz = 0;
    if (g.avatar.rcLoco) g.avatar.rcLoco.vx = g.avatar.rcLoco.vz = 0;
  }
  function installThresholds(P) {
    const nearest = P.nearestEntrance;
    P.nearestEntrance = function () {
      if (!this.running) return nearest.call(this);
      if (!ready(this) || this.inside || this.exitTransition || this.entryTransition || this.vehicleEntry) return null;
      let best, bestD = Infinity;
      for (const { p } of nearby(this.world, this.avatar, 4.9)) {
        const d = distance(this.avatar, p);
        if (d < bestD && frontApproach(this, p)) { best = p; bestD = d; }
      }
      return best ?? null;
    };

    const begin = P.beginBuildingEntry;
    P.beginBuildingEntry = function (id) {
      const p = this.world.entrancePortals[id], a = this.avatar;
      if (!ready(this) || !p?.interiorReady || this.exitTransition || !frontApproach(this, p)) return false;
      const entry = [...nearby(this.world, p, .05)].find(e => e.p === p);
      if (!entry) return false;
      const scene = this.sceneForFloor(entry.plan, 0), end = landing(scene, p);
      if (!end) { this.showInfo('פתח הלובי חסום · אפשר לנסות להיכנס בהליכה', 3.2); return false; }
      const staging = offset(p, Math.min(.65, project(p, a).along));
      if (!trace(staging, offset(p, -1.52), q => clear(this.world.nearby(q.x, q.z), q))) return false;
      if (!begin.call(this, id)) return false;
      const q = this.entryTransition;
      q.targetX = end.x;
      q.targetZ = end.z;
      q.base52 = scene.stage42Base;
      q.path52 = route([{ x: a.x, z: a.z }, staging, end]);
      this.showInfo('דלתות הלובי נפתחות', 1.5);
      return true;
    };
    const enter = P.enterBuilding;
    P.enterBuilding = function (id) {
      const a = this.avatar, identity = { appearance: a.appearance, style: a.style, outfit460: a.outfit460 };
      const result = enter.call(this, id);
      if (result) {
        // Keep the existing player model and outfit on direct and restored entry.
        for (const [key, value] of Object.entries(identity)) if (value !== undefined) this.avatar[key] = value;
        if (this.elevatorBuilding52?.() === false) {
          const reward = this.infoMessage.includes('+35') ? ' · +35 קרדיטים' : '';
          this.showInfo('נכנסת אל ' + this.indoor.scene.name + ' · קומת קרקע · יציאה דרך הדלת הראשית' + reward, 5);
        }
      }
      return result;
    };
    const stepEntry = P.updateBuildingEntry;
    P.updateBuildingEntry = function (dt) {
      const q = this.entryTransition;
      if (!q?.path52 || q.elapsed + dt >= q.duration) {
        const result = stepEntry.call(this, dt);
        if (q?.path52 && this.indoor) {
          facing(this, this.world.entrancePortals[q.id], true);
          this.footCameraYaw = this.avatar.yaw;
        }
        return result;
      }
      q.elapsed += dt;
      const t = q.elapsed / q.duration;
      Object.assign(this.avatar, q.path52(t * t * (3 - 2 * t)));
      const p = this.world.entrancePortals[q.id], along = project(p, this.avatar).along;
      const grade = H.clamp((-.06 - along) / 1.47, 0, 1);
      const outside = H.outdoorHeight(this.avatar.x, this.avatar.z);
      this.avatar.y = H.lerp(outside, q.base52 ?? outside, grade * grade * (3 - 2 * grade));
      facing(this, p, true);
    };

    const controls = P.is;
    P.is = function (...keys) {
      return !this.exitTransition?.path52 && controls.apply(this, keys);
    };
    const interact = P.toggleVehicle;
    P.toggleVehicle = function (...args) {
      if (!this.exitTransition?.path52 && !this.entryTransition?.path52) return interact.apply(this, args);
    };
    const exit = P.exitBuilding;
    P.exitBuilding = function () {
      const v = this.indoor, p = v && this.world.entrancePortals[v.portalId];
      if (this.exitTransition) return false;
      if (!v || v.floor !== 0 || v.liftRide || v.stairTrip || !p || distance(this.avatar, v.scene.entrance) > 4.2)
        return exit.call(this);
      const a = { x: this.avatar.x, z: this.avatar.z }, inside = offset(p, -1.52), target = streetExit(this, p);
      if (!trace(a, inside, q => clear(v.scene.solids, q)) || !target) {
        this.showInfo('אין מעבר פנוי · עמוד מול הפתח ונסה שוב', 3.2);
        return false;
      }
      if (!exit.call(this)) return false;
      const q = this.exitTransition;
      q.targetX = target.x;
      q.targetZ = target.z;
      q.path52 = route([a, inside, target]);
      q.staging52 = inside;
      q.base52 = v.scene.stage42Base;
      return true;
    };
    const stepExit = P.stage42UpdateExit;
    P.stage42UpdateExit = function (dt) {
      const q = this.exitTransition;
      if (!q?.path52) return stepExit.call(this, dt);
      const p = this.world.entrancePortals[q.id];
      if (!p) { this.exitTransition = null; return; }
      const t = Math.min(1, (q.elapsed + dt) / q.duration);
      const pos = q.path52(t * t * (3 - 2 * t));
      const reachesStreet = project(p, pos).along >= .35;
      const blocked = reachesStreet && (q.switched
        ? !trace(this.avatar, pos, a => this.walkerPositionFree(a.x, a.z))
        : !exitIsClear(this, p, { x: q.targetX, z: q.targetZ }));
      if (blocked) {
        this.exitTransition = null;
        if (!q.switched) Object.assign(this.avatar, q.staging52, { y: q.base52 });
        facing(this, p, false);
        this.showInfo('המעבר בחוץ נחסם · נסה שוב כשהדרך פנויה', 3.2);
        return;
      }
      q.elapsed += dt;
      Object.assign(this.avatar, pos);
      const outside = H.outdoorHeight(pos.x, pos.z), grade = H.clamp((project(p, pos).along + 1.48) / 1.83, 0, 1);
      this.avatar.y = this.indoor ? H.lerp(q.base52 ?? outside, outside, grade * grade * (3 - 2 * grade)) : outside;
      facing(this, p, false);
      if (!q.switched && reachesStreet) {
        q.switched = true;
        this.stage42CompleteExit();
      }
      if (t >= 1) {
        this.stage42CompleteExit();
        this.exitTransition = null;
        this.footCameraYaw = this.avatar.yaw;
        this.cameraTransfer = .38;
        this.showInfo('יצאת דרך דלת הלובי אל הרחוב', 2.2);
      }
    };
  }

  function clearCompactReception(scene, plan) {
    const p = plan.stage06Portal;
    if (!scene.stage05Compact || scene.floor !== 0 || !p || p.facing === 'north') return;
    const desk = scene.boxes.find(b => b.material === 'wood' && b.w === 1.14 && b.d === .82 && b.h === 1.05);
    if (!desk) return;
    const collider = scene.solids.find(s => s.x === desk.x && s.z === desk.z && s.hw === .55 && s.hd === .39);
    if (!collider) return;
    // This runs before the original Stage 06/07 transforms. At this point the
    // cached portal may already be rotated, so use its authored cardinal pose.
    const door = { x: p.stage07OriginalX ?? p.x, z: p.stage07OriginalZ ?? p.z };
    const n = { west: { x: -1, z: 0 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 } }[p.facing];
    if (!n) return;
    const point = (inside, across = 0) => ({ x: door.x - n.x * inside - n.z * across, z: door.z - n.z * inside + n.x * across });
    if (trace(point(1.48), point(4.25), q => clear([collider], q, p.stage07Aligned ? .66 : .46))) return;
    const { xmin, xmax, zmin, zmax } = scene.bounds;
    const other = scene.solids.filter(s => s !== collider);
    const candidates = [2.65, -2.65, 3.45, -3.45].flatMap(side => [2.35, 3.55, 4.8].map(d => point(d, side)));
    const target = candidates.find(q => q.x > xmin + .72 && q.x < xmax - .72 && q.z > zmin + .68 && q.z < zmax - .68 &&
      distance(q, scene.lift) > 2.35 && clear(other, q, .82));
    if (!target) return;
    const top = scene.boxes.find(b => b.w === .97 && b.d === .49 && b.x === desk.x && Math.abs(b.z - desk.z + .19) < .001);
    const dx = target.x - desk.x, dz = target.z - desk.z;
    for (const item of [desk, collider, top].filter(Boolean)) { item.x += dx; item.z += dz; }
    scene.receptionMoved52 = true;
  }

  function finishLobby(scene, plan, p) {
    if (!p || scene.details52) return;
    const [dark, warm] = finish(plan), y = scene.stage42Base || 0;
    const n = normal(p), yaw = Math.atan2(n.x, -n.z);
    const at = (forward, side, height, w, h, d, color, material, glow) => {
      const target = offset(p, -forward, side);
      scene.boxes.push(box(target.x, y + height, target.z, w, h, d, color, material, yaw, glow));
    };
    // Insets and overhead strips fit inside the validated corridor aperture.
    at(1.87, 0, .074, Math.min(2.32, p.width - .82), .018, .42, dark, 'metal');
    at(2.97, 0, .079, Math.min(1.74, p.width - .94), .019, .07, warm, 'metal');
    at(2.14, 0, 3.07, Math.min(2.48, p.width - .66), .08, .31, dark, 'metal');
    at(2.14, 0, 3.01, Math.min(1.99, p.width - .88), .04, .18, warm, 'light_emissive', .37);
    scene.details52 = true;
  }

  // Owned island houses share the existing plots and foot-save mode. Only the
  // house's wall volumes and furniture are new collision objects.
  const designs = {
    hut: { x: 0, z: 0, w: 5.6, d: 4.8, h: 3.05, gate: 1.35, top: 0, roof: '#856a47' },
    villa: { x: -1.5, z: -1, w: 11, d: 8, h: 3.55, gate: 1.70, top: 3.05, roof: '#394952' },
    estate: { x: -3, z: -3, w: 16, d: 10, h: 4.04, gate: 1.88, top: 3.95, roof: '#313d44' }
  };
  function worldHomes(world) {
    if (!homes.has(world)) homes.set(world, new Map());
    return homes.get(world);
  }
  function buildHouse(world, plot, type, seed) {
    const design = designs[type];
    if (!design) return false;
    const key = plot.x + ',' + plot.z, registry = worldHomes(world);
    if (registry.has(key)) return true;
    const { w, d, h, gate, top, roof } = design, x = plot.x + design.x, z = plot.z + design.z;
    const west = x - w / 2, east = x + w / 2, back = z - d / 2, front = z + d / 2;
    let ground = -Infinity;
    for (const xx of [west, x, east]) for (const zz of [back, z, front])
      ground = Math.max(ground, H.outdoorHeight(xx, zz));
    const floor = ground + .058, groundAtDoor = H.outdoorHeight(x, front + 2);
    const rampLength = H.clamp((floor - groundAtDoor) * 5.5, 1.75, 5.8);
    const rampEnd = front + rampLength, rampHeight = H.outdoorHeight(x, rampEnd) + .035;
    const walls = ['#f0eadb', '#ece0c9', '#f2eee4', '#e8d8c4'][seed % 4];
    const accent = ['#446e76', '#9a5e45', '#45644e', '#725878'][seed % 4];
    const add = (xx, yy, zz, ww, hh, dd, tint, mat, glow = 0, cap = 580) => {
      const piece = box(xx, floor + yy, zz, ww, hh, dd, tint, mat, 0, glow);
      piece.visibilityCap = cap;
      piece.stage52Home = key;
      world.add(piece);
      return piece;
    };
    const solid = (xx, zz, ww, dd) => world.solid(xx, zz, ww, dd);
    const wall = (xx, zz, ww, dd) => { add(xx, h / 2, zz, ww, h, dd, walls, 'concrete'); solid(xx, zz, ww, dd); };
    const base = Math.min(...[west, east].flatMap(xx => [back, front].map(zz => H.outdoorHeight(xx, zz))));
    add(x, -(floor - base + .32) / 2, z, w + .2, floor - base + .32, d + .2, '#aa9a83', 'masonry');
    add(x, .011, z, w - .22, .026, d - .22, '#c2a37b', 'wood');
    const walk = add(x, (rampHeight - floor) / 2 - .038, front + rampLength / 2, gate + .65, .076, rampLength, '#d4c8b3', 'concrete');
    walk.gradeZ = (rampHeight - floor) / rampLength;

    wall(west, z, .25, d);
    wall(east, z, .25, d);
    wall(x, back, w, .25);
    const wing = (w - gate) * .5;
    for (const sign of [-1, 1]) {
      const sideX = x + sign * (gate + wing) * .5, windowH = Math.min(h - 1.85, 1.72);
      add(sideX, .39, front, wing, .78, .25, walls, 'concrete');
      add(sideX, (.78 + windowH + h) / 2, front, wing, h - (.78 + windowH), .25, walls, 'concrete');
      add(sideX, .78 + windowH / 2, front, wing - .31, windowH, .085, '#89b6c3', 'translucent_glass', .04, 300);
      add(sideX, .77, front + .10, wing, .089, .30, accent, 'wood');
      for (const dx of [-wing / 2 + .08, 0, wing / 2 - .08])
        add(sideX + dx, .78 + windowH / 2, front, .115, windowH, .20, accent, 'wood');
      solid(sideX, front, wing, .25);
      add(x + sign * (gate / 2 + .075), 1.24, front + .055, .14, 2.5, .23, accent, 'wood', 0, 245);
    }
    add(x, (h + 2.48) / 2, front, gate + .03, h - 2.48, .25, walls, 'concrete');
    add(x, 2.54, front + .24, gate + .48, .17, .80, accent, 'metal', 0, 380);
    add(x, 2.444, front + .39, gate * .59, .028, .095, '#f1d3a0', 'light_emissive', .46, 190);
    add(x, h + .105, z, w + .90, .25, d + .72, roof, type === 'hut' ? 'fabric' : 'metal');
    if (top) {
      const upperW = w * .71, upperD = d * .72, upperX = x + w * .095, upperZ = z - d * .06;
      add(upperX, h + top / 2 + .20, upperZ, upperW, top, upperD, walls, 'concrete');
      add(upperX, h + top + .31, upperZ, upperW + .7, .25, upperD + .60, roof, 'metal');
      const panelZ = upperZ + upperD / 2 + .048;
      add(upperX, h + top * .59, panelZ, upperW * .82, top * .50, .09, '#80adbc', 'glass', .08);
      for (const dx of [-upperW * .25, 0, upperW * .25])
        add(upperX + dx, h + top * .59, panelZ + .055, .078, top * .51, .06, roof, 'metal');
      add(upperX, h + .34, panelZ + .61, upperW * .95, .14, 1.44, '#c9c0ac', 'concrete');
      add(upperX, h + .84, panelZ + 1.29, upperW * .95, .84, .08, '#93b8c0', 'translucent_glass');
    }
    // All tall furnishings flank the center walkway and register real solids.
    const soft = '#a6a08c', couchX = west + .81, couchZ = z + d * .13;
    add(couchX, .30, couchZ, 1.11, .57, Math.min(2.1, d * .35), accent, 'fabric', 0, 150);
    add(couchX - .42, .65, couchZ, .22, .67, Math.min(2.1, d * .35), soft, 'fabric', 0, 150);
    for (const side of [-1, 1]) add(couchX + .13, .63, couchZ + side * d * .147, .73, .26, .27, soft, 'fabric', 0, 150);
    solid(couchX, couchZ, 1.13, Math.min(2.1, d * .35));
    const shelfX = east - .69, shelfZ = z - d * .11;
    add(shelfX, .46, shelfZ, .88, .89, Math.min(2.55, d * .36), accent, 'wood', 0, 150);
    add(shelfX, .94, shelfZ, .98, .10, Math.min(2.67, d * .39), '#dbd0bc', 'concrete', 0, 150);
    add(shelfX, 1.08, shelfZ - .28, .32, .21, .41, '#526971', 'metal', 0, 140);
    solid(shelfX, shelfZ, .98, Math.min(2.67, d * .39));
    add(x, .038, z + d * .20, gate * 1.17, .022, d * .39, accent, 'fabric', 0, 135);
    add(x, h - .22, z, 1.3, .087, .33, '#f7dcb5', 'light_emissive', .53, 170);
    if (top) {
      const tableX = x + w * .20, tableZ = back + 1.50;
      add(tableX, .75, tableZ, Math.min(2.30, w * .17), .12, .89, '#8b6e52', 'wood', 0, 150);
      add(tableX, .40, tableZ, .63, .72, .55, '#6f5949', 'wood', 0, 150);
      solid(tableX, tableZ, Math.min(2.3, w * .17), .89);
    }
    if (type !== 'hut') {
      // Keep the original patio uses, with the pool beside the entrance lane.
      const px = plot.x + (type === 'estate' ? 5.2 : 4.7), pz = plot.z + (type === 'estate' ? 6.6 : 4.7);
      const pY = H.outdoorHeight(px, pz) - floor, pw = type === 'estate' ? 8.7 : 4.5;
      add(px, pY + .10, pz, pw + .44, .16, 2.98, '#e7dfd0', 'concrete', 0, 390);
      add(px, pY + .19, pz, pw, .035, 2.55, '#3698ad', 'glass', .16, 330);
      for (const side of [-1, 1]) add(px + side * pw * .27, pY + .27, pz + 2.02, 1.56, .21, .59, '#e7dcc6', 'fabric', 0, 180);
    }
    const plant = (px, pz) => {
      const py = H.outdoorHeight(px, pz) - floor;
      add(px, py + .30, pz, .63, .57, .63, '#9a6a4e', 'concrete', 0, 225);
      const crown = add(px, py + .91, pz, .83, .82, .81, '#517950', 'foliage', 0, 215);
      crown.shape = 'urban_crown';
      solid(px, pz, .57, .57);
    };
    for (const side of [-1, 1]) plant(x + side * (gate / 2 + 1.20), front + .95);
    registry.set(key, { type, x, z, west, east, back, front, floor, h, gate, accent,
      rampEnd, rampHeight, light: { x, y: floor + h - .49, z, radius: Math.max(6, w * .64), r: 1.10, g: .92, b: .68 },
      animationAt: null, open: 0 });
    return true;
  }

  function findHome(world, a, margin = 0) {
    for (const h of homes.get(world)?.values() || []) {
      if (a.x >= h.west - margin && a.x <= h.east + margin &&
          a.z >= h.back - margin && a.z <= h.front + margin) return h;
    }
    return null;
  }
  function homeFloor(world, a) {
    const h = findHome(world, a, 6);
    if (!h) return null;
    if (a.x > h.west && a.x < h.east && a.z > h.back && a.z <= h.front) return h.floor + .023;
    if (a.z > h.front && a.z < h.rampEnd && Math.abs(a.x - h.x) <= h.gate / 2 + .29)
      return H.lerp(h.floor, h.rampHeight, (a.z - h.front) / (h.rampEnd - h.front));
    return null;
  }
  function drawHomeDoors(g, out) {
    for (const h of homes.get(g.world)?.values() || []) {
      const at = { x: h.x, y: h.floor, z: h.front };
      if (distance(g.cam, at) > 145 || Math.abs(g.cam.y - h.floor) > 60) continue;
      const near = !g.inVehicle && !g.flight51?.pilot && distance(g.avatar, at) < 6.3;
      const delta = h.animationAt == null ? .20 : H.clamp(g.seconds - h.animationAt, 0, .20);
      h.open = H.clamp(h.open + (near ? 1 : -1) * delta * 4.8, 0, 1);
      h.animationAt = g.seconds;
      for (const side of [-1, 1]) {
        const x = h.x + side * h.gate * (.25 + .50 * h.open), z = h.front + .108;
        out.push(box(x, h.floor + 1.24, z, h.gate * .50, 2.42, .108, h.accent, 'wood'));
        out.push(box(x, h.floor + 1.60, z + .061, h.gate * .31, .86, .022, '#b0ced3', 'glass'));
        out.push(box(x - side * h.gate * .15, h.floor + 1.05, z + .079, .045, .18, .048, '#d4bb8d', 'metal'));
      }
    }
  }

  function installHouses(P) {
    // The ground solver is scoped to the actual Game update and player only.
    let game;
    const walkerGround = H.walkerGround473;
    H.walkerGround473 = function (a) {
      const floor = game && a === game.avatar && !a.deck443 && !a.coastDeck461 ? homeFloor(game.world, a) : null;
      return floor ?? walkerGround(a);
    };
    const update = P.update;
    P.update = function (dt) {
      const previous = game;
      game = this;
      try { return update.call(this, dt); }
      finally { game = previous; }
    };
    const restart = P.restart;
    P.restart = function (...args) {
      const result = restart.apply(this, args);
      RC.property48?.setupWorld(this);
      return result;
    };
    const camera = P.updateCamera;
    P.updateCamera = function (dt) {
      const result = camera.call(this, dt);
      if (!ready(this) || this.inside) return result;
      const h = findHome(this.world, this.avatar);
      if (!h) return result;
      const c = this.cam;
      c.x = H.clamp(c.x, h.west + .36, h.east - .36);
      c.z = H.clamp(c.z, h.back + .36, h.front - .36);
      c.y = H.clamp(c.y, h.floor + 1.58, h.floor + h.h - .24);
      c.tx = H.clamp(c.tx, h.west + .53, h.east - .53);
      c.tz = H.clamp(c.tz, h.back + .53, h.front - .53);
      c.ty = H.clamp(c.ty, h.floor + .92, h.floor + h.h - .38);
      return result;
    };
    const lights = P.sceneLights;
    P.sceneLights = function () {
      const result = lights.call(this), onFoot = !this.inside && !this.inVehicle && !this.roofVisit &&
        !this.boat444 && !this.flight51?.pilot && !this.avatar.swim445 && this.onBus < 0 && this.onTram < 0;
      const h = onFoot && findHome(this.world, this.avatar);
      return h ? [h.light, ...result.slice(0, 11)] : result;
    };
    const dynamic = P.buildDynamic;
    P.buildDynamic = function () {
      const result = dynamic.call(this);
      if (!this.inside) drawHomeDoors(this, result);
      return result;
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this), v = this.indoor, hint = document.getElementById('interact-hint');
      if (!hint || !ready(this)) return result;
      if (v && this.elevatorBuilding52?.(v) === false && hint.textContent.includes('מעלית')) {
        hint.textContent = 'קומת קרקע · לחזרה לרחוב צא דרך הדלת הראשית';
        return result;
      }
      if (this.inside) return result;
      const h = findHome(this.world, this.avatar, 4.5);
      if (!h) return result;
      const inRoom = findHome(this.world, this.avatar) === h;
      if (!inRoom && (this.avatar.z < h.front || Math.abs(this.avatar.x - h.x) > 2.15)) return result;
      hint.textContent = RC.property48.HOUSES[h.type].name + ' · ' + (inRoom ? 'יציאה דרך דלת המרפסת' : 'הדלת נפתחת בהתקרבות');
      hint.classList.remove('hidden');
      return result;
    };
  }
  RC.installers.push(Game => {
    const P = Game.prototype;
    installThresholds(P);
    installHouses(P);
    const sceneFor = P.sceneForFloor;
    P.sceneForFloor = function (plan, floor) {
      const scene = sceneFor.call(this, plan, floor);
      if (floor === 0 && !scene.details52) {
        const p = this.world.entrancePortals.find(v => v.interiorReady && v.buildingX === plan.outerShell.x && v.buildingZ === plan.outerShell.z);
        finishLobby(scene, plan, p);
      }
      return scene;
    };
  });
  H.buildings52 = { buildHouse, clearCompactReception, drawEntrances, findHome, homeFloor, offset };
})(Heatline);
