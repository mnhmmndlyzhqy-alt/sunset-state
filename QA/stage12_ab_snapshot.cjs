'use strict';
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const enabled=!!w.stage12PropAudit,steps=[];
for(const kind of ['planter-base','safety-bollard','streetlamp-post']){
 const b=w.boxes.find(b=>b.city20Stage15Kind===kind),walker=H.createWalker(b.x-b.w*.5-.85,b.z,-Math.PI/2);
 const initialX=walker.x;
 for(let i=0;i<75;i++)H.stepWalker(walker,{forward:1,strafe:0,viewYaw:-Math.PI/2,speedFactor:.25,outdoors:false},w.nearby(walker.x,walker.z),1/30);
 const matching=(w.stage12StreetPropSolids||[]).find(s=>s.stage12Source===b),car=H.makeCar('civilian',b.x,b.z,0,0);
 steps.push({kind,fromX:+initialX.toFixed(3),finalX:+walker.x.toFixed(3),centerX:+b.x.toFixed(3),physicallyBlocked:walker.x<b.x-b.w*.5-.36,carContact:matching?!!H.carBuildingContact(car,matching):false});
}
const result={stage12Enabled:enabled,boxes:w.boxes.length,solids:w.solids.length,propSolids:w.propSolids.length, roads:w.roads461.length,activePortals:w.entrancePortals.filter(p=>p.interiorReady).length,stage10:w.stage10PlanterAudit?.unsafeSites,stage11:w.stage11LampAudit?.unsafeHorizontalSites,steps};
const filename=enabled?'QA/STAGE12_AB_ON.json':'QA/STAGE12_AB_OFF.json';
fs.writeFileSync(filename,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
