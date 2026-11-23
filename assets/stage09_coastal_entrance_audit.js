/* SUNSET STATE — Stage 09 of 35. Coastal entry classification / future regression guard.
 * Legacy world contains dormant portal DESCRIPTORS for buildings pruned by CITY20.
 * A coastline scan over ALL descriptors falsely suggested flooded ENTERABLE doors.
 * Report active doors separately from dormant descriptors; validate the outward
 * pedestrian approach with the same coast field used by terrain and Stage06.
 * This is intentionally non-invasive: do not move buildings, alter collider meshes,
 * activate obsolete portals, or convert shoreline terrain based on stale data.
 * Disable for A/B comparison with ?stage09AuditOff=1.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||typeof H.reference469?.coast!=='function'||
    typeof H.stage06Orientation?.dir!=='function')
   throw Error('Stage09 needs accumulated reference coastline and Stage06/07 entry orientation');
 const off=()=>globalThis.__SUNSET_STAGE09_AUDIT_OFF===true||
   (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage09AuditOff'));
 const outward=[0,.75,1.5,2.15,3.1,4.5,6];
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function inspect(w,{strict=false}={}){
   if(!w||!Array.isArray(w.entrancePortals))throw Error('Stage09 missing world entrance portals');
   const coast=H.reference469.coast;
   const report={stage:9,issueId:'S01-BL-06',source:'reference469.coast signed terrain mask',
     gpuVerified:false,renderedScreenshotVerified:false,worldMutated:false,
     totalPortals:0,activePortals:0,dormantPortals:0,waterClassifiedAll:0,
     dormantWaterDescriptors:0,activeWaterAtDoor:0,activeWaterWithin6m:0,
     nearestActiveShore:null,nearestApproachShore6m:null,
     nearShoreAt8m:[],invalidPortals:[],flags:[],classification:'pending'};
   let approachMin=Infinity,doorMin=Infinity;
   for(const p of w.entrancePortals){
     report.totalPortals++;
     if(!p||!finite(p.x)||!finite(p.z)||!Number.isInteger(p.id)){
       report.invalidPortals.push(p?.id??null);continue;
     }
     const atDoor=coast(p.x,p.z);
     if(atDoor<0)report.waterClassifiedAll++;
     if(p.interiorReady!==true){
       report.dormantPortals++;
       if(atDoor<0)report.dormantWaterDescriptors++;
       continue;
     }
     report.activePortals++;
     const n=H.stage06Orientation.dir(p);
     if(!finite(n?.x)||!finite(n?.z)||Math.abs(Math.hypot(n.x,n.z)-1)>.02){
       report.invalidPortals.push(p.id);continue;
     }
     doorMin=Math.min(doorMin,atDoor);
     const sample=outward.map(distance=>({distance,shore:coast(p.x+n.x*distance,p.z+n.z*distance)}));
     const nearMin=Math.min(...sample.map(v=>v.shore));
     approachMin=Math.min(approachMin,nearMin);
     if(atDoor<0)report.activeWaterAtDoor++;
     if(nearMin<0)report.activeWaterWithin6m++;
     if(atDoor<0||nearMin<0)report.flags.push({portalId:p.id,atDoor,minimum6m:nearMin,facing:p.facing});
     const shore8=coast(p.x+n.x*8,p.z+n.z*8);
     if(shore8<3)report.nearShoreAt8m.push({portalId:p.id,shoreAt8m:+shore8.toFixed(3),minimum6m:+nearMin.toFixed(3)});
   }
   report.nearestActiveShore=Number.isFinite(doorMin)?+doorMin.toFixed(3):null;
   report.nearestApproachShore6m=Number.isFinite(approachMin)?+approachMin.toFixed(3):null;
   report.classification=report.invalidPortals.length||report.flags.length?'active_portal_requires_review':
     report.dormantWaterDescriptors?'historical_inactive_descriptors_only':'no_portals_in_water';
   if(strict&&(report.flags.length||report.invalidPortals.length))
     throw Error('Stage09 active coast safety regression: '+JSON.stringify({flags:report.flags,invalid:report.invalidPortals}));
   return report;
 }
 function install(w){
   if(w.stage09CoastalAudit)return w.stage09CoastalAudit;
   const stat=inspect(w);
   w.stage09CoastalAudit=stat;
   return stat;
 }
 H.stage09CoastalEntries={off,inspect,install,outwardSamples:outward.slice()};
 H.finishReferenceBuildings469=function stage09Final(w){
   const result=previous(w);
   if(!off())install(w);
   return result;
 };
})(Heatline);
