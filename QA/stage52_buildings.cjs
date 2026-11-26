'use strict';
// Genuine cumulative Game, world and save logic with a simulated rendering surface.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');

process.env.SUNSET_QA_EXTRA_SCRIPTS ||= 'assets/stage52_buildings.js';
process.env.SUNSET_QA_SEED ||= '52052';
const { H, g, document, warnings, errors } = require('./stage51_bootstrap.cjs');
const buildings = H.buildings52;
assert.ok(buildings, 'Stage 52 building runtime was loaded');

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const initialPortals = g.world.entrancePortals;
const activeDoors = initialPortals.filter(p => p.interiorReady);
const layout = () => ({
  portals: digest(g.world.entrancePortals.map(p => [p.id, p.x, p.z, p.facing, p.buildingX, p.buildingZ, p.interiorReady])),
  roads: digest(g.world.roads461.map(r => [r.id, r.points, r.width]))
});
const baseline = layout();

function onFoot(at) {
  g.inVehicle = false;
  g.retailVisit = g.roofVisit = g.boat444 = g.indoor = null;
  g.entryTransition = g.exitTransition = null;
  Object.assign(g.avatar, at, { y: H.outdoorHeight(at.x, at.z), grounded: true, deck443: false,
    coastDeck461: false, swim445: null, support: null, vx: 0, vz: 0, vy: 0 });
  g.keys.clear();
}

function arrive(dt, process) {
  for (let t = 0; t < dt; t += .053) {
    g.seconds += .053;
    process(.053);
  }
}

function withoutTraffic() {
  g.parked = [];
  g.civilian = [];
  g.police = [];
  g.pedestrians = [];
  g.wrecks = [];
  g.trams = [];
}

test('each existing lobby can be approached, entered and exited through its own opening', () => {
  g.restart({ reuseWorld: true });
  withoutTraffic();
  const singleStorey = [];
  for (const door of activeDoors) {
    const outside = buildings.offset(door, 2.25);
    onFoot(outside);
    assert.equal(g.nearestEntrance()?.id, door.id, 'entrance approached for ' + door.id);
    assert.equal(g.beginBuildingEntry(door.id), true, 'entry begins for ' + door.id);
    arrive(1.35, dt => g.updateBuildingEntry(dt));
    assert.equal(g.indoor?.portalId, door.id, 'correct lobby for ' + door.id);
    assert.equal(g.indoor.scene.details52, true);
    if (!g.elevatorBuilding52()) singleStorey.push(door.id);
    assert.equal(g.exitBuilding(), true, 'exit begins for ' + door.id);
    arrive(1.02, dt => g.stage42UpdateExit(dt));
    assert.equal(g.indoor, null);
    assert.equal(g.exitTransition, null);
    assert.equal(g.walkerPositionFree(g.avatar.x, g.avatar.z), true, 'free pavement for ' + door.id);
    assert.ok(Math.hypot(g.avatar.x - door.x, g.avatar.z - door.z) < 3.5);
  }
  assert.equal(activeDoors.length, 214);
  assert.equal(singleStorey.length, 65);
  assert.deepEqual(layout(), baseline);
});

function withBlocker(at, size, run) {
  g.world.solid(at.x, at.z, size, size);
  const blocker = g.world.solids.at(-1);
  try { run(); }
  finally {
    g.world.solids.pop();
    for (const [key, list] of g.world.spatial)
      if (list.includes(blocker)) g.world.spatial.set(key, list.filter(x => x !== blocker));
    g.world.nearbyRegions473.clear();
  }
}

