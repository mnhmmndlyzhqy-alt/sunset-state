/* SUNSET STATE 4.5.5 — 5 additive production stages, based on checkpoint 4.5.0.
 * No network downloads, image replacements or gameplay reset.
 * World meshes are added to the existing instanced WebGL2 pipeline.
 * All interiors remain lazy, per building AND per floor.
 */
var Heatline;
(function(H){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(t)=>t*t*(3-2*t);
const palettes={
  residential:['#b2afa7','#d6c6ac','#5a7380','#6c7370'],
  brick:['#ad9685','#d3b89d','#536d72','#695d58'],
  heritage:['#c2ae94','#e2cbb0','#69736c','#756358'],
  glass:['#99b4ba','#c6d7d3','#386477','#586f77'],
  tech:['#91a8aa','#c1d1d0','#3e6676','#5b7279'],
  hotel:['#bcb1a1','#dfd0b5','#5a7a80','#75716b']
};
const colorFor=(b)=>palettes[b.kind]||palettes.residential;
function mesh(out,x,y,z,w,h,d,color,material='masonry',shape='cube',min=0,max=0,cap=0){
  if(![x,y,z,w,h,d].every(Number.isFinite)||w<=0||h<=0||d<=0)return null;
  const o=H.box(x,y,z,w,h,d,color,0,4);
  o.material=material;
  if(shape!=='cube')o.shape=shape;
  if(min>0)o.lodMin=min;
  if(max>0)o.lodMax=max;
  if(cap>0)o.visibilityCap=cap;
  out.push(o);
  return o;
}

// STAGE 1: Whole-city structural HLOD — every catalogue building has persistent mass.
// Meshes are owned by the world from start-up, not generated upon proximity.
H.stage455Streaming=function(world){
  const buildings=world.buildings;
  const coverage=new Set();
  const lookup=new Map(buildings.map((b,i)=>[`${b.x.toFixed(2)},${b.z.toFixed(2)}`,i]));
  let proxies=0, originalCores=0, added=0;
  for(const o of world.boxes){
    if(o.stage450Proxy){
      o.visibilityCap=4790;
      if(o.h>5 && o.w>5 && o.d>5){
        const index=lookup.get(`${o.x.toFixed(2)},${o.z.toFixed(2)}`);
        if(index!==undefined)coverage.add(index);
      }
      // All large distant architectural components start overlapping closer,
      // well ahead of the 4.5.0 detailed facade retirement.
      o.lodMin=Math.max(400,(o.lodMin||620)-135);
      proxies++;
    }else if(o.layer===4&&o.h>8&&o.w>7&&o.d>7&&
        ['masonry','brickwork','concrete'].includes(o.material)){
      const index=lookup.get(`${o.x.toFixed(2)},${o.z.toFixed(2)}`);
      if(index!==undefined){
        const b=buildings[index];
        if(Math.abs(o.w-b.w)<.6&&Math.abs(o.d-b.d)<.6 && Math.abs(o.h-b.h)<1.0){
          o.visibilityCap=Math.max(o.visibilityCap||0,4770);
          o.stage455ContinuousMass=true;
          originalCores++;
        }
      }
    }
  }
  // Two smaller annex buildings were excluded by the >=9.5m HLOD threshold.
  for(const [i,b] of buildings.entries()){
    if(coverage.has(i))continue;
    const [stone,trim,glass]=colorFor(b), rise=H.cityTerrain42(b.x,b.z);
    const o=mesh(world.boxes,b.x,rise+b.h*.497,b.z,Math.max(.6,b.w*.95),
        Math.max(2,b.h*.994),Math.max(.6,b.d*.95),stone,'masonry','cube',475,0,4790);
    if(o){o.stage450Proxy=true;o.stage455Proxy=true;coverage.add(i);added++;}
    mesh(world.boxes,b.x,rise+b.h+.18,b.z,b.w*.975,.27,b.d*.975,trim,'concrete','cube',490,0,4790);
    if(b.h>6) for(const s of [-1,1]) mesh(world.boxes,b.x,rise+Math.max(2,b.h*.55),b.z+s*(b.d*.5+.11),
       b.w*.68,Math.min(1.1,b.h*.14),.09,glass,'building_window','cube',590,0,4500);
  }
  world.stage455StreamingStats={catalogue:buildings.length, covered:coverage.size,
    originalCores,existingProxyInstances:proxies,missingProxiesFixed:added,
    geometryOwnedAtStartup:true,buildingClipMeters:4790};
};

// STAGE 2: Author-like architectural variation with actual meshes, not billboards.
H.stage455Architecture=function(world){
  const portals=new Map(world.entrancePortals.map(p=>[`${p.buildingX},${p.buildingZ}`,p]));
  let generated=0,entrances=0,roofs=0,balconies=0;
  for(const [i,b] of world.buildings.entries()){
    if(b.w<8||b.d<6||b.h<6)continue;
    const [stone,trim,glass,dark]=colorFor(b), base=H.cityTerrain42(b.x,b.z);
    const before=world.boxes.length;
    const put=(x,y,z,w,h,d,color,mat='masonry',min=0,max=2150,cap=0,shape='cube')=>
      mesh(world.boxes,x,base+y,z,w,h,d,color,mat,shape,min,max,cap);
    const alt=i%8;
    const top=b.h+.08;
    // Four long parapet members define a legible rooftop line from an aircraft.
    for(const sign of [-1,1]){
      put(b.x+sign*(b.w*.5-.30),top+.36,b.z,.34,.64,b.d+.09,trim,'concrete',0,2420);
      put(b.x,top+.36,b.z+sign*(b.d*.5-.29),b.w-.42,.64,.34,trim,'concrete',0,2420);
    }
    roofs+=4;
    // Facade corners are real slender mullions; complete geometry is persistent.
    const mullion=(b.kind==='tech'||b.kind==='glass')?'metal':'concrete';
    const height=Math.max(1,b.h-4.7);
    if(height>4.5){
      for(const sx of [-1,1])for(const sz of [-1,1])
        put(b.x+sx*(b.w*.5-.15),2.32+height*.5,b.z+sz*(b.d*.5-.12),
          .23,height,.27,dark,mullion,0,1980);
    }
    // Mechanical penthouses and skylights genuinely sit on top of the main volume.
    if(b.h>15){
      const width=b.w*(.22+(i%3)*.025),depth=b.d*(.19+(i%4)*.022);
      const side=(i%2?1:-1);
      put(b.x+side*b.w*.11,b.h+.41,b.z-b.d*.09,width,.63,depth,dark,'metal',0,1720);
      put(b.x+side*b.w*.11,b.h+.77,b.z-b.d*.09,width+.16,.14,depth+.17,trim,'concrete',0,1710);
      roofs+=2;
      if((alt%3)!==2){
        // Solar/glass rooflight with raised frame and contiguous pane.
        const sx=b.x-side*b.w*.19,sz=b.z+b.d*.12;
        put(sx,b.h+.21,sz,Math.max(1.8,b.w*.22),.11,Math.max(1.6,b.d*.19),dark,'metal',0,1160);
        put(sx,b.h+.285,sz,Math.max(1.5,b.w*.21),.035,Math.max(1.35,b.d*.18),glass,'building_window',0,1160);
        roofs+=2;
      }
    }
    // A mix of podium/window ribbon bands, no signs floating over the street.
    if(b.h>14&&b.w>12){
      const yy=Math.min(5.3,Math.max(4.5,b.h*.24));
      put(b.x,yy,b.z+b.d*.5+.125,b.w*.66,.38,.10,glass,'building_window',0,1880);
      put(b.x,yy+.34,b.z+b.d*.5+.15,b.w*.70,.13,.17,trim,'concrete',0,1880);
    }
    if((b.kind==='residential'||b.kind==='brick'||b.kind==='hotel')&&b.h>23&&b.w>14){
      // Noninteractive exterior balconies on upper floors; stair/elevator remain indoors.
      const levels=Math.min(3,Math.floor((b.h-10)/7));
      for(let level=0;level<levels;level++){
        const y=7.9+level*7.0;
        if(y>b.h-3.5)break;
        const offset=(alt+level)%2===0?-1:1;
        const bx=b.x+offset*b.w*.24,front=b.z-b.d*.5-.52;
        const bw=Math.min(3.4,b.w*.3);
        put(bx,y,front,bw,.18,.95,trim,'concrete',0,920);
        put(bx,y+.62,front-.43,bw-.07,1.14,.08,glass,'building_window',0,890);
        for(const s of [-1,1])put(bx+s*(bw*.5-.12),y+.57,front-.43,.09,1.12,.09,dark,'metal',0,880);
        balconies++;
      }
    }
    const p=portals.get(`${b.x},${b.z}`);
    if(p&&p.interiorReady&&b.w>10){
      const front=b.z-b.d*.5;
      const openW=clamp(p.width||3.5,2.6,3.85),cx=p.x;
      // Door stays physically open: *only* frame, canopy and flanking wall accents.
      put(cx,3.40,front-.67,openW+.84,.22,1.57,trim,'concrete',0,610);
      put(cx,3.53,front-.90,openW+.68,.075,1.26,dark,'metal',0,620);
      for(const sign of [-1,1]){
        const xx=cx+sign*(openW*.5+.24);
        if(xx>b.x-b.w*.5+.30&&xx<b.x+b.w*.5-.30){
          put(xx,1.62,front-.19,.16,3.03,.25,dark,'metal',0,560);
          put(xx,2.88,front-.36,.13,.16,.22,trim,'light_emissive',0,400);
        }
      }
      entrances++;
    }
    generated+=world.boxes.length-before;
  }
  world.stage455ArchitectureStats={facadeMeshes:generated,roofDetails:roofs,balconies,enhancedEntrances:entrances};
};

// STAGE 3: Legible street material transitions and furnished pedestrian frontages.
H.stage455Street=function(world){
  const portals=new Map(world.entrancePortals.map(p=>[`${p.buildingX},${p.buildingZ}`,p]));
  let meshes=0,porches=0,planters=0;
  for(const [i,b] of world.buildings.entries()){
    const portal=portals.get(`${b.x},${b.z}`);
    if(!portal||b.w<10||b.d<8)continue;
    const before=world.boxes.length;
    const [stone,trim,glass,dark]=colorFor(b),front=b.z-b.d*.5;
    const put=(x,y,z,w,h,d,color,mat='paving',max=330,shape='cube')=>
      mesh(world.boxes,x,H.outdoorHeight(x,z)+y,z,w,h,d,color,mat,shape,0,max);
    if(!H.openSea444(portal.x,front-1.4)){
      // At grade, not hanging over terrain: the walking line has no collider.
      put(portal.x,.055,front-1.13,Math.min(4.5,b.w*.4),.045,1.76,trim,'paving',440);
      put(portal.x,.081,front-1.18,Math.min(3.8,b.w*.36),.016,1.62,stone,'concrete',410);
      const stripWidth=Math.min(3.0,b.w*.26);
      for(const sign of [-1,1])
        put(portal.x+sign*stripWidth*.48,.09,front-1.12,.042,.018,1.38,dark,'metal',305);
      porches++;
    }
    for(const side of [-1,1]){
      const xx=b.x+side*(b.w*.5-.99),zz=front-.64;
      if(H.openSea444(xx,zz)||H.isAsphalt(xx,zz))continue;
      // Container/greenery are against facade ends, *not* the central entrance.
      if(Math.abs(xx-portal.x)<2.45)continue;
      const planterColor=(i+side)%3===0?'#a28f75':'#727e75';
      put(xx,.31,zz,.63,.56,.76,planterColor,'concrete',370,'rounded');
      put(xx,.60,zz,.57,.09,.70,'#625744','masonry',370);
      const pType=(i*7+(side+2)*13)%3;
      for(let p=0;p<3;p++){
        const px=xx+(p-1)*.11, pz=zz+((p*3+i)%4-1.5)*.11;
        put(px,1.0+(p%2)*.17,pz,.31,.64+(p%2)*.23,.26,
            ['#50765b','#658268','#7d9873'][pType],'foliage',320,'sphere');
      }
      planters++;
    }
    meshes+=world.boxes.length-before;
  }
  world.stage455StreetStats={meshes,pedestrianLandings:porches,greenPlantedEdges:planters};
};
H.enhanceCity455=function(world){
  H.stage455Streaming(world);
  H.stage455Architecture(world);
  H.stage455Street(world);
  world.stage455FiveStageStats={stage1:world.stage455StreamingStats,
     stage2:world.stage455ArchitectureStats,stage3:world.stage455StreetStats,
     cityBuildingCount:world.buildings.length,boxCount:world.boxes.length};
};

// STAGE 4: All building lobbies are authored lazily, with aligned full-width spaces.
// No new opaque partition crosses the walk-through entrance or the central passage.
H.refineInterior455=function(scene,plan){
  if(scene.refined455)return scene;
  scene.refined455=true;
  const b=plan.outerShell,x=b.x,z=b.z,Y=scene.floor*plan.floorHeight;
  const {X,Z}=H.interiorExtents450(b),C=H.interiorCorridor450(X,scene.floor);
  const theme=(plan.buildingId+3*scene.floor)%6;
  const [stone,trim,glass,dark]=colorFor({kind:plan.materialFamily});
  const pale=['#eae3d8','#e6ece9','#e7e2d8','#e0e7e6','#ece7dc','#ebe9e4'][theme];
  let count=0,solids=0;
  const put=(xx,yy,zz,w,h,d,col=stone,mat='paint',shape='cube',glow=0)=>{
    const o=mesh(scene.boxes,xx,Y+yy,zz,w,h,d,col,mat,shape,0,0,0);
    if(o){o.glow=glow;count++;}
    return o;
  };
  const clear=(xx,zz,w,d,padding=.25)=>{
    const hw=w*.5+padding,hd=d*.5+padding;
    if(xx-hw<x-X+.4||xx+hw>x+X-.4||zz-hd<z-Z+.4||zz+hd>z+Z-.4)return false;
    if(scene.solids.some(s=>Math.abs(xx-s.x)<hw+s.hw&&Math.abs(zz-s.z)<hd+s.hd))return false;
    if(scene.lift&&Math.hypot(xx-scene.lift.x,zz-scene.lift.z)<2.2+Math.max(hw,hd))return false;
    if(scene.entrance&&Math.hypot(xx-scene.entrance.x,zz-scene.entrance.z)<2.3+Math.max(hw,hd))return false;
    if(scene.stairs&&Number.isFinite(scene.stairs.x)&&Math.hypot(xx-scene.stairs.x,zz-scene.stairs.z)<2.1+Math.max(hw,hd))return false;
    return true;
  };
  const solid=(xx,zz,w,d)=>{scene.solids.push({x:xx,z:zz,hw:w*.5,hd:d*.5});solids++;};
  // Architectural rhythm, realistic flush panels, and warm bounce light.
  for(let i=0;i<Math.min(9,Math.floor(Z/4)+1);i++){
    const zz=z-Z+2.35+i*(2*Z-4.7)/Math.max(1,Math.min(9,Math.floor(Z/4)+1)-1);
    put(x,4.01,zz,Math.min(C*1.28,5.2),.065,.29,pale,'light_emissive','rounded_smooth',.32);
    if(i%2===0){
      for(const s of [-1,1]){
        put(x+s*(C-.22),2.49,zz,.09,.74,.38,dark,'metal');
        put(x+s*(C-.30),2.49,zz,.045,.61,.28,pale,'light_emissive','rounded_smooth',.22);
      }
    }
  }
  if(scene.floor===0){
    // Central stone floor geometry is flat; the opening stays traversable by walking.
    const front=z-Z;
    put(scene.entrance.x,.114,front+2.25,Math.min(3.25,C*1.48),.017,2.0,'#ddd4c3','paving');
    put(x,.11,z+Z*.08,Math.min(3.1,C*.96),.015,Math.min(5.6,Z*.55),
       theme%2?'#aea99d':'#b3b8b3','fabric');
    // Lobby artwork against the structural side walls, above human eyeline.
    for(const sx of [-1,1]){
      const xx=x+sx*(C-.11),zz=z+Z*.32;
      put(xx,2.11,zz,.09,1.62,2.60,dark,'wood');
      put(xx-sx*.07,2.11,zz,.03,1.31,2.25,glass,'glass');
      for(const yy of [1.54,2.60])put(xx-sx*.095,yy,zz,.028,.045,2.15,trim,'metal');
    }
    // One reception/waiting pocket near a side wall; no furniture is placed
    // until the exact existing collision map proves a clear, generous route.
    let reception=false;
    for(const sx of [(plan.buildingId%2===0?1:-1),(plan.buildingId%2===0?-1:1)]){
      for(const zz of [z+Z*.23,z-Z*.13,z+Z*.58]){
        const xx=x+sx*(C-.96);
        if(!clear(xx,zz,.86,2.25,.40))continue;
        put(xx,.59,zz,.78,1.07,2.19,theme%2?'#7e7771':'#7f918c','wood','rounded_smooth');
        put(xx,.99,zz,.91,.12,2.33,trim,'concrete','rounded_smooth');
        put(xx-sx*.42,1.33,zz,.045,.63,1.18,glass,'glass');
        put(xx-sx*.44,1.78,zz,.05,.11,1.67,dark,'metal');
        solid(xx,zz,.78,2.2);
        reception=true;
        break;
      }
      if(reception)break;
    }
    // Lanterns reflect into the ceiling rather than floating at camera height.
    for(const q of [-1,1]){
      const px=x+q*Math.min(C*.45,2.5),pz=front+Math.min(Z*.42,6.7);
      put(px,3.96,pz,.65,.10,.98,trim,'metal');
      put(px,3.90,pz,.52,.045,.79,pale,'light_emissive','rounded_smooth',.40);
    }
    scene.lights.push({x,y:Y+3.62,z:front+Math.min(Z*.55,8.6),radius:16,r:1.07,g:.99,b:.89});
    scene.stage455Lobby={reception,centralClearPassageMeters:2*C,
      vestibuleDepthMeters:Math.min(8,Z*.7),continuousWalkIn:true};
  }else{
    // STAGE 5: individually furnished upper-storey rooms, not a copied lobby.
    // Furnish only inside the real wing; avoid near-threshold room door zones.
    const usableWing=X-C;
    if(usableWing>3.6&&Z>8){
      for(const r of scene.rooms){
        const side=r.id.startsWith('west')?-1:1;
        const rear=r.id.endsWith('rear');
        const bz=z+(rear?1:-1)*Math.min(Z-2.3,Z*.79);
        const bx=x+side*(C+usableWing*.63);
        const ex=x+side*(X-.48);
        const accent=['#a2aaa6','#bba88e','#a1b9bc','#a6a7b3'][((r.index||0)+scene.floor)%4];
        // Floating-look free: broad low-pile rug with modeled fabric seam.
        put(bx,.095,bz,Math.min(4,usableWing*.77),.016,Math.min(3.5,Z*.34),accent,'fabric');
        if(usableWing>5.1){
          const cz=bz+(rear?-.90:.90),width=Math.min(2.2,usableWing*.31);
          if(clear(ex-side*.64,cz,.79,width,.16)){
            put(ex-side*.53,.83,cz,.74,1.43,width,stone,'wood','rounded_smooth');
            put(ex-side*.98,1.22,cz,.056,.70,width-.18,dark,'metal');
            solid(ex-side*.53,cz,.74,width);
          }
        }
        // Colored ceiling plane separates homes, galleries and offices.
        put(bx,4.016,bz,Math.min(3.25,usableWing*.56),.044,Math.min(2.2,Z*.25),pale,'paint');
        put(bx,3.983,bz,Math.min(2.82,usableWing*.48),.045,.13,'#f7e5ca','light_emissive','rounded_smooth',.27);
        // Wall sockets are at the real wall, not hovering in the room.
        put(x+side*(X-.145),.31,bz,.08,.17,.25,'#eeeae0','paint');
      }
    }
  }
  scene.stage455Interior={floor:scene.floor,roomCount:scene.rooms.length,
    addedMeshes:count,addedCollisionProps:solids,
    widthMeters:2*X,depthMeters:2*Z,centrePassageMeters:2*C,
    groundFloorLobby:scene.floor===0};
  return scene;
};

// STAGE 5b: Shops and the bank receive finishing without touching missions/clerks.
H.refineRetail455=function(scene,venue){
  if(scene.refined455)return scene;
  scene.refined455=true;
  const {centerX:x,frontZ:z,width:w,doorX}=venue.retail;
  const depth=scene.bounds.zmax-scene.bounds.zmin;
  const bank=!!venue.bank44;
  let count=0;
  const put=(px,y,pz,ww,hh,dd,col,material='paint',shape='cube',glow=0)=>{
    const o=mesh(scene.boxes,px,y,pz,ww,hh,dd,col,material,shape);
    if(o){o.glow=glow;count++;}
  };
  // A generous unobstructed 2.0m front-to-counter axis, even in narrow stores.
  for(let i=0;i<Math.max(2,Math.floor(depth/3));i++){
    const zz=z+2.3+i*2.65;
    if(zz>scene.bounds.zmax-1.2)break;
    put(x,3.69,zz,Math.min(w*.45,3.3),.055,.39,'#f5e4c7','light_emissive','rounded_smooth',.25);
  }
  for(const side of [-1,1]){
    const xx=x+side*(w*.5-.22);
    for(const offset of [5.75,Math.max(7.8,depth-2.3)]){
      const zz=z+offset;
      if(zz>scene.bounds.zmax-.9)continue;
      put(xx-side*.045,1.96,zz,.075,1.19,1.31,bank?'#7e9498':'#998a76','wood');
      put(xx-side*.086,1.50,zz,.07,.06,1.22,'#cdbb9b','wood');
      put(xx-side*.086,2.25,zz,.07,.06,1.22,'#cdbb9b','wood');
    }
  }
  // Bank keeps all stage44 teller, vault and heist geometry in the same positions.
  if(bank){
    put(x,.077,z+Math.min(depth*.34,4.2),Math.min(2.6,w*.44),.014,2.9,'#b7b9ad','paving');
    for(const side of [-1,1]){
      const xx=x+side*Math.min(w*.35,2.3);
      put(xx,3.61,z+Math.min(depth*.46,5.5),.13,.10,2.6,'#d6c18f','metal');
    }
  }
  scene.stage455Retail={addedMeshes:count,shopWidthMeters:w,walkableDepthMeters:depth,
     centralClearanceMeters:Math.min(2.0,w*.35),bankSystemsUnchanged:bank};
  return scene;
};
})(Heatline||(Heatline={}));
