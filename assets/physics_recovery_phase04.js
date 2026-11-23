/* SUNSET STATE: Recovery 4/7 - narrower collision integration without rebuilding gameplay.
 * Loaded before engine44.js; engine invokes installPhysicsRecovery4(Game) after declaring Game.
 * Safe A/B: ?physicsRecovery4Off=1 or globalThis.__SUNSET_DISABLE_PHYSICS_RECOVERY4=true.
 */
var Heatline = globalThis.Heatline || {};
(function(H){
 'use strict';
 const stats={installed:false,walkerCalls:0,walkerMicrosteps:0,carCalls:0,carMicrosteps:0,guardRouteSkips:0,
  maxWalkerSteps:0,maxCarSteps:0};
 function disabled(){
  return globalThis.__SUNSET_DISABLE_PHYSICS_RECOVERY4===true ||
   (typeof location!=='undefined' && typeof URLSearchParams==='function' &&
    new URLSearchParams(location.search).has('physicsRecovery4Off'));
 }
 function walkerIntegrator(original){
  return function sweptPlayerWalk(w,input,solids,dt,cars){
   if(disabled()||!input?.outdoors||!input.roadWorld||!Number.isFinite(dt)||dt<=0||dt>.055)
    return original.call(this,w,input,solids,dt,cars);
   const forward=H.clamp(Number(input.forward)||0,-1,1),strafe=H.clamp(Number(input.strafe)||0,-1,1);
   const intent=Math.min(1,Math.hypot(forward,strafe));
   const speed=(input.run?11.4:6.15)*H.clamp(input.speedFactor??1,.25,1.25);
   const displacement=Math.max(intent*speed,Math.hypot(w.vx||0,w.vz||0))*dt;
   // 0.27m is smaller than the walker's 0.38m radius, including corners.
   const steps=Math.min(5,Math.max(1,Math.ceil(displacement/.27)));
   stats.walkerCalls++;stats.walkerMicrosteps+=steps;stats.maxWalkerSteps=Math.max(stats.maxWalkerSteps,steps);
   if(steps===1)return original.call(this,w,input,solids,dt,cars);
   // Re-query collision cells as the player moves; don't use a stale start-of-frame list.
   for(let i=0;i<steps;i++){
    const nearby=typeof H.drivingSolids443==='function' ? H.drivingSolids443(input.roadWorld,w) : solids;
    original.call(this,w,input,nearby,dt/steps,cars);
   }
  };
 }
 function vehicleIntegrator(original){
  return function sweptVehicleMove(c,dt,input){
   if(disabled()||!c||!Number.isFinite(dt)||dt<=0||dt>.08||c.wrecked||c.rollover)
    return original.call(this,c,dt,input);
   // The whole existing moveCar path (collision, road grade, rails, glass, weather,
   // movable props and damage) runs at EACH swept sample, not just stepCar().
   const speed=Math.max(Math.hypot(c.vx||0,c.vz||0),Math.abs(c.speed||0));
   const maxTravel=speed*dt+31*dt*dt;
   // 1.45m < half of the shortest car's longitudinal footprint (compact: 2.18m).
   const steps=Math.min(6,Math.max(1,Math.ceil(maxTravel/1.45)));
   stats.carCalls++;stats.carMicrosteps+=steps;stats.maxCarSteps=Math.max(stats.maxCarSteps,steps);
   if(steps===1)return original.call(this,c,dt,input);
   for(let i=0;i<steps;i++){
    original.call(this,c,dt/steps,input);
    if(c.wrecked||c.rollover)break;
   }
  };
 }
 H.installPhysicsRecovery4=function(Game){
  if(!Game?.prototype||stats.installed)return false;
  if(typeof H.stepWalker!=='function'||typeof Game.prototype.moveCar!=='function')
   throw Error('Physics recovery 4 requires core movement implementations');
  const prevWalker=H.stepWalker,prevCar=Game.prototype.moveCar;
  H.stepWalker=walkerIntegrator(prevWalker);
  Game.prototype.moveCar=vehicleIntegrator(prevCar);
  // Route-following traffic may pass BENEATH a bridge on a different surveyed road.
  // The legacy bridge guard only checked horizontal proximity and could snap those
  // vehicles sideways onto the elevated road. Respect the NPC's assigned route;
  // player vehicles without a fixed route retain their original bridge protection.
  if(typeof H.guardBridgeRails477==='function'&&typeof H.closestBridge477==='function'){
   const priorRail=H.guardBridgeRails477;
   H.guardBridgeRails477=function routeAwareBridgeGuard(car,oldX,oldZ){
    if(disabled())return priorRail.call(this,car,oldX,oldZ);
    const routeId=car?.route477?.road?.id;
    if(routeId){
     const below=H.closestBridge477(oldX,oldZ);
     if(below?.road?.id && below.road.id!==routeId && below.d<=below.road.width*.5+1.1){
      stats.guardRouteSkips++;
      return false;
     }
    }
    return priorRail.call(this,car,oldX,oldZ);
   };
  }
  stats.installed=true;
  return true;
 };
 H.physicsRecovery4={stats,disabled,walkerIntegrator,vehicleIntegrator};
})(Heatline);
