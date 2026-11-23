'use strict';
/* True cumulative Game/World CPU snapshot, fake GL backend; A/B state flag.
 * STAGE28_FACADES_OFF=1 restores the exact Stage27 facade world.
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,off=process.env.STAGE28_FACADES_OFF==='1';
const digest=(a)=>crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex');
const round=(x)=>Number(x.toFixed(5));
const original=w.boxes.filter(x=>!x.stage28Facade);
const detail=w.boxes.filter(x=>x.stage28Facade);
const preserve={
  boxCount:original.length, boxDigest:digest(original.map(b=>[b.x,b.y,b.z,b.w,b.h,b.d,b.yaw,b.color,b.material,b.stage08Part,b.city20Stage06Kind,b.stage27RoadPolish])),
  allBoxes:w.boxes.length,roads:w.roads461.length,roadDigest:digest(w.roads461.map(r=>[r.id,r.width,r.samples.map(p=>[p.x,p.y,p.z,p.above])])),
  coastline:w.terrain461.length,coastDigest:digest(w.terrain461.map(t=>t.poly.map(p=>[p.x,p.z]))),
  solids:w.solids.length,solidDigest:digest(w.solids.map(s=>[s.x,s.z,s.hw,s.hd])),
  props:w.propSolids.length,portals:w.entrancePortals.length,
  activePortals:w.entrancePortals.filter(x=>x.interiorReady).length,
  portalDigest:digest(w.entrancePortals.map(p=>[p.id,p.x,p.z,p.facing,p.width,p.interiorReady])),
  mapped:w.city20DistrictBuildings.length,legacy:w.buildings.length,
  glassMeshes:w.boxes.filter(b=>b.stage08Part==='glass').length,
  breakableGlass:w.glassPanels.length,shops:w.retailShops.length,
  all56RoadAndBridgeMetrics:w.stage27RoadPolishStats||H.stage27RoadPolish.stats(),
  playerStart:[H.cityPlan463.start.x,H.cityPlan463.start.z],
};
function inverse(x,z,a){const c=Math.cos(a),s=Math.sin(a);return {x:c*x+s*z,z:-s*x+c*z};}
const sites=new Map(w.city20DistrictBuildings.map(s=>[s.id,s]));
const doorHeaders=new Map(w.boxes.filter(b=>b.stage05Kind==='door-header').map(b=>[b.stage05Owner,b.y-3.32]));
const panes=new Map();for(const b of w.boxes){if(b.stage08Part!=='glass')continue;
 const k=b.stage08Owner+'|'+b.stage08Face,arr=panes.get(k)||[];arr.push(b);panes.set(k,arr);}
let facadesOnCorrectYaw=true,ownerMissing=0,outOfFootprint=0,opaqueOnGlass=0,doorSightObstructions=0,maxDistance=0;
const byKind={},faceCounts={};
for(const m of detail){
 byKind[m.stage28Kind]=(byKind[m.stage28Kind]||0)+1;
 faceCounts[m.stage28Face]=(faceCounts[m.stage28Face]||0)+1;
 maxDistance=Math.max(maxDistance,m.visibilityCap);
 const s=sites.get(m.stage28Owner);
 if(!s){if(!m.stage28Owner.startsWith('legacy-'))ownerMissing++;continue;}
 if(Math.abs(m.yaw-(s.stage07Yaw||0))>1e-8)facadesOnCorrectYaw=false;
 const pos=inverse(m.x-s.x,m.z-s.z,s.stage07Yaw||0);
 if(Math.abs(pos.x)>s.width*.5+1.05||Math.abs(pos.z)>s.depth*.5+1.05)outOfFootprint++;
 const f=m.stage28Face;
 if(!['north','east','west','south'].includes(f))continue;
 const along=(obj)=>{const p=inverse(obj.x-s.x,obj.z-s.z,s.stage07Yaw||0);return f==='east'||f==='west'?p.z:p.x;};
 const span=(obj)=>f==='east'||f==='west'?obj.d:obj.w;
 if(f!=='south')for(const p of panes.get(s.id+'|'+f)||[]){
   const horz=Math.abs(along(m)-along(p))<(span(m)+span(p))*.5-.04;
   const vert=Math.abs(m.y-p.y)<(m.h+p.h)*.5-.04;
   if(horz&&vert)opaqueOnGlass++;
 }
 const p=w.entrancePortals[s.city20Stage05PortalId],entry=H.stage08SideRearWindows.portalFace(s,p);
 if(entry?.face===f){
   const datum=doorHeaders.get(s.id);
   const ground=Number.isFinite(datum)?datum:s.baseY;
   if(m.y-m.h*.5<ground+3.14&&m.y+m.h*.5>ground+.11&&
      Math.abs(along(m)-entry.along)<(span(m)+(p.width||3.7))*.5-.03)
     doorSightObstructions++;
 }
}
const stats=off?null:w.stage28FacadeStats;
const sample={stage:28,off,cpuWorld:true,gpuVerified:false,source:'STAGE27_OF35_FULL',
 preserve,facades:{added:detail.length,byKind,faceCounts,stats,
  ownerMissing,outOfFootprint,opaqueOnGlass,doorSightObstructions,
  facadesOnCorrectYaw,maxDistance},
 originalWorldStillValid:w.city20DistrictBuildings.length===130&&w.buildings.length===84&&w.roads461.length===52};
const f=path.join(__dirname,off?'STAGE28_STAGE27_AB_OFF_PROFILE.json':'STAGE28_STAGE28_ACTIVE_PROFILE.json');
fs.writeFileSync(f,JSON.stringify(sample,null,2)+'\n');
console.log('STAGE28_WORLD',JSON.stringify({off,boxes:preserve.allBoxes,added:detail.length,
 scanned:original.length,oldHash:preserve.boxDigest,glass:preserve.breakableGlass,
 opaqueOnGlass,doorSightObstructions,outOfFootprint,maxDistance,stats},null,2));
if(ownerMissing||outOfFootprint||opaqueOnGlass||doorSightObstructions||!facadesOnCorrectYaw)process.exitCode=1;
