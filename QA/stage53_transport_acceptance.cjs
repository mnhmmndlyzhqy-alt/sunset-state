'use strict';

const assert = require('node:assert/strict');
const { H, g } = require('./stage51_bootstrap.cjs');
const passed = [];
const check = (name, result, detail) => {
  assert.ok(result, detail === undefined ? name : `${name} ${JSON.stringify(detail)}`);
  passed.push(name);
};
const key = code => g.keyDown({ code, preventDefault() {} });
const release = (...codes) => codes.forEach(code => g.keys.delete(code));
const frames = n => { while (n-- > 0) g.update(1 / 30); };
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function place(at) {
  g.inVehicle = false;
  Object.assign(g.avatar, at, { y: H.outdoorHeight(at.x, at.z), grounded: true, support: null,
    deck443: false, coastDeck461: false, swim445: null, vx: 0, vz: 0, vy: 0 });
  g.keys.clear();
  g.updateHUD();
}
const board = b => ({ x: b.boardX, z: b.boardZ });
const gate = p => ({ x: p.entryX, z: p.entryZ });
const modeFree = () => !g.boat444 && !g.roofVisit && !g.flight51.pilot && !g.transport53.trip;

g.restart({ reuseWorld: true });
frames(1);
const f = g.flight51, p = f.plane;
place(f.site);
key('KeyE');
check('Airport boarding opens the keyboard and pointer flight deck', f.pilot && f.hud.deck && !f.hud.controls.hidden);
const deck = f.hud.deck;
check('Flight deck exposes six ways to act and a throttle slider', deck.axes.children.length === 5 &&
  deck.actions.children.length === 6 && Number(deck.slider.max) === 100);
deck.slider.value = '100';
deck.slider.dispatchEvent({ type: 'input' });
check('Throttle slider changes the actual throttle', p.throttle === 1);
key('KeyF');
check('Flap shortcut deploys while leaving tools holstered', p.flaps && !g.armed);
key('KeyT');
check('Runway tests start with the taxi limiter enabled', p.apron);
const pitch = deck.axes.children[1];
pitch.dispatchEvent({ type: 'pointerdown', pointerId: 4, button: 0, preventDefault() {} });
for (let i = 0; i < 145 && !p.airborne; i++) frames(1);
const rotationKmh = Math.round(p.speed * 3.6);
check('Using only throttle slider and pitch button takes off below clean rotation speed', p.airborne && !p.apron && rotationKmh < 126,
  { speedKmh: rotationKmh, plane: p, info: g.infoMessage });
pitch.dispatchEvent({ type: 'pointercancel', pointerId: 4 });
check('Cancelled touch releases the pitch control', !deck.held(['ArrowUp']));
const left = deck.axes.children[0];
left.dispatchEvent({ type: 'pointerdown', pointerId: 5, button: 0, preventDefault() {} });
frames(22);
check('Pointer bank changes the real airframe roll', f.pilot && p.airborne && p.bank < -.20, p);
left.dispatchEvent({ type: 'lostpointercapture', pointerId: 5 });
check('Lost pointer capture clears its held input', !deck.held(['ArrowLeft']));
key('KeyR'); key('KeyE');
check('Reset and exit leave no active transport', modeFree());

const t = g.transport53;
const marina = t.marina;
check('All five surveyed islands offer ferry docks and air pads', t.islands.length === 5 && t.islands.every(a => a.berth && a.pad));
check('All five island docks appear on the navigation map', t.islands.every(a => g.nav445.places.some(n => n.id === `island53:${a.id}`)));
const routeMetrics = [];
for (const island of t.islands) {
  const b = island.berth;
  check(`Island pier ${island.id} is walkable and its berth is in water`, H.marinaWalk444(b.boardX, b.boardZ) &&
    g.walkerPositionFree(b.boardX, b.boardZ) && H.boatWater444(b.x, b.z), b);
  const path = H.transport53.planWater(marina.berth, b);
  let valid = !!path?.length, previous = marina.berth, length = 0;
  for (const point of path || []) {
    valid &&= H.transport53.waterLine(previous, point);
    length += d(previous, point);
    previous = point;
  }
  check(`Ferry route to ${island.id} remains in water`, valid && d(previous, b) < .005 && length > 0,
    { island: island.id, path: path?.length, distance: length });
  const home = H.transport53.planWater(b, marina.berth);
  check(`Ferry route back from ${island.id} exists`, !!home?.length);
  routeMetrics.push({ island: island.id, routeM: Math.round(length), waypoints: path.length });
}

