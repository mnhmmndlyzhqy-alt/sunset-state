/* SUNSET STATE quality programme 15/35 (S01-IN-03).
 * Actual indoor furniture collision and useful E interactions.
 * Wrap the existing interior scene builder, never the outdoor world builder.
 * Keep door, stair and lift traversal clear; create at most 12 bounded colliders
 * per visited floor, only for visible physical furniture absent from the solids.
 * A/B: ?stage15InteriorsOff=1 or __SUNSET_STAGE15_INTERIORS_OFF=true.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const MAX_ADDITIONAL=12,MAX_INTERACTIONS=18;
  const off=()=>globalThis.__SUNSET_STAGE15_INTERIORS_OFF===true||
    (typeof location!=='undefined'&&new URLSearchParams(location.search).has('stage15InteriorsOff'));
  const good=n=>typeof n==='number'&&Number.isFinite(n);
  function nearestSurface(x,z,c){
    return Math.hypot(Math.max(0,Math.abs(x-c.x)-c.hw),Math.max(0,Math.abs(z-c.z)-c.hd));
  }
  function overlaps(a,b,pad=0){return Math.abs(a.x-b.x)<a.hw+b.hw+pad&&
    Math.abs(a.z-b.z)<a.hd+b.hd+pad;}
  function insideBounds(c,bd){return c.x-c.hw>bd.xmin+.09&&c.x+c.hw<bd.xmax-.09&&
    c.z-c.hd>bd.zmin+.09&&c.z+c.hd<bd.zmax-.09;}
  function furnitureType(b,floorBase){
    if(![b.x,b.z,b.y,b.w,b.h,b.d].every(good)||b.layer!==4||b.stage14Fixture)return null;
    const bottom=b.y-floorBase-b.h*.5;
    if(bottom<-.15||bottom>.46||b.y-floorBase+b.h*.5>2.45)return null;
    if(b.stage13NarrowKind==='indoor-seat')return 'bench';
    if(b.shape==='sphere'||b.shape==='cone'||b.material==='glass'||b.material==='light_emissive')return null;
    if(b.shape==='rounded_smooth'&&b.w>=1.55&&b.w<=3.05&&b.d>=.66&&b.d<=2.35&&b.h>=.46&&b.h<=1.35)
      return b.d>1.50?'seat':'table';
    if(b.material==='wood'&&b.w>=.78&&b.w<=3.1&&b.d>=.65&&b.d<=1.60&&b.h>=.62&&b.h<=1.4)
      return 'table';
    // This includes real floor-standing pot bodies, but not foliage/leaves.
    if(b.shape==='cylinder'&&b.material==='concrete'&&b.w>=.53&&b.w<=.95&&
       b.d>=.53&&b.d<=.95&&b.h>=.48&&b.h<=.84)return 'planter';
    return null;
  }
  const titles={bench:'ספסל',seat:'ספה',table:'שולחן',planter:'עציץ'};
  function guarded(scene,c,extra=.0){
    if(!insideBounds(c,scene.bounds))return true;
    const keep=(point,r)=>point&&good(point.x)&&good(point.z)&&nearestSurface(point.x,point.z,c)<r+extra;
    if(keep(scene.entrance,2.10)||keep(scene.lift,2.45))return true;
    for(const door of scene.doors||[])if(keep(door,1.55))return true;
    for(const p of scene.pickups||[])if(keep(p,.95))return true;
    for(const a of scene.activities||[])if(keep(a,.90))return true;
    const stairs=scene.stairs;
    if(stairs&&(keep(stairs.up,1.35)||keep(stairs.down,1.35)))return true;
    // Preserve the entire primary entrance-to-lift route, not just the endpoints.
    if(scene.entrance&&scene.lift){
      const dx=scene.lift.x-scene.entrance.x,dz=scene.lift.z-scene.entrance.z,
        len=Math.hypot(dx,dz),steps=Math.ceil(len/.65);
      for(let i=0;i<=steps;i++){
        const t=i/Math.max(1,steps),x=scene.entrance.x+t*dx,z=scene.entrance.z+t*dz;
        if(nearestSurface(x,z,c)<1.02+extra)return true;
      }
    }
    return false;
  }
  function collisionCells(b,plan,scene){
    const base={x:b.x,z:b.z,hw:Math.max(.18,b.w*.5-.035),hd:Math.max(.18,b.d*.5-.035)};
    if(scene.stage07Aligned&&good(scene.stage07Yaw)&&Math.abs(scene.stage07Yaw)>.001){
      const a=scene.stage07Yaw,ct=Math.cos(a),st=Math.sin(a),cx=plan.outerShell.x,cz=plan.outerShell.z,
        dx=b.x-cx,dz=b.z-cz;
      const original={x:cx+ct*dx+st*dz,z:cz-st*dx+ct*dz,hw:base.hw,hd:base.hd};
      if(typeof H.stage07Alignment?.voxelize==='function')
        return H.stage07Alignment.voxelize(original,cx,cz,a,.50).map(v=>({x:v.x,z:v.z,hw:v.hw,hd:v.hd}));
      return []; // Never create a misaligned invisible barrier.
    }
    return [base];
  }
  function enhance(scene,plan,floor){
    if(!scene||scene.stage15Interior||!Array.isArray(scene.boxes)||!Array.isArray(scene.solids)||!scene.bounds)return scene;
    const baseline=scene.solids.length,doorCount=scene.doors?.length||0,boxCount=scene.boxes.length,
      floorBase=floor*plan.floorHeight;
    const props=[],added=[],seen=[];
    const candidates=scene.boxes.map((b,i)=>({b,i,kind:furnitureType(b,floorBase)})).filter(t=>t.kind)
      .sort((a,b)=>priority(a)-priority(b)||a.i-b.i);
    function priority(t){return t.b.stage13NarrowKind==='indoor-seat'?0:
      t.kind==='seat'||t.kind==='bench'?1:t.kind==='table'?2:3;}
    // Prefer existing collision bodies, including those supplied by older game
    // systems. This gives their furniture E interactions without duplicate walls.
    for(const {b,i,kind} of candidates){
      if(props.length>=MAX_INTERACTIONS)break;
      const shape={x:b.x,z:b.z,hw:Math.max(.18,b.w*.5-.05),hd:Math.max(.18,b.d*.5-.05)};
      const existing=scene.solids.find(s=>Math.abs(s.x-b.x)<.30&&Math.abs(s.z-b.z)<.30&&
        Math.abs(s.hw-shape.hw)<.40&&Math.abs(s.hd-shape.hd)<.40);
      if(!existing||guarded(scene,shape,.05))continue;
      if(seen.some(v=>Math.hypot(v.x-b.x,v.z-b.z)<.75))continue;
      props.push({id:'old-'+i,kind,label:titles[kind],x:b.x,z:b.z,hw:existing.hw,hd:existing.hd,
        collider:existing,source:'existing'});seen.push(b);
    }
    // Only add colliders where a tangible object currently has no collision,
    // never for a rug, lamp, picture, floating decoration, door or stair railing.
    for(const {b,i,kind}of candidates){
      if(added.length>=MAX_ADDITIONAL)break;
      const cells=collisionCells(b,plan,scene);
      if(!cells.length||cells.length>20||added.length+cells.length>MAX_ADDITIONAL)continue;
      if(cells.some(c=>guarded(scene,c)||scene.solids.some(s=>overlaps(c,s,.055))||
                      added.some(s=>overlaps(c,s,.10))))continue;
      if(cells.some(c=>seen.some(s=>Math.hypot(c.x-s.x,c.z-s.z)<.65)))continue;
      for(const c of cells){
        c.stage15Furniture=true;c.stage15Kind=kind;c.stage15SourceIndex=i;
        scene.solids.push(c);added.push(c);
      }
      if(props.length<MAX_INTERACTIONS){props.push({id:'new-'+i,kind,label:titles[kind],x:b.x,z:b.z,
        hw:b.w*.5,hd:b.d*.5,collider:cells[0],source:'new'});seen.push(b);}
    }
    // Compact buildings may be too narrow to place a seat or table without
    // blocking the walkable path. Their already-rendered wall art is an honest
    // zero-collision inspection target (no invented furniture or ghost wall).
    function vantage(v){
      const radius=.39,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dz]of dirs){
        const x=v.x+dx*(v.hw+.72),z=v.z+dz*(v.hd+.72);
        if(x<=scene.bounds.xmin+radius||x>=scene.bounds.xmax-radius||
           z<=scene.bounds.zmin+radius||z>=scene.bounds.zmax-radius)continue;
        if(Math.hypot(x-scene.entrance.x,z-scene.entrance.z)<=2.5||
           Math.hypot(x-scene.lift.x,z-scene.lift.z)<=2.7)continue;
        if(scene.solids.every(s=>nearestSurface(x,z,s)>=radius))return {x,z};
      }
      return null;
    }
    let artFallback=0;
    if(!props.some(v=>vantage(v))){
      for(const b of scene.boxes){
        if(b.layer!==4||b.material!=='paint'||b.h<1.0||b.h>2.4||
           !((b.w<.20&&b.d>.65&&b.d<2.2)||(b.d<.20&&b.w>.65&&b.w<2.2)))continue;
        const v={id:'art-'+scene.boxes.indexOf(b),kind:'art',label:'תמונה על הקיר',x:b.x,z:b.z,
          hw:Math.max(.06,b.w*.5),hd:Math.max(.06,b.d*.5),collider:null,source:'wall-art'};
        if(vantage(v)){props.push(v);artFallback++;break;}
      }
    }
    scene.stage15Interactions=props;
    scene.stage15Interior={floor,buildingId:plan.buildingId,collidersAdded:added.length,
      interactionPoints:props.length,wallArtInteractions:artFallback,
      existingColliders:baseline,finalColliders:scene.solids.length,
      originalVisualMeshes:boxCount,originalDoorCount:doorCount,
      integratedWithStage14:!!scene.stage14Lighting,realGpuVerified:false};
    if(scene.doors.length!==doorCount||scene.boxes.length!==boxCount||
       scene.solids.length!==baseline+added.length)throw Error('Stage15 changed interior system unexpectedly');
    return scene;
  }
  function tryInteract(game){
    if(off()||!game?.indoor||game.indoor.liftRide||game.indoor.stairTrip)return false;
    const scene=game.indoor.scene,avatar=game.avatar;
    if(!scene?.stage15Interactions?.length||!avatar)return false;
    // Doors, exits and lift stations retain their established E precedence.
    if(nearestSurface(avatar.x,avatar.z,{x:scene.entrance.x,z:scene.entrance.z,hw:0,hd:0})<2.4||
       nearestSurface(avatar.x,avatar.z,{x:scene.lift.x,z:scene.lift.z,hw:0,hd:0})<2.65)return false;
    let best=null,bestDist=1.13;
    for(const v of scene.stage15Interactions){
      const dist=nearestSurface(avatar.x,avatar.z,v);
      if(dist<bestDist){best=v;bestDist=dist;}
    }
    if(!best)return false;
    const used=scene.stage15Used||(scene.stage15Used=new Set());
    const alreadyRested=game.stage15RestedFurniture||(game.stage15RestedFurniture=new Set());
    const restKey=String(game.indoor.portalId)+':'+String(game.indoor.floor)+':'+best.id;
    const first=!used.has(best.id)&&!alreadyRested.has(restKey);used.add(best.id);
    if(best.kind==='bench'||best.kind==='seat'){
      // Physical rest: one small recovery per furniture item per active game session,
      // even if the nine-scene cache evicts and rebuilds this floor.
      if(first){game.footHealth=Math.min(100,(game.footHealth??100)+4);alreadyRested.add(restKey);}
      game.showInfo(first?'נחת ליד '+best.label+' · התאוששות קלה':'בדקת שוב את '+best.label,2.8);
    }else if(best.kind==='table')game.showInfo('בדקת את שולחן העבודה · אפשר להמשיך לחקור את החדר',2.8);
    else if(best.kind==='art')game.showInfo('התבוננת בתמונה שעל הקיר ובפרטי העיצוב של החדר',2.8);
    else game.showInfo('בדקת את העציץ והצמחייה של החדר',2.8);
    if(typeof game.updateHUD==='function')game.updateHUD();
    return true;
  }
  function install(){
    if(api.installed)return;
    const previous=H.polishInterior461;
    if(typeof previous!=='function')throw Error('Stage15 requires Stage14 and original interior builder');
    H.polishInterior461=function stage15Polish(scene,plan,floor){
      const built=previous(scene,plan,floor);
      return off()?built:enhance(built,plan,floor);
    };
    api.installed=true;
  }
  const api={off,install,enhance,tryInteract,nearestSurface,guarded,MAX_ADDITIONAL,MAX_INTERACTIONS,
    get installed(){return installedFlag;},set installed(v){installedFlag=v;}};
  let installedFlag=false;
  H.stage15Interior=api;install();
})(Heatline);
