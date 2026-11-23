/* SUNSET STATE — 35-stage repair, stage 05: 130 ACTUAL CITY20 entrances.
 * Extends stage04; preserves the chosen map, existing legacy portal IDs 0..298,
 * roads, natural habitats, old interiors and 215 dormant orphan descriptors.
 * Doors are registered with the original entry/exit gameplay code; the exterior
 * low hull and collision index both have an unobstructed passage.
 * CPU verification only. WebGL/real FPS and visual fit still require a live run.
 * A/B: ?stage05EntriesOff=1 or global __SUNSET_STAGE05_ENTRIES_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function')
   throw Error('Stage05 requires the accumulated CITY20 + Stage04 engine');
 const off=()=>globalThis.__SUNSET_STAGE05_ENTRIES_OFF===true||
  (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage05EntriesOff'));
 const close=(a,b,t=.07)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t;
 const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
 const col={villa:'#c4b8a5',resort:'#ddd4c4',tower:'#9baaa9',midrise:'#b5b1a7',civic:'#c8c0b0',warehouse:'#a5aba9',service:'#b2b7b3'};
 const material={villa:'residential',resort:'hotel',tower:'glass',midrise:'brick',civic:'heritage',warehouse:'tech',service:'tech'};
 const name={villa:'בית מגורים',resort:'בית נופש',tower:'מגדל',midrise:'בניין מגורים ומסחר',civic:'מבנה ציבור',warehouse:'מחסן וסדנה',service:'מבנה שירות'};
 function mesh(w,owner,kind,x,y,z,width,height,depth,color,mat,range=720){
   if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<=.005)throw Error('Stage05 bad exterior geometry '+owner.id);
   const p=H.box(x,y,z,width,height,depth,color,0,4,0);
   p.material=mat;p.shape='reference_slab469';p.visibilityCap=range;p.lodMax=range;
   p.stage05City20=true;p.stage05Owner=owner.id;p.stage05Kind=kind;
   w.boxes.push(p);return p;
 }
 function cutExterior(w,s,base,opening){
   const existing=w.boxes.filter(b=>
     (b.city20BuildingId===s.id||b.city20Stage06Owner===s.id&&b.city20Stage06Kind==='massing'||
      b.city20Stage02===true&&close(b.x,s.x,.03)&&close(b.z,s.z,.03)&&b.w>s.width*.73&&b.d>s.depth*.73)&&
     b.y-b.h*.5<base+.85&&b.y+b.h*.5>base+1.75&&b.layer===4);
   if(!existing.length)return 0;
   let n=0;
   for(const body of existing){
     const bottom=body.y-body.h*.5,top=body.y+body.h*.5;
     const ceiling=Math.min(bottom+3.52,top);
     const side=(body.w-opening)*.5;
     if(side<1.1||ceiling-bottom<1.20)return 0;
     // Remove the full-width lowest mass. Some civic buildings also have a
     // short 2.5-3m plinth mesh; leaving a 35cm overhead band there would
     // silently obstruct the 3.15m doorway, despite clear collision shapes.
     if(top-ceiling>.30){body.y=(top+ceiling)*.5;body.h=top-ceiling;}
     else w.boxes=w.boxes.filter(b=>b!==body);
     const height=ceiling-bottom;
     for(const sign of [-1,1])
       mesh(w,s,'opened-side-wall',body.x+sign*(opening+side)*.5,bottom+height*.5,
         body.z,side,height,body.d,body.color||col[s.kind],body.material||'masonry',Math.min(2700,body.visibilityCap||2700));
     // The door-to-foyer passage is open from the street to the rear wall.
     mesh(w,s,'opened-rear-wall',body.x,bottom+height*.5,body.z+body.d*.5-.37,
       opening,height,.74,body.color||col[s.kind],body.material||'masonry',Math.min(2700,body.visibilityCap||2700));
     n++;
   }
   return n;
 }
 function repairSolid(w,s,opening){
   const original=w.solids.find(o=>close(o.x,s.x,.03)&&close(o.z,s.z,.03)&&
    close(o.hw,(s.width+.12)*.5,.08)&&close(o.hd,(s.depth+.12)*.5,.08));
   if(!original)return false;
   // The collision grid must be updated as well, otherwise the opening is
   // only visual and the player is still stopped by the invisible old hull.
   w.solids=w.solids.filter(o=>o!==original);
   for(const [k,solids]of w.spatial){
     if(!solids.includes(original))continue;
     const remaining=solids.filter(v=>v!==original);
     if(remaining.length)w.spatial.set(k,remaining);else w.spatial.delete(k);
   }
   const span=(s.width+.12-opening)*.5;
   for(const sign of [-1,1])w.solid(s.x+sign*(opening+span)*.5,s.z,span,s.depth+.12);
   w.solid(s.x,s.z+s.depth*.5-.38,opening,.76);
   return true;
 }
 function addDoor(w,s,id,opening){
   const front=s.z-s.depth*.5,px=s.x,pz=front-.57,ground=H.outdoorHeight(px,pz);
   const c=col[s.kind]||'#bab4a9';
   for(const sign of [-1,1]){
     mesh(w,s,'door-jamb',px+sign*(opening*.5+.12),ground+1.58,front-.18,.18,3.15,.30,'#778d94','metal',550);
     mesh(w,s,'wall-lantern',px+sign*(opening*.5+.68),ground+2.61,front-.27,.20,.43,.28,'#dfc894','light_emissive',350);
   }
   mesh(w,s,'door-header',px,ground+3.32,front-.18,opening+.33,.26,.48,c,'concrete',640);
   mesh(w,s,'door-threshold',px,ground+.08,front-.73,opening-.2,.13,1.15,'#abb3ab','paving',580);
   // The existing engine animates the registered exterior door; deliberately
   // do not add a permanent transparent slab across the passage.
   const door={id,x:px,z:front-.31,width:opening,open:0,stage05City20:true};
   w.stage42Doors.push(door);
   const cell=`${Math.floor(px/36)},${Math.floor(door.z/36)}`;
   if(!w.lobbyDoors443.has(cell))w.lobbyDoors443.set(cell,[]);
   w.lobbyDoors443.get(cell).push(door);
 }
 function compactScene(plan,floor){
   floor=Math.max(0,Math.min(Math.round(floor),plan.floorCount-1));
   const s=plan.outerShell,x=s.x,z=s.z,Y=floor*plan.floorHeight;
   const X=s.w*.5-.62,Z=s.d*.5-.62;
   const boxes=[],solids=[],lights=[],pickups=[],activities=[],rooms=[],doors=[];
   const place=(xx,yy,zz,w,h,d,color,mat='paint',layer=4,glow=0)=>{
     const v=H.box(xx,Y+yy,zz,w,h,d,color,0,layer,glow);v.material=mat;boxes.push(v);return v;
   };
   const solid=(xx,zz,w,d)=>solids.push({x:xx,z:zz,hw:w*.5,hd:d*.5});
   const wall=(xx,zz,w,d,color='#d3d2c8')=>{place(xx,2.00,zz,w,4.0,d,color,'paint');solid(xx,zz,w,d);};
   // Every rendered item and collider remains inside its ACTUAL building shell.
   place(x,-.20,z,X*2+.30,.32,Z*2+.30,'#b5b1a6','concrete',1);
   place(x,.031,z,X*2-.14,.060,Z*2-.14,plan.materialFamily==='hotel'?'#d4cab4':'#c8c7b8','paint',2);
   place(x,4.08,z,X*2+.2,.18,Z*2+.2,'#e5e3d9','paint');
   wall(x-X,z,.26,Z*2+.12);wall(x+X,z,.26,Z*2+.12);wall(x,z+Z,X*2+.14,.27);
   const gap=3.67,fl=z-Z,side=X-gap*.5;
   if(side>.12){wall(x-(X+gap*.5)*.5,fl,side,.30);wall(x+(X+gap*.5)*.5,fl,side,.30);}
   place(x,3.22,fl,gap+.20,.22,.34,'#8eaaa7','metal');
   for(const sign of [-1,1])place(x+sign*(gap*.5+.09),1.57,fl,.13,3.1,.33,'#8ba4a8','metal');
   // One small furnished room zone on each side; the central through-route
   // to the stair/lift bay is always clear. Narrow villas are open plan.
   const free=X-gap*.5;
   if(free>2.1){for(const sign of [-1,1]){
     const sx=x+sign*(gap*.5+free*.49),sz=z-.12;
     place(sx,.56,sz,Math.max(.70,free*.40),.86,1.14,sign<0?'#8c927f':'#b8a58d','wood');
     solid(sx,sz,Math.max(.63,free*.39),1.07);
     place(sx,1.18,sz+.37,Math.max(.56,free*.37),.20,.36,'#c1d2c4','paint');
   }}
   for(const sign of [-1,1]){
     const sx=x+sign*(X-.18),sz=z-Z*.28;
     place(sx,2.0,sz,.075,1.48,1.40,sign>0?'#729297':'#c0ab8e','paint');
     place(sx,2.87,sz,.08,.12,1.56,'#a2b2b2','metal');
   }
   const lampCount=Z>7?3:2;
   for(let j=0;j<lampCount;j++){
     const zz=z-Z*.55+j*(Z*1.1/Math.max(1,lampCount-1));
     place(x,3.96,zz,1.38,.10,.38,'#e7d7ad','light_emissive',4,.36);
     lights.push({x,y:Y+3.52,z:zz,radius:Math.max(6,Z),r:1.0,g:.93,b:.79});
   }
   // Reception table is offset to the side. No central collider blocks entry.
   if(free>2.85){const side=-1,xx=x+side*(X-1.0),zz=z+Z*.33;
     place(xx,.82,zz,1.14,1.05,.82,'#8f8574','wood');solid(xx,zz,1.1,.78);
     place(xx,1.41,zz-.19,.97,.11,.49,'#d7cbb4','concrete');}
   const liftX=x+Math.min(.85,X-2.5),liftZ=z+Z-1.42;
   if(plan.floorCount>1){
     place(liftX,2.20,liftZ+.35,2.45,3.55,.13,'#465967','metal');
     place(liftX,3.46,liftZ-.44,1.47,.19,.13,'#e8d6a6','light_emissive',4,.28);
   } else {
     place(liftX,2.05,liftZ+.32,1.75,3.55,.14,'#8d9590','paint');
   }
   const roomKind=plan.materialFamily==='residential'?'home':plan.materialFamily==='hotel'?'suite':
    plan.materialFamily==='glass'||plan.materialFamily==='tech'?'office':'gallery';
   rooms.push({id:'compact-main',label:name[plan.stage05Kind]||'חלל פנימי',use:roomKind,doorId:null,
     x:x-Math.min(.75,free*.3),z:z-Z*.16,index:0,reward:38,description:'חלל פנימי מותאם לגודל המבנה'});
   const names=['תוכנית בניין','גלויה','מפתח סדנה'];
   for(let k=0;k<2;k++)pickups.push({id:`${plan.buildingId}:${floor}:city20:${k}`,x:x+(k?-.7:.7),z:z+(k?.60:-.6),name:names[(plan.buildingId+k)%names.length]});
   activities.push({x:x+Math.min(1.2,X-.85),z:z-Z*.14,kind:'observation',label:'פרטים על המבנה'});
   const scene={boxes,solids,lights,pickups,activities,doors,rooms,
     theme:name[plan.stage05Kind]||'מבנה עירוני',floor,maxFloor:plan.floorCount-1,
     stairs:null,liftBarrier:null,
     entrance:{x,z:z-Z+1.15},lift:{x:liftX,z:liftZ},
     bounds:{xmin:x-X+.35,xmax:x+X-.35,zmin:z-Z+.35,zmax:z+Z-.35},
     name:name[plan.stage05Kind]||'מבנה עירוני',stage05Compact:true};
   // Reuse the game's genuine lift-door and stair system where the actual
   // height admits additional floors. Single-storey villas stay single-storey.
   if(plan.floorCount>1)H.upgradeInteriorStage25(plan,scene);
   else scene.stairs={westX:x-1.65,eastX:x-.65,frontZ:z+Z-2.45,rearZ:z+Z-.55,
     up:{x:x-1.2,z:z+Z-2.8},down:{x:x-.35,z:z+Z-2.8}};
   return scene;
 }
 // Compact floor geometry bypasses decorators designed for enormous hotels:
 // some legacy decorators put furniture OUTSIDE an 11x9m villa.
 function installInterior(){
   if(H.stage05City20?.interiorInstalled)return;
   const previousInterior=H.makeInteriorScene;
   const oldEnhance=H.enhanceInterior450,oldRefine=H.refineInterior455,oldPolish=H.polishInterior461;
   const oldExtents=H.interiorExtents450;
   if([previousInterior,oldEnhance,oldRefine,oldPolish].some(fn=>typeof fn!=='function'))
     throw Error('Stage05 runtime must install after engine44.js');
   // Stairwell geometry must follow the REAL compact shell, not the engine's
   // minimum 16m-deep hotel preset. Keep the Stage04 hotel special case intact.
   H.interiorExtents450=function stage05Extents(shell){
     if(shell?.stage05Compact===true&&!off())
       return {X:shell.w*.5-.62,Z:shell.d*.5-.62};
     return oldExtents(shell);
   };
   H.makeInteriorScene=function stage05Scene(plan,floor){
     return plan?.stage05Compact===true&&!off()?compactScene(plan,floor):previousInterior(plan,floor);
   };
   H.enhanceInterior450=function stage05Enhance(scene,plan){
     return plan?.stage05Compact&&scene?.stage05Compact?scene:oldEnhance(scene,plan);
   };
   H.refineInterior455=function stage05Refine(scene,plan){
     return plan?.stage05Compact&&scene?.stage05Compact?scene:oldRefine(scene,plan);
   };
   H.polishInterior461=function stage05Polish(scene,plan,floor){
     return plan?.stage05Compact&&scene?.stage05Compact?scene:oldPolish(scene,plan,floor);
   };
   H.stage05City20.interiorInstalled=true;
 }
 function add(w){
   if(w.stage05City20Stats)return w.stage05City20Stats;
   const specs=w.city20DistrictBuildings;
   if(!Array.isArray(specs)||specs.length!==130||!w.stage04AccessStats?.oneCompactHotelOpened)
     throw Error('Stage05 needs 130 mapped CITY20 shells and Stage04 hotel');
   const before={portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,
     buildings:w.buildings.length,roads:w.roads461.length,solids:w.solids.length,boxes:w.boxes.length};
   const used=new Set(w.entrancePortals.map(p=>`${p.buildingX},${p.buildingZ}`));
   const entries=[];let cutCount=0,collisionCount=0,small=0,levels=0;
   for(const [i,s] of specs.entries()){
     const shellKey=`${s.x},${s.z}`;
     if(used.has(shellKey))throw Error('CITY20 entrance collides with existing portal '+s.id);
     const shell=w.boxes.find(o=>o.city20BuildingId===s.id||
         o.city20Stage06Owner===s.id&&o.city20Stage06Kind==='massing');
     const original=w.solids.find(v=>close(v.x,s.x,.03)&&close(v.z,s.z,.03)&&
       close(v.hw,(s.width+.12)*.5,.08)&&close(v.hd,(s.depth+.12)*.5,.08));
     const x=s.x,z=s.z-s.depth*.5-.57;
     const valid=s.width>=10.5&&s.depth>=8.5&&s.height>=5&&
       H.reference469.coast(x,z-1.65)>1.5&&!H.coast461.isRouteRoad(x,z-1.65)&&
       !w.nearby(x,z-1.65).some(o=>o!==original&&Math.abs(o.x-x)<o.hw+.77&&Math.abs(o.z-(z-1.65))<o.hd+.77);
     if(!shell||!original||!valid)throw Error('Stage05 cannot safely open facade '+s.id);
     const opening=3.75,base=s.baseY;
     const cuts=cutExterior(w,s,base,opening);
     if(cuts<1)throw Error('Stage05 facade is not cut '+s.id);
     if(!repairSolid(w,s,opening))throw Error('Stage05 collision footprint was not cut '+s.id);
     cutCount+=cuts;collisionCount++;
     const id=w.entrancePortals.length;
     const floors=Math.max(1,Math.min(24,Math.floor(s.height/4.45)));
     const compact=s.width<17||s.depth<18||floors<3;
     if(compact)small++;
     const plan={buildingId:w.buildings.length+i,floorCount:floors,floorHeight:s.height/floors,
       materialFamily:material[s.kind]||'residential',
       outerShell:{x:s.x,z:s.z,w:s.width,d:s.depth,h:s.height,stage05City20:true,stage05Compact:compact},
       entrance:{x,z,width:opening,facing:'north'},
       foyer:{x:s.x,z:s.z-s.depth*.17,w:Math.min(s.width-1.25,8.0),d:Math.min(s.depth-1.25,8.5)},
       elevatorCore:{x:s.x+Math.min(.85,s.width*.1),z:s.z+s.depth*.25,w:2.6,d:2.7},
       stairCore:{x:s.x-1.7,z:s.z+s.depth*.17,w:2.3,d:2.8},
       interiorReady:true,stage05City20:true,stage05Kind:s.kind,stage05Compact:compact};
     w.structuralPlans.push(plan);
     const portal={id,x,z,width:opening,facing:'north',buildingX:s.x,buildingZ:s.z,interiorReady:true,
       stage05City20:true,city20OwnerId:s.id,buildingType:s.kind};
     w.entrancePortals.push(portal);
     addDoor(w,s,id,opening);
     // These structures remain in the dedicated CITY20 registry. Do not rewrite
     // world.buildings, which would retrospectively affect road/roof/AI builders.
     s.interiorAvailable=true;s.city20Stage05PortalId=id;s.city20Stage05Floors=floors;
     entries.push({id,owner:s.id,kind:s.kind,floors,compact,width:s.width,depth:s.depth,cutVolumes:cuts});
     levels+=floors;
     used.add(shellKey);
   }
   if(w.entrancePortals.length!==before.portals+130||w.roads461.length!==before.roads||
      w.buildings.length!==before.buildings||w.entrancePortals.slice(0,before.portals).some((p,i)=>p.id!==i))
     throw Error('Stage05 mutated legacy IDs, original buildings or roads');
   const stats={stage:5,issueId:'S01-BL-02',entrancesAdded:entries.length,
     oldEntrancesRetained:before.active,readyNow:w.entrancePortals.filter(p=>p.interiorReady).length,
     allPortals:w.entrancePortals.length,city20Buildings:specs.length,compactInteriors:small,
     multiFloor:entries.filter(e=>e.floors>1).length,accessibleFloors:levels,
     cutExteriorVolumes:cutCount,splitCollisionFootprints:collisionCount,
     geometryAdded:w.boxes.length-before.boxes,collisionDelta:w.solids.length-before.solids,
     orphanPortalsStillDisabled:w.entrancePortals.slice(0,298).filter(p=>!p.interiorReady).length,
     noRoadChanges:true,gpuVerified:false,all:entries};
   w.stage05City20Stats=stats;
   return stats;
 }
 H.finishReferenceBuildings469=function stage05Finalizer(w){
   const r=previous(w);
   if(!off())add(w);
   return r;
 };
 H.stage05City20={add,off,compactScene,installInterior,interiorInstalled:false};
})(Heatline);
