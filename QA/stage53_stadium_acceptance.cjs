'use strict';

const assert = require('node:assert/strict');
const { H, g, document } = require('./stage51_bootstrap.cjs');
const stadium = H.stadium53;
const site = g.world.stadium53;
assert.ok(stadium && site, 'Stage 53 loads before the genuine world and Game construct');

const step = 1 / 60;
const d = site.gateDistance;
const approach = site.approach(d + 12);
const there = Math.atan2(approach.x - site.x, approach.z - site.z);
const axisOf = actor => {
  const p = site.local(actor.x, actor.z);
  return site.axis(p.x, p.z);
};

function footAt(p, heading = there) {
  const actor = H.createWalker(p.x, p.z, heading, 1);
  actor.y = H.walkerGround473(actor);
  return actor;
}

function walk(actor, heading, frames) {
  for (let i = 0; i < frames; i++) {
    H.stepWalker(actor, { forward: 1, strafe: 0, run: false, viewYaw: heading, outdoors: true, roadWorld: g.world },
      H.drivingSolids443(g.world, actor), step);
  }
}

const entry = footAt(approach);
walk(entry, there, 590);
assert.ok(axisOf(entry).along < 24 && Math.abs(axisOf(entry).side) < .25, 'public gate reaches actual pitch on foot');
assert.equal(entry.y, site.grass, 'foot solver follows the visible pitch elevation');
walk(entry, there + Math.PI, 640);
assert.ok(axisOf(entry).along > d + 8, 'same corridor stays open from inside to outside');

const wallAngle = site.gateAngle + .38;
const [wallX, wallZ] = site.oval(wallAngle);
const outsideWall = site.world(wallX * 1.15, wallZ * 1.15);
const wrongGate = footAt(outsideWall);
const wallYaw = Math.atan2(outsideWall.x - site.x, outsideWall.z - site.z);
walk(wrongGate, wallYaw, 280);
const blocked = site.local(wrongGate.x, wrongGate.z);
assert.ok(site.boundary(blocked.x, blocked.z, 0) > .83, 'neighboring solid facade blocks direct entry');

const eye = p => ({ ...p, y: site.floor + 2.1 });
assert.ok(g.cameraClearance(eye(site.approach(d - 7)), eye(site.approach(d + 7)), .45).clearance > .98,
  'chase camera can follow through the same gate');
assert.ok(g.cameraClearance(eye(site.world(wallX * .9, wallZ * .9)), eye(outsideWall), .45).clearance < .9,
  'adjacent wall occludes the camera');

const seatedRow = site.oval(1.03, site.rx - 11.41, site.rz - 11.41);
const seat = footAt(site.world(...seatedRow));
assert.ok(seat.y > site.floor + 4, 'walk surface follows the sloping seating bank');

// Use distinct matches to exercise the actual scorer, the interception and the restart.
const goal = new stadium.Match(site);
goal.resetPlay(0);
Object.assign(goal.ball, { x: .8, z: 33.5, y: .7, owner: null, vx: 0, vz: 19, vy: 0 });
goal.step(.025);
assert.equal(goal.score[0], 1);
assert.equal(goal.phase, 'goal');
assert.equal(goal.kickoff, 1);
assert.ok(goal.ball.z > 35);
for (let i = 0; i < 95; i++) goal.step(.025);
assert.equal(goal.phase, 'play');
assert.equal(goal.ball.owner.team, 1);
assert.ok(goal.players.every(player => !player.stadium53.celebration));

const miss = new stadium.Match(site);
miss.resetPlay(0);
Object.assign(miss.ball, { x: .8, z: 33.5, y: 2.34, owner: null, vx: 0, vz: 19, vy: 0 });
miss.step(.025);
assert.equal(miss.stats.goals, 0);
assert.equal(miss.phase, 'restart');
assert.equal(miss.restartPlayer.team, 1);
for (let i = 0; i < 420 && miss.phase === 'restart'; i++) miss.step(.025);
assert.equal(miss.phase, 'play');

const save = new stadium.Match(site);
save.resetPlay(0);
const keeper = save.players.find(player => player.keeper && player.team === 1);
Object.assign(save.ball, { x: keeper.u + .3, z: keeper.v - .4, y: .32, owner: null, vx: 0, vz: 12, vy: 0, lock: 0 });
save.step(.025);
assert.equal(save.ball.owner, keeper);
assert.equal(save.stats.saves, 1);
assert.ok(keeper.stadium53.dive > 0);

