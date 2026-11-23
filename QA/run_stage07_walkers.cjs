'use strict';
/* Real collision and walker routines in CPU VM; no rendering. */
const fs=require('fs'),path=require('path'),{H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,results=[],errors=[];g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
for(const [i,s] of w.city20DistrictBuildings.filter(v=>v.streetAligned).entries()){
 if(i%4===0)console.error('STAGE07_WALKER_PROGRESS',i,s.id);
 const p=w.entrancePortals[s.city20Stage05PortalId],n=H.stage06Orientation.dir(p),
   yaw=Math.atan2(n.x,n.z),reverse=Math.atan2(-n.x,-n.z),
   pos=d=>({x:p.x+n.x*d,z:p.z+n.z*d});
 const start=pos(2.7),a=H.createWalker(start.x,start.z,yaw,1);a.y=H.outdoorHeight(a.x,a.z);
 let outer=2.7,passedOutside=false,passedInside=false,exception=null;
 try{
  for(let k=0;k<150;k++){
   H.stepWalker(a,{forward:1,strafe:0,run:false,viewYaw:yaw,speedFactor:.66,outdoors:true,roadWorld:w,allowWater:true},
    H.drivingSolids443(w,a),.02,[]);
   outer=(a.x-p.x)*n.x+(a.z-p.z)*n.z;
   if(outer<-2.50){passedOutside=true;break;}
  }
  const plan=w.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ),
        scene=g.sceneForFloor(plan,0),startInner=pos(-4.5),walker=H.createWalker(startInner.x,startInner.z,reverse,1);
  walker.y=H.cityTerrain42(p.buildingX,p.buildingZ);
  for(let k=0;k<160;k++){
   H.stepWalker(walker,{forward:1,strafe:0,run:false,viewYaw:reverse,speedFactor:.66},scene.solids,.02,[]);
   const remaining=-((walker.x-p.x)*n.x+(walker.z-p.z)*n.z);
   if(remaining<1.05){passedInside=true;break;}
  }
 }catch(e){exception=e.stack||String(e);}
 const r={id:p.id,angleDeg:+(s.stage07Yaw*180/Math.PI).toFixed(2),passedOutside,passedInside,exception,outerFinal:+outer.toFixed(3)};
 results.push(r);if(!passedOutside||!passedInside||exception)errors.push(r);
}
const report={stage:7,kind:'CPU real walker traversal, not GPU',tested:results.length,passed:results.length-errors.length,failed:errors.length,errors,results};
fs.writeFileSync(path.join(__dirname,'STAGE07_WALKER_TRAVERSAL.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({tested:report.tested,passed:report.passed,failed:report.failed,examples:errors.slice(0,10)},null,2));
if(errors.length)process.exitCode=1;
