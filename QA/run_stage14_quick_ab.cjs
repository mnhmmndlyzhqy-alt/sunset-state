'use strict';
const fs=require('fs'),{H,g,ctx}=require('./stage05_bootstrap.cjs');
const portals=g.world.entrancePortals.filter(p=>p.interiorReady),plans=new Map(g.world.structuralPlans.map(p=>[`${p.outerShell?.x},${p.outerShell?.z}`,p]));
let checks=0,passed=0;const problems=[];function ok(id,v){checks++;if(v)passed++;else problems.push(id);}
ok('runtime_loaded',!!H.stage14Lighting?.installed);
ok('actual_html_script',fs.readFileSync('START_GAME.html','utf8').includes('<script src="assets/stage14_interior_lighting.js"></script>'));
ok('real_shader',fs.readFileSync('engine44.js','utf8').includes('uLightRGB[12]'));
ok('actual_game_pipeline',fs.readFileSync('engine44.js','utf8').includes("Heatline.stage14Lighting.resolve(this, authored, 'building')"));
for(const id of [1,24,78,298,320,350,425]){
  const p=portals.find(v=>v.id===id);if(!p){ok('portal_exists_'+id,false);continue;}
  const plan=plans.get(p.buildingX+','+p.buildingZ);const scene=g.sceneForFloor(plan,0);
  ok('new_source_'+id,scene.lights.some(l=>l.stage14Real));
  ok('new_fixture_'+id,scene.boxes.some(b=>b.stage14Fixture));
  g.retailVisit=null;g.indoor={scene};g.cam={x:scene.entrance.x,y:2,z:scene.entrance.z};
  g.worldHour=12;const day=g.sceneLights();g.worldHour=1;const night=g.sceneLights();
  const power=l=>l.reduce((s,o)=>s+o.r+o.g+o.b,0);
  ok('night_brighter_'+id,power(night)>power(day)*1.25);
  ok('shader_bounded_'+id,day.length<=12&&night.length<=12);
  ctx.__SUNSET_STAGE14_LIGHTS_OFF=true;
  ok('ab_disabled_'+id,g.sceneLights()===scene.lights);
  ctx.__SUNSET_STAGE14_LIGHTS_OFF=false;
}
g.retailVisit=null;g.indoor=null;
const result={stage:14,mode:'focused in-process A/B',checks,passed,failed:problems,gpuVerified:false};
fs.writeFileSync('QA/STAGE14_QUICK_AB.json',JSON.stringify(result,null,2)+'\n');
console.log('Quick A/B',passed+'/'+checks,'failed:',problems);
if(problems.length)process.exitCode=1;
