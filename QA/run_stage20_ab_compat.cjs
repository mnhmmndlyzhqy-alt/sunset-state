'use strict';
/* Stage20 disabled A/B test: real World & Recovery05 navigator, mock GPU only. */
const fs=require('fs'),{H,ctx,g}=require('./stage05_bootstrap.cjs');
let checks=0;const failures=[];const check=(label,yes)=>{checks++;if(!yes){failures.push(label);console.error('FAIL',label);}};
const stats=H.stage20Pedestrian.stats;
check('Stage20 module present',stats.installed===true);
check('Stage20 opt-out respected',H.stage20Pedestrian.disabled()===true);
check('Original game routes remain 52',g.world.roads461.length===52);
check('Original active entrances remain 214',g.world.entrancePortals.filter(x=>x.interiorReady).length===214);
check('Original store count remains 59',g.world.retailShops.length===59);
check('World geometry matches Stage19',g.world.boxes.length===194555&&g.world.solids.length===3230);
check('Stage16 glass preserved',g.world.glassPanels.length===988);
const o={x:19.3,z:-35,hw:.85,hd:1.2},world={nearby(){return [o];}};
const w=H.createWalker(19.3,-44,Math.PI,3);
Object.assign(w,{y:H.walkerGround473(w),navAxis:'z',navRoad:19.3,navDir:1,navNode:0,navSide:1,navState:'sidewalk',navTargetX:19.3,navTargetZ:-19.3});
let minDistance=999,maxOffset=0;
for(let i=0;i<520;i++){
 H.walkPedestrianRoute(w,{world,simDt:.05,cars:[],trams:[],others:[]});
 minDistance=Math.min(minDistance,Math.abs(w.z+19.3));maxOffset=Math.max(maxOffset,Math.abs(w.x-19.3));
}
check('Old route never adds Stage20 dogleg',stats.detourPlans===0);
check('Old route has no Stage20 safety query overhead',stats.nearbyQueries===0);
check('Original blocked-route behavior reproduced',minDistance>13.5&&maxOffset<.01);
check('Recovery05 still executes actual navigation',H.cityLifeRecovery5.stats.routeCalls>=520);
check('Opt-out still never teleports walkers',Number.isFinite(w.x+w.z+w.yaw));
const report={stage:20,mode:'disabled A/B on complete Stage19 world; no GPU',checks,passed:checks-failures.length,failures,baseline:{minDistance,maxOffset},stats};
fs.writeFileSync('QA/STAGE20_AB_COMPAT.json',JSON.stringify(report,null,2)+'\n');
console.log('STAGE20 AB',report.passed+'/'+checks,JSON.stringify(report.baseline));if(failures.length)process.exitCode=1;
