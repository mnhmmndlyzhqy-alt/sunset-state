/* SUNSET STATE / Stage17 of 35, S01-RT-01.
 * Preserve the cumulative deep-audit repair of the 60 street storefronts.
 * This is a deterministic, one-time contract + regression guard, not 60 new
 * shop interiors.  54 repaired storefronts have an existing indoor retail
 * scene/counter; the other 6 are legitimate OUTDOOR E-service venues.
 * Five additional independent indoor shops are preserved separately.
 * No meshes, portals, collisions, routes or storefront UI are replaced.
 * A/B disable: ?stage17RetailOff=1, global flag, or test env via bootstrap.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const previous=H.finishReferenceBuildings469;
  if(typeof previous!=='function')throw Error('Stage17 requires existing cumulative world');
  const off=()=>globalThis.__SUNSET_STAGE17_RETAIL_OFF===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
      new URLSearchParams(location.search).has('stage17RetailOff'));
  const valid=n=>Number.isFinite(n);
  function enhance(w){
    if(w.stage17RetailStats)return w.stage17RetailStats;
    if(off()||!w.city20DeepAuditRepairStats||
       H.city20DeepAuditRepair?.disabled?.()===true||
       H.city20Stage14?.disabled?.()===true)return null;
    if(!Array.isArray(w.streetVenues)||!Array.isArray(w.retailShops)||
       !Array.isArray(w.entrancePortals)||!Array.isArray(w.boxes))
      throw Error('Stage17 missing original shopping systems');
    const before={geometry:w.boxes.length,solids:w.solids.length,
      propSolids:w.propSolids.length,portals:w.entrancePortals.length,
      roads:w.roads461.length,glass:w.glassPanels.length,
      shops:w.retailShops.length,venues:w.streetVenues.length};
    const byVenue=new Map();
    for(const b of w.boxes){
      if(!String(b.city20AuditKind||'').startsWith('venue-'))continue;
      if(!valid(b.city20AuditOwner))throw Error('Stage17 storefront missing stable owner ID');
      let a=byVenue.get(b.city20AuditOwner);
      if(!a){a=[];byVenue.set(b.city20AuditOwner,a);}a.push(b);
    }
    const byID=new Map(w.streetVenues.map(v=>[v.id,v]));
    const shopByID=new Map(w.retailShops.map(v=>[v.id,v]));
    const readyByBuilding=new Map();
    for(const p of w.entrancePortals)if(p.interiorReady){
      const key=p.buildingX+','+p.buildingZ;
      if(!readyByBuilding.has(key))readyByBuilding.set(key,p);
    }
    const records=[],retailIDs=new Set();let decorated=0,inside=0,outside=0;
    for(const [id,parts] of [...byVenue.entries()].sort((a,b)=>a[0]-b[0])){
      const v=byID.get(id);
      if(!v||!valid(v.buildingId)||!valid(v.frontageX)||!valid(v.frontageZ))
        throw Error('Stage17 recovered storefront has no live, anchored venue: '+id);
      const b=w.buildings[v.buildingId];
      if(!b)throw Error('Stage17 storefront lost its parent building: '+id);
      const lobby=readyByBuilding.get(b.x+','+b.z);
      if(!lobby)throw Error('Stage17 storefront lost its accessible parent lobby: '+id);
      const kinds=new Set(parts.map(p=>p.city20AuditKind));
      for(const kind of ['venue-signband','venue-sign-trim','venue-door-canopy'])
        if(!kinds.has(kind))throw Error('Stage17 storefront trim disappeared: '+id+':'+kind);
      const shop=shopByID.get(id)||null,retail=shop?.retail||null;
      if(shop&&!retail)throw Error('Stage17 indoor shop has no retail frontage: '+id);
      const mode=retail?'interior-counter':'street-service';
      if(retail){
        if(![retail.doorX,retail.doorZ,retail.centerX,retail.frontZ,retail.width]
           .every(valid)||retail.width<1.82)
          throw Error('Stage17 unsafe retail doorway: '+id);
        for(const kind of ['venue-window-jamb','venue-window-header'])
          if(!kinds.has(kind))throw Error('Stage17 shop window trim lost: '+id+':'+kind);
        inside++;retailIDs.add(id);
      }else{outside++;}
      decorated+=parts.length;
      records.push({id,venueId:v.id,buildingId:v.buildingId,
        lobbyPortalId:lobby.id,kind:v.kind,label:v.label,mode,
        frontage:{x:v.frontageX,z:v.frontageZ},
        action:retail?'E-enter / counter purchase':'E-visit / O-street purchase',
        door:retail?{x:retail.doorX,z:retail.doorZ}:null,
        storefrontParts:parts.length});
    }
    const count=w.city20DeepAuditRepairStats.commercialVenues;
    const parts=w.city20DeepAuditRepairStats.storefrontDetailsAdded;
    if(records.length!==count||decorated!==parts||records.length<60)
      throw Error('Stage17 prior 60-venue storefront fix was regressed');
    const extraShops=w.retailShops.filter(v=>!retailIDs.has(v.id));
    for(const v of extraShops)if(!v.retail||
      ![v.retail.doorX,v.retail.doorZ].every(valid))
      throw Error('Stage17 an independent shop lost its door: '+v.id);
    const after={geometry:w.boxes.length,solids:w.solids.length,
      propSolids:w.propSolids.length,portals:w.entrancePortals.length,
      roads:w.roads461.length,glass:w.glassPanels.length,
      shops:w.retailShops.length,venues:w.streetVenues.length};
    if(Object.keys(before).some(k=>before[k]!==after[k]))
      throw Error('Stage17 changed gameplay objects while auditing commerce');
    w.stage17VenueContracts=records;
    w.stage17RetailStats={issue:'S01-RT-01',stage:17,recoveredVenues:records.length,
      existingAuditedStorefrontMeshes:decorated,interiorStoresAmongRecovered:inside,
      outdoorServicesAmongRecovered:outside,independentIndoorStores:extraShops.length,
      totalWalkInShops:w.retailShops.length,streetVenues:w.streetVenues.length,
      geometryAdded:0,collisionAdded:0,portalChanges:0,roadChanges:0,
      shopListChanges:0,baselineStage14OriginalStillInactive:
        w.city20Stage14Stats?.commercialFronts===0,gpuValidated:false};
    return w.stage17RetailStats;
  }
  H.stage17Retail={off,enhance};
  H.finishReferenceBuildings469=function stage17RetailWorld(w){
    const result=previous(w);if(!off())enhance(w);return result;
  };
})(Heatline);
