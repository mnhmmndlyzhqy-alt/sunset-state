/* SUNSET STATE — cumulative 33/35: civic gameplay, transparent wallet,
 * safe police pedestrian yield and mission usability.
 * Original mission, evidence, shop, garage and save systems are preserved.
 * Runtime A/B: ?stage33CityOff=1. No remote resources, new vehicles or colliders.
 * CPU acceptance is NOT GPU/FPS or human visual certification. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const stats={installed:false,extraMissions:0,missionRecommendations:0,missionStarts:0,
    walletReceipts:0,walletPositive:0,walletNegative:0,policeYieldChecks:0,
    policePedestrianBrakes:0,policeCreeps:0,changedColliders:0,
    changedVehicles:0,changedBaseRewards:0,gpuVerified:false,hd50fpsVerified:false};
  const off=()=>globalThis.__SUNSET_STAGE33_CITY_OFF===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
     new URLSearchParams(location.search||'').get('stage33CityOff')==='1');
  const money=g=>Number.isFinite(g?.profile?.credits)?g.profile.credits:null;
  const el=id=>typeof document==='undefined'?null:document.getElementById(id);
  function civicMissions(world){
    const shops=world?.retailShops||[],venues=world?.streetVenues||[],hubs=world?.explorationHubs||[];
    const shop=k=>shops.find(s=>s.kind===k),place=k=>venues.find(v=>v.kind===k),garden=place('garden');
    const pharmacy=shop('pharmacy'),bakery=shop('bakery'),gallery=shop('gallery');
    const cafe=place('cafe'),neighbourhood=hubs.find(h=>h.kind==='garden')||hubs[0];
    const list=[];
    // These are genuine existing game events, never simulated one-button completions.
    if(pharmacy&&garden)list.push({id:'stage33_neighbours',icon:'🤝',title:'שכנים טובים',
      description:'הכירו תושב, רכשו ערכת עזרה בבית מרקחת וסיימו בטיול בגינה.',reward:185,xp:80,
      steps:[{type:'talk',label:'שוחח עם תושב חדש ברחוב · V'},
        {type:'buy',id:pharmacy.id,shop:pharmacy.kind,x:pharmacy.x,z:pharmacy.z,
          label:'קנה ערכת עזרה בבית המרקחת · O בדלפק'},
        {type:'venue',id:garden.id,x:garden.x,z:garden.z,label:'בקר בגינה ציבורית · E'}]});
    if(cafe&&gallery&&neighbourhood)list.push({id:'stage33_culture',icon:'🎨',title:'סיפור של עיר',
      description:'בקר בבית קפה ובגלריה, ואז תעד נקודת עניין קיימת במצלמה.',reward:220,xp:95,
      steps:[{type:'venue',id:cafe.id,x:cafe.x,z:cafe.z,label:'בקר בבית הקפה · E'},
        {type:'venue',id:gallery.id,x:gallery.x,z:gallery.z,label:'בקר בגלריה · E'},
        {type:'photo',x:neighbourhood.x,z:neighbourhood.z,label:'צלם נקודת עניין ברובע · Z'}]});
    if(bakery&&neighbourhood&&(H.BUS_STOPS||[]).length>1)list.push({id:'stage33_commuter',icon:'🚌',title:'בוקר בדרכים',
      description:'קנה מאפה, סע לפחות תחנה אחת באוטובוס וצא לחקור כיכר.',reward:235,xp:105,
      steps:[{type:'buy',id:bakery.id,shop:bakery.kind,x:bakery.x,z:bakery.z,
        label:'קנה מאפה במאפייה · O בדלפק'},
        {type:'busRide',x:H.BUS_STOPS[1].x,z:H.BUS_STOPS[1].z,label:'עלה על אוטובוס ורד בתחנה אחרת · E'},
        {type:'hub',id:neighbourhood.id,x:neighbourhood.x,z:neighbourhood.z,label:'גלה נקודת עניין · E'}]});
    return list;
  }
  function recommended(g){
    if(!g?.missions30||g.missions30.current||off())return null;
    const focus=g.inVehicle?g.player:g.avatar;
    const available=g.missions30.catalog.filter(m=>g.missions30.stage(m.id)<m.steps.length);
    if(!focus||!available.length)return null;
    available.sort((a,b)=>{
      const one=a.steps[g.missions30.stage(a.id)],two=b.steps[g.missions30.stage(b.id)];
      const d=s=>Number.isFinite(s.x)&&Number.isFinite(s.z)?Math.hypot(s.x-focus.x,s.z-focus.z):165;
      return d(one)-d(two)||a.id.localeCompare(b.id);
    });
    return available[0];
  }
  function ensure(g){
    if(!g||!g.profile||!g.missions30)return null;
    if(!g.stage33Ledger){g.stage33Ledger={balance:money(g),earn:0,spent:0,receipts:[],at:g.seconds||0};}
    // Saved slot restores are authoritative. A local session receipts panel must
    // never pretend that loading a different wallet is an earned transaction.
    if(g.stage19SaveSystem?.load&&!g.__stage33SaveWrapped){
      g.__stage33SaveWrapped=true;
      const originalLoad=g.stage19SaveSystem.load;
      g.stage19SaveSystem.load=function(...args){const result=originalLoad.apply(this,args);
        if(result?.ok)resetLedger(g);return result;};
    }
    const quick=el('stage33-start-suggested');
    if(quick&&!g.__stage33QuickBound){g.__stage33QuickBound=true;
      quick.addEventListener('click',()=>{
        if(off()||!g.running||g.paused||g.over||g.garageOpen||g.missionBoardOpen||g.missions30.current)return;
        const m=recommended(g);if(m)g.startMission30(m.id);
      });
    }
    return g.stage33Ledger;
  }
  function ledger(g,why='שינוי ביתרה',prior){
    if(off())return;
    const s=ensure(g),now=money(g);
    if(!s||now===null)return;
    const before=Number.isFinite(prior)?prior:s.balance;
    if(!Number.isFinite(before)){s.balance=now;return;}
    const delta=Math.round(now-before);
    if(delta){
      s.receipts.unshift({delta,why:String(why).slice(0,62),at:Math.round(g.seconds||0)});
      if(s.receipts.length>8)s.receipts.length=8;
      if(delta>0){s.earn+=delta;stats.walletPositive+=delta;}else{s.spent-=delta;stats.walletNegative-=delta;}
      stats.walletReceipts++;
    }
    s.balance=now;s.at=g.seconds||0;
  }
  function resetLedger(g){g.stage33Ledger={balance:money(g),earn:0,spent:0,receipts:[],at:g.seconds||0};}
  function ui(g){
    if(off())return;
    const s=ensure(g);if(!s)return;
    const m=recommended(g),quick=el('stage33-start-suggested');
    if(quick){const show=!g.missions30.current&&!!m&&g.running&&!g.over&&!g.paused&&!g.garageOpen;
      quick.classList.toggle('hidden',!show);if(show){quick.textContent='▶ מומלצת: '+m.title;
        quick.setAttribute('aria-label','התחל משימה מומלצת: '+m.title);}}
    const hint=el('stage33-brief');if(hint){
      const current=g.missions30.current;
      hint.textContent=current?'📌 '+current.title+' · יעד '+(g.missions30.stage(current.id)+1)+'/'+current.steps.length:
        m?'🧭 המשימה הקרובה: '+m.title+' · '+m.reward+' קרדיטים':'🏆 כל המשימות הושלמו';
    }
    const status=el('stage33-economy');if(status){
      status.textContent='🪙 יתרה '+s.balance+' · הרווחת '+s.earn+' · הוצאת '+s.spent+' בסשן';
    }
    const details=el('stage33-receipts');if(details){
      details.textContent=s.receipts.length?s.receipts.slice(0,3).map(r=>
        (r.delta>0?'+':'')+r.delta+' · '+r.why).join('  |  '):'פעולות כספיות יוצגו כאן. היתרה עצמה נשמרת כרגיל.';
    }
    const law=el('stage33-law-context');
    if(law){const report=g.law460?.pending?.length||0;
      law.textContent=g.crimeHeat>0?(g.policeInSight?'👁 זוהית על־ידי שוטרים':
        '🔎 החיפוש מבוסס על מיקום הדיווח האחרון')+' · ניידות '+g.police.length+'/'+H.patrolCap(g.crimeHeat):
        report?'☎ '+report+' דיווחים ממתינים; אין מרדף ללא דיווח':'אין חיפוש פעיל';
    }
  }
  function policeCrowdRisk(g,car){
    if(!g||!car||!Array.isArray(g.pedestrians)||!H.vehicleAxes)return 0;
    const axis=H.vehicleAxes(car);
    const speed=Math.abs(car.speed||0);
    const range=clamp(8+speed*.7,10,19);
    let best=0;
    for(const p of g.pedestrians){
      if(!p||p.injuryState!=='walking'||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
      const dx=p.x-car.x,dz=p.z-car.z;
      if(Math.abs(dx)>range||Math.abs(dz)>range)continue;
      const ahead=dx*axis.fx+dz*axis.fz;
      if(ahead<1||ahead>range)continue;
      const lateral=Math.abs(dx*axis.rx+dz*axis.rz);
      if(lateral>2.45)continue;
      if(typeof H.sameRoadLevel443==='function'&&!H.sameRoadLevel443(car,p))continue;
      const risk=clamp((range-ahead)/Math.max(range-4,1),0,1)*clamp((2.6-lateral)/1.9,0,1);
      best=Math.max(best,risk);
      if(best>.92)break;
    }
    return best;
  }
  function policeYield(g,car,input){
    if(off()||car?.type!=='police'||!input||car.wrecked)return input;
    stats.policeYieldChecks++;
    const risk=policeCrowdRisk(g,car);
    if(risk<.3)return input;
    const speed=Math.abs(car.speed||0);
    if(speed<2.1){
      // Slow crawl rather than a perpetual road-block on a stationary citizen.
      const gas=Math.min(Math.max(0,input.gas||0),.07);
      stats.policeCreeps++;
      return {...input,gas,brake:false};
    }
    const urgency=clamp((risk-.3)*1.5,0,1);
    if(urgency<.12)return input;
    stats.policePedestrianBrakes++;
    // Original input uses negative gas for engine/service braking; avoid
    // toggling the handbrake which would cause an unintended spin.
    return {...input,gas:-clamp(urgency*.65,.06,.68),brake:false};
  }
  function install(Game){
    if(stats.installed||!Game?.prototype||!H.MissionJournal30)return;
    const OriginalJournal=H.MissionJournal30;
    H.MissionJournal30=class Stage33Journal extends OriginalJournal{
      constructor(world){super(world);if(!off()){
        const previousCount=this.catalog.length,existing=new Set(this.catalog.map(m=>m.id));
        for(const m of civicMissions(world))if(!existing.has(m.id))this.catalog.push(m);
        stats.extraMissions=this.catalog.length-previousCount;
      }}
    };
    const proto=Game.prototype;
    const coreHUD=proto.updateHUD;
    proto.updateHUD=function(...args){const ret=coreHUD.apply(this,args);
      if(!off()){if(!this.__stage33UpdateInProgress&&!this.__stage33TxnInProgress)ledger(this,'עדכון יתרה');ui(this);}return ret;};
    const coreBoard=proto.refreshMissionBoard;
    proto.refreshMissionBoard=function(...args){const ret=coreBoard.apply(this,args);if(!off())ui(this);return ret;};
    const coreMove=proto.moveCar;
    proto.moveCar=function(car,dt,input){return coreMove.call(this,car,dt,policeYield(this,car,input));};
    const transactions=[['missionAction30','תגמול משימה'],['useCityService','דלק ושירות'],
      ['buyCityItem30','רכישה בחנות'],['repairInGarage','תיקון במוסך'],
      ['buyOrEquip','רכב מהמוסך'],['purchaseUpgrade','שדרוג רכב'],
      ['stage44SellVehicle','עסקת מכירת רכב'],['resolveArrest442','קנס משטרה']];
    for(const [method,reason] of transactions)if(typeof proto[method]==='function'){
      const original=proto[method];proto[method]=function(...args){
        if(off())return original.apply(this,args);
        ensure(this);const before=money(this);this.__stage33TxnInProgress=(this.__stage33TxnInProgress||0)+1;
        let result;
        try{result=original.apply(this,args);}
        finally{this.__stage33TxnInProgress--;ledger(this,reason,before);ui(this);}
        return result;
      };
    }
    const coreUpdate=proto.update;
    proto.update=function(dt,...rest){if(off())return coreUpdate.call(this,dt,...rest);
      ensure(this);this.__stage33UpdateInProgress=true;
      let ret;try{ret=coreUpdate.call(this,dt,...rest);}finally{
        this.__stage33UpdateInProgress=false;ledger(this,'חקר עיר ומרוץ');
      }return ret;};
    const coreStart=proto.startMission30;
    proto.startMission30=function(id){const before=this.missions30?.active;
      const ret=coreStart.call(this,id);
      if(!off()&&before!==this.missions30?.active&&this.missions30?.active)stats.missionStarts++;
      return ret;};
    const coreRestart=proto.restart;
    proto.restart=function(...args){const ret=coreRestart.apply(this,args);if(!off()){resetLedger(this);ui(this);}return ret;};
    H.stage33CityGameplay.OriginalJournal=OriginalJournal;
    stats.installed=true;
  }
  H.stage33CityGameplay={install,stats,off,civicMissions,recommended,ledger,resetLedger,
    policeCrowdRisk,policeYield};
})(Heatline);
