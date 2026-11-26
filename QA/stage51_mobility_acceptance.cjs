'use strict';

// Exercise the real Game and physics from the current HTML entry point.
const assert = require('node:assert/strict');
const { H, g, ctx, document, elements } = require(process.env.STAGE51_MOBILITY_BOOTSTRAP || './stage51_bootstrap.cjs');
ctx.HTMLSelectElement ??= class {};
const checks = [];
const check = (name, result, detail) => {
  assert.ok(result, detail === undefined ? name : `${name} ${JSON.stringify(detail)}`);
  checks.push(name);
};
const key = (code, extra) => g.keyDown({ code, preventDefault() {}, ...extra });
const release = (...codes) => codes.forEach(code => g.keys.delete(code));
const frames = n => { for (let i = 0; i < n; i++) g.update(1 / 30); };
const until = (name, test, max) => {
  for (let i = 0; i < max && !test(); i++) frames(1);
  check(name, test(), { plane: g.flight51.plane, traffic: [g.stage39Life.plane.x, g.stage39Life.plane.y], info: g.infoMessage });
};
const direction = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

// Stage 50 d207035 reference, evaluated from its tuning over 300 ms at 120 Hz.
const reference = [[2, .0854156115], [7, .1607157487], [14, .1853292143], [22, .1546667543], [36, .1042648523], [55, .0703173792]];
const steering = reference.map(([speed, baseline]) => {
  const run = (steer, reversed = false) => {
    const car = H.makeCar('player', -32, -32, 0);
    car.vz = reversed ? speed : -speed;
    car.speed = speed;
    for (let i = 0; i < 36; i++) H.realism39.stepCarDynamic(car, { gas: 0, steer, brake: false, nitro: false }, 1 / 120);
    return car;
  };
  const left = run(1), right = run(-1), reverse = run(1, true);
  check(`Steering symmetry and reverse at ${speed} m/s`, Math.abs(left.yaw + right.yaw) < .003 && reverse.yaw < 0);
  check(`Limited lateral motion at ${speed} m/s`, Number.isFinite(left.x + left.z) && Math.abs(left.rcDyn.vy) / speed < .19);
  const ratio = left.yaw / baseline;
  check(`Expected steering response at ${speed} m/s`, speed < 30 ? ratio > 1.18 : Math.abs(ratio - 1) < .005, { baseline, now: left.yaw });
  return { speed, baseline: +baseline.toFixed(4), stage51: +left.yaw.toFixed(4), changePct: Math.round((ratio - 1) * 100) };
});

g.restart({ reuseWorld: true });
frames(1); // Existing city systems lazily populate their own scene on the first game update.
const flight = g.flight51, plane = flight.plane, runway = H.reference469.runway;
const before = { parkedPlanes: g.world.parkedAirliners471.length, autoPlane: g.stage39Life.plane,
  x: g.stage39Life.plane.x, boxes: g.world.boxes.length, solids: g.world.solids.length, player: g.player };
check('Manual plane has a separate airport actor', plane !== before.autoPlane && g.stage39Life.manualPlane51 === plane);
check('Manual airport marker is at the physical terminal', g.nav445.places.some(p => p.id === 'airport' && p.x === flight.site.x && p.z === flight.site.z));
check('Boarding does not capture ordinary street interaction', !flight.ownsInteraction());
const terminal = { x: flight.site.x, z: flight.site.z };
check('Terminal access position is walkable', g.walkerPositionFree(terminal.x, terminal.z));
Object.assign(g.avatar, terminal, { y: H.outdoorHeight(terminal.x, terminal.z), vx: 0, vz: 0, grounded: true });
g.cam = { ...g.cam, ...terminal };
g.updateHUD();
check('Terminal boarding action is visible', flight.ownsInteraction() && !flight.hud.board.hidden && !flight.hud.panel.hidden);
check('Ordinary preflight save works', g.stage19SaveNow('slot1').ok);
key('KeyE');
check('E boards the stationary plane on the actual runway', flight.pilot && !g.inVehicle && !plane.airborne && plane.z === runway.z);
check('C changes the flight camera', (key('KeyC'), flight.wide === true));
(elements?.get('camera-button') ?? document.getElementById('camera-button')).click();
check('HUD camera button controls flight camera', flight.wide === false);
if (typeof flight.cycleCamera === 'function') key('KeyC'); // New nose view returns to the existing chase scenario.

const launchX = plane.x;
key('KeyW'); frames(15); release('KeyW'); frames(15);
check('Throttle produces real taxi movement before rotation', plane.x > launchX + .3 && plane.speed > 1 && !plane.airborne);
key('Space'); frames(12); release('Space');
check('Space applies wheel brakes during taxi', plane.speed < .2 && plane.throttle === 0);
key('KeyW'); key('ShiftLeft');
until('Throttle and pitch take off manually', () => plane.airborne, 165);
const takeoff = { speedKmh: Math.round(plane.speed * 3.6), x: Math.round(plane.x) };
release('KeyW');
until('Aircraft climbs with rise input', () => plane.y > 6, 45);
release('ShiftLeft');
key('KeyS'); until('Throttle decreases during flight', () => plane.throttle < .17, 60); release('KeyS');
check('Flight camera and minimap follow the aircraft', Math.hypot(g.cam.tx - g.cam.x, g.cam.ty - g.cam.y, g.cam.tz - g.cam.z) > 1 &&
  Math.hypot(g.cam.tx - plane.x, g.cam.tz - plane.z) < 15 &&
  Math.hypot(g.nav445.actor().x - plane.x, g.nav445.actor().z - plane.z) < .01);
