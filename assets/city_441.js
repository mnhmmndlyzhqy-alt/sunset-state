/* Land, pavement and the wetland crossing share one terrain profile. */
var Heatline = globalThis.Heatline || {};
(function (Heatline) {
    const crossing = {x:-817, start:-859, end:-693, width:14.4};
    const boulevard = {start:-96,end:-12,z:0,width:30};
    const smooth = t => {
        t = Math.min(1, Math.max(0, t));
        return t * t * (3 - 2 * t);
    };
    Heatline.causewayRise441 = (x,z) => {
        const along = Math.min((z-crossing.start)/47,(crossing.end-z)/47);
        const across = 1-smooth((Math.abs(x-crossing.x)-7.4)/5.6);
        const cityAlong=Math.min((x-boulevard.start)/32,(boulevard.end-x)/32);
        const cityAcross=1-smooth((Math.abs(z-boulevard.z)-15)/10);
        return 3.65*smooth(along)*across+2.75*smooth(cityAlong)*cityAcross;
    };

    Heatline.fitGround441 = function (patch, terrain, emit, step, ground = false, wetland = false) {
        const {w,d}=patch;
        const bridge=patch.x+w*.5>-97&&patch.x-w*.5<-11&&patch.z+d*.5>-26&&patch.z-d*.5<26&&!ground;
        const grid = (min,max,extraMin,extraMax,urbanMin,urbanMax,urbanStep,ridgeMin,ridgeMax) => {
            const cuts = [min];
            for (let at = (Math.floor(min/step)+1)*step; at<max-.001; at+=step)
                cuts.push(at);
            if(wetland){
                let at=(Math.floor(Math.max(min,extraMin)/18)+1)*18;
                for(;at<Math.min(max-.001,extraMax);at+=18)
                    if(at%step!==0)cuts.push(at);
            }
            if(bridge){
                let at=(Math.floor(Math.max(min,urbanMin)/urbanStep)+1)*urbanStep;
                for(;at<Math.min(max-.001,urbanMax);at+=urbanStep)
                    if(at%step!==0)cuts.push(at);
            }
            if(ground){
                const nearStart=Math.max(min,ridgeMin),nearEnd=Math.min(max,ridgeMax);
                for(let at=Math.ceil(nearStart/9)*9;at<nearEnd-.001;at+=9){
                    if(at>min+.001&&at%step!==0)cuts.push(at);
                }
            }
            if(bridge||wetland||ground)cuts.sort((a,b)=>a-b);
            cuts.push(max);
            return cuts;
        };
        const xs=grid(patch.x-w*.5,patch.x+w*.5,-1170,-660,-108,0,6,-1008,-621),
            zs=grid(patch.z-d*.5,patch.z+d*.5,-1060,-570,-30,30,3,126,450);
        const heights=xs.map(x=>zs.map(z=>terrain(x,z)));
        let pieces=0;
        for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
            const x0=xs[i-1],x1=xs[i],z0=zs[j-1],z1=zs[j],pw=x1-x0,pd=z1-z0;
            const a=heights[i-1][j-1],b=heights[i][j-1],c=heights[i][j],e=heights[i-1][j];
            const x=(x0+x1)*.5,z=(z0+z1)*.5;
            const slopeX=patch.gradeX||0,slopeZ=patch.gradeZ||0;
            const origin=patch.y+slopeX*(x-patch.x)+slopeZ*(z-patch.z);
            const flat=Math.max(a,b,c,e)-Math.min(a,b,c,e)<.00001;
            const part={...patch,x,z,w:pw,d:pd,y:origin+(a+c)*.5,terrainTile42:true,
                gradeX:slopeX,gradeZ:slopeZ};
            if(ground)part.stage441Land=true;
            if(flat){
                emit(part);
                pieces++;
                continue;
            }
            if(Math.abs(a+c-b-e)<.027 || Math.min(pw,pd)<.3 || patch.h>.15){
                part.gradeX+=((b-a)+(c-e))/(2*pw);
                part.gradeZ+=((e-a)+(c-b))/(2*pd);
                emit(part);
                pieces++;
                continue;
            }
            emit({...part,shape:'grade_east',gradeX:slopeX+(b-a)/pw,gradeZ:slopeZ+(c-b)/pd});
            emit({...part,shape:'grade_west',gradeX:slopeX+(c-e)/pw,gradeZ:slopeZ+(e-a)/pd});
            pieces+=2;
        }
        return pieces;
    };

    Heatline.streetGroundPieces441 = function* (boxes) {
        const medianColors=new Set(['#e8aa53','#d8bb73','#d8b57a']);
        const block=Heatline.BLOCK;
        for(const patch of boxes){
            const vertical=patch.d>patch.w, span=vertical?patch.d:patch.w;
            if(patch.layer!==3||span<750||Math.min(patch.d,patch.w)>.18||
                !medianColors.has(patch.color)||patch.yaw){
                yield patch;
                continue;
            }
            const center=vertical?patch.z:patch.x;
            const min=center-span*.5,max=center+span*.5;
            let from=min;
            for(let at=Math.ceil((min-17)/block)*block;at-17<max;at+=block){
                const to=at-17;
                if(to>from){
                    yield vertical?{...patch,z:(from+to)*.5,d:to-from}:
                        {...patch,x:(from+to)*.5,w:to-from};
                }
                from=at+17;
            }
            if(from<max)yield vertical?{...patch,z:(from+max)*.5,d:max-from}:
                {...patch,x:(from+max)*.5,w:max-from};
        }
    };
    Heatline.addCauseway441 = function (world) {
        const {x,start,end,width}=crossing;
        const road=Heatline.outdoorHeight;
        const ground=Heatline.cityNaturalTerrain42;
        const add=(px,y,z,w,h,d,color,material='concrete',shape='cube',glow=0)=>{
            const part=Heatline.box(px,y,z,w,h,d,color,0,4,glow);
            part.material=material;
            part.shape=shape;
            part.visibilityCap=h>4?1200:760;
            world.add(part);
            return part;
        };
        const grade=(px,z0,z1,ww,offset,h,color,material,layer=4)=>{
            const y0=road(px,z0),y1=road(px,z1);
            const part=add(px,(y0+y1)*.5+offset,(z0+z1)*.5,ww,h,z1-z0,color,material);
            part.layer=layer;
            part.gradeZ=(y1-y0)/(z1-z0);
        };
        const segments=Math.ceil((end-start)/4);
        for(let i=0;i<segments;i++){
            const z0=start+i*(end-start)/segments,z1=start+(i+1)*(end-start)/segments;
            grade(x,z0,z1,width,-.32,.72,'#899499','concrete');
            grade(x,z0,z1,10.2,.058,.08,'#5d6268','asphalt',3);
            grade(x,z0,z1,.12,.114,.05,'#c5ac74','paint',3);
            for(const side of [-1,1]){
                grade(x+side*5.04,z0,z1,.12,.118,.04,'#cfd2cc','paint',3);
                grade(x+side*6.18,z0,z1,2.04,.142,.19,'#a9a89e','paving',3);
                if(z0<start+20||z1>end-20)continue;
                const edge=x+side*7.16;
                grade(edge,z0,z1,.15,.54,.19,'#969d9a','concrete');
                grade(edge,z0,z1,.12,1.12,.12,'#667b83','metal');
                add(edge,road(edge,z0)+.65,z0,.13,1.18,.14,'#758d95','metal');
            }
            if(i%8===4){
                const z=(z0+z1)*.5,top=road(x,z)-.40,base=ground(x,z)-.60;
                const height=top-base;
                if(height>.7){
                    for(const side of [-1,1])
                        add(x+side*3.59,base+height*.5,z,1.32,height,1.45,'#879294','concrete','rounded');
                    add(x,top-.36,z,12.5,.62,1.59,'#77848b');
                }
            }
            if(i%10===5){
                const z=z0,edge=x+7.0,y=road(edge,z);
                add(edge,y+2.31,z,.15,4.4,.16,'#63767e','metal');
                add(edge-.55,y+4.48,z,1.17,.15,.28,'#73878b','metal');
                add(edge-1.02,y+4.39,z,.41,.09,.23,'#f5db9f','light_emissive','cube',.65);
            }
        }
        for(const z of [start+36,end-36]){
            const y=road(x,z);
            for(const side of [-1,1]){
                const edge=x+side*7.1;
                add(edge,y+2.56,z,.56,5.06,.60,'#9ca6a2','concrete');
                add(edge,y+5.12,z,.78,.23,.82,'#c7b792');
                add(edge,y+5.39,z,.28,.24,.28,'#f0d59e','light_emissive','cube',.55);
            }
            add(x,y+4.97,z,width+.32,.36,.63,'#657a84','metal');
        }
        world.stage441Causeway={...crossing,segments,peakRise:3.65};
    };

    Heatline.addBoulevardBridge441 = function (world) {
        const {start,end,z,width}=boulevard;
        const height=Heatline.outdoorHeight,land=Heatline.cityNaturalTerrain42;
        const add=(x,y,pz,w,h,d,color,material,shape='cube',layer=4)=>{
            const o=Heatline.box(x,y,pz,w,h,d,color,0,layer);
            o.material=material;o.shape=shape;o.visibilityCap=680;
            world.add(o);
            return o;
        };
        const deck=(x0,x1,pz,ww,offset,h,color,material,layer=4)=>{
            const a=height(x0,pz),b=height(x1,pz);
            const part=add((x0+x1)*.5,(a+b)*.5+offset,pz,x1-x0,h,ww,color,material,'cube',layer);
            part.gradeX=(b-a)/(x1-x0);
        };
        for(let x=start;x<end;x+=3){
            deck(x,x+3,z,width,-.25,.60,'#8b8c84','concrete');
            deck(x,x+3,z,24.38,.069,.041,'#515961','asphalt',3);
            for(const side of [-1,1]){
                deck(x,x+3,side*.45,.10,.093,.023,'#d6b575','paint',3);
                deck(x,x+3,side*11.6,.125,.093,.024,'#e5e2d2','paint',3);
                deck(x,x+3,side*13.63,2.92,.123,.124,'#ada79d','paving',3);
                if(x<start+16||x>end-18)continue;
                const edge=side*14.94;
                deck(x,x+3,edge,.14,1.14,.14,'#62737a','metal');
                deck(x,x+3,edge,.11,.54,.12,'#a4aaaa','metal');
                add(x,height(x,edge)+.69,edge,.14,1.16,.13,'#718084','metal');
            }
        }
        const cable=(x0,y0,x1,y1,pz)=>{
            const lean=Math.atan2(y1-y0,x1-x0);
            const o=add((x0+x1)*.5,(y0+y1)*.5,pz,Math.hypot(x1-x0,y1-y0),.088,.095,'#9babb0','metal');
            o.roll=lean;
        };
        for(const sign of [-1,1]){
            const side=sign*14.75;
            for(const pylon of [-72,-36]){
                const base=height(pylon,side);
                add(pylon,base+2.92,side,.76,5.49,.62,'#8d9c9b','concrete','rounded');
                add(pylon,base+5.62,side,1.05,.36,.85,'#c3b99f','metal');
                add(pylon,base+5.86,side,.28,.25,.36,'#ebd895','light_emissive');
                for(const dx of [-13,-9,-5,5,9,13]){
                    const x=pylon+dx;
                    cable(pylon,base+4.79-Math.abs(dx)*.05,x,height(x,side)+.68,side);
                }
            }
            for(let i=0;i<8;i++){
                const x=-69+i*4.27,base=height(x,side);
                add(x,base+.21,side,.17,.29,.29,'#b2aca1','concrete');
            }
        }
        for(const x of [-70,-38]){
            const bottom=land(x,0)-.54,top=height(x,0)-.42;
            for(const side of [-1,1]){
                const h=top-bottom;
                add(x,(bottom+top)*.5,side*8.3,.89,h,.83,'#7d898b','concrete','rounded');
            }
            add(x,top-.17,0,2.06,.58,20,'#79898b','concrete');
        }
        add(-54,land(-54,0)+.08,0,7.2,.05,40,'#447a83','water39','cube',3);
        // Split the starter frontage into a sidewalk, curb strip and paved forecourt.
        for(const row of [22.55,27.05,31.55]){
            for(let i=0;i<10;i++){
                const x=-76.5+i*4.45;
                const a=height(x-2.2,row),b=height(x+2.2,row);
                const tile=add(x,(a+b)*.5+.112,row,4.42,.042,4.44,i%3===0?'#a9a7a0':'#b1ada4','paving','cube',3);
                tile.gradeX=(b-a)/4.4;
                tile.gradeZ=(height(x,row+2.2)-height(x,row-2.2))/4.4;
            }
        }
        for(const x of [-68.5,-61.5,-46.5,-39.5]){
            const pz=20.4,y=height(x,pz);
            if(world.nearby(x,pz).some(o=>Math.abs(o.x-x)<o.hw+.4&&Math.abs(o.z-pz)<o.hd+.4))continue;
            add(x,y+.40,pz,.26,.76,.26,'#617279','metal','cylinder');
            add(x,y+.57,pz,.28,.13,.28,'#c3b178','metal','cylinder');
        }
        world.stage441BoulevardBridge={...boulevard,peakRise:2.75};
    };

    Heatline.finishFacades441 = function (world) {
        const details=[];
        for(const pane of world.boxes){
            if(pane.material!=='building_window'||pane.y<2.6||pane.y>11||
                pane.h<1.1||pane.h>2.65||pane.yaw||Math.abs(pane.x)>655||Math.abs(pane.z)>655)continue;
            if((Math.round(pane.x)*113+Math.round(pane.z)*67+Math.round(pane.y*8))%5!==0)continue;
            const front=pane.d<.20 && pane.w>1.25 && pane.w<4.6;
            const side=pane.w<.20 && pane.d>1.25 && pane.d<4.6;
            if(!front&&!side)continue;
            const variation=(Math.round(pane.x*5+pane.z*7+pane.y*11)&3);
            const sill=Heatline.box(pane.x,pane.y-pane.h*.5-.055,pane.z,
                front?pane.w+.13:.23,.095,front?.23:pane.d+.13,
                ['#afb4af','#c2b6a5','#858e8e','#ded4c1'][variation],0,4);
            sill.material='concrete';
            sill.visibilityCap=380;
            details.push(sill);
        }
        for(const detail of details)world.add(detail);
        world.stage441FacadeDetails=details.length;
    };

    Heatline.addFreightSiding441 = function (world) {
        const x=1021,z=493,railY=.31;
        const add=(px,y,pz,w,h,d,color,material,shape='cube')=>{
            const o=Heatline.box(px,y,pz,w,h,d,color,0,4);
            o.material=material;o.shape=shape;o.visibilityCap=540;
            world.add(o);
        };
        add(x,.10,z,4.6,.15,83,'#676965','concrete','rounded');
        for(const side of [-1,1]){
            add(x+side*.77,.28,z,.09,.10,83,'#929d9c','metal');
            add(x+side*2.48,1.09,z,.11,.13,83,'#a2a69d','metal');
            for(let k=0;k<21;k++){
                add(x+side*2.48,.60,z-40+k*4,.12,1.2,.12,'#737f7e','metal');
            }
            world.solid(x+side*2.48,z,.12,83,true);
        }
        for(let k=0;k<54;k++)add(x,.197,z-40+k*1.50,2.78,.12,.27,'#777269','wood');
        for(const end of [-1,1]){
            add(x,.64,z+end*41,2.5,.72,.38,'#717a76','metal','rounded');
            world.solid(x,z+end*41,5,1,true);
        }
        world.freight441={x,y:railY,z,yaw:0,wheel:0,urbanModel441:Heatline.URBAN441.freight,center:z};
    };

    Heatline.emitFreight441=function(actor,out,t,cam,renderer){
        if(!actor)return;
        const distance=Math.hypot(actor.x-cam.x,actor.center-cam.z);
        if(distance>310)return;
        const offset=18*Math.sin(t*.088);
        actor.z=actor.center+offset;
        actor.wheel=-offset/.55;
        if(renderer.premium43?.selectFreight(actor,distance))return;
        const add=(x,y,z,w,h,d,c,shape='rounded_smooth')=>{
            const part=Heatline.box(actor.x+x,actor.y+y,actor.z+z,w,h,d,c,0,4);
            part.material='metal';part.shape=shape;out.push(part);
        };
        add(0,1.11,0,3.12,.62,19.0,'#3b4a4c');
        add(0,2.03,1.8,2.66,1.73,13.6,'#376669');
        add(0,2.83,-5.3,2.84,3.12,3.8,'#bc854a');
        add(0,3.27,-7.25,2.46,.61,.12,'#536f79','rounded');
        for(const side of [-1,1])for(const at of [-6.75,-5.27,-3.79,4.33,5.81,7.29]){
            const first=out.length;
            add(side*.81,.54,at,.30,1.08,1.08,'#33383b','wheel');
            out[first].spin=actor.wheel;
        }
    };
})(Heatline);
