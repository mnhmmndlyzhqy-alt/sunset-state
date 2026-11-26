'use strict';
const assert=require('node:assert/strict');
process.env.SUNSET_QA_SEED||='53';
const {H,g,ctx,warnings,errors}=require('./stage51_bootstrap.cjs');
const checks=[];
function test(name,fn){fn();checks.push(name);}
const plain=x=>JSON.parse(JSON.stringify(x));
const place=p=>{
 Object.assign(g,{running:true,paused:false,over:false,inVehicle:false,indoor:null,retailVisit:null,
  boat444:null,roofVisit:null,onBus:-1,onTram:-1,showFullMap:false,missionBoardOpen:false,
  garageOpen:false,entryTransition:null,exitTransition:null,vehicleEntry:null});
 g.flight51.pilot=false;
 Object.assign(g.avatar,p,{y:H.outdoorHeight(p.x,p.z),grounded:true,deck443:false,coastDeck461:false,swim445:null,vx:0,vz:0});
};
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 g.restart({reuseWorld:true});
 const api=H.estate53,chat=H.realism39.chat48;
 place(g.world.estate53.office);g.profile.credits=5000;
 assert.equal(api.purchase(g,'housing').ok,true);
 assert.equal(api.offer(g,'maya','a1',12).status,'accepted');
 assert.equal(api.approve(g,'maya').ok,true);
 const who=g.world.estate53.actors.get('maya'),unit=who.estateUnit;
 const text=input=>chat.think(who,input).parts.join(' ');
 test('approved residents join the actual conversation pool and retain their name, unit and signed rent',()=>{
  Object.assign(who,unit.walk.at(-1));place({x:who.x-1.1,z:who.z});
  assert.equal(chat.nearestPerson(g),who);
  assert.equal(chat.canContinue(g,who),true);
  assert.match(text('איך קוראים לך?'),/מאיה ברק/);
  assert.match(text('איפה הדירה שלך?'),/א׳ 1/);
  assert.match(text('כמה השכירות לפי החוזה?'),/12 קרדיטים/);
  assert.match(text('כמה השכירות לפי החוזה?'),/120 שניות/);
  const before=plain(api.snapshot()),credits=g.profile.credits;
  assert.match(text('אפשר להוריד את השכירות?'),/כבר חתום/);
  assert.deepEqual(plain(api.snapshot()),before);
  assert.equal(g.profile.credits,credits);
 });
 test('resident feedback follows the actual purchased services and keeps the previous name-memory dialogue',()=>{
  assert.match(text('מה צריך לשפר באי?'),/מים/);
  place(g.world.estate53.office);assert.equal(api.purchase(g,'water').ok,true);
  assert.match(text('מה צריך לשפר באי?'),/חשמל/);
  assert.equal(api.purchase(g,'power').ok,true);
  assert.match(text('מה חסר באי?'),/ריהוט/);
  assert.equal(api.purchase(g,'furniture').ok,true);
  assert.match(text('מה חסר באי?'),/גינה/);
  chat.think(who,'קוראים לי מנדי');
  assert.match(text('מה השם שלי?'),/מנדי/);
  for(const p of api.applicants()){
   const actor=H.createWalker(0,0,0,p.appearance);actor.appearance=p.appearance;
   const voice=H.realism39.voiceForWalker(actor);
   assert.equal(/woman|girl|_f/.test(voice),p.female,'voice agrees with authored resident appearance');
  }
 });
 test('island directions, activity replies and public-island conversations use live world membership',()=>{
  assert.match(text('איך מגיעים לאי שלי?'),/כבר באי שלך/);
  who.estateActivity53='garden';assert.match(text('מה את עושה?'),/גינה/);
  const local=H.islands53.states.get(g.world).actors[0];
  place({x:local.x-1,z:local.z});
  assert.equal(chat.canContinue(g,local),true);
  const saved=local.injuryState;local.injuryState='dead';
  assert.equal(chat.canContinue(g,local),false);local.injuryState=saved;
  const city=g.pedestrians.find(a=>a.injuryState==='walking'&&!a.storyContact445&&!a._witness460);
  assert.ok(city);
  assert.match(chat.think(city,'איך מגיעים לאי הפרטי?').parts.join(' '),/ממזרח לעיר/);
  assert.match(chat.think(city,'איך מגיעים לאי הפרטי?').parts.join(' '),/B/);
  api.restore(null);H.estate53World.sync(g);place(who);
  assert.equal(chat.canContinue(g,who),false,'old resident cannot remain a conversation target after lease removal');
 });
 test('actual game effect ducking composes with volume, mute and recovery',()=>{
  const synth=g.synth,old={ctx:synth.ctx,master:synth.master,enabled:synth.enabled,volume:synth.volume,voiceDucking:synth.voiceDucking};
  const calls=[];
  synth.ctx={currentTime:4,state:'running'};
  synth.master={gain:{setTargetAtTime(...args){calls.push(args);}}};
  try{
   synth.setEnabled(true);synth.setVolume(.5);synth.setVoiceDucking(.75);
   assert.ok(Math.abs(calls.at(-1)[0]-.21)<1e-9);assert.equal(calls.at(-1)[2],.06);
   synth.setVolume(.8);assert.ok(Math.abs(calls.at(-1)[0]-.336)<1e-9);
   synth.setEnabled(false);assert.equal(calls.at(-1)[0],0);
   synth.setVoiceDucking(1);assert.equal(calls.at(-1)[0],0);assert.equal(calls.at(-1)[2],.16);
   synth.setEnabled(true);assert.ok(Math.abs(calls.at(-1)[0]-.448)<1e-9);
   synth.setVoiceDucking(NaN);assert.equal(synth.voiceDucking,1);
  }finally{Object.assign(synth,old);}
 });
 assert.equal(errors.length,0,errors.join('\n'));
 assert.ok(warnings.every(w=>w.includes('AudioContext is not defined')),warnings.join('\n'));
 console.log(JSON.stringify({passed:checks.length,checks,browser:false,audioPlayback:false},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
