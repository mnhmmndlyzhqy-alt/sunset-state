/* SUNSET STATE 29/35: cumulative walkable interior, storefront and lift polish.
 * Wraps the REAL Stage05/13/14/15 scene construction, not a replacement game.
 * No new walls/colliders, portals, floor unlocks, transaction or mission changes.
 * All parts use existing material names and finite visibility caps.
 * A/B: ?stage29InteriorsOff=1 or global __SUNSET_STAGE29_INTERIORS_OFF=true.
 * CPU scene acceptance is not visual/GPU or 1080p/50FPS certification.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const off=()=>globalThis.__SUNSET_STAGE29_INTERIORS_OFF===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
      new URLSearchParams(location.search).has('stage29InteriorsOff'));
  const finite=(...v)=>v.every(Number.isFinite);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const stats={interiorsBuilt:0,retailBuilt:0,interiorMeshes:0,retailMeshes:0,
    interiorRealLights:0,retailRealLights:0,collisionChanges:0,portalChanges:0,
    stage28WorldMeshChanges:0,shaderBudget:12,hardwareGPUVerified:false,
    fullHD50FPSVerified:false};
  const palette={
    hotel:['#d4c1a0','#a5bfbd','#e3d2ad'],glass:['#a0c6d0','#5d8793','#dce4df'],
    tech:['#a5c3c2','#668f9a','#cbdad5'],brick:['#c7af93','#977e71','#e1d1ba'],
    heritage:['#c9bdac','#8b9184','#e4d2ac'],residential:['#c6b9a6','#77918d','#e5d7be'],
    office:['#aebfc1','#627e86','#d7dce0']};
  const retailPalette={
    cafe:['#bd8862','#dbb476'],bakery:['#ba8f6f','#e3c48b'],pharmacy:['#78b9ac','#c4e1d7'],
    grocery:['#80a083','#b6c9a0'],bookshop:['#8f86a1','#c6b4a0'],gallery:['#8fa9ba','#cad5d7'],
    flower:['#89aa89','#c8b3a0'],bank:['#7099aa','#b7c6c9']};
  let installed=false;
  function decorate(scene,kind,x,y,z,w,h,d,color,material,glow=0,cap=110,layer=4){
    if(!finite(x,y,z,w,h,d)||Math.min(w,h,d)<.008||cap>165||cap<15)
      throw Error('Stage29 illegal geometry '+kind);
    const b=H.box(x,y,z,w,h,d,color,0,layer,glow);
    b.material=material;b.shape='reference_slab469';b.visibilityCap=cap;b.lodMax=cap;
    b.stage29IndoorPolish=true;b.stage29Kind=kind;
    scene.boxes.push(b);return b;
  }
  function isWithin(scene,x,z,w,d,pad=.015){
    const b=scene.bounds;
    return x-w*.5>=b.xmin+pad&&x+w*.5<=b.xmax-pad&&
      z-d*.5>=b.zmin+pad&&z+d*.5<=b.zmax-pad;
  }
  function safeAdd(scene,kind,x,y,z,w,h,d,color,material,glow=0,cap=110,layer=4){
    if(!isWithin(scene,x,z,w,d))return false;
    decorate(scene,kind,x,y,z,w,h,d,color,material,glow,cap,layer);
    return true;
  }
  function light(scene,kind,x,y,z,radius,color){
    if(!finite(x,y,z,radius)||radius<1)throw Error('Stage29 invalid light');
    scene.lights.push({x,y,z,radius,r:color[0],g:color[1],b:color[2],
      stage29Real:true,stage29Kind:kind});
  }
  function modifyInterior(scene,plan,floor){
    if(!scene||scene.stage29InteriorPolish||!scene.bounds||!scene.lift||!scene.entrance||
       !plan?.outerShell||!Array.isArray(scene.boxes)||!Array.isArray(scene.lights)||
       !Array.isArray(scene.solids)||!Array.isArray(scene.doors))return scene;
    const old={boxes:scene.boxes.length,solids:scene.solids.length,lights:scene.lights.length,
      doors:scene.doors.length,rooms:scene.rooms?.length||0};
    const b=scene.bounds,spanX=b.xmax-b.xmin,spanZ=b.zmax-b.zmin;
    const level=Number.isFinite(scene.floor)?scene.floor:floor;
    const base=level*plan.floorHeight;
    const tones=palette[plan.materialFamily]||palette.residential;
    const theme=(Math.abs(plan.buildingId||0)+level)%3;
    const lift=scene.lift,entry=scene.entrance;
    let addedCove=0,addedGuides=0,addedLift=0,addedLobby=0;
    // Raised corridor coves: trim is above head height; never undercuts a
    // physical entrance, room door, stair or elevator aperture.
    for(const t of [.23,.53,.81]){
      const x=entry.x+(lift.x-entry.x)*t;
      const z=entry.z+(lift.z-entry.z)*t;
      if(safeAdd(scene,'corridor-cove',x,base+3.92,z,Math.min(1.55,spanX*.24),.045,.31,
        tones[theme],'anodized471',.12,100))addedCove++;
    }
    // Occupied-floor locator is placed ABOVE the elevator, not across the
    // walk-through car threshold. Lamp points into the local landing.
    const lx=clamp(lift.x,b.xmin+.70,b.xmax-.70);
    const lz=clamp(lift.z-.85,b.zmin+.28,b.zmax-.28);
    if(safeAdd(scene,'lift-number-frame',lx,base+3.46,lz,1.23,.19,.095,
      tones[1],'metal',0,85))addedLift++;
    if(safeAdd(scene,'lift-number-face',lx,base+3.47,lz-.061,.94,.12,.018,
      tones[2],'light_emissive',.32,85))addedLift++;
    // Two small threshold-side floor inlays, without colliders and without a
    // solid strip over the centre of the elevator entrance.
    for(const side of [-1,1]){
      if(safeAdd(scene,'lift-threshold-guide',lx+side*.67,base+.084,lz-.48,
        .10,.016,.70,tones[1],'stone',0,58,2))addedGuides++;
    }
    if(level===0){
      // Reception treatment near the existing back wall; wall-mounted and
      // above shoulder height, never a new free-standing obstacle.
      const rz=b.zmax-.085,cx=clamp(plan.outerShell.x,b.xmin+1.0,b.xmax-1.0);
      if(safeAdd(scene,'reception-header',cx,base+3.04,rz,
        Math.min(2.55,spanX*.37),.12,.045,tones[0],'travertine471',0,110))addedLobby++;
      if(safeAdd(scene,'reception-inset',cx,base+2.95,rz-.033,
        Math.min(1.75,spanX*.27),.30,.016,tones[1],'paint',0,105))addedLobby++;
    }
    // True shaded landing light using the existing Stage14 shader selection.
    light(scene,'elevator-landing',lx,base+3.31,lz,7.2,[.78,.87,.88]);
    const diff=scene.boxes.length-old.boxes;
    if(scene.solids.length!==old.solids||scene.doors.length!==old.doors||
       (scene.rooms?.length||0)!==old.rooms||diff>12||scene.lights.length!==old.lights+1)
      throw Error('Stage29 interior scene mutated traversal');
    scene.stage29InteriorPolish={stage:29,buildingId:plan.buildingId,floor:level,
      compact:!!scene.stage05Compact,coves:addedCove,liftDetail:addedLift,
      floorGuides:addedGuides,receptionDetails:addedLobby,meshesAdded:diff,
      pointLightsAdded:1,oldLights:old.lights,collidersAdded:0,doorsChanged:0,
      gpuVerified:false};
    stats.interiorsBuilt++;stats.interiorMeshes+=diff;stats.interiorRealLights++;
    return scene;
  }
  function modifyRetail(scene,unit){
    if(!scene||scene.stage29RetailPolish||!unit||!scene.bounds||!scene.counter||
       !scene.entrance||!Array.isArray(scene.boxes)||!Array.isArray(scene.solids)||
       !Array.isArray(scene.lights))return scene;
    const old={boxes:scene.boxes.length,solids:scene.solids.length,lights:scene.lights.length};
    const b=scene.bounds,spanX=b.xmax-b.xmin;
    const colors=retailPalette[unit.kind]||['#90a5a5','#c7bdaa'];
    const x=clamp(scene.counter.x,b.xmin+1,b.xmax-1);
    const entryZ=scene.entrance.z;
    const backZ=scene.counter.z;
    const railStart=clamp(entryZ+1.45,b.zmin+1,b.zmax-1.75);
    const railEnd=clamp(backZ-1.05,railStart+1,b.zmax-1);
    const railZ=(railStart+railEnd)*.5,railDepth=Math.max(.9,railEnd-railStart);
    let rails=0,wall=0,canopy=0;
    for(const side of [-1,1]){
      if(safeAdd(scene,'retail-ceiling-rail',x+side*Math.min(spanX*.22,1.55),3.61,railZ,
         .095,.08,railDepth,colors[0],'anodized471',.08,78))rails++;
    }
    if(safeAdd(scene,'retail-rear-sign',x,3.25,b.zmax-.125,
      Math.min(3.6,spanX*.54),.18,.045,colors[0],'metal',0,93))wall++;
    if(safeAdd(scene,'retail-rear-lightband',x,3.12,b.zmax-.163,
      Math.min(3.0,spanX*.47),.048,.016,colors[1],'light_emissive',.28,93))wall++;
    // Shop-window canopy stays behind the entrance and above the door.
    if(safeAdd(scene,'retail-entry-canopy',scene.entrance.x,3.55,
      clamp(entryZ+.75,b.zmin+.6,b.zmax-.8),1.38,.075,.42,
      colors[0],'metal',0,66))canopy++;
    light(scene,'retail-threshold',scene.entrance.x,3.20,
      clamp(entryZ+1.55,b.zmin+1,b.zmax-1),6.3,[.82,.90,.83]);
    light(scene,'retail-counter',x,3.23,
      clamp(scene.counter.z-.12,b.zmin+1,b.zmax-1),6.8,[1.01,.91,.78]);
    const diff=scene.boxes.length-old.boxes;
    if(scene.solids.length!==old.solids||scene.lights.length!==old.lights+2||diff>8)
      throw Error('Stage29 retail scene mutated navigation');
    scene.stage29RetailPolish={stage:29,shopKind:unit.kind,meshesAdded:diff,
      aisleRails:rails,rearSign:wall,entryCanopy:canopy,pointLightsAdded:2,
      oldLights:old.lights,collidersAdded:0,retailTransactionsUnchanged:true,
      hardwareGpuVerified:false};
    stats.retailBuilt++;stats.retailMeshes+=diff;stats.retailRealLights+=2;
    return scene;
  }
  function updateHUD(g){
    if(typeof document==='undefined'||!document.getElementById)return;
    const a=document.getElementById('stage29-wayfinding');
    const b=document.getElementById('stage29-shop-guide');
    if(!a||!b)return;
    const active=!off();
    const visit=active?g?.indoor:null;
    const shop=active?g?.retailVisit:null;
    a.classList.toggle('hidden',!visit);b.classList.toggle('hidden',!shop);
    if(visit){
      const lift=visit.scene?.lift;
      const avatar=g?.avatar||{x:0,z:0};
      const d=lift?Math.round(Math.hypot(avatar.x-lift.x,avatar.z-lift.z)):0;
      if(visit.liftRide){
        const r=visit.liftRide;
        a.textContent='מעלית בתנועה · יעד '+(r.destination>visit.scene.maxFloor?'גג':'קומה '+r.destination)+' · המתן לפתיחת הדלתות';
      }else if(visit.stairTrip){
        a.textContent='בחדר מדרגות · ניתן להמשיך ברגל או לחזור ללובי';
      }else{
        const total=visit.scene?.maxFloor??0;
        a.textContent='קומה '+(visit.floor===0?'לובי':visit.floor)+' מתוך '+total+
          ' · '+(d<=3?'L ללוח המעלית':'המעלית במרחק '+d+' מ׳')+
          ' · R/B למדרגות';
      }
    }
    if(shop){
      const v=shop.venue||{};
      const c=shop.scene?.counter;
      const av=g?.avatar||{x:0,z:0};
      const d=c?Math.round(Math.hypot(av.x-c.x,av.z-c.z)):0;
      b.textContent=(v.label||'חנות')+' · דלפק '+d+' מ׳ · '+
        (v.bank44?'U לפעולה ליד הדלפק':'O לקנייה ליד הדלפק')+
        ' · היציאה דרך דלת הכניסה';
    }
  }
  function install(){
    if(installed)return;
    const oldInterior=H.polishInterior461;
    const oldRetail=H.makeRetailScene;
    if(typeof oldInterior!=='function'||typeof oldRetail!=='function'||!H.stage15Interior||!H.stage14Lighting)
      throw Error('Stage29 must load after Stage15/17 interior and retail pipeline');
    H.polishInterior461=function stage29Interior(scene,plan,floor){
      const built=oldInterior(scene,plan,floor);
      return off()?built:modifyInterior(built,plan,floor);
    };
    H.makeRetailScene=function stage29Retail(unit){
      const built=oldRetail(unit);
      return off()?built:modifyRetail(built,unit);
    };
    installed=true;
  }
  H.stage29InteriorPolish={off,install,modifyInterior,modifyRetail,updateHUD,
    stats,get installed(){return installed;}};
  install();
})(Heatline);
