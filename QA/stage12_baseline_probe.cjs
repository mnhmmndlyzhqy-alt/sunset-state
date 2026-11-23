'use strict';
const fs=require('fs'); const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, by={};
for(const b of w.boxes){const kind=b.city20Stage15Kind;if(!kind)continue;if(!by[kind])by[kind]=[];by[kind].push(b);}
const out={world:{boxes:w.boxes.length,solids:w.solids.length,propSolids:w.propSolids.length,roads:w.roads461.length,doors:w.entrancePortals.filter(p=>p.interiorReady).length},groups:{},possible:[]};
for(const [kind,a] of Object.entries(by)){
 const count={count:a.length,inRoad:0,inWater:0,overlapExisting:0,nearDoor:0,first:[]};
 for(const b of a){
  const samples=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
  let road=false,water=false;
  for(const [sx,sz] of samples){let x=b.x+sx*(b.w*.5+.06),z=b.z+sz*(b.d*.5+.06);road ||= H.coast461.isRouteRoad(x,z);water ||= H.reference469.coast(x,z)<.1;}
  if(road)count.inRoad++; if(water)count.inWater++;
  const existing=w.nearby(b.x,b.z).some(s=>s.stage12Source!==b&&Math.abs(s.x-b.x)<s.hw+b.w*.5+.02&&Math.abs(s.z-b.z)<s.hd+b.d*.5+.02);
  if(existing)count.overlapExisting++;
  let door=false;
  if(kind!=='curb-accent')for(const p of w.entrancePortals){if(!p.interiorReady||Math.hypot(p.x-b.x,p.z-b.z)>10)continue;const n=H.stage06Orientation.dir(p);let dx=b.x-p.x,dz=b.z-p.z,forward=dx*n.x+dz*n.z,lateral=Math.abs(-dx*n.z+dz*n.x);if(forward>-.2&&forward<5.8&&lateral<p.width*.5+.75){door=true;break;}}
  if(door)count.nearDoor++;
  if(road||water||existing||door)if(count.first.length<10)count.first.push({id:b.city20Stage15Portal,x:b.x,z:b.z,road,water,existing,door});
 }
 out.groups[kind]=count;
}
fs.writeFileSync('QA/STAGE12_BASELINE_PROBE.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({world:out.world,groups:Object.fromEntries(Object.entries(out.groups).map(([k,v])=>[k,{count:v.count,inRoad:v.inRoad,inWater:v.inWater,overlapExisting:v.overlapExisting,nearDoor:v.nearDoor,first:v.first.slice(0,2)}]))},null,2));
