/* SUNSET STATE — manual session saves with atomic browser slots and portable import/export. */
(function(H){'use strict';
  const SCHEMA=19, PREFIX='sunset_state_stage19_', MAX_BYTES=512*1024;
  const SLOTS=['slot1','slot2','slot3'];
  const num=(v,def,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):def;
  const integer=(v,def,min,max)=>Math.round(num(v,def,min,max));
  const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const bit=v=>v===true;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const hash=s=>{let a=2166136261>>>0;for(let i=0;i<s.length;i++){a^=s.charCodeAt(i);a=Math.imul(a,16777619)>>>0;}return ('00000000'+a.toString(16)).slice(-8);};
  const carFields=['x','z','yaw','vx','vz','speed','hp','paint','wheelSpin','wheelSteer','steer','yawRate',
    'bodyPitch','bodyRoll','suspension','tireSlip','frontDamage','rearDamage','glassDamage','tireWear',
    'damagedWheel','springVelocity','pitchVelocity','rollVelocity','bodyStyle','tuneEngine','tuneGrip',
    'tuneBrakes','burnTime','wreckAge','explosionCount','engineDamage','brakeDamage','suspensionDamage',
    'steeringBias','crashCount','lastImpactSpeed','surfaceGrip','brakeTemperature','fuel'];
  const carBooleans=['alive','wrecked','policeOrigin','stolenPolice','siren','owned48'];
  const numFields=['totalCoins','best','score','seconds','heat','crimeHeat','lawEvidence','footHealth',
    'pedestriansHit','barriersBroken','shotsFired','panelsBroken','vehiclesTagged','collectedInRun',
    'shopRobberies44','bankRobberies44','soldCars44','conversations','grenadesLeft','chargesLeft',
    'magazine','ammoReserve','weaponMode','footCameraYaw','worldHour','cameraMode'];
  function captureCar(c){if(!plain(c))return null;const r={};for(const key of carFields){if(Number.isFinite(c[key]))r[key]=c[key];}
    for(const key of carBooleans)if(typeof c[key]==='boolean')r[key]=c[key];
    for(const key of ['panelDamage','wheelDamage'])if(Array.isArray(c[key]))r[key]=c[key].slice(0,8).map(v=>num(v,0,0,100));
    if(Array.isArray(c.panelDetached))r.panelDetached=c.panelDetached.slice(0,8).map(Boolean);
    if(typeof c.market44==='string')r.market44=c.market44.slice(0,60);
    if(typeof c.vehicleClass==='string')r.vehicleClass=c.vehicleClass.slice(0,32);
    return r;
  }
  function capture(g){
    if(!g?.running||g.over)throw Error('אפשר לשמור רק במהלך משחק פעיל');
    if(g.entryTransition||g.exitTransition||g.vehicleEntry)throw Error('סיים מעבר דלת או כניסה לרכב לפני שמירה');
    const scalars={};for(const key of numFields)if(Number.isFinite(g[key]))scalars[key]=g[key];
    const a=g.avatar||{},anchor=H.transport53?.saveAnchor(g)??a,avatar={x:anchor.x,z:anchor.z,yaw:a.yaw,appearance:a.appearance,style:a.style,outfit460:a.outfit460||0};
    const mode=g.indoor?'building':g.retailVisit?'retail':g.inVehicle?'car':g.onTram>=0?'tram':g.onBus>=0?'bus':'foot';
    const visit=[...(g.visitRewards||[])].filter(v=>typeof v==='string'&&v.length<=160).slice(0,5000);
    const record={schema:SCHEMA,scalars,avatar,mode,inVehicle:bit(g.inVehicle),
      car:captureCar(g.player),
      indoor:g.indoor?{portalId:g.indoor.portalId,floor:g.indoor.floor}:null,
      retail:g.retailVisit?{venueId:g.retailVisit.venue?.id}:null,
      tram:g.onTram>=0?{index:g.onTram,walkX:g.trainWalkX,walkZ:g.trainWalkZ}:null,
      bus:g.onBus>=0?{index:g.onBus,walkZ:g.busWalkZ}:null,
      profile:clone(g.profile),missions:clone(g.missions30.serialize()),rewards:visit,
      talkedTo:[...(g.talkedTo||[])].filter(v=>typeof v==='number'&&Number.isFinite(v)).slice(0,1200),
      wallet:{coins:g.totalCoins,best:g.best},
      weather:{control:g.weather?.control,active:g.weather?.active,nextChange:g.weather?.nextChange},
      clockRunning:bit(g.clockRunning),
      race:g.race?{active:g.race.active,index:g.race.index,elapsed:g.race.elapsed,finished:g.race.finished}:null,
      weapons:{armed:bit(g.armed),magazines:Array.isArray(g.weaponMagazines)?g.weaponMagazines.slice(0,8):[],
        reserves:Array.isArray(g.weaponReserves)?g.weaponReserves.slice(0,8):[]},
      crimeHistory:plain(g.crimeHistory460)?clone(g.crimeHistory460):null,
      story:integer(g.story445?.step,0,0,100),
      property48:H.realism39?.property48?.snapshot(),
      estate53:H.realism39?.estate53?.snapshot(),fleet53:H.privateFleet53?.snapshot(),
      session:{visitTime:g.seconds,at:new Date().toISOString(),build:'CITY_UPDATE'}
    };
    const fleetOverride=H.privateFleet53?.captureOverride(g,record);
    if(fleetOverride)Object.assign(record,fleetOverride);
    return record;
  }
  function envelope(data){return {app:'SUNSET_STATE',schema:SCHEMA,checksum:hash(JSON.stringify(data)),data};}
  function parse(raw){
    if(typeof raw!=='string'||raw.length>MAX_BYTES||raw.length<20)throw Error('קובץ שמירה ריק או גדול מדי');
    let obj;try{obj=JSON.parse(raw);}catch{throw Error('מבנה JSON פגום');}
    if(!plain(obj)||obj.app!=='SUNSET_STATE'||obj.schema!==SCHEMA||!plain(obj.data)||obj.data.schema!==SCHEMA)
      throw Error('גרסת שמירה לא נתמכת');
    if(typeof obj.checksum!=='string'||hash(JSON.stringify(obj.data))!==obj.checksum)throw Error('בדיקת שלמות השמירה נכשלה');
    const d=obj.data;
    const parkedFleetCar=d.car===null&&d.mode!=='car'&&plain(d.fleet53)&&d.fleet53.version===1&&Array.isArray(d.fleet53.records)&&d.fleet53.records.some(r=>plain(r)&&r.kind==='car'&&/^car:[1-9][0-9]{0,8}$/.test(r.id));
    if(!plain(d.scalars)||!plain(d.avatar)||!plain(d.profile)||!plain(d.missions)||!Array.isArray(d.rewards)||(!plain(d.car)&&!parkedFleetCar))
      throw Error('חסרים נתונים חיוניים בשמירה');
    if(!['foot','car','building','retail','bus','tram'].includes(d.mode))throw Error('מצב שחקן לא תקין');
    if(d.rewards.length>5000||d.rewards.some(v=>typeof v!=='string'||v.length>160))throw Error('רשימת ביקורים פגומה');
    if(!Number.isFinite(d.avatar.x)||!Number.isFinite(d.avatar.z)||(!parkedFleetCar&&(!Number.isFinite(d.car.x)||!Number.isFinite(d.car.z))))
      throw Error('מיקום שחקן או רכב פגום');
    for(const k of ['x','z'])if(Math.abs(d.avatar[k])>12000||(!parkedFleetCar&&Math.abs(d.car[k])>12000))throw Error('מיקום מחוץ לגבולות');
    if(d.missions.schema!==30)throw Error('נתוני משימות לא תואמים');
    return d;
  }
  function validSlot(slot){if(!SLOTS.includes(slot))throw Error('משבצת שמירה לא תקינה');return slot;}
  function storage(){if(typeof localStorage==='undefined')throw Error('אחסון דפדפן אינו זמין');return localStorage;}
  function readSlot(slot){
    if(slot!=='auto')slot=validSlot(slot);let raw=null,backup=false;
    try{raw=storage().getItem(PREFIX+slot);}catch{throw Error('אין הרשאה לקרוא מהאחסון המקומי');}
    if(!raw)return null;
    try{return {data:parse(raw),raw,backup};}catch(err){
      const old=storage().getItem(PREFIX+slot+'_backup');
      if(old){try{return {data:parse(old),raw:old,backup:true};}catch{}}
      throw err;
    }
  }
  function writeSlot(slot,raw){
    if(slot!=='auto')validSlot(slot);parse(raw);
    const p=PREFIX+slot,st=storage();
    const old=st.getItem(p);let validOld=false;
    try{if(old){parse(old);validOld=true;}}catch{}
    try{
      st.setItem(p+'_pending',raw);
      if(st.getItem(p+'_pending')!==raw)throw Error('האחסון נכשל באימות כתיבה');
      if(validOld)st.setItem(p+'_backup',old);
      st.setItem(p,raw);
      if(st.getItem(p)!==raw)throw Error('השמירה לא נשמרה במלואה');
      st.removeItem(p+'_pending');
    }catch(err){throw Error('לא ניתן לשמור בדפדפן: '+(err.message||'נגמר שטח האחסון'));}
    return true;
  }
  function numberTo(target,key,value,limit=1000000){if(typeof value==='number'&&Number.isFinite(value))target[key]=num(value,0,-limit,limit);}
  function restoreCar(target,saved){if(!plain(saved))return;
    for(const key of carFields)if(typeof saved[key]==='number'&&Number.isFinite(saved[key])){
      let max=100000;
      if(key==='hp'||key==='fuel')max=100;
      if(/Damage|Wear|Bias|Grip/.test(key))max=100;
      target[key]=num(saved[key],target[key]||0,key==='hp'||key==='fuel'?0:-max,max);
    }
    for(const key of carBooleans)if(typeof saved[key]==='boolean')target[key]=saved[key];
    for(const [key,limit] of [['panelDamage',6],['wheelDamage',4]])if(Array.isArray(saved[key]))
      target[key]=saved[key].slice(0,limit).map(v=>num(v,0,0,100));
    if(Array.isArray(saved.panelDetached))target.panelDetached=saved.panelDetached.slice(0,6).map(Boolean);
    if(typeof saved.market44==='string')target.market44=saved.market44.slice(0,60);
    if(typeof saved.vehicleClass==='string')target.vehicleClass=saved.vehicleClass.slice(0,32);
    if(typeof saved.source53Id==='string'&&/^street:-?\d+:-?\d+:[\d.-]+$/.test(saved.source53Id)&&saved.source53Id.length<=80)target.source53Id=saved.source53Id;
    target.vx=num(target.vx,0,-160,160);target.vz=num(target.vz,0,-160,160);
    target.speed=num(target.speed,0,-160,160);
  }
  function locationOK(g,x,z){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=12000&&Math.abs(z)<=12000;}
  function safeOutside(g,x,z){
    if(!locationOK(g,x,z))return null;
    if(g.walkerPositionFree?.(x,z))return {x,z};
    for(const r of [1.2,2.5,4,6,9,13,19])for(let i=0;i<16;i++){
      const t=i*Math.PI/8,nx=x+Math.cos(t)*r,nz=z+Math.sin(t)*r;
      if(g.walkerPositionFree?.(nx,nz))return {x:nx,z:nz};
    }
    return null;
  }
  function apply(g,d){
    // Verify world references *before* reset so incompatible imported slots cannot lose a session.
    if(d.mode==='building'&&(!plain(d.indoor)||!g.world?.entrancePortals?.[d.indoor.portalId]?.interiorReady))
      throw Error('הבניין השמור אינו קיים בגרסה הנוכחית');
    if(d.mode==='retail'&&(!plain(d.retail)||!g.world?.retailShops?.some(v=>v.id===d.retail.venueId)))
      throw Error('החנות השמורה אינה קיימת בגרסה הנוכחית');
    // All essential data was validated before restarting: corrupted files cannot reset the session.
    const propertyChanged=H.realism39?.property48?.restore(d.property48)===true;
    const estateChanged=H.realism39?.estate53?.restore(d.estate53)===true;
    H.privateFleet53?.restore(d.fleet53);
    const rebuild=propertyChanged||estateChanged;
    g.restart({reuseWorld:!rebuild});
    if(g.world)g.world.__cars48=false;
    const profile=H.parseGarageProfile(clone(d.profile));
    g.profile=profile;g.applyProfileToCar(true);
    g.missions30.load(d.missions);
    g.visitRewards=new Set(d.rewards);
    for(const k of numFields)if(Object.prototype.hasOwnProperty.call(d.scalars,k)){
      const limit=['worldHour'].includes(k)?24:['seconds'].includes(k)?360000000:10000000;
      numberTo(g,k,d.scalars[k],limit);
    }
    g.worldHour=((num(g.worldHour,12.25,-240,240)%24)+24)%24;
    g.footHealth=num(g.footHealth,100,1,100);
    g.crimeHeat=integer(g.crimeHeat,0,0,5);g.heat=integer(g.heat,0,0,5);
    g.magazine=integer(g.magazine,12,0,200);g.ammoReserve=integer(g.ammoReserve,84,0,20000);
    g.grenadesLeft=integer(g.grenadesLeft,6,0,100);g.chargesLeft=integer(g.chargesLeft,5,0,100);
    g.clockRunning=bit(d.clockRunning);
    if(plain(d.weather)){g.weather.setControl(d.weather.control);
      if(H.WEATHER_ORDER29.includes(d.weather.active)&&d.weather.active!=='auto')g.weather.active=d.weather.active;
      g.weather.nextChange=num(d.weather.nextChange,100,1,300);}
    if(plain(d.crimeHistory))for(const k of ['arrests','fines','voluntary'])
      g.crimeHistory460[k]=integer(d.crimeHistory[k],g.crimeHistory460[k],0,100000);
    if(plain(d.race)){
      g.race.index=integer(d.race.index,0,0,100);g.race.elapsed=num(d.race.elapsed,0,0,10000000);
      g.race.finished=integer(d.race.finished,0,0,10000);
      // An active race cannot be resumed blindly without the transient gate/traffic setup.
      g.race.active=false;
    }
    if(plain(d.weapons)){
      g.armed=bit(d.weapons.armed);for(const [name,key] of [['magazines','weaponMagazines'],['reserves','weaponReserves']])
        if(Array.isArray(d.weapons[name]))g[key]=d.weapons[name].slice(0,5).map(v=>integer(v,0,0,20000));
    }
    restoreCar(g.player,d.car);
    H.privateFleet53?.reconcilePlayerCar?.(g);
    const x=num(d.avatar.x,g.avatar.x,-12000,12000),z=num(d.avatar.z,g.avatar.z,-12000,12000);
    const yaw=num(d.avatar.yaw,g.avatar.yaw,-Math.PI*128,Math.PI*128);
    let actual='foot',adjusted=false;
    if(d.mode==='building'&&plain(d.indoor)){
      const id=integer(d.indoor.portalId,-1,-1,10000),door=g.world.entrancePortals[id];
      if(door?.interiorReady&&g.enterBuilding(id)){
        const floor=integer(d.indoor.floor,0,0,100);
        const scene=g.sceneForFloor(g.indoor.plan,Math.min(floor,Math.max(0,g.indoor.plan.floorCount-1)));
        g.indoor.floor=Math.min(floor,Math.max(0,g.indoor.plan.floorCount-1));g.indoor.scene=scene;
        if(locationOK(g,x,z)&&x>scene.bounds.xmin+.32&&x<scene.bounds.xmax-.32&&z>scene.bounds.zmin+.32&&z<scene.bounds.zmax-.32){
          g.avatar.x=x;g.avatar.z=z;
        }else{g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z+1.4;adjusted=true;}
        g.avatar.y=scene.stage42Base+(g.indoor.floor*g.indoor.plan.floorHeight);
        actual='building';
      }
    } else if(d.mode==='retail'&&plain(d.retail)){
      const shop=g.world.retailShops.find(s=>s.id===d.retail.venueId);
      if(shop){g.enterRetail(shop,true);if(g.retailVisit){
        const b=g.retailVisit.scene.bounds;
        if(x>b.xmin+.4&&x<b.xmax-.4&&z>b.zmin+.4&&z<b.zmax-.4){g.avatar.x=x;g.avatar.z=z;}
        else{g.avatar.x=g.retailVisit.scene.entrance.x;g.avatar.z=g.retailVisit.scene.entrance.z+1.4;adjusted=true;}
        actual='retail';}
      }
    }
    if(actual==='foot'&&d.mode==='car'&&locationOK(g,g.player.x,g.player.z)){
      g.inVehicle=true;g.player.x=num(d.car.x,g.player.x,-12000,12000);g.player.z=num(d.car.z,g.player.z,-12000,12000);
      actual='car';
    }else if(actual==='foot'){
      const free=safeOutside(g,x,z);
      if(free){g.avatar.x=free.x;g.avatar.z=free.z;adjusted=free.x!==x||free.z!==z;}
      else{adjusted=true;}
      g.avatar.y=H.buildings52?.homeFloor(g.world,g.avatar)??H.outdoorHeight(g.avatar.x,g.avatar.z);g.inVehicle=false;
    }
    g.avatar.yaw=yaw;g.avatar.vx=0;g.avatar.vz=0;
    g.avatar.appearance=integer(d.avatar.appearance,g.avatar.appearance||0,0,4294967295);
    g.avatar.style=integer(d.avatar.style,g.avatar.style||1,0,25);
    g.avatar.outfit460=integer(d.avatar.outfit460,0,0,2);
    g.footCameraYaw=num(d.scalars?.footCameraYaw,yaw,-400,400);
    g.cameraTransfer=0;g.keys.clear();g.nav445?.open(false);
    g.indoor?.liftRide&&(g.indoor.liftRide=null);
    g.entryTransition=null;g.exitTransition=null;g.vehicleEntry=null;
    g.clockRunning=bit(d.clockRunning);
    // Restore durable progress after entry hooks to avoid awarding visited venues twice.
    g.missions30=new H.MissionJournal30(g.world);g.missions30.load(d.missions);
    g.profile=profile;g.visitRewards=new Set(d.rewards);
    if(Array.isArray(d.talkedTo))g.talkedTo=new Set(d.talkedTo.slice(0,1200).filter(v=>typeof v==='number'&&Number.isFinite(v)));
    g.score=num(d.scalars?.score,0,0,10000000);
    g.totalCoins=integer(d.wallet?.coins,g.totalCoins,0,100000000);
    g.best=integer(d.wallet?.best,g.best,0,100000000);
    if(g.story445)g.story445.step=integer(d.story,g.story445.step,0,100);
    if(g.inVehicle){g.cam={x:g.player.x+Math.sin(g.player.yaw)*9,y:7,z:g.player.z+Math.cos(g.player.yaw)*9,
      tx:g.player.x,ty:2,tz:g.player.z,fov:65};}
    else{g.cam={x:g.avatar.x+Math.sin(g.footCameraYaw)*4,y:g.avatar.y+3.6,
      z:g.avatar.z+Math.cos(g.footCameraYaw)*4,tx:g.avatar.x,ty:g.avatar.y+1.6,tz:g.avatar.z,fov:65};}
    g.updateGarageUI();g.refreshMissionBoard();g.updateHUD();
    return {mode:actual,adjusted,transportFallback:['bus','tram'].includes(d.mode),racePaused:bit(d.race?.active)};
  }
  function slotLabel(s){return {slot1:'משבצת 1',slot2:'משבצת 2',slot3:'משבצת 3',auto:'שמירת האי האוטומטית'}[s]||s;}
  function install(g){
    if(!g||g.__stage19Installed)return;g.__stage19Installed=true;
    const disabled=!!globalThis.__SUNSET_STAGE19_SAVES_OFF||new URLSearchParams(globalThis.location?.search||'').has('stage19SavesOff');
    if(disabled)return;
    const sys={status:'',selected:'slot1',statusEls:[],autoButtons:[],loading:false};
    g.stage19SaveSystem=sys;
    const note=msg=>{sys.status=String(msg);try{g.showInfo(msg,4);}catch{};
      for(const el of sys.statusEls||[])el.textContent=msg;};
    sys.save=(slot='slot1')=>{try{const raw=JSON.stringify(envelope(capture(g)));
      if(raw.length>MAX_BYTES)throw Error('גודל שמירה גדול מדי');
      writeSlot(slot,raw);
      note('✓ נשמרה '+slotLabel(slot));return {ok:true,size:raw.length,slot};
    }catch(e){note('שמירה נכשלה: '+e.message);return {ok:false,error:e.message};}};
    sys.refreshAuto=()=>{let exists=false;try{exists=!!readSlot('auto');}catch{};
      for(const el of sys.autoButtons){el.hidden=!exists;el.disabled=!exists;}return exists;};
    sys.saveAuto=()=>{
      if(sys.loading||!g.running||g.over||g.entryTransition||g.exitTransition||g.vehicleEntry)
        return {ok:false,deferred:true};
      try{const raw=JSON.stringify(envelope(capture(g)));
        if(raw.length>MAX_BYTES)throw Error('גודל שמירה גדול מדי');
        writeSlot('auto',raw);sys.refreshAuto();sys.autoError=null;return {ok:true,size:raw.length,slot:'auto'};
      }catch(e){if(sys.autoError!==e.message)note('שמירת האי נכשלה: '+e.message);sys.autoError=e.message;return {ok:false,error:e.message};}
    };
    sys.load=(slot='slot1')=>{try{const found=readSlot(slot);if(!found)throw Error('לא נמצאה שמירה במשבצת');
      let result;sys.loading=true;try{result=apply(g,found.data);}finally{sys.loading=false;}
      note('✓ נטענה '+slotLabel(slot)+(found.backup?' (גיבוי תקין)':'')+(result.adjusted?' · מיקום הותאם לבטיחות':'')+
        (result.transportFallback?' · תחבורה ציבורית חודשה בהליכה':'')+(result.racePaused?' · המרוץ הושהה':''));
      return {ok:true,...result,backup:found.backup};
    }catch(e){note('טעינה נכשלה: '+e.message);return {ok:false,error:e.message};}};
    sys.exportText=(slot='slot1')=>{const found=readSlot(slot);if(!found)throw Error('אין שמירה לייצוא');return found.raw;};
    sys.importText=(text,slot='slot1')=>{try{const parsed=parse(text);writeSlot(slot,JSON.stringify(envelope(parsed)));
      note('✓ הקובץ יובא אל '+slotLabel(slot)+' · בחר טען כדי להמשיך');return {ok:true};
    }catch(e){note('ייבוא נדחה: '+e.message);return {ok:false,error:e.message};}};
    sys.list=()=>[...SLOTS,'auto'].map(slot=>{try{const entry=readSlot(slot);return {slot,exists:!!entry,backup:!!entry?.backup,at:entry?.data.session?.at||null};}
      catch(e){return {slot,exists:false,invalid:true,error:e.message};}});
    g.stage19SaveNow=sys.save;g.stage19LoadNow=sys.load;
    globalThis.addEventListener?.('keydown',e=>{
      if(e.code!=='F5'||e.repeat)return;
      if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||''))return;
      e.preventDefault?.();e.stopImmediatePropagation?.();
      if(e.shiftKey){if(g.running&&globalThis.confirm&&!globalThis.confirm('לטעון שמירה ולהחליף את הסשן הנוכחי?'))return;
        sys.load(sys.selected);}else sys.save(sys.selected);
    },true);
    try{createUI(g,sys,note);}catch(err){/* The manual save API remains available without a DOM. */}
    return sys;
  }
  function createUI(g,sys,note){
    if(typeof document==='undefined'||!document.createElement)return;
    const stylesheet=document.createElement('style');stylesheet.textContent=`
      .s19-save-panel{position:absolute;z-index:13;bottom:clamp(10px,4vh,50px);left:50%;transform:translateX(-50%);max-width:min(94vw,530px);width:max-content;min-width:min(94vw,320px);display:flex;flex-direction:column;gap:8px;padding:12px 16px;border-radius:15px;border:1px solid #b6e4d060;background:#112e3ff0;box-shadow:0 15px 35px #05121b80;text-align:center;color:#e8fbf4;font-size:13px;direction:rtl;backdrop-filter:blur(8px)}
      .s19-save-panel .s19-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}.s19-save-panel button,.s19-save-panel select{border:1px solid #98cfb57d;background:#204f5b;color:#fff;padding:7px 11px;border-radius:8px;font:inherit;cursor:pointer;min-height:34px;display:inline-flex;align-items:center;justify-content:center}
      .s19-save-panel button:hover{background:#36727b}.s19-save-panel p{margin:0;color:#c7d6d4;font-size:12px}.s19-save-panel .s19-title{font-weight:bold;font-size:14px}
      @media(max-width:650px){.s19-save-panel{bottom:4px;font-size:11px;padding:6px;gap:4px}.s19-save-panel button,.s19-save-panel select{padding:5px 7px;min-height:29px}.s19-save-panel .s19-title{display:none}}`;
    document.head?.appendChild?.(stylesheet);
    const makePanel=(parent,id)=>{
      if(!parent||!parent.appendChild)return;
      const panel=document.createElement('section');panel.id=id;panel.className='s19-save-panel';
      const title=document.createElement('strong');title.textContent='שמירה וטעינה · SUNSET STATE';title.className='s19-title';panel.appendChild(title);
      const actions=document.createElement('div');actions.className='s19-actions';panel.appendChild(actions);
      const select=document.createElement('select');select.setAttribute('aria-label','משבצת שמירה');
      for(const s of SLOTS){const option=document.createElement('option');option.value=s;option.textContent=slotLabel(s);select.appendChild(option);}
      select.value=sys.selected;select.addEventListener('change',()=>{sys.selected=select.value;});actions.appendChild(select);
      const button=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;
        b.addEventListener('click',fn);actions.appendChild(b);return b;};
      button('💾 שמור',()=>sys.save(sys.selected));
      button('📂 טען',()=>{if(g.running&&globalThis.confirm&&!globalThis.confirm('לטעון שמירה ולהחליף את הסשן הנוכחי?'))return;sys.load(sys.selected);});
      const auto=button('↪ המשך משמירת האי',()=>{if(g.running&&globalThis.confirm&&!globalThis.confirm('לטעון את שמירת האי ולהחליף את הסשן הנוכחי?'))return;sys.load('auto');});
      sys.autoButtons.push(auto);sys.refreshAuto();
      button('⬇ ייצא',()=>{try{const txt=sys.exportText(sys.selected);
        const blob=new Blob([txt],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='SUNSET_STATE_'+sys.selected+'_save.json';
        document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
        note('✓ קובץ שמירה יוצא');}catch(e){note('הייצוא נכשל: '+e.message);}});
      const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
      input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;
        if(file.size>MAX_BYTES){note('קובץ שמירה גדול מדי');return;}
        try{const content=await file.text();sys.importText(content,sys.selected);}
        catch(e){note('קריאת קובץ נכשלה: '+e.message);}input.value='';});panel.appendChild(input);
      button('⬆ ייבא',()=>input.click());
      const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      status.textContent='F5 שמירה מהירה · Shift+F5 טעינה';panel.appendChild(status);sys.statusEls.push(status);
      parent.appendChild(panel);
    };
    makePanel(document.getElementById('main-menu'),'stage19-main-save-panel');
    makePanel(document.getElementById('pause-menu'),'stage19-pause-save-panel');
  }
  H.stage19Save={schema:SCHEMA,slots:SLOTS.slice(),install,capture,envelope,parse,readSlot,writeSlot,apply,hash,prefix:PREFIX};
})(Heatline || (Heatline={}));
