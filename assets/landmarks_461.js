var Heatline=globalThis.Heatline||{};
(function(H){
    'use strict';
    const G=H.coast461,TAU=Math.PI*2;
    const part=H.coastShape461,floor=H.coastFloor461;
    const y=(x,z)=>H.outdoorHeight(x,z);
    const add=(w,x,z,h,width,height,depth,color,material='concrete',shape='cube',yaw=0,range=1320)=>
        part(w,x,y(x,z)+h,z,width,height,depth,color,material,shape,yaw,range);
    const rng=seed=>new H.RNG(seed);
    function solid(w,x,z,width,depth){w.solid(x,z,width,depth,false);}
    const safe=(w,x,z,pad=0)=>G.coast(x,z)>pad+3&&!G.isRouteRoad(x,z)&&
        !w.nearby(x,z).some(s=>Math.abs(s.x-x)<s.hw+pad&&Math.abs(s.z-z)<s.hd+pad);
    function grove(w,x,z,s,spread=1,type=0){
        const ground=y(x,z);
        part(w,x,ground+s*.34,z,s*.052,s*.68,s*.052,type?'#796e56':'#645947','bark','cylinder',0,530);
        for(let i=0;i<5;i++){
            const a=i*2.39996,r=(i?1.02:0)*spread;
            part(w,x+Math.sin(a)*r,ground+s*(.69+i*.043),z+Math.cos(a)*r,s*.47,s*.37,s*.48,
                ['#557144','#667c49','#6d8550','#456445','#73864d'][i],'foliage','urban_crown',a,660);
        }
    }
    function palm(w,x,z,s){
        const h=y(x,z);
        part(w,x,h+s*.49,z,.25,s,.25,'#8b765a','bark','cylinder',0,630);
        for(let i=0;i<8;i++){
            const a=i*TAU/8,r=(i%2?.24:.29)*s;
            const leaf=part(w,x+Math.sin(a)*r,h+s-.18-i%2*.24,z+Math.cos(a)*r,
                s*.112,.14,s*.54,['#5e754a','#728450','#405d3c'][i%3],'foliage','wedge',a,740);
            leaf.pitch=.21+i%3*.046;
        }
    }
    function flatShape(w,x,z,rx,rz,tone,h=.06){
        const rays=34;
        for(let ring=0;ring<5;ring++){
            const rows=[];
            for(let i=0;i<=rays;i++){
                const angle=i*TAU/rays,profile=1+.11*Math.sin(angle*3)+.07*Math.cos(angle*5);
                rows.push([ring/5,(ring+1)/5].map(t=>{
                    const px=x+t*profile*Math.cos(angle)*rx,pz=z+t*profile*Math.sin(angle)*rz;
                    return [px,y(px,pz)+h,pz];
                }));
            }
            H.addRibbon444(w,rows,{color:tone,material:'lawn443',visibility:1300,layer:3});
        }
    }
    function mark(w,id,x,z,width,depth,color){
        w.mapFeatures461.push({id,x,z,width,depth,color});
    }
    function port(w){
        const R=H.reference469;
        const service=R.world(167,151),base=y(service.x,service.z)+.21;
        w.quayRows468=[];
        const pad=(a,b,c,d,color)=>{
            const p=R.world(a,b),q=R.world(c,d);
            floor(w,(p.x+q.x)/2,(p.z+q.z)/2,q.x-p.x,q.z-p.z,color,'concrete',base);
        };
        pad(128,40,350,76,'#8c8b82');pad(128,74,204,222,'#86827a');
        pad(201,43,361,71,'#8d887e');pad(128,132,207,217,'#777b74');
        for(let v=45;v<=218;v+=3){
            const a=R.world(125,v),b=R.world(138,v);
            w.quayRows468.push([[a.x,1.09,a.z],[b.x,base+.012,b.z]]);
        }
        H.addRibbon444(w,w.quayRows468,{color:'#8e8a80',material:'concrete',visibility:1850,layer:3});
        H.addRetainingWall444(w,w.quayRows468.map(([[x,top,z]])=>({x,z,nx:-1,nz:0,bottom:-1.15,top})),.52,
            {face:'#777b71',trim:'#969485',cap:'#9c998b'});
        for(const [u,v,span] of [[102,83,29],[97,138,32],[100,161,27],[92,226,35]]){
            const a=R.world(u,v),q=R.world(u+span/2,v),p=R.world(126,v),pierLength=p.x-q.x;
            part(w,a.x,.46,a.z,(q.x-a.x)*2,2.18,10.5,'#566367','metal','rounded');
            part(w,a.x,1.63,a.z,(q.x-a.x)*1.85,.19,9.8,'#aa987f','wood','rounded');
            part(w,a.x-(q.x-a.x)*.55,2.91,a.z,8.7,2.48,8.2,'#c1b8a4','metal','rounded');
            if(pierLength>1){
                part(w,(q.x+p.x)/2,.585,p.z,pierLength,1.01,8.4,'#989487','concrete','rounded');
                mark(w,'cargoPier',(q.x+p.x)/2,p.z,pierLength,8.4,'#a7a294');
            }
        }
        for(const [u,v] of [[191,51],[240,61],[323,52]]){
            const p=R.world(u,v);
            part(w,p.x,base+4.1,p.z,22,8.2,24,'#aaa493','masonry','rounded');
            part(w,p.x,base+8.33,p.z,22.9,.32,24.9,'#7b8783','metal','rounded');
            solid(w,p.x,p.z,22,24);mark(w,'warehouse',p.x,p.z,22,24,'#a1a49b');
        }
        for(let i=0;i<5;i++)for(let j=0;j<8;j++){
            const p=R.world(139+i*11,106+j*12.5);
            if(!G.land(p.x,p.z)||G.isRouteRoad(p.x,p.z))continue;
            for(let level=0;level<1+(i+2*j)%3;level++)part(w,p.x,base+1.29+level*2.57,p.z,3.96,2.57,14.2,
                ['#9d725e','#697e81','#b0a17b','#7c836f'][(i+j+level)%4],'metal','rounded');
            mark(w,'container',p.x,p.z,4.1,14.2,'#8c826e');solid(w,p.x,p.z,4.15,14.32);
        }
        for(const v of [83,138,163,220]){
            const p=R.world(133,v);
            for(const side of [-1,1])part(w,p.x+side*3.8,base+7.02,p.z,.84,14.0,1.46,'#ac9e70','metal','rounded');
            part(w,p.x-4.3,base+14.24,p.z,22.3,.89,1.63,'#b5a67c','metal','rounded');
        }
        mark(w,'port',service.x,service.z,61,155,'#898579');
    }

    function golf(w){
        const r=rng(46110);
        const R=H.reference469;
        const holes=[[423,192,13,26],[466,201,19,28],[496,149,12,23],[448,121,14,25],
            [487,83,13,27],[503,66,8,18],[368,175,12,19]].map(([u,v,ru,rv])=>{
            const {x,z}=R.world(u,v),edge=R.world(u+ru,v+rv);
            return [x,z,edge.x-x,edge.z-z];
        });
        for(const [i,[x,z,rx,rz]] of holes.entries()){
            flatShape(w,x,z,rx,rz,i%2?'#879759':'#779050',.16);
            flatShape(w,x+7,z-rz*.55,rx*.62,rz*.27,'#96a767',.21);
            for(let k=0;k<2;k++){
                const px=x+(k?1:-1)*(rx*.62),pz=z-17-k*9;
                floor(w,px,pz,5.8,9.7,'#c2ad79','concrete',y(px,pz)+.11);
            }
            const fx=x+7,fz=z-rz*.58;
            add(w,fx,fz,.72,.052,1.40,.052,'#ecddc1','metal','cylinder');
            add(w,fx+.24,fz,1.29,.48,.27,.022,'#a15d40','fabric');
            mark(w,'fairway',x,z,rx*2,rz*2,'#789253');
        }
        for(let i=0;i<80;i++){
            const x=r.range(-545,-353),z=r.range(-745,-459);
            if(safe(w,x,z,4)&&!holes.some(([a,b,rx,rz])=>((x-a)/(rx+5))**2+((z-b)/(rz+5))**2<1.05))
                grove(w,x,z,r.range(4,6.5),.88);
        }
        const x=-490,z=-566;
        add(w,x,z,2.85,21,5.7,13,'#b7a886','masonry');
        add(w,x,z,5.82,22.4,.45,14.5,'#6e754f','metal','rounded');
        solid(w,x,z,21,13);
    }
    const surveyed=points=>points.map(([u,v])=>H.reference469.world(u,v));
    function surveyArea(w,id,sections,top,material,color){
        const rows=sections.map(([v,left,right])=>surveyed([[left,v],[right,v]]).map(({x,z})=>[x,top,z]));
        H.addRibbon444(w,rows,{color,material,visibility:2400,layer:3});
        const polygon=rows.map(([a])=>[a[0],a[2]]).concat(rows.slice().reverse().map(([,b])=>[b[0],b[2]]));
        const left=Math.min(...polygon.map(p=>p[0])),right=Math.max(...polygon.map(p=>p[0]));
        const north=rows[0][0][2],south=rows.at(-1)[0][2];
        w.mapFeatures461.push({id,polygon,color,x:(left+right)/2,z:(north+south)/2,width:right-left,depth:south-north});
    }
    function surveyPath(w,points,width,top,color,material){
        const control=surveyed(points),path=[control[0]];
        for(let i=1;i<control.length;i++){
            const a=control[i-1],b=control[i],count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/6);
            for(let j=1;j<=count;j++)path.push({x:a.x+(b.x-a.x)*j/count,z:a.z+(b.z-a.z)*j/count});
        }
        const rows=path.map(({x,z},i)=>{
            const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
            const d=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.z-a.z)*width/(2*d),dz=(a.x-b.x)*width/(2*d);
            return [[x-dx,top?.(x-dx,z-dz)??(y(x-dx,z-dz)+.18),z-dz],
                [x+dx,top?.(x+dx,z+dz)??(y(x+dx,z+dz)+.18),z+dz]];
        });
        H.addRibbon444(w,rows,{color,material,visibility:1830,layer:3});
        return path.map(({x,z})=>[x,z]);
    }
    function prison(w){
        const R=H.reference469,base=2.63;
        const grounds=[[49,595,644],[58,574,656],[75,557,682],[98,554,710],[112,554,760],
            [125,554,776],[200,554,776],[220,579,759]];
        surveyArea(w,'prison',grounds,base,'sealed_concrete472','#a6a598');
        const approach=[[675,196],[675,207],[675,215],[676,222],[681,230]];
        const roadTop=(x,z)=>Math.max(base+.086,y(x,z)+.108);
        surveyPath(w,approach,8.85,roadTop,'#596064','asphalt');
        for(const side of [-1,1]){
            const offset=side*2.03;
            surveyPath(w,approach.map(([u,v])=>[u+offset,v]),.104,(x,z)=>roadTop(x,z)+.025,'#c3c5b5','paint');
        }
        const wall=[[[591,54],[645,54],[674,77],[687,98],[713,113],[763,114],[774,130],[774,197],[757,215],[682,215]],
            [[667,215],[584,215],[556,192],[556,84],[574,65],[591,54]]];
        for(const sequence of wall){
            surveyPath(w,sequence,9.4,()=>base+.032,'#6e7069','asphalt');
            const chain=surveyed(sequence);
            for(let i=1;i<chain.length;i++){
                const a=chain[i-1],b=chain[i],dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);
                const x=(a.x+b.x)/2,z=(a.z+b.z)/2,angle=Math.atan2(dx,dz);
                part(w,x,base+2.55,z,.75,5.1,dist+.16,'#92928a','sealed_concrete472','cube',angle,1920);
                part(w,x,base+5.16,z,.91,.20,dist+.16,'#a3aaa0','anodized471','cube',angle,1550);
                for(const t of [.22,.53,.83]){
                    const px=a.x+dx*t,pz=a.z+dz*t;
                    part(w,px,base+2.55,pz,.96,5.14,.42,'#9b9d8d','concrete','cube',angle,1360);
                }
                const count=Math.ceil(dist/2.5);
                for(let j=0;j<count;j++){
                    const t=(j+.5)/count;
                    solid(w,a.x+dx*t,a.z+dz*t,.70+Math.abs(dx)/count,.70+Math.abs(dz)/count);
                }
            }
        }
        const footprint=(id,u,v,U,V,height,wallColor,roofColor)=>{
            const a=R.world(u,v),b=R.world(U,V),x=(a.x+b.x)/2,z=(a.z+b.z)/2,width=b.x-a.x,depth=b.z-a.z;
            part(w,x,base+height/2,z,width,height,depth,wallColor,id==='administration'?'travertine471':'brickwork');
            part(w,x,base+.49,z,width+.18,.98,depth+.18,'#737b75','concrete','rounded');
            part(w,x,base+height+.13,z,width+.38,.26,depth+.38,roofColor,'anodized471','rounded');
            for(const side of [-1,1]){
                const face=z+side*(depth/2+.05);
                if(id==='wing'){
                    const count=Math.ceil(width/4.55),increment=width/count;
                    for(let j=1;j<count;j++){
                        const xx=x+increment*j-width/2;
                        part(w,xx,base+height*.55,face,.27,height*.87,.34,'#a18b79','brickwork');
                        for(const level of [.39,.68]){
                            part(w,xx+increment*.36,base+height*level,face,.94,1.55,.16,'#768079','anodized471');
                            part(w,xx+increment*.36,base+height*level,face+side*.09,.72,1.29,.09,'#668492','building_window');
                        }
                    }
                }else{
                    part(w,x,base+height*.44,face,width*.80,1.13,.12,'#536970','building_window');
                    part(w,x,base+height*.44-.68,face+side*.08,width*.85,.18,.30,'#7a8176','metal');
                }
            }
            solid(w,x,z,width,depth);mark(w,id,x,z,width,depth,roofColor);
            return {x,z,width,depth,height};
        };
        const tone=['#9d8b7c','#6b746e'];
        const wings=[footprint('wing',572,94,593,151,11.6,...tone),footprint('wing',636,83,657,144,13.2,'#ab9b88','#758079'),
            footprint('wing',578,169,627,192,8.9,'#8b8075','#697773')];
        footprint('wing',595,72,636,88,10.3,'#baa18a','#6c736d');
        footprint('wing',606,141,659,155,9.0,...tone);
        footprint('services',681,122,700,150,8.1,'#a49986','#838c81');
        footprint('administration',712,120,750,148,10.6,'#b2aa96','#717f76');
        footprint('services',692,187,723,202,7.0,'#aa9d89','#697c78');
        footprint('maintenance',577,196,627,208,7.2,'#a89a82','#708077');
        for(const {x,z,width,depth,height} of wings){
            for(const side of [-1,1])for(let bay=0;bay<12;bay++){
                const along=z+depth*((bay+.5)/12-.5);
                part(w,x+side*(width/2+.043),base+5.57,along,.09,1.09,2.35,'#48616a','building_window');
                part(w,x+side*width*.29,base+height+.26,along,width*.33,.135,depth*.048,'#a1a69a','anodized471');
            }
        }
        surveyArea(w,'prisonCourt',[[85,597,622],[102,597,622],[119,598,621],[136,597,622]],base+.025,'sealed_concrete472','#b1ada0');
        surveyPath(w,[[609,84],[609,99],[609,123],[609,136]],1.83,()=>base+.053,'#918976','paving');
        surveyArea(w,'recreation',[[163,713,765],[204,713,765]],base+.029,'sealed_concrete472','#98998f');
        surveyPath(w,[[675,216],[675,198],[675,180],[680,168],[695,161],[708,158]],4.15,()=>base+.075,'#b2ac98','sealed_concrete472');
        const court=R.world(736,182);
        floor(w,court.x,court.z,43.2,23.0,'#775e52','asphalt',base+.063);
        floor(w,court.x,court.z,.092,18.0,'#ddd1ae','paint',base+.091);
        for(const side of [-1,1]){
            floor(w,court.x,court.z+side*9.4,39,.105,'#ddd1ae','paint',base+.091);
            floor(w,court.x+side*19.5,court.z,.105,18.8,'#ddd1ae','paint',base+.091);
            floor(w,court.x+side*14.7,court.z,8.9,.11,'#ddd1ae','paint',base+.091);
            part(w,court.x+side*21,base+1.64,court.z,.16,3.28,.16,'#727c75','metal');
            part(w,court.x+side*20.86,base+3.42,court.z,.14,1.04,1.72,'#a7a79b','concrete','rounded');
        }
        const gate=R.world(675,215);
        for(const [side,width,depth] of [[-1,1.38,3.2],[1,2.6,4.6]]){
            const x=gate.x+side*9.6;
            part(w,x,base+2.77,gate.z,width,5.54,depth,'#949287','sealed_concrete472');
            part(w,x,base+4.50,gate.z+depth/2+.025,width*.76,1.05,.11,'#4c6267','anodized471');
            solid(w,x,gate.z,width,depth);
        }
        part(w,gate.x,base+5.83,gate.z,23.9,.58,6.6,'#66787c','anodized471','rounded');
        part(w,gate.x,base+5.48,gate.z+3.05,14.7,.13,.22,'#ece1b9','light_emissive');
        const fence=surveyed([[711,160],[763,160],[763,203],[713,203],[711,160]]);
        for(let i=1;i<fence.length;i++){
            const a=fence[i-1],b=fence[i],dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
            const x=(a.x+b.x)/2,z=(a.z+b.z)/2,count=Math.ceil(dist/3.8);
            for(let j=0;j<=count;j++)part(w,a.x+dx*j/count,base+1.31,a.z+dz*j/count,.093,2.62,.093,'#626e63','anodized471','rounded',0,660);
            for(const h of [.20,1.35,2.55])part(w,x,base+h,z,.052,.045,dist,'#757e71','metal','cube',angle,665);
        }
        w.correctional471={gate};
        H.buildPrison471(w,w.correctional471,base);
        const r=rng(471140);
        for(const [u,v] of [[599,100],[617,99],[612,126],[601,165],[640,164],[684,106],[689,164],[741,157],[754,200]]){
            const p=R.world(u,v);
            if(w.correctional471.wings.some(({bounds:b})=>p.x>b.xmin-2&&p.x<b.xmax+2&&p.z>b.zmin-2&&p.z<b.zmax+2))continue;
            if(!safe(w,p.x,p.z,2))continue;
            part(w,p.x,base+.125,p.z,4.55,.25,4.55,'#a3a096','sealed_concrete472','rounded');
            part(w,p.x,base+.261,p.z,3.85,.066,3.85,'#766c55','masonry','rounded');
            grove(w,p.x,p.z,r.range(5.1,8.3),.94);
        }
    }
    function stadium(w){
        const {x,z}=H.reference469.world(1063,289),base=y(x,z)+.43,rx=51,rz=77,yaw=.26;
        const c=Math.cos(yaw),s=Math.sin(yaw);
        const local=(u,v)=>[x+c*u-s*v,z+s*u+c*v];
        const at=(u,height,v)=>{const [px,pz]=local(u,v);return [px,base+height,pz];};
        const box=(u,v,height,width,h,depth,color,material,shape='rounded')=>{
            const [px,py,pz]=at(u,height,v);return part(w,px,py,pz,width,h,depth,color,material,shape,yaw,1700);
        };
        const oval=(t,a,b)=>{
            const signedPower=v=>Math.sign(v)*Math.abs(v)**.76;
            return [signedPower(Math.cos(t))*a,signedPower(Math.sin(t))*b];
        };
        box(0,0,-.16,121,.28,179,'#a6a196','paving');
        box(0,0,.058,48,.09,72,'#526f43','lawn443','cube');
        for(let i=0;i<8;i++)box(0,-31.5+i*9,.114,47.8,.019,8.96,i%2?'#63834b':'#537745','lawn443','cube');
        for(const side of [-1,1]){
            box(side*22,0,.138,.14,.012,67,'#e7e7ce','paint','cube');
            box(0,side*33.5,.138,44,.012,.14,'#e7e7ce','paint','cube');
            box(0,side*25.2,.138,19.2,.012,.13,'#e7e7ce','paint','cube');
            for(const post of [-1,1])box(post*9.6,side*29.35,.138,.13,.012,8.3,'#e7e7ce','paint','cube');
        }
        box(0,0,.138,44,.012,.14,'#e7e7ce','paint','cube');
        const ring=(a,b,ha,hb,color,material,steps=48)=>{
            const rows=Array.from({length:steps+1},(_,i)=>{
                const t=i/steps*TAU,[u,v]=oval(t,rx+a,rz+a),[q,p]=oval(t,rx+b,rz+b);
                return [at(u,ha,v),at(q,hb,p)];
            });
            H.addRibbon444(w,rows,{color,material,visibility:1900,layer:4});
        };
        ring(0,0,10.9,-.28,'#a7a398','concrete');
        ring(.09,.09,9.8,3.22,'#476872','vehicle_glass444');
        for(const [height,color] of [[.54,'#858479'],[3.24,'#b7b3a0'],[9.65,'#c4c2b4']])
            ring(.20,.20,height+.27,height-.21,color,'masonry');
        ring(-18.4,-1,1.05,10.2,'#7d837e','concrete');
        for(let i=0;i<6;i++)ring(-17+i*2.57,-16.05+i*2.57,1.74+i*1.29,1.74+i*1.29,
            ['#394e56','#526a6c','#567172'][i%3],'concrete');
        // Open centre, weather-proof spectator canopy and two supported fascia edges.
        ring(-10.8,2.5,12.27,13.95,'#d9d6c8','metal');
        ring(2.5,3.20,13.95,13.46,'#e8e1ce','metal');
        ring(3.20,3.20,13.46,12.27,'#a6a59a','metal');
        ring(-10.8,-10.8,12.27,11.91,'#aaad9e','metal');
        for(let i=0;i<36;i++){
            const angle=i*TAU/36,[u,v]=oval(angle,rx+.41,rz+.41),[p,q]=local(u,v);
            part(w,p,base+6.14,q,.64,12.65,.80,'#c2c0ad','concrete','rounded',yaw-angle,1450);
            const [a,b]=oval(angle+.5*TAU/36,rx-.22,rz-.22),[sx,sz]=local(a,b);
            solid(w,sx,sz,Math.max(2,Math.abs(Math.sin(angle+yaw))*10.7),Math.max(2,Math.abs(Math.cos(angle+yaw))*11.7));
            if(i%6===0)part(w,p,base+11.22,q,2.46,.24,.56,'#e4dcc2','light_emissive','rounded',yaw-angle,620);
        }
        const [px,pz]=local(48,13.5);
        part(w,px,base+3.65,pz,7.3,.33,13.6,'#c5c1aa','metal','rounded',yaw,1380);
        w.mapFeatures461.push({id:'stadium',x,z,width:(rx+3.2)*2,depth:(rz+3.2)*2,color:'#c7c9bb',yaw});
    }
    function parking(w){
        const R=H.reference469,near=R.world(1002,343),far=R.world(1078,479);
        const x=(near.x+far.x)/2,z=(near.z+far.z)/2,width=far.x-near.x,depth=far.z-near.z,base=y(x,z)+.075;
        floor(w,x,z,width,depth,'#585a57','asphalt',base);
        for(const dx of [-.32,0,.32]){
            floor(w,x+dx*width,z,2.05,depth*.91,'#a2a18a','concrete',base+.045);
            for(let row=0;row<25;row++){
                const zz=near.z+8+(depth-16)*row/24;
                for(const side of [-1,1])floor(w,x+dx*width+side*4.62,zz,6.4,.105,'#cfc8af','paint',base+.023);
                if(row%7===1)palm(w,x+dx*width,zz,4.9+row*.04);
            }
        }
        for(const side of [-1,1])for(let i=0;i<5;i++)
            add(w,x+side*width*.44,near.z+depth*(i+.5)/5,3.45,.15,6.90,.15,'#68716a','metal','cylinder');
        mark(w,'parking',x,z,width,depth,'#77746a');
        w.parked461.push(...[[-23,-41],[-23,-25],[-23,15],[23,-48],[23,-19],[23,35],[23,50]]
            .map(([dx,dz],i)=>({x:x+dx,z:z+dz,paint:i%7,yaw:dx<0?Math.PI*.5:-Math.PI*.5})));
    }
    function hospital(w){
        const {x,z}=H.reference469.world(1032,558),base=y(x,z)+.16;
        floor(w,x,z+4,100,78,'#a59c8b','concrete',base);
        const buildings=[[x-10,z+14,51,34,25],[x+23,z-5,17,49,15],[x-13,z-19,44,15,7]];
        for(const [index,[cx,cz,ww,dd,h]] of buildings.entries()){
            const color=['#c9c8bc','#aeb6ae','#d1c9b8'][index];
            part(w,cx,base+h*.5,cz,ww,h,dd,color,'masonry','rounded');
            part(w,cx,base+h+.21,cz,ww+.82,.43,dd+.82,'#b5b4a6','concrete','rounded');
            for(let level=1;level<h/3;level++)for(const side of [-1,1]){
                const yy=base+level*3.12;
                part(w,cx,yy,cz+side*(dd*.5+.08),ww*.90,1.41,.14,'#5e8290','building_window');
                part(w,cx+side*(ww*.50+.07),yy,cz,.14,1.41,dd*.84,'#597b89','building_window');
                part(w,cx,yy-.82,cz+side*(dd*.5+.10),ww*.92,.107,.29,'#aea99a','metal');
            }
            for(const side of [-1,1])part(w,cx+ww*.39*side,base+h*.50,cz-dd*.501,.37,h*.983,.30,'#aaa99b','concrete','rounded');
            solid(w,cx,cz,ww,dd);
            mark(w,'hospital',cx,cz,ww,dd,'#b9beb4');
        }
        const receptionX=x-13,front=z-26.6;
        part(w,receptionX,base+2.25,front-.09,18,3.26,.16,'#7d9391','vehicle_glass444');
        part(w,receptionX,base+3.95,front-1.52,20.1,.35,3.47,'#b8b6a4','metal','rounded');
        for(const s of [-1,1])part(w,receptionX+s*8.7,base+1.91,front-2.86,.30,3.82,.30,'#b7b09e','concrete','rounded');
        const tx=x-10,tz=z+14;
        part(w,tx,base+25.48,tz,14.6,.35,14.6,'#626864','asphalt','rounded');
        part(w,tx,base+25.67,tz,5.6,.038,.70,'#e6d9b7','paint');
        for(const side of [-1,1])part(w,tx+side*2.45,base+25.67,tz,.60,.039,6.10,'#e6d9b7','paint');
        for(const sy of [-1,1])part(w,x-13,base+5.38,z-27.05,sy>0?5.9:1.27,sy>0?1.25:5.1,.12,'#a84542','paint');
    }
    function airport(w){
        const R=H.reference469,{west,east,north,south,z:runwayZ,elevation:base}=R.runway;
        const width=east-west,depth=south-north;
        surveyArea(w,'airfield',[[555,818,925],[560,806,941],[571,751,952],[594,607,956],
            [603,483,956],[614,467,951],[646,462,943],[669,462,938],[678,476,914]],base+.055,'concrete','#757b7d');
        surveyArea(w,'westApron',[[604,472,605],[614,461,625],[666,464,623],[676,478,613]],base+.080,'concrete','#93948a');
        surveyArea(w,'eastApron',[[560,837,930],[580,833,942],[618,813,944],[664,816,929],[673,823,920]],base+.079,'asphalt','#575e63');
        const taxiways=[
            [[480,664],[481,670],[500,673],[791,673],[823,672],[837,667],[848,657],[848,612],[844,598],[837,589],[836,569]],
            [[553,670],[562,662],[569,654],[569,644],[559,639],[526,638],[506,642]],
            [[651,665],[651,644],[668,641],[723,641],[735,635],[741,621]],
            [[873,658],[867,653],[867,633],[881,623],[904,622],[917,610],[917,589]]
        ];
        for(const points of taxiways)surveyPath(w,points,.30,()=>base+.106,'#c0a867','paint');
        for(const [u,U] of [[569,591],[655,673],[784,806],[844,864]]){
            const a=R.world(u,668),b=R.world(U,698);
            floor(w,(a.x+b.x)/2,(a.z+b.z)/2,b.x-a.x,b.z-a.z,'#777b76','asphalt',base+.104);
            surveyPath(w,[[(u+U)/2,668],[(u+U)/2,692]],.26,()=>base+.128,'#c1a471','paint');
        }
        floor(w,(west+east)/2,runwayZ,width+45,depth+6.6,'#7b7e78','concrete',base+.103);
        floor(w,(west+east)/2,runwayZ,width,depth,'#474f55','asphalt',base+.123);
        for(let x=west+27;x<east-22;x+=26)floor(w,x,runwayZ,13,.37,'#e4dfce','paint',base+.155);
        for(const side of [-1,1]){
            const tip=side<0?west:east;
            floor(w,(west+east)/2,runwayZ+side*(depth/2-1.22),width-3,.24,'#cbd0c6','paint',base+.153);
            for(let stripe=0;stripe<8;stripe++)
                floor(w,tip-side*7.4,runwayZ+(stripe-3.5)*1.60,11.4,.78,'#dddccd','paint',base+.156);
            for(let x=west+8;x<east;x+=23)
                part(w,x,base+.192,runwayZ+side*(depth/2+.36),.22,.14,.22,'#dbe3e3','light_emissive');
        }
        mark(w,'runway',(west+east)/2,runwayZ,width,depth,'#50565b');

        const hangar=(u,v,U,V,height,style)=>{
            const a=R.world(u,v),b=R.world(U,V),x=(a.x+b.x)/2,z=(a.z+b.z)/2,ww=b.x-a.x,dd=b.z-a.z;
            part(w,x,base+height/2,z,ww,height,dd,'#a7b2ae','masonry');
            const arch=Array.from({length:13},(_,i)=>{
                const t=i/12,xx=x+(t-.5)*(ww+1.3),level=base+height+Math.sin(t*Math.PI)*(style?3.7:1.35);
                return [[xx,level,z+dd/2+.60],[xx,level,z-dd/2-.65]];
            });
            H.addRibbon444(w,arch,{color:style?'#c1c8c5':'#a4aeae',material:'metal',visibility:2030,layer:4});
            part(w,x,base+height*.44,z+dd/2+.052,ww*.88,height*.78,.16,'#536972','metal','rounded');
            for(let i=-3;i<=3;i++)part(w,x+i*ww*.119,base+height*.44,z+dd/2+.147,.12,height*.77,.058,'#819694','metal');
            solid(w,x,z,ww,dd);mark(w,'hangar',x,z,ww,dd,'#a1aba6');
        };
        for(const spec of [[485,610,510,632,8.9,1],[516,609,544,631,9.7,1],[549,610,568,624,7.0,0],
            [576,608,588,626,6.4,0],[677,568,704,583,6.4,0],[679,584,707,594,6.9,0],
            [748,603,777,630,11.2,1],[860,561,886,579,8.8,1],[931,623,944,638,6.4,0]])
            hangar(...spec);
        const a=R.world(631,616),b=R.world(741,641),x=(a.x+b.x)/2,z=(a.z+b.z)/2,ww=b.x-a.x,dd=b.z-a.z;
        const terminal=(dx,height,dz,wid,ht,dep,color,material,shape='cube')=>
            part(w,x+dx,base+height,z+dz,wid,ht,dep,color,material,shape,0,2360);
        terminal(0,.58,0,ww,.92,dd,'#a19b89','travertine471','rounded');
        terminal(0,7.73,0,ww-.18,13.55,dd-.13,'#76949b','tower_glass469','rounded');
        terminal(0,2.1,0,ww*.89,.49,dd*.92,'#767b73','concrete');
        terminal(0,5.8,0,ww*.90,.33,dd*.91,'#af9b79','bronze471');
        terminal(0,13.18,0,ww+.57,.63,dd+.54,'#8a9597','anodized471','rounded');
        const top=t=>15.0+3.5*Math.cos(t*Math.PI)+1.95*t**6;
        const span=Array.from({length:31},(_,i)=>{
            const t=i/15-1,px=x+t*(ww/2+6.3),level=base+top(t),depth=dd/2+6.3+Math.cos(t*Math.PI/2)*6.1;
            return {px,level,depth};
        });
        for(const [v0,v1,material,color] of [[-.98,-.12,'anodized471','#b4c0c4'],[-.12,.12,'tower_glass469','#759ea9'],[.12,.98,'anodized471','#b4c0c4']]){
            H.addRibbon444(w,span.map(({px,level,depth})=>[[px,level,z+depth*v1],[px,level,z+depth*v0]]),
                {color,material,visibility:2520,layer:4});
        }
        for(const side of [-1,1]){
            const edge=span.map(({px,level,depth})=>[[px,level-.44,z+side*depth*.979],[px,level+.055,z+side*depth*.979]]);
            H.addRibbon444(w,side>0?edge:edge.map(([p,q])=>[q,p]),
                {color:'#c9d0ce',material:'anodized471',visibility:2380,layer:4});
            const clerestory=span.filter(p=>Math.abs(p.px-x)<ww*.5).map(({px,level})=>{
                const front=z+side*(dd/2-.09),upper=Math.max(base+13.17,level-.27);
                return [[px,base+13.13,front],[px,upper,front]];
            });
            H.addRibbon444(w,side>0?clerestory:clerestory.map(([p,q])=>[q,p]),
                {color:'#648a96',material:'tower_glass469',visibility:2060,layer:4});
            for(let col=-7;col<=7;col++){
                const dx=col*ww/16,depth=side*(dd/2+1.7),level=top(2*dx/ww)-.22;
                terminal(dx,level/2,depth,.42,level,.52,'#849193','anodized471','rounded');
                terminal(dx,3.16,depth,.49,.12,.59,'#af9979','bronze471','rounded');
            }
        }
        const forecourt=z-dd/2-10.0;
        floor(w,x,forecourt,ww+12,14.4,'#8f8d80','paving',base+.126);
        for(const dx of [-75,-46,48,75]){
            const p=x+dx;
            part(w,p,base+.24,forecourt,4.6,.48,3.5,'#858579','travertine471','rounded');
            palm(w,p,forecourt,6.65);
        }
        solid(w,x,z,ww,dd);mark(w,'terminal',x,z,ww,dd,'#a6b8bd');
        const entry=R.world(703,610);
        const stands=[[663,662,Math.PI],[708,661,Math.PI],[784,645,-1.35],[898,617,-.16],[505,654,1.55]];
        w.parkedAirliners471=stands.map(([u,v,yaw])=>({...R.world(u,v),y:base+.075,yaw,gear:1,parked:true}));
        for(const [i,site] of w.parkedAirliners471.slice(0,2).entries()){
            const gx=site.x+(i===0?1.2:-1.2),door=z+dd/2,tip=site.z-12.2,length=tip-door;
            if(length<2.1)continue;
            const mid=(tip+door)/2;
            part(w,gx,base+4.9,mid,3.52,2.89,length,'#a1b3b7','anodized471','rounded');
            part(w,gx+1.77,base+5.10,mid,.14,1.39,length*.83,'#628592','building_window');
            part(w,gx,base+1.70,mid,.44,3.40,.66,'#7e8c8c','metal');
        }
        for(const p of w.parkedAirliners471)
            floor(w,p.x,p.z,23.4,.22,'#bda464','paint',base+.122);
        const tower=R.world(765,582);
        part(w,tower.x,base+13.4,tower.z,5.5,26.8,5.4,'#a2a69c','concrete','rounded');
        part(w,tower.x,base+28.3,tower.z,11.4,3.0,10.7,'#597b86','building_window','rounded');
        part(w,tower.x,base+30.02,tower.z,12.1,.44,11.5,'#8e9da1','metal','rounded');
        w.stage38Sites.push({name:'AIRPORT',x:entry.x,z:entry.z});
    }

    function home(w,x,z,scale,style,rough=false,yaw=0){
        const width=scale*(rough?11:13.5),d=scale*10.1,h=scale*(3.3+style%3*.92);
        const tint=rough?['#958d73','#b09a76','#8d8671']:['#c1b69b','#c6c1aa','#b4b59d'];
        const roof=rough?['#666e65','#907359','#777564']:['#a7795e','#8d8d77','#bab399'];
        const c=Math.cos(yaw),s=Math.sin(yaw);
        const at=(u,v)=>[x+c*u-s*v,z+s*u+c*v];
        const ground=[y(x,z),...[-1,1].flatMap(a=>[-1,1].map(b=>y(...at(a*width/2,b*d/2))))];
        const land=Math.max(...ground),foundation=Math.max(.10,land-Math.min(...ground)+.15);
        const put=(u,level,v,ww,hh,dd,color,material,shape)=>{
            const [px,pz]=at(u,v);return part(w,px,land+level,pz,ww,hh,dd,color,material,shape,yaw);
        };
        put(0,-foundation*.5+.12,0,width,foundation,d,'#9b927c','concrete','rounded');
        put(0,h/2+.06,0,width,h,d,tint[style%3],'masonry','rounded');
        const profile=style%3;
        put(0,h+.213,0,width+.99,.406,d+1.02,roof[profile],profile===2?'metal':'concrete','rounded');
        if(profile===0)put(2*scale,h+.51,-1.58*scale,width*.46,.62,d*.63,'#858974','metal','rounded');
        else{
            const rise=scale*(profile===1?1.28:1.75);
            put(0,h+.40+rise/2,0,width+1.11,rise,d+1.10,profile===1?'#a67455':'#65736f',profile===1?'brickwork':'metal','coast_hip_roof465');
        }
        for(const side of [-1,1]){
            put(side*width*.27,1.71*scale,-d*.505,width*.24,1.16*scale,.085,'#5a7580','building_window');
            put(side*width*.27,1.1*scale,-d*.516,width*.25,.13,.23,'#c4b89e','concrete');
        }
        put(0,1.19*scale,-d*.51,1.29*scale,2.25*scale,.11,rough?'#647063':'#736956','wood');
        solid(w,x,z,Math.abs(c)*width+Math.abs(s)*d,Math.abs(s)*width+Math.abs(c)*d);
        w.mapFeatures461.push({id:'house',x,z,width,depth:d,color:roof[style%3],yaw});
        return {front:at(0,-d*.60),land};
    }
    function islandHomes(w){
        const r=rng(461201);
        w.frontage462=[];
        const used=[],routes=/^keys|^northKeys$|^isletLink$|^toResort$/;
        for(const road of w.roads461.filter(v=>routes.test(v.id))){
            let previous=road.samples[0],distance=0;
            for(const p of road.samples.slice(1,-1)){
                distance+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;
                if(distance<22||p.water||p.junction)continue;
                distance=0;
                for(const side of [-1,1]){
                    const half=road.width/2,offset=half+r.range(17.5,22),nx=p.nx*side,nz=p.nz*side;
                    const x=p.x+nx*offset,z=p.z+nz*offset;
                    if((x>-515&&x<971)||(x>1009&&x<1085&&z>483&&z<539)||
                        !safe(w,x,z,10.3)||used.some(h=>Math.hypot(h.x-x,h.z-z)<22.7))continue;
                    const width=half+.45,ex=p.x+nx*width,ez=p.z+nz*width;
                    if(G.coast(ex,ez)<5||G.isRouteRoad(x-nx*6.8,z-nz*6.8))continue;
                    const scale=r.range(.84,1.12),rot=Math.atan2(-nx,nz);
                    const {front,land}=home(w,x,z,scale,used.length,false,rot);
                    const [fx,fz]=front;
                    const rows=Array.from({length:4},(_,i)=>{
                        const t=i/3,px=ex+(fx-ex)*t,pz=ez+(fz-ez)*t;
                        const floorY=i===0?p.y-.008:i===3?land+.052:y(px,pz)+.047;
                        return [[px-nz*1.22,floorY,pz+nx*1.22],[px+nz*1.22,floorY,pz-nx*1.22]];
                    });
                    H.addRibbon444(w,rows,{color:'#ada18a',material:'paving',visibility:710,layer:3});
                    w.frontage462.push({road:road.id,x,z,ex,ez});used.push({x,z});
                    const gardenX=x-nz*9.2+nx*2.5,gardenZ=z+nx*9.2+nz*2.5;
                    if(used.length%2===0&&safe(w,gardenX,gardenZ,2.1))palm(w,gardenX,gardenZ,r.range(5.1,7.4));
                    if(used.length%6===0&&safe(w,x+nx*10.2,z+nz*10.2,4.4)){
                        const px=x+nx*10.2,pz=z+nz*10.2;
                        floor(w,px,pz,7.9,5.7,'#afa78c','paving',y(px,pz)+.08);
                        floor(w,px,pz,6.9,4.6,'#518e94','glass',y(px,pz)+.11);
                        mark(w,'pool',px,pz,6.9,4.6,'#5b9eaa');
                    }
                }
            }
        }
        const x=1049,z=503,base=y(x,z);
        for(const [j,ww,h,dd] of [[0,31,9,16],[1,22,6.7,18]]){
            const xx=x+(j?17:-10),zz=z+j*14;
            part(w,xx,base+h*.5,zz,ww,h,dd,'#ccc0a1','masonry','rounded');
            part(w,xx,base+h+.26,zz,ww+.7,.52,dd+1,'#9c876d','metal','rounded');
            for(const side of [-1,1])for(let level=0;level<(j?2:3);level++){
                const facadeZ=zz+side*(dd*.5+.04),yy=base+1.52+level*2.7;
                for(let k=0;k<Math.floor(ww/4.4);k++){
                    const gx=xx+(k-(Math.floor(ww/4.4)-1)*.5)*3.82;
                    part(w,gx,yy,facadeZ,2.55,1.32,.076,'#648384','building_window');
                    if(level){
                        part(w,gx,yy-.85,facadeZ+side*.49,2.86,.13,.98,'#b2a186','concrete','rounded');
                        part(w,gx,yy-.36,facadeZ+side*.97,2.78,.91,.084,'#899287','shop_glazing');
                    }
                }
            }
            solid(w,xx,zz,ww,dd);
            mark(w,'resort',xx,zz,ww,dd,'#bdad91');
        }
    }
    function wetlands(w){
        const r=rng(461394);
        // The elevated timber structure and posts were intentionally removed.
        for(let i=0;i<300;i++){
            const x=r.range(204,628),z=r.range(-864,-500);
            if(!safe(w,x,z,2))continue;
            if(i%3===0)grove(w,x,z,r.range(3.8,6.8),1.10);
            else for(let j=0;j<3;j++)add(w,x+j*.44,z+j*.35,.49,.99,.81,1.46,'#536b47','foliage','urban_crown',i*.41);
        }
        // No wooden lookout/map marker: the sanctuary remains a natural marsh.
    }
    function beachfront(w){
        const r=rng(461532),rows=[],route=[];
        for(let z=-602;z<611;z+=11){
            let x=924;
            while(x>669&&!G.land(x,z))x-=2;
            if(x<670)continue;
            const px=x-25.5;
            if(!G.land(px-2.5,z)||G.isRouteRoad(px-2.5,z)||G.isRouteRoad(px+2.5,z)){
                if(rows.length>1)H.addRibbon444(w,rows.splice(0),{color:'#baad91',material:'paving',visibility:1470,layer:3});
                else rows.length=0;
                continue;
            }
            rows.push([[px-1.54,y(px-1.54,z)+.081,z],[px+1.54,y(px+1.54,z)+.081,z]]);
            route.push({x:px,z});
            if(route.length%4===0&&safe(w,px-4.8,z,2.2))palm(w,px-4.8,z,r.range(5.6,8.4));
            if(route.length%9===0&&safe(w,px+3.4,z,1.8)){
                add(w,px+3.4,z,.49,.55,.17,2.15,'#a28b69','wood','rounded');
                for(const s of [-1,1])add(w,px+3.4,z+s*.77,.25,.41,.42,.14,'#777869','metal');
            }
        }
        if(rows.length>1)H.addRibbon444(w,rows,{color:'#baad91',material:'paving',visibility:1470,layer:3});
        w.beachWalk461=route;
        const z=503,x=1092,base=y(x,z)+.12;
        floor(w,x,z,16.6,23.3,'#a49377','paving',base);
        floor(w,x+.3,z+.6,12.4,17.2,'#5e9897','glass',base+.048);
        mark(w,'pool',x+.3,z+.6,12.4,17.2,'#4c9ba9');
        for(const s of [-1,1])for(let i=0;i<3;i++){
            const zz=z-7+i*7;
            add(w,x+s*7.12,zz,.36,.69,.13,2.0,'#d0be97','wood','rounded');
            add(w,x+s*9,zz+1,.96,.066,1.92,.066,'#a18d6a','wood','cylinder');
            add(w,x+s*9,zz+1,1.95,1.85,.28,1.81,i%2?'#bb9c71':'#e2cf9b','fabric','rounded');
        }
        const pier=Array.from({length:11},(_,i)=>{
            const xx=1102+i*4.05,zz=517+i*.71;
            return [[xx,1.22,zz+1.7],[xx,1.22,zz-1.7]];
        });
        H.addRibbon444(w,pier,{color:'#a78d6b',material:'wood',visibility:1570,layer:3});
        for(const [i,[a,b]] of pier.entries())if(i%2===0)
            for(const p of [a,b])part(w,p[0],.43,p[2],.21,1.75,.21,'#81725b','wood','cylinder',0,935);
        for(const [dx,dz] of [[12,-27],[26,-10],[-3,21],[28,10]])if(safe(w,x+dx,z+dz,3))palm(w,x+dx,z+dz,7.8);
        for(const [px,pz] of [[970,463],[983,471],[1002,434],[1008,477],[1029,438],[1037,485],[1067,460],[1084,475],[1079,553]]){
            if(safe(w,px,pz,3.1))palm(w,px,pz,r.range(6.5,9));
        }
    }
    function roughIsland(w){
        const x=-1119,z=32,base=y(x,z)+.11;
        floor(w,x,z+24,74,52,'#747067','asphalt',base);
        for(const [i,[xx,zz]] of [[-1157,51],[-1148,-31],[-1108,-34],[-1077,63],[-1133,80]].entries()){
            if(!safe(w,xx,zz,7))continue;
            home(w,xx,zz,1.25,i,true);
            for(let j=0;j<3;j++)add(w,xx-5+j*2.1,zz+9,.42,1.2,.82,1.06,'#866f54','metal','rounded');
        }
        for(const [xx,zz] of [[-1138,63],[-1116,67],[-1090,53]]){
            part(w,xx,base+1.36,zz,2.67,2.68,10.4,'#766456','metal');
            part(w,xx,base+2.78,zz,2.76,.18,10.57,'#887668','metal');
            if(zz>60)solid(w,xx,zz,2.68,10.5);
        }
        for(const [xx,zz] of [[-1164,38],[-1102,92],[-1075,-22],[-1159,-49]])palm(w,xx,zz,5.5);
        w.gang461={x:-1122,z:31,patrols:[
            [[-1112,30],[-1097,43],[-1093,58],[-1117,44]],
            [[-1143,12],[-1149,32],[-1139,42],[-1127,26]],
            [[-1097,2],[-1087,15],[-1093,34],[-1107,19]],
            [[-1142,55],[-1127,50],[-1115,40],[-1137,30]]
        ]};
        w.parked461.push({x:-1117,z:60,paint:2,yaw:Math.PI*.5},{x:-1125,z:54,paint:4,yaw:Math.PI*.5,gang461:true});
        mark(w,'yard',x,z+24,74,52,'#7e7867');
    }
    function centralGarden(w,site){
        const park=w.parkCenters.find(p=>p.x===site.x&&p.z===site.z);
        if(!park)return;
        const {x,z}=park;
        if(site===H.cityPlan463.garden){
            for(let i=w.boxes.length-1;i>=0;i--){
                const o=w.boxes[i];
                if(o.material==='foliage'&&o.h<1.5&&o.x>x-38&&o.x<x-14&&Math.abs(o.z-z)<1.75)w.boxes.splice(i,1);
            }
        }
        const south=site===H.cityPlan463.southGarden;
        const soil=y(x,z);
        const pw=south?23.4:14.6,pd=south?10.0:7.2;
        part(w,x,soil+.13,z,pw,.26,pd,'#a59f8b','concrete','rounded');
        part(w,x,soil+.276,z,pw-1.2,.032,pd-1.1,'#54848b','glass','rounded');
        mark(w,'parkPool',x,z,pw,pd,'#568a92');
        for(const side of [-1,1])for(const edge of [-1,1]){
            const gx=x+side*21,gz=z+edge*11;
            if(safe(w,gx,gz,3.1))grove(w,gx,gz,6.7,.95);
            add(w,x+side*26,z+edge*3,.55,.49,.16,2.1,'#9e855e','wood','rounded');
            for(const leg of [-1,1])add(w,x+side*26,z+edge*3+leg*.72,.27,.41,.42,.13,'#626b5e','metal');
        }
    }
    function parkEdges470(w){
        const R=H.reference469;
        const gardens=[
            {paths:[[[677,350],[695,350],[702,357]],[[678,374],[687,365],[695,350]],
                [[678,351],[687,365],[702,374]],[[687,365],[700,365]]],groves:[[681,355],[690,376],[695,357],[698,371]]},
            {paths:[[[717,350],[731,358],[744,347],[755,355]],[[718,373],[728,365],[741,376],[755,365]],
                [[731,348],[731,358],[728,365],[724,378]],[[744,347],[744,365],[741,376]],
                [[716,362],[731,358],[744,365],[755,365]]],groves:[[721,351],[725,371],[737,354],[741,368],[751,350],[751,374]]},
            {paths:[[[771,353],[781,351],[790,360],[805,353]],[[770,371],[783,367],[790,360],[806,371]],
                [[780,346],[781,351],[783,367],[784,378]],[[799,345],[797,359],[799,378]],
                [[773,376],[784,378],[799,378],[807,373]]],groves:[[776,353],[777,369],[791,349],[794,372],[804,360],[804,376]]},
            {paths:[[[823,355],[835,350],[847,355]],[[823,373],[835,378],[847,373]],
                [[828,345],[826,354],[826,371],[830,379]],[[842,346],[844,354],[844,371],[841,379]],
                [[823,364],[832,364],[840,364],[846,364]]],groves:[[827,350],[835,357],[839,348],[833,371],[844,353],[844,377]]}
        ];
        for(const [index,parcel] of gardens.entries()){
            for(const path of parcel.paths)
                w.walkways462.push(surveyPath(w,path,2.65+index*.15,undefined,'#aeaa91','paving'));
            for(const [u,v] of parcel.groves){
                const {x,z}=R.world(u,v);
                if(safe(w,x,z,2.25))grove(w,x,z,5.4+(u+v)%5*.46,.87);
            }
        }
        for(const [[u,v],ww,dd] of [[[687,365],12.1,11.9],[[791,360],13.5,9.5],[[834,364],10.5,11.6]]){
            const {x,z}=R.world(u,v);
            const soil=y(x,z),base=soil+.19;
            part(w,x,base-.12,z,ww,.25,dd,'#a29883','paving','rounded');
            for(const side of [-1,1]){
                const px=x+side*(ww*.48+1.5);
                add(w,px,z,.58,.49,.14,1.69,'#938164','wood','rounded',0,400);
                for(const s of [-1,1])add(w,px,z+s*.54,.28,.32,.48,.12,'#586663','metal','cube',0,400);
            }
        }
    }
    function landscapeEdges(w){
        const r=rng(461281);
        const groves=[[-378,-478,25,30],[-260,-480,24,43],[-475,-417,19,47],[-180,-390,26,17],
            [-72,-397,29,15],[174,-396,18,13],[524,-392,46,18],[632,-501,30,47],[569,-584,47,55],
            [307,-774,40,47],[384,-687,31,28],[548,-783,59,34]];
        for(const [cx,cz,rx,rz] of groves){
            const trees=[];
            for(let i=0;i<25;i++){
                const a=r.range(0,TAU),distance=Math.sqrt(r.next()),x=cx+Math.sin(a)*rx*distance,z=cz+Math.cos(a)*rz*distance;
                if(!safe(w,x,z,4.2)||trees.some(p=>Math.hypot(p.x-x,p.z-z)<5.4))continue;
                trees.push({x,z});
                if(i%5===2&&x>550)palm(w,x,z,r.range(6.1,8.6));
                else grove(w,x,z,r.range(4.8,7.0),.94);
            }
        }
        const planters=[[35,-363],[136,-323],[285,-342],[-270,-342],[-160,-357],[391,-369],
            [508,116],[518,277],[637,96],[653,-255]];
        for(const [x,z] of planters){
            if(!safe(w,x,z,4.8))continue;
            const soil=y(x,z);
            part(w,x,soil+.19,z,3.7,.38,5.7,'#a39a80','concrete','rounded',0,530);
            part(w,x,soil+.405,z,3.42,.055,5.4,'#73634e','masonry','rounded',0,420);
            for(let i=0;i<6;i++){
                const px=x+(i%2-.5)*1.47,pz=z+(Math.floor(i/2)-1)*1.53;
                part(w,px,soil+.73,pz,1.36,.77,1.42,['#648050','#536d4a','#718250'][i%3],'foliage','urban_crown',i*1.23,495);
            }
        }
    }
    H.buildLandmarks461=w=>{
        w.mapFeatures461=[];w.parked461=[];w.walkways462=[];
        port(w);golf(w);prison(w);stadium(w);parking(w);hospital(w);airport(w);
        islandHomes(w);wetlands(w);H.buildCrocHabitat477?.(w);beachfront(w);roughIsland(w);
        centralGarden(w,H.cityPlan463.garden);centralGarden(w,H.cityPlan463.southGarden);parkEdges470(w);landscapeEdges(w);
        w.stage38Sites.push({name:'CARGO PORT',x:-980,z:-723});
        w.stage38Wheel=null;
        const r=rng(461608);
        for(let i=0;i<540;i++){
            const x=r.range(-1125,1140),z=r.range(-810,805);
            if(G.keepLegacy(x,z)||!safe(w,x,z,4)||G.flattenAir(x,z)||
                w.mapFeatures461.some(o=>Math.abs(o.x-x)<o.width*.54+4&&Math.abs(o.z-z)<o.depth*.54+4))continue;
            if(x>654||x<-540)palm(w,x,z,r.range(4.2,8.7));
            else grove(w,x,z,r.range(4.2,7.0),1.03);
        }
        for(const o of w.boxes){
            if(o.layer<3||G.keepLegacy(o.x,o.z)||o.sea461)continue;
            if(o.w>5||o.d>5||o.h>3.2)o.visibilityCap=Math.max(o.visibilityCap||0,2530);
        }
    };
})(Heatline);
