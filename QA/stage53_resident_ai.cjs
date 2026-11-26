'use strict';

// Exercise residents through the shipped Game update and walker collision code.
// Voice calls are observed as events with a spy, with no browser audio claim.
const assert = require('node:assert/strict');
const { H, g, El, document, warnings, errors } = require('./stage51_bootstrap.cjs');
const ai = H.residentAI53;
const RC = H.realism39;
const checks = [], voices = [];
const check = (name, condition, data) => {
  assert.ok(condition, data == null ? name : `${name} ${JSON.stringify(data)}`);
  checks.push(name);
};
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const free = (x, z) => H.streetLifeFree(x, z, g.world, .46);
const ground = (x, z) => H.outdoorHeight(x, z);
const dt = .045;
function place(x, z) {
  g.inVehicle = false;
  Object.assign(g.avatar, { x, z, y: ground(x, z), grounded: true, support: null,
    swim445: null, vx: 0, vy: 0, vz: 0 });
}
function tick(n = 1) {
  while (n-- > 0) { g.seconds += dt; g.updatePedestrians(dt); }
}
function actor(at, id, target = at) {
  const w = H.createWalker(at.x, at.z, Math.atan2(at.x - target.x, at.z - target.z), id);
  Object.assign(w, { y: ground(at.x, at.z), navAxis: 'x', navState: 'sidewalk', navDir: 1,
    navNode: 0, navRoad: at.z, navSide: 1, navTargetX: target.x, navTargetZ: target.z, pause: 0 });
  return w;
}
function stage(w) {
  g.pedestrians = Array.isArray(w) ? w : [w];
  place(g.pedestrians[0].x + 1.9, g.pedestrians[0].z + .7);
}

function supportChatMarkup() {
  const markup = Object.getOwnPropertyDescriptor(El.prototype, 'innerHTML');
  Object.defineProperty(El.prototype, 'innerHTML', {
    ...markup,
    set(value) {
      markup.set.call(this, value);
      if (this.id !== 'chat48') return;
      // The shared CPU harness does not parse dynamic HTML. Supply only the
      // real chat panel's nodes so production open/close handlers still run.
      const form = document.createElement('form'), log = document.createElement('div');
      const input = document.createElement('input'), title = document.createElement('b');
      const mute = document.createElement('button'), close = document.createElement('button');
      const send = document.createElement('button');
      form.append(input, send);
      this.append(title, mute, close, log, form);
      const nodes = { '.log': log, input, 'header b': title, '[data-c=mute]': mute,
        'form button': send, form, '[data-c=close]': close };
      this.querySelector = selector => nodes[selector] || El.prototype.querySelector.call(this, selector);
    }
  });
}

