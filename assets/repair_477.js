/* SUNSET STATE 4.7.7: conservative road/wildlife/traffic repair layer.
   The original reference map, models, mission scripts and render pipeline remain intact.
   No frame-resolution scaling is performed here. */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const G=H.coast461;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(x,z)=>Math.floor(x/24)+','+Math.floor(z/24);

// A road mesh, its drive surface and its collision shoulder use ONE sampled profile.
// Only raise low samples to enforce the maximum 9% approach slope; never gouge
// through the terrain or delete an authored overpass.
H.reconcileRoadProfiles477=function(roads){
  const MAX_SLOPE=.09;
  const stats={roads:roads.length,segments:0,gradeBefore:0,gradeAfter:0,raisedSamples:0,junctions:0};
  for(const road of roads){
    const s=road.samples;
    for(let i=1;i<s.length;i++){
      const d=distance(s[i],s[i-1]);
      if(d>.02)stats.gradeBefore=Math.max(stats.gradeBefore,Math.abs(s[i].y-s[i-1].y)/d);
    }
  }
  // Match geometrically coincident junctions unless they are intentionally
  // grade-separated (an overpass crossing an underpass).
  const endpoints=new Map();
  for(const road of roads)for(const p of road.samples){
    if(!p.junction)continue;
    const k=Math.round(p.x*10)+','+Math.round(p.z*10);
    let values=endpoints.get(k);if(!values){values=[];endpoints.set(k,values);}values.push(p);
  }
  for(const points of endpoints.values()){
    if(points.length<2)continue;
    const min=Math.min(...points.map(p=>p.y)),max=Math.max(...points.map(p=>p.y));
    if(max-min>1.75)continue;
    for(const p of points)p.y=max;
    stats.junctions++;
  }
  for(const road of roads){
    const s=road.samples;
    if(s.length<2)continue;
    const prev=s.map(p=>p.y);
    // Limit EVERY approach, including city access and short connector roads.
    for(let i=1;i<s.length;i++){
      const p=s[i],q=s[i-1],d=distance(p,q);
      if(d>.02) p.y=Math.max(p.y,q.y-d*MAX_SLOPE);
    }
    for(let i=s.length-2;i>=0;i--){
      const p=s[i],q=s[i+1],d=distance(p,q);
      if(d>.02)p.y=Math.max(p.y,q.y-d*MAX_SLOPE);
    }
    for(let i=0;i<s.length;i++){
      const p=s[i];if(p.y>prev[i]+.001)stats.raisedSamples++;
      p.above=p.y-p.g;
      if(i){const d=distance(p,s[i-1]);if(d>.02){stats.segments++;stats.gradeAfter=Math.max(stats.gradeAfter,Math.abs(p.y-s[i-1].y)/d);}}
    }
  }
  G.roadRepair477=stats;
  return stats;
};

