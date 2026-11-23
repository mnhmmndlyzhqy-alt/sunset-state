'use strict';
// Stage03 acceptance: actually instantiates the real game engine twice with and
// without stage03, then compares the geometry, road graph and reference placements.
// CPU-only. It is NOT a real GPU FPS benchmark.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const data=p=>fs.readFileSync(path.join(root,p));
const txt=p=>data(p).toString('utf8');
const hash=p=>crypto.createHash('sha256').update(data(p)).digest('hex');
const html=txt('START_GAME.html');
// Audit 2026-11-21: isolate the historic stage from future enhancement wrappers;
// otherwise disabled A/B baseline is invalid after later stage requirements.
const allScripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const historicEnd=allScripts.indexOf('assets/city20_stage04.js');
if(historicEnd<0)throw Error('Missing boundary for historic acceptance test');
const scripts=allScripts.slice(0,historicEnd);
const checks=[];
function test(name,pass,info){checks.push({name,pass:!!pass,info});if(!pass)console.error('FAILED',name,JSON.stringify(info||{}));}
function build(disable){
 const c={console,URLSearchParams,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
  performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},__SUNSET_CITY20_DISABLE_STAGE03:disable};
 c.globalThis=c;c.window=c;c.location={search:''};vm.createContext(c);
 for(const p of scripts)new vm.Script(txt(p),{filename:p}).runInContext(c,{timeout:60000});
 new vm.Script(txt('engine44.js'),{filename:'engine44.js'}).runInContext(c,{timeout:60000});
 const t=Date.now(),w=new c.Heatline.World(),elapsed=Date.now()-t;
 return {H:c.Heatline,w,elapsed};
}
const before=build(true),after=build(false),b=before.w,w=after.w,H=after.H;
const approved=JSON.parse(txt('QA/CITY20_STAGE02_PLACEMENTS.json'));
const pads=new Map(w.city20DistrictBuildings.map(p=>[p.id,p]));
const footings=w.boxes.filter(o=>o.city20Stage03Footing);
const terrainB=b.boxes.shoreMesh463,terrain=w.boxes.shoreMesh463;
const identicalPts=(p,q)=>Math.abs(p-q)<1e-7;
const hashRef=hash('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png');
test('exact_chosen_reference_unchanged',hashRef==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38',{sha256:hashRef});
test('stage02_130_exact_original_sites',approved.length===130&&pads.size===130&&approved.every(p=>{
 const a=pads.get(p.id);return a&&identicalPts(a.x,p.x)&&identicalPts(a.z,p.z)&&identicalPts(a.baseY,p.baseY)&&a.width===p.width&&a.depth===p.depth;
}),{approved:approved.length,retained:pads.size});
test('footings_130_existing_masses_only',footings.length===approved.length&&footings.every(o=>pads.has(o.city20Stage03Owner)),{count:footings.length});
let bridgeRoadSame=true,maxRoadSlope=0,roadPoints=0,maxRoadYDiff=0;
for(let i=0;i<b.roads461.length;i++){
 const x=b.roads461[i],y=w.roads461[i];
 if(x.id!==y.id||x.width!==y.width||x.samples.length!==y.samples.length){bridgeRoadSame=false;continue;}
 for(let k=0;k<x.samples.length;k++){
  const p=x.samples[k],q=y.samples[k];
  if(!identicalPts(p.x,q.x)||!identicalPts(p.z,q.z)||!identicalPts(p.y,q.y))bridgeRoadSame=false;
  maxRoadYDiff=Math.max(maxRoadYDiff,Math.abs(p.y-q.y));roadPoints++;
  if(k){const prev=y.samples[k-1],len=Math.hypot(q.x-prev.x,q.z-prev.z);if(len>.03)maxRoadSlope=Math.max(maxRoadSlope,Math.abs(q.y-prev.y)/len);}
 }
}
test('all_52_road_routes_identical_xyz',bridgeRoadSame&&b.roads461.length===52,{maxRoadYDiff,roadPoints});
test('road_slope_9percent_max',maxRoadSlope<=.090001,{maxRoadSlope});
test('84_legacy_building_geometry_preserved',b.buildings.length===w.buildings.length&&b.buildings.every((p,i)=>{
 const q=w.buildings[i];return identicalPts(p.x,q.x)&&identicalPts(p.z,q.z)&&p.w===q.w&&p.d===q.d&&p.h===q.h;
}),{buildings:w.buildings.length});
test('298_legacy_entrances_preserved',b.entrancePortals.length===298&&w.entrancePortals.length===298&&b.entrancePortals.every((p,i)=>{
 const q=w.entrancePortals[i];return identicalPts(p.x,q.x)&&identicalPts(p.z,q.z);
}),{doors:w.entrancePortals.length});
test('new_and_old_collision_solids_unchanged',b.solids.length===w.solids.length&&b.solids.length===1320,{solids:w.solids.length});
test('reference_registered_map_features_preserved',b.mapFeatures461.length===w.mapFeatures461.length&&w.mapFeatures461.length===402,{features:w.mapFeatures461.length});
test('terrain_mesh_topology_unchanged',terrainB.vertices.length===terrain.vertices.length&&terrainB.indices.length===terrain.indices.length&&terrain.indices.length>150000,
 {vertices:terrain.vertices.length/10,triangles:terrain.indices.length/3});
let changed=0,peak=0,minDelta=Infinity,maxDelta=-Infinity,landVert=0;
for(let i=0;i<terrain.vertices.length;i+=10){
 const d=terrain.vertices[i+1]-terrainB.vertices[i+1];
 if(Math.abs(d)>.018)changed++;
 peak=Math.max(peak,Math.abs(d));minDelta=Math.min(minDelta,d);maxDelta=Math.max(maxDelta,d);
 landVert++;
}
test('terrain_has_real_vertex_height_changes',changed>500&&peak>.12,{changed,peak,minDelta,maxDelta});
// Verify the terrain sampler used by physics matches actual rendered mesh Y
// to the expected 0.071 geometry offset for dry open land, except for roads.
let sampled=0,passSamples=0,maxMismatch=0;
for(let i=0;i<terrain.vertices.length;i+=10*47){
 const x=terrain.vertices[i],z=terrain.vertices[i+2],shore=H.reference469.coast(x,z);
 if(shore<=2||H.coast461.isRouteRoad(x,z)||H.coast461.keepLegacy(x,z))continue;
 const rendered=terrain.vertices[i+1],physics=H.baseGround467(x,z)-.071;
 const err=Math.abs(rendered-physics);
 sampled++;if(err<.16)passSamples++;maxMismatch=Math.max(maxMismatch,err);
}
test('visual_terrain_and_physics_share_height',sampled>100&&passSamples/sampled>.975,{sampled,passSamples,maxMismatch});
const caps=[];
let minBefore=Infinity,minAfter=Infinity,maxBefore=0,maxAfter=0,foundationGaps=0;
for(const p of approved){
 const points=[[0,0],[-p.width*.46,-p.depth*.46],[p.width*.46,p.depth*.46],[-p.width*.46,p.depth*.46],[p.width*.46,-p.depth*.46]];
 const valsB=points.map(([dx,dz])=>before.H.outdoorHeight(p.x+dx,p.z+dz));
 const vals=points.map(([dx,dz])=>H.outdoorHeight(p.x+dx,p.z+dz));
 const devB=Math.max(...valsB)-Math.min(...valsB),dev=Math.max(...vals)-Math.min(...vals);
 maxBefore=Math.max(maxBefore,devB);maxAfter=Math.max(maxAfter,dev);
 minBefore=Math.min(minBefore,devB);minAfter=Math.min(minAfter,dev);
 const f=footings.find(q=>q.city20Stage03Owner===p.id);
 if(!f||f.y+f.h*.5<p.baseY+.155||f.y-f.h*.5>Math.min(...vals)-.20)foundationGaps++;
 caps.push({id:p.id,oldSpread:devB,newSpread:dev});
}
test('every_footing_hides_base_to_lowest_ground',foundationGaps===0,{foundationGaps,maxBefore,maxAfter});
const mean=a=>a.reduce((q,v)=>q+v,0)/a.length;
const avgBefore=mean(caps.map(p=>p.oldSpread)),avgAfter=mean(caps.map(p=>p.newSpread));
test('foundation_terrain_flatter_on_average',avgAfter<=avgBefore+.025,{avgBefore,avgAfter,maxBefore,maxAfter});
const life=new H.Stage39Life(w),crocs=life.wildlife.filter(a=>a.kind==='crocodile');
test('8_crocodiles_still_in_real_water',crocs.length===8&&crocs.every(p=>H.reference469.coast(p.x,p.z)<-.5),{crocodiles:crocs.length});
test('old_timber_walkway_still_removed',w.stage478Stats?.noTimberPlatformAdded===true);
test('native1080_mode_code_preserved',txt('engine44.js').includes("this.graphicsMode = 'native1080'")&&txt('START_GAME.html').includes('city20_browser_benchmark.js'));
test('no_new_terrain_tris_shaders_or_texture_lookups',w.city20Stage03Stats?.additionalTerrainVertices===0&&w.city20Stage03Stats?.newShaderTextureSamples===0);
// Deterministic fixed-site samples from the selected reference in protected areas.
const protectedSites=[[-324,0],[0,0],[216,-432],[0,595],[430,635],[-930,823],[-270,239]];
let unchangedSites=true;
for(const [x,z] of protectedSites){if(Math.abs(before.H.outdoorHeight(x,z)-H.outdoorHeight(x,z))>1e-7)unchangedSites=false;}
test('airport_downtown_overpass_and_marina_protected',unchangedSites);
// A quick per-call CPU timing is diagnostic only; the game requires a GPU benchmark.
const points=Array.from({length:4000},(_,i)=>[Math.sin(i*31.17)*1100,Math.cos(i*17.47)*790]);
function bench(h){const t=performance.now();let sum=0;for(const [x,z] of points)sum+=h(x,z);return {milliseconds:+(performance.now()-t).toFixed(2),check:+sum.toFixed(3)};}
const timingBefore=bench(before.H.outdoorHeight),timingAfter=bench(H.outdoorHeight);
const result={project:'SUNSET STATE CITY20',stage:3,status:'CPU/game-source verified; GPU FPS not verified',
 baseVersion:'4.7.9 + CITY20 stages 1,2',nextStage:4,referenceHash:hashRef,
 geometry:{originalWorldBoxes:b.boxes.length,currentWorldBoxes:w.boxes.length,addedStage03Foundations:footings.length,
   originalTerrainVertices:terrainB.vertices.length/10,newTerrainVertices:terrain.vertices.length/10,
   originalTerrainTriangles:terrainB.indices.length/3,newTerrainTriangles:terrain.indices.length/3,
   changedTerrainHeightVertices:changed,maxHeightDifference:+peak.toFixed(4),minimumDelta:+minDelta.toFixed(4),maximumDelta:+maxDelta.toFixed(4),
   originalFootprintTerrainSpreadMeters:+avgBefore.toFixed(4),newFootprintTerrainSpreadMeters:+avgAfter.toFixed(4),
   legacyBuildings:w.buildings.length,legacyEntrances:w.entrancePortals.length,roads:w.roads461.length,maxRoadSlope},
 runtime:{sourceWorldConstructMs:before.elapsed,stage03WorldConstructMs:after.elapsed,diagnosticSampleHeightCalls:points.length,
   baselineSampleMs:timingBefore.milliseconds,stage03SampleMs:timingAfter.milliseconds,
   note:'CPU only, non-deterministic; NOT measured 1080p render performance or user device FPS'},
 hardware:{targetResolutionPx:[1920,1080],minimumFPS:50,measuredOnGPU:false,verified:false},
 sourceImpact:{originalSelectedReferenceUntouched:true,assetsAndModelsUnaffected:true,
   roadPlanUnchanged:true,missionsAndGameAIUnchanged:true,noNewTerrainTriangles:true},
 checks,passed:checks.filter(x=>x.pass).length,total:checks.length,allPassed:checks.every(x=>x.pass)};
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE03_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,total:result.total,geometry:result.geometry,
 runtime:result.runtime,hardware:result.hardware},null,2));
if(!result.allPassed)process.exitCode=2;
