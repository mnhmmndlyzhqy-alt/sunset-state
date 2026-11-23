'use strict';
/* SUNSET STATE CITY20 Stage06: source/geometry/urban skyline acceptance.
 * Real hardware frame rate and GPU rendering are explicitly NOT measured here.
 */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('START_GAME.html');
const sourceScripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
let checks=[];
function test(name,pass,data){const c={name,passed:Boolean(pass)};if(data!==undefined)c.details=data;checks.push(c);if(!pass)console.error('FAIL',name,JSON.stringify(data));}
function build(disable){
 const c={console,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
   performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},__SUNSET_CITY20_DISABLE_STAGE06:disable};
 c.globalThis=c;c.window=c;c.location={search: ''};vm.createContext(c);
 for(const s of sourceScripts)new vm.Script(read(s),{filename:s}).runInContext(c,{timeout:90000});
 new vm.Script(read('engine44.js'),{filename:'engine44.js'}).runInContext(c,{timeout:90000});
 const start=Date.now(),world=new c.Heatline.World(),cpuBuildTimeMs=Date.now()-start;
 return {H:c.Heatline,w:world,cpuBuildTimeMs,context:c};
}
const disabled=build(true),active=build(false),B=disabled.w,C=active.w,H=active.H;
const info=C.city20Stage06Stats||{};
const rawRef=fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'));
const referenceHash=crypto.createHash('sha256').update(rawRef).digest('hex');
test('reference_image_exact_sha256',referenceHash==='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38');
test('stage06_hook_present_and_disable_is_byte_exact',!B.city20Stage06Stats&&!!info&&info.stage===6&&H.city20Stage06.enabled()===true);
test('all_scripts_in_document_exist',sourceScripts.every(s=>fs.existsSync(path.join(root,s))),{scripts:sourceScripts.length});
test('20_stage_archive_pipeline',sourceScripts.includes('assets/city20_stage02.js')&&sourceScripts.includes('assets/city20_stage03.js')&&sourceScripts.includes('assets/city20_stage04.js')&&sourceScripts.includes('assets/city20_stage05.js')&&sourceScripts.includes('assets/city20_stage06.js'));
const fixedProps=['x','z','width','depth','height','baseY','id','kind','area'];
test('stage2_130_building_locations_and_kinds_unchanged',B.city20DistrictBuildings.length===130&&C.city20DistrictBuildings.length===130&&
 B.city20DistrictBuildings.every((p,i)=>fixedProps.every(k=>p[k]===C.city20DistrictBuildings[i][k])));
test('core_84_buildings_same_locations_sizes_and_categories',B.buildings.length===84&&C.buildings.length===84&&
 B.buildings.every((p,i)=>['x','y','z','h','w','d','kind'].every(k=>p[k]===C.buildings[i][k])));
test('all_298_portals_and_interaction_state_unchanged',B.entrancePortals.length===298&&C.entrancePortals.length===298&&
 B.entrancePortals.every((p,i)=>['x','z','buildingX','buildingZ','interiorReady'].every(k=>p[k]===C.entrancePortals[i][k])));
test('no_added_removed_or_relocated_collision_solids',B.solids.length===C.solids.length&&
 B.solids.every((p,i)=>JSON.stringify(p)===JSON.stringify(C.solids[i])),{solids:C.solids.length});
test('no_changed_map_features',B.mapFeatures461.length===C.mapFeatures461.length&&B.mapFeatures461.every((p,i)=>JSON.stringify(p)===JSON.stringify(C.mapFeatures461[i])),{mapFeatures:C.mapFeatures461.length});
test('52_roads_positions_elevations_and_widths_exact',B.roads461.length===52&&C.roads461.length===52&& B.roads461.every((r,i)=>r.id===C.roads461[i].id&&r.width===C.roads461[i].width&&r.samples.length===C.roads461[i].samples.length&&
 r.samples.every((s,j)=>['x','y','z','above'].every(k=>s[k]===C.roads461[i].samples[j][k]))));
const tg0=B.boxes.shoreMesh463,tg1=C.boxes.shoreMesh463;
test('water_and_terrain_mesh_positions_colors_and_indices_byte_equal',
  tg0.vertices.length===tg1.vertices.length&&tg0.indices.length===tg1.indices.length&&
  tg0.vertices.every((v,i)=>v===tg1.vertices[i])&&tg0.indices.every((v,i)=>v===tg1.indices[i]));
const towers=B.city20DistrictBuildings.filter(s=>s.kind==='tower');
function oldTowerPart(o){return o.city20Stage02&&towers.some(s=>Math.abs(o.x-s.x)<s.width*.57+1&&
  Math.abs(o.z-s.z)<s.depth*.58+1&&o.y>s.baseY+.05&&o.y<s.baseY+s.height+2.6);}
const baselineUnchanged=B.boxes.filter(o=>!oldTowerPart(o));
const candidateUnchanged=C.boxes.filter(o=>!o.city20Stage06);
const props=['x','y','z','w','h','d','material','shape','color','layer','visibilityCap','lodMax','stage450Proxy','city20BuildingId'];
let firstMismatch=null;
if(baselineUnchanged.length===candidateUnchanged.length)
 for(let i=0;i<baselineUnchanged.length;i++){
  const a=baselineUnchanged[i],b=candidateUnchanged[i];
  for(const k of props)if(a[k]!==b[k]){firstMismatch={i,property:k,before:a[k],after:b[k]};break;}
  if(firstMismatch)break;
 }
