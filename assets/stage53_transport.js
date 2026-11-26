/* SUNSET STATE — navigable island docks, ferries, and passenger helicopter flights. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled) return;

  const query = new URLSearchParams(location.search);
  if (query.has('transport53Off')) return;
  const oldWater = H.boatWater444;
  // Keep the marina rules and open a narrow outer-coast corridor for boats.
  const bounds = { west: -1269, east: 2320, north: -944, south: 944 };
  H.boatWater444 = function (x, z) {
    if (H.islands53?.floorAt(x, z) != null || H.estate53World?.containsLand(x, z) || H.estate53World?.pierAt?.(x, z)) return false;
    if (Math.abs(x) <= 1175 && Math.abs(z) <= 887) return oldWater(x, z);
    if (x < bounds.west || x > (H.estate53World ? bounds.east : 1269) || z < bounds.north || z > bounds.south ||
        H.coast461.land(x, z) || H.reference469.coast(x, z) >= -1)
      return false;
    const deck = H.coast461.roadAt(x, z);
    return !deck || H.lerp(deck.a.y, deck.b.y, deck.t) > 2.3;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const board = b => ({ x: b.boardX, z: b.boardZ });
  const gate = p => ({ x: p.entryX, z: p.entryZ });
  const wrap = (x, z) => Math.atan2(-x, -z);
  const active = g => g.running && !g.over && !g.paused && !g.showFullMap && !g.missionBoardOpen && !g.garageOpen;
  const onFoot = g => active(g) && !g.inVehicle && !g.inside && !g.roofVisit && !g.boat444 && !g.flight51?.pilot &&
    !g.avatar.swim445 && !g.prison471?.active && !g.entryTransition && !g.exitTransition && !g.vehicleEntry &&
    g.onBus < 0 && g.onTram < 0 && g.avatar.grounded;
  const estateId = 'estate';
  const marinaCarDrop = { x: -941, z: 755, yaw: 0 };
  const boatCrew = berth => !H.privateFleet53?.sourceBlocked('boat', String(berth.id));
  const editable = e => e?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e?.tagName || '');
  const nearby = (a, b, radius) => b && dist(a, b) < radius;
  const rowButton = 'background:#173b47;color:#e9f7f5;border:1px solid #51808b;border-radius:7px;padding:6px 9px;font:650 12px system-ui;cursor:pointer';
  const element = (tag, css) => { const e = document.createElement(tag); if (css) e.style.cssText = css; return e; };

  function ports(world) {
    return (world.islandPorts53 || []).map((port, i) => ({ ...port, berth: port.berth && {
      name: 'סירת האי · ' + port.name, paint: '#91c3bb', speed: 22.2,
      ...port.berth, id: `island:${port.id || i}`
    } }));
  }

  function waterLine(a, b) {
    const length = dist(a, b), samples = Math.max(1, Math.ceil(length / 3));
    const nx = length ? (b.z - a.z) * 1.8 / length : 0, nz = length ? (a.x - b.x) * 1.8 / length : 0;
    for (let i = 0; i <= samples; i++) {
      const f = i / samples, x = H.lerp(a.x, b.x, f), z = H.lerp(a.z, b.z, f);
      if (!H.boatWater444(x, z)) return false;
      // Reserve the beam's clearance except for the immediate mooring slot.
      if (length * Math.min(f, 1 - f) > 4 && (!H.boatWater444(x + nx, z + nz) || !H.boatWater444(x - nx, z - nz)))
        return false;
    }
    return true;
  }

  // Lazy coastal grid. Every edge and every shortened segment has to clear the
  // same water predicate the manually operated boat uses.
  const step = 18, width = Math.floor((bounds.east - bounds.west) / step) + 1;
  const height = Math.floor((bounds.south - bounds.north) / step) + 1;
  const waterCells = new Int8Array(width * height);
  const gridPoint = i => ({ x: (i % width) * step + bounds.west, z: Math.floor(i / width) * step + bounds.north });
  function waterCell(i) {
    if (!waterCells[i]) {
      const p = gridPoint(i);
      waterCells[i] = H.boatWater444(p.x, p.z) ? 1 : -1;
    }
    return waterCells[i] === 1;
  }
  function connections(p) {
    const x = Math.round((p.x - bounds.west) / step), z = Math.round((p.z - bounds.north) / step), out = [];
    for (let iz = Math.max(0, z - 3); iz <= Math.min(height - 1, z + 3); iz++) {
      for (let ix = Math.max(0, x - 3); ix <= Math.min(width - 1, x + 3); ix++) {
        const i = iz * width + ix;
        if (waterCell(i) && waterLine(p, gridPoint(i))) out.push(i);
      }
    }
    return out.sort((a, b) => dist(p, gridPoint(a)) - dist(p, gridPoint(b)));
  }
  function planWater(from, to) {
    if (!H.boatWater444(from.x, from.z) || !H.boatWater444(to.x, to.z)) return null;
    if (waterLine(from, to)) return [to];
    const goals = new Set(connections(to)), sources = connections(from);
    if (!goals.size || !sources.length) return null;
    const queue = new Int32Array(width * height), parent = new Int32Array(width * height);
    parent.fill(-2);
    let read = 0, used = 0, found = -1;
    for (const start of sources) { queue[used++] = start; parent[start] = -1; }
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (read < used) {
      const i = queue[read++];
      if (goals.has(i)) { found = i; break; }
      const x = i % width, z = Math.floor(i / width), point = gridPoint(i);
      for (const [dx, dz] of directions) {
        const ix = x + dx, iz = z + dz, next = iz * width + ix;
        if (ix < 0 || iz < 0 || ix >= width || iz >= height || parent[next] !== -2 || !waterCell(next) ||
            !waterLine(point, gridPoint(next))) continue;
        parent[next] = i;
        queue[used++] = next;
      }
    }
    if (found < 0) return null;
    const raw = [to];
    for (let i = found; i >= 0; i = parent[i]) raw.push(gridPoint(i));
    raw.push(from);
    raw.reverse();
    const route = [];
    for (let i = 0; i < raw.length - 1;) {
      let next = Math.min(raw.length - 1, i + 24);
      while (next > i + 1 && !waterLine(raw[i], raw[next])) next--;
      route.push(raw[next]);
      i = next;
    }
    return route;
  }

  function freightModel(g, boat, car, out) {
    const yaw = -boat.yaw;
    const add = (localX, y, localZ, w, h, d, color, material, shape) => {
      const [x, , z] = H.rotateBoxLocal({ yaw }, localX, 0, localZ);
      const box = H.box(boat.x + x, y, boat.z + z, w, h, d, color, yaw, 4);
      box.material = material;
      box.shape = shape;
      out.push(box);
    };
    add(0, .42, 0, 4.75, 1.4, 11.6, '#385461', 'metal', 'rounded_smooth');
    add(0, 1.14, .1, 4.12, .22, 10.9, '#9da497', 'metal', 'rounded');
    for (const x of [-1.93, 1.93]) {
      add(x, 1.45, 0, .19, .37, 9.8, '#dab262', 'metal');
      add(x, 1.82, -3.7, .73, 1.25, 2.4, '#e2d8bf', 'paint', 'rounded');
      add(x, 2.4, -3.7, .76, .26, 2.43, '#4e666d', 'vehicle_glass444');
    }
    add(0, 1.16, 5.5, 3.7, .25, .75, '#d1a755', 'metal');
    const first = out.length;
    g.carGraphics({ ...car, x: boat.x, z: boat.z, yaw: boat.yaw, vx: 0, vz: 0, speed: 0, deck443: false }, out, g.seconds);
    const rise = 1.23 - H.outdoorHeight(boat.x, boat.z);
    for (let i = first; i < out.length; i++) {
      out[i].y += rise;
      out[i].visibilityCap = 170;
    }
  }

  function stableFoot(g, at) {
    if (!at) return null;
    const spots = [at, ...[.9, 1.6, 2.6].flatMap(r => [[r, 0], [0, r], [-r, 0], [0, -r]]
      .map(([x, z]) => ({ x: at.x + x, z: at.z + z })))];
    return spots.find(p => H.marinaWalk444(p.x, p.z) && g.walkerPositionFree(p.x, p.z));
  }
  function disembark(g, at, message) {
    const exit = stableFoot(g, at);
    if (!exit) { g.showInfo('המעבר לרציף חסום. נסו שוב כשהדרך פנויה.', 2.8); return false; }
    const { appearance, style, outfit460 } = g.avatar;
    g.transport53.trip = null;
    g.transport53.anchor = null;
    g.boat444 = g.roofVisit = null;
    g.returnToStreet(exit.x, exit.z);
    g.avatar.appearance = appearance;
    g.avatar.style = style;
    g.avatar.outfit460 = outfit460;
    g.showInfo(message, 3);
    g.updateHUD();
    return true;
  }

  class Transport {
    constructor(game) {
      this.game = game;
      this.world = game.world;
      this.portSource = this.world.islandPorts53;
      this.islands = ports(this.world);
      this.marina = { id: 'marina', name: 'מרינת סאנסט', berth: this.world.marina444?.berths[1], carDrop: marinaCarDrop };
      this.airport = { id: 'airport', name: 'שדה התעופה', pad: this.world.airportPad53 };
      this.trip = null;
      this.anchor = null;
      this.selected = false;
      this.hud = null;
    }

    get waterStops() { return [this.marina, ...this.islands].filter(loc => loc.berth); }
    get airStops() { return [this.airport, ...this.islands].filter(loc => loc.pad); }

    nearbyDock() {
      const a = this.game.avatar;
      return this.islands.find(loc => loc.berth && nearby(a, board(loc.berth), 4));
    }

    nearbyPad() {
      const g = this.game, a = g.avatar;
      return this.airStops.find(loc => nearby(a, gate(loc.pad), 6) || nearby(a, loc.pad, 7));
    }

    carDock() {
      const g = this.game;
      if (!active(g) || this.trip || !g.inVehicle || g.inside || Math.abs(g.player.speed) >= 1.1 ||
          g.player.wrecked || !g.player.alive || H.boatWater444(g.player.x, g.player.z) ||
          !this.islands.some(loc => loc.id === estateId && loc.carDrop)) return null;
      return this.waterStops.find(loc => loc.carDrop && nearby(g.player, loc.carDrop, 16));
    }

    station() {
      const g = this.game, car = this.carDock();
      if (car) return { car };
      if (!onFoot(g)) return null;
      const walk = g.avatar, airportDesk = g.flight51?.site;
      const dock = this.nearbyDock() || (this.world.marina444?.berths.some(b => nearby(walk, board(b), 8)) ? this.marina : null);
      const pad = this.nearbyPad() || (this.airport.pad && nearby(walk, airportDesk, 16) ? this.airport : null);
      if (dock || pad) return { dock, pad };
      return null;
    }

    beginBoat(berth, trip = null) {
      const g = this.game;
      g.boat444 = { ...berth, id: trip ? `ferry:${trip.from.id}` : berth.id, velocity: 0, wake: [], trailClock: 0, mode: trip ? 'ferry' : 'free', hudAt: 0 };
      if (!trip && !berth.fleet53Id) g.boat444.source53Id = String(berth.id);
      this.trip = trip;
      this.anchor = stableFoot(g, board(berth)) || { x: g.avatar.x, z: g.avatar.z };
      this.selected = false;
      RC.chat48?.close();
      g.armed = false;
      g.keys.clear();
      if (trip?.car) g.inVehicle = false;
      g.updateHUD();
    }

    beginHeli(stop, trip = null) {
      const g = this.game, pad = stop.pad;
      const h = H.createPoliceHelicopter(30 + this.airStops.indexOf(stop), pad.x, pad.z);
      h.y = Math.max(pad.y + 1.55, H.outdoorHeight(pad.x, pad.z) + 2.18);
      h.yaw = trip ? wrap(trip.to.pad.x - pad.x, trip.to.pad.z - pad.z) : 0;
      // Keep the saved walker at the actual departure point during travel.
      this.anchor = stableFoot(g, gate(pad)) || { x: g.avatar.x, z: g.avatar.z };
      g.roofVisit = { roof: { ...pad, islandPad53: true }, from: null, aircraft: h, pilot: true, speed: 0 };
      this.trip = trip;
      this.selected = false;
      RC.chat48?.close();
      g.armed = false;
      g.keys.clear();
      Object.assign(g.cam, { x: h.x + Math.sin(h.yaw) * 15, y: h.y + 7, z: h.z + Math.cos(h.yaw) * 15,
        tx: h.x, ty: h.y + 1, tz: h.z, underwater445: false });
      g.updateHUD();
    }

    start(kind, id) {
      if (!['air', 'ferry', 'car'].includes(kind)) return false;
      const g = this.game, station = this.station(), air = kind === 'air', cargo = kind === 'car';
      const from = cargo ? station?.car : air ? station?.pad : station?.dock;
      const to = (air ? this.airStops : this.waterStops).find(loc => loc.id === id);
      if (!from || !to || to.id === from.id || (cargo && (!to.carDrop || (to.id !== estateId && from.id !== estateId)))) return false;
      const trip = { kind: cargo ? 'ferry' : kind, from, to, phase: air ? 'climb' : 'cruise', elapsed: 0, distance: 0 };
      if (air) {
        const legacy = this.world.buildings.map(b => (b.stage42Ground ?? H.outdoorHeight(b.x, b.z)) + b.h);
        const detailed = (this.world.city20DistrictBuildings || []).map(b => b.baseY + b.height);
        trip.altitude = Math.min(248, Math.max(116, from.pad.y + 18, to.pad.y + 18, ...legacy.map(y => y + 31), ...detailed.map(y => y + 26)));
        this.beginHeli(from, trip);
      } else {
        trip.path = planWater(from.berth, to.berth);
        if (!trip.path) { g.showInfo('לא נמצא נתיב מים פתוח לרציף הזה.', 3.5); return false; }
        trip.index = 0;
        if (cargo) {
          trip.car = g.player;
          trip.carOrigin = { x: g.player.x, z: g.player.z, yaw: g.player.yaw };
        }
        this.beginBoat(from.berth, trip);
      }
      g.showInfo((cargo ? 'מעבורת רכבים · ' : air ? 'טיסת מסוק · ' : 'מעבורת · ') + to.name, 3.8);
      return true;
    }

    camera(actor, dt, air) {
      const c = this.game.cam, sin = Math.sin(actor.yaw), cos = Math.cos(actor.yaw);
      const rear = air ? 18 : 12, k = 1 - Math.exp(-dt * 4);
      const y = air ? actor.y : .7;
      c.x = H.lerp(c.x, actor.x + sin * rear, k);
      c.z = H.lerp(c.z, actor.z + cos * rear, k);
      c.y = H.lerp(c.y, y + (air ? 8 : 4.5), k);
      c.tx = H.lerp(c.tx, actor.x - sin * 5, k);
      c.tz = H.lerp(c.tz, actor.z - cos * 5, k);
      c.ty = H.lerp(c.ty, y + 1, k);
      c.fov = 64;
      c.underwater445 = false;
    }

    stepFerry(dt) {
      const g = this.game, trip = this.trip, boat = g.boat444;
      trip.elapsed += dt;
      const to = trip.path[trip.index], last = trip.index === trip.path.length - 1;
      if (trip.phase !== 'arrived') {
        const gap = dist(boat, to), target = last ? H.clamp(gap * .85, 2, 38) : 38;
        boat.velocity = H.lerp(boat.velocity, target, 1 - Math.exp(-dt * (last ? 1.55 : 1.25)));
        const movement = Math.min(gap, boat.velocity * dt);
        const dx = to.x - boat.x, dz = to.z - boat.z;
        if (gap > .001) {
          const course = wrap(dx, dz);
          const dockTurn = last ? H.clamp(1 - gap / 14, 0, 1) : 0;
          const yaw = course + H.angleDiff(course, trip.to.berth.yaw) * dockTurn;
          boat.yaw += H.angleDiff(boat.yaw, yaw) * (1 - Math.exp(-dt * 5.5));
          boat.x += dx / gap * movement;
          boat.z += dz / gap * movement;
          trip.distance += movement;
        }
        boat.pitch = -.075 * Math.min(1, boat.velocity / 36);
        if (gap <= movement + .001) {
          if (last) { trip.phase = 'arrived'; boat.velocity = 0; boat.pitch = 0; boat.yaw = trip.to.berth.yaw; }
          else trip.index++;
        }
      }
      boat.trailClock += dt;
      if (boat.velocity > 3 && boat.trailClock >= .10) {
        const offX = Math.sin(boat.yaw) * 4, offZ = Math.cos(boat.yaw) * 4;
        for (const side of [-1, 1]) boat.wake.push({ x: boat.x + offX + side * Math.cos(boat.yaw),
          z: boat.z + offZ - side * Math.sin(boat.yaw), yaw: -boat.yaw + side * .23, age: 1 });
        boat.trailClock = 0;
      }
      for (const foam of boat.wake) foam.age -= dt * .66;
      while (boat.wake.length && boat.wake[0].age <= 0) boat.wake.shift();
      this.camera(boat, dt, false);
      this.refresh(dt);
    }

    stepAir(dt) {
      const g = this.game, trip = this.trip, visit = g.roofVisit, h = visit.aircraft, pad = trip.to.pad;
      trip.elapsed += dt;
      if (trip.phase === 'climb') {
        h.y = Math.min(trip.altitude, h.y + 17 * dt);
        if (h.y >= trip.altitude) trip.phase = 'cruise';
      } else if (trip.phase === 'cruise') {
        const gap = dist(h, pad), speed = H.clamp(gap * .87, 5, 54);
        const movement = Math.min(gap, speed * dt);
        const dx = pad.x - h.x, dz = pad.z - h.z;
        if (gap > .001) {
          h.x += dx / gap * movement;
          h.z += dz / gap * movement;
          h.yaw = wrap(dx, dz);
          trip.distance += movement;
        }
        visit.speed = speed;
        h.pitch = -.105 * Math.min(1, speed / 52);
        if (gap <= movement + .001) { trip.phase = 'descend'; visit.speed = 0; h.pitch = 0; }
      } else if (trip.phase === 'descend') {
        const land = Math.max(pad.y + 1.55, H.outdoorHeight(pad.x, pad.z) + 2.18);
        h.y = Math.max(land, h.y - (h.y > land + 10 ? 16 : 5) * dt);
        if (h.y <= land + .01) trip.phase = 'arrived';
      }
      h.rotor = (h.rotor + 20 * dt) % H.TAU;
      this.camera(h, dt, true);
      this.refresh(dt);
    }

    refresh(dt) {
      this.hudTime = (this.hudTime || 0) + dt;
      if (this.hudTime > .2) { this.hudTime = 0; this.game.updateHUD(); }
    }

    exitTrip() {
      const g = this.game, trip = this.trip;
      if (trip.phase !== 'arrived') { g.showInfo('אפשר לרדת אחרי ההגעה ליעד.', 2.5); return true; }
      if (trip.car) {
        const at = trip.to.carDrop;
        const probe = { ...trip.car, ...at };
        if (g.world.nearby(at.x, at.z).some(o => H.carBuildingContact(probe, o)) ||
            [...g.parked, ...g.civilian, ...g.police].some(c => c.alive && dist(c, at) < 4.8)) {
          g.showInfo('הדרך מהרציף תפוסה כרגע · נסו שוב כשהיא מתפנה', 3); return true;
        }
        this.trip = this.anchor = null;
        g.boat444 = null;
        g.inVehicle = true;
        Object.assign(trip.car, at, { vx: 0, vz: 0, speed: 0, yawRate: 0, steer: 0, deck443: false });
        g.cameraMode = 0;
        g.cameraTransfer = .6;
        g.keys.clear();
        g.updateCamera(.1);
        g.showInfo('הרכב ירד מהמעבורת · ' + trip.to.name, 3);
        g.updateHUD();
        return true;
      }
      const at = trip.kind === 'air' ? gate(trip.to.pad) : board(trip.to.berth);
      disembark(g, at, 'הגעתם אל ' + trip.to.name + ' · אפשר לחקור ברגל');
      return true;
    }

    travelPanel() {
      if (!this.hud) {
        const parent = document.getElementById('hud');
        if (!parent) return null;
        const root = element('section', 'position:absolute;left:12px;bottom:clamp(130px,21%,230px);width:min(295px,calc(100% - 28px));display:grid;gap:5px;padding:8px;color:#e5f5f4;background:#08232bef;border:1px solid #568790;border-radius:9px;text-align:right;pointer-events:auto;font:550 12px system-ui');
        root.id = 'island-transport53'; root.dir = 'rtl';
        root.setAttribute('aria-label', 'תחבורה לאיים');
        const label = element('strong'), button = element('button', rowButton), destinations = element('div', 'display:grid;gap:4px;max-height:min(35vh,200px);overflow:auto');
        button.type = 'button';
        button.addEventListener('click', () => {
          if (this.trip) this.exitTrip();
          else { this.selected = !this.selected; this.drawHud(); }
        });
        root.append(label, button, destinations); parent.append(root);
        this.hud = { root, label, button, destinations, key: '' };
      }
      return this.hud;
    }

    drawHud() {
      const g = this.game, trip = this.trip, station = this.station();
      if (!active(g) || (!trip && !station && !g.boat444 && !g.roofVisit?.roof?.islandPad53)) {
        if (this.hud) this.hud.root.style.display = 'none';
        this.selected = false;
        return;
      }
      const hud = this.travelPanel();
      if (!hud) return;
      hud.root.style.display = 'grid';
      if (trip) {
        const title = trip.car ? 'מעבורת רכבים' : trip.kind === 'air' ? 'מסוק נוסעים' : 'מעבורת';
        const phase = { climb: 'המראה', cruise: 'בדרך', descend: 'נחיתה', arrived: 'הגענו' }[trip.phase];
        const progress = trip.phase === 'cruise' && trip.distance > 0 ? ` · ${Math.round(trip.distance)} מ׳` : '';
        hud.label.textContent = `${title} · ${trip.to.name} · ${phase}${progress}`;
        hud.button.textContent = trip.car ? 'הורידו את הרכב · E' : 'רדו כאן · E';
        hud.button.hidden = trip.phase !== 'arrived';
        hud.destinations.hidden = true;
      } else if (g.boat444 || g.roofVisit?.roof?.islandPad53) {
        hud.label.textContent = g.boat444 ? 'שיט ידני · W/S מצערת · A/D פנייה · רווח עצירה · E רציף' :
          'מסוק ידני · WASD תנועה · רווח עלייה · Shift ירידה · E נחיתה';
        hud.button.hidden = hud.destinations.hidden = true;
      } else {
        hud.label.textContent = station.car ? 'רציף רכב · סעו עם הרכב אל האי הפרטי' : station.dock && station.pad ? 'תחבורה לאיים' : station.dock ? 'רציף האיים · E שיט ידני' :
          this.nearbyPad() ? 'מנחת · E הטסת מסוק ידנית' : 'טיסות לאיים · מסוק נוסעים';
        hud.button.textContent = this.selected ? 'סגור יעדים · B' : 'בחירת יעד לאיים · B';
        hud.button.hidden = false;
        hud.destinations.hidden = !this.selected;
        const key = (station.car?.id || '') + ':' + (station.dock?.id || '') + ':' + (station.pad?.id || '');
        if (this.selected && hud.key !== key) {
          const actions = [];
          for (const [kind, from, list] of [['car', station.car, this.waterStops], ['ferry', station.dock, this.waterStops], ['air', station.pad, this.airStops]]) {
            if (!from) continue;
            for (const to of list) {
              if (from.id === to.id || (kind === 'car' && (!to.carDrop || (from.id !== estateId && to.id !== estateId)))) continue;
              const button = element('button', rowButton);
              button.type = 'button';
              button.textContent = (kind === 'car' ? 'מעבורת רכבים · ' : kind === 'air' ? 'טיסה · ' : 'מעבורת · ') + to.name;
              button.addEventListener('click', () => this.start(kind, to.id));
              actions.push(button);
            }
          }
          hud.destinations.replaceChildren(...actions);
          hud.key = key;
        }
      }
    }
  }

  function get(g) {
    if (!g.world.islandPorts53 && g.avatar && g.nav445) H.islands53?.setup(g);
    if (!g.transport53 || g.transport53.world !== g.world || g.transport53.portSource !== g.world.islandPorts53) {
      g.transport53?.hud?.root.remove();
      g.transport53 = new Transport(g);
      if (g.nav445?.world === g.world) g.nav445.places = g.nav445.buildPlaces();
    }
    return g.transport53;
  }

  H.transport53 = {
    planWater, waterLine, get, disembark,
    captureOverride: g => g.transport53?.trip?.carOrigin || null,
    ownsInteraction: g => !!(g.transport53?.trip || g.boat444 || (onFoot(g) && (get(g).nearbyDock() || get(g).nearbyPad()))),
    saveAnchor: g => (g.transport53?.trip || g.boat444 || g.roofVisit?.roof?.islandPad53) ?
      g.transport53?.anchor || (g.world.marina444?.berths[0] && board(g.world.marina444.berths[0])) : null
  };

  const nav = H.Navigator445.prototype, places = nav.buildPlaces;
  nav.buildPlaces = function () {
    const result = places.call(this);
    for (const p of this.world.islandPorts53 || []) {
      const at = p.berth ? board(p.berth) : p.pad ? gate(p.pad) : null;
      if (at) result.push({ ...at, id: `island53:${p.id}`, name: p.name + ' · רציף ומנחת', icon: '⚓', level: 0, district: true });
    }
    return result;
  };

  RC.installers.push(({ prototype: P }) => {
    const restart = P.restart;
    P.restart = function (...args) {
      this.transport53?.hud?.root.remove();
      this.transport53 = null;
      return restart.apply(this, args);
    };
    const toggle = P.toggleVehicle;
    P.toggleVehicle = function () {
      const t = get(this);
      if (active(this) && t.trip) return t.exitTrip();
      if (onFoot(this)) {
        const pad = t.nearbyPad();
        if (pad) { t.beginHeli(pad); return; }
      }
      return toggle.call(this);
    };
    const berth = P.nearbyBerth444;
    P.nearbyBerth444 = function () {
      if (!onFoot(this)) return berth.call(this);
      const direct = H.privateFleet53?.nearbyBoat(this) || get(this).nearbyDock()?.berth || berth.call(this);
      return direct && (direct.fleet53Id || boatCrew(direct)) ? direct : null;
    };
    const marina = P.interactMarina444;
    P.interactMarina444 = function () {
      const t = get(this);
      if (t.trip) return t.exitTrip();
      if (this.boat444) {
        const b = this.boat444;
        const docks = [...this.world.marina444.berths, ...t.waterStops.map(loc => loc.berth), ...(H.estate53World?.slots.boat || [])];
        const dock = docks.filter(p => dist(p, b) < 7.2).sort((a, c) => dist(a, b) - dist(c, b))[0];
        if (!dock || Math.abs(b.velocity) > 2.45) { this.showInfo('האטו ליד רציף ולחצו E לעגינה.', 2.8); return true; }
        disembark(this, board(dock), 'עגנתם ברציף · אפשר לרדת לחוף');
        return true;
      }
      if (!onFoot(this)) return false;
      const p = this.nearbyBerth444();
      if (p) { t.beginBoat(p); return true; }
      return marina.call(this);
    };
    const roof = P.interactRoof;
    P.interactRoof = function () {
      const t = get(this), v = this.roofVisit;
      if (t.trip) return t.exitTrip();
      const h = v?.aircraft;
      const at = v?.pilot && t.airStops.find(loc => dist(loc.pad, h) < 5.2 &&
        h.y >= loc.pad.y + .7 && h.y <= loc.pad.y + 4.5);
      if (at && v.speed < 6.7 && Math.abs(h.vy || 0) < 2.6) {
        disembark(this, gate(at.pad), 'נחתתם במנחת · ' + at.name);
        return;
      }
      return roof.call(this);
    };
    const steer = P.is;
    P.is = function (...keys) {
      if (this.boat444 && this.keys.has('Space') && keys.some(key => ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(key))) return false;
      return steer.apply(this, keys);
    };
    const water = P.updateMarina444;
    P.updateMarina444 = function (dt) {
      const t = get(this);
      if (t.trip?.kind === 'ferry') return t.stepFerry(dt);
      if (this.boat444 && this.keys.has('Space')) this.boat444.velocity *= Math.exp(-dt * 4.5);
      return water.call(this, dt);
    };
    const air = P.updatePublicRoof;
    P.updatePublicRoof = function (dt) {
      const t = get(this);
      if (t.trip?.kind === 'air') return t.stepAir(dt);
      return air.call(this, dt);
    };
    const keyDown = P.keyDown;
    P.keyDown = function (event) {
      if (!active(this) || editable(event.target)) return keyDown.call(this, event);
      const t = get(this);
      if (!event.repeat && event.code === 'KeyB' && t.station()) {
        event.preventDefault(); t.selected = !t.selected; t.drawHud(); return;
      }
      if (this.boat444 && event.code === 'Space') {
        event.preventDefault(); this.keys.add('Space'); return;
      }
      const vessel = this.boat444 || this.roofVisit?.roof?.islandPad53;
      if ((t.trip && event.code === 'KeyN') || (vessel && ['KeyR', 'KeyF', 'KeyG', 'KeyI', 'KeyO', 'KeyT', 'KeyU', 'KeyV', 'KeyJ'].includes(event.code))) return;
      return keyDown.call(this, event);
    };
    const hud = P.updateHUD;
    P.updateHUD = function () { const result = hud.call(this); get(this).drawHud(); return result; };
    const dynamic = P.buildDynamic;
    P.buildDynamic = function () {
      const out = dynamic.call(this);
      if (this.inside) return out;
      const t = get(this), moving = this.boat444;
      const storedBoats = H.privateFleet53?.mooredBoats(this) || [];
      for (const loc of t.islands) {
        const b = loc.berth;
        if (!b || !boatCrew(b) || storedBoats.some(stored => dist(stored, b) < 7) || dist(b, this.cam) > 210 || moving?.id === b.id || (moving && dist(moving, b) < 9)) continue;
        H.maritimeModel444(b, out, this.seconds, !this.renderer.gl);
      }
      if (!this.roofVisit) for (const [index, { pad }] of t.airStops.entries()) {
        if (dist(pad, this.cam) >= 70) continue;
        const h = H.createPoliceHelicopter(30 + index, pad.x, pad.z);
        h.y = pad.y + 1.55;
        H.helicopterBoxes(h, out, dist(pad, this.cam), true);
      }
      for (const b of storedBoats) {
        if (dist(b, this.cam) < 210 && moving?.fleet53Id !== b.fleet53Id) H.maritimeModel444(b, out, this.seconds, !this.renderer.gl);
      }
      if (moving && t.trip?.car) freightModel(this, moving, t.trip.car, out);
      else if (moving && !this.world.marina444?.berths.some(b => b.id === moving.id)) {
        const at = out.length;
        H.maritimeModel444(moving, out, this.seconds, !this.renderer.gl);
        if (moving.mode === 'ferry') for (let i = at; i < out.length; i++) {
          const box = out[i], scale = 1.4;
          box.x = moving.x + (box.x - moving.x) * scale;
          box.z = moving.z + (box.z - moving.z) * scale;
          box.y *= scale; box.w *= scale; box.h *= scale; box.d *= scale;
        }
      }
      return out;
    };
  });
})(Heatline);
