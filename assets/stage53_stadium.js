/* SUNSET STATE 53 — playable stadium entrance and local exhibition football. */
(function (H) {
  'use strict';
  if (new URLSearchParams(location.search).has('stadium53Off')) return;

  const RC = H.realism39;
  const TAU = Math.PI * 2, OVAL_POWER = 2 / .76;
  const HALF_WIDTH = 22, HALF_LENGTH = 33.5, GOAL_HALF = 3.35, CROSSBAR = 2.38;
  const BALL_R = .136, STEP = 1 / 40;
  const clamp = H.clamp;
  const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const damping = (rate, dt) => 1 - Math.exp(-rate * dt);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const matches = new WeakMap();
  const roster = [[0, -30.5], [-8.2, -21], [8.2, -21], [-12.5, -7], [12.5, -7], [-6.6, 10], [6.6, 11]];
  const teams = [
    { name: 'חוף', shirt: '#245fb7', shorts: '#ecede2', socks: '#dce9f4', trim: '#b9d9f2', accent: '#3378d0' },
    { name: 'עיר', shirt: '#ab4034', shorts: '#26363b', socks: '#d47d5d', trim: '#f7c397', accent: '#dc7756' }
  ];
  const skins = ['#bc835f', '#dbab88', '#925d42', '#cd9a76', '#754734', '#e2b597'];
  const hairs = ['#302225', '#513422', '#211b22', '#6b4e35', '#25242b', '#47322c'];
  const fanColors = ['#4c7278', '#b58d5e', '#54665a', '#657d9c', '#a86652', '#d7c5a5', '#775988', '#314b6d'];
  let lastVenue = null;

  function layout(ground) {
    const { x, z, base, rx, rz, yaw } = ground;
    const c = Math.cos(yaw), s = Math.sin(yaw), gateAngle = 3 * Math.PI / 4;
    const halfOpening = .137;
    const oval = (t, a = rx, b = rz) => [
      Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** .76 * a,
      Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** .76 * b
    ];
    const world = (u, v) => ({ x: x + c * u - s * v, z: z + s * u + c * v });
    const local = (xx, zz) => ({ x: c * (xx - x) + s * (zz - z), z: -s * (xx - x) + c * (zz - z) });
    const passage = (t, padding = 0) => Math.abs(angleDelta(gateAngle, t)) < halfOpening + padding;
    const [u, v] = oval(gateAngle), length = Math.hypot(u, v);
    const ray = [u / length, v / length];
    const axis = (u, v) => ({ along: u * ray[0] + v * ray[1], side: -u * ray[1] + v * ray[0] });
    const approach = (along, side = 0) => world(ray[0] * along - ray[1] * side, ray[1] * along + ray[0] * side);
    const boundary = (u, v, offset) => (Math.abs(u) / (rx + offset)) ** OVAL_POWER + (Math.abs(v) / (rz + offset)) ** OVAL_POWER;
    const bearing = (u, v) => Math.atan2(Math.sign(v) * (Math.abs(v) / rz) ** (1 / .76),
      Math.sign(u) * (Math.abs(u) / rx) ** (1 / .76));
    return { ...ground, c, s, oval, world, local, passage, gateAngle, halfOpening,
      ray, axis, approach, boundary, bearing, gateDistance: length, floor: base, grass: base + .125 };
  }

  function addLocal(w, s, u, v, y, width, height, depth, color, material, shape = 'cube', rotation = 0, cap = 430) {
    const p = s.world(u, v), o = H.box(p.x, y, p.z, width, height, depth, color, s.yaw + rotation, 4);
    o.shape = shape;
    o.material = material;
    o.visibilityCap = cap;
    o.stadium53 = true;
    w.add(o);
    return o;
  }

  function mark(w, s, points, color = '#ede9d8', width = .115) {
    const rows = points.map(([u, v], i) => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], scale = width * .5 / (Math.hypot(dx, dz) || 1);
      return [-1, 1].map(side => {
        const p = s.world(u + side * dz * scale, v - side * dx * scale);
        return [p.x, s.grass + .024, p.z];
      });
    });
    H.addRibbon444(w, rows, { color, material: 'paint', visibility: 350, layer: 4 });
  }

  function goal(w, s, side) {
    const line = HALF_LENGTH * side, back = line + side * 2.15, width = GOAL_HALF * 2;
    const b = (u, v, y, ww, hh, dd, color, material, shape) =>
      addLocal(w, s, u, v, s.grass + y, ww, hh, dd, color, material, shape);
    const white = '#f0eee4', cord = '#b5c2b5';
    for (const post of [-GOAL_HALF, GOAL_HALF]) {
      b(post, line, CROSSBAR * .5, .13, CROSSBAR, .13, white, 'paint', 'cylinder');
      b(post, back, 1.08, .08, 2.16, .08, '#7f9289', 'metal', 'cylinder');
      for (let i = 1; i <= 4; i++) {
        const yy = .11 + i * .40;
        b(post, (line + back) * .5, yy, .016, .016, 2.15, cord, 'fabric');
      }
      for (let k = 1; k <= 4; k++)
        b(post, line + side * k * .42, 1.07, .016, 2.12, .016, cord, 'fabric');
      b(post, (line + back) * .5, 2.18, .07, .07, 2.2, '#d9ddd1', 'metal');
    }
    b(0, line, CROSSBAR, width + .135, .13, .125, white, 'paint', 'rounded_smooth');
    b(0, back, 2.16, width, .075, .075, '#bfccc0', 'metal', 'rounded');
    for (let i = 1; i <= 11; i++) b((i - 6) * .55, back, 1.08, .017, 2.16, .017, cord, 'fabric');
    for (let i = 1; i <= 5; i++) b(0, back, i * .35 + .08, width, .017, .017, cord, 'fabric');
  }

  function decorate(w, s) {
    w.stadium53 = lastVenue = s;
    const circle = (u, v, radius, start = 0, end = TAU, segs = 32) =>
      Array.from({ length: segs + 1 }, (_, i) => {
        const a = start + (end - start) * i / segs;
        return [u + Math.cos(a) * radius, v + Math.sin(a) * radius];
      });
    mark(w, s, circle(0, 0, 5.9));
    addLocal(w, s, 0, 0, s.grass + .024, .20, .015, .20, '#f2efe3', 'paint', 'cylinder', 0, 260);
    for (const side of [-1, 1]) {
      goal(w, s, side);
      mark(w, s, [[-4.9, side * HALF_LENGTH], [-4.9, side * 30], [4.9, side * 30], [4.9, side * HALF_LENGTH]]);
      const arc = circle(0, 26.2, 4, Math.PI * 1.05, Math.PI * 1.95, 16).map(([u, v]) => [u, side * v]);
      mark(w, s, arc);
      addLocal(w, s, 0, side * 26.2, s.grass + .024, .16, .014, .16, '#f2efe3', 'paint', 'cylinder');
      for (const across of [-1, 1]) {
        const u = across * HALF_WIDTH, v = side * HALF_LENGTH;
        const a = [0, .5, 1].map(t => [u - across * Math.cos(t * Math.PI / 2) * .74, v - side * Math.sin(t * Math.PI / 2) * .74]);
        mark(w, s, a, '#eee9d9', .092);
        addLocal(w, s, u, v, s.grass + .70, .039, 1.4, .039, '#dfece5', 'paint', 'cylinder');
        addLocal(w, s, u + .17, v, s.grass + 1.29, .36, .21, .022, '#d68e41', 'fabric', 'wedge');
      }
    }

    // A paved public concourse through the original bowl opening.
    const d = s.gateDistance, [ux, vz] = s.ray, rotation = Math.atan2(vz, ux);
    const corridor = (along, lateral, y, length, height, width, color, material, shape = 'cube') =>
      addLocal(w, s, ux * along - vz * lateral, vz * along + ux * lateral, y,
        length, height, width, color, material, shape, rotation, 420);
    corridor(d - 6.0, 0, s.floor - .092, 38, .13, 8.8, '#a9b0a4', 'paving');
    for (const side of [-1, 1]) {
      corridor(d + .5, side * 4.65, s.floor + 2.10, 5.8, 4.2, .35, '#596e70', 'masonry');
      corridor(d + .4, side * 4.46, s.floor + 2.9, 5.45, .11, .08, '#e5be67', 'light_emissive');
      corridor(d + .38, side * 4.68, s.floor + .36, 7.1, .7, .44, '#c8c2aa', 'masonry');
      for (let i = 0; i < 10; i++) {
        const p = s.approach(d - 2.82 + i * .71, side * 4.65);
        w.solid(p.x, p.z, .64, .64, false);
      }
      for (let i = 0; i < 5; i++)
        corridor(d - 13 + i * 3.6, side * 3.96, s.floor + .011, 2.1, .02, .09, '#dfc76e', 'paint');
      corridor(d - 6.1, side * 4.88, s.floor + 1.11, 5.7, .14, .13, '#d2b37f', 'metal', 'rounded');
    }
    corridor(d + .4, 0, s.floor + 4.22, 2.6, .68, 9.75, '#223f48', 'metal', 'rounded_smooth');
    corridor(d + 1.73, 0, s.floor + 4.23, .035, .09, 8.7, '#f0c985', 'light_emissive');
    corridor(d - 12, 0, s.floor + 4.1, 1.18, .25, 7.5, '#bdc4b8', 'metal', 'rounded');
    corridor(d - 12, 0, s.floor + 3.93, .91, .042, 6.7, '#f5dfac', 'light_emissive');

    // A broad, physically visible set of team banners and a shared digital board.
    for (const side of [-1, 1]) {
      const v = side * 48.5;
      for (const u of [-5.9, 5.9])
        addLocal(w, s, u, v, s.floor + 4.2, .38, 7.95, .43, '#5c6971', 'metal', 'rounded');
      addLocal(w, s, 0, v, s.floor + 7.15, 13.6, 2.81, .50, '#354b55', 'metal', 'rounded');
      addLocal(w, s, 0, v - side * .28, s.floor + 7.15, 12.6, 2.36, .075, '#13232f', 'plastic');
      for (const i of [0, 1]) {
        const u = (i ? 1 : -1) * -side * 4.65;
        addLocal(w, s, u, v - side * .33, s.floor + 6.42, 2.7, .15, .04, teams[i].accent, 'light_emissive');
      }
    }
  }

  function cameraWall(w, x, z, width, depth, base) {
    const volume = { x, z, y: base + 4.75, w: width, d: depth, h: 10.1, padding: .12 };
    w.cameraOccluders.push(volume);
    const cell = H.BLOCK;
    for (let i = Math.floor((x - width * .5) / cell); i <= Math.floor((x + width * .5) / cell); i++)
      for (let j = Math.floor((z - depth * .5) / cell); j <= Math.floor((z + depth * .5) / cell); j++) {
        const key = i + ',' + j;
        if (!w.cameraCells.has(key)) w.cameraCells.set(key, []);
        w.cameraCells.get(key).push(volume);
      }
  }

  function look(i, kit, type) {
    const tint = i % skins.length;
    return { key: 'stadium53:' + type + ':' + i, scale: .969 + (i * 7 % 9) * .009,
      outfit: { skin: skins[tint], hair: hairs[(i + 2) % hairs.length], shirt: kit.shirt, pants: kit.shorts,
        shoes: type === 'fan' ? '#293436' : '#293444', sole: '#b8c5c3', jacketTrim: kit.trim,
        iris: '#42382f', shoulders: 1 + (i % 5 - 2) * .041, bulk: .93 + (i % 4) * .047,
        hips: .98 + (i % 4) * .028, shortSleeve: type !== 'fan', beard: i % 6 === 3,
        socks: kit.socks, footballKit: type !== 'fan' } };
  }

  class Match {
    constructor(site) {
      this.site = site;
      this.rng = new H.RNG(531813);
      this.time = 0;
      this.accumulator = 0;
      this.score = [0, 0];
      this.kickoff = 0;
      this.phase = 'kickoff';
      this.await = .8;
      this.goalTime = -10;
      this.players = [];
      this.fans = [];
      this.stats = { passes: 0, shots: 0, saves: 0, goals: 0, looseKicks: 0, restarts: 0 };
      for (const team of [0, 1]) for (let slot = 0; slot < roster.length; slot++) {
        const real = teams[team], keeper = slot === 0;
        const kit = keeper ? {
          shirt: team ? '#d79b3f' : '#438958', shorts: '#2f4650', socks: team ? '#dcc076' : '#7ea98b', trim: '#d9d3a1'
        } : real;
        const a = H.createWalker(site.x, site.z, 0, 28600 + team * 19 + slot);
        a.team = team;
        a.dir = team ? -1 : 1;
        a.slot = slot;
        a.keeper = keeper;
        a.stadium53 = { look: look(slot + team * 7, kit, 'kit'), kind: 'player', strideSeed: slot + team * 7, kick: 0, dive: 0 };
        this.players.push(a);
      }
      const referee = H.createWalker(site.x, site.z, 0, 28680);
      referee.stadium53 = { kind: 'referee', strideSeed: 58,
        look: look(12, { shirt: '#c5b542', shorts: '#2b3739', socks: '#3a4850', trim: '#e5dfaa' }, 'referee') };
      this.referee = referee;
      for (let group = 0; group < 6; group++) {
        const centre = [0.18, 1.03, 1.85, 2.89, 4.20, 5.24][group];
        for (let seat = 0; seat < 7; seat++) {
          const row = (group + seat * 3) % 6, theta = centre + (seat - 3) * .028;
          const d = -16.55 + row * 2.57;
          const [x, z] = site.oval(theta, site.rx + d, site.rz + d);
          const p = site.world(x, z), appear = group * 7 + seat;
          const fan = H.createWalker(p.x, p.z, Math.atan2(p.x - site.x, p.z - site.z), 28650 + appear);
          fan.socialPose = 'sit';
          const variant = appear % 12, seatY = site.floor + 1.75 + 1.29 * row;
          fan.y = seatY - .45;
          fan.stadium53 = {
            kind: 'fan', team: group % 2, strideSeed: appear, seatY,
            look: look(variant, { shirt: fanColors[variant % fanColors.length], shorts: '#424953', trim: null }, 'fan')
          };
          this.fans.push(fan);
        }
      }
      this.ball = { x: 0, z: 0, y: BALL_R, vx: 0, vz: 0, vy: 0, roll: 0, turn: 0, owner: null,
        receiver: null, kicker: null, lastTeam: null, lock: 0 };
      this.resetPositions();
    }

    resetPositions() {
      for (const a of this.players) {
        const [x, z] = roster[a.slot];
        a.u = x * a.dir;
        a.v = (z - 6.4) * a.dir;
        if (a.keeper) a.v = -30.5 * a.dir;
        a.du = a.dv = 0;
        a.stadium53.kick = a.stadium53.dive = 0;
        this.sync(a, a.dir === 1 ? Math.PI - this.site.yaw : -this.site.yaw);
      }
      this.referee.u = 10;
      this.referee.v = -1.4;
      this.referee.du = this.referee.dv = 0;
      this.sync(this.referee, -this.site.yaw);
      Object.assign(this.ball, { x: 0, z: 0, y: BALL_R, vx: 0, vz: 0, vy: 0,
        roll: 0, turn: 0, owner: null, kicker: null, receiver: null, lock: 0, lastTeam: null });
    }

    sync(a, heading) {
      const s = this.site, p = s.world(a.u, a.v);
      a.x = p.x; a.z = p.z; a.y = s.grass;
      a.yaw = heading;
      a.vx = a.du * s.c - a.dv * s.s;
      a.vz = a.du * s.s + a.dv * s.c;
      a.grounded = true;
    }

    move(a, x, z, pace, dt) {
      const dx = x - a.u, dz = z - a.v, d = Math.hypot(dx, dz);
      const velocity = Math.min(pace, d * 3.1) / (d || 1);
      const response = damping(7, dt);
      a.du = H.lerp(a.du, dx * velocity, response);
      a.dv = H.lerp(a.dv, dz * velocity, response);
      a.u = clamp(a.u + a.du * dt, -HALF_WIDTH + .52, HALF_WIDTH - .52);
      a.v = clamp(a.v + a.dv * dt, -HALF_LENGTH + .52, HALF_LENGTH - .52);
      const targetYaw = Math.hypot(a.du, a.dv) > .19 ?
        Math.atan2(a.dv * this.site.s - a.du * this.site.c, -a.du * this.site.s - a.dv * this.site.c) :
        Math.atan2(-this.site.c * (this.ball.x - a.u) + this.site.s * (this.ball.z - a.v),
          -this.site.s * (this.ball.x - a.u) - this.site.c * (this.ball.z - a.v));
      this.sync(a, a.yaw + angleDelta(a.yaw, targetYaw) * damping(10, dt));
    }

    closest(team, x, z, omitKeeper = false) {
      let best = null, min = Infinity;
      for (const a of this.players) {
        if (a.team !== team || (omitKeeper && a.keeper)) continue;
        const d = (a.u - x) ** 2 + (a.v - z) ** 2;
        if (d < min) { min = d; best = a; }
      }
      return best;
    }

    claim(a) {
      const b = this.ball;
      b.owner = a; b.receiver = null; b.lastTeam = a.team;
      b.vx = b.vz = b.vy = 0; b.y = BALL_R;
      a.decision = this.rng.range(.56, 1.17);
    }

    release(a, x, z, speed, lift, receiver = null) {
      const b = this.ball;
      const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz) || 1;
      b.owner = null; b.kicker = a; b.receiver = receiver;
      b.vx = dx / d * speed; b.vz = dz / d * speed;
      b.vy = lift; b.lock = .17; b.lastTeam = a?.team ?? b.lastTeam;
      b.turn = Math.atan2(dx, dz);
      if (a) {
        a.stadium53.kick = .36;
        a.yaw = Math.atan2(this.site.s * dz - this.site.c * dx, -this.site.s * dx - this.site.c * dz);
      }
    }

    choosePlay(a, dt) {
      a.decision -= dt;
      if (a.decision > 0) return;
      const b = this.ball, advanced = a.dir * a.v;
      if (!a.keeper && advanced > 10 && Math.abs(a.u) < 15) {
        const keeper = this.players[a.team ? 0 : roster.length];
        const side = keeper.u < a.u ? 1 : -1;
        const defender = this.closest(1 - a.team, a.u, a.v, true);
        const pressure = clamp(1 - Math.hypot(a.u - defender.u, a.v - defender.v) / 4, 0, 1);
        const aim = side * this.rng.range(1.45, 3.8 + pressure);
        this.release(a, aim, a.dir * (HALF_LENGTH + .45), this.rng.range(16.5, 22.4),
          this.rng.range(1.7, 4.4 + pressure));
        this.stats.shots++;
        return;
      }
      let value = -Infinity, target = null;
      for (const mate of this.players) {
        if (mate === a || mate.team !== a.team || mate.keeper) continue;
        const d = Math.hypot(mate.u - a.u, mate.v - a.v);
        if (d < 5.5 || d > 28) continue;
        const forward = (mate.v - a.v) * a.dir;
        if (forward < (a.keeper ? 4 : 1)) continue;
        const marker = this.closest(1 - a.team, mate.u, mate.v);
        const free = Math.hypot(marker.u - mate.u, marker.v - mate.v);
        const rank = forward * .70 + Math.min(7, free * 1.4) - d * .31 + this.rng.range(-1.1, 1.1);
        if (rank > value) { value = rank; target = mate; }
      }
      if (target && (a.keeper || value > 2.1)) {
        this.release(a, target.u + target.du * .34, target.v + target.dv * .34,
          clamp(Math.hypot(target.u - b.x, target.v - b.z) * .64, 8, 15.8), .45, target);
        this.stats.passes++;
        return;
      }
      a.decision = this.rng.range(.26, .58);
    }

    resetPlay(side) {
      this.kickoff = side;
      this.resetPositions();
      const a = this.players[side * roster.length + 5];
      a.u = -.75;
      a.v = 0;
      this.sync(a, -Math.PI / 2 - this.site.yaw);
      this.claim(a);
      this.phase = 'play';
    }

    outOfBounds() {
      const b = this.ball;
      const team = b.lastTeam === null ? this.kickoff : 1 - b.lastTeam;
      b.x = clamp(b.x, -HALF_WIDTH + .52, HALF_WIDTH - .52);
      b.z = clamp(b.z, -HALF_LENGTH + .72, HALF_LENGTH - .72);
      b.y = BALL_R; b.vx = b.vz = b.vy = 0; b.owner = null;
      this.restartPlayer = this.closest(team, b.x, b.z, true);
      this.phase = 'restart'; this.await = .48;
      this.stats.restarts++;
    }

    scoreGoal(side, y) {
      const team = side === 1 ? 0 : 1, b = this.ball;
      this.score[team]++;
      this.stats.goals++;
      this.goalTime = this.time;
      this.goalTeam = team;
      b.z = side * (HALF_LENGTH + 1.95);
      b.y = Math.max(BALL_R, y * .38);
      b.vx = b.vz = b.vy = 0; b.owner = null;
      this.phase = 'goal'; this.await = 2.25;
      this.kickoff = 1 - team;
    }

    ballStep(dt) {
      const b = this.ball, oldX = b.x, oldZ = b.z, oldY = b.y;
      if (b.owner) {
        const a = b.owner, speed = Math.hypot(a.du, a.dv);
        const dx = speed > .2 ? a.du / speed : 0, dz = speed > .2 ? a.dv / speed : a.dir;
        b.x = clamp(a.u + dx * .61, -HALF_WIDTH + .16, HALF_WIDTH - .16);
        b.z = clamp(a.v + dz * .63, -HALF_LENGTH + .16, HALF_LENGTH - .16);
        b.roll += Math.hypot(b.x - oldX, b.z - oldZ) / BALL_R;
        if (speed > .2) b.turn = Math.atan2(a.du, a.dv);
        const challenger = this.closest(1 - a.team, a.u, a.v, true);
        if (!a.keeper && distance({ x: challenger.u, z: challenger.v }, b) < .64 && this.rng.next() < dt * 2.4) this.claim(challenger);
        else this.choosePlay(a, dt);
        return;
      }
      b.lock = Math.max(0, b.lock - dt);
      const flying = b.y > BALL_R + .01 || b.vy > .02;
      const drag = Math.exp(-(flying ? .18 : .76) * dt);
      b.vx *= drag; b.vz *= drag;
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (flying) {
        b.vy -= 9.81 * dt;
        b.y += b.vy * dt;
        if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) > .90 ? -b.vy * .39 : 0; }
      }
      b.roll += Math.hypot(b.vx, b.vz) * dt / BALL_R;
      if (Math.abs(b.z) >= HALF_LENGTH + BALL_R) {
        const side = Math.sign(b.z), line = side * (HALF_LENGTH + BALL_R);
        const t = clamp((line - oldZ) / (b.z - oldZ || 1), 0, 1);
        const x = H.lerp(oldX, b.x, t), h = H.lerp(oldY, b.y, t);
        if (Math.abs(x) + BALL_R < GOAL_HALF && h + BALL_R < CROSSBAR) this.scoreGoal(side, h);
        else this.outOfBounds();
        return;
      }
      if (Math.abs(b.x) >= HALF_WIDTH + BALL_R) { this.outOfBounds(); return; }
      if (b.lock > 0) return;

      let catcher = null, min = Infinity;
      for (const a of this.players) {
        if (b.kicker === a || b.y > (a.keeper ? 1.52 : .70)) continue;
        const d = Math.hypot(a.u - b.x, a.v - b.z), limit = a.keeper ? 1.12 : .81;
        if (d < limit && d < min) { min = d; catcher = a; }
      }
      if (!catcher && Math.hypot(b.vx, b.vz) < .32) b.kicker = null;
      if (catcher) {
        if (catcher.keeper && b.lastTeam !== catcher.team) {
          this.stats.saves++;
          catcher.stadium53.dive = .47;
          catcher.stadium53.diveSide = Math.sign(b.x - catcher.u);
        }
        this.claim(catcher);
      }
    }

    step(dt) {
      this.time += dt;
      const b = this.ball;
      for (const a of this.players) {
        a.stadium53.kick = Math.max(0, a.stadium53.kick - dt);
        a.stadium53.dive = Math.max(0, a.stadium53.dive - dt);
      }
      if (this.phase === 'kickoff' || this.phase === 'goal') {
        this.await -= dt;
        for (const a of this.players) {
          a.stadium53.celebration = this.phase === 'goal' && a.team === this.goalTeam;
          if (this.phase === 'goal') this.move(a, a.u, a.v, 2.1, dt);
        }
        if (this.await <= 0) {
          for (const a of this.players) a.stadium53.celebration = false;
          this.resetPlay(this.kickoff);
        }
        return;
      }
      for (const team of [0, 1]) {
        const press = this.closest(team, b.x, b.z, true);
        for (const a of this.players) {
          if (a.team !== team) continue;
          const [homeX, homeZ] = roster[a.slot], dir = a.dir;
          let x = homeX * dir + b.x * .18, z = (homeZ + b.z * dir * .30) * dir, pace = 4.8;
          if (a.keeper) {
            const approaching = b.vz * dir < -8 && b.owner === null;
            const t = approaching ? clamp((-31.6 * dir - b.z) / b.vz, 0, .55) : 0;
            x = clamp(approaching ? b.x + b.vx * t : b.x * .20, -3.65, 3.65);
            z = dir * (-31.1 + (b.z * dir < -15 ? 1.35 : 0));
            pace = approaching ? 6.2 : 3.3;
          }
          if (this.phase === 'restart' && a === this.restartPlayer) {
            x = b.x; z = b.z; pace = 6.2;
          } else if (this.phase === 'play' && b.owner === a) {
            x = a.u * .73 + Math.sin(this.time * 1.25 + a.slot) * 2.2;
            z = dir * (a.keeper ? -27.5 : 30);
            pace = a.keeper ? 3.3 : 5.2;
          } else if (this.phase === 'play' && b.owner?.team !== team && (a === press || b.receiver === a)) {
            const lead = b.owner ? .10 : .17;
            x = b.x + b.vx * lead; z = b.z + b.vz * lead; pace = 6.65;
          }
          this.move(a, x, z, pace, dt);
        }
      }
      this.move(this.referee, clamp(b.x * .65 + 7.2, -19, 19), clamp(b.z - 4, -25, 25), 4.3, dt);
      if (this.phase === 'restart') {
        this.await -= dt;
        if (this.await <= 0 && Math.hypot(this.restartPlayer.u - b.x, this.restartPlayer.v - b.z) < 1.15) {
          this.claim(this.restartPlayer);
          this.phase = 'play';
        }
      } else this.ballStep(dt);
    }

    tick(dt) {
      this.accumulator = Math.min(.15, this.accumulator + clamp(dt, 0, .15));
      while (this.accumulator >= STEP) {
        this.step(STEP);
        this.accumulator -= STEP;
      }
    }

    looseBallAt(a) {
      if (this.phase !== 'play' || this.ball.owner || this.ball.y > .48 || this.ball.lock > 0) return false;
      const s = this.site, p = s.local(a.x, a.z);
      return Math.abs(a.y - s.grass) < .7 && Math.hypot(p.x - this.ball.x, p.z - this.ball.z) < 1.75;
    }

    kickLoose(a, facing) {
      if (!this.looseBallAt(a)) return false;
      const s = this.site, dx = -Math.sin(facing), dz = -Math.cos(facing);
      const u = dx * s.c + dz * s.s, v = -dx * s.s + dz * s.c;
      this.release(null, this.ball.x + u * 12, this.ball.z + v * 12, 13.8, 2.4);
      this.stats.looseKicks++;
      return true;
    }
  }

  function skinPose(a, pose, bones, seconds) {
    const state = a.stadium53, R = pose.R, t = seconds;
    if (state.kind === 'fan') {
      const wave = state.reaction || 0, k = state.strideSeed, clap = .5 + .5 * Math.sin(t * 8 + k * .73);
      R[bones.head][1] += .16 * Math.sin(t * .89 + k * .83);
      if (wave > .04) {
        const raised = state.standing ? .45 : 0;
        R[bones.armL] = [.48 + wave * (.54 + raised), -.22 * (1 - clap), -.28 - clap * .06];
        R[bones.armR] = [.48 + wave * (.54 + raised), .22 * (1 - clap), .28 + clap * .06];
        R[bones.foreL] = [1.13 + clap * .34, 0, .24 * wave];
        R[bones.foreR] = [1.13 + clap * .34, 0, -.24 * wave];
        if (state.standing) pose.rootY += Math.abs(Math.sin(t * 5 + k)) * .09 * wave;
      }
      return;
    }
    if (state.kick > 0) {
      const p = 1 - state.kick / .36, blend = Math.sin(Math.PI * p);
      const thigh = p < .33 ? -.52 : .78 + .45 * Math.sin(p * Math.PI);
      R[bones.thighR][0] = H.lerp(R[bones.thighR][0], thigh, blend);
      R[bones.shinR][0] = H.lerp(R[bones.shinR][0], p < .48 ? -1.44 : -.18, blend);
      R[bones.footR][0] += .22 * blend;
      R[bones.spine][0] -= .13 * blend;
      R[bones.armL][2] -= .54 * blend; R[bones.armR][2] += .36 * blend;
    }
    if (state.dive > 0) {
      const wave = Math.sin(Math.PI * (1 - state.dive / .47)), side = state.diveSide || 1;
      R[bones.pelvis][2] = wave * side * .58;
      R[bones.armL] = [1.26 * wave, 0, -.55 * wave];
      R[bones.armR] = [1.26 * wave, 0, .55 * wave];
      pose.rootY += .21 * wave;
      pose.rootX += side * .24 * wave;
    }
    if (state.celebration) {
      const raise = .7 + .24 * Math.sin(t * 4.6 + state.strideSeed);
      R[bones.armL] = [2.3 * raise, 0, -.47];
      R[bones.armR] = [2.3 * raise, 0, .47];
      R[bones.foreL][0] = R[bones.foreR][0] = .55;
      pose.rootY += .08 * Math.abs(Math.sin(t * 6.5 + state.strideSeed));
    }
  }

  const ballPatches = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const low = .525731, high = .850651;
    ballPatches.push([a * low, b * high, 0], [0, a * low, b * high], [a * high, 0, b * low]);
  }

  function drawBall(match, out, camera) {
    const s = match.site, b = match.ball, p = s.world(b.x, b.z), y = s.grass + b.y;
    const box = H.box(p.x, y, p.z, BALL_R * 2, BALL_R * 2, BALL_R * 2, '#f1efe5', 0, 4);
    box.shape = 'sphere'; box.material = 'fabric';
    box.stadium53Ball = true;
    out.push(box);
    if (distance(camera, p) > 64) return;
    const yaw = -b.turn + s.yaw, roll = b.roll % TAU;
    const cx = Math.cos(roll), sx = Math.sin(roll), ca = Math.cos(yaw), sa = Math.sin(yaw);
    for (const [x, yy, z] of ballPatches) {
      const z0 = yy * sx + z * cx, ny = yy * cx - z * sx, nx = x * ca - z0 * sa, nz = x * sa + z0 * ca;
      const r = BALL_R * .969;
      const patch = H.box(p.x + nx * r, y + ny * r, p.z + nz * r, .089, .009, .085, '#22313b', 0, 4);
      patch.shape = 'cylinder'; patch.material = 'fabric';
      const length = Math.hypot(nx, nz);
      const tx = length > .001 ? nz / length : 1, tz = length > .001 ? -nx / length : 0;
      patch.basis444 = [[tx * .089, 0, tz * .089], [nx * .009, ny * .009, nz * .009],
        [-tz * ny * .085, (tz * nx - tx * nz) * .085, tx * ny * .085]];
      out.push(patch);
    }
  }

  const digitMasks = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
  const digitSegments = [[0, .40, .33, .055], [.18, .21, .052, .32], [.18, -.21, .052, .32],
    [0, -.40, .33, .055], [-.18, -.21, .052, .32], [-.18, .21, .052, .32], [0, 0, .33, .055]];
  function board(match, out) {
    const s = match.site, key = match.score.join(':');
    if (match.boardKey === key) { out.push(...match.boardObjects); return; }
    const objects = [];
    for (const side of [-1, 1]) for (let team = 0; team < 2; team++) {
      const score = String(match.score[team] % 100).padStart(2, '0');
      for (let d = 0; d < 2; d++) {
        const digits = digitSegments;
        for (let i = 0; i < digits.length; i++) {
          if (!(digitMasks[Number(score[d])] & (1 << i))) continue;
          const [dx, dy, ww, hh] = digits[i];
          const p = s.world(-side * ((team ? 1 : -1) * 1.63 + (d - .5) * .72 + dx * 1.52), side * 48.14);
          const seg = H.box(p.x, s.floor + 7.25 + dy * 1.52, p.z, ww * 1.52, hh * 1.52, .038,
            team ? '#f0a784' : '#a8d5f6', s.yaw, 4, .39);
          seg.material = 'light_emissive';
          seg.stadium53Score = true;
          objects.push(seg);
        }
      }
    }
    match.boardKey = key;
    match.boardObjects = objects;
    out.push(...objects);
  }

  function source(game) {
    return game.flight51?.pilot ? game.flight51.plane : game.inVehicle ? game.player : game.avatar;
  }
  function matchFor(game, radius = 155) {
    const site = game.world.stadium53, actor = source(game);
    if (!site || !actor || game.inside || game.boat444 || game.roofVisit?.pilot || actor.y > site.floor + 25 ||
        distance(actor, site) > radius) return null;
    let match = matches.get(game);
    if (match?.site !== site) { match = new Match(site); matches.set(game, match); }
    return match;
  }
  function foot(game) {
    return game.running && !game.paused && !game.over && !game.inside && !game.inVehicle && !game.flight51?.pilot &&
      !game.boat444 && !game.roofVisit && !game.avatar.swim445 && game.onBus < 0 && game.onTram < 0 && !game.vehicleEntry &&
      !game.entryTransition && !game.exitTransition && !game.showFullMap && !game.garageOpen && !game.missionBoardOpen;
  }
  function ownsInteraction(game) { return foot(game) && matches.get(game)?.looseBallAt(game.avatar) === true; }

  function hud(game, match) {
    let element = game.stadiumHud53;
    const show = match && game.running && !game.over && !game.paused && !game.showFullMap && !game.missionBoardOpen && !game.garageOpen;
    if (!show) { if (element) element.root.hidden = true; return; }
    if (!element) {
      const parent = document.getElementById('hud');
      if (!parent) return;
      const root = document.createElement('section');
      root.id = 'stadium-score53';
      root.dir = 'rtl';
      root.setAttribute('aria-label', 'לוח תוצאות האצטדיון');
      root.style.cssText = 'position:absolute;inset-inline:10px;margin-inline:auto;width:max-content;max-width:92%;top:49px;background:#122e38ed;color:#eff5e8;border:1px solid #94b1aa80;border-radius:10px;padding:7px 12px;text-align:center;font:600 13px/1.45 system-ui;pointer-events:none;z-index:4';
      const score = document.createElement('strong'), clock = document.createElement('span'), note = document.createElement('div');
      score.setAttribute('aria-live', 'polite');
      note.style.color = '#d6dae0';
      root.append(score, clock, note); parent.append(root);
      element = game.stadiumHud53 = { root, score, clock, note };
    }
    element.root.hidden = false;
    const clock = Math.floor(match.time);
    const text = teams[0].name + ' ' + match.score[0] + ' · ' + match.score[1] + ' ' + teams[1].name;
    const clockText = ' | ' + Math.floor(clock / 60) + ':' + String(clock % 60).padStart(2, '0');
    if (element.score.textContent !== text) element.score.textContent = text;
    if (element.clock.textContent !== clockText) element.clock.textContent = clockText;
    const note = ownsInteraction(game) ? 'E · בעטו בכדור החופשי' :
      match.phase === 'goal' ? 'שער לקבוצת ' + teams[match.goalTeam].name : match.phase === 'restart' ? 'כדור חוץ · חזרה למשחק' :
      distance(source(game), match.site) > 70 ? 'הכניסה דרך השער ליד שביל האצטדיון' : 'משחק ראווה · הכניסה חופשית';
    if (element.note.textContent !== note) element.note.textContent = note;
  }

  function install(Game) {
    const P = Game.prototype, ground = H.walkerGround473;
    H.walkerGround473 = function (a) {
      const original = ground.call(this, a), s = lastVenue;
      if (!s || a.deck443 || a.coastDeck461 || Math.abs(a.x - s.x) > 98 || Math.abs(a.z - s.z) > 106) return original;
      const p = s.local(a.x, a.z), axis = s.axis(p.x, p.z);
      if (Math.abs(p.x) < 23.98 && Math.abs(p.z) < 35.98) return s.grass;
      if (Math.abs(axis.side) < 4.34 && axis.along > s.gateDistance - 24 && axis.along < s.gateDistance + 12.9) {
        const weight = 1 - clamp((axis.along - s.gateDistance - 4) / 8.9, 0, 1);
        return H.lerp(original, s.floor, weight);
      }
      if (s.boundary(p.x, p.z, 0) > 1) return original;
      const paving = Math.max(original, s.floor - .02);
      if (s.boundary(p.x, p.z, -21.3) < 1 || s.passage(s.bearing(p.x, p.z), .008)) return paving;

      // Solve for the same nested oval used by the bank and six seat rows.
      let inner = -21.3, outer = 0;
      for (let i = 0; i < 9; i++) {
        const middle = (inner + outer) * .5;
        if (s.boundary(p.x, p.z, middle) > 1) inner = middle;
        else outer = middle;
      }
      const d = (inner + outer) * .5;
      const ramp = d < -18.4 ? H.lerp(-.02, 1.05, (d + 21.3) / 2.9) :
        H.lerp(1.05, 10.2, clamp((d + 18.4) / 17.4, 0, 1));
      const row = Math.round((d + 16.525) / 2.57);
      const seat = row >= 0 && row < 6 && Math.abs(d + 16.525 - row * 2.57) < .50 ? 1.74 + row * 1.29 : 0;
      return s.floor + Math.max(ramp, seat);
    };
    const update = P.update;
    P.update = function (dt) {
      const result = update.call(this, dt);
      const m = this.running && !this.over && !this.paused && !this.showFullMap && !this.missionBoardOpen &&
        !this.garageOpen && matchFor(this);
      if (m) {
        const goals = m.stats.goals;
        m.tick(dt);
        if (m.stats.goals > goals && distance(source(this), m.site) < 105) this.synth.cue('reward', .65);
      }
      return result;
    };
    const originalHud = P.updateHUD;
    P.updateHUD = function () {
      const result = originalHud.call(this);
      hud(this, this.running && !this.over && matchFor(this));
      return result;
    };
    const togglePause = P.togglePause;
    P.togglePause = function () {
      const result = togglePause.call(this);
      hud(this, this.running && !this.over && matchFor(this));
      return result;
    };
    const interact = P.toggleVehicle;
    P.toggleVehicle = function (...args) {
      if (ownsInteraction(this) && matches.get(this).kickLoose(this.avatar, this.footCameraYaw)) {
        this.synth.cue('footstep', .46);
        this.updateHUD();
        return;
      }
      return interact.apply(this, args);
    };
    const draw = P.buildDynamic;
    P.buildDynamic = function () {
      const out = draw.call(this);
      const match = this.running && !this.over && matchFor(this, 150);
      if (!match || distance(this.cam, match.site) > 160) return out;
      const gl = this.renderer instanceof H.GLRenderer, time = match.time;
      const c = this.cam, dx = c.tx - c.x, dz = c.tz - c.z, length = Math.hypot(dx, dz) || 1;
      const visible = (a, radius) => distance(a, c) < radius &&
        ((a.x - c.x) * dx + (a.z - c.z) * dz > -18 * length || distance(a, c) < 18);
      const emit = a => H.streetCharacterPose32(a, out, time, false, distance(a, c), gl);
      for (const a of match.players) if (visible(a, 156)) emit(a);
      if (visible(match.referee, 130)) emit(match.referee);
      const secondsFromGoal = time - match.goalTime;
      for (const fan of match.fans) {
        if (!visible(fan, 105)) continue;
        const state = fan.stadium53, k = state.strideSeed;
        state.standing = secondsFromGoal < 2.4 && (state.team === match.goalTeam || k % 5 === 0);
        state.reaction = state.standing ? Math.min(1, (2.7 - secondsFromGoal) * .7) :
          Math.max(0, Math.sin(time * .73 + k * 1.37) - .76) * 2.8;
        fan.socialPose = state.standing ? null : 'sit';
        fan.y = state.seatY - (state.standing ? 0 : .45);
        emit(fan);
      }
      drawBall(match, out, c);
      board(match, out);
      return out;
    };
  }

  H.stadium53 = { layout, decorate, cameraWall, skinPose, Match, ownsInteraction,
    current: game => matches.get(game) || null };
  RC?.installers.push(install);
})(Heatline);
