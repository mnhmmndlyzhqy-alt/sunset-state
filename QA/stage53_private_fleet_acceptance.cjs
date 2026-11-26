'use strict';

// Actual Game input, transport simulation and Stage19 saves using the simulated
// rendering surface from the shared bootstrap. No WebGL or browser validation.
const assert = require('node:assert/strict');
const { H, g } = require('./stage51_bootstrap.cjs');

const checks = [];
const check = (name, result, data) => {
  assert.ok(result, data == null ? name : name + ' ' + JSON.stringify(data));
  checks.push(name);
};
const key = code => g.keyDown({ code, preventDefault() {} });
const keys = (...codes) => { g.keys.clear(); for (const code of codes) g.keys.add(code); };
const step = (dt = .05) => g.update(dt);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const until = (stop, max, controller, dt = .05) => {
  for (let frame = 0; frame < max && !stop(); frame++) {
    if (controller) controller();
    step(dt);
  }
  return stop();
};
const stopped = a => Math.abs(a.speed) < .8;
const estate = H.estate53World, fleets = H.privateFleet53;
const fit = (value, min, max) => Math.max(min, Math.min(value, max));
function walk(at) {
  g.inVehicle = false;
  Object.assign(g.avatar, at, { y: H.outdoorHeight(at.x, at.z), grounded: true,
    support: null, deck443: false, swim445: null, vx: 0, vy: 0, vz: 0 });
  keys();
  g.updateHUD();
}
const door = p => ({ x: p.x + Math.sin(p.yaw) * 9 + Math.cos(p.yaw) * 6,
  z: p.z + Math.cos(p.yaw) * 9 - Math.sin(p.yaw) * 6 });
const plank = b => ({ x: b.boardX, z: b.boardZ });
const frame = p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), yaw: +p.yaw.toFixed(3),
  speed: +p.speed.toFixed(2), note: g.infoMessage, mode: p.mode, airborne: p.airborne });

g.restart({ reuseWorld: true });
step();
check('Portable legacy save exists before the fleet is acquired', g.stage19SaveNow('slot3').ok);
const f = g.flight51, t = g.transport53, runway = estate.runway;
const homePlane = g.world.parkedAirliners471[0];
walk(door(homePlane));
key('KeyE');
check('Grounded door boards the genuine airport airliner as a theft source', f.pilot && f.plane === homePlane &&
  homePlane.source53Id === 'airport:0');
key('KeyK');
check('The airport cannot be used to stash an airliner', fleets.count('plane') === 0);
if (g.missionBoardOpen) key('Escape');
key('KeyR');
key('KeyF');
keys('KeyW', 'ArrowUp');
check('Stolen aircraft rotates on the city runway', until(() => homePlane.airborne, 140), frame(homePlane));
const departing = { x: homePlane.x, z: homePlane.z };

function pilot(target, height, throttle) {
  const p = homePlane;
  const turn = H.angleDiff(p.yaw, Math.atan2(target.x - p.x, target.z - p.z)) - p.yawRate * .46;
  const climb = (height - p.y) * .47 - p.verticalSpeed * .73;
  f.setThrottle(throttle);
  keys(...(turn > .055 ? ['KeyA'] : turn < -.055 ? ['KeyD'] : []),
    ...(climb > 1.15 ? ['ArrowUp'] : climb < -1.15 ? ['ArrowDown'] : []));
}
check('Manual controls fly across the world bounds to an aligned estate approach',
  until(() => homePlane.x > 1235 && homePlane.airborne, 1450,
    () => pilot({ x: Math.max(1365, homePlane.x + 135), z: runway.z }, 107, homePlane.x > 850 ? .40 : .75)) && distance(homePlane, departing) > 1050, frame(homePlane));
if (process.env.FLEET_TRACE) console.error('approach start', frame(homePlane));
key('KeyL');
check('Landing director selects the private runway near the island', f.guideField === runway &&
  f.hud.guidance.textContent.includes('האי הפרטי'));
let approachFrame = 0;
check('Manual aircraft touches down on the private runway without jumping between runways',
  until(() => !homePlane.airborne, 520, () => {
    if (process.env.FLEET_TRACE && approachFrame++ % 50 === 0) console.error('approach', frame(homePlane), homePlane.verticalSpeed);
    pilot({ x: homePlane.x + 145, z: runway.z },
      Math.max(runway.elevation - 4, runway.elevation + (1585 - homePlane.x) * .13), homePlane.speed > 51 ? 0 : .30);
  }) &&
  f.recoveryField === runway && homePlane.mode === 'rollout', frame(homePlane));
keys('Space');
check('Private runway rollout stops on pavement', until(() => stopped(homePlane), 155) &&
  homePlane.x < runway.east - 25, frame(homePlane));

