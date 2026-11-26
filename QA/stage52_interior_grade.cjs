'use strict';

const assert = require('node:assert/strict');
const { H, g } = require('./stage51_bootstrap.cjs');
const ready = [];
const check = (name, predicate, detail) => {
  assert.ok(predicate, detail === undefined ? name : `${name} ${JSON.stringify(detail)}`);
  ready.push(name);
};
const close = (a, b, tolerance = .006) => Math.abs(a - b) < tolerance;
const frames = (count, fn) => { for (let i = 0; i < count; i++) { g.seconds += 1 / 30; fn(1 / 30); } };
function walkTo(at) {
  g.indoor = g.retailVisit = g.roofVisit = g.boat444 = null;
  g.entryTransition = g.exitTransition = null;
  g.inVehicle = false;
  Object.assign(g.avatar, at, { y: H.outdoorHeight(at.x, at.z), grounded: true, support: null, deck443: false,
    coastDeck461: false, swim445: null, vx: 0, vy: 0, vz: 0 });
  g.keys.clear();
}
function gradeOf(p) {
  const plan = g.world.structuralPlans.find(b => b.outerShell.x === p.buildingX && b.outerShell.z === p.buildingZ);
  const site = g.world.city20DistrictBuildings.find(b => b.x === p.buildingX && b.z === p.buildingZ);
  return { plan, site };
}

g.restart({ reuseWorld: true });
g.parked = [];
g.civilian = [];
g.police = [];
g.pedestrians = [];
g.trams = [];
check('Stage 52 shared grade helper and building runtime load from the game entry point',
  typeof H.interiorGrade52 === 'function' && typeof H.buildings52?.offset === 'function');
const cityDoors = g.world.entrancePortals.filter(p => p.interiorReady && p.stage05City20);
check('All 130 CITY20 interiors use their surveyed facade foundations', cityDoors.length === 130 && cityDoors.every(p => {
  const { plan, site } = gradeOf(p);
  return Number.isFinite(site?.baseY) && close(H.interiorGrade52(plan, g.world), site.baseY);
}));
const legacy = g.world.entrancePortals.find(p => p.interiorReady && !p.stage05City20);
const legacyPlan = gradeOf(legacy).plan;
check('Legacy interior still matches its authored exterior datum', H.interiorGrade52(legacyPlan, g.world) ===
  H.cityTerrain42(legacy.buildingX, legacy.buildingZ));

const corrections = [];
for (const id of [311, 348, 344, 340]) {
  const p = g.world.entrancePortals[id], { plan, site } = gradeOf(p);
  const scene = g.sceneForFloor(plan, 0);
  const raw = H.cityTerrain42(p.buildingX, p.buildingZ);
  walkTo(H.buildings52.offset(p, 2.15));
  check(`Portal ${id} prepares a furnished lobby on the exterior foundation`, close(scene.stage42Base, site.baseY) &&
    raw - scene.stage42Base > 19 && scene.boxes.some(b => b.layer <= 2 && Math.abs(b.y - site.baseY) < .25) &&
    scene.lights.some(light => light.y > site.baseY && light.y < site.baseY + 6));
  check(`Portal ${id} starts the real assisted entry`, g.beginBuildingEntry(id));
  let last = g.avatar.y, peakStep = 0;
  frames(42, dt => {
    g.updateBuildingEntry(dt);
    peakStep = Math.max(peakStep, Math.abs(g.avatar.y - last));
    last = g.avatar.y;
  });
  check(`Portal ${id} reaches the lobby without a height jump`, g.indoor?.portalId === id && close(g.avatar.y, scene.stage42Base) &&
    peakStep < .40, { peakStep, avatarY: g.avatar.y, floor: scene.stage42Base });
  check(`Portal ${id} opens the original egress`, g.exitBuilding());
  frames(32, dt => g.stage42UpdateExit(dt));
  check(`Portal ${id} returns to the same exterior grade`, !g.inside && !g.exitTransition &&
    close(g.avatar.y, H.outdoorHeight(g.avatar.x, g.avatar.z), .10));
  corrections.push({ portal: id, oldHeightM: +raw.toFixed(2), floorM: +site.baseY.toFixed(2), maxEntryStepM: +peakStep.toFixed(3) });
}

const liftPortal = cityDoors.find(p => [311, 348, 344, 340].includes(p.id) && gradeOf(p).plan.floorCount >= 2);
const site = gradeOf(liftPortal).site;
walkTo(H.buildings52.offset(liftPortal, 2.20));
check('Upper-floor check uses a corrected multi-floor building', g.enterBuilding(liftPortal.id));
let visit = g.indoor;
Object.assign(g.avatar, { x: visit.scene.lift.x, z: visit.scene.lift.z + .45 });
check('Elevator starts at the corrected foundation height', g.startElevatorTo(1) && close(g.avatar.y, site.baseY));
frames(43, dt => g.updateInterior(dt, 0, 0));
check('Riding elevator, light and camera track the same corrected height', !!visit.liftRide &&
  close(g.avatar.y, site.baseY + visit.liftRide.travelledFloors * visit.plan.floorHeight) &&
  close(g.sceneLights()[0].y, g.avatar.y + 3.1));
frames(68, dt => g.updateInterior(dt, 0, 0));
const upper = site.baseY + visit.plan.floorHeight;
check('Elevator arrival and generated upper-floor geometry agree', visit.floor === 1 && close(g.avatar.y, upper) &&
  visit.scene.boxes.some(b => b.layer <= 2 && Math.abs(b.y - upper) < .25));
check('Schema-19 upper-floor save restores the corrected walk height immediately', g.stage19SaveNow('slot1').ok &&
  g.stage19LoadNow('slot1').ok && g.indoor?.floor === 1 && close(g.avatar.y, upper));
visit = g.indoor;
const reference = H.makeStairTravel(visit.plan, visit.scene.stairs, 1, 0);
Object.assign(g.avatar, visit.scene.stairs.down);
check('Stair trip aligns its modeled steps and lights with the occupied floor', g.startStairs(-1) &&
  close(visit.stairTrip.boxes[0].y, reference.boxes[0].y + site.baseY) &&
  visit.stairTrip.lights.every((light, i) => close(light.y, reference.lights[i].y + site.baseY)));
frames(115, dt => g.updateInterior(dt, 1, 0));
check('Stair exit puts the walker on the corrected lobby floor', visit.floor === 0 && close(g.avatar.y, site.baseY));

const property = H.realism39.property48;
property.setupWorld(g);
const island = property.ISLANDS[0];
walkTo(g.world.office48);
g.profile.credits = 50000;
property.open();
property.act('buyIsland', island.id);
property.act('build', island.id + ':hut');
property.act('close');
const home = H.buildings52.findHome(g.world, property.plotsFor(g.world, island)[0]);
walkTo({ x: home.x, z: home.z });
g.avatar.y = home.floor + .023;
check('Schema-19 foot-mode house save restores its raised finished floor immediately', g.stage19SaveNow('slot2').ok &&
  g.stage19LoadNow('slot2').ok && !g.inside && close(g.avatar.y, home.floor + .023));
console.log(JSON.stringify({ passed: ready.length, corrections, checks: ready }, null, 2));
