'use strict';
const fs=require('fs');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world;
function f(x){return Number((x||0).toFixed(4));}
const groups=new Map();
for(const road of w.roads461)for(const p of road.samples){if(!p.junction)continue;const k=Math.round(p.x*10)+','+Math.round(p.z*10);const a=groups.get(k)||[];a.push({road:road.id,y:p.y,x:p.x,z:p.z});groups.set(k,a);}
const joins=[...groups.values()].filter(a=>new Set(a.map(p=>p.road)).size>1).map(a=>({...a[0],roads:[...new Set(a.map(p=>p.road))],gap:f(Math.max(...a.map(p=>p.y))-Math.min(...a.map(p=>p.y))),values:a.map(p=>f(p.y))})).sort((a,b)=>b.gap-a.gap);
const slopes=[];const submerged=[];const raised=[];let samples=0;
for(const road of w.roads461){let max=0;
 for(let i=0;i<road.samples.length;i++){
  const p=road.samples[i];samples++;if(p.water&&p.above<.2)submerged.push({road:road.id,i,x:f(p.x),z:f(p.z),above:f(p.above)});
  if(p.above>3)raised.push({road:road.id,i,x:f(p.x),z:f(p.z),above:f(p.above),coast:f(p.shore)});
  if(i){const q=road.samples[i-1];const d=Math.hypot(p.x-q.x,p.z-q.z);if(d>.01)max=Math.max(max,Math.abs(p.y-q.y)/d);}
 }
 slopes.push({road:road.id,max:f(max)});
}
const bridges=w.roads461.filter(r=>r.samples.some(p=>p.above>.85)).map(r=>({road:r.id,elevated:r.samples.filter(p=>p.above>.85).length,samples:r.samples.length}));
const out={sourceStage:26,roads:w.roads461.length,samples,joins:joins.length,joinMismatches:joins.filter(a=>a.gap>.05),topJoins:joins.slice(0,25),topSlopes:slopes.sort((a,b)=>b.max-a.max).slice(0,20),submergedCount:submerged.length,submerged:submerged.slice(0,20),raisedCount:raised.length,raised:raised.slice(0,15),bridges,geometry:{boxes:w.boxes.length,solids:w.solids.length,entrances:w.entrancePortals.length,shoreVerts:w.boxes.shoreMesh463?.vertices?.length/10||0,shoreTriangles:w.boxes.shoreMesh463?.indices?.length/3||0},preexisting:{city20Stage04:H.city20Stage04Stats,roadRepair477:H.coast461.roadRepair477,rails477:H.coast461.bridgeRailStats477}};
const dest=require('path').join(__dirname,'STAGE27_BASELINE_PROFILE.json');fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');console.log('STAGE27 BASELINE',JSON.stringify({roadCount:out.roads,samples,joins:joins.length,mismatches:out.joinMismatches.slice(0,12),slopes:out.topSlopes.slice(0,8),submergedCount:submerged.length,raisedCount:raised.length,geometry:out.geometry,rails:out.preexisting.rails477,stage27:H.stage27RoadPolish?.stats(),terrainPatches:w.terrain461?.length},null,2));
