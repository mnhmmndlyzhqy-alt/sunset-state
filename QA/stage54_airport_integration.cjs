'use strict';
// Real Game, collision, navigation, input and save integration. The DOM/audio/
// rendering surface is simulated: this file supplies no GPU or listening claim.
const assert = require('node:assert/strict');
process.env.SUNSET_QA_SEED ||= '54';
const { H, g, document, warnings, errors, scripts, dispatch } = require('./stage51_bootstrap.cjs');
const checks = [], failures = [];
const test = (name, fn) => { try { fn(); checks.push(name); } catch(error) { failures.push({name,error:String(error.stack)}); console.error(name+'\n'+error.stack); } };
const near = (a,b) => Math.hypot(a.x-b.x,a.z-b.z) < .001;
const key = code => g.keyDown({code,repeat:false,preventDefault(){}});
const door = p => ({x:p.x+Math.sin(p.yaw)*9+Math.cos(p.yaw)*6,z:p.z+Math.cos(p.yaw)*9-Math.sin(p.yaw)*6});
function place(p) {
  Object.assign(g,{running:true,paused:false,over:false,inVehicle:false,indoor:null,retailVisit:null,
    boat444:null,roofVisit:null,onBus:-1,onTram:-1,showFullMap:false,missionBoardOpen:false,garageOpen:false,
    entryTransition:null,exitTransition:null,vehicleEntry:null});
  g.flight51.pilot=false; g.keys.clear(); document.hidden=false;
  Object.assign(g.avatar,p,{y:p.y??H.outdoorHeight(p.x,p.z),grounded:true,deck443:false,coastDeck461:false,swim445:null,vx:0,vy:0,vz:0});
}
(async()=>{
  await new Promise(resolve=>setImmediate(resolve));
  g.restart({reuseWorld:true});
  const a=g.world.airport54, life=H.airport54Life, service=H.airport54Services, chat=H.realism39.chat48;
  place(a.entry.inside);
  test('Both terminal modules precede services in the actual entry point',()=>{
    const order=['assets/stage54_airport_world.js','assets/stage54_airport_life.js','assets/stage54_airport_services.js'].map(s=>scripts.indexOf(s));
    assert.ok(order.every(i=>i>0)); assert.ok(order[0]<order[1]&&order[1]<order[2]);
    assert.equal(!!g.inside,false); assert.ok(a.gates.length===2&&a.queues.length>=8&&a.seats.length>=80);
  });
  test('All service desks have reachable, correctly elevated interaction points',()=>{
    for(const spot of service.spots(g)) {
      place(spot.point);
      assert.ok(g.walkerPositionFree(spot.point.x,spot.point.z),spot.id+' is inside a collision footprint');
      assert.equal(service.near(g)?.id,spot.id,spot.id+' cannot be used');
      g.avatar.y+=3; assert.equal(service.near(g),null,spot.id+' reachable from another floor');
    }
  });
  test('E opens a live airport board before boarding or a nearby conversation',()=>{
    place(a.entry.inside); key('KeyE');
    assert.equal(service.active.game,g); assert.equal(chat.active,null); assert.equal(g.flight51.pilot,false);
    assert.equal(document.getElementById('airport-services54').hidden,false);
    const board=document.getElementById('airport-services54').querySelector('tbody');
    assert.ok(board); assert.equal(board.children.length,service.flights(g).length);
    assert.ok(board.children.length>=2);
    for(const f of service.flights(g)) assert.ok(board.textContent.includes(f.code)&&board.textContent.includes(f.destination));
    key('KeyK'); assert.equal(g.missionBoardOpen,false); assert.equal(service.active.game,g);
    g.keys.add('KeyW'); assert.equal(g.is('KeyW'),false);
    const focus=document.activeElement, before=board.textContent;
    for(let i=0;i<40;i++){life.tick(g,.05);g.seconds+=.05;}
    service.tick(g);
    assert.equal(document.activeElement,focus); assert.notEqual(board.textContent,before);
    assert.equal(g.keys.size,0);
    key('Escape'); assert.equal(service.active,null);
    assert.equal(document.getElementById('airport-services54').hidden,true);
  });
  test('Airport boards close on pause, map, focus loss and leaving their desk',()=>{
    for(const change of [()=>{g.paused=true;},()=>{g.showFullMap=true;},()=>{document.hidden=true;dispatch('document:visibilitychange');},()=>{g.avatar.x+=10;}]) {
      place(a.entry.inside); assert.equal(service.open(g),true); change(); service.tick(g); assert.equal(service.active,null);
    }
    place(a.entry.inside);service.open(g);g.togglePause();assert.equal(service.active,null);g.paused=false;
  });
  test('Terminal waypoints retain their selected gate and follow walkable interior routes',()=>{
    place(a.entry.inside);
    for(const d of service.destinations(g)) {
      assert.equal(service.guide(g,d.id),true,d.id+' cannot be selected');
      assert.equal(g.nav445.target.id,'airport54:'+d.id);assert.ok(near(g.nav445.target,d.point));
      assert.ok(!/שער שער/.test(g.nav445.target.name));
      if(a.contains(d.point.x,d.point.z)) {
        assert.ok(g.nav445.route?.points.length>1,d.id+' lacks an interior path');
        const points=g.nav445.route.points;
        for(let i=1;i<points.length;i++) assert.ok(a.segmentClear(points[i-1],points[i]),d.id+' route crosses a fixture');
      }
    }
    const pad=g.world.airportPad53;
    const heli=service.destinations(g).find(d=>d.id==='helicopter');
    assert.ok(near(heli.point,{x:pad.entryX,z:pad.entryZ}));
    place(heli.point);assert.ok(H.transport53.get(g).station(),'helipad marker misses the real B interaction');
    g.nav445.clear();
  });
  test('Passengers speak about their real name, flight, destination and current task',()=>{
    place(a.positions.hub);
    const who=[...life.actors(g)].find(w=>w.airport54Role==='passenger'&&life.stateOf(w).flight);
    assert.ok(who);const state=life.stateOf(who),before={x:who.x,y:who.y,z:who.z};
    Object.assign(who,a.positions.hub);place({...a.positions.hub,x:a.positions.hub.x-1.1});
    assert.equal(chat.canContinue(g,who),true);
    const text=s=>chat.think(who,s).parts.join(' ');
    assert.ok(text('איך קוראים לך?').includes(who.airport54Name));
    const travel=text('לאן אתה טס?');assert.ok(travel.includes(state.flightCode)&&travel.includes(state.destination));
    assert.ok(text('מה אתה עושה?').length>18);
    chat.think(who,'קוראים לי מנדי');assert.match(text('מה השם שלי?'),/מנדי/);
    chat.open(who);assert.equal(chat.active.who,who);chat.close();Object.assign(who,before);
  });
  test('Airport chats cannot continue through walls, different levels or transport transitions',()=>{
    place(a.positions.hub);const who=[...life.actors(g)].find(w=>w.airport54Role==='passenger');
    const before={x:who.x,y:who.y,z:who.z};
    Object.assign(who,a.positions.hub);place({...a.positions.hub,x:a.positions.hub.x-1.1});
    for(const [key,value] of [['onBus',0],['onTram',0],['garageOpen',true],['roofVisit',{}],['exitTransition',{}],['vehicleEntry',{}]]) {
      const old=g[key];g[key]=value;assert.equal(chat.canContinue(g,who),false,key);g[key]=old;
    }
    who.y+=4;assert.equal(chat.canContinue(g,who),false);who.y-=4;
    const x=a.bounds.west+8,z=a.bounds.north;
    Object.assign(who,{x,y:a.floorY,z:z+.9});place({x,y:a.floorY,z:z-.9});
    assert.equal(chat.canContinue(g,who),false,'closed facade permits a conversation');
    Object.assign(who,before);
  });
  test('Walking into the terminal never teleports into a plane, while original aircraft doors work',()=>{
    place(g.flight51.site);assert.equal(g.flight51.boardingCandidate(),null);
    const plane=g.world.parkedAirliners471[0];place(door(plane));
    const candidate=g.flight51.boardingCandidate();assert.equal(candidate?.plane,plane);assert.equal(candidate?.kind,'stand');
    key('KeyE');assert.equal(g.flight51.pilot,true);assert.equal(g.flight51.plane,plane);assert.equal(service.active,null);
    key('KeyE');assert.equal(g.flight51.pilot,false);
  });
  test('A terminal save restores the player on the interior floor without an open dialog',()=>{
    place(a.positions.hub);const before={x:g.avatar.x,y:g.avatar.y,z:g.avatar.z};
    assert.equal(g.stage19SaveNow('slot2').ok,true);
    place(a.entry.outside);const result=g.stage19LoadNow('slot2');assert.equal(result.ok,true);
    assert.ok(near(g.avatar,before));assert.ok(Math.abs(g.avatar.y-a.floorY)<.2);assert.equal(service.active,null);
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(warnings.every(w=>w.includes('AudioContext is not defined')),warnings.join('\n'));
  assert.equal(failures.length,0,JSON.stringify(failures,null,2));
  console.log(JSON.stringify({passed:checks.length,checks,airport:{seats:a.seats.length,queues:a.queues.length,passengers:life.state(g).pool.filter(w=>w.airport54Role==='passenger').length},browser:false,gpu:false,audioPlayback:false},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
