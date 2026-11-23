const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(root,'engine44.js'),'utf8');
let n=0;function check(x,m){assert(x,m);n++;}
check(s.includes("a.mode==='hunt'&&nearFish&&a.modeTimer>0"),'live hunt targeting');
check(s.includes('a.goalX=fish.x;a.goalZ=fish.z'),'fish coordinate tracking');
check(s.includes("a.mode!=='hunt'&&a.mode!=='dive'"),'do not overwrite hunt and escape goals');
check(s.includes('crocodiles.some(a=>camera(a)<195)'),'early authored model preload');
check(s.includes('let crocodileBudget=3'),'retained GPU budget');
check(s.includes("this.selection.set(croc,'crocodile_hi')"),'authored model selection');
check(fs.existsSync(path.join(root,'assets/crocodile_hi.js')),'original croc model');
check(fs.existsSync(path.join(root,'assets/heron_hi.js')),'original heron model');
check(fs.existsSync(path.join(root,'assets/flamingo_hi.js')),'original flamingo model');
check(fs.existsSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png')),'chosen city layout');
check(s.includes('this.updateBird(a,dt,daylight,rain)'),'bird behavior retained');
check(s.includes('this.updateDolphin(a,dt,dusk,rain)'),'dolphin behavior retained');
fs.writeFileSync(path.join(__dirname,'ANIMAL_RECOVERY03_ACCEPTANCE.json'),JSON.stringify({phase:3,passed:n,tests:n,scope:'static code and asset checks; no GPU or visual validation'},null,2));
console.log('Animal recovery phase03 '+n+'/'+n+' PASS');
