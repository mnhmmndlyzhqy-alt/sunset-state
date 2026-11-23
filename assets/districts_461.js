var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461;
    const palette={
        mainland:['#63744a','#69794e','#66784d','#69784e'],port:['#7c765f','#7c795f','#777459','#7b795f'],
        wet:['#4b654c','#4c684f','#526c50','#49654b'],private:['#68834d','#6a834c','#70854f','#69804b'],
        rough:['#777657','#786c51','#786f54','#7b7557'],sand:['#ccb582','#d3be8e','#d8bf8a','#d0b786']
    };
    const salt=(x,z)=>.5+.24*Math.sin(x*.016+z*.008)+.17*Math.cos(z*.018-x*.007)+.07*Math.sin((x-z)*.052);
    function surfaceColor(x,z,shore){
        const sand=H.reference469.sandAt(x,z,shore)>.52;
        const type=sand?'sand':x<-1025&&z>-155&&z<132?'rough':
            x<-626&&z<-527?'port':x>185&&x<637&&z<-499?'wet':x<-500&&z>-515?'private':'mainland';
        return {color:palette[type][Math.min(3,Math.floor(salt(x,z)*4))],material:sand?'concrete':'lawn443'};
    }
    const shape=(world,x,y,z,w,h,d,color,material='concrete',name='cube',yaw=0,visibility=760)=>{
        const b=H.box(x,y,z,w,h,d,color,yaw,4);
        b.shape=name;b.material=material;b.visibilityCap=visibility;world.add(b);return b;
    };
    const floor=(world,x,z,w,d,color,material='concrete',y=H.outdoorHeight(x,z)+.04)=>{
        const b=H.box(x,y-.025,z,w,.05,d,color,0,3);
        b.material=material;b.visibilityCap=1450;world.add(b);return b;
    };
    const addTri=(world,p,q,r,finish)=>{
        if((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x)<0)[q,r]=[r,q];
        const toArray=o=>[o.x,o.y,o.z];
        const a=toArray(p),b=toArray(q),c=toArray(r);
        H.addRibbon444(world,[[a,b],[a,c]],{...finish,visibility:2830,layer:0});
    };
    function buildLand(world){
        H.buildShoreMesh463(world,surfaceColor,(w,a,b,c,finish)=>{
            const size=w.boxes.length;
            addTri(w,a,b,c,finish);
            for(let i=size;i<w.boxes.length;i++)w.boxes[i].coastalLand463=true;
        });
        const sea=H.box(0,-.067,0,10800,.042,10800,'#387f91',0,3);
        sea.material='water39';sea.visibilityCap=6900;sea.sea461=true;world.add(sea);
    }
    function clippedBox(o,owner){
        if(o.material==='water39'||o.layer===0||o.stage42Swamp||o.stage450Proxy)return null;
        if(o.layer>=4&&owner){
            if(!G.keepCity(owner.x,owner.z)||!G.land(o.x,o.z))return null;
            if(o.y>owner.h+15&&o.h<1.8)return null;
            if(o.lodMax&&o.y>owner.h*.51&&o.h>1.3&&Math.max(o.w,o.d)>4.3){
                o.lodMax=Math.max(o.lodMax,1520);o.visibilityCap=Math.max(o.visibilityCap||0,1740);
            }
            return o;
        }
        if(G.keepMarina(o.x,o.z)&&!G.keepLegacy(o.x,o.z)){
            return (['wood','water39','metal','concrete','paint'].includes(o.material)&&o.y<1.1&&o.w<104&&o.d<8)?o:null;
        }
        if(o.layer>=4||o.yaw||o.basis444||o.h>.44){
            if(!G.keepLegacy(o.x,o.z)||!G.land(o.x,o.z))return null;
            if(!G.keepCity(o.x,o.z)&&o.y>12)return null;
            return o;
        }
        // The old wide pavement strips are sliced to the city block and real crossing.
        const pieces=[];
        const x0=o.x-o.w*.5,x1=o.x+o.w*.5,z0=o.z-o.d*.5,z1=o.z+o.d*.5;
        for(const [left,right,top,bottom] of [[-452,505,-374,449],[198,234,-554,-374],[108,198,-446,-418],[234,324,-446,-418]]){
            const a=Math.max(left,x0),b=Math.min(right,x1),c=Math.max(top,z0),d=Math.min(bottom,z1);
            if(b-a<.02||d-c<.02)continue;
            const x=(a+b)*.5,z=(c+d)*.5;
            pieces.push({...o,x,z,w:b-a,d:d-c,y:o.y+(o.gradeX||0)*(x-o.x)+(o.gradeZ||0)*(z-o.z)});
        }
        return pieces;
    }
    function pruneLegacy(world){
        const oldBoxes=world.boxes.length;
        const ownership=new Map(),size=72;
        for(const b of world.buildings){
            for(let x=Math.floor((b.x-b.w*.5-7)/size);x<=Math.floor((b.x+b.w*.5+7)/size);x++)
                for(let z=Math.floor((b.z-b.d*.5-7)/size);z<=Math.floor((b.z+b.d*.5+7)/size);z++){
                    const key=x+','+z,list=ownership.get(key)||[];
                    list.push(b);ownership.set(key,list);
                }
        }
        function owner(o){
            if(o.layer<4&&!(o.layer===3&&o.color==='#647973')||o.layer>=4&&o.y<2.2||o.basis444||Math.max(o.w,o.d)>117)return null;
            const places=ownership.get(Math.floor(o.x/size)+','+Math.floor(o.z/size))||[];
            let nearest=null,score=Infinity;
            for(const b of places){
                if(o.y>b.h+21||Math.abs(o.x-b.x)>b.w*.5+6.7||Math.abs(o.z-b.z)>b.d*.5+6.7)continue;
                const distance=((o.x-b.x)/(b.w+3))**2+((o.z-b.z)/(b.d+3))**2;
                if(distance<score){score=distance;nearest=b;}
            }
            return nearest;
        }
        world.boxes=world.boxes.flatMap(o=>{
            const b=owner(o);
            if(o.layer===3&&o.color==='#647973'){
                if(b&&!G.keepCity(b.x,b.z))return [];
                o.material='paving';
                o.color=['#938c7f','#a5a092','#8f9087'][Math.abs(Math.floor(o.x+o.z))%3];
            }
            return clippedBox(o,b)||[];
        });
        const preserve=p=>G.keepLegacy(p.x,p.z)&&G.land(p.x,p.z);
        const core=p=>G.keepCity(p.x,p.z)&&G.land(p.x,p.z);
        const trim=(key,valid=preserve)=>{
            if(Array.isArray(world[key]))world[key]=world[key].filter(valid);
        };
        for(const key of ['cameraOccluders','solids','propSolids','impactProps','glassPanels','lights','repairPads',
                          'fuelStations','parkCenters','landmarks','streetLifeSpots'])trim(key);
        for(const key of ['buildings','publicRoofs','retailShops','streetVenues','annexBuildings'])trim(key,core);
        world.roofsByBuilding461=new Map(world.publicRoofs.map(p=>[p.id,p]));
        trim('commerce442',core);trim('luxuryBays442',core);
        trim('explorationHubs',p=>preserve(p)||G.keepMarina(p.x,p.z));
        for(const portal of world.entrancePortals){
            if(!G.keepCity(portal.buildingX??portal.x,portal.buildingZ??portal.z)||!G.land(portal.x,portal.z))
                portal.interiorReady=false;
        }
        if(world.stage42Doors){
            trim('stage42Doors',door=>world.entrancePortals[door.id]?.interiorReady&&preserve(door));
        }
        const filterIndex=(key,valid)=>{
            const m=world[key];
            if(!(m instanceof Map))return;
            for(const [cell,items] of m){
                const next=items.filter(valid);
                if(next.length)m.set(cell,next);else m.delete(cell);
            }
        };
        for(const key of ['spatial','cameraCells','impactCells','glassCells','stage42GrassCells'])filterIndex(key,preserve);
        filterIndex('lobbyDoors443',p=>world.entrancePortals[p.id]?.interiorReady&&preserve(p));
        for(const key of Object.keys(world))if(/DoorCells/.test(key))filterIndex(key,p=>world.entrancePortals[p.id]?.interiorReady&&preserve(p));
        world.annexRoads=world.annexRoads.filter(r=>preserve({x:r.x1,z:r.z1})&&preserve({x:r.x2,z:r.z2}));
        world.stage38Sites=world.stage38Sites.filter(p=>core(p)&&p.name!=='AIRPORT'&&p.name!=='CARGO PORT');
        world.ridgeRoad443={view:{x:-794,z:563},points:[],kilometers:0};
        world.explorationHubs.push({id:4001,x:-794,z:563,label:'מצפור הרכס המערבי',kind:'garden'});
        world.legacy461={boxesBefore:oldBoxes,boxesAfter:world.boxes.length,buildings:world.buildings.length};
    }
    const length=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
    function roadSamples(road){
        const out=[],anchors=road.points;
        for(let i=0;i<anchors.length-1;i++){
            const a=anchors[i],b=anchors[i+1],n=Math.ceil(length(a,b)/5.7);
            for(let j=0;j<n;j++){
                const t=j/n,u=t*t,v=u*t;
                const p=anchors[Math.max(0,i-1)],q=anchors[Math.min(anchors.length-1,i+2)];
                const interpolate=key=>{
                    const slope=(u,v)=>v[key]-u[key],target=slope(a,b),tension=.26;
                    const low=slope(p,a),high=slope(b,q);
                    const m1=(i===0?target:low*length(a,b)/length(p,a)+target)*tension;
                    const m2=(i===anchors.length-2?target:high*length(a,b)/length(b,q)+target)*tension;
                    if(Math.abs(a[key]-b[key])<1e-6&&Math.abs(m1+m2)<.01)return a[key];
                    return (2*v-3*u+1)*a[key]+(v-2*u+t)*m1+(-2*v+3*u)*b[key]+(v-u)*m2;
                };
                // Keep cardinal straights aligned to the original city grid.
                out.push({x:Math.abs(b.x-a.x)<.01?a.x:interpolate('x'),
                    z:Math.abs(b.z-a.z)<.01?a.z:interpolate('z'),junction:j===0});
            }
        }
        out.push({...anchors.at(-1),junction:true});
        // Spread the rise over the approaches, with zero steps between road faces.
        for(const p of out){
            p.g=H.outdoorHeight(p.x,p.z);p.shore=G.coast(p.x,p.z);
            p.water=p.shore<-.45;
        }
        for(let i=0;i<out.length;i++){
            const p=out[i],a=out[Math.max(0,i-1)],b=out[Math.min(out.length-1,i+1)],d=length(a,b)||1;
            let raise=0;
            for(let n=-6;n<=6;n++){
                const q=out[i+n];if(q?.water)raise=Math.max(raise,1-G.smooth(1,7,Math.abs(n)));
            }
            p.y=Math.max(p.g+.074,3.4*raise+.064);
            if(road.id==='toResort'||road.id==='southRing')p.y=Math.max(p.y,4.7*raise+.064);
            if(road.id==='westExpress')p.y+=G.grade(p.z);
            p.nx=(b.z-a.z)/d;p.nz=-(b.x-a.x)/d;p.above=p.y-p.g;
        }
        return out;
    }
    const widthPoint=(p,w,dy)=>[p.x+p.nx*w,p.y+dy,p.z+p.nz*w];
    const ribbon=(world,run,l,r,y,color,material,layer=3,visibility=1400)=>H.addRibbon444(world,
        run.map(p=>[widthPoint(p,l,y),widthPoint(p,r,y)]),{color,material,visibility,layer});
    function buildRoads(world){
        const roads=G.roads.map(road=>({...road,samples:roadSamples(road)}));
        H.reconcileRoadProfiles477?.(roads);
        for(const road of roads){
            const half=road.width*.5,main=['northRing','southRing','westExpress','eastCoast'].includes(road.id);
            const residential=road.id.startsWith('cityLocal')||road.id.startsWith('keys')&&road.id.endsWith('Loop');
            let run=[];
            const flush=()=>{
                if(run.length<2){run=[];return;}
                const margin=H.city20Stage04ShoulderMargin?.(road,run)??.56;
                ribbon(world,run,-half-margin,half+margin,-.084,'#9b9581','concrete',4);
                ribbon(world,run,-half,half,0,main?'#606163':'#656361','asphalt');
                for(const side of [-1,1]){
                    const edge=side*(half-.40);
                    if(!residential)ribbon(world,run,edge-.050,edge+.050,.017,'#e7e0c7','paint',3,600);
                    ribbon(world,run,side*half-.085,side*half+.085,.075,'#918e80','concrete',4,495);
                }
                if(!residential)for(let i=1;i<run.length;i+=3){
                    ribbon(world,[run[i-1],run[i]],-.065,.065,.018,main?'#e2bb66':'#e0d4b7','paint',3,640);
                    if(road.width>=16)for(const side of [-1,1]){
                        const lane=side*half*.50;
                        ribbon(world,[run[i-1],run[i]],lane-.052,lane+.052,.016,'#d4d3c0','paint',3,510);
                    }
                }
                let bridge=[];
                const cap=()=>{
                    if(bridge.length>1)for(const side of [-1,1])
                        H.addRetainingWall444(world,bridge.map(p=>({
                            x:p.x+p.nx*half*side,z:p.z+p.nz*half*side,nx:p.nx,nz:p.nz,
                            bottom:p.y-.28,top:p.y+(H.city20Stage04BridgeCrest?.(road,p)??.79)
                        })),H.city20Stage04ParapetWidth?.()??.23,{face:'#8d8e85',trim:'#aea997',cap:'#b6ae9b'});
                    bridge=[];
                };
                for(const [i,p] of run.entries()){
                    if(p.above<.43){cap();continue;}
                    bridge.push(p);
                    if(i%6===3&&p.above>1.35){
                        const pierHeight=p.y-.12+1.25;
                        if(road.id==='westExpress'&&Math.abs(p.z+432)<16)continue;
                        shape(world,p.x,p.y-pierHeight*.5-.26,p.z,1.95,pierHeight,1.84,'#9e9c8f','concrete','rounded',0,2000);
                        shape(world,p.x,p.y-.50,p.z,Math.abs(p.nx)*(road.width+1.2)+1.3,.64,Math.abs(p.nz)*(road.width+1.2)+1.3,
                            '#938d7c','concrete','rounded');
                    }
                }
                cap();
                H.city20Stage04DeckJoints?.(world,road,run);
                run=[];
            };
            for(let i=0;i<road.samples.length;i++){
                const p=road.samples[i],following=road.samples[Math.min(i+1,road.samples.length-1)];
                const reuse=G.keepLegacy(p.x,p.z)&&!(road.id==='westExpress'&&G.grade(p.z)>.02)&&(
                    Math.abs(p.x-Math.round(p.x/108)*108)<.14&&Math.abs(following.x-p.x)<.13||
                    Math.abs(p.z-Math.round(p.z/108)*108)<.14&&Math.abs(following.z-p.z)<.13);
                if(reuse){
                    if(run.length)run.push(p);
                    flush();continue;
                }
                if(!run.length&&i>0)run.push(road.samples[i-1]);
                run.push(p);
            }
            flush();
        }
        G.carveRoads(roads);
        H.registerRoadProfiles477?.(roads);
        H.indexBridgeRails477?.(roads);
        world.roads461=roads;
    }

    H.prepareCoast461=world=>{
        // A restart may build a second world in the same page. Drop the previous
        // deck lookup while laying out this one's underlying topography.
        G.carveRoads([]);
        H.registerRoadProfiles477?.([]);
        pruneLegacy(world);
        buildRoads(world);
        buildLand(world);
    };
    H.paintCoastMap461=(ctx,world,aerial)=>{
        const sea=ctx.createLinearGradient(-1100,-870,1100,870);
        sea.addColorStop(0,aerial?'#123e55':'#123644');
        sea.addColorStop(.48,aerial?'#1c5565':'#173d48');
        sea.addColorStop(1,aerial?'#287987':'#194651');
        ctx.fillStyle=sea;ctx.fillRect(-1400,-1400,2800,2800);
        H.reference469.paintMap(ctx,aerial);
        const patches=world.terrain461||[];
        if(aerial){
            for(const {poly,color} of patches){
                ctx.beginPath();for(const vertex of poly)ctx.lineTo(vertex.x,vertex.z);ctx.closePath();
                ctx.fillStyle=color;ctx.fill();
            }
        }
        ctx.lineJoin='round';ctx.lineCap='round';
        ctx.beginPath();
        for(const path of world.walkways462||[]){
            ctx.moveTo(...path[0]);for(const p of path.slice(1))ctx.lineTo(...p);
        }
        for(const p of world.frontage462||[]){ctx.moveTo(p.ex,p.ez);ctx.lineTo(p.x,p.z);}
        ctx.strokeStyle=aerial?'#b6ad93':'#6b7968';ctx.lineWidth=2.5;ctx.stroke();
        if(aerial){
            for(const o of world.boxes){
                if(o.shape!=='urban_crown'||o.w<2.4||!G.land(o.x,o.z))continue;
                const radius=Math.min(4.5,o.w*.57);
                ctx.beginPath();ctx.arc(o.x+1.1,o.z+1.2,radius,0,Math.PI*2);ctx.fillStyle='#223b32a0';ctx.fill();
                ctx.beginPath();ctx.arc(o.x,o.z,radius*.85,0,Math.PI*2);ctx.fillStyle='#425f3a';ctx.fill();
            }
        }
        for(const o of world.mapFeatures461||[]){
            ctx.fillStyle=o.color;
            if(o.polygon){
                ctx.beginPath();ctx.moveTo(...o.polygon[0]);
                for(const point of o.polygon.slice(1))ctx.lineTo(...point);
                ctx.closePath();ctx.fill();
            }else if(o.id==='stadium'){
                ctx.save();ctx.translate(o.x,o.z);ctx.rotate(o.yaw||0);
                ctx.beginPath();ctx.roundRect(-o.width*.5,-o.depth*.5,o.width,o.depth,[o.width*.30]);ctx.fill();
                ctx.fillStyle='#41554e';ctx.beginPath();ctx.roundRect(-o.width*.38,-o.depth*.40,o.width*.76,o.depth*.80,[o.width*.22]);ctx.fill();
                ctx.fillStyle='#587c4f';ctx.fillRect(-23,-34,46,68);
                ctx.strokeStyle='#afbd94';ctx.lineWidth=1.1;ctx.strokeRect(-21,-32,42,64);
                ctx.beginPath();ctx.moveTo(-21,0);ctx.lineTo(21,0);ctx.stroke();ctx.restore();
            }else if(o.id==='fairway'){
                ctx.beginPath();ctx.ellipse(o.x,o.z,o.width*.5,o.depth*.5,0,0,Math.PI*2);ctx.fill();
            }else if(o.yaw){
                ctx.save();ctx.translate(o.x,o.z);ctx.rotate(o.yaw);
                ctx.fillStyle='#27342845';ctx.fillRect(-o.width/2+1.1,-o.depth/2+1.25,o.width+.9,o.depth+1.05);
                ctx.fillStyle=o.color;ctx.fillRect(-o.width/2,-o.depth/2,o.width,o.depth);
                ctx.restore();
            }else{
                ctx.fillRect(o.x-o.width/2,o.z-o.depth/2,o.width,o.depth);
                if(o.id==='runway'){
                    ctx.strokeStyle='#dfdac47f';ctx.lineWidth=1.8;ctx.setLineDash([10,9]);
                    ctx.beginPath();ctx.moveTo(o.x-o.width*.47,o.z);ctx.lineTo(o.x+o.width*.47,o.z);ctx.stroke();ctx.setLineDash([]);
                }
            }
        }
    };
    let bathymetry;
    H.coastalDepth461=()=>{
        if(bathymetry)return bathymetry;
        const width=384,height=288,data=new Uint8Array(width*height*2);
        for(let z=0;z<height;z++)for(let x=0;x<width;x++){
            const xx=(x+.5)*2600/width-1300,zz=(z+.5)*1920/height-960;
            const elevation=G.coast(xx,zz),location=(z*width+x)*2;
            data[location]=Math.round(255*G.clamp(-elevation/87,0,1));
            data[location+1]=Math.round(255*G.clamp(.5+elevation/14,0,1));
        }
        return bathymetry={width,height,data};
    };
    H.coastShape461=shape;H.coastFloor461=floor;
})(Heatline);
