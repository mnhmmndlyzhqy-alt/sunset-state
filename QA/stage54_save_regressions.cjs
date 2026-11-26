'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.SUNSET_QA_SEED ||= '53';
const { H, g, document, El } = require('./stage51_bootstrap.cjs');
const estate = H.estate53;
const slots = H.stage19Save;

function walk(at) {
  Object.assign(g.avatar, at, {
    y: H.outdoorHeight(at.x, at.z), grounded: true, support: null, deck443: false, swim445: null,
    vx: 0, vy: 0, vz: 0
  });
}

function buildFirstDuplex() {
  estate.restore(null);
  g.restart({ reuseWorld: true });
  walk(g.world.estate53.office);
  g.profile.credits = 2000;
  assert.equal(estate.purchase(g, 'housing').ok, true);
}

function negotiationText(applicant) {
  assert.equal(estate.openPanel(g), true);
  const panel = document.getElementById('estate53');
  const tab = new El('button');
  tab.setAttribute('data-estate-action', 'tab');
  tab.setAttribute('data-value', 'rent');
  panel.dispatchEvent({ type: 'click', target: tab, stopPropagation() {} });
  const select = new El('select');
  select.matches = selector => selector === '[data-estate-applicant]';
  select.value = applicant;
  panel.dispatchEvent({ type: 'change', target: select });
  return panel.innerHTML;
}

test('an old service refusal stays on record with its original cause after upgrades, a different lease and reload', () => {
  buildFirstDuplex();
  assert.equal(estate.offer(g, 'lior', 'a1', 30).status, 'declined');
  assert.equal(estate.purchase(g, 'water').ok, true);
  assert.equal(estate.purchase(g, 'furniture').ok, true);
  assert.equal(estate.invite(g, 'lior').ok, true, 'upgrades now qualify for a new offer');
  assert.equal(estate.offer(g, 'noam', 'a1', 25).status, 'accepted');
  assert.equal(estate.approve(g, 'noam').ok, true);
  const state = estate.snapshot();
  assert.match(negotiationText('lior'), /ההצעה נדחתה · בעת ההצעה חסרו מים/);
  assert.equal(g.stage19SaveNow('slot1').ok, true);
  assert.equal(g.stage19LoadNow('slot1').ok, true);
  assert.deepEqual(estate.snapshot(), state);
  assert.match(negotiationText('lior'), /ההצעה נדחתה · בעת ההצעה חסרו מים/);
  assert.equal(estate.units().find(unit => unit.id === 'a1').occupiedBy, 'noam');

  const legacy = slots.readSlot('slot1').data;
  delete legacy.estate53.negotiations[0].missingServices;
  slots.writeSlot('slot3', JSON.stringify(slots.envelope(legacy)));
  assert.equal(g.stage19LoadNow('slot3').ok, true);
  assert.match(negotiationText('lior'), /ההצעה נדחתה · בעת ההצעה חסרו שירותים/);
});

test('rent paid during a building entry is checkpointed when the transition clears', () => {
  buildFirstDuplex();
  assert.equal(estate.offer(g, 'maya', 'a1', 27).status, 'accepted');
  assert.equal(estate.approve(g, 'maya').ok, true);
  for (let i = 0; i < 119; i++) estate.tick(g, 1);
  estate.tick(g, .96);

  const door = g.world.entrancePortals.find(portal => portal.interiorReady);
  walk({ x: door.x, z: door.z });
  assert.equal(g.beginBuildingEntry(door.id), true);
  g.update(.05);
  assert.ok(g.entryTransition, 'entry is still in progress at the rent boundary');
  assert.equal(estate.finances().rentTotal, 27);
  assert.equal(slots.readSlot('auto').data.estate53.rentTotal, 0);

  // The rendererless harness does not schedule frames. Drive the normal entry
  // animation explicitly before each simulation step.
  for (let i = 0; i < 40 && g.entryTransition; i++) {
    g.updateBuildingEntry(.05);
    g.update(.05);
  }
  assert.equal(g.entryTransition, null);
  const checkpoint = slots.readSlot('auto').data;
  assert.equal(checkpoint.estate53.rentTotal, 27);
  assert.equal(checkpoint.profile.credits, g.profile.credits);
  assert.equal(g.stage19LoadNow('auto').ok, true);
  assert.equal(estate.finances().rentTotal, 27);
});

test('loading a stolen car keeps one copy and an earlier save reinstates its original parking spot', () => {
  estate.restore(null);
  g.restart({ reuseWorld: true });
  assert.equal(g.stage19SaveNow('slot1').ok, true);
  const car = g.parked.find(candidate => !candidate.market44 && candidate.alive && candidate.hp > 3);
  const origin = { x: car.x, z: car.z, paint: car.paint };
  const atOrigin = candidate => candidate.x === origin.x && candidate.z === origin.z && candidate.paint === origin.paint;

  walk(H.carFootWorld(car, -2.4, 0));
  g.keyDown({ code: 'KeyE', preventDefault() {} });
  assert.equal(g.player, car);
  assert.equal(g.inVehicle, true);
  assert.match(car.source53Id, /^street:/);
  car.x += 60;
  const movedX = car.x;
  assert.equal(g.stage19SaveNow('slot2').ok, true);
  assert.equal(g.stage19LoadNow('slot2').ok, true);
  assert.equal(g.inVehicle, true);
  assert.equal(g.player.source53Id, car.source53Id);
  assert.equal(g.player.x, movedX);
  assert.equal(g.parked.some(atOrigin), false);

  assert.equal(g.stage19LoadNow('slot1').ok, true);
  assert.equal(g.parked.filter(atOrigin).length, 1);
});
