/* SUNSET STATE — manual airliner controls for the existing airport. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled) return;

  const runway = H.reference469.runway;
  const east = Math.PI / 2;
  const surface = field => field.elevation + .15;
  const surfaceHeight = surface(runway);
  const rotationSpeed = 35;
  const maxAltitude = 390;
  const taxiSpeed = 12;
  const pushbackSpeed = 4.5;
  // Distances measured from both authored high-detail airliner meshes.
  const nose = 21.2;
  const wing = 18.36;
  const cameraViews = ['chase', 'wide', 'nose'];
  const home = { x: runway.west + 215, z: runway.z, y: surfaceHeight, yaw: east };
  const parking = { ...home, z: runway.z - 54 };
  const clamp = H.clamp;
  const smooth = (from, to, rate, dt) => H.lerp(from, to, 1 - Math.exp(-rate * dt));
  const angle = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const onRunway = (x, z, field = runway) => x > field.west + 4 && x < field.east - 4 &&
    z > field.north + 2 && z < field.south - 2;
  const walkable = (x, z) => H.estate53World?.walkable(x, z) || H.marinaWalk444(x, z);
  const taxiGround = (x, z) => H.estate53World && x > 1269 ? H.estate53World.drivable(x, z) : walkable(x, z);
  const gameReady = g => g.running && !g.paused && !g.over && !g.garageOpen && !g.missionBoardOpen && !g.showFullMap;
  const boardingSite = world => world.stage38Sites.find(site => site.name === 'AIRPORT');
  const editable = element => element?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element?.tagName || '');
  const flightKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Space'];
  const suspendedKeys = ['KeyJ', 'KeyO', 'KeyQ', 'KeyU', 'KeyV', 'KeyZ', 'F7',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

  function doorPoint(plane, side) {
    return { x: plane.x + Math.cos(plane.yaw) * side * 6 + Math.sin(plane.yaw) * 9,
      z: plane.z - Math.sin(plane.yaw) * side * 6 + Math.cos(plane.yaw) * 9 };
  }

  function visibleOnFoot(game, from, to) {
    const x = (from.x + to.x) * .5, z = (from.z + to.z) * .5;
    return game.walkerPositionFree(to.x, to.z) && walkable(to.x, to.z) &&
      H.officerSightClear(from.x, from.z, to.x, to.z, game.world.nearby(x, z));
  }

  function approachInfo(plane, direction, field = runway) {
    const threshold = direction > 0 ? field.west + 20 : field.east - 20;
    const range = (threshold - plane.x) * direction;
    const runwayLeft = direction > 0 ? field.east - plane.x : plane.x - field.west;
    const cross = (plane.z - field.z) * direction;
    const heading = angle(plane.yaw, direction * east);
    const requestedZ = Math.atan2(field.z - plane.z, Math.max(55, range + 85));
    const intercept = angle(plane.yaw, direction * (east - requestedZ));
    const slope = Math.max(0, range + 72) * .087;
    const height = plane.y - surface(field);
    const speedKmh = Math.round(plane.speed * 3.6);
    const offset = Math.round(Math.abs(cross));
    let command = 'משמרים קו נחיתה';
    if (runwayLeft < 85) command = 'המסלול מאחור או קצר מדי · הקיפו לגישה חדשה';
    else if (Math.abs(cross) > Math.max(11, range * .15) || Math.abs(heading) > .16)
      command = intercept > 0 ? 'תיקון שמאלה · A' : 'תיקון ימינה · D';
    else if (speedKmh > 208) command = 'מהירות גבוהה · הפחיתו מצערת';
    else if (speedKmh < 131) command = 'מהירות נמוכה · הוסיפו מצערת';
    else if (height > slope + 13) command = 'מעל נתיב הגישה · הנמיכו';
    else if (range > 0 && height < slope - 11) command = 'מתחת לנתיב הגישה · הרימו אף';
    return { direction, threshold, range, cross, offset, runwayLeft, heading, slope, command, speedKmh };
  }

  function setWalker(game, at, yaw) {
    const a = game.avatar;
    Object.assign(a, at, { y: H.outdoorHeight(at.x, at.z), yaw, vx: 0, vz: 0, vy: 0,
      grounded: true, support: null, deck443: false, coastDeck461: false });
    if (a.rcLoco) a.rcLoco.vx = a.rcLoco.vz = 0;
    game.footCameraYaw = yaw;
    game.cameraTransfer = .55;
  }

  function obstacleCells(world) {
    const cells = new Map();
    const add = (x, z, hw, hd, top) => {
      const obstacle = { x, z, hw, hd, top };
      for (let ix = Math.floor((x - hw) / H.BLOCK); ix <= Math.floor((x + hw) / H.BLOCK); ix++) {
        for (let iz = Math.floor((z - hd) / H.BLOCK); iz <= Math.floor((z + hd) / H.BLOCK); iz++) {
          const key = `${ix},${iz}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(obstacle);
        }
      }
    };
    for (const b of world.buildings)
      add(b.x, b.z, b.w * .5, b.d * .5, (b.stage42Ground ?? H.outdoorHeight(b.x, b.z)) + b.h);
    for (const b of world.city20DistrictBuildings || []) {
      const sin = Math.abs(Math.sin(b.stage07Yaw || 0)), cos = Math.abs(Math.cos(b.stage07Yaw || 0));
      add(b.x, b.z, (cos * b.width + sin * b.depth) * .5,
        (sin * b.width + cos * b.depth) * .5, b.baseY + b.height + 2);
    }
    for (const b of world.mapFeatures461 || []) {
      if (b.id === 'terminal' || b.id === 'hangar')
        add(b.x, b.z, b.width * .5, b.depth * .5, runway.elevation + (b.id === 'terminal' ? 20 : 15));
    }
    return cells;
  }

  class Flight {
    constructor(game) {
      this.game = game;
      this.site = boardingSite(game.world);
      this.world = game.world;
      this.obstacles = obstacleCells(this.world);
      this.stands = new Map((this.world.parkedAirliners471 || []).filter(plane => !plane.fleet53Id).map(plane => [plane, { ...plane }]));
      this.reserve = {};
      this.plane = this.reserve;
      this.pilot = false;
      this.view = 'chase';
      this.guideDirection = 0;
      this.recoveryField = runway;
      this.hud = null;
      this.resetPlane(parking);
      // A full restart rebuilds the city while retaining the ambient controller.
      game.stage39Life.world = this.world;
      game.stage39Life.flight.world = this.world;
      game.stage39Life.manualPlane51 = this.plane;
    }

    get wide() { return this.view === 'wide'; }
    set wide(value) { this.view = value ? 'wide' : 'chase'; }

    cycleCamera() {
      const next = (cameraViews.indexOf(this.view) + 1) % cameraViews.length;
      this.view = cameraViews[next];
      if (next !== 1) this.cameraHeading = undefined;
      this.game.updateCamera(.04);
      this.game.updateHUD();
    }

    selectPlane(plane) {
      if (this.stands.has(this.plane) || this.plane.fleet53Id) this.plane.parked = true;
      this.plane = plane;
      this.plane.parked = false;
      this.game.stage39Life.manualPlane51 = plane;
    }

    restoreStands() {
      for (const [plane, original] of this.stands) {
        for (const key of Object.keys(plane)) {
          if (!Object.hasOwn(original, key)) delete plane[key];
        }
        Object.assign(plane, original);
      }
    }

    resetPlane(position, apron = false) {
      Object.assign(this.plane, position, { speed: 0, throttle: 0, verticalSpeed: 0, pitch: 0, bank: 0,
        yawRate: 0, gear: 1, flaps: false, airborne: false, mode: 'taxi', apron, reverse: false, parked: false });
      this.runwayBrake = false;
      this.cameraHeading = undefined;
      this.status = '';
    }

    fieldAt(x, z) {
      const estate = H.estate53World?.runway;
      if (!estate) return runway;
      const gap = field => Math.hypot(x - clamp(x, field.west, field.east), z - field.z);
      return gap(estate) < gap(runway) ? estate : runway;
    }

    departurePoint(field = runway) {
      if (field !== runway) return { x: field.west + 80, z: field.z, y: surface(field), yaw: east };
      const traffic = this.game.stage39Life.plane;
      if (!traffic || traffic.y >= 18 || Math.abs(traffic.z - runway.z) >= 33) return home;
      // Depart in the same direction as ground traffic, with enough room to rotate.
      if (Math.sin(traffic.yaw) >= 0) {
        if (traffic.mode === 'taxi' && traffic.x < runway.west + 86) return home;
        const ahead = Math.max(home.x, traffic.x + 225);
        return { ...home, x: ahead < runway.east - 155 ? ahead : runway.west + 24 };
      }
      const ahead = Math.min(runway.east - 92, traffic.x - 225);
      return { ...home, x: ahead > runway.west + 155 ? ahead : runway.east - 24, yaw: -east };
    }

    boardingCandidate() {
      const g = this.game, a = g.avatar;
      if (!gameReady(g) || this.pilot || g.inVehicle || g.inside || g.boat444 || g.roofVisit || a.swim445 ||
          g.onBus >= 0 || g.onTram >= 0 || g.prison471?.active || g.vehicleEntry || g.entryTransition ||
          g.exitTransition || !a.grounded || Math.abs(a.y - H.outdoorHeight(a.x, a.z)) > 1.6) return null;
      let best = null, closest = 7;
      const check = (plane, kind) => {
        if (plane.fleetHidden53 || plane.airborne || (plane.speed || 0) >= .8 || distance(a, plane) > 20) return;
        for (const side of [-1, 1]) {
          const door = doorPoint(plane, side), d = distance(a, door);
          if (d >= closest || !visibleOnFoot(g, a, door)) continue;
          best = { kind, plane };
          closest = d;
        }
      };
      check(this.plane, 'plane');
      for (const plane of this.world.parkedAirliners471 || []) {
        if (plane !== this.plane) check(plane, 'stand');
      }
      if (best) return best;
      if (!this.world.airport54 && this.site && distance(a, this.site) < 11 && visibleOnFoot(g, a, this.site)) return { kind: 'terminal' };
      return null;
    }

    boardingAccess() { return this.boardingCandidate()?.kind || ''; }

    ownsInteraction() {
      return gameReady(this.game) && (this.pilot || !!this.boardingAccess());
    }

    interact() {
      const g = this.game;
      let p = this.plane;
      if (!gameReady(g)) return false;
      if (this.pilot) {
        if (p.airborne || p.speed >= .8) {
          g.showInfo('נחתו ועצרו לגמרי לפני היציאה מהמטוס', 2.6);
          return true;
        }
        const exit = [doorPoint(p, 1), doorPoint(p, -1)].find(at => g.walkerPositionFree(at.x, at.z) &&
          walkable(at.x, at.z));
        if (!exit) {
          g.showInfo('אין מקום בטוח ליציאה ליד המטוס. הסיעו אותו מעט קדימה ונסו שוב.', 3);
          return true;
        }
        this.pilot = false;
        this.hud?.deck?.clear();
        p.throttle = 0;
        p.speed = 0;
        p.reverse = false;
        this.guideDirection = 0;
        setWalker(g, exit, angle(0, p.yaw + Math.PI));
        g.keys.clear();
        g.updateCamera(.05);
        g.showInfo('יצאתם מהמטוס. אפשר לעלות שוב ליד הדלת.', 2.6);
        g.updateHUD();
        return true;
      }
      const access = this.boardingCandidate();
      if (!access) return false;
      if (access.kind === 'terminal') {
        this.selectPlane(this.reserve);
        this.resetPlane(this.departurePoint());
      } else if (access.kind === 'stand') {
        this.selectPlane(access.plane);
        this.resetPlane(access.plane, true);
        H.privateFleet53?.boardPlane(g, access.plane);
      } else if (!onRunway(p.x, p.z, this.fieldAt(p.x, p.z))) {
        p.apron = true;
      }
      p = this.plane;
      this.recoveryField = this.fieldAt(p.x, p.z);
      // The on-foot boarding position is also the fallback for session saves.
      // The aircraft itself is transient, matching the existing transport saves.
      RC.chat48?.close();
      this.pilot = true;
      this.hud?.deck?.clear();
      p.throttle = 0;
      p.speed = 0;
      this.status = '';
      this.guideDirection = 0;
      this.cameraHeading = undefined;
      g.armed = false;
      g.keys.clear();
      g.updateCamera(.05);
      const source = p.source53Id && !p.fleet53Id ? 'לקחתם מטוס מהחניה · אפשר לאחסן באי הפרטי אחרי נחיתה. ' : '';
      g.showInfo(source + (p.apron ? 'X לדחיפה לאחור · W להסעה · R לעמדת ההמראה.' :
        'מטוס מוכן. החזיקו W להאצה ואז Shift או ↑ להרמת האף.'), 5.5);
      g.updateHUD();
      return true;
    }

    toggleGuidance() {
      this.guideDirection = this.guideDirection ? 0 : Math.sin(this.plane.yaw) < 0 ? -1 : 1;
      this.guideField = this.fieldAt(this.plane.x, this.plane.z);
      this.game.updateHUD();
    }

    toggleFlaps() {
      const p = this.plane;
      if (!this.pilot || !gameReady(this.game)) return;
      if (!p.flaps && p.speed > 59) {
        this.game.showInfo('האטו מתחת ל־212 קמ״ש לפני פתיחת מדפים', 2.8);
        return;
      }
      p.flaps = !p.flaps;
      this.game.updateHUD();
    }

    setThrottle(value) {
      if (this.pilot && gameReady(this.game) && Number.isFinite(value)) this.plane.throttle = clamp(value, 0, 1);
    }

    maneuver(code) {
      const g = this.game, p = this.plane;
      if (p.airborne) return;
      if (code === 'KeyT') {
        p.apron = !p.apron;
        g.showInfo(p.apron ? 'מגבלת מהירות להסעה הופעלה' : 'מצב הסעה מהירה · בחרו מסלול פנוי', 2);
      } else if (p.speed < .6) {
        p.reverse = !p.reverse;
        p.throttle = 0;
        g.keys.clear();
        g.showInfo(p.reverse ? 'דחיפה לאחור · לחצו W להזזה ורווח לבלימה' : 'דחיפה לאחור הסתיימה', 2.5);
      } else {
        g.showInfo('עצרו לגמרי לפני מעבר לדחיפה לאחור', 2);
      }
    }

    stopOnApron(note, yaw) {
      Object.assign(this.plane, { speed: 0, throttle: 0, yawRate: 0, yaw });
      this.game.keys.clear();
      this.game.showInfo(note, 2.7);
    }

    recover(note) {
      this.resetPlane(this.departurePoint(this.recoveryField));
      this.guideDirection = 0;
      this.hud?.deck?.clear();
      this.game.keys.clear();
      this.game.showInfo(note, 4);
    }

    step(dt) {
      dt = clamp(dt, 0, .05);
      if (!dt || !gameReady(this.game)) return;
      const g = this.game, p = this.plane;
      const field = this.fieldAt(p.x, p.z), stripY = surface(field);
      const previousYaw = p.yaw;
      const inputAllowed = !editable(document.activeElement) && !RC.chat48?.active;
      const held = (...codes) => (inputAllowed && g.is(...codes)) || !!this.hud?.deck?.held(codes);
      const turn = Number(held('KeyA', 'ArrowLeft')) - Number(held('KeyD', 'ArrowRight'));
      const pitch = Number(held('ShiftLeft', 'ShiftRight', 'ArrowUp')) - Number(held('ControlLeft', 'ControlRight', 'ArrowDown'));
      const power = Number(held('KeyW')) - Number(held('KeyS'));
      const aligned = Math.abs(Math.sin(p.yaw)) > .94;
      const rotation = rotationSpeed - (p.flaps ? 4 : 0);
      const stallSpeed = p.flaps ? 27 : 31;
      if (!p.airborne && p.apron && !p.reverse && (power > 0 || p.throttle > .25) && pitch > 0 && aligned && onRunway(p.x, p.z, field))
        p.apron = false;
      const groundBrake = 15 * (1 - (g.weather.rain || 0) * .20);
      const remaining = Math.sin(p.yaw) > 0 ? field.east - p.x : p.x - field.west;
      if (!p.airborne && !p.reverse && aligned && onRunway(p.x, p.z, field) && p.speed > 10 &&
          remaining < p.speed ** 2 / (groundBrake * 2) + nose && (p.mode === 'rollout' || pitch <= 0 || p.speed < rotation))
        this.runwayBrake = true;
      if (this.runwayBrake && p.speed < .6 && power === 0) this.runwayBrake = false;
      const brake = !p.airborne && (held('Space') || this.runwayBrake);
      p.throttle = brake ? 0 : clamp(p.throttle + power * .54 * dt, 0, 1);
      const flapDrag = p.airborne && p.flaps ? .26 + p.speed ** 2 * .00023 : 0;
      const drag = flapDrag + (p.airborne ? 1.1 + p.speed ** 2 * .00103 : 1.4 + p.speed ** 2 * .00074);
      const limited = !p.airborne && (p.reverse || p.apron);
      const limit = p.reverse ? pushbackSpeed : taxiSpeed;
      const governor = limited ? clamp((limit - p.speed) * .78, 0, 1) : 1;
      p.speed = clamp(p.speed + (p.throttle * 13.1 * governor - drag - Math.sin(p.pitch) * 8 -
        (brake ? groundBrake : 0)) * dt, 0, 86);
      const direction = p.reverse ? -1 : 1;
      p.bank = smooth(p.bank, p.airborne ? -turn * .59 : 0, 3.9, dt);
      const turnRate = p.airborne ? -Math.tan(p.bank) * 32 / Math.max(p.speed, 32) : direction *
        turn * Math.min(p.speed / (p.apron ? 2.5 : 4), 1) * ((p.apron ? .95 : .66) / (1 + p.speed / 19));
      p.yawRate = smooth(p.yawRate, turnRate, p.airborne ? 5 : 8, dt);
      p.yaw = angle(0, p.yaw + p.yawRate * dt);
      const rotating = !p.airborne && !p.reverse && !p.apron && p.speed >= rotation && pitch > 0 &&
        Math.abs(Math.sin(p.yaw)) > .94 && onRunway(p.x, p.z, field);
      p.pitch = smooth(p.pitch, p.airborne ? pitch * (pitch > 0 ? .28 : .19) : rotating ? .12 : 0, 3.8, dt);
      if (rotating && p.pitch > .045) {
        p.airborne = true;
        p.verticalSpeed = 1.5;
        p.mode = 'climb';
      }
      const stalled = p.airborne && p.speed < stallSpeed;
      if (p.airborne) {
        const stallSink = Math.max(0, stallSpeed - p.speed) * .76;
        const targetClimb = p.speed * Math.sin(p.pitch) - stallSink - (Math.abs(p.bank) * .9);
        const overRunway = aligned && Math.abs(p.bank) < .20 && onRunway(p.x, p.z, field);
        const flare = overRunway && p.y - stripY < 14 && p.speed <= 60;
        p.verticalSpeed = smooth(p.verticalSpeed, clamp(targetClimb, flare ? -4.4 : -13, 18), 2.5, dt);
      }
      const x = p.x + Math.sin(p.yaw) * p.speed * dt * direction;
      const z = p.z + Math.cos(p.yaw) * p.speed * dt * direction;
      const bounds = H.estate53World?.flightBounds;
      const within = bounds && x >= bounds.west && x <= bounds.east && z >= bounds.north && z <= bounds.south;
      if (!within && (Math.abs(x) > H.WORLD_LIMIT + 50 || Math.abs(z) > H.WORLD_LIMIT + 50)) {
        this.recover('הגעתם לגבול המפה. המטוס הוחזר למסלול.');
        return;
      }
      const strip = onRunway(x, z, field);
      const ground = strip ? stripY : Math.max(.10, H.outdoorHeight(x, z) + .10);
      const landingHeight = Math.max(0, p.y - ground);
      const y = p.airborne ? Math.min(maxAltitude, p.y + p.verticalSpeed * dt) : ground;
      const moving = p.airborne || p.speed > .02;
      if (!Number.isFinite(x + y + z)) {
        this.recover('המטוס הוחזר לנקודת ההמראה.');
        return;
      }
      if (moving && (this.blocked(x, y, z) || (!p.airborne && !taxiGround(x, z)))) {
        if (!p.airborne && p.speed <= 15) this.stopOnApron('מכשול בדרך · המטוס נעצר. אפשר להסיע לאחור או ללחוץ R.', previousYaw);
        else this.recover('המטוס נעצר והוחזר למסלול. שימרו מרחק ממכשולים.');
        return;
      }
      const traffic = g.stage39Life.plane;
      const nearbyPlane = other => other && !other.fleetHidden53 && other !== p && Math.abs(y - other.y) < 7 && Math.hypot(x - other.x, z - other.z) < 31;
      if (moving && (nearbyPlane(traffic) || this.world.parkedAirliners471?.some(nearbyPlane))) {
        if (!p.airborne && p.speed <= 15) this.stopOnApron('מטוס קרוב · המתינו לפינוי הדרך או עברו לעמדת ההמראה עם R.', previousYaw);
        else this.recover('מטוס תנועה במסלול. המטוס שלכם הוחזר לנקודת ההתחלה.');
        return;
      }
      Object.assign(p, { x, z, y });
      if (p.airborne && p.y <= ground && p.verticalSpeed <= 0) {
        if (!strip || !aligned || Math.abs(p.bank) > .22 || p.verticalSpeed < -6.2 || p.speed > 63) {
          this.recover('הנחיתה הופסקה. התיישרו עם המסלול והנמיכו במהירות מתונה.');
          return;
        }
        Object.assign(p, { airborne: false, verticalSpeed: 0, y: ground, throttle: 0, pitch: 0, gear: 1, mode: 'rollout' });
        this.guideDirection = 0;
        this.recoveryField = field;
        g.showInfo('נחיתה מוצלחת. החזיקו רווח לבלימה, ואז לחצו E ליציאה.', 4.3);
      }
      if (p.y >= maxAltitude && p.verticalSpeed > 0) p.verticalSpeed = 0;
      const gearDown = !p.airborne || landingHeight < 9 || (landingHeight < 35 && p.verticalSpeed < 1.5);
      p.gear = smooth(p.gear, gearDown ? 1 : 0, 3.2, dt);
      if (p.airborne) p.mode = stalled ? 'stall' : p.verticalSpeed > 2 ? 'climb' : gearDown ? 'approach' : 'cruise';
      else if (p.mode !== 'rollout') p.mode = p.speed >= rotation ? 'takeoff' : 'taxi';
      this.status = this.runwayBrake ? 'בלימה לפני קצה המסלול' : p.y >= maxAltitude - 1 ? 'תקרת טיסה' : '';
    }

    blocked(x, y, z) {
      const p = this.plane;
      const fX = Math.abs(Math.sin(p.yaw)), fZ = Math.abs(Math.cos(p.yaw));
      const extentX = Math.max(fX * nose + fZ * 3, fZ * wing + fX * 4);
      const extentZ = Math.max(fZ * nose + fX * 3, fX * wing + fZ * 4);
      // Cover the whole motion segment and the lower wing through the turn.
      const left = Math.min(x, p.x) - extentX, right = Math.max(x, p.x) + extentX;
      const near = Math.min(z, p.z) - extentZ, far = Math.max(z, p.z) + extentZ;
      const low = Math.min(y, p.y) - Math.abs(Math.sin(p.bank)) * 12 - Math.abs(Math.sin(p.pitch)) * 7;
      const overlaps = b => left < b.x + b.hw && right > b.x - b.hw && near < b.z + b.hd && far > b.z - b.hd;
      for (let ix = Math.floor(left / H.BLOCK); ix <= Math.floor(right / H.BLOCK); ix++) {
        for (let iz = Math.floor(near / H.BLOCK); iz <= Math.floor(far / H.BLOCK); iz++) {
          const candidates = this.obstacles.get(`${ix},${iz}`);
          if (candidates?.some(b => low < b.top + 2 && overlaps(b))) return true;
        }
      }
      // Short colliders such as fences are only relevant close to the surface.
      return low - H.outdoorHeight(x, z) < 5 && this.world.nearby(x, z).some(b => !b.broken && overlaps(b));
    }

    camera(dt) {
      const g = this.game, p = this.plane, c = g.cam;
      if (this.view === 'nose') {
        const basis = { yaw: -p.yaw, roll: p.bank, pitch: -p.pitch };
        const [x, y, z] = H.rotateBoxLocal(basis, 0, .7, nose + 1.8);
        const [fx, fy, fz] = H.rotateBoxLocal(basis, 0, 0, 60);
        Object.assign(c, { x: p.x + x, y: Math.max(p.y + 3.9 + y, H.outdoorHeight(p.x + x, p.z + z) + 1.5),
          z: p.z + z, fov: 72, underwater445: false });
        c.tx = c.x + fx;
        c.ty = c.y + fy;
        c.tz = c.z + fz;
        return;
      }
      const entering = this.cameraHeading === undefined;
      this.cameraHeading = entering ? p.yaw : this.cameraHeading + angle(this.cameraHeading, p.yaw) * (1 - Math.exp(-dt * 5.4));
      const sx = Math.sin(this.cameraHeading), sz = Math.cos(this.cameraHeading);
      const back = (this.wide ? 59 : 37) + p.speed * .075;
      const rise = (this.wide ? 24 : 13) + Math.max(0, p.verticalSpeed) * .20;
      const desired = { x: p.x - sx * back, y: p.y + rise, z: p.z - sz * back };
      const eye = { x: p.x, y: p.y + 5.4, z: p.z };
      const f = entering ? 1 : 1 - Math.exp(-dt * 9);
      const candidate = { x: H.lerp(c.x, desired.x, f), y: H.lerp(c.y, desired.y, f), z: H.lerp(c.z, desired.z, f) };
      candidate.y = Math.max(candidate.y, H.outdoorHeight(candidate.x, candidate.z) + 2);
      // Sweep the interpolated view so easing around a corner cannot cross a wall.
      const safe = g.cameraClearance(eye, candidate, .65);
      c.x = safe.x;
      c.z = safe.z;
      c.y = Math.max(safe.y, H.outdoorHeight(safe.x, safe.z) + 2);
      c.tx = p.x + sx * 9;
      c.ty = p.y + 4.4 + p.verticalSpeed * .24;
      c.tz = p.z + sz * 9;
      if (Math.hypot(c.tx - c.x, c.ty - c.y, c.tz - c.z) < .5) {
        c.tx = c.x + sx * 9;
        c.tz = c.z + sz * 9;
      }
      c.fov = smooth(c.fov, this.wide ? 70 : 65, 5, dt);
      c.underwater445 = false;
    }

    renderHud() {
      const g = this.game, p = this.plane;
      const walking = gameReady(g) && !g.inVehicle && !g.inside && !g.boat444 && !g.roofVisit &&
        !g.avatar.swim445 && !g.prison471?.active && g.onBus < 0 && g.onTram < 0;
      const nearDesk = !this.world.airport54 && walking && this.site && distance(g.avatar, this.site) < 31;
      const access = this.boardingAccess();
      if (!(this.pilot && gameReady(g)) && !nearDesk && !access) {
        if (this.hud) {
          this.hud.panel.hidden = true;
          this.hud.deck?.clear();
        }
        return;
      }
      if (!this.hud) this.hud = createHud(this);
      if (!this.hud) return;
      const { panel, title, detail, guidance, controls, board, groundControls, deck } = this.hud;
      panel.hidden = false;
      guidance.hidden = !this.pilot || !p.airborne || !this.guideDirection;
      if (groundControls) {
        groundControls.ground.hidden = !this.pilot || p.airborne;
        groundControls.air.hidden = !this.pilot || !p.airborne;
      }
      board.hidden = this.pilot ? p.airborne || p.speed >= .8 : !access;
      board.textContent = this.pilot ? 'יציאה מהמטוס (E)' : 'כניסה למטוס (E)';
      controls.hidden = !this.pilot;
      const hint = document.getElementById('interact-hint');
      const cameraButton = document.getElementById('camera-button');
      if (this.pilot) {
        const phase = { taxi: 'הסעה', takeoff: 'מהירות המראה', climb: 'טיפוס', cruise: 'טיסה',
          approach: 'גישה לנחיתה', rollout: 'ריצת נחיתה', stall: 'מהירות נמוכה · הגבירו מצערת' }[p.mode];
        const groundMode = !p.airborne && (p.reverse ? 'דחיפה לאחור' : p.apron && p.mode !== 'rollout' ? 'הסעה איטית' : '');
        title.textContent = 'מטוס SKYLINE 320 · ' + (this.status || groundMode || phase);
        const height = Math.max(0, Math.round(p.y - H.outdoorHeight(p.x, p.z)));
        detail.textContent = `${Math.round(p.speed * 3.6)} קמ״ש · גובה ${height} מ׳ · מצערת ${Math.round(p.throttle * 100)}% · גלגלים ${p.gear > .52 ? 'פתוחים' : 'סגורים'}`;
        deck?.update(height);
        if (!guidance.hidden) {
          const cue = approachInfo(p, this.guideDirection, this.guideField);
          const runwayName = cue.direction > 0 ? 'מזרחה' : 'מערבה';
          const along = cue.range > 0 ? `${Math.round(cue.range)} מ׳ לסף` : `${Math.max(0, Math.round(cue.runwayLeft))} מ׳ מסלול נותרו`;
          guidance.textContent = `${this.guideField && this.guideField !== runway ? 'האי הפרטי · ' : ''}${runwayName} · ${along} · סטייה ${cue.offset} מ׳ · ${cue.command}`;
        }
        if (g.infoClock <= 0) hint?.classList.add('hidden');
        document.getElementById('talk-touch')?.classList.add('hidden');
        const viewName = { chase: 'מרדף', wide: 'מבט רחב', nose: 'מבט מהאף' }[this.view];
        cameraButton?.setAttribute('title', viewName + ' · החלפה עם C');
        cameraButton?.setAttribute('aria-label', viewName + ' · החלפה עם C');
      } else {
        title.textContent = 'בית הספר לטיסה · SKYLINE 320';
        detail.textContent = access === 'plane' || access === 'stand' ? 'לחצו E ליד דלת המטוס' : access ? 'לחצו E כדי להגיע למטוס בקצה המסלול' : 'התקרבו לעמדת הטיסה מחוץ לטרמינל';
        if (access && hint) {
          hint.textContent = 'E · כניסה למטוס';
          hint.classList.remove('hidden');
        }
      }
    }
  }

  function createHud(flight) {
    const root = document.getElementById('hud');
    if (!root) return null;
    const panel = document.createElement('section');
    panel.id = 'flight-panel51';
    panel.dir = 'rtl';
    panel.setAttribute('aria-label', 'לוח טיסה');
    const touch = globalThis.matchMedia('(pointer: coarse)').matches;
    panel.style.cssText = 'position:absolute;inset-inline:12px;bottom:18%;margin-inline:auto;width:max-content;max-width:calc(100% - 32px);padding:9px 12px;border:1px solid #6cc4c480;border-radius:10px;color:#eaf7f3;background:#0a2028ec;text-align:center;font:500 13px/1.45 system-ui;box-shadow:0 3px 18px #0006';
    const title = document.createElement('strong');
    const detail = document.createElement('div');
    const guidance = document.createElement('div');
    guidance.style.color = '#b9f4e9';
    const controls = document.createElement('div');
    controls.textContent = 'W/S מצערת · A/D או ←/→ פנייה · ↑/Shift הרמת אף · ↓/Ctrl הנמכה · רווח בלמים · C מצלמה · L נחיתה · T הסעה · X דחיפה · E יציאה · R למסלול';
    const board = document.createElement('button');
    board.type = 'button';
    board.style.cssText = 'margin:5px 4px 0;padding:3px 9px;border:1px solid #6cc4c480;border-radius:7px;background:#133b47;color:#ecffff;font:inherit;cursor:pointer';
    board.addEventListener('click', () => flight.interact());
    panel.append(title, detail, guidance, controls, board);
    let groundControls;
    const deck = H.flightControls53?.mount(flight, panel, controls, detail, touch);
    if (touch && !deck) {
      panel.style.bottom = 'clamp(166px, 28%, 280px)';
      const descend = document.createElement('button');
      descend.type = 'button';
      descend.style.cssText = board.style.cssText + ';touch-action:none';
      descend.textContent = 'החזיקו להנמכה';
      descend.addEventListener('pointerdown', event => {
        event.preventDefault();
        descend.setPointerCapture(event.pointerId);
        flight.game.keys.add('ArrowDown');
      });
      const release = () => flight.game.keys.delete('ArrowDown');
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) descend.addEventListener(event, release);
      const ground = document.createElement('div'), air = document.createElement('div');
      const action = (label, fn) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = board.style.cssText;
        button.textContent = label;
        button.addEventListener('click', fn);
        return button;
      };
      ground.append(action('דחיפה לאחור', () => flight.maneuver('KeyX')),
        action('מצב הסעה', () => flight.maneuver('KeyT')),
        action('לעמדת ההמראה', () => flight.recover('המטוס חזר לנקודת ההמראה.')));
      air.append(descend, action('הכוונת נחיתה', () => flight.toggleGuidance()));
      controls.append(ground, air);
      groundControls = { ground, air };
    }
    root.append(panel);
    return { panel, title, detail, guidance, controls, board, groundControls, deck };
  }

  function flight(game) {
    if (!game.flight51 || game.flight51.world !== game.world) {
      game.flight51?.hud?.panel.remove();
      game.flight51 = new Flight(game);
    }
    return game.flight51;
  }

  const nav = H.Navigator445.prototype;
  const navActor = nav.actor;
  nav.actor = function () {
    const f = this.game.flight51;
    if (f?.pilot) return { x: f.plane.x, z: f.plane.z, yaw: angle(0, f.plane.yaw + Math.PI), level: 0 };
    return navActor.call(this);
  };
  const navPlaces = nav.buildPlaces;
  nav.buildPlaces = function () {
    const places = navPlaces.call(this);
    const site = boardingSite(this.world), airport = places.find(place => place.id === 'airport');
    if (site && airport) Object.assign(airport, { x: site.x, z: site.z, name: 'שדה תעופה · טיסה עצמאית' });
    return places;
  };

  RC.installers.push(({ prototype: P }) => {
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this);
      flight(this).renderHud();
      return result;
    };
    const reset = P.restart;
    P.restart = function (...args) {
      this.flight51?.restoreStands();
      this.flight51?.hud?.panel.remove();
      this.flight51 = null;
      this.stage39Life.manualPlane51 = null;
      return reset.apply(this, args);
    };
    const toggle = P.toggleVehicle;
    P.toggleVehicle = function () {
      if (!flight(this).interact()) return toggle.call(this);
    };
    const keyDown = P.keyDown;
    P.keyDown = function (event) {
      const f = this.flight51;
      if (!f?.pilot || !gameReady(this)) return keyDown.call(this, event);
      if (editable(event.target)) return;
      if (flightKeys.includes(event.code)) {
        if (!event.metaKey) {
          event.preventDefault();
          this.keys.add(event.code);
        }
        return;
      }
      if (['KeyE', 'KeyC', 'KeyR', 'KeyL', 'KeyT', 'KeyX', 'KeyF'].includes(event.code)) {
        event.preventDefault();
        if (event.repeat) return;
        if (event.code === 'KeyC') f.cycleCamera();
        else if (event.code === 'KeyE') f.interact();
        else if (event.code === 'KeyR') f.recover('המטוס חזר לנקודת ההמראה.');
        else if (event.code === 'KeyL') f.toggleGuidance();
        else if (event.code === 'KeyF') f.toggleFlaps();
        else f.maneuver(event.code);
        return;
      }
      if (suspendedKeys.includes(event.code)) return;
      return keyDown.call(this, event);
    };
    const updateCamera = P.updateCamera;
    P.updateCamera = function (dt) {
      if (this.flight51?.pilot) return this.flight51.camera(dt);
      return updateCamera.call(this, dt);
    };
    const arrest = P.resolveArrest442;
    P.resolveArrest442 = function (...args) {
      if (this.flight51?.pilot) {
        const f = this.flight51;
        f.pilot = false;
        f.guideDirection = 0;
        f.resetPlane(f.stands.get(f.plane) || parking);
        this.keys.clear();
      }
      return arrest.apply(this, args);
    };
    const objects = P.buildDynamic;
    P.buildDynamic = function () {
      const out = objects.call(this);
      const f = this.flight51, site = f?.site;
      if (f?.pilot && f.plane.airborne && f.guideDirection) {
        const field = f.guideField || runway;
        const threshold = f.guideDirection > 0 ? field.west + 20 : field.east - 20;
        if (distance(this.cam, { x: threshold, z: field.z }) < 540) {
          const y = surface(field) + .035;
          for (const z of [field.z - 7, field.z + 7]) {
            for (const dx of [3, 37]) {
              const strip = H.box(threshold + dx * f.guideDirection, y, z, 5.5, .035, .56, '#8bece2', 0, 4, .62);
              strip.material = 'light_emissive';
              strip.visibilityCap = 560;
              out.push(strip);
            }
          }
        }
      }
      if (!this.world.airport54 && site && !this.inside && !f.pilot && distance(site, this.cam) < 85) {
        const y = H.outdoorHeight(site.x, site.z);
        const tile = H.box(site.x, y + .09, site.z, 2.4, .10, 2.4, '#2f969c', 0, 4, .24);
        tile.material = 'light_emissive';
        tile.shape = 'rounded';
        const post = H.box(site.x, y + 1.21 + Math.sin(this.seconds * 2.5) * .14, site.z, .45, .8, .45, '#83e3de', 0, 4, .7);
        post.shape = 'sphere';
        post.material = 'light_emissive';
        out.push(tile, post);
      }
      return out;
    };
  });
})(Heatline);
