'use strict';const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const kind=b=>b.city20Stage15Kind;
const entries=w.boxes.filter(b=>['streetlamp-post','streetlamp-head'].includes(kind(b))).map(b=>({id:b.city20Stage15Portal,kind:kind(b),x:b.x,y:b.y,z:b.z,w:b.w,h:b.h,d:b.d})).sort((a,b)=>a.id-b.id||a.kind.localeCompare(b.kind));
const dat={enabled:!!w.stage11LampAudit,livePosts:w.boxes.filter(b=>kind(b)==='streetlamp-post').length,
 boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,entrances:w.entrancePortals.length,
 activeEntries:w.entrancePortals.filter(p=>p.interiorReady).length,planters:w.stage10PlanterAudit,
 facade:w.stage08FacadeStats,stage09:w.stage09CoastalAudit,stage11:w.stage11LampAudit||null,
 entries};
fs.writeFileSync('QA/STAGE11_AB_'+(dat.enabled?'ON':'OFF')+'.json',JSON.stringify(dat,null,2));
console.log(JSON.stringify({enabled:dat.enabled,entries:entries.length,world:{boxes:dat.boxes,solids:dat.solids,roads:dat.roads,active:dat.activeEntries}},null,2));
