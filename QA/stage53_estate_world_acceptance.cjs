'use strict';

const assert = require('node:assert/strict');
const { H, g } = require('./stage51_bootstrap.cjs');
const api = H.estate53World;
const economy = H.estate53;
const world = g.world;
const island = api.setup(g);
assert.ok(island && island === world.estate53 && island.terrainParts > 1700);
assert.equal(world.islandPorts53.filter(p => p.id === 'estate').length, 1);
const ports = world.islandPorts53;
assert.equal(api.setup(g), island);
assert.equal(world.islandPorts53, ports, 'setup preserves transport graph identity');
assert.ok(world.islandPorts53.some(p => p.id === 'sunset'), 'retain the other islands');

const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const free = (x,z,r) => !world.nearby(x,z).some(s => Math.hypot(
  x-H.clamp(x,s.x-s.hw,s.x+s.hw), z-H.clamp(z,s.z-s.hd,s.z+s.hd)) < r);
const walkAt = p => {
  const a=H.createWalker(p.x,p.z,0,1);
  a.y=H.walkerGround473(a);
  return a;
};
const walk = (actor, to) => {
  const maxSteps=Math.ceil(near(actor,to)/6*60)+100;
  for(let i=0;i<maxSteps&&near(actor,to)>.43;i++) {
    const yaw=Math.atan2(actor.x-to.x,actor.z-to.z);
    H.stepWalker(actor,{forward:1,strafe:0,run:false,viewYaw:yaw,outdoors:true,roadWorld:world},
      H.drivingSolids443(world,actor),1/60);
  }
  assert.ok(near(actor,to)<.5, 'walker reached '+JSON.stringify(to)+' from '+JSON.stringify([actor.x,actor.z]));
};

const r=api.runway;
for(let x=r.west;x<=r.east;x+=10) for(const z of [r.north,r.z,r.south]) {
  assert.equal(api.height(x,z),r.elevation);
  assert.equal(H.outdoorHeight(x,z),r.elevation);
  assert.ok(H.isAsphalt(x,z)&&H.marinaWalk444(x,z)&&api.drivable(x,z)&&!H.boatWater444(x,z));
  assert.ok(free(x,z,5),'keep runway edge free of solids');
}
assert.ok(api.height(2048,432)>15 && api.coast(2048,432)>0,'hillside terrain is physically elevated');
assert.ok(H.boatWater444(1260,341)&&H.boatWater444(1300,351),'continuous estate water corridor');
assert.ok(!H.boatWater444(1300,345)&&api.walkable(1300,345),'pier blocks boats and supports walkers');

const berth=api.port.berth, dock=walkAt({x:berth.boardX,z:berth.boardZ});
assert.ok(dock.y>.5&&dock.y<1);
walk(dock,{x:1390,z:345});
assert.ok(dock.y>2.5);
walk(dock,{x:api.port.pad.entryX,z:api.port.pad.entryZ});
walk(dock,api.port.pad);
assert.equal(dock.y,api.port.pad.y);
assert.ok(H.marinaWalk444(120,-80) && !api.containsLand(120,-80));

const car=H.makeCar('player',api.port.carDrop.x,api.port.carDrop.z,api.port.carDrop.yaw,2);
for(let i=0;i<145;i++) g.moveCar(car,1/60,{gas:.55,steer:0,brake:false,nitro:false});
assert.ok(car.x>1433&&car.x<1463,'actual car step uses the approach road: '+[car.x,car.z,car.speed]);
assert.ok(Math.abs(car.z-345)<1.5 && !car.wrecked);

for(const s of api.slots.plane) {
  assert.equal(s.y,r.elevation);
  assert.ok(free(s.x,s.z,22),'all airframe slots retain their wing and tail clearance');
}
assert.ok(api.slots.plane.every((a,i,l)=>i===0||near(a,l[i-1])>=54));
for(const s of api.slots.boat)
  assert.ok(H.boatWater444(s.x,s.z)&&H.marinaWalk444(s.boardX,s.boardZ)&&free(s.boardX,s.boardZ,.52));
