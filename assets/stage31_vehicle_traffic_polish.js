/* SUNSET STATE 31/35: additive vehicle feel, collision-aware civilian traffic,
 * local damage wear. Retains all V4 interceptor meshes, stage 21 CCD, garage,
 * insurance, police, buses, rail and saved damage. NO new colliders or vehicles.
 * A/B comparison: ?stage31VehiclesOff=1 or __SUNSET_STAGE31_VEHICLES_OFF=true.
 * CPU validation does NOT certify GPU visuals / 1080p 50FPS.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const finite=(...values)=>values.every(Number.isFinite);
  const stats={installed:false,playerSteps:0,tractionInterventions:0,damageSteeringInterventions:0,
    civilianChecks:0,civilianBraking:0,nearCrashDetails:0,damageEvents:0,
    addedCollisionBodies:0,changedVehicleModels:0,saveSchemaChanges:0,
    gpuVerified:false,native1080p50fpsVerified:false};
  const threatCache=new WeakMap();
  const crashMarks=new WeakMap();
  function off(){return globalThis.__SUNSET_STAGE31_VEHICLES_OFF===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
     new URLSearchParams(location.search||'').get('stage31VehiclesOff')==='1');}
  function adjustPlayerInput(c,input){
    if(!c||c.type!=='player'||!input||c.wrecked||c.rollover)return input;
    const speed=Math.hypot(c.vx||0,c.vz||0);
    const traction=clamp(1-(Number.isFinite(c.surfaceGrip)?c.surfaceGrip:1),0,.52);
    const wheels=Array.isArray(c.wheelDamage)?c.wheelDamage:[0,0,0,0];
    const wear=clamp(c.tireWear||0,0,1);
    const slip=clamp(traction+.16*wear+.12*Math.max(0,...wheels),0,.85);
    let gas=Number.isFinite(input.gas)?clamp(input.gas,-1,1):0;
    let steer=Number.isFinite(input.steer)?clamp(input.steer,-1,1):0;
    // Only low-speed positive acceleration is limited on wet/loose surfaces;
    // no yaw-vector teleportation, double steer smoothing or handbrake override.
    if(gas>.1&&slip>.04&&speed<26){
      const old=gas;
      const speedFactor=clamp((29-speed)/29,.14,1);
      gas*=1-clamp(slip*.35*speedFactor,0,.22);
      if(gas<old-.0001)stats.tractionInterventions++;
    }
    // Actual bent steering rack and asymmetric front tyres induce a small pull.
    // Both are reset by the EXISTING garage and service-pad repair functions.
    const rack=clamp(c.steeringBias||0,-.16,.16);
    const tyreAsym=clamp((wheels[1]||0)-(wheels[0]||0),-1,1);
    const pull=clamp((rack*.42+tyreAsym*.065)*clamp((speed-4)/22,0,1),-.12,.12);
    if(!input.brake&&Math.abs(pull)>.002){
      steer=clamp(steer+pull,-1,1);
      stats.damageSteeringInterventions++;
    }
    if(gas===input.gas&&steer===input.steer)return input;
    return {...input,gas,steer};
  }
  function findTrafficRisk(game,car){
    if(!game||!car||!finite(car.x,car.z,car.yaw))return 0;
    const axes=H.vehicleAxes(car);
    const ownSpeed=Math.max(0,(car.vx||0)*axes.fx+(car.vz||0)*axes.fz);
    const seek=clamp(12+ownSpeed*1.7,15,46);
    let risk=0;
    const groups=[game.civilian||[],game.police||[],game.parked||[],game.buses||[]];
    const p=game.player;
    if(p&&p!==car)groups.push([p]);
    const own=H.VEHICLE_CLASSES[H.carClass(car)]||H.VEHICLE_CLASSES.standard;
    for(const group of groups){
      for(const other of group){
        if(!other||other===car||other.alive===false||other.wrecked)continue;
        const dx=other.x-car.x,dz=other.z-car.z;
        if(!finite(dx,dz)||Math.abs(dx)>seek||Math.abs(dz)>seek)continue;
        const ahead=dx*axes.fx+dz*axes.fz;
        if(ahead<=.5||ahead>seek)continue;
        const lateral=Math.abs(dx*axes.rx+dz*axes.rz);
        const bus=group===game.buses;
        const ot=bus?{hw:1.65,hd:6.25}:(H.VEHICLE_CLASSES[H.carClass(other)]||own);
        if(lateral>own.hw+ot.hw-.3)continue;
        if(typeof H.sameRoadLevel443==='function'&&!H.sameRoadLevel443(car,other))continue;
        const otherSpeed=Math.max(0,(other.vx||0)*axes.fx+(other.vz||0)*axes.fz);
        const closing=Math.max(0,ownSpeed-otherSpeed);
        const clear=ahead-own.hd-ot.hd;
        const desired=5.5+ownSpeed*.93+closing*.80;
        const candidate=clamp((desired-clear)/Math.max(7.5,desired*.76),0,1);
        if(candidate>risk)risk=candidate;
        if(risk>=1)return 1;
      }
    }
    return risk;
  }
  function trafficDecision(game,car,input,now){
    if(car?.type!=='civilian'||!input||car.wrecked||car.rollover||
      !Number.isFinite(input.gas)||input.gas<=0||!finite(car.x,car.z,car.yaw))return input;
    let risk;
    let cache=threatCache.get(car);
    if(cache&&Number.isFinite(now)&&now-cache.at>=0&&now-cache.at<.14){
      risk=cache.risk;
    } else {
      risk=findTrafficRisk(game,car);
      if(Number.isFinite(now))threatCache.set(car,{at:now,risk});
      stats.civilianChecks++;
    }
    if(risk<.045)return input;
    // Negative W/S input is SERVICE BRAKING in the original drive model.
    // Never convert this into Space/handbrake, which would induce a spin.
    const gas=risk>.47?-clamp((risk-.34)*1.10,.06,.76):
      Math.max(0,input.gas*(1-risk*1.30));
    if(gas>=input.gas)return input;
    stats.civilianBraking++;
    return {...input,gas};
  }
  function wearGeometry(game,car,out){
    if(!game?.cam||!car||!Array.isArray(car.panelDamage))return 0;
    const range=Math.hypot(car.x-game.cam.x,car.z-game.cam.z);
    if(!Number.isFinite(range)||range>58)return 0;
    const yaw=-car.yaw,anchor=1.02;
    const profile=H.VEHICLE_CLASSES[H.carClass(car)]||H.VEHICLE_CLASSES.standard;
    const sideShell=profile.hw*.82;
    const lengthScale=profile.hd/2.42;
    const pose={yaw,pitch:car.bodyPitch||0,roll:car.bodyRoll||0,spin:0,steer:0};
    let count=0;
    function add(kind,lx,ly,lz,w,h,d,color,material='metal'){
      const q=H.rotateBoxLocal(pose,lx,ly-anchor,lz);
      const b=H.box(car.x+q[0],anchor+q[1]+(car.suspension||0),car.z+q[2],w,h,d,color,yaw,4);
      b.shape='rounded';b.material=material;b.pitch=pose.pitch;b.roll=pose.roll;
      b.lodMax=60;b.visibilityCap=60;b.stage31VehicleDetail=true;b.stage31Kind=kind;
      out.push(b);count++;return b;
    }
    for(let i=0;i<6;i++){
      const amount=clamp(car.panelDamage[i]||0,0,1);
      if(amount<.19)continue;
      const side=i%2===0?-1:1;
      const z=(i<2?-1.62:i<4?0:1.55)*lengthScale;
      const y=i<2?.83:i<4?1.11:.88;
      // Two DIFFERENT locally positioned worn-metal marks per affected quarter.
      add('quarter-scuff',side*sideShell,y,z,.016,.022+amount*.065,.20+amount*.16,
        amount>.65?'#3b4144':'#66737b');
      if(amount>.46)add('quarter-crease',side*(sideShell+.008),y-.12,z+.18,.019,.031,.11+amount*.11,'#303943');
      if(count>=10)break;
    }
    return count;
  }
  function install(Game){
    if(stats.installed)return;
    if(!Game?.prototype||typeof H.stepCar!=='function'||typeof Game.prototype.moveCar!=='function'||
       typeof Game.prototype.carGraphics!=='function'||typeof Game.prototype.crashVehicle!=='function')
      throw Error('Stage31 requires original vehicle/game functions');
    const originalStep=H.stepCar;
    const originalMove=Game.prototype.moveCar;
    const originalGraphics=Game.prototype.carGraphics;
    const originalCrash=Game.prototype.crashVehicle;
    H.stepCar=function stage31DriveSimulation(car,input,dt){
      if(off()||car?.type!=='player')return originalStep(car,input,dt);
      stats.playerSteps++;
      return originalStep(car,adjustPlayerInput(car,input),dt);
    };
    Game.prototype.moveCar=function stage31CivilianTraffic(car,dt,input){
      if(off()||car?.type!=='civilian')return originalMove.call(this,car,dt,input);
      return originalMove.call(this,car,dt,trafficDecision(this,car,input,this.seconds));
    };
    Game.prototype.carGraphics=function stage31Wear(car,out,time){
      const result=originalGraphics.call(this,car,out,time);
      if(!off()){const added=wearGeometry(this,car,out);stats.nearCrashDetails+=added;}
      return result;
    };
    Game.prototype.crashVehicle=function stage31CrashVariation(car,speed,nx,nz,kind,px,pz){
      const event=originalCrash.call(this,car,speed,nx,nz,kind,px,pz);
      if(!off()&&event){
        stats.damageEvents++;
        crashMarks.set(car,{severity:clamp((event.hpLoss||0)/50,0,1),kind,
          zone:finite(px,pz)?((px-car.x)*Math.cos(car.yaw)-(pz-car.z)*Math.sin(car.yaw))>0?'right':'left':'center'});
      }
      return event;
    };
    stats.installed=true;
  }
  H.stage31VehiclePolish={install,off,stats,adjustPlayerInput,findTrafficRisk,trafficDecision,wearGeometry,
    lastCrash:car=>crashMarks.get(car)||null};
})(Heatline);
