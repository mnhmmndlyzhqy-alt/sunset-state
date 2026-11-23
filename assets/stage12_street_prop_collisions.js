/* SUNSET STATE -- Stage 12/35: selective physical street furniture.
 * Restore gameplay contact to sturdy stage15 frontage pieces only:
 * planter stone bases, metal safety bollards and stationary lamp posts.
 * Keep leaves, lamp heads and painted low curb accents non-blocking.
 * Use the native World.solid(..., true) path: stored in propSolids and
 * spatial collision grid, so player/NPC/car collision sees them without
 * changing legacy building solids, doors, roads, mesh count or the map.
 * No claims about actual browser GPU or FPS performance are made.
 * A/B: ?stage12PropsOff=1 or __SUNSET_STAGE12_PROPS_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||typeof H.stage10Planters?.audit!=='function'||
    typeof H.stage11Lamps?.audit!=='function'||typeof H.stage06Orientation?.dir!=='function')
   throw Error('Stage12 requires cumulative stages 6,10 and 11');
 const off=()=>globalThis.__SUNSET_STAGE12_PROPS_OFF===true||
  (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage12PropsOff'));
 const collidable=new Set(['planter-base','safety-bollard','streetlamp-post']);
 const samples=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
 const finite=Number.isFinite;
 const near=(a,b,pad=.02)=>Math.abs(a.x-b.x)<a.hw+b.hw+pad&&Math.abs(a.z-b.z)<a.hd+b.hd+pad;
 function safety(w,box,soFar,portals,entries){
   const reasons=[],fail=k=>{if(!reasons.includes(k))reasons.push(k);};
   if(![box.x,box.z,box.w,box.d,box.h].every(finite)||box.w<=0||box.d<=0||box.h<.13){
     fail('invalid_dimensions');return reasons;}
   const owner=portals.get(box.city20Stage15Portal);
   if(!owner?.interiorReady)fail('inactive_owner');
   const body={x:box.x,z:box.z,hw:box.w*.5,hd:box.d*.5};
   for(const [sx,sz] of samples){
     const x=body.x+sx*(body.hw+.045),z=body.z+sz*(body.hd+.045);
     if(H.reference469.coast(x,z)<.1)fail('water');
     if(H.coast461.isRouteRoad(x,z))fail('road');
   }
   for(const s of w.nearby(body.x,body.z))if(near(body,s,.025)){fail('legacy_solid');break;}
   for(const s of soFar)if(near(body,s,.04)){fail('another_prop');break;}
   for(const p of entries){
     if(Math.hypot(p.x-body.x,p.z-body.z)>11)continue;
     const n=H.stage06Orientation.dir(p);
     if(!finite(n?.x)||!finite(n?.z)){fail('missing_door_direction');break;}
     const dx=body.x-p.x,dz=body.z-p.z,forward=dx*n.x+dz*n.z;
     const lateral=Math.abs(-dx*n.z+dz*n.x);
     // No obstacle in front of a usable door, including the walker radius.
     if(forward>-.3&&forward<6.3&&lateral<(p.width||1.5)*.5+.59){
       fail('entrance_corridor');break;}
   }
   return reasons;
 }
 function sync(w){
   const a=w.stage12StreetPropSolids;
   if(!Array.isArray(a))return {synced:0};
   let changed=0;
   // Retire only OUR entries from spatial cells; leave all other indexing intact.
   for(const [key,arr] of w.spatial){
     const kept=arr.filter(s=>!s.stage12StreetProp);
     if(kept.length!==arr.length){if(kept.length)w.spatial.set(key,kept);else w.spatial.delete(key);}
   }
   for(const s of a){const b=s.stage12Source;
     if(!b)throw Error('Stage12 collider lost its visual counterpart');
     if(Math.abs(s.x-b.x)>1e-7||Math.abs(s.z-b.z)>1e-7)changed++;
     s.x=b.x;s.z=b.z;s.hw=b.w*.5;s.hd=b.d*.5;
     const minX=Math.floor((s.x-s.hw)/H.BLOCK),maxX=Math.floor((s.x+s.hw)/H.BLOCK);
     const minZ=Math.floor((s.z-s.hd)/H.BLOCK),maxZ=Math.floor((s.z+s.hd)/H.BLOCK);
     for(let i=minX;i<=maxX;i++)for(let j=minZ;j<=maxZ;j++){
       const key=`${i},${j}`,list=w.spatial.get(key)||[];
       list.push(s);w.spatial.set(key,list);
     }
   }
   w.nearbyRegions473?.clear();
   return {synced:a.length,moved:changed};
 }
 function audit(w,{strict=false}={}){
   const a=w.stage12StreetPropSolids||[],active=new Map(w.entrancePortals.map(p=>[p.id,p]));
   const found=new Set(),issues=[],byKind={};
   for(const s of a){
     byKind[s.stage12StreetKind]=(byKind[s.stage12StreetKind]||0)+1;
     const b=s.stage12Source;
     if(!b||!collidable.has(s.stage12StreetKind)||!active.get(s.stage12StreetPortal)?.interiorReady)
       issues.push({kind:'invalid_source_or_owner',portal:s.stage12StreetPortal});
     if(b&&(Math.abs(s.x-b.x)>1e-6||Math.abs(s.z-b.z)>1e-6||Math.abs(s.hw-b.w*.5)>1e-6||Math.abs(s.hd-b.d*.5)>1e-6))
       issues.push({kind:'geometry_not_synced',portal:s.stage12StreetPortal});
     if(!w.propSolids.includes(s)||w.solids.includes(s))issues.push({kind:'wrong_collision_collection',portal:s.stage12StreetPortal});
     if(!w.nearby(s.x,s.z).includes(s))issues.push({kind:'missing_spatial_index',portal:s.stage12StreetPortal});
     if(found.has(b))issues.push({kind:'duplicate_collider',portal:s.stage12StreetPortal});
     found.add(b);
   }
   const all=w.boxes.filter(b=>collidable.has(b.city20Stage15Kind));
   for(const b of all)if(!found.has(b))issues.push({kind:'visible_solid_without_collision',portal:b.city20Stage15Portal,btype:b.city20Stage15Kind});
   for(const b of w.boxes){if(['plant-canopy','streetlamp-head','curb-accent'].includes(b.city20Stage15Kind)||
     ['planter-shrub','tree-crown','garden-shrub'].includes(b.city20Stage16Kind)){
      if(found.has(b))issues.push({kind:'decorative_element_is_solid'});
   }}
   const result={stage:12,issueId:'S01-ST-03',collisionCount:a.length,byKind,
     visibleSolidCandidates:all.length,covered:found.size,missing:all.length-found.size,
     issues,legacyBuildingSolids:w.solids.length,originalCity20Stage15VisualCount:w.city20Stage15Stats?.geometryAdded??null,
     drawnGeometry:w.boxes.length,activeEntrances:w.entrancePortals.filter(p=>p.interiorReady).length,
     roads:w.roads461.length,gpuVerified:false,real1080p50FpsVerified:false};
   if(strict&&issues.length)throw Error('Stage12 invalid collisions: '+JSON.stringify(issues.slice(0,8)));
   return result;
 }
 function install(w){
   if(w.stage12PropAudit)return w.stage12PropAudit;
   if(!Array.isArray(w.propSolids)||!w.spatial||typeof w.solid!=='function'||
      typeof w.nearby!=='function'||!w.stage11LampAudit||!w.stage10PlanterAudit)
     throw Error('Stage12 requires loaded world and prior stage audits');
   const portals=new Map(w.entrancePortals.map(p=>[p.id,p])),
     entries=w.entrancePortals.filter(p=>p.interiorReady),existing=w.boxes.filter(b=>collidable.has(b.city20Stage15Kind)),
     baseline={boxes:w.boxes.length,solids:w.solids.length,props:w.propSolids.length,
       entrances:w.entrancePortals.length,roads:w.roads461.length},
     added=[],skipped=[];
   // Every source must be proven safe before adding any physical obstacle.
   // This also checks cross-prop overlap in a single pass.
   for(const b of existing){
     const why=safety(w,b,added,portals,entries);
     if(why.length){skipped.push({portalId:b.city20Stage15Portal,kind:b.city20Stage15Kind,why});continue;}
     w.solid(b.x,b.z,b.w,b.d,true);
     const s=w.propSolids[w.propSolids.length-1];
     s.stage12StreetProp=true;s.stage12Source=b;s.stage12StreetKind=b.city20Stage15Kind;
     s.stage12StreetPortal=b.city20Stage15Portal;
     added.push(s);
   }
   w.stage12StreetPropSolids=added;
   if(w.boxes.length!==baseline.boxes||w.solids.length!==baseline.solids||
     w.entrancePortals.length!==baseline.entrances||w.roads461.length!==baseline.roads)
     throw Error('Stage12 mutated building, visual, road, or portal topology');
   if(added.length!==existing.length)throw Error('Stage12 refuses incomplete collision coverage: '+JSON.stringify(skipped.slice(0,6)));
   const stats=audit(w,{strict:true});
   stats.initialVisibleCandidates=existing.length;stats.newPropSolids=w.propSolids.length-baseline.props;
   stats.originalPropSolids=baseline.props;stats.newLegacySolids=w.solids.length-baseline.solids;
   stats.visualMeshesAdded=w.boxes.length-baseline.boxes;
   stats.unresolved=skipped;stats.performance='spatially_indexed_static_prop_solids';
   w.stage12PropAudit=stats;
   return stats;
 }
 H.stage12StreetProps={off,safety,sync,audit,install};
 // Future explicit stage10 / stage11 relocation must move the matching physics.
 for(const [api,name] of [[H.stage10Planters,'relocate'],[H.stage11Lamps,'repair']]){
   const old=api[name];if(typeof old!=='function')continue;
   api[name]=function stage12SyncAfterRelocation(w,...args){const output=old.call(this,w,...args);
     if(w?.stage12StreetPropSolids&&!off())sync(w);
     return output;};
 }
 H.finishReferenceBuildings469=function stage12Final(w){const result=previous(w);
   if(!off()&&w.stage11LampAudit)install(w);
   return result;
 };
})(Heatline);
