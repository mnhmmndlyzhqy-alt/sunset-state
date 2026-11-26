'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const baseline = require('./stage51_fixtures/stage50_world.json').world;
naiveEnvironment();

const { H, g, warnings, errors } = require('./stage51_bootstrap.cjs');
const world = g.world, surface = H.roads53;
const roads = world.roads461, byId = new Map(roads.map(r => [r.id, r]));
const allSolids = world.solids;
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const roadTrimCount = () => world.boxes.filter(b => b.basis444 && ['asphalt', 'concrete', 'paint'].includes(b.material)).length;
const originalAnchors = () => roads.filter(r => r.id !== 'privateConnector53').map(r => ({ id: r.id, width: r.width, points: r.points }));
const maxGrade = () => Math.max(...roads.flatMap(road => road.samples.slice(1).map((p, i) =>
  Math.abs(p.y - road.samples[i].y) / near(p, road.samples[i]))));
const layout = () => ({ roads: roads.length, boxes: world.boxes.length, affineSurfaces: roadTrimCount(), solids: allSolids.length,
  portals: world.entrancePortals.length, activePortals: world.entrancePortals.filter(p => p.interiorReady).length,
  shops: world.retailShops.length, windowBays: world.stage08FacadeStats.windowBays, glazing: world.glassPanels.length,
  rotations: Array.from(world.stage07AlignmentStats.updates, u => [u.id, u.portalId, u.angleDegrees, u.road, u.newCollisionCells]) });

function naiveEnvironment() {
  process.env.SUNSET_QA_EXTRA_SCRIPTS ||= 'assets/stage53_roads.js,assets/stage53_shops.js';
  process.env.SUNSET_QA_SEED ||= '53';
}

if (process.argv.includes('--survey')) {
  console.log(JSON.stringify({ enabled: !!surface, stats: surface?.stats(), maxGrade: maxGrade(), layout: layout() }));
} else {
  registerTests();
}

