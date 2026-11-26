/* SUNSET STATE — airport passengers, terminal staff and local departure board. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled || new URLSearchParams(location.search).has('airport54Off')) return;

  const states = new WeakMap(), minds = new WeakMap();
  const empty = Object.freeze([]);
  const limits = Object.freeze({ passengers: 50, view: 32, drawRadius: 122, step: .08, cell: 2 });
  const period = 254, boardingTime = 99, finalCall = 18, departureDisplay = 17;
  const timetables = {
    A: { first: 71, number: 241, destinations: ['מפרץ השקיעה', 'האי הירוק', 'מפרץ האלמוגים'] },
    B: { first: 190, number: 368, destinations: ['האי הירוק', 'מפרץ האלמוגים', 'מפרץ השקיעה'] }
  };
  const femaleNames = ['תמר','דנה','יעל','נועה','מיכל','שיר','עדי','ליה','אמילי','גלי','אביגיל','מאיה','קרן','סיון','רותם',
    'אלונה','רוני','מורן','איה','גפן','נעמי','ליאת','שני','רעות','אורי','שרה','הילה','רינת','טליה','נוגה','אורית','אורלי'];
  const maleNames = ['עמית','עומר','איתן','נועם','אורן','מיכאל','יואב','ליאם','אדם','נתן','דניאל','יונתן','אסף','יובל','יניב',
    'ליאור','אופק','עידן','ניר','רועי','אמיר','אייל','אלון','עוז','גיל','אלעד','דור','נדב','רון','שי','שחר','מאור'];
  const bagColors = ['#364d60','#76664e','#823f47','#466153','#504250','#28323b','#9e6e42','#5a6880'];
  const uniformColors = { 'check-in': '#314e63', screening: '#2c4359', gate: '#375a63', information: '#3c6068', cafe: '#725744', claim: '#465962' };
  const sq = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  const dist = (a, b) => Math.sqrt(sq(a, b));
  const pointOf = o => o?.point || o;
  const at = (a, p, epsilon = .055) => sq(a, p) < epsilon * epsilon;
  const finitePoint = p => p && Number.isFinite(p.x + p.z);
  const heading = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
  const walking = g => !g.inVehicle && !g.boat444 && !g.flight51?.pilot && !g.avatar?.swim445;
  const focusOf = g => g.flight51?.pilot ? g.flight51.plane : g.inVehicle ? g.player : g.avatar;

  function number(seed) {
    seed = Math.imul(seed ^ seed >>> 16, 0x21f0aaad);
    return (Math.imul(seed ^ seed >>> 15, 0x735a2d97) ^ seed >>> 11) >>> 0;
  }

  function timetable(gate, cycle, elapsed) {
    const row = timetables[gate], depart = row.first + cycle * period;
    const remaining = depart - elapsed;
    return { code: 'SS ' + (row.number + cycle % 24 * 2), destination: row.destinations[cycle % row.destinations.length],
      gate, cycle, phase: remaining <= 0 ? 'departed' : remaining <= finalCall ? 'last-call' :
        remaining <= boardingTime ? 'boarding' : 'check-in', secondsToDeparture: Math.ceil(Math.max(0, remaining)), departureAt: depart };
  }

  function cycleFor(gate, elapsed) {
    return Math.max(0, Math.ceil((elapsed - timetables[gate].first) / period));
  }

  function flightFor(s, m) {
    return m.gate ? timetable(m.gate, m.flightCycle, s.elapsed) : null;
  }

  function book(s, m, needsTime) {
    const gate = m.gate;
    const cycle = cycleFor(gate, s.elapsed);
    m.flightCycle = timetable(gate, cycle, s.elapsed).secondsToDeparture < needsTime ? cycle + 1 : cycle;
  }

  function flights(g) {
    const s = setup(g);
    if (!s) return empty;
    if (s.boardAt === Math.floor(s.elapsed)) return s.boardRows;
    s.boardAt = Math.floor(s.elapsed);
    const rows = [];
    for (const gate of s.gates.keys()) {
      const cycle = cycleFor(gate, s.elapsed - departureDisplay);
      for (const index of [cycle, cycle + 1]) {
        const row = timetable(gate, index, s.elapsed);
        rows.push(Object.freeze({ ...row, boarded: s.boarded.get(`${gate}:${index}`) || 0 }));
      }
    }
    s.boardRows = Object.freeze(rows.sort((a, b) => a.departureAt - b.departureAt));
    return s.boardRows;
  }

  function stateOf(actor) {
    const m = minds.get(actor);
    if (!m) return null;
    const flight = flightFor(m.world, m);
    return { active: m.active, activity: m.activity, role: actor.airport54Role, name: actor.airport54Name,
      gate: m.gate, flight, flightCode: flight?.code || null, destination: flight?.destination || null,
      queue: m.queue?.id || null, seat: m.seat?.id || null };
  }

  function face(a, yaw, dt) {
    a.yaw += H.angleDiff(a.yaw, yaw) * (1 - Math.exp(-dt * 9));
  }

  function still(a, dt, pose = 'walk') {
    a.speed = a.vx = a.vz = a.gaitScale = 0;
    a.stride *= Math.exp(-dt * 11);
    a.navActivity = pose;
    a.pause = pose === 'phone' ? .7 : 0;
  }

  function boundNear(s, p, radius) {
    return p && Math.abs(p.x - s.center.x) < s.radiusX + radius && Math.abs(p.z - s.center.z) < s.radiusZ + radius &&
      Math.abs((p.y || 0) - s.layout.floorY) < radius * .48 + 9;
  }

  function openPoint(s, p, radius = .32) {
    const obstacles = s.obstacleCells?.get(`${Math.floor(p.x / 8)}:${Math.floor(p.z / 8)}`) || empty;
    return !obstacles.some(b => {
      if (b.lowSight472 && (b.h || b.top - s.layout.floorY) < .25) return false;
      const x = Math.max(0, Math.abs(p.x - b.x) - b.hw), z = Math.max(0, Math.abs(p.z - b.z) - b.hd);
      return x * x + z * z < radius * radius;
    });
  }

  function obstacleCells(obstacles) {
    const cells = new Map();
    for (const o of obstacles) {
      for (let x = Math.floor((o.x - o.hw - 1) / 8); x <= Math.floor((o.x + o.hw + 1) / 8); x++) {
        for (let z = Math.floor((o.z - o.hd - 1) / 8); z <= Math.floor((o.z + o.hd + 1) / 8); z++) {
          const key = `${x}:${z}`;
          const entries = cells.get(key);
          if (entries) entries.push(o); else cells.set(key, [o]);
        }
      }
    }
    return cells;
  }

  function clearSegment(s, from, to, radius = .32) {
    const steps = Math.max(1, Math.ceil(dist(from, to) / .82));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!openPoint(s, { x: H.lerp(from.x, to.x, t), z: H.lerp(from.z, to.z, t),
        y: H.lerp(from.y ?? s.layout.floorY, to.y ?? s.layout.floorY, t) }, radius)) return false;
    }
    return true;
  }

  function routeBetween(s, from, to) {
    if (!finitePoint(to)) return null;
    if (at(from, to)) return [to];
    if (s.layout.path) return s.layout.path(from, to) || null;
    if (clearSegment(s, from, to)) return [to];
    return null;
  }

  function mark(m, activity, mode, seconds = 0) {
    if (m.activity !== activity) m.world.metrics.activities[activity] = (m.world.metrics.activities[activity] || 0) + 1;
    m.activity = activity;
    m.mode = mode;
    m.delay = seconds;
  }

  function setPath(m, points, activity, next, fixed = false) {
    m.path = points;
    m.index = 0;
    m.next = next;
    m.fixed = fixed;
    m.blockedFor = 0;
    mark(m, activity, 'path');
  }

  function walkTo(m, target, activity, next, tail = empty) {
    const path = routeBetween(m.world, m.actor, target);
    if (!path?.length) return false;
    setPath(m, tail.length ? [...path, ...tail] : path, activity, next);
    return true;
  }

  function queueClear(s, p) {
    return s.queueWalks.every(({ entry, service }) => {
      const dx = service.x - entry.x, dz = service.z - entry.z, d = Math.hypot(dx, dz) || 1;
      const px = p.x - entry.x, pz = p.z - entry.z, along = (px * dx + pz * dz) / d;
      return along < -2 || along > d + 1.1 || Math.abs(px * dz - pz * dx) / d > 1.7;
    });
  }

  function placement(s, center, seed, search = 4, hold = false) {
    if (!finitePoint(center)) return null;
    for (let i = 0; i < 40; i++) {
      const angle = (seed % 100 * .0628) + i * 2.39996, radius = i ? .83 + (search - .83) * (i / 40) ** .68 : 0;
      const p = { x: center.x + Math.sin(angle) * radius, z: center.z + Math.cos(angle) * radius, y: center.y ?? s.layout.floorY, yaw: center.yaw };
      if ((s.layout.contains?.(p.x, p.z) ?? H.airport54World.contains(p.x, p.z)) && openPoint(s, p, .58) &&
        (!hold || queueClear(s, p)) &&
        ![...s.active].some(a => sq(a, p) < .93 ** 2) && ![...s.holding.values()].some(q => sq(q, p) < .93 ** 2)) return p;
    }
    return null;
  }

  function addActor(s, index, role, p = null) {
    const seed = number(index + 54000), female = !(index % 2);
    const name = (female ? femaleNames : maleNames)[(index >> 1) % femaleNames.length];
    const a = H.createWalker(p?.x ?? 0, p?.z ?? 0, p?.yaw ?? 0, seed % 12);
    const appearance = ((seed & ~(3 << 9)) | (female ? 1 : (seed & 1) * 2) << 9) >>> 0;
    Object.assign(a, { appearance, airport54Id: index, airport54Name: name, airport54Role: role, airport54Activity: 'offstage',
      y: p?.y ?? s.layout.floorY, speed: 0, phase: seed % 628 / 100 });
    const m = { world: s, actor: a, seed, pace: 1.16 + (seed % 27) * .018, female, gate: null, active: false,
      mode: 'offstage', activity: 'offstage', delay: 1.6 + (index % 13) * 1.35, hold: 0, queue: null, seat: null,
      flightCycle: 0, cycleCount: 0, seatBlend: 0, phone: false, bag: role === 'passenger' ? ['case','case','case','hand','pack','case','none','hand'][index % 8] : 'none',
      bagColor: bagColors[(seed >>> 16) % bagColors.length], lastGreeting: -80, lastBump: -12 };
    s.pool.push(a);
    minds.set(a, m);
    if (p) appear(m, p);
    return m;
  }

  function appear(m, p) {
    Object.assign(m.actor, { x: p.x, y: p.y ?? m.world.layout.floorY, z: p.z, yaw: p.yaw ?? 0 });
    m.active = true;
    m.world.active.add(m.actor);
  }

  function queueFrom(spec, role, gate = null) {
    const points = spec.points || spec.queue;
    if (!points?.length || !points.every(finitePoint)) return null;
    const service = spec.service || points.at(-1);
    return { id: spec.id, role, gate, points, entry: spec.entry || points[0], service,
      exit: spec.exit || service, exitPath: spec.exitPath, members: [], approach: null };
  }

  function queueRole(spec) {
    const n = String(spec.zone || spec.id).toLowerCase();
    if (/screen|secur/.test(n)) return 'screening';
    if (/check/.test(n)) return 'check-in';
    if (/cafe|coffee/.test(n)) return 'cafe';
    return null;
  }

  function reserveQueue(m, q, seeded = false) {
    if (!q || q.members.length >= q.points.length || q.approach && q.approach !== m) return false;
    const s = m.world;
    const path = seeded ? null : routeBetween(s, m.actor, q.entry);
    if (!seeded && !path?.length) return false;
    s.holding.delete(m);
    m.queue = q;
    m.slot = seeded ? q.points.length - q.members.length - 1 : -1;
    m.serviceLeft = null;
    q.members.push(m);
    if (seeded) {
      const p = q.points[m.slot], next = q.points[m.slot + 1] || q.service;
      appear(m, { ...p, yaw: p.yaw ?? (at(p, next) ? q.service.yaw : heading(p, next)) });
      mark(m, q.role === 'gate' ? 'gate-queue' : q.role, 'queue');
    } else {
      q.approach = m;
      setPath(m, path, q.role === 'gate' ? 'gate-queue' : q.role, 'join-queue');
    }
    return true;
  }

  function findQueue(m, role) {
    const s = m.world;
    const candidates = role === 'gate' ? [s.gates.get(m.gate)?.queue].filter(Boolean) : s.queues.filter(q => q.role === role);
    return candidates.slice().sort((a, b) => a.members.length - b.members.length || sq(m.actor, a.entry) - sq(m.actor, b.entry));
  }

  function waitingForQueue(m, role) {
    for (const q of findQueue(m, role)) if (reserveQueue(m, q)) return;
    const s = m.world, q = findQueue(m, role)[0];
    m.requestedQueue = role;
    const center = q?.entry || s.layout.positions.hub;
    const buffer = s.holding.get(m) || placement(s, center, m.seed, 8.3, true);
    if (buffer && !at(m.actor, buffer, .6) && walkTo(m, buffer, role === 'gate' ? 'gate-wait' : 'waiting', 'queue-retry')) {
      s.holding.set(m, buffer);
      return;
    }
    mark(m, role === 'gate' ? 'gate-wait' : 'waiting', 'queue-retry', 1.4 + (m.seed % 8) * .13);
  }

  function cancelQueue(m) {
    const q = m.queue;
    if (!q) return;
    q.members.splice(q.members.indexOf(m), 1);
    if (q.approach === m) q.approach = null;
    m.queue = null;
  }

  function bestSeat(s, m, zone) {
    const gate = s.gates.get(m.gate);
    let best = null, score = Infinity;
    for (const seat of s.layout.seats || empty) {
      if (seat.zone !== zone || seat.id === m.rejectedSeat || s.seats.has(seat.id) || !finitePoint(seat.point) || !finitePoint(seat.approach) ||
        !openPoint(s, seat.approach, .57)) continue;
      const focus = zone === 'cafe' ? s.layout.positions.cafe : gate?.point || m.actor;
      const d = sq(seat.approach, focus) + (number(m.seed ^ (seat.index || seat.point.x * 100)) % 1000) * .39;
      if (d < score) { score = d; best = seat; }
    }
    return best;
  }

  function takeSeat(m, seeded = false, visit = 'lounge') {
    const s = m.world, seat = bestSeat(s, m, visit === 'cafe' ? 'cafe' : 'gate' + m.gate);
    if (!seat) return false;
    if (!seeded && !walkTo(m, seat.approach, visit, 'seat-approach')) return false;
    m.visit = visit;
    m.seat = seat;
    s.seats.set(seat.id, m);
    if (seeded) {
      appear(m, { ...seat.point, yaw: seat.yaw });
      m.seatBlend = 1;
      m.actor.socialPose = 'sit';
      mark(m, visit === 'cafe' ? 'cafe' : 'seated', 'seated', visit === 'cafe' ? 16 + m.seed % 17 : 5 + m.seed % 9);
    }
    return true;
  }

  function releaseSeat(m) {
    const seat = m.seat;
    if (!seat) return;
    m.world.seats.delete(seat.id);
    m.seat = null;
    m.actor.socialPose = 'walk';
    m.seatBlend = 0;
  }

  function gateReady(m) {
    const row = flightFor(m.world, m);
    if (row.phase === 'departed') book(m.world, m, 18);
    return row.phase === 'boarding' || row.phase === 'last-call';
  }

  function lounge(m, tryQueue = true) {
    const q = m.world.gates.get(m.gate).queue;
    if (tryQueue && gateReady(m) && reserveQueue(m, q)) return;
    if (takeSeat(m)) return;
    const s = m.world, gate = s.gates.get(m.gate), behind = gate?.waiting || s.layout.positions.concourse;
    const p = placement(s, behind, m.seed, 5.1, true);
    if (p && walkTo(m, p, 'lounge', 'lounge-wait')) { s.holding.set(m, p); return; }
    mark(m, 'lounge', 'lounge-wait', 4 + m.seed % 6);
  }

  function gateState(s, g) {
    const id = g.id === 'B' ? 'B' : 'A';
    const gateQueue = s.layout.queues.find(q => q.zone === 'gate' + id);
    const queue = queueFrom(gateQueue || { ...g, id: 'gate-' + id, service: g.point }, 'gate', id);
    const bridge = g.board?.length ? g.board : [g.point, g.exit].filter(finitePoint);
    const exit = queue && routeBetween(s, queue.service, queue.exit);
    const connector = queue && routeBetween(s, queue.exit, bridge[0]);
    const board = exit?.length && connector?.length ? [...exit, ...connector, ...bridge] : null;
    if (!queue || !board?.length) return null;
    return { ...g, queue, board, waiting: g.waiting || s.layout.positions.concourse };
  }

  function initialize(g, layout) {
    const center = layout.center || { x: layout.x ?? layout.positions.hub.x, z: layout.z ?? layout.positions.hub.z };
    const s = { game: g, world: g.world, layout, center, radiusX: layout.hw || 119, radiusZ: (layout.hd || 30) + 19,
      pool: [], active: new Set(), seats: new Map(), holding: new Map(), bins: new Map(), queues: [], gates: new Map(), boarded: new Map(),
      inboundAt: -30,
      obstacleCells: obstacleCells(layout.obstacles || empty),
      elapsed: 0, frame: 0, boardAt: -1, voiceAt: -40, boardRows: empty, view: [], metrics: { steps: 0, moves: 0, waves: 0,
        yielded: 0, completed: Object.create(null), activities: Object.create(null), boarded: 0, recycled: 0, voice: 0, drawn: 0, props: 0 } };
    for (const spec of layout.queues || empty) {
      const role = queueRole(spec), q = role && queueFrom(spec, role);
      if (q) s.queues.push(q);
    }
    for (const spec of layout.gates || empty) {
      const gate = gateState(s, spec);
      if (gate) s.gates.set(spec.id, gate);
    }
    if (!s.gates.size) return null;
    s.queueWalks = [...s.queues, ...[...s.gates.values()].map(gate => gate.queue)];
    s.arrival = layout.offstage?.arrival || layout.entry.outside;
    s.arrivalPath = layout.offstage?.entry?.length ? layout.offstage.entry : layout.routes.entry;
    s.claimExit = [layout.point(layout.arrivals, layout.front), layout.point(layout.arrivals, layout.front - 16.6)];
    const gateIds = [...s.gates.keys()];
    for (let i = 0; i < limits.passengers; i++) {
      const m = addActor(s, i, 'passenger');
      m.gate = gateIds[i % gateIds.length];
      book(s, m, i < 18 ? 0 : i < 34 ? 83 : 155);
      let placed = false;
      if (i < 6) {
        m.gate = gateIds[0];
        book(s, m, 0);
        placed = reserveQueue(m, s.gates.get(m.gate).queue, true);
      }
      if (!placed && i < 23) placed = takeSeat(m, true);
      if (!placed && i >= 23 && i < 39) {
        const role = i < 31 ? 'check-in' : 'screening';
        placed = findQueue(m, role).some(q => reserveQueue(m, q, true));
      }
      if (!placed && i >= 39 && i < 43) placed = takeSeat(m, true, 'cafe');
      if (placed) continue;
      const zone = i < 43 ? 'cafe' : i < 46 ? 'claim' : 'hub';
      const p = placement(s, layout.positions[zone] || layout.positions.hub, m.seed, 6.1);
      if (!p) continue;
      appear(m, p);
      mark(m, zone === 'hub' ? 'arriving' : zone, 'initial', 2.9 + i % 7 * 1.2);
      m.initialZone = zone;
    }
    for (const [i, post] of (layout.staff || empty).entries()) {
      const p = pointOf(post);
      if (!finitePoint(p)) continue;
      const m = addActor(s, limits.passengers + i, post.role, { ...p, yaw: post.yaw ?? p.yaw });
      m.post = post;
      mark(m, post.role, 'staff');
    }
    return s;
  }

  function setup(g) {
    if (!g?.world) return null;
    const old = states.get(g);
    if (old?.world === g.world) return old;
    const layout = g.world.airport54 || H.airport54World?.setup(g);
    if (!layout?.positions?.hub || !layout.gates?.length) return null;
    const s = initialize(g, layout);
    if (s) states.set(g, s);
    return s;
  }

  function actors(g) {
    const s = setup(g);
    return s && boundNear(s, g.avatar, 26) ? s.active : empty;
  }

  function has(g, actor) {
    return !!setup(g)?.active.has(actor);
  }

  function hold(g, actor, seconds = .5) {
    const m = minds.get(actor);
    if (!m?.active || m.world !== states.get(g)) return false;
    m.hold = Math.max(m.hold, Math.min(4, Math.max(0, Number(seconds) || 0)));
    return true;
  }

  function coordinates(p) { return [Math.floor(p.x / limits.cell), Math.floor(p.z / limits.cell)]; }

  function placeInBin(s, a) {
    const [x, z] = coordinates(a), key = `${x}:${z}`;
    let bin = s.bins.get(key);
    if (!bin) { bin = new Set(); s.bins.set(key, bin); }
    bin.add(a);
    minds.get(a).bin = bin;
  }

  function localPeople(s, a) {
    const [x, z] = coordinates(a), neighbours = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const other of s.bins.get(`${x + dx}:${z + dz}`) || empty) {
        if (a !== other && sq(a, other) < 2.7 ** 2) neighbours.push(other);
      }
    }
    return neighbours;
  }

  function clearOf(a, next, other, gap) {
    if (Math.abs((a.y || 0) - (other.y || 0)) > 1.05) return true;
    const previous = sq(a, other), future = sq(next, other);
    return future >= gap * gap || future > previous + .00002;
  }

  function move(m, target, dt, precise = false, permitSeat = false) {
    const s = m.world, a = m.actor, dx = target.x - a.x, dz = target.z - a.z, d = Math.hypot(dx, dz);
    if (d < .026) return true;
    const pace = m.pace * (precise ? .81 : 1), distance = Math.min(pace * dt, d), yaw = Math.atan2(-dx, -dz);
    const neighbours = localPeople(s, a), player = walking(s.game) && s.game.avatar;
    const side = (m.seed & 1) ? -1 : 1;
    const turns = precise ? [0] : [0, side * .83, -side * .83, side * 1.44, -side * 1.44];
    for (const turn of turns) {
      const direction = yaw + turn;
      const next = { x: a.x - Math.sin(direction) * distance, z: a.z - Math.cos(direction) * distance,
        y: H.lerp(a.y, target.y ?? s.layout.floorY, distance / d) };
      if (player && !clearOf(a, next, player, .59) || neighbours.some(other => !clearOf(a, next, other, .69))) continue;
      if (!permitSeat && !openPoint(s, next, .30)) continue;
      a.vx = (next.x - a.x) / dt;
      a.vz = (next.z - a.z) / dt;
      a.speed = a.gaitScale = distance / dt;
      a.stride = H.lerp(a.stride, Math.min(1, a.speed / 1.38), 1 - Math.exp(-dt * 11));
      a.phase += distance * 4.1;
      a.navActivity = 'walk';
      a.pause = 0;
      face(a, direction, dt);
      m.bin?.delete(a);
      Object.assign(a, next);
      placeInBin(s, a);
      s.metrics.moves++;
      return !turn && distance === d;
    }
    still(a, dt);
    s.metrics.yielded++;
    return false;
  }

  function leaveQueue(m, q, next) {
    const s = m.world;
    q.members.shift();
    s.metrics.completed[q.role] = (s.metrics.completed[q.role] || 0) + 1;
    m.queue = null;
    if (q.role === 'gate') {
      const gate = s.gates.get(q.gate), bridge = gate.board;
      m.boardingKey = `${m.gate}:${m.flightCycle}`;
      setPath(m, bridge, 'boarding', 'boarded', true);
      return;
    }
    setPath(m, q.exitPath || [q.exit], q.role, next, true);
  }

  function stepQueue(m, dt) {
    const q = m.queue, a = m.actor, s = m.world, rank = q.members.indexOf(m);
    const end = q.points.length - rank - 1;
    const predecessor = q.members[rank - 1];
    if (m.slot < end && (!predecessor || predecessor.slot >= m.slot + 2)) {
      if (move(m, q.points[m.slot + 1], dt, true)) {
        m.slot++;
        if (q.approach === m) q.approach = null;
      }
      if (m.slot < 0 && routeBlocked(m, dt, 5)) abandonApproach(m);
      return;
    }
    still(a, dt, rank > 0 && m.seed % 5 === 0 ? 'phone' : 'walk');
    const goal = q.points[m.slot + 1] || q.service, p = q.points[m.slot] || q.entry;
    face(a, p.yaw ?? (at(p, goal) ? (q.service.yaw ?? a.yaw) : heading(p, goal)), dt);
    if (rank !== 0 || m.slot !== q.points.length - 1) return;
    if (q.role === 'gate' && !gateReady(m)) return;
    if (!at(a, q.service, .07)) { move(m, q.service, dt, true); return; }
    if (m.serviceLeft === null) m.serviceLeft = (q.role === 'gate' ? .65 : 2.25) + m.seed % 12 * .14;
    m.serviceLeft -= dt;
    if (m.serviceLeft > 0) return;
    if (q.role === 'check-in') { m.checkedBag = m.bag === 'case' && m.seed % 4 === 0; leaveQueue(m, q, 'after-check-in'); }
    else leaveQueue(m, q, 'lounge');
  }

  function inView(g, p, within = limits.drawRadius) {
    const c = g.cam, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
    if (d > within || Math.abs((p.y || 0) - c.y) > 34) return false;
    const fx = c.tx - c.x, fz = c.tz - c.z;
    return d < 8 || dx * fx + dz * fz > d * Math.hypot(fx, fz) * .12;
  }

  function lineClear(g, a, b) {
    if (dist(a, b) > 83.5) return true;
    return H.officerSightClear(a.x, a.z, b.x, b.z, g.world.nearby((a.x + b.x) / 2, (a.z + b.z) / 2));
  }

  function tuckedBehindWall(s, p) {
    const c = s.game.cam;
    const target = { x: p.x, y: p.y + 1.9, z: p.z };
    for (const wall of s.layout.walls || empty) {
      if (wall.id === 'facade') continue;
      let low = 0, high = 1;
      for (const [axis, min, max] of [['x', wall.x - wall.hw, wall.x + wall.hw], ['y', wall.y, wall.y + wall.height],
        ['z', wall.z - wall.hd, wall.z + wall.hd]]) {
        const delta = target[axis] - c[axis];
        if (Math.abs(delta) < 1e-6) {
          if (c[axis] < min || c[axis] > max) { low = 2; break; }
          continue;
        }
        const a = (min - c[axis]) / delta, b = (max - c[axis]) / delta;
        low = Math.max(low, Math.min(a, b));
        high = Math.min(high, Math.max(a, b));
        if (low > high) break;
      }
      if (low <= high && high > .025 && low < .985) return true;
    }
    return false;
  }

  function offCamera(s, p) {
    const g = s.game;
    return (!walking(g) || sq(g.avatar, p) > 7 ** 2) && (!inView(g, p) || tuckedBehindWall(s, p));
  }

  function recycle(m, boarded) {
    const s = m.world, a = m.actor;
    if (!offCamera(s, a)) return false;
    if (boarded) {
      s.metrics.boarded++;
      s.boarded.set(m.boardingKey, (s.boarded.get(m.boardingKey) || 0) + 1);
      for (const key of s.boarded.keys()) {
        const [gate, cycle] = key.split(':');
        if (Number(cycle) < cycleFor(gate, s.elapsed) - 1) s.boarded.delete(key);
      }
      s.boardAt = -1;
    }
    s.active.delete(a);
    s.holding.delete(m);
    m.bin?.delete(a);
    m.active = false;
    m.cycleCount++;
    m.checkedBag = false;
    mark(m, 'offstage', 'offstage', 10 + m.seed % 22);
    s.metrics.recycled++;
    return true;
  }

  function startArrival(m) {
    const s = m.world, p = s.arrival;
    if (s.elapsed - s.inboundAt < 4.8 || !finitePoint(p) || !offCamera(s, p) ||
      [...s.active].some(a => sq(a, p) < 1.65 ** 2)) return;
    const ids = [...s.gates.keys()];
    m.gate = ids[(m.actor.airport54Id + m.cycleCount) % ids.length];
    book(s, m, 133);
    appear(m, { ...p, yaw: s.arrivalPath?.[1] ? heading(p, s.arrivalPath[1]) : p.yaw });
    placeInBin(s, m.actor);
    setPath(m, s.arrivalPath, 'arriving', 'check-in');
    s.inboundAt = s.elapsed;
    s.metrics.waves++;
  }

  function routeBlocked(m, dt, threshold) {
    m.blockedFor = m.actor.speed < .03 ? (m.blockedFor || 0) + dt : 0;
    return m.blockedFor >= threshold;
  }

  function abandonApproach(m) {
    const role = m.queue.role;
    cancelQueue(m);
    if (role === 'gate') lounge(m, false);
    else {
      m.requestedQueue = role;
      mark(m, 'waiting', 'queue-retry', 1.5 + m.seed % 6 * .13);
    }
  }

  function afterPath(m) {
    const s = m.world;
    switch (m.next) {
      case 'join-queue': mark(m, m.activity, 'queue'); break;
      case 'check-in': waitingForQueue(m, 'check-in'); break;
      case 'after-check-in':
        if ((m.seed + m.cycleCount) % 5 === 0 && flightFor(s, m).secondsToDeparture > 144 &&
          [...s.seats.values()].filter(x => x.visit === 'cafe').length < 4 && takeSeat(m, false, 'cafe')) break;
        waitingForQueue(m, 'screening');
        break;
      case 'screening': waitingForQueue(m, 'screening'); break;
      case 'lounge': lounge(m); break;
      case 'lounge-wait': mark(m, 'lounge', 'lounge-wait', 2.5 + m.seed % 6); break;
      case 'queue-retry': mark(m, m.activity, 'queue-retry', 1.1 + m.seed % 5 * .18); break;
      case 'seat-approach': setPath(m, [m.seat.point], m.visit, 'sit', true); break;
      case 'sit': mark(m, m.visit === 'cafe' ? 'cafe' : 'seated', 'seated', m.visit === 'cafe' ? 12 + m.seed % 12 : 4 + m.seed % 8); break;
      case 'seat-exit': {
        const cafe = m.visit === 'cafe';
        releaseSeat(m);
        if (cafe) { waitingForQueue(m, 'screening'); break; }
        const q = s.gates.get(m.gate).queue;
        if (!reserveQueue(m, q)) { if (q.approach === m) q.approach = null; lounge(m, false); }
        break;
      }
      case 'boarded': mark(m, 'boarding', 'boarded'); break;
      case 'departing': mark(m, 'leaving', 'departing'); break;
    }
  }

  function updateActor(m, dt) {
    const s = m.world, a = m.actor, chat = RC.chat48?.active;
    if (!m.active) {
      m.delay -= dt;
      if (m.delay <= 0 && s.frame % 7 === a.airport54Id % 7) startArrival(m);
      return;
    }
    if (chat?.who === a && chat.game === s.game || m.hold > 0) {
      m.hold = Math.max(0, m.hold - dt);
      still(a, dt, 'talk');
      if (!m.seatBlend) face(a, heading(a, s.game.avatar), dt);
      a.airport54Activity = 'talk';
      return;
    }
    m.delay -= dt;
    a.airport54Activity = m.activity;
    if (m.mode !== 'path' && m.mode !== 'queue') still(a, dt);
    switch (m.mode) {
      case 'path': {
        while (m.index < m.path.length && at(a, m.path[m.index], .027)) m.index++;
        if (m.index < m.path.length) {
          const seating = m.next === 'sit' || m.next === 'seat-exit';
          const target = m.path[m.index];
          if (move(m, target, dt, m.fixed, seating)) m.index++;
          if (seating) face(a, m.seat.yaw, dt * 2.7);
          if (m.next === 'join-queue' && routeBlocked(m, dt, 5.4)) { abandonApproach(m); return; }
          if (m.next === 'seat-approach' && routeBlocked(m, dt, 4.1)) {
            const visit = m.visit;
            m.rejectedSeat = m.seat.id;
            releaseSeat(m);
            if (visit === 'cafe') waitingForQueue(m, 'screening');
            else mark(m, 'lounge', 'lounge-wait', 1.4);
            return;
          }
        }
        if (m.index >= m.path.length) afterPath(m);
        break;
      }
      case 'queue': stepQueue(m, dt); break;
      case 'queue-retry': if (m.delay <= 0) waitingForQueue(m, m.requestedQueue); break;
      case 'lounge-wait':
        if (m.delay <= 0) { s.holding.delete(m); lounge(m); }
        break;
      case 'seated':
        m.seatBlend = Math.min(1, m.seatBlend + dt * 3.2);
        a.socialPose = m.seatBlend === 1 ? 'sit' : 'walk';
        face(a, m.seat.yaw, dt);
        if (m.delay <= 0) {
          const q = s.gates.get(m.gate).queue;
          if (m.visit !== 'cafe') {
            if (!gateReady(m) || q.approach || q.members.length >= q.points.length) {
              m.delay = .45 + m.seed % 7 * .07;
              break;
            }
            q.approach = m;
          }
          a.socialPose = 'walk';
          mark(m, m.visit, 'standing');
        }
        break;
      case 'standing':
        m.seatBlend = Math.max(0, m.seatBlend - dt * 3.2);
        if (m.seatBlend === 0) setPath(m, [m.seat.approach], m.visit, 'seat-exit', true);
        break;
      case 'staff':
        face(a, m.post.yaw ?? m.post.point?.yaw ?? a.yaw, dt);
        if (Math.sin(s.elapsed * .35 + m.seed % 11) > .85) still(a, dt, 'phone');
        break;
      case 'initial':
        if (m.delay > 0) {
          if (m.initialZone === 'cafe' && a.airport54Id % 2) still(a, dt, 'phone');
          break;
        }
        if (m.initialZone === 'claim' && walkTo(m, s.layout.positions.arrivals, 'leaving', 'departing', s.claimExit)) break;
        waitingForQueue(m, 'check-in');
        break;
      case 'boarded': recycle(m, true); break;
      case 'departing': recycle(m, false); break;
    }
  }

  function reactions(g, s) {
    if (!walking(g) || RC.chat48?.active || s.elapsed < s.voiceAt || s.frame % 6) return;
    const a = g.avatar;
    for (const w of localPeople(s, a)) {
      const m = minds.get(w), d = dist(a, w);
      if (Math.abs(a.y - w.y) > 1.15 || d > 2.65 || !lineClear(g, a, w)) continue;
      const bump = d < .77 && Math.hypot(a.vx || 0, a.vz || 0) > 2.3;
      if (bump && s.elapsed - m.lastBump < 6 || !bump && s.elapsed - m.lastGreeting < 27) continue;
      const kind = bump ? 'bumpedFoot' : 'greet';
      if (RC.sayReaction53?.(g, w, kind, { priority: bump ? 1 : 0 })) {
        if (bump) m.lastBump = s.elapsed; else m.lastGreeting = s.elapsed;
        s.voiceAt = s.elapsed + (bump ? 2.8 : 7.5);
        s.metrics.voice++;
        return;
      }
    }
  }

  function tick(g, dt) {
    const s = setup(g);
    if (!s || !g.running || g.paused || g.over || g.inside || g.showFullMap || g.garageOpen || g.missionBoardOpen || document.hidden ||
      !boundNear(s, focusOf(g), 39) || !(dt > 0)) return;
    dt = Math.min(dt, limits.step);
    s.elapsed += dt;
    s.frame++;
    s.metrics.steps++;
    s.bins.clear();
    for (const a of s.active) placeInBin(s, a);
    for (const a of s.pool) updateActor(minds.get(a), dt);
    reactions(g, s);
  }

  function isRolling(m) { return m.bag === 'case' && !m.checkedBag; }

  function skinPose(a, pose, bones, seconds) {
    const m = minds.get(a);
    if (!m) return;
    const R = pose.R, sitting = m.seatBlend;
    if (sitting > 0 && sitting < 1) {
      pose.rootY = H.lerp(pose.rootY, -.44, sitting);
      for (const side of ['L', 'R']) {
        R[bones['thigh' + side]][0] = H.lerp(R[bones['thigh' + side]][0], 1.43, sitting);
        R[bones['shin' + side]][0] = H.lerp(R[bones['shin' + side]][0], -1.45, sitting);
        R[bones['fore' + side]][0] = H.lerp(R[bones['fore' + side]][0], .91, sitting);
      }
    }
    if (!sitting && a.navActivity !== 'phone' && a.navActivity !== 'talk') {
      if (isRolling(m)) {
        R[bones.armR] = [-.23, 0, .22];
        R[bones.foreR] = [.24, -.07, -.04];
      } else if (m.bag === 'hand') {
        R[bones.armL] = [.03, 0, -.22];
        R[bones.foreL] = [.13, 0, .03];
      }
    }
    if (!a.speed && sitting) R[bones.head][1] += .13 * Math.sin(seconds * .39 + m.seed % 73);
  }

  function luggage(out, a, m, d) {
    const c = Math.cos(a.yaw), s = Math.sin(a.yaw), y = a.y, sitting = m.seatBlend;
    const before = out.length;
    function piece(x, h, z, w, size, depth, color, material, shape='rounded', pitch=0, roll=0) {
      const q = H.box(a.x + c * x + s * z, y + h, a.z - s * x + c * z, w, size, depth, color, a.yaw, 4);
      q.shape = shape; q.material = material;
      if (pitch) q.pitch = pitch;
      if (roll) q.roll = roll;
      q.airport54Prop = true;
      out.push(q);
    }
    if (isRolling(m)) {
      const moving = Math.min(1, a.speed * .93), x = H.lerp(.40, .64, sitting), z = .35 + .23 * moving - .37 * sitting;
      const pitch = -.28 * moving, h = .37 - .028 * moving;
      piece(x,h,z,.35,.53,.25,m.bagColor,'paint','rounded',pitch);
      piece(x,h+.018,z+.123,.33,.49,.030,'#29333a','rubber','rounded',pitch);
      for (const side of [-1, 1]) {
        piece(x+side*.115,.049,z+.053,.049,.099,.099,'#202429','rubber','cylinder',a.phase,Math.PI/2);
        if (d < 29) piece(x+side*.086,h+.27,z-.011,.019,.38,.018,'#9aa9ac','metal','cube',pitch);
      }
      piece(x,h+.458,z-.07*moving,.215,.041,.035,'#2c3439','rubber');
      if (d < 29) {
        for (let j = -1; j <= 1; j++) piece(x+j*.085,h,z+.142,.021,.38,.014,m.bagColor,'paint','rounded',pitch);
        piece(x+.115,h+.225,z+.133,.064,.087,.014,'#df9a5b','fabric','rounded',pitch);
      }
    } else if (m.bag === 'hand') {
      const x = -.38 - sitting * .23, h = .47 - sitting * .29, z = -.036 - sitting * .16;
      piece(x,h,z,.255,.33,.345,m.bagColor,'fabric');
      piece(x,h+.14,z,.19,.027,.319,'#3a3631','leather');
      if (d < 26) {
        piece(x,h+.222,z,.13,.029,.048,'#343638','leather');
        for (const side of [-1,1]) piece(x+side*.062,h+.186,z,.024,.076,.027,'#343638','leather');
      }
    } else if (m.bag === 'pack' || m.checkedBag) {
      const h = 1.15 - sitting * .44;
      piece(0,h,.166,.323,.42,.191,m.bagColor,'fabric');
      piece(0,h-.10,.267,.247,.162,.047,'#3c4143','fabric');
      if (d < 25) for (const side of [-1,1]) piece(side*.115,h+.13,.102,.042,.24,.052,m.bagColor,'fabric','rounded',.34);
    }
    const uniform = uniformColors[a.airport54Role];
    if (uniform && d < 40) {
      piece(.085,1.32,-.121,.083,.086,.024,'#222d36','metal');
      piece(.085,1.323,-.136,.069,.055,.013,'#b5d9dd','plastic');
      piece(.085,1.315,-.144,.043,.010,.004,uniform,'paint','cube');
    }
    return out.length - before;
  }

  function draw(g, out) {
    const s = setup(g);
    if (!s || g.inside || !boundNear(s, g.cam, limits.drawRadius)) return out;
    const view = s.view;
    view.length = 0;
    for (const a of s.active) if (inView(g, a)) view.push(a);
    view.sort((a, b) => sq(a, g.cam) - sq(b, g.cam));
    const gl = !!g.renderer.gl || !!g.renderer.rcCharacters;
    const before = out.length;
    let props = 0;
    for (let i = 0; i < Math.min(view.length, limits.view); i++) {
      const a = view[i], d = dist(a, g.cam);
      H.streetCharacterPose32(a, out, g.seconds, false, d, gl);
      const m = minds.get(a);
      if (d < 69) props += luggage(out, a, m, d);
    }
    s.metrics.drawn = Math.min(view.length, limits.view);
    s.metrics.props = props;
    return out;
  }

  RC.installers.push(Game => {
    const P = Game.prototype, restart = P.restart, update = P.update, dynamic = P.buildDynamic;
    P.restart = function () {
      states.delete(this);
      const result = restart.apply(this, arguments);
      setup(this);
      return result;
    };
    P.update = function (dt) {
      const result = update.call(this, dt);
      tick(this, dt);
      return result;
    };
    P.buildDynamic = function () { return draw(this, dynamic.call(this)); };
  });

  H.airport54Life = Object.freeze({ setup, state: setup, stateOf, actors, has, hold, tick, draw, skinPose, flights, limits });
})(Heatline);
