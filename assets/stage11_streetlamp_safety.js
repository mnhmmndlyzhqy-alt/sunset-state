/* SUNSET STATE — Stage 11/35. Live streetlamp audit and ground alignment.
 * Original audit logged 30 unresolved ornamental lamps before Stage 04 pruned
 * obsolete buildings and their facade decorations. Only inspect live objects.
 * Preserve the position of every safe lamp; correct the lamp/pair Y as one unit
 * to sit on outdoorHeight. If a future lamp is unsafe, search a nearby safe
 * alternative and move the pole and head together. No roads, colliders or
 * portals are authored. Node CPU checks are NOT a rendered WebGL/FPS test.
 * A/B: ?stage11LampsOff=1, or __SUNSET_STAGE11_LAMPS_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||typeof H.reference469?.coast!=='function'||
    typeof H.coast461?.isRouteRoad!=='function'||
    typeof H.stage06Orientation?.dir!=='function')
   throw Error('Stage11 requires accumulated city, terrain, roads and entrance orientation');
 const disabled=()=>globalThis.__SUNSET_STAGE11_LAMPS_OFF===true||
   (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage11LampsOff'));
 const samples=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
 const offsets=[.55,1.15,1.85,2.65,3.65,4.85,6.1,7.9,9.5];
 const round=n=>Number.isFinite(n)?+n.toFixed(4):null;
 const finite=Number.isFinite;
 const planar=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function collect(w){
   if(!w||!Array.isArray(w.boxes)||!Array.isArray(w.entrancePortals))throw Error('Stage11 invalid world');
   const posts=[],heads=[],entries=w.entrancePortals.filter(p=>p.interiorReady===true),portals=new Map(w.entrancePortals.map(p=>[p.id,p]));
   for(const b of w.boxes){if(b.city20Stage15Kind==='streetlamp-post')posts.push(b);
     else if(b.city20Stage15Kind==='streetlamp-head')heads.push(b);}
   const byPortalHeads=new Map();
   for(const head of heads){const k=head.city20Stage15Portal;const group=byPortalHeads.get(k)||[];group.push(head);byPortalHeads.set(k,group);}
   return {posts,heads,entries,portals,byPortalHeads};
 }
 function match(c,post){return (c.byPortalHeads.get(post.city20Stage15Portal)||[])
     .filter(h=>planar(h,post)<.13);}
 function assess(w,c,post,x=post.x,z=post.z){
   const issues=[],flag=k=>{if(!issues.includes(k))issues.push(k)};
   const owner=c.portals.get(post.city20Stage15Portal);
   if(!finite(x)||!finite(z)||![post.w,post.d,post.h].every(finite)||
     post.w<=0||post.d<=0||post.h<=0){flag('invalid_geometry');return {safe:false,issues,head:null,ground:null,baseOffset:null};}
   if(!owner?.interiorReady)flag('no_live_owner');
   const pairs=match(c,post),head=pairs.length===1?pairs[0]:null;
   if(pairs.length!==1)flag('unpaired_head');
   const horizontalPad=.13;
   for(const [fx,fz] of samples){
     const px=x+fx*(post.w*.5+horizontalPad),pz=z+fz*(post.d*.5+horizontalPad);
     const coast=H.reference469.coast(px,pz);
     if(typeof coast!=='number'||Number.isNaN(coast))flag('unknown_coast');
     else if(coast<.1)flag('water_footprint');
     if(H.coast461.isRouteRoad(px,pz))flag('road_footprint');
   }
   if(typeof w.nearby==='function')for(const s of w.nearby(x,z)){
     if(s.stage12Source===post)continue;
     if(Math.abs(s.x-x)<s.hw+post.w*.5+.12&&Math.abs(s.z-z)<s.hd+post.d*.5+.12){flag('solid_overlap');break;}
   }
   for(const e of c.entries){
     if(Math.hypot(e.x-x,e.z-z)>11)continue;
     const n=H.stage06Orientation.dir(e);
     if(!finite(n?.x)||!finite(n?.z)){flag('unknown_entry_direction');break;}
     const dx=x-e.x,dz=z-e.z,forward=dx*n.x+dz*n.z,lateral=Math.abs(-dx*n.z+dz*n.x);
     if(forward>-.2&&forward<6.4&&lateral<(e.width||1.5)*.5+.45){flag('entry_walkway_overlap');break;}
   }
   for(const other of c.posts){if(other===post)continue;
     if(planar({x,z},other)<1.15){flag('near_another_lamp');break;}
   }
   if(owner&&Math.hypot(x-owner.x,z-owner.z)>16)flag('too_far_from_owner');
   const ground=H.outdoorHeight(x,z);
   if(!finite(ground))flag('unknown_ground');
   const baseOffset=finite(ground)?post.y-post.h*.5-ground:null;
   return {safe:issues.length===0,issues,head,ground:finite(ground)?ground:null,baseOffset};
 }
 function alternate(w,c,post){
   const p=c.portals.get(post.city20Stage15Portal);
   if(!p?.interiorReady)return null;
   const n=H.stage06Orientation.dir(p);if(!finite(n?.x)||!finite(n?.z))return null;
   const t={x:-n.z,z:n.x},side=(post.x-p.x)*t.x+(post.z-p.z)*t.z;
   for(const r of offsets)for(let j=0;j<24;j++){
     const angle=j*2.399963229728653+r*.41,x=post.x+Math.cos(angle)*r,z=post.z+Math.sin(angle)*r;
     const candidateSide=(x-p.x)*t.x+(z-p.z)*t.z;
     if(Math.abs(side)>1&&Math.sign(side)!==Math.sign(candidateSide))continue;
     const check=assess(w,c,post,x,z);
     if(check.safe)return {x,z,ground:check.ground,offset:round(Math.hypot(x-post.x,z-post.z))};
   }
   return null;
 }
 function audit(w,{strict=false}={}){
   const c=collect(w),results={stage:11,issueId:'S01-ST-02',historicalUnresolvedLamps:w.city20DeepAuditRepairStats?.unresolvedLamps??null,
     originallyAuthoredLamps:w.city20Stage15Stats?.lightPosts??null,
     livePosts:c.posts.length,liveHeads:c.heads.length,activeOwnerPosts:0,inactiveOwnerPosts:0,
     pairedPosts:0,unsafeHorizontalSites:0,misalignedBasesOver2cm:0,
     floatingBasesOver20cm:0,buriedBasesOver20cm:0,maxAbsoluteBaseOffset:0,
     issues:[],gpuVerified:false,real1080pFpsVerified:false};
   const countedHeads=new Set();
   for(const post of c.posts){const s=assess(w,c,post),owner=c.portals.get(post.city20Stage15Portal);
     if(owner?.interiorReady)results.activeOwnerPosts++;else results.inactiveOwnerPosts++;
     if(s.head){results.pairedPosts++;countedHeads.add(s.head);}
     if(s.issues.length){results.unsafeHorizontalSites++;
       results.issues.push({ownerId:post.city20Stage15Portal,x:round(post.x),z:round(post.z),reasons:s.issues});}
     if(finite(s.baseOffset)){
       const gap=Math.abs(s.baseOffset);results.maxAbsoluteBaseOffset=Math.max(results.maxAbsoluteBaseOffset,gap);
       if(gap>.02)results.misalignedBasesOver2cm++;
       if(s.baseOffset>.20)results.floatingBasesOver20cm++;
       if(s.baseOffset<-.20)results.buriedBasesOver20cm++;
     }
   }
   results.orphanHeads=c.heads.length-countedHeads.size;
   results.maxAbsoluteBaseOffset=round(results.maxAbsoluteBaseOffset);
   results.cleared=results.unsafeHorizontalSites===0&&results.orphanHeads===0&&results.misalignedBasesOver2cm===0;
   if(strict&&!results.cleared)throw Error('Stage11 live lamp issues: '+JSON.stringify({unsafe:results.issues.slice(0,4),vertical:results.misalignedBasesOver2cm,orphanHeads:results.orphanHeads}));
   return results;
 }
 function repair(w,{force=false}={}){
   if(w.stage11LampAudit&&!force)return w.stage11LampAudit;
   const old=w.stage11LampAudit; // retain old result in case an injected probe aborts
   const c=collect(w),before=audit(w),moves=[],unresolved=[],alignment=[];
   for(const post of c.posts){
     const tested=assess(w,c,post);if(!tested.head){unresolved.push({id:post.city20Stage15Portal,reasons:tested.issues});continue;}
     const head=tested.head;
     let dest={x:post.x,z:post.z,ground:tested.ground,offset:0};
     if(!tested.safe){
       dest=alternate(w,c,post);
       if(!dest){unresolved.push({id:post.city20Stage15Portal,reasons:tested.issues});continue;}
     }
     if(!finite(dest.ground)){unresolved.push({id:post.city20Stage15Portal,reasons:['unknown_ground']});continue;}
     const dx=dest.x-post.x,dz=dest.z-post.z;
     // The pole bottom (post.y - post.h/2) sits on the ground surface.
     const correctedPostY=dest.ground+post.h*.5,dy=correctedPostY-post.y;
     if(Math.abs(dx)>.00001||Math.abs(dz)>.00001){
       post.x+=dx;post.z+=dz;head.x+=dx;head.z+=dz;
       moves.push({id:post.city20Stage15Portal,meters:round(Math.hypot(dx,dz)),oldReasons:tested.issues});
     }
     if(Math.abs(dy)>.015){post.y+=dy;head.y+=dy;
       alignment.push({id:post.city20Stage15Portal,verticalMeters:round(dy)});
     }
   }
   const after=audit(w);
   after.preRepair={unsafeSites:before.unsafeHorizontalSites,misalignedBasesOver2cm:before.misalignedBasesOver2cm,
      floatingBasesOver20cm:before.floatingBasesOver20cm,buriedBasesOver20cm:before.buriedBasesOver20cm,
      maximumAbsOffset:before.maxAbsoluteBaseOffset};
   after.horizontalRelocations=moves.length;after.heightCorrections=alignment.length;
   after.relocatedPairs=moves;after.heightCorrectionSample=alignment.slice(0,12);
   after.unresolvedAttempts=unresolved;after.geometryAdded=0;after.collisionBodiesAdded=0;
   after.worldChanged=moves.length>0||alignment.length>0;
   after.classification=before.unsafeHorizontalSites?'live_issues_repaired_or_flagged':
      before.misalignedBasesOver2cm?'historical_stale_with_live_height_issues':
      'historical_only_no_current_issues';
   if(old&&force)w.stage11LampAudit=after;else w.stage11LampAudit=after;
   return after;
 }
 H.stage11Lamps={collect,match,assess,alternate,audit,repair,disabled};
 H.finishReferenceBuildings469=function stage11Finish(w){const result=previous(w);
   if(!disabled()&&w.stage04AccessStats&&w.city20Stage15Stats)repair(w);
   return result;
 };
})(Heatline);
