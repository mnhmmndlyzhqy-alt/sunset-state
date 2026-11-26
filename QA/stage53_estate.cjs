'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.SUNSET_QA_SEED ||= '53';
process.env.SUNSET_QA_EXTRA_SCRIPTS ||= 'assets/stage53_estate.js';
const { H, g, document } = require('./stage51_bootstrap.cjs');
const estate = H.estate53;
if (!estate) throw Error('Stage 53 estate module was not loaded');

const state = () => JSON.parse(JSON.stringify(estate.snapshot()));
const asJSON = x => JSON.parse(JSON.stringify(x));
const wallet = () => g.profile.credits;
let originalSchema19;
function office() {
  Object.assign(g, { running: true, paused: false, over: false, inVehicle: false, indoor: null, retailVisit: null,
    boat444: null, roofVisit: null, onBus: -1, onTram: -1, entryTransition: null, exitTransition: null, vehicleEntry: null });
  if (g.flight51) g.flight51.pilot = false;
  const at = g.world.estate53?.office || { x: 1750, z: 480 };
  Object.assign(g.avatar, at, { grounded: true, swim445: null, coastDeck461: false, deck443: false, support: null });
  g.avatar.y = H.walkerGround473(g.avatar);
  assert.equal(estate.onOffice(g), true);
}
function clock(seconds) {
  for (let i = 0; i < Math.floor(seconds); i++) estate.tick(g, 1);
  const fraction = seconds - Math.floor(seconds);
  if (fraction) estate.tick(g, fraction);
}

test('the island is owned at start and housing, furnishings and vehicle facilities require actual payment', () => {
  g.restart({ reuseWorld: true });
  office();
  estate.restore(null);
  g.profile.credits = 450;
  originalSchema19 = asJSON(H.stage19Save.capture(g));
  delete originalSchema19.estate53;
  assert.equal(state().owned, true);
  assert.equal(estate.units().length, 0);
  assert.equal(estate.residents().length, 0);
  assert.deepEqual(['car', 'plane', 'boat'].map(estate.capacity), [1, 1, 1]);
  assert.equal(estate.purchase(g, 'furniture').ok, false);
  assert.equal(wallet(), 450);
  assert.equal(estate.purchase(g, 'housing').ok, true);
  assert.equal(wallet(), 190);
  assert.deepEqual(Array.from(estate.units(), u => u.id), ['a1', 'a2']);
  assert.equal(estate.purchase(g, 'hangar').ok, false);
  assert.equal(estate.purchase(g, 'furniture').ok, true);
  assert.equal(wallet(), 85);
  assert.equal(estate.purchase(g, 'water').ok, true);
  assert.equal(wallet(), 5);
  assert.equal(estate.upgradeLevel('harbor'), 0);
  assert.equal(estate.purchase(g, 'cafe').ok, false);
  const x = g.avatar.x;
  g.avatar.x -= 70;
  assert.equal(estate.purchase(g, 'housing').ok, false);
  assert.equal(estate.openPanel(g), false);
  g.avatar.x = x;
  assert.equal(estate.openPanel(g), true);
  assert.equal(document.getElementById('estate53').hidden, false);
});

test('tenants choose eligible vacancies and take no occupancy until both parties agree', () => {
  office();
  estate.restore(null);
  g.profile.credits = 1000;
  assert.equal(estate.purchase(g, 'housing').ok, true);
  assert.equal(estate.offer(g, 'lior', 'a1', 30).status, 'declined');
  assert.match(estate.offer(g, 'lior', 'a1', 30).message, /מים/);
  const selected = estate.invite(g, 'maya');
  assert.equal(selected.ok, true);
  assert.equal(selected.unit.id, 'a1');
  assert.ok(selected.rent > 12 && selected.rent <= 65);
  assert.equal(estate.offer(g, 'maya', 'a1', 260).status, 'declined');
  assert.equal(estate.approve(g, 'maya').ok, false);
  assert.equal(state().leases.length, 0);
  assert.equal(estate.offer(g, 'maya', 'a1', selected.rent).status, 'accepted');
  assert.equal(estate.offer(g, 'noam', 'a1', 25).ok, false);
  const second = estate.invite(g, 'noam');
  assert.equal(second.unit.id, 'a2');
  const counter = estate.offer(g, 'noam', 'a2', 85);
  assert.equal(counter.status, 'counter');
  assert.ok(counter.rent < 75 && counter.rent > 12);
  assert.equal(estate.approve(g, 'noam').ok, false);
  assert.equal(estate.acceptCounter(g, 'noam').ok, true);
  assert.equal(estate.residents().length, 0);
  assert.equal(estate.finances().gross, 0);
  const before = wallet();
  clock(120);
  assert.equal(wallet(), before - estate.finances().upkeep);
  assert.equal(estate.finances().rentTotal, 0);
  assert.equal(estate.approve(g, 'maya').ok, true);
  assert.equal(estate.approve(g, 'noam').ok, true);
  assert.equal(estate.approve(g, 'noam').ok, false);
  assert.equal(estate.offer(g, 'lior', 'a2', 40).ok, false);
  assert.deepEqual(Array.from(estate.residents(), r => [r.id, r.unit]), [['maya', 'a1'], ['noam', 'a2']]);
  assert.equal(estate.units().filter(u => u.occupiedBy).length, 2);
  assert.equal(estate.finances().gross, selected.rent + counter.rent);
});

