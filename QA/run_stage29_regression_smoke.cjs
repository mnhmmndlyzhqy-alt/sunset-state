'use strict';
/* Focused 29/35 preservation smoke; not the long historical 600 s simulation. */
const fs=require('fs'),path=require('path');
const {H,g}=require('./stage05_bootstrap.cjs');
const c=[],f=[];
const test=(name,pass)=>{c.push({name,pass:!!pass});if(!pass)f.push(name)};
test('Stage20 pedestrian navigation installed',H.stage20Pedestrian?.stats?.installed===true);
test('NPC movement recovery retained',H.cityLifeRecovery5?.stats?.installed===true);
test('Stage21 swept vehicle CCD installed',H.stage21HighSpeedCCD?.stats?.installed===true);
test('World road and storefront contracts retained',g.world.roads461.length===52&&g.world.retailShops.length===59);
test('Original wall colliders retained',g.world.solids.length===3230&&g.world.propSolids.length===796);
test('Entrance and breakable glass preserved',g.world.entrancePortals.filter(p=>p.interiorReady).length===214&&g.world.glassPanels.length===988);
const A=H.stage20Pedestrian;
const wall={x:19.3,z:-35,hw:.85,hd:1.2};
const fixture={nearby(){return [wall]}};
const p=H.createWalker(19.3,-40,Math.PI,3);
Object.assign(p,{y:H.walkerGround473(p),navAxis:'z',navRoad:19.3,navDir:1,navNode:0,navSide:1,navState:'sidewalk',navTargetX:19.3,navTargetZ:-19.3});
const detour=A.detourPlan(p,fixture,[]);
test('Stage20 still plans finite two-point local detour',!!detour&&detour.waypoints.length===2&&detour.waypoints.every(w=>Number.isFinite(w.x+w.z)));
let moving=true;for(let i=0;i<15;i++){
 try{H.walkPedestrianRoute(p,{world:fixture,simDt:.05,cars:[],trams:[],others:[]});}
 catch(e){moving=false;break;}
 if(!Number.isFinite(p.x+p.z+p.y+p.yaw)){moving=false;break;}
}
test('Short live pedestrian updates finite and exception-free',moving);
const out={stage:29,kind:'short preservation smoke (not full Stage20 regression)',passed:c.length-f.length,total:c.length,checks:c,failures:f};
fs.writeFileSync(path.join(__dirname,'STAGE29_REGRESSION_SMOKE_RESULT.json'),JSON.stringify(out,null,2)+'\n');
console.log('STAGE29 REGRESSION SMOKE',out.passed+'/'+out.total);
if(f.length)process.exitCode=1;
