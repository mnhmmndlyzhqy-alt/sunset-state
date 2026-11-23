/* SUNSET STATE: cumulative deep-audit fixes for stages 14-16 and interior recovery 2.
   Additive to all existing stages. Never changes roads, portals, solids or the reference map.
   2026-11-21. A/B: ?city20AuditOff=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const previous=H.finishReferenceBuildings469;
if(typeof previous!=='function')throw Error('CITY20 deep audit requires cumulative world pipeline');
const disabled=()=>globalThis.__SUNSET_CITY20_AUDIT_OFF===true||
  (typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20AuditOff'));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function repair(w){
 if(w.city20DeepAuditRepairStats)return w.city20DeepAuditRepairStats;
 if(!w.city20Stage14Stats||!w.city20Stage15Stats||!w.city20Stage16Stats||!w.interiorRecovery2Stats)
   return null; // An earlier stage was disabled for A/B; never make that regression fatal.
 const before={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length,
   portalData:w.entrancePortals.map(p=>[p.x,p.z,p.width,p.interiorReady])};
 const stats={revision:1,commercialVenues:0,storefrontDetailsAdded:0,compactFoyersDecorated:0,
   compactInteriorDetailsAdded:0,planterSitesMoved:0,planterPiecesMoved:0,lampsMoved:0,treesMoved:0,
   gardenShrubsMoved:0,unresolvedPlanters:0,unresolvedLamps:0,unresolvedTrees:0,unresolvedShrubs:0,
   unsafePlantersBefore:0,unsafePlantersAfter:0,unsafeTreesBefore:0,unsafeTreesAfter:0,
   unsafeGardenShrubsBefore:0,unsafeGardenShrubsAfter:0,geometryAdded:0,collisionsAdded:0,
   portalChanges:0,roadChanges:0,referenceChanged:false,gpuFpsVerified:false};
 const canStore=!(H.city20Stage14&&H.city20Stage14.disabled&&H.city20Stage14.disabled());
 const canStreet=!(H.city20Stage15&&H.city20Stage15.disabled&&H.city20Stage15.disabled());
 const canGreen=!(H.city20Stage16&&H.city20Stage16.disabled&&H.city20Stage16.disabled());
 const canInterior=!(H.interiorRecovery2&&H.interiorRecovery2.disabled&&H.interiorRecovery2.disabled());
 const landmark=(x,z)=>H.reference469&&typeof H.reference469.coast==='function'?H.reference469.coast(x,z):Infinity;
 const road=(x,z)=>H.coast461&&typeof H.coast461.isRouteRoad==='function'&&H.coast461.isRouteRoad(x,z);
 const bad=(x,z)=>landmark(x,z)<.1||road(x,z);
 const portalClose=(x,z,r)=>w.entrancePortals.some(p=>Math.hypot(p.x-x,p.z-z)<r);
 const collide=(x,z,r)=>typeof w.nearby==='function'&&w.nearby(x,z).some(s=>
   Math.abs(s.x-x)<s.hw+r&&Math.abs(s.z-z)<s.hd+r);
 const reserved=[];
 const available=(x,z,clearance,avoidSolids=false)=>Number.isFinite(x)&&Number.isFinite(z)&&
   !bad(x,z)&&!portalClose(x,z,clearance)&&(!avoidSolids||!collide(x,z,.55))&&
   reserved.every(p=>Math.hypot(p.x-x,p.z-z)>p.min);
 function place(x,z,clearance,avoidSolids=false,minimumSeparation=1.1){
  if(available(x,z,clearance,avoidSolids))return {x,z};
  // Search close to the original anchor first, rather than teleporting the decoration.
  const steps=[.55,1.2,2.2,3.5,5,7,9,12,16,21,28];
  for(const r of steps)for(let j=0;j<24;j++){
   const angle=(j*2.399963229728653)+r*.41;
   const px=x+Math.cos(angle)*r,pz=z+Math.sin(angle)*r;
   if(available(px,pz,clearance,avoidSolids))return {x:px,z:pz};
  }
  return null;
 }
 const byStage15=new Map();
 for(const b of w.boxes){if(!b.city20Stage15)continue;
  let arr=byStage15.get(b.city20Stage15Portal);if(!arr){arr=[];byStage15.set(b.city20Stage15Portal,arr);}arr.push(b);
 }
 const shrubs=w.boxes.filter(b=>b.city20Stage16Kind==='planter-shrub');
 const move=(b,dx,dz)=>{
  const from=typeof H.outdoorHeight==='function'?H.outdoorHeight(b.x,b.z):0;
  const to=typeof H.outdoorHeight==='function'?H.outdoorHeight(b.x+dx,b.z+dz):0;
  if(Number.isFinite(from)&&Number.isFinite(to))b.y+=to-from;
  b.x+=dx;b.z+=dz;
 };
 // Stage 15/16: keep every authored planter; relocate a site and its foliage as one group.
 if(canStreet){for(const [pid,group] of byStage15){
  const bases=group.filter(b=>b.city20Stage15Kind==='planter-base');
  const canopies=group.filter(b=>b.city20Stage15Kind==='plant-canopy');
  const bollards=group.filter(b=>b.city20Stage15Kind==='safety-bollard');
  for(const base of bases){
   if(bad(base.x,base.z))stats.unsafePlantersBefore++;
   const old={x:base.x,z:base.z},candidate=place(base.x,base.z,1.9,false,1.3);
   if(!candidate){stats.unresolvedPlanters++;if(bad(base.x,base.z))stats.unsafePlantersAfter++;continue;}
   const dx=candidate.x-old.x,dz=candidate.z-old.z;
   if(Math.hypot(dx,dz)>.01){
    const attached=[base,...canopies.filter(b=>distance(b,old)<.08),
     ...bollards.filter(b=>distance(b,old)<1.7),
     ...(canGreen?shrubs.filter(b=>distance(b,old)<.08):[])];
    for(const b of new Set(attached)){move(b,dx,dz);stats.planterPiecesMoved++;}
    stats.planterSitesMoved++;
   }
   if(bad(base.x,base.z))stats.unsafePlantersAfter++;
   reserved.push({x:base.x,z:base.z,min:1.3});
  }
  // Stage 15 ornamental lamps also used to appear in water or in carriageways.
  const posts=group.filter(b=>b.city20Stage15Kind==='streetlamp-post');
  for(const post of posts){if(!bad(post.x,post.z))continue;
   const candidate=place(post.x,post.z,3,false);if(!candidate){stats.unresolvedLamps++;continue;}
   const old={x:post.x,z:post.z},dx=candidate.x-old.x,dz=candidate.z-old.z;
   for(const b of group.filter(v=>['streetlamp-post','streetlamp-head'].includes(v.city20Stage15Kind)&&distance(v,old)<.1))move(b,dx,dz);
   stats.lampsMoved++;reserved.push({x:candidate.x,z:candidate.z,min:1.4});
  }
 }}
 // Stage 16 public green spaces: move paired trunk/canopy meshes together.
 if(canGreen){const crowns=w.boxes.filter(b=>b.city20Stage16Kind==='tree-crown');
  const trunks=w.boxes.filter(b=>b.city20Stage16Kind==='tree-trunk');
  for(const trunk of trunks){
   if(bad(trunk.x,trunk.z))stats.unsafeTreesBefore++;
   const old={x:trunk.x,z:trunk.z},candidate=place(trunk.x,trunk.z,3.2,true,3.0);
   if(!candidate){stats.unresolvedTrees++;if(bad(trunk.x,trunk.z))stats.unsafeTreesAfter++;continue;}
   const dx=candidate.x-old.x,dz=candidate.z-old.z;
   if(Math.hypot(dx,dz)>.01){move(trunk,dx,dz);
    for(const c of crowns.filter(c=>distance(c,old)<.08))move(c,dx,dz);
    stats.treesMoved++;
   }
   if(bad(trunk.x,trunk.z))stats.unsafeTreesAfter++;
   reserved.push({x:trunk.x,z:trunk.z,min:3});
  }
  for(const shrub of w.boxes.filter(b=>b.city20Stage16Kind==='garden-shrub')){
   if(bad(shrub.x,shrub.z))stats.unsafeGardenShrubsBefore++;
   const candidate=place(shrub.x,shrub.z,2.3,true,1.4);
   if(!candidate){stats.unresolvedShrubs++;if(bad(shrub.x,shrub.z))stats.unsafeGardenShrubsAfter++;continue;}
   const dx=candidate.x-shrub.x,dz=candidate.z-shrub.z;
   if(Math.hypot(dx,dz)>.01){move(shrub,dx,dz);stats.gardenShrubsMoved++;}
   if(bad(shrub.x,shrub.z))stats.unsafeGardenShrubsAfter++;
   reserved.push({x:shrub.x,z:shrub.z,min:1.4});
  }
 }
 function add(kind,x,y,z,ww,hh,dd,color,material,range,owner){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)return false;
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);
  b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;
  b.city20DeepAudit=true;b.city20AuditKind=kind;b.city20AuditOwner=owner;w.boxes.push(b);return true;
 }
 // Stage 14 previously scanned buildingType/kind/type (all undefined in real world).
 // Use actual existing street venues and their shop-window anchors instead.
 if(canStore&&Array.isArray(w.streetVenues)){
  for(const venue of w.streetVenues){
   if(!Number.isFinite(venue.buildingId)||!Number.isFinite(venue.frontageX)||!Number.isFinite(venue.frontageZ))continue;
   const retail=venue.retail;
   const x=retail&&Number.isFinite(retail.centerX)?retail.centerX:venue.frontageX;
   const z=retail&&Number.isFinite(retail.frontZ)?retail.frontZ:venue.frontageZ;
   const width=Math.max(2.0,Math.min(8.2,retail?.width||5.0));
   const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(x,z):0;
   if(!Number.isFinite(ground))continue;
   const colors=['#526d6f','#6f6259','#636a60','#4d6771'];
   const accent=colors[Math.abs(venue.buildingId)%colors.length],owner=venue.id;
   let added=0;
   if(add('venue-signband',x,ground+3.48,z-.12,width*.84,.35,.14,accent,'metal',245,owner))added++;
   if(add('venue-sign-trim',x,ground+3.25,z-.23,width*.85,.08,.11,'#c0b18c','metal',235,owner))added++;
   const doorX=Number.isFinite(retail?.doorX)?retail.doorX:x;
   if(add('venue-door-canopy',doorX,ground+3.13,z-.55,Math.min(2.25,width*.44),.13,.65,'#a99d8c','metal',205,owner))added++;
   if(retail&&Number.isFinite(retail.windowX)&&Number.isFinite(retail.windowWidth)){
    const ww=Math.min(5.3,Math.max(.7,retail.windowWidth));
    for(const side of [-1,1])if(add('venue-window-jamb',retail.windowX+side*ww*.5,ground+1.65,z-.10,.09,2.24,.14,'#8a9994','metal',160,owner))added++;
    if(add('venue-window-header',retail.windowX,ground+2.82,z-.10,ww+.12,.11,.16,'#8a9994','metal',160,owner))added++;
   }
   if(added){stats.commercialVenues++;stats.storefrontDetailsAdded+=added;}
  }
  if(stats.commercialVenues){
   // Retain the original Stage14=0 metric to expose its original integration failure.
   w.city20Stage14Stats.auditedStreetVenues=stats.commercialVenues;
   w.city20Stage14Stats.auditedGeometryAdded=stats.storefrontDetailsAdded;
   w.city20Stage14Stats.repairedByDeepAudit=true;
  }
 }
 // Compact foyers missed by the earlier d>=6m guard. Only overhead or wall details;
 // no new navigation edges, fake walkability flags, door unlocks or colliders.
 if(canInterior){
  const mapped=new Set((w.interiorRecovery2Routes||[]).map(r=>r.portalId));
  const plans=new Map(w.structuralPlans.filter(p=>p&&p.outerShell&&p.foyer)
    .map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
  for(const p of w.entrancePortals){
   if(!p.interiorReady||mapped.has(p.id))continue;
   const f=plans.get(`${p.buildingX},${p.buildingZ}`)?.foyer;
   if(!f||![f.x,f.z,f.w,f.d].every(Number.isFinite)||f.w<3.8||f.d<2.75)continue;
   const y=typeof H.outdoorHeight==='function'?H.outdoorHeight(f.x,f.z):0;
   if(!Number.isFinite(y))continue;
   let added=0;
   if(add('compact-foyer-overhead',f.x,y+3.15,f.z,.60,.05,.42,'#e3d1ab','light_emissive',115,p.id))added++;
   if(add('compact-foyer-wall-marker',f.x+f.w*.45,y+1.72,f.z,.065,.76,.54,'#758d8b','metal',115,p.id))added++;
   if(added){stats.compactFoyersDecorated++;stats.compactInteriorDetailsAdded+=added;}
  }
 }
 stats.geometryAdded=w.boxes.length-before.boxes;
 if(w.solids.length!==before.solids||w.roads461.length!==before.roads||
    w.entrancePortals.length!==before.portals||
    w.entrancePortals.some((p,i)=>[p.x,p.z,p.width,p.interiorReady].some((v,j)=>v!==before.portalData[i][j])))
   throw Error('Deep audit mutated gameplay world geometry');
 w.city20DeepAuditRepairStats=stats;return stats;
}
H.finishReferenceBuildings469=function auditedCumulativeFinish(w){const result=previous(w);if(!disabled())repair(w);return result;};
H.city20DeepAuditRepair={repair,disabled};
})(Heatline);
