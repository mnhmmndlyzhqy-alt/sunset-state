'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.SUNSET_QA_SEED ||= '53';
const { H, g, ctx, document } = require('./stage51_bootstrap.cjs');
assert.ok(H.estate53World && H.transport53 && H.estate53, 'run against the integrated Stage 53 source');

g.restart({ reuseWorld: true });
const nav = g.nav445, session = g.stage19SaveSystem, saved = H.stage19Save;
const world = g.world, estate = world.estate53, key = saved.prefix + 'auto';
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const target = id => nav.places.find(p => p.id === id);
const square = (x, z) => ({ x, z, level: 0 });
const mainland = square(-108, 0);
function onFoot(p) {
  Object.assign(g, { running: true, inVehicle: false, onBus: -1, onTram: -1,
    roofVisit: null, boat444: null, indoor: null, retailVisit: null, paused: false, over: false });
  g.flight51.pilot = false;
  Object.assign(g.avatar, p, { y: H.outdoorHeight(p.x, p.z), deck443: false, coastDeck461: false,
    grounded: true, support: null, swim445: null });
}

test('full-map bounds contain both territories and map/inverse transforms survive zoom and aerial mode', () => {
  assert.ok(estate);
  const { west, east, north, south } = H.estate53World.mapBounds;
  const center = nav.overviewCenter();
  assert.ok(west < -1000 && east > estate.runway.east && north < estate.runway.north && south > estate.office.z);
  const map = { width: 1100, height: 670 };
  const positions = [square(west, north), square(east, south), mainland, estate.office, estate.slots.car[0]];
  for (const aerial of [true, false]) {
    nav.aerial = aerial;
    nav.zoom = 1;
    const full = nav.transform(map, false, center);
    for (const p of positions) {
      const [x, z] = full.map(p.x, p.z);
      assert.ok(x >= 0 && z >= 0 && x <= map.width && z <= map.height);
      assert.ok(distance(full.unmap(x, z), p) < 1e-8);
    }
    nav.zoom = 3.4;
    const rented = nav.transform(map, false, estate.office);
    assert.ok(distance(rented.unmap(map.width / 2, map.height / 2), estate.office) < 1e-8);
  }
  nav.zoom = 1;
  nav.aerial = true;
  assert.equal(typeof nav.bake(true).layer.getContext('2d'), 'object');
});

test('estate markers provide cross-water guidance while the road graph stays within the island', () => {
  const office = target('estate53:office'), runway = target('estate53:runway'), garage = target('estate53:garage');
  const port = target('island53:estate'), ferry = target('freight53:marina');
  for (const p of [office, runway, garage, port, ferry]) assert.ok(p && Number.isFinite(p.x) && Number.isFinite(p.z));
  assert.ok(distance(office, estate.office) < .01);
  assert.ok(Math.abs(runway.z - estate.runway.z) < .01 && H.estate53World.walkable(runway.x, runway.z));
  assert.equal(nav.roads.route(mainland, office), null);
  assert.equal(nav.roads.route(office, mainland), null);

  onFoot(mainland);
  nav.clear();
  assert.equal(nav.select({ ...office }), true);
  assert.equal(nav.route, null);
  assert.equal(nav.guide.hidden, false);
  assert.match(nav.distance.textContent, /בקו אווירי/);
  assert.match(nav.cue.textContent, /רציף|מנחת/);
  g.boat444 = { x: 1250, z: 347, yaw: -Math.PI / 2 };
  nav.update(true);
  assert.equal(nav.route, null);
  assert.equal(nav.icon.textContent, '⚓');
  assert.match(nav.cue.textContent, /הפליגו/);

  onFoot(office);
  assert.equal(nav.select({ ...runway }), true);
  assert.ok(nav.route?.points.length >= 3);
  for (const p of nav.route.points) assert.ok(H.estate53World.walkable(p.x, p.z), 'road remains on-island');
  assert.ok(nav.route.access < 35);
  assert.equal(nav.select({ ...garage }), true);
  assert.ok(nav.route?.points.length >= 2);
  nav.clear();
  assert.equal(nav.route, null);
  assert.equal(nav.guide.hidden, true);
});

