'use strict';const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),ids=[305,307,346,360,374,404,410,417];let result={checked:0,passed:0,failures:[],details:[]};
for(const id of ids){let p=g.world.entrancePortals[id],plan=g.world.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ),s=g.sceneForFloor(plan,0),v=s.stage15Interactions.find(a=>a.kind==='art');
 result.checked++;
 if(!v){result.failures.push({id,reason:'missing reachable wall art'});continue;}
 let spot=null;
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=v.x+dx*(v.hw+.72),z=v.z+dz*(v.hd+.72);
  if(x<s.bounds.xmin+.4||x>s.bounds.xmax-.4||z<s.bounds.zmin+.4||z>s.bounds.zmax-.4)continue;
  if(Math.hypot(x-s.entrance.x,z-s.entrance.z)<=2.5||Math.hypot(x-s.lift.x,z-s.lift.z)<=2.7)continue;
  if(s.solids.every(b=>H.stage15Interior.nearestSurface(x,z,b)>=.39)){spot={x,z};break;}}
 if(!spot){result.failures.push({id,reason:'no accessible vantage'});continue;}
 g.indoor={portalId:id,plan,floor:0,scene:s,liftRide:null,stairTrip:null,doorStates:new Map()};g.avatar=H.createWalker(spot.x,spot.z,0,1);
 g.showInfo=msg=>{g.stage15LastInfo=msg;};g.updateHUD=()=>{};
 g.stage15LastInfo=null;
 try{g.interactInside();}catch(e){result.failures.push({id,reason:String(e)});continue;}
 const ok=(g.stage15LastInfo||'').includes('התבוננת בתמונה');
 result.details.push({id,success:ok,message:g.stage15LastInfo});if(ok)result.passed++;else result.failures.push({id,reason:'E did not select wall art',message:g.stage15LastInfo});
}
fs.writeFileSync('QA/STAGE15_ART_E_INTEGRATION.json',JSON.stringify(result,null,2)+'\n');
console.log('Stage15 wall art E integration',result.passed+'/'+result.checked);if(result.failures.length){console.error(result.failures);process.exitCode=1;}
