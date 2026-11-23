/* CITY20 stage14: commercial storefront frontage; render-only and portal-safe. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage14 requires stage13');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE14===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20shopsOff'));
function enhance(w){
 if(w.city20Stage14Stats)return w.city20Stage14Stats;
 if(!w.city20Stage13Stats||!Array.isArray(w.entrancePortals))throw Error('Stage14 requires stage13');
 const initial={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length};
 const stats={stage:14,portalsScanned:0,commercialFronts:0,windowBays:0,signBands:0,awningPanels:0,displayPlinths:0,geometryAdded:0,collisionsAdded:0,openedPortals:0,gpuFpsVerified:false};
 const plans=new Map((w.structuralPlans||[]).filter(q=>q&&q.outerShell).map(q=>[`${q.outerShell.x},${q.outerShell.z}`,q]));
 function add(p,kind,x,y,z,width,height,depth,color,material,range=250){
  if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<=0)throw Error('Stage14 invalid mesh');
  const b=H.box(x,y,z,width,height,depth,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;b.city20Stage14=true;b.city20Stage14Portal=p.id;b.city20Stage14Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  stats.portalsScanned++;
  if(![p.x,p.z,p.width].every(Number.isFinite)||p.width<1)continue;
  const plan=plans.get(`${p.buildingX},${p.buildingZ}`);
  const descriptor=String([p.buildingType,p.kind,p.type,plan&&plan.type,plan&&plan.kind].filter(Boolean).join(' ')).toLowerCase();
  if(!/shop|retail|market|store|commercial|mall|cafe|restaurant|office|hotel|resort|motel/.test(descriptor))continue;
  const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(p.x,p.z):0;if(!Number.isFinite(ground))continue;
  const face=['north','south','east','west'].includes(p.facing)?p.facing:'north';
  const axisX=face==='east'||face==='west';const sign=face==='south'||face==='east'?1:-1;
  const forward=.12*sign;const half=Math.min(3.2,Math.max(.75,p.width*.5));
  // All storefront details flank the existing portal; the opening is untouched.
  for(const s of [-1,1]){
   const side=s*(half+.85),x=p.x+(axisX?forward:side),z=p.z+(axisX?side:forward);
   const paneW=Math.min(1.45,Math.max(.45,half*.68));
   add(p,'display-glass',x,ground+1.52,z,axisX?.085:paneW,2.15,axisX?paneW:.085,'#83a8ad','glass',220);
   add(p,'display-sill',x,ground+.38,z,axisX?.20:paneW+.14,.13,axisX?paneW+.14:.20,'#9a9e99','stone',270);
   add(p,'display-head',x,ground+2.68,z,axisX?.18:paneW+.14,.13,axisX?paneW+.14:.18,'#797f80','metal',270);
   stats.windowBays++;
   // Keep display furnishings behind glass and outside the passage axis.
   const inward=-sign*.30;
   add(p,'display-plinth',x+(axisX?inward:0),ground+.58,z+(axisX?0:inward),axisX?.36:paneW*.65,.55,axisX?paneW*.65:.36,'#b4a48e','stone',130);
   stats.displayPlinths++;
  }
  const top=ground+3.43;
  add(p,'store-sign-band',p.x+(axisX?forward:0),top,p.z+(axisX?0:forward),axisX?.22:half*2+.45,.38,axisX?half*2+.45:.22,'#485d5e','metal',310);stats.signBands++;
  add(p,'awning-fascia',p.x+(axisX?sign*.48:0),ground+3.12,p.z+(axisX?0:sign*.48),axisX?.78:half*2+.38,.14,axisX?half*2+.38:.78,'#b59a76','fabric',245);stats.awningPanels++;
  stats.commercialFronts++;
 }
 stats.geometryAdded=w.boxes.length-initial.boxes;
 if(w.solids.length!==initial.solids||w.entrancePortals.length!==initial.portals||w.roads461.length!==initial.roads)throw Error('Stage14 mutated traversal or collision');
 w.city20Stage14Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage14Finish(w){const result=prior(w);if(!disabled())enhance(w);return result;};
H.city20Stage14={enhance,disabled};
})(Heatline);
