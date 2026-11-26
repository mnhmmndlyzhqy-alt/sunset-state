'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
process.env.SUNSET_QA_EXTRA_SCRIPTS ||= 'assets/stage53_shops.js';
process.env.SUNSET_QA_SEED ||= '53';
const { H, g, ctx, document, realWildlife, errors, warnings, advance } = require('./stage51_bootstrap.cjs');
const shops = H.stage53Shops, RC = H.realism39;
assert.ok(shops && RC.character53, 'Stage 53 shops and character modules loaded');

const digest = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const existing = g.world.retailShops;
const doors = () => digest(existing.map(v => [v.id, v.kind, v.bank44, v.retail.doorX, v.retail.frontZ]));
const solids = () => digest(g.world.solids.map(s => [s.x, s.z, s.hw, s.hd]));
const originalDoors = doors();
const put = (a, x, z) => Object.assign(a, { x, z, y: H.outdoorHeight(x, z), vx: 0, vz: 0, grounded: true,
  deck443: false, coastDeck461: false, swim445: null, support: null });

test('all 59 live storefronts receive readable names and clearance-safe geometry', () => {
  const data = shops.graph(g.world), initial = solids();
  assert.equal(data.entries.length, existing.length);
  assert.equal(data.entries.length, 59);
  assert.ok(data.entries.some(s => s.kind === 'bank'));
  assert.ok(new Set(Array.from(data.entries, s => s.kind)).size >= 7);
  for (const shop of data.entries) {
    assert.ok(shop.name.trim() && shop.style.category.trim(), 'name and category for ' + shop.venue.id);
    assert.equal(shop.name, shop.venue.label);
    assert.equal(data.keyed.get(shop.venue.id), shop);
    const parts = shops.frontageParts(shop);
    assert.ok(parts.length >= 6 && parts.length <= 12, 'bounded number of grouped pieces');
    assert.ok(parts.every(b => [b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite)));
    for (const b of parts) {
      const overlapsX = Math.abs(b.x - shop.door.x) < .89 + b.w * .5;
      const doorGround = H.outdoorHeight(shop.door.x, shop.front.frontZ);
      assert.ok(!overlapsX || b.y - b.h * .5 >= doorGround + 2.5, 'clear opening ' + shop.venue.id);
    }
  }
  assert.equal(doors(), originalDoors);
  assert.equal(solids(), initial);
  const rect = { left: 24, top: 12, width: 1000, height: 700 };
  const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const projected = shops.project(m, rect, { x: 0, y: 0, z: 0 });
  assert.deepEqual([projected.x, projected.y], [524, 362]);
  assert.equal(shops.project(m, rect, { x: -1.1, y: 0, z: 0 }), null);
  assert.equal(shops.project(m.map((v, i) => i === 15 ? -1 : v), rect, { x: 0, y: 0, z: 0 }), null);
  const approximate = shops.projectCamera({ x: 0, y: 6, z: 4, tx: 0, ty: 2, tz: -6, fov: 65 }, rect, { x: 0, y: 2, z: -6 });
  assert.ok(Math.abs(approximate.x - 524) < .01 && Math.abs(approximate.y - 362) < .01);
  assert.equal(shops.registerSign(g.world, { id: 'test', name: 'רציף', x: 81, y: 2, z: 90, normalZ: 1 }), true);
  assert.equal(shops.registerSign(g.world, { id: 'test-too-high', name: 'רציף', x: 81, y: Infinity, z: 90 }), false);
});

test('existing E interaction opens all named shops and allows returning to the street', () => {
  g.restart({ reuseWorld: true });
  const residents = g.pedestrians;
  g.civilian = g.police = g.parked = g.wrecks = g.trams = [];
  g.pedestrians = [];
  const locations = shops.graph(g.world).entries;
  for (const s of locations) {
    put(g.avatar, s.door.x, s.door.z - .68);
    g.inVehicle = false;
    assert.equal(g.nearestRetailDoor()?.id, s.venue.id, 'matched shop ' + s.venue.id);
    g.updateHUD();
    assert.match(document.getElementById('interact-hint').textContent, /כניסה/);
    g.toggleVehicle();
    assert.equal(g.retailVisit?.venue.id, s.venue.id, 'entered shop ' + s.venue.id);
    assert.ok(g.retailVisit.clerk.urbanModel441);
    assert.ok(g.retailVisit.scene.counter);
    g.exitRetail();
    assert.equal(g.retailVisit, null, 'exit shop ' + s.venue.id);
  }
  const bank = locations.find(s => s.venue.bank44);
  put(g.avatar, bank.door.x, bank.door.z - .68);
  g.toggleVehicle();
  assert.ok(g.retailVisit.bank44 || g.retailVisit.venue.bank44);
  assert.equal(g.stage19SaveNow('slot2').ok, true);
  assert.equal(g.stage19LoadNow('slot2').ok, true);
  assert.equal(g.retailVisit.venue.id, bank.venue.id);
  g.exitRetail();
  assert.equal(doors(), originalDoors);
  g.pedestrians = residents;
});

