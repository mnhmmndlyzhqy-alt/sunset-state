var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461,span=108;
    // Land use is laid out north to south. Industrial, civic and coastal sites
    // use the shared regional plan; this matrix describes the downtown parcels.
    const zoning=[
        'rhtghhgr','rtggtggh','rgpppptr','rhbhghtr','rrthggrh','rbhggrhr','rrrbbbhr'
    ];
    const uses={g:'glass',t:'tech',h:'hotel',r:'residential',b:'brick'};
    const lots=[];
    const venues=new Map([['-3,2','showroom'],['-3,-1','shoppingMall'],['3,3','fillingStation']]);
    const silhouettes=new Map();
    for(const [id,u,v,form,w,d,height,family] of [
        ['westRound',579,411,'round',43,44,57,'glass'],
        ['westOval',578,473,'oval',45,49,75,'hotel'],
        ['pointTower',826,276,'prow',43,49,123,'tech'],
        ['eastOctagon',913,294,'octagon',46,48,108,'glass'],
        ['northSlab',707,279,'slab',36,47,115,'tech'],
        ['southSteps',827,449,'step',39,42,73,'glass'],
        ['eastTerraces',870,326,'terrace',41,51,110,'hotel'],
        ['salmonPodium',744,438,'terrace',45,52,80,'brick'],
        ['gardenRoof',901,455,'garden',43,41,69,'glass'],
        ['westRibs',608,337,'slab',32,43,64,'tech']
    ]){
        const {x,z}=H.reference469.world(u,v),i=Math.floor(x/span),j=Math.floor(z/span),key=i+','+j;
        const center=(p,cell,size)=>Math.max(cell*span+17.6+size/2,Math.min((cell+1)*span-17.6-size/2,p));
        if(silhouettes.has(key))throw Error('Duplicate reference tower parcel: '+key);
        silhouettes.set(key,{id,u,v,form,x:center(x,i,w),z:center(z,j,d),w,d,height,family});
    }
    for(let j=-3;j<=3;j++)for(let i=-4;i<=3;i++){
        const x=i*span,z=j*span,kind=zoning[j+3][i+4],venue=venues.get(i+','+j);
        const silhouette=silhouettes.get(i+','+j);
        const lot={x,z,cx:x+54,cz:z+54,kind,venue,silhouette};lots.push(lot);
        if(venue||kind==='p'||silhouette||(i+2*j+16)%3!==0)continue;
        const northSouth=(i+j)%2===0,offset=(i+2*j)%4===0?46:63;
        const points=northSouth?[[x+offset,z],[x+offset,z+54],[x+offset,z+108]]:
            [[x,z+offset],[x+54,z+offset],[x+108,z+offset]];
        G.roads.push({id:'cityLocal'+i+':'+j,width:8.6,points:points.map(([x,z])=>({x,z}))});
        lot.local={northSouth,offset};
    }
    H.cityPlan463={lots,garden:{x:-54,z:-54},southGarden:{x:54,z:-54},westGarden:{x:-162,z:-54},eastGarden:{x:162,z:-54},
        storyContact:{x:-269,z:235},showRail:false,
        start:{x:-82.5,z:-54,yaw:-Math.PI/2},starterCar:{x:-99.3,z:-46,yaw:Math.PI}};
    const arterial=index=>index===0||index===-3||index===2;
    const downtown={edge:12.5,walk:17.2,level:.244,rampToe:.098,rampRun:1.64,rampCenter:15.48,rampHalf:1.17};
    const centralRun=(axis,block)=>axis===0&&(block===-1||block===0);
    function cornerHeight(x,z){
        const {edge,level,rampToe,rampRun,rampCenter,rampHalf}=downtown;
        const drop=(cross,along)=>{
            const width=H.clamp((rampHalf+.42-Math.abs(along-rampCenter))/.42,0,1);
            return Math.max(0,1-(cross-edge)/rampRun)*width;
        };
        return level-(level-rampToe)*Math.max(drop(x,z),drop(z,x));
    }
    H.onCorePavement463=(x,z)=>{
        const onAxis=value=>{
            const index=Math.round(value/span);
            return Math.abs(index)<=4&&Math.abs(value-index*span)<(arterial(index)?12.50:11.40);
        };
        return onAxis(x)||onAxis(z);
    };

    H.buildCoreRoads463=w=>{
        const length=1074,mid=28;
        const slab=(x,z,width,depth,top,material,color,layer,thickness=material==='paint'?.009:.045,profile=false)=>{
            const b=H.box(x,top-thickness*.5,z,width,thickness,depth,color,0,layer);
            b.material=material;b.coreRoad469=layer===2;b.coreGround470=true;b.streetProfile473=profile;
            if(profile&&material==='paint')b.fallbackOnly=true;
            w.add(b);
        };
        for(let i=-4;i<=4;i++){
            const axis=i*span,major=arterial(i);
            const width=major?25.0:22.8,sidewalk=major?17.2:16.1;
            for(const alongX of [false,true]){
                const put=(cross,along,breadth,d,top,material,color,layer,thickness,profile)=>{
                    if(alongX)slab(along,axis+cross,d,breadth,top,material,color,layer,thickness,profile);
                    else slab(axis+cross,along,breadth,d,top,material,color,layer,thickness,profile);
                };
                const segments=84,step=length/segments;
                for(let k=0;k<segments;k++)
                    put(0,mid-length/2+(k+.5)*step,width,step+.035,alongX?.085:.074,'asphalt',major?'#626465':'#626163',2);
                for(let j=-4;j<=3;j++){
                    const focus=centralRun(axis,j),corner=focus?downtown.walk:16.5;
                    const begin=j*span+corner,end=(j+1)*span-corner;
                    for(const s of [-1,1]){
                        const pavement=(width*.5+sidewalk)*.5,foot=sidewalk-width*.5;
                        const iLot=(alongX?j:i)-(alongX||s>0?0:1);
                        const jLot=(alongX?i:j)-(alongX&&s<0?1:0);
                        const lane=lots.find(v=>v.x===iLot*span&&v.z===jLot*span)?.local;
                        const crosses=lane&&(lane.northSouth===alongX);
                        const gap=j*span+(lane?.offset||0);
                        const runs=crosses?[[begin,gap-5.0],[gap+5.0,end]]:[[begin,end]];
                        for(const [lo,hi] of runs)if(hi>lo){
                            if(!focus){
                                put(s*pavement,(lo+hi)*.5,foot,hi-lo,.209,'paving',major?'#969384':'#9e9b8e',3);
                                put(s*(width*.5+.14),(lo+hi)*.5,.27,hi-lo,.204,'concrete','#97968b',3);
                                continue;
                            }
                            put(s*pavement,(lo+hi)*.5,foot,hi-lo,downtown.level,'paving','#aaa99e',3,.172,true);
                            put(s*(downtown.edge-.23),(lo+hi)*.5,.46,hi-lo,alongX?.093:.082,'concrete','#757570',3,.04,true);
                            const blocks=Math.ceil((hi-lo)/2.65),length=(hi-lo)/blocks;
                            for(let k=0;k<blocks;k++)
                                put(s*(downtown.edge+.116),lo+(k+.5)*length,.234,length-.015,downtown.level+.022,
                                    'concrete',k%7===3?'#a8a89e':'#b8b8ad',3,.196,true);
                        }
                    }
                    for(let step=1;step<=4;step++){
                        const q=j*span+19+step*13.3;
                        put(0,q,.115,5.8,.116,'paint',major?'#d0b06c':'#d1cbc0',3);
                        if(major)for(const s of [-1,1])put(s*6.15,q,.09,5.6,.115,'paint','#c6cac6',3);
                    }
                    const stripes=axis===0&&j===0?5:3;
                    for(const s of [-1,1])for(let k=-stripes;k<=stripes;k++)
                        put(k*2.1,j*span+s*15.5,1.13,3.1,stripes===5?(alongX?.089:.078):.116,
                            'paint','#d7d4c7',3,stripes===5?.003:undefined,stripes===5);
                }
            }
        }
        for(let ix=-4;ix<=4;ix++)for(let iz=-4;iz<=4;iz++)for(const dx of [-1,1])for(const dz of [-1,1]){
            if(ix===0&&iz===0)continue;
            slab(ix*span+dx*14.9,iz*span+dz*14.9,4.55,4.55,.208,'paving','#a9a495',3);
        }
    };
    H.buildDowntownCorners473=world=>{
        const {edge,walk,rampRun,rampCenter,rampHalf}=downtown;
        const cuts=[edge-.046,edge+.58,rampCenter-rampHalf-.42,edge+rampRun,
            rampCenter-rampHalf,rampCenter+rampHalf,rampCenter+rampHalf+.42,walk];
        for(const sx of [-1,1])for(const sz of [-1,1]){
            const point=(u,v,lift=0)=>{
                const x=sx*u,z=sz*v;
                return [x,H.baseGround467(x,z)+cornerHeight(u,v)+lift,z];
            };
            const patch=(u,v,u2,v2,finish,lift=0)=>{
                const orderedX=sx>0?[u,u2]:[u2,u],orderedZ=sz>0?[v,v2]:[v2,v];
                const first=world.boxes.length;
                H.addRibbon444(world,orderedZ.map(z=>orderedX.map(x=>point(x,z,lift))),finish);
                for(let i=first;i<world.boxes.length;i++)world.boxes[i].downtownCorner473=true;
            };
            for(let i=1;i<cuts.length;i++)for(let j=1;j<cuts.length;j++)
                patch(cuts[i-1],cuts[j-1],cuts[i],cuts[j],{
                    color:'#a6a59a',material:'paving',visibility:540,layer:3,thickness:.195});
            const inset=[rampCenter-rampHalf+.09,rampCenter+rampHalf-.09];
            const warning={color:'#ab7c35',material:'tactile_paving473',visibility:290,layer:3,thickness:.024};
            patch(edge+.075,inset[0],edge+.61,inset[1],warning,.011);
            patch(inset[0],edge+.075,inset[1],edge+.61,warning,.011);
        }
        world.downtownCurb473={ramps:8,walkRise:downtown.level,crossingRise:downtown.rampToe};
    };
    H.downtownFootSurface473=(x,z,ground)=>{
        const a=Math.abs(x),b=Math.abs(z),{edge,walk,level}=downtown;
        if(a<edge||b<edge||a>span-walk&&b>span-walk)return ground;
        if(a<=walk&&b<=walk)return ground+cornerHeight(a,b);
        if(a>=walk&&a<span-walk&&b<=walk||b>=walk&&b<span-walk&&a<=walk){
            if(!H.coast461.isRouteRoad(x,z))return ground+level;
        }
        return ground;
    };
    H.walkerGround473=actor=>{
        const ground=H.deckGround443(actor);
        return actor.deck443||actor.coastDeck461?ground:H.downtownFootSurface473(actor.x,actor.z,ground);
    };

    H.buildCoreLots463=w=>{
        const r=new H.RNG(4631607);
        for(const lot of lots){
            const {x,z,cx,cz,kind,venue,local}=lot;
            if(venue){w[venue](cx,cz,r);continue;}
            if(kind==='p'&&!lot.silhouette){w.park(cx,cz);continue;}
            const build=(xx,zz,ww,dd,height,family)=>{
                const first=w.boxes.length,owner=xx+','+zz;
                w.building(xx,zz,ww,dd,height,family,r);
                const building=w.buildings.at(-1);
                building.plan463=true;
                for(let i=first;i<w.boxes.length;i++)w.boxes[i].facadeOwner473=owner;
                building.crown463=['glass','tech','hotel'].includes(family)?r.int(0,3):r.int(0,1);
            };
            if(lot.silhouette){
                const profile=lot.silhouette;
                const start=w.boxes.length;
                build(profile.x,profile.z,profile.w,profile.d,profile.height,profile.family);
                w.buildings.at(-1).silhouette469=profile;
                for(let i=start;i<w.boxes.length;i++)w.boxes[i].referenceOwner469=profile.id;
                for(const sign of [-1,1]){
                    const tx=profile.x+sign*(profile.w*.5+3);
                    if(tx>x+16&&tx<x+92)w.tree(tx,profile.z+profile.d*.35,r.range(5.1,7.4));
                }
                continue;
            }
            const family=uses[kind],urban=kind==='g'||kind==='t',prominent=urban&&Math.abs(cx)<231&&cz<94;
            if(local){
                const {northSouth,offset}=local;
                const sides=[[18,offset-7],[offset+7,90]];
                for(const [n,[lo,hi]] of sides.entries()){
                    const thin=Math.max(13,(hi-lo)*.90),along=44+r.range(3,14);
                    const xx=northSouth?x+(lo+hi)*.5:cx+(n===0?-5:6),zz=northSouth?cz+(n===0?-7:7):z+(lo+hi)*.5;
                    build(xx,zz,northSouth?thin:along,northSouth?along:thin,
                        urban?r.range(37,79):r.range(14,41),n===0?family:kind==='r'?'heritage':family);
                }
            }else if(prominent){
                build(cx-12,cz-6,40+r.range(1,10),43+r.range(1,10),r.range(70,126),family);
                build(cx+21,cz+24,19.9,21.5,r.range(16,29),'heritage');
            }else if(kind==='r'||kind==='b'){
                for(const [u,v] of [[-18,-15],[20,12]])
                    build(cx+u,cz+v,r.range(21,30),r.range(25,37),r.range(17,44),family);
            }else build(cx,cz-4,r.range(38,59),r.range(38,57),urban?r.range(47,94):r.range(33,61),family);
            if(local)continue;
            for(const s of [-1,1])w.tree(cx+s*36,cz+(s>0?-32:31),r.range(5.1,7.4));
        }
    };
})(Heatline);