function registerTests() {
  assert.ok(surface, 'Stage 53 road system is installed');
  test('original surveyed anchors remain and 56 plotted junctions share their elevation', () => {
    assert.equal(roads.length, 53);
    assert.equal(originalAnchors().length, 52);
    assert.equal(hash(originalAnchors()), baseline.roads);
    const connector = byId.get('privateConnector53');
    assert.deepEqual(Array.from(connector.points, p => [p.x, p.z]), [[-921, 0], [-884, 0]]);
    assert.equal(connector.width, 7.4);
    assert.ok(Math.abs(near(...connector.points) - 37) < 1e-8);
    assert.equal(surface.stats().connectedCrossings, 56);
    assert.equal(surface.crossings().length, 56);
    assert.ok(surface.stats().preservedGradeSeparations > 0);
    assert.ok(maxGrade() < .0901);
    for (const j of surface.crossings()) {
      const samples = j.roads.map(id => byId.get(id).samples.find(p => near(p, j) < .002));
      assert.ok(samples.every(p => p?.junction), 'joint present in every crossing route');
      assert.ok(Math.max(...samples.map(p => p.y)) - Math.min(...samples.map(p => p.y)) <= .001);
    }
    assert.deepEqual(Array.from(surface.crossings().filter(p => p.roads.includes(connector.id)),
      p => p.roads.find(id => id !== connector.id)).sort(), ['northKeys', 'privateSpine469']);
  });

  test('known north ring underpass retains separate drive heights and collision levels', () => {
    const upper = byId.get('westExpress'), lower = byId.get('northRing');
    const cross = upper.samples.find(p => p.z === -432);
    assert.ok(cross);
    const upperActor = { x: cross.x, z: cross.z, yaw: 0, route477: { road: upper } };
    const lowerActor = { x: cross.x, z: cross.z, yaw: Math.PI / 2, route477: { road: lower } };
    const a = H.getRoadProfile477(upperActor, cross.x, cross.z), b = H.getRoadProfile477(lowerActor, cross.x, cross.z);
    assert.equal(a.road.id, upper.id);
    assert.equal(b.road.id, lower.id);
    assert.ok(a.y - b.y > 5.5);
    assert.ok(H.deckGround443(upperActor) - H.deckGround443(lowerActor) > 5.5);
    assert.equal(H.sameRoadLevel443(upperActor, lowerActor), false);
    assert.equal(surface.otherRoad(upper.id, cross.x, cross.z, a.y, .2), false);
    assert.ok(!surface.crossings().some(p => near(p, cross) < .003 &&
      p.roads.includes('westExpress') && p.roads.includes('northRing')));
  });

  test('curbs and parapets open on the real junction while intact rails still return a car', () => {
    const open = guardSites(true), shut = guardSites(false);
    assert.ok(open && shut, 'live passage and protected rail examples exist');
    const stats = surface.stats();
    assert.ok(stats.railOpenings > 0 && stats.clippedTrimSegments > 0);
    const car = makeCar(open);
    assert.equal(H.guardBridgeRails477(car, open.before.x, open.before.z), false);
    assert.deepEqual([car.x, car.z], [open.target.x, open.target.z]);
    const other = makeCar(shut);
    assert.equal(H.guardBridgeRails477(other, shut.before.x, shut.before.z), true);
    assert.ok(near(other, shut.target) > .15);
    assert.equal(other.bridgeRailContacts477, 1);

    const { road, samples, side } = open;
    const rails = surface.railRuns(road, samples, side);
    for (const run of rails) for (let i = 1; i < run.length; i++) {
      const a = edge(run[i - 1], side * road.width * .5);
      const b = edge(run[i], side * road.width * .5);
      const m = midpoint(a, b);
      assert.equal(surface.otherRoad(road.id, m.x, m.z, m.y, .64), false,
        'rail piece stays outside the crossing carriageway');
    }
    const rows = [], ribbon = H.addRibbon444, railX = side * road.width * .5;
    H.addRibbon444 = (_, stratum) => rows.push(stratum);
    try { surface.ribbon(world, samples, railX - .085, railX + .085, .075, '#918e80', 'concrete', 4, 495); }
    finally { H.addRibbon444 = ribbon; }
    for (const run of rows) for (let i = 1; i < run.length; i++) {
      const [l, r] = run[i], [u, v] = run[i - 1];
      assert.equal(surface.otherRoad(road.id, (l[0] + r[0] + u[0] + v[0]) / 4,
        (l[2] + r[2] + u[2] + v[2]) / 4, (l[1] + r[1] + u[1] + v[1]) / 4 - .075, .28), false,
        'retained curb stays outside the other driving lane');
    }

    function makeCar(s) {
      const angle = Math.atan2(s.before.x - s.target.x, s.before.z - s.target.z);
      const value = H.makeCar('player', s.target.x, s.target.z, angle);
      value.y = s.y;
      value.vx = -Math.sin(angle) * 4.6;
      value.vz = -Math.cos(angle) * 4.6;
      return value;
    }
    function edge(p, off) {
      return { x: p.x + p.nx * off, y: p.y, z: p.z + p.nz * off };
    }
    function midpoint(a, b) {
      return { x: (a.x + b.x) * .5, y: (a.y + b.y) * .5, z: (a.z + b.z) * .5 };
    }
    function guardSites(wantOpening) {
      const junctions = surface.crossings();
      for (const road of roads) for (let i = 1; i < road.samples.length - 1; i++) {
        const p = road.samples[i];
        if (p.above < .92) continue;
        const atJunction = junctions.some(j => j.roads.includes(road.id) && near(p, j) < 5.8);
        if (atJunction !== wantOpening) continue;
        for (const side of [-1, 1]) {
          const half = road.width * .5;
          const before = edge(p, side * (half - .65)), target = edge(p, side * (half + .21));
          const from = H.closestBridge477(before.x, before.z), bridge = H.closestBridge477(target.x, target.z);
          if (from?.road.id !== road.id || bridge?.road.id !== road.id || bridge.d < half - .06) continue;
          const t = Math.hypot(bridge.x - bridge.a.x, bridge.z - bridge.a.z) / bridge.len;
          const y = bridge.a.y + (bridge.b.y - bridge.a.y) * t;
          if (surface.otherRoad(road.id, target.x, target.z, y, .2) !== wantOpening) continue;
          const samples = road.samples.slice(Math.max(0, i - 4), i + 5);
          if (wantOpening) {
            const parts = samples.length - 1 - surface.railRuns(road, samples, side).reduce((sum, r) => sum + r.length - 1, 0);
            if (parts <= 0) continue;
          }
          return { road, samples, side, before, target, y };
        }
      }
      return null;
    }
  });

  test('a true car and pedestrian can travel across the connector on the existing physics route', () => {
    const route = byId.get('privateConnector53');
    const probe = H.makeCar('player', -920.75, 0, -Math.PI / 2);
    for (let x = -920.7; x < -884.2; x += .63) {
      probe.x = x;
      assert.equal(g.walkerPositionFree(x, 0), true, 'no pedestrian obstruction at ' + x);
      assert.equal(H.drivingSolids443(world, probe).some(s => H.carBuildingContact(probe, s)), false,
        'no vehicle solid at ' + x);
      assert.ok(H.getRoadProfile477({ ...probe, route477: { road: route } }, x, 0));
    }
    probe.x = -920.2;
    probe.speed = probe.vx = 9.5;
    let previous = probe.x;
    for (let i = 0; i < 260 && probe.x < -885; i++) {
      g.moveCar(probe, 1 / 60, { gas: .9, steer: 0, brake: false, nitro: false });
      assert.ok(probe.x >= previous - .06 && Math.abs(probe.z) < 1.7);
      previous = probe.x;
    }
    assert.ok(probe.x >= -885 && !probe.wrecked, 'car drove the connector');
    const walker = H.createWalker(-920.5, 0, -Math.PI / 2, 53001);
    walker.y = H.walkerGround473(walker);
    for (let i = 0; i < 480 && walker.x < -885; i++)
      H.stepWalker(walker, { forward: 1, strafe: 0, outdoors: true, viewYaw: -Math.PI / 2 }, H.drivingSolids443(world, walker), 1 / 60, []);
    assert.ok(walker.x >= -885 && Math.abs(walker.z) < .10 && Number.isFinite(walker.y));
  });

  test('live facade validation preserves the complete selectable glazing system', () => {
    const s = world.stage16GlassStats, backing = world.boxes.filter(b => b.stage16Backing);
    const panes = world.glassPanels.filter(p => p.stage16Facade);
    assert.equal(s.sourceStage08Windows, world.stage08FacadeStats.windowBays);
    assert.equal(s.sourceStage08Windows, world.boxes.filter(b => b.stage08Part === 'glass').length);
    assert.equal(s.buildingsCovered, 130);
    assert.equal(s.selectedGlass, 864);
    assert.equal(backing.length, 864);
    assert.equal(panes.length, 864);
    for (const p of panes) {
      assert.equal(world.glassPanels[p.id], p);
      assert.equal(p.stage16Original.stage16PaneId, p.id);
      assert.ok([p.x, p.y, p.z, p.stage16Yaw, p.stage16NormalX, p.stage16NormalZ].every(Number.isFinite));
    }
    assert.equal(world.entrancePortals.length, baseline.count.portals);
    assert.equal(world.entrancePortals.filter(p => p.interiorReady).length, baseline.count.activePortals);
    assert.equal(world.retailShops.length, baseline.count.shops);
    assert.equal(warnings.length, 0);
    assert.equal(errors.length, 0);
  });
}
