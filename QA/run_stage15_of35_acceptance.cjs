'use strict';
/* Real game source with fake renderer: 214 active interiors, collisions, interaction
 * and preservation. NOT a browser visual, native WebGL or FPS benchmark. */
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const checks=[],report={stage:15,issue:'S01-IN-03',testType:'real game JavaScript and walker physics with mock renderer',
 gpuVisualVerified:false,native1080p50FpsVerified:false,sample:[],errors:[],checks:0,passed:0};
function check(id,yes,context){report.checks++;if(yes)report.passed++;else{const v={id,context};report.errors.push(v);console.error('FAIL',id,JSON.stringify(context||{}).slice(0,180));}}
const portals=w.entrancePortals.filter(p=>p.interiorReady),plans=new Map(w.structuralPlans.filter(p=>p?.outerShell)
 .map(p=>[p.outerShell.x+','+p.outerShell.z,p]));
const scenes=[],hiddenMeshes=0,physicsTests=[];
const countBefore={worldMeshes:w.boxes.length,worldSolids:w.solids.length,worldProps:w.propSolids.length,roads:w.roads461.length,entrances:portals.length};
check('html_loads_stage15',fs.readFileSync('START_GAME.html','utf8').includes('<script src="assets/stage15_interior_physics.js"></script>'));
check('installed',!!H.stage15Interior?.installed&&!H.stage15Interior.off());
check('stage14_installed',!!H.stage14Lighting?.installed);
check('active_entrances_214',portals.length===214);
check('roads_52',w.roads461.length===52);
check('world_preserved_stage13_14',w.boxes.length===194555&&w.solids.length===3230&&w.propSolids.length===796);
check('stage13_seven',w.stage13NarrowLobbyStats?.repairedFoyers===7);
check('stage12_street_collision_360',w.stage12PropAudit?.collisionCount===360);
const startingAt=+process.env.STAGE15_OFFSET||0,limit=+process.env.STAGE15_LIMIT||214;
let added=0,interactive=0,interiors=0,rotated=0,compacts=0,benches=0,mins=Infinity,maxs=0;
for(let index=startingAt;index<Math.min(portals.length,startingAt+limit);index++){
 const p=portals[index],plan=plans.get(p.buildingX+','+p.buildingZ);
 check('plan_'+p.id,!!plan);if(!plan)continue;
 const scene=g.sceneForFloor(plan,0),meta=scene.stage15Interior;
 check('runtime_'+p.id,!!meta&&meta.buildingId===plan.buildingId);
 if(!meta)continue;
 const newBodies=scene.solids.filter(s=>s.stage15Furniture);
 check('solid_count_'+p.id,scene.solids.length===meta.existingColliders+meta.collidersAdded&&newBodies.length===meta.collidersAdded);
 check('collider_budget_'+p.id,meta.collidersAdded<=12);
 check('interfaces_'+p.id,Array.isArray(scene.stage15Interactions)&&scene.stage15Interactions.length===meta.interactionPoints&&meta.interactionPoints<=18);
 check('furniture_interactable_'+p.id,meta.interactionPoints>=1);
 check('last_stage_lights_'+p.id,!!scene.stage14Lighting&&scene.lights.some(l=>l.stage14Real));
 check('stage14_meshes_'+p.id,scene.boxes.filter(b=>b.stage14Fixture).length===2*scene.stage14Lighting.physicalLightSources);
 check('no_stage15_fake_mesh_'+p.id,!scene.boxes.some(b=>b.stage15Furniture));
 check('door_and_lift_retained_'+p.id,scene.doors.length===meta.originalDoorCount&&scene.lift&&scene.entrance);
 check('new_collision_safe_'+p.id,newBodies.every(c=>[c.x,c.z,c.hw,c.hd].every(Number.isFinite)&&c.hw>.04&&c.hd>.04&&!H.stage15Interior.guarded(scene,c)));
 check('unique_solid_refs_'+p.id,new Set(scene.solids).size===scene.solids.length);
 check('collider_interaction_links_'+p.id,scene.stage15Interactions.every(v=>v.source==='wall-art'?v.collider===null:scene.solids.includes(v.collider)));
 if(scene.stage13NarrowFurnished){const hasSeat=scene.stage15Interactions.some(v=>v.kind==='bench'&&v.source==='new');
  check('all_7_stage13_benches_physical_'+p.id,hasSeat);if(hasSeat)benches++;}
 if(scene.stage07Aligned){rotated++;check('rotated_footprint_preserved_'+p.id,scene.stage15Interactions.every(v=>[v.x,v.z].every(Number.isFinite)));}
 if(scene.stage05Compact)compacts++;
 let goodSpot=null,choice=null;
 const hasRoom=(x,z)=>x>scene.bounds.xmin+.38&&x<scene.bounds.xmax-.38&&z>scene.bounds.zmin+.38&&z<scene.bounds.zmax-.38;
 function passable(x,z){return hasRoom(x,z)&&scene.solids.every(s=>H.stage15Interior.nearestSurface(x,z,s)>=.39);}
 // Search actual playable foot capsule positions near each interactable collider.
 for(const v of scene.stage15Interactions){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dz]of dirs){const x=v.x+dx*(v.hw+.72),z=v.z+dz*(v.hd+.72);
   if(passable(x,z)&&Math.hypot(x-scene.entrance.x,z-scene.entrance.z)>2.5&&
      Math.hypot(x-scene.lift.x,z-scene.lift.z)>2.7){choice=v;goodSpot={x,z};break;}}
  if(goodSpot)break;
 }
 check('at_least_one_physically_reachable_interaction_'+p.id,!!goodSpot,{id:p.id,objects:scene.stage15Interactions.length});
 if(goodSpot){
  const save={indoor:g.indoor,avatar:g.avatar,footHealth:g.footHealth,showInfo:g.showInfo,updateHUD:g.updateHUD};
  g.indoor={scene,plan,floor:0,portalId:p.id,liftRide:null,stairTrip:null};
  g.avatar=H.createWalker(goodSpot.x,goodSpot.z,0,1);g.footHealth=65;g.showInfo=()=>{};g.updateHUD=()=>{};
  const result=H.stage15Interior.tryInteract(g);check('E_reachable_'+p.id,result);
  if(choice.kind==='seat'||choice.kind==='bench')check('rest_heals_once_'+p.id,g.footHealth===69);
  const snap=g.footHealth;H.stage15Interior.tryInteract(g);
  check('no_repeat_health_farming_'+p.id,g.footHealth===snap);
  Object.assign(g,save);
  // Independently test actual movement against new geometry, for several floors.
  if(choice.source==='new'&&physicsTests.length<18){
   const start=goodSpot,target={x:choice.x,z:choice.z},yaw=Math.atan2(start.x-target.x,start.z-target.z),walker=H.createWalker(start.x,start.z,0,1);
   for(let k=0;k<48;k++)H.stepWalker(walker,{forward:1,strafe:0,run:false,viewYaw:yaw,speedFactor:.78},scene.solids,.016,[]);
   const d=H.stage15Interior.nearestSurface(walker.x,walker.z,choice);
   check('walker_stopped_by_furniture_'+p.id,d>=.33,{distance:d,choice:choice.kind});
   physicsTests.push({portal:p.id,kind:choice.kind,clearance:+d.toFixed(3)});
  }
 }
 added+=meta.collidersAdded;interactive+=meta.interactionPoints;interiors++;
 mins=Math.min(mins,meta.collidersAdded);maxs=Math.max(maxs,meta.collidersAdded);
 if([1,24,35,50,62,67,78,298,320,350,425].includes(p.id))report.sample.push({id:p.id,compact:!!scene.stage05Compact,rotated:!!scene.stage07Aligned,added:meta.collidersAdded,interactions:meta.interactionPoints});
 if((index+1)%30===0)console.error('stage15 processed '+(index+1)+'/'+portals.length);
}
report.processed=interiors;report.collidersAddedInIndependentGroundFloorScenes=added;
report.interactionPointsAcrossGroundFloorScenes=interactive;report.rotatedScenesCovered=rotated;
report.compactScenesCovered=compacts;report.sevenStage13BenchesPhysical=benches;
report.perSceneAddedColliderRange=[mins===Infinity?0:mins,maxs];report.movementProbes=physicsTests;
check('world_geometry_unchanged',w.boxes.length===countBefore.worldMeshes&&w.solids.length===countBefore.worldSolids&&w.propSolids.length===countBefore.worldProps);
check('original_city_map_kept',w.roads461.length===countBefore.roads&&w.entrancePortals.filter(p=>p.interiorReady).length===countBefore.entrances);
if(startingAt===0&&limit>=214){check('full_214_scenes_checked',interiors===214);check('seven_furnished_benches',benches===7);}
const suffix=process.env.STAGE15_OFFSET?'_'+process.env.STAGE15_OFFSET:'';
const path='QA/STAGE15_OF35_ACCEPTANCE'+suffix+'.json';fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log('Stage15 '+report.passed+'/'+report.checks+' checked, failures '+report.errors.length+'; portals '+interiors+' new solids '+added+' interactive '+interactive+' benches '+benches);
if(report.errors.length)process.exitCode=1;
