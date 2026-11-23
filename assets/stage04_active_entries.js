/* SUNSET STATE / remediation 04 of 35: surviving, physically accessible entrances.
 * The reference city prunes 215 obsolete building footprints but historically
 * leaves their portal descriptors. Never unlock an orphan portal. Preserve all
 * original IDs, map anchors, roads and wildlife. Toggle: ?stage04AccessOff=1.
 * CPU QA validates gameplay traversal; this is NOT a GPU/visual FPS certificate.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 const previousExtents=H.interiorExtents450;
 if(typeof previous!=='function'||typeof previousExtents!=='function')
   throw Error('Stage04 requires preexisting reference and interior systems');
 const disabled=()=>globalThis.__SUNSET_STAGE04_ACCESS_OFF===true||
  (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage04AccessOff'));
 // This particular active hotel is only 10m deep. Do not construct the usual
 // 16m-deep prefab through its rear wall. Its foyer and rooms stay in the shell.
 H.interiorExtents450=function stage04Extents(shell){
   if(shell?.stage04CompactHotel===true&&!disabled())return {X:7.75,Z:3.82};
   return previousExtents(shell);
 };
 const near=(a,b,t=.05)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t;
 function apply(w){
  if(w.stage04AccessStats)return w.stage04AccessStats;
  const originalPortalCount=w.entrancePortals.length;
  const originalReady=w.entrancePortals.filter(p=>p.interiorReady).length;
  const originalBuildings=w.buildings.length;
  const baselineSolids=w.solids.length;
  const originalRoadCount=w.roads461.length;
  const originalRoadSignature=w.roads461.map(r=>`${r.id}:${r.points?.length}`);
  const live=new Map(w.buildings.map(b=>[`${b.x},${b.z}`,b]));
  const stale=w.entrancePortals.filter(p=>!p.interiorReady&&!live.has(`${p.buildingX},${p.buildingZ}`));
  const livePortals=new Set(w.entrancePortals.filter(p=>p.interiorReady&&live.has(`${p.buildingX},${p.buildingZ}`)).map(p=>p.id));
  const oldBoxes=w.boxes.length;
  // A late CITY20 facade pass had created door jambs and forecourts even for
  // those orphan portal records. Remove their visual pieces, NEVER collision.
  w.boxes=w.boxes.filter(b=>{
   const id=b.city20Stage10Portal??b.city20Stage14Portal??b.city20Stage15Portal??b.city20Stage16Portal;
   return id===undefined||livePortals.has(id);
  });
  const orphanPiecesRemoved=oldBoxes-w.boxes.length;
  const stats={stage:4,issue:'S01-BL-01',baselinePortals:originalPortalCount,
   baselineActive:originalReady,activeBuildings:originalBuildings,
   orphanDescriptorsKept:stale.length,orphanVisualsRemoved:orphanPiecesRemoved,
   newEntranceId:null,activeAfter:originalReady,activeBuildingCoverageAfter:originalReady,
   roadCountUnchanged:true,originalIdsPreserved:true,oneCompactHotelOpened:false,
   gpuVisualVerified:false};
  // Among surviving base buildings, a 65 x 10m hotel has a real facade and
  // collision footprint but no registered entry. It is on inland walkable land.
  const b=w.buildings.find(b=>near(b.x,-270)&&near(b.z,-21.2)&&near(b.w,65)&&near(b.d,10)&&b.kind==='hotel');
  if(!b){stats.reason='No matching active hotel; no unsafe portals unlocked';w.stage04AccessStats=stats;return stats;}
  const doorX=b.x,doorZ=b.z-b.d*.5-.57,front=b.z-b.d*.5;
  const safe=H.reference469?.coast(doorX,doorZ)>3&&
    H.coast461?.keepCity(doorX,doorZ)&&H.coast461?.land(doorX,doorZ)&&
    !H.coast461?.isRouteRoad(doorX,doorZ-1.85)&&
    w.entrancePortals.every(p=>Math.hypot(p.x-doorX,p.z-doorZ)>8);
  const shell=w.boxes.find(o=>near(o.x,b.x)&&near(o.z,b.z)&&near(o.w,b.w)&&near(o.d,b.d)&&
    o.shape==='architectural_tower'&&o.h>12&&o.layer===4);
  const solid=w.solids.find(s=>near(s.x,b.x)&&near(s.z,b.z)&&near(s.hw,b.w*.5)&&near(s.hd,b.d*.5));
  const floorY=H.cityTerrain42(b.x,b.z);
  if(!safe||!shell||!solid||!Number.isFinite(floorY)){
    stats.reason='Hotel physical geometry or safe approach not verified';
    w.stage04AccessStats=stats;return stats;
  }
  // Lower exterior shell and its matching collision solid are both cut into
  // side walls + a rear wall, leaving a genuine 3.85m open pedestrian corridor.
  const opening=3.85, low=3.52,top=shell.y+shell.h*.5,bottom=shell.y-shell.h*.5;
  if(Math.abs(bottom-floorY)>.5||top-bottom<8){
    stats.reason='Hotel shell differs from ground; doorway not cut';
    w.stage04AccessStats=stats;return stats;
  }
  const color=shell.color||'#acb5ae',material=shell.material||'masonry';
  shell.h=top-(bottom+low);shell.y=(top+bottom+low)*.5;
  const leftW=(b.w-opening)*.5,rightW=leftW;
  function slab(x,y,z,width,height,depth,c=color,mat=material,tag='wall'){
    const mesh=H.box(x,y,z,width,height,depth,c,0,4,0);
    mesh.material=mat;mesh.stage04Entry=true;mesh.stage04Kind=tag;
    mesh.visibilityCap=1250;mesh.lodMax=1250;w.add(mesh);return mesh;
  }
  slab(b.x-(opening+leftW)*.5,floorY+low*.5,b.z,leftW,low,b.d);
  slab(b.x+(opening+rightW)*.5,floorY+low*.5,b.z,rightW,low,b.d);
  slab(b.x,floorY+low*.5,b.z+b.d*.5-.43,opening,low,.86);
  // Trim only the historic giant frontage pane and its middle vertical mullion.
  // Above-door glazing remains, but the bottom 3.52m is completely open.
  let glassRaised=0,centerBarRemoved=0;
  w.boxes=w.boxes.filter(o=>{
    if(!near(o.x,b.x,.1)||o.z>front-1.25||o.z<front-2.2||o.h<5)return true;
    if(o.w<.3&&o.d<.4){centerBarRemoved++;return false;}
    if(o.material==='glass'&&o.w>opening&&o.w<9){
      const oldTop=o.y+o.h*.5,cut=floorY+low+.05;
      if(oldTop>cut+.1){o.h=oldTop-cut;o.y=(oldTop+cut)*.5;glassRaised++;}
    }
    return true;
  });
  for(const side of [-1,1])slab(b.x+side*(opening*.5+.14),floorY+1.56,front-.23,.17,3.08,.27,'#78949b','metal','jamb');
  slab(b.x,floorY+3.18,front-.22,opening+.40,.22,.38,'#b7c6c4','metal','lintel');
  slab(b.x,floorY+.07,front-.71,opening,.12,1.25,'#a5aca5','paving','threshold');
  // Repair the actual collision spatial index, not only the decorative mesh.
  w.solids=w.solids.filter(s=>s!==solid);
  for(const [cell,items] of w.spatial){
    if(items.includes(solid)){
      const next=items.filter(s=>s!==solid);
      if(next.length)w.spatial.set(cell,next);else w.spatial.delete(cell);
    }
  }
  w.solid(b.x-(opening+leftW)*.5,b.z,leftW,b.d);
  w.solid(b.x+(opening+rightW)*.5,b.z,rightW,b.d);
  w.solid(b.x,b.z+b.d*.5-.43,opening,.86);
  const id=w.entrancePortals.length;
  const shellForRooms={x:b.x,z:b.z,w:b.w,d:b.d,h:b.h,stage04CompactHotel:true};
  b.stage04AccessibleHotel=true;
  const plan={buildingId:w.buildings.indexOf(b),floorCount:3,floorHeight:b.h/3,
    materialFamily:'hotel',outerShell:shellForRooms,
    entrance:{x:doorX,z:doorZ,width:opening,facing:'north'},
    foyer:{x:b.x,z:b.z-1.25,w:Math.min(14,b.w*.24),d:6.9},
    elevatorCore:{x:b.x+4.85,z:b.z+1.5,w:2.8,d:2.6},
    stairCore:{x:b.x-4.85,z:b.z+1.5,w:2.9,d:2.9},interiorReady:true,
    stage04CompactHotel:true};
  w.structuralPlans.push(plan);
  w.entrancePortals.push({id,x:doorX,z:doorZ,width:opening,facing:'north',
    buildingX:b.x,buildingZ:b.z,interiorReady:true,stage04CompactHotel:true});
  const entryDoor={id,x:doorX,z:front-.31,width:opening,open:0,stage04:true};
  w.stage42Doors.push(entryDoor);
  const cell=`${Math.floor(entryDoor.x/36)},${Math.floor(entryDoor.z/36)}`;
  if(!w.lobbyDoors443.has(cell))w.lobbyDoors443.set(cell,[]);
  w.lobbyDoors443.get(cell).push(entryDoor);
  stats.newEntranceId=id;
  stats.activeAfter=w.entrancePortals.filter(p=>p.interiorReady).length;
  stats.activeBuildingCoverageAfter=w.buildings.filter(v=>w.entrancePortals.some(p=>p.interiorReady&&p.buildingX===v.x&&p.buildingZ===v.z)).length;
  stats.oneCompactHotelOpened=true;stats.glassRaised=glassRaised;stats.centerBarRemoved=centerBarRemoved;
  stats.collisionFootprintsDelta=w.solids.length-baselineSolids;
  stats.portalCountAfter=w.entrancePortals.length;
  stats.newGeometry=w.boxes.filter(o=>o.stage04Entry).length;
  stats.unchangedHistoricalPortalIds=w.entrancePortals.slice(0,originalPortalCount).every((p,i)=>p.id===i);
  stats.liveDoorRecords=w.stage42Doors.filter(v=>w.entrancePortals[v.id]?.interiorReady).length;
  if(w.roads461.length!==originalRoadCount||w.roads461.some((r,i)=>`${r.id}:${r.points?.length}`!==originalRoadSignature[i]))
    throw Error('Stage04 unexpectedly modified roads');
  w.stage04AccessStats=stats;return stats;
 }
 H.finishReferenceBuildings469=function stage04Finish(world){
  const result=previous(world);
  if(!disabled())apply(world);
  return result;
 };
 H.stage04Access={apply,disabled};
})(Heatline);
