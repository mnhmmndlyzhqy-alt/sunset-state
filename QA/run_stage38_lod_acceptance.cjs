'use strict';
/* Stage38 acceptance: real cumulative world, real GLRenderer culler, CPU/GL emulation.
   No claim of hardware GPU, screen capture or real FPS validation. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {ctx,H,g}=require('./stage05_bootstrap.cjs');
const mod=H.stage38AdaptiveLOD,GL=ctx.__Stage23RealGLRenderer;
const checks=[];const check=(name,ok,detail)=>{const pass=!!ok;checks.push({name,pass,detail});if(!pass)console.error('FAIL',name,detail||'');};
const source=g.world.boxes;
const fingerprint=()=>{
 let h=2166136261>>>0;
 for(const o of source){
  for(const v of [o.x,o.y,o.z,o.w,o.h,o.d]){const n=Math.round((v||0)*1000);h=Math.imul(h^n,16777619)>>>0;}
  h=Math.imul(h^(o.shape||'cube').length,16777619)>>>0;
 }
 return h;
};
const originalFingerprint=fingerprint();
check('module_available',!!mod&&typeof mod.expandStatic==='function');
check('world_unchanged_static_count',source.length>190000,source.length);
check('existing_city_52_roads',g.world.roads461.length===52);
check('existing_214_active_portals',g.world.entrancePortals.filter(p=>p.interiorReady).length===214);
check('existing_59_shops',g.world.retailShops.length===59);
check('stage37_renderer_still_present',!!H.stage37RenderOptimizer);
check('stage36_profiler_still_present',!!H.stage36PerformanceAudit);
const candidates={urban_crown:0,urban_frond:0,sphere:0,cylinder:0};
for(const o of source){const k=mod.kind(o);if(k)candidates[k]++;}
for(const [k,min] of Object.entries({urban_crown:4000,urban_frond:50,sphere:50,cylinder:600}))
 check('eligible_authored_'+k,candidates[k]>=min,candidates[k]);
const expanded=mod.expandStatic(source);
const high=expanded.filter(o=>o.stage38Tier==='high'),low=expanded.filter(o=>o.stage38Tier==='low');
check('expanded_renderer_only_proxies',expanded!==source&&expanded.length===source.length+high.length,expanded.length);
check('paired_near_far_counts',high.length===low.length&&low.length>4800,{high:high.length,low:low.length});
check('original_world_count_unaffected',source.length===196817,source.length);
check('only_authored_mesh_types',low.every(o=>['urban_crown_lod38','urban_frond_lod38','sphere_lod38','cylinder_lod38'].includes(o.shape)));
check('render_only_flags',low.every(o=>o.stage38Proxy===true && o.stage38Source && o.stage38Tier==='low' && o.stage38Switch>0));
check('no_physics_or_save_change',mod.stats.worldMutations===0&&mod.stats.saveChanges===0&&mod.stats.colliderMutations===0);
check('no_world_coordinate_change',fingerprint()===originalFingerprint);
const copyFlags=['x','y','z','w','h','d','yaw','color','material','glow','layer','pitch','roll','spin','gradeX','gradeZ'];
for(const k of Object.keys(candidates)){
 const pairs=low.filter(x=>x.stage38Kind===k);
 check('preserve_all_transforms_'+k,pairs.every(x=>copyFlags.every(p=>x[p]===x.stage38Source[p])),pairs.length);
 check('no_authored_asset_mutation_'+k,pairs.every(x=>x.stage38Source.stage38Proxy!==true));
}
const meshes={urban_crown:mod.crownTriangles(),sphere:mod.sphereTriangles(),
 urban_frond:mod.frondTriangles(H.URBAN_FROND_MESH),cylinder:mod.cylinderTriangles()};
for(const [k,mesh] of Object.entries(meshes)){
 const actual=mesh.length*(k==='urban_frond'?2:1);
 check('real_low_mesh_triangles_'+k,actual===mod.trianglesLow[k],{actual,declared:mod.trianglesLow[k]});
 check('actual_triangle_reduction_'+k,actual<mod.trianglesHigh[k]);
 check('finite_mesh_positions_'+k,mesh.every(t=>t.length===3&&t.every(p=>p.length===3&&p.every(Number.isFinite))));
}
check('low_mesh_maintains_some_tris',Object.values(meshes).every(m=>m.length>=12));
const fullOpt=mod.stats.theoreticalFarTrianglesBefore;
const fullLow=mod.stats.theoreticalFarTrianglesAfter;
check('theoretical_reduced_triangles',fullLow<fullOpt*.45,{before:fullOpt,after:fullLow,ratio:fullLow/fullOpt});
const resetContext=()=>({source:null,cells:new Map(),global:[],skyline:[],visible:[],glazing:[],cullX:NaN,cullZ:NaN});
const r=Object.create(GL.prototype);
Object.assign(r,{qualityScale:1,glWidth:1920,glHeight:1080,cullSquared475:true,detailEnabled475:false,groupFlags476:{},instanceScratch:new Float32Array(0)});
const p=g.cam,camera=(x,y,z)=>({...p,x,y,z,tx:x+(p.tx-p.x),ty:p.ty,tz:z+(p.tz-p.z)});
// Include every eligible foliage object, and every 17th other world part.
const sampled=source.filter((o,i)=>i%17===0||!!mod.kind(o));
const cams=[['spawn',camera(p.x,p.y,p.z)],['market',camera(p.x+155,p.y,p.z-96)],
 ['aerial',camera(p.x+330,155,p.z-95)],['west',camera(p.x-290,p.y,p.z+250)],
 ['coast',camera(p.x+140,p.y,p.z-490)],['street',camera(p.x+70,p.y,p.z+120)]];
const viewCoverage=(list,cam)=>{
 const group=new Map();
 for(const o of list){const original=o.stage38Source||o;
  const dist=Math.hypot(o.x-cam.x,o.z-cam.z);
  const visible=H.distanceVisibility(dist,o.lodMin||0,o.lodMax||0,o.visibilityCap||0);
  if(visible>1e-6){const a=group.get(original)||{weight:0,parts:0};a.weight+=visible;a.parts++;group.set(original,a);}
 }
 return group;
};
const coverage=[];
for(const [name,c] of cams){
 ctx.__SUNSET_STAGE38_LOD_OFF=true;
 const oldScene=resetContext(),old=r.getVisibleStatic(sampled,c,oldScene);
 ctx.__SUNSET_STAGE38_LOD_OFF=false;
 const newScene=resetContext(),updated=r.getVisibleStatic(sampled,c,newScene);
 const oldG=viewCoverage(old,c),newG=viewCoverage(updated,c);
 const left=[...oldG.keys()].filter(o=>!newG.has(o));
 const added=[...newG.keys()].filter(o=>!oldG.has(o));
 check('no_disappearing_visible_shapes_'+name,left.length===0,{left:left.length,old:oldG.size,new:newG.size});
 check('no_unexpected_coverage_'+name,added.length===0,{added:added.length});
 check('static_source_identity_'+name,newScene.source===sampled&&oldScene.source===sampled);
 check('stage37_numeric_cells_'+name,!!H.stage37RenderOptimizer.grid(newScene));
 const switched=updated.filter(o=>o.stage38Tier==='high').length;
 coverage.push({name,source:sampled.length,baselineCpuVisible:old.length,optimizedCpuVisible:updated.length,
   baselineShaderVisible:oldG.size,optimizedShaderVisible:newG.size,nearSwitchCount:switched});
}
const selected=low[0],at=selected.stage38Switch;
const hi=high.find(o=>o.stage38Source===selected.stage38Source);
check('matching_author_high_low',!!hi&&hi.stage38Switch===at);
for(const d of [at-95,at-42,at-24,at,at+24,at+42,at+95]){
 const a=H.distanceVisibility(d,hi.lodMin||0,hi.lodMax||0,0);
 const b=H.distanceVisibility(d,selected.lodMin||0,selected.lodMax||0,0);
 check('complementary_dither_at_'+d,Math.abs(a+b-1)<1e-9,{high:a,low:b});
}
// A/B switch must rebuild the scene even when source array and camera are unchanged.
const scene=resetContext(),pos=cams[0][1];
ctx.__SUNSET_STAGE38_LOD_OFF=false;r.getVisibleStatic(sampled,pos,scene);
const firstMap=scene.cells;
ctx.__SUNSET_STAGE38_LOD_OFF=true;r.getVisibleStatic(sampled,pos,scene);
const noProxy=scene.visible.every(o=>!o.stage38Proxy);
check('off_rebuilds_scene_and_clears_proxies',noProxy&&scene.cells!==firstMap);
ctx.__SUNSET_STAGE38_LOD_OFF=false;r.getVisibleStatic(sampled,pos,scene);
check('on_rebuilds_renderer_scene',scene.stage38Active===true&&scene.cells!==firstMap&&scene.cells.size>0);
const reindexed=H.stage37RenderOptimizer.grid(scene);
check('stage37_grid_invalidated_and_recached',!!reindexed&&reindexed.size>0);
check('source_world_fingerprint_unchanged_after_culling',fingerprint()===originalFingerprint);
const text=fs.readFileSync(path.join(root,'engine44.js'),'utf8');
for(const k of Object.values(mod.names))check('renderer_registers_low_mesh_'+k,text.includes(`addModel('${k}'`));
check('original_urban_glb_vehicles_preserved',text.includes('i31_')&&text.includes('s11_'));
check('stage18_bird_wildlife_lod_preserved',text.includes('crocLodStates'));
check('stage17_shader_dither_preserved',text.includes('vDistanceBands')&&text.includes('bayer'));
check('stage38_module_activated_by_actual_renderer',GL.prototype.getVisibleStatic.toString().includes('stage38RenderObjects'));
ctx.__SUNSET_STAGE38_LOD_OFF=false;
const result={stage:38,baseline:37,environment:'real cumulative game, actual CPU renderer culler, no hardware WebGL',
 tests:checks,passed:checks.filter(x=>x.pass).length,total:checks.length,
 staticWorld:source.length,eligibleCandidates:candidates,convertedModels:high.length,
 meshTriangles:{original:mod.trianglesHigh,low:mod.trianglesLow},
 theoreticalFoliageTriangles:{before:fullOpt,after:fullLow,reductionPercent:+((1-fullLow/fullOpt)*100).toFixed(2)},
 sampleCameras:coverage,actualFpsMeasured:false,nativeGpuVerified:false};
fs.writeFileSync(path.join(__dirname,'STAGE38_LOD_ACCEPTANCE_RESULT.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,total:result.total,candidates,converted:high.length,
 theorTriangles:result.theoreticalFoliageTriangles,coverage,failures:checks.filter(x=>!x.pass)},null,2));
if(result.passed!==result.total)process.exitCode=1;