assert.ok(api.slots.car.every(s=>api.drivable(s.x,s.z)&&free(s.x,s.z,1.75)));

assert.equal(economy.units().length,0, 'rental units start unavailable');
const before=world.boxes.length;
const base=economy.snapshot();
for(const p of island.plots) assert.ok(free(p.x,p.z,2),'vacant plots have no free building');
Object.assign(g,{running:true,over:false,paused:false,indoor:null,inVehicle:false,boat444:null,
  onBus:-1,onTram:-1,showFullMap:false,missionBoardOpen:false,avatar:walkAt(island.office)});
assert.ok(economy.onOffice(g));
g.profile.credits=500000;
const pay = (key, count=1) => {
  for(let i=0;i<count;i++) {
    const prior=g.profile.credits, result=economy.purchase(g,key);
    assert.ok(result.ok,key+' paid purchase '+result.message);
    assert.ok(g.profile.credits<prior);
  }
};
pay('housing',1);
assert.equal(economy.units().length,2);
assert.ok(!free(island.plots[0].x,island.plots[0].z,1));
assert.ok(free(island.plots[1].x,island.plots[1].z,1));
pay('furniture',2);
pay('housing',2);
for(const key of ['water','power','garden','harbor','garage','hangar','security']) pay(key,2);
pay('cafe');
assert.equal(world.estate53.improvements.housing,3);
const stable=world.boxes.length;
assert.ok(stable>before+150);
api.sync(g);
assert.equal(world.boxes.length,stable,'world sync is idempotent');
assert.deepEqual(Array.from(economy.units(),x=>x.id),Array.from(island.units,x=>x.id));

for(const unit of island.units) {
  const resident=walkAt(unit.walk.at(-1));
  for(const point of unit.walk.slice(0,-1).reverse()) walk(resident,point);
  assert.ok(free(unit.door.x,unit.door.z,.57));
  walk(resident,unit.interior);
  assert.ok(resident.z>island.rooms.get(unit.id).front+2.5,'actual furnished apartment entrance remains walkable');
  walk(resident,unit.door);
}
const viewUnit=island.units[0];
const avatarAtOffice=g.avatar;
g.avatar=walkAt(viewUnit.door);
assert.ok(api.ownsInteraction(g));
g.toggleVehicle();
assert.ok(island.rooms.get(viewUnit.id).hold>g.seconds,'E triggers the sliding door at its real threshold');
g.avatar=walkAt(viewUnit.interior);
g.updateCamera(.016);
const room=island.rooms.get(viewUnit.id);
assert.ok(g.cam.x>room.west&&g.cam.x<room.east&&g.cam.z>room.front&&g.cam.z<room.back);
assert.equal(g.sceneLights()[0],room.light);
g.avatar=avatarAtOffice;
for(const [start,end] of island.roads.flatMap(p=>p.slice(1).map((end,i)=>[p[i],end]))) {
  const n=Math.ceil(near(start,end)/4);
  for(let i=0;i<=n;i++) {
    const x=H.lerp(start.x,end.x,i/n), z=H.lerp(start.z,end.z,i/n);
    assert.ok(free(x,z,1.49),'road centerline remains clear after paid development: '+[x,z]);
  }
}

