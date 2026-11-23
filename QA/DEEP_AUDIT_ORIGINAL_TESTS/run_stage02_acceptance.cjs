'use strict';
// CITY20 stage 02 test: world provenance, spatial collisions, accessibility,
// reference registration and unchanged roads/wildlife. Not a GPU FPS test.
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p));
const text=p=>file(p).toString('utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const html=text('START_GAME.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const cases=[];
function check(id,pass,extra){cases.push({id,pass:!!pass,extra});if(!pass)console.error('FAIL',id,JSON.stringify(extra));}
function build(skip){
 const ctx={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},__SUNSET_CITY20_DISABLE_STAGE02:skip,__SUNSET_CITY20_DISABLE_STAGE03:true,__SUNSET_CITY20_DISABLE_STAGE04:true};
 ctx.globalThis=ctx;ctx.window=ctx;ctx.location={search:'?qa=city20'};vm.createContext(ctx);
 const t0=Date.now();
 for(const p of scripts)new vm.Script(text(p),{filename:p}).runInContext(ctx,{timeout:40000});
 new vm.Script(text('engine44.js'),{filename:'engine44.js'}).runInContext(ctx,{timeout:40000});
 const loadMs=Date.now()-t0;
 const t1=Date.now(),w=new ctx.Heatline.World(),worldMs=Date.now()-t1;
 return {H:ctx.Heatline,w,loadMs,worldMs};
}
check('source_reference_unchanged',sha(file('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
check('all_js_exists',scripts.every(p=>fs.existsSync(path.join(root,p))),{count:scripts.length});
check('only_qa_mode_loads_benchmark',html.includes('has("city20qa")'));
check('native_1080_setting_still_present',text('engine44.js').includes("this.graphicsMode = 'native1080'"));
const baseline=build(true),candidate=build(false),b=baseline.w,w=candidate.w,H=candidate.H;
const s=w.city20Stage02Stats;
const originalBoxCount=b.boxes.length,origRoadCount=b.roads461.length;
check('baseline_without_stage02',!b.city20Stage02Stats&&originalBoxCount===176421,{originalBoxCount});
check('stage02_stats',!!s&&s.stage===2&&s.referenceRegistered===true);
check('new_buildings_over_120',s?.cityBuildingsAdded>=120&&s.cityBuildingsAdded<=230,{added:s?.cityBuildingsAdded});
check('new_geometry_within_budget',s?.geometryAdded<=950&&s.geometryAdded>=300,{added:s?.geometryAdded});
check('all_original_boxes_retained',w.boxes.length===b.boxes.length+s.geometryAdded&&b.boxes.every((o,i)=>o.x===w.boxes[i].x&&o.y===w.boxes[i].y&&o.z===w.boxes[i].z&&o.w===w.boxes[i].w&&o.h===w.boxes[i].h&&o.d===w.boxes[i].d&&o.material===w.boxes[i].material&&o.color===w.boxes[i].color));
check('all_original_buildings_retained',w.buildings.length===b.buildings.length&&w.buildings.every((o,i)=>o.x===b.buildings[i].x&&o.z===b.buildings[i].z&&o.h===b.buildings[i].h));
check('all_existing_portals_retained',w.entrancePortals.length===b.entrancePortals.length&&w.entrancePortals.every((o,i)=>o.x===b.entrancePortals[i].x&&o.z===b.entrancePortals[i].z));
check('roads_same_number',w.roads461.length===origRoadCount&&origRoadCount===52,{origRoadCount});
let sameRoads=true,maxGrade=0;
for(let i=0;i<origRoadCount;i++){
 const r=w.roads461[i],t=b.roads461[i];if(r.id!==t.id||r.width!==t.width||r.samples.length!==t.samples.length){sameRoads=false;break;}
 for(let j=0;j<r.samples.length;j++){
  const a=r.samples[j],e=t.samples[j];if(a.x!==e.x||a.z!==e.z||a.y!==e.y){sameRoads=false;break;}
  if(j){const last=r.samples[j-1],dist=Math.hypot(a.x-last.x,a.z-last.z);if(dist>.03)maxGrade=Math.max(maxGrade,Math.abs(a.y-last.y)/dist);}
 }
}
check('road_coordinates_unchanged',sameRoads);check('road_slope_at_most_9percent',maxGrade<=.090001,{maxGrade});
const fauna=new H.Stage39Life(w);const crocs=fauna.wildlife.filter(a=>a.kind==='crocodile');
check('all_crocodiles_in_water',crocs.length===8&&crocs.every(a=>H.reference469.coast(a.x,a.z)<-.5),{count:crocs.length});
check('boardwalk_still_absent',w.stage478Stats?.noTimberPlatformAdded===true);
check('no_airfield_warehouse_or_stadium_overlap',(()=>{
 const forbidden=['airfield','westApron','eastApron','runway','stadium','parking','hospital','detentionWing','fairway','parkPool','pool'];
 const features=b.mapFeatures461.filter(o=>forbidden.includes(o.id));let blocked=[];
 for(const p of s.placements)for(const f of features){
  const fw=f.width*.5,fz=f.depth*.5,pw=p.width*.5,pz=p.depth*.5;
  if(f.id==='fairway'&&((p.x-f.x)/(fw+pw))**2+((p.z-f.z)/(fz+pz))**2<1||f.id!=='fairway'&&Math.abs(p.x-f.x)<fw+pw&&Math.abs(p.z-f.z)<fz+pz)blocked.push([p.id,f.id]);
 }
 return blocked.length===0;})());
let doorBlock=0,roadBlock=0,seaBlock=0,intraOverlap=0;
for(let i=0;i<s.placements.length;i++){
 const p=s.placements[i],a=H.city20Stage02Areas.find(z=>z.id===p.area),xx=p.x,zz=p.z;
 for(const d of w.entrancePortals)if(Math.abs(d.x-xx)<p.width*.5+a.pad+3.5&&Math.abs(d.z-zz)<p.depth*.5+a.pad+3.5)doorBlock++;
 for(const [dx,dz] of [[0,0],[-1,-1],[1,1],[-1,1],[1,-1]]){
  const tx=xx+dx*(p.width*.5+a.pad),tz=zz+dz*(p.depth*.5+a.pad);
  if(H.reference469.coast(tx,tz)<a.coast)seaBlock++;
  if(H.coast461.isRouteRoad(tx,tz))roadBlock++;
 }
 for(let j=i+1;j<s.placements.length;j++){
  const q=s.placements[j];if(Math.abs(xx-q.x)<(p.width+q.width)*.5+.2&&Math.abs(zz-q.z)<(p.depth+q.depth)*.5+.2)intraOverlap++;
 }
}
check('no_entrances_blocked',doorBlock===0,{doorBlock});
check('no_water_landings',seaBlock===0,{seaBlock});
check('no_road_landings',roadBlock===0,{roadBlock});
check('no_new_building_overlap',intraOverlap===0,{intraOverlap});
check('new_map_footprints_match',w.mapFeatures461.length-b.mapFeatures461.length===s.cityBuildingsAdded);
check('new_solids_match',w.solids.length-b.solids.length===s.cityBuildingsAdded);
check('city_massing_remains_visible_aerial',w.boxes.slice(originalBoxCount).filter(o=>o.city20Level==='mass').every(o=>o.visibilityCap>=2000));
check('districts_have_distinct_zoning',(new Set(s.placements.map(o=>o.kind))).size>=5);
check('stage02_immutable_reference_world_coordinates',s.placements.every(o=>o.sourcePx.every(Number.isFinite)&&Math.hypot(H.reference469.world(...o.sourcePx).x-o.x,H.reference469.world(...o.sourcePx).z-o.z)<.08));
check('all_placeholders_marked_unfinished_interiors',s.placements.every(o=>!o.interiorAvailable));
const regionAreas=Object.entries(s.areaCounts).map(([id,d])=>({id,...d}));
const result={project:'SUNSET STATE CITY20',stage:2,sourceVersion:'4.7.9 + stages 1,2',reference:'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png',
 baseline:{boxes:b.boxes.length,buildings:b.buildings.length,portals:b.entrancePortals.length,roads:b.roads461.length,solids:b.solids.length,mapFeatures:b.mapFeatures461.length},
 after:{boxes:w.boxes.length,buildings:w.buildings.length,portals:w.entrancePortals.length,roads:w.roads461.length,solids:w.solids.length,mapFeatures:w.mapFeatures461.length},
 additions:{newMappedBuildingVolumes:s.cityBuildingsAdded,addedInstancedGeometryObjects:s.geometryAdded,regions:regionAreas},
 maxRoadGrade:maxGrade,originalModelAndVehicleAssetsUnchanged:true,
 buildTimingMs:{baseline:baseline.worldMs,candidate:candidate.worldMs,note:'CPU startup only; not GPU frames or FPS and subject to host variance'},
 hardwarePerformance:{requiredDrawingBufferPx:[1920,1080],requiredMinimumFPS:50,measuredOnUserGPU:false,verified:false},
 checks:cases,pass:cases.filter(x=>x.pass).length,total:cases.length,allPassed:cases.every(x=>x.pass)};
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE02_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE02_PLACEMENTS.json'),JSON.stringify(s.placements,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,total:result.total,baseline:result.baseline,after:result.after,added:result.additions.newMappedBuildingVolumes,meshes:result.additions.addedInstancedGeometryObjects,regions:regionAreas,buildMs:result.buildTimingMs},null,2));
if(!result.allPassed)process.exitCode=2;
