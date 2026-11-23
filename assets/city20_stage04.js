/* SUNSET STATE / CITY20 04 — continuous road engineering.
 * Maintains the selected reference's 52 road routes, junction coordinates,
 * model assets and vehicle systems. Smooths road *elevation* BEFORE both
 * road meshes and the physics/bridge lookup index are built.
 * A/B diagnostic: ?city20roadsOff=1 (no changes in normal gameplay UI).
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
if(typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
  new URLSearchParams(location.search).has('city20roadsOff'))
  globalThis.__SUNSET_CITY20_DISABLE_STAGE04=true;
const enabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE04!==true;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const oldReconcile=H.reconcileRoadProfiles477;
if(typeof oldReconcile!=='function'||!H.coast461||typeof H.addRibbon444!=='function')
 throw Error('CITY20 stage04 needs the existing stage477 engineering/renderer');
function evaluate(s){
 let maxGrade=0,maxJerk=0,sumJerk=0,nJerk=0;
 let last=null;
 for(let i=1;i<s.length;i++){
   const a=s[i-1],b=s[i],len=Math.hypot(b.x-a.x,b.z-a.z);
   if(len<.03){last=null;continue;}
   const slope=(b.y-a.y)/len;
   maxGrade=Math.max(maxGrade,Math.abs(slope));
   if(last!==null){const delta=Math.abs(slope-last);maxJerk=Math.max(maxJerk,delta);sumJerk+=delta;nJerk++;}
   last=slope;
 }
 return {maxGrade,maxJerk,meanJerk:nJerk?sumJerk/nJerk:0};
}
// Shape-preserving low pass with a strict envelope: sharp crests blend into a
// longer transition without sinking a bridge below its existing deck clearance.
function softenProfile(road){
 const s=road.samples,n=s.length;
 if(n<5)return {changed:0,rolledBack:false,before:evaluate(s),after:evaluate(s),maxChange:0};
 const original=s.map(p=>p.y),before=evaluate(s);
 for(let round=0;round<7;round++){
  const next=s.map(p=>p.y);
  for(let i=1;i<n-1;i++){
   const p=s[i];
   if(p.junction)continue; // exact authored junction elevation remains locked
   const a=s[i-1],b=s[i+1];
   const d0=Math.hypot(p.x-a.x,p.z-a.z),d1=Math.hypot(b.x-p.x,b.z-p.z);
   if(d0<.2||d1<.2)continue;
   // Weighted by segment length, preventing aggressive reshaping on short segments.
   const prediction=(a.y*d1+b.y*d0)/(d0+d1);
   const rough=prediction-p.y;
   if(Math.abs(rough)<.003)continue;
   let desired=p.y+rough*.31;
   const minRoad=p.g+.074;
   const lower=Math.max(minRoad,original[i]-(p.water?.032:.26));
   const upper=original[i]+.70;
   next[i]=clamp(desired,lower,upper);
  }
  for(let i=1;i<n-1;i++)if(!s[i].junction)s[i].y=next[i];
 }
 // Project the smoothed road profile onto the engineering constraints.
 // Fixed junctions retain their ORIGINAL elevations; every other point is
 // bounded by terrain clearance and a conservative per-sample envelope.
 // Because the original 9%-limited profile is feasible, the bounded
 // projection must converge without raising an entire bridge accidentally.
 const lo=original.map((y,i)=>s[i].junction?y:Math.max(s[i].g+.074,y-(s[i].water?.032:.26)));
 const hi=original.map((y,i)=>s[i].junction?y:y+.70);
 for(let pass=0;pass<80;pass++){
   let error=0;
   for(const reverse of [false,true])for(let step=1;step<n;step++){
     const i=reverse?n-step:step,prev=i-1,a=s[prev],b=s[i];
     const d=Math.hypot(b.x-a.x,b.z-a.z);if(d<.03)continue;
     const limit=.089999*d,delta=b.y-a.y,over=Math.abs(delta)-limit;
     if(over<=.0000001)continue;
     error=Math.max(error,over);
     const sign=Math.sign(delta),aFlex=hi[prev]-lo[prev]>.0000001,bFlex=hi[i]-lo[i]>.0000001;
     if(aFlex&&bFlex){
       a.y=clamp(a.y+sign*over*.5,lo[prev],hi[prev]);
       b.y=clamp(b.y-sign*over*.5,lo[i],hi[i]);
     }else if(aFlex){a.y=clamp(a.y+sign*over,lo[prev],hi[prev]);}
     else if(bFlex){b.y=clamp(b.y-sign*over,lo[i],hi[i]);}
   }
   if(error<.000001)break;
 }
 const after=evaluate(s),tooHigh=s.some((p,i)=>p.y>original[i]+.85);
 const shiftedJunction=s.some((p,i)=>p.junction&&Math.abs(p.y-original[i])>1e-8);
 if(after.maxGrade>.090001||tooHigh||shiftedJunction){
   s.forEach((p,i)=>{p.y=original[i];p.above=p.y-p.g;});
   return {changed:0,rolledBack:true,before,after:before,maxChange:0};
 }
 let changed=0,maxChange=0;
 for(let i=0;i<n;i++){
   const p=s[i],delta=p.y-original[i];
   if(Math.abs(delta)>.006)changed++;
   maxChange=Math.max(maxChange,Math.abs(delta));
   p.above=p.y-p.g;
 }
 return {changed,rolledBack:false,before,after,maxChange};
}
H.city20Stage04Stats=null;
H.reconcileRoadProfiles477=function city20RoadReconciliation(roads){
 const result=oldReconcile(roads);
 if(!enabled())return result;
 const stats={stage:4,roads:roads.length,modifiedRoutes:0,modifiedSamples:0,
     revertedRoads:[],maxHeightAdjustmentMeters:0,previousMaximumGrade:0,newMaximumGrade:0,
     previousMaximumGradeChange:0,newMaximumGradeChange:0,
     originalMeanGradeChange:0,currentMeanGradeChange:0,numberOfProfiles:0};
 for(const road of roads){
   const d=softenProfile(road);
   stats.previousMaximumGrade=Math.max(stats.previousMaximumGrade,d.before.maxGrade);
   stats.newMaximumGrade=Math.max(stats.newMaximumGrade,d.after.maxGrade);
   stats.previousMaximumGradeChange=Math.max(stats.previousMaximumGradeChange,d.before.maxJerk);
   stats.newMaximumGradeChange=Math.max(stats.newMaximumGradeChange,d.after.maxJerk);
   stats.originalMeanGradeChange+=d.before.meanJerk;
   stats.currentMeanGradeChange+=d.after.meanJerk;
   stats.numberOfProfiles++;
   stats.modifiedSamples+=d.changed;
   if(d.changed)stats.modifiedRoutes++;
   if(d.rolledBack)stats.revertedRoads.push(road.id);
   stats.maxHeightAdjustmentMeters=Math.max(stats.maxHeightAdjustmentMeters,d.maxChange);
 }
 stats.originalMeanGradeChange/=stats.numberOfProfiles||1;
 stats.currentMeanGradeChange/=stats.numberOfProfiles||1;
 H.city20Stage04Stats=stats;
 return result;
};
// Reuse the EXISTING ribbon strips; widening the underlayer changes no draw
// calls and supplies a real-sized curb shoulder rather than a narrow ledge.
H.city20Stage04ShoulderMargin=(road,run)=>enabled()?
  (road.width>=13?1.45:road.width>=9?1.15:.98):.56;
// A bridge parapet is a retained 5-face swept concrete wall, not scattered
// cube posts. It is raised and widened in place (same source vertex count).
H.city20Stage04BridgeCrest=(road,p)=>enabled()?(p.above>1.15?1.10:.85):.79;
H.city20Stage04ParapetWidth=()=>enabled()?.32:.23;
H.city20Stage04DeckJoints=(world,road,run)=>{
 if(!enabled()||run.length<14)return;
 const half=road.width*.5-.38;
 for(let i=9;i<run.length-2;i+=14){
  const a=run[i],b=run[i+1];
  if(a.above<1.6||b.above<1.6||!Number.isFinite(a.y+b.y))continue;
  const len=Math.hypot(b.x-a.x,b.z-a.z);
  if(len<.2||len>9)continue;
  // Two narrow expansion-joint faces sit flush on the bridge asphalt.
  const t=.15/len,make=(p,part)=>[
   [p.x+p.nx*(-half),p.y+.024,p.z+p.nz*(-half)],
   [p.x+p.nx*half,p.y+.024,p.z+p.nz*half]];
  const first=make(a),next={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,
        y:a.y+(b.y-a.y)*t,nx:a.nx+(b.nx-a.nx)*t,nz:a.nz+(b.nz-a.nz)*t};
  H.addRibbon444(world,[first,make(next)],{color:'#485051',material:'rubber',layer:4,visibility:540,thickness:.028});
  world.city20Stage04DeckJoints=(world.city20Stage04DeckJoints||0)+1;
 }
};
H.city20Stage04Finish=world=>{
 if(!enabled())return;
 world.city20Stage04Stats={...H.city20Stage04Stats,additionalDeckJoints:world.city20Stage04DeckJoints||0,
     sameRoadCount:world.roads461.length,newTrafficRoutes:0,newCollisionSolids:0};
};
// Keep continuity metadata for vehicles crossing the same raised roadway;
// preserve the original guard-rail collision and damage physics.
const oldGuard=H.guardBridgeRails477;
H.guardBridgeRails477=function city20RailGuard(car,oldX,oldZ){
 if(enabled()&&car?.route477?.road?.id)
   car.roadProfile477=car.route477.road.id;
 return oldGuard(car,oldX,oldZ);
};
const oldFinish=H.finishReferenceBuildings469;
if(typeof oldFinish!=='function')throw Error('CITY20 stage04: missing original building finalizer');
H.finishReferenceBuildings469=function city20Stage04Finalize(world){
 const result=oldFinish(world);H.city20Stage04Finish(world);return result;
};
H.city20Stage04Enabled=enabled;
})(Heatline);
