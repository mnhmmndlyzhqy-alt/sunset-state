'use strict';
/* CITY20 Stage05 - original world preservation, shoreline palette and water
 * GLSL source structure; no claims about hardware FPS without GPU evidence. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const txt=p=>fs.readFileSync(path.join(root,p),'utf8');
const bin=p=>fs.readFileSync(path.join(root,p));
const html=txt('START_GAME.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const checks=[];
function test(name,condition,details){const a={name,passed:!!condition,details};checks.push(a);if(!condition)console.error('FAILED:',name,JSON.stringify(details));}
function build(disable){
 const c={console,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
  performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},__SUNSET_CITY20_DISABLE_STAGE05:disable};
 c.globalThis=c;c.window=c;c.location={search:''};vm.createContext(c);
 for(const src of scripts)new vm.Script(txt(src),{filename:src}).runInContext(c,{timeout:60000});
 new vm.Script(txt('engine44.js'),{filename:'engine44.js'}).runInContext(c,{timeout:60000});
 const t=Date.now(),w=new c.Heatline.World(),buildMs=Date.now()-t;
 return {H:c.Heatline,w,buildMs};
}
const base=build(true),candidate=build(false),B=base.w,C=candidate.w,H=candidate.H;
const grid0=B.boxes.shoreMesh463,grid1=C.boxes.shoreMesh463;
const mapSha='7768201672d081a906d6a075af71dc6a9f655d8ba7715b209b333c10053e8b38';
test('original_reference_sha_preserved',crypto.createHash('sha256').update(bin('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png')).digest('hex')===mapSha);
test('only_stage05_is_enabled_in_a_b',!!H.city20Stage05.enabled()&&!base.H.city20Stage05.enabled());
test('52_road_routes_preserved',C.roads461.length===52&&B.roads461.length===52&&C.roads461.every((road,i)=>{
 const old=B.roads461[i];return road.id===old.id&&road.width===old.width&&road.samples.length===old.samples.length&&road.samples.every((p,j)=>{
 const q=old.samples[j];return Math.abs(p.x-q.x)<1e-9&&Math.abs(p.y-q.y)<1e-9&&Math.abs(p.z-q.z)<1e-9;});}));
test('130_new_building_masses_stable',C.city20DistrictBuildings.length===130&&B.city20DistrictBuildings.length===130&&C.city20DistrictBuildings.every((p,i)=>{
 const q=B.city20DistrictBuildings[i];return p.id===q.id&&p.x===q.x&&p.z===q.z&&p.baseY===q.baseY;}));
test('all_original_buildings_portals',C.buildings.length===B.buildings.length&&C.buildings.length===84&&C.entrancePortals.length===B.entrancePortals.length&&C.entrancePortals.length===298);
test('world_primitives_and_collision_exactly_preserved',C.boxes.length===B.boxes.length&&C.solids.length===B.solids.length&&C.mapFeatures461.length===B.mapFeatures461.length,{boxes:[B.boxes.length,C.boxes.length],solids:[B.solids.length,C.solids.length]});
let changedMeshes=0,disturbedMeshes=0,unrelatedColorChanges=0;
for(let i=0;i<C.boxes.length;i++){
 const a=B.boxes[i],b=C.boxes[i];
 if(a.x!==b.x||a.y!==b.y||a.z!==b.z||a.w!==b.w||a.h!==b.h||a.d!==b.d||a.material!==b.material||a.visibilityCap!==b.visibilityCap)disturbedMeshes++;
 if(a.color!==b.color){changedMeshes++;if(!b.coastalLand463)unrelatedColorChanges++;}
}
test('no_placed_geometry_or_unrelated_color_changed',disturbedMeshes===0&&unrelatedColorChanges===0,{disturbedMeshes,changedMeshes,unrelatedColorChanges});
test('terrain_buffer_vertex_counts_unchanged',grid0.indices.length===grid1.indices.length&&grid0.vertices.length===grid1.vertices.length);
let indexErrors=0,geometricErrors=0,colorChanges=0,otherChange=0;
for(let i=0;i<grid0.indices.length;i++)if(grid0.indices[i]!==grid1.indices[i])indexErrors++;
for(let i=0;i<grid0.vertices.length;i++){
 const k=i%10,a=grid0.vertices[i],b=grid1.vertices[i];
 if(k<6||k===9){if(a!==b)geometricErrors++;}
 else if(a!==b)colorChanges++;
}
test('shoreline_mesh_same_positions_normals_sand_blend_and_indices',indexErrors===0&&geometricErrors===0,{indexErrors,geometricErrors});
test('many_shore_colors_genuinely_changed',colorChanges>400,{colorChanges,stats:C.city20Stage05ShoreStats});
test('shore_bank_regional_variants_present',C.city20Stage05ShoreStats.wetlandBankSamples>0&&C.city20Stage05ShoreStats.canalBankSamples>0&&C.city20Stage05ShoreStats.beachBankSamples>0,C.city20Stage05ShoreStats);
const fauna=new H.Stage39Life(C),crocs=fauna.wildlife.filter(a=>a.kind==='crocodile');
test('eight_crocs_in_real_water',crocs.length===8&&crocs.every(a=>H.reference469.coast(a.x,a.z)<-.5));
test('no_wetland_timber_boardwalk_recreated',C.stage478Stats?.noTimberPlatformAdded===true);
test('no_new_water_mesh_or_terrain_draw_calls',C.boxes.filter(p=>p.sea461).length===B.boxes.filter(p=>p.sea461).length&&C.city20Stage05ShoreStats.addedLandDrawCalls===0);
const shader=txt('engine44.js'),start=shader.indexOf('          if(matId==23.0){'),end=shader.indexOf('          float emission=max(0.0,vColor.a);',start);
const oldWater=shader.slice(start,end),source='prefix\n'+oldWater+'          float emission=max(0.0,vColor.a);\nsuffix';
const improved=H.city20Stage05WaterFragment(source),untouched=base.H.city20Stage05WaterFragment(source);
test('water_shader_patch_wired_in_renderer',shader.includes('city20Stage05WaterFragment?.(fragment)')&&shader.includes('catch (waterShaderError)'));
test('disabled_water_shader_byte_exact',untouched===source);
test('patch_only_water_branch',improved.startsWith('prefix\n')&&improved.endsWith('          float emission=max(0.0,vColor.a);\nsuffix')&&improved!==source);
const water=improved.slice(improved.indexOf('if(matId==23.0){'),improved.indexOf('float emission=max'));
test('water_preserves_original_depth_mask_and_land_discard',water.includes('texture(uCoastalDepth461,uv)')&&water.includes('coast.g>.56')&&water.includes('discard'));
test('water_includes_ocean_canal_marsh_calm_shallow_reflection_and_foam',water.includes('float canals=')&&water.includes('float marsh=')&&water.includes('vec3 shallow=')&&water.includes('float fresnel=')&&water.includes('float surfZone='));
const textureCalls=(s)=>(s.match(/texture\s*\(/g)||[]).length;
test('no_extra_water_texture_samples',textureCalls(water)<=textureCalls(oldWater),{original:textureCalls(oldWater),improved:textureCalls(water)});
test('coastal_water_quality_a_b_switch_preserved',txt('assets/city20_stage05.js').includes('city20waterOff')&&txt('QA/city20_browser_benchmark.js').includes('waterStage05Enabled:'));
test('high_resolution_mode_and_qa_preserved',shader.includes("this.graphicsMode = 'native1080'")&&html.includes('city20qa'));
test('prior_stage_code_still_present',scripts.includes('assets/city20_stage02.js')&&scripts.includes('assets/city20_stage03.js')&&scripts.includes('assets/city20_stage04.js')&&scripts.includes('assets/city20_stage05.js'));
let flatSamples=0,flattenOK=0;
for(const i of [0,3,17,39,87,139,199,249,299,407,499,619,731]){
 const a=grid0.vertices,b=grid1.vertices,k=(i% (a.length/10))*10;
 flatSamples++;
 if(a[k]===b[k]&&a[k+1]===b[k+1]&&a[k+2]===b[k+2]&&a[k+9]===b[k+9])flattenOK++;
}
test('shore_bed_and_shoreline_height_not_displaced',flatSamples===flattenOK);
const geom={legacyBuildings:C.buildings.length,mappedBuildingMasses:C.city20DistrictBuildings.length,
 existingEntrances:C.entrancePortals.length,roadRoutes:C.roads461.length,staticMeshes:C.boxes.length,
 coastalTerrainVertices:grid1.vertices.length/10,coastalTriangles:grid1.indices.length/3,
 changedCoastalVertexColorComponents:colorChanges,indexErrors,geometricErrors,
 addedTerrainTriangles:0,addedWorldMeshes:0,additionalDrawCalls:0,additionalWaterTextures:0,changedCoastalFallbackTriangleColors:changedMeshes,
 waterZoneColors:['open sea','sheltered canals','marsh/wetlands'],
 shorePaletteCumulative:C.city20Stage05ShoreStats};
const report={project:'SUNSET STATE CITY20',stage:5,baseStage:4,
 status:'CPU/geometry/shader source acceptance; 1920x1080 >=50FPS on target GPU UNVERIFIED',
 geometry:geom,
 benchmark:{beforeWorldConstructionMs:base.buildMs,afterWorldConstructionMs:candidate.buildMs,
  note:'Uncontrolled CPU build durations; not GPU FPS, GPU frame time or a reproducible performance benchmark.',
  requiresNativeGpuMeasurement:true,requestedPixels:[1920,1080],requestedMinFps:50},
 checkCount:checks.length,passed:checks.filter(a=>a.passed).length,checks,
 allPassed:checks.every(a=>a.passed)};
fs.writeFileSync(path.join(root,'QA/CITY20_STAGE05_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.checkCount,allPassed:report.allPassed,geometry:geom,benchmark:report.benchmark},null,2));
if(!report.allPassed)process.exitCode=2;
