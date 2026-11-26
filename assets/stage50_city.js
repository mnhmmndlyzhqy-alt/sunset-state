/* SUNSET STATE — City Update */
(function (H) {
  'use strict';
  const RC = H.realism39;
  const query = new URLSearchParams(location.search);
  if (query.has('realismOff') || query.has('city50Off')) return;
  const damping = (rate, dt) => 1 - Math.exp(-rate * dt);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const active = g => g.running && !g.paused && !g.over;
  const byId = id => document.getElementById(id);

  function chaseSubject(game) {
    if (game.inside || game.indoor || game.retailVisit || game.onTram >= 0 || game.onBus >= 0 ||
        game.vehicleEntry || game.cameraTransfer > 0 || game.entryTransition || game.exitTransition ||
        game.avatar?.swim445 || game.flight51?.pilot || game.boat444 || game.roofVisit || game.prison471?.active) return null;
    return game.inVehicle ? (game.cameraMode < 2 ? game.player : null) : game.avatar;
  }

  function installCamera(P) {
    if (query.has('classicCamera')) return;
    const original = P.updateCamera;
    const states = new WeakMap();
    function cameraState(game) {
      let state = states.get(game);
      if (state) return state;
      state = { subject: null, pointer: null };
      states.set(game, state);
      const canvas = byId('game');
      state.cancelDrag = () => {
        const id = state.pointer;
        state.pointer = null;
        if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      };
      const canDrag = () => state.subject === chaseSubject(game) && active(game) &&
        !game.showFullMap && !game.missionBoardOpen && !game.garageOpen;
      canvas.addEventListener('pointerdown', e => {
        if (!e.isPrimary || !state.subject || !canDrag()) return;
        const onFoot = !game.inVehicle;
        const armed = game.armed && onFoot;
        // The stock armed left click and the interior camera keep their own handlers.
        if ((e.button !== 0 && !(onFoot && e.button === 2)) ||
            (armed && e.button === 0 && e.pointerType !== 'touch')) return;
        state.pointer = e.pointerId;
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        state.idle = 0;
        canvas.setPointerCapture(e.pointerId);
        e.stopImmediatePropagation();
      }, true);
      canvas.addEventListener('pointermove', e => {
        if (e.pointerId !== state.pointer) return;
        if (!canDrag()) { state.cancelDrag(); return; }
        const yaw = H.clamp(e.clientX - state.mouseX, -90, 90) * .006;
        const pitch = H.clamp(e.clientY - state.mouseY, -90, 90) * .004;
        if (game.inVehicle) state.orbit = H.angleDiff(0, state.orbit - yaw);
        else game.footCameraYaw = H.angleDiff(0, game.footCameraYaw - yaw);
        state.pitch = H.clamp(state.pitch + pitch, -.38, .55);
        if (!game.inVehicle) {
          game.aimPitch = H.clamp(state.pitch, -.43, .50);
          game.stage44TrackPointer(e, canvas);
        }
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        state.idle = 0;
        e.stopImmediatePropagation();
      }, true);
      const release = e => { if (state.pointer === e.pointerId) state.cancelDrag(); };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      canvas.addEventListener('lostpointercapture', release);
      return state;
    }
    P.updateCamera = function (dt) {
      const state = cameraState(this), subject = chaseSubject(this);
      if (!subject) {
        state.subject = null;
        state.cancelDrag();
        return original.call(this, dt);
      }
      if (!active(this) || this.showFullMap || this.missionBoardOpen || this.garageOpen) state.cancelDrag();

      const c = this.cam, driving = this.inVehicle, wide = driving && this.cameraMode === 1;
      const vehicle = driving ? H.VEHICLE_CLASSES[H.carClass(subject)] : null;
      const ground = driving ? H.deckGround443(subject) : subject.y;
      const vx = subject.vx || 0, vz = subject.vz || 0, speed = Math.hypot(vx, vz);
      const yaw = driving ? subject.yaw : this.footCameraYaw;
      const forward = -Math.sin(yaw) * vx - Math.cos(yaw) * vz;
      const teleport = state.subject === subject && Math.hypot(subject.x - state.x, ground - state.y, subject.z - state.z) > 26;
      const reset = state.subject !== subject || teleport;
      dt = H.clamp(dt, 0, .12);
      const boom = driving
        ? (wide ? 13.8 : 7.5) + (vehicle.hd - 2.42) * 1.3 + Math.min(2.9, speed * .043)
        : 4.8 + Math.min(1.05, speed * .13);
      const altitude = driving
        ? (wide ? 6.2 : 3.05) + (vehicle.roof - 2.1) * .68 + Math.min(1, speed * .019)
        : 2.8 + Math.min(.50, speed * .047);
      const aimHeight = driving ? 1.30 : 1.40;
      const eye = { x: subject.x, y: ground + (driving ? vehicle.roof + .22 : 1.74), z: subject.z };
      if (reset) {
        state.cancelDrag();
        const fromX = c.x - subject.x, fromZ = c.z - subject.z;
        const hasNearbyView = !teleport && state.initialized &&
          Math.hypot(fromX, c.y - ground, fromZ) < 24 && Math.hypot(fromX, fromZ) > .7;
        Object.assign(state, {
          initialized: true, subject, heading: yaw, orbit: 0,
          pitch: driving ? 0 : H.clamp(this.aimPitch || 0, -.38, .55),
          rear: 0, idle: 0, clearance: 1,
          viewHeading: hasNearbyView ? Math.atan2(fromX, fromZ) : yaw,
          radius: hasNearbyView ? Math.hypot(fromX, fromZ) : boom,
          lift: hasNearbyView ? c.y - ground : altitude,
          lookX: hasNearbyView ? c.tx - subject.x : 0,
          lookY: hasNearbyView ? c.ty - ground : aimHeight,
          lookZ: hasNearbyView ? c.tz - subject.z : 0,
          fov: hasNearbyView ? c.fov || 63 : wide ? 69 : 63
        });
      }
      state.x = subject.x; state.y = ground; state.z = subject.z;

      // Vehicle heading may follow a little side-slip. Walking uses the same yaw
      // as the movement inputs so strafing never rotates the movement axes.
      const slip = driving && forward > 4 ? H.clamp(H.angleDiff(yaw, Math.atan2(-vx, -vz)), -.52, .52) : 0;
      state.heading += H.angleDiff(state.heading, yaw + slip * .42) * damping(driving ? 4.6 + speed * .032 : 18, dt);
      state.idle += dt;
      if (driving && state.pointer === null && state.idle > 1.45 && speed > 1.5) {
        state.orbit *= Math.exp(-dt * 2.1);
        state.pitch *= Math.exp(-dt * 1.7);
      }
      // The temporary rear view must not turn a walking player's movement controls.
      const rear = driving ? this.is('KeyQ') : !this.armed && this.is('KeyB');
      state.rear = H.lerp(state.rear, rear ? Math.PI : 0, damping(13, dt));
      const tracking = damping(state.pointer !== null || rear || state.rear > .12 ? 20 : 10, dt);
      const desiredHeading = state.heading + state.orbit;
      state.viewHeading += H.angleDiff(state.viewHeading, desiredHeading) * tracking;
      const h = state.viewHeading + state.rear;
      state.radius = H.lerp(state.radius, boom * Math.cos(state.pitch), tracking);
      const lift = altitude + Math.sin(state.pitch) * boom * .72;
      state.lift = H.lerp(state.lift, Math.max(eye.y - ground - .32, lift), tracking);
      const dx = Math.sin(h) * state.radius, dz = Math.cos(h) * state.radius;
      const dy = ground + state.lift - eye.y;
      // Sweep the full boom every frame. Retract on contact and extend smoothly
      // once clear, even when a wall moves out from behind the subject.
      const padding = driving ? .61 : .42;
      const safe = this.cameraClearance(eye, { x: eye.x + dx, y: eye.y + dy, z: eye.z + dz }, padding);
      const open = safe.blocked ? H.clamp(safe.clearance ?? 0, 0, 1) : 1;
      state.clearance = Math.min(open, H.lerp(state.clearance, open, damping(6, dt)));
      const pull = open > 0 ? state.clearance / open : 1;
      c.x = H.lerp(eye.x, safe.x, pull);
      c.y = H.lerp(eye.y, safe.y, pull);
      c.z = H.lerp(eye.z, safe.z, pull);

      const reveal = H.clamp(Math.cos(state.orbit) * Math.cos(state.rear), 0, 1);
      const ahead = (driving ? 2.4 + Math.min(4.2, Math.max(0, forward) * .09) :
        .82 + Math.min(1.1, Math.max(0, forward) * .10)) * reveal * H.clamp((state.clearance - .26) * 2.6, 0, 1);
      const lookYaw = driving ? yaw : state.viewHeading;
      const lookBlend = damping(safe.blocked ? 16 : 10, dt);
      state.lookX = H.lerp(state.lookX, -Math.sin(lookYaw) * ahead, lookBlend);
      state.lookY = H.lerp(state.lookY, aimHeight - state.pitch * .52, lookBlend);
      state.lookZ = H.lerp(state.lookZ, -Math.cos(lookYaw) * ahead, lookBlend);
      c.tx = subject.x + state.lookX; c.ty = ground + state.lookY; c.tz = subject.z + state.lookZ;
      // Zero wall clearance can leave the camera at the subject's eye.
      // Retain a horizontal look direction so the view basis stays defined.
      if (Math.hypot(c.tx - c.x, c.tz - c.z) < .30) {
        c.tx = c.x - Math.sin(h) * .30;
        c.tz = c.z - Math.cos(h) * .30;
      }
      state.fov = H.lerp(state.fov, driving ? (wide ? 69 : 61) + Math.min(10, speed * .15) :
        61 + Math.min(6, speed * .52), damping(5, dt));
      c.fov = state.fov;
      c.underwater445 = false;
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this);
      const button = byId('camera-button');
      if (button) {
        const text = this.inVehicle
          ? ['מצלמת מרדף', 'מצלמה רחבה', 'מבט מכסה מנוע', 'מבט מלמעלה'][this.cameraMode] + ' · C | מבט אחורה · Q'
          : 'סובב מצלמה · C | גרור כדי להביט | מבט אחורה · B';
        button.title = text;
        button.setAttribute('aria-label', text);
      }
      return result;
    };
  }

  function installVault(P) {
    const symbols = ['●', '◆', '▲'];
    let current = null;
    function draw(g, h) {
      const panel = byId('vault-console50');
      const isOpen = h && active(g) && !g.missionBoardOpen && !g.showFullMap;
      panel.hidden = !isOpen;
      if (!isOpen) { current = null; return; }
      current = g;
      const lock = h.console50;
      const preview = g.seconds < lock.showUntil;
      let text = preview ? lock.sequence.map(i => symbols[i]).join('　') : 'בחר בסדר שהוצג · ' + lock.index + '/' + lock.sequence.length;
      if (preview && lock.misses) text = 'נסה שוב · ' + text;
      if (panel.querySelector('output').textContent !== text) panel.querySelector('output').textContent = text;
      for (const control of panel.querySelectorAll('button')) control.disabled = preview;
    }
    function select(g, index) {
      const h = g?.heist44, lock = h?.console50;
      if (!lock || lock.done || !active(g) || g.seconds < lock.showUntil) return;
      if (lock.sequence[lock.index] !== index) {
        lock.index = 0;
        lock.misses++;
        lock.showUntil = g.seconds + 2.1;
        g.synth.cue('metal', .14);
      } else {
        lock.index++;
        g.synth.cue('footstep', .10);
        if (lock.index === lock.sequence.length) {
          lock.done = true;
          g.showInfo('רצף הסמלים נקלט · הישאר ליד הכספת עד לפתיחה', 3.2);
          draw(g, null);
          return;
        }
      }
      draw(g, h);
    }
    document.addEventListener('keydown', e => {
      if (!current || !/^Digit[123]$/.test(e.code) || e.target.matches?.('input,textarea')) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) select(current, Number(e.code.slice(-1)) - 1);
    }, true);
    byId('vault-console50').addEventListener('click', e => {
      const button = e.target.closest('[data-vault50]');
      if (button) select(current, Number(button.dataset.vault50));
    });

    const start = P.stage44StartHeist;
    P.stage44StartHeist = function () {
      const pending = this.heist44;
      const result = start.call(this);
      if (result && pending && pending === this.heist44 && pending.kind === 'bank' && pending.phase === 1 && !pending.waiting) {
        const first = this.rng.int(0, 2), second = (first + 1 + this.rng.int(0, 1)) % 3;
        pending.console50 = { sequence: [first, second, (second + 1 + this.rng.int(0, 1)) % 3],
          index: 0, misses: 0, showUntil: this.seconds + 2.7, done: false };
        draw(this, pending);
        this.showInfo('הכספת · זכור את רצף הסמלים', 2.7);
        this.updateHUD();
      }
      return result;
    };
    const tick = P.stage44HeistTick;
    P.stage44HeistTick = function (dt) {
      const h = this.heist44;
      if (h?.console50 && !h.console50.done) {
        tick.call(this, 0); // Preserve the engine's distance/exit checks while the console is open.
        draw(this, this.heist44 === h ? h : null);
        return;
      }
      tick.call(this, dt);
    };
    const hud = P.stage44ActionHUD;
    P.stage44ActionHUD = function () {
      hud.call(this);
      const h = this.heist44;
      const playing = h?.console50 && !h.console50.done;
      draw(this, playing ? h : null);
      if (playing) {
        byId('business-status44').textContent = 'שחזר את רצף הסמלים במסוף';
        byId('business-action44').style.display = 'none';
        byId('business-progress44').style.width = (100 * h.console50.index / h.console50.sequence.length) + '%';
      }
    };
    const lights = P.sceneLights;
    P.sceneLights = function () {
      const out = lights.call(this), visit = this.retailVisit;
      if (!visit?.venue.bank44 || !this.heist44) return out;
      const p = this.heist44.phase ? visit.scene.vault44 : visit.scene.counter;
      if (p) {
        const pulse = .64 + .48 * Math.sin(this.seconds * 6);
        out.unshift({ x: p.x, y: 2.8, z: p.z, radius: 8, r: pulse * 1.28, g: .11, b: .08, priority: 5 });
      }
      return out;
    };
  }

  // Missions share the existing journal, HUD, navigation and save format.
  function installActivities(P) {
    const Journal = H.MissionJournal30;
    H.MissionJournal30 = class extends Journal {
      constructor(world) {
        super(world);
        const fuel = world.fuelStations[0], buoy = H.storyBuoy445, stops = H.BUS_STOPS;
        const drive = (point, label) => ({ type: 'drive50', x: point.x, z: point.z, label });
        if (stops.length >= 5) this.catalog.push({
          id: 'city_rally50', icon: '🏁', title: 'מרוץ נגד השעון',
          description: 'סע דרך שלוש נקודות המסלול. השעון מתחיל במעבר בנקודה הראשונה.',
          reward: 520, xp: 160, steps: [
            drive(stops[1], 'סע לנקודת הזינוק המסומנת'), drive(stops[2], 'עבור ליד התחנה השנייה'),
            drive(stops[4], 'סיים בנקודת הסיום לפני שהזמן נגמר')]
        });
        if (buoy) this.catalog.push({
          id: 'harbor_dive50', icon: '🤿', title: 'אורות מתחת למים',
          description: 'שחה אל אזור המצוף, צלול אל שני סמני הסקר וחזור לפני המים.',
          reward: 410, xp: 135, steps: [
            { type: 'dive50', x: buoy.x, z: buoy.z, depth: 1.15, label: 'הגע למצוף וצלול עם Shift' },
            { type: 'dive50', x: buoy.x - 8, z: buoy.z + 7, depth: 1.15, label: 'שחה אל סמן הסקר השני' },
            { type: 'surface50', x: buoy.x - 8, z: buoy.z + 7, label: 'עלה לפני המים עם רווח' }]
        });
        if (fuel && stops.length >= 5) this.catalog.push({
          id: 'night_shift50', icon: '🌆', title: 'משמרת ערב',
          description: 'עבור בנקודות השירות של הרובע והחנה את הרכב ליד התחנה האחרונה.',
          reward: 360, xp: 120, steps: [
            drive(fuel, 'עבור ברכב ליד תחנת הדלק'), drive(stops[3], 'עבור ליד תחנת האוטובוס'),
            { type: 'park', x: stops[4].x, z: stops[4].z, label: 'עצור ליד נקודת המסירה (עד 8 קמ״ש)' }]
        });
      }
    };
    const update = P.update;
    P.update = function (dt) {
      const result = update.call(this, dt);
      if (!active(this)) return result;
      const journal = this.missions30, step = journal?.objective, mission = journal?.current;
      if (!step) { this.rally50 = null; return result; }
      if (mission.id === 'city_rally50') {
        const index = journal.stage(mission.id);
        if (!index) this.rally50 = null;
        else if (!this.rally50 || this.seconds > this.rally50.until) {
          this.rally50 = null;
          journal.stages.set(mission.id, 0);
          this.saveProfile();
          this.showInfo('המקצה הסתיים · חזור לנקודת הזינוק כדי להתחיל מחדש', 3.5);
          this.updateHUD();
          return result;
        }
      } else this.rally50 = null;
      if (step.type === 'drive50' && this.inVehicle && !this.player.wrecked && distance(this.player, step) <= 16) {
        if (mission.id === 'city_rally50' && !this.rally50) this.rally50 = { until: this.seconds + 100 };
        this.missionAction30({ type: step.type });
      } else if (this.avatar.swim445 && distance(this.avatar, step) < 5.5) {
        const depth = this.avatar.swim445.depth;
        if ((step.type === 'dive50' && depth >= step.depth) || (step.type === 'surface50' && depth <= .25))
          this.missionAction30({ type: step.type });
      }
      return result;
    };
    const hud = P.updateMissionHUD30;
    if (hud) P.updateMissionHUD30 = function () {
      const result = hud.call(this);
      if (this.rally50 && this.missions30.current?.id === 'city_rally50') {
        const left = Math.max(0, Math.ceil(this.rally50.until - this.seconds));
        byId('mission-distance').textContent += ' · ⏱ ' + left + ' שנ׳';
      }
      return result;
    };
    const build = P.buildDynamic;
    P.buildDynamic = function () {
      const out = build.call(this);
      const step = this.missions30?.objective;
      if (this.inside || !step || !['drive50', 'dive50', 'surface50'].includes(step.type) || distance(this.cam, step) > 105) return out;
      const y = step.type === 'drive50' ? H.outdoorHeight(step.x, step.z) + 2.8 : step.type === 'dive50' ? -1.5 : .22;
      const b = H.box(step.x, y + Math.sin(this.seconds * 2.5) * .12, step.z, .34, .55, .34, '#66ffcf', this.seconds, 4, .65);
      b.material = 'light_emissive';
      b.shape = 'rounded';
      out.push(b);
      return out;
    };
  }

  function installTrim(P) {
    const render = P.carGraphics;
    P.carGraphics = function (car, out, time) {
      render.call(this, car, out, time);
      const highDetail = H.quality51?.fixed && this.renderer instanceof H.GLRenderer;
      if (car.wrecked || car.rollover || (!highDetail && distance(this.cam, car) > 38)) return;
      const family = H.carClass(car);
      if (!['utility', 'wagon', 'sport', 'luxury'].includes(family)) return;
      const dims = H.stage20VehicleDimensions(H.stage20VehicleFamily(car));
      const yaw = -car.yaw, ground = H.deckGround443(car), anchor = 1.02;
      const basis = { yaw, pitch: car.bodyPitch || 0, roll: car.bodyRoll || 0 };
      function part(x, y, z, w, h, d, color, material) {
        const q = H.rotateBoxLocal(basis, x, y - anchor, z);
        const b = H.box(car.x + q[0], ground + anchor + q[1] + (car.suspension || 0), car.z + q[2], w, h, d, color, yaw);
        Object.assign(b, { shape: 'rounded', material, pitch: basis.pitch, roll: basis.roll });
        out.push(b);
      }
      if (family === 'utility' || family === 'wagon') {
        const roof = dims.roof + .07;
        for (const side of [-1, 1]) part(side * .64, roof, .25, .085, .13, family === 'utility' ? 1.55 : 1.23, '#515e62', 'metal');
        if (family === 'utility') for (const z of [-.30, .78]) part(0, roof + .055, z, 1.34, .063, .115, '#272f31', 'plastic');
      } else if (family === 'sport' && car.rearDamage < .55) {
        for (const side of [-1, 1]) part(side * .50, 1.12, 1.91, .09, .22, .21, '#242931', 'metal');
        part(0, 1.24, 1.91, 1.52, .085, .33, '#283239', 'plastic');
      } else if (family === 'luxury' && car.rearDamage < .55) {
        for (const side of [-1, 1]) part(side * .62, .61, 2.59, .27, .11, .19, '#b7bbbe', 'metal');
      }
    };
  }

  function installPursuit(P) {
    const scan = P.scanPoliceRadio;
    P.scanPoliceRadio = function (dt) {
      const result = scan.call(this, dt);
      if (!this.inVehicle || !this.policeInSight || this.heat < 2 || this.seconds < (this.nextPursuitRoles50 || 0))
        return result;
      this.nextPursuitRoles50 = this.seconds + 2.4;
      const cars = this.officers.filter(o => o.mode === 'riding' && o.car.alive && !o.car.wrecked &&
        o.car.pursuitRole !== 'block' && this.police.includes(o.car)).map(o => o.car);
      if (cars.length < 2) return result;
      const target = { x: this.policeRadio.lastKnownX, z: this.policeRadio.lastKnownZ };
      cars.sort((a, b) => distance(a, target) - distance(b, target));
      const previous = this.pursuitLead50;
      const lead = cars.includes(previous) && distance(previous, target) < distance(cars[0], target) + 19 ? previous : cars[0];
      this.pursuitLead50 = lead;
      const line = H.interceptRoadNode(this.player, 1.45);
      const candidates = cars.filter(c => c !== lead).sort((a, b) => distance(a, line) - distance(b, line));
      for (const c of cars) {
        const role = c === candidates[0] ? 'intercept' : 'chase';
        if (role !== c.pursuitRole) { c.pursuitRole = role; c.aiClock = 0; }
      }
      return result;
    };
  }

  function installInterface(P) {
    const filters = byId('mission-filters50'), list = byId('mission-list'), empty = byId('mission-empty50');
    let selected = 'all';
    const kindOf = m => {
      if (m.steps.some(s => ['heist', 'escape', 'wanted'].includes(s.type))) return 'chase';
      if (m.steps.some(s => s.type === 'dive50' || s.type === 'surface50')) return 'water';
      if (m.steps.some(s => ['drive50', 'park', 'refuel'].includes(s.type))) return 'drive';
      return 'city';
    };
    function filter() {
      let visible = 0;
      for (const card of list.children) {
        card.hidden = selected !== 'all' && selected !== card.dataset.kind50;
        if (!card.hidden) visible++;
      }
      empty.hidden = visible > 0;
      for (const b of filters.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.kind50 === selected));
    }
    filters.addEventListener('click', e => {
      const button = e.target.closest('[data-kind50]');
      if (!button) return;
      selected = button.dataset.kind50;
      filter();
      list.scrollTop = 0;
    });
    const refresh = P.refreshMissionBoard;
    P.refreshMissionBoard = function () {
      refresh.call(this);
      const missions = new Map(this.missions30.catalog.map(m => [m.id, m]));
      for (const card of Array.from(list.children)) {
        const m = missions.get(card.querySelector('[data-start-mission]')?.dataset.startMission);
        if (m) card.dataset.kind50 = kindOf(m);
      }
      const current = list.querySelector('.active');
      if (current) list.prepend(current);
      filter();
    };
    const hud = P.updateHUD;
    P.updateHUD = function () {
      const result = hud.call(this), p = this.player, box = byId('drive-gear50');
      const { fx, fz } = H.vehicleAxes(p);
      const reversing = p.vx * fx + p.vz * fz < -.4;
      const gear = this.inVehicle ? p.wrecked ? '—' : reversing ? 'R' : p.speed < .4 ? 'N' : 'D' + (p.rcDyn?.gear || '') : '';
      if (box.textContent !== gear) box.textContent = gear;
      return result;
    };
  }

  RC.installers.push(Game => {
    installInterface(Game.prototype);
    installCamera(Game.prototype);
    if (!query.has('gameplay48Off')) installVault(Game.prototype);
    installActivities(Game.prototype);
    installTrim(Game.prototype);
    installPursuit(Game.prototype);
  });
})(Heatline);
