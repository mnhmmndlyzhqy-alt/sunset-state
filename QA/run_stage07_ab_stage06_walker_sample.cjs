'use strict';
const fs=require('fs'),path=require('path'),{H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,fail=[],cases=[];
for(const p of w.entrancePortals.filter(p=>p.stage06Oriented).filter((p,i)=>i%9===0)){
  const n=H.stage06Orientation.dir(p),yaw=Math.atan2(n.x,n.z),outwardYaw=Math.atan2(-n.x,-n.z);
  const pos=(d)=>({x:p.x+n.x*d,z:p.z+n.z*d});
  const q=pos(2.8),av=H.createWalker(q.x,q.z,yaw,1);av.y=H.outdoorHeight(q.x,q.z);
  let outSteps=0,outDistance=2.8,escaped=false,err=null;
  try{
   for(let i=0;i<155;i++){
    H.stepWalker(av,{forward:1,strafe:0,run:false,viewYaw:yaw,speedFactor:.66,outdoors:true,roadWorld:w,allowWater:true},H.drivingSolids443(w,av),.02,[]);
    outSteps++;
    outDistance=(av.x-p.x)*n.x+(av.z-p.z)*n.z;
    if(outDistance<-2.7){escaped=true;break;}
   }
  }catch(e){err=String(e)}
  const plan=w.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);
  const scene=g.sceneForFloor(plan,0),v=pos(-4.55),ind=H.createWalker(v.x,v.z,outwardYaw,1);ind.y=H.cityTerrain42(p.buildingX,p.buildingZ);
  let inDist=4.55,returned=false;
  try{
   for(let i=0;i<155;i++){
    H.stepWalker(ind,{forward:1,strafe:0,run:false,viewYaw:outwardYaw,speedFactor:.66},scene.solids,.02,[]);
    inDist=-((ind.x-p.x)*n.x+(ind.z-p.z)*n.z);
    if(inDist<1.0){returned=true;break;}
   }
  }catch(e){err=String(e)}
  const caseResult={id:p.id,face:p.facing,kind:p.stage05City20?'new':'old',outdoorCrossed:escaped,indoorCrossed:returned,
    outdoorFinalM:+outDistance.toFixed(3),indoorFinalM:+inDist.toFixed(3),autoDoorRecognized:H.stage06Orientation.entryThreshold(av,w.stage42Doors.find(d=>d.id===p.id)),error:err};
  cases.push(caseResult);if(!escaped||!returned||err)fail.push(caseResult);
}
const result={tested:cases.length,passed:cases.length-fail.length,failed:fail.length,examples:fail.slice(0,40),cases};
fs.writeFileSync(path.join(__dirname,'STAGE07_AB_STAGE06_WALKER_SAMPLE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tested:result.tested,passed:result.passed,failed:result.failed,examples:fail.slice(0,24)},null,2));
if(fail.length)process.exitCode=1;
