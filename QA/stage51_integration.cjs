'use strict';
/* All classic launch-page scripts, actual cumulative Game/world/physics/save
 * logic. DOM, audio device and drawing surface are simulated: no pixel/FPS claim. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const env=require('./stage51_bootstrap.cjs');
const {H,g,ctx,warnings,errors,advance,root}=env;
const checks=[];
function test(name,pass,detail){checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)console.error('FAIL',name,detail);}
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const baselinePath=path.join(__dirname,'stage51_fixtures/stage50_world.json');
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')).world;
const finiteCamera=()=>['x','y','z','tx','ty','tz','fov'].every(k=>Number.isFinite(g.cam[k]));
const expectedDeviceWarning=message=>message==='Audio unavailable ReferenceError: AudioContext is not defined';
const key=code=>g.keyDown({code,repeat:false,target:env.document.body,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
async function main(){
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 test('Complete entrypoint scripts loaded in actual order',env.scripts.length>=108,{scripts:env.scripts.length});
 test('No installer/runtime errors during construction',warnings.length===0&&errors.length===0,{warnings,errors});
 test('Fixed high model fidelity is default',H.quality51?.fixed===true&&H.realism39.fidelity51===H.quality51);
 test('Street graph exactly matches supplied Stage 50',digest(g.world.roads461.map(r=>({id:r.id,width:r.width,points:r.points})))===baseline.roads);
 test('Existing collision solids exactly match supplied Stage 50',digest(g.world.solids.map(o=>[o.x,o.z,o.hw,o.hd,o.y,o.h,o.yaw]))===baseline.solids);
 test('Entrances and active interior links exactly match Stage 50',digest(g.world.entrancePortals.map(o=>[o.id,o.x,o.z,o.buildingX,o.buildingZ,o.interiorReady]))===baseline.portals);
 test('All 59 shops and 238 citizens retained',g.world.retailShops.length===59&&g.pedestrians.length===238);
 g.restart({reuseWorld:true});
 test('Start remains on foot with flight available',g.running&&!g.inVehicle&&!g.flight51.pilot&&!!g.flight51.site);
 for(let i=0;i<70;i++)g.updateCamera(1/60);
 test('Unified foot camera remains finite',finiteCamera());
 const before={...g.cam};g.footCameraYaw+=Math.PI/2;
 for(let i=0;i<90;i++)g.updateCamera(1/60);
 test('Foot orbit changes view and remains finite',finiteCamera()&&Math.hypot(g.cam.x-before.x,g.cam.z-before.z)>.5);
 const cameraBeforeMeshes={...g.cam}, testCar=H.makeCar('player',-32,-32,0);
 const nearCar=[],farCar=[];
 Object.assign(g.cam,{x:testCar.x,z:testCar.z+5});g.carGraphics(testCar,nearCar,1);
 Object.assign(g.cam,{x:testCar.x,z:testCar.z+260});g.carGraphics(testCar,farCar,1);
 test('Actual car draw keeps its near meshes at 260 metres',nearCar.length>0&&JSON.stringify(nearCar.map(o=>o.shape))===JSON.stringify(farCar.map(o=>o.shape)),{near:nearCar.length,far:farCar.length});
 test('Fixed car meshes are not faded by legacy LOD thresholds',farCar.every(o=>!(o.lodMax>0)));
 Object.assign(g.cam,cameraBeforeMeshes);
 const manual={x:0,y:2,z:0,yaw:0,gear:1},ensured=new Set();
 const importedRenderer={selection:new Map(),assets:new Map([['airliner_hi',{ready:true,texturesReady:false}]]),
  ensure:k=>ensured.add(k),ready(k){return this.assets.get(k)?.ready===true;}};
 const testLife={manualPlane51:manual,wildlife:[],fish:[],world:{parkedAirliners471:[]}};
 env.realWildlife.prototype.prepare.call(importedRenderer,testLife,{x:0,y:8,z:50});
 test('Manual aircraft preloads both high gear variants and waits for textures',!importedRenderer.selection.has(manual)&&ensured.has('airliner_hi')&&ensured.has('airliner_cruise_hi'));
 importedRenderer.assets.get('airliner_hi').texturesReady=true;
 env.realWildlife.prototype.prepare.call(importedRenderer,testLife,{x:0,y:8,z:50});
 test('Actual wildlife selector retains manual high plane before quality override',importedRenderer.selection.get(manual)==='airliner_hi');
 const fakeSkin=H.realism39.renderer;H.realism39.renderer={rcCharacters:true};
 const queue=H.realism39.characterQueue;queue.length=0;
 for(let i=0;i<40;i++){const w=H.createWalker(g.avatar.x+i*.1,g.avatar.z+3,0,i);H.streetCharacterPose32(w,[],1,false,155,true);}
 test('Distant crowd keeps dense skinned characters beyond old queue cap',queue.length===40,{queued:queue.length});
 queue.length=0;H.realism39.renderer=fakeSkin;
 const fixtures=fs.readFileSync(path.join(__dirname,'stage51_fixtures/stage50_save.json'),'utf8');
 const imported=g.stage19SaveSystem.importText(fixtures,'slot2');
 test('Original Stage 50 save imports in same schema',imported.ok&&H.stage19Save.schema===19);
 const loaded=g.stage19LoadNow('slot2');
 test('Original wallet/missions load without losing progress',loaded.ok&&g.profile.credits===987&&!g.flight51.pilot);
 const f=g.flight51,site=f.site;
 Object.assign(g.avatar,{x:site.x,z:site.z,y:H.outdoorHeight(site.x,site.z),grounded:true,vx:0,vz:0});
 g.inVehicle=false;g.indoor=null;g.retailVisit=null;g.roofVisit=null;g.boat444=null;g.avatar.swim445=null;g.cameraTransfer=0;
 g.updateHUD();
 test('Airport exposes a real boarding interaction',f.ownsInteraction());
 key('KeyE');
 test('Existing E interaction enters pilot mode',f.pilot);
 const boarding={x:g.avatar.x,z:g.avatar.z};
 key('KeyW');key('ShiftLeft');
 for(let i=0;i<420;i++){advance(1000/60);g.update(1/60);}
 test('Real Game update dispatch accelerates and takes off',f.pilot&&f.plane.airborne&&f.plane.y>H.reference469.runway.elevation+1,{mode:f.plane.mode,speed:f.plane.speed,y:f.plane.y});
 test('Flight camera follows the aircraft',finiteCamera()&&Math.hypot(g.cam.x-f.plane.x,g.cam.z-f.plane.z)<90);
 key('KeyE');test('Exit is blocked while airborne',f.pilot);
 g.keys.clear();
 const flightSave=g.stage19SaveNow('slot1');
 const saved=flightSave.ok?H.stage19Save.parse(g.stage19SaveSystem.exportText('slot1')):null;
 test('Flight save keeps all progress at a safe boarding anchor',flightSave.ok&&saved.mode==='foot'&&saved.avatar.x===boarding.x&&saved.avatar.z===boarding.z);
 const resumed=g.stage19LoadNow('slot1');
 test('Flight save resumes safely on foot and clears transient pilot',resumed.ok&&!g.flight51.pilot&&!g.inVehicle&&g.avatar.grounded);
 const shop=g.world.retailShops.find(s=>s.retail);
 g.enterRetail(shop);
 test('Existing shop interior still opens',g.retailVisit?.venue?.id===shop.id);
 const shopWallet=g.profile.credits; // Existing first-visit reward is legitimate progress.
 const shopSave=g.stage19SaveNow('slot3');
 test('Shop interior remains saveable',shopSave.ok);
 const shopLoad=g.stage19LoadNow('slot3');
 test('Saved shop and wallet restore correctly',shopLoad.ok&&g.retailVisit?.venue?.id===shop.id&&g.profile.credits===shopWallet,{shopLoad,venue:g.retailVisit?.venue?.id,expectedVenue:shop.id,wallet:g.profile.credits,expectedWallet:shopWallet});
 g.restart({reuseWorld:true});
 const portal=g.world.entrancePortals.find(p=>p.interiorReady);
 test('Existing building entry remains functional',g.enterBuilding(portal.id)===true);
 for(let i=0;i<30;i++)g.updateCamera(1/60);
 test('Special interior camera preserved',finiteCamera()&&!!g.indoor?.scene?.lift);
 test('No unexpected integration warnings after gameplay/save cycles',warnings.every(expectedDeviceWarning)&&errors.length===0,{warnings,errors});
}
main().catch(e=>{test('Integration execution completes',false,{error:e.stack});}).finally(()=>{
 const report={version:H.build52?.version||'51.0',kind:'Actual game logic with simulated DOM/render/audio devices',checks,passed:checks.filter(t=>t.pass).length,total:checks.length,
 limitations:{liveBrowser:false,webglPixels:false,audioListening:false,native1080p50fpsVerified:false},simulatedDeviceWarnings:warnings.filter(expectedDeviceWarning)};
 fs.writeFileSync(process.env.SUNSET_INTEGRATION_REPORT||path.join(__dirname,'STAGE51_INTEGRATION_RESULT.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,failures:checks.filter(t=>!t.pass)}));
 if(checks.some(t=>!t.pass))process.exitCode=1;
});