test('all_nonreplaced_geometry_primitives_identical',baselineUnchanged.length===candidateUnchanged.length&&!firstMismatch,
  {unchangedCount:candidateUnchanged.length,oldTowerPartsRemoved:B.boxes.length-baselineUnchanged.length,firstMismatch});
test('four_stage2_towers_sculpted_into_multi_tier_mass',towers.length===4&&info.remodeledMappedTowers===4&&info.removedMappedTowerParts>=16&&info.tierVolumes>=16,
  {remodeledTowers:info.remodeledMappedTowers,removedOriginalParts:info.removedMappedTowerParts,tiers:info.tierVolumes});
const added=C.boxes.filter(o=>o.city20Stage06);
const mappedTiers=added.filter(o=>o.city20Stage06Kind==='massing');
const grouped=new Map();for(const o of mappedTiers){if(!grouped.has(o.city20Stage06Owner))grouped.set(o.city20Stage06Owner,[]);grouped.get(o.city20Stage06Owner).push(o);}
test('each_mapped_tower_has_four_actual_distinct_tiers',towers.every(s=>grouped.get(s.id)?.length===4&&new Set(grouped.get(s.id).map(o=>o.w.toFixed(3))).size===4));
test('four_core_tower_shapes_reused_from_existing_mesh_library',new Set(mappedTiers.map(o=>o.shape)).size>=3&&mappedTiers.every(o=>o.shape==='reference_slab469'||Object.prototype.hasOwnProperty.call(H.coastMeshes461,o.shape)));
const skyline=added.filter(o=>o.stage450Proxy),roofCrown=added.filter(o=>o.city20Stage06Kind==='crown');
test('skyline_roof_masses_persist_to_3km',skyline.length>=60&&skyline.every(o=>o.visibilityCap>=2100&&o.lodMax===undefined),{persistent:skyline.length});
test('core_highrise_midrise_civic_and_mapped_midrise_upgrades',info.coreHighrise>=10&&info.coreMidrise>=10&&info.civicUpgraded===9&&info.midriseUpgraded===2,info);
test('roof_crowns_change_real_visible_skyline',roofCrown.length>=20&&roofCrown.every(o=>o.h>=1.3),{roofs:roofCrown.length});
test('geometry_piece_count_budget',added.length>80&&added.length<=310&&C.boxes.length-B.boxes.length<310,
 {geometryAdded:added.length,netIncrease:C.boxes.length-B.boxes.length,ratioPercent:+(100*(C.boxes.length-B.boxes.length)/B.boxes.length).toFixed(4)});
test('no_invalid_mesh_dimensions_or_positions',added.every(o=>['x','y','z','w','h','d'].every(k=>Number.isFinite(o[k]))&&o.w>0&&o.h>0&&o.d>0));
test('stage06_decorations_do_not_add_collision_or_interiors',C.solids.length===B.solids.length&&C.entrancePortals.length===B.entrancePortals.length&&info.collisionsUnchanged&&info.portalCountUnchanged);
test('no_meshes_or_new_buildings_in_protected_water',C.city20DistrictBuildings.every((p)=>H.reference469.coast(p.x,p.z)>0.30)&&added.every(o=>H.reference469.coast(o.x,o.z)>0.3));
test('no_new_overhead_camera_occluders',C.cameraOccluders.length===B.cameraOccluders.length);
const crocs=new H.Stage39Life(C).wildlife.filter(x=>x.kind==='crocodile');
test('crocodiles_still_in_water',crocs.length===8&&crocs.every(o=>H.reference469.coast(o.x,o.z)<-.5));
test('timber_boardwalk_not_reintroduced',C.stage478Stats?.noTimberPlatformAdded===true);
test('water_stage05_shader_untouched',read('engine44.js').includes('city20Stage05WaterFragment?.(fragment)')&&read('assets/city20_stage05.js').includes('float canals='));
test('fullhd_quality_mode_preserved',read('engine44.js').includes("this.graphicsMode = 'native1080'")&&html.includes('city20qa'));
test('stage06_explicit_a_b_switch_supported',read('assets/city20_stage06.js').includes('city20skylineOff')&&read('QA/city20_browser_benchmark.js').includes('skylineStage06Enabled'));
const report={project:'SUNSET STATE CITY20',stage:6,baseStage:5,
 status:'CPU/geometry/scene acceptance only. GPU 1920x1080 >=50FPS UNVERIFIED',
 visualScope:'Building silhouettes, stepped 3D towers, rooftop crowns, civic and midrise height rhythm; NOT new playable interiors.',
 changed:{...info,mappedFootprints:130,existingPortals:298,originalCoreBuildings:84,roadRoutes:52,
  stage05StaticMeshes:B.boxes.length,stage06StaticMeshes:C.boxes.length,newStage06Meshes:added.length,
  netStaticMeshes:C.boxes.length-B.boxes.length,estimatedExtraStaticMeshPercent:+(100*(C.boxes.length-B.boxes.length)/B.boxes.length).toFixed(4)},
 qa:{passed:checks.filter(x=>x.passed).length,total:checks.length,checks,allPassed:checks.every(x=>x.passed)},
 performance:{target:[1920,1080],minFps:50,measuredOnUserGpu:false,verified:false,
  baselineWorldStartupCpuMs:disabled.cpuBuildTimeMs,newWorldStartupCpuMs:active.cpuBuildTimeMs,
  note:'VM CPU object construction varies between runs; NOT a frame-rate measurement. Scene mesh delta does not prove no GPU regression.'},
 references:{originalLayoutSha256:referenceHash}};
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE06_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:report.qa.passed,total:report.qa.total,stats:report.changed,worldCpu:report.performance},null,2));
if(!report.qa.allPassed)process.exitCode=2;
