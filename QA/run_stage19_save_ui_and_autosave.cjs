'use strict';
/* UI contract/autosave test, original Game with headless DOM, no real browser pixels. */
const fs=require('fs'),path=require('path');const {g,H,ctx}=require('./stage05_bootstrap.cjs');
g.nav445.draw=()=>{};g.refreshMissionBoard=()=>{};
let pass=0,total=0;const failed=[];
const ok=(name,v)=>{total++;if(v)pass++;else{failed.push(name);console.error('FAIL',name);}};
const main=ctx.document.getElementById('main-menu').children.find(x=>x.id==='stage19-main-save-panel');
const pause=ctx.document.getElementById('pause-menu').children.find(x=>x.id==='stage19-pause-save-panel');
ok('main-menu persistent save controls',!!main);
ok('pause-menu persistent save controls',!!pause);
for(const [name,p] of [['main',main],['pause',pause]]){
  ok(name+' has actions surface',p.children.some(e=>e.className==='s19-actions'));
  const actions=p.children.find(e=>e.className==='s19-actions');
  ok(name+' includes slot picker',actions.children.some(e=>e.id==='select'));
  ok(name+' offers save/load/export/import',actions.children.filter(e=>e.id==='button').map(e=>e.textContent).join('|').includes('שמור|')&&actions.children.filter(e=>e.id==='button').length===4);
  ok(name+' shows text status',p.children.some(e=>e.attributes||e.textContent.includes('F5')));
}
ok('two status slots are wired',g.stage19SaveSystem.statusEls.length===2);
g.restart({reuseWorld:true});
g.footHealth=46;g.worldHour=2.5;
ok('manual slot saved from live Game',g.stage19SaveNow('slot1').ok);
ok('UI messages update both status surfaces',g.stage19SaveSystem.statusEls.every(e=>e.textContent.includes('נשמרה')));
const prior=g.stage19SaveSystem.list().find(v=>v.slot==='auto');
ok('no auto save on first initialization',!prior.exists);
g.seconds=100;g.stage19SaveSystem.lastAutosave=0;
try{g.update(.016);ok('native update triggers bounded autosave',g.stage19SaveSystem.list().find(v=>v.slot==='auto').exists);}
catch(e){ok('native update triggers bounded autosave',false);console.error('AUTO ERROR',e.stack?.slice(0,500));}
const d=H.stage19Save.readSlot('auto')?.data;
ok('auto save captured live health and time',d?.scalars.footHealth===46&&d?.scalars.worldHour===2.5);
const first=H.stage19Save.readSlot('auto')?.raw;
g.seconds=140;try{g.update(.016);}catch{}
ok('autosave throttles writes',H.stage19Save.readSlot('auto')?.raw===first);
const output={stage:19,passed:pass,total,failed,caveat:'Headless DOM; no GPU/browser screenshots'};
fs.writeFileSync(path.join(__dirname,'STAGE19_UI_AND_AUTOSAVE.json'),JSON.stringify(output,null,2));
console.log('STAGE19 UI AUTO',pass+'/'+total,failed.length?'FAIL':'PASS');if(failed.length)process.exit(1);