// Ground/bridge road layers share the same mesh sample elevations. Previously,
// a perpendicular lower road could win the first 2-D road lookup at a crossing,
// making a car on the bridge visually appear under the raised road.
const profileCells=new Map();
function candidateAt(actor,x,z){
  const segments=profileCells.get(key(x,z));
  if(!segments)return null;
  const fx=Number.isFinite(actor?.yaw)?-Math.sin(actor.yaw):null;
  const fz=Number.isFinite(actor?.yaw)?-Math.cos(actor.yaw):null;
  let selected=null,best=1e9;
  for(const seg of segments){
    const dx=x-seg.a.x,dz=z-seg.a.z,t=clamp((dx*seg.dx+dz*seg.dz)/seg.len,0,1);
    const px=seg.a.x+seg.dx*t*seg.len,pz=seg.a.z+seg.dz*t*seg.len;
    const d=Math.hypot(x-px,z-pz);
    if(d>seg.road.width*.5+1.0)continue;
    const angle=fx===null?0:1-Math.abs(fx*seg.dx+fz*seg.dz);
    const prefers=actor?.route477?.road===seg.road?-1.0:actor?.roadProfile477===seg.road.id?-.20:0;
    const score=d/(seg.road.width*.5+1)+angle*1.15+prefers;
    if(score<best){best=score;selected={road:seg.road,y:seg.a.y+(seg.b.y-seg.a.y)*t,d,px,pz};}
  }
  return selected;
}
H.registerRoadProfiles477=function(roads){
  profileCells.clear();let count=0;
  for(const road of roads)for(let i=1;i<road.samples.length;i++){
    const a=road.samples[i-1],b=road.samples[i],len=distance(a,b);
    if(len<.03||len>16)continue;
    const seg={road,a,b,len,dx:(b.x-a.x)/len,dz:(b.z-a.z)/len};
    const half=road.width*.5+1.4;
    for(let ix=Math.floor((Math.min(a.x,b.x)-half)/24);ix<=Math.floor((Math.max(a.x,b.x)+half)/24);ix++)
      for(let iz=Math.floor((Math.min(a.z,b.z)-half)/24);iz<=Math.floor((Math.max(a.z,b.z)+half)/24);iz++){
        const k=ix+','+iz,list=profileCells.get(k)||[];list.push(seg);profileCells.set(k,list);
      }
    count++;
  }
  G.roadProfileStats477={segments:count,cells:profileCells.size};
};
H.getRoadProfile477=candidateAt;
H.roadRaised477=(actor)=>{
  if(!actor)return 0;
  const found=candidateAt(actor,actor.x,actor.z);
  return found?Math.max(0,found.y-.074-H.baseGround467(actor.x,actor.z)):0;
};
H.installRoadGround477=function(){
  if(H.roadLayerInstalled477)return;
  H.roadLayerInstalled477=true;
  const previousGround=H.deckGround443,previousSameLevel=H.sameRoadLevel443;
  H.deckGround443=(actor,x=actor.x,z=actor.z)=>{
    const legacy=previousGround(actor,x,z);
    if(!actor||actor.deck443||actor.coastDeck461)return legacy;
    const found=candidateAt(actor,x,z);
    if(!found)return legacy;
    // Drive-height and the visible mesh must match, except where natural terrain
    // projects above the mesh. The chosen *road* is based on heading/route.
    return Math.max(H.baseGround467(x,z),found.y-.074);
  };
  H.sameRoadLevel443=(a,b)=>previousSameLevel(a,b)&&
    Math.abs(H.deckGround443(a)-H.deckGround443(b))<2.25;
};
const bridgeCells=new Map();
function pushBridge(seg){
  const h=seg.road.width*.5+4;
  for(let xi=Math.floor((Math.min(seg.a.x,seg.b.x)-h)/24);xi<=Math.floor((Math.max(seg.a.x,seg.b.x)+h)/24);xi++)
    for(let zi=Math.floor((Math.min(seg.a.z,seg.b.z)-h)/24);zi<=Math.floor((Math.max(seg.a.z,seg.b.z)+h)/24);zi++){
      const k=xi+','+zi,arr=bridgeCells.get(k)||[];arr.push(seg);bridgeCells.set(k,arr);
    }
}
H.indexBridgeRails477=function(roads){
  bridgeCells.clear();let count=0;
  for(const road of roads){
    if(road.samples.length<2)continue;
    for(let i=1;i<road.samples.length;i++){
      const a=road.samples[i-1],b=road.samples[i],len=distance(a,b);
      if(len<.2||len>16)continue;
      if(Math.min(a.above,b.above)<.85&&!(a.water||b.water))continue;
      const seg={a,b,road,len,dx:(b.x-a.x)/len,dz:(b.z-a.z)/len};
      // The old Stage443 crossover has its own guardrails and separate deck layer.
      if(G.keepOverpass((a.x+b.x)*.5,(a.z+b.z)*.5))continue;
      pushBridge(seg);count++;
    }
  }
  G.bridgeRailStats477={segments:count,cells:bridgeCells.size};
};
function closestBridge(x,z){
  let best=null,lowest=Infinity;
  for(const s of bridgeCells.get(key(x,z))||[]){
    const dx=x-s.a.x,dz=z-s.a.z,t=clamp((dx*s.dx+dz*s.dz)/s.len,0,1);
    const px=s.a.x+t*s.len*s.dx,pz=s.a.z+t*s.len*s.dz;
    const d=Math.hypot(x-px,z-pz);
    if(d<lowest){lowest=d;best={...s,x:px,z:pz,d,off:dx*(-s.dz)+dz*s.dx};}
  }
  return best;
}
H.closestBridge477=closestBridge;
H.guardBridgeRails477=function(car,oldX,oldZ){
  if(!car||car.wrecked||car.deck443)return false;
  let point=closestBridge(car.x,car.z);
  if(!point||point.d>point.road.width*.5+3.2){
    point=closestBridge(oldX,oldZ);
    if(!point||point.d>point.road.width*.5+1.0)return false;
  }
  const guard=point.road.width*.5-.32;
  const nx=-point.dz,nz=point.dx;
  let off=(car.x-point.x)*nx+(car.z-point.z)*nz;
  if(Math.abs(off)<guard)return false;
  // Only guard cars that approached this road from its deck, rather than
  // snapping an unrelated car from the ground onto an overpass.
  const old=closestBridge(oldX,oldZ);
  if(!old||old.d>old.road.width*.5+1.1)return false;
  const side=Math.sign(off)||1;
  car.x=point.x+nx*guard*side;
  car.z=point.z+nz*guard*side;
  const vOut=(car.vx*nx+car.vz*nz)*side;
  if(vOut>0){car.vx-=nx*side*vOut*.98;car.vz-=nz*side*vOut*.98;}
  car.speed=Math.hypot(car.vx,car.vz);
  car.impact=Math.max(car.impact,Math.min(.24,Math.max(0,vOut)*.009));
  car.bridgeRailContacts477=(car.bridgeRailContacts477||0)+1;
  return true;
};

