/* SUNSET STATE CITY20 / STAGE 06 — SKYLINE AND URBAN MASSING
 * Original WebGL2 scene, no new render engine, no new terrain/roads or collisions.
 * Reference-first silhouettes: actual tiered towers, proportionate roof crowns,
 * civic roof lanterns and varied midrise profiles. Meshes already registered
 * in reference_buildings_469.js are shared/instanced by the existing renderer.
 * Comparison toggle: ?city20qa=1&city20skylineOff=1
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
if(typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
  new URLSearchParams(location.search).has('city20skylineOff'))
  globalThis.__SUNSET_CITY20_DISABLE_STAGE06=true;
const enabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE06!==true;
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')
  throw Error('CITY20 stage06 requires the original reference-buildings pipeline');
const PALETTES=[
 {base:'#9daaa9',glass:'#3f6272',metal:'#a6b9b4',roof:'#858f89'},
 {base:'#b2b2a6',glass:'#4d6976',metal:'#b7b3a6',roof:'#92998f'},
 {base:'#9fa9a2',glass:'#3d6672',metal:'#a1b6b3',roof:'#919e9c'},
 {base:'#a6aba8',glass:'#4d7280',metal:'#9daaa4',roof:'#879390'}
];
const SHAPES=['reference_slab469','reference_step469','reference_octagon469','reference_prow469'];
const sig=(v)=>{let a=Math.imul((Math.abs(Math.round(v*100))*2654435761)>>>0,1597334677)>>>0;a^=a>>>13;return a>>>0;};
const colorOf=(i)=>PALETTES[i%PALETTES.length];
// Add low-cost existing-shape INSTANCES. Do not register invisible collision slabs:
// roof equipment is scenery and must not change walking/vehicle navigation.
function part(w,owner,kind,x,y,z,width,height,depth,color,material,shape,range,solidSilhouette=false){
  if(!Number.isFinite(x+y+z+width+height+depth)||width<=0||height<=0||depth<=0)
    throw Error('CITY20 stage06 invalid '+kind+' for '+owner);
  const q=H.box(x,y,z,width,height,depth,color,0,4,0);
  q.shape=shape;q.material=material;q.visibilityCap=range;
  q.city20Stage06=true;q.city20Stage06Owner=owner;q.city20Stage06Kind=kind;
  if(solidSilhouette){q.stage450Proxy=true;q.stage461Mass=true;}
  else q.lodMax=Math.min(range,kind==='trim'?850:1150);
  // No solids, propSolids, camera-occluder volumes, or terrain edits.
  w.boxes.push(q);
  return q;
}
function rebuildMappedTower(w,s,i,counts){
  const main=s.__originalMain;
  if(!main)return;
  const x=main.x,z=main.z,base=main.y-main.h*.5-.16,h=main.h,ww=main.w,dd=main.d;
  const p=colorOf(i),shape=SHAPES[i%SHAPES.length],podium=Math.min(8.4,h*.18);
  const spans=[
   {b:0,t:podium,wx:1.057,dz:1.06,shape:'reference_slab469',mat:'travertine471',c:p.base},
   {b:podium,t:h*.56,wx:.96,dz:.96,shape,mat:'tower_glass469',c:p.glass},
   {b:h*.56,t:h*.85,wx:.81,dz:.83,shape,mat:'tower_glass469',c:p.glass},
   {b:h*.85,t:h,wx:.64,dz:.69,shape:i%2?'reference_octagon469':'reference_slab469',mat:'tower_glass469',c:p.glass}
  ];
  for(let j=0;j<spans.length;j++){
    const t=spans[j],height=t.t-t.b;
    part(w,s.id,'massing',x,base+.16+(t.b+t.t)*.5,z,ww*t.wx,height,dd*t.dz,t.c,t.mat,t.shape,3550,true);
    counts.tierVolumes++;
    if(j>0){
      const lip=part(w,s.id,'roofline',x,base+.16+t.t-.13,z,ww*t.wx+.34,.26,dd*t.dz+.34,p.metal,'anodized471',t.shape,3400,true);
      counts.permanentRooflines++;
    }
  }
  // The entrance remains within the original pedestrian-safe 2D footprint.
  part(w,s.id,'portal_glazing',x,base+3.12,z+dd*.535,ww*.52,4.68,.25,p.glass,'tower_glass469','reference_slab469',750);
  const crownH=2.8+(i%3)*1.45,roof=base+h+.16;
  part(w,s.id,'crown',x,roof+crownH*.5,z,ww*.37,crownH,dd*.41,p.metal,'anodized471',
    i%2?'reference_round469':'reference_octagon469',3250,true);
  counts.permanentRooflines++;
  for(const sign of [-1,1]){
    const xx=x+sign*ww*.33;
    part(w,s.id,'fin',xx,base+podium+(h-podium)*.33,z+dd*.49,.35,(h-podium)*.59,.34,p.metal,'anodized471','cube',800);
    counts.closeDetails++;
  }
  counts.remodeledMappedTowers++;
}
function upgradeCoreRoof(w,b,i,counts){
  if(!Number.isFinite(b.h)||b.h<27||!Number.isFinite(b.w*b.d))return;
  const x=b.x,z=b.z,y=H.outdoorHeight(x,z)+b.h,seed=sig(b.x*11+b.z*5+i),style=seed%5;
  const wide=Math.min(b.w,b.d),color=colorOf(seed%4);
  const isHigh=b.h>=64;
  const kind=b.kind||'residential';
  // Visible crowns keep a consistent skyline at aerial LOD. No distant empty
  // rectangle is swapped with a brand-new tower when the player approaches.
  if(isHigh){
    const height=3.4+(seed%5)*.92,roofShape=SHAPES[style%4];
    part(w,'legacy-'+i,'crown',x,y+height*.5+.18,z,b.w*.48,height,b.d*.49,
      kind==='hotel'?color.roof:color.base,kind==='hotel'?'travertine471':'anodized471',roofShape,3400,true);
    counts.permanentRooflines++;counts.coreHighrise++;counts.tierVolumes++;
    if(style%2===0){
      const mastH=b.h>90?6.2:3.4;
      part(w,'legacy-'+i,'mast',x,y+height+mastH*.5,z,1.3,mastH,1.3,'#a3adad','metal','reference_octagon469',2300,true);
      counts.permanentRooflines++;
    }
    // Two staggered steel shadow-fins, visible only at street/building range.
    for(const side of [-1,1]){
      const px=x+side*b.w*.315;
      part(w,'legacy-'+i,'fin',px,y+1.4,z+b.d*.29,.64,2.6,b.d*.12,color.metal,'anodized471','cube',840);
      counts.closeDetails++;
    }
  }else{
    const roofH=kind==='hotel'?3.1:2.0,shape=kind==='brick'?'reference_step469':'reference_slab469';
    part(w,'legacy-'+i,'crown',x,y+roofH*.5+.15,z,b.w*.30,roofH,b.d*.36,
      kind==='hotel'?'#b3a99a':'#9ca6a2','concrete',shape,3100,true);
    counts.permanentRooflines++;counts.coreMidrise++;counts.tierVolumes++;
    if(style===1||style===3){
      part(w,'legacy-'+i,'roofline',x,y+.18,z,b.w*.55,.36,b.d*.62,color.metal,'anodized471','reference_slab469',3100,true);
      counts.permanentRooflines++;
    }
  }
}
function civicRoof(w,s,i,counts){
  const x=s.x,z=s.z,y=s.baseY+s.height,rr=(i%4);
  const p=colorOf(i+2);
  const width=s.width,depth=s.depth;
  // Low horizontal buildings remain LOW; roof monitors/clerestories are part
  // of a distinct civic skyline instead of looking like copy-pasted cubes.
  const h=1.4+(i%3)*.35;
  part(w,s.id,'civic_roof',x,y+h*.5,z,width*.48,h,depth*.45,
    p.base,'travertine471',rr%2?'reference_round469':'reference_slab469',2400,true);
  part(w,s.id,'roofline',x,y+.23,z,width*.91,.46,depth*.90,p.roof,'concrete','reference_slab469',2450,true);
  counts.civicUpgraded++;counts.permanentRooflines+=2;
}
function midriseRoof(w,s,i,counts){
  const y=s.baseY+s.height,ww=s.width,dd=s.depth,p=colorOf(i+1),hh=2.25+(i%2)*1.55;
  part(w,s.id,'crown',s.x,y+hh*.5,s.z,ww*.40,hh,dd*.56,p.base,'travertine471',SHAPES[(i+1)%4],2850,true);
  part(w,s.id,'roofline',s.x,y+.24,s.z,ww*.87,.48,dd*.93,p.roof,'anodized471','reference_slab469',2500,true);
  counts.midriseUpgraded++;counts.permanentRooflines+=2;
}
function improve(w){
 if(w.city20Stage06Stats)return w.city20Stage06Stats;
 const plan=w.city20DistrictBuildings;
 if(!Array.isArray(plan)||plan.length!==130)
   throw Error('CITY20 stage06 requires exactly 130 Stage02 mapped masses');
 const before=w.boxes.length,solids=w.solids.length,roads=w.roads461.length,entrances=w.entrancePortals.length;
 const towers=plan.filter(s=>s.kind==='tower');
 // Identify the EXACT Stage02 tower components for the 4 mapped towers. Their
 // volumes are replaced with real multi-tier architecture; the collision
 // footprints, mapFeature records, and all existing interior portals remain.
 const removals=new Set();
 for(const s of towers){
   const matched=w.boxes.filter(o=>o.city20Stage02&&Math.abs(o.x-s.x)<s.width*.57+1&&
      Math.abs(o.z-s.z)<s.depth*.58+1&&o.y>s.baseY+.05&&o.y<s.baseY+s.height+2.6);
   s.__originalMain=matched.find(o=>o.city20BuildingId===s.id);
   if(!s.__originalMain||matched.length<4||matched.length>10)
     throw Error('CITY20 Stage06 cannot safely resolve old tower geometry '+s.id+' '+matched.length);
   for(const o of matched)removals.add(o);
 }
 const shore=w.boxes.shoreMesh463;
 w.boxes=w.boxes.filter(o=>!removals.has(o));
 w.boxes.shoreMesh463=shore;
 const counts={stage:6,reference:'CHOSEN_CITY_LAYOUT_ORIGINAL.png',remodeledMappedTowers:0,
   removedMappedTowerParts:removals.size,tierVolumes:0,permanentRooflines:0,
   closeDetails:0,coreHighrise:0,coreMidrise:0,civicUpgraded:0,midriseUpgraded:0};
 towers.forEach((s,i)=>rebuildMappedTower(w,s,i,counts));
 w.buildings.forEach((b,i)=>upgradeCoreRoof(w,b,i,counts));
 plan.filter(s=>s.kind==='civic').forEach((s,i)=>civicRoof(w,s,i,counts));
 plan.filter(s=>s.kind==='midrise').forEach((s,i)=>midriseRoof(w,s,i,counts));
 // The only edits are replacing pre-existing decorative Stage02 tower pieces
 // and adding skyline roof geometry. Base city, map and routing stay intact.
 for(const s of towers)delete s.__originalMain;
 const placed=w.boxes.length-before;
 counts.netWorldMeshes=placed;counts.newGeometryInstances=placed+removals.size;
 counts.native1080GpuFpsVerified=false;
 counts.roadCountUnchanged=w.roads461.length===roads;
 counts.portalCountUnchanged=w.entrancePortals.length===entrances;
 counts.collisionsUnchanged=w.solids.length===solids;
 counts.newMeshesUseExistingSharedShapes=true;
 w.city20Stage06Stats=counts;
 return counts;
}
H.finishReferenceBuildings469=function finishCity20Stage06(w){
 const r=prior(w);
 if(enabled())improve(w);
 return r;
};
H.city20Stage06={enabled,improve};
})(Heatline);
