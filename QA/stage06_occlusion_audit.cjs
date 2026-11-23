const fs=require('fs'),path=require('path'),{g,H}=require('./stage05_bootstrap.cjs');const w=g.world,s=w.stage06OrientationStats;
const portals=w.entrancePortals.filter(p=>p.stage06Oriented),size=32,bins=new Map(),large=[];
for(const b of w.boxes){
 if(b.layer!==4||b.h<.3)continue;
 if(b.w>size*.75||b.d>size*.75){large.push(b);continue;}
 const k=`${Math.floor(b.x/size)},${Math.floor(b.z/size)}`;
 if(!bins.has(k))bins.set(k,[]);bins.get(k).push(b);
}
const bad=[],all=[];
for(const p of portals){
 const n=H.stage06Orientation.dir(p),y=H.outdoorHeight(p.x,p.z)+1.6;
 let blocked=[];
 for(const t of [.55,1.3,2.1]){
  const x=p.x-n.x*t,z=p.z-n.z*t,ix=Math.floor(x/size),iz=Math.floor(z/size);
  const candidates=[...large];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
   candidates.push(...(bins.get(`${ix+a},${iz+b}`)||[]));
  }
  let count=0;
  for(const b of candidates){
   if(b.stage06Entry||b.stage06RelocatedPortal===p.id)continue;
   if(Math.abs(b.x-x)<b.w*.5+.16&&Math.abs(b.z-z)<b.d*.5+.16&&Math.abs(b.y-y)<b.h*.5+.12&&
     !['glass','translucent_glass','light_emissive','foliage'].includes(b.material))count++;
  }
  if(count)blocked.push({t,parts:count});
 }
 all.push({id:p.id,face:p.facing,blocked});if(blocked.length)bad.push({id:p.id,face:p.facing,blocked});
}
const obj={reoriented:portals.length,facadeDetailsRelocated:s.facadeDetailsRelocated,occlusionSuspects:bad.length,largeCandidates:large.length,examples:bad.slice(0,30)};
fs.writeFileSync(path.join(__dirname,'STAGE06_VISUAL_OCCLUSION_HEURISTIC.json'),JSON.stringify({summary:obj,all},null,2)+'\n');
console.log(JSON.stringify(obj,null,2));
