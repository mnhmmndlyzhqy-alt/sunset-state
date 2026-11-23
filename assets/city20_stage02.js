/* SUNSET STATE CITY20 / STAGE 02
 * Reference-registered urban massing, residential fabric and service edges.
 * Does not alter roads, pre-existing buildings, gameplay, coastline, or save.
 * Original chosen reference: REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png
 * Decorative massing added now; interior permissions belong to stages 10-12.
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const P=H.reference469, G=H.coast461;
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function'||typeof H.coastShape461!=='function'||!P)throw Error('CITY20 stage02 needs existing city pipeline');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const areas=[
 {id:'CENTRAL_URBAN_BLOCKS',kind:'tower',rect:[585,271,972,531],step:16.8,jitter:2.9,limit:31,coast:4.5,pad:4.1,
   omit:[[660,339,852,395],[550,470,645,540]]},
 {id:'CANAL_WEST_SOUTH',kind:'villa',rect:[105,375,500,694],step:14.4,jitter:2.5,limit:104,coast:4.6,pad:3.2,
   omit:[[385,605,535,748],[93,610,150,710]]},
 {id:'CANAL_WEST_NORTH',kind:'villa',rect:[173,147,372,365],step:14.4,jitter:2.7,limit:46,coast:4.6,pad:3.1,
   omit:[[318,140,398,247]]},
 {id:'CIVIC_NORTH_EDGE',kind:'civic',rect:[791,192,952,247],step:15.4,jitter:1.8,limit:12,coast:5,pad:4.6,omit:[]},
 {id:'EAST_DOWNTOWN_EDGE',kind:'midrise',rect:[943,263,1031,521],step:16.8,jitter:2.6,limit:18,coast:4.6,pad:4.2,
   omit:[[1020,255,1165,393],[970,362,1150,540]]},
 {id:'NORTHWEST_PORT',kind:'warehouse',rect:[155,42,350,217],step:22.5,jitter:2.0,limit:14,coast:2.5,pad:4.9,omit:[]},
 {id:'AIRFIELD_PERIMETER_WEST',kind:'service',rect:[457,566,554,652],step:18.2,jitter:1.6,limit:8,coast:2.2,pad:5.1,omit:[]},
 {id:'AIRFIELD_PERIMETER_EAST',kind:'service',rect:[882,562,979,645],step:18.2,jitter:1.5,limit:8,coast:2.2,pad:5.1,omit:[]},
 {id:'COASTAL_RESORT_ISLANDS',kind:'resort',rect:[1262,94,1359,327],step:13.8,jitter:2.2,limit:20,coast:2.8,pad:3.8,omit:[]}
];
// P works with the source coastal raster, a crop of the original chosen image.
// Areas were recorded in reference coordinate pixels, NOT random world points.
const smoothSeed=(id,i,j,s)=>{
  let x=(id*73471+i*2654435761+j*1597334677+s*3812015801)>>>0;
  x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;x=Math.imul(x,3266489909);x^=x>>>16;
  return (x>>>0)/4294967296;
};
const palette={
 villa:[['#cebfa5','#ad785d','#9baca7'],['#b1c2b6','#747977','#e3d5b4'],['#ead2ba','#aa735e','#b1bec2'],['#c4bdae','#7f8585','#d1bfa7']],
 tower:[['#9faeab','#3b6571','#bbc1b7'],['#b3aba1','#546978','#b3b9b2'],['#b7a995','#536f72','#bdb2a3'],['#8fa0a7','#3d5a70','#a7b5b5']],
 midrise:[['#b9b2a7','#507180','#aba49a'],['#b6a59c','#675c68','#d1c2b4'],['#afb5ac','#496775','#c5c4b8']],
 warehouse:[['#a7a69b','#59676b','#8a8b83'],['#b8b4a6','#667279','#7b837f'],['#b1aa9d','#746d60','#a8a397']],
 civic:[['#c2bfad','#536c76','#9d9e94'],['#bbb3a3','#657d81','#a5a69a']],
 service:[['#c1c2b6','#5f717c','#969b98'],['#b4b7ad','#617079','#969d98']],
 resort:[['#eee2ce','#6b8b97','#c6b8a0'],['#d9ddcc','#64848d','#a4b7b8'],['#e7cdb2','#8b8f88','#b5a69a']]
};
function occupied(w,x,z,ww,dd,pad){
  for(const s of w.nearby(x,z)){
    if(Math.abs(s.x-x)<s.hw+ww*.5+pad&&Math.abs(s.z-z)<s.hd+dd*.5+pad)return true;
  }
  for(const b of w.buildings){
    if(Math.abs(b.x-x)<(b.w+ww)*.5+pad&&Math.abs(b.z-z)<(b.d+dd)*.5+pad)return true;
  }
  return false;
}
function nearbyEstablishedNeighborhood(w,x,z,kind){
  if(kind!=='villa'&&kind!=='resort')return true;
  const r=kind==='resort'?70:84,old=kind==='resort'?62:75;
  if(w.city20OriginalHomes?.some(h=>Math.abs(h.x-x)<old&&Math.abs(h.z-z)<old&&Math.hypot(h.x-x,h.z-z)<=old))return true;
  for(const road of w.roads461||[]){
    for(const t of road.samples){
      if(Math.abs(t.x-x)<r&&Math.abs(t.z-z)<r&&Math.hypot(t.x-x,t.z-z)<=r)return true;
    }
  }
  return false;
}
function safeSite(w,x,z,width,depth,a){
  const hw=width*.5+a.pad,hd=depth*.5+a.pad;
  const corners=[[0,0],[-hw,-hd],[-hw,hd],[hw,-hd],[hw,hd],[-hw,0],[hw,0],[0,-hd],[0,hd]];
  let minY=Infinity,maxY=-Infinity;
  for(const [dx,dz] of corners){
    const px=x+dx,pz=z+dz,shore=P.coast(px,pz);
    if(shore<a.coast||G.isRouteRoad(px,pz)||G.risk?.(px,pz))return null;
    if(a.kind==='tower'||a.kind==='midrise'||a.kind==='civic'){
      if(Math.abs(px)<560&&Math.abs(pz)<530&&H.onCorePavement463?.(px,pz))return null;
    }
    const ground=H.outdoorHeight(px,pz);
    minY=Math.min(minY,ground);maxY=Math.max(maxY,ground);
  }
  const maxVariation=(a.kind==='villa'||a.kind==='resort')?1.65:2.35;
  if(maxY-minY>maxVariation||occupied(w,x,z,width,depth,a.pad))return null;
  // Legacy entrances can remain interactive even when their outer shell is not
  // represented in the collision index. Never close those passageways.
  for(const door of w.entrancePortals||[]){
    if(Math.abs(door.x-x)<hw+3.5&&Math.abs(door.z-z)<hd+3.5)return null;
  }
  // Protect surveyed operational areas, sports grounds and existing public
  // amenities. The airfield polygons are intentionally reserved for stage 16.
  const protectedIds=new Set(['airfield','westApron','eastApron','runway',
    'stadium','parking','fairway','parkPool','pool','hospital','detentionWing','recreation']);
  for(const f of w.mapFeatures461||[]){
    if(!protectedIds.has(f.id)||!Number.isFinite(f.width)||!Number.isFinite(f.depth))continue;
    const fw=Math.abs(f.width)*.5,fz=Math.abs(f.depth)*.5;
    if(f.id==='fairway'){
      if(((x-f.x)/(fw+hw))**2+((z-f.z)/(fz+hd))**2<1)return null;
    }else if(Math.abs(x-f.x)<fw+hw&&Math.abs(z-f.z)<fz+hd)return null;
  }
  if(!nearbyEstablishedNeighborhood(w,x,z,a.kind))return null;
  // Preserve the player's starting area and the starter vehicle.
  for(const p of [H.cityPlan463.start,H.cityPlan463.starterCar]){
    if(Math.abs(p.x-x)<hw+7&&Math.abs(p.z-z)<hd+7)return null;
  }
  return H.outdoorHeight(x,z);
}
function addMesh(w,x,y,z,ww,hh,dd,color,material,vis,level='mass',shape='cube'){
  const o=H.coastShape461(w,x,y,z,ww,hh,dd,color,material,shape,0,vis);
  o.city20Stage02=true;
  o.city20Level=level;
  if(level==='mass'){
    o.stage450Proxy=true;o.stage461Mass=true;
  }else{
    o.lodMax=Math.min(vis,level==='fine'?520:1300);
  }
  return o;
}
function makeMassing(w,spec,index){
  const {kind,x,z,width:ww,depth:dd,h,y,seed}=spec;
  const p=palette[kind][seed%palette[kind].length];
  const wall=p[0],glass=p[1],trim=p[2];
  const roofY=y+h;
  const mass=addMesh(w,x,y+h*.5+.16,z,ww,h,dd,wall,kind==='villa'||kind==='resort'?'masonry':kind==='warehouse'?'metal':'travertine471',3200);
  mass.city20BuildingId=spec.id;
  if(kind==='tower'||kind==='midrise'||kind==='civic'){
    const podium=Math.min(h*.26,9.8);
    addMesh(w,x,y+podium*.5+.18,z,ww+1.65,podium,dd+1.55,trim,'concrete',2600,'mass');
    const glazing=kind==='civic'?0.18:0.44;
    const glassY=y+podium+(h-podium)*.5;
    if(glazing>.25){
      // A shallow but genuine side strip, not a duplicate massive shell.
      addMesh(w,x,glassY,z+dd*.5+.081,ww*.69,(h-podium)*.92,.12,glass,'tower_glass469',1000,'detail');
      addMesh(w,x+ww*.5+.072,glassY,z,.12,(h-podium)*.91,dd*.62,glass,'tower_glass469',900,'detail');
    }
    addMesh(w,x,roofY+.13,z,ww+.56,.27,dd+.56,trim,'anodized471',2400,'mass');
    if(seed%3===0)addMesh(w,x-ww*.17,roofY+1.04,z-dd*.11,ww*.32,1.75,dd*.31,'#a5aca6','metal',920,'detail');
  }else if(kind==='warehouse'||kind==='service'){
    addMesh(w,x,roofY+.16,z,ww+.50,.34,dd+.50,trim,'metal',2100,'mass');
    addMesh(w,x,roofY+.43,z,ww*.42,.42,dd*.22,'#8b9897','metal',700,'detail');
  }else{
    addMesh(w,x,roofY+.23,z,ww+.44,.46,dd+.58,trim,'masonry',2400,'mass');
    if(seed%3===1){
      addMesh(w,x+ww*.15,roofY+.55,z,ww*.25,.52,dd*.54,'#9d9e93','concrete',940,'detail');
    }
    // Recessed-facing porch and two window panels at short distances.
    addMesh(w,x,y+1.55,z+dd*.5+.13,ww*.27,2.32,.21,glass,'glass',420,'fine');
    if(seed%4!==0)
      addMesh(w,x-ww*.29,y+2.05,z+dd*.5+.14,ww*.19,1.55,.12,glass,'glass',360,'fine');
  }
  // Static obstacle, registered only after validating traversable roads/corners.
  w.solid(x,z,ww+.12,dd+.12,false);
  const foot={id:'city20-'+kind,x,z,width:ww,depth:dd,color:trim};
  w.mapFeatures461.push(foot);
  return mass;
}
function assignSizes(a,i,j){
 const r=s=>smoothSeed(i*19+7,j*17+11,s*23+9,3);
 const dims={tower:[16,25,19,29],villa:[11,17,9,15],midrise:[14,22,15,23],warehouse:[16,27,13,25],service:[14,24,11,21],civic:[15,24,14,24],resort:[10,17,10,17]};
 const [minW,maxW,minD,maxD]=dims[a.kind];
 const width=minW+(maxW-minW)*r(1),depth=minD+(maxD-minD)*r(2);
 const floor={tower:27,midrise:14,civic:9,villa:6,warehouse:6.1,service:5.4,resort:5.8};
 const spread={tower:79,midrise:26,civic:16,villa:5.3,warehouse:4.2,service:4.5,resort:8.1};
 const h=floor[a.kind]+spread[a.kind]*r(3);
 return {width,depth,h};
}
function generate(world){
  if(world.city20Stage02Stats)return world.city20Stage02Stats;
  const counts={},placements=[],totalBefore=world.boxes.length;
  world.city20OriginalHomes=(world.mapFeatures461||[]).filter(f=>f.id==='house').map(f=>({x:f.x,z:f.z}));
  for(let n=0;n<areas.length;n++){
    const a=areas[n];let accepted=0,attempted=0,invalidLand=0,occupiedCount=0;
    const [left,top,right,bottom]=a.rect;
    const cols=Math.ceil((right-left)/a.step),rows=Math.ceil((bottom-top)/a.step);
    const candidates=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const ox=(smoothSeed(n+1,i,j,11)-.5)*2*a.jitter;
      const oz=(smoothSeed(n+1,i,j,15)-.5)*2*a.jitter;
      const u=left+(i+.5)*(right-left)/cols+ox;
      const v=top+(j+.5)*(bottom-top)/rows+oz;
      if(u>right-4||v>bottom-4)continue;
      if(a.omit.some(([u0,v0,u1,v1])=>u>u0&&u<u1&&v>v0&&v<v1))continue;
      const priority=smoothSeed(n+29,i,j,7);
      candidates.push({i,j,u,v,priority});
    }
    candidates.sort((p,q)=>p.priority-q.priority);
    for(const c of candidates){
      if(accepted>=a.limit)break;attempted++;
      const {width,depth,h}=assignSizes(a,c.i,c.j);
      const p=P.world(c.u,c.v);
      const y=safeSite(world,p.x,p.z,width,depth,a);
      if(y===null){invalidLand++;continue;}
      const id=a.id+'-'+String(accepted+1).padStart(3,'0');
      const s={id,area:a.id,kind:a.kind,sourcePx:[+c.u.toFixed(2),+c.v.toFixed(2)],x:p.x,z:p.z,
        width:+width.toFixed(2),depth:+depth.toFixed(2),h:+h.toFixed(2),y,seed:(n*19+c.i*41+c.j*57)>>>0,
        interiorAvailable:false,transportTopologyChanged:false};
      makeMassing(world,s,accepted);accepted++;
      placements.push({id,area:s.area,kind:s.kind,sourcePx:s.sourcePx,x:+s.x.toFixed(3),z:+s.z.toFixed(3),
        width:s.width,depth:s.depth,height:s.h,baseY:+y.toFixed(3)});
    }
    counts[a.id]={kind:a.kind,accepted,limit:a.limit,attempted,skipped:invalidLand};
  }
  const stats={stage:2,reference:'CHOSEN_CITY_LAYOUT_ORIGINAL.png',referenceRegistered:true,
    noRoadOrTerrainChanges:true,noExistingStructureMoves:true,noNewGameplayEntrances:true,
    cityBuildingsAdded:placements.length,worldBoxesBefore:totalBefore,worldBoxesAfter:world.boxes.length,
    geometryAdded:world.boxes.length-totalBefore,areaCounts:counts,placements};
  world.city20Stage02Stats=stats;
  world.city20DistrictBuildings=placements;
  delete world.city20OriginalHomes;
  return stats;
}
H.city20Stage02Areas=areas;
H.generateCity20Stage02=generate;
H.finishReferenceBuildings469=function finalizeCity20Stage02(world){
  const result=prior(world);
  if(globalThis.__SUNSET_CITY20_DISABLE_STAGE02===true)return result;
  generate(world);
  return result;
};
})(Heatline);
