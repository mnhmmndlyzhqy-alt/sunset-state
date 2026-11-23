'use strict';const {H,g}=require('./stage05_bootstrap.cjs');const ids=[1,24,35,50,62,67,78];let passed=0,failed=[];
for(let id of ids){const p=g.world.entrancePortals[id],plan=g.world.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ),scene=g.sceneForFloor(plan,0),v=scene.stage15Interactions.find(q=>q.kind==='bench');
 if(!v){failed.push([id,'no bench']);continue;}
 const src=scene.solids;let spot=null;
 for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){let x=v.x+dx*(v.hw+.68),z=v.z+dz*(v.hd+.68);
  if(x<scene.bounds.xmin+.39||x>scene.bounds.xmax-.39||z<scene.bounds.zmin+.39||z>scene.bounds.zmax-.39)continue;
  if(src.every(s=>H.stage15Interior.nearestSurface(x,z,s)>.4)){let ed=Math.hypot(x-scene.entrance.x,z-scene.entrance.z),ld=Math.hypot(x-scene.lift.x,z-scene.lift.z); console.log('candidate',id,dx,dz,'entr',ed.toFixed(2),'lift',ld.toFixed(2)); if(ed>2.5&&ld>2.7){spot={x,z};break;}}}
 if(!spot){failed.push([id,'no free spot']);continue;}
 g.indoor={plan,scene,floor:0,portalId:id,doorStates:new Map(),liftRide:null,stairTrip:null};g.avatar=H.createWalker(spot.x,spot.z,0,1);
 g.footHealth=65;g.showInfo=(msg)=>{g.stage15TestInfo=msg};g.updateHUD=()=>{};g.is=()=>false;
 const prevHealth=g.footHealth;g.stage15TestInfo=null;
 try{g.interactInside();}catch(e){failed.push([id,String(e)]);continue;}
 const result={id,info:g.stage15TestInfo,heal:g.footHealth-prevHealth};
 if((result.info||'').includes('נחת ליד')&&result.heal===4){passed++;console.log('PASS',JSON.stringify(result));}
 else failed.push(result);
}
console.log('Stage15 E integration:',passed+'/'+ids.length,'failed',JSON.stringify(failed));if(failed.length)process.exitCode=1;
