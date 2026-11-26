/* SUNSET STATE 51: level-aware pedestrian perception and anticipatory
 * cross-traffic braking. Uses existing roads/actors/colliders unchanged. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC || new URLSearchParams(location.search).has('citySafety51Off')) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const finite = o => o && Number.isFinite(o.x) && Number.isFinite(o.z);
  const sameLevel = (a, b) => typeof H.sameRoadLevel443 !== 'function' || H.sameRoadLevel443(a, b);
  const grids = new WeakMap();
  const stats = { bridgeThreatsFiltered: 0, crossTrafficBraking: 0, gridBuilds: 0, candidateChecks: 0 };

  function nearbyCars(game, car) {
    const lists = [game.civilian, game.police, game.parked, game.buses];
    const stamp = game.seconds || 0;
    let cache = grids.get(game);
    if (!cache || cache.stamp !== stamp || cache.player !== game.player || cache.world !== game.world ||
        lists.some((a, i) => a !== cache.lists[i] || (a?.length || 0) !== cache.lengths[i])) {
      const cells = new Map(), seen = new Set();
      for (const list of [...lists, [game.player]]) for (const o of list || []) {
        if (!finite(o) || seen.has(o) || o.alive === false || o.wrecked) continue;
        seen.add(o);
        const key = Math.floor(o.x / 32) + ',' + Math.floor(o.z / 32);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(o);
      }
      cache = { cells, lists, lengths: lists.map(a => a?.length || 0), player: game.player, world: game.world, stamp };
      grids.set(game, cache); stats.gridBuilds++;
    }
    // One grid per simulation step, padded for actors updated earlier in that
    // step. Fast traffic must not remain in a stale cell from a previous frame.
    const out = [], radius = 70;
    for (let x = Math.floor((car.x - radius) / 32); x <= Math.floor((car.x + radius) / 32); x++)
      for (let z = Math.floor((car.z - radius) / 32); z <= Math.floor((car.z + radius) / 32); z++) {
        const cell = cache.cells.get(x + ',' + z);
        if (cell) out.push(...cell);
      }
    return out;
  }

  function crossTrafficRisk(game, car) {
    if (!finite(car) || !Number.isFinite(car.yaw)) return 0;
    const ownSpeed = Math.hypot(car.vx || 0, car.vz || 0);
    if (ownSpeed < 2.5) return 0; // Stationary pairs must be able to move off again.
    const axes = H.vehicleAxes(car);
    const own = H.VEHICLE_CLASSES[H.carClass(car)] || H.VEHICLE_CLASSES.standard;
    let result = 0;
    for (const other of nearbyCars(game, car)) {
      if (other === car || other.alive === false || other.wrecked) continue;
      // Buses follow route poses and expose signed speed/yaw, not vx/vz.
      const routeSpeed = Number.isFinite(other.yaw) && Number.isFinite(other.speed) ? other.speed : 0;
      const ovx = Number.isFinite(other.vx) ? other.vx : -Math.sin(other.yaw || 0) * routeSpeed;
      const ovz = Number.isFinite(other.vz) ? other.vz : -Math.cos(other.yaw || 0) * routeSpeed;
      const speed = Math.hypot(ovx, ovz);
      if (speed < 1.6) continue;
      const dx = other.x - car.x, dz = other.z - car.z;
      if (Math.abs(dx) > 54 || Math.abs(dz) > 54) continue;
      const heading = ((car.vx || 0) * ovx + (car.vz || 0) * ovz) / (ownSpeed * speed);
      // The existing headway controller already owns parallel and head-on lanes.
      if (Math.abs(heading) > .86 || !sameLevel(car, other)) continue;
      const ahead = dx * axes.fx + dz * axes.fz, right = dx * axes.rx + dz * axes.rz;
      if (ahead < -own.hd || right < -.5) continue; // Yield to crossing traffic from the right.
      const rvx = ovx - (car.vx || 0), rvz = ovz - (car.vz || 0);
      const rate = rvx * rvx + rvz * rvz;
      if (rate < 1) continue;
      const t = -(dx * rvx + dz * rvz) / rate;
      if (t < .05 || t > 2.1) continue;
      stats.candidateChecks++;
      const miss = Math.hypot(dx + rvx * t, dz + rvz * t);
      const profile = H.VEHICLE_CLASSES[H.carClass(other)] || own;
      const clearance = own.hw + profile.hw + .85;
      if (miss >= clearance) continue;
      result = Math.max(result, clamp((2.2 - t) / 1.7, .12, 1) * (1 - miss / clearance * .6));
    }
    return result;
  }

  RC.installers.push(function installCitySafety(Game) {
    const danger = H.pedestrianPredictedDanger, crossing = H.pedestrianCrossingSafe;
    if (typeof danger === 'function') H.pedestrianPredictedDanger = function (walker, cars) {
      const recovery = H.cityLifeRecovery5;
      if (recovery?.stats.installed && !recovery.disabled()) return danger.call(this, walker, cars);
      const local = cars.filter(c => {
        if (!finite(c) || Math.abs(c.x - walker.x) > 38 || Math.abs(c.z - walker.z) > 38) return false;
        if (sameLevel(walker, c)) return true;
        stats.bridgeThreatsFiltered++;
        return false;
      });
      return danger.call(this, walker, local);
    };
    if (typeof crossing === 'function') H.pedestrianCrossingSafe = function (walker, cars, trams) {
      const x = (walker.navAxis === 'z' ? walker.navRoad : walker.navNode) ?? walker.x;
      const z = (walker.navAxis === 'x' ? walker.navRoad : walker.navNode) ?? walker.z;
      return crossing.call(this, walker, cars.filter(c => finite(c) && Math.abs(c.x - x) <= 98 &&
        Math.abs(c.z - z) <= 98 && sameLevel(walker, c)), trams);
    };
    const move = Game.prototype.moveCar;
    Game.prototype.moveCar = function (car, dt, input) {
      if (car?.type === 'civilian' && input?.gas > 0 && !car.wrecked && !car.rollover) {
        const risk = crossTrafficRisk(this, car);
        if (risk > .18) {
          input = { ...input, gas: -clamp(risk * .92, .12, .9), brake: false };
          stats.crossTrafficBraking++;
        }
      }
      return move.call(this, car, dt, input);
    };
  });
  H.citySafety51 = { crossTrafficRisk, stats };
})(Heatline);