// Brake, push back if entering a turn, then progressively follow open tarmac
// toward the marked apron without manipulating the vehicle's coordinates.
key('KeyT');
const planeSlot = estate.slots.plane[0];
const taxi = target => {
  const p = homePlane;
  const aim = Math.atan2(target.x - p.x, target.z - p.z);
  const turn = H.angleDiff(p.yaw, aim) - p.yawRate * .35;
  f.setThrottle(Math.abs(turn) > .70 ? .45 : .62);
  keys(...(turn > .10 ? ['KeyA'] : turn < -.10 ? ['KeyD'] : []));
};
check('Stolen aircraft taxis away from the estate runway to the hangar apron',
  until(() => distance(homePlane, planeSlot) < 21, 1200, () => taxi(planeSlot)), frame(homePlane));
keys('Space');
check('Aircraft is stationary before storing it', until(() => stopped(homePlane), 60), frame(homePlane));
key('KeyK');
check('Storing retains one actual aircraft and hides its airport source', !f.pilot && fleets.count('plane') === 1 &&
  homePlane.fleetHidden53 && g.world.parkedAirliners471.filter(p => p.fleet53Id).length === 1 &&
  g.walkerPositionFree(g.avatar.x, g.avatar.z), { fleet: fleets.snapshot(), pos: frame(homePlane) });
const storedPlane = g.world.parkedAirliners471.find(p => p.fleet53Id);
walk(door(storedPlane));
key('KeyE');
check('Stored airliner can be boarded through its estate door', f.pilot && f.plane === storedPlane);
key('KeyE');
check('Stored airliner remains available after a grounded disembark', !f.pilot && f.plane === storedPlane);

const port = g.transport53.waterStops.find(loc => loc.id === 'estate'), publicDock =
  g.transport53.waterStops.find(loc => loc.id === 'dolphin');
check('Estate has authored safe arrival coordinates and expanded navigable coast', port?.carDrop &&
  estate.drivable(port.carDrop.x, port.carDrop.z) && H.boatWater444(port.berth.x, port.berth.z) &&
  !H.boatWater444(estate.center.x, estate.center.z));
const boatPath = H.transport53.planWater(publicDock.berth, port.berth);
check('Water route from an existing island avoids both shorelines',
  boatPath?.length && boatPath.every((a, i) => H.transport53.waterLine(i ? boatPath[i - 1] : publicDock.berth, a)));
walk(plank(publicDock.berth));
key('KeyE');
const boat = g.boat444;
check('A public boat can be taken and steered independently', boat?.source53Id === publicDock.berth.id && !g.transport53.trip);
let targetIndex = 0;
function helm() {
  const waypoint = boatPath[targetIndex];
  if (targetIndex < boatPath.length - 1 && distance(boat, waypoint) < 10) targetIndex++;
  const target = boatPath[targetIndex];
  const turn = H.angleDiff(boat.yaw, Math.atan2(boat.x - target.x, boat.z - target.z));
  const nearEnd = targetIndex === boatPath.length - 1 && distance(boat, target) < 17;
  keys(Math.abs(turn) > 1.01 ? 'Space' : nearEnd && boat.velocity > 6 ? 'Space' : 'KeyW',
    ...(turn > .065 ? ['KeyA'] : turn < -.065 ? ['KeyD'] : []));
}
check('Manually steered boat actually crosses open water to the estate berth',
  until(() => distance(boat, port.berth) < 5, 2100, helm, .10) && distance(boat, publicDock.berth) > 400,
  { point: [boat.x, boat.z], targetIndex, route: boatPath });
keys('Space');
check('Boat slows for safe storage', until(() => Math.abs(boat.velocity) < 1, 38));
key('KeyK');
check('Boat storage retains its original paint and produces exactly one boat in the private berth',
  !g.boat444 && fleets.count('boat') === 1 && fleets.mooredBoats(g).length === 1 &&
  fleets.mooredBoats(g)[0].paint === boat.paint);
walk(plank(fleets.mooredBoats(g)[0]));
key('KeyE');
check('Stored boat leaves the private berth in manual control without a duplicate', g.boat444?.fleet53Id &&
  fleets.mooredBoats(g).length === 0);
key('KeyE');

const marina = g.transport53.marina;
const car = g.parked.find(c => !c.market44 && c.alive && c.hp > 3);
const vehicleApproach = H.carFootWorld(car, -2.4, 0);
walk(vehicleApproach);
key('KeyE');
check('Player enters an actual civilian car and acquires its theft identity', g.inVehicle && g.player === car &&
  car.source53Id && car.market44 === 'stolen');
const originalClass = car.vehicleClass, originalPaint = car.paint;
Object.assign(car, marina.carDrop, { speed: 0, vx: 0, vz: 0, deck443: false });
g.updateHUD();
check('Mainland freight staging point is dry and reachable', g.transport53.carDock() === marina &&
  !H.boatWater444(marina.carDrop.x, marina.carDrop.z) &&
  !g.world.nearby(car.x, car.z).some(o => H.carBuildingContact(car, o)), marina.carDrop);
