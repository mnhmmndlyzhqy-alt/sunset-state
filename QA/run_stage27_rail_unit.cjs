'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const code=fs.readFileSync(path.join(__dirname,'../assets/stage27_route_coast_polish.js'),'utf8');
const checks=[];let nativeCalls=0;
const H={coast461:{roadAt:()=>null},
 reconcileRoadProfiles477:()=>true,registerRoadProfiles477:()=>true,
 closestBridge477:(x,z)=>({road:{id:x<5?'old':'new'}}),
 guardBridgeRails477:()=>{nativeCalls++;return true;},
 city20Stage04BridgeCrest:()=>1.1};
const context={Heatline:H,location:{search:''},URLSearchParams,console};context.globalThis=context;
vm.createContext(context);new vm.Script(code).runInContext(context);
function check(name,b){checks.push({name,passed:!!b});if(!b)console.error('FAIL',name);}
const car={x:7,z:0,route477:null,vx:3,vz:0,speed:3};
check('cross-road rail guards do not teleport a car',H.guardBridgeRails477(car,0,0)===false&&nativeCalls===0);
check('legitimate same-road contact continues original rail physics',H.guardBridgeRails477(car,6,0)===true&&nativeCalls===1);
check('route mismatch guard excludes unrelated bridge',H.guardBridgeRails477({...car,route477:{road:{id:'third'}}},6,0)===false&&nativeCalls===1);
check('normal bridge parapet full-height',H.city20Stage04BridgeCrest({}, {above:1.7})===1.1);
check('approach parapet tapers below full height',H.city20Stage04BridgeCrest({}, {above:.5})<.25);
context.location.search='?stage27RoadsOff=1';
check('AB switch retains stage26 bridge guard',H.guardBridgeRails477(car,0,0)===true&&nativeCalls===2);
check('AB switch retains old parapet size',H.city20Stage04BridgeCrest({}, {above:.5})===1.1);
check('AB switch leaves road reconciliation disabled',H.reconcileRoadProfiles477([])===true&&H.stage27RoadPolish.stats().enabled===false);
const fail=checks.filter(c=>!c.passed),result={stage:27,passed:checks.length-fail.length,total:checks.length,checks,fail};
fs.writeFileSync(path.join(__dirname,'STAGE27_RAIL_UNIT_RESULT.json'),JSON.stringify(result,null,2)+'\n');
console.log('STAGE27 RAIL/AB UNIT',result.passed+'/'+result.total);if(fail.length)process.exitCode=1;
