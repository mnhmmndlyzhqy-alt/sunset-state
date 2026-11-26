'use strict';

const assert = require('node:assert/strict');
process.env.SUNSET_QA_SEED ||= '54';
const { H, g, document, warnings, errors } = require('./stage51_bootstrap.cjs');
const life = H.airport54Life, RC = H.realism39;
assert.ok(life && g.world.airport54, 'actual game and terminal lifecycle are installed');
g.restart({ reuseWorld: true });
const state = life.setup(g), site = state.layout, hub = site.positions.hub;
const initial = [...state.active];
const plain = value => JSON.parse(JSON.stringify(value));
const at = a => ({ x: a.x, y: a.y, z: a.z });
const position = (x, y, z) => Object.assign(g.avatar, { x, y, z, vx: 0, vz: 0, grounded: true });
const view = (p, t = hub) => Object.assign(g.cam, { x: p.x, y: p.y + 1.6, z: p.z, tx: t.x, ty: t.y + 1.22, tz: t.z });
const visit = () => {
  position(hub.x + 3, hub.y, hub.z - 5);
  view({ x: hub.x, y: hub.y, z: hub.z - 3 }, { x: hub.x, y: hub.y, z: hub.z + 10 });
};
const activeCount = () => Array.from(life.actors(g)).length;
const wallet = g.profile.credits;
const aircraft = g.world.parkedAirliners471;
const parked = plain(aircraft.map(({ x, y, z, yaw, parked }) => ({ x, y, z, yaw, parked })));

assert.equal(initial.length, life.limits.passengers + site.staff.length);
assert.equal(new Set(initial.map(a => a.appearance)).size, initial.length, 'passenger shapes use unique stable appearances');
assert.deepEqual(new Set(initial.slice(0, life.limits.passengers).map(a => a.airport54Role)), new Set(['passenger']));
assert.equal(state.seats.size, initial.filter(a => a.socialPose === 'sit').length);
assert.ok(state.seats.size >= 16, 'both gate lounges and café open with seated travelers');
assert.ok(state.queueWalks.filter(q => q.members.length > 0).length >= 7, 'occupancy spans both service areas and a gate');
const board = plain(life.flights(g));
assert.ok(board.length === 4 && board.some(row => row.phase === 'boarding') && board.some(row => row.phase === 'check-in'));
assert.equal(new Set(board.map(row => row.code)).size, board.length);

position(730, 1, 960);
view({ x: 730, y: 1, z: 960 });
const far = life.draw(g, []);
life.tick(g, 30);
assert.equal(state.elapsed, 0);
assert.equal(far.length, 0);
assert.equal(activeCount(), 0, 'terminal pool has a cheap distant-world boundary');
visit();
assert.equal(activeCount(), initial.length);
g.update(.03);
assert.ok(state.elapsed > 0, 'normal Game.update advances terminal simulation');
visit();
const paused = state.elapsed;
g.paused = true;
life.tick(g, .08);
g.paused = false;
document.hidden = true;
life.tick(g, .08);
document.hidden = false;
g.showFullMap = true;
life.tick(g, .08);
g.showFullMap = false;
assert.equal(state.elapsed, paused, 'paused, hidden or map-open clocks stop');
life.tick(g, 20);
assert.ok(state.elapsed - paused <= life.limits.step + 1e-8, 'terminal time increment remains bounded after a stalled frame');

const front = [...state.gates.values()][0].queue.members[0].actor;
const frontBefore = at(front), chat = RC.chat48;
const active = Object.getOwnPropertyDescriptor(chat, 'active');
Object.defineProperty(chat, 'active', { configurable: true, get: () => ({ who: front, game: g }) });
for (let i = 0; i < 40; i++) life.tick(g, .08);
Object.defineProperty(chat, 'active', active);
assert.deepEqual(at(front), frontBefore);
assert.equal(front.airport54Activity, 'talk');
assert.ok(life.stateOf(front).queue, 'conversation keeps the queue reservation and service position');
for (let i = 0; i < 23; i++) life.tick(g, .08);
assert.ok(Math.hypot(front.x - frontBefore.x, front.z - frontBefore.z) > .4, 'traveler resumes the held route when chat closes');

const speaker = initial.find(a => a.airport54Role === 'information');
assert.ok(speaker && /man|woman/.test(RC.voiceForWalker(speaker)));
const say = RC.sayReaction53, spoken = [];
RC.sayReaction53 = (game, who, reaction) => { spoken.push({ game, who, reaction }); return true; };
try {
  position(speaker.x + .93, speaker.y, speaker.z);
  for (let i = 0; i < 18; i++) life.tick(g, .08);
  assert.ok(spoken.some(x => x.who === speaker && x.reaction === 'greet' && x.game === g));
} finally { RC.sayReaction53 = say; }
visit();

