'use strict';

const assert = require('node:assert/strict');
const { H, g, errors } = require('./stage51_bootstrap.cjs');
const world = g.world;
const api = H.airport54World;
const site = api?.setup(g);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const clear = (p,label) => {
  assert.ok(site.segmentClear(p), `${label} has standing clearance in its authored plan`);
  assert.ok(g.walkerPositionFree(p.x,p.z), `${label} is available in the real Game world`);
};

assert.ok(site, 'terrain, script and landmark configure the physical terminal before Game starts');
assert.equal(api.entry,site.entry);
assert.equal(api.floorY,site.floorY);
assert.ok(site.width>220 && site.depth>55);
assert.equal(site.gates.length,2);
assert.equal(site.queues.length,10);
assert.ok(site.seats.length>=140 && site.staff.length>=12);
assert.ok(site.lights.length>=25 && site.stats.pieces<1350);
assert.equal(world.parkedAirliners471.length,5);
assert.deepEqual(Array.from(world.parkedAirliners471,p=>[...H.reference469.pixels(p.x,p.z)].map(Math.round)),
  [[663,662],[708,661],[784,645],[898,617],[505,654]],'all five authored aircraft stands retain their surveyed coordinates');
assert.equal(H.reference469.runway.elevation,2.04);
assert.ok(!site.contains(world.parkedAirliners471[0].x,world.parkedAirliners471[0].z));
assert.equal(api.floorAt(world.parkedAirliners471[0].x,world.parkedAirliners471[0].z),null);
assert.ok(!world.solids.some(s=>Math.abs(s.x-site.x)<.01&&Math.abs(s.z-site.z)<.01&&s.hw>100),
  'the original whole-terminal obstacle is disabled');

function assertRoute(route,label) {
  assert.ok(route.length>1,`${label} has a route`);
  for(const [i,p] of route.entries()) {
    clear(p,`${label} point ${i}`);
    if (i) assert.ok(site.segmentClear(route[i-1],p),`${label} segment ${i} clears walls and furniture`);
  }
}

for (const [name,p] of Object.entries(site.positions)) clear(p,name);
for (const [name,route] of Object.entries(site.routes)) assertRoute(route,name);
assertRoute(site.offstage.entry,'curbside feeder');
for (const queue of site.queues) {
  assertRoute([queue.entry,...queue.points,queue.service],queue.id);
  assertRoute(site.path(queue.service,queue.exit),`${queue.id} exit`);
  assertRoute(site.path(site.positions.hub,queue.entry),`${queue.id} approach`);
}
for (const seat of site.seats) {
  clear(seat.approach,seat.id);
  assert.ok(seat.seatY>site.floorY+.4 && Number.isFinite(seat.yaw));
  assert.ok(site.path(site.positions.concourse,seat.approach).length>=2,`${seat.id} accessible from concourse`);
}
for (const staff of site.staff) clear(staff.point,staff.id);
for (const gate of site.gates) {
  assertRoute(site.path(gate.desk,gate.boarding),`gate ${gate.id} desk to boarding`);
  assertRoute(gate.board,`gate ${gate.id} ground boarding spur`);
  assert.ok(site.contains(gate.boarding.x,gate.boarding.z));
  assert.ok(!site.contains(gate.exit.x,gate.exit.z));
  assert.ok(H.marinaWalk444(gate.exit.x,gate.exit.z));
  assert.ok(!H.officerSightClear(gate.boarding.x,gate.boarding.z,gate.exit.x,gate.exit.z,
    world.nearby(gate.boarding.x,gate.boarding.z)),`gate ${gate.id} endpoint is screened from its doorway`);
}
assert.ok(!H.officerSightClear(site.entry.outside.x,site.entry.outside.z,site.offstage.arrival.x,site.offstage.arrival.z,
  world.nearby(site.entry.outside.x,site.entry.outside.z)), 'curbside passenger staging is screened from the main entrance');

