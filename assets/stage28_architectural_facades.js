/* SUNSET STATE — 28 / 35: cumulative urban facade finish.
 * Genuine world-space mesh details on the existing 130 CITY20 buildings and
 * the 84 legacy structures; no replacement of buildings, collision, portals,
 * road/shore geometry, materials registry, or the existing breakable glass.
 * All mapped details follow Stage07 building yaw and Stage06 tower setbacks.
 * Reversible CPU/browser A/B: ?stage28FacadesOff=1 or STAGE28_FACADES_OFF=1.
 * Performance: only shared box geometry/materials, strict visibility caps;
 * native hardware GPU/50fps certification intentionally NOT claimed.
 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
 const beforeFinish=H.finishReferenceBuildings469;
 if(typeof beforeFinish!=='function'||!H.stage08SideRearWindows?.enhance||!H.stage27RoadPolish)
   throw Error('Stage28 requires complete Stage27 buildings, road and window pipelines');
 const disable=()=>globalThis.__SUNSET_STAGE28_FACADES_OFF===true||
   H.stage08SideRearWindows.off()||
   (typeof location!=='undefined'&&typeof URLSearchParams==='function'&&
    new URLSearchParams(location.search).has('stage28FacadesOff'));
 const palettes={
  villa:['#d9c7ae','#a2a69b','#8c8e84'],resort:['#e1d7c2','#b5c2bc','#819ca0'],
  warehouse:['#b8b7ad','#899998','#536a6d'],service:['#b1baba','#8d9e9a','#566a74'],
  civic:['#ddd0b9','#b4aea1','#798b8c'],midrise:['#c6c4b8','#a4b8b7','#586b72'],
  tower:['#b1c7c7','#8ea9ad','#516c78']};
 const legacyTone={heritage:'#cbbda5',residential:'#b6b7aa',brick:'#b8a58d',hotel:'#b7b7aa',
  glass:'#8ea6aa',tech:'#869fa4',office:'#a5b3af',civic:'#bcb5a4'};
 const rot=(x,z,a)=>({x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)});
 const dir={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
 const stable=(s)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
 const normal=(face,yaw)=>{const d=dir[face];return rot(d[0],d[1],yaw);};
 const faceCenter=(s,face,along,outward,w,d)=>{
   const loc=face==='north'?{x:along,z:-d*.5-outward}:
     face==='south'?{x:along,z:d*.5+outward}:
     face==='east'?{x:w*.5+outward,z:along}:{x:-w*.5-outward,z:along};
   const p=rot(loc.x,loc.z,s.stage07Yaw||0);return {x:s.x+p.x,z:s.z+p.z};
 };
 function run(w){
   if(w.stage28FacadeStats)return w.stage28FacadeStats;
   if(disable())return null;
   const sites=w.city20DistrictBuildings;
   if(!Array.isArray(sites)||sites.length!==130||!w.stage08FacadeStats||
      !w.stage07AlignmentStats||!w.city20Stage06Stats||!w.stage27RoadPolishStats && !H.stage27RoadPolish?.stats?.())
     throw Error('Stage28 invalid cumulative scene baseline');
   const old={boxes:w.boxes.length,roads:w.roads461.length,solids:w.solids.length,
     propSolids:w.propSolids.length,portals:w.entrancePortals.length,
     ready:w.entrancePortals.filter(p=>p.interiorReady).length,
     buildings:w.buildings.length,glass:w.glassPanels.length,
     stage08Glass:w.boxes.filter(b=>b.stage08Part==='glass').length};
   const report={stage:28,kind:'facade_geometry_polish',mappedSites:0,legacySites:0,
     kinds:{},roofContours:0,verticalReveals:0,windowSunshades:0,
     entranceTransoms:0,industrialRoofVents:0,towerTierFins:0,
     legacyRoofDetail:0,streetAlignedSites:0,glazingPreserved:0,
     taggedMeshes:0,newGeometry:0,changedColliders:0,
     allNewMeshesDistanceCulled:true,materialsAreExisting:true,
     newTextures:0,gameplayChanges:0,gpuVisualVerified:false,native1080p50fpsVerified:false};
   const parts=[];
   const tag=(b,owner,kind,cap,face)=>{
     b.material=b.material||'concrete';b.shape='reference_slab469';
     b.visibilityCap=cap;b.lodMax=cap;
     b.stage28Facade=true;b.stage28Owner=owner;b.stage28Kind=kind;
     b.stage28Face=face||'roof';
     if(![b.x,b.y,b.z,b.w,b.h,b.d,b.yaw].every(Number.isFinite)||
         Math.min(b.w,b.h,b.d)<=.008)throw Error('Stage28 invalid mesh '+owner+':'+kind);
     w.boxes.push(b);parts.push(b);report.taggedMeshes++;
     if(kind==='roof_fascia'||kind==='cornice'||kind==='tower_belt')report.roofContours++;
     if(kind==='quoin'||kind==='pilaster'||kind==='tower_fin'||kind==='downspout')report.verticalReveals++;
     if(kind==='window_shade')report.windowSunshades++;
     if(kind==='transom')report.entranceTransoms++;
     if(kind==='industrial_vent'||kind==='vent_louver')report.industrialRoofVents++;
     if(kind==='tower_fin')report.towerTierFins++;
     if(kind==='legacy_cornice')report.legacyRoofDetail++;
     return b;
   };
   function boxAt(s,kind,localX,y,localZ,ww,hh,dd,color,material,cap){
     const t=rot(localX,localZ,s.stage07Yaw||0);
     const b=H.box(s.x+t.x,y,s.z+t.z,ww,hh,dd,color,s.stage07Yaw||0,4,0);
     b.material=material;return tag(b,s.id,kind,cap);
   }
   function surface(s,kind,face,along,y,span,hh,thick,dist,ww,dd,color,material,cap){
     const p=faceCenter(s,face,along,dist,ww,dd);
     const horizontal=face==='north'||face==='south';
     const b=H.box(p.x,y,p.z,horizontal?span:thick,hh,horizontal?thick:span,
       color,s.stage07Yaw||0,4,0);
     b.material=material;return tag(b,s.id,kind,cap,face);
   }
   // Meshes must never become an invisible obstacle; these are visual skins.
   const priorGlass=new Map();
   for(const pane of w.boxes){if(pane.stage08Part!=='glass')continue;
     const arr=priorGlass.get(pane.stage08Owner)||[];arr.push(pane);priorGlass.set(pane.stage08Owner,arr);}
   const doorHeaders=new Map(w.boxes.filter(b=>b.stage05Kind==='door-header')
     .map(b=>[b.stage05Owner,b.y-3.32]));
   // All window hoods are built from the *existing* positioned facade panes,
   // so their orientation matches the completed Stage07 rotation and Stage08 bays.
   function sunshades(s,seed){
     const arr=priorGlass.get(s.id)||[];const byFace=new Map();
     for(const p of arr){if(p.stage08Row!==0)continue;
       if(!byFace.has(p.stage08Face))byFace.set(p.stage08Face,[]);
       byFace.get(p.stage08Face).push(p);}
     const target=s.kind==='tower'?6:(s.kind==='civic'||s.kind==='midrise'?4:2);
     let n=0;
     for(const face of ['north','east','west']){
       if(n>=target)break;const panes=byFace.get(face)||[];
       if(!panes.length)continue;
       const p=panes[(seed+face.length)%panes.length];const norm=normal(face,s.stage07Yaw||0);
       const width=face==='north'?p.w:p.d;
       const b=H.box(p.x+norm.x*.10,p.y+p.h*.5+.13,p.z+norm.z*.10,
         face==='north'?width+.30:.32,.11,face==='north'?.32:width+.30,
         (palettes[s.kind]||palettes.villa)[1],s.stage07Yaw||0,4,0);
       b.material='anodized471';tag(b,s.id,'window_shade',460,face);n++;
     }
   }
   function fascia(s,roof,ww,dd,seed,cap){
     const trim=(palettes[s.kind]||palettes.villa)[seed%2];
     // Short and raised: never passes through a doorway or a breakable pane.
     for(const f of ['north','south'])surface(s,'roof_fascia',f,0,roof+.48,ww+.34,.20,.22,.20,ww,dd,trim,'travertine471',cap);
     for(const f of ['east','west'])surface(s,'roof_fascia',f,0,roof+.48,dd+.12,.20,.22,.20,ww,dd,trim,'travertine471',cap);
   }
   function openings(s,portal,seed){
     const info=H.stage08SideRearWindows.portalFace(s,portal);
     if(!info||!dir[info.face])return;
     // Only some door-header meshes survive the legacy facade culling pass;
     // the surveyed building base is the safe datum for remaining sites.
     const known=doorHeaders.get(s.id);
     const ground=Number.isFinite(known)?known:s.baseY;
     const trimY=Number.isFinite(known)?ground+3.90:ground+4.13;
     // Frame sits 0.5m above the existing Stage05/Stage10 door header; no
     // panel appears in the navigable opening and no collider is added.
     surface(s,'transom',info.face,info.along,trimY,
       Math.min((portal.width||3.7)+.58,s.width*.8),.14,.23,.35,
       s.width,s.depth,(palettes[s.kind]||palettes.villa)[2],'anodized471',530);
   }
   function residential(s,seed,accent){
     const height=s.height,top=s.baseY+height;
     const cap=s.kind==='resort'?780:660;
     fascia(s,top,s.width,s.depth,seed,1300);
     // Neat dressed-stone corners and slender downspouts break up the old
     // flat plaster mass. Corners fall outside the existing window bays.
     for(const face of ['north','south'])for(const side of [-1,1]){
       surface(s,'quoin',face,side*(s.width*.5-.26),s.baseY+height*.52,
         .26,Math.max(3,height-.95),.19,.135,s.width,s.depth,accent,'travertine471',cap);
     }
     if(seed%3!==0){for(const side of [-1,1])surface(s,'downspout','north',
       side*(s.width*.5-.50),s.baseY+height*.51,.09,Math.max(2,height-.95),.12,.28,
       s.width,s.depth,'#7c8985','anodized471',430);}
   }
   function industrial(s,seed,accent){
     const roof=s.baseY+s.height;
     fascia(s,roof,s.width,s.depth,seed,1600);
     for(const face of ['north','south'])for(const side of [-1,1])
       surface(s,'pilaster',face,side*(s.width*.5-.22),s.baseY+s.height*.50,
         .22,Math.max(3,s.height-.65),.23,.12,s.width,s.depth,accent,'metal',840);
     // Functional-looking roof exhaust grilles stay entirely above the roof
     // and use shared meshes, never prop/collision geometry.
     for(let k=0;k<2;k++){
       const x=(k?-.26:.26)*s.width;
       boxAt(s,'industrial_vent',x,roof+.51,-s.depth*.06,1.35,.84,.72,'#6c7878','metal',690);
       for(let j=0;j<2;j++)boxAt(s,'vent_louver',x,roof+.28+j*.23,-s.depth*.06+.39,
           1.11,.075,.09,'#a3aaa4','anodized471',390);
     }
   }
   function civicAndMidrise(s,seed,accent){
     const roof=s.baseY+s.height;
     fascia(s,roof,s.width,s.depth,seed,2000);
     for(const face of ['north','south'])for(const side of [-1,1])
       surface(s,'pilaster',face,side*(s.width*.5-.28),s.baseY+s.height*.51,.28,
         Math.max(5,s.height-.94),.23,.15,s.width,s.depth,accent,'travertine471',1200);
     // Narrow shadow line above the first-floor windows, REAR ONLY. The
     // frontage remains untouched for the working door/canopy interaction.
     surface(s,'cornice','north',0,s.baseY+Math.min(4.42,s.height*.38),
       s.width*.84,.14,.21,.24,s.width,s.depth,accent,'anodized471',680);
   }
   function towers(s,seed,accent){
     const mass=w.boxes.filter(b=>b.city20Stage06Owner===s.id&&b.city20Stage06Kind==='massing')
       .sort((a,b)=>a.y-b.y);
     if(mass.length<3)throw Error('Stage28 missing staged tower setbacks '+s.id);
     for(const m of mass){
       const floor=m.y-m.h*.5,roof=m.y+m.h*.5;
       const clear=.50,h=Math.max(.18,m.h-clear);
       for(const face of ['north','south'])for(const side of [-1,1])
         surface(s,'tower_fin',face,side*(m.w*.5-.28),floor+clear*.5+h*.5,
           .22,h,.25,.19,m.w,m.d,accent,'anodized471',1450);
       // Two slim metal shadow lines emphasize the real changing tiers,
       // instead of filling them back into an unbroken opaque box.
       for(const face of ['north','south'])surface(s,'tower_belt',face,0,roof+.09,
         Math.max(1,m.w-.80),.17,.19,.16,m.w,m.d,'#8ca3a2','anodized471',2100);
     }
     const roof=s.baseY+s.height;
     for(const side of [-1,1]){
       boxAt(s,'tower_roof_screen',s.width*.33*side,roof+.83,s.depth*.19,1.06,1.38,2.10,
         '#738c92','metal',1000);
     }
   }
   for(const s of sites){
     const portal=w.entrancePortals[s.city20Stage05PortalId];
     if(!portal?.interiorReady)throw Error('Stage28 inaccessible CITY20 portal '+s.id);
     const seed=stable(s.id),tone=palettes[s.kind];
     if(!tone)throw Error('Stage28 unhandled kind '+s.kind);
     if(s.kind==='tower')towers(s,seed,tone[1]);
     else if(s.kind==='villa'||s.kind==='resort')residential(s,seed,tone[seed%3]);
     else if(s.kind==='warehouse'||s.kind==='service')industrial(s,seed,tone[1]);
     else civicAndMidrise(s,seed,tone[1]);
     openings(s,portal,seed);sunshades(s,seed);
     report.mappedSites++;report.kinds[s.kind]=(report.kinds[s.kind]||0)+1;
     if(s.streetAligned)report.streetAlignedSites++;
   }
   // Existing core buildings have richer authored windows. Accent only the
   // roofline (no new opaque panels over the heritage/tech curtain walls).
   for(const [i,b] of w.buildings.entries()){
     if(![b.x,b.z,b.w,b.d,b.h,b.stage42Ground].every(Number.isFinite)||b.h<9)continue;
     const roof=b.stage42Ground+b.h,cap=b.h>65?2100:1450;
     const color=legacyTone[b.kind]||'#a8ada8';
     const s={id:'legacy-'+i,x:b.x,z:b.z,stage07Yaw:0};
     for(const face of ['north','south']){
       // Long narrow cornices, not the old full-area roofs that looked like
       // large featureless concrete slabs.
       surface(s,'legacy_cornice',face,0,roof+.16,
         b.w*.88,.23,.29,.11,b.w,b.d,color,'anodized471',cap);
     }
     if(['heritage','residential','brick'].includes(b.kind)&&b.h>=14){
       for(const side of [-1,1])
         surface(s,'quoin','north',side*(b.w*.5-.25),b.stage42Ground+b.h*.53,
           .29,b.h-.85,.18,.12,b.w,b.d,color,'travertine471',880);
     }
     report.legacySites++;
   }
   report.newGeometry=w.boxes.length-old.boxes;
   report.glazingPreserved=w.boxes.filter(b=>b.stage08Part==='glass').length;
   if(report.newGeometry!==report.taggedMeshes||report.newGeometry>old.boxes*.016||
     report.mappedSites!==130||report.legacySites!==84||report.streetAlignedSites!==34||
     report.glazingPreserved!==old.stage08Glass||
     w.roads461.length!==old.roads||w.solids.length!==old.solids||
     w.propSolids.length!==old.propSolids||w.entrancePortals.length!==old.portals||
     w.entrancePortals.filter(p=>p.interiorReady).length!==old.ready||
     w.buildings.length!==old.buildings||w.glassPanels.length!==old.glass||
     parts.some(p=>p.lodMax!==p.visibilityCap||p.visibilityCap>2100))
     throw Error('Stage28 violated budget or changed source gameplay geometry: '+JSON.stringify(report));
   w.stage28FacadeStats=report;
   return report;
 }
 H.stage28ArchitecturalFacades={run,disable};
 H.finishReferenceBuildings469=function stage28Finish(w){const r=beforeFinish(w);if(!disable())run(w);return r;};
})(Heatline);
