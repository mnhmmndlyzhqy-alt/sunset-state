/* CITY20 stage 07: architectural geometry on existing registered buildings.
   Uses shared shapes/materials, no gameplay collisions or new building footprints.
   QA A/B: ?city20architectureOff=1 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage07 requires stage06 architecture pipeline');
const disabled=()=>typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20architectureOff');
function improve(w){
 if(w.city20Stage07Stats)return w.city20Stage07Stats;
 const plans=w.city20DistrictBuildings;
 if(!Array.isArray(plans)||plans.length!==130||!w.city20Stage06Stats)throw Error('Stage07 requires complete Stage06 and 130 mapped buildings');
 const roads=w.roads461.length,doors=w.entrancePortals.length,solids=w.solids.length,initial=w.boxes.length;
 const stats={stage:7,buildingsDetailed:0,kindCounts:{},features:{},geometryAdded:0,collisionsAdded:0,verifiedGpuFps:false};
 function part(s,kind,x,y,z,ww,hh,dd,color,material,shape,cap){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)throw Error('Stage07 invalid architectural part');
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);
  b.shape=shape||'reference_slab469';b.material=material||'concrete';
  b.visibilityCap=cap;b.lodMax=cap;b.city20Stage07=true;b.city20Stage07Owner=s.id;b.city20Stage07Kind=kind;
  w.boxes.push(b);stats.features[kind]=(stats.features[kind]||0)+1;
 }
 const pal={villa:['#c9b9a1','#8b8e82'],resort:['#dfd1ba','#92a7a6'],warehouse:['#9fa6a3','#697a80'],service:['#adb5b2','#687c81'],civic:['#c4bcae','#84959a'],midrise:['#b6b1a9','#657b82'],tower:['#9eaaa9','#617c86']};
 for(const s of plans){
  const k=s.kind,colors=pal[k];if(!colors)continue;
  const x=s.x,z=s.z,wid=s.width,dep=s.depth,base=s.baseY,h=s.height;
  const roof=base+h,front=z+dep*.5;
  const low=Math.min(h*.16,3.5),canopyY=base+Math.max(2.8,low);
  // Architectural features are deliberately above door clearance and inside
  // the original footprint or overhead, so the 298 existing portals remain open.
  if(k==='villa'||k==='resort'){
   part(s,'eave',x,roof+.18,z,wid*1.12,.36,dep*1.11,colors[0],'travertine471','reference_step469',2200);
   part(s,'gable',x,roof+1.04,z,wid*.66,1.5,dep*.60,colors[1],'concrete','reference_prow469',2200);
   part(s,'balcony',x,base+Math.max(3.3,h*.55),front+.38,wid*.48,.22,.78,colors[0],'travertine471','reference_slab469',480);
   part(s,'balcony_rail',x,base+Math.max(3.3,h*.55)+.63,front+.72,wid*.48,1.0,.13,colors[1],'anodized471','reference_slab469',480);
  }else if(k==='warehouse'||k==='service'){
   part(s,'industrial_roof',x,roof+.48,z,wid*.86,.96,dep*.72,colors[1],'metal','reference_step469',2800);
   part(s,'loading_canopy',x,canopyY+1.0,front+.65,wid*.76,.27,1.3,colors[1],'anodized471','reference_slab469',780);
   part(s,'loading_header',x,canopyY+.64,front+.12,wid*.67,.42,.24,colors[0],'concrete','reference_slab469',760);
  }else if(k==='civic'){
   part(s,'civic_portico',x,base+4.8,front+.44,wid*.78,.54,.96,colors[0],'travertine471','reference_slab469',1300);
   for(const sign of [-1,1])part(s,'civic_pier',x+sign*wid*.32,base+3.1,front+.22,.66,5.3,.66,colors[0],'travertine471','reference_octagon469',950);
   part(s,'civic_parapet',x,roof+.52,z,wid*.88,1.04,dep*.82,colors[1],'anodized471','reference_step469',2500);
  }else if(k==='midrise'){
   part(s,'midrise_wing',x+wid*.28,base+h*.54,z,wid*.29,h*.61,dep*.70,colors[0],'concrete','reference_step469',2600);
   part(s,'midrise_cornice',x,roof+.25,z,wid*.96,.5,dep*.94,colors[1],'anodized471','reference_slab469',2800);
   part(s,'shop_canopy',x,base+4.1,front+.5,wid*.67,.32,1.0,colors[1],'metal','reference_slab469',780);
  }else if(k==='tower'){
   // Stage06 tower tiers are preserved; add horizontal architectural relief,
   // not an opaque slab that hides the tiered silhouette.
   for(const f of [.23,.51,.77]){
    part(s,'tower_spandrel',x,base+h*f,z,wid*.99,.34,dep*.99,colors[1],'anodized471','reference_slab469',1900);
   }
   part(s,'tower_entry_canopy',x,base+5.3,front+.45,wid*.56,.38,1.15,colors[0],'travertine471','reference_slab469',720);
  }
  stats.buildingsDetailed++;stats.kindCounts[k]=(stats.kindCounts[k]||0)+1;
 }
 stats.geometryAdded=w.boxes.length-initial;
 if(w.roads461.length!==roads||w.entrancePortals.length!==doors||w.solids.length!==solids)throw Error('Stage07 modified critical world systems');
 w.city20Stage07Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage07Finish(w){const result=prior(w);if(!disabled())improve(w);return result;};
H.city20Stage07={improve,disabled};
})(Heatline);
