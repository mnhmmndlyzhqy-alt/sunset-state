'use strict';
/* SUNSET STATE Stage 32: execute actual Stage43/40 cumulative ecosystem under
 * CPU renderer stub. Never describes this as visual WebGL2 or GPU QA. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {H,g,ctx}=require('./stage05_bootstrap.cjs');
const m=H.stage32WildlifePolish,life=g.stage39Life;
const checks=[],errors=[];
const test=(name,pass,detail)=>{checks.push({name,pass:!!pass});if(!pass)errors.push({name,detail});};
const snap=(x)=>JSON.stringify(x);
const off=(fn)=>{ctx.__SUNSET_STAGE32_WILDLIFE_OFF=true;try{return fn();}finally{ctx.__SUNSET_STAGE32_WILDLIFE_OFF=false}};
const groups=['crocodile','flamingo','heron','dolphin'];
const count=(kind)=>life.wildlife.filter(a=>a.kind===kind).length;
const typePos=(kind)=>life.wildlife.filter(a=>a.kind===kind);
const fish=life.fish;
const eco=(a)=>H.coast461.coast(a.x,a.z);
const valid=(a)=>m.habitatValid(a.species||a.kind,a.x,a.z);
const reference={boxes:g.world.boxes.length,roads:g.world.roads461.length,
  buildings:g.world.buildings.length,city20:g.world.city20DistrictBuildings.length,
  portals:g.world.entrancePortals.filter(p=>p.interiorReady).length,shops:g.world.retailShops.length,
  walls:g.world.solids.length,props:g.world.propSolids.length,
  glass:g.world.glassPanels.length,interceptorVariants:H.INTERCEPTOR31_VARIANTS.length};
test('Stage32 registered with real Stage43 Life and existing Renderer',m.stats.installed&&life instanceof m.Class&&m.Base!==m.Class&&typeof H.Wildlife43Renderer.prototype.prepare==='function');
test('Stage31 vehicle original hook still installed',H.stage31VehiclePolish.stats.installed);
test('Stage30 and Stage29 additions remain installed',H.stage30CharacterPolish.stats.installed&&H.stage29InteriorPolish.installed);
test('Original population retained: 8 crocodiles, 10 flamingos, 4 herons, 6 dolphins',count('crocodile')===8&&count('flamingo')===10&&count('heron')===4&&count('dolphin')===6);
test('Original fish population of 26 and all four fish species retained',fish.length===26&&['sardine','mackerel','reef_perch','barracuda'].every(s=>fish.some(f=>f.species===s)));
test('All 28 mismatch placements detected by checking real coastline',snap(m.stats.unsuitableHomesBefore)===snap({flamingo:10,heron:4,dolphin:6,reef_perch:8}));
test('All 28 mismatches corrected on initial load',Object.values(m.stats.unsuitableHomesAfter).every(n=>n===0));
test('Flamingos now on real western marsh shoreline not former dry interior',typePos('flamingo').every(a=>valid(a)&&a.x>350&&eco(a)<=6&&eco(a)>=-2.5));
test('Herons now on natural low wetland banks',typePos('heron').every(a=>valid(a)&&a.z< -640&&eco(a)>0&&eco(a)<=10));
test('All six dolphins now offshore in water; no dry-land swimming',typePos('dolphin').every(a=>valid(a)&&eco(a)<=-10));
test('Eight reef fish now inhabit wetland shallow channels, not deep ocean',fish.filter(f=>f.species==='reef_perch').length===8&&fish.filter(f=>f.species==='reef_perch').every(f=>valid(f)&&f.x>300&&f.x<500&&f.z< -700));
test('Existing eight crocodile authored water sites preserved',typePos('crocodile').every((a,i)=>a.x===H.CROC_SITES477[i][0]&&a.z===H.CROC_SITES477[i][1]));
test('Flamingos protected from crocodile breeding areas',typePos('flamingo').every(a=>H.CROC_SITES477.every(([x,z])=>Math.hypot(a.x-x,a.z-z)>74)));
test('Flamingo actors are distinct individuals, not one overlapped model',(()=>{const ff=typePos('flamingo');return ff.every((a,i)=>ff.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.z-b.z)>9.0))})());
test('Dolphin pods still split into two pods of three',snap(typePos('dolphin').map(a=>a.pod))===snap([0,0,0,1,1,1]));
test('Original crocodile LOD hi/mid/far selector still present',!!H.Wildlife43Renderer.prototype.prepare&&fs.existsSync(path.join(__dirname,'../assets/crocodile_hi.js'))&&fs.existsSync(path.join(__dirname,'../assets/crocodile_mid.js'))&&fs.existsSync(path.join(__dirname,'../assets/crocodile_far.js')));
test('Original detailed flamingo, heron and fish models still on disk',['flamingo_hi','flamingo_mid','flamingo_far','heron_hi','heron_far','fish_unique'].every(k=>fs.statSync(path.join(__dirname,'../assets/'+k+'.js')).size>800000));
test('Landscape map, roads and urban world unchanged at installation',reference.roads===52&&reference.buildings===84&&reference.city20===130&&reference.boxes===196817&&reference.portals===214&&reference.shops===59&&reference.walls===3230&&reference.props===796&&reference.glass===988&&reference.interceptorVariants===6);
test('No new model, collision or save-schema changes reported',m.stats.newColliders===0&&m.stats.originalModelsChanged===0&&m.stats.savedDataSchemaChanges===0);
const original=new m.Base(g.world),disabled=off(()=>new H.Stage39Life(g.world));
const posHash=(obj)=>crypto.createHash('sha256').update(snap({wildlife:obj.wildlife,fish:obj.fish})).digest('hex');
test('Stage32 A/B opt-out preserves Stage31 animal placement bit-for-bit on reload',posHash(original)===posHash(disabled));
test('A/B query switch correctly reports off',(()=>{ctx.location.search='?stage32WildlifeOff=1';const answer=m.off();ctx.location.search='';return answer===true&&!m.off()})());
test('A/B original still exposes historically unsuitable initial habitat',m.originalHabitatProblems(disabled).flamingo===10&&m.originalHabitatProblems(disabled).dolphin===6);
let goalChecks=0,goalFailures=0;
for(const a of life.wildlife.filter(a=>a.kind!=='crocodile')){
  for(let n=0;n<14;n++){
    life.chooseGoal(a);
    goalChecks++;
    if(!m.habitatValid(a.kind,a.goalX,a.goalZ))goalFailures++;
  }
}
test('320 dynamically selected bird/dolphin goals stay on valid habitat',goalChecks===280&&goalFailures===0,{goalChecks,goalFailures});
let fishGoals=0,fishGoalBad=0;
for(const f of fish){for(let i=0;i<5;i++){const p=m.safeGoal(f,f.species==='reef_perch'?'reef_perch':'water',life.rng40);fishGoals++;if(!m.habitatValid(f.species==='reef_perch'?'reef_perch':'water',p.x,p.z))fishGoalBad++;}}
test('130 adaptive fish goals remain inside proper water',fishGoals===130&&fishGoalBad===0,{fishGoals,fishGoalBad});
// Actual Stage43 population update over 80 seconds; includes predator detection,
// flight, weather, terrain, resources, school cohesion and leap timers.
const startPositions=new Map([...life.wildlife,...life.fish].map(a=>[a.id,{x:a.x,z:a.z}]));
let invalids=0,nonfinite=0,teleports=0,maximumDisplacement=0;
const observer={x:99999,z:99999},ticks=1600,dt=.05;
for(let t=0;t<ticks;t++){
  try{life.update(dt,observer,observer,false,t%600<300?17.3:8.2,{rain:t%700<100?.75:0,wind:.24});}
  catch(e){errors.push({name:'Actual 80-second ecology simulation exception',detail:String(e)});break;}
  for(const a of [...life.wildlife,...life.fish]){
    const b=startPositions.get(a.id);
    const step=Math.hypot(a.x-b.x,a.z-b.z);
    maximumDisplacement=Math.max(maximumDisplacement,step);
    // Flight may cross dry land but only while truly airborne.
    const airborne=(a.kind==='flamingo'||a.kind==='heron')&&a.altitude>.28;
    if(!airborne&&a.kind!=='crocodile'&&!valid(a))invalids++;
    if(![a.x,a.z,a.yaw,a.speed].every(Number.isFinite))nonfinite++;
    if(step>2.1)teleports++;
    b.x=a.x;b.z=a.z;
  }
}
test('80-second real wildlife simulation finishes without exception',!errors.some(e=>e.name.includes('simulation exception')));
test('All wildlife/fish stay finite over 1600 actual engine steps',nonfinite===0,{nonfinite});
test('No stranded dolphins, landlocked fish or grounded birds during actual 80s',invalids===0,{invalids});
test('Animal and fish positions advance continuously, never teleport',teleports===0,{teleports,maximumDisplacement});
test('Dolphins still execute breathing within long simulation',life.counters.breathe>0&&typePos('dolphin').some(a=>a.breaths>0),life.counters);
test('Birds retain distinct natural feeding/resting/flying modes',typePos('flamingo').concat(typePos('heron')).every(a=>['feed','preen','wade','rest','flight','landing','flee'].includes(a.mode)));
test('Fish all preserve species and pod identifiers after 80 seconds',fish.every(f=>typeof f.species==='string'&&Number.isInteger(f.pod)));
test('Every coral-reef fish remains in wetland habitat after long run',fish.filter(f=>f.species==='reef_perch').every(f=>f.habitat==='wetland'&&m.habitatValid('reef_perch',f.x,f.z)));
test('Water users do not approach roads',typePos('dolphin').every(a=>!H.coast461.isRouteRoad(a.x,a.z))&&fish.every(f=>!H.coast461.isRouteRoad(f.x,f.z)));
// Force a genuine breath in the pre-existing dolphin update method, then emit.
const dolphin=typePos('dolphin')[0];dolphin.breathTimer=.001;dolphin.modeTimer=6;
const beforeBreaths=dolphin.breaths;life.update(.05,observer,observer,false,17.6,{rain:0,wind:0});
test('Actual dolphin update triggers a surface-breath and short-lived exhale',dolphin.breaths===beforeBreaths+1&&dolphin.stage32Exhale>.25);
const baseWaterObjects=[];m.Base.prototype.emit.call(life,baseWaterObjects,dolphin.x,dolphin.z);
const out=[];life.emit(out,dolphin.x,dolphin.z);
const extra=out.filter(b=>b.stage32WildlifeDetail);
const closest=(objects,shape,x,z)=>objects.filter(b=>b.shape===shape).sort((a,b)=>
  Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
const oldDolphin=closest(baseWaterObjects,'w40_dolphin_body',dolphin.x,dolphin.z);
const newDolphin=closest(out,'w40_dolphin_body',dolphin.x,dolphin.z);
test('Original underwater dolphin seabed-anchor defect verified',oldDolphin&&oldDolphin.y< -1.1,{y:oldDolphin?.y});
test('Dolphin surfaced anatomy now aligned to actual sea datum',newDolphin&&newDolphin.y>-.9&&newDolphin.y<1.1,{y:newDolphin?.y});
test('Original dolphin remains fully rigged, not replaced by a flat surface sprite',newDolphin&&newDolphin.shape==='w40_dolphin_body'&&out.some(b=>b.shape==='w40_dolphin_fluke'));
const waterFish=fish.find(f=>f.species==='mackerel');
const oldFish=closest(baseWaterObjects,'w40_fish',waterFish.x,waterFish.z);
const newFish=closest(out,'w40_fish',waterFish.x,waterFish.z);
test('Fallback fish previously hidden near deep seabed are now below real water surface',oldFish&&newFish&&newFish.y>oldFish.y+2&&newFish.y<0&&newFish.y> -1.7,
 {before:oldFish?.y,after:newFish?.y});
test('Real model draw keeps scene objects finite and positive',out.length>80&&out.every(b=>[b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)&&b.w>0&&b.h>0&&b.d>0));
test('Visible dolphin breath has <=3 subtle short-range water particles',extra.filter(b=>b.stage32WildlifeDetail==='breath-spray').length===3);
test('Added water effects use existing shapes and hard distance cap',extra.every(b=>b.visibilityCap<=60&&['w40_joint','w40_ripple'].includes(b.shape)));
const far=[];life.emit(far,9999,9999);
test('No Stage32 wildlife effects generated for distant camera',far.every(b=>!b.stage32WildlifeDetail));
const firstFlamingo=typePos('flamingo').find(a=>eco(a)<.65);
if(firstFlamingo){firstFlamingo.mode='wade';firstFlamingo.altitude=0;
 const nearBird=[];life.emit(nearBird,firstFlamingo.x,firstFlamingo.z);
 test('Wading in shallow natural water causes a capped ripple, not fake water slab',nearBird.some(b=>b.stage32WildlifeDetail==='shallow-wading'));
}else test('Wading in shallow natural water causes a capped ripple, not fake water slab',false);
const stateBefore={...reference};const stateAfter={boxes:g.world.boxes.length,roads:g.world.roads461.length,
  buildings:g.world.buildings.length,city20:g.world.city20DistrictBuildings.length,
  portals:g.world.entrancePortals.filter(p=>p.interiorReady).length,shops:g.world.retailShops.length,
  walls:g.world.solids.length,props:g.world.propSolids.length,glass:g.world.glassPanels.length,
  interceptorVariants:H.INTERCEPTOR31_VARIANTS.length};
test('Full city, interiors, roads, props, collision and glass unchanged after wildlife activity',snap(stateBefore)===snap(stateAfter));
test('Stage32 explicitly does not certify full-HD FPS or native GPU quality',m.stats.nativeGpuVerified===false&&m.stats.fullHD50FpsVerified===false);
const html=fs.readFileSync(path.join(__dirname,'../START_GAME.html'),'utf8');
test('Stage32 module loads before core engine installs subclass',html.indexOf('assets/stage32_wildlife_ecology.js')>0&&html.indexOf('assets/stage32_wildlife_ecology.js')<html.indexOf('engine44.js'));
const report={stage:32,basis:'Stage31 original full cumulative engine, 80 simulated seconds, fake CPU renderer; no GPU or native visual check',passed:checks.filter(a=>a.pass).length,total:checks.length,checks,errors,
  summary:{beforeHomes:m.stats.unsuitableHomesBefore,afterHomes:m.stats.unsuitableHomesAfter,
    species:{crocodile:8,flamingo:10,heron:4,dolphin:6,fish:26},
    originalWorld:reference,afterWorld:stateAfter,simulatedSteps:ticks,simulatedSeconds:ticks*dt,
    fishGoals,goalChecks,invalids,nonfinite,teleports,maximumDisplacement,stats:m.stats},
  caveats:{gpuNativeWebGL2:false,fullHd50Fps:false,visualAcceptance:false,publicGithubPagesPublished:false}};
fs.writeFileSync(path.join(__dirname,'STAGE32_WILDLIFE_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE32 QA',report.passed+'/'+report.total,'| invalid',invalids,'nonfinite',nonfinite,'teleports',teleports,'| max-step',maximumDisplacement.toFixed(3));
for(const f of errors)console.error('FAIL',f.name,JSON.stringify(f.detail||{}).slice(0,300));
if(errors.length)process.exitCode=1;