// Route-based NPCs replace straight-line traffic that drove through junctions,
// rivers and bends on the new surveyed map.
const TRAFFIC_ROADS=new Set(['northRing','southRing','eastCoast','westExpress','northKeys','keysCanals','privateSpine469',
 'isletLink','toResort','keysWestLoop','keysMiddleLoop','keysCrossing']);
H.spawnRoadTraffic477=function(game){
  const roads=(game.world?.roads461||[]).filter(r=>TRAFFIC_ROADS.has(r.id)&&r.samples.length>14);
  if(!roads.length)return null;
  const center=game.inVehicle?game.player:game.avatar||game.player;
  const rng=game.rng;
  let selected=null;
  for(let n=0;n<42;n++){
    const road=roads[rng.int(0,roads.length-1)];
    const i=rng.int(5,road.samples.length-7),p=road.samples[i];
    const dist=Math.hypot(p.x-center.x,p.z-center.z);
    if(dist<95||dist>620||G.coast(p.x,p.z)<-2.0&&p.above<1.0)continue;
    if(game.civilian?.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<14))continue;
    selected={road,i};break;
  }
  if(!selected)return null;
  const {road,i}=selected,dir=rng.next()<.5?1:-1,p=road.samples[i],ahead=road.samples[i+dir*3];
  const nx=p.nx||0,nz=p.nz||0,offset=-dir*Math.min(2.05,road.width*.18);
  const dx=ahead.x-p.x,dz=ahead.z-p.z,yaw=Math.atan2(-dx,-dz);
  const car=H.makeCar('civilian',p.x+nx*offset,p.z+nz*offset,yaw,rng.int(0,6));
  car.speed=rng.range(4,9);car.vx=-Math.sin(yaw)*car.speed;car.vz=-Math.cos(yaw)*car.speed;
  car.express442=false;car.route477={road,index:i,dir,offset,finished:false};
  return car;
};
H.trafficControl477=function(game,c,conditions){
  const route=c.route477,s=route.road.samples;
  const stop=conditions.mustStop||conditions.giveWay||conditions.emergency;
  let pos=route.index,dir=route.dir;
  let nearest=Infinity;
  for(let k=-2;k<=7;k++){
    const idx=pos+k*dir;if(idx<0||idx>=s.length)continue;
    const p=s[idx],d=Math.hypot(p.x-c.x,p.z-c.z);
    if(d<nearest){nearest=d;pos=idx;}
  }
  route.index=pos;
  if(pos+dir*4<0||pos+dir*4>=s.length){route.finished=true;return {gas:0,brake:true,steer:0,nitro:false};}
  const follow=s[clamp(pos+dir*Math.round(3+Math.min(4,c.speed*.21)),0,s.length-1)];
  const anchor=s[clamp(pos+dir*2,0,s.length-1)];
  const nx=anchor.nx||0,nz=anchor.nz||0;
  const x=follow.x+nx*route.offset,z=follow.z+nz*route.offset;
  const target=Math.atan2(-(x-c.x),-(z-c.z));
  const delta=H.angleDiff(c.yaw,target);
  let desired=14.0;
  desired*=clamp(1-Math.abs(delta)*.62,.31,1);
  if(nearest>11)desired=Math.min(desired,7);
  const fX=-Math.sin(c.yaw),fZ=-Math.cos(c.yaw),rX=Math.cos(c.yaw),rZ=-Math.sin(c.yaw);
  // Tightly bounded local following gap; no per-car global path search per frame.
  const others=[game.player,...game.civilian,...game.police];
  for(const other of others){
    if(other===c||!other.alive||other.wrecked)continue;
    const dx=other.x-c.x,dz=other.z-c.z;
    if(Math.abs(dx)>22||Math.abs(dz)>22)continue;
    const forward=dx*fX+dz*fZ,lateral=Math.abs(dx*rX+dz*rZ);
    if(forward>0&&forward<21&&lateral<3.2)desired=Math.min(desired,Math.max(0,(forward-5.5)*.85));
  }
  if(stop)desired=0;
  const steer=clamp(delta*1.9,-1,1);
  return {gas:desired<.5?0:c.speed>desired+1.5?0:.30,
    brake:stop||c.speed>desired+2.5,steer,nitro:false};
};

