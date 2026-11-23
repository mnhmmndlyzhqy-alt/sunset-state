var Heatline=globalThis.Heatline||{};
(function(H){
    function part(world,x,z,y,w,h,d,color,material='concrete',shape='cube',yaw=0,lod=300){
        const b=H.box(x,y,z,w,h,d,color,yaw,4);b.material=material;b.shape=shape;b.visibilityCap=lod;world.add(b);return b;
    }
    H.buildRail445=world=>{
        const road=H.RAIL_LOOP,run=[];
        let deckCount=0,pillarCount=0,lastCap=-Infinity;
        const reservedSupports=new Set();
        const flush=()=>{
            if(run.length<2){run.length=0;return;}
            const rows=(lo,hi,dy,subset=run)=>subset.map(p=>[lo,hi].map(o=>[p.x+p.nx*o,p.y+dy,p.z+p.nz*o]));
            H.addRibbon444(world,rows(-2.23,2.23,.02),{color:'#827970',material:'concrete',visibility:800,layer:4});
            H.addRibbon444(world,rows(-1.94,1.94,.051),{color:'#55504a',material:'asphalt',visibility:750,layer:4});
            for(const side of [-1,1]){
                H.addRibbon444(world,rows(side*1.10-.07,side*1.10+.07,.186),{color:'#a8acaa',material:'metal',visibility:800,layer:4});
                H.addRetainingWall444(world,run.map(p=>({...p,x:p.x+side*2.16,z:p.z+side*2.16,top:p.y+.035,
                    bottom:p.y-.13-Math.min(.57,p.height*.33)})),.20,{face:'#807b70',trim:'#8f877b',cap:'#9d9386'});
            }
            // Slender posts only on the elevated span. The track bed stays unobstructed at street level.
            for(let i=0;i<run.length;i++){
                const p=run[i];
                if(i%2===0)part(world,p.x,p.z,p.y+.093,3.33,.082,.22,'#7c7161','wood','cube',p.yaw,350);
                if(p.height<1.25||p.s-lastCap<23)continue;
                const median=Math.abs(p.z-H.TRAM_Z)<9&&Math.abs(p.nx)<.33&&Math.abs(p.x-H.toRoadNode(p.x))>16;
                const clear=f=>!H.openSea444(f.x,f.z)&&!world.nearby(f.x,f.z).some(s=>Math.abs(f.x-s.x)<s.hw+1.15&&Math.abs(f.z-s.z)<s.hd+1.15);
                const offRoad=offset=>({x:p.x+p.nx*offset,z:p.z+p.nz*offset});
                const candidate=median?{x:p.x,z:H.TRAM_Z}:[0,16.5,-16.5,22,-22,27,-27].map(offRoad)
                    .find(f=>!H.isAsphalt(f.x,f.z)&&clear(f));
                if(!candidate||!median&&p.height<4.5&&Math.hypot(candidate.x-p.x,candidate.z-p.z)>5||!clear(candidate))continue;
                const f=candidate,floor=H.outdoorHeight(f.x,f.z),height=p.y-floor-.52;
                if(height<.45)continue;
                const reserved=median?Math.round(p.x/17):null;
                if(!median||!reservedSupports.has(reserved)){
                    if(median)reservedSupports.add(reserved);
                    part(world,f.x,f.z,floor+height*.5,1.47,height,1.77,'#a39b8c','concrete','rounded',p.yaw,900);
                    part(world,f.x,f.z,floor+.145,1.96,.31,2.34,'#817c71','concrete','rounded',p.yaw,740);
                    pillarCount++;
                }
                const span=Math.hypot(p.x-f.x,p.z-f.z);
                part(world,(p.x+f.x)*.5,(p.z+f.z)*.5,p.y-.49,span+3.14,.56,2.31,'#918879','concrete','rounded',p.yaw,900);
                lastCap=p.s;
            }
            deckCount+=run.length;run.length=0;
        };
        for(const p of road){
            if(Math.abs(p.x)<432){flush();continue;}
            const height=p.y,y=H.outdoorHeight(p.x,p.z)+height+.11;
            run.push({...p,height,y,nx:Math.cos(p.yaw),nz:-Math.sin(p.yaw)});
        }
        flush();
        world.stage36RailStats={deckCount,pillarCount,routeKm:Math.round(H.RAIL_LOOP_LENGTH/10)/100};
    };

    H.buildBusStops445=world=>{
        for(const stop of H.BUS_STOPS){
            const {x,z,cx,cz}=stop, yaw=Math.atan2(-cz,cx), across=(f,t)=>({x:x+cx*f+cz*t,z:z+cz*f-cx*t});
            const put=(f,t,y,w,h,d,color,mat,shape)=>{
                const p=across(f,t);
                return part(world,p.x,p.z,H.outdoorHeight(p.x,p.z)+y,w,h,d,color,mat,shape,yaw,320);
            };
            const back=across(2.1,0);
            const clean=[-2.66,2.66].every(t=>{
                const p=across(2.8,t);
                return !H.isAsphalt(p.x,p.z)&&!world.nearby(p.x,p.z).some(s=>Math.abs(p.x-s.x)<s.hw+.45&&Math.abs(p.z-s.z)<s.hd+.45);
            });
            if(clean){
                put(1.75,0,2.67,2.25,.14,5.26,'#777761','metal','rounded');
                put(2.85,0,1.61,.09,1.58,4.66,'#819393','shop_glazing');
                for(const t of [-2.42,2.42])put(2.86,t,1.31,.14,2.62,.15,'#4f5b57','metal');
                put(2.24,.3,.54,.61,.14,2.66,'#9c7955','wood','rounded');
                put(2.33,.3,.82,.12,.29,2.65,'#977c63','wood','rounded');
                for(const t of [-.72,1.29])put(2.20,t,.28,.29,.51,.16,'#565951','metal');
                stop.shelter=true;
            }else stop.shelter=false;
            put(.29,-2,1.50,.12,2.96,.12,'#58665e','metal','cylinder');
            put(.29,-2,2.91,.33,.39,.65,'#33766a','paint','rounded');
            put(.18,-2,2.93,.027,.10,.42,'#dfcc9e','light_emissive');
            stop.shelterX=back.x;stop.shelterZ=back.z;
        }
    };

    H.buildYard445=world=>{
        const x=70,z=39,entranceZ=0,rng=new H.RNG(445339);
        const floor=H.outdoorHeight;
        const put=(px,pz,y,w,h,d,c,m,shape,yaw)=>part(world,px,pz,floor(px,pz)+y,w,h,d,c,m,shape,yaw,440);
        const grade=(px,pz,w,d,color,material,top=.058)=>{
            const o=H.box(px,top-.033,pz,w,.066,d,color,0,3);o.material=material;o.visibilityCap=460;
            H.fitGround441(o,floor,b=>world.add(b),9);
        };
        grade(x,z,36.8,32.2,'#5c5750','asphalt');
        grade(x,17.0,7.7,20,'#645a4d','asphalt',.063);
        for(const [px,pz,w,d] of [[55,32,2.4,5],[79,35,4.2,3.9],[68,47,4.6,2.8],[62,25,3.4,1.6]])
            grade(px,pz,w,d,'#706659','asphalt',.071);
        for(const px of [56.3,62.1,68.0,73.9,79.8,85.5]){
            if(Math.abs(px-x)>3.9)grade(px,33,.10,6.9,'#c6ae73','paint',.089);
            grade(px,48,.10,6.9,'#c6ae73','paint',.089);
        }
        const fence=(x1,z1,x2,z2)=>{
            const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),n=Math.ceil(len/3.18),yaw=Math.atan2(-dx,dz);
            for(let i=0;i<=n;i++){
                const t=i/n,px=x1+dx*t,pz=z1+dz*t;
                put(px,pz,.87,.11,1.74,.11,i%3?'#6c6d5b':'#806b51','metal','cylinder');
                if(i<n)for(const y of [.49,1.56])
                    put(px+dx/n*.5,pz+dz/n*.5,y,.056,.056,len/n+.04,'#757363','metal','cylinder',yaw);
            }
            world.solid((x1+x2)*.5,(z1+z2)*.5,Math.abs(dx)+.14,Math.abs(dz)+.14,true);
        };
        fence(51.8,23.1,51.8,55.2);fence(88.2,23.1,88.2,55.2);fence(51.8,55.2,88.2,55.2);
        fence(51.8,23.1,65.3,23.1);fence(74.7,23.1,88.2,23.1);
        const office={x:81.55,z:51.5};
        put(office.x,office.z,1.37,9.68,2.70,4.85,'#9c856b','masonry');
        put(office.x,office.z,2.85,10.15,.24,5.09,'#686353','metal');
        put(office.x+.28,office.z-2.51,1.65,5.87,1.04,.16,'#545f59','shop_glazing');
        for(const fx of [-2.64,-.93,.83,2.62,3.15])put(office.x+fx,office.z-2.62,1.64,.055,1.12,.10,'#827c68','metal');
        put(office.x-3.65,office.z-2.53,.95,1.16,1.91,.15,'#4c6558','wood');
        put(office.x,office.z-2.54,2.49,8.61,.34,.13,'#a8854f','paint','rounded');
        put(office.x-2,office.z+.7,3.06,1.58,.29,1.24,'#928f80','metal','rounded');
        world.solid(office.x,office.z,9.73,4.79,true);
        for(const px of [58.6,64.5,70.4,76.3,82.2]){
            grade(px,43.15,2.66,.14,'#cbb779','paint',.088);
            put(px,43.63,.137,1.82,.13,.25,'#a19474','concrete','rounded');
        }
        grade(68.1,39,7.7,10.4,'#756c5c','asphalt',.070);
        for(const px of [66.3,69.9])grade(px,38.65,.11,8.1,'#aeb5a1','paint',.092);
        for(const side of [-1,1]){
            const xx=x+side*4.08;
            put(xx,24.1,1.98,.21,3.96,.22,'#626353','metal');
            put(xx,24.1,.38,.31,.78,.31,'#beab70','paint');
        }
        put(x,24.1,3.86,8.36,.72,.26,'#465952','metal','rounded');
        const letters={
            S:['111','100','111','001','111'],U:['101','101','101','101','111'],
            N:['1001','1101','1101','1011','1001'],E:['111','100','110','100','111'],
            T:['111','010','010','010','010'],M:['1001','1111','1111','1001','1001'],
            O:['111','101','101','101','111'],R:['110','101','110','101','101']
        };
        let sx=x-2.56;
        for(const char of 'SUNSET MOTORS'){
            if(char===' '){sx+=.30;continue;}
            const rows=letters[char];
            for(const [row,line] of rows.entries())for(const [i,pixel] of [...line].entries())
                if(pixel==='1')put(2*x-sx-i*.108,23.948,4.074-row*.103,.109,.104,.041,'#ddc596','paint');
            sx+=(rows[0].length+1)*.108;
        }
        for(const [px,pz] of [[55,51.6],[56.2,52],[86,28],[86.3,28.8],[86.4,29.8]]){
            put(px,pz,.13,.68,.26,.68,'#292924','rubber','cylinder');
            if(rng.next()>.4)put(px+.05,pz,.34,.67,.18,.67,'#38362e','rubber','cylinder');
        }
        for(const [px,pz] of [[52.1,27],[87.7,38],[52.4,44],[76.5,54.7]]){
            for(let i=0;i<3;i++)put(px+rng.range(-.3,.3),pz+rng.range(-.4,.4),.25,.39,.52,.44,
                ['#616a47','#72754c','#5d6841'][i],'foliage','urban_crown',rng.range(0,6));
        }
        const stock=[{x:57.8,z:30.6,style:6,hp:65},{x:61.5,z:48.1,style:2,hp:82},
            {x:65.6,z:48.1,style:4,hp:96,luxury:true},{x:78.1,z:32.1,style:5,hp:99,luxury:true},
            {x:83.7,z:32.3,style:1,hp:75}];
        const cctv=[];
        for(const [px,pz,tx,tz] of [[52.6,24.8,67,41],[87.4,53.8,72,34],[74.45,24.4,79,42]]){
            const yaw=Math.atan2(px-tx,pz-tz),turn=-yaw;
            cctv.push({x:px,z:pz,yaw,radius:32});
            put(px,pz,1.79,.11,3.56,.12,'#576563','metal','cylinder');
            put(px,pz,3.56,.39,.23,.58,'#cbd2ca','metal','rounded',turn);
            const lens=put(px-Math.sin(yaw)*.30,pz-Math.cos(yaw)*.30,3.535,.24,.137,.038,'#202e32','glass','rounded',turn);
            lens.pitch=-.12;
            put(px+.10,pz,3.69,.045,.035,.045,'#b66d59','light_emissive');
        }
        const guardPoint={x:80.3,z:26.6,yaw:2.15};
        world.yard445={x,z,entranceZ,name:'מגרש מכירת רכבים',contact:{x:76.8,z:46.5},stock,cctv,guardPoint};
    };

    // Small masonry repairs and utilities sit against real facades and leave each entrance clear.
    H.detailFacades445=world=>{
        let used=0;
        const stores=world.retailShops.filter(v=>v.retail);
        for(const [i,b] of world.buildings.entries()){
            if(b.d<14||b.w<15||Math.hypot(b.x+22,b.z-35)>620||i%3===1)continue;
            const facade=b.z+b.d*.5,px=b.x+(i%2?1:-1)*(b.w*.5-1.15);
            if(stores.some(v=>Math.abs(v.retail.doorX-px)<5&&Math.abs(v.retail.frontZ-facade)<4))continue;
            const y=H.outdoorHeight(px,facade);
            part(world,px,facade+.073,y+1.23,.176,2.46,.17,'#8b8173','metal','cylinder',0,210);
            part(world,px-.46,facade+.12,y+.83,.52,.60,.22,'#737569','metal','rounded',0,210);
            for(const j of [0,1])part(world,px+.26+j*.42,facade+.016,y+.20,.47,.36,.055,j?'#827764':'#938473','masonry','cube',0,155);
            if(++used>=95)break;
        }
        world.detailCount445=used;
    };

    H.seedYard445=game=>{
        for(const [i,p] of game.world.yard445.stock.entries()){
            const car=H.makeCar('parked',p.x,p.z,Math.PI,p.style);
            car.hp=p.hp;car.market44='yardStock';car.paint=[3,6,2,5,4][i];
            if(p.luxury){car.vehicleClass='luxury';car.tireWear=.025+i*.007;car.engineDamage=.015;}
            else{car.tireWear=.13+i*.09;car.engineDamage=.11+i*.05;}
            game.parked.push(car);
        }
    };
})(Heatline);