async function main() {
  await new Promise(resolve => setImmediate(resolve));
  g.restart({ reuseWorld: true });
  g.update(dt);
  const life = g.streetLife;
  const wholePopulation = g.pedestrians;
  check('Resident AI is installed in the real city build', !!ai && wholePopulation.length > 140);
  const before = wholePopulation.filter(w => d(w, g.avatar) < 130 && w.injuryState === 'walking')
    .map(w => [w, { x: w.x, z: w.z }]);
  tick(70);
  const walking = before.filter(([w, old]) => d(w, old) > .8).length;
  check('Existing city residents still progress through normal pedestrian updates', walking >= 4, { walking, nearby: before.length });

  const point = life.spots.flatMap(spot => spot.kind === 'shop' ? spot.slots.map(at => ({ spot, at })) : [])
    .map(({ spot, at }) => {
      const start = [{ x: at.x + 4.0, z: at.z }, { x: at.x - 4.0, z: at.z },
        { x: at.x, z: at.z + 4.0 }, { x: at.x, z: at.z - 4.0 }].find(p =>
        [0, .28, .55, .8, 1].every(t => free(H.lerp(p.x, at.x, t), H.lerp(p.z, at.z, t))));
      return { spot: { ...spot, slots: [at] }, at, start };
    }).find(s => s.start);
  check('City shop has an actual free pedestrian approach segment', !!point);
  const { spot, at, start } = point;
  const stock = { cars: g.civilian, police: g.police, trams: g.trams, cells: life.spotCells, speak: RC.sayReaction53 };
  g.civilian = []; g.police = []; g.trams = [];
  g.player.x = g.player.z = 1100;
  g.heat = 0;
  RC.sayReaction53 = (game, w, kind, options) => { voices.push({ game, w, kind, options }); return true; };
  life.spotCells = new Map([[`${Math.floor(spot.x / 16)},${Math.floor(spot.z / 16)}`, [spot]]]);
  g.worldHour = 12;
  const w = actor(start, 82, at);
  const twin = actor(start, 82, at);
  const initial = ai.stateOf(w);
  check('Personality and initial needs are stable for identical resident identity', initial.profile === ai.stateOf(twin).profile &&
    JSON.stringify(initial.needs) === JSON.stringify(ai.stateOf(twin).needs));
  initial.needs.errand = 99;
  check('Exposed resident state is a read-only snapshot', ai.stateOf(w).needs.errand < 1);
  stage(w);

  // Isolate the decision at a real shop while its temporary wait keeps the
  // route start fixed. Once the visit is selected, normal Game movement runs.
  let selected = false, maxMove = 0;
  for (let frame = 0; frame < 360 && ai.stateOf(w).visits < 1; frame++) {
    if (!life.jobs.has(w)) { w.navTargetX = w.x; w.navTargetZ = w.z; w.navState = 'sidewalk'; }
    const before = { x: w.x, z: w.z };
    tick();
    selected ||= life.jobs.get(w)?.residentAI53 === true;
    maxMove = Math.max(maxMove, d(w, before));
  }
  check('A local decision reserves a real shop slot using the existing StreetLife system', selected &&
    life.occupied.get(spot.id)?.has(life.jobs.get(w)?.slot), { state: ai.stateOf(w), selected });
  check('Shop job walks to its destination without snapping and emits one contextual voice event',
    ai.stateOf(w).activity === 'browse' && ai.stateOf(w).visits === 1 && maxMove < .20 && d(w, start) > 2.5 && d(w, at) < .44 &&
    voices.filter(v => v.w === w && v.kind === 'browse').length === 1, { state: ai.stateOf(w), maxMove, from: start, actor: [w.x, w.z] });

  supportChatMarkup();
  RC.chat48.open(w);
  if (RC.chat48.active?.who !== w) {
    await new Promise(resolve => setImmediate(resolve));
    RC.chat48.open(w);
  }
  const spotToChat = [[.9, 0], [-.9, 0], [0, .9], [0, -.9]]
    .map(([x, z]) => ({ x: w.x + x, z: w.z + z }))
    .find(p => g.walkerPositionFree(p.x, p.z) &&
      H.officerSightClear(p.x, p.z, w.x, w.z, g.world.nearby(p.x, p.z)));
  assert.ok(spotToChat);
  place(spotToChat.x, spotToChat.z);
  const chatStart = { x: w.x, z: w.z }, remaining = life.jobs.get(w).remaining;
  check('Actual nearby conversation claims the same resident actor', RC.chat48.active?.who === w &&
    ai.conversationWith(g, w));
  tick(40);
  check('A resident in active conversation holds location and pauses its visit timer',
    ai.stateOf(w).activity === 'talk' && d(w, chatStart) < .005 &&
    life.jobs.get(w).remaining === remaining && w.navActivity === 'talk');
  RC.chat48.close();
  tick(20);
  check('Closing the conversation returns control to the same ongoing shop task',
    ai.stateOf(w).activity === 'browse' && life.jobs.get(w).remaining < remaining);

  g.worldHour = 2;
  tick(10);
  check('The existing shop schedule ends a closed visit and frees its space',
    !life.jobs.has(w) && !life.occupied.get(spot.id)?.size);
  g.worldHour = 12;
  const blocked = actor(start, 117, at);
  stage(blocked);
  const originalNearby = g.world.nearby;
  const wall = { x: (start.x + at.x) * .5, z: (start.z + at.z) * .5,
    hw: Math.abs(start.x - at.x) > 1 ? .33 : 4.5, hd: Math.abs(start.z - at.z) > 1 ? .33 : 4.5 };
  const beforeBlock = ai.metrics(g).blocked;
  g.world.nearby = function (x, z) {
    const solids = originalNearby.call(this, x, z);
    return d({ x, z }, at) < 14 ? [...solids, wall] : solids;
  };
  try {
    for (let i = 0; i < 440; i++) {
      blocked.navTargetX = blocked.x; blocked.navTargetZ = blocked.z; blocked.navState = 'sidewalk';
      tick();
    }
    check('AI declines a venue separated by a local collision wall', !life.jobs.has(blocked) && ai.metrics(g).blocked > beforeBlock &&
      d(blocked, start) < .2, { metrics: ai.metrics(g), city: [blocked.x, blocked.z] });
  } finally { g.world.nearby = originalNearby; }

  life.spotCells = new Map();
  const peers = [actor(start, 512), actor({ x: H.lerp(start.x, at.x, .55), z: H.lerp(start.z, at.z, .55) }, 760)];
  stage(peers);
  const encounters = ai.metrics(g).encounters;
  for (let i = 0; i < 600 && ai.metrics(g).encounters === encounters; i++) {
    for (const person of peers) {
      person.navTargetX = person.x; person.navTargetZ = person.z; person.navState = 'sidewalk';
    }
    tick();
  }
  const peerPositions = peers.map(person => ({ x: person.x, z: person.z }));
  tick(12);
  check('Two neighbors briefly socialize in place and emit one greeting',
    ai.metrics(g).encounters === encounters + 1 && peers.every((person, i) =>
      ai.stateOf(person).activity === 'social' && d(person, peerPositions[i]) < .005) &&
    voices.filter(v => peers.includes(v.w) && v.kind === 'greet').length === 1,
    { states: peers.map(ai.stateOf), metrics: ai.metrics(g) });

  const c = actor({ x: -H.PEDESTRIAN_CURB, z: 15 }, 217);
  Object.assign(c, { navState: 'waiting', navNode: 0, navRoad: 15, navWait: 0 });
  stage(c);
  g.player.x = 0; g.player.z = 15;
  g.player.vx = g.player.vz = g.player.speed = 0;
  tick(12);
  check('Resident observes a blocked crossing and stays at the curb', ai.stateOf(c).activity === 'wait' &&
    c.navState === 'waiting' && c.x === -H.PEDESTRIAN_CURB);
  g.player.x = g.player.z = 1100;
  tick(18);
  check('Crossing resumes through the normal traffic-aware walker once clear', c.navState === 'crossing' &&
    c.x > -H.PEDESTRIAN_CURB + .30, { state: c.navState, x: c.x });

  const frightened = actor(start, 349);
  stage(frightened);
  const scare = H.scarePedestrian(frightened, start.x - 2, start.z - 2, .8);
  tick(8);
  check('Actual danger interrupts ordinary behavior and emits panic only once', scare && ai.stateOf(frightened).activity === 'flee' &&
    voices.filter(v => v.w === frightened && v.kind === 'panic').length === 1);
  // Let the normally timed flee state expire on the same real collider surface.
  let recovered = false;
  for (let i = 0; i < 160; i++) {
    tick();
    if (ai.stateOf(frightened).activity === 'recover') recovered = true;
  }
  check('The same frightened actor returns from flee through recovery', recovered &&
    frightened.panic <= 0 && ai.stateOf(frightened).activity !== 'flee');

  const estate = actor(start, 411);
  estate.estateResident = 'estate-test';
  check('Estate residents never receive city movement or tasks', !ai.advance(g, estate, .25, [c]) &&
    !life.jobs.has(estate));
  const metrics = ai.metrics(g);
  check('Local spot and slot work obey fixed caps, including obstructed decisions',
    metrics.decisions > 2 && metrics.spots <= metrics.decisions * ai.limits.spots &&
    metrics.slots <= metrics.decisions * ai.limits.slots && metrics.blocked > 0, metrics);

  Object.assign(g, { civilian: stock.cars, police: stock.police, trams: stock.trams, pedestrians: wholePopulation });
  life.spotCells = stock.cells;
  RC.sayReaction53 = stock.speak;
  const expectedAudioNotice = 'Audio unavailable ReferenceError: AudioContext is not defined';
  const unexpectedWarnings = warnings.filter(w => w !== expectedAudioNotice);
  check('No unexpected integration warnings or JavaScript errors were recorded', !unexpectedWarnings.length &&
    !errors.length, { unexpectedWarnings, errors });
  console.log(JSON.stringify({ passed: checks.length, originalResidentsWalking: walking, maxShopStepM: +maxMove.toFixed(3),
    metrics, checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
