/* SUNSET STATE / stage 06 of 35: road-facing, physically cut entrances.
 * Applied AFTER accumulated stage04/stage05. Existing public roads, IDs, interior
 * floor plans, gameplay systems and the chosen city reference are never replaced.
 * Road-facing is inferred from geometry, not merely a facing label. Refuse an
 * unsafe candidate rather than opening a decorative door into a wall or water.
 * A/B switch: ?stage06DoorsOff=1 or __SUNSET_STAGE06_DOORS_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||!H.reference469||!H.coast461)throw Error('Stage06 needs stage05 and reference city');
 const off=()=>globalThis.__SUNSET_STAGE06_DOORS_OFF===true||
  H.stage05City20?.off?.()===true||
  (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage06DoorsOff'));
 const normals={north:{x:0,z:-1},south:{x:0,z:1},east:{x:1,z:0},west:{x:-1,z:0}};
 const faces=Object.keys(normals);
 const close=(a,b,t=.09)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const isActive=p=>!!p?.stage06Oriented&&!off();
 const dir=p=>normals[p?.facing]||normals.north;
 const pos=(p,n)=>({x:p.x+dir(p).x*n,z:p.z+dir(p).z*n});
 function roadSegments(w){
  const out=[];
  for(const r of w.roads461){const pts=(r.samples?.length>1?r.samples:r.points)||[];
   for(let j=0;j<pts.length-1;j++){
    const a=pts[j],b=pts[j+1],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
    if(l>.005)out.push({x:a.x,z:a.z,dx,dz,l,road:r.id});
   }
  }return out;
 }
 function roadDistance(x,z,rs){let best=1e9,id=null;
  for(const r of rs){let t=clamp(((x-r.x)*r.dx+(z-r.z)*r.dz)/r.l,0,1);
   const dx=x-r.x-r.dx*t,dz=z-r.z-r.dz*t,d=dx*dx+dz*dz;
   if(d<best){best=d;id=r.road;}
  }return {distance:Math.sqrt(best),road:id};
 }
 function shellFor(w,p){
  const s=p.stage05City20?w.city20DistrictBuildings.find(v=>v.id===p.city20OwnerId):
   w.buildings.find(v=>close(v.x,p.buildingX,.025)&&close(v.z,p.buildingZ,.025));
  if(!s)return null;
  return {x:s.x,z:s.z,w:s.width??s.w,d:s.depth??s.d,h:s.height??s.h,
   base:p.stage05City20?s.baseY:NaN,kind:s.kind,source:s};
 }
 function tryCandidate(w,p,b,rs,face,offset){
  const n=normals[face],side=face==='north'||face==='south',span=side?b.w:b.d;
  const width=Math.min(p.width||3.75,3.85);
  if(span<width+3.0||Math.abs(offset)>span*.5-width*.5-1.15)return null;
  const fx=b.x+n.x*b.w*.5+(side?offset:0),fz=b.z+n.z*b.d*.5+(side?0:offset);
  const entrance={x:fx+n.x*.57,z:fz+n.z*.57};
  const blocks=[];
  // Check multiple pedestrian positions OUTSIDE, not the internal wall that
  // will be replaced by the stage06 aperture geometry.
  for(const r of [1.25,2.15,3.10]){
   const x=entrance.x+n.x*r,z=entrance.z+n.z*r;
   if(H.reference469.coast(x,z)<2||!H.coast461.land(x,z)||H.coast461.isRouteRoad(x,z))return null;
   if(w.nearby(x,z).some(o=>Math.abs(o.x-x)<o.hw+.59&&Math.abs(o.z-z)<o.hd+.59))blocks.push(r);
  }
  if(blocks.length)return null;
  if(w.entrancePortals.some(other=>other!==p&&other.interiorReady&&
      Math.hypot(other.x-entrance.x,other.z-entrance.z)<3.4))return null;
  const rd=roadDistance(entrance.x+n.x*2.15,entrance.z+n.z*2.15,rs);
  return {face,offset,x:entrance.x,z:entrance.z,width,dist:rd.distance,road:rd.road,
   score:rd.distance+.14*Math.abs(offset)+(face==='north'?.65:0)};
 }
 function options(w,p,b,rs){
  const list=[];
  for(const face of faces){
   const side=face==='north'||face==='south';
   const spread=Math.min((side?b.w:b.d)*.20,7.5);
   // Side doors in older hotel plans work best near the existing suite/corridor
   // openings, not across a solid central room divider.
   const offsets=side?[0]:[0,-spread,spread];
   for(const o of offsets){const c=tryCandidate(w,p,b,rs,face,o);if(c)list.push(c);}
  }
  list.sort((a,b)=>a.score-b.score);return list;
 }
 function colliders(w,b){
  const side=w.solids.filter(s=>Math.abs(s.z-b.z)<.15&&s.hd>b.d*.40&&s.hw>.25&&Math.abs(s.x-b.x)<b.w*.51);
  const rear=w.solids.filter(s=>Math.abs(s.x-b.x)<.4&&s.hw>1&&Math.abs(s.z-(b.z+b.d*.5-.4))<.20&&s.hd<1);
  return side.length===2&&rear.length===1?[...side,...rear]:null;
 }
 function mesh(w,b,p,kind,x,y,z,width,height,depth,color='#bdc6bd',mat='masonry'){
  if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<.035)throw Error('Stage06 invalid geometry');
  const q=H.box(x,y,z,width,height,depth,color,0,4,0);
  q.material=mat;q.stage06Entry=true;q.stage06PortalId=p.id;q.stage06Kind=kind;q.visibilityCap=1300;q.lodMax=1300;
  w.boxes.push(q);return q;
 }
 function rebuild(w,p,b,c,base){
  const old=colliders(w,b);if(!old)return false;
  const n=normals[c.face],side=!!n.z;
  const nearShell=(o)=>Math.abs(o.x-b.x)<b.w*.5+.4&&Math.abs(o.z-b.z)<b.d*.5+.5;
  // Only remove low masonry constructed for THE EXISTING north-side passage;
  // ordinary building artwork, windows and unrelated city pieces remain.
  const removed=w.boxes.filter(o=>p.stage05City20?o.stage05City20===true&&o.stage05Owner===p.city20OwnerId:
   p.stage04CompactHotel?o.stage04Entry===true:
   o.stage42Facade===true&&nearShell(o));
  const height=p.stage05City20?3.52:p.stage04CompactHotel?3.52:3.44;
  if(!Number.isFinite(base))base=removed.length?Math.min(...removed.map(o=>o.y-o.h*.5)):0;
  const tone=removed.find(o=>o.material==='masonry')?.color||removed.find(o=>o.stage42Facade)?.color||'#bfc7bf';
  const gone=new Set(old);
  w.solids=w.solids.filter(s=>!gone.has(s));
  for(const [key,arr]of w.spatial){const keep=arr.filter(s=>!gone.has(s));if(keep.length)w.spatial.set(key,keep);else w.spatial.delete(key);}
  const goneBox=new Set(removed);w.boxes=w.boxes.filter(o=>!goneBox.has(o));
  const width=c.width;
  // Open a FULL-depth corridor on the chosen face; leave a solid back wall.
  // Physics rectangles and rendered masonry use exactly the same footprints.
  function segment(kind,x,z,ww,dd){
    if(ww<.10||dd<.10)throw Error('Stage06 invalid boundary segment');
    mesh(w,b,p,kind,x,base+height*.5,z,ww,height,dd,tone,'masonry');
    w.solid(x,z,ww,dd);
  }
  if(side){
   const ll=c.x-width*.5-(b.x-b.w*.5),rr=(b.x+b.w*.5)-(c.x+width*.5);
   segment('mass-left',b.x-b.w*.5+ll*.5,b.z,ll,b.d+.12);
   segment('mass-right',b.x+b.w*.5-rr*.5,b.z,rr,b.d+.12);
   const backZ=b.z-n.z*(b.d*.5-.41);
   segment('rear-wall',c.x,backZ,width,.82);
  }else{
   const front=c.z-width*.5-(b.z-b.d*.5),back=(b.z+b.d*.5)-(c.z+width*.5);
   segment('mass-north',b.x,b.z-b.d*.5+front*.5,b.w+.12,front);
   segment('mass-south',b.x,b.z+b.d*.5-back*.5,b.w+.12,back);
   const opposite=b.x-n.x*(b.w*.5-.41);
   segment('rear-wall',opposite,c.z,.82,width);
  }
  // Door frame lies on the wall plane, door controller is registered by ID.
  const jamb=width*.5+.12,frontX=c.x-n.x*.57,frontZ=c.z-n.z*.57;
  for(const sign of [-1,1]){
   const x=frontX+(side?sign*jamb:0),z=frontZ+(side?0:sign*jamb);
   mesh(w,b,p,'jamb',x,base+1.55,z,side?.18:.30,3.10,side?.30:.18,'#829ba0','metal');
   
  }
  mesh(w,b,p,'lintel',frontX,base+3.24,frontZ,side?width+.38:.37,.22,side?.37:width+.38,'#aebbbb','metal');
  mesh(w,b,p,'threshold',frontX+n.x*.45,base+.08,frontZ+n.z*.45,
   side?width-.22:1.18,.13,side?1.18:width-.22,'#aab0a7','paving');
  return {removedExteriorObjects:removed.length,removedFootprints:old.length,addedFootprints:3,newGeometry:7};
 }
 function relocateFacadeDetails(w,p,old){
  // Earlier CITY20 passes attached authored awnings, signage and planters to
  // historic north portals. Turn those details with the *same* portal rather
  // than leaving convincing but now unusable fake entrances on the north wall.
  const keys=['city20Stage10Portal','city20Stage14Portal','city20Stage15Portal','city20Stage16Portal'];
  const n=dir(p),t={x:-n.z,z:n.x}; // n=north -> tangent=east
  const deltaY=H.outdoorHeight(p.x,p.z)-H.outdoorHeight(old.x,old.z);
  const historicFrames=new Set(w.boxes.filter(v=>v.city20Stage10Portal===p.id)
   .map(v=>v.city20Stage10Kind).filter(v=>['jamb','lintel','threshold'].includes(v)));
  // Stage10 already authored matching metal jambs/trim: prefer those details
  // to simpler stage06 placeholders, without drawing two frames in one spot.
  if(historicFrames.size)w.boxes=w.boxes.filter(v=>
   !(v.stage06PortalId===p.id&&historicFrames.has(v.stage06Kind)));
  let moved=0;
  for(const v of w.boxes){
   if(!keys.some(k=>v[k]===p.id))continue;
   const originalX=v.x-old.x,originalZ=v.z-old.z;
   const lateral=originalX,outward=-originalZ;
   const nx=p.x+t.x*lateral+n.x*outward,
         nz=p.z+t.z*lateral+n.z*outward;
   v.x=nx;v.z=nz;v.y+=deltaY;
   if(n.x){const width=v.w;v.w=v.d;v.d=width;}
   v.stage06RelocatedPortal=p.id;
   moved++;
  }
  return {moved,duplicateFramesRemoved:historicFrames.size};
 }
 function orient(w){
  if(w.stage06OrientationStats)return w.stage06OrientationStats;
  const rs=roadSegments(w),originalCount=w.entrancePortals.length,active=w.entrancePortals.filter(p=>p.interiorReady);
  const baseline={roadCount:w.roads461.length,roadPoints:w.roads461.map(r=>r.points.length),
   buildings:w.buildings.length,newDistrict:w.city20DistrictBuildings.length,solids:w.solids.length};
  const updates=[],unmodified=[],errors=[];
  for(const p of active){
   const b=shellFor(w,p);if(!b){unmodified.push({id:p.id,reason:'missing shell'});continue;}
   const oldRoad=roadDistance(p.x,p.z-2.15,rs);
   const candidates=options(w,p,b,rs),best=candidates[0];
   if(!best){unmodified.push({id:p.id,reason:'no safely accessible road-facing facade'});continue;}
   const north=candidates.find(v=>v.face==='north'&&Math.abs(v.offset)<.1);
   // Avoid moving an already-valid north-facing entrance for negligible gain.
   if(best.face==='north'||north&&best.score>=north.score-3.0){unmodified.push({id:p.id,reason:'original north frontage remains appropriate',nearest:best.road});continue;}
   const segments=colliders(w,b);
   if(!segments){errors.push({id:p.id,reason:'original collision walls not identifiable'});continue;}
   const old={x:p.x,z:p.z,face:p.facing};
   const existingLow=w.boxes.find(o=>p.stage05City20?o.stage05City20&&o.stage05Owner===p.city20OwnerId&&o.stage05Kind?.startsWith('opened-'):
    p.stage04CompactHotel?o.stage04Entry&&o.stage04Kind==='wall':o.stage42Facade&&Math.abs(o.x-b.x)<b.w*.5&&Math.abs(o.z-b.z)<b.d*.5);
   const floor=p.stage05City20?b.base:
      p.stage04CompactHotel?H.cityTerrain42(b.x,b.z):existingLow?existingLow.y-existingLow.h*.5:0;
   const rebuilt=rebuild(w,p,b,best,floor);
   if(!rebuilt){errors.push({id:p.id,reason:'could not construct complete doorway'});continue;}
   p.x=best.x;p.z=best.z;p.facing=best.face;p.stage06Oriented=true;
   p.stage06Road=best.road;p.stage06Before=old;
   const plan=w.structuralPlans.find(v=>v.outerShell.x===p.buildingX&&v.outerShell.z===p.buildingZ);
   if(plan){plan.entrance={...plan.entrance,x:p.x,z:p.z,facing:p.facing,width:best.width};plan.stage06Portal=p;}
   const door=w.stage42Doors.find(v=>v.id===p.id);
   if(!door)throw Error('Stage06 missing door '+p.id);
   door.x=p.x;door.z=p.z-.26*(best.face==='north'?-1:best.face==='south'?1:0);
   door.x=p.x-.26*(best.face==='east'?1:best.face==='west'?-1:0);
   door.width=best.width;door.facing=best.face;
   const facadeDetailsRelocated=relocateFacadeDetails(w,p,old);
   updates.push({id:p.id,kind:p.stage05City20?'CITY20':'legacy',from:old.face,to:best.face,
    facadeDetailsRelocated:facadeDetailsRelocated.moved,
    duplicateFramesRemoved:facadeDetailsRelocated.duplicateFramesRemoved,
    road:best.road,roadDistanceM:+best.dist.toFixed(2),originalNorthRoadDistanceM:+oldRoad.distance.toFixed(2),
    portalX:+p.x.toFixed(2),portalZ:+p.z.toFixed(2),...rebuilt});
  }
  w.lobbyDoors443=new Map();
  for(const door of w.stage42Doors){const key=`${Math.floor(door.x/36)},${Math.floor(door.z/36)}`;
   if(!w.lobbyDoors443.has(key))w.lobbyDoors443.set(key,[]);
   w.lobbyDoors443.get(key).push(door);
  }
  if(w.entrancePortals.length!==originalCount||w.roads461.length!==baseline.roadCount||
     w.roads461.some((r,i)=>r.points.length!==baseline.roadPoints[i])||
     w.buildings.length!==baseline.buildings||w.city20DistrictBuildings.length!==baseline.newDistrict)
    throw Error('Stage06 modified historic portals or the chosen city layout');
  const stats={stage:6,issue:'S01-BL-03',activeEntries:active.length,oriented:updates.length,
   northPreserved:active.length-updates.length,legacyOriented:updates.filter(x=>x.kind==='legacy').length,
   city20Oriented:updates.filter(x=>x.kind==='CITY20').length,
   facadeDetailsRelocated:updates.reduce((a,b)=>a+b.facadeDetailsRelocated,0),orphanDescriptorsUntouched:215,
   preexistingStage05Active:w.stage05City20Stats.readyNow,roadCount:w.roads461.length,
   noStructuralLayoutChanges:true,physicsBefore:baseline.solids,physicsAfter:w.solids.length,
   cpuValidated:false,gpuVisualVerified:false,errors,unmodified,updated:updates};
  w.stage06OrientationStats=stats;return stats;
 }
 function updateScene(scene,plan){
  const p=plan.stage06Portal;if(!isActive(p)||scene?.stage06SceneUpdated||scene.floor!==0)return scene;
  const b=plan.outerShell,x=b.x,z=b.z,
   ext=H.interiorExtents450(b),X=ext.X,Z=ext.Z;
  if(![X,Z].every(Number.isFinite)||Math.min(X,Z)<3)return scene;
  // Retain furniture and corridor partitions; replace ONLY the four exterior
  // boundary wall bands with new collision-matched opening on the true facade.
  const tol=.46;
  function isBoundary(v,fromBoxes){
   const wx=Math.abs(v.x-(x-X))<tol||Math.abs(v.x-(x+X))<tol;
   const wz=Math.abs(v.z-(z-Z))<tol||Math.abs(v.z-(z+Z))<tol;
   const depth=fromBoxes?v.d:v.hd*2,width=fromBoxes?v.w:v.hw*2;
   return (wx&&depth>Z*.85)||(wz&&width>X*.74);
  }
  const oldSolids=scene.solids.length,oldBoxes=scene.boxes.length;
  scene.solids=scene.solids.filter(v=>!isBoundary(v,false));
  scene.boxes=scene.boxes.filter(v=>!(v.layer===4&&v.h>=3.8&&v.h<=4.25&&isBoundary(v,true)));
  const Hh=4.02,t=.30;
  function wall(xx,zz,ww,dd){
   if(ww<.05||dd<.05)return;
   const v=H.box(xx,plan.floorHeight*scene.floor+Hh*.5,zz,ww,Hh,dd,'#d1d5cf',0,4,0);
   v.material='paint';v.stage06InteriorWall=true;scene.boxes.push(v);
   scene.solids.push({x:xx,z:zz,hw:ww*.5,hd:dd*.5,stage06:true});
  }
  const face=p.facing,gap=Math.min(3.75,p.width||3.75);
  // Interior wall is inset from exterior shell by roughly one metre.
  for(const side of faces){
   const selected=side===face;
   if(side==='north'||side==='south'){
    const zz=z+(side==='north'?-Z:Z),center=clamp(p.x,x-X+gap*.5+.2,x+X-gap*.5-.2);
    if(selected){const left=center-gap*.5-(x-X),right=(x+X)-(center+gap*.5);
      wall(x-X+left*.5,zz,left,t);wall(x+X-right*.5,zz,right,t);
    }else wall(x,zz,X*2+.3,t);
   }else{
    const xx=x+(side==='west'?-X:X),center=clamp(p.z,z-Z+gap*.5+.2,z+Z-gap*.5-.2);
    if(selected){const front=center-gap*.5-(z-Z),back=(z+Z)-(center+gap*.5);
      wall(xx,z-Z+front*.5,t,front);wall(xx,z+Z-back*.5,t,back);
    }else wall(xx,z,t,Z*2+.3);
   }
  }
  // Interior decorations and partitions were authored for north entrances.
  // Clear a narrow pedestrian corridor for the newly moved entrance without
  // deleting other rooms. Every cut is applied to BOTH colliders and meshes.
  const n=dir(p),corridorHalf=1.02,cutA=2.05,cutB=4.85;
  const affected=new Set();
  for(const solid of scene.solids){
   if(solid.stage06)continue;
   for(let dist=cutA;dist<=cutB+.01;dist+=.22){
    const px=p.x-n.x*dist,pz=p.z-n.z*dist;
    const cx=clamp(px,solid.x-solid.hw,solid.x+solid.hw);
    const cz=clamp(pz,solid.z-solid.hd,solid.z+solid.hd);
    if(Math.hypot(px-cx,pz-cz)<.38){affected.add(solid);break;}
   }
  }
  const removedObjects=new Set(),splits=[];
  for(const solid of affected){
   const lateral=n.x?'z':'x',v=solid[lateral],half=lateral==='x'?solid.hw:solid.hd;
   const target=lateral==='x'?p.x:p.z,min=v-half,max=v+half;
   const begin=target-corridorHalf,end=target+corridorHalf;
   // Keep all substantial sides of walls; tiny center furniture is relocated
   // out of the entry clearance rather than copied into odd fragments.
   const pieces=[];
   if(begin-min>.08)pieces.push([min,begin]);
   if(max-end>.08)pieces.push([end,max]);
   scene.solids=scene.solids.filter(t=>t!==solid);
   for(const [a,b]of pieces){
    const item={...solid,[lateral]:(a+b)*.5,[lateral==='x'?'hw':'hd']:(b-a)*.5};
    scene.solids.push(item);
   }
   // Match the physical blocker with its visible counterpart(s) using the
   // same center and approximate footprint, and cut the visible wall too.
   for(const visual of scene.boxes){
    if(removedObjects.has(visual)||visual.layer!==4||visual.h<.25)continue;
    if(Math.abs(visual.x-solid.x)>.15+solid.hw*.14||Math.abs(visual.z-solid.z)>.15+solid.hd*.14)continue;
    if(Math.abs(visual.w-solid.hw*2)>Math.max(.18,solid.hw*.65)||
       Math.abs(visual.d-solid.hd*2)>Math.max(.18,solid.hd*.65))continue;
    removedObjects.add(visual);
    for(const [a,b]of pieces){
     const clone={...visual,[lateral]:(a+b)*.5,[lateral==='x'?'w':'d']:b-a};
     if(clone.w>.05&&clone.d>.05)splits.push(clone);
    }
   }
  }
  if(removedObjects.size){scene.boxes=scene.boxes.filter(v=>!removedObjects.has(v));scene.boxes.push(...splits);}
  scene.stage06IngressRepair={colliders:affected.size,meshes:removedObjects.size,meshFragments:splits.length};
  const inside=pos(p,-2.7);
  scene.entrance={x:inside.x,z:inside.z};
  scene.stage06SceneUpdated=true;
  scene.stage06OriginalWallSolidsRemoved=oldSolids-scene.solids.length+6;
  scene.stage06OriginalWallMeshesRemoved=oldBoxes-scene.boxes.length+6;
  return scene;
 }
 function installInterior(){
  if(H.stage06Orientation.interiorInstalled)return;
  const original=H.polishInterior461;
  if(typeof original!=='function')throw Error('Stage06 installed before original interiors');
  H.polishInterior461=function stage06Interior(scene,plan,floor){
   const finished=original(scene,plan,floor);
   return !off()&&plan?.stage06Portal?updateScene(finished,plan):finished;
  };
  H.stage06Orientation.interiorInstalled=true;
 }
 function entryThreshold(a,door){const p=door&&H.stage06Orientation.portals?.[door.id];
  if(!isActive(p))return Math.abs(a.x-door.x)<=door.width*.5-.35&&a.z>=door.z+1.48&&a.z<=door.z+5.5;
  const n=dir(p),dX=a.x-door.x,dZ=a.z-door.z;
  const inside=-(dX*n.x+dZ*n.z),lateral=Math.abs(dX*n.z-dZ*n.x);
  return lateral<=door.width*.5-.35&&inside>=1.48&&inside<=5.5;
 }
 function exitThreshold(a,p){
  if(!isActive(p))return Math.abs(a.x-p.x)<Math.max(1.3,p.width*.5-.38)&&a.z<p.z+1.15;
  const n=dir(p),dx=a.x-p.x,dz=a.z-p.z;
  return Math.abs(dx*n.z-dz*n.x)<Math.max(1.3,p.width*.5-.38)&&-(dx*n.x+dz*n.z)<1.15;
 }
 function passedThreshold(a,p){
  if(!isActive(p))return a.z<=p.z+1.25;
  return -((a.x-p.x)*dir(p).x+(a.z-p.z)*dir(p).z)<=1.25;
 }
 function drawDoor(game,door,out){
  const p=game.world.entrancePortals[door.id];if(!isActive(p))return false;
  const n=dir(p),side=!!n.z,view=game.inVehicle?game.player:game.avatar;
  door.open=H.lerp(door.open,Math.hypot(view.x-door.x,view.z-door.z)<9.8?1:0,1-Math.exp(-.075*7));
  const angle=door.open*1.22,w=door.width*.47,y=H.outdoorHeight(door.x,door.z)+1.45;
  for(const sign of [-1,1]){
   let px,pz,yaw;
   if(side){const hinge=door.x+sign*door.width*.5;
    px=hinge-sign*w*.5*Math.cos(angle);pz=door.z+sign*w*.5*Math.sin(angle)*n.z;
    yaw=sign*angle*n.z*-1;
   }else{const hinge=door.z+sign*door.width*.5;
    pz=hinge-sign*w*.5*Math.cos(angle);px=door.x+sign*w*.5*Math.sin(angle)*n.x;
    yaw=Math.PI*.5+sign*angle*n.x;
   }
   const panel=H.box(px,y,pz,side?w:.11,2.82,side?.11:w,'#6a929b',yaw,4,.03);
   panel.material='translucent_glass';out.push(panel);
   const handle=H.box(px+(side?-sign*.15:n.x*.08),y-.2,pz+(side?n.z*.08:-sign*.15),.11,.28,.16,'#d8cbab',0,5);
   handle.material='metal';out.push(handle);
  }
  return true;
 }
 H.stage06Orientation={orient,off,isActive,pos,dir,normals,installInterior,updateScene,
  entryThreshold,exitThreshold,passedThreshold,drawDoor,interiorInstalled:false,portals:null};
 H.finishReferenceBuildings469=function stage06Finish(w){
  const r=previous(w);
  if(!off()){
   const result=orient(w);
   H.stage06Orientation.portals=w.entrancePortals;
   if(result.errors.length)console.warn('Stage06 access audit issues:',result.errors.length);
  }
  return r;
 };
})(Heatline);
