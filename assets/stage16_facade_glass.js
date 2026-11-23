/* SUNSET STATE — Stage 16/35 (S01-GL-01): breakable selected CITY20 glazing.
 * Reuse the original bullet, explosion and vehicle-damage pipelines. Convert a
 * bounded, balanced selection of Stage08 glass meshes into dark, static backing
 * and dynamically rendered glass that can crack and vanish on damage.  Frames,
 * mullions, sills, walls and doors remain intact: NO structural wall cut is
 * claimed. All references are world-space after Stage07 building rotations.
 * The 864-pane cap limits glass impact candidates and dynamic draw cost.
 * Disable for exact Stage15 comparison: ?stage16GlassOff=1 or
 * __SUNSET_STAGE16_GLASS_OFF=true / STAGE16_GLASS_OFF=1 in CPU tests.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
  const MAX=864,FACE=['north','east','west'];
  const off=()=>globalThis.__SUNSET_STAGE16_GLASS_OFF===true||
    H.stage08SideRearWindows?.off?.()===true||
    (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
      new URLSearchParams(location.search).has('stage16GlassOff'));
  const prevWorld=H.finishReferenceBuildings469;
  if(typeof prevWorld!=='function'||typeof H.stage08SideRearWindows?.enhance!=='function')
    throw Error('Stage16 requires original Stage08 CITY20 facade world');
  const good=v=>Number.isFinite(v);
  function choose(glazing){
    const grouped=new Map();
    for(const b of glazing){
      const key=b.stage08Owner+'|'+b.stage08Face;
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(b);
    }
    const selected=[];
    const arrays=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,items])=>{
      items.sort((a,b)=>a.stage08Row-b.stage08Row||a.stage08Bay-b.stage08Bay);
      return items;
    });
    // Guarantee one reachable-looking facade pane per building per eligible face.
    for(const arr of arrays)if(arr.length)selected.push(arr.shift());
    // Round-robin across all facades, preferring lower floor rows first and
    // distributing glass so no single tower consumes the entire budget.
    for(let level=0;selected.length<MAX;level++){
      let added=0;
      for(const arr of arrays){
        if(selected.length>=MAX)break;
        if(arr.length){selected.push(arr.shift());added++;}
      }
      if(!added)break;
    }
    return selected;
  }
  function enhance(w){
    if(w.stage16GlassStats)return w.stage16GlassStats;
    if(off())return null;
    const glazing=w.boxes.filter(b=>b.stage08Part==='glass');
    if(glazing.length!==1586||w.stage08FacadeStats?.windowBays!==1586||
       w.city20DistrictBuildings?.length!==130)
      throw Error('Stage16 unexpected Stage08 facade baseline');
    const before={boxes:w.boxes.length,roads:w.roads461.length,solids:w.solids.length,
      props:w.propSolids.length,portals:w.entrancePortals.length,panes:w.glassPanels.length,
      ready:w.entrancePortals.filter(p=>p.interiorReady).length};
    const selected=choose(glazing),touched=new Set(),rotated=new Set(),faces={north:0,east:0,west:0};
    const st={stage:16,issue:'S01-GL-01',sourceStage08Windows:glazing.length,
      selectedGlass:selected.length,legacyGlass:before.panes,allGlass:0,
      untouchedStaticGlass:glazing.length-selected.length,facadesCovered:0,
      buildingsCovered:0,rotatedBuildingsCovered:0,collisionBodiesAdded:0,
      originalWallsCut:false,glassParticlesOnDemand:true,
      maxShaderGlassRadius:210,gpuVerified:false,real1080pFpsVerified:false,
      faces,shotHitAlgorithm:'local-oriented-AABB',carHitAlgorithm:'local-plane-sweep'};
    for(const b of selected){
      const yaw=b.stage08Yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
      const normal=b.stage08Face==='north'?{x:0,z:-1}:
        b.stage08Face==='east'?{x:1,z:0}:{x:-1,z:0};
      const nx=c*normal.x-s*normal.z,nz=s*normal.x+c*normal.z;
      // Dynamic pane front edge sits just outward of the original static mesh,
      // preventing depth fighting and allowing it to vanish on damage.
      const x=b.x+nx*.142,z=b.z+nz*.142;
      const axis=b.stage08Face==='north'?'z':'x';
      if(![x,b.y,z,b.w,b.h,b.d,yaw,nx,nz].every(good))
        throw Error('Stage16 nonfinite glass geometry '+b.stage08Owner);
      const id=w.glassPanels.length;
      w.glassPane(x,b.y,z,b.w,b.h,b.d,b.color,axis);
      const p=w.glassPanels[id];
      p.stage16Facade=true;p.stage16Owner=b.stage08Owner;p.stage16Face=b.stage08Face;
      p.stage16Row=b.stage08Row;p.stage16Bay=b.stage08Bay;
      p.stage16Yaw=yaw;p.stage16Co=c;p.stage16Si=s;
      p.stage16NormalX=nx;p.stage16NormalZ=nz;
      p.stage16Original=b;p.stage16Visibility=210;
      // Retain exact original box, shape, dimensions, id and collision state.
      // It now represents the dark opaque backing behind a fragile surface.
      // Real openings are a separate future structural task, not faked here.
      b.stage16OriginalMaterial=b.material;b.stage16OriginalColor=b.color;
      b.stage16Backing=true;b.stage16PaneId=id;
      b.material='masonry';b.color='#223740';b.glow=0;
      touched.add(b.stage08Owner);faces[b.stage08Face]++;
      if(Math.abs(yaw)>.001)rotated.add(b.stage08Owner);
    }
    st.buildingsCovered=touched.size;
    st.rotatedBuildingsCovered=rotated.size;
    st.facadesCovered=Object.values(faces).reduce((a,b)=>a+b,0);
    st.allGlass=w.glassPanels.length;
    if(selected.length!==MAX||touched.size!==130||before.boxes!==w.boxes.length||
       w.solids.length!==before.solids||w.propSolids.length!==before.props||
       w.roads461.length!==before.roads||w.entrancePortals.length!==before.portals||
       w.entrancePortals.filter(p=>p.interiorReady).length!==before.ready||
       w.glassPanels.length!==before.panes+MAX)
      throw Error('Stage16 preservation invariant broken');
    w.stage16GlassStats=st;return st;
  }
  H.stage16Glass={off,enhance,choose,MAX};
  H.finishReferenceBuildings469=function stage16GlassWorld(w){
    const r=prevWorld(w);if(!off())enhance(w);return r;
  };
  // Stage16 panes are regular breakable game panels, but unlike older
  // unrotated shop panes must preserve the true Stage07 yaw while rendering.
  if(typeof H.paneGeometry==='function'){
    const previousDraw=H.paneGeometry;
    H.paneGeometry=function stage16PaneGeometry(p,out){
      if(!p.stage16Facade)return previousDraw(p,out);
      if(p.shattered)return;
      const glass=H.box(p.x,p.y,p.z,p.w,p.h,p.d,p.hue,p.stage16Yaw,5,.13);
      glass.material='translucent_glass';glass.stage16LiveGlass=true;
      glass.visibilityCap=p.stage16Visibility;
      out.push(glass);
      if(p.chips<=0)return;
      // Two slim intersecting fracture lines drawn in the real pane plane.
      // Limited to four pieces per cracked pane, never an unbounded mesh storm.
      const isNorth=p.stage16Face==='north';
      const long=isNorth?p.w:p.d;
      const xAxis=isNorth?{x:p.stage16Co,z:p.stage16Si}:{x:-p.stage16Si,z:p.stage16Co};
      for(const [u,height,span] of [[-.25,0,.48],[.24,.19,.37],[0,-.21,.34]]){
        const x=p.x+xAxis.x*u,z=p.z+xAxis.z*u;
        const crack=H.box(x+p.stage16NormalX*.044,p.y+height,z+p.stage16NormalZ*.044,
          isNorth?Math.min(long,span):.025,.032,isNorth?.025:Math.min(long,span),
          '#d8eef1',p.stage16Yaw,6,.35);
        crack.material='light_emissive';crack.stage16Fracture=true;
        out.push(crack);
      }
    };
  }
})(Heatline);
