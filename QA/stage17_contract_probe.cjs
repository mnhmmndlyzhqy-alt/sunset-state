'use strict';const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const owners=new Map();for(const b of w.boxes)if(b.city20AuditOwner!=null&&b.city20AuditKind?.startsWith('venue-')){
 const a=owners.get(b.city20AuditOwner)||[];a.push(b);owners.set(b.city20AuditOwner,a);
}
const arr=w.streetVenues.map(v=>{
 const retail=w.retailShops.find(r=>r.id===v.id);
 const portal=w.buildings[v.buildingId]&&w.entrancePortals.find(p=>p.buildingX===w.buildings[v.buildingId].x&&p.buildingZ===w.buildings[v.buildingId].z&&p.interiorReady);
 const parts=owners.get(v.id)||[];
 return {id:v.id,kind:v.kind,bid:v.buildingId==null?null:v.buildingId,retail:!!retail,parts:parts.length,door:retail?.retail?.doorX,portalId:portal?.id??null,labels:parts.map(x=>x.city20AuditKind),hasBank:!!v.bank44};
});
const summary={counts:{streetVenues:arr.length,retailShops:w.retailShops.length,decorated:owners.size,decoratedRetail:arr.filter(v=>v.parts&&v.retail).length,decoratedNonRetail:arr.filter(v=>v.parts&&!v.retail).length},missingRetail:arr.filter(v=>v.parts&&!v.retail),extraRetail:arr.filter(v=>v.retail&&!v.parts),venueTypes:Object.fromEntries([...new Set(arr.map(x=>x.kind))].map(k=>[k,arr.filter(x=>x.kind===k).length])),decoratedVenues:arr.filter(v=>v.parts)};
fs.writeFileSync('QA/STAGE17_BASELINE_RETAIL_MAP.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,decoratedVenues:summary.decoratedVenues.map(x=>({id:x.id,kind:x.kind,retail:x.retail,portalId:x.portalId,parts:x.parts}))},null,2));