const shell = t.islands.find(a => a.id === 'shell');
const reef = t.islands.find(a => a.id === 'reef');
place(board(marina.berth));
key('KeyB');
check('Harbor destination menu offers the ferries', t.selected && t.hud.destinations.children.length >= 5 && !t.hud.destinations.hidden);
const ferry = Array.from(t.hud.destinations.children).find(b => b.textContent.includes(shell.name));
ferry.click();
check('Selecting an island boards a moving ferry at the mainland berth', t.trip?.kind === 'ferry' && d(g.boat444, marina.berth) < .02);
key('KeyE');
check('Passenger ferry holds its seat until the destination', t.trip && g.boat444);
frames(30);
check('Normal Game update moves the ferry through navigable water', d(g.boat444, marina.berth) > 4 &&
  H.boatWater444(g.boat444.x, g.boat444.z));
for (let i = 0; i < 6500 && t.trip.phase !== 'arrived'; i++) g.updateMarina444(.05);
const ferrySeconds = t.trip.elapsed;
check('Ferry reaches the island dock in elapsed simulation time', t.trip.phase === 'arrived' && ferrySeconds > d(marina.berth, shell.berth) / 38 &&
  d(g.boat444, shell.berth) < .02 && g.boat444.velocity === 0 && Math.abs(H.angleDiff(g.boat444.yaw, shell.berth.yaw)) < .01, t.trip);
key('KeyE');
check('Ferry arrival exits onto a safe island pier', modeFree() && d(g.avatar, board(shell.berth)) < 3 &&
  g.walkerPositionFree(g.avatar.x, g.avatar.z));
key('KeyE');
check('The island pier also boards a manually steered skiff', g.boat444 && !t.trip && g.boat444.id.startsWith('island:'));
const heading = H.transport53.planWater(shell.berth, marina.berth)[0], boat = g.boat444;
boat.yaw = Math.atan2(boat.x - heading.x, boat.z - heading.z);
key('KeyW'); frames(18); release('KeyW');
check('Manual island skiff accelerates from the berth on water', d(boat, shell.berth) > .6 && boat.velocity > 2 &&
  H.boatWater444(boat.x, boat.z), boat);
check('A moving manual boat save retains the pier instead of open water', g.stage19SaveNow('slot2').ok &&
  d(H.stage19Save.readSlot('slot2').data.avatar, board(shell.berth)) < 3);
key('Space'); frames(14); release('Space');
check('Space brakes the manual skiff below docking speed', Math.abs(boat.velocity) < 2.45);
key('KeyE');
check('A manual boat can dock and return full control to the walker', modeFree() && d(g.avatar, board(shell.berth)) < 3);

place(gate(t.airport.pad));
key('KeyB');
const air = Array.from(t.hud.destinations.children).find(b => b.textContent.includes(reef.name));
check('Airport destination menu offers an island passenger flight', !!air);
air.click();
check('Island air service starts at the mainland helipad', t.trip?.kind === 'air' && g.roofVisit?.pilot &&
  d(g.roofVisit.aircraft, t.airport.pad) < .02 && !g.boat444);
frames(48);
check('Passenger helicopter physically climbs before travelling laterally', g.roofVisit.aircraft.y > t.airport.pad.y + 12 &&
  d(g.roofVisit.aircraft, t.airport.pad) < .02);
check('While aboard, saves resolve to the sky service departure point', d(H.transport53.saveAnchor(g), gate(t.airport.pad)) < 3 &&
  g.stage19SaveNow('slot1').ok && d(H.stage19Save.readSlot('slot1').data.avatar, gate(t.airport.pad)) < 3);
for (let i = 0; i < 5500 && t.trip.phase !== 'arrived'; i++) g.updatePublicRoof(.05);
const flightSeconds = t.trip.elapsed;
check('Helicopter cruises across to the destination and descends onto its pad', t.trip.phase === 'arrived' && flightSeconds > 18 &&
  d(g.roofVisit.aircraft, reef.pad) < .02 && g.roofVisit.aircraft.y < reef.pad.y + 4.5, t.trip);
key('KeyE');
check('Passenger flight releases the player to walk around the island', modeFree() && d(g.avatar, gate(reef.pad)) < 3);
key('KeyE');
check('Island helipad supports independent manual helicopter boarding', g.roofVisit?.pilot && !t.trip);
key('Space'); frames(20); release('Space');
check('Manual helicopter can lift off from the island pad', g.roofVisit.aircraft.y > reef.pad.y + 2.1);
check('Loading the in-flight save clears caches and restores the grounded departure', g.stage19LoadNow('slot1').ok && modeFree() &&
  g.avatar.grounded && d(g.avatar, gate(g.transport53.airport.pad)) < 3);

console.log(JSON.stringify({ passed: passed.length, rotationKmh, ferrySeconds: +ferrySeconds.toFixed(2),
  flightSeconds: +flightSeconds.toFixed(2), routes: routeMetrics, checks: passed }, null, 2));
