/* SUNSET STATE: Stage 10 / 35. Live planter placement verification.
 * A historical count of 181 risky planter shrubs was computed BEFORE
 * Stage04 removed orphan decorations belonging to 215 pruned buildings.
 * Do not move safe live planters to satisfy this stale count.
 * This module audits live geometry at nine footprint locations, verifies
 * foliage pairing and pedestrian clearance, and can relocate future genuinely
 * unsafe sites as a rigid group, or report ones with no provably safe site.
 * Game render/GPU/FPS verification is outside this CPU audit.
 * Disable with ?stage10PlantersOff=1, or __SUNSET_STAGE10_PLANTERS_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||typeof H.reference469?.coast!=='function'||
  typeof H.coast461?.isRouteRoad!=='function'||typeof H.stage06Orientation?.dir!=='function')
  throw Error('Stage10 requires full accumulated city, coast and door orientation systems');
 const disabled=()=>globalThis.__SUNSET_STAGE10_PLANTERS_OFF===true||
   (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage10PlantersOff'));
 const round=v=>+v.toFixed(3);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const finite=n=>Number.isFinite(n);
 const kinds=['planter-base','plant-canopy','safety-bollard','planter-shrub'];
 const footprint=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
 const rings=[.65,1.15,1.85,2.6,3.5,4.8,6,7.5,9];
 const streetKind=b=>b.city20Stage15Kind||b.city20Stage16Kind;
 function context(w){
  const byPortal=new Map(),bases=[],portals=new Map(w.entrancePortals.map(p=>[p.id,p]));
  for(const b of w.boxes){const kind=streetKind(b);if(!kinds.includes(kind))continue;
   const id=b.city20Stage15Portal??b.city20Stage16Portal;
   if(!Number.isInteger(id))continue;
   if(!byPortal.has(id))byPortal.set(id,{base:[],canopy:[],bollard:[],shrub:[]});
   const group=byPortal.get(id);if(kind==='planter-base'){bases.push(b);group.base.push(b)}
   else if(kind==='plant-canopy')group.canopy.push(b);
   else if(kind==='safety-bollard')group.bollard.push(b);
   else if(kind==='planter-shrub')group.shrub.push(b);
  }
  const entries=w.entrancePortals.filter(p=>p.interiorReady===true);
  return {portals,byPortal,bases,entries};
 }
 function pieces(group,base){
   return {canopy:group.canopy.filter(b=>dist(b,base)<.09),
     shrub:group.shrub.filter(b=>dist(b,base)<.09),
     bollard:group.bollard.filter(b=>dist(b,base)<1.68)};
 }
 function assess(w,c,base,x=base.x,z=base.z,exclude=base){
   const result={safe:true,reasons:[],minShore:null};
   const flag=r=>{if(!result.reasons.includes(r))result.reasons.push(r);result.safe=false;};
   if(!finite(x)||!finite(z)||!finite(base.w)||!finite(base.d)){
     flag('invalid_geometry');return result;
   }
   const p=c.portals.get(base.city20Stage15Portal);
   if(!p||p.interiorReady!==true){flag('inactive_or_missing_owner');return result;}
   // Check the actual square base footprint, not merely the decorative shrub center.
   let shoreMin=Infinity;
   for(const [fx,fz] of footprint){const qx=x+fx*(base.w*.5+.08),qz=z+fz*(base.d*.5+.08),shore=H.reference469.coast(qx,qz);
     if(typeof shore!=='number'||Number.isNaN(shore)||shore===-Infinity){flag('coast_unknown');continue;}
     if(shore<.1)flag('water_footprint');
     if(H.coast461.isRouteRoad(qx,qz))flag('road_footprint');
     shoreMin=Math.min(shoreMin,shore);
   }
   result.minShore=finite(shoreMin)?round(shoreMin):null; // Infinity means inland, never NaN.
   if(typeof w.nearby==='function')for(const solid of w.nearby(x,z)){
     if(solid.stage12Source===base)continue;
     if(Math.abs(solid.x-x)<solid.hw+base.w*.5+.06&&
        Math.abs(solid.z-z)<solid.hd+base.d*.5+.06){flag('solid_overlap');break;}
   }
   for(const other of c.bases){if(other===exclude)continue;
     if(Math.hypot(other.x-x,other.z-z)<.9){flag('another_planter_overlap');break;}
   }
   // Avoid door travel strips in front of ANY active facade, not just its owner.
   for(const entry of c.entries){if(Math.hypot(entry.x-x,entry.z-z)>11)continue;
     const n=H.stage06Orientation.dir(entry);if(!finite(n?.x)||!finite(n?.z)){flag('invalid_entry_facing');break;}
     const dx=x-entry.x,dz=z-entry.z,forward=dx*n.x+dz*n.z,lateral=Math.abs(-dx*n.z+dz*n.x);
     if(forward>-.1&&forward<6.1&&lateral<entry.width*.5+.62){flag('entry_walkway_overlap');break;}
   }
   if(Math.hypot(x-p.x,z-p.z)>14)flag('too_far_from_own_frontage');
   return result;
 }
 function candidate(w,c,base){
   const p=c.portals.get(base.city20Stage15Portal);
   if(!p||p.interiorReady!==true)return null;
   const n=H.stage06Orientation.dir(p),t={x:-n.z,z:n.x},
    oldSide=(base.x-p.x)*t.x+(base.z-p.z)*t.z;
   // Keep near the original frontage and on its original flank if feasible.
   for(const radius of rings)for(let j=0;j<24;j++){
     const a=(j*2.399963229728653)+radius*.41;
     const x=base.x+Math.cos(a)*radius,z=base.z+Math.sin(a)*radius;
     const newSide=(x-p.x)*t.x+(z-p.z)*t.z;
     if(Math.abs(oldSide)>1&&Math.sign(oldSide)!==Math.sign(newSide))continue;
     const test=assess(w,c,base,x,z);
     if(test.safe)return {x,z,distance:Math.hypot(base.x-x,base.z-z),shore:test.minShore};
   }
   return null;
 }
 function audit(w,{strict=false}={}){
   if(!w||!Array.isArray(w.boxes)||!Array.isArray(w.entrancePortals))throw Error('Stage10 invalid world');
   const c=context(w),s={stage:10,issueId:'S01-ST-01',historicalUnresolvedBeforeStage04:w.city20DeepAuditRepairStats?.unresolvedPlanters??null,
     historicalOriginallyAuthored:w.city20Stage15Stats?.planters??null,
     historicalOrphanVisualsRemoved:w.stage04AccessStats?.orphanVisualsRemoved??null,
     livePlanterSites:c.bases.length,liveShrubs:0,liveCanopies:0,liveBollards:0,
     activeOwnedSites:0,orphanSites:0,unsafeSites:0,unsafeFootprints:0,unsafeRoad:0,
     unsafeWater:0,blockedWalkways:0,solidOverlaps:0,unpairedSites:0,
     suspicious:[],gpuVerified:false,frameRateVerified:false,classification:'pending'};
   for(const base of c.bases){const p=c.portals.get(base.city20Stage15Portal),group=c.byPortal.get(base.city20Stage15Portal),related=pieces(group,base),test=assess(w,c,base);
     if(p?.interiorReady)s.activeOwnedSites++;else s.orphanSites++;
     s.liveCanopies+=related.canopy.length;s.liveShrubs+=related.shrub.length;s.liveBollards+=related.bollard.length;
     if(related.canopy.length!==1||related.shrub.length!==1||related.bollard.length!==1){s.unpairedSites++;test.reasons.push('incomplete_planter_group');test.safe=false;}
     if(!test.safe){s.unsafeSites++;
       if(test.reasons.some(r=>r==='road_footprint'||r==='water_footprint'))s.unsafeFootprints++;
       if(test.reasons.includes('road_footprint'))s.unsafeRoad++;
       if(test.reasons.includes('water_footprint'))s.unsafeWater++;
       if(test.reasons.includes('entry_walkway_overlap'))s.blockedWalkways++;
       if(test.reasons.includes('solid_overlap'))s.solidOverlaps++;
       s.suspicious.push({portalId:base.city20Stage15Portal,x:round(base.x),z:round(base.z),reason:[...new Set(test.reasons)]});
     }
   }
   s.classification=s.unsafeSites?'live_planters_require_attention':
     s.historicalUnresolvedBeforeStage04?'historical_orphan_decor_removed':'clear';
   if(strict&&s.unsafeSites)throw Error('Stage10 unsafe live planter sites: '+JSON.stringify(s.suspicious.slice(0,8)));
   return s;
 }
 function relocate(w){
   if(w.stage10PlanterAudit)return w.stage10PlanterAudit;
   const c=context(w),actions=[],unresolved=[];
   for(const base of c.bases){
     const before=assess(w,c,base);
     if(before.safe)continue;
     const group=c.byPortal.get(base.city20Stage15Portal),linked=pieces(group,base);
     if(linked.canopy.length!==1||linked.shrub.length!==1||linked.bollard.length!==1){
       unresolved.push({portalId:base.city20Stage15Portal,reasons:['unpaired_group']});continue;
     }
     const dest=candidate(w,c,base);
     if(!dest){unresolved.push({portalId:base.city20Stage15Portal,reasons:before.reasons});continue;}
     const dx=dest.x-base.x,dz=dest.z-base.z;
     const from=H.outdoorHeight(base.x,base.z),to=H.outdoorHeight(dest.x,dest.z);
     if(!finite(from)||!finite(to)){
       unresolved.push({portalId:base.city20Stage15Portal,reasons:['invalid_ground_height']});continue;
     }
     for(const item of [base,linked.canopy[0],linked.shrub[0],linked.bollard[0]]){
       item.x+=dx;item.z+=dz;item.y+=to-from;
     }
     actions.push({portalId:base.city20Stage15Portal,meters:round(dest.distance),reason:before.reasons});
   }
   const report=audit(w);
   report.movedSites=actions.length;report.movedPieces=actions.length*4;
   report.relocationActions=actions;report.unresolvedAttempts=unresolved;
   report.worldGeometryAdded=0;report.newCollisions=0;
   report.worldMutated=actions.length>0;
   w.stage10PlanterAudit=report;return report;
 }
 H.stage10Planters={disabled,context,assess,audit,relocate};
 H.finishReferenceBuildings469=function stage10Final(w){const v=previous(w);
   if(!disabled()&&w.stage04AccessStats)relocate(w);
   return v;
 };
})(Heatline);
