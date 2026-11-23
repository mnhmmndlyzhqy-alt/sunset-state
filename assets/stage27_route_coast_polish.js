/* SUNSET STATE Stage 27/35: cumulative route, bridge and shoreline continuity.
 * Runs AFTER Stage04/Stage477 and BEFORE the existing Game constructor.
 * No route coordinates, map reference, building, asset, save or mission removed.
 * ?stage27RoadsOff=1 (or __SUNSET_STAGE27_ROADS_OFF) restores exact stage26 behavior.
 */
var Heatline=globalThis.Heatline||{};
(function(H){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const enabled=()=>globalThis.__SUNSET_STAGE27_ROADS_OFF!==true&&
  !(typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
    new URLSearchParams(location.search).has('stage27RoadsOff'));
 if(!H.coast461||typeof H.reconcileRoadProfiles477!=='function'||
    typeof H.registerRoadProfiles477!=='function'||typeof H.closestBridge477!=='function')
  throw Error('Stage27 must load after the original bridge/road engine');
 const baseReconcile=H.reconcileRoadProfiles477;
 const baseRegister=H.registerRoadProfiles477;
 const baseRail=H.guardBridgeRails477;
 const baseCrest=H.city20Stage04BridgeCrest;
 const geo=H.coast461;
 const slopeMax=.09000001;
 const slopeDistance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
 const key=(x,z,unit)=>Math.round(x/unit)+','+Math.round(z/unit);
 const areaKey=(x,z)=>Math.floor(x/24)+','+Math.floor(z/24);
 let terrainSegments=new Map();
 let currentStats={stage:27,enabled:false};
 function junctions(roads){
  const seen=new Map();
  for(const road of roads)for(const p of road.samples){
   if(!p.junction)continue;
   const k=key(p.x,p.z,.1),v=seen.get(k)||[];
   v.push({road,p});seen.set(k,v);
  }
  const groups=[];let intentional=0;
  for(const entries of seen.values()){
   if(new Set(entries.map(e=>e.road.id)).size<2)continue;
   if(entries.some(e=>slopeDistance(e.p,entries[0].p)>.10))continue;
   const names=new Set(entries.map(e=>e.road.id));
   // Surveyed westExpress passes ABOVE the east/west northRing at z=-432.
   // Treating this as a flat junction would destroy the intentional overpass.
   if(names.has('northRing')&&names.has('westExpress')&&
      Math.abs(entries[0].p.z+432)<.5&&
      Math.max(...entries.map(e=>e.p.y))-Math.min(...entries.map(e=>e.p.y))>2){
     intentional++;continue;
   }
   groups.push(entries);
  }
  return {groups,intentional};
 }
 function maxGrade(roads){
  let max=0;
  for(const r of roads)for(let i=1;i<r.samples.length;i++){
   const a=r.samples[i-1],b=r.samples[i],d=slopeDistance(a,b);
   if(d>.025)max=Math.max(max,Math.abs(a.y-b.y)/d);
  }
  return max;
 }
 function repairRoads(roads){
  const links=junctions(roads),beforeGrade=maxGrade(roads),original=new Map();
  for(const r of roads)for(const p of r.samples)original.set(p,p.y);
  const beforeGaps=links.groups.map(es=>Math.max(...es.map(e=>e.p.y))-Math.min(...es.map(e=>e.p.y)));
  let passes=0;
  // Minimal upward envelope: preserves the original bridge/water clearance,
  // while connecting each true junction and honoring the existing 9% grade.
  // Graph constraints propagate to neighboring samples and shared junctions.
  for(let round=0;round<48;round++){
   let raised=0;
   for(const es of links.groups){
    const y=Math.max(...es.map(e=>e.p.y));
    for(const e of es){raised=Math.max(raised,y-e.p.y);e.p.y=y;}
   }
   for(const r of roads){
    const s=r.samples;
    for(let i=1;i<s.length;i++){
     const y=s[i-1].y-slopeMax*slopeDistance(s[i-1],s[i]);
     if(y>s[i].y){raised=Math.max(raised,y-s[i].y);s[i].y=y;}
    }
    for(let i=s.length-2;i>=0;i--){
     const y=s[i+1].y-slopeMax*slopeDistance(s[i],s[i+1]);
     if(y>s[i].y){raised=Math.max(raised,y-s[i].y);s[i].y=y;}
    }
   }
   passes++;
   if(raised<.00001)break;
  }
  // Final pass after relaxation to ensure exact coincident endpoints.
  for(const es of links.groups){const y=Math.max(...es.map(e=>e.p.y));for(const e of es)e.p.y=y;}
  let modified=0,maxRaise=0,totalRaise=0,bridgePoints=0;
  for(const r of roads)for(const p of r.samples){
   const rise=p.y-original.get(p);
   if(rise>.001){modified++;totalRaise+=rise;maxRaise=Math.max(maxRaise,rise);}
   p.above=p.y-p.g;
   if(p.above>.85)bridgePoints++;
  }
  const afterGaps=links.groups.map(es=>Math.max(...es.map(e=>e.p.y))-Math.min(...es.map(e=>e.p.y)));
  const afterGrade=maxGrade(roads);
  if(afterGrade>.09005||Math.max(0,...afterGaps)>.012||maxRaise>7){
   // A safety rollback restores the previous verified 26-stage profile.
   for(const r of roads)for(const p of r.samples){p.y=original.get(p);p.above=p.y-p.g;}
   currentStats={stage:27,enabled:true,rolledBack:true,reason:'grade, junction or excessive elevation violated safe envelope',
    afterGrade,afterGapsMax:Math.max(0,...afterGaps),maxRaise};
   return currentStats;
  }
  currentStats={stage:27,enabled:true,rolledBack:false,roadCount:roads.length,
    sharedJunctions:links.groups.length,intentionalOverpassCrossingsPreserved:links.intentional,
    seamsOver5cmBefore:beforeGaps.filter(v=>v>.05).length,
    seamsOver5cmAfter:afterGaps.filter(v=>v>.05).length,
    maxSharedSeamBefore:Math.max(0,...beforeGaps),maxSharedSeamAfter:Math.max(0,...afterGaps),
    maxSlopeBefore:beforeGrade,maxSlopeAfter:afterGrade,
    modifiedSamples:modified,maxRaise,totalRaise,bridgePoints,
    mapReferenceChanged:false,newRoads:0,noBridgeClearanceReduced:true};
  return currentStats;
 }
 H.reconcileRoadProfiles477=function stage27UnifiedProfiles(roads){
  const result=baseReconcile(roads);
  if(enabled())repairRoads(roads);
  else currentStats={stage:27,enabled:false,unchangedStage26Profile:true};
  geo.stage27RoadStats=currentStats;
  return result;
 };
 H.registerRoadProfiles477=function stage27LayeredTerrainLookup(roads){
  const result=baseRegister(roads);
  terrainSegments=new Map();
  if(!enabled())return result;
  for(const road of roads)for(let i=1;i<road.samples.length;i++){
   const a=road.samples[i-1],b=road.samples[i],d=slopeDistance(a,b);
   if(d<.03||d>16)continue;
   const seg={road,a,b,dx:b.x-a.x,dz:b.z-a.z,d2:d*d,half:road.width*.5+1.35};
   for(let cx=Math.floor((Math.min(a.x,b.x)-seg.half)/24);cx<=Math.floor((Math.max(a.x,b.x)+seg.half)/24);cx++)
    for(let cz=Math.floor((Math.min(a.z,b.z)-seg.half)/24);cz<=Math.floor((Math.max(a.z,b.z)+seg.half)/24);cz++){
     const k=cx+','+cz,s=terrainSegments.get(k)||[];s.push(seg);terrainSegments.set(k,s);
    }
  }
  currentStats.terrainLookupCells=terrainSegments.size;
  return result;
 };
 // The water/shore mesh is on the GROUND layer at a grade-separated crossing.
 // The previous first-hit 2D route lookup may incorrectly pick the upper deck.
 // Only replace a first-hit road when a physically lower, overlapping roadway
 // is at least 1.25m below it. Otherwise keep the prior sample bit-for-bit.
 H.stage27TerrainRoadAt=function(x,z){
  const prior=geo.roadAt(x,z);
  if(!enabled()||!prior)return prior;
  const priorY=prior.a.y+(prior.b.y-prior.a.y)*prior.t;
  let best=null,bestY=priorY-1.25;
  for(const seg of terrainSegments.get(areaKey(x,z))||[]){
   const t=clamp(((x-seg.a.x)*seg.dx+(z-seg.a.z)*seg.dz)/seg.d2,0,1);
   const px=seg.a.x+seg.dx*t,pz=seg.a.z+seg.dz*t;
   if((x-px)**2+(z-pz)**2>seg.half**2)continue;
   const y=seg.a.y+(seg.b.y-seg.a.y)*t;
   if(y<bestY){bestY=y;best={road:seg.road,a:seg.a,b:seg.b,t};}
  }
  if(best){currentStats.terrainLowerLayerSamples=(currentStats.terrainLowerLayerSamples||0)+1;return best;}
  return prior;
 };
 // At approaches, the parapet must start low and taper into the full crest,
 // rather than appearing suddenly as an 85cm vertical end. Same 5 faces.
 if(typeof baseCrest==='function')H.city20Stage04BridgeCrest=function stage27Taper(road,p){
  const height=baseCrest(road,p);
  if(!enabled()||p.above>=1.18)return height;
  const t=clamp((p.above-.43)/.75,0,1),s=t*t*(3-2*t);
  return .16+(height-.16)*s;
 };
 // A switch to an adjacent route at a crossing should not teleport a vehicle
 // onto that neighboring bridge's parapet. Valid same-route rail impact stays.
 if(typeof baseRail==='function')H.guardBridgeRails477=function stage27SafeRail(car,oldX,oldZ){
  if(!enabled()||!car||!Number.isFinite(oldX+oldZ+car.x+car.z))return baseRail(car,oldX,oldZ);
  const old=H.closestBridge477(oldX,oldZ),now=H.closestBridge477(car.x,car.z);
  if(old&&now&&old.road.id!==now.road.id){currentStats.avoidedCrossRoadSnaps=(currentStats.avoidedCrossRoadSnaps||0)+1;return false;}
  const route=car.route477?.road?.id;
  if(route&&old&&old.road.id!==route){currentStats.avoidedUnrelatedRouteSnaps=(currentStats.avoidedUnrelatedRouteSnaps||0)+1;return false;}
  return baseRail(car,oldX,oldZ);
 };
 H.stage27RoadPolish={enabled,repairRoads,junctions,maxGrade,stats:()=>currentStats};
})(Heatline);