test('actual pedestrians browse a nearby display briefly and yield to panic', () => {
  const state = shops.graph(g.world).entries;
  const shop = state.find(s => s.kind !== 'bank' && !H.coast461.isRouteRoad(s.window.x, s.window.z - 3.15) &&
    H.officerSightClear(s.window.x, s.window.z - 3.15, s.window.x, s.window.z, g.world.nearby(s.window.x, s.window.z)));
  assert.ok(shop);
  const walker = g.pedestrians.find(w => !w.storyContact445 && !w.shift441 && !w.home441);
  assert.ok(walker);
  put(g.avatar, shop.door.x, shop.door.z - 4);
  put(walker, shop.window.x, shop.window.z - 3.15);
  g.retailVisit = g.indoor = null;
  g.pedestrians = [walker];
  g.heat = 0;
  g.weather.rain = 0;
  g.streetLife.jobs.delete(walker);
  Object.assign(walker, { navState: 'sidewalk', navActivity: 'walk', pause: 0, fear: 0,
    panic: 0, stumble: 0, injuryState: 'walking', yaw: .95, appearance: 61061, _witness460: false });
  shops.observeShops(g, .03);
  assert.equal(walker.windowBrowse53?.venueId, shop.venue.id);
  assert.equal(walker.navActivity, 'window');
  assert.ok(walker.pause > 2);
  const yaw = walker.yaw;
  g.seconds += .1;
  shops.observeShops(g, .1);
  assert.notEqual(walker.yaw, yaw, 'turns toward the actual window');
  assert.equal(walker.vx, 0);
  walker.panic = 3;
  shops.observeShops(g, .03);
  assert.equal(walker.windowBrowse53, undefined);
  assert.equal(walker.panic, 3, 'danger response retained');
});

test('high-detail skin has normalized geometry, jaw weights and distinct hero clothes', () => {
  const skin = RC.character53, { bones, heroOutfits, buildCharacter } = skin;
  assert.equal(bones.length, 18);
  const jaw = bones.indexOf('jaw'), head = bones.indexOf('head');
  const meshKeys = new Set();
  for (const o of heroOutfits) {
    assert.ok(o.kippah && o.tzitzit, 'all hero wardrobes retain both garments');
    const { vertices, indices } = buildCharacter(o);
    const count = vertices.length / 13;
    let jawVertices = 0, skinSeams = 0;
    assert.ok(Number.isInteger(count) && count >= 3300 && count < 6900);
    assert.ok(indices.length / 3 < 12000 && indices.length % 3 === 0);
    for (const index of indices) assert.ok(index < count && Number.isInteger(index));
    for (let i = 0; i < vertices.length; i += 13) {
      assert.ok(vertices.subarray(i, i + 13).every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...vertices.subarray(i + 3, i + 6)) - 1) < .001);
      assert.ok(vertices[i + 10] < bones.length && vertices[i + 11] < bones.length);
      assert.ok(vertices[i + 12] >= 0 && vertices[i + 12] <= 1);
      if (vertices[i + 10] === jaw) jawVertices++;
      if (vertices[i + 10] === head && vertices[i + 11] === jaw && vertices[i + 12] < .96) skinSeams++;
    }
    assert.ok(jawVertices > 20 && skinSeams > 25);
    meshKeys.add(createHash('sha256').update(Buffer.from(vertices.buffer)).digest('hex'));
  }
  assert.equal(meshKeys.size, 3);
  const baseFace = buildCharacter(heroOutfits[0]);
  const changed = buildCharacter({ ...heroOutfits[0], face: 12 });
  assert.notDeepEqual(baseFace.vertices, changed.vertices);
  assert.deepEqual(baseFace.indices, changed.indices);
});

test('game skin pipeline animates the jaw and actual clothing, preserving imported citizens and stadium poses', () => {
  const model = H.URBAN441.clerks[0];
  const actor = H.createWalker(2, -3, 0, 61060);
  actor.urbanModel441 = model;
  const imported = { selection: new Map(), assets: new Map([[model, { texturesReady: true }]]), urbanCount: 0, ensure() {} };
  assert.equal(realWildlife.prototype.selectUrban.call(imported, actor, 4), true);
  assert.equal(imported.selection.get(actor), model);
  const queue = RC.characterQueue, renderer = RC.renderer, loudness = RC.speechLoudness, stadium = H.stadium53;
  RC.renderer = { rcCharacters: true };
  try {
    queue.length = 0;
    const bones = RC.character53.bones, jaw = bones.indexOf('jaw'), thigh = bones.indexOf('thighL');
    RC.speechLoudness = () => .91;
    actor.outfit460 = 2;
    H.streetCharacterPose32(actor, [], g.seconds, true, 0, true);
    const hero = queue[0];
    assert.equal(hero.key, 'hero:2');
    assert.ok(hero.outfit.kippah && hero.outfit.tzitzit);
    assert.ok(hero.pose.R[jaw][0] < -.01);
    RC.speechLoudness = () => 0;
    for (let i = 0; i < 24; i++) {
      advance(22);
      queue.length = 0;
      H.streetCharacterPose32(actor, [], g.seconds, true, 0, true);
    }
    assert.ok(Math.abs(queue[0].pose.R[jaw][0]) < .005);
    const dry = H.createWalker(2, 1, 0, 61061);
    dry.stadium53 = { look: { key: 'stadium-test', outfit: { ...hero.outfit, footballKit: true, socks: '#234653' }, scale: 1 } };
    H.stadium53 = { skinPose(_, pose, b) { pose.R[b.thighL][0] = .83; } };
    queue.length = 0;
    H.streetCharacterPose32(dry, [], g.seconds, false, 155, true);
    assert.equal(queue[0].key, dry.stadium53.look.key);
    assert.equal(queue[0].outfit.footballKit, true);
    assert.equal(queue[0].pose.R[thigh][0], .83);
    const kits = RC.character53.buildCharacter(queue[0].outfit);
    const shorts = RC.character53.buildCharacter({ ...queue[0].outfit, footballKit: false });
    assert.notDeepEqual(kits.vertices, shorts.vertices);
    assert.equal(ctx.Heatline.quality51.fixed, true);
  } finally {
    RC.renderer = renderer; RC.speechLoudness = loudness; H.stadium53 = stadium; queue.length = 0;
  }
  assert.equal(errors.length, 0);
  assert.deepEqual(warnings.filter(x => !x.startsWith('Audio unavailable ')), []);
});