function walkerAt(p,yaw=Math.PI) {
  const actor = H.createWalker(p.x,p.z,yaw,1);
  actor.y=H.walkerGround473(actor);
  return actor;
}
function move(actor,target,maxSteps=2500) {
  let largestStep=0;
  for (let i=0;i<maxSteps && distance(actor,target)>.16;i++) {
    const d=distance(actor,target);
    const heading=Math.atan2(actor.x-target.x,actor.z-target.z);
    const y=actor.y;
    H.stepWalker(actor,{ forward:Math.min(1,d*2.4),strafe:0,run:false,viewYaw:heading,outdoors:true,roadWorld:world },
      H.drivingSolids443(world,actor),1/60);
    largestStep=Math.max(largestStep,Math.abs(actor.y-y));
    assert.ok(Number.isFinite(actor.y));
  }
  return largestStep;
}
function follow(actor,points,label) {
  let largest=0;
  for (const p of points) {
    largest=Math.max(largest,move(actor,p));
    assert.ok(distance(actor,p)<.18,`${label} reaches ${p.x.toFixed(1)}, ${p.z.toFixed(1)} on foot`);
  }
  assert.ok(largest<.075,`${label} traverses the floor without a height jump (${largest})`);
}
const frontRamp = site.ramps[0];
const publicStart = site.point(frontRamp.u,frontRamp.a-1.3);
const hero = walkerAt(publicStart);
follow(hero,site.routes.entry,'public entrance');
assert.equal(hero.y,site.floorY);
assert.ok(api.contains(hero.x,hero.z));
follow(hero,site.routes.screening,'actual security passage');
for (const gate of site.gates) {
  const passenger = walkerAt(site.positions.concourse);
  follow(passenger,site.path(passenger,gate.desk),`concourse to ${gate.id}`);
  follow(passenger,site.path(passenger,gate.boarding),`${gate.id} to ramp`);
  follow(passenger,gate.board,`${gate.id} from terminal to apron`);
  follow(passenger,[...gate.board].reverse(),`${gate.id} from apron back to terminal`);
}
follow(hero,site.path(hero,site.entry.inside),'concourse to public exit');
follow(hero,[site.entry.threshold,site.entry.outside,publicStart],'public exit');
assert.ok(!api.contains(hero.x,hero.z));
const arrivalsStart=site.point(site.arrivals,site.front-13.5);
const arriving=walkerAt(arrivalsStart);
follow(arriving,[site.positions.arrivals],'second public entrance');
const panel=site.point(6,site.front-5.8);
const blocked=walkerAt(panel);
move(blocked,site.point(6,site.front+5.1),220);
assert.ok(!api.contains(blocked.x,blocked.z) && blocked.z<site.bounds.north-.46,'glazed facade stops foot collision');
const eye=p=>({...p,y:site.floorY+2.13});
const across=p=>g.cameraClearance(eye(site.point(p,site.front+3)),eye(site.point(p,site.front-3)),.45);
assert.ok(across(site.main).clearance>.97,'portal opening passes the real chase camera ray');
assert.ok(across(6).clearance<.75,'adjoining curtain wall blocks the real chase camera ray');
Object.assign(g,{ avatar:walkerAt(site.positions.concourse), inVehicle:false, onBus:-1, onTram:-1, footCameraYaw:Math.PI,
  running:true, paused:false, over:false, showFullMap:false });
Object.assign(g.cam,{ x:site.bounds.west-14,y:site.floorY+19,z:site.bounds.north-12 });
g.updateCamera(1/60);
assert.ok(site.contains(g.cam.x,g.cam.z) && g.cam.y<site.floorY+10.3,'chase camera stays below the canopy from within the terminal');
assert.equal(g.inside,false,'walking enters the shared world without a separate interior scene');
for (const h of [1,12,22]) {
  g.worldHour=h;
  const lights=g.sceneLights();
  assert.ok(lights.length<=12 && lights.some(l=>l.airport54&&l.r>=1.18&&l.radius>=10),
    'the active terminal contributes bounded real point lights throughout the day');
}
assert.ok(errors.length===0,errors.join('\n'));
console.log(JSON.stringify({ area:{width:site.width,depth:site.depth},...site.stats,
  piecesInWorld:world.boxes.filter(o=>o.airport54).length, seats:site.seats.length, queues:site.queues.length,
  staff:site.staff.length, lights:site.lights.length, signs:site.signs.length, aircraft:world.parkedAirliners471.length,
  tested:['real walker entry and exit','two-way apron doors','seating and queue routes','camera collision','lighting budget'] },null,2));
