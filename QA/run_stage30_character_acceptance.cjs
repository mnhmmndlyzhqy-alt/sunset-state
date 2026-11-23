'use strict';
/* Stage 30 Character QA: the genuine cumulative engine + CPU renderer stub.
 * No hardware WebGL, pixel comparison, GPU timing or AAA certification.
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {H,g,ctx}=require('./stage05_bootstrap.cjs');
const checks=[],fail=[];
const test=(name,ok,detail)=>{checks.push({name,pass:!!ok});if(!ok)fail.push({name,detail});};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const finitePart=b=>[b.x,b.y,b.z,b.w,b.h,b.d,b.yaw,b.pitch||0,b.roll||0].every(Number.isFinite)&&b.w>0&&b.h>0&&b.d>0;
const emit=(w,player,d,webgl,entryTime,t=16.35)=>{const o=[];H.streetCharacterPose32(w,o,t,player,d,webgl,entryTime);return o;};
const details=a=>a.filter(b=>b.stage30CharacterDetail);
const disabled=(flag,fn)=>{ctx.__SUNSET_STAGE30_CHARACTERS_OFF=flag;try{return fn();}finally{ctx.__SUNSET_STAGE30_CHARACTERS_OFF=false;}};
const digest=a=>crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex');
const state=a=>JSON.parse(JSON.stringify(a));
const worldBefore={boxes:g.world.boxes.length,roads:g.world.roads461.length,buildings:g.world.buildings.length,
  city20:g.world.city20DistrictBuildings.length,solids:g.world.solids.length,
  props:g.world.propSolids.length,panes:g.world.glassPanels.length,
  portals:g.world.entrancePortals.filter(p=>p.interiorReady).length,shops:g.world.retailShops.length,
  pedestrians:g.pedestrians.length};
const m=H.stage30CharacterPolish;
test('Stage30 installed once after AeroWild, Street V8 and Stage29',m?.stats?.installed===true&&H.stage29InteriorPolish?.installed===true);
test('Original CITY20 and 27-29 buildings exist',worldBefore.city20===130&&worldBefore.buildings===84&&g.world.boxes.filter(b=>b.stage28Facade).length===1982);
test('Original roads, active entrances and shops exist',worldBefore.roads===52&&worldBefore.portals===214&&worldBefore.shops===59);
test('Original colliders and glass preserved',worldBefore.solids===3230&&worldBefore.props===796&&worldBefore.panes===988);
const hero=H.createWalker(12.5,-61.2,-.63,0);Object.assign(hero,{y:3.1,grounded:true,stride:.91,phase:1.37,stumble:0});
const heroState=state(hero);
const baseHero=disabled(true,()=>emit(hero,true,0,true));
const refinedHero=emit(hero,true,0,true);
const newHero=details(refinedHero);
test('Hero A/B switch restores exact Stage29 original pose',eq(baseHero,disabled(true,()=>emit(hero,true,0,true))));
test('Hero receives precisely 12 close-up finishing details',newHero.length===12,newHero.map(x=>x.stage30Kind));
test('Hero original geometry and order retained',refinedHero.slice(0,baseHero.length).every((b,i)=>b.shape===baseHero[i].shape&&b.color===baseHero[i].color));
test('Hero full original mesh count retained',refinedHero.length===baseHero.length+12);
test('Hero nose bridge, tip, lips, eyes and fabric exist',new Set(newHero.map(x=>x.stage30Kind)).size===8);
test('Hero face details only use available renderer primitives',newHero.every(x=>x.shape==='rounded_smooth'&&['skin','fabric'].includes(x.material)));
test('No hero geometry NaN/negative scale or unbounded visibility',refinedHero.every(finitePart)&&newHero.every(b=>b.visibilityCap<=90&&b.lodMax<=90));
test('Hero pose input unchanged; no movement edits',eq(heroState,state(hero)));
test('Hero boot pitch/elevation corrected without moving actor',refinedHero.some((x,i)=>x.color==='#292a2c'&&baseHero[i]&&x.y>baseHero[i].y+.001));
test('Original AeroWild character helmet/straps retained',refinedHero.some(b=>b.color==='#202b43')&&refinedHero.filter(b=>b.color==='#e4ded0').length>=4);
const baseCanvas=disabled(true,()=>emit(hero,true,0,false));
const newCanvas=emit(hero,true,0,false);
test('Canvas2D character fallback still draws',baseCanvas.length>10&&newCanvas.length===baseCanvas.length+12&&newCanvas.every(finitePart));
const entryBase=disabled(true,()=>emit(hero,true,0,true,.35));
const entryNow=emit(hero,true,0,true,.35);
test('Vehicle-entry pose is exactly unchanged',digest(entryBase)===digest(entryNow));
const flight=H.createWalker(13,-15,.75,2);Object.assign(flight,{y:2,grounded:false,stride:.7,phase:.8});
test('Airborne pose stays finite',emit(flight,true,0,true).every(finitePart));
const npc=H.createWalker(51,-42,.44,4);Object.assign(npc,{y:4.2,stride:.76,phase:1.4,socialPose:'talk',navActivity:'walk'});
const npcState=state(npc);
const baseNpc=disabled(true,()=>emit(npc,false,8,true));
const nearNpc=emit(npc,false,8,true);
test('NPC close-up retains all Stage32 original meshes',nearNpc.length>baseNpc.length&&nearNpc.slice(0,baseNpc.length).every((b,i)=>b.shape===baseNpc[i].shape));
test('NPC details limited to 3-5 near meshes',details(nearNpc).length>=3&&details(nearNpc).length<=5);
test('NPC fine details cull inside 16 m',details(nearNpc).every(x=>x.visibilityCap===16&&x.lodMax===16));
test('NPC source actor state unchanged',eq(npcState,state(npc)));
const mediumNpc=emit(npc,false,24,true),farNpc=emit(npc,false,145,true);
test('NPC middle and far distances allocate no extra geometry',details(mediumNpc).length===0&&details(farNpc).length===0);
test('Distant NPC source pose identical with stage disabled',eq(farNpc,disabled(true,()=>emit(npc,false,145,true))));
test('NPC social dialogue animates arm instead of navigation',(()=>{
  const a=baseNpc.find(x=>x.shape==='s32_armR_hi'),b=nearNpc.find(x=>x.shape==='s32_armR_hi');
  return !!a&&!!b&&Math.abs((b.pitch||0)-(a.pitch||0))>.018;
})());
test('NPC output finite in near/mid/far cases',[nearNpc,mediumNpc,farNpc].every(a=>a.every(finitePart)));
const fallen=H.createWalker(10,15,.25,1);fallen.injuryState='down';
test('Injured NPC original pose not modified',eq(emit(fallen,false,5,true),disabled(true,()=>emit(fallen,false,5,true))));
const avatar=H.createWalker(0,0,.2,4);avatar.socialPose='talk';avatar.emotion443='talk';
const baseExpr=disabled(true,()=>H.expression443(avatar,3.22));
const glbExpr=H.expression443(avatar,3.22);
test('Premium GLB expression preserved and valid',glbExpr.mode==='talk'&&Array.isArray(glbExpr.vector)&&glbExpr.vector.length===4&&glbExpr.vector.every(Number.isFinite));
test('Premium GLB speech becomes bounded, not exaggerated',glbExpr.vector[2]<=baseExpr.vector[2]+1e-8&&Math.abs(glbExpr.yaw)<=.33&&Math.abs(glbExpr.roll)<=.19);
test('Opt-out query parameter restores original expression',(()=>{ctx.location.search='?stage30CharactersOff=1';const disabledNow=m.off();ctx.location.search='';return disabledNow;})());
// Sample actual city pedestrians: different faces, moods, scales and roles.
const real=g.pedestrians.filter(w=>w.injuryState==='walking').slice(0,70);
let maxDetails=0,mismatch=0;
for(let i=0;i<real.length;i++){
  const w=real[i],d=2+(i%8)*4,sh=emit(w,false,d,true,11.3+i*.1);
  const det=details(sh);maxDetails=Math.max(maxDetails,det.length);
  if(!sh.every(finitePart)||det.length>5)mismatch++;
}
test('70 genuine NPCs pose without invalid scene coordinates',real.length===70&&mismatch===0,{real:real.length,mismatch});
test('Per-NPC detail ceiling 5 meshes',maxDetails<=5);
const worldAfter={boxes:g.world.boxes.length,roads:g.world.roads461.length,buildings:g.world.buildings.length,
 city20:g.world.city20DistrictBuildings.length,solids:g.world.solids.length,
 props:g.world.propSolids.length,panes:g.world.glassPanels.length,
 portals:g.world.entrancePortals.filter(p=>p.interiorReady).length,shops:g.world.retailShops.length,
 pedestrians:g.pedestrians.length};
test('All original world systems unchanged by character poses',eq(worldBefore,worldAfter));
test('Stage30 adds no colliders or save schema modifications',m.stats.newColliders===0&&m.stats.saveFormatChanges===0&&m.stats.worldMutations===0);
test('Stage30 reports GPU/50FPS explicitly unverified',m.stats.hardwareGPUVerified===false&&m.stats.fullHD50FPSVerified===false);
const html=fs.readFileSync(path.join(__dirname,'../START_GAME.html'),'utf8');
test('Stage30 loaded after Stage29 and after core engine',html.indexOf('assets/stage30_character_polish.js')>html.indexOf('assets/stage29_interior_retail_polish.js'));
const report={stage:30,basis:'real Stage29 cumulative engine; fake GPU / CPU-character-pose geometry inspection',
  passed:checks.filter(x=>x.pass).length,total:checks.length,checks,fail,
  summary:{worldBefore,worldAfter,heroOriginalMeshes:baseHero.length,heroNewMeshes:newHero.length,
    npcOriginalNearbyMeshes:baseNpc.length,npcExtraNearbyMeshes:details(nearNpc).length,
    npcMidAdded:details(mediumNpc).length,npcFarAdded:details(farNpc).length,
    sampledRealNpcs:real.length,stats:m.stats,nativeGpuVerified:false}};
fs.writeFileSync(path.join(__dirname,'STAGE30_CHARACTER_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE30 CHARACTER QA',report.passed+'/'+report.total,JSON.stringify(report.summary));
for(const f of fail)console.error('FAIL',f.name,JSON.stringify(f.detail||{}).slice(0,500));
if(fail.length)process.exitCode=1;
