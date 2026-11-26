'use strict';
/* Actual simulation equivalence plus collision/threat broadphase boundaries.
 * DOM and rendering are simulated: this is not a browser/GPU FPS benchmark. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
process.env.SUNSET_QA_SEED = '520126';
const env = require('./stage51_bootstrap.cjs');
const {H,g,advance} = env;
const precision = n => Number.isFinite(n) ? +n.toFixed(8) : n;
function runScenario(enabled) {
  H.cpu52.enabled = enabled;
  Object.assign(g.avatar,{x:-32,z:-32,y:H.outdoorHeight(-32,-32),vx:0,vz:0});
  g.inVehicle = false;
  const frames = [];
  for (let i=0;i<60;i++) {
    advance(1000/60); g.update(1/60);
    if (i%10 === 9) frames.push({
      cars:[g.player,...g.civilian,...g.police].map(c=>['x','z','yaw','vx','vz','speed','hp'].map(k=>precision(c[k]))),
      people:g.pedestrians.map(w=>['x','y','z','yaw','vx','vz','panic','fear','injuryState','navState'].map(k=>precision(w[k]))),
      buses:g.buses.map(b=>[b.x,b.z,b.speed,b.yaw].map(precision)),
      hits:g.pedestriansHit,heat:g.heat,score:precision(g.score)
    });
  }
  return frames;
}
if(process.argv.includes('--baseline')) {
  console.log(JSON.stringify(runScenario(false))); process.exit(0);
}

let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const query = (list,x,z,r) => H.cpu52.createLocalIndex(list).querySquare(x,z,r);
check('cell boundaries, negatives, radius edges, duplicates and stable actor order',()=>{
  const list=[{x:64,z:-64},{x:-64,z:64},{x:0,z:0},{x:128,z:128},{x:38,z:0},{x:38.001,z:0}];
  list.splice(3,0,list[2]);
  for(const x of [-128,-64,-.01,0,63.99,64,128])for(const z of [-64,0,64])for(const r of [0,3.5,18,38,74]){
    const expected=list.filter(a=>Math.abs(a.x-x)<=r&&Math.abs(a.z-z)<=r);
    assert.deepEqual([...query(list,x,z,r)],expected);
  }
});
check('local candidates keep the actual danger decision and first vehicle identity',()=>{
  const w={...g.avatar,x:0,z:0,y:0,deck443:false,coastDeck461:false};
  const base={...g.player,alive:true,wrecked:false,speed:20,vx:20,vz:0,deck443:false,coastDeck461:false};
  const list=[{...base,x:-400,z:0},{...base,x:-15,z:0},{...base,x:0,z:2,vx:0,vz:0,speed:0},{...base,x:-9,z:1}];
  assert.equal(H.pedestrianPredictedDanger(w,list),H.pedestrianPredictedDanger(w,query(list,w.x,w.z,38)));
  assert.equal(H.pedestrianPredictedDanger(w,list),list[1]);
  for(const z of [0,1,4,38,38.01,72]) {
    w.z=z;
    assert.equal(H.pedestrianPredictedDanger(w,list),H.pedestrianPredictedDanger(w,query(list,w.x,w.z,38)));
  }
});
check('crosswalk yielding keeps the actual rule at both city radii',()=>{
  for(const car of g.civilian.slice(0,25))for(const radius of [18,74]) {
    const predicate=w=>Math.abs(w.x-car.x)<radius&&Math.abs(w.z-car.z)<radius&&H.civilianYieldForCrossing(car,w);
    assert.equal(query(g.pedestrians,car.x,car.z,radius).some(predicate),g.pedestrians.some(predicate));
  }
});

// None of the queries above advances the game. Reset the counters before the
// seeded comparison; neither approach substitutes fake collision functions.
for(const key in H.cpu52.stats) H.cpu52.stats[key]=0;
const before = spawnSync(process.execPath,[__filename,'--baseline'],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
assert.equal(before.status,0,before.stderr || before.stdout);
const expected=JSON.parse(before.stdout);
const actual=JSON.parse(JSON.stringify(runScenario(true)));
check('60 full actual Game steps preserve traffic, pedestrians, buses and outcomes',()=>assert.deepEqual(actual,expected));
const stats={...H.cpu52.stats};
check('real city updates use fewer candidate visits without actor throttling',()=>{
  assert.ok(stats.builds>=120); assert.ok(stats.queries>1000);
  assert.ok(stats.bucketCandidates<stats.fullScanCandidates*.45,JSON.stringify(stats));
});
check('flight light follows aircraft and replaces the on-foot anchor light',()=>{
  const flight=g.flight51;flight.pilot=true;
  Object.assign(flight.plane,{x:350,z:H.reference469.runway.z,y:H.reference469.runway.elevation+2,yaw:Math.PI/2,pitch:0,gear:1});
  const lights=g.sceneLights(),beam=lights.find(l=>l.landing52);
  assert.ok(beam);assert.ok(beam.x>flight.plane.x+10);assert.ok(Math.abs(beam.dirZ)<1e-9);
  assert.ok(!lights.some(l=>l.x===g.avatar.x&&l.z===g.avatar.z&&l.radius===13));
  flight.plane.gear=0;assert.ok(!g.sceneLights().some(l=>l.landing52));
  flight.pilot=false;
});
const warnings=env.warnings.filter(x=>x!=='Audio unavailable ReferenceError: AudioContext is not defined');
assert.deepEqual(warnings,[]);assert.deepEqual(env.errors,[]);
const report={passed,stepsCompared:60,scenarios:'seeded downtown simulation; exact actor state comparison every ten steps',stats,
  candidateVisitReductionPct:+((1-stats.bucketCandidates/stats.fullScanCandidates)*100).toFixed(2),gpu:false};
if(process.env.STAGE52_CPU_REPORT)fs.writeFileSync(process.env.STAGE52_CPU_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
