var Heatline=globalThis.Heatline||{};
(function(H){
    const byId=id=>document.getElementById(id);
    const stories=[
        ['מיה','טוב שהגעת. לפני שסוגרים את הרציף הישן, אני רוצה שתבדוק מה נשאר ממנו. תתחיל במצפור המערבי.'],
        ['הודעה ממיה','מכאן רואים את כל הדרך לנמל. פגשתי שם פעם את יונתן. גש לרציף הדרומי ושאל אותו על תחנת הקשר.'],
        ['יונתן','תחנת הקשר כבר לא משדרת, אבל המצוף עדיין במקום. חפש את הפנס הכחול מתחת לרציף. תיזהר מעמודי העגינה.'],
        ['פתק בקופסה','רישום המסוף הישן. להחזיר למיה ליד אולם התצוגה.'],
        ['מיה','הנה זה. שמות הספינות, שעות העגינה וההקלטה האחרונה. עכשיו נוכל לשמור את הסיפור של הרציף. תודה.']
    ];
    const stations=[
        {name:'כבויה',tracks:[]},
        {name:'שדרות 91.4',tracks:['radio-boulevard']},
        {name:'שקט בחוף 103.7',tracks:['radio-quay']}
    ];
    H.Audio445=class{
        constructor(game){
            this.game=game;this.station=0;this.track=0;
            this.radio=new Audio();
            this.radio.addEventListener('ended',()=>{if(this.station){this.track++;this.playTrack();}});
            this.hud=byId('radio-hud445');this.caption=byId('story-caption445');
        }
        volume(){return Number(byId('sound-volume').value)/100;}
        audible(){return byId('sound-button').dataset.off!=='1'&&this.game.running&&!this.game.over&&!this.game.paused;}
        subtitle(speaker,line){
            const label=document.createElement('b');
            label.textContent=speaker+' · ';this.caption.replaceChildren(label,document.createTextNode(line));
            this.caption.hidden=false;this.captionUntil=this.game.seconds+13.7;
        }
        nextStation(){
            if(byId('sound-button').dataset.off==='1')byId('sound-button').click();
            this.station=(this.station+1)%stations.length;this.track=0;
            this.hud.hidden=false;this.displayUntil=this.game.seconds+5;
            this.hud.textContent='B · רדיו '+stations[this.station].name;
            this.playTrack();
        }
        playTrack(){
            this.radio.pause();
            const s=stations[this.station];if(!s.tracks.length)return;
            this.radio.src='assets/audio445/'+s.tracks[this.track%s.tracks.length]+'.wav';
            this.update();
        }
        update(){
            const g=this.game;
            this.hud.hidden=!(this.displayUntil>g.seconds&&g.running&&g.inVehicle);
            this.caption.hidden=!(this.captionUntil>g.seconds&&g.running&&!g.over);
            if(!this.audible()||!g.inVehicle||!this.station){
                if(!this.radio.paused)this.radio.pause();
                return;
            }
            this.radio.volume=this.volume()*.76;
            if(this.radio.paused&&!this.radio.ended&&!this.playing){
                this.playing=true;this.radio.play().catch(()=>{}).finally(()=>{this.playing=false;});
            }
        }
        reset(){this.captionUntil=this.displayUntil=0;this.radio.pause();}
    };

    const buoy={x:-982,z:810,y:-1.7};
    H.Story445=class{
        constructor(game){
            this.game=game;this.step=0;
            try{this.step=H.clamp(Number(localStorage.getItem('sunset_story445'))||0,0,5)|0;}catch{}
        }
        destination(){
            const w=this.game.world,contact=H.cityPlan463.storyContact;
            if(this.step===5)return null;
            const points=[contact,w.ridgeRoad443.view,{x:-1001,z:821},buoy,contact];
            return {...points[this.step],name:this.step===0?'קו המים · מיה ליד אולם התצוגה':
                this.step===1?'קו המים · מצפור הרכס':this.step===2?'קו המים · רציף דרומי':
                this.step===3?'קו המים · מצוף הקשר':'קו המים · חזרה למיה'};
        }
        near(){
            const a=this.game.avatar,target=this.destination();
            return target&&Math.hypot(a.x-target.x,a.z-target.z)<(this.step===1?7:3.5);
        }
        interact(){
            const g=this.game,a=g.avatar;
            if(!this.near()||g.inside||g.inVehicle||g.boat444||g.roofVisit||g.onBus>=0||g.onTram>=0)return false;
            if(this.step===3&&(!a.swim445||a.swim445.depth<.8)){
                g.showInfo('צללו ליד מצוף הקשר עם Shift ולחצו E',3);return true;
            }
            const [speaker,line]=stories[this.step++];
            const host=g.pedestrians.find(w=>w.storyContact445===speaker);
            if(host)host.storyTalk445=g.seconds+4.7;
            g.audio445.subtitle(speaker,line);
            try{localStorage.setItem('sunset_story445',String(this.step));}catch{}
            if(this.step===5){
                H.awardCredits(g.profile,380);g.saveProfile();
                g.rewardFlash=.95;g.showInfo('קו המים הושלם · 380 קרדיטים',6);
            }else g.showInfo(this.destination().name,4.8);
            if(g.nav445.target?.story)g.nav445.clear();
            return true;
        }
        hint(){
            if(!this.near())return '';
            return this.step===3?'E · איסוף הקלטה מתחת למים':this.step===0||this.step===4?'E · שיחה עם מיה':'E · המשך קו המים';
        }
    };
    H.seedStory445=g=>{
        const {x,z}=H.cityPlan463.storyContact;
        for(const [name,x0,z0,yaw,model] of [['מיה',x,z,0,H.URBAN441.clerks[2]],['יונתן',-1001,821,Math.PI,H.URBAN441.residents[3]]]){
            const w=H.createWalker(x0,z0,yaw,5);
            w.y=H.outdoorHeight(x0,z0);w.storyContact445=name;w.urbanModel441=model;
            g.pedestrians.push(w);
        }
    };
    H.storyBuoy445=buoy;
    H.canSwim445=(x,z)=>x>-1176&&x<-948&&z>450&&z<857&&H.openSea444(x,z)&&!H.marinaWalk444(x,z);
    H.startSwimming445=g=>{
        const a=g.avatar;
        a.swim445={depth:0,air:30,stroke:0,hudAt:0};a.grounded=false;a.support=null;
        a.vy=0;a.deck443=false;g.armed=false;
    };
    H.stepSwim445=(g,gas,strafe,dt)=>{
        const a=g.avatar,s=a.swim445,turn=g.footCameraYaw;
        const swimSpeed=s.depth>.6?2.94:3.5,n=Math.max(1,Math.hypot(gas,strafe));
        const blend=1-Math.exp(-dt*4.5);
        a.vx=H.lerp(a.vx,(-Math.sin(turn)*gas+Math.cos(turn)*strafe)/n*swimSpeed,blend);
        a.vz=H.lerp(a.vz,(-Math.cos(turn)*gas-Math.sin(turn)*strafe)/n*swimSpeed,blend);
        const x=a.x+a.vx*dt,z=a.z+a.vz*dt;
        const solid=g.world.nearby(x,z).some(p=>Math.abs(p.x-x)<p.hw+.39&&Math.abs(p.z-z)<p.hd+.39);
        if(!solid){
            if(H.canSwim445(x,z)){a.x=x;a.z=z;}
            else if(H.marinaWalk444(x,z)&&s.depth<.37){
                a.x=x;a.z=z;a.y=H.outdoorHeight(x,z);a.vx=a.vz=a.vy=0;a.grounded=true;a.swim445=null;
                byId('underwater445').classList.remove('active');return;
            }else{a.vx*=.79;a.vz*=.79;}
        }
        const speed=Math.hypot(a.vx,a.vz);
        if(speed>.22)a.yaw+=H.angleDiff(a.yaw,Math.atan2(-a.vx,-a.vz))*(1-Math.exp(-dt*7));
        s.stroke+=dt*(1.28+speed*1.23);a.stride=H.clamp(speed/2.7,.21,1);a.phase=s.stroke;
        const dive=g.is('ShiftLeft','ShiftRight')&&s.air>1,up=g.is('Space')||s.air<.9;
        if(dive&&!up)s.depth=Math.min(3.05,s.depth+dt*1.65);
        else if(up)s.depth=Math.max(0,s.depth-dt*2.15);
        s.air=H.clamp(s.air+dt*(s.depth>.61?-1:7),0,30);
        a.y=-s.depth-.31+Math.sin(s.stroke*1.31)*.047;
        const underwater=s.depth>.52;
        byId('underwater445').classList.toggle('active',underwater);
        if(g.seconds>s.hudAt){s.hudAt=g.seconds+.19;g.updateHUD();}
    };
    H.cameraSwim445=(g,dt)=>{
        const a=g.avatar,s=a.swim445,rx=Math.sin(g.footCameraYaw),rz=Math.cos(g.footCameraYaw),deep=s.depth>.55;
        g.cam.underwater445=deep;
        const eye={x:a.x,y:deep?a.y-.05:.64,z:a.z},goal={x:a.x+rx*4.4,y:deep?a.y+.12:2.10,z:a.z+rz*4.4};
        const hit=g.cameraClearance(eye,goal,.20),f=1-Math.exp(-dt*7);
        g.cam.x=H.lerp(g.cam.x,hit.x,f);g.cam.y=H.lerp(g.cam.y,hit.y,f);g.cam.z=H.lerp(g.cam.z,hit.z,f);
        g.cam.tx=H.lerp(g.cam.tx,a.x-rx*1.6,f);g.cam.tz=H.lerp(g.cam.tz,a.z-rz*1.6,f);
        g.cam.ty=H.lerp(g.cam.ty,deep?a.y-.12:.05,f);
        g.cam.fov=H.lerp(g.cam.fov,deep?72:65,f);
    };
    H.swimmerPose445=(a,out,t,gl)=>{
        const swimmer=a.swim445,begin=out.length,yaw=-a.yaw,c=Math.cos(yaw),s=Math.sin(yaw);
        const copy={...a,grounded:true,phase:swimmer.stroke};
        H.aerowildPlayerPose(copy,out,t,gl);
        for(let i=begin;i<out.length;i++){
            const p=out[i],dx=p.x-a.x,dz=p.z-a.z,x=c*dx+s*dz,z=-s*dx+c*dz,y=p.y-a.y;
            const lift=z*.21+y*.12;
            const along=-y*.91+z*.21+.68;
            p.x=a.x+c*x-s*along;p.z=a.z+s*x+c*along;p.y=a.y+lift;
            p.pitch=(p.pitch||0)+1.42;
        }
    };
    H.decorateDiving445=world=>{
        const add=(x,y,z,w,h,d,color,shape,material)=>{
            const p=H.box(x,y,z,w,h,d,color,0,4);p.shape=shape;p.material=material;p.visibilityCap=120;world.add(p);
        };
        add(buoy.x,.14,buoy.z,.44,.42,.44,'#4a96ac','rounded','paint');
        add(buoy.x,-.11,buoy.z,.072,3.0,.072,'#6b7c75','cylinder','metal');
        add(buoy.x,-1.55,buoy.z,.71,.39,.48,'#b3d6c3','rounded','light_emissive');
        add(buoy.x,-1.8,buoy.z,.85,.17,.65,'#6f7058','rounded','metal');
        add(-1079,-4.02,820,89,.48,72,'#7e7a64','cube','paving');
        const rng=new H.RNG(445203);
        for(let i=0;i<38;i++){
            const x=rng.range(-1095,-1024),z=rng.range(794,851);
            if(!H.canSwim445(x,z))continue;
            const d=rng.range(.34,1.17);
            add(x,-3.74,z,d,.59,d*.81,i%2?'#6d7465':'#827764','rounded','concrete');
        }
        for(let x=-1020;x<-947;x+=5)
            for(const dz of [-1.67,1.67])add(x,-1.53,821+dz,.19,3.08,.19,'#62554b','cylinder','wood');
    };
})(Heatline);
