/* CITY20 stage11: interior-ready lobby visual furnishing, non-colliding.
   Never opens locked portals or changes interior traversal. A/B city20lobbiesOff=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage11 requires stage10');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE11===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20lobbiesOff'));
function enhance(w){
 if(w.city20Stage11Stats)return w.city20Stage11Stats;
 if(!w.city20Stage10Stats||!Array.isArray(w.entrancePortals))throw Error('Stage11 requires stage10');
 const before={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length};
 const stats={stage:11,readyPortals:0,decoratedLobbies:0,skippedWithoutPlan:0,skippedSmallFoyer:0,geometryAdded:0,collisionsAdded:0,gpuFpsVerified:false};
 const plans=new Map((w.structuralPlans||[]).filter(p=>p&&p.outerShell&&p.foyer).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
 function part(p,kind,x,y,z,ww,hh,dd,color,material){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)throw Error('Stage11 invalid lobby mesh');
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=230;b.lodMax=230;
  b.city20Stage11=true;b.city20Stage11Portal=p.id;b.city20Stage11Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  if(p.interiorReady!==true)continue;stats.readyPortals++;
  const plan=plans.get(`${p.buildingX},${p.buildingZ}`);
  if(!plan||!plan.foyer){stats.skippedWithoutPlan++;continue;}
  const f=plan.foyer;
  if(![f.x,f.z,f.w,f.d].every(Number.isFinite)||f.w<4.5||f.d<3.6){stats.skippedSmallFoyer++;continue;}
  const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(f.x,f.z):0;
  if(!Number.isFinite(ground))continue;
  const w2=Math.min(f.w,8),d2=Math.min(f.d,7);
  // Keep the central pedestrian corridor empty; all details are thin and non-solid.
  part(p,'floor-inlay',f.x,ground+.027,f.z,w2*.88,.045,d2*.78,'#a69b87','stone');
  for(const side of [-1,1]){
   const sx=f.x+side*(w2*.37);
   part(p,'wall-panel',sx,ground+1.62,f.z,.10,2.95,d2*.63,'#b6ad9f','masonry');
   part(p,'bench',sx-side*.34,ground+.51,f.z+d2*.19,.65,.32,1.30,'#806d59','wood');
   part(p,'light-strip',sx-side*.10,ground+2.85,f.z,.09,.11,d2*.55,'#e4d3ad','light_emissive');
  }
  part(p,'rear-feature',f.x,ground+1.48,f.z+d2*.36,w2*.45,2.25,.10,'#7c918f','metal');
  part(p,'ceiling-recess',f.x,ground+3.03,f.z,w2*.54,.09,d2*.40,'#e0d7c5','concrete');
  stats.decoratedLobbies++;
 }
 stats.geometryAdded=w.boxes.length-before.boxes;
 if(w.solids.length!==before.solids||w.entrancePortals.length!==before.portals||w.roads461.length!==before.roads)throw Error('Stage11 changed gameplay');
 w.city20Stage11Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage11Finish(w){const result=prior(w);if(!disabled())enhance(w);return result;};
H.city20Stage11={enhance,disabled};
})(Heatline);