key('KeyB');
check('A driver sees a car ferry option from the mainland marina', g.transport53.selected &&
  g.transport53.hud.destinations.textContent.includes('מעבורת רכבים'));
check('Freight passengers carry the original vehicle actor rather than creating a replacement',
  g.transport53.start('car', 'estate') && g.transport53.trip.car === car && !g.inVehicle);
const freight = g.transport53.trip;
keys();
step(.1);
check('Ordinary in-transit car-ferry save preserves exact departure car and mode', g.stage19SaveNow('slot2').ok &&
  H.stage19Save.readSlot('slot2').data.mode === 'car' &&
  distance(H.stage19Save.readSlot('slot2').data.car, freight.carOrigin) < .01);
check('Ferry physically crosses to estate with its route and car payload intact',
  until(() => freight.phase === 'arrived', 1550, null, .20) && freight.distance > 2200 && freight.elapsed > 40 &&
  g.transport53.trip.car === car && distance(g.boat444, port.berth) < .05,
  { phase: freight.phase, distance: freight.distance, elapsed: freight.elapsed });
key('KeyE');
check('Freight unload keeps the same stolen car, paint, class and destination',
  g.inVehicle && g.player === car && !g.boat444 && distance(car, port.carDrop) < .1 &&
  car.vehicleClass === originalClass && car.paint === originalPaint);

// Drive the actual estate road and steering code, then test the manual bays.
const road = [...estate.setup(g).roads[0].slice(1, 7), ...estate.setup(g).roads[3].slice(1, 2), estate.slots.car[4]];
let carTarget = 0;
function drive() {
  if (carTarget < road.length - 1 && distance(car, road[carTarget]) < 6) carTarget++;
  const target = road[carTarget], turn = H.angleDiff(car.yaw, Math.atan2(car.x - target.x, car.z - target.z));
  const brake = (distance(car, target) < 12 && carTarget === road.length - 1) || (car.speed > 5 && Math.abs(turn) > .65);
  keys(brake || car.speed > 11 ? 'Space' : 'KeyW',
    ...(turn > .07 ? ['KeyA'] : turn < -.07 ? ['KeyD'] : []));
}
check('Player drives the carried vehicle along the estate road toward the parking bays',
  until(() => distance(car, road.at(-1)) < 8, 2600, drive), { carTarget, car: frame(car) });
const carSlot = estate.slots.car[0];
check('Baseline garage holds one physical slot', (H.estate53 || H.realism39.estate53).capacity('car') === 1);
Object.assign(car, carSlot, { speed: 2, vx: 0, vz: 0 });
key('KeyK');
check('Storage does not acquire a car still moving', fleets.count('car') === 0 && g.inVehicle);
Object.assign(car, { speed: 0, hp: 72, fuel: 43 });
key('KeyK');
check('Stopped stolen car parks and retains physical damage, fuel and original appearance', !g.inVehicle &&
  fleets.count('car') === 1 && car.hp === 72 && car.fuel === 43 && car.paint === originalPaint &&
  car.vehicleClass === originalClass && g.parked.includes(car));
const fleet = fleets.snapshot();
check('Storage writes an automatic Stage19 save with all three types', H.stage19Save.readSlot('auto').data.fleet53.records.length === 3);
check('Full three-class fleet is a valid manual save', g.stage19SaveNow('slot1').ok &&
  H.stage19Save.readSlot('slot1').data.fleet53.records.length === 3);
key('KeyE');
check('Parked estate car returns to driver control without a second theft', g.inVehicle && g.player === car &&
  !g.parked.includes(car));
check('Checked-out estate car saves its only copy in the assigned bay',
  g.stage19SaveNow('slot2').ok && H.stage19Save.readSlot('slot2').data.car === null &&
  H.stage19Save.readSlot('slot2').data.mode === 'foot');
check('Full-world reuse load reinstates one of each stored vehicle and a grounded safe anchor',
  g.stage19LoadNow('slot2').ok && !g.inVehicle && !g.boat444 && !g.flight51.pilot &&
  g.walkerPositionFree(g.avatar.x, g.avatar.z) && g.parked.filter(c => c.fleet53Id).length === 1 &&
  g.world.parkedAirliners471.filter(p => p.fleet53Id).length === 1 && fleets.mooredBoats(g).length === 1);
assert.equal(JSON.stringify(fleets.snapshot()), JSON.stringify(fleet));
checks.push('Reload preserves all saved identities and condition without generating extra inventory');
check('Pre-fleet legacy save removes later stored actors and unblocks the original airport source',
  g.stage19LoadNow('slot3').ok && fleets.snapshot().records.length === 0 &&
  !g.parked.some(c => c.fleet53Id) && !g.world.parkedAirliners471.some(p => p.fleet53Id || p.fleetHidden53));

console.log(JSON.stringify({ passed: checks.length, ferryM: Math.round(freight.distance), ferrySeconds: +freight.elapsed.toFixed(1), checks }, null, 2));