test('façade sides cannot trigger entry, and an obstructed entrance will not start an exit', () => {
  const door = activeDoors.find(p => p.stage07Aligned);
  onFoot(buildings.offset(door, 1.1, door.width / 2 + .95));
  assert.notEqual(g.nearestEntrance()?.id, door.id);
  assert.equal(g.beginBuildingEntry(door.id), false);
  onFoot(buildings.offset(door, 2.20));
  assert.equal(g.beginBuildingEntry(door.id), true);
  arrive(1.34, dt => g.updateBuildingEntry(dt));
  withBlocker(buildings.offset(door, 1.05), 1.7, () => {
    assert.equal(g.exitBuilding(), false);
    assert.equal(g.indoor.portalId, door.id);
    assert.equal(g.exitTransition, null);
  });
  assert.equal(g.exitBuilding(), true);
  arrive(1.02, dt => g.stage42UpdateExit(dt));
  assert.equal(g.indoor, null);
  assert.deepEqual(layout(), baseline);
});

test('assisted exits hold movement and stop at a clear point if an exterior path becomes blocked', () => {
  const door = activeDoors[0];
  onFoot(buildings.offset(door, 2.25));
  assert.equal(g.beginBuildingEntry(door.id), true);
  arrive(1.34, dt => g.updateBuildingEntry(dt));
  assert.equal(g.exitBuilding(), true);
  g.keys.add('KeyW');
  assert.equal(g.is('KeyW'), false);
  const exit = g.exitTransition, target = { x: exit.targetX, z: exit.targetZ };
  withBlocker(target, .7, () => {
    arrive(1.02, dt => g.stage42UpdateExit(dt));
    assert.equal(g.indoor?.portalId, door.id);
    assert.equal(g.exitTransition, null);
  });
  assert.equal(g.exitBuilding(), true);
  for (let i = 0; i < 64 && !g.exitTransition?.switched; i++) g.stage42UpdateExit(.013);
  assert.equal(g.exitTransition?.switched, true);
  const before = [g.avatar.x, g.avatar.z];
  withBlocker(target, .7, () => {
    g.stage42UpdateExit(.50);
    assert.equal(g.exitTransition, null);
    assert.deepEqual([g.avatar.x, g.avatar.z], before);
    assert.equal(g.walkerPositionFree(g.avatar.x, g.avatar.z), true);
  });
});

test('valid elevator stops exclude unreachable roofs and an upper-floor cabin survives saving', () => {
  const noLift = initialPortals[305], midrise = initialPortals[299], originalRoof = initialPortals[0];
  onFoot(buildings.offset(noLift, 2.25));
  assert.equal(g.enterBuilding(noLift.id), true);
  Object.assign(g.avatar, g.indoor.scene.lift);
  g.updateHUD();
  assert.equal(document.getElementById('elevator50').hidden, true);
  assert.equal(g.openElevatorMenu(), false);
  assert.equal(g.startElevatorTo(1), false);

  onFoot(buildings.offset(midrise, 2.25));
  assert.equal(g.enterBuilding(midrise.id), true);
  const v = g.indoor, elevator = v.scene.lift;
  assert.equal(g.world.roofsByBuilding461.has(v.plan.buildingId), false);
  Object.assign(g.avatar, { x: elevator.x, z: elevator.z + .45 });
  g.updateHUD();
  const stops = document.getElementById('elevator-stops50').children;
  assert.equal(stops.at(-1).dataset.floor50, v.scene.maxFloor);
  assert.equal(g.startElevatorTo(v.scene.maxFloor + 1), false);
  assert.equal(g.startElevatorTo(2), true);
  assert.equal(g.startElevatorTo(1), true);
  arrive(4.2, dt => g.updateInterior(dt, 0, 0));
  assert.equal(v.floor, 2);
  assert.equal(g.standingInsideElevator(v), true);
  arrive(6.3, dt => g.updateInterior(dt, 0, 0));
  assert.equal(v.floor, 1);
  assert.equal(v.liftRide, null);
  assert.equal(g.stage19SaveNow('slot3').ok, true);
  assert.equal(g.stage19LoadNow('slot3').ok, true);
  g.updateInterior(.03, 0, 0);
  assert.equal(g.indoor.floor, 1);
  assert.equal(g.standingInsideElevator(), true);
  assert.equal(g.elevatorCarAt52(), true);

  onFoot(buildings.offset(originalRoof, 2.25));
  assert.equal(g.enterBuilding(originalRoof.id), true);
  const roofVisit = g.indoor;
  assert.ok(g.world.roofsByBuilding461.get(roofVisit.plan.buildingId));
  Object.assign(g.avatar, { x: roofVisit.scene.lift.x, z: roofVisit.scene.lift.z + .45 });
  g.updateHUD();
  assert.equal(document.getElementById('elevator-stops50').children.at(-1).textContent, 'גג');
  assert.equal(g.startElevatorTo(roofVisit.scene.maxFloor + 1), true);
  arrive(13, dt => { if (g.indoor) g.updateInterior(dt, 0, 0); });
  assert.equal(g.roofVisit?.from, roofVisit);
});

