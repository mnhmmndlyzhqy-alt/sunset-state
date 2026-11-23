/* Interior recovery 2/7: audited accessible foyer routes and bounded interior detailing.
   Only interiorReady portals with a matching structural foyer; never unlocks doors.
   Reversible: ?interiorRecovery2Off=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Interior recovery requires existing CITY20 pipeline');
const disabled=()=>globalThis.__SUNSET_INTERIOR_RECOVERY2_OFF===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('interiorRecovery2Off'));
function enhance(w){
 if(w.interiorRecovery2Stats)return w.interiorRecovery2Stats;
 if(!Array.isArray(w.entrancePortals)||!Array.isArray(w.structuralPlans)||!Array.isArray(w.boxes))throw Error('Interior recovery missing structural data');
 const before={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,portals:w.entrancePortals.length};
 const stats={phase:2,ready:0,matched:0,unavailable:0,small:0,routeNodes:0,geometryAdded:0,collisionsAdded:0,unlockedDoors:0,gpuVerified:false};
 const plans=new Map(w.structuralPlans.filter(p=>p&&p.outerShell&&p.foyer).map(p=>[`${p.outerShell.x},${p.outerShell.z}`,p]));
 const routes=[];
 function add(portal,kind,x,y,z,dx,dy,dz,color,material){
  if(![x,y,z,dx,dy,dz].every(Number.isFinite)||Math.min(dx,dy,dz)<=0)throw Error('Invalid interior detail');
  const b=H.box(x,y,z,dx,dy,dz,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=135;b.lodMax=135;b.interiorRecovery2=true;b.interiorRecovery2Kind=kind;b.interiorRecovery2Portal=portal.id;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  if(p.interiorReady!==true){stats.unavailable++;continue;}stats.ready++;
  const plan=plans.get(`${p.buildingX},${p.buildingZ}`);if(!plan){stats.unavailable++;continue;}
  const f=plan.foyer;
  if(![f.x,f.z,f.w,f.d,p.x,p.z].every(Number.isFinite)||f.w<6||f.d<6){stats.small++;continue;}
  const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(f.x,f.z):0;if(!Number.isFinite(ground))continue;
  const width=Math.min(f.w,10),depth=Math.min(f.d,10);
  // A descriptive route inside an already usable foyer, not an invented gameplay doorway.
  const nodes=[{x:p.x,z:p.z,kind:'existing-entrance'}, {x:f.x,z:f.z-depth*.20,kind:'foyer-approach'}, {x:f.x,z:f.z+depth*.16,kind:'foyer-center'}];
  routes.push({portalId:p.id,buildingX:p.buildingX,buildingZ:p.buildingZ,nodes,walkableFromExistingPortal:true,additionalFloorsUnlocked:0});
  stats.routeNodes+=nodes.length;
  const sides=[-1,1];
  for(const side of sides){
   const x=f.x+side*(width*.44);
   add(p,'side-wall-baseboard',x,ground+.14,f.z,.08,.24,depth*.70,'#8f877c','wood');
   add(p,'side-wall-accent',x,ground+1.50,f.z+depth*.14,.06,1.25,depth*.20,'#a8b3b0','stone');
   add(p,'ceiling-light-diffuser',f.x+side*width*.25,ground+3.10,f.z-depth*.15,.72,.06,.56,'#f1dfb8','light_emissive');
  }
  // Keep a minimum 3m wide straight central passage entirely free of geometry.
  add(p,'entry-floor-guidance',f.x,ground+.025,f.z-depth*.18,.10,.035,depth*.34,'#c5bca6','stone');
  add(p,'rear-wall-directory',f.x,ground+1.65,f.z+depth*.45,Math.min(width*.34,2.1),1.10,.08,'#50666a','metal');
  stats.matched++;
 }
 stats.geometryAdded=w.boxes.length-before.boxes;
 if(w.solids.length!==before.solids||w.roads461.length!==before.roads||w.entrancePortals.length!==before.portals)throw Error('Interior recovery mutated traversal geometry');
 w.interiorRecovery2Routes=routes;w.interiorRecovery2Stats=stats;return stats;
}
H.finishReferenceBuildings469=function interiorRecovery2Finish(w){const result=prior(w);if(!disabled())enhance(w);return result;};
H.interiorRecovery2={enhance,disabled};
})(Heatline);
