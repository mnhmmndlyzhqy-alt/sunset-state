'use strict';

// Compare the shipped walker against the exact previous solid test. Run
// fixtures and the real Game update through the shared CPU-only boot surface.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { H, g, ctx, root, warnings, errors } = require('./stage51_bootstrap.cjs');

const code = fs.readFileSync(path.join(root, 'engine44.js'), 'utf8').replaceAll('\r\n', '\n');
const first = code.indexOf('    function stepWalker(w, input, solids, dt, cars = []) {');
const last = code.indexOf('    Heatline.stepWalker = stepWalker;', first);
assert.ok(first >= 0 && last > first);
const currentSource = code.slice(first, last);
const walkableLoop = /            for \(const box of solids\) \{[\s\S]*?\n            \}(?=\n            return true;)/;
assert.match(currentSource, walkableLoop);
const previousLoop = [
  '            for (const box of solids) {',
  '                const cx = Heatline.clamp(x, box.x - box.hw, box.x + box.hw), cz = Heatline.clamp(z, box.z - box.hd, box.z + box.hd);',
  '                if ((x - cx) ** 2 + (z - cz) ** 2 < (rad * rad))',
  '                    return false;',
  '            }'
].join('\n');
const previousSource = currentSource.replace(walkableLoop, previousLoop);
assert.notEqual(previousSource, currentSource, 'Reference must use the prior collision loop');
function load(source) {
  return vm.runInContext(`(() => { const carryWalkerOnCar = Heatline.carryWalkerOnCar;
    ${source}
    return stepWalker;
  })()`, ctx);
}
const previous = load(previousSource), current = load(currentSource);
const pose = w => [w.x, w.y, w.z, w.vx, w.vy, w.vz, w.yaw, w.phase, w.stride, w.grounded, w.deck443,
  w.coastDeck461, w.support?.car, w.support?.localX, w.support?.localZ];
const copy = w => ({ ...w, support: w.support && { ...w.support } });
const box = (x, z, hw, hd) => ({ x, z, hw, hd });
const walker = (x, z) => H.createWalker(x, z, 0, 11);
const movement = (forward, strafe, viewYaw = 0, extra = {}) =>
  ({ forward, strafe, run: false, viewYaw, outdoors: false, ...extra });

const checks = [];
let comparedSteps = 0;
function compare(oldActor, newActor, input, solids, dt, cars, label) {
  previous(oldActor, input, solids, dt, cars);
  current(newActor, input, solids, dt, cars);
  assert.deepEqual(pose(newActor), pose(oldActor), label);
  comparedSteps++;
}
function repeat(label, initial, solids, frames, input, time, cars) {
  const oldActor = copy(initial), newActor = copy(initial);
  for (let i = 0; i < frames; i++) {
    compare(oldActor, newActor, input(i), solids, time(i), cars, `${label}, step ${i}`);
  }
  checks.push(label);
  return newActor;
}

const wall = box(20.5, 0, .5, 30);
const sliding = repeat('Diagonal wall sliding retains the exact previous pose and velocities', walker(18, 5),
  [wall], 61, () => movement(1, 1), () => 1 / 30);
assert.ok(sliding.x < 19.62 && sliding.z < -.5, 'The fixture must reach the wall and keep sliding');

for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
  // Probe both sides of the circle contact and both sides of the candidate
  // rejection bounds, in all four quadrants and at several coordinate scales.
  for (const origin of [0, 570.12, -1084.37]) {
    const near = box(origin, origin, 1.2, 1.2);
    const radius = .38;
    for (const direction of [0, .23, Math.PI / 4, 1.17, Math.PI / 2]) {
      for (const offset of [-.025, -1e-12, 0, 1e-12, .025]) {
        const start = walker(origin + xSign * (near.hw + Math.cos(direction) * (radius + offset)),
          origin + zSign * (near.hd + Math.sin(direction) * (radius + offset)));
        const speed = offset < 0 ? -.012 : .013;
        start.vx = xSign * speed;
        start.vz = zSign * speed;
        compare(copy(start), copy(start), movement(0, 0), [near], .035, [], 'Face and rounded corner boundary');
      }
    }
  }
}
checks.push('Face and rounded-corner contacts agree in both directions near the radius threshold');

