var Heatline=globalThis.Heatline||{};
(function(H){
    const moods={calm:[.03,.045,.04,0],talk:[.23,0,.09,.11],alarm:[.79,.64,-.18,.27],
        surrender:[.50,.32,-.07,.46],defend:[-.56,.15,.12,.72],uneasy:[.6,.18,-.061,.35],phone:[.25,0,.04,.30]};
    const expressionStates=new WeakMap();
    H.expression443=(actor,t)=>{
        const seed=(actor.appearance||0)*.371+(actor.style||0)*.043;
        const named=actor.emotion443, listening=actor.socialPose==='chat'||actor.socialPose==='listen';
        const mode=named||((actor.emergencyCall441||0)>t?'phone':actor.fear>.54?'alarm':listening?'talk':'calm');
        const pace=3.5+(Math.abs(seed)%2.1), phase=((t+seed)%pace+pace)%pace;
        const blink=H.clamp(1-Math.abs(phase-.24)/.094,0,1);
        const nervous=Math.sin(t*5.3+seed)*.038;
        const phrase=Math.max(0,Math.sin(t*2.4+seed)*.69+.31);
        const talk=.06+.60*Math.abs(Math.sin(t*11.7+seed)*Math.cos(t*4.7))*phrase;
        const [brow,restMouth,pitch,arms]=moods[mode]||moods.calm;
        const mouth=mode==='talk'?talk:mode==='phone'?talk*.68:restMouth;
        const tilt=Math.sin(t*1.5+seed)*.034, turn=Math.sin(t*.81+seed)*.105;
        const desired={mode,vector:[blink,brow,mouth,mode==='talk'?.33:mode==='defend'?-.60:mode==='alarm'?-.22:0],
            pitch:pitch+nervous*(mode==='calm'?.2:1)-(mode==='talk'?.054*Math.sin(t*5.3+seed)*phrase:0),
            yaw:turn+(mode==='uneasy'?.11*Math.sin(t*2.4+seed):0),roll:tilt,arms:arms*(.88+.12*phrase),t};
        const prior=expressionStates.get(actor);
        if(prior&&t>=prior.t&&t-prior.t<.75){
            const blend=1-Math.exp(-(t-prior.t)*12);
            for(const key of ['pitch','yaw','roll','arms'])desired[key]=H.lerp(prior[key],desired[key],blend);
            for(const i of [1,2,3])desired.vector[i]=H.lerp(prior.vector[i],desired.vector[i],i===2?Math.min(1,blend*2.4):blend);
        }
        expressionStates.set(actor,desired);
        return desired;
    };

    H.plantStreetLife443=function(world){
        const rng=new H.RNG(443051), palette=['#586b41','#66814b','#738454','#435e3e'];
        const evergreen=[];
        const solidAt=(x,z,pad)=>world.nearby(x,z).some(s=>Math.abs(x-s.x)<s.hw+pad&&Math.abs(z-s.z)<s.hd+pad);
        const approve=(x,z,pad)=>!H.isAsphalt(x,z)&&!H.openSea444(x,z)&&!solidAt(x,z,pad)&&
            !world.entrancePortals.some(p=>Math.hypot(x-p.x,z-p.z)<6.3)&&
            !evergreen.some(p=>Math.hypot(x-p.x,z-p.z)<3.8);
        function mesh(x,y,z,w,h,d,c,mat,shape,yaw=0){
            const o=H.box(x,y,z,w,h,d,c,yaw,4);
            o.material=mat;o.shape=shape;o.visibilityCap=510;world.add(o);
        }
        function plant(x,z,tree){
            if(!approve(x,z,tree?2.7:1.35))return false;
            const y=H.outdoorHeight(x,z), size=tree?rng.range(4.8,7.3):rng.range(.64,1.23);
            evergreen.push({x,z,tree});
            if(tree){
                mesh(x,y+size*.37,z,.25,size*.74,.25,'#63574b','bark','cylinder');
                for(const side of [-1,1]){
                    mesh(x+side*.33,y+size*.59,z+side*.18,.14,size*.33,.14,'#6b5f4c','bark','cylinder');
                    const branch=world.boxes[world.boxes.length-1];branch.roll=side*.53;
                }
            }
            const count=tree?5:4;
            for(let i=0;i<count;i++){
                const a=i*2.399963,r=(tree?1.09:.43)*(1-i/count), height=y+(tree?size*.68+size*i*.040:size*.47+i*.077);
                mesh(x+Math.cos(a)*r,height,z+Math.sin(a)*r,tree?size*.48:size*1.22,tree?size*.45:size*.88,
                    tree?size*.45:size*1.26,palette[i%palette.length],'foliage','urban_crown',a);
            }
            if(tree)world.solid(x,z,.32,.32,true);
            return true;
        }
        for(const [i,park] of world.parkCenters.entries()){
            for(let j=0;j<11;j++){
                const angle=(i*.81+j*.63),r=24+rng.next()*8;
                plant(park.x+Math.cos(angle)*r,park.z+Math.sin(angle)*r,j%4===0);
            }
        }
        for(const [px,pz] of [[270,-271],[-326,284],[272,-262],[378,-270],[280,-435]]){
            for(const offset of [-24,-18,17,23]){
                plant(px+offset,pz-12,false);
                plant(px+offset,pz-21,Math.abs(offset)>20);
            }
        }
        for(const side of [-1,1])for(let z=-741;z<-229;z+=23){
            if(Math.abs(z-Math.round(z/H.BLOCK)*H.BLOCK)<20)continue;
            const x=216+side*(19.8+rng.next()*3.4);
            plant(x,z,z%4===1);
        }
        world.streetPlanting443={shrubs:evergreen.filter(p=>!p.tree).length,trees:evergreen.filter(p=>p.tree).length};
    };
})(Heatline);
