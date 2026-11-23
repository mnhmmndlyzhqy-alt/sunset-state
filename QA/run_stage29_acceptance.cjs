'use strict';
/* True cumulative game/scene constructors with fake Renderer; NOT GPU testing. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {H,ctx,g}=require('./stage05_bootstrap.cjs');
const w=g.world,flags=()=>ctx.__SUNSET_STAGE29_INTERIORS_OFF;
const checks=[],failures=[],audit={};
const test=(label,ok,details)=>{checks.push({name:label,passed:!!ok});if(!ok)failures.push({name:label,details});};
const digest=(x)=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const project=(a)=>a.map(v=>[v.x,v.y,v.z,v.w,v.h,v.d,v.yaw,v.color,v.material,v.layer]);
const scene=(plan,floor)=>H.polishInterior461(H.refineInterior455(H.enhanceInterior450(H.makeInteriorScene(plan,floor),plan),plan),plan,floor);
const worldBaseline={boxes:w.boxes.length,roads:w.roads461.length,solids:w.solids.length,
 props:w.propSolids.length,shops:w.retailShops.length,portals:w.entrancePortals.length,
 ready:w.entrancePortals.filter(p=>p.interiorReady).length,glass:w.glassPanels.length};
test('Stage28 mapped and legacy world remains present',w.city20DistrictBuildings.length===130&&w.buildings.length===84);
test('Stage28 facades preserved in world',w.boxes.filter(b=>b.stage28Facade).length===1982);
test('Stage29 never adds world geometry',!w.boxes.some(b=>b.stage29IndoorPolish));
test('Stage29 installed over genuine Stage14+15 builders',H.stage29InteriorPolish.installed&&H.stage14Lighting&&H.stage15Interior);
const livePortals=new Set(w.entrancePortals.filter(p=>p.interiorReady).map(p=>p.buildingX+':'+p.buildingZ));
const plans=w.structuralPlans.filter(p=>p?.interiorReady&&p.outerShell&&p.floorCount>=1&&
 livePortals.has(p.outerShell.x+':'+p.outerShell.z));
const unique=new Map(plans.map(p=>[p.outerShell.x+':'+p.outerShell.z,p]));
const list=[...unique.values()],retail=w.retailShops;
audit.plans=list.length;audit.shops=retail.length;
const samples=[];for(const p of list){const kind=p.stage05Kind||p.materialFamily||'legacy';
 if(!samples.some(x=>x.kind===kind))samples.push({plan:p,kind});}
for(let i=0;i<Math.min(36,list.length);i++){const p=list[(i*31)%list.length];
 if(!samples.some(x=>x.plan===p))samples.push({plan:p,kind:p.stage05Kind||p.materialFamily});}
let abCases=0,activeInteriors=0,activeRetail=0,maxAdded=0,interiorLights=0,retailLights=0;
let anyProblems=[];let normalInteriorDigest=null;
function auditInterior(p,floor,doAb){
 let baseline=null;
 if(doAb){ctx.__SUNSET_STAGE29_INTERIORS_OFF=true;baseline=scene(p,floor);}
 ctx.__SUNSET_STAGE29_INTERIORS_OFF=false;
 const next=scene(p,floor),parts=next.boxes.filter(b=>b.stage29IndoorPolish);
 const meta=next.stage29InteriorPolish;
 if(!meta||meta.meshesAdded!==parts.length||meta.pointLightsAdded!==1||parts.length>12)
   anyProblems.push('Invalid interior metadata '+p.buildingId+':'+floor);
 if(next.solids.some(s=>!Number.isFinite(s.x)||!Number.isFinite(s.z)))anyProblems.push('Invalid solid');
 for(const m of parts){
   if(!Number.isFinite(m.visibilityCap)||m.visibilityCap>165||m.visibilityCap<15)anyProblems.push('Bad culling cap');
   if(m.stage29Kind!=='lift-threshold-guide' && m.y-m.h*.5<floor*p.floorHeight+2.70)
     anyProblems.push('Obstructive decoration '+p.buildingId+':'+m.stage29Kind);
   if(m.stage29Kind==='lift-threshold-guide' && m.y-m.h*.5<floor*p.floorHeight+.065)
     anyProblems.push('Elevator floor material clips into floor');
   if(m.x-m.w*.5<next.bounds.xmin-.001||m.x+m.w*.5>next.bounds.xmax+.001||
      m.z-m.d*.5<next.bounds.zmin-.001||m.z+m.d*.5>next.bounds.zmax+.001)
     anyProblems.push('Decoration outside actual shell');
 }
 if(doAb){
   abCases++;
   const baselineBoxes=digest(project(baseline.boxes)),oldInNew=digest(project(next.boxes.filter(b=>!b.stage29IndoorPolish)));
   if(baselineBoxes!==oldInNew||digest(baseline.solids)!==digest(next.solids)||
     digest(baseline.doors)!==digest(next.doors)||digest(baseline.rooms)!==digest(next.rooms)||
     baseline.lights.length+1!==next.lights.length)
      anyProblems.push('Interior A/B changed baseline '+p.buildingId+':'+floor);
   if(!normalInteriorDigest)normalInteriorDigest=baselineBoxes;
 }
 if(next.lights.some(l=>!Number.isFinite(l.x)||!Number.isFinite(l.y)||!Number.isFinite(l.z)))
   anyProblems.push('Invalid light xyz');
 const shader=H.stage14Lighting.resolve(g,next.lights);
 if(shader.length>12)anyProblems.push('Shader light budget overflow');
 interiorLights++;maxAdded=Math.max(maxAdded,parts.length);activeInteriors++;
}
for(const {plan:p} of samples){try{auditInterior(p,0,true);}catch(e){anyProblems.push('Interior '+p.buildingId+' '+e.stack);}}
for(const p of list){if(samples.some(x=>x.plan===p))continue;
 try{auditInterior(p,0,false);}catch(e){anyProblems.push('All sites '+p.buildingId+' '+e.stack);}}
for(const p of list.filter(p=>p.floorCount>=2).slice(0,10)){
 try{auditInterior(p,Math.min(1,p.floorCount-1),true);}catch(e){anyProblems.push('Upper floor '+p.buildingId+' '+e.stack);}}
for(const s of retail){try{
 ctx.__SUNSET_STAGE29_INTERIORS_OFF=true;const orig=H.makeRetailScene(s.retail);
 ctx.__SUNSET_STAGE29_INTERIORS_OFF=false;const next=H.makeRetailScene(s.retail);
 const parts=next.boxes.filter(b=>b.stage29IndoorPolish);
 const data=next.stage29RetailPolish;
 if(!data||data.meshesAdded!==parts.length||data.pointLightsAdded!==2)
   anyProblems.push('Retail metadata '+s.id);
 if(digest(project(orig.boxes))!==digest(project(next.boxes.filter(b=>!b.stage29IndoorPolish)))||
    digest(orig.solids)!==digest(next.solids)||
    orig.lights.length+2!==next.lights.length||
    digest(orig.entrance)!==digest(next.entrance)||digest(orig.counter)!==digest(next.counter))
   anyProblems.push('Retail A/B changed baseline '+s.id);
 for(const m of parts){
   if(m.y-m.h*.5<3.0||m.x-m.w*.5<next.bounds.xmin-.001||
      m.x+m.w*.5>next.bounds.xmax+.001||m.z-m.d*.5<next.bounds.zmin-.001||
      m.z+m.d*.5>next.bounds.zmax+.001||m.visibilityCap>165)
     anyProblems.push('Retail mesh in circulation space '+s.id+':'+m.stage29Kind);
 }
 if(H.stage14Lighting.resolve(g,next.lights).length>12)anyProblems.push('Retail GPU light budget overflow');
 activeRetail++;retailLights+=2;
 }catch(e){anyProblems.push('Retail '+s.id+' '+e.stack);}}
ctx.__SUNSET_STAGE29_INTERIORS_OFF=false;
let ui=false,uiHidden=false;
try{
 const p=samples[0].plan,sc=scene(p,0);
 g.indoor={portalId:1,plan:p,scene:sc,floor:0,liftRide:null,stairTrip:null};
 g.retailVisit=null;g.avatar.x=sc.lift.x;g.avatar.z=sc.lift.z;
 H.stage29InteriorPolish.updateHUD(g);
 const sign=ctx.document.getElementById('stage29-wayfinding');
 ui=sign.textContent.includes('L')&&!sign.classList.contains('hidden');
 ctx.__SUNSET_STAGE29_INTERIORS_OFF=true;H.stage29InteriorPolish.updateHUD(g);
 uiHidden=sign.classList.contains('hidden');
 g.indoor=null;ctx.__SUNSET_STAGE29_INTERIORS_OFF=false;
}catch(e){anyProblems.push('HUD '+e.stack)}
const worldAfter={boxes:w.boxes.length,roads:w.roads461.length,solids:w.solids.length,
 props:w.propSolids.length,shops:w.retailShops.length,portals:w.entrancePortals.length,
 ready:w.entrancePortals.filter(p=>p.interiorReady).length,glass:w.glassPanels.length};
test('All active interior plans visited',list.length===214&&activeInteriors===list.length+10);
test('All active retail interiors visited',retail.length>=59&&activeRetail===retail.length);
test('A/B comparison covers material types, compact rooms and upper floors',abCases>=24);
test('CPU scene and geometry safety audit clean',anyProblems.length===0,anyProblems.slice(0,35));
test('No original outdoor systems changed',digest(worldBaseline)===digest(worldAfter));
test('Shader light selection never over 12',H.stage29InteriorPolish.stats.shaderBudget===12);
test('No new interior colliders',H.stage29InteriorPolish.stats.collisionChanges===0);
test('Stage29 UI updates near elevator and hides in compatibility mode',ui&&uiHidden);
test('No false hardware/50FPS claim',H.stage29InteriorPolish.stats.hardwareGPUVerified===false&&H.stage29InteriorPolish.stats.fullHD50FPSVerified===false);
const report={stage:29,source:'Stage28 cumulative full archive, genuine Game CPU scene builders / fake GPU renderer',
 passed:checks.filter(x=>x.passed).length,total:checks.length,checks,failures,
 summary:{worldBaseline,interiorPlansAudited:list.length,retailScenesAudited:activeRetail,
 generatedFloors:activeInteriors,ABInteriors:abCases,maxNewMeshesPerInterior:maxAdded,
 newRealInteriorLights:interiorLights,newRealRetailLights:retailLights,
 cpuIssues:anyProblems.slice(0,60),realGPUVerified:false,fullHD50FPSVerified:false}};
fs.writeFileSync(path.join(__dirname,'STAGE29_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE29 QA',report.passed+'/'+report.total,JSON.stringify(report.summary));
for(const f of failures)console.error('FAIL',f.name,JSON.stringify(f.details||{}).slice(0,500));
if(failures.length)process.exitCode=1;
