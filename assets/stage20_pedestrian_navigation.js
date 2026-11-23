/* SUNSET STATE / 35-stage polish, Stage 20 (S01-AI-01).
 * Bounded local recovery for civilian sidewalk routes, atop the existing
 * Recovery05 time-sliced navigator. NO new global navigation graph, teleport,
 * road geometry, AI spawns, serialized state or changes to panic/conversations.
 * Disables: ?stage20NavigationOff=1 / __SUNSET_STAGE20_NAV_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const states=new WeakMap();
 const stats={installed:false,calls:0,sidewalkTicks:0,waitingTicks:0,
   detourPlans:0,detoursCompleted:0,detoursAborted:0,rejectedCandidates:0,
   blockedCrossingReroutes:0,blockedCurbReversals:0,nearbyQueries:0,
   maxTrackedWaitingSeconds:0,offCalls:0};
 const finite=n=>Number.isFinite(n);
 function disabled(){return globalThis.__SUNSET_STAGE20_NAV_OFF===true||
   (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
   new URLSearchParams(location.search).has('stage20NavigationOff'));}
 const distance=(x,z,a,b)=>Math.hypot(x-a,z-b);
 function state(w){let s=states.get(w);if(!s){s={wait:0,stall:0,cooldown:0,
   detour:null,prevGoal:null,lastX:w.x,lastZ:w.z,reversals:0,probe:0};states.set(w,s);}return s;}
 function safe(x,z,world,w){
   if(!finite(x)||!finite(z)||Math.abs(x)>H.WORLD_LIMIT-3||Math.abs(z)>H.WORLD_LIMIT-3)return false;
   if(H.coast461?.land&& !H.coast461.land(x,z))return false;
   // Avoid turning a sidewalk detour into an unsafe unmarked road crossing.
   if(typeof H.isOnStreet==='function'&&!H.isOnStreet(w.x,w.z)&&H.isOnStreet(x,z))return false;
   const at=typeof H.outdoorHeight==='function'?H.outdoorHeight(x,z):w.y;
   if(!finite(at)||Math.abs(at-w.y)>1.6)return false;
   stats.nearbyQueries++;
   const solids=world?.nearby?.(x,z)||[];
   for(const b of solids){
     if(!finite(b.x)||!finite(b.z)||!finite(b.hw)||!finite(b.hd))continue;
     const dx=x-H.clamp(x,b.x-b.hw,b.x+b.hw);
     const dz=z-H.clamp(z,b.z-b.hd,b.z+b.hd);
     if(dx*dx+dz*dz<.52*.52)return false;
   }
   return true;
 }
 function clearLine(a,b,world,w){
   const d=distance(a.x,a.z,b.x,b.z);
   const steps=Math.max(1,Math.ceil(d/.7));
   for(let i=1;i<=steps;i++){
     const t=i/steps;
     if(!safe(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,world,w))return false;
   }
   return true;
 }
 function detourPlan(w,world,others=[],excludeSide=0){
   const dx=w.navTargetX-w.x,dz=w.navTargetZ-w.z,d=Math.hypot(dx,dz);
   if(!finite(d)||d<5.5||w.navState!=='sidewalk')return null;
   const ux=dx/d,uz=dz/d,px=-uz,pz=ux;
   const base={x:w.x,z:w.z};
   let best=null;
   // A two-turn dogleg around a local obstruction. Candidates stay within
   // 2.8m of the current sidewalk and never enter the roadway or ocean.
   for(const side of [1,-1]){
     if(side===excludeSide)continue;
     for(const offset of [1.25,2.05,2.70]){
       const a={x:w.x+side*px*offset,z:w.z+side*pz*offset};
       const travel=Math.min(7.8,Math.max(3.6,d-1.35));
       const b={x:a.x+ux*travel,z:a.z+uz*travel};
       if(!clearLine(base,a,world,w)||!clearLine(a,b,world,w)){
         stats.rejectedCandidates++;continue;
       }
       // Don't choose a dogleg that immediately cuts through the same wall.
       const forward={x:b.x+ux*Math.min(2,d-travel),z:b.z+uz*Math.min(2,d-travel)};
       if(!clearLine(b,forward,world,w)){stats.rejectedCandidates++;continue;}
       let crowd=0;
       for(const other of others){if(other===w||other.injuryState!=='walking')continue;
         if(distance(a.x,a.z,other.x,other.z)<1.5)crowd+=1;
         if(distance(b.x,b.z,other.x,other.z)<1.5)crowd+=1;
       }
       const score=offset+crowd*2+(side<0?.015:0);
       if(!best||score<best.score)best={waypoints:[a,b],index:0,
         goal:{x:w.navTargetX,z:w.navTargetZ},axis:w.navAxis,dir:w.navDir,side,score};
     }
   }
   return best;
 }
 function restore(w,s){if(s.detour){
   w.navTargetX=s.detour.goal.x;w.navTargetZ=s.detour.goal.z;
   s.detour=null;
 }}
 function reverseSidewalk(w,s,reason){
   restore(w,s);
   if(w.navAxis!=='x'&&w.navAxis!=='z')return false;
   w.navState='sidewalk';w.navDir=w.navDir===1?-1:1;
   w.navWait=0;w.navStall=0;
   H.nextPedestrianCorner(w);
   s.stall=0;s.wait=0;s.cooldown=3.5;s.prevGoal=null;
   s.reversals++;
   if(reason==='traffic')stats.blockedCrossingReroutes++;
   else stats.blockedCurbReversals++;
   return true;
 }
 H.installStage20PedestrianNavigation=function(Game){
   if(stats.installed)return false;
   if(!Game?.prototype||typeof H.walkPedestrianRoute!=='function'||
      typeof H.nextPedestrianCorner!=='function'||typeof H.stepWalker!=='function')
      throw Error('Stage20 must install after Recovery05 and core pedestrian engine');
   const previous=H.walkPedestrianRoute;
   H.walkPedestrianRoute=function stage20SidewalkRecovery(w,traffic){
     if(!w||!traffic){return previous.call(this,w,traffic);}
     const s=state(w);
     if(disabled()){
       stats.offCalls++;restore(w,s);s.stall=0;s.wait=0;
       return previous.call(this,w,traffic);
     }
     const dt=finite(traffic.dt)?traffic.dt:traffic.simDt;
     if(!finite(dt)||dt<=0||w.injuryState!=='walking'||w.panic>0){
       restore(w,s);s.wait=0;s.stall=0;
       return previous.call(this,w,traffic);
     }
     const tick=Math.min(dt,.22);stats.calls++;
     s.cooldown=Math.max(0,s.cooldown-tick);
     s.probe=Math.max(0,s.probe-tick);
     if(w.navAxis==='x'||w.navAxis==='z'){
       if(w.pause>0){s.wait=0;s.stall=0;restore(w,s);}
       else if(w.navState==='waiting'){
         stats.waitingTicks++;restore(w,s);s.stall=0;
       }else if(w.navState==='sidewalk')stats.sidewalkTicks++;
       else {restore(w,s);s.wait=0;s.stall=0;}
     }else {restore(w,s);s.wait=0;s.stall=0;}
     if(s.detour){
       const p=s.detour;
       if(w.navState!=='sidewalk'||w.navAxis!==p.axis||w.navDir!==p.dir){
         restore(w,s);stats.detoursAborted++;
       }else{
         while(p.index<p.waypoints.length&&
           distance(w.x,w.z,p.waypoints[p.index].x,p.waypoints[p.index].z)<1.0)p.index++;
         if(p.index===p.waypoints.length){restore(w,s);stats.detoursCompleted++;s.stall=0;s.cooldown=1.4;}
         else{w.navTargetX=p.waypoints[p.index].x;w.navTargetZ=p.waypoints[p.index].z;w.navStall=0;}
       }
     }
     // Look slightly ahead before a collision becomes a complete stall. This
     // avoids trying to sidestep only after the walker is touching a wall.
     // At most one cheap broadphase sample per citizen every 0.6 seconds.
     if(!s.detour&&s.cooldown===0&&s.probe===0&&w.navState==='sidewalk'&&w.pause<=0&&
        (w.navAxis==='x'||w.navAxis==='z')&&finite(w.navTargetX)&&finite(w.navTargetZ)){
       s.probe=.6;
       const dx=w.navTargetX-w.x,dz=w.navTargetZ-w.z,d=Math.hypot(dx,dz);
       if(d>5.5){
         const ahead=Math.min(2.0,d*.3);
         const probeX=w.x+dx/d*ahead,probeZ=w.z+dz/d*ahead;
         if(!safe(probeX,probeZ,traffic.world,w)){
           const proposal=detourPlan(w,traffic.world,traffic.others||[]);
           if(proposal){s.detour=proposal;s.stall=0;s.cooldown=2.4;stats.detourPlans++;
             w.navTargetX=proposal.waypoints[0].x;w.navTargetZ=proposal.waypoints[0].z;
           }
         }
       }
     }
     const beforeX=w.x,beforeZ=w.z,was=w.navState;
     const mainGoal=s.detour?s.detour.goal:{x:w.navTargetX,z:w.navTargetZ};
     const distanceBefore=distance(beforeX,beforeZ,mainGoal.x,mainGoal.z);
     const result=previous.call(this,w,traffic);
     if(!finite(w.x)||!finite(w.z)||!finite(w.yaw))throw Error('Stage20 invalid citizen location');
     if(w.navState==='waiting'){
       s.wait=was==='waiting'?s.wait+tick:tick;
       stats.maxTrackedWaitingSeconds=Math.max(stats.maxTrackedWaitingSeconds,s.wait);
       if(s.wait>8.0&&s.cooldown===0)reverseSidewalk(w,s,'traffic');
       return result;
     }
     s.wait=0;
     if(w.navState!=='sidewalk'||w.pause>0||!w.navAxis){s.stall=0;restore(w,s);return result;}
     if(s.detour&&(w.navAxis!==s.detour.axis||w.navDir!==s.detour.dir)){
       restore(w,s);stats.detoursAborted++;s.stall=0;return result;
     }
     // Compare progress toward the ORIGINAL destination, not just displacement:
     // trembling sideways against a wall must not count as navigating.
     const distanceAfter=distance(w.x,w.z,mainGoal.x,mainGoal.z);
     if(distanceBefore-distanceAfter>Math.min(.016,tick*.18)||
        distanceBefore<1.1||distanceAfter<1.1){s.stall=Math.max(0,s.stall-tick*1.9);}
     else s.stall+=tick;
     // A newly reached corner changes the target legitimately.
     if(!s.detour&&distance(w.navTargetX,w.navTargetZ,mainGoal.x,mainGoal.z)>.05){s.stall=0;return result;}
     if(s.stall>1.15&&s.cooldown<=0&&!s.detour){
       const detour=detourPlan(w,traffic.world,traffic.others||[]);
       if(detour){s.detour=detour;s.stall=0;s.cooldown=2.4;stats.detourPlans++;}
       else if(s.stall>2.6){reverseSidewalk(w,s,'obstacle');}
     }else if(s.stall>3.8&&s.cooldown<=0&&s.detour){
       // A failed detour must never trap the citizen in a permanent new state.
       reverseSidewalk(w,s,'obstacle');stats.detoursAborted++;
     }
     return result;
   };
   stats.installed=true;
   return true;
 };
 H.stage20Pedestrian={stats,disabled,detourPlan,safe,clearLine,getState:w=>state(w)};
})(Heatline);