const longWall = box(3200, 0, 3180, 30);
const large = repeat('A large solid is handled by its extent when the center is far away', walker(17, 0),
  [longWall, box(-900, 613, 100, 11)], 95, () => movement(0, 1), () => 1 / 38);
assert.ok(large.x <= 19.62 && large.x > 19.3, 'The large solid must physically stop the walker');

const far = Array.from({ length: 144 }, (_, i) => box(i % 2 === 0 ? 800 + i : -600 - i, 400 + i, 2 + i % 23, 1));
const varied = repeat('Idle, strafe, backward, sprint and varied timestep integrations match', walker(0, 0),
  [...far, box(5, 5, 2.6, .6), box(-2.3, -3, .5, 1.45)], 120, i => [
    movement(0, 0), movement(-1, 0, .92), movement(1, -.5, -1.2, { run: true }),
    movement(.8, .6, 2.3, { speedFactor: .46 }), movement(0, -1, -2.4)
  ][Math.floor(i / 12) % 5], i => [0, 1 / 64, .036, .055, .098][i % 5]);
assert.ok(Math.hypot(varied.x, varied.z) > .5, 'Input variants must move the fixture');

const car = H.makeCar('civilian', 0, -5.8, .43, 2);
const movingVehicle = repeat('Nearby vehicle contact keeps the existing movement integration', walker(0, 0),
  [...far, box(3.1, -3, .8, 2.1)], 95, i => movement(1, i < 45 ? 0 : .35, 0, { outdoors: false }),
  () => 1 / 60, [car]);
assert.ok(movingVehicle.z < -1.7);
const jumping = walker(0, 0);
Object.assign(jumping, { grounded: false, y: .8, vy: 3.2 });
const landed = repeat('An airborne walker lands identically while moving near a wall', jumping, [wall, ...far],
  65, () => movement(1, .3), () => 1 / 60);
assert.ok(landed.grounded && landed.y === 0);

const baseClamp = H.clamp;
let calls = 0, oldCalls, newCalls;
try {
  H.clamp = (...args) => { calls++; return baseClamp(...args); };
  previous(walker(2, 2), movement(.4, 1), [wall, ...far], 1 / 30);
  oldCalls = calls;
  calls = 0;
  current(walker(2, 2), movement(.4, 1), [wall, ...far], 1 / 30);
  newCalls = calls;
} finally { H.clamp = baseClamp; }
assert.ok(oldCalls > 700 && newCalls < 10, { oldCalls, newCalls });
checks.push('Distant solids avoid exact projection while preserving the final circular test near contact');

const publicStep = H.stepWalker;
let avatarSteps = 0, npcSteps = 0;
try {
  g.restart({ reuseWorld: true });
  g.inVehicle = false;
  const start = { x: g.avatar.x, z: g.avatar.z };
  H.stepWalker = function (w, input, solids, dt, cars) {
    if (w === g.avatar) {
      avatarSteps++;
      compare(copy(w), copy(w), input, solids, dt, cars, 'Game avatar movement');
    } else if (npcSteps < 120) {
      npcSteps++;
      compare(copy(w), copy(w), input, solids, dt, cars, 'Game resident movement');
    }
    return publicStep.apply(this, arguments);
  };
  for (let i = 0; i < 48; i++) {
    g.keys.clear();
    g.keys.add(i < 28 ? 'KeyW' : 'KeyD');
    if (i >= 12 && i < 28) g.keys.add('ShiftLeft');
    g.update(1 / 48);
  }
  assert.ok(avatarSteps >= 30 && npcSteps >= 12 && Math.hypot(g.avatar.x - start.x, g.avatar.z - start.z) > .08,
    { avatarSteps, npcSteps, start, end: [g.avatar.x, g.avatar.z] });
} finally { H.stepWalker = publicStep; }
assert.deepEqual(errors, []);
const expectedAudioNotice = 'Audio unavailable ReferenceError: AudioContext is not defined';
assert.deepEqual(warnings.filter(message => message !== expectedAudioNotice), []);
checks.push('The production Game path moves the avatar and NPCs with the same core collision results');

console.log(JSON.stringify({ passed: checks.length, comparedSteps, oldClampCalls: oldCalls, newClampCalls: newCalls,
  avatarSteps, npcSteps, checks }, null, 2));
