'use strict';
/* Stage 19 game integration - real Game and real save module; CPU-only, fake renderer/DOM.
   Explicitly NOT a successful browser, IndexedDB, visual, GPU or FPS test. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {H,ctx,g}=require('./stage05_bootstrap.cjs');
// The existing headless canvas lacks createImageData/replaceChildren; suppress only
// decorative navigation/DOM drawing, never game reset, missions, store, scene or save.
g.nav445.draw=()=>{};g.refreshMissionBoard=()=>{};
const errors=[];let passed=0;
function ok(name,cond,detail){if(cond)passed++;else{errors.push({name,detail});if(errors.length<25)console.error('FAIL',name,detail);}}
const eq=(name,a,b)=>ok(name,JSON.stringify(a)===JSON.stringify(b),{found:a,expected:b});
const S=H.stage19Save;
ok('stage19 module loaded',!!S&&S.schema===19);
ok('game hooked after constructor',!!g.stage19SaveSystem&&typeof g.stage19LoadNow==='function');
const html=fs.readFileSync(root+'/START_GAME.html','utf8');
ok('module loaded after engine and stage17',html.indexOf('assets/stage19_persistent_save.js')>html.indexOf('assets/stage17_retail_contracts.js'));
ok('engine hooks save module after world initialization',fs.readFileSync(root+'/engine44.js','utf8').includes('Heatline.stage19Save?.install(this)'));
ok('source has three manual and one autosave slots',S.slots.join(',')==='slot1,slot2,slot3,auto');
ok('all stage18 portals preserved',g.world.entrancePortals.length===429&&g.world.entrancePortals.filter(p=>p.interiorReady).length===214);
ok('roads preserved',g.world.roads461.length===52);
ok('stage18 wildlife persists',g.stage39Life.wildlife.filter(a=>a.kind==='crocodile').length===8);
ok('stage16 glazing persists',g.world.glassPanels.length===988);
ok('legacy profile and mission schema still present',!!H.parseGarageProfile&&!!H.MissionJournal30);
ok('main menu created DOM save panel',ctx.document.body!=null&&!!g.stage19SaveSystem.statusEls.length);
ok('save before game start denied',g.stage19SaveNow('slot1').ok===false);
console.log('MARK START');g.restart({reuseWorld:true});
ok('game started without new world',g.running&&g.world.entrancePortals.length===429);
const checkpoint={x:82.5,z:52.25,hour:21.6,credits:1952};
g.profile.credits=checkpoint.credits;g.avatar.x=checkpoint.x;g.avatar.z=checkpoint.z;
g.avatar.y=H.outdoorHeight(checkpoint.x,checkpoint.z);g.avatar.yaw=-1.25;g.worldHour=checkpoint.hour;
g.footHealth=78;g.score=378;g.totalCoins=1743;g.best=2123;g.clockRunning=true;
g.player.x=11;g.player.z=84;g.player.hp=62;g.player.fuel=37;g.player.frontDamage=.41;g.player.wheelDamage=[.1,.2,.3,.4];
g.weaponMagazines=[5,10,0,2,1];g.weaponReserves=[69,150,0,3,0];g.grenadesLeft=4;g.chargesLeft=2;g.weaponMode=1;
g.missions30.start('urban_explorer');g.visitRewards.add('entered:0');g.visitRewards.add('hub:sample');
g.weather.setControl('rain');g.weather.active='rain';g.weather.nextChange=37;
g.crimeHistory460.arrests=8;g.crimeHistory460.fines=2;
const legacyKeys=['sunset_state_profile_v8','sunset_state_missions_v30','sunset_state_indoor_v16'];
const beforeLegacy=legacyKeys.map(k=>ctx.localStorage.getItem(k));
const first=g.stage19SaveNow('slot1');ok('manual save returns success',first.ok===true&&first.size>400&&first.size<20000);
ok('save does not touch legacy independent keys',legacyKeys.every((k,i)=>ctx.localStorage.getItem(k)===beforeLegacy[i]));
const src=g.stage19SaveSystem.exportText('slot1');const data=S.parse(src);
eq('wallet saved',data.profile.credits,checkpoint.credits);
eq('mission identifier saved',data.missions.active,'urban_explorer');
eq('position captured',data.avatar.x,checkpoint.x);eq('time captured',data.scalars.worldHour,checkpoint.hour);
eq('damage captured',data.car.hp,62);eq('fuel captured',data.car.fuel,37);
eq('night weather captured',data.weather.active,'rain');
ok('rewards captured',data.rewards.includes('hub:sample')&&data.rewards.includes('entered:0'));
ok('weapons captured',data.weapons.magazines[0]===5&&data.weapons.reserves[0]===69);
// Data saved in several independent slots, no aliasing between them.
g.profile.credits=840;ok('slot2 saved',g.stage19SaveNow('slot2').ok);
g.profile.credits=450;ok('slot3 saved',g.stage19SaveNow('slot3').ok);
const slots=g.stage19SaveSystem.list();ok('slot list exposes three stored manual slots',slots.filter(s=>s.exists).length===3);
g.profile.credits=5;g.worldHour=10;g.avatar.x=0;g.avatar.z=0;
g.missions30.abandon();g.player.hp=12;g.player.fuel=100;g.weaponMagazines=[0,0,0,0,0];
console.log('MARK FIRST LOAD');const loaded=g.stage19LoadNow('slot1');ok('load succeeded',loaded.ok&&loaded.mode==='foot');
eq('credits restored',g.profile.credits,checkpoint.credits);
eq('position X restored',g.avatar.x,checkpoint.x);eq('position Z restored',g.avatar.z,checkpoint.z);
eq('world time restored',g.worldHour,checkpoint.hour);
eq('player health restored',g.footHealth,78);eq('score restored',g.score,378);
eq('coins restored',g.totalCoins,1743);eq('best restored',g.best,2123);
ok('day/night clock restored',g.clockRunning===true);eq('car health restored',g.player.hp,62);
eq('car fuel restored',g.player.fuel,37);eq('car wheel damage restored',g.player.wheelDamage,[.1,.2,.3,.4]);
eq('weapon magazines restored',g.weaponMagazines,[5,10,0,2,1]);
eq('grenades restored',g.grenadesLeft,4);eq('charges restored',g.chargesLeft,2);
ok('mission and steps survived',g.missions30.current?.id==='urban_explorer');
ok('visit awards survived',g.visitRewards.has('entered:0')&&g.visitRewards.has('hub:sample'));
ok('weather system restored',g.weather.active==='rain'&&g.weather.control==='rain');
eq('arrests survived',g.crimeHistory460.arrests,8);
ok('persistent legacy profile updated only on successful load',JSON.parse(ctx.localStorage.getItem('sunset_state_profile_v8')).credits===checkpoint.credits);
console.log('MARK BUILDING TEST');
// Save inside original multistorey structural building and restore floor / position.
g.restart({reuseWorld:true});g.profile.credits=2500;
const portal=g.world.entrancePortals.find(p=>p.interiorReady&&g.world.structuralPlans.some(plan=>plan.outerShell.x===p.buildingX&&plan.outerShell.z===p.buildingZ&&plan.floorCount>=4));
ok('multistorey portal exists',!!portal);
ok('real building entry works',g.enterBuilding(portal.id)===true);
g.indoor.floor=2;g.indoor.scene=g.sceneForFloor(g.indoor.plan,2);
const scene=g.indoor.scene;g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z+1.2;
g.score=612;g.visitRewards.add('entered:'+portal.id);
const oldFloorY=H.cityTerrain42(g.indoor.plan.outerShell.x,g.indoor.plan.outerShell.z)+2*g.indoor.plan.floorHeight;
ok('save multistorey interior',g.stage19SaveNow('slot1').ok);
ok('restore multistorey interior',g.stage19LoadNow('slot1').ok);
eq('interior portal maintained',g.indoor?.portalId,portal.id);eq('upper floor maintained',g.indoor?.floor,2);
ok('restored height uses actual floorHeight',Math.abs(g.avatar.y-oldFloorY)<.01);
eq('no duplicate entry reward',g.profile.credits,2500);eq('no unintended score change on entry',g.score,612);
ok('interior scene and door remain',!!g.indoor?.scene?.entrance&&!!g.indoor?.scene?.lift);
console.log('MARK RETAIL TEST');
// Retail entry and shop state: serialized as venue ID, reinstated from canonical scene.
g.restart({reuseWorld:true});g.profile.credits=899;
const shop=g.world.retailShops.find(s=>s?.retail);
ok('real shop exists',!!shop);g.enterRetail(shop,true);
ok('retail scene entered',g.retailVisit?.venue?.id===shop.id);
g.avatar.x=g.retailVisit.scene.entrance.x;g.avatar.z=g.retailVisit.scene.entrance.z+1.4;
const storeCredits=g.profile.credits;
ok('retail save',g.stage19SaveNow('slot1').ok);
ok('retail load',g.stage19LoadNow('slot1').ok);
eq('retail venue restored',g.retailVisit?.venue?.id,shop.id);
eq('retail balance preserved',g.profile.credits,storeCredits);
console.log('MARK CAR TEST');
// Vehicle pose, money and damage survive a fresh reset/load.
g.restart({reuseWorld:true});g.inVehicle=true;g.player.x=108;g.player.z=180;g.player.yaw=1.24;
g.player.hp=43;g.player.fuel=18;g.player.wrecked=false;g.player.panelDetached=[false,true,false,false,false,false];
ok('active car saved',g.stage19SaveNow('slot1').ok);
g.restart({reuseWorld:true});ok('active car loaded',g.stage19LoadNow('slot1').ok);
ok('driving mode restored',g.inVehicle===true);eq('driving car X',g.player.x,108);eq('driving car Z',g.player.z,180);
eq('driving car yaw',g.player.yaw,1.24);eq('driving car health',g.player.hp,43);eq('driving car fuel',g.player.fuel,18);
ok('car detachable panels restored',g.player.panelDetached[1]===true);
console.log('MARK AB TEST');
// A/B toggling disables the new feature without mutating old progress.
ctx.__SUNSET_STAGE19_SAVES_OFF=true;
const offGame={};H.stage19Save.install(offGame);
ok('A/B-off API adds no save runtime',!offGame.stage19SaveSystem&&offGame.__stage19Installed);
ok('A/B toggle does not erase original world',g.world.entrancePortals.length===429&&!!g.profile&&!!g.missions30);
ctx.__SUNSET_STAGE19_SAVES_OFF=false;
console.log('MARK CORRUPTION TEST');
// Invalid/incompatible/tampered JSON rejected before it can reset game.
const before={credits:g.profile.credits,x:g.player.x,hp:g.player.hp,running:g.running};
const tampered=JSON.parse(src);tampered.data.profile.credits=99999999;
for(const [name,text] of [['non-json','{this cannot parse'],['checksum',JSON.stringify(tampered)],
 ['schema',JSON.stringify({...JSON.parse(src),schema:20})],['too-large','x'.repeat(512*1024+1)]]){
  ok('reject invalid import '+name,!g.stage19SaveSystem.importText(text,'slot3').ok);
}
ok('reject invalid import preserved driving session',g.profile.credits===before.credits&&g.player.x===before.x&&g.player.hp===before.hp&&g.running===before.running);
// Existing browser backup remains available if the latest primary gets corrupted.
g.profile.credits=1011;ok('prepare backup previous save',g.stage19SaveNow('slot2').ok);
g.profile.credits=1444;ok('new main save',g.stage19SaveNow('slot2').ok);
const backupText=ctx.localStorage.getItem(S.prefix+'slot2_backup');
ok('backup slot is valid and has prior value',S.parse(backupText).profile.credits===1011);
ctx.localStorage.setItem(S.prefix+'slot2','BROKEN');
g.profile.credits=1;const fallback=g.stage19LoadNow('slot2');
ok('recover from valid backup',fallback.ok===true&&fallback.backup===true);eq('backup restores earlier credits',g.profile.credits,1011);
// Corrupt primary and backup -> no restart or user-data loss.
const preserve={score:g.score,credits:g.profile.credits,avatarX:g.avatar.x};
ctx.localStorage.setItem(S.prefix+'slot2','BROKEN');ctx.localStorage.setItem(S.prefix+'slot2_backup','BROKEN');
ok('reject corrupt primary and backup',g.stage19LoadNow('slot2').ok===false);
ok('corrupt load leaves session intact',g.score===preserve.score&&g.profile.credits===preserve.credits&&g.avatar.x===preserve.avatarX);
console.log('MARK IMPORT TEST');
// Portable export/import and content validation.
const imported=g.stage19SaveSystem.importText(src,'slot3');ok('import portable JSON to slot3',imported.ok);
eq('imported data is verified',S.readSlot('slot3').data.profile.credits,checkpoint.credits);
const invalidEnvelope=JSON.parse(src);invalidEnvelope.data.avatar.x=1e99;
invalidEnvelope.checksum=S.hash(JSON.stringify(invalidEnvelope.data));
ok('checksum alone does not allow illegal coordinates',!g.stage19SaveSystem.importText(JSON.stringify(invalidEnvelope),'slot3').ok);
ok('invalid import leaves prior valid slot intact',S.readSlot('slot3').data.profile.credits===checkpoint.credits);
// Runtime gameplay must not introduce global world geometry or extra collision meshes.
ok('no city street changes',g.world.roads461.length===52);
ok('active building entry count still correct',g.world.entrancePortals.filter(p=>p.interiorReady).length===214);
ok('original 864 breakable new panes retained',g.world.stage16GlassStats?.selectedGlass===864);
ok('no extra world meshes or collisions',g.world.solids.length===3230&&g.world.propSolids.length===796);
const output={stage:19,passed,total:passed+errors.length,failures:errors,
  caveats:['Node VM fake DOM and renderer','GPU/WebGL/FPS not validated','Dynamic traffic/police/projectiles reset on load','Transit boarding reopens on foot','In-progress race resumes inactive; completed race record retained'],
  testMethod:'Real Game, persistent slot logic and live world scripts, headless renderer; cross-stage regression spots',
  date:'2026-11-22'};
fs.writeFileSync(path.join(root,'QA/STAGE19_OF35_ACCEPTANCE.json'),JSON.stringify(output,null,2));
console.log('STAGE19',passed+'/'+output.total,errors.length?'FAIL':'PASS');
if(errors.length)process.exit(1);
