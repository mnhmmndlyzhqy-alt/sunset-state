/* CITY20 stage13: practical-looking lobby fixtures and readable wayfinding.
   Decorative meshes only; preserve portal traversal and collision. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage13 requires stage12');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE13===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20lightingOff'));
function enhance(w){
 if(w.city20Stage13Stats)return w.city20Stage13Stats;
 if(!w.city20Stage12Stats||!Array.isArray(w.entrancePortals))throw Error('Stage13 requires stage12');
 const initial={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length};
 const plans=new Map((w.structuralPlans||[]).filter(p=>p&&p.outerShell&&p.foyer).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
 const stats={stage:13,readyPortals:0,litLobbies:0,skippedWithoutPlan:0,skippedSmall:0,geometryAdded:0,collisionsAdded:0,corridorWidth:2.8,actualDynamicLightsAdded:0,gpuFpsVerified:false};
 function part(p,kind,x,y,z,ww,hh,dd,color,material){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)throw Error('Stage13 invalid mesh');
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=150;b.lodMax=150;
  b.city20Stage13=true;b.city20Stage13Portal=p.id;b.city20Stage13Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  if(p.interiorReady!==true)continue;stats.readyPortals++;
  const plan=plans.get(`${p.buildingX},${p.buildingZ}`);
  if(!plan||!plan.foyer){stats.skippedWithoutPlan++;continue;}
  const f=plan.foyer;
  if(![f.x,f.z,f.w,f.d].every(Number.isFinite)||f.w<5.5||f.d<4.8){stats.skippedSmall++;continue;}
  const y=typeof H.outdoorHeight==='function'?H.outdoorHeight(f.x,f.z):0;if(!Number.isFinite(y))continue;
  const width=Math.min(f.w,8),depth=Math.min(f.d,7);
  // Overhead diffusers stay above 2.9m and do not obstruct the walking corridor.
  for(const side of [-1,1]){
   const sx=f.x+side*Math.max(1.6,width*.27);
   part(p,'ceiling-diffuser',sx,y+3.10,f.z-depth*.12,.78,.045,.34,'#fff0cd','light_emissive');
   part(p,'ceiling-trim',sx,y+3.14,f.z-depth*.12,.86,.045,.42,'#9e9e97','metal');
   // Signs are mounted on the sides, outside the central 2.8m corridor.
   const wallX=f.x+side*(width*.44);
   part(p,'wall-wayfinding',wallX,y+1.85,f.z+depth*.10,.055,.40,.68,'#334d55','metal');
   part(p,'wall-sign-highlight',wallX-side*.035,y+1.85,f.z+depth*.10,.018,.12,.50,'#d6e9db','light_emissive');
  }
  // Thin overhead guidance stripe: not a physical obstacle.
  part(p,'entry-guidance',f.x,y+3.11,f.z-depth*.35,.12,.025,.65,'#e9d6a9','light_emissive');
  stats.litLobbies++;
 }
 stats.geometryAdded=w.boxes.length-initial.boxes;
 if(w.solids.length!==initial.solids||w.entrancePortals.length!==initial.portals||w.roads461.length!==initial.roads)throw Error('Stage13 gameplay mutation');
 w.city20Stage13Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage13Finish(w){const r=prior(w);if(!disabled())enhance(w);return r;};
H.city20Stage13={enhance,disabled};
})(Heatline);
