/* CITY20 stage12: zoned, purpose-aware visual lobby furnishings. No portal or physics changes. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage12 requires stage11');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE12===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20interiorsOff'));
function enhance(w){
 if(w.city20Stage12Stats)return w.city20Stage12Stats;
 if(!w.city20Stage11Stats||!Array.isArray(w.entrancePortals))throw Error('Stage12 requires stage11');
 const initial={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length};
 const plans=new Map((w.structuralPlans||[]).filter(p=>p&&p.outerShell&&p.foyer).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
 const stats={stage:12,readyPortals:0,zonedLobbies:0,skippedWithoutPlan:0,skippedSmall:0,geometryAdded:0,collisionsAdded:0,gpuFpsVerified:false};
 function part(p,kind,x,y,z,ww,hh,dd,color,material){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)throw Error('Stage12 invalid mesh');
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=175;b.lodMax=175;
  b.city20Stage12=true;b.city20Stage12Portal=p.id;b.city20Stage12Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  if(p.interiorReady!==true)continue;stats.readyPortals++;
  const plan=plans.get(`${p.buildingX},${p.buildingZ}`);if(!plan||!plan.foyer){stats.skippedWithoutPlan++;continue;}
  const f=plan.foyer;if(![f.x,f.z,f.w,f.d].every(Number.isFinite)||f.w<5.5||f.d<4.8){stats.skippedSmall++;continue;}
  const y=typeof H.outdoorHeight==='function'?H.outdoorHeight(f.x,f.z):0;if(!Number.isFinite(y))continue;
  const width=Math.min(8,f.w),depth=Math.min(7,f.d),side=width*.40,back=depth*.32;
  const name=String(plan.type||plan.kind||p.buildingType||p.kind||'').toLowerCase();
  const hospitality=/hotel|resort|motel|lodg|tour/.test(name),commercial=/shop|retail|store|market|office|commercial/.test(name);
  // Narrow perimeter furnishing; leave central 2.8m+ circulation corridor empty.
  for(const sign of [-1,1]){
   const x=f.x+sign*side;
   part(p,'zone-floor',x,y+.052,f.z,Math.min(.78,width*.13),.026,depth*.53,'#b6a58b','stone');
   part(p,'wall-sconce',x-sign*.08,y+2.22,f.z-depth*.12,.11,.28,.18,'#f0d7a4','light_emissive');
   part(p,'direction-marker',x-sign*.10,y+1.45,f.z+depth*.16,.08,.42,.55,'#a8b7b1','metal');
  }
  // Furniture remains beside rear wall, never on the approach axis.
  const offset=width*.27;
  if(hospitality){
   for(const s of [-1,1])part(p,'lounge-seat',f.x+s*offset,y+.48,f.z+back,.86,.54,.80,'#947965','fabric');
   part(p,'reception-counter',f.x,y+.58,f.z+depth*.42,width*.40,1.04,.38,'#826b54','wood');
  }else if(commercial){
   for(const s of [-1,1])part(p,'display-shelf',f.x+s*offset,y+1.02,f.z+back,.75,1.85,.34,'#9eaaab','metal');
   part(p,'service-counter',f.x,y+.57,f.z+depth*.42,width*.37,.98,.38,'#887f6d','stone');
  }else{
   for(const s of [-1,1])part(p,'waiting-seat',f.x+s*offset,y+.47,f.z+back,.85,.45,.74,'#8c806f','wood');
   part(p,'directory-plinth',f.x,y+1.17,f.z+depth*.43,.58,1.92,.23,'#88999b','metal');
  }
  part(p,'ceiling-light-cove',f.x,y+3.04,f.z+depth*.08,width*.42,.065,depth*.16,'#e9d9b8','light_emissive');
  stats.zonedLobbies++;
 }
 stats.geometryAdded=w.boxes.length-initial.boxes;
 if(w.solids.length!==initial.solids||w.entrancePortals.length!==initial.portals||w.roads461.length!==initial.roads)throw Error('Stage12 gameplay mutation');
 w.city20Stage12Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage12Finish(w){const r=prior(w);if(!disabled())enhance(w);return r;};
H.city20Stage12={enhance,disabled};
})(Heatline);
