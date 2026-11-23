'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=[...read('START_GAME.html').matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
const ctx={console,URLSearchParams,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const file of files){let s=read(file);if(file==='engine44.js')s=s.replace('if (typeof Heatline.installPhysicsRecovery4', 'globalThis.__STAGE21_GAME=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(s,{filename:file}).runInContext(ctx,{timeout:60000});}
const H=ctx.Heatline,C=ctx.__STAGE21_GAME;
function fakeGame(solids=[]){const g=Object.create(C.prototype);g.weather={rain:0};g.world={nearby:()=>solids,impactNearby:()=>[],panesNearby:()=>[]};g.railGates=[];g.breakGlassOnCarContact=()=>{};g.crashVehicle=(c,s,nx,nz,k)=>{g.impacts.push({s,nx,nz,k});return null;};g.impacts=[];g.synth={impact(){},cue(){}};g.bulletScars=[];g.impactDebris=()=>{};g.reportOffense=()=>{};g.buildingHitPoint=(c,s,nx,nz)=>({x:s.x,z:s.z});return g;}

const checks=[],failures=[],A=H.stage21HighSpeedCCD;
function ok(name,cond,detail){checks.push({name,passed:!!cond});if(!cond){failures.push({name,detail});console.error('FAIL',name,JSON.stringify(detail).slice(0,250));}}
const wall={x:8,z:0,hw:.07,hd:5};
const sampleCar=H.makeCar('player',15,0,Math.PI/2);
ok('stage21 module installed and Game integrated',A.stats.installed&&typeof A.findFirst==='function');
ok('Recovery4 still installed',H.physicsRecovery4.stats.installed);
ok('guard cannot install twice',H.installStage21HighSpeedCCD(C)===false);
ok('native swept footprint available',H.carBuildingFootprint(sampleCar).extentX>2);
const sat=A.sweptSAT(sampleCar,wall,15,0,2,0);
ok('continuous SAT detects thin barrier',sat&&sat.t>0&&sat.t<1,{sat});
ok('continuous SAT computes outward normal',sat&&sat.nx>.9&&Math.abs(sat.nz)<.05,{sat});
ok('SAT misses out-of-corridor barrier',!A.sweptSAT(sampleCar,wall,15,20,2,20));
ok('SAT misses movement away from barrier',!A.sweptSAT(sampleCar,wall,15,0,23,0));
ok('SAT ignores existing overlap to let native solver act',!A.sweptSAT(sampleCar,wall,8.1,0,10,0));
for(const yaw of [0,Math.PI/6,Math.PI/4,Math.PI/2]){
  const c=H.makeCar('player',15,0,yaw);
  const hit=A.sweptSAT(c,wall,15,0,2,0);
  ok('rotated thin-wall sweep yaw '+yaw.toFixed(2),!!hit&&hit.t>=0&&hit.t<1,{hit});
  const miss=A.sweptSAT(c,wall,15,16,2,16);
  ok('rotated offroad safe yaw '+yaw.toFixed(2),!miss,{miss});
}
function makeWorld(solid){return {nearby(x,z){return Math.hypot(x-solid.x,z-solid.z)<6?[solid]:[]},impactNearby:()=>[],panesNearby:()=>[]}}
function fixture(solid=wall){const g=fakeGame([]);g.world=makeWorld(solid);return g;}
function injectionStep(c,input,dt){c.x-=13;c.vx=-130;c.vz=0;c.speed=130;}
function forceFrame(g,start=15,dt=.016){const c=H.makeCar('player',start,0,Math.PI/2);c.vx=c.vz=c.speed=0;g.moveCar(c,dt,{gas:0,steer:0,brake:false,nitro:false});return c;}
const original=H.stepCar;
H.stepCar=A.guardIntegrator(injectionStep);
let g=fixture(),count=A.stats.clippedSteps,c=forceFrame(g);
ok('integrated high-speed sweep clipped crossing',A.stats.clippedSteps===count+1,{stats:A.stats});
ok('real native collision kept car before wall',c.x>=8+wall.hw+H.carBuildingFootprint(c).extentX-.05,{x:c.x});
ok('native wall impact, no double damage',g.impacts.length===1&&g.impacts[0].k==='wall',g.impacts);
ok('native collision reduces forward velocity',c.vx>-.1&&Number.isFinite(c.speed),{vx:c.vx,speed:c.speed});
ok('native world lookup catches intermediate obstacle',A.stats.broadphaseQueries>=3&&A.stats.narrowphaseTests>=1,A.stats);
g=fixture();ctx.__SUNSET_STAGE21_CCD_OFF=true;count=A.stats.clippedSteps;
const bypass=forceFrame(g);ctx.__SUNSET_STAGE21_CCD_OFF=false;
ok('A/B disable restores exact old penetration',bypass.x<wall.x-wall.hw-1&&g.impacts.length===0,{x:bypass.x});
ok('A/B disable avoids all stage21 clipping',A.stats.clippedSteps===count,{stats:A.stats});
ctx.location.search='?stage21CCDOff=1';g=fixture();count=A.stats.clippedSteps;
const queryOff=forceFrame(g);ctx.location.search='';
ok('query-string A/B disable works',queryOff.x<7&&A.stats.clippedSteps===count,{x:queryOff.x});
// Raised-road tests: the native path does not collide with ground-level buildings
// below a real elevated road, and this guard must not change that.
const roadRaised=H.roadRaised477;
H.roadRaised477=()=>2.2;
g=fixture();count=A.stats.clippedSteps;
const raised=forceFrame(g);H.roadRaised477=roadRaised;
ok('raised road skips unrelated ground obstacle',raised.x<7&&A.stats.clippedSteps===count,{x:raised.x});
ok('elevated skip telemetry reported',A.stats.roadGradeSkips>0,A.stats);
// Overpass source distinguishes deck rail colliders from ground solids at same X/Z.
const deckSolid={x:224,z:-432,hw:.055,hd:5};
function deckFixture(rails){const g=fixture();g.world={overpass443:{rails},nearby:()=>[deckSolid],impactNearby:()=>[],panesNearby:()=>[]};return g;}
function forceDeck(g){const c=H.makeCar('player',231,-432,Math.PI/2);c.deck443=true;c.vx=c.vz=c.speed=0;g.moveCar(c,.016,{gas:0,steer:0,brake:false,nitro:false});return c;}
g=deckFixture([]);count=A.stats.clippedSteps;
const groundUnderDeck=forceDeck(g);
ok('overpass lane does not collide with ground obstacle',groundUnderDeck.x<219&&A.stats.clippedSteps===count,{x:groundUnderDeck.x});
ok('deck remains elevated during legal passage',groundUnderDeck.deck443===true,{deck:groundUnderDeck.deck443});
g=deckFixture([deckSolid]);count=A.stats.clippedSteps;
const deckRail=forceDeck(g);
ok('overpass rail stays solid at high speed',deckRail.x>224&&A.stats.clippedSteps===count+1,{x:deckRail.x});
ok('deck rail preserves original damage reaction',g.impacts.length===1,g.impacts);
H.stepCar=original;
// Normal real driving uses the exact native solver trajectory when no obstacle is crossed.
const input={gas:.4,steer:.08,brake:false,nitro:false};
for(const speed of [0,12,34,52,77]){
 const c1=H.makeCar('player',-45,-40,0),c2=H.makeCar('player',-45,-40,0);
 for(const v of [c1,c2]){v.vz=-speed;v.speed=speed;}
 const g1=fakeGame([]),g2=fakeGame([]);
 g1.moveCar(c1,.033,input);
 ctx.__SUNSET_STAGE21_CCD_OFF=true;g2.moveCar(c2,.033,input);ctx.__SUNSET_STAGE21_CCD_OFF=false;
 const d=Math.hypot(c1.x-c2.x,c1.z-c2.z)+Math.abs(c1.speed-c2.speed);
 ok('normal driving identical with A/B at speed '+speed,d<1e-9,{delta:d});
}
// Multiple long-frame and narrow-wall scenarios through the original engine.
let safety=0;for(const v of [34,55,77,98,118])for(const dt of [.016,.033,.05,.075,.1]){
 const c=H.makeCar('player',0,13,0);c.vz=-v;c.speed=v;
 const s={x:0,z:8,hw:3,hd:.065};
 const g=fakeGame([s]);g.moveCar(c,dt,{gas:0,steer:0,brake:false,nitro:false});
 if(c.z>=s.z-s.hd-2&&Number.isFinite(c.vx+c.vz+c.speed))safety++;
}
ok('25 real car speed/frame scenarios avoid tunnelling',safety===25,{safety});
ok('car world guard keeps native crashVehicle function',typeof C.prototype.crashVehicle==='function');
ok('world geometry unchanged by safety test',!A.stats.anomalies,A.stats);
const result={stage:21,issueId:'S01-PH-01',source:'real installed Game.prototype.moveCar and Heatline.stepCar with fake collision world, CPU only',testCases:checks.length,passed:checks.filter(c=>c.passed).length,failures,checks,stats:A.stats,realGpuVerified:false};
fs.writeFileSync(root+'/QA/STAGE21_HIGH_SPEED_ACCEPTANCE.json',JSON.stringify(result,null,2)+'\n');
console.log('STAGE21 ACCEPTANCE',result.passed+'/'+checks.length,'failed',failures.length);
if(failures.length)process.exitCode=2;