check('Flight does not walk or teleport the saved boarding position', g.avatar.x === terminal.x && g.avatar.z === terminal.z);
key('KeyE');
check('E cannot exit in mid-air', flight.pilot && plane.airborne && flight.hud.board.hidden);
const pausedAt = plane.x;
g.togglePause(); key('ArrowDown'); frames(1);
check('Menu/pause stops flight inputs', g.paused && plane.x === pausedAt);
g.togglePause();
check('Saving in air uses compatible grounded fallback', g.stage19SaveNow('slot2').ok);
const saved = H.stage19Save.readSlot('slot2').data;
check('Schema 19 and the parked road car are preserved', saved.schema === 19 && saved.mode === 'foot' &&
  saved.avatar.x === terminal.x && saved.avatar.z === terminal.z && saved.car.x === g.player.x && saved.car.z === g.player.z);

key('ArrowDown');
until('Manual descent touches down on the runway', () => plane.mode === 'rollout', 135);
release('ArrowDown');
const touchdown = { speedKmh: Math.round(plane.speed * 3.6), x: Math.round(plane.x), z: Math.round(plane.z) };
check('Touchdown is grounded and correctly aligned', !plane.airborne && plane.gear === 1 && Math.abs(plane.z - runway.z) < 1);
key('KeyE'); check('Moving aircraft refuses exit', flight.pilot);
key('Space'); until('Space stops the aircraft during rollout', () => plane.speed < .2, 110); release('Space');
key('KeyE');
check('E restores a safe grounded walker at the aircraft door', !flight.pilot && g.avatar.grounded && g.walkerPositionFree(g.avatar.x, g.avatar.z));
check('Aircraft renders with the original fallback parts', g.buildDynamic().some(o => o.material === 'premium_paint' &&
  Math.hypot(o.x - plane.x, o.z - plane.z) < .2 && Math.abs(o.y - plane.y - 3.95) < .1));

key('KeyE'); check('The stopped aircraft can be boarded directly', flight.pilot);
key('KeyR'); key('KeyW'); key('ArrowUp');
until('Arrow pitch raises the aircraft above the airport', () => plane.airborne && plane.y > 38, 300);
release('KeyW', 'ArrowUp');
const yaw = plane.yaw, beforeTurn = { x: plane.x, z: plane.z };
key('ArrowLeft'); frames(36); release('ArrowLeft');
check('Left input banks and turns the aircraft left', plane.bank < -.35 && direction(yaw, plane.yaw) > .20 &&
  (plane.x - beforeTurn.x) * Math.cos(yaw) - (plane.z - beforeTurn.z) * Math.sin(yaw) > 3);
check('Airliner retracts gear at cruise altitude', plane.gear < .45);
const roof = g.world.city20DistrictBuildings.reduce((a, b) => a.baseY + a.height > b.baseY + b.height ? a : b);
const roofTop = roof.baseY + roof.height;
Object.assign(plane, { x: roof.x, z: roof.z, y: roofTop - 5, speed: 77, bank: 0, airborne: true });
check('Swept obstacle checks include CITY20 tower heights', flight.blocked(plane.x, plane.y, plane.z));
frames(1);
check('Collision returns the aircraft to a usable runway', flight.pilot && !plane.airborne && plane.speed === 0 && plane.z === runway.z);
Object.assign(plane, { x: roof.x, z: roof.z, y: roofTop + 60 });
check('Aircraft can pass safely above buildings', !flight.blocked(plane.x, plane.y, plane.z));
Object.assign(plane, { x: H.WORLD_LIMIT + 49.5, z: 0, y: 120, yaw: Math.PI / 2, speed: 60, throttle: .4, airborne: true });
frames(1);
check('Crossing the map boundary recovers safely', flight.pilot && !plane.airborne && plane.z === runway.z);
check('Ambient flight, static world and road car retain identity', g.stage39Life.plane === before.autoPlane &&
  g.stage39Life.plane.x !== before.x && g.world.parkedAirliners471.length === before.parkedPlanes &&
  g.world.boxes.length === before.boxes && g.world.solids.length === before.solids && g.player === before.player,
{ before: [before.boxes, before.solids, before.parkedPlanes], after: [g.world.boxes.length, g.world.solids.length, g.world.parkedAirliners471.length],
  sameCar: g.player === before.player, ambientMoved: g.stage39Life.plane.x !== before.x });
check('Loading from the cockpit clears flight and restores grounded character', g.stage19LoadNow('slot2').ok &&
  !g.flight51.pilot && g.avatar.grounded && g.avatar.x === terminal.x && g.avatar.z === terminal.z);
check('Preflight save loads through the same save system', g.stage19LoadNow('slot1').ok && !g.flight51.pilot);

console.log(JSON.stringify({ passed: checks.length, takeoff, touchdown, steering, checks }, null, 2));
