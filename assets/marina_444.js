var Heatline=globalThis.Heatline||{};
(function(H){
    const berths=[{id:0,x:-993,z:816,boardX:-993,boardZ:821,yaw:Math.PI*.5,name:'סירת סיור',paint:'#c5d1cd',speed:15.6},
        {id:1,x:-986,z:825.5,boardX:-986,boardZ:821,yaw:Math.PI*.5,name:'סירת ספורט',paint:'#ac4e3b',speed:22.2}];
    const race=[[-1083,823],[-1128,771],[-1136,692],[-1128,612],[-1094,580],[-1086,755],[-1065,805]];
    const model=(x,y,z,w,h,d,color,yaw,material,shape='cube')=>{
        const o=H.box(x,y,z,w,h,d,color,yaw,4);o.material=material;o.shape=shape;o.visibilityCap=500;return o;
    };
    H.buildMarina444=world=>{
        const add=(...args)=>world.add(model(...args));
        for(const {west,east,north,south} of H.maritimeBasin444){
            const water=H.box((west+east)*.5,-.067,(north+south)*.5,east-west,.040,south-north,'#397780',0,3);
            water.material='water39';water.visibilityCap=960;world.add(water);
        }
        const ground=H.box(-1032,.072,593.5,70,.16,289,'#998e7e',0,3);
        ground.material='paving';ground.visibilityCap=675;world.add(ground);
        const road=H.box(-1005,.10,454.2,114,.095,9.8,'#62635c',0,3);
        road.material='asphalt';world.add(road);
        for(const x of [-1066.8,-997.2]){
            const seawall=Array.from({length:27},(_,i)=>({x,z:452+i*288/26,nx:1,nz:0,bottom:-.68,top:.36}));
            H.addRetainingWall444(world,seawall,1.14,{face:'#887f73',trim:'#a79986',cap:'#b4a58c'});
        }
        const quay=Array.from({length:17},(_,i)=>({x:-1067+i*70/16,z:739.7,nx:0,nz:-1,bottom:-.68,top:.91}));
        H.addRetainingWall444(world,quay,1.2,{face:'#8a8276',trim:'#a79885',cap:'#b4a58c'});
        for(let x=-1021;x<=-932;x+=1.25){
            add(x,.20,821,1.24,.29,3.9,(Math.round(x*4)%4===0?'#baac91':'#a8987c'),0,'wood');
            if(Math.round(x*4)%20===0)for(const side of [-1,1]){
                add(x,.11,821+side*1.72,.24,.73,.24,'#605846',0,'wood','cylinder');
                add(x,.56,821+side*1.73,.32,.22,.30,'#837864',0,'metal','rounded');
            }
        }
        for(let i=0;i<5;i++)add(-940-i*.83,.12+i*.017,821,.88,.23,3.65,'#ad9b7f',0,'wood');
        for(const berth of berths){
            add(berth.boardX,.52,821,.28,.53,.28,'#655d48',0,'wood','cylinder');
            add(berth.boardX,.83,821,.68,.26,.13,'#527475',0,'paint','rounded');
            add(berth.boardX,.84,821-.073,.40,.085,.02,'#e5dbc0',0,'paint');
        }
        world.marina444={berths,race};
        world.explorationHubs.push({id:world.explorationHubs.length,x:-939,z:821,label:'רציף סירות המרינה',kind:'marina'});
    };
    H.boatWater444=(x,z)=>{
        if(x<-1172||x>-948||z<453||z>858||!H.openSea444(x,z))return false;
        if(z>818.5&&z<823.4&&x>-1026)return false;
        for(const dock of [560,630,700,770])
            if(x>-1057&&Math.abs(z-dock)<16.8)return false;
        return true;
    };
    H.marinaWalk444=(x,z)=>!H.openSea444(x,z)||x>-1024&&Math.abs(z-821)<2.22||
        x>=-1048&&x<=-949&&[560,630,700,770].some(dock=>Math.abs(z-dock)<2.38);
    H.maritimeModel444=(boat,out,t,simple)=>{
        const wave=.045*Math.sin(t*2.65+boat.x*.035)+.024*Math.cos(t*1.83+boat.z*.061);
        const yaw=-boat.yaw;
        const pitch=(boat.pitch||0)+.023*Math.sin(t*2.26+boat.x*.036),roll=(boat.roll||0)+.027*Math.cos(t*2.09+boat.z*.028);
        const scale=boat.id===0?1:.86;
        const part=(x,y,z,w,h,d,color,material,shape='rounded_smooth')=>{
            const q=H.rotateBoxLocal({yaw,pitch,roll},x*scale,y*scale,z*scale);
            const o=model(boat.x+q[0],wave+q[1],boat.z+q[2],w*scale,h*scale,d*scale,color,yaw,material,shape);
            o.roll=roll;o.pitch=pitch;out.push(o);
        };
        part(0,.27,0,2.66,.89,7.10,boat.paint,'premium_paint',simple?'wedge':'marina_hull444');
        part(0,.632,.08,2.08,.185,5.63,'#a78e75','wood');
        part(0,.72,.78,1.74,.25,2.62,'#4a514f','rubber');
        part(0,.954,.59,1.62,.267,.77,'#c1b3a0','fabric');
        part(0,1.10,.90,1.61,.52,.24,'#c7b9a4','fabric');
        part(0,1.09,-1.49,1.79,.21,.59,'#b4b8b5','metal');
        part(0,1.30,-1.61,1.80,.39,.17,'#546e78','vehicle_glass444');
        part(0,.44,3.01,.79,.35,.83,'#414a49','metal');
        for(const side of [-1,1]){
            part(side*1.15,.69,.22,.112,.14,4.91,'#c9cbbe','metal');
            for(const z of [-1.95,1.37])part(side*1.04,.85,z,.16,.17,.19,'#b4bbba','metal');
            part(side*.92,.82,-1.87,.151,.116,.23,side===-1?'#b75a45':'#5a9d75','paint');
        }
    };
    H.emitMarina444=(game,out)=>{
        const marina=game.world.marina444;
        if(!marina)return;
        const moving=game.boat444;
        const local=(x,z,range)=>(x-game.cam.x)**2+(z-game.cam.z)**2<range*range;
        for(const berth of marina.berths){
            if(moving?.id!==berth.id&&H.privateFleet53?.sourceBlocked('boat',String(berth.id)))continue;
            const boat=moving?.id===berth.id?moving:berth;
            if(local(boat.x,boat.z,245))H.maritimeModel444(boat,out,game.seconds,!game.renderer.gl);
        }
        if(!local(-1035,715,370))return;
        for(const [i,[x,z]] of marina.race.entries()){
            const y=.33+.07*Math.sin(game.seconds*2.65+i);
            const next=moving?.race?.index===i;
            out.push(model(x,y,z,.59,.55,.59,next?'#dbab54':'#bb6c50',0,'paint','cylinder'));
            out.push(model(x,y+.52,z,.135,.69,.135,'#7b7c74',0,'metal','cylinder'));
            const beacon=model(x,y+.93,z,.23,.18,.23,next?'#fcda79':'#d8c49a',0,'light_emissive','sphere');
            beacon.glow=next?.9:.18;out.push(beacon);
        }
    };
    H.marinaFoam444=(boat,decals)=>{
        for(const wake of boat.wake){
            const length=.69+(1-wake.age)*1.31;
            const dx=-Math.sin(wake.yaw)*length,dz=Math.cos(wake.yaw)*length;
            decals.push({x0:wake.x-dx,z0:wake.z-dz,x1:wake.x+dx,z1:wake.z+dz,
                width:.23+(1-wake.age)*.58,strength:-1.04-wake.age*.64,age:0,waterFoam444:true});
        }
    };
})(Heatline);
