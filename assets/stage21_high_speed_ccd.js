/* SUNSET STATE stage 21/35: continuous translational collision guard for moving vehicles.
 * Installs AFTER recovery04 on actual Game, hooks the existing Heatline.stepCar
 * only while called by Game.moveCar, and leaves all existing impact/damage,
 * tire physics, rail barriers, rendering, traffic, and bridge rules untouched.
 * A/B: ?stage21CCDOff=1 or __SUNSET_STAGE21_CCD_OFF=true.
 * This is swept oriented-rectangle vs axis-aligned static solids with fixed
 * orientation over a single integration microstep, NOT a complete 3D CCD engine.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const stats={installed:false,carSteps:0,skippedLowTravel:0,skippedDisabled:0,
  broadphaseQueries:0,candidateSolids:0,narrowphaseTests:0,contacts:0,
  clippedSteps:0,roadGradeSkips:0,deckGuardQueries:0,maxQueries:0,
  anomalies:0};
 let activeGame=null;
 const finite=Number.isFinite;
 const disabled=()=>globalThis.__SUNSET_STAGE21_CCD_OFF===true||
  (typeof location!=='undefined'&&typeof location.search==='string'&&
   location.search.includes('stage21CCDOff')&&typeof URLSearchParams==='function'&&
   new URLSearchParams(location.search).has('stage21CCDOff'));
 function footprint(c){return H.carBuildingFootprint(c);}
 function hitAt(c,s,x,z){return H.carBuildingContact({...c,x,z},s);}
 function sweptSAT(c,s,ax,az,bx,bz){
  const fp=footprint(c),dx=bx-ax,dz=bz-az;
  let enter=0,exit=1,nx=0,nz=0;
  const axes=[[1,0],[0,1],[fp.rx,fp.rz],[fp.fx,fp.fz]];
  for(const [ux,uz] of axes){
   const p=(ax-s.x)*ux+(az-s.z)*uz,v=dx*ux+dz*uz;
   const ra=fp.hw*Math.abs(fp.rx*ux+fp.rz*uz)+
            fp.hd*Math.abs(fp.fx*ux+fp.fz*uz);
   const r=ra+s.hw*Math.abs(ux)+s.hd*Math.abs(uz);
   if(Math.abs(v)<1e-10){if(Math.abs(p)>r)return null;continue;}
   const t1=(-r-p)/v,t2=(r-p)/v,tMin=Math.min(t1,t2),tMax=Math.max(t1,t2);
   if(tMin>enter){enter=tMin;nx=v>0?-ux:ux;nz=v>0?-uz:uz;}
   exit=Math.min(exit,tMax);
   if(enter>=exit||exit<=0)return null;
  }
  if(enter<0||enter>1||exit<=0||!finite(enter)||!(nx||nz))return null;
  // A genuine contact must intersect the original game narrow-phase shape.
  if(hitAt(c,s,ax,az)||hitAt(c,s,bx,bz))return null;
  const contactT=Math.min(exit-.00001,enter+Math.min(.1,.08/Math.max(.01,Math.hypot(dx,dz))));
  if(contactT<=enter||!hitAt(c,s,ax+dx*contactT,az+dz*contactT))return null;
  return {t:enter,exit,nx,nz,solid:s};
 }
 function querySolids(game,c,x,z,oldDeck){
  const world=game.world;
  if(!world||typeof world.nearby!=='function'||typeof H.drivingSolids443!=='function')return [];
  const actor={x,z,yaw:c.yaw,route477:c.route477,deck443:!!(oldDeck||c.deck443),coastDeck461:c.coastDeck461};
  // Native Game.moveCar excludes ground-level building solids on a raised road.
  // Never 'repair' a legal passage on a bridge by hitting the road underneath.
  if(H.roadRaised477&&H.roadRaised477(actor)>.95&&!actor.deck443){stats.roadGradeSkips++;return [];}
  if(actor.deck443&&H.deckRise443&&H.deckRise443(z)>.63)stats.deckGuardQueries++;
  stats.broadphaseQueries++;
  return H.drivingSolids443(world,actor)||[];
 }
 function findFirst(game,c,x0,z0,x1,z1,oldDeck){
  const distance=Math.hypot(x1-x0,z1-z0);
  if(distance<2.15){stats.skippedLowTravel++;return null;}
  // Car integrator normally speed-clamps to <=118m/s; guard against an
  // external teleport/exploded state rather than snapping hundreds of metres.
  if(distance>75){stats.anomalies++;return null;}
  const count=Math.min(18,Math.max(1,Math.ceil(distance/3.5))),seen=new Set();
  stats.maxQueries=Math.max(stats.maxQueries,count+1);
  let first=null;
  for(let i=0;i<=count;i++){
   const t=i/count,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
   for(const s of querySolids(game,c,x,z,oldDeck)){
    if(seen.has(s))continue;seen.add(s);stats.candidateSolids++;
    if(![s.x,s.z,s.hw,s.hd].every(finite)||s.hw<=0||s.hd<=0)continue;
    const max=footprint(c);
    // Cheap swept AABB reject before full continuous SAT.
    if(s.x+s.hw+max.extentX<Math.min(x0,x1)||s.x-s.hw-max.extentX>Math.max(x0,x1)||
       s.z+s.hd+max.extentZ<Math.min(z0,z1)||s.z-s.hd-max.extentZ>Math.max(z0,z1))continue;
    stats.narrowphaseTests++;
    const contact=sweptSAT(c,s,x0,z0,x1,z1);
    if(contact&&(!first||contact.t<first.t)){first=contact;}
   }
  }
  return first;
 }
 function guardIntegrator(original){
  return function guardedCarStep(c,input,dt){
   const game=activeGame;
   if(!game||disabled()||!c||c.wrecked||c.rollover){
    if(game&&disabled())stats.skippedDisabled++;
    return original.call(this,c,input,dt);
   }
   stats.carSteps++;
   const x=c.x,z=c.z,deck=!!c.deck443;
   const result=original.call(this,c,input,dt);
   if(c.wrecked||c.rollover||!finite(c.x+c.z+x+z))return result;
   const contact=findFirst(game,c,x,z,c.x,c.z,deck);
   if(contact){
    // Stop slightly inside the first solid so the real Game.moveCar collision
    // resolver performs its ONE native push, impact/damage, and sound event.
    const vx=c.x-x,vz=c.z-z,dist=Math.hypot(vx,vz);
    const t=Math.min(contact.exit-.00001,contact.t+Math.min(.085,.045/Math.max(dist,.01)));
    if(t>contact.t){
     c.x=x+vx*t;c.z=z+vz*t;
     if(hitAt(c,contact.solid,c.x,c.z)){
      stats.clippedSteps++;stats.contacts++;
     }else{c.x=x+vx;c.z=z+vz;}
    }
   }
   return result;
  };
 }
 function install(Game){
  if(stats.installed)return false;
  if(!Game?.prototype||typeof Game.prototype.moveCar!=='function'||
     typeof H.stepCar!=='function'||typeof H.carBuildingContact!=='function'||
     typeof H.drivingSolids443!=='function')
   throw Error('Stage21 requires the native car, world and collision engine');
  const previous=Game.prototype.moveCar,oldStepCar=H.stepCar;
  H.stepCar=guardIntegrator(oldStepCar);
  Game.prototype.moveCar=function stage21CollisionFrame(c,dt,input){
   const parent=activeGame;
   activeGame=this;
   try{return previous.call(this,c,dt,input);}finally{activeGame=parent;}
  };
  stats.installed=true;
  return true;
 }
 H.installStage21HighSpeedCCD=install;
 H.stage21HighSpeedCCD={stats,disabled,sweptSAT,findFirst,guardIntegrator};
})(Heatline);