const match = new stadium.Match(site);
let maxPlayerSpeed = 0;
for (let frame = 0; frame < 7200; frame++) {
  match.step(.025);
  for (const player of match.players) {
    assert.ok(Math.abs(player.u) < 22 && Math.abs(player.v) < 33.5);
    maxPlayerSpeed = Math.max(maxPlayerSpeed, Math.hypot(player.vx, player.vz));
  }
  assert.ok(Number.isFinite(match.ball.y) && Math.abs(match.ball.x) < 22.5 && Math.abs(match.ball.z) < 36);
}
assert.ok(match.stats.passes > 10 && match.stats.shots > 10 && match.stats.saves > 2);
assert.ok(match.score[0] > 0 && match.score[1] > 0);
assert.ok(match.stats.restarts > 0);
assert.ok(maxPlayerSpeed < 6.7);
const bounded = new stadium.Match(site);
bounded.tick(3);
assert.ok(bounded.time >= .12 && bounded.time <= .15, 'long frames have a bounded catch-up');

Object.assign(g, { avatar: footAt(site.world(0, 0)), inVehicle: false, onBus: -1, onTram: -1,
  running: true, over: false, paused: false, showFullMap: false, missionBoardOpen: false,
  footCameraYaw: Math.PI - site.yaw });
g.update(.05);
const live = stadium.current(g);
assert.ok(live.time > 0, 'Game advances the local match');
g.updateHUD();
const hud = document.getElementById('stadium-score53');
assert.ok(hud && !hud.hidden && hud.textContent.includes('חוף'));

live.resetPlay(0);
Object.assign(live.ball, { x: 0, z: 0, y: .136, owner: null, lock: 0 });
assert.equal(stadium.ownsInteraction(g), true);
g.updateHUD();
assert.ok(hud.textContent.includes('בע'));
g.footCameraYaw = Math.PI - site.yaw;
g.toggleVehicle();
assert.equal(live.stats.looseKicks, 1);
assert.ok(live.ball.vz > 13 && live.ball.vy > 2);
assert.equal(stadium.ownsInteraction(g), false);

const camera = site.world(0, -14);
Object.assign(g.cam, camera, { y: site.grass + 2.8, tx: site.x, ty: site.grass + 1.5, tz: site.z });
const oldRenderer = H.realism39.renderer;
H.realism39.renderer = { ...oldRenderer, rcCharacters: {} };
const drawn = g.buildDynamic();
assert.equal(drawn.filter(o => o.stadium53Ball).length, 1);
assert.ok(drawn.some(o => o.stadium53Score));
const crowd = H.realism39.characterQueue.filter(entry => entry.key.startsWith('stadium53:'));
assert.ok(crowd.filter(entry => entry.key.includes(':kit:')).length >= 9, 'actual character renderer queues player kits');
assert.ok(crowd.filter(entry => entry.key.includes(':fan:')).length >= 16, 'actual character renderer queues fans');
assert.ok(crowd.some(entry => entry.outfit.footballKit), 'booted skin mesh has the football kit variant');
assert.ok(crowd.length <= 57, 'stadium provides at most 14 players, a referee and 42 fans');
live.goalTime = live.time;
live.goalTeam = 0;
const teamKick = live.players.find(player => player.team === 0 && player.slot === 5);
teamKick.stadium53.kick = .22;
g.buildDynamic();
const queued = H.realism39.characterQueue;
assert.ok(queued.some(entry => entry.key.includes(':fan:') && entry.pose.R[5][0] > 1.2), 'visible fans cheer with the skinned arms');
assert.ok(queued.find(entry => entry.key === teamKick.stadium53.look.key)?.pose.R[15][0] < -.9,
  'football kick bends the genuine skin shin bone');
H.realism39.renderer = oldRenderer;

const timeBefore = live.time;
g.paused = true;
g.updateHUD();
assert.ok(hud.hidden);
g.paused = false;
Object.assign(g.avatar, { x: site.x - 210, z: site.z });
g.update(.05);
g.updateHUD();
assert.equal(live.time, timeBefore, 'stadium simulation stops outside activation range');
assert.ok(hud.hidden && !g.buildDynamic().some(o => o.stadium53Ball || o.stadium53Score));
console.log('Stage 53 stadium acceptance passed (genuine world and Game, CPU surface).', {
  score: [...match.score], ...match.stats, visibleSkinnedActors: crowd.length
});