test('private house purchases generate walkable rooms with solid walls, usable ramps, and safe saves', () => {
  g.restart({ reuseWorld: true });
  withoutTraffic();
  const property = H.realism39.property48;
  const island = property.ISLANDS[0];
  onFoot(g.world.office48);
  g.profile.credits = 65000;
  property.open();
  property.act('buyIsland', island.id);
  for (const kind of ['hut', 'villa', 'estate']) property.act('build', island.id + ':' + kind);
  property.act('close');
  const state = property.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(state.islands[island.id].houses)), [
    { plot: 0, type: 'hut' }, { plot: 1, type: 'villa' }, { plot: 2, type: 'estate' }
  ]);
  const rooms = island.plots.map(plot => buildings.findHome(g.world, plot));
  for (const h of rooms) {
    assert.ok(h);
    for (let z = h.back + .72; z <= h.rampEnd + .28; z += .18)
      assert.equal(g.walkerPositionFree(h.x, z), true, h.type + ' center approach is clear');
    assert.equal(g.walkerPositionFree(h.west, h.z), false);
    assert.equal(g.walkerPositionFree(h.east, h.z), false);
    assert.equal(g.walkerPositionFree(h.x, h.back), false);
    assert.ok(Math.abs(buildings.homeFloor(g.world, {x: h.x, z: h.front + .01}) - h.floor) < .025);
  }
  const h = rooms[0], start = { x: h.x, z: h.front + 2.15 };
  onFoot(start);
  g.footCameraYaw = 0;
  g.keys.add('KeyW');
  for (let i = 0; i < 50; i++) g.update(1 / 60);
  g.keys.clear();
  assert.equal(buildings.findHome(g.world, g.avatar)?.type, 'hut');
  assert.ok(Math.abs(g.avatar.y - (h.floor + .023)) < .04);
  g.updateCamera(1 / 60);
  assert.ok(g.cam.x > h.west && g.cam.x < h.east && g.cam.z > h.back && g.cam.z < h.front);
  assert.ok(g.cam.y >= h.floor + 1.5 && g.cam.y < h.floor + h.h);
  assert.equal(g.sceneLights()[0], h.light);
  g.togglePause();
  assert.equal(g.sceneLights()[0], h.light);
  g.togglePause();
  assert.equal(g.stage19SaveNow('slot1').ok, true);
  const save = H.stage19Save.parse(g.stage19SaveSystem.exportText('slot1'));
  assert.equal(save.mode, 'foot');
  assert.deepEqual(JSON.parse(JSON.stringify(save.property48)), JSON.parse(JSON.stringify(state)));
  const coordinates = [g.avatar.x, g.avatar.z];
  assert.equal(g.stage19LoadNow('slot1').ok, true);
  assert.deepEqual([g.avatar.x, g.avatar.z], coordinates);
  assert.equal(buildings.findHome(g.world, g.avatar)?.type, 'hut');
  g.footCameraYaw = Math.PI;
  g.keys.add('KeyW');
  for (let i = 0; i < 65; i++) g.update(1 / 60);
  g.keys.clear();
  assert.ok(g.avatar.z > h.front + .50);
  assert.deepEqual(layout(), baseline);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.filter(m => !m.startsWith('Audio unavailable ')), []);
});
