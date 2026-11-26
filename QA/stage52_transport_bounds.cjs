'use strict';
/* Compare the actual engine methods, including position and damage-event order.
 * No world or browser setup is needed to isolate each collision phase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const engineRoot = process.env.STAGE52_ENGINE_ROOT || root;
const baselineRoot = process.env.STAGE52_BASELINE_ROOT;
const read = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8');

function extract(source, from, to) {
  const begin = source.indexOf(from), end = source.indexOf(to, begin + from.length);
  assert.ok(begin >= 0 && end > begin, 'actual engine method anchor ' + from);
  return source.slice(begin, end);
}

function readTransport(dir) {
  const source = read(dir, 'engine44.js');
  return {
    bridge: read(dir, 'assets/overpass_443.js'),
    busTransform: extract(source, '    function busWorldPose(', '    Heatline.busWorldPose ='),
    collisions: extract(source, '        tramCarCollisions() {', '        impactDebris(')
  };
}

function load({ bridge, busTransform, collisions }) {
  const H = {};
  const context = vm.createContext({ Heatline: H });
  vm.runInContext(bridge, context);
  let tests = 0;
  const sameRoadLevel = H.sameRoadLevel443;
  H.sameRoadLevel443 = (...args) => {
    tests++;
    return sameRoadLevel(...args);
  };
  const Game = vm.runInContext(`${busTransform}
  Heatline.busWorldPose = busWorldPose;
  (class CollisionFixture { ${collisions} })`, context);
  return { Game, tests: () => tests };
}

const stage51 = baselineRoot ? readTransport(baselineRoot) :
  JSON.parse(read(root, 'QA/stage52_fixtures/transport_stage51.json'));
const reference = load(stage51);
const candidate = load(readTransport(engineRoot));
const car = (x, z, extra = {}) => ({
  x, z, yaw: 0, alive: true, wrecked: false, speed: 24, vx: 12, vz: -18,
  yawRate: .5, damageCooldown: 0, ...extra
});

function run(engine, phase, vehicle, player, traffic = []) {
  const g = new engine.Game(), events = [];
  const pre = engine.tests();
  Object.assign(g, {
    player: structuredClone(player), civilian: structuredClone(traffic), police: [],
    trams: phase === 'tram' ? structuredClone(vehicle) : [],
    buses: phase === 'bus' ? structuredClone(vehicle) : [],
    crashVehicle(c, ...args) { events.push(['impact', c === this.player, ...args]); return true; },
    reportOffense(...args) { events.push(['incident', ...args]); },
    crashParticles(...args) { events.push(['particles', ...args]); },
    synth: { cue(...args) { events.push(['cue', ...args]); } }
  });
  g[phase + 'CarCollisions']();
  return {
    levelChecks: engine.tests() - pre,
    outcome: {
      player: g.player, traffic: g.civilian, trams: g.trams, buses: g.buses,
      flash: g.collisionFlash, events
    }
  };
}

let checked = 0, refChecks = 0, newChecks = 0;
function compare(phase, vehicle, player, shouldHit) {
  // Nearby traffic shares the same phase, including sequential speed changes.
  const traffic = [car(player.x, player.z, { damageCooldown: .2 }), car(2000, 2000), car(-2000, -2000)];
  const before = run(reference, phase, vehicle, player, traffic);
  const after = run(candidate, phase, vehicle, player, traffic);
  assert.deepEqual(after.outcome, before.outcome);
  const playerHit = after.outcome.events.some(([name, isPlayer]) => name === 'impact' && isPlayer);
  assert.equal(playerHit, shouldHit, phase + ' fixture must distinguish contact from separation');
  checked++;
  refChecks += before.levelChecks;
  newChecks += after.levelChecks;
}

const tram = { x: 0, y: 0, z: 0, speed: 12 };
compare('tram', [tram], car(39.3, 4), true);
compare('tram', [tram], car(-39.3, -4), true);
compare('tram', [tram], car(39.3001, 4), false);
compare('tram', [tram], car(39.3, 4.0001), false);
compare('tram', [{ ...tram, y: 2.8 }], car(0, 0), true);
compare('tram', [{ ...tram, y: 2.8001 }], car(0, 0), false);
compare('tram', [{ ...tram, z: -420 }], car(0, -420, { deck443: true }), false);

const bus = { x: 0, z: 0, yaw: 0, speed: 10 };
compare('bus', [bus], car(2.9499, 6.7199), true);
compare('bus', [bus], car(2.95, 6.7199), false);
compare('bus', [bus], car(2.9499, -6.72), false);
compare('bus', [bus], car(10, 0), false);
compare('bus', [bus], car(10.0001, 0), false);
compare('bus', [{ ...bus, yaw: Math.PI / 4 }], car(-1.1, 3.2), true);
compare('bus', [{ ...bus, z: -420 }], car(0, -420, { deck443: true }), false);
compare('bus', [{ ...bus, z: -420, deck443: true }], car(0, -420, { deck443: true }), true);
compare('bus', [bus], car(0, 0, { wrecked: true }), false);
assert.ok(newChecks < refChecks, 'reordered predicates avoid unrelated road-level checks');
console.log(JSON.stringify({ cases: checked, stage51RoadLevelChecks: refChecks, stage52RoadLevelChecks: newChecks }));
