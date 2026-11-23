var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const ground=(x,z)=>H.outdoorHeight(x,z);
    const shape=H.coastShape461;
    // A single plane keeps front and back faces from tinting the interior twice.
    const glassCorners=[[-.5,-.5,0,0,0,1],[.5,-.5,0,0,0,1],[.5,.5,0,0,0,1],[-.5,.5,0,0,0,1]];
    H.registerPrisonGlazing472=()=>{H.coastMeshes461.boothGlass472=[
        [glassCorners[0],glassCorners[1],glassCorners[2]],[glassCorners[0],glassCorners[2],glassCorners[3]]
    ];};
    function barrier(w,x,z,width,depth,axis){
        const door={x,z,width,depth,axis,open:false,travel:0};
        w.solid(x,z,width,depth);
        w.solids.at(-1).prisonDoor471=door;
        return door;
    }
    function guardBooth(w,gate,elevation){
        const x=gate.x-10.9,z=gate.z+5.7,width=3.75,depth=2.90;
        const base=Math.max(elevation+.063,ground(x,z)+.086);
        const halfX=width/2,halfZ=depth/2,plinth=.91,head=2.48;
        const panes=[],frame='#7d9092',sill='#a0aca8',skin='#526a72',metal='anodized471';
        const put=(u,level,v,ww,h,dd,color,material='sealed_concrete472',mesh='cube',cap=900)=>
            shape(w,x+u,base+level,z+v,ww,h,dd,color,material,mesh,0,cap);
        const solidAt=(u,v,ww,dd)=>w.solid(x+u,z+v,ww,dd);
        function glass(u,v,ww,dd,axis){
            const height=head-plinth-.151,y=base+(plinth+head)/2;
            w.glassPane(x+u,y,z+v,ww,height,dd,'#8ebec5',axis);
            const panel=w.glassPanels.at(-1);
            panel.prisonBooth472=true;
            panes.push(panel);
            solidAt(u,v,ww,dd);
            w.solids.at(-1).transparentPane472=panel;
        }
        put(0,-.118,0,width+.49,.236,depth+.49,'#9a9b91');
        put(0,-.026,0,width-.03,.05,depth-.04,'#a7a49a');
        put(0,head+.114,0,width+.39,.235,depth+.44,'#485960',metal,'rounded');
        put(0,head+.219,0,width+.43,.057,depth+.48,'#8d9898',metal,'rounded');
        put(-.67,head+.343,-.36,1.08,.21,.71,'#758283','metal','rounded',580);
        for(let i=-2;i<=2;i++)put(-.67+i*.144,head+.45,-.36,.049,.013,.47,'#596769',metal,'rounded',430);
        for(const s of [-1,1]){
            for(const t of [-1,1]){
                put(s*halfX,(head+.03)/2,t*halfZ,.15,head+.03,.15,frame,metal);
                solidAt(s*halfX,t*halfZ,.15,.15);
            }
            put(s*halfX,plinth/2,0,.135,plinth,depth,skin,'paint');
            put(s*halfX,plinth+.037,0,.25,.074,depth+.13,sill,'metal');
            put(s*halfX,head-.049,0,.13,.098,depth,frame,metal);
            put(s*halfX,(head+plinth)/2,0,.085,head-plinth,.075,frame,metal);
            for(const t of [-1,1])
                glass(s*halfX,t*(halfZ/2),.034,halfZ-.12,'x');

            put(0,plinth/2,s*halfZ,width,plinth,.13,skin,'paint');
            put(0,plinth+.037,s*halfZ,width+.11,.074,.24,sill,'metal');
            put(0,head-.05,s*halfZ,width,.10,.13,frame,metal);
            for(const t of [-1,1])put(t*width/6,(head+plinth)/2,s*halfZ,.072,head-plinth,.102,frame,metal);
            for(let i=-1;i<=1;i++)glass(i*width/3,s*halfZ,width/3-.091,.035,'z');
        }
        // A solid lower plinth stays in place when a pane is damaged.
        for(const v of [-halfZ,halfZ]){
            solidAt(0,v,width,.13);
            w.solids.at(-1).lowSight472=true;
        }
        for(const u of [-halfX,halfX]){
            solidAt(u,0,.135,depth);
            w.solids.at(-1).lowSight472=true;
        }
        const rearDoor=-width/3;
        for(const s of [-1,1])put(rearDoor+s*.55,1.15,-halfZ-.045,.067,2.27,.10,frame,metal);
        put(rearDoor,2.29,-halfZ-.048,1.16,.069,.104,frame,metal);
        put(rearDoor+.38,1.04,-halfZ-.135,.21,.056,.12,'#a8afaa',metal,'rounded',420);
        put(rearDoor,-.032,-halfZ-.29,1.44,.094,.54,'#a29f93');
        put(-1.10,.80,.12,.84,.084,1.86,'#a7997b','wood','rounded',470);
        for(const v of [-.69,.91])put(-1.10,.39,v,.77,.76,.11,'#677472','metal','rounded',410);
        put(-1.18,1.13,-.12,.56,.38,.10,'#35444a','rubber','rounded',390);
        put(-1.18,1.13,-.062,.51,.32,.018,'#87a4a3','light_emissive','cube',330);
        put(-1.04,.863,.47,.42,.051,.26,'#4a5557','metal','rounded',330);
        put(1.39,.90,-1.12,.68,1.76,.39,'#728381',metal,'rounded',450);
        put(.56,.48,-.60,.60,.110,.60,'#576367','fabric','rounded',435);
        put(.56,.75,-.87,.57,.55,.105,'#506063','fabric','rounded',435);
        put(.56,.24,-.59,.10,.43,.10,'#637275','metal','cylinder',430);
        put(0,head-.12,0,1.60,.055,.16,'#e6ddbd','light_emissive','rounded',500);
        for(const s of [-1,1]){
            put(s*1.24,head+.028,halfZ+.15,.29,.125,.26,'#556269',metal,'rounded',550);
            put(s*1.24,head-.022,halfZ+.292,.23,.075,.023,'#e8e4d3','light_emissive','rounded',420);
        }
        if(w.lights)w.lights.push({x:x+.3,z:z-.5,y:base+head-.25,radius:8,r:1.04,g:.94,b:.77});
        return {x,z,width,depth,base,panes,stand:{x:x+.56,z:z+.27},seat:{x:x+.56,z:z-.57}};
    }
    function detentionWing(w,elevation,{id,x,z,width,depth,brick,trim,slots},gate,rally){
        const west=x-width/2,east=x+width/2,north=z-depth/2,south=z+depth/2;
        const bounds={xmin:west,xmax:east,zmin:north,zmax:south};
        const floor=elevation+.046,head=4.55,passage=4.7,roomPitch=5.45,span=6;
        const cells=[],solids=[],eastOpening=2.94,slab='sealed_concrete472',metal='anodized471';
        const put=(px,level,pz,ww,h,dd,color,material=slab,mesh='cube',cap=820)=>
            shape(w,px,floor+level,pz,ww,h,dd,color,material,mesh,0,cap);
        function wall(px,pz,ww,dd,h=head,color=brick,material='brickwork'){
            const body=put(px,h/2,pz,ww,h,dd,color,material,'cube',1420);
            w.solid(px,pz,ww,dd);
            solids.push(w.solids.at(-1));
            w.prisonRayWalls472.push(body);
        }
        H.coastFloor461(w,x,z,width,depth,'#a6a99f',slab,floor);
        H.coastFloor461(w,east+2.6,z,5.9,7.4,'#a19d8f','paving',floor-.022);
        wall(west,z,.43,depth);
        wall(x,north,width,.43);
        wall(x,south,width,.43);
        const jambSpan=(depth-eastOpening)/2;
        for(const side of [-1,1]){
            wall(east,z+side*(eastOpening+jambSpan)/2,.53,jambSpan);
            put(east+.19,1.69,z+side*eastOpening*.50,.58,3.38,.24,trim,metal,'rounded');
        }
        put(east,3.95,z,.53,1.2,eastOpening,brick,'brickwork');
        put(east+.16,3.12,z,.61,.16,eastOpening+.20,trim,metal,'rounded',1150);
        put(east+1.21,3.44,z,2.91,.19,4.10,'#738287',metal,'rounded',1160);
        put(east+1.54,3.38,z,1.89,.035,.138,'#e3dbbe','light_emissive','rounded',550);
        put(x,head+.19,z,width+.82,.38,depth+.82,'#7c8586',metal,'rounded',2080);
        put(x,head+.395,z,width-.56,.05,depth-.56,'#9a9b90',slab,'rounded',1830);
        put(x,head-.072,z,width-.38,.114,depth-.35,'#b3b9b0','paint','cube',1160);
        for(const side of [-1,1]){
            const facade=z+side*(depth/2+.058);
            put(x,.33,facade,width-.04,.66,.32,'#969a8e',slab,'rounded');
            for(let bay=0;bay<10;bay++){
                const px=west+4.1+bay*(width-8.2)/9;
                put(px,2.73,facade,1.56,1.34,.115,trim,metal);
                put(px,2.76,facade+side*.068,1.38,1.11,.044,'#64848c','building_window');
                put(px,2.08,facade+side*.075,1.68,.12,.24,'#a4a494',slab,'rounded');
                put(px,3.52,facade,.15,1.37,.084,'#988e7e',slab);
            }
            put(x,4.11,facade,width,.21,.29,trim,metal,'rounded',1160);
        }
        const roomX=west+9.1,roomEnd=roomX+span*roomPitch;
        const corridorPanel='#b5b9ae',gap=1.58,gapHeight=2.29;
        for(const side of [-1,1]){
            const front=z+side*passage/2,roomDepth=(depth-passage)/2-.15,innerZ=front+side*roomDepth*.46;
            for(let col=0;col<=span;col++)
                wall(roomX+col*roomPitch,innerZ,.136,roomDepth,3.74,'#b0b4a8',slab);
            for(let col=0;col<span;col++){
                const cx=roomX+(col+.5)*roomPitch,wallWidth=(roomPitch-gap)/2;
                for(const t of [-1,1]){
                    wall(cx+t*(gap+wallWidth)/2,front,wallWidth,.185,3.74,corridorPanel,slab);
                    put(cx+t*(gap+wallWidth)/2,.52,front-side*.111,wallWidth,.99,.065,'#839a92','paint');
                    put(cx+t*gap/2,1.18,front,.104,2.36,.28,'#697f7c',metal,'rounded');
                }
                put(cx,(gapHeight+3.74)/2,front,gap,3.74-gapHeight,.185,corridorPanel);
                put(cx,2.32,front,gap+.08,.10,.26,'#718581',metal,'rounded');
                const mission=slots.find(s=>s.col===col&&s.side===side);
                if(mission){
                    const cell=barrier(w,cx,front,gap-.08,.13,'x');
                    cell.interior=true;solids.push(w.solids.at(-1));
                    const entrance={x:cx,z:front-side*.92},inside={x:cx,z:front+side*2.00};
                    cells.push({index:mission.index,wing:id,cell,entrance,inside,
                        path:[{x:cx,z},{x:east+2.45,z},{x:gate.x+mission.index*.86,z},
                            {x:gate.x+mission.index*.86,z:gate.z+11},{x:rally.x+mission.index*2.2,z:rally.z}]});
                    put(cx,2.70,front-side*.13,.61,.37,.057,'#456a62','paint','rounded',475);
                    put(cx,2.70,front-side*.168,.33,.062,.025,'#d8ded0','light_emissive','rounded',440);
                }else{
                    wall(cx,front,gap-.052,.105,gapHeight,'#717f80','metal');
                    put(cx,1.64,front-side*.058,.49,.46,.045,'#738b8b','building_window','cube',485);
                }
                // Timber-faced storage, a platform bed and a sanitary fitting within each enclosed cell.
                const bunkZ=front+side*(roomDepth*.63);
                put(cx-1.54,.27,bunkZ,.86,.54,2.04,'#81908a','metal','rounded',670);
                put(cx-1.54,.58,bunkZ,.83,.14,1.98,'#a8a89a','fabric','rounded',530);
                put(cx-1.54,.67,bunkZ-side*.66,.61,.085,.40,'#e0d8c0','fabric','rounded',480);
                put(cx+1.5,.91,front+side*roomDepth*.75,.84,1.82,.58,'#93886c','wood','rounded',500);
                put(cx+1.50,.44,front+side*2,.58,.73,.67,'#b6b9b0','concrete','rounded',410);
                put(cx+1.50,.84,front+side*2,.60,.11,.69,'#ccd0c7','metal','rounded',410);
            }
        }
        put((roomX+roomEnd)/2,.017,z,roomEnd-roomX+.4,.016,passage-.22,'#b8b7a8',slab);
        const lobbyX=east-7.0;
        for(const side of [-1,1]){
            put(lobbyX,.18,z+side*(depth/2-.29),6.25,.36,.24,'#73918b','paint');
            put(east-4.8,1.26,z+side*(depth/2-.44),3.42,.74,.092,'#b3a484','wood','rounded',630);
            put(east-4.8,1.26,z+side*(depth/2-.50),2.95,.60,.043,'#bbc0b6','paint','rounded',620);
        }
        put(lobbyX,.87,z+4.55,3.2,.106,.90,'#927e61','wood','rounded',690);
        put(lobbyX,.44,z+4.60,3.08,.82,.74,'#8b9891','metal','rounded',640);
        put(lobbyX+.78,1.18,z+4.55,.67,.43,.126,'#4a585d','metal','rounded',590);
        put(lobbyX+.78,1.18,z+4.475,.59,.35,.041,'#91a5a0','light_emissive','rounded',550);
        put(lobbyX-.38,.46,z-5.27,3.2,.123,.59,'#a69674','wood','rounded',610);
        put(lobbyX-.38,.72,z-5.59,3.22,.49,.115,'#a69674','wood','rounded',610);
        for(const t of [-1,1])put(lobbyX-.38+t*1.28,.21,z-5.27,.19,.42,.47,'#667875','metal','rounded',620);
        for(const p of [[lobbyX,z+4.55,3.19,.87],[lobbyX-.38,z-5.27,3.2,.61]]){
            w.solid(...p,true);solids.push(w.propSolids.at(-1));
        }
        put(west+3.91,.75,z,3.18,.095,1.92,'#a69579','wood','rounded',550);
        for(const side of [-1,1]){
            put(west+3.92,.44,z+side*1.39,3.15,.18,.39,'#7f8c85','metal','rounded',550);
            for(const t of [-1,1])put(west+3.92+t*1.27,.21,z+side*1.39,.18,.42,.28,'#637470','metal');
        }
        for(let row=0;row<8;row++){
            const px=west+4.1+row*(width-8.2)/7;
            put(px,head-.19,z,2.38,.097,.26,'#d8d5bd','metal','rounded',700);
            put(px,head-.253,z,2.27,.038,.181,'#fbecce','light_emissive','rounded',820);
            if(row%2===0)w.lights.push({x:px,z,y:floor+head-.31,radius:8.5,r:.94,g:.93,b:.84});
        }
        const access={x:east+2.4,z},center={x,z};
        w.mapFeatures461.push({id:'detentionWing',x,z,width,depth,color:id==='A'?'#aaa89e':'#8e938d'});
        return {id,bounds,solids,access,center,floor,ceiling:floor+head,cells};
    }
    H.buildPrison471=(w,facility,elevation)=>{
        const R=H.reference469,gate=facility.gate;
        const door=barrier(w,gate.x,gate.z,33.8,.38,'x');
        const command={x:gate.x,z:gate.z+2.5},rally={x:gate.x-8,z:gate.z+39.0};
        const booth=guardBooth(w,gate,elevation);
        w.prisonRayWalls472=[];
        const wings=[
            detentionWing(w,elevation,{id:'A',...R.world(646,166),width:58.7,depth:18.5,brick:'#b4a18d',trim:'#6d8584',
                slots:[{index:0,side:-1,col:4},{index:1,side:1,col:2}]},gate,rally),
            detentionWing(w,elevation,{id:'B',...R.world(646,188),width:56.4,depth:18.2,brick:'#aa9b89',trim:'#768985',
                slots:[{index:2,side:1,col:3}]},gate,rally)
        ];
        const cells=wings.flatMap(wing=>wing.cells).sort((a,b)=>a.index-b.index);
        shape(w,gate.x,elevation+6.42,gate.z,14.8,.61,.37,'#9a8873','bronze471','rounded',0,1490);
        shape(w,gate.x,elevation+6.42,gate.z+.21,12.3,.17,.086,'#eadebc','light_emissive','rounded',0,850);
        const controlX=command.x+3.25;
        shape(w,controlX,elevation+.56,command.z,.15,1.12,.18,'#69787a','anodized471','rounded',0,470);
        shape(w,controlX,elevation+1.08,command.z,.36,.31,.30,'#424f54','metal','rounded',0,470);
        shape(w,controlX,elevation+1.10,command.z+.158,.21,.12,.026,'#9db694','light_emissive','rounded',0,390);
        const walk=R.world(667,178);
        H.coastFloor461(w,walk.x,walk.z,12.6,63,'#958f81','sealed_concrete472',elevation+.042);
        Object.assign(facility,{door,doors:[door,...cells.map(v=>v.cell)],command,rally,booth,cells,wings,elevation});
    };
    function spawned(g,p,yaw,style,model){
        const npc=H.createWalker(p.x,p.z,yaw,style);
        npc.y=ground(p.x,p.z);npc.urbanModel441=model;npc.prisonActor471=true;
        g.pedestrians.push(npc);
        return npc;
    }
    H.startPrison471=g=>{
        const site=g.world.correctional471;
        if(g.prison471){
            const wasPrisonActor=new Set([g.prison471.guard,...g.prison471.inmates.map(p=>p.actor)]);
            g.pedestrians=g.pedestrians.filter(npc=>!wasPrisonActor.has(npc));
        }
        site.door.open=false;site.door.travel=0;
        for(const pane of site.booth.panes){pane.chips=0;pane.shattered=false;}
        const guard=spawned(g,site.booth.stand,Math.PI,17,H.URBAN441.police[3]);
        guard.y=site.booth.base+.01;
        guard.prisonGuard471=true;
        const inmates=site.cells.map(spec=>{
            spec.cell.open=false;spec.cell.travel=0;
            const actor=spawned(g,spec.inside,-Math.PI/2,23+spec.index,H.URBAN441.residents[spec.index]);
            return {actor,spec,step:0,freed:false,escaped:false};
        });
        g.prison471={site,guard,inmates,onSite:0,phase:'closed',reported:false,seen:0,released:0,escaped:0,dozing:false,
            alarmIn:0,entry:0,wakeTime:0};
    };
    function alert(g,job){
        if(job.reported)return;
        job.reported=true;
        job.alarmIn=2.65;
        g.showInfo('השומר זיהה פעילות חשודה ומזעיק תגבורת.');
    }
    H.disturbPrisonBooth472=g=>{
        const job=g.prison471;
        if(job&&job.guard.injuryState==='walking'){
            job.wakeTime=8.5;
            job.dozing=false;
            alert(g,job);
        }
    };
    function action(g){
        const job=g.prison471,a=g.avatar;
        if(!job||g.inVehicle||g.onBus>=0||g.onTram>=0||g.inside||g.indoor||g.retailVisit||g.roofVisit)return null;
        if(job.phase==='closed'&&range(a,job.site.command)<3.4)return job;
        if(job.phase==='failed'&&range(a,job.site.rally)<3.8)return job;
        if(job.phase==='rescue')return job.inmates.find(p=>!p.freed&&p.actor.injuryState==='walking'&&range(a,p.spec.entrance)<2.7)||null;
        return null;
    }
    function insideWing(site,actor){
        return site.wings.find(wing=>{
            const b=wing.bounds;
            return actor.x>b.xmin&&actor.x<b.xmax&&actor.z>b.zmin&&actor.z<b.zmax&&
                (actor.y===undefined||actor.y<wing.ceiling-.18);
        });
    }
    H.prisonCamera472=(g,dt)=>{
        const a=g.avatar,site=g.prison471?.site;
        const wing=site&&!g.inVehicle&&!g.inside&&g.onBus<0&&g.onTram<0&&insideWing(site,a);
        if(!wing){g.prisonCameraWing472=null;return false;}
        const prior=g.prisonCameraWing472===wing;
        g.prisonCameraWing472=wing;
        const backX=Math.sin(g.footCameraYaw),backZ=Math.cos(g.footCameraYaw);
        const scene={bounds:wing.bounds,solids:wing.solids.filter(s=>!s.prisonDoor471||s.prisonDoor471.travel<.96)};
        const clampCamera=position=>H.indoorCameraGuard(a,position,scene);
        const goal=clampCamera({x:a.x+backX*2.50+backZ*.30,z:a.z+backZ*2.50-backX*.30});
        const blend=prior?1-Math.exp(-dt*11.4):1;
        const {x,z}=clampCamera({x:H.lerp(g.cam.x,goal.x,blend),z:H.lerp(g.cam.z,goal.z,blend)});
        const ty=a.y+1.51,eye=Math.min(a.y+2.54,wing.ceiling-.35);
        const ahead=Math.hypot(x-a.x,z-a.z);
        const aim= Math.max(1.12,Math.min(3.4,ahead*1.43));
        g.cam.x=x;g.cam.z=z;g.cam.y=H.lerp(g.cam.y,eye,blend);
        g.cam.tx=H.lerp(g.cam.tx,a.x-backX*aim,blend);
        g.cam.tz=H.lerp(g.cam.tz,a.z-backZ*aim,blend);
        g.cam.ty=H.lerp(g.cam.ty,ty,blend);
        g.cam.fov=H.lerpCameraFov(g.cam.fov,68,dt,12);
        return true;
    };
    H.prisonHint471=g=>{
        const offer=action(g),job=g.prison471;
        if(offer&&offer===job){
            if(job.phase==='failed')return 'נסה שוב · E';
            return job.guard.injuryState!=='walking'?'פתיחת השער · E':
            job.dozing?'השומר מנמנם · פתיחת השער E':'השומר ערני · פתיחת השער תפעיל אזעקה · E';
        }
        if(offer)return 'פתח את תא המעצר · E';
        if(job?.phase==='opening')return 'פתיחת שער · הישאר ליד לוח הבקרה';
        if(job?.phase==='failed'&&range(g.avatar,job.site.gate)<155)return 'החילוץ נכשל · חזור לנקודת המפגש לניסיון נוסף';
        if(job?.phase==='rescue'&&range(g.avatar,job.site.gate)<155){
            const waiting=job.inmates.filter(p=>!p.freed);
            if(!waiting.length)return 'הובל את המשוחררים לנקודת המפגש · '+job.escaped+'/'+job.inmates.length;
            const wing=insideWing(job.site,g.avatar),within=waiting.some(p=>p.spec.wing===wing?.id);
            const label=within?'תאים באגף '+wing.id:'היכנס לאגפים המסומנים במפה';
            return label+' · תאים פתוחים '+job.released+'/'+job.inmates.length;
        }
        return '';
    };
    H.prisonMarkers472=(g,actor)=>{
        const q=g.prison471;
        if(!q||range(q.site.gate,actor)>220)return [];
        if(q.phase==='failed'||q.phase==='rescue'&&q.released===q.inmates.length)
            return [{...q.site.rally,label:'↗'}];
        if(q.phase==='rescue'){
            const entered=insideWing(q.site,actor),waiting=q.inmates.filter(p=>!p.freed);
            return q.site.wings.flatMap(wing=>{
                const cells=waiting.filter(p=>p.spec.wing===wing.id);
                if(!cells.length)return [];
                return entered===wing?cells.map(p=>({...p.spec.entrance,label:String(p.spec.index+1)})):
                    [{...wing.access,label:wing.id}];
            });
        }
        return [];
    };
    H.interactPrison471=g=>{
        const offer=action(g),job=g.prison471;
        if(!offer)return false;
        if(offer===job){
            if(job.phase==='failed'){
                H.startPrison471(g);
                g.showInfo('ניסיון חדש. עבור ללוח הבקרה ליד השער.');
            }else{
                job.phase='opening';job.entry=.84;
                g.showInfo('לוח הבקרה מפעיל את השער',.85);
            }
        }else{
            offer.freed=true;offer.spec.cell.open=true;job.released++;
            g.showInfo('תא נפתח · '+job.released+' מתוך '+job.inmates.length);
        }
        g.updateHUD();
        return true;
    };
    H.stepPrison471=(g,dt)=>{
        const job=g.prison471;if(!job)return;
        const {site,guard}=job,a=g.inVehicle?g.player:g.avatar;
        if(range(a,site.gate)>172&&(job.phase==='closed'||job.phase==='complete'||job.phase==='failed')&&job.alarmIn<=0)return;
        job.onSite+=dt;
        job.wakeTime=Math.max(0,job.wakeTime-dt);
        if(job.alarmIn>0){
            job.alarmIn=Math.max(0,job.alarmIn-dt);
            if(job.alarmIn===0){
                g.reportOffense('מעצר סאנסט · פריצה למתחם',site.gate.x,site.gate.z,4,'officer');
                g.showInfo('אזעקת הכלא הופעלה. תגבורת בדרך.');
            }
        }
        job.dozing=job.onSite%23>14.0&&!job.reported&&job.wakeTime<=0&&guard.injuryState==='walking';
        guard.prisonDoze471=job.dozing;
        if(guard.injuryState==='walking'){
            guard.emotion443=job.dozing?'calm':job.reported?'alert':'watch';
            guard.socialPose=job.dozing?'sit':'stand';
            guard.stride=0;guard.vx=guard.vz=0;
            const place=job.dozing?site.booth.seat:site.booth.stand;
            const move=1-Math.exp(-dt*9.0);
            guard.x=H.lerp(guard.x,place.x,move);guard.z=H.lerp(guard.z,place.z,move);
            const yaw=job.dozing?Math.PI:Math.atan2(guard.x-a.x,guard.z-a.z);
            guard.yaw+=H.angleDiff(guard.yaw,yaw)*Math.min(1,dt*3.1);
            const near=job.phase==='rescue'&&a.z<site.gate.z&&a.z>site.gate.z-36&&range(a,guard)<26;
            const sees=near&&!job.dozing&&H.officerSightClear(guard.x,guard.z,a.x,a.z,
                g.world.nearby((guard.x+a.x)/2,(guard.z+a.z)/2),false);
            job.seen=sees?job.seen+dt:Math.max(0,job.seen-dt*2.2);
            if(job.seen>1.05)alert(g,job);
        }
        if(job.phase==='opening'){
            if(g.inVehicle||g.inside||range(a,site.command)>3.65){
                job.phase='closed';job.entry=0;
                g.showInfo('פתיחת השער בוטלה');
            }else{
                job.entry-=dt;
                if(job.entry<=0){
                    job.phase='rescue';site.door.open=true;
                    if(guard.injuryState==='walking'&&!job.dozing)alert(g,job);
                    else g.showInfo('השער נפתח. שלושת התאים מסומנים במפה.');
                }
            }
        }
        for(const door of site.doors)
            door.travel=Math.min(1,door.travel+dt*(door.open?1.45:0));
        if(job.phase!=='rescue')return;
        if(job.inmates.some(p=>!p.escaped&&p.actor.injuryState==='dead')){
            job.phase='failed';
            g.showInfo('החילוץ נכשל. אפשר לנסות שוב בנקודת המפגש.');
            return;
        }
        for(const p of job.inmates){
            if(!p.freed||p.escaped||p.actor.injuryState!=='walking')continue;
            const npc=p.actor,to=p.spec.path[p.step],distance=range(npc,to);
            if(range(npc,a)>78){npc.stride=0;continue;}
            if(distance<=1.14){
                if(p.step<p.spec.path.length-1){p.step++;continue;}
                p.escaped=true;job.escaped++;npc.stride=0;
                if(job.escaped===job.inmates.length){
                    job.phase='complete';
                    g.showInfo('החילוץ הושלם. כל המשוחררים הגיעו לנקודת המפגש.');
                }
                continue;
            }
            const yaw=Math.atan2(npc.x-to.x,npc.z-to.z);
            H.stepWalker(npc,{forward:1,strafe:0,run:false,outdoors:true,viewYaw:yaw,speedFactor:.94},
                g.world.nearby(npc.x,npc.z),dt);
        }
    };
    H.prisonParts471=(g,out)=>{
        const job=g.prison471;if(!job||range(g.cam,job.site.gate)>278)return;
        for(const door of job.site.doors){
            if(door.interior){
                if(door.travel>.96)continue;
                const x=door.x+door.width*door.travel,z=door.z;
                const leaf=(dx,level,w,h,depth,color,material,front=0)=>{
                    const o=H.box(x+dx,job.site.elevation+.046+level,z+front,w,h,depth,color,0,4);
                    o.material=material;out.push(o);
                };
                leaf(0,.636,door.width,1.27,.114,'#6e8580','anodized471');
                leaf(0,2.061,door.width,.458,.114,'#6e8580','anodized471');
                for(const sign of [-1,1]){
                    leaf(sign*(door.width*.32),1.557,door.width*.36,.576,.117,'#6e8580','anodized471');
                    leaf(sign*.42,1.024,.128,.064,.052,'#aeb5a9','metal',.088);
                }
                for(const offset of [-.16,0,.16])leaf(offset,1.55,.041,.56,.093,'#526968','metal');
                continue;
            }
            const main=door===job.site.door,height=main?4.7:2.68,east=door.axis==='x',span=east?door.width:door.depth;
            const count=main?28:8,gap=span/count,travel=door.travel*height;
            const put=(offset,level,w,h,d,material,color)=>{
                const obj=H.box(door.x+(east?offset:0),job.site.elevation+level+travel,door.z+(east?0:offset),w,h,d,color,0,4);
                obj.material=material;obj.shape='rounded';out.push(obj);
            };
            if(door.travel>.96)continue;
            for(let i=0;i<=count;i++)
                put(gap*(i-count/2),height/2,.11,height,.11,'anodized471','#879091');
            for(const y of [.15,height*.59,height-.10])
                put(0,y,east?span:.13,.13,east?.13:span,'anodized471','#677c80');
        }
        const lamp=job.site.gate;
        const light=H.box(lamp.x,job.site.elevation+5.4,lamp.z+2.98,1.75,.12,.17,
            job.reported?'#df6855':job.site.door.open?'#79bd93':'#d7b86d',0,4,1.1);
        light.material='light_emissive';out.push(light);
    };
})(Heatline);
