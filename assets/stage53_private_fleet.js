/* SUNSET STATE — private island storage for vehicles physically brought there. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled) return;

  const kinds = ['plane', 'car', 'boat'];
  const titles = { plane: 'מטוס', car: 'רכב', boat: 'סירה' };
  const districts = { plane: 'רחבת ההאנגר', car: 'חניית המוסך', boat: 'רציף האחסון' };
  const ranges = { plane: 26, car: 13, boat: 8 };
  const speeds = { plane: .8, car: 1, boat: 1.2 };
  const carValues = ['paint', 'bodyStyle', 'hp', 'fuel', 'frontDamage', 'rearDamage', 'glassDamage', 'tireWear',
    'engineDamage', 'brakeDamage', 'suspensionDamage', 'steeringBias', 'damagedWheel', 'crashCount'];
  const carFlags = ['policeOrigin', 'stolenPolice'];
  const carArrays = { panelDamage: 6, panelDetached: 6, wheelDamage: 4 };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const slots = kind => H.estate53World?.slots[kind] || [];
  const canAct = g => g.running && !g.over && !g.paused && !g.inside && !g.showFullMap &&
    !g.missionBoardOpen && !g.garageOpen && !g.prison471?.active && !RC.chat48?.active;
  const capacity = kind => Math.min(slots(kind).length, (H.estate53 || RC.estate53)?.capacity(kind) ?? 1);
  const editable = e => e?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e?.tagName || '');
  const notes = { plane: 'מטוס גנוב מהחניה בשדה התעופה', car: 'רכב גנוב מהעיר', boat: 'סירה שנלקחה מרציף ציבורי' };
  let records = [], serial = 0;

  function carProfile(car) {
    const spec = { vehicleClass: H.VEHICLE_CLASSES[car.vehicleClass] ? car.vehicleClass : 'standard' };
    for (const key of carValues) if (Number.isFinite(car[key])) spec[key] = H.clamp(car[key], -100, 100);
    for (const key of carFlags) spec[key] = car[key] === true;
    for (const [key, n] of Object.entries(carArrays)) if (Array.isArray(car[key]))
      spec[key] = Array.from({ length: n }, (_, i) => key === 'panelDetached' ? car[key][i] === true :
        Number.isFinite(car[key][i]) ? H.clamp(car[key][i], 0, 100) : 0);
    return spec;
  }

  function boatProfile(boat) {
    return {
      name: typeof boat.name === 'string' ? boat.name.slice(0, 60) : 'סירה',
      paint: /^#[a-f0-9]{6}$/i.test(boat.paint) ? boat.paint : '#91c3bb',
      speed: Number.isFinite(boat.speed) ? H.clamp(boat.speed, 8, 28) : 18
    };
  }

  function sourceBlocked(kind, source) {
    return records.some(item => item.kind === kind && item.source === source);
  }

  function snapshot() {
    return { version: 1, serial, records: records.map(item => ({ ...item, spec: item.kind === 'car' ? carProfile(item.spec) : { ...item.spec } })) };
  }

  function restore(data) {
    records = [];
    serial = 0;
    if (data?.version !== 1 || !Array.isArray(data.records)) return;
    const used = new Set(), ids = new Set();
    for (const item of data.records.slice(0, 15)) {
      if (!item || !kinds.includes(item.kind) || typeof item.id !== 'string' ||
          !/^(plane|car|boat):[1-9][0-9]{0,8}$/.test(item.id) || !item.id.startsWith(item.kind + ':') ||
          ids.has(item.id) || typeof item.source !== 'string' || !/^[a-z0-9:._-]{1,80}$/i.test(item.source) ||
          !Number.isInteger(item.slot) || item.slot < 0 || item.slot > 4) continue;
      const slotKey = item.kind + ':' + item.slot;
      if (used.has(slotKey) || sourceBlocked(item.kind, item.source)) continue;
      if (item.kind === 'plane' && !/^airport:[0-9]$/.test(item.source)) continue;
      if (item.kind === 'boat' && !/^(0|1|island:[a-z0-9_-]+)$/.test(item.source)) continue;
      const spec = item.kind === 'car' ? carProfile(item.spec || {}) : item.kind === 'boat' ? boatProfile(item.spec || {}) : {};
      records.push({ kind: item.kind, id: item.id, source: item.source, slot: item.slot, spec });
      serial = Math.max(serial, Number(item.id.split(':')[1]));
      used.add(slotKey);
      ids.add(item.id);
    }
    if (Number.isInteger(data.serial) && data.serial <= 999999900) serial = Math.max(serial, data.serial);
  }

  const carSource = car => 'street:' + Math.round(car.x) + ':' + Math.round(car.z) + ':' + (car.paint || 0);
  function reconcilePlayerCar(g) {
    const source = g.player?.source53Id;
    if (!source) return;
    g.parked = g.parked.filter(car => car.fleet53Id || carSource(car) !== source);
  }
  const originals = g => (g.world.parkedAirliners471 || []).filter(plane => !plane.fleet53Id);
  const byId = actor => actor?.fleet53Id && records.find(item => item.id === actor.fleet53Id);
  function boardPlane(g, plane) {
    if (plane.fleet53Id || plane.source53Id) return;
    const index = originals(g).indexOf(plane);
    if (index >= 0) plane.source53Id = 'airport:' + index;
  }

  function parkAircraft(g, item, actor) {
    const at = slots('plane')[item.slot];
    if (!at) return;
    const list = g.world.parkedAirliners471;
    const duplicate = list.find(plane => plane.fleet53Id === item.id);
    const model = originals(g)[Number(item.source.split(':')[1])];
    if (!model) return;
    model.fleetHidden53 = true;
    const parked = duplicate || { ...model };
    delete parked.fleetHidden53;
    Object.assign(parked, at, { y: at.y + .1, parked: true, airborne: false, speed: 0, throttle: 0,
      bank: 0, pitch: 0, gear: 1, fleet53Id: item.id, source53Id: item.source });
    if (!duplicate) list.push(parked);
    if (actor === model && g.flight51?.plane === model) g.flight51.selectPlane(parked);
    return parked;
  }

  function parkCar(g, item, actor) {
    const at = slots('car')[item.slot];
    if (!at) return;
    const car = actor || H.makeCar('civilian', at.x, at.z, at.yaw, item.spec.paint || 0);
    Object.assign(car, item.spec, at, { type: 'civilian', market44: 'estate-stored', alive: true, wrecked: false,
      vx: 0, vz: 0, speed: 0, steer: 0, yawRate: 0, fleet53Id: item.id, source53Id: item.source, deck443: false });
    // Saved arrays must never share mutable references with a retrieved vehicle.
    for (const key of Object.keys(carArrays)) if (car[key]) car[key] = [...car[key]];
    if (!g.parked.includes(car)) g.parked.push(car);
    return car;
  }

  function setup(g) {
    if (!H.estate53World || !g.world || !g.parked) return;
    const planes = g.world.parkedAirliners471 || [];
    for (let i = planes.length - 1; i >= 0; i--) {
      if (planes[i].fleet53Id) planes.splice(i, 1);
      else delete planes[i].fleetHidden53;
    }
    g.parked = g.parked.filter(car => !car.fleet53Id && !sourceBlocked('car', carSource(car)));
    for (const item of records) {
      if (item.kind === 'plane') parkAircraft(g, item);
      if (item.kind === 'car') parkCar(g, item);
    }
  }

  function mooredBoats(g) {
    return records.filter(item => item.kind === 'boat' && item.id !== g.boat444?.fleet53Id &&
      slots('boat')[item.slot]).map(item => ({ ...item.spec, ...slots('boat')[item.slot], id: item.id, fleet53Id: item.id,
        source53Id: item.source, velocity: 0 }));
  }

  function nearbyBoat(g) {
    return mooredBoats(g).find(boat => Math.hypot(g.avatar.x - boat.boardX, g.avatar.z - boat.boardZ) < 3.4);
  }

  function candidate(g) {
    if (!canAct(g) || g.transport53?.trip || g.roofVisit) return null;
    const f = g.flight51;
    const kind = f?.pilot ? 'plane' : g.inVehicle ? 'car' : g.boat444 ? 'boat' : null;
    if (!kind) return null;
    const actor = kind === 'plane' ? f.plane : kind === 'car' ? g.player : g.boat444;
    if (kind === 'plane' && actor.airborne) return null;
    const slotList = slots(kind);
    if (!slotList.some(at => distance(at, actor) < ranges[kind])) return null;
    return { kind, actor, slotList };
  }

  function standing(g, kind, at, actor) {
    if (kind === 'boat') {
      const place = { x: at.boardX, z: at.boardZ };
      return H.marinaWalk444(place.x, place.z) && g.walkerPositionFree(place.x, place.z) ? place : null;
    }
    const shift = kind === 'plane' ? 10 : 2.65;
    const length = kind === 'plane' ? 9 : 0;
    for (const side of [-1, 1]) {
      const x = at.x + Math.cos(at.yaw) * side * shift + Math.sin(at.yaw) * length;
      const z = at.z - Math.sin(at.yaw) * side * shift + Math.cos(at.yaw) * length;
      if (g.walkerPositionFree(x, z, actor) && (H.estate53World.walkable(x, z) || H.marinaWalk444(x, z))) return { x, z };
    }
    return null;
  }

  function offload(g, item, actor, exit) {
    if (item.kind === 'plane') {
      const f = g.flight51;
      f.pilot = false;
      f.guideDirection = 0;
      f.hud?.deck?.clear();
      const parked = parkAircraft(g, item, actor);
      parked.parked = false; // Selected manual plane is emitted exactly once.
    } else if (item.kind === 'boat') {
      g.boat444 = null;
      g.transport53.anchor = null;
    } else {
      g.inVehicle = false;
      const starter = g.parked.findIndex(car => car.market44 === 'starter' && car.alive && !car.wrecked);
      g.player = starter >= 0 ? g.parked.splice(starter, 1)[0] : Object.assign(g.createStarterCar465(), { market44: 'starter' });
      g.player.type = 'player';
      parkCar(g, item, actor);
    }
    const { appearance, style, outfit460 } = g.avatar;
    g.returnToStreet(exit.x, exit.z);
    Object.assign(g.avatar, { appearance, style, outfit460 });
  }

  function stash(g) {
    const option = candidate(g);
    if (!option) return false;
    const { kind, actor, slotList } = option;
    const stored = byId(actor);
    const source = stored?.source || actor.source53Id ||
      (kind === 'car' && actor.market44 === 'stolen' ? 'acquired:' + (serial + 1) : '');
    if (!source || (kind === 'boat' && source === 'island:estate')) {
      g.showInfo('באחסון האי שומרים ' + notes[kind] + ' שהבאתם בעצמכם.', 3.5);
      return true;
    }
    const speed = kind === 'boat' ? actor.velocity : actor.speed;
    if (Math.abs(speed) >= speeds[kind]) {
      g.showInfo('עצרו לגמרי ב' + districts[kind] + ' לפני האחסון.', 2.7);
      return true;
    }
    const available = slotList.slice(0, capacity(kind)).map((at, slot) => ({ at, slot, gap: distance(actor, at) }))
      .filter(({ slot, gap }) => gap < ranges[kind] &&
        !records.some(item => item.kind === kind && item.slot === slot && item !== stored))
      .sort((a, b) => a.gap - b.gap);
    if (!available.length || (!stored && sourceBlocked(kind, source))) {
      g.showInfo('אין מקום אחסון פנוי כאן · שדרגו או עברו למקום חניה פנוי', 3.3);
      return true;
    }
    const parked = available.map(slot => ({ ...slot, exit: standing(g, kind, slot.at, actor) }))
      .find(slot => slot.exit && (kind === 'boat' ? H.boatWater444(slot.at.x, slot.at.z) :
        kind === 'plane' ? !H.estate53World?.aircraftObstacle?.(slot.at.x, slot.at.y, slot.at.z) :
          !g.world.nearby(slot.at.x, slot.at.z).some(o => H.carBuildingContact({ ...actor, ...slot.at }, o)) &&
          !g.parked.some(other => other !== actor && other.alive && distance(other, slot.at) < 4.4)));
    if (!parked) {
      g.showInfo('מקום האחסון או דרך היציאה חסומים. התקרבו למקום חניה פנוי.', 3.2);
      return true;
    }
    const item = stored || { kind, id: kind + ':' + ++serial, source };
    item.slot = parked.slot;
    item.spec = kind === 'car' ? carProfile(actor) : kind === 'boat' ? boatProfile(actor) : {};
    if (!stored) records.push(item);
    offload(g, item, actor, parked.exit);
    g.showInfo(titles[kind] + ' נשמר באי הפרטי · גשו אליו ולחצו E כדי להשתמש שוב.', 4.1);
    g.updateHUD();
    g.stage19SaveSystem?.saveAuto();
    return true;
  }

  function captureOverride(g, record) {
    const car = g.player, stored = byId(car), cargo = g.transport53?.trip?.carOrigin;
    if (stored?.kind === 'car') {
      const saved = record.fleet53?.records.find(item => item.id === stored.id);
      if (saved) saved.spec = carProfile(car);
      if (!g.inVehicle && !cargo) return { car: null };
      const at = slots('car')[stored.slot];
      const exit = at && standing(g, 'car', at, car);
      return { mode: 'foot', inVehicle: false, car: null, avatar: { ...record.avatar, ...(exit || at) } };
    }
    if (!record.car) return null;
    const source = car.source53Id ? { source53Id: car.source53Id } : {};
    if (cargo) return { mode: 'car', inVehicle: true, avatar: { ...record.avatar, ...cargo },
      car: { ...record.car, ...source, ...cargo, vx: 0, vz: 0, speed: 0, yawRate: 0 } };
    return car.source53Id ? { car: { ...record.car, ...source } } : null;
  }

  H.privateFleet53 = { snapshot, restore, sourceBlocked, reconcilePlayerCar, boardPlane, mooredBoats, nearbyBoat, stash, captureOverride,
    count: kind => records.filter(item => item.kind === kind).length };

  RC.installers.push(({ prototype: P }) => {
    const restart = P.restart;
    P.restart = function (...args) {
      const result = restart.apply(this, args);
      setup(this);
      this.updateHUD();
      return result;
    };
    const enter = P.finishVehicleEntry;
    P.finishVehicleEntry = function (car, collection) {
      const taking = car !== this.player && !car.fleet53Id && !car.source53Id && !car.owned48 &&
        (!car.market44 || car.market44 === 'stolen' || car.market44 === 'yardStock');
      const origin = taking && carSource(car);
      const result = enter.call(this, car, collection);
      if (taking && this.player === car) car.source53Id = origin;
      return result;
    };
    const notice = P.noticeVehicleTransfer;
    P.noticeVehicleTransfer = function (car, ...args) {
      if (!byId(car)) return notice.call(this, car, ...args);
    };
    const keyDown = P.keyDown;
    P.keyDown = function (event) {
      if (event.code === 'KeyK' && !event.repeat && !editable(event.target) && stash(this)) {
        event.preventDefault(); return;
      }
      return keyDown.call(this, event);
    };
    const updateHUD = P.updateHUD;
    P.updateHUD = function () {
      const result = updateHUD.call(this), choice = candidate(this);
      if (choice && !this.fleetButton53) {
        const parent = document.getElementById('hud');
        if (parent) {
          const button = document.createElement('button');
          button.type = 'button'; button.dir = 'rtl'; button.id = 'estate-fleet53';
          button.style.cssText = 'position:absolute;bottom:98px;left:50%;transform:translateX(-50%);padding:8px 16px;border:1px solid #9bd5ac;border-radius:7px;background:#143a2e;color:#e0f9e8;pointer-events:auto;font:700 13px system-ui';
          button.addEventListener('click', () => stash(this));
          parent.append(button);
          this.fleetButton53 = button;
        }
      }
      if (this.fleetButton53) {
        this.fleetButton53.hidden = !choice;
        if (choice) this.fleetButton53.textContent = 'אחסון ' + titles[choice.kind] + ' · K';
      }
      return result;
    };
  });
})(Heatline);