const candidate=economy.invite(g,'maya');
assert.ok(candidate.ok&&candidate.unit?.id);
const offered=economy.offer(g,'maya',candidate.unit.id,12);
assert.ok(offered.ok&&offered.status==='accepted'&&!island.actors.has('maya'));
assert.ok(economy.approve(g,'maya').ok);
const resident=island.actors.get('maya');
assert.equal(resident.estateUnit.id,candidate.unit.id);
assert.ok(near(resident,resident.estateUnit.door)<.01);
resident.estateRest=0;
g.update(.035);
assert.ok(near(resident,resident.estateUnit.door)>.01&&resident.y===api.height(resident.x,resident.z));
const originalReaction=H.realism39.sayReaction53;
const reactions=[];
H.realism39.sayReaction53=(game,actor,kind)=>{if(actor===resident) reactions.push(kind);};
g.avatar=walkAt({x:resident.x,z:resident.z-3.3});
g.update(.05);
assert.equal(resident.estateActivity53,'greeting');
assert.equal(reactions.filter(x=>x==='greet').length,1);
for(let i=0;i<12;i++) g.update(.05);
assert.equal(reactions.filter(x=>x==='greet').length,1,'one greeting per approach');
const previousChat=H.realism39.chat48;
H.realism39.chat48={...previousChat,active:{game:g,who:resident}};
const talked={x:resident.x,z:resident.z};
g.update(.05);
assert.equal(resident.estateActivity53,'conversation');
assert.ok(near(talked,resident)<.001&&!resident.vx&&!resident.vz);
H.realism39.chat48=previousChat;
g.avatar=avatarAtOffice;
resident.estateLookUntil=0;

const danger=H.makeCar('civilian',resident.x-6.6,resident.z,-Math.PI/2,1);
danger.vx=8.4; danger.vz=0;
g.parked.push(danger);
const safeBefore={x:resident.x,z:resident.z};
g.update(.05);
assert.equal(resident.estateActivity53,'alert');
assert.ok(resident.panic>0&&reactions.includes('warning'));
assert.ok(near(safeBefore,resident)>.045&&free(resident.x,resident.z,.34),'steps clear of an approaching road vehicle');
g.parked.splice(g.parked.indexOf(danger),1);
for(let i=0;i<95&&resident.estateAvoid;i++) g.update(.08);
assert.ok(!resident.estateAvoid&&!resident.panic,'resident calmly resumes the same route after the vehicle passes');
assert.ok(near(safeBefore,resident)<.21&&resident.estateUnit.id===candidate.unit.id);
H.realism39.sayReaction53=originalReaction;

const home=resident.estateUnit.interior;
const visited=new Set();
for(let i=0;i<3;i++) {
  Object.assign(resident,home,{estateIndex:0,estateDirection:-1,estateRest:0,estateLookUntil:0});
  g.update(.05);
  visited.add(resident.estateTrip);
  const route=resident.estateRoute;
  const probe=walkAt(route[0]);
  for(const point of route.slice(1)) walk(probe,point);
}
assert.deepEqual([...visited].sort(),['garden','social','stroll']);
assert.equal(resident.estateUnit.id,candidate.unit.id);
const camera=resident.estateUnit.walk[1];
Object.assign(g.cam,camera,{y:resident.y+2.2,tx:resident.x,ty:resident.y+1.4,tz:resident.z});
const old=H.realism39.renderer;
H.realism39.renderer={...old,rcCharacters:{}};
g.buildDynamic();
assert.ok(H.realism39.characterQueue.some(q=>near(q,resident)<.01),'approved resident submits an actual skinned actor');
H.realism39.renderer=old;

economy.restore(base);
api.sync(g);
assert.equal(island.actors.size,0);
assert.equal(world.boxes.length,before);
assert.ok(island.plots.every(p=>free(p.x,p.z,1)), 'loading earlier state releases paid building and spatial collision geometry');

const canvasPoints=[];
const ctx=new Proxy({}, {get:(_t,k)=> (x,y)=>{ if(k==='moveTo'||k==='lineTo') canvasPoints.push([x,y]); }});
api.paintMap(ctx,world,(x,z)=>[(x-api.mapBounds.west)/8,(z-api.mapBounds.north)/8]);
assert.ok(canvasPoints.length>60&&canvasPoints.every(p=>p.every(Number.isFinite)));
console.log('Stage 53 private island world acceptance passed (Game, terrain, navigation, economy and character queue).',
  { terrainParts:island.terrainParts, paidGeometry:stable-before, units:island.units.length });
