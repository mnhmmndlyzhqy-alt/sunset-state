/* SUNSET STATE — building interiors and elevator control */
(function (H) {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (query.has('realismOff') || query.has('city50Off')) return;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const el = id => document.getElementById(id);
  const ready = g => g.running && !g.paused && !g.over && !g.showFullMap && !g.missionBoardOpen;

  function installElevator(P) {
    let cars = new WeakMap();
    const topStop = (g, v) => v.scene.maxFloor + Number(g.world.roofsByBuilding461.has(v.plan.buildingId));
    const hasLift = (g, v) => !!v?.scene?.liftBarrier && topStop(g, v) > 0;
    const floorName = (n, top) => n === 0 ? 'לובי' : n === top + 1 ? 'גג' : 'קומה ' + n;
    const stateFor = v => {
      let car = cars.get(v.plan);
      if (!car) {
        car = { floor: 0, queue: [], call: null, readyAt: 0 };
        cars.set(v.plan, car);
      }
      return car;
    };
    const isNear = (g, v) => distance(g.avatar, v.scene.lift) < 3.7;
    // Keep the original geometric check separate from landing car availability.
    const cabinGeometry = P.standingInsideElevator;
    P.elevatorBuilding52 = function (v = this.indoor) { return hasLift(this, v); };
    P.elevatorCarAt52 = function (v = this.indoor) {
      return hasLift(this, v) && stateFor(v).floor === v.floor;
    };
    P.standingInsideElevator = function (v = this.indoor) {
      return this.elevatorCarAt52(v) && cabinGeometry.call(this, v);
    };
    const restart = P.restart;
    P.restart = function (...args) {
      cars = new WeakMap();
      return restart.apply(this, args);
    };
    const panel = el('elevator50'), status = el('elevator-status50'), stops = el('elevator-stops50');
    const call = el('elevator-call50'), cancel = el('elevator-cancel50');
    let game, stopKey;
    document.body.classList.add('elevator-city50');

    function draw(g) {
      const v = g.indoor;
      const show = !!(ready(g) && hasLift(g, v) && !v.stairTrip && (v.liftRide || isNear(g, v)));
      panel.hidden = !show;
      if (!show) { if (g === game) game = null; return; }
      game = g;
      const car = stateFor(v), top = v.scene.maxFloor, ride = v.liftRide;
      const inside = ride || g.standingInsideElevator(v);
      const current = floorName(ride ? Math.round(ride.travelledFloors) : car.floor, top);
      let label;
      if (ride) {
        const dest = floorName(ride.destination, top);
        const phase = ride.phase === 'closing' ? 'סוגר דלתות' : ride.phase === 'opening' ? 'פותח דלתות' : 'בתנועה';
        label = current + ' · ' + phase + ' · יעד ' + dest;
      } else if (car.call) label = 'המעלית בדרך אליך · ' + Math.max(1, Math.ceil(car.call.at - g.seconds)) + ' שנ׳';
      else if (inside) label = current + ' · בחר יעד או צא מהתא';
      else if (v.liftMenuOpen || v.liftArrivalHold > 0) label = current + ' · הדלתות פתוחות';
      else label = 'המעלית ב' + current + ' · לחץ L להזמנה';
      if (car.queue.length) label += ' · בתור ' + car.queue.map(f => floorName(f, top)).join(', ');
      if (status.textContent !== label) status.textContent = label;
      call.hidden = !!inside || v.liftMenuOpen || v.liftArrivalHold > 0;
      call.disabled = !!car.call;
      stops.hidden = !inside;
      cancel.hidden = !inside || !car.queue.length;
      const last = topStop(g, v), key = [last, top, v.floor, ride?.destination, car.queue.join(',')].join('/');
      if (inside && stopKey !== key) {
        stopKey = key;
        const buttons = [];
        for (let f = 0; f <= last; f++) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.floor50 = f;
          button.textContent = f <= top && f > 0 ? String(f) : floorName(f, top);
          button.setAttribute('aria-label', floorName(f, top));
          button.disabled = f === (ride?.destination ?? v.floor);
          button.setAttribute('aria-pressed', String(car.queue.includes(f)));
          buttons.push(button);
        }
        stops.replaceChildren(...buttons);
      }
    }

    P.openElevatorMenu = function () {
      const v = this.indoor;
      if (!v || v.stairTrip || v.liftRide || !ready(this)) return false;
      if (!hasLift(this, v)) { this.showInfo('במבנה הזה אין מעלית', 2.5); return false; }
      if (!isNear(this, v)) { this.showInfo('התקרב ללוח ליד דלתות המעלית', 2.5); return false; }
      const car = stateFor(v);
      if (car.call || v.liftMenuOpen || v.liftArrivalHold > 0) return true;
      if (car.floor !== v.floor) {
        car.call = { floor: v.floor, at: this.seconds + Math.min(8, 1.2 + Math.abs(car.floor - v.floor) * .6) };
        this.synth.cue('footstep', .12);
      } else {
        v.liftMenuOpen = true;
        v.liftArrivalHold = 3.2;
        this.synth.cue('train-door', .18);
      }
      draw(this);
      return true;
    };
    const start = P.startElevatorTo;
    P.startElevatorTo = function (floor) {
      const v = this.indoor;
      if (!hasLift(this, v) || !ready(this) || v.stairTrip || !Number.isInteger(floor) || floor < 0 || floor > topStop(this, v)) return false;
      const car = stateFor(v);
      if (v.liftRide) {
        if (v.liftRide.destination > v.scene.maxFloor || floor === v.liftRide.destination || car.queue.includes(floor) || car.queue.length >= 4) return false;
        car.queue.push(floor);
        draw(this);
        return true;
      }
      if (car.floor !== v.floor || !this.standingInsideElevator(v)) {
        this.openElevatorMenu();
        this.showInfo('היכנס לתא אחרי שהדלתות נפתחות', 2.8);
        return false;
      }
      const result = start.call(this, floor);
      if (result) {
        v.liftRide.travelledFloors = v.floor;
        v.liftRide.duration = 2.12 + Math.min(14, .78 * Math.abs(floor - v.floor));
        if (floor > v.scene.maxFloor) car.queue.length = 0;
        draw(this);
      }
      return result;
    };
    const update = P.updateInterior;
    P.updateInterior = function (dt, gas, steer) {
      const v = this.indoor;
      if (!hasLift(this, v)) return update.call(this, dt, gas, steer);
      const car = stateFor(v), riding = v.liftRide;
      // A legacy save may put the avatar inside a cabin on a floor other than
      // the lobby. Reconcile that saved position before restoring the barriers.
      if (!riding && !v.stairTrip && car.floor !== v.floor && cabinGeometry.call(this, v)) {
        car.floor = v.floor;
        car.call = null;
        car.queue.length = 0;
        v.liftArrivalHold = 4.2;
        v.liftDoorOpen = 1;
      }
      if (car.call && car.call.at <= this.seconds) {
        car.floor = car.call.floor;
        car.call = null;
        if (car.floor === v.floor && !v.stairTrip && isNear(this, v)) {
          v.liftMenuOpen = true;
          v.liftArrivalHold = 4.2;
          this.synth.cue('reward', .13);
        }
      }
      if (!riding && !v.stairTrip) {
        const near = isNear(this, v);
        if (near && !v.liftApproached50) this.openElevatorMenu();
        v.liftApproached50 = near;
        if (!near || v.liftArrivalHold <= 0 || car.floor !== v.floor) v.liftMenuOpen = false;
        if (car.floor !== v.floor) v.liftArrivalHold = 0;
        if (car.queue.length && !this.standingInsideElevator(v)) car.queue.length = 0;
        if (car.queue.length && this.seconds >= car.readyAt) this.startElevatorTo(car.queue.shift());
      }
      const result = update.call(this, dt, gas, steer);
      if (riding && !v.liftRide) {
        car.floor = riding.destination;
        car.readyAt = this.seconds + 3.4;
      }
      draw(this);
      return result;
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this);
      draw(this);
      return result;
    };
    call.addEventListener('click', () => game?.openElevatorMenu());
    cancel.addEventListener('click', () => {
      if (!game?.indoor) return;
      stateFor(game.indoor).queue.length = 0;
      draw(game);
    });
    stops.addEventListener('click', e => {
      const button = e.target.closest('[data-floor50]');
      if (button && game) game.startElevatorTo(Number(button.dataset.floor50));
    });
    document.addEventListener('keydown', e => {
      if (!ready(game ?? {}) || !game.indoor || stops.hidden || !/^Digit[0-9]$/.test(e.code) ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) game.startElevatorTo(Number(e.code.slice(-1)));
    }, true);
  }

  const finishes = {
    hotel: ['#724b57', '#efcf9f', 'פינת האירוח', 'צוות המלון מציג מפה של טיילת סאנסט'],
    glass: ['#304d62', '#b8e9e1', 'לוח העיר', 'מכאן אפשר לזהות את רובעי העיר ואת קו החוף'],
    tech: ['#344e53', '#8aefd1', 'דגם העיר', 'הדגם מציג את מערכת התחבורה של סאנסט'],
    heritage: ['#78513d', '#ffc992', 'תצוגת סאנסט', 'בתערוכה מוצגות עבודות על השכונות הוותיקות'],
    brick: ['#665039', '#f1cd98', 'ארכיון השכונה', 'האלבום מתעד את הרחוב מראשית ימיו'],
    residential: ['#395c53', '#f0d0a9', 'לוח השכונה', 'על הלוח מוצגים העסקים והגינות שסביב הבניין']
  };

  function installInteriors(P) {
    const sceneFor = P.sceneForFloor;
    P.sceneForFloor = function (plan, floor) {
      const scene = sceneFor.call(this, plan, floor);
      if (scene.city50Decorated) return scene;
      const [base, accent, title, story] = finishes[plan.materialFamily] ?? finishes.residential;
      const y = floor * plan.floorHeight + (scene.stage42Base || 0);
      const entrance = scene.entrance, lift = scene.lift, yaw = scene.stage07Yaw || 0;
      const place = (x, yy, z, w, h, d, color, material, glow = 0) => {
        const p = H.box(x, y + yy, z, w, h, d, color, yaw, 4, glow);
        p.material = material;
        p.shape = h > .08 ? 'rounded' : 'cube';
        scene.boxes.push(p);
      };
      if (floor === 0) {
        const dx = lift.x - entrance.x, dz = lift.z - entrance.z, len = Math.hypot(dx, dz) || 1;
        const rx = dz / len, rz = -dx / len;
        const center = { x: entrance.x + dx / len * 1.7, z: entrance.z + dz / len * 1.7 };
        place(center.x, .053, center.z, 2.30, .023, 1.28, base, 'fabric');
        place(center.x, .067, center.z, 2.12, .012, 1.10, accent, 'fabric');
        place(center.x, .075, center.z, 2.03, .008, 1.01, base, 'fabric');
        for (const side of [-1, 1]) {
          place(center.x + side * 1.05 * rx, 3.18, center.z + side * 1.05 * rz, .38, .10, .38, accent, 'light_emissive', .68);
        }
        scene.lights.push({ ...center, y: y + 3.10, radius: 7.5, r: 1.13, g: .89, b: .64 });
        const guide = [
          [entrance.x + dx / len * 3.3, entrance.z + dz / len * 3.3],
          [lift.x - dx / len * 3.9, lift.z - dz / len * 3.9]
        ];
        for (const [x, z] of guide) {
          if (x < scene.bounds.xmin + .7 || x > scene.bounds.xmax - .7 || z < scene.bounds.zmin + .7 || z > scene.bounds.zmax - .7) continue;
          place(x, 3.38, z, 1.40, .15, .42, base, 'metal');
          place(x, 3.27, z, 1.21, .08, .31, accent, 'light_emissive', .42);
        }
      }
      if (floor <= 2) {
        const target = scene.activities.at(-1) ?? scene.entrance;
        if (distance(target, lift) > 3.9 && (floor !== 0 || distance(target, entrance) > 3.8)) {
          scene.story50 = { x: target.x, z: target.z, title, story };
          place(target.x, 3.0, target.z, .66, .065, .62, accent, 'light_emissive', .55);
          scene.lights.push({ x: target.x, y: y + 2.85, z: target.z, radius: 5.2, r: 1.06, g: .97, b: .77 });
        }
      }
      scene.city50Decorated = true;
      return scene;
    };

    const interact = P.interactInside;
    P.interactInside = function () {
      const v = this.indoor, spot = v?.scene.story50;
      if (!spot || v.liftRide || v.stairTrip || distance(this.avatar, spot) > 1.8)
        return interact.call(this);
      interact.call(this);
      const id = 'city50:interior:' + v.portalId + ':' + v.floor;
      const found = this.visitRewards.has(id);
      if (!found) {
        this.visitRewards.add(id);
        H.awardCredits(this.profile, 35);
        this.saveProfile();
        this.saveVisitRewards();
        this.synth.cue('reward', .14);
        this.rewardFlash = .55;
      }
      this.showInfo(spot.story + (found ? '' : ' · חותמת ביקור ו־35 קרדיטים'), 5);
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this), v = this.indoor, s = v?.scene.story50;
      if (s && !v.liftRide && !v.stairTrip && distance(this.avatar, s) <= 1.8 && ready(this)) {
        const hint = el('interact-hint');
        hint.textContent = 'E · ' + s.title;
        hint.classList.remove('hidden');
      }
      return result;
    };

    const build = P.buildDynamic;
    P.buildDynamic = function () {
      const out = build.call(this);
      const g = this;
      const add = (x, y, z, w, h, d, color, glow, yaw = 0) => {
        const b = H.box(x, y, z, w, h, d, color, yaw, 4, glow);
        b.material = glow ? 'light_emissive' : 'metal';
        out.push(b);
      };
      if (g.indoor && !g.indoor.liftRide && !g.indoor.stairTrip) {
        const v = g.indoor, s = v.scene.story50;
        const y = v.floor * v.plan.floorHeight + (v.scene.stage42Base || 0);
        const id = 'city50:interior:' + v.portalId + ':' + v.floor;
        if (s && !g.visitRewards.has(id))
          add(s.x, y + 1.55 + .11 * Math.sin(g.seconds * 2.7), s.z, .15, .21, .15, '#ffdb96', .62, g.seconds);
        return out;
      }
      if (!g.running || g.inside || g.roofVisit || g.boat444 || g.avatar.swim445) return out;
      if (H.buildings52) { H.buildings52.drawEntrances(g, out); return out; }
      const normal = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
      for (const door of g.world.entrancePortals) {
        if (!door?.interiorReady || distance(g.cam, door) > 44 || !normal[door.facing]) continue;
        const [dx, dz] = normal[door.facing], yaw = dx ? Math.PI / 2 : 0;
        const y = H.outdoorHeight(door.x, door.z);
        const x = door.x + dx * .32, z = door.z + dz * .32;
        const width = Math.min(4.9, door.width + .42);
        const tint = ['#344e53', '#555868', '#594e49', '#475347'][door.id % 4];
        add(x, y + 3.58, z, width, .16, .49, tint, 0, yaw);
        add(x + dx * .13, y + 3.49, z + dz * .13, width * .76, .055, .095, '#f4ce9a', .65, yaw);
        for (const side of [-1, 1]) {
          const s = side * (width / 2 - .17);
          add(x - dz * s, y + 2.45, z + dx * s, .14, .33, .13, '#ffdab0', .55, yaw);
        }
      }
      return out;
    };
  }

  H.realism39.installers.push(Game => {
    installElevator(Game.prototype);
    installInteriors(Game.prototype);
  });
})(Heatline);
