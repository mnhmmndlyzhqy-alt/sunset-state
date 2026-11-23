var Heatline = globalThis.Heatline || {};
(function(H){
    const highway={x:216,start:-828,end:-159};
    H.expressRoad442=(x,z)=>Math.abs(x-highway.x)<12.65&&z>=highway.start&&z<=highway.end;
    function surface(world,x,z,w,d,y,color,material,layer=3,thickness=.038){
        const b=H.box(x,y,z,w,thickness,d,color,0,layer);
        b.material=material;b.visibilityCap=720;
        H.fitGround441(b,H.outdoorHeight,p=>world.add(p),27);
    }
    function part(world,x,z,y,w,h,d,color,material,shape='cube'){
        const b=H.box(x,H.outdoorHeight(x,z)+y,z,w,h,d,color,0,4,0);
        b.shape=shape;b.material=material;b.visibilityCap=650;world.add(b);return b;
    }
    H.hills442=(x,z)=>{
        const xx=(x+344)/248, zz=(z-178)/315;
        const ax=(x-308)/225, az=(z+322)/285;
        return 14.8*Math.exp(-(xx*xx+zz*zz))+8.1*Math.exp(-(ax*ax+az*az));
    };
    const glyphs={
        D:['110','101','101','101','110'],O:['111','101','101','101','111'],
        W:['101','101','101','111','101'],N:['101','111','111','111','101'],
        T:['111','010','010','010','010'],C:['111','100','100','100','111'],
        I:['111','010','010','010','111'],Y:['101','101','010','010','010']
    };
    function sign(world,text,x,z,y){
        const glyphSize=.13, width=text.length*4*glyphSize;
        const green=part(world,x,z,y,width+.9,1.06,.17,'#255546','metal');
        const base=green.y;
        for(const [i,char] of [...text].entries())for(const [j,row] of glyphs[char].entries()) {
            for(let k=0;k<3;k++){
                if(row[k]!=='1')continue;
                for(const side of [-1,1]){
                    const letterX=x+side*(-width/2+(i*4+k+.5)*glyphSize);
                    const b=H.box(letterX,base+(2-j)*glyphSize,z+side*.101,
                        glyphSize+.002,glyphSize+.003,.024,'#e5ebd8',0,4,0);
                    b.material='paint';b.visibilityCap=170;world.add(b);
                }
            }
        }
    }
    H.finishCity442=function(world){
        const {x,start,end}=highway;
        const link=world.nearby(x,-396);
        if(link.some(o=>Math.abs(x-o.x)<o.hw+9&&Math.abs(-396-o.z)<o.hd+5))return;
        surface(world,x,(start+end)/2,25.4,end-start,.105,'#53575b','asphalt');
        for(const edge of [-12.2,-.95,.95,12.2])
            surface(world,x+edge,(start+end)/2,.09,end-start,.137,
                Math.abs(edge)<2?'#e2bd68':'#e5e5d9','paint',3,.009);
        for(let z=start+9;z<end-9;z+=13){
            if(Math.abs(z-Math.round(z/H.BLOCK)*H.BLOCK)<16)continue;
            for(const edge of [-8.55,-4.75,4.75,8.55])
                surface(world,x+edge,z,.104,5.35,.138,'#e5e4d9','paint',3,.009);
        }
        for(const side of [-1,1])for(let z=-745;z<-205;z+=38){
            if(Math.abs(z-Math.round(z/H.BLOCK)*H.BLOCK)<21)continue;
            const xSide=x+side*15.4;
            if(world.nearby(xSide,z).some(o=>Math.abs(xSide-o.x)<o.hw+1&&Math.abs(z-o.z)<o.hd+1))continue;
            const pole=part(world,xSide,z,3.48,.145,6.93,.145,'#838983','metal','cylinder');
            const arm=part(world,xSide-side*.85,z,6.82,1.85,.13,.15,'#838983','metal');
            arm.y=pole.y+3.33;
            const lamp=part(world,xSide-side*1.72,z,6.72,.57,.10,.28,'#4a5553','metal','rounded_smooth');
            part(world,lamp.x,z,6.66,.43,.032,.19,'#e6dbaf','glass');
        }
        for(let z=start+5;z<end-5;z+=8){
            if(Math.abs(z-Math.round(z/H.BLOCK)*H.BLOCK)<17)continue;
            const b=part(world,x,z,.36,1.08,.62,8.06,'#a6a298','concrete');
            b.gradeZ=(H.outdoorHeight(x,z+4)-H.outdoorHeight(x,z-4))/8;
            world.solid(x,z,1.03,7.98,true);
        }
        for(const z of [-717,-506,-296]){
            const raise=H.deckRise443(z);
            const ground=H.outdoorHeight(x,z)+raise;
            for(const side of [-1,1]){
                part(world,x+side*14.6,z,3.5+raise*.5,.26,6.96+raise,.24,'#889496','metal');
                world.solid(x+side*14.6,z,.28,.27,true);
            }
            const beam=part(world,x,z,6.39,29.25,.30,.38,'#748286','metal');
            beam.y=ground+6.39;
            sign(world,'DOWNTOWN',x+6.12,z-.29,5.88+raise);
            sign(world,'CITY',x-6.12,z-.29,5.88+raise);
        }
        world.express442=highway;
        for(const p of world.entrancePortals){
            if(!p.interiorReady||p.facing!=='north'||Math.hypot(p.x,p.z)>385)continue;
            // A mat and a low canopy frame the same traversable door opening.
            surface(world,p.x,p.z-1.45,Math.min(2.6,p.width*.70),2.15,.08,'#69706c','paving');
            part(world,p.x,p.z-.57,3.22,Math.min(4.4,p.width+.36),.16,1.39,'#818382','metal');
            part(world,p.x,p.z-.82,3.10,1.33,.055,.21,'#ebdaa2','light_emissive');
        }
    };
    H.seedExpress442=function(game){
        if(!game.world.express442)return;
        for(const side of [-1,1])for(let lane=0;lane<3;lane++)for(let i=0;i<4;i++){
            const x=highway.x+side*(2.85+3.8*lane), z=highway.start+37+i*137+lane*11+(side+1)*9;
            if(game.civilian.some(c=>Math.hypot(c.x-x,c.z-z)<9))continue;
            const car=H.makeCar('civilian',x,z,side===1?0:Math.PI,(i+lane+side+7)%7);
            car.speed=16+lane*1.8;car.vz=-side*car.speed;
            car.express442={x,dir:-side,speed:17+lane*2.2};
            car.deck443=!!game.world.overpass443&&H.deckRise443(z)>.065;
            game.civilian.push(car);
        }
    };
    H.driveExpress442=function(game,car,dt){
        const route=car.express442, {start,end}=highway;
        if(car.z<start||car.z>end){
            const entry=route.dir>0?start+4:end-4;
            const camera=game.cam;
            const vehicles=game.civilian;
            const clear=other=>other===car||!other.alive||Math.abs(other.x-route.x)>2.7||Math.abs(other.z-entry)>16;
            if(Math.hypot(car.x-camera.x,car.z-camera.z)>165&&Math.hypot(route.x-camera.x,entry-camera.z)>165&&
                clear(game.player)&&vehicles.every(clear)&&game.police.every(clear)){
                Object.assign(car,{x:route.x,z:entry,yaw:route.dir>0?Math.PI:0,speed:route.speed,
                    vx:0,vz:route.dir*route.speed,wheelSteer:0,lane:route.x-highway.x,dir:route.dir});
                return true;
            }
            car.lane=route.x-highway.x;car.dir=route.dir;return false;
        }
        let desired=route.speed;
        const check=other=>{
            if(other===car||!other.alive||Math.abs(other.x-car.x)>2.65)return;
            const gap=(other.z-car.z)*route.dir;
            if(gap>0&&gap<30&&(other.deck443||!car.deck443||H.sameRoadLevel443(car,other)))
                desired=Math.min(desired,Math.max(0,other.speed+(gap-10)*.85));
        };
        check(game.player);
        for(const other of game.civilian)check(other);
        for(const other of game.police)check(other);
        const targetYaw=Math.atan2(car.x-route.x,-route.dir*14);
        const steer=H.clamp(H.angleDiff(car.yaw,targetYaw)*1.4,-.34,.34);
        game.moveCar(car,dt,{gas:car.speed<desired?.48:0,steer,brake:car.speed>desired+1.1,nitro:false});
        return true;
    };
})(Heatline);
