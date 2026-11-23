'use strict';
/* Stage 14 real game world/interior simulation, mock renderer only. Tests actual
 * scene creation and the frame-path light payload. Not GPU pixels or FPS. */
const fs=require('fs'), {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const html=fs.readFileSync('START_GAME.html','utf8');
const checks=[],report={stage:14,issue:'S01-IN-02',validatedWith:'real game JavaScript + CPU mock renderer',
  gpuVisualVerified:false,real1080p50FpsVerified:false,samples:[]};
function check(name,condition,info){const pass=!!condition;checks.push({name,pass});if(!pass)console.error('FAIL '+name,JSON.stringify(info??null).slice(0,250));}
const originalGame={cam:g.cam,indoor:g.indoor,retail:g.retailVisit,worldHour:g.worldHour};
check('script_loaded_in_actual_game',html.includes('<script src="assets/stage14_interior_lighting.js"></script>'));
check('stage14_installed',!!H.stage14Lighting?.installed);
check('stage14_enabled',!H.stage14Lighting.off());
check('shader_budget_12',H.stage14Lighting.MAX_SHADER_LIGHTS===12);
check('stage13_lobby_furniture_preserved',w.stage13NarrowLobbyStats?.repairedFoyers===7);
check('stage12_prop_collisions_preserved',w.stage12PropAudit?.collisionCount===360);
check('stage10_11_guards_present',!!w.stage10PlanterAudit && !!w.stage11LampAudit);
check('road_total_preserved',w.roads461.length===52);
check('active_portals_preserved',w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('city20_building_count',w.city20DistrictBuildings.length===130);
check('world_visual_objects_preserved',w.boxes.length===194555,{objects:w.boxes.length});
check('legacy_solids_preserved',w.solids.length===3230);
check('prop_solids_preserved',w.propSolids.length===796);
let count=0,totalAddedLights=0,totalAddedFixtures=0,sourceStats=[],buildingFailures=[];
const plans=new Map(w.structuralPlans.filter(p=>p?.outerShell).map(p=>[p.outerShell.x+','+p.outerShell.z,p]));
for(const portal of w.entrancePortals.filter(p=>p.interiorReady)){
  const plan=plans.get(portal.buildingX+','+portal.buildingZ);
  check('plan_for_'+portal.id,!!plan);
  if(!plan)continue;
  const scene=g.sceneForFloor(plan,0),m=scene.stage14Lighting;
  check('scene_lighting_'+portal.id,!!m && m.physicalLightSources>=2 && m.physicalLightSources<=3);
  check('matched_fixtures_'+portal.id,scene.boxes.filter(b=>b.stage14Fixture).length===m.physicalLightSources*2);
  check('authored_sources_'+portal.id,scene.lights.filter(l=>l.stage14Real).length===m.physicalLightSources);
  check('no_source_collision_'+portal.id,!scene.solids.some(s=>s.stage14Real||s.stage14Fixture));
  check('valid_new_light_positions_'+portal.id,scene.lights.filter(l=>l.stage14Real).every(l=>
      [l.x,l.y,l.z,l.radius,l.r,l.g,l.b].every(Number.isFinite)&&l.radius>0));
  const oldColor=scene.lights[0]?{r:scene.lights[0].r,g:scene.lights[0].g,b:scene.lights[0].b}:null;
  g.indoor={scene};g.retailVisit=null;
  g.cam={x:scene.entrance.x,y:(scene.stage42Base||0)+2,z:scene.entrance.z};
  g.worldHour=12;const noon=g.sceneLights();
  g.worldHour=2;const night=g.sceneLights();
  const power=arr=>arr.reduce((sum,l)=>sum+l.r+l.g+l.b,0);
  check('shader_budget_'+portal.id,noon.length>0&&noon.length<=12&&night.length<=12);
  check('day_night_changes_'+portal.id,power(night)>power(noon)*1.25,{noon:power(noon),night:power(night)});
  check('light_is_immutable_'+portal.id,!oldColor||JSON.stringify(oldColor)===JSON.stringify({r:scene.lights[0].r,g:scene.lights[0].g,b:scene.lights[0].b}));
  check('real_light_selected_'+portal.id,night.some(l=>l.stage14Real));
  if(scene.stage13NarrowFurnished)check('stage13_narrow_lobby_retained_'+portal.id,
    scene.boxes.filter(b=>b.stage13NarrowLobby).length===10);
  if(scene.stage07Aligned)check('stage07_rotation_retained_'+portal.id,Math.abs(scene.stage07Yaw)>0);
  totalAddedLights+=m.physicalLightSources;totalAddedFixtures+=m.fixtureMeshes;count++;
  if([1,24,35,50,62,67,78,298,320,425].includes(portal.id))report.samples.push({portal:portal.id,
    type:scene.stage05Compact?'compact':'legacy',rotated:!!scene.stage07Aligned,lightsBefore:m.baselineLights,
    lightsAdded:m.physicalLightSources,shaderLights:night.length,nightPower:+power(night).toFixed(3),
    dayPower:+power(noon).toFixed(3)});
  if(plan.floorCount>1){
    const upper=g.sceneForFloor(plan,1),v=upper.stage14Lighting;
    check('upper_floor_lights_'+portal.id,!!v&&v.physicalLightSources===2 && upper.lights.filter(l=>l.stage14Real).length===2);
    check('upper_floor_geometry_'+portal.id,upper.boxes.filter(b=>b.stage14Fixture).length===4);
  }
}
check('all_214_ground_floor_lighting',count===214,count);
check('no_cloned_global_building_meshes',w.boxes.every(b=>!b.stage14Fixture));
// Retail fixtures actually reach H.makeRetailScene, which Game uses to enter shops.
let retailChecked=0,retailSources=0;
for(const venue of w.retailShops.slice(0,12)){
 if(!venue?.retail)continue;
 const scene=H.makeRetailScene(venue.retail),v=scene.stage14Lighting;
 check('retail_scene_'+retailChecked,!!v&&v.physicalLightSources===2&&scene.lights.filter(l=>l.stage14Real).length===2);
 check('retail_fixtures_'+retailChecked,scene.boxes.filter(b=>b.stage14Fixture).length===4);
 g.retailVisit={scene};g.indoor=null;g.cam={x:venue.retail.centerX,y:2,z:venue.retail.frontZ+3.5};
 g.worldHour=23;check('retail_shader_budget_'+retailChecked,g.sceneLights().length<=12&&g.sceneLights().some(l=>l.stage14Real));
 retailChecked++;retailSources+=2;
}
check('retail_scenes_examined',retailChecked>=1);
// Return to outdoors; the authored day/night street lighting remains unaffected.
g.indoor=null;g.retailVisit=null;
check('outdoor_lighting_pipeline_preserved',Array.isArray(g.sceneLights()));
Object.assign(g,{cam:originalGame.cam,indoor:originalGame.indoor,retailVisit:originalGame.retail,worldHour:originalGame.worldHour});
report.numberOfLivePortals=count;report.addedPhysicalSourcesAcrossGroundFloors=totalAddedLights;
report.addedFixtureMeshesAcrossGroundFloors=totalAddedFixtures;report.retailSampleScenes=retailChecked;
report.retailPhysicalSourcesSample=retailSources;report.checks=checks.length;
report.passed=checks.filter(c=>c.pass).length;report.failed=checks.filter(c=>!c.pass);
fs.writeFileSync('QA/STAGE14_OF35_ACCEPTANCE.json',JSON.stringify(report,null,2)+'\n');
console.log('Stage14:',report.passed+'/'+report.checks,'pass; live entry interiors',count,
  'sources',totalAddedLights,'fixtures',totalAddedFixtures,'retail',retailChecked);
if(report.failed.length)process.exitCode=1;
