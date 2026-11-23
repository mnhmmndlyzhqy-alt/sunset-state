var Heatline = globalThis.Heatline || {};
(function(H){
    const waypoints=[[-648,324],[-682,324],[-716,317],[-749,293],[-778,259],[-806,222],
        [-837,210],[-862,222],[-873,252],[-878,282],[-858,316],[-817,342],[-769,351],[-727,344],[-682,324]];
    const road=[];
    for(let i=0;i<waypoints.length-1;i++){
        const a=waypoints[Math.max(0,i-1)],b=waypoints[i],c=waypoints[i+1],d=waypoints[Math.min(waypoints.length-1,i+2)];
        const steps=Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/4.0);
        for(let step=0;step<steps;step++){
            const t=step/steps;
            road.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+
                (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)));
        }
    }
    road.push(waypoints[waypoints.length-1]);

    H.ridgeRise443=(x,z)=>{
        if(x>-635||x<-1060||z<95||z>520)return 0;
        const ax=(x+839)/106,az=(z-269)/118;
        const bx=(x+766)/135,bz=(z-309)/108;
        const t=Math.min(1,Math.max(0,Math.min(x+1060,-635-x,z-95,520-z)/90));
        return (20.6*Math.exp(-ax*ax-az*az)+10.8*Math.exp(-bx*bx-bz*bz))*t*t*(3-2*t);
    };
    const segments=road.slice(1).map(([x1,z1],i)=>{
        const [x0,z0]=road[i],dx=x1-x0,dz=z1-z0,length=Math.hypot(dx,dz);
        return {x0,z0,x1,z1,dx,dz,length,cx:(x0+x1)*.5,cz:(z0+z1)*.5,yaw:Math.atan2(-dx,dz)};
    });
    const spatial=new Map();
    for(const s of segments)for(let a=Math.floor((Math.min(s.x0,s.x1)-8)/24);a<=Math.floor((Math.max(s.x0,s.x1)+8)/24);a++)
        for(let b=Math.floor((Math.min(s.z0,s.z1)-8)/24);b<=Math.floor((Math.max(s.z0,s.z1)+8)/24);b++){
            const key=`${a},${b}`;
            if(!spatial.has(key))spatial.set(key,[]);
            spatial.get(key).push(s);
        }
    H.onRidgeRoad443=(x,z)=>{
        if(x>-641||x<-892||z<196||z>363)return false;
        const nearby=spatial.get(`${Math.floor(x/24)},${Math.floor(z/24)}`)||[];
        return nearby.some(s=>{
            const t=H.clamp(((x-s.x0)*s.dx+(z-s.z0)*s.dz)/(s.length*s.length),0,1);
            return (x-s.x0-t*s.dx)**2+(z-s.z0-t*s.dz)**2<5.4**2;
        });
    };
    H.buildRidgeRoad443=function(world){
        const ridgeRows=road.map(([x,z],i)=>{
            const a=road[Math.max(0,i-1)],b=road[Math.min(road.length-1,i+1)];
            const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
            return {x,z,nx:(b[1]-a[1])/d,nz:-(b[0]-a[0])/d};
        });
        const ribbon=(a,b,h,color,material,source=ridgeRows)=>{
            const edge=({x,z,nx,nz},offset)=>{
                const xx=x+nx*offset,zz=z+nz*offset;
                return [xx,H.outdoorHeight(xx,zz)+h,zz];
            };
            H.addRibbon444(world,source.map(p=>[edge(p,a),edge(p,b)]),{color,material});
        };
        ribbon(-5.45,5.45,.206,'#6b6764','asphalt');
        ribbon(-6.85,-5.45,.25,'#9b9384','paving');
        ribbon(5.45,6.95,.25,'#a89b89','paving');
        for(const edge of [-5.18,5.18])ribbon(edge-.047,edge+.047,.216,'#dbd2bb','paint');
        for(let i=1;i<road.length-2;i+=3)ribbon(-.068,.068,.217,'#d4b86e','paint',ridgeRows.slice(i,i+2));
        const shade={paving:'#aaa597',asphalt:'#666466',paint:'#ded1a3',metal:'#7f8581'};
        const build=(s,offset,w,length,y,h,material)=>{
            const x=s.cx+s.dz/s.length*offset,z=s.cz-s.dx/s.length*offset;
            const ground=H.outdoorHeight(x,z);
            const part=H.box(x,ground+y,z,w,h,length,shade[material],s.yaw,3);
            part.material=material;part.visibilityCap=660;
            part.gradeX=(H.outdoorHeight(x+1,z)-H.outdoorHeight(x-1,z))*.5;
            part.gradeZ=(H.outdoorHeight(x,z+1)-H.outdoorHeight(x,z-1))*.5;
            world.add(part);return part;
        };
        for(const [i,s] of segments.entries()){
            if(s.cx<-756){
                const barrier=build(s,-6.12,.125,s.length+.38,.79,.17,'metal');
                if(i%2===0)world.add(Object.assign(H.box(barrier.x,barrier.y-.28,barrier.z,.135,.93,.135,'#7f8581',barrier.yaw,4),{material:'metal'}));
            }
        }
        const view={x:-878,z:253};
        const approach={cx:view.x-5.8,cz:view.z,length:1,dx:0,dz:1,yaw:0};
        build(approach,0,11.7,17,.17,.21,'paving');
        for(let i=0;i<3;i++)world.add(Object.assign(H.box(view.x-10.3,H.outdoorHeight(view.x-10.3,view.z+i*3.7)+.42,
            view.z+i*3.7,1.0,.64,1.4,'#a49a84',0,4),{material:'concrete'}));
        H.buildRidgeGarden444(world);
        const rng=new H.RNG(443101);
        for(let i=0;i<66;i++){
            const x=rng.range(-914,-714),z=rng.range(198,378);
            if(H.onRidgeRoad443(x,z)||H.onRidgeRoad443(x-5,z)||H.onRidgeRoad443(x+5,z)||
                H.onRidgeRoad443(x,z-5)||H.onRidgeRoad443(x,z+5)||Math.hypot(x-view.x,z-view.z)<13)continue;
            if(world.nearby(x,z).some(o=>Math.abs(x-o.x)<o.hw+3&&Math.abs(z-o.z)<o.hd+3))continue;
            const y=H.outdoorHeight(x,z), height=rng.range(3.6,6.5),large=i%3!==0;
            if(large){
                const trunk=H.box(x,y+height*.34,z,.28,height*.68,.25,'#685545',0,4);
                trunk.material='bark';trunk.shape='cylinder';world.add(trunk);
            }
            for(let j=0;j<(large?3:2);j++){
                const edge=(j-1)*.76;
                const crown=H.box(x+edge,y+(large?height*.75+j*.37:.53),z+j*.24,large?2.94:1.4,large?2.56:1.2,
                    large?2.49:1.37,['#4e6943','#566e49','#65754b'][j],rng.next()*H.TAU,4);
                crown.material='foliage';crown.shape='urban_crown';world.add(crown);
            }
        }
        world.explorationHubs.push({id:world.explorationHubs.length,...view,label:'מצפור הרכס המערבי',kind:'garden'});
        world.ridgeRoad443={kilometers:segments.reduce((sum,s)=>sum+s.length,0)/1000,view,segments:segments.length,points:road};
    };
    H.buildRidgeGarden444=function(world){
        const rng=new H.RNG(443025),land=H.outdoorHeight;
        const add=(x,z,y,w,h,d,color,material,shape='cube',yaw=0)=>{
            const o=H.box(x,land(x,z)+y,z,w,h,d,color,yaw,4);
            o.material=material;o.shape=shape;o.visibilityCap=420;world.add(o);return o;
        };
        const points=[[-851,221],[-851.3,226],[-849.7,233],[-847.9,239],[-847.3,245],[-848.2,249.6],[-850.1,254.3]];
        const rows=points.map(([x,z],i)=>{
            const a=points[Math.max(0,i-1)],b=points[Math.min(i+1,points.length-1)];
            const angle=Math.atan2(-(b[0]-a[0]),b[1]-a[1]);
            return {x,z,c:Math.cos(angle),s:Math.sin(angle)};
        });
        const height=(p,offset)=>{
            const x=p.x+offset*p.c,z=p.z+offset*p.s;
            return [x,land(x,z)+.135,z];
        };
        for(const [a,b,color] of [[-1.45,1.45,'#9e8d79'],[-1.61,-1.45,'#c1ad90'],[1.45,1.61,'#c1ad90']])
            H.addRibbon444(world,rows.map(p=>[height(p,a),height(p,b)]),{color,material:'paving',visibility:370});
        const plaza=H.box(-850,.113,255,11.9,.14,8.5,'#ae9c86',0,3);
        plaza.material='paving';plaza.visibilityCap=380;
        H.fitGround441(plaza,land,b=>world.add(b),2);
        for(const sign of [-1,1]){
            const x=-850+sign*3.42,z=257.25;
            for(const dx of [-.86,.86])add(x+dx,z,.30,.16,.60,.49,'#646966','metal');
            add(x,z,.57,2.15,.17,.58,'#8e7660','wood','rounded');
            for(const dx of [-.88,0,.88])add(x+dx,z+.20,.91,.085,.69,.12,'#67716d','metal');
            add(x,z+.23,1.06,2.10,.23,.13,'#9b8163','wood','rounded');
            world.solid(x,z,2.06,.66,true);
        }
        // The overlook has one smooth contour wall with a continuous coping.
        // Its cap follows the survey curve and never jumps between block heights.
        const coping=Array.from({length:21},(_,i)=>{
            const x=-856+i*.58,z=259.36+.35*Math.sin(i*.27),y=land(x,z);
            return {x,z,nx:.16*Math.cos(i*.27),nz:-.987,bottom:y-.11,top:y+.69};
        });
        H.addRetainingWall444(world,coping,.64,{face:'#8c8070',trim:'#a89c8c',cap:'#b1a494'});
        for(let i=0;i<93;i++){
            const x=rng.range(-864,-834),z=rng.range(223.8,267);
            if(points.some(p=>Math.hypot(p[0]-x,p[1]-z)<2.6)||
                Math.abs(x+850)<6.55&&Math.abs(z-255)<5.78||H.onRidgeRoad443(x,z))continue;
            const col=['#5b7345','#708052','#717e48','#4d6844'][i%4];
            if(i%9===0)for(let j=0;j<3;j++)add(x+j*.42,z+j*.22,.41,1.04,.79,1.16,col,'foliage','urban_crown',rng.next()*4);
            else if(i%7===0)add(x,z,.27,.85,.59,.68,'#898373','masonry','urban_crown',rng.next()*5);
            else add(x,z,.15,.51,.31,.53,col,'foliage','grass443',rng.next()*5);
        }
        world.explorationHubs.push({id:world.explorationHubs.length,x:-850,z:255,label:'גינת טרסות הרכס',kind:'garden'});
    };
})(Heatline);
