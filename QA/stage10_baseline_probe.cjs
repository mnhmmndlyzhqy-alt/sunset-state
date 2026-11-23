'use strict';
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, portals=new Map(w.entrancePortals.map(p=>[p.id,p]));
const coast=(x,z)=>H.reference469.coast(x,z);
const road=(x,z)=>H.coast461.isRouteRoad(x,z);
const bad=(b)=>coast(b.x,b.z)<.1||road(b.x,b.z);
const kinds=['planter-base','plant-canopy','safety-bollard','planter-shrub','streetlamp-post','streetlamp-head'];
const all=w.boxes.filter(b=>kinds.includes(b.city20Stage15Kind||b.city20Stage16Kind));
const bases=w.boxes.filter(b=>b.city20Stage15Kind==='planter-base');
const green=w.boxes.filter(b=>b.city20Stage16Kind==='planter-shrub');
const output={stage:10,world:{boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,city20:w.city20DistrictBuildings?.length},
 stats:{priorDeepAudit:w.city20DeepAuditRepairStats,stage15:w.city20Stage15Stats,stage16:w.city20Stage16Stats,stage04:w.stage04AccessStats},
 byKind:{},byPortal:{active:{},inactive:{}},reason:{},nearestPortals:[],sample:[]};
for(const name of kinds){const a=all.filter(b=>(b.city20Stage15Kind||b.city20Stage16Kind)===name);
 output.byKind[name]={total:a.length,bad:a.filter(bad).length,water:a.filter(b=>coast(b.x,b.z)<.1).length,road:a.filter(b=>road(b.x,b.z)).length};}
for(const b of bases){const p=portals.get(b.city20Stage15Portal),state=p?.interiorReady?'active':'inactive';
  const v=output.byPortal[state];v.count=(v.count||0)+1;if(bad(b)){v.bad=(v.bad||0)+1;
    if(output.sample.length<12)output.sample.push({id:p?.id,ownerActive:p?.interiorReady,x:+b.x.toFixed(2),z:+b.z.toFixed(2),shore:+coast(b.x,b.z).toFixed(2),road:road(b.x,b.z),ownerX:p?.x,ownerZ:p?.z});}}
for(const b of green){const p=portals.get(b.city20Stage16Portal),state=p?.interiorReady?'active':'inactive';
 const v=output.byPortal[state];v.green=(v.green||0)+1;if(bad(b))v.greenBad=(v.greenBad||0)+1;}
console.log(JSON.stringify(output,null,2));
