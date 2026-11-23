var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461;
    H.installCoastWater461=()=>{
        H.marinaWalk444=(x,z)=>G.keepCity(x,z)||G.land(x,z)||G.isRouteRoad(x,z)||
            G.trailAt(x,z)!==null||x>=-1025&&x<=-931&&Math.abs(z-821)<=2.18;
        H.canSwim445=(x,z)=>Math.abs(x)<1185&&Math.abs(z)<906&&!H.marinaWalk444(x,z);
        H.boatWater444=(x,z)=>{
            if(Math.abs(x)>1175||Math.abs(z)>887||G.land(x,z))return false;
            if(x>=-1027&&x<=-930&&Math.abs(z-821)<2.55)return false;
            const deck=G.roadAt(x,z);
            return !deck||deck.a.y+(deck.b.y-deck.a.y)*deck.t>2.30;
        };
        const legacyDeck=H.deckGround443,legacyLevel=H.sameRoadLevel443;
        H.deckGround443=(actor,x=actor.x,z=actor.z)=>
            legacyDeck(actor,x,z)+(actor.coastDeck461?G.grade(z):0);
        H.sameRoadLevel443=(a,b)=>legacyLevel(a,b)&&
            Math.abs((a.coastDeck461?G.grade(a.z):0)-(b.coastDeck461?G.grade(b.z):0))<2.3;
    };
    H.mapFlight461=(target,local)=>{
        Object.assign(target,local,G.flight(local.x,local.z));
        target.yaw=Math.atan2(Math.cos(local.yaw)*1.39,-Math.sin(local.yaw)*.82);
    };
    H.relocateWildlife461=life=>{
        const bays={sardine:[-1081,603],mackerel:[847,230],reef_perch:[956,651],barracuda:[905,615]};
        const waters=(x,z,i)=>({
            x:x+Math.sin(i*2.39996)*Math.min(22,4+i*2),
            z:z+Math.cos(i*2.39996)*Math.min(19,4+i*1.7)
        });
        for(const a of life.wildlife){
            const i=Number(a.id.split('-')[1])||0;
            const site=a.kind==='crocodile'?H.CROC_SITES477[i%H.CROC_SITES477.length]:null;
            const p=site?{x:site[0],z:site[1]}:a.kind==='dolphin'?waters(884,139,i):
                a.kind==='heron'?waters(491,-711,i):G.wet(a.homeX,a.homeZ);
            Object.assign(a,p,{homeX:p.x,homeZ:p.z,goalX:p.x,goalZ:p.z,
                radius:site?Math.min(13,a.radius):a.radius*.68});
        }
        for(const [i,f] of life.fish.entries()){
            const [x,z]=bays[f.species]||bays.sardine;
            const p=waters(x,z,i%8);
            Object.assign(f,p,{homeX:p.x,homeZ:p.z,goalX:p.x+2,goalZ:p.z-3,
                radius:Math.max(10,Math.min(f.radius*.66,-G.coast(p.x,p.z)-12))});
        }
    };
    H.initializeCoastRun461=g=>{
        g.parked=g.parked.filter(c=>G.land(c.x,c.z)||G.isRouteRoad(c.x,c.z));
        g.civilian=g.civilian.filter(c=>G.land(c.x,c.z)||G.isRouteRoad(c.x,c.z));
        for(const spec of g.world.parked461||[]){
            const car=H.makeCar('civilian',spec.x,spec.z,spec.yaw,spec.paint);
            car.gangCache461=Boolean(spec.gang461);
            if(!g.world.nearby(car.x,car.z).some(s=>H.carBuildingContact(car,s)))g.parked.push(car);
        }
        const routes=g.world.gang461.patrols,actors=[];
        for(const [i,route] of routes.entries()){
            for(let j=0;j<2;j++){
                const start=(j*2+i)%route.length,[x,z]=route[start];
                const npc=H.createWalker(x+j*.7,z-j*.6,i%2?Math.PI:0,6+i*2+j);
                npc.y=H.outdoorHeight(npc.x,npc.z);npc.tourist=false;
                npc.urbanModel441=H.URBAN441.residents[(i*2+j)%H.URBAN441.residents.length];
                npc.gang461={crew:i%2,route,index:(start+1)%route.length,pause:j*.7,homeX:npc.x,homeZ:npc.z,suspicion:0};
                actors.push(npc);g.pedestrians.push(npc);
            }
        }
        g.activity461={actors,lockout:0,incident:null,incidents:0,near:false};
    };
    H.updateCoastActivity461=(g,dt)=>{
        const activity=g.activity461;if(!activity)return;
        const a=g.inVehicle?g.player:g.avatar;
        if(!G.risk(a.x,a.z)){
            if(activity.near){
                activity.near=false;activity.incident=null;
                for(const w of activity.actors){w.gang461.suspicion=0;w.gang461.meeting=null;w.emotion443=null;}
            }
            return;
        }
        activity.near=true;
        activity.lockout-=dt;
        activity.incident=activity.incident>0?activity.incident-dt:null;
        if(activity.lockout<=0){
            activity.incident=17;activity.lockout=46;activity.incidents++;
            const [rival,other]=[activity.actors[2],activity.actors[4]];
            rival.gang461.suspicion=other.gang461.suspicion=1;
            const car=activity.incidents%2===0&&g.parked.find(v=>v.gangCache461&&v.alive);
            activity.stagedCar=car||null;
            if(car){
                rival.gang461.meeting={x:car.x-2,z:car.z-1.6};other.gang461.meeting={x:car.x+2,z:car.z-1.2};
            }else{
                rival.gang461.meeting={x:-1132,z:38};other.gang461.meeting={x:-1127,z:38.9};
            }
        }
        if(activity.incident>0&&activity.incident<6&&activity.stagedCar?.gangCache461){
            const c=activity.stagedCar;activity.stagedCar=null;
            const mover=activity.actors[2];
            if(Math.hypot(mover.x-c.x,mover.z-c.z)<9){
                c.hp=Math.max(32,c.hp-12);c.glassDamage=Math.min(.80,c.glassDamage+.15);
                if(Math.hypot(a.x-c.x,a.z-c.z)<74)g.synth.cue('metal',.32);
            }
        }
    };
    H.stepGang461=(w,g,dt,cars)=>{
        const a=w.gang461;if(!a||w.injuryState!=='walking')return false;
        if(!g.activity461?.near)return true;
        const player=g.inVehicle?g.player:g.avatar,range=Math.hypot(w.x-player.x,w.z-player.z);
        const near=range<10&&g.armed;
        const peers=g.activity461.actors;
        const rival=g.activity461.incident>0&&a.suspicion>.48&&
            peers.find(p=>p.gang461.crew!==a.crew&&p.gang461.suspicion>.48);
        a.suspicion=H.clamp(a.suspicion+dt*(near?.95:rival?0:-.5),0,1);
        const meeting=rival?a.meeting:null;
        if(meeting&&Math.hypot(meeting.x-w.x,meeting.z-w.z)>1.0&&!near){
            const yaw=Math.atan2(w.x-meeting.x,w.z-meeting.z);
            H.stepWalker(w,{forward:1,strafe:0,run:false,outdoors:true,speedFactor:.53,viewYaw:yaw},g.world.nearby(w.x,w.z),dt,cars);
            return true;
        }
        if(near||rival){
            const p=near?player:rival;
            const yaw=Math.atan2(w.x-p.x,w.z-p.z);
            w.yaw+=H.angleDiff(w.yaw,yaw)*(1-Math.exp(-dt*6));
            w.emotion443=near?'uneasy':a.crew?'talk':'defend';
            w.stride=w.vx=w.vz=0;
            return true;
        }
        a.pause-=dt;
        if(a.pause>0){w.stride=0;w.emotion443='calm';return true;}
        const [x,z]=a.route[a.index],dx=x-w.x,dz=z-w.z;
        if(Math.hypot(dx,dz)<1.3){
            a.index=(a.index+1)%a.route.length;a.pause=.44+a.crew*.37;
        }else{
            w.emotion443=null;
            H.stepWalker(w,{forward:1,strafe:0,run:false,outdoors:true,speedFactor:.28,viewYaw:Math.atan2(-dx,-dz)},
                g.world.nearby(w.x,w.z),dt,cars);
        }
        return true;
    };
})(Heatline);
