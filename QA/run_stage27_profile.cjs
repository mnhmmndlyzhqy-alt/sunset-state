'use strict';
/* Real cumulative Game+World, fake renderer, no GPU frame claims. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,off=process.env.STAGE27_ROADS_OFF==='1';
function digest(x){return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');}
const round=x=>Math.round(x*100000)/100000;
const groups=new Map();let totalRoadSamples=0,maxSlope=0,raised=0,unsafeRoadSamples=0;
for(const r of w.roads461){
 for(let i=0;i<r.samples.length;i++){
  const p=r.samples[i];totalRoadSamples++;
  if(!Number.isFinite(p.y+p.g+p.x+p.z+p.above))unsafeRoadSamples++;
  if(p.above>3)raised++;
  if(p.junction){const k=Math.round(p.x*10)+','+Math.round(p.z*10),es=groups.get(k)||[];es.push({road:r.id,x:p.x,z:p.z,y:p.y});groups.set(k,es);}
  if(i){const q=r.samples[i-1],d=Math.hypot(p.x-q.x,p.z-q.z);if(d>.03)maxSlope=Math.max(maxSlope,Math.abs(p.y-q.y)/d);}
 }
}
const joins=[...groups.values()].filter(es=>new Set(es.map(x=>x.road)).size>1).map(es=>({x:es[0].x,z:es[0].z,roads:[...new Set(es.map(x=>x.road))],gap:round(Math.max(...es.map(x=>x.y))-Math.min(...es.map(x=>x.y)))}));
const overpass=joins.find(j=>j.roads.includes('northRing')&&j.roads.includes('westExpress')&&Math.abs(j.z+432)<.5);
const remaining=joins.filter(j=>j.gap>.05&&j!==overpass);
const coast=w.terrain461||[];
let badCoast=0,shoreVertices=0,shorePolys=0;
for(const entry of coast){
 if(!entry||!Array.isArray(entry.poly)||entry.poly.length<3){badCoast++;continue;}
 shorePolys++;for(const p of entry.poly){shoreVertices++;if(!Number.isFinite(p.x+p.z))badCoast++;}
}
const snapshot={stage:27,off,cpuWorld:true,gpuVerified:false,roadCount:w.roads461.length,
 roadSamples:totalRoadSamples,routePointDigest:digest(w.roads461.map(r=>[r.id,r.width,r.points.map(p=>[p.x,p.z])])),
 sampleXZDigest:digest(w.roads461.map(r=>[r.id,r.samples.map(p=>[p.x,p.z])])),
 maxSlope,sharedJunctions:joins.length,unresolvedJoins:remaining,
 observedOverpassGap:overpass?.gap??null,allJoins:joins,
 raisedSamples:raised,unsafeRoadSamples,roadRepairStats:H.stage27RoadPolish?.stats()||null,
 preservation:{boxes:w.boxes.length,solids:w.solids.length,props:w.propSolids.length,
   portals:w.entrancePortals.length,activePortals:w.entrancePortals.filter(x=>x.interiorReady).length,
   shops:w.retailShops.length,glass:w.glassPanels.length,crocodiles:g.stage39Life.wildlife.filter(x=>x.kind==='crocodile').length},
 coast:{polygons:shorePolys,vertices:shoreVertices,invalidVertices:badCoast},
 scriptPresent:fs.existsSync(path.join(__dirname,'../assets/stage27_route_coast_polish.js'))};
const file=path.join(__dirname,off?'STAGE27_STAGE26_AB_OFF_PROFILE.json':'STAGE27_STAGE27_ACTIVE_PROFILE.json');
fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n');
console.log('STAGE27_PROFILE',JSON.stringify({off,roads:snapshot.roadCount,maxSlope:snapshot.maxSlope,joins:snapshot.unresolvedJoins.length,
  overpassGap:snapshot.observedOverpassGap,boxes:snapshot.preservation.boxes,coast:snapshot.coast,
  stage27:snapshot.roadRepairStats},null,2));
if(unsafeRoadSamples||badCoast||remaining.length>9)process.exitCode=1;
