'use strict';

// Run the actual flight, input and save systems with the shared simulated renderer.
const assert = require('node:assert/strict');
const { H, g } = require('./stage51_bootstrap.cjs');
const runway = H.reference469.runway;
const east = Math.PI / 2;
const checks = [];
const key = code => g.keyDown({ code, preventDefault() {} });
const release = (...codes) => codes.forEach(code => g.keys.delete(code));
const frames = n => { while (n-- > 0) g.update(1 / 30); };
const until = (condition, max) => {
  for (let i = 0; i < max && !condition(); i++) frames(1);
  return condition();
};
function check(name, result, detail) {
  assert.ok(result, detail == null ? name : `${name} ${JSON.stringify(detail)}`);
  checks.push(name);
}
function walkTo(x, z, lift = 0) {
  Object.assign(g.avatar, { x, z, y: H.outdoorHeight(x, z) + lift, grounded: true, vx: 0, vy: 0, vz: 0 });
}
function doorOf(p) {
  return { x: p.x + Math.sin(p.yaw) * 9 + Math.cos(p.yaw) * 6,
    z: p.z + Math.cos(p.yaw) * 9 - Math.sin(p.yaw) * 6 };
}
const pose = p => [p.x, p.y, p.z, p.yaw, p.gear, p.parked];
const view = () => [g.cam.x, g.cam.y, g.cam.z, g.cam.tx, g.cam.ty, g.cam.tz];

g.restart({ reuseWorld: true });
frames(1);
const f = g.flight51;
const airport = g.world.parkedAirliners471;
const baseline = Array.from(airport, pose);
const auto = g.stage39Life.plane;
const autoX = auto.x;
for (const [index, plane] of airport.entries()) {
  const door = doorOf(plane);
  walkTo(door.x, door.z);
  check(`Existing stand ${index + 1} can be boarded from its door`, f.boardingCandidate()?.plane === plane);
}
const stand = airport[0];
const entry = doorOf(stand);
walkTo(entry.x, entry.z, 5);
check('A player above ground cannot board through an overpass or roof', !f.ownsInteraction());
walkTo(stand.x, stand.z);
check('Boarding requires access beside a door', !f.ownsInteraction());
walkTo(entry.x, entry.z);
g.updateHUD();
check('Grounded stand shows the boarding action', f.hud && !f.hud.board.hidden);
key('KeyE');
check('Stand boarding preserves the original aircraft and position', f.pilot && f.plane === stand &&
  g.stage39Life.manualPlane51 === stand && stand.x === baseline[0][0] && stand.z === baseline[0][2] && stand.apron);
key('KeyX'); key('KeyW');
frames(105);
const pushed = stand.z - baseline[0][2];
const pushbackKmh = Math.round(stand.speed * 3.6);
check('Pushback moves aft at a limited ground speed', stand.reverse && pushed > 9 && stand.speed > 3 && stand.speed <= 4.5, { pushed, pushbackKmh });
key('KeyX');
check('Moving aircraft cannot swap travel direction', stand.reverse);
release('KeyW'); key('Space');
check('Wheel brakes stop pushback', until(() => stand.speed < .2, 30));
release('Space'); key('KeyX');
check('Stopped aircraft can return to forward taxi', !stand.reverse);

const yaw = stand.yaw;
const taxiStart = { x: stand.x, z: stand.z };
key('KeyW'); key('ArrowLeft'); frames(48); release('ArrowLeft', 'KeyW');
const taxiAngle = H.angleDiff(yaw, stand.yaw);
check('Apron steering turns the occupied aircraft at safe taxi speed', taxiAngle > .30 && stand.speed > 2 && stand.speed < 12 &&
  Math.hypot(stand.x - taxiStart.x, stand.z - taxiStart.z) > 1, { taxiAngle, plane: stand });
key('KeyT'); check('T toggles the taxi limiter', !stand.apron);
key('KeyT'); check('Taxi limiter can be selected again', stand.apron);

key('KeyC'); check('C still reaches the wide chase view first', f.wide && f.view === 'wide');
key('KeyC');
check('C then selects a model-clear nose view', f.view === 'nose' && !f.wide && view().every(Number.isFinite) &&
  (g.cam.x - stand.x) * Math.sin(stand.yaw) + (g.cam.z - stand.z) * Math.cos(stand.yaw) > 22.5);
key('KeyC');
check('Third camera press restores the normal chase view', f.view === 'chase');

key('KeyR');
check('Runway reposition retains the occupied parked-airliner identity', f.plane === stand && !stand.apron &&
  stand.z === runway.z && airport[0] === stand);
