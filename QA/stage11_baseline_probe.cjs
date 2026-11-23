'use strict';
const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world;
const posts=w.boxes.filter(b=>b.city20Stage15Kind==='streetlamp-post');
const heads=w.boxes.filter(b=>b.city20Stage15Kind==='streetlamp-head');
const portals=new Map(w.entrancePortals.map(p=>[p.id,p]));
const summary={world:{boxes:w.boxes.length,solids:w.solids.length,entrances:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,roads:w.roads461.length},historical:w.city20DeepAuditRepairStats,stage15:w.city20Stage15Stats,livePosts:posts.length,liveHeads:heads.length,byOwner:{active:0,inactive:0},results:[],flags:{}};
const mark=(name)=>{summary.flags[name]=(summary.flags[name]||0)+1};
for(const post of posts){const owner=portals.get(post.city20Stage15Portal);const pair=heads.filter(h=>h.city20Stage15Portal===post.city20Stage15Portal&&Math.hypot(h.x-post.x,h.z-post.z)<.15);const baseHalfW=post.w*.5,baseHalfD=post.d*.5;const samples=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];const reasons=[];let minShore=Infinity,roadCount=0,waterCount=0;for(const [fx,fz]of samples){const x=post.x+fx*(baseHalfW+.14),z=post.z+fz*(baseHalfD+.14);const coast=H.reference469.coast(x,z);minShore=Math.min(minShore,coast);if(coast<.1)waterCount++;if(H.coast461.isRouteRoad(x,z))roadCount++;}
 const nearSolids=typeof w.nearby==='function'?w.nearby(post.x,post.z).filter(s=>Math.abs(s.x-post.x)<s.hw+.18&&Math.abs(s.z-post.z)<s.hd+.18):[];
 let doorway=[];for(const entry of w.entrancePortals.filter(p=>p.interiorReady)){
  if(Math.hypot(entry.x-post.x,entry.z-post.z)>12)continue;
  const n=H.stage06Orientation.dir(entry),dx=post.x-entry.x,dz=post.z-entry.z,forward=dx*n.x+dz*n.z,lateral=Math.abs(-dx*n.z+dz*n.x);
  if(forward>-.2&&forward<6.6&&lateral<entry.width*.5+.46)doorway.push(entry.id);
 }
 const nearbyLamp=posts.filter(o=>o!==post&&Math.hypot(o.x-post.x,o.z-post.z)<2.1).length;
 const okOwner=owner?.interiorReady===true;if(okOwner)summary.byOwner.active++;else summary.byOwner.inactive++;
 if(!okOwner)reasons.push('orphan');if(pair.length!==1)reasons.push('pair_mismatch');if(roadCount)reasons.push('road');if(waterCount)reasons.push('water');if(nearSolids.length)reasons.push('solid');if(doorway.length)reasons.push('door');if(nearbyLamp)reasons.push('lamp_overlap');
 for(const r of reasons)mark(r);
 summary.results.push({id:post.city20Stage15Portal,x:+post.x.toFixed(2),z:+post.z.toFixed(2),ownerActive:okOwner,headPairs:pair.length,roadSamples:roadCount,waterSamples:waterCount,minimumShore:Number.isFinite(minShore)?+minShore.toFixed(2):'inland',solidCollisions:nearSolids.length,doorway,nearbyLamp,issues:reasons});}
fs.writeFileSync('QA/STAGE11_BASELINE_PROBE.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({summary:{...summary,results:undefined},sample:summary.results.filter(p=>p.issues.length).slice(0,30)},null,2));
