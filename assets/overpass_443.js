var Heatline = globalThis.Heatline || {};
(function(H){
    const deck={x:216,z0:-540,z1:-324,halfWidth:12.75,height:7.65,ramp:76};
    function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
    H.deckRise443=z=>deck.height*smooth(Math.min(z-deck.z0,deck.z1-z)/deck.ramp);
    H.deckGround443=(actor,x=actor.x,z=actor.z)=>H.outdoorHeight(x,z)+
        (actor.deck443?H.deckRise443(z):H.onRidgeRoad443(x,z) ? .19 : 0);
    H.deckLayer443=(world,actor,oldX,oldZ)=>{
        if(!world.overpass443)return;
        const r=H.deckRise443(actor.z);
        if(actor.deck443){
            if(r<.065||Math.abs(actor.x-deck.x)>deck.halfWidth+1.1)actor.deck443=false;
            return;
        }
        if(r<=.035||r>.68||Math.abs(actor.x-deck.x)>deck.halfWidth-.85)return;
        const dz=Math.abs(actor.z-oldZ),dx=Math.abs(actor.x-oldX);
        if(dz>dx*.83&&dz>.0001&&H.deckRise443(oldZ)<=r+.017)actor.deck443=true;
    };
    const upper=actor=>actor.deck443?H.deckRise443(actor.z):0;
    H.sameRoadLevel443=(a,b)=>Math.abs(upper(a)-upper(b))<2.25;
    H.drivingSolids443=(world,actor)=>upper(actor)>.63&&world.overpass443?
        world.overpass443.rails.filter(rail=>Math.abs(rail.z-actor.z)<8):world.nearby(actor.x,actor.z);

    H.buildGradeCrossing443=function(world){
        if(!world.express442)return;
        const {z0,z1,x,halfWidth}=deck;
        const rails=[];
        const ground=(px,pz)=>H.outdoorHeight(px,pz)+H.deckRise443(pz);
        const strip=(px,pz,w,d,y,h,color,material)=>{
            const patch=H.box(px,y,pz,w,h,d,color,0,h>.5?4:3);
            patch.material=material;patch.visibilityCap=710;
            H.fitGround441(patch,ground,part=>world.add(part),4);
        };
        const z=(z0+z1)/2, length=z1-z0;
        strip(x,z,halfWidth*2,length,-.395,.79,'#a29e91','concrete');
        strip(x,z,halfWidth*2,length,.125,.065,'#666666','asphalt');
        // Taper the beams into the abutments, using the same graded top profile.
        for(const edge of [-10.65,-5.35,0,5.35,10.65]){
            const gx=x+edge;
            const span=[];
            for(let zz=z0+11;zz<=z1-11;zz+=4){
                const y=ground(gx,zz),thickness=.31*smooth(Math.min(zz-z0,z1-zz)/33);
                span.push({x:gx,z:zz,nx:1,nz:0,top:y-.61,bottom:y-.61-thickness});
            }
            H.addRetainingWall444(world,span,.72,{face:'#565957',trim:'#77766b',cap:'#6d6b62'});
        }
        for(const offset of [-12.18,-.76,.76,12.18])
            strip(x+offset,z,.108,length,.176,.008,Math.abs(offset)<1?'#deb36a':'#eae5d9','paint');
        for(let pz=z0+7;pz<z1-5;pz+=12.5)for(const offset of [-8.55,-4.75,4.75,8.55])
            strip(x+offset,pz,.115,5,.177,.009,'#e9e4d8','paint');
        const box=(px,py,pz,w,h,d,color,material)=>{
            const b=H.box(px,py,pz,w,h,d,color,0,4);b.material=material;b.visibilityCap=720;world.add(b);return b;
        };
        for(const [start,end] of [[z0+13,z0+56],[z1-56,z1-13]])for(const side of [-1,1]){
            const samples=Array.from({length:19},(_,i)=>{
                const zz=start+(end-start)*i/18, xx=x+side*12.09;
                const y=H.outdoorHeight(xx,zz);
                return {x:xx,z:zz,nx:1,nz:0,bottom:y-.25,top:Math.max(y+.05,ground(xx,zz)-.46)};
            });
            H.addRetainingWall444(world,samples,1.31,{face:'#8e877b',trim:'#aaa297',cap:'#b0a495'});
        }
        for(const offset of [-12.55,0,12.55]){
            const samples=Array.from({length:73},(_,i)=>{
                const zz=z0+(z1-z0)*i/72,xx=x+offset,y=ground(xx,zz);
                const flare=smooth(Math.min(zz-z0,z1-zz)/10);
                return {x:xx,z:zz,nx:1,nz:0,bottom:y+.06,top:y+.19+(offset===0?.59:.91)*flare};
            });
            H.addRetainingWall444(world,samples,offset===0?.64:.39,
                {face:'#9f998d',trim:'#b0aa9c',cap:'#b5af9f'});
        }
        for(let pz=z0+6;pz<z1-2;pz+=8){
            for(const offset of [-12.55,0,12.55]){
                const width=offset===0?.64:.39;
                rails.push({x:x+offset,z:pz,hw:width*.5,hd:4.01});
            }
        }
        for(const pz of [-477,-454,-410,-387]){
            const y=H.outdoorHeight(x,pz), height=H.deckRise443(pz)-.47;
            // Piers sit in the existing median, clear of the crossing's through lanes.
            box(x,y+.24,pz,2.14,.62,3.15,'#827e73','concrete');
            box(x,y+height*.43,pz,1.38,height*.87,2.25,'#a29a8b','concrete').shape='rounded';
            box(x,y+height-.38,pz,18.5,.83,2.74,'#8d8981','concrete').shape='rounded';
            for(const offset of [-8.2,-4.1,0,4.1,8.2])
                box(x+offset,y+height+.03,pz,.89,.29,1.94,'#454a4d','metal');
            world.solid(x,pz,1.40,2.25,true);
        }
        for(const pz of [-443,-432,-421])for(const offset of [-9,9]){
            const y=ground(x+offset,pz)-.84;
            const light=box(x+offset,y,pz,1.11,.09,.34,'#efe0b4','light_emissive');
            light.glow=.76;
        }
        // A lower street crosses east-west. Its two short north-south stubs are
        // separated from the freeway ramps by planted retaining abutments.
        for(const pz of [-448,-416])for(const sx of [-1,1]){
            const cx=x+sx*6.48,y=H.outdoorHeight(cx,pz);
            box(cx,y+.38,pz,12.3,.73,1.0,'#9e9687','concrete');
            box(cx,y+.78,pz,12.3,.11,1.05,'#c8bda6','concrete');
            world.solid(cx,pz,12.26,1.0,true);
            for(let i=0;i<7;i++)
                box(cx+(i-3)*1.64,y+.43,pz+(pz<z?.52:-.52),.26,.24,.035,'#e5c27b','paint');
        }
        world.overpass443={...deck,rails};
    };
})(Heatline);