test('rent accrues exactly once per signed lease and displays upkeep and debt', () => {
  const before = wallet(), leased = estate.finances();
  clock(119.5);
  assert.equal(wallet(), before);
  assert.ok(state().leases.every(l => l.accrued === 119.5));
  g.paused = true;
  clock(20);
  g.paused = false;
  assert.ok(state().leases.every(l => l.accrued === 119.5));
  clock(.5);
  assert.equal(wallet(), before + leased.net);
  assert.equal(estate.finances().rentTotal, leased.gross);
  assert.ok(state().leases.every(l => l.accrued === 0));
  clock(13.25);
  assert.equal(wallet(), before + leased.net);
  assert.ok(state().leases.every(l => l.accrued === 13.25));
  assert.equal(estate.purchase(g, 'housing').ok, true);
  const proposal = estate.invite(g, 'lior');
  assert.equal(proposal.ok, false);
  assert.equal(estate.purchase(g, 'water').ok, true);
  assert.equal(estate.invite(g, 'lior').ok, true);
  assert.equal(estate.offer(g, 'lior', 'b1', 43).status, 'accepted');
  g.profile.credits = 0;
  const unpaid = estate.finances().upkeep;
  // Preserve the signed leases and move only the maintenance service clock to its next bill.
  const adjustment = state();
  adjustment.upkeepElapsed = 119.5;
  estate.restore(adjustment);
  clock(.5);
  assert.equal(estate.finances().debt, unpaid);
  assert.equal(estate.finances().condition, 95);
  g.profile.credits = 40;
  assert.equal(estate.payDebt(g).ok, true);
  assert.equal(wallet(), 40 - unpaid);
  assert.equal(estate.finances().debt, 0);
});

test('manual and automatic slots store the same wallet, signed leases and unsettled offers atomically', () => {
  const expected = state(), amount = wallet();
  const sys = g.stage19SaveSystem;
  assert.equal(typeof sys.saveAuto, 'function', 'integrated Stage 19 autosave');
  assert.equal(g.stage19SaveNow('slot2').ok, true);
  assert.equal(sys.saveAuto().ok, true);
  for (const slot of ['slot2', 'auto']) {
    const s = H.stage19Save.readSlot(slot).data;
    assert.deepEqual(asJSON(s.estate53), expected);
    assert.equal(s.profile.credits, amount);
  }
  estate.restore({ ...expected, negotiations: [], leases: [] });
  g.profile.credits += 173;
  assert.equal(g.stage19LoadNow('slot2').ok, true);
  assert.equal(wallet(), amount);
  assert.deepEqual(state(), expected);
});

test('versioned state rejects duplicate leases and absent estate fields restore a bare island', () => {
  const prior = state();
  const corrupt = structuredClone(prior);
  corrupt.leases.push({ ...corrupt.leases[0], unit: 'b2' });
  corrupt.leases.push({ applicant: 'sara', unit: 'a1', rent: 22, accrued: -10 });
  corrupt.leases.push({ applicant: 'yael', unit: 'c1', rent: 22, accrued: 0 });
  estate.restore(corrupt);
  assert.deepEqual(state().leases, prior.leases);
  assert.equal(H.stage19Save.apply(g, originalSchema19).mode, 'foot');
  assert.equal(state().owned, true);
  assert.equal(estate.units().length, 0);
  assert.equal(estate.residents().length, 0);
  assert.equal(state().negotiations.length, 0);
  assert.equal(wallet(), originalSchema19.profile.credits);
});
