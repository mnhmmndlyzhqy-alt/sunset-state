var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461;
    const add=H.coastShape461;
    const grid=[[-324,-324],[-216,-216],[-108,-216],[0,-216],[108,-216],[324,-216],[-216,0],[-108,0],
        [0,0],[108,0],[216,0],[324,0],[-216,108],[0,108],[216,108],[-108,216],[108,216],[216,216],[324,324]];
    const key=(x,z)=>x+','+z;
    function intersectionPhase(site,seconds,axis) {
        const period=((seconds+site.offset)%32+32)%32;
        const t=(period+(axis==='x'?16:0))%32;
        return t<11.7?'green':t<14.4?'amber':'red';
    }
    const phases=['red','amber','green'];
    const lampColors={green:'#20f494',amber:'#ffb52c',red:'#ff352b'};
    function lamp(world,site,axis,sign,lateral){
        const x=site.x+(axis==='z'?lateral:-sign*16.6),z=site.z+(axis==='x'?lateral:-sign*16.6);
        const ground=H.outdoorHeight(x,z);
        const frontX=axis==='x'?-sign:0,frontZ=axis==='z'?-sign:0;
        const yaw=Math.atan2(-frontX,frontZ);
        const acrossX=axis==='z'?-Math.sign(lateral):0,acrossZ=axis==='x'?-Math.sign(lateral):0;
        const steel='#74807f',housing='#24292a';
        const pole=(dx,y,dz,w,h,d,color,shape,rotation=0)=>
            add(world,x+dx,ground+y,z+dz,w,h,d,color,'metal',shape,rotation,460);
        pole(0,.09,0,.44,.18,.44,'#555d59','rounded');
        pole(0,.29,0,.285,.34,.285,steel,'cylinder');
        pole(0,2.75,0,.182,5.16,.182,steel,'cylinder');
        pole(0,5.18,0,.233,.27,.233,steel,'rounded');
        const arm=pole(acrossX*2,5.19,acrossZ*2,.131,4.10,.131,steel,'cylinder');
        arm.roll=-acrossX*Math.PI/2;
        arm.pitch=acrossZ*Math.PI/2;
        const hx=x+acrossX*4.02,hz=z+acrossZ*4.02,hy=ground+4.61;
        const at=(y,depth,w,h,d,color,shape='rounded',material='metal')=>
            add(world,hx+frontX*depth,hy+y,hz+frontZ*depth,w,h,d,color,material,shape,yaw,460);
        at(.435,-.049,.091,.32,.108,'#434b49');
        at(.541,-.026,.159,.09,.139,steel,'rounded_smooth');
        at(0,-.086,.388,.89,.035,'#353a39','rounded_smooth');
        at(0,-.065,.374,.878,.026,'#b49a57','rounded_smooth');
        at(0,-.035,.35,.844,.077,housing,'rounded_smooth');
        at(0,.073,.214,.711,.143,'#222626','signal_visors473','rubber').webGLOnly473=true;
        const lamps=phases.map((phase,i)=>{
            const y=.199-i*.199;
            at(y,.025,.192,.029,.192,'#373f3e','cylinder','rubber').pitch=Math.PI/2;
            at(y,.05,.170,.025,.170,'#151e23','cylinder','traffic_lens473').pitch=Math.PI/2;
            const light=H.box(hx+frontX*.071,hy+y,hz+frontZ*.071,.168,.025,.168,lampColors[phase],yaw,4);
            light.shape='cylinder';light.pitch=Math.PI/2;light.glow=.91;light.material='traffic_led473';
            return light;
        });
        site.heads.push({axis,sign,x:hx,y:hy,z:hz,frontX,frontZ,lamps});
        if(site.camera){
            const camera=(depth,y,w,h,d,color,shape,material)=>add(world,x+frontX*depth,ground+y,z+frontZ*depth,
                w,h,d,color,material,shape,yaw,330);
            camera(.13,3.83,.11,.10,.32,steel,'rounded','metal');
            camera(.25,3.96,.20,.26,.20,steel,'rounded','metal');
            camera(.34,4.06,.27,.22,.48,'#d2d1c3','rounded_smooth','metal');
            camera(.41,4.183,.31,.042,.52,'#e3e1d1','rounded','metal');
            camera(.584,4.057,.194,.165,.032,'#222f34','rounded','rubber');
            camera(.609,4.057,.091,.020,.091,'#355660','cylinder','vehicle_glass444').pitch=Math.PI/2;
        }
    }
    function streetscape(w){
        const r=new H.RNG(461739);
        for(const road of w.roads461){
            const primary=['eastCoast','northRing','southRing','westExpress'].includes(road.id);
            for(let i=8;i<road.samples.length-6;i+=primary?7:12){
                const p=road.samples[i];
                if(G.keepLegacy(p.x,p.z)||p.above>.37)continue;
                for(const side of [-1,1]){
                    const x=p.x+p.nx*(road.width*.5+2.9)*side,z=p.z+p.nz*(road.width*.5+2.9)*side;
                    if(G.coast(x,z)<4.8||G.isRouteRoad(x,z)||w.nearby(x,z).some(o=>Math.abs(o.x-x)<o.hw+2.8&&Math.abs(o.z-z)<o.hd+2.8))continue;
                    const ground=H.outdoorHeight(x,z);
                    if((i+side)%4!==0){
                        const tone=['#526b48','#5c7548','#647a4e','#486943'];
                        for(let k=0;k<3;k++)add(w,x+(k-1)*.51,ground+.28+k*.075,z+(k%2)*.44,
                            .96+k*.10,.69,.94,tone[(i+k)%4],'foliage','urban_crown',r.range(0,6),345);
                    }else{
                        add(w,x,ground+1.27,z,.09,2.54,.09,'#767e71','metal','cylinder',0,420);
                        add(w,x,ground+2.41,z,.59,.52,.097,(i%3?'#dfca77':'#477c74'),'paint','rounded',Math.atan2(-p.nx,p.nz),415);
                    }
                }
            }
        }
        for(const [x,z,axis] of [[25,-41,'z'],[-293,-473,'z'],[667,-321,'z'],[-763,467,'x'],[617,373,'z']]){
            if(!G.land(x,z)||H.isAsphalt(x,z))continue;
            for(let i=0;i<5;i++){
                const a=x+(axis==='x'?i*1.22:0),b=z+(axis==='z'?i*1.22:0),y=H.outdoorHeight(a,b);
                add(w,a,y+.045,b,.42,.09,.42,'#544d43','rubber','rounded',0,220);
                add(w,a,y+.24,b,.29,.39,.29,'#df823d','paint','cone',0,220);
                add(w,a,y+.29,b,.16,.10,.16,'#e7deba','paint','cone',0,220);
            }
        }
    }
    function furnishingDowntown(w){
        let benches=0,trees=0,drains=0;
        const candidate=(x,z)=>!H.isAsphalt(x,z)&&!w.nearby(x,z).some(o=>
            Math.abs(o.x-x)<o.hw+1.18&&Math.abs(o.z-z)<o.hd+1.18);
        for(const alongX of [false,true])for(const side of [-1,1])for(const block of [-1,1]){
            const around=(distance,across)=>alongX?[block*distance,side*across]:[side*across,block*distance];
            const part=(x,z,up,lateral,height,along,color,material,shape='cube')=>{
                const ground=H.downtownFootSurface473(x,z,H.baseGround467(x,z));
                return add(w,x,ground+up,z,alongX?along:lateral,height,alongX?lateral:along,color,material,shape,0,320);
            };
            const [dx,dz]=around(22.8,12.29),dy=H.baseGround467(dx,dz);
            add(w,dx,dy+.099,dz,alongX?.63:.33,.033,alongX?.33:.63,'#444a49','metal','rounded',0,220);
            for(let i=-2;i<=2;i++){
                const [x,z]=around(22.8+i*.10,12.29);
                add(w,x,dy+.117,z,alongX?.039:.26,.008,alongX?.26:.039,'#222827','rubber','cube',0,155);
            }
            drains++;
            const [x,z]=around(31.3,14.05);
            if(candidate(x,z)){
                part(x,z,.455,.54,.089,1.82,'#997753','wood','rounded_smooth');
                const [backX,backZ]=around(31.3,14.27);
                part(backX,backZ,.702,.083,.398,1.83,'#9c7a58','wood','rounded_smooth');
                for(const leg of [-.66,.66]){
                    const [a,b]=around(31.3+leg*block,14.05);
                    part(a,b,.208,.38,.425,.115,'#424b48','metal','rounded');
                }
                w.solid(x,z,alongX?1.82:.54,alongX?.54:1.82,true);
                const [a,b]=around(33.40,13.94);
                if(candidate(a,b)){
                    part(a,b,.38,.38,.76,.38,'#536259','metal','cylinder');
                    part(a,b,.78,.41,.11,.41,'#3b4743','metal','cylinder');
                    w.solid(a,b,.41,.41,true);
                }
                benches++;
            }
            const [tx,tz]=around(75.8,14.02);
            if(candidate(tx,tz)){
                part(tx,tz,.069,1.08,.143,2.14,'#787971','concrete','rounded');
                part(tx,tz,.153,.88,.038,1.94,'#605342','wood','cube');
                part(tx,tz,1.64,.172,3.18,.17,'#79614d','bark','cylinder');
                for(const n of [-1,0,1]){
                    const [a,b]=around(75.8+n*.54,14.02);
                    part(a,b,3.26+Math.abs(n)*.12,1.83,1.62,1.42,
                        ['#527649','#466d46','#5d8051'][n+1],'foliage','urban_crown');
                }
                for(const n of [-1,1]){
                    const [a,b]=around(75.8+n*.74,14.02);
                    part(a,b,.28,.78,.39,.60,'#527454','foliage','urban_crown');
                }
                w.solid(tx,tz,alongX?2.14:1.08,alongX?1.08:2.14,true);
                trees++;
            }
        }
        w.downtownCurb473={...w.downtownCurb473,drains,benches,trees};
    }
    // 4.7.4: a small, bounded downtown finishing pass. Uses existing meshes
    // and keeps shop entrances, roads and the original world layout unchanged.
    function polishStreets474(w){
        const stats={bins:0,wayfinders:0,bikeRacks:0,planters:0,facadeLights:0,wear:0,boxes:0};
        const before=w.boxes.length;
        const ground=(x,z)=>H.downtownFootSurface473(x,z,H.outdoorHeight(x,z));
        const place=(x,z,up,width,height,depth,color,material='metal',shape='cube',cap=285,glow=0)=>{
            const p=H.box(x,ground(x,z)+up,z,width,height,depth,color,0,4,glow);
            p.material=material;p.shape=shape;p.visibilityCap=cap;p.stage474Detail=true;
            w.add(p);return p;
        };
        const canFurnish=(x,z)=>G.land(x,z)&&!H.isAsphalt(x,z)&&
            !(G.isRouteRoad?.(x,z))&&
            !w.nearby(x,z).some(o=>Math.abs(o.x-x)<o.hw+1.0&&Math.abs(o.z-z)<o.hd+1.0)&&
            !w.entrancePortals.some(p=>Math.hypot(p.x-x,p.z-z)<4.8);
        // Curbside wayfinding and bins on deliberate sidewalk pockets.
        // A 2.4m pedestrian-clear zone is kept around ordinary building entries.
        const locations=[
            [-15.1,-45],[-15.1,45],[15.1,-45],[15.1,45],
            [-45,-15.1],[-45,15.1],[45,-15.1],[45,15.1],
            [-15.3,-72],[15.3,72],[-72,15.3],[72,-15.3]
        ];
        for(let index=0;index<locations.length;index++){
            const [x,z]=locations[index];
            if(!canFurnish(x,z))continue;
            if(index%3===0){
                // Compact metal-backed district guide: no hovering text boards.
                place(x,z,.075,.47,.15,.45,'#646f67','concrete','rounded',230);
                place(x,z,1.04,.105,1.93,.10,'#667674','metal','rounded',230);
                place(x,z,2.03,.73,.74,.11,'#2b484d','metal','rounded',300);
                place(x,z,2.02,.60,.57,.03,'#97c4b2','paint','cube',300);
                place(x,z,1.94,.38,.06,.05,'#e7dcb0','light_emissive','cube',290,.23);
                stats.wayfinders++;
            }else if(index%3===1){
                // Two-part litter/recycling bins with visible opening and base.
                place(x,z,.10,.54,.20,.46,'#6c716b','concrete','rounded',225);
                place(x,z,.51,.46,.77,.42,index%2?'#506f68':'#52617b','metal','rounded',255);
                place(x,z,.91,.51,.11,.48,'#343e3e','metal','rounded',255);
                place(x,z,.912,.25,.018,.08,'#131f26','rubber','cube',200);
                stats.bins++;
            }else{
                // Bicycle loops made from low-cost reused cylinder geometry.
                for(let i=0;i<2;i++){
                    const xx=x+(i-.5)*.92;
                    place(xx-.22,z,.49,.066,.94,.065,'#8e9b9b','metal','cylinder',210);
                    place(xx+.22,z,.49,.066,.94,.065,'#8e9b9b','metal','cylinder',210);
                    place(xx,z,.96,.52,.065,.067,'#b4bebe','metal','rounded',210);
                }
                stats.bikeRacks++;
            }
        }
        // Variation near stores: petite sconces, display trims and flower boxes.
        const shops=w.retailShops.filter(v=>v.retail&&Math.abs(v.retail.centerX)<140&&
            Math.abs(v.retail.frontZ)<140).slice(0,11);
        for(const shop of shops){
            const s=shop.retail,x=s.centerX,z=s.frontZ-.065;
            if(!Number.isFinite(x+z))continue;
            for(const side of [-1,1]){
                const a=x+side*Math.min(3.5,Math.max(1.4,s.width*.40));
                place(a,z,3.11,.16,.42,.20,'#4e5656','metal','rounded',330);
                place(a,z-.105,3.13,.095,.31,.066,'#f6d9a5','light_emissive','rounded',310,.25);
                stats.facadeLights++;
            }
            if(s.width>4.8){
                const front=z-.40;
                place(x,front,.13,2.0,.26,.50,'#80695c','wood','rounded',220);
                for(const d of [-.61,-.22,.22,.61])
                    place(x+d,front,.53,.37,.39,.35,d>0?'#728456':'#60816c','foliage','urban_crown',245);
                stats.planters++;
            }
        }
        // Minor pavement wear, restrained so the city doesn't turn into a grid
        // of floating decals. These have no collision and fade out by 110m.
        for(const [i,[x,z]] of locations.entries()){
            if(!G.land(x,z)||H.isAsphalt(x,z))continue;
            for(let j=0;j<2;j++){
                const xx=x+(j?0.43:-.43),zz=z+(i%2?.28:-.28);
                const mark=place(xx,zz,.012,.40,.008,.036,(i+j)%2?'#a9a59a':'#8d8b83',
                    'concrete','cube',112);
                mark.lodMax=112;
                stats.wear++;
            }
        }
        stats.boxes=w.boxes.length-before;
        w.streetPolish474=stats;
    }

    // 4.7.5 stage 3: limited, non-colliding neighbourhood-scale storefront trim.
    // These are opt-in via a per-frame regression guard; no road/portal change.
    function polishStreets475(w){
        const stats={selected:0,wallLamps:0,pots:0,signs:0,boxes:0};
        const start=w.boxes.length;
        const shops=w.retailShops.filter(s=>s.retail&&Number.isFinite(s.retail.centerX)&&
            Number.isFinite(s.retail.frontZ)&&Number.isFinite(s.retail.width)&&s.retail.width>=4.0);
        const ground=(x,z)=>H.outdoorHeight(x,z);
        const addDetail=(x,z,y,width,h,d,color,mat,shape='rounded',range=180)=>{
            const o=H.box(x,ground(x,z)+y,z,width,h,d,color,0,4,0);
            o.material=mat;o.shape=shape;o.stage475Optional=true;
            o.detailCap475=range;o.lodMax=range;
            w.add(o);return o;
        };
        // 4.7.4 already polished downtown: new pieces serve other districts.
        for(const [index,s] of shops.entries()){
            if(index%2!==0||stats.selected>=14)continue;
            const r=s.retail,x=r.centerX,z=r.frontZ;
            if(Math.abs(x)<145&&Math.abs(z)<145)continue;
            if(!G.land(x,z))continue;
            const half=Math.min(r.width*.41,3.30);
            const accent=s.kind==='cafe'?'#c7a66d':s.kind==='gallery'?'#7ab2aa':'#8da7ae';
            for(const sign of [-1,1]){
                const sx=x+sign*half;
                // Tiny exterior light and elegant storefront transom detail.
                addDetail(sx,z-.025,2.82,.11,.33,.15,'#435258','metal','rounded',190);
                addDetail(sx,z-.135,2.82,.08,.22,.065,accent,'light_emissive','rounded',190);
                stats.wallLamps++;
            }
            // Keep door center clear; trim stays on the wall plane.
            addDetail(x,z-.016,3.45,Math.min(4.5,r.width*.65),.07,.082,
                '#a7a599','metal','rounded',210);stats.signs++;
            if(index%4===0){
                const px=x-half,zp=z-.33;
                // Compact wall-mounted planter, no collision added.
                addDetail(px,zp,.47,.63,.27,.31,'#746d5c','stone','rounded',135);
                addDetail(px,zp,.79,.51,.37,.31,'#52724d','foliage','urban_crown',145);
                stats.pots++;
            }
            stats.selected++;
        }
        stats.boxes=w.boxes.length-start;
        w.streetPolish475=stats;
    }

    H.buildStreets461=w=>{
        H.buildDowntownCorners473(w);
        furnishingDowntown(w);
        polishStreets474(w);
        polishStreets475(w);
        const byKey=new Map();
        for(const [i,[x,z]] of grid.entries()){
            if(!G.land(x,z))continue;
            const site={x,z,camera:i%3!==1,limit:i%3===1?55:50,offset:(i*7.19)%32,heads:[]};
            byKey.set(key(x,z),site);
            for(const sign of [-1,1]){
                lamp(w,site,'x',sign,sign*15.6);
                lamp(w,site,'z',sign,-sign*15.6);
            }
        }
        w.traffic461=byKey;
        streetscape(w);
    };
    function approach(c,world,x=c.x,z=c.z,range=44){
        if(c.coastDeck461||c.deck443)return null;
        const dx=-Math.sin(c.yaw),dz=-Math.cos(c.yaw),axis=Math.abs(dx)>Math.abs(dz)?'x':'z';
        if(Math.max(Math.abs(dx),Math.abs(dz))<.86)return null;
        const sign=Math.sign(axis==='x'?dx:dz),along=axis==='x'?x:z,across=axis==='x'?z:x;
        const cross=Math.round(across/H.BLOCK)*H.BLOCK;
        const node=Math.round((along+sign*12)/H.BLOCK)*H.BLOCK;
        if(Math.abs(across-cross)>10.7)return null;
        const site=world.traffic461?.get(axis==='x'?key(node,cross):key(cross,node));
        const gap=(node-along)*sign-13.0;
        return site&&gap>-8&&gap<range?{site,axis,sign,gap}:null;
    }
    H.signalStops461=(world,c,time)=>{
        const near=approach(c,world);
        if(!near||near.gap<-1.2||near.gap>Math.max(6,Math.min(43,6+c.speed*c.speed/24)))return false;
        const phase=intersectionPhase(near.site,time,near.axis);
        return phase==='red'||phase==='amber'&&near.gap>Math.max(3.3,c.speed*.35);
    };
    H.emitSignals461=(g,out)=>{
        for(const site of g.world.traffic461.values()){
            if(Math.hypot(site.x-g.cam.x,site.z-g.cam.z)>350)continue;
            const x=phases.indexOf(intersectionPhase(site,g.seconds,'x'));
            const z=phases.indexOf(intersectionPhase(site,g.seconds,'z'));
            for(const head of site.heads)out.push(head.lamps[head.axis==='x'?x:z]);
        }
    };
    function issue(g,reason,nominal){
        const amount=Math.min(nominal,Math.max(0,g.profile.credits));
        g.profile.credits-=amount;g.saveProfile();
        g.crimeHistory460.fines+=amount;g.saveCrimeHistory460();
        g.trafficRecord461.tickets++;g.trafficRecord461.paid+=amount;
        g.lawNote460(reason+' · קנס '+amount+' קרדיטים',4.5);
        const ui=document.getElementById('traffic-ticket461');
        ui.textContent=reason+' · '+amount+' קרדיטים';ui.hidden=false;
        g.trafficRecord461.hudUntil=g.seconds+5.0;
    }
    H.processTraffic461=(g,car,oldX,oldZ)=>{
        const state=g.trafficRecord461??={tickets:0,paid:0,chase:null,hudUntil:0,cooldown:-100};
        if(state.chase){
            const s=state.chase,range=Math.hypot(car.x-s.x,car.z-s.z);
            if(car.speed<1.35)state.chase=null;
            else if(g.seconds-s.at>3.1&&range>45){
                state.chase=null;
                issue(g,'אי עצירה לשוטר',125);
                g.reportOffense('traffic stop evasion',car.x,car.z,3,'officer');
            }
        }
        if(g.seconds-state.cooldown<4.5)return;
        const a=approach(car,g.world,oldX,oldZ,10);
        if(!a||a.gap<=0)return;
        const coordinate=a.axis==='x'?car.x:car.z,node=a.axis==='x'?a.site.x:a.site.z;
        if((node-coordinate)*a.sign-13.0>0)return;
        const red=intersectionPhase(a.site,g.seconds,a.axis)==='red',speed=car.speed*3.6,fast=speed>a.site.limit+7.5;
        if(!red&&!fast)return;
        const officers=g.officers.filter(o=>o.mode!=='stranded');
        const witness=officers.some(o=>{
            const eye=o.mode==='riding'?o.car:o.walker;
            if(Math.hypot(eye.x-car.x,eye.z-car.z)>40)return false;
            return H.seesVehicleAction({...eye,radius:40},car,g.world.nearby((eye.x+car.x)*.5,(eye.z+car.z)*.5),false);
        });
        if(!witness&&!a.site.camera)return;
        state.cooldown=g.seconds;
        const detail=red?'מעבר באור אדום':'חריגה מהמגבלה '+a.site.limit+' קמ״ש';
        issue(g,(witness?'שוטר · ':'מצלמת דרך · ')+detail,red&&fast?150:red?100:Math.min(150,55+Math.round((speed-a.site.limit)*1.9)));
        if(witness){state.chase={x:car.x,z:car.z,at:g.seconds};g.lawNote460('שוטר מסמן לעצור בצד',4);}
    };
    H.updateTrafficHud461=g=>{
        const ui=document.getElementById('traffic-ticket461');
        if(ui)ui.hidden=!(g.trafficRecord461?.hudUntil>g.seconds&&g.running&&!g.showFullMap);
    };
    H.intersectionPhase461=intersectionPhase;
})(Heatline);
