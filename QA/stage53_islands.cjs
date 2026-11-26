'use strict';
const assert=require('node:assert/strict');
process.env.SUNSET_QA_SEED||='53';
const {H,g,warnings,errors}=require('./stage51_bootstrap.cjs');
const state=H.islands53.setup(g),results=[];
const check=(name,fn)=>{fn();results.push(name);};
g.inVehicle=false;g.parked=[];g.civilian=[];g.police=[];g.pedestrians=[];g.wrecks=[];g.trams=[];
g.roofVisit=g.boat444=g.indoor=g.retailVisit=null;g.onBus=g.onTram=-1;
const reset=p=>Object.assign(g.avatar,p,{y:H.outdoorHeight(p.x,p.z),deck443:false,coastDeck461:false,swim445:null,grounded:true,vx:0,vz:0,vy:0});
const probePath=(path,name)=>{
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/.5);let last=null;
  for(let j=0;j<=n;j++){
   const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};reset(p);
   assert.ok(g.walkerPositionFree(p.x,p.z),name+' blocked at '+JSON.stringify(p));
   assert.ok(H.marinaWalk444(p.x,p.z),name+' unsupported at '+JSON.stringify(p));
   assert.ok(!H.canSwim445(p.x,p.z),name+' incorrectly starts swimming');
   const h=H.walkerGround473(g.avatar);assert.ok(Number.isFinite(h));
   if(last!==null)assert.ok(Math.abs(h-last)<.51,name+' vertical discontinuity '+Math.abs(h-last));
   last=h;
  }
 }
};
check('five public island docks and six helipads have finite geometry',()=>{
 assert.equal(state.ports.length,5);assert.equal(state.pads.length,6);assert.equal(state.errors.length,0);
 for(const p of state.ports){assert.equal(p.palms,8);assert.ok(p.cafe);assert.ok(H.boatWater444(p.berth.x,p.berth.z));}
 assert.equal(state.actors.length,20);assert.ok(state.staticParts<2100);assert.ok(state.staticSolids>100);
});
const islands=H.islands53;
function checkSupportIndex(s) {
 const cells=s.supportCells, probes=[[-32,-32],[0,571],[1320,340],[-1240,-120]];
 assert.ok(cells.size>0);
 const epsilon=1e-6, side=48;
 for(const p of s.pads) {
  const hw=p.w/2,hd=p.d/2;
  for(const sign of [-1,1]) for(const offset of [-epsilon,0,epsilon]) {
   probes.push([p.x+sign*(hw+offset),p.z],[p.x,p.z+sign*(hd+offset)],
    [p.x+sign*(hw+3.5+offset),p.z],[p.x,p.z+sign*(hd+3.5+offset)],
    [p.x+sign*(hw+3.5+offset),p.z-sign*(hd+3.5+offset)]);
  }
  for(let x=Math.ceil((p.x-hw-3.5)/side)*side;x<=p.x+hw+3.5;x+=side)
   for(const d of [-epsilon,0,epsilon]) probes.push([x+d,p.z]);
  for(let z=Math.ceil((p.z-hd-3.5)/side)*side;z<=p.z+hd+3.5;z+=side)
   for(const d of [-epsilon,0,epsilon]) probes.push([p.x,z+d]);
 }
 for(const p of s.piers)
  for(const t of [0,.25,.75,.97,1]) {
   const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,length=Math.hypot(dx,dz)||1;
   const x=H.lerp(p.a.x,p.b.x,t),z=H.lerp(p.a.z,p.b.z,t);
   probes.push([x,z]);
   for(const d of [-epsilon,0,epsilon]) for(const sign of [-1,1]) {
    probes.push([x+sign*dz/length*(p.width/2+d),z-sign*dx/length*(p.width/2+d)]);
   }
  }
 for(const port of s.ports) for(let i=1;i<port.path.length;i++) {
  const a=port.path[i-1],b=port.path[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
  for(const t of [.1,.5,.9]) for(const d of [0,2.999999,3.000001,-2.999999,-3.000001])
   probes.push([H.lerp(a.x,b.x,t)+d*dz/length,H.lerp(a.z,b.z,t)-d*dx/length]);
 }
 const read=()=>probes.map(([x,z])=>[islands.floorAt(x,z),islands.walkExtension(x,z)]);
 const indexed=read();
 try {
  s.supportCells=null;
  assert.deepEqual(read(),indexed,'indexed lookup equals the ordered support scan and exact path predicate');
 } finally {s.supportCells=cells;}
}
check('public support and path index match ordered scans at cell, feather and route boundaries',()=>{
 checkSupportIndex(state);
 const pad=state.pads[0],probe={x:pad.x,z:pad.z};
 const pier={a:{x:probe.x-1,y:pad.y+9,z:probe.z},b:{x:probe.x+1,y:pad.y+9,z:probe.z},
  minX:probe.x-2,maxX:probe.x+2,minZ:probe.z-2,maxZ:probe.z+2,width:4};
 const buckets=[...state.supportCells.values()].filter(b=>b.pads.includes(pad));
 assert.ok(buckets.length);
 for(const b of buckets)b.piers.unshift(pier);
 try {
  assert.equal(islands.floorAt(probe.x,probe.z),pad.y,'an indexed pad wins over overlapping pier support');
  for(const b of buckets)b.pads.splice(b.pads.indexOf(pad),1);
  assert.equal(islands.floorAt(probe.x,probe.z),pad.y+9,'the overlapping pier would supply a different height');
 } finally {
  for(const b of buckets) {
   b.piers.shift();
   if(!b.pads.includes(pad))b.pads.unshift(pad);
  }
 }
 const first=state.piers[0],last=state.piers[1];
 const x=H.lerp(first.a.x,first.b.x,.96),z=H.lerp(first.a.z,first.b.z,.96);
 assert.notEqual(first.a.y,last.a.y);
 assert.ok(Math.abs(islands.floorAt(x,z)-H.lerp(first.a.y,first.b.y,.96))<1e-10,
  'an authored overlapping pier preserves first support');
});
check('all public paths, ramps and pier boarding points are physically walkable',()=>{
 for(const p of state.ports){
  probePath([{x:p.pad.x,z:p.pad.z},...p.path,{x:p.berth.boardX,z:p.berth.boardZ}],p.id);
 }
 const p=state.airportPad;probePath([{x:p.x,z:p.z},{x:p.entryX,z:p.entryZ}],'airport');
});
check('outer pier extension remains restricted to authored supported corridors',()=>{
 const p=state.ports.find(p=>p.id==='palms');reset({x:p.berth.boardX,z:p.berth.boardZ});
 assert.ok(H.islands53.walkExtension(g.avatar.x,g.avatar.z));assert.ok(g.walkerPositionFree(g.avatar.x,g.avatar.z));
 assert.equal(H.islands53.walkExtension(-1240,-120),false);assert.equal(g.walkerPositionFree(-1240,-120),false);
 const w=H.createWalker(-1185.8,-33,0,1);w.y=H.outdoorHeight(w.x,w.z);
 // Use an actual authored outward pier segment rather than allowing all ocean.
 const pier=state.piers.find(p=>p.a.x<-1186&&p.b.x<-1200);
 Object.assign(w,{x:pier.a.x,z:pier.a.z,y:pier.a.y});
 const dx=pier.b.x-pier.a.x,dz=pier.b.z-pier.a.z,len=Math.hypot(dx,dz);
 for(let i=0;i<90;i++)H.stepWalker(w,{forward:1,strafe:0,viewYaw:Math.atan2(-dx,-dz),run:false,outdoors:true},g.world.nearby(w.x,w.z),1/30,[]);
 assert.ok(Math.hypot(w.x-pier.a.x,w.z-pier.a.z)>3,'actual walker crosses old world limit');
});
check('property plots remain free of new scenery and paths survive all largest homes',()=>{
 for(const i of H.realism39.property48.ISLANDS){
  const plots=H.realism39.property48.plotsFor(g.world,i);
  for(const [k,p]of plots.entries())assert.equal(H.buildings52.buildHouse(g.world,p,'estate',k+i.price),true);
 }
 for(const p of state.ports)probePath([{x:p.pad.x,z:p.pad.z},...p.path,{x:p.berth.boardX,z:p.berth.boardZ}],p.id+' owned');
});
check('local island walkers animate and remain on the public path',()=>{
 g.running=true;g.paused=false;g.over=false;g.missionBoardOpen=false;g.showFullMap=false;
 const p=state.ports[0];reset({x:p.pad.entryX,z:p.pad.entryZ});g.cam.x=g.avatar.x;g.cam.z=g.avatar.z;g.cam.y=g.avatar.y+6;
 const before=state.actors.filter(a=>a.portId===p.id).map(a=>({x:a.x,z:a.z}));
 for(let i=0;i<120;i++)g.update(1/30);
 const local=state.actors.filter(a=>a.portId===p.id);
 assert.ok(local.some((a,i)=>Math.hypot(a.x-before[i].x,a.z-before[i].z)>1));
 for(const a of local)assert.ok([a.x,a.y,a.z,a.yaw,a.stride,a.phase].every(Number.isFinite));
 const dynamic=g.buildDynamic();assert.ok(dynamic.every(o=>['x','y','z','w','h','d'].every(k=>Number.isFinite(o[k]))));
});
check('a rebuilt world replaces the support buckets and keeps exact island boundaries',()=>{
 const previous=g.world,oldCells=state.supportCells;
 g.restart();
 assert.notEqual(g.world,previous);
 const rebuilt=islands.setup(g);
 assert.notEqual(rebuilt.supportCells,oldCells);
 assert.equal(islands.floorAt(-32,-32),null);
 checkSupportIndex(rebuilt);
});
assert.deepEqual(errors,[]);assert.ok(warnings.every(s=>s.includes('AudioContext is not defined')),warnings.join('\n'));
console.log(JSON.stringify({passed:results.length,results,ports:state.ports.map(p=>({id:p.id,pathPoints:p.path.length,palms:p.palms,cafe:!!p.cafe})),staticParts:state.staticParts,collisionProps:state.staticSolids,browser:false,gpu:false},null,2));
