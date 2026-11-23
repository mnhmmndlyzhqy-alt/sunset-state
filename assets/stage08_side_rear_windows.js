/* SUNSET STATE — stage 08 of 35: CITY20 side and rear facade windows.
 * Adds restrained architectural glazing on the three facades omitted by
 * CITY20 stage09's south-oriented window run. Designed against the actual
 * Stage05/06 portals and Stage07 rotated structure, rather than the original
 * axis-aligned reference footprint. The building mass, real doors, collision,
 * interaction, save state and transport systems are NEVER changed.
 * Window panes are decorative glass on existing solid walls, not holes or
 * breakable physics glass (breakable glass is tracked separately at 16/35).
 * A/B: ?stage08WindowsOff=1 or __SUNSET_STAGE08_WINDOWS_OFF=true.
 */
var Heatline = globalThis.Heatline || {};
(function(H){'use strict';
 const previous=H.finishReferenceBuildings469;
 if(typeof previous!=='function'||!H.stage07Alignment||!H.stage05City20)
   throw Error('Stage08/35 requires the accumulated Stage05-07 world pipeline');
 const off=()=>globalThis.__SUNSET_STAGE08_WINDOWS_OFF===true||
   H.stage05City20?.off?.()===true||H.stage06Orientation?.off?.()===true||
   (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
    new URLSearchParams(location.search).has('stage08WindowsOff'));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const FACE={north:{axis:'z',sign:-1},east:{axis:'x',sign:1},west:{axis:'x',sign:-1}};
 const ROT=(x,z,a)=>({x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)});
 const _count=(obj,key,n=1)=>{obj[key]=(obj[key]||0)+n;};
 function tierAt(w,s,worldY,halfHeight){
   if(s.kind!=='tower')return {w:s.width,d:s.depth};
   const tier=w.boxes.find(b=>b.city20Stage06Owner===s.id&&b.city20Stage06Kind==='massing'&&
     worldY-halfHeight>b.y-b.h*.5+.20&&worldY+halfHeight<b.y+b.h*.5-.20);
   return tier?{w:tier.w,d:tier.d}:null;
 }
 function facePoint(s,face,width,depth,along,outward){
   const f=FACE[face];const localX=f.axis==='x'?f.sign*(width*.5+outward):along;
   const localZ=f.axis==='z'?f.sign*(depth*.5+outward):along;
   const r=ROT(localX,localZ,s.stage07Yaw||0);
   return {x:s.x+r.x,z:s.z+r.z};
 }
 function portalFace(s,p){
   if(!p)return null;
   const v=ROT(p.x-s.x,p.z-s.z,-(s.stage07Yaw||0));
   const dx=Math.abs(v.x)-s.width*.5,dz=Math.abs(v.z)-s.depth*.5;
   if(dx>dz)return {face:v.x>0?'east':'west',along:v.z};
   return {face:v.z>0?'south':'north',along:v.x};
 }
 function mesh(w,s,face,row,bay,kind,along,worldY,span,h,depthOut,width,depth,color,material,range,glow=0){
   if(![along,worldY,span,h,depthOut,width,depth].every(Number.isFinite)||
      Math.min(span,h,depthOut) <=0)throw Error('Stage08/35 invalid facade geometry '+s.id);
   const f=FACE[face],p=facePoint(s,face,width,depth,along,depthOut);
   const b=H.box(p.x,worldY,p.z,f.axis==='x'?depthOut:span,h,f.axis==='x'?span:depthOut,
     color,s.stage07Yaw||0,4,glow);
   b.material=material;b.shape='reference_slab469';
   b.visibilityCap=range;b.lodMax=range;
   b.stage08Facade=true;b.stage08Owner=s.id;b.stage08Face=face;
   b.stage08Row=row;b.stage08Bay=bay;b.stage08Part=kind;
   b.stage08Yaw=s.stage07Yaw||0;b.stage08LocalAlong=along;
   w.boxes.push(b);return b;
 }
 function enhance(w){
   if(w.stage08FacadeStats)return w.stage08FacadeStats;
   const structures=w.city20DistrictBuildings;
   if(!Array.isArray(structures)||structures.length!==130||
      !w.stage05City20Stats||!w.stage06OrientationStats)
     throw Error('Stage08/35 requires active Stage05/06/07 CITY20 buildings');
   const before={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,
      portals:w.entrancePortals.length,doors:w.stage42Doors.length,
      active:w.entrancePortals.filter(p=>p.interiorReady).length,
      rotated:structures.filter(s=>s.streetAligned).length};
   const st={stage:8,issue:'S01-BL-05',buildingCount:0,windowBays:0,
      glazing:0,trim:0,sills:0,mullions:0,doorwayBaysSkipped:0,
      setbackTierRowsSkipped:0,sideWindows:0,rearWindows:0,
      rotatedBuildingsCovered:0,faces:{north:0,east:0,west:0},
      byKind:{},visualMeshesAdded:0,collisionsAdded:0,
      breaksGlass:false,actualOpeningsCut:false,gpu1080pVerified:false};
   const parts=(w,s,face,row,bay,along,y,pw,ph,width,depth,range,lit)=>{
     const surround=mesh(w,s,face,row,bay,'reveal',along,y,pw+.24,ph+.22,.090,
       width,depth,'#283c43','metal',range);
     const glassColor=lit?'#a9aaa0':(s.kind==='resort'?'#688e9c':'#577c88');
     const pane=mesh(w,s,face,row,bay,'glass',along,y,pw,ph,.182,
       width,depth,glassColor,'glass',range,lit?.035:0);
     const sill=mesh(w,s,face,row,bay,'sill',along,y-ph*.5-.105,pw+.25,.12,.238,
       width,depth,s.kind==='villa'||s.kind==='resort'?'#c6baaa':'#a1a6a3','anodized471',range);
     st.glazing++;st.trim++;st.sills++;st.windowBays++;
     if(pw>1.42 && (s.kind==='tower'||s.kind==='midrise'||bay%2===0)){
       mesh(w,s,face,row,bay,'mullion',along,y,.075,ph+.06,.242,
         width,depth,'#75888c','anodized471',range);st.mullions++;
     }
     // Both panes and frame are outside the wall plane; none can create
     // an invisible obstacle at an entrance, because no solids are inserted.
     return [surround,pane,sill];
   };
   for(const s of structures){
     const plan=w.structuralPlans.find(p=>p.outerShell.x===s.x&&p.outerShell.z===s.z);
     const portal=w.entrancePortals[s.city20Stage05PortalId];
     if(!plan||!portal||portal.interiorReady!==true)throw Error('Stage08 missing active site '+s.id);
     const door=portalFace(s,portal),floors=plan.floorCount;
     const rows=s.kind==='tower'?clamp(Math.round(s.height/8.7),6,10):
       Math.min(3,Math.max(1,floors));
     const range=s.kind==='tower'?1130:s.kind==='midrise'||s.kind==='civic'?820:
       s.kind==='warehouse'?630:520;
     const startBays=st.windowBays;
     for(let row=0;row<rows;row++){
       const y=s.baseY+(rows===1?2.40:2.40+(s.height-5.05)*row/(rows-1));
       const ph=s.kind==='tower'?1.58:s.kind==='warehouse'?1.38:1.48;
       const body=tierAt(w,s,y,ph*.5+.12);
       if(!body){st.setbackTierRowsSkipped++;continue;}
       for(const face of Object.keys(FACE)){
         const span=FACE[face].axis==='z'?body.w:body.d;
         const entranceSide=door?.face===face;
         const cols=entranceSide&&span>=9.4?3:(span>=15.3?3:2);
         const border=clamp(span*.17,1.45,2.95);
         const travel=span-2*border;
         const pw=clamp(span/(cols*2.5),.97,1.82);
         if(travel<=0||travel/(cols-1)<=pw+.30)continue;
         for(let bay=0;bay<cols;bay++){
           const along=-travel*.5+travel*bay/(cols-1);
           // Protect the literal doorway (including its jambs + approach):
           // the lower row's glass must never be a false doorway obstacle.
           if(row===0&&entranceSide&&Math.abs(along-door.along)<
             (portal.width||3.75)*.5+pw*.5+.30){st.doorwayBaysSkipped++;continue;}
           const lit=((s.id.length*19+row*17+bay*7+(face==='north'?1:face==='east'?3:5))%9)<2;
           parts(w,s,face,row,bay,along,y,pw,ph,body.w,body.d,range,lit);
           st.faces[face]++;
           if(face==='north')st.rearWindows++;else st.sideWindows++;
         }
       }
     }
     if(st.windowBays===startBays)throw Error('Stage08 facade has no valid bays '+s.id);
     _count(st.byKind,s.kind,st.windowBays-startBays);
     st.buildingCount++;
     if(s.streetAligned)st.rotatedBuildingsCovered++;
   }
   st.visualMeshesAdded=w.boxes.length-before.boxes;
   if(w.solids.length!==before.solids||w.roads461.length!==before.roads||
      w.entrancePortals.length!==before.portals||w.stage42Doors.length!==before.doors||
      w.entrancePortals.filter(p=>p.interiorReady).length!==before.active||
      structures.filter(s=>s.streetAligned).length!==before.rotated)
     throw Error('Stage08 changed gameplay collision, building entry or street layout');
   w.stage08FacadeStats=st;return st;
 }
 H.stage08SideRearWindows={enhance,off,facePoint,portalFace,tierAt};
 H.finishReferenceBuildings469=function stage08Final(w){const result=previous(w);if(!off())enhance(w);return result;};
})(Heatline);
