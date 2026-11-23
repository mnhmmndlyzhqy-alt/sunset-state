/* SUNSET STATE / STAGE 07 OF 35 — physically aligned CITY20 residences.
 * Rotate ONE-STORY compact CITY20 structures to their nearest actual street
 * bearing, including ALL authored exterior meshes, portal hardware, physics
 * and complete interior scene. No screenshot/GPU/FPS claim is made.
 * Skips sites that cannot safely fit a rotated footprint. Does NOT touch the
 * chosen reference, coastline, roads, legacy structures, IDs or multi-floor
 * elevator structures. Reversible A/B: ?stage07AlignOff=1.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const off=()=>globalThis.__SUNSET_STAGE07_ALIGN_OFF===true||
   H.stage05City20?.off?.()===true||H.stage06Orientation?.off?.()===true||
   (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage07AlignOff'));
 const originalFinish=H.finishReferenceBuildings469;
 if(typeof originalFinish!=='function'||!H.stage06Orientation||!H.stage05City20)
   throw Error('Stage07 requires completed stage05 and stage06 building pipelines');
 const EPS=1e-7, TAU=Math.PI*2;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const near=(a,b,t=.03)=>Math.abs(a-b)<=t;
 const stableAngle=a=>{while(a>Math.PI/4)a-=Math.PI/2;while(a< -Math.PI/4)a+=Math.PI/2;return a;};
 function position(x,z,cx,cz,a){const dx=x-cx,dz=z-cz,C=Math.cos(a),S=Math.sin(a);
   return {x:cx+C*dx-S*dz,z:cz+S*dx+C*dz};}
 function vector(x,z,a){const C=Math.cos(a),S=Math.sin(a);return {x:C*x-S*z,z:S*x+C*z};}
 function nearRoad(w,s){let best=null,bd=Infinity;
   for(const road of w.roads461){const pts=road.samples?.length>1?road.samples:road.points;
     if(!pts)continue;
     for(let i=0;i<pts.length-1;i++){
       const u=pts[i],v=pts[i+1],dx=v.x-u.x,dz=v.z-u.z,len2=dx*dx+dz*dz;
       if(len2<.02)continue;
       const t=clamp(((s.x-u.x)*dx+(s.z-u.z)*dz)/len2,0,1);
       const d2=(s.x-u.x-t*dx)**2+(s.z-u.z-t*dz)**2;
       if(d2<bd){bd=d2;best={road:road.id,angle:Math.atan2(dz,dx),distance:Math.sqrt(d2)};}
     }
   }return best;
 }
 function rectangleProjection(cx,cz,w,d,a,axisX,axisZ){const ux=Math.cos(a),uz=Math.sin(a),vx=-uz,vz=ux;
   return {center:cx*axisX+cz*axisZ,r:Math.abs(ux*axisX+uz*axisZ)*w*.5+Math.abs(vx*axisX+vz*axisZ)*d*.5};}
 function separated(ax,bx){return Math.abs(ax.center-bx.center)>ax.r+bx.r;}
 function intersects(a,b,pad=0){
   const ca=Math.cos(a.yaw),sa=Math.sin(a.yaw),cb=Math.cos(b.yaw||0),sb=Math.sin(b.yaw||0);
   for(const [x,z] of [[ca,sa],[-sa,ca],[cb,sb],[-sb,cb]]){
     if(separated(rectangleProjection(a.x,a.z,a.w+pad*2,a.d+pad*2,a.yaw,x,z),
                  rectangleProjection(b.x,b.z,b.w+pad*2,b.d+pad*2,b.yaw||0,x,z)))return false;
   }return true;
 }
 function boundary(s,a){const pts=[];
   for(const u of [-1,-.5,0,.5,1])for(const v of [-1,1])
     pts.push(position(s.x+u*s.width*.5,s.z+v*s.depth*.5,s.x,s.z,a));
   for(const v of [-.5,0,.5])for(const u of [-1,1])
     pts.push(position(s.x+u*s.width*.5,s.z+v*s.depth*.5,s.x,s.z,a));
   return pts;
 }
 function siteClear(w,s,a,structures,originalSolids){
   if(Math.abs(a)<.095)return false;
   const target={x:s.x,z:s.z,w:s.width,d:s.depth,yaw:a};
   for(const b of structures){if(b===s)continue;
     if(Math.abs(b.x-s.x)>(b.width+s.width)*.5+10||Math.abs(b.z-s.z)>(b.depth+s.depth)*.5+10)continue;
     if(intersects(target,{x:b.x,z:b.z,w:b.width,d:b.depth,yaw:b.stage07Yaw||0},1.45))return false;
   }
   // Other solid structure or prop: validate against a rotated footprint,
   // rather than accepting because the original AABBs happened to be clear.
   const ownerSet=new Set(originalSolids);
   for(const v of w.solids){if(ownerSet.has(v))continue;
     if(Math.hypot(v.x-s.x,v.z-s.z)>Math.hypot(s.width,s.depth)+Math.max(v.hw,v.hd)+5)continue;
     if(intersects(target,{x:v.x,z:v.z,w:v.hw*2,d:v.hd*2,yaw:0},.90))return false;
   }
   for(const pt of boundary(s,a)){
     if(!H.coast461.land(pt.x,pt.z)||H.reference469.coast(pt.x,pt.z)<2.4||
        H.coast461.isRouteRoad(pt.x,pt.z)||H.coast461.risk?.(pt.x,pt.z))return false;
   }
   return true;
 }
 function componentsFor(w,s){
   const p=w.entrancePortals[s.city20Stage05PortalId];
   const solids=w.solids.filter(v=>
     Math.abs(v.x-s.x)<=s.width*.5+.06&&Math.abs(v.z-s.z)<=s.depth*.5+.06&&
     (Math.abs(v.hw*2-(s.width+.12))<.13||Math.abs(v.hd*2-(s.depth+.12))<.13||
      Math.abs(v.hw*2-(p?.width||3.75))<.13||Math.abs(v.hd*2-(p?.width||3.75))<.13));
   return {p,solids};
 }
 function voxelize(s,cx,cz,a,step=.64){
   const w=s.hw*2,d=s.hd*2,alongX=w>=d,length=alongX?w:d,
       cells=Math.max(1,Math.ceil(length/step)),parts=[];
   for(let i=0;i<cells;i++){
     const seg=length/cells,offset=-length*.5+(i+.5)*seg;
     const center=position(s.x+(alongX?offset:0),s.z+(alongX?0:offset),cx,cz,a);
     const ww=alongX?seg:w,dd=alongX?d:seg;
     parts.push({x:center.x,z:center.z,
       hw:(Math.abs(Math.cos(a))*ww+Math.abs(Math.sin(a))*dd)*.5,
       hd:(Math.abs(Math.sin(a))*ww+Math.abs(Math.cos(a))*dd)*.5,
       stage07AlignedSolid:true});
   }return parts;
 }
 function ownerMeshes(w){const owned=new Map(),cityIDs=new Set(w.city20DistrictBuildings.map(s=>s.id)),
  portals=new Map(w.entrancePortals.filter(p=>p.stage05City20).map(p=>[p.id,p.city20OwnerId])),
  placements=w.city20DistrictBuildings;
   for(const mesh of w.boxes){let id=mesh.city20BuildingId||mesh.city20Stage06Owner||mesh.city20Stage07Owner||
      mesh.city20Stage09Owner||mesh.stage05Owner;
     if(!id)for(const k of ['stage06PortalId','city20Stage10Portal','city20Stage11Portal',
       'city20Stage12Portal','city20Stage13Portal','city20Stage14Portal','city20Stage15Portal','city20Stage16Portal']){
       if(Number.isInteger(mesh[k])){id=portals.get(mesh[k]);if(id)break;}
     }
     if(!id&&mesh.city20Stage02){const s=placements.find(b=>Math.abs(mesh.x-b.x)<b.width*.57+.95&&
       Math.abs(mesh.z-b.z)<b.depth*.57+.95);if(s)id=s.id;}
     if(!id||!cityIDs.has(id))continue;
     const arr=owned.get(id)||[];arr.push(mesh);owned.set(id,arr);
   }return owned;
 }
 function reindex(w){const grid=new Map(),block=H.BLOCK;
   for(const s of w.solids){const minX=Math.floor((s.x-s.hw)/block),maxX=Math.floor((s.x+s.hw)/block),
     minZ=Math.floor((s.z-s.hd)/block),maxZ=Math.floor((s.z+s.hd)/block);
     for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
       const k=x+','+z,arr=grid.get(k)||[];arr.push(s);grid.set(k,arr);
     }
   }w.spatial=grid;w.nearbyRegions473?.clear();
   w.lobbyDoors443=new Map();for(const d of w.stage42Doors){const key=Math.floor(d.x/36)+','+Math.floor(d.z/36),a=w.lobbyDoors443.get(key)||[];a.push(d);w.lobbyDoors443.set(key,a);}
 }
 function apply(w){
   if(w.stage07AlignmentStats)return w.stage07AlignmentStats;
   const structures=w.city20DistrictBuildings;
   const prior={roadCount:w.roads461.length,roadPoints:w.roads461.map(r=>JSON.stringify(r.points)),
     portalCount:w.entrancePortals.length,oldBuildings:w.buildings.length,
     newBuildings:structures.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,
     solids:w.solids.length,boxes:w.boxes.length};
   const meshes=ownerMeshes(w),updates=[],skipped=[],discard=new Set(),add=[];
   for(const s of structures){
     const plan=w.structuralPlans.find(p=>p.outerShell.x===s.x&&p.outerShell.z===s.z),
       {p,solids}=componentsFor(w,s),road=nearRoad(w,s);
     if(!plan||!p||!p.interiorReady||plan.floorCount!==1){skipped.push({id:s.id,reason:'multi_floor_or_missing_plan'});continue;}
     if(solids.length!==3){skipped.push({id:s.id,reason:'unexpected_collision_footprint',solids:solids.length});continue;}
     if(!road||road.distance>92){skipped.push({id:s.id,reason:'no_near_street'});continue;}
     const target=stableAngle(road.angle);
     if(Math.abs(target)<.105){skipped.push({id:s.id,reason:'already_aligned'});continue;}
     let yaw=0;
     for(const ratio of [1,.75,.50,.35]){
       const candidate=clamp(target*ratio,-.43,.43);
       if(siteClear(w,s,candidate,structures,solids)){yaw=candidate;break;}
     }
     if(!yaw){skipped.push({id:s.id,reason:'insufficient_safe_clearance',target:+target.toFixed(3)});continue;}
     const own=meshes.get(s.id)||[];
     if(own.length<4){skipped.push({id:s.id,reason:'missing_owner_geometry',meshes:own.length});continue;}
     // Apply a single rigid transform to all owner-linked material and shape
     // parts, regardless of original CITY20 stage, so fascia stays attached.
     for(const o of own){const t=position(o.x,o.z,s.x,s.z,yaw);o.x=t.x;o.z=t.z;o.yaw=(o.yaw||0)+yaw;
       o.stage07AlignedBuilding=s.id;}
     for(const v of solids){discard.add(v);add.push(...voxelize(v,s.x,s.z,yaw));}
     const t=position(p.x,p.z,s.x,s.z,yaw),door=w.stage42Doors.find(v=>v.id===p.id);
     if(!door)throw Error('Stage07 missing exterior door '+p.id);
     const dt=position(door.x,door.z,s.x,s.z,yaw);
     p.stage07OriginalX=p.x;p.stage07OriginalZ=p.z;
     p.x=t.x;p.z=t.z;p.stage07Yaw=yaw;p.stage07Aligned=true;p.stage06Oriented=true;
     door.x=dt.x;door.z=dt.z;door.stage07Yaw=yaw;
     plan.stage07Yaw=yaw;plan.stage07Entry=p;
     s.stage07Yaw=yaw;s.streetAligned=true;s.nearestStreet=road.road;
     // IDs/center coordinates stay fixed; world position is still the exact
     // chosen CITY20 reference, only building orientation changes.
     updates.push({id:s.id,portalId:p.id,kind:s.kind,angleDegrees:+(yaw*180/Math.PI).toFixed(2),
       road:road.road,roadDistance:+road.distance.toFixed(2),meshesRotated:own.length,
       oldColliders:solids.length,newCollisionCells:add.length-(updates.length?updates.reduce((a,b)=>a+b.newCollisionCells,0):0)});
   }
   if(discard.size){w.solids=w.solids.filter(s=>!discard.has(s));w.solids.push(...add);reindex(w);}
   if(w.roads461.length!==prior.roadCount||w.roads461.some((r,i)=>JSON.stringify(r.points)!==prior.roadPoints[i])||
      w.entrancePortals.length!==prior.portalCount||w.buildings.length!==prior.oldBuildings||
      structures.length!==prior.newBuildings||w.entrancePortals.filter(p=>p.interiorReady).length!==prior.active)
     throw Error('Stage07 changed roads, IDs, or existing gameplay access');
   const stats={stage:7,issueId:'S01-BL-04',targetStructures:130,
     singleFloorEligible:structures.filter(s=>w.structuralPlans.find(p=>p.outerShell.x===s.x&&p.outerShell.z===s.z)?.floorCount===1).length,
     realRotations:updates.length,untouched:structures.length-updates.length,boxTransforms:updates.reduce((n,s)=>n+s.meshesRotated,0),boxesAtFinalize:prior.boxes,
     collisionBefore:prior.solids,collisionAfter:w.solids.length,collisionCellsAdded:add.length,
     activeEntrancesPreserved:prior.active,legacyPreserved:84,roadsPreserved:prior.roadCount,
     gpuVisualVerified:false,updates,skipped};
   w.stage07AlignmentStats=stats;return stats;
 }
 function transformScene(scene,plan){
   if(off()||!scene||!plan?.stage07Yaw||scene.stage07Aligned)return scene;
   const angle=plan.stage07Yaw,cx=plan.outerShell.x,cz=plan.outerShell.z,
     fix=(o)=>{if(o&&Number.isFinite(o.x)&&Number.isFinite(o.z)){const p=position(o.x,o.z,cx,cz,angle);o.x=p.x;o.z=p.z;}return o;};
   for(const o of scene.boxes){fix(o);o.yaw=(o.yaw||0)+angle;}
   for(const l of scene.lights)fix(l);
   for(const p of scene.pickups)fix(p);
   for(const r of scene.rooms)fix(r);
   for(const a of scene.activities)fix(a);
   // Compacts we rotate have one floor, and thus no articulated lift doors,
   // stair trips or dynamic partition doors in the source scene.
   if(scene.doors.length||scene.liftBarrier||plan.floorCount!==1)
     throw Error('Stage07 cannot rotate dynamic multi-floor interior '+plan.buildingId);
   const rotated=[];for(const s of scene.solids)rotated.push(...voxelize(s,cx,cz,angle,.54));
   scene.solids=rotated;
   fix(scene.entrance);fix(scene.lift);
   if(scene.stairs){fix(scene.stairs.up);fix(scene.stairs.down);
     // single-storey stair markers are informational only.
     scene.stairs.stage07DisplayOnly=true;}
   const bd=scene.bounds,corners=[
     position(bd.xmin,bd.zmin,cx,cz,angle),position(bd.xmin,bd.zmax,cx,cz,angle),
     position(bd.xmax,bd.zmin,cx,cz,angle),position(bd.xmax,bd.zmax,cx,cz,angle)];
   scene.bounds={xmin:Math.min(...corners.map(p=>p.x)),xmax:Math.max(...corners.map(p=>p.x)),
     zmin:Math.min(...corners.map(p=>p.z)),zmax:Math.max(...corners.map(p=>p.z))};
   scene.stage07Aligned=true;scene.stage07Yaw=angle;
   return scene;
 }
 function installInterior(){if(H.stage07Alignment.interiorInstalled)return;
   const old=H.polishInterior461;
   if(typeof old!=='function')throw Error('Stage07 interior runtime requires engine44');
   H.polishInterior461=function stage07Interior(s,p,f){
     const portal=p?.stage07Entry;
     if(!portal||off())return old(s,p,f);
     const x=portal.x,z=portal.z;let scene;
     try{portal.x=portal.stage07OriginalX;portal.z=portal.stage07OriginalZ;
       scene=old(s,p,f);
     }finally{portal.x=x;portal.z=z;}
     return transformScene(scene,p);
   };
   H.stage07Alignment.interiorInstalled=true;
 }
 const entry=H.stage06Orientation;
 const original={dir:entry.dir,pos:entry.pos,entryThreshold:entry.entryThreshold,exitThreshold:entry.exitThreshold,
   passedThreshold:entry.passedThreshold,drawDoor:entry.drawDoor};
 function forward(p){const base=original.dir(p);return p?.stage07Aligned&&!off()?vector(base.x,base.z,p.stage07Yaw):base;}
 entry.dir=forward;
 entry.pos=function(p,n){if(!p?.stage07Aligned||off())return original.pos(p,n);
   const v=forward(p);return {x:p.x+v.x*n,z:p.z+v.z*n};};
 entry.entryThreshold=function(a,door){const p=door&&entry.portals?.[door.id];
   if(!p?.stage07Aligned||off())return original.entryThreshold(a,door);
   const n=forward(p),dx=a.x-door.x,dz=a.z-door.z;
   return Math.abs(dx*n.z-dz*n.x)<=door.width*.5-.35&&-(dx*n.x+dz*n.z)>=1.48&&-(dx*n.x+dz*n.z)<=5.5;};
 entry.exitThreshold=function(a,p){if(!p?.stage07Aligned||off())return original.exitThreshold(a,p);
   const n=forward(p),dx=a.x-p.x,dz=a.z-p.z;
   return Math.abs(dx*n.z-dz*n.x)<Math.max(1.3,p.width*.5-.38)&&-(dx*n.x+dz*n.z)<1.15;};
 entry.passedThreshold=function(a,p){if(!p?.stage07Aligned||off())return original.passedThreshold(a,p);
   const n=forward(p);return -((a.x-p.x)*n.x+(a.z-p.z)*n.z)<=1.25;};
 entry.drawDoor=function(game,door,out){const p=game.world.entrancePortals[door.id];
   if(!p?.stage07Aligned||off())return original.drawDoor(game,door,out);
   const n=forward(p),t={x:-n.z,z:n.x},view=game.inVehicle?game.player:game.avatar;
   door.open=H.lerp(door.open,Math.hypot(view.x-door.x,view.z-door.z)<9.8?1:0,1-Math.exp(-.075*7));
   const angle=door.open*1.22,w=door.width*.47,y=H.outdoorHeight(door.x,door.z)+1.45;
   for(const sign of [-1,1]){
     const tx=t.x*Math.cos(angle)-sign*n.x*Math.sin(angle),
           tz=t.z*Math.cos(angle)-sign*n.z*Math.sin(angle),
           cx=door.x+sign*door.width*.5*t.x-sign*w*.5*tx,
           cz=door.z+sign*door.width*.5*t.z-sign*w*.5*tz,
           leaf=H.box(cx,y,cz,w,2.82,.11,'#6a929b',Math.atan2(tz,tx),4,.03);
     leaf.material='translucent_glass';out.push(leaf);
     const handle=H.box(cx-sign*tx*.15,y-.20,cz-sign*tz*.15,.11,.28,.16,'#d8cbab',0,5);
     handle.material='metal';out.push(handle);
   }return true;
 };
 H.stage07Alignment={apply,off,installInterior,position,voxelize,interiorInstalled:false};
 H.finishReferenceBuildings469=function stage07Final(w){const r=originalFinish(w);if(!off())apply(w);return r;};
})(Heatline);