const pose = H.streetCharacterPose32;
const savedRenderer = RC.renderer, hadRenderer = g.renderer.rcCharacters;
const drawn = [];
H.streetCharacterPose32 = function(actor, ...args) {
  if (actor.airport54Role) drawn.push(actor);
  return pose.call(this, actor, ...args);
};
try {
  RC.renderer = { ...savedRenderer, rcCharacters: {} };
  g.renderer.rcCharacters = {};
  const waiting = initial.find(a => a.socialPose === 'sit' && life.stateOf(a).gate === 'A');
  view({ x: waiting.x - 1, y: waiting.y, z: waiting.z - 3 }, waiting);
  const scene = g.buildDynamic();
  assert.ok(drawn.includes(waiting));
  assert.ok(drawn.length >= 6 && drawn.length <= life.limits.view);
  assert.ok(scene.some(o => o.airport54Prop && o.shape === 'cylinder'), 'rolling luggage submits actual geometry');
  const skin = RC.characterQueue.find(a => Math.abs(a.x - waiting.x) < 1e-8 && Math.abs(a.z - waiting.z) < 1e-8);
  assert.ok(skin?.pose.rootY <= -.4, 'airport seating uses the genuine high-detail character queue');
} finally {
  H.streetCharacterPose32 = pose;
  RC.renderer = savedRenderer;
  g.renderer.rcCharacters = hadRenderer;
  visit();
}

const before = new Map(state.pool.map(a => [a, { ...at(a), active: life.has(g, a) }]));
const initiallySeated = initial.filter(a => a.socialPose === 'sit');
const phases = new Set();
const usedGates = new Set();
let maxStep = 0, sawSeatRelease = false, sawArrival = false, latestBoarded = 0;
let lateStart;
for (let i = 0; i < 8150; i++) {
  if (i === 6000) lateStart = { ...state.metrics };
  life.tick(g, .08);
  if (i % 12 === 0) {
    for (const row of life.flights(g)) {
      phases.add(row.phase);
      latestBoarded = Math.max(latestBoarded, row.boarded);
      if (row.boarded) usedGates.add(row.gate);
    }
    const claims = [...state.seats.values()];
    assert.equal(new Set(claims).size, claims.length);
    sawSeatRelease ||= initiallySeated.some(a => !life.stateOf(a).seat);
    for (const q of state.queueWalks) {
      assert.ok(q.members.length <= q.points.length);
      const line = q.members.filter(m => m.slot >= 0);
      assert.ok(line.every((m, i) => !i || m.slot < line[i - 1].slot), 'queue preserves order through each service advance');
    }
  }
  for (const actor of state.pool) {
    const current = before.get(actor), nextActive = state.active.has(actor);
    if (current.active && nextActive) {
      const distance = Math.hypot(actor.x - current.x, actor.z - current.z);
      maxStep = Math.max(maxStep, distance);
      assert.ok(distance < .15, `visible actor ${actor.airport54Id} walks continuously`);
      assert.ok(Number.isFinite(actor.x + actor.y + actor.z + actor.yaw));
    }
    if (!current.active && nextActive) {
      sawArrival = true;
      assert.ok(Math.hypot(actor.x - site.offstage.arrival.x, actor.z - site.offstage.arrival.z) < .001,
        'recycled passenger only enters from the author-built arrival spur');
    }
    Object.assign(current, at(actor), { active: nextActive });
  }
}
assert.deepEqual(phases, new Set(['check-in', 'boarding', 'last-call', 'departed']));
assert.deepEqual(usedGates, new Set(['A', 'B']));
assert.ok(state.metrics.completed['check-in'] > 10 && state.metrics.completed.screening > 12);
assert.ok(state.metrics.boarded >= 8 && state.metrics.recycled >= 9 && state.metrics.waves >= 6);
for (const key of ['boarded', 'recycled', 'waves']) {
  assert.ok(state.metrics[key] > lateStart[key], `${key} still advances between 480 and 652 local seconds`);
}
assert.ok(sawSeatRelease && sawArrival && latestBoarded >= 3);
assert.equal(g.profile.credits, wallet, 'airport crowds and timetables never change balances');
assert.equal(g.world.parkedAirliners471, aircraft);
assert.deepEqual(plain(aircraft.map(({ x, y, z, yaw, parked }) => ({ x, y, z, yaw, parked }))), parked);
const activity = plain(state.metrics);

g.restart({ reuseWorld: true });
const reset = life.setup(g);
assert.notEqual(reset, state);
assert.equal(reset.elapsed, 0);
assert.ok(!life.has(g, front), 'removed active worlds cannot remain conversational targets');
assert.deepEqual(plain(life.flights(g)), board);
assert.deepEqual(plain(reset.pool.map(a => [a.airport54Id, a.airport54Name, a.appearance])),
  plain(initial.map(a => [a.airport54Id, a.airport54Name, a.appearance])), 'identity remains stable through the restart');
assert.equal(errors.length, 0, errors.join('\n'));
assert.ok(warnings.every(w => w.includes('AudioContext is not defined')), warnings.join('\n'));
console.log(JSON.stringify({ actorPool: initial.length, boardRows: board.length, localSeconds: state.elapsed, maxStep, latestBoarded, ...activity,
  verified: 'Game update, selected skinned poses, queue order, seats, board phases, recycling, chat hold, limits, restart', browser: false }, null, 2));
