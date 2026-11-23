/* SUNSET STATE - Recovery 5/7: pedestrian simulation, traffic awareness and conversations.
 * Additive patch installed on the existing engine after Game is declared.
 * A/B: ?cityLifeRecovery5Off=1 or globalThis.__SUNSET_DISABLE_CITY_LIFE_RECOVERY5=true.
 * Does not add NPCs, alter the map, roads, portal geometry, missions or saved data.
 */
var Heatline=globalThis.Heatline||{};
(function(H){
 'use strict';
 const stats={installed:false,routeCalls:0,routeMicrosteps:0,routeInvalidDt:0,
  bridgeHazardsRejected:0,bridgeCrossingCarsRejected:0,bridgeYieldRejected:0,
  conversationsPaused:0,blockedDialogues:0,talkPosesRestored:0};
 function disabled(){
  return globalThis.__SUNSET_DISABLE_CITY_LIFE_RECOVERY5===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
     new URLSearchParams(location.search).has('cityLifeRecovery5Off'));
 }
 function sameLevel(a,b){
  return typeof H.sameRoadLevel443!=='function'||H.sameRoadLevel443(a,b);
 }
 H.installCityLifeRecovery5=function(Game){
  if(stats.installed)return false;
  if(!Game?.prototype||typeof H.walkPedestrianRoute!=='function'||
     typeof H.pedestrianPredictedDanger!=='function'||typeof H.civilianYieldForCrossing!=='function'||
     typeof Game.prototype.nearestTalker!=='function'||typeof Game.prototype.updatePedestrians!=='function'||
     typeof Game.prototype.talkToCitizen!=='function')throw Error('Recovery 5 requires the original pedestrian and conversation engine');
  const originalRoute=H.walkPedestrianRoute, originalDanger=H.pedestrianPredictedDanger;
  const originalYield=H.civilianYieldForCrossing;
  const originalNearest=Game.prototype.nearestTalker, originalTalk=Game.prototype.talkToCitizen;
  const originalUpdate=Game.prototype.updatePedestrians;
  H.walkPedestrianRoute=function recoveredPedestrianRoute(w,traffic){
   if(disabled())return originalRoute.call(this,w,traffic);
   // Core Game calls with {simDt}, while Stage22 expects {dt}.
   // With the original call, clamp(undefined) is NaN and every ordinary route stalls.
   const dt=Number.isFinite(traffic?.dt)?traffic.dt:traffic?.simDt;
   if(!Number.isFinite(dt)||dt<=0){stats.routeInvalidDt++;return;}
   if(w.injuryState!=='walking'||w.panic>0)return;
   stats.routeCalls++;
   // Time-sliced NPCs can accumulate up to .22s. Keep their real gait speed without
   // allowing a single huge physics jump (and without changing the player physics).
   const steps=Math.min(5,Math.max(1,Math.ceil(Math.min(dt,.22)/.05)));
   const time=Math.min(dt,.22)/steps;
   stats.routeMicrosteps+=steps;
   const data={...traffic,dt:time};
   for(let i=0;i<steps;i++){
    // An overpass vehicle must not indefinitely block a crosswalk below it.
    if(w.navState==='waiting'&&Array.isArray(traffic.cars)){
     const near=[];
     for(const c of traffic.cars){
      if(Math.abs(c.x-w.x)>105||Math.abs(c.z-w.z)>105)continue;
      if(!sameLevel(w,c)){stats.bridgeCrossingCarsRejected++;continue;}
      near.push(c);
     }
     data.cars=near;
    }else data.cars=traffic.cars;
    originalRoute.call(this,w,data);
    if(!Number.isFinite(w.x)||!Number.isFinite(w.z)||!Number.isFinite(w.yaw))
     throw Error('Recovery 5 pedestrian gained invalid coordinates');
   }
  };
  H.pedestrianPredictedDanger=function recoveredCarThreat(w,cars){
   if(disabled()||!Array.isArray(cars))return originalDanger.call(this,w,cars);
   let possible=null;
   for(const car of cars){
    if(Math.abs(car.x-w.x)>38||Math.abs(car.z-w.z)>38)continue;
    if(!sameLevel(w,car)){stats.bridgeHazardsRejected++;continue;}
    if(!possible)possible=[];
    possible.push(car);
   }
   return originalDanger.call(this,w,possible||[]);
  };
  H.civilianYieldForCrossing=function recoveredCivilianYield(car,walker){
   const needsYield=originalYield.call(this,car,walker);
   if(disabled()||!needsYield)return needsYield;
   if(!sameLevel(car,walker)){stats.bridgeYieldRejected++;return false;}
   return true;
  };
  Game.prototype.nearestTalker=function recoveredNearbyCitizen(){
   if(disabled())return originalNearest.call(this);
   if(this.inVehicle||this.inside||this.onTram>=0||this.onBus>=0)return null;
   let nearest=null,best=3.3,obstructed=false;
   for(const w of this.pedestrians){
    if(w.injuryState!=='walking'||w.panic>0)continue;
    const d=Math.hypot(w.x-this.avatar.x,w.z-this.avatar.z);
    if(d>=best)continue;
    if(!sameLevel(this.avatar,w)){obstructed=true;continue;}
    const midX=(w.x+this.avatar.x)*.5,midZ=(w.z+this.avatar.z)*.5;
    if(!H.officerSightClear(this.avatar.x,this.avatar.z,w.x,w.z,this.world.nearby(midX,midZ))){
     obstructed=true;continue;
    }
    best=d;nearest=w;
   }
   if(!nearest&&obstructed)stats.blockedDialogues++;
   return nearest;
  };
  Game.prototype.talkToCitizen=function recoveredCitizenConversation(...args){
   if(disabled())return originalTalk.apply(this,args);
   const w=this.nearestTalker(),result=originalTalk.apply(this,args);
   if(result&&w&&w.injuryState==='walking'&&w.panic<=0&&!this.streetLife?.jobs?.has(w)){
    // Real conversation: stop, face the player and recover naturally after the pause.
    const dx=this.avatar.x-w.x,dz=this.avatar.z-w.z;
    w.yaw=Math.atan2(-dx,-dz);
    w.pause=Math.max(Number.isFinite(w.pause)?w.pause:0,2.2);
    w.stride=0;w.vx=0;w.vz=0;w.socialPose='talk';
    stats.conversationsPaused++;
   }
   return result;
  };
  Game.prototype.updatePedestrians=function recoveredCitizenTick(dt){
   const result=originalUpdate.call(this,dt);
   if(disabled())return result;
   // Original spontaneous street meetings kept the 'talk' pose indefinitely.
   // Never interfere with jobs managed by the existing StreetLife scheduler.
   for(const w of this.pedestrians){
    if(w.socialPose==='talk'&&w.pause<=0&&!this.streetLife?.jobs?.has(w)){
     w.socialPose='walk';w.navActivity='walk';stats.talkPosesRestored++;
    }
   }
   return result;
  };
  stats.installed=true;
  return true;
 };
 H.cityLifeRecovery5={stats,disabled};
})(Heatline);
