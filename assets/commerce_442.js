var Heatline = globalThis.Heatline || {};
(function(H){
    function buildingPart(world,x,y,z,w,h,d,color,material,layer=4) {
        const b=H.box(x,H.outdoorHeight(x,z)+y,z,w,h,d,color,0,layer);
        b.material=material;
        b.visibilityCap=530;
        world.add(b);
        return b;
    }

    // Query the existing collision map before allocating a parcel or a parking bay.
    function openParcel(world,x,z,w,d) {
        return !world.nearby(x,z).some(o=>
            Math.abs(x-o.x)<w/2+o.hw && Math.abs(z-o.z)<d/2+o.hd);
    }

    function addStore(world,x,z,kind,label,district,accent,width=9.6){
        const depth=8.2, front=z;
        const venue={id:world.streetVenues.length,x,z:front-2.2,kind,label,district,
            frontageX:x,frontageZ:front};
        venue.retail=H.createRetailFrontage(venue,width,x);
        const deck=buildingPart(world,x,.07,front+depth/2,width+.7,.18,depth+.4,'#b7ada0','concrete',3);
        deck.gradeX=(H.outdoorHeight(x+width/2,z)-H.outdoorHeight(x-width/2,z))/width;
        buildingPart(world,x,1.94,front+depth/2,width+.2,3.88,depth,'#999389','masonry');
        buildingPart(world,x,3.97,front+depth/2,width+.65,.28,depth+.65,'#c5bba9','concrete');
        buildingPart(world,x,4.45,front+5,3.1,.75,2.35,'#818b8f','metal');
        buildingPart(world,x,3.55,front-.95,width+.05,.17,1.5,accent,'metal');
        for(const part of H.makeRetailFacade(venue.retail)){
            part.y+=H.outdoorHeight(part.x,part.z);
            world.add(part);
        }
        world.solid(x,front+depth/2,width+.2,depth);
        world.streetVenues.push(venue);
        world.retailShops.push(venue);
        return venue;
    }

    function addTerrace(world){
        const x=270,z=-271;
        if(!openParcel(world,x,z-2.5,27,29)||world.entrancePortals.some(p=>Math.hypot(x-p.x,z-p.z)<23))return;
        const y=H.outdoorHeight(x,z);
        const shell=(level,w,h,d,color,material)=>{
            const b=H.box(x,y+level,z,w,h,d,color,0,4);
            b.shape='terrace442';b.material=material;b.visibilityCap=860;world.add(b);
        };
        shell(.85,19.5,2.6,16.6,'#8d8177','concrete');
        shell(7.55,17,10.3,13.7,'#31373a','metal');
        for(let f=0;f<4;f++){
            const level=3.56+2.94*f, width=23.1-f*.6, depth=19.8-f*.54;
            shell(level,width,.52,depth,'#d8c1ac','concrete');
            shell(level+.38,width-.33,.30,depth-.33,'#b6a292','masonry');
            for(let i=0;i<16&&f<3;i++){
                const angle=(i+.5)*H.TAU/16;
                const column=H.box(x+Math.cos(angle)*(width*.5-.94),y+level+1.60,
                    z+Math.sin(angle)*(depth*.5-.94),.40,2.47,.40,'#c0a688',0,4);
                column.shape='cylinder';column.material='concrete';column.visibilityCap=440;world.add(column);
            }
        }
        shell(13.04,11.3,1.31,9,'#a69988','concrete');
        world.solid(x,z,19.1,16.3);
        const venue=addStore(world,x,z-10.1,'gallery','גלריית הטרסות','שדרת השקיעה','#87664e',13.2);
        const plaza=H.box(x,.25,z-17.1,24.5,.075,15.2,'#a49784',0,3);
        plaza.material='paving';plaza.visibilityCap=460;
        H.fitGround441(plaza,H.outdoorHeight,b=>world.add(b),3);
        for(const side of [-1,1]){
            const planter=buildingPart(world,x+side*7.8,.34,z-10.8,1.55,.60,2.3,'#9c8272','concrete');
            buildingPart(world,planter.x,.77,planter.z,1.32,.68,2.09,'#506550','foliage').shape='urban_crown';
            world.solid(planter.x,planter.z,1.48,2.20);
        }
        world.terrace442={x,z,venue};
        world.commerce442.push(venue);
    }

    H.addCommerce442=function(world){
        const rows=[
            {kind:'cafe',label:'קפה על הגבעה',district:'רובע הגבעות',accent:'#466861',target:[-350,130]},
            {kind:'grocery',label:'שוק השדרה',district:'השדרה המרכזית',accent:'#736849',target:[-45,42]},
            {kind:'bookshop',label:'ספרים על הרציף',district:'רובע הנמל',accent:'#405e72',target:[280,230]},
            {kind:'pharmacy',label:'בית מרקחת הרכס',district:'רובע האומנים',accent:'#627d77',target:[-325,-100]},
            {kind:'gallery',label:'גלריית אבן',district:'רובע השוק',accent:'#8b624d',target:[-180,180]}
        ];
        const candidates=[];
        for(let i=-5;i<=4;i++)for(let j=-4;j<=4;j++)for(const offset of [22,35,50,64,79]){
            const x=i*H.BLOCK+offset,z=j*H.BLOCK+19.9;
            if(Math.abs(z-H.TRAM_Z)>23)candidates.push({x,z});
        }
        world.commerce442=[];
        addTerrace(world);
        for(const row of rows){
            const ordered=candidates.slice().sort((a,b)=>
                Math.hypot(a.x-row.target[0],a.z-row.target[1])-Math.hypot(b.x-row.target[0],b.z-row.target[1]));
            // Keep existing entrances and public squares usable.
            const chosen=ordered.find(({x,z})=>
                openParcel(world,x,z+3,13,13) &&
                world.entrancePortals.every(p=>Math.hypot(x-p.x,z-p.z)>13) &&
                world.retailShops.every(p=>Math.hypot(x-p.x,z-p.z)>14) &&
                (!world.stage44Depot||Math.hypot(x-world.stage44Depot.x,z-world.stage44Depot.z)>27));
            if(chosen)world.commerce442.push(addStore(world,chosen.x,chosen.z,row.kind,row.label,row.district,row.accent));
        }

        const places=world.retailShops.filter(v=>!v.bank44&&Math.hypot(v.x,v.z)<460);
        world.luxuryBays442=[];
        for(const v of places){
            if(world.luxuryBays442.length>=8)break;
            const z=Math.round(v.z/H.BLOCK)*H.BLOCK+Math.sign(v.z-Math.round(v.z/H.BLOCK)*H.BLOCK)*10.4;
            for(const offset of [0,8,-8]){
                const x=v.x+offset;
                if(Math.abs(z-H.TRAM_Z)<16||Math.abs(x-Math.round(x/H.BLOCK)*H.BLOCK)<23||
                    Math.hypot(x-v.x,z-v.z)>49||!openParcel(world,x,z,7.7,3.15)||
                    world.luxuryBays442.some(b=>Math.hypot(x-b.x,z-b.z)<9))continue;
                world.luxuryBays442.push({x,z,yaw:Math.PI/2,venueId:v.id});
                for(const side of [-1,1]){
                    const y=H.outdoorHeight(x+side*3.2,z);
                    const stripe=H.box(x+side*3.2,y+.073,z,.085,.022,2.8,'#e1d39b',0,3);
                    stripe.material='paint';world.add(stripe);
                }
                break;
            }
        }

        for(const station of world.fuelStations){
            const {x,z}=station;
            for(const bay of station.bays){
                const mark=buildingPart(world,bay.x,.075,bay.z,3.25,.016,4.5,'#a7b3a9','asphalt',3);
                mark.gradeZ=(H.outdoorHeight(bay.x,bay.z+2.25)-H.outdoorHeight(bay.x,bay.z-2.25))/4.5;
            }
            for(const dx of [-.6,.6]){
                buildingPart(world,x+dx,.43,z-.2,.14,.85,.14,'#e1b75d','metal');
                buildingPart(world,x+dx,.67,z-.2,.15,.11,.15,'#3e4b4b','metal');
            }
            buildingPart(world,x-10,3.67,z+12.12,9.7,.45,.18,'#244f56','metal');
            buildingPart(world,x-10,3.45,z+11.96,8.7,.052,.09,'#ffe9ab','light_emissive');
        }
    };

    H.finishStoreInterior442=function(scene,venue){
        if(venue.bank44)return;
        const {xmin,xmax,zmin,zmax}=scene.bounds, width=xmax-xmin;
        const palette={cafe:['#9d7259','#d1a77f'],grocery:['#527878','#9faa81'],
            bookshop:['#5c676f','#a68661'],pharmacy:['#6a9290','#ddd7c8'],gallery:['#6a6975','#bcb3aa']};
        const colors=palette[venue.kind];
        if(!colors||width<5.9)return;
        const add=(x,y,z,w,h,d,color,material='wood',layer=4)=>{
            const b=H.box(x,y,z,w,h,d,color,0,layer,0);
            b.material=material;scene.boxes.push(b);
        };
        const center=(xmin+xmax)/2;
        if(venue.kind==='cafe'){
            const x=venue.retail.windowX>venue.retail.centerX?xmax-.67:xmin+.67, z=zmin+1.94;
            add(x,.45,z,.74,.16,1.36,colors[0]);
            add(x,.63,z,.31,.42,1.36,colors[1],'fabric');
            scene.solids.push({x,z,hw:.37,hd:.68});
        }else{
            const z=zmax-.32;
            add(center,1.99,z,width*.76,1.04,.09,colors[0],'paint');
            for(let i=0;i<5;i++)
                add(center+(i-2)*width*.13,2,z-.068,width*.09,.67,.053,colors[1],venue.kind==='gallery'?'fabric':'paint');
        }
        for(const z of [zmin+1.34,zmin+3.32,zmin+5.3])
            add(center,.014,z,width*.40,.019,1.97,colors[1],venue.kind==='pharmacy'?'concrete':'fabric',3);
    };

    H.seedLuxury442=function(game){
        let spawned=0;
        for(const bay of game.world.luxuryBays442||[]){
            const existing=game.parked.find(c=>Math.hypot(c.x-bay.x,c.z-bay.z)<7);
            if(existing){
                const replacement={...existing,vehicleClass:'luxury'};
                if(game.world.nearby(existing.x,existing.z).some(o=>H.carBuildingContact(replacement,o)))continue;
                existing.vehicleClass='luxury';
            }else{
                if([game.player,...game.civilian].some(c=>Math.hypot(c.x-bay.x,c.z-bay.z)<7))continue;
                const c=H.makeCar('civilian',bay.x,bay.z,bay.yaw,spawned%6);
                c.vehicleClass='luxury';
                game.parked.push(c);
            }
            spawned++;
        }
        game.luxurySpawned442=spawned;
    };
})(Heatline);
