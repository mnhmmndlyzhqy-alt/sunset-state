var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461,put=H.coastShape461;
    const palettes={
        glass:['#a8aeaa','#68838d','#59686a'],tech:['#929f9e','#536f7e','#546368'],
        residential:['#c4b7a3','#65818a','#7e7970'],brick:['#a28270','#536b72','#726f66'],
        heritage:['#c3ad8d','#6b817f','#8b816c'],hotel:['#b0b5a8','#64838c','#718077']
    };
    const facadeColors={
        glass:['#a9b8bd','#8d9da0','#a3a8a1','#c0b7a7'],tech:['#99aaa9','#86949b','#b0b3a7','#9a9f97'],
        hotel:['#b8baa9','#b0a695','#c2b69f','#a5adb0'],residential:['#c5b49d','#b7b2a2','#bea98d','#a1abad'],
        heritage:['#b69d85','#a7957f','#c5b191','#a99d91'],brick:['#a7836d','#856857','#b09279','#946e62']
    };
    const facadeMaterials={
        glass:'curtain_wall473',tech:'curtain_wall473',hotel:'hotel_facade473',
        residential:'stone_facade473',heritage:'stone_facade473',brick:'brick_facade473'
    };
    function unifyFacades(w,physical){
        const gridSize=64,cells=new Map(),owners=new Map();
        for(const b of w.buildings){
            if(!b.plan463)continue;
            const soil=H.outdoorHeight(b.x,b.z);
            const site={b,soil,finish:facadeMaterials[b.kind]||facadeMaterials.residential,shell:physical.has(b.shell38)};
            owners.set(b.x+','+b.z,site);
            for(let x=Math.floor((b.x-b.w/2-2)/gridSize);x<=Math.floor((b.x+b.w/2+2)/gridSize);x++)
                for(let z=Math.floor((b.z-b.d/2-2)/gridSize);z<=Math.floor((b.z+b.d/2+2)/gridSize);z++){
                    const key=x+','+z;
                    if(!cells.has(key))cells.set(key,[]);
                    cells.get(key).push(site);
                }
        }
        const terrain=w.boxes.shoreMesh463;
        const storefronts=w.retailShops.filter(s=>s.retail&&Math.abs(s.retail.centerX)<205&&Math.abs(s.retail.frontZ)<140)
            .map(s=>({...s.retail,ground:H.outdoorHeight(s.retail.centerX,s.retail.frontZ)}));
        let walls=0,overlays=0,awnings=0;
        const next=[];
        for(const o of w.boxes){
            if(o.layer>=4&&!o.retailFront473&&o.h<.43&&o.d>.67&&o.w>1.9&&
                storefronts.some(s=>o.y>s.ground+2.94&&o.y<s.ground+4.5&&Math.abs(o.x-s.centerX)<s.width*.53&&
                    o.w<s.width*1.30&&o.z<s.frontZ+.19&&o.z>s.frontZ-2.4)){
                awnings++;
                continue;
            }
            if(o.layer<4||o.basis444||o.h<.018||o.y<4.5){next.push(o);continue;}
            const site=owners.get(o.facadeOwner473)??cells.get(Math.floor(o.x/gridSize)+','+Math.floor(o.z/gridSize))
                ?.find(({b,soil})=>Math.abs(o.x-b.x)<=b.w/2+1.6&&Math.abs(o.z-b.z)<=b.d/2+1.6&&
                    o.w<=b.w+2.6&&o.d<=b.d+2.6&&o.y>=soil+4.4&&o.y<=soil+b.h+.65);
            if(!site){next.push(o);continue;}
            const {b,soil,finish,shell}=site;
            if(o===b.shell38 || o.upperWall473&&!b.silhouette469){
                o.material=finish;
                if(o.shape==='architectural_tower')o.shape='reference_slab469';
                o.stage450Proxy=true;
                walls++;
                next.push(o);
                continue;
            }
            const aboveLobby=o.y+o.h/2>soil+4.55&&o.y>=soil+4.52;
            const facadeEnd=soil+(b.silhouette469?8.25:b.h-.35);
            const withinHeight=o.y<facadeEnd&&o.y-o.h/2<facadeEnd;
            const supportedDetail=o.arch37Roof||o.upperWall473||o.stage461Mass||o.shape?.startsWith('s11_');
            const fittings=Math.min(o.w,o.d)<.92||
                (o.h<.46&&Math.min(o.w,o.d)<3.2&&Math.max(o.w,o.d)<b.w*.93);
            if(aboveLobby&&withinHeight&&!supportedDetail&&fittings){
                if(o.material==='building_window'&&!o.stage450Proxy&&
                    (o.arch37Detail||b.kind==='hotel'&&!b.stage37Massing)){
                    o.fallbackOnly=true;
                    next.push(o);
                }else if(!shell&&o.facadeOwner473&&o.material==='building_window'){
                    next.push(o);
                }
                overlays++;
                continue;
            }
            next.push(o);
        }
        next.shoreMesh463=terrain;
        w.boxes=next;
        w.facades473={buildings:owners.size,walls,overlays,awnings};
    }
    function unit(x,y,z){
        const k=1/(Math.hypot(x,y,z)||1);return [x*k,y*k,z*k];
    }
    function loft(rows,n=22){
        const verts=rows.map(([z,rx,ry,orb])=>Array.from({length:n},(_,i)=>{
            const a=i*2*Math.PI/n,c=Math.cos(a),s=Math.sin(a);
            const edge=[rx*c,orb+ry*s,z];
            const bx=Math.max(.05,rx),by=Math.max(.05,ry);
            const end=z<-.42?(z+.42)*4.8:z>.36?(z-.36)*4.4:0;
            return [...edge,...unit(c/bx,s/by,end/Math.max(bx,by))];
        }));
        const tris=[];
        for(let k=1;k<verts.length;k++)for(let j=0;j<n;j++){
            const a=verts[k-1][j],b=verts[k-1][(j+1)%n],c=verts[k][j],d=verts[k][(j+1)%n];
            tris.push([a,b,c],[b,d,c]);
        }
        return tris;
    }
    function hippedRoof(){
        const eaves=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],left=[-.22,.5,0],right=[.22,.5,0];
        const [a,b,c,d]=eaves;
        const faces=[[a,left,right,b],[c,right,left,d],[b,right,c],[d,left,a]];
        return faces.flatMap(([p,q,r,s])=>{
            const [ax,ay,az]=q.map((v,i)=>v-p[i]),[bx,by,bz]=r.map((v,i)=>v-p[i]);
            const normal=unit(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx);
            return (s?[[p,q,r],[p,r,s]]:[[p,q,r]]).map(triangle=>triangle.map(vertex=>[...vertex,...normal]));
        });
    }
    function signalVisors(){
        const triangles=[],segments=10;
        // Three open-bottom hoods with an inner wall and a rolled front lip.
        for(const height of [-.28,0,.28]){
            const vertices=Array.from({length:segments+1},(_,i)=>{
                const angle=-.22+(Math.PI+.44)*i/segments;
                const c=Math.cos(angle),s=Math.sin(angle),tip=.18+Math.max(0,s)*.32;
                const edge=(radius,z,normal)=>[radius*c,height+radius*s*.30,z,normal*c,normal*s,0];
                return [edge(.48,-.5,1),edge(.48,tip,1),edge(.405,tip,-1),edge(.405,-.5,-1)];
            });
            for(let i=0;i<segments;i++){
                const a=vertices[i],b=vertices[i+1];
                triangles.push([a[0],b[0],a[1]],[b[0],b[1],a[1]],
                    [a[3],a[2],b[3]],[b[3],a[2],b[2]]);
                const tip=v=>[...v.slice(0,3),0,0,1];
                triangles.push([tip(a[1]),tip(b[1]),tip(a[2])],[tip(b[1]),tip(b[2]),tip(a[2])]);
            }
        }
        return triangles;
    }
    H.coastMeshes461={
        signal_visors473:signalVisors(),
        coast_hip_roof465:hippedRoof(),
        coast_heli_hull:loft([[-.501,0,0,-.13],[-.477,.144,.135,-.079],[-.388,.342,.296,-.04],[-.243,.479,.374,-.045],
            [-.02,.500,.415,-.025],[.18,.456,.383,-.025],[.339,.301,.255,-.06],[.47,.134,.153,-.058],[.511,0,0,-.040]]),
        coast_heli_glass:loft([[-.504,0,0,.046],[-.478,.157,.056,.079],[-.388,.325,.14,.126],[-.304,.413,.171,.155],
            [-.237,.452,.188,.152],[-.207,.437,.158,.154],[-.197,0,0,.154]]),
        coast_heli_tail:loft([[-.50,.39,.34,0],[-.24,.32,.29,0],[.00,.25,.24,.03],[.32,.145,.17,.09],[.50,.095,.127,.14]],18)
    };
    H.registerPrisonGlazing472();
    H.heliBody461=(add,police,near)=>{
        const paint=police?'#d6dcd5':'#c4c9b8',accent=police?'#244d68':'#486756';
        add(0,-.02,-.67,2.92,2.18,5.36,paint,'coast_heli_hull',0,'premium_paint');
        add(0,.035,-.675,2.94,2.18,5.40,'#385864','coast_heli_glass',0,'vehicle_glass444');
        add(0,.44,.38,1.96,.52,2.63,paint,'rounded_smooth',0,'premium_paint');
        add(0,.14,3.14,1.51,1.71,4.67,accent,'coast_heli_tail',0,'auto_paint');
        for(const side of [-1,1]){
            add(side*1.29,-.35,-.31,.12,.22,2.95,accent,'rounded_smooth',0,'auto_paint');
            if(near){
                add(side*1.43,.13,-.25,.068,.52,.92,'#385d67','rounded_smooth',0,'vehicle_glass444');
                add(side*1.37,.14,.82,.073,.50,.63,'#345260','rounded_smooth',0,'vehicle_glass444');
                add(side*1.44,-.24,-.18,.040,.046,.26,'#9aa7a4','rounded',0,'metal');
                add(side*.55,.75,.39,.39,.16,1.27,'#47595c','rounded_smooth',0,'metal');
                for(let i=0;i<3;i++)add(side*.55,.84,.06+i*.18,.25,.027,.083,'#232d32','rounded',0,'rubber');
            }
        }
    };
    H.finishArchitecture461=w=>{
        let facades=0,anchored=0,persistent=0;
        const banks=w.retailShops.filter(v=>v.bank44&&v.retail),portalByLocation=new Map();
        const physical=new Set(w.boxes);
        for(const p of w.entrancePortals)if(p.interiorReady)portalByLocation.set(p.buildingX+','+p.buildingZ,p);
        for(const b of w.buildings){
            const {x,z,h}=b,ww=b.w,dd=b.d,soil=H.outdoorHeight(x,z),seed=Math.abs((x*3411+z*1103)|0);
            const [base,glass,trim]=palettes[b.kind]||palettes.residential,deck=soil+h;
            const facade=b.plan463?(facadeColors[b.kind]||facadeColors.residential)[seed%4]:base;
            const faceMaterial=b.kind==='brick'||b.kind==='heritage'?'brickwork':
                b.plan463&&b.h>25?'travertine471':'masonry';
            const add=(px,py,pz,a,hh,c,color,material='masonry',shape='cube',cap=880)=>
                put(w,px,py,pz,a,hh,c,color,material,shape,0,cap);
            const hasShell=b.shell38&&physical.has(b.shell38);
            if(hasShell){
                b.shell38.color=facade;
                b.shell38.material=faceMaterial;
            }
            const podium=Math.min(3.75,h*.28),bodyH=h-podium;
            const back=add(x,soil+podium+bodyH*.5-.075,z,ww*.947,bodyH,dd*.947,facade,
                faceMaterial,'cube',4600);
            back.stage450Proxy=true;back.stage461Mass=true;
            const cap=add(x,deck-.16,z,ww*.96,.26,dd*.96,trim,b.plan463?'anodized471':'concrete','cube',4340);
            cap.stage450Proxy=true;cap.stage461Mass=true;
            persistent++;
            const post=Math.min(.35,Math.max(.16,ww*.008));
            for(const side of [-1,1]){
                add(x+side*(ww*.5-.13),soil+h*.49,z+dd*.496,post,h*.97,.28,trim,'concrete');
                add(x+side*(ww*.5-.13),soil+h*.49,z-dd*.496,post,h*.97,.28,trim,'concrete');
                add(x,deck+.105,z+side*(dd*.5-.16),ww*.98,.22,.24,trim,'metal');
                add(x+side*(ww*.5-.16),deck+.105,z,.24,.22,dd*.97,trim,'metal');
            }
            if(b.plan463&&h>35){
                const crown=b.crown463??0;
                if(crown===1&&ww>26){
                    const upper=add(x+ww*.27,soil+h*.51,z,ww*.20,h*.96,dd+.44,trim,'concrete','cube',1480);
                    upper.lodMax=1480;
                    add(x+ww*.27,deck+1.32,z+dd*.24,ww*.20,2.9,dd*.23,trim,'metal','rounded',950);
                }
                if(crown===2&&dd>28){
                    add(x,deck-.17,z+dd*.25,ww*.71,.37,dd*.45,facade,'concrete','rounded',1700);
                    add(x-ww*.17,deck+1.35,z+dd*.31,ww*.39,3.08,dd*.26,facade,'masonry','rounded',1350);
                    add(x-ww*.17,deck+3.03,z+dd*.31,ww*.42,.30,dd*.29,trim,'metal','rounded',1350);
                }
                if(crown===3){
                    for(const s of [-1,1]){
                        add(x+s*ww*.43,soil+h*.52,z+dd*.47,.84,h*.95,1.33,trim,'concrete','rounded',1450);
                        add(x+s*ww*.43,deck+1.08,z+dd*.47,.84,2.17,1.33,trim,'metal','rounded',1400);
                    }
                    add(x,deck+2.08,z+dd*.47,ww*.87,.26,1.29,trim,'metal','rounded',1450);
                }
            }
            const p=portalByLocation.get(x+','+z);
            if(p&&ww>12){
                const face=p.z-.10,span=Math.min(ww*.53,(p.width||3.3)+4.9);
                const front=soil+3.79;
                add(p.x,front,face-.28,span,.22,1.08,b.plan463?'#a2977d':trim,b.plan463?'bronze471':'metal','rounded',620);
                for(const side of [-1,1]){
                    const px=p.x+side*(span*.5-.18);
                    add(px,soil+1.89,face-.21,.24,3.59,.32,facade,faceMaterial,'rounded',620);
                    add(px,soil+2.70,face-.41,.105,.71,.062,'#e5d0a2','light_emissive','rounded',365);
                }
                anchored++;
            }
            if(h>23){
                const x0=x+ww*((seed%5)-2)*.07,z0=z+dd*.24,topH=1.22+(seed%5)*.17;
                const br=add(x0,deck+topH*.49,z0,ww*.24,topH,dd*.21,facade,'masonry','rounded',750);
                br.lodMax=920;
                add(x0,deck+topH+.02,z0,ww*.255,.19,dd*.226,trim,'metal','rounded',750);
                const count=ww>38?3:2;
                for(let i=0;i<count;i++){
                    const xx=x-ww*.24+i*2.13,zz=z-dd*.26;
                    add(xx,deck+.47,zz,1.63,.91,1.09,trim,'metal','rounded',585);
                    add(xx,deck+.95,zz,1.42,.10,.88,glass,'metal','rounded',585);
                }
            }
            facades++;
        }
        const civic=w.stage38Sites.find(s=>s.name==='POLICE');
        if(civic){
            const yy=H.outdoorHeight(civic.x,civic.z),x=civic.x,z=civic.z-2.48;
            put(w,x,yy+4.64,z,12.9,.38,3.50,'#345c6b','metal','rounded',0,880);
            put(w,x,yy+4.93,z-1.69,12.2,.16,.09,'#c7d0c5','light_emissive','rounded',0,810);
            for(const side of [-1,1]){
                put(w,x+side*5.7,yy+2.08,z,.50,4.16,.53,'#9aafa8','concrete','rounded');
                put(w,x+side*3.0,yy+.58,z-2.7,.14,1.16,.14,'#7f8d81','metal','cylinder');
            }
            w.civicPolice461={...civic,name:'תחנת משטרה'};
        }
        for(const v of banks){
            const {doorX:x,frontZ:z}=v.retail,y=H.outdoorHeight(x,z);
            for(const side of [-1,1]){
                put(w,x+side*2.61,y+1.71,z-.78,.58,3.42,.64,'#a0957e','masonry','rounded');
                put(w,x+side*2.61,y+.20,z-.78,.77,.40,.77,'#888171','concrete','rounded');
            }
            put(w,x,y+3.60,z-.59,6.11,.22,1.24,'#758270','metal','rounded',0,570);
            put(w,x,y+3.78,z-1.11,5.87,.105,.092,'#dbc59c','light_emissive','rounded',0,570);
        }
        unifyFacades(w,physical);
        w.architecture461={facades,anchored,persistent,banks:banks.length,police:!!civic};
    };
    H.polishInterior461=(scene,plan,floor)=>{
        if(!scene?.bounds||!scene.boxes)return scene;
        const b=scene.bounds,bare=plan.materialFamily==='tech'||plan.materialFamily==='glass';
        for(const o of scene.boxes){
            if(o.h<.25&&Math.min(o.w,o.d)>3.8&&o.y<.24&&(o.material==='concrete'||!o.material))
                {o.material='paving';o.color=bare?'#bcbeb0':'#baa990';}
            if(o.h>2.1&&o.h<4.9&&Math.min(o.w,o.d)<.34&&o.material==='masonry')o.color=bare?'#c7c9bb':'#c2b49a';
        }
        if(floor===0){
            const yy=3.17,cx=(b.xmin+b.xmax)*.5;
            for(const z of [b.zmin+2.30,b.zmin+5.50]){
                const light=H.box(cx,yy,z,2.12,.073,.20,'#e8dfb7',0,4,.39);
                light.material='light_emissive';scene.boxes.push(light);
                if(Array.isArray(scene.lights))scene.lights.push({x:cx,y:2.88,z,radius:7.7,r:.72,g:.62,b:.45});
            }
        }
        return scene;
    };
    H.roadVehicleDetails461=(c,out,cam)=>{
        const d=Math.hypot(c.x-cam.x,c.z-cam.z);
        if(d>52||c.wrecked||c.rollover)return;
        const family=H.carClass(c),style=H.stage20VehicleFamily(c),s=H.stage20VehicleDimensions(style);
        if(!s||!Number.isFinite(s.length))return;
        const yaw=-c.yaw,ax=Math.cos(yaw),az=Math.sin(yaw),height=H.deckGround443(c);
        const emit=(x,y,z,w,h,dd,color,material)=>{
            const item=H.box(c.x+ax*x-az*z,height+y+c.suspension,c.z+az*x+ax*z,w,h,dd,color,yaw,4);
            item.material=material;item.shape='rounded';item.roll=c.bodyRoll;item.pitch=c.bodyPitch;out.push(item);
        };
        const rear=s.length*.5;
        if(family!=='luxury'&&c.rearDamage<.75){
            emit(0,.64,rear+.019,.45,.133,.043,'#c6c6ad','metal');
            emit(0,.64,rear+.043,.37,.062,.013,'#435352','paint');
            emit(-s.width*.25,.37,rear+.015,.154,.078,.075,'#777b78','metal');
        }
        if(family==='utility'||family==='wagon'){
            for(const side of [-1,1])emit(side*s.width*.276,1.91,.47,.075,.06,1.63,'#525c5a','metal');
        }
    };
})(Heatline);
