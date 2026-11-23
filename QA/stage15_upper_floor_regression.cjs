'use strict';const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const portals=w.entrancePortals.filter(p=>p.interiorReady),plans=new Map(w.structuralPlans.filter(p=>p?.outerShell).map(p=>[p.outerShell.x+','+p.outerShell.z,p]));
const choices=[];for(const p of portals){const plan=plans.get(p.buildingX+','+p.buildingZ);if(plan?.floorCount>1){
 if(choices.filter(q=>!q.plan.stage05Compact).length>=10&&!plan.stage05Compact)continue;
 if(choices.filter(q=>q.plan.stage05Compact).length>=10&&plan.stage05Compact)continue;
 choices.push({p,plan});}if(choices.length===20)break;}
let pass=0,fail=[],details=[];function check(name,condition,context){if(condition)pass++;else fail.push({name,context});}
for(const {p,plan}of choices){let scene=g.sceneForFloor(plan,1),s=scene.stage15Interior,door=scene.doors.length,coll=scene.solids.length,boxes=scene.boxes.length;
 check('upper_runtime_'+p.id,!!s&&s.floor===1);check('upper_lighting_'+p.id,!!scene.stage14Lighting&&scene.lights.filter(l=>l.stage14Real).length>=2);
 check('upper_bounds_'+p.id,scene.solids.filter(v=>v.stage15Furniture).every(v=>!H.stage15Interior.guarded(scene,v)));
 check('all_lifts_kept_'+p.id,!!scene.lift&&!!scene.entrance);
 check('upper_no_repeat_'+p.id,g.sceneForFloor(plan,1)===scene&&scene.solids.length===coll&&scene.boxes.length===boxes&&scene.doors.length===door);
 details.push({portal:p.id,city20:!!plan.stage05Compact,added:s?.collidersAdded,interaction:s?.interactionPoints,doors:door});}
const result={stage:15,upperFloorScenarios:choices.length,pass,failed:fail,details};fs.writeFileSync('QA/STAGE15_UPPER_FLOOR_REGRESSION.json',JSON.stringify(result,null,2)+'\n');
console.log('Stage15 upper-floor regression',pass+'/'+(pass+fail.length),'floors',choices.length);if(fail.length)process.exitCode=1;