test('manual pilot map position follows the aircraft and keeps air-only guidance above the estate', () => {
  onFoot(mainland);
  const aircraft = g.flight51;
  const runway = target('estate53:runway');
  Object.assign(aircraft.plane, { x: runway.x, z: runway.z + 145, y: 60, yaw: -.3, airborne: true, mode: 'flight' });
  aircraft.pilot = true;
  try {
    assert.deepEqual([nav.actor().x, nav.actor().z], [aircraft.plane.x, aircraft.plane.z]);
    assert.equal(nav.select({ ...runway }), true);
    assert.equal(nav.route, null);
    assert.match(nav.cue.textContent, /נחתו/);
    Object.assign(aircraft.plane, { x: runway.x, z: runway.z, y: 60 });
    nav.update(true);
    assert.equal(nav.route, null);
    assert.match(nav.cue.textContent, /נחתו/, 'horizontal proximity is not a landing');
  } finally {
    aircraft.pilot = false;
    nav.clear();
  }
});

test('autosave availability follows the actual slot and transitions defer writes', () => {
  onFoot(mainland);
  ctx.localStorage.removeItem(key);
  ctx.localStorage.removeItem(key + '_backup');
  assert.equal(session.refreshAuto(), false);
  assert.equal(session.autoButtons.length, 2);
  assert.ok(session.autoButtons.every(b => b.hidden && b.disabled));
  assert.ok(session.autoButtons.every(b => b.textContent.includes('שמירת האי')));
  const oldRaw = ctx.localStorage.getItem(key);
  for (const field of ['entryTransition', 'exitTransition', 'vehicleEntry']) {
    g[field] = {};
    try {
      const result = session.saveAuto();
      assert.equal(result.ok, false);
      assert.equal(result.deferred, true);
      assert.equal(ctx.localStorage.getItem(key), oldRaw);
    } finally { g[field] = null; }
  }
  session.loading = true;
  try { assert.equal(session.saveAuto().deferred, true); }
  finally { session.loading = false; }
  g.profile.credits = 710;
  assert.equal(session.saveAuto().ok, true);
  assert.ok(session.autoButtons.every(b => !b.hidden && !b.disabled));
  assert.ok(session.list().some(slot => slot.slot === 'auto' && slot.exists));
  assert.equal(saved.readSlot('auto').data.profile.credits, 710);
  assert.deepEqual(Array.from(saved.slots), ['slot1', 'slot2', 'slot3']);
});

test('quota and denied storage preserve the last valid automatic save', () => {
  const actual = ctx.localStorage, previous = actual.getItem(key);
  assert.ok(previous);
  g.profile.credits = 801;
  ctx.localStorage = {
    ...actual, setItem: (name, value) => {
      if (name === key) throw new ctx.DOMException('Quota exceeded', 'QuotaExceededError');
      actual.setItem(name, value);
    }
  };
  try {
    const result = session.saveAuto();
    assert.equal(result.ok, false);
    assert.match(result.error, /Quota|אחסון/);
    assert.equal(actual.getItem(key), previous);
  } finally { ctx.localStorage = actual; }
  ctx.localStorage = undefined;
  try {
    const result = session.saveAuto();
    assert.equal(result.ok, false);
    assert.match(result.error, /אחסון/);
  } finally { ctx.localStorage = actual; }
  assert.equal(actual.getItem(key), previous);
  assert.equal(saved.readSlot('auto').data.profile.credits, 710);
});

test('checksum failure recovers the previous automatic save and invalid slots are hidden', () => {
  const storage = ctx.localStorage;
  g.profile.credits = 830;
  assert.equal(session.saveAuto().ok, true);
  const outgoing = JSON.parse(storage.getItem(key));
  outgoing.data.profile.credits = 10000;
  const corrupt = JSON.stringify(outgoing);
  assert.throws(() => saved.parse(corrupt));
  storage.setItem(key, corrupt);
  const found = saved.readSlot('auto');
  assert.equal(found.backup, true);
  assert.equal(found.data.profile.credits, 710);
  assert.equal(session.refreshAuto(), true);
  const load = session.load('auto');
  assert.equal(load.ok, true);
  assert.equal(load.backup, true);
  assert.equal(g.profile.credits, 710);
  assert.ok(session.autoButtons.every(b => !b.hidden));
  storage.setItem(key + '_backup', corrupt);
  assert.throws(() => saved.readSlot('auto'));
  assert.equal(session.refreshAuto(), false);
  assert.ok(session.autoButtons.every(b => b.hidden && b.disabled));
  const entry = session.list().find(slot => slot.slot === 'auto');
  assert.equal(entry.exists, false);
  assert.equal(entry.invalid, true);
});