H.CROC_SITES477=[
  [395,-835],[422,-858],[445,-856],[468,-860],
  [345,-810],[370,-810],[322,-758],[318,-709]
];
// Shallow, naturally existing water channels in the eastern wetlands. Each site
// is deliberately distant from the flamingo sanctuary in the western marsh.
H.pickCrocGoal477=function(a,rng){
  for(let i=0;i<22;i++){
    const x=a.homeX+rng.range(-a.radius*.76,a.radius*.76);
    const z=a.homeZ+rng.range(-a.radius*.76,a.radius*.76);
    const water=G.coast(x,z);
    if(a.mode==='bask'?(water>-.6&&water<5):(water<-.6&&water>-25))return {x,z};
  }
  return {x:a.homeX,z:a.homeZ};
};
H.buildCrocHabitat477=function(world){
  // Landscape the banks without placing a wooden footbridge or a false water slab.
  let reeds=0;
  const seeds=new H.RNG(47777);
  for(const [ix,iz] of H.CROC_SITES477){
    for(let k=0;k<11;k++){
      const angle=k*2.39996+ix*.013,rad=8+(k%4)*2.7;
      const x=ix+Math.cos(angle)*rad,z=iz+Math.sin(angle)*rad;
      const coast=G.coast(x,z);
      if(coast<.8||coast>7||G.isRouteRoad(x,z))continue;
      const base=H.outdoorHeight(x,z),height=1.1+seeds.next()*1.1;
      const stem=H.box(x,base+height*.46,z,.095,height,.095,'#71865f',0,4);
      stem.material='foliage';stem.shape='wedge';stem.visibilityCap=290;
      world.add(stem);reeds++;
    }
  }
  world.crocHabitat477={center:{x:403,z:-790},sites:H.CROC_SITES477.length,reeds,water:'reference coastline'};
};
})(Heatline);