key('KeyW'); key('ShiftLeft');
check('Selected parked airframe takes off with the same manual controls', until(() => stand.airborne, 200), { plane: stand, note: g.infoMessage });
release('KeyW', 'ShiftLeft');
check('Original autonomous aircraft keeps advancing independently', g.stage39Life.plane === auto && auto.x !== autoX);
check('Cockpit save retains the original walkable boarding anchor', g.stage19SaveNow('slot1').ok &&
  H.stage19Save.readSlot('slot1').data.avatar.x === entry.x && H.stage19Save.readSlot('slot1').data.avatar.z === entry.z);

const approach = (direction, cross, speed, height) => {
  Object.assign(stand, { x: direction > 0 ? runway.west - 76 : runway.east + 76,
    z: runway.z + cross, y: runway.elevation + height, yaw: direction * east, airborne: true,
    speed, throttle: .26, pitch: 0, bank: 0, verticalSpeed: 0, gear: 1, mode: 'approach' });
  g.updateHUD();
};
approach(1, 40, 50, 27);
key('KeyL');
check('Eastbound approach cue points left from the right of the runway', f.guideDirection === 1 &&
  !f.hud.guidance.hidden && f.hud.guidance.textContent.includes('שמאלה'));
const noAutopilot = [stand.x, stand.z, stand.yaw, stand.speed];
const cues = g.buildDynamic().filter(o => o.color === '#8bece2');
check('Approach renders only four lightweight threshold markers near the airport', cues.length === 4 &&
  cues.every(o => Math.abs(o.z - runway.z) === 7));
assert.deepEqual([stand.x, stand.z, stand.yaw, stand.speed], noAutopilot);
key('KeyL');
check('Guidance turns off without changing the aircraft controls', f.hud.guidance.hidden &&
  !g.buildDynamic().some(o => o.color === '#8bece2'));
approach(-1, 40, 50, 27); key('KeyL');
check('Westbound approach mirrors the correction', f.guideDirection === -1 && f.hud.guidance.textContent.includes('ימינה'));
approach(-1, 0, 66, 25);
check('Aligned approach flags excessive speed', f.hud.guidance.textContent.includes('מהירות גבוהה'));
approach(-1, 0, 48, 65);
check('Aligned approach compares height with the descent path', f.hud.guidance.textContent.includes('הנמיכו'));

Object.assign(stand, { x: runway.east - 77, z: runway.z, y: runway.elevation + .15, yaw: east,
  airborne: false, speed: 41, throttle: 0, pitch: 0, gear: 1, mode: 'rollout' });
frames(1);
check('Runway-end protection applies brakes during rollout', f.runwayBrake && stand.speed < 41);
check('Rollout stops with pavement in front of the nose', until(() => stand.speed < .2, 95) &&
  stand.x + 21.2 < runway.east, { plane: stand, runwayEnd: runway.east });
const stoppingRoomM = Math.round(runway.east - stand.x - 21.2);
key('KeyE');
check('Exiting leaves the landed aircraft in place and clears guidance', !f.pilot && airport[0] === stand &&
  stand.x > runway.east - 77 && f.guideDirection === 0 && g.walkerPositionFree(g.avatar.x, g.avatar.z));
const next = airport[1], nextDoor = doorOf(next);
walkTo(nextDoor.x, nextDoor.z); key('KeyE');
check('Another stand can be boarded during the same session', f.pilot && f.plane === next && stand.parked && airport.length === baseline.length);
check('An in-flight save reloads into the original boarding area', g.stage19LoadNow('slot1').ok && !g.flight51.pilot &&
  g.avatar.x === entry.x && g.avatar.z === entry.z);
assert.deepEqual(Array.from(g.world.parkedAirliners471, pose), baseline);
checks.push('Loading restores all five parked airframes and their surveyed poses');
const oldWorld = g.world;
g.restart();
check('Full restart rebinds both aircraft systems to the rebuilt world', g.world !== oldWorld &&
  g.stage39Life.world === g.world && g.stage39Life.flight.world === g.world &&
  g.stage39Life.manualPlane51 === g.flight51.plane && g.flight51.stands.has(g.world.parkedAirliners471[0]));
assert.deepEqual(Array.from(g.world.parkedAirliners471, pose), baseline);
checks.push('A full restart restores the surveyed stand poses');
console.log(JSON.stringify({ passed: checks.length, pushbackKmh, pushbackM: +pushed.toFixed(1),
  taxiTurnDegrees: Math.round(taxiAngle * 180 / Math.PI), stoppingRoomM, checks }, null, 2));
