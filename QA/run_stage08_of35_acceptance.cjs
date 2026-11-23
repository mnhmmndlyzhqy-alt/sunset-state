'use strict';
/* Genuine City20 engine/world with a fake renderer (NO GPU/pixel/FPS claims). */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {H,g,ctx}=require('./stage05_bootstrap.cjs');
const w=g.world,s=w.stage08FacadeStats,root=path.join(__dirname,'..');
const tests=[],issues=[],check=(label,pass,details)=>{const row={label,pass:!!pass,details};tests.push(row);if(!pass){issues.push(row);console.error('FAILED',label,JSON.stringify(details)?.slice(0,700));}};
const near=(a,b,t=.035)=>Math.abs(a-b)<=t;
const total=w.boxes.length,ms=w.boxes.filter(b=>b.stage08Facade),pane=ms.filter(b=>b.stage08Part==='glass'),owners=new Map(w.city20DistrictBuildings.map(b=>[b.id,b]));
const FACE={north:{axis:'z',sign:-1},east:{axis:'x',sign:1},west:{axis:'x',sign:-1}};
const warp=(x,z,a)=>({x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)});
check('stage08_runtime_installed',typeof H.stage08SideRearWindows?.enhance==='function');
check('stage08_applied_exactly_once',s?.stage===8&&H.stage08SideRearWindows.enhance(w)===s);
check('all_130_city20_structures_covered',s?.buildingCount===130&&new Set(pane.map(v=>v.stage08Owner)).size===130);
check('three_target_faces_present',Object.keys(s.faces).length===3&&['north','east','west'].every(f=>s.faces[f]>0));
check('southern_previous_facade_not_reduplicated',pane.every(p=>p.stage08Face!=='south'));
check('windows_match_counts',s.windowBays===pane.length&&s.glazing===pane.length&&s.sills===pane.length&&s.trim===pane.length);
check('metadata_complete',ms.every(m=>Number.isInteger(m.stage08Row)&&Number.isInteger(m.stage08Bay)&&typeof m.stage08Owner==='string'&&!!FACE[m.stage08Face]));
check('materials_existing_and_glass_present',pane.every(m=>m.material==='glass')&&ms.filter(m=>m.stage08Part==='reveal').every(m=>m.material==='metal'));
check('no_physics_modification',s.collisionsAdded===0&&w.solids.every(p=>!p.stage08Facade));
check('no_vehicle_route_or_entrance_count_changes',w.roads461.length===52&&w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
check('stage07_34_rotations_persist',w.city20DistrictBuildings.filter(p=>p.streetAligned).length===34&&s.rotatedBuildingsCovered===34);
check('stage07_original_boxes_unchanged_by_the_facade_patch',s.visualMeshesAdded===ms.length&&total-ms.length===188644,{unchanged:total-ms.length});
check('low_geometry_overhead',s.visualMeshesAdded<=6000&&s.visualMeshesAdded<total*.04, {added:s.visualMeshesAdded,total});
check('every_mesh_finite_and_nonzero',ms.every(m=>[m.x,m.y,m.z,m.w,m.h,m.d,m.yaw].every(Number.isFinite)&&Math.min(m.w,m.h,m.d)>0));
check('distance_LoD_set_and_bounded',ms.every(m=>m.visibilityCap>200&&m.visibilityCap<=1130&&m.lodMax===m.visibilityCap));
check('no_nearby_solid_created_for_fake_windows',!ms.some(m=>m.stage07AlignedSolid||m.hw||m.hd));
check('stage09_primary_windows_preserved',w.city20Stage09Stats?.windowPanels>0&&w.boxes.some(m=>m.city20Stage09Owner));
check('glass_bays_have_reveals_and_sills',pane.every(v=>['reveal','sill'].every(kind=>ms.some(b=>b.stage08Owner===v.stage08Owner&&b.stage08Face===v.stage08Face&&b.stage08Bay===v.stage08Bay&&b.stage08Row===v.stage08Row&&b.stage08Part===kind))));
check('windows_grouped_by_actual_site_kind',Object.keys(s.byKind).length===7&&Object.values(s.byKind).reduce((a,b)=>a+b,0)===pane.length);
check('no_extra_dynamic_door_or_structural_plan',w.stage42Doors.length===214&&w.structuralPlans.filter(p=>p.stage05City20).length===130);
check('benchmark_flags_are_honest',s.gpu1080pVerified===false&&s.actualOpeningsCut===false&&s.breaksGlass===false);
const errors=[],protectedBays=[];
for(const p of pane){
  const b=owners.get(p.stage08Owner),q=w.entrancePortals[b?.city20Stage05PortalId];
  if(!b||!q){errors.push({id:p.stage08Owner,reason:'missing building or portal'});continue;}
  const yaw=b.stage07Yaw||0;
  if(!near(p.yaw,yaw,.00001)||!near(p.stage08Yaw,yaw,.00001))errors.push({id:b.id,reason:'yaw mismatch'});
  const pos=warp(p.x-b.x,p.z-b.z,-yaw),f=FACE[p.stage08Face];
  const body=H.stage08SideRearWindows.tierAt(w,b,p.y,p.h*.5+.12);
  if(!body){errors.push({id:b.id,reason:'no supporting facade tier',y:p.y});continue;}
  const expected=(f.axis==='x'?body.w:body.d)*.5;
  const actual=f.axis==='x'?pos.x*f.sign:pos.z*f.sign;
  if(actual<expected+.06||actual>expected+.40)errors.push({id:b.id,reason:'not flush to real outer wall',actual,expected});
  const along=f.axis==='x'?pos.z:pos.x;
  if(Math.abs(along)>((f.axis==='x'?body.d:body.w)*.5)-p.h*.2)
    errors.push({id:b.id,reason:'pane near overhang',along});
  const doorway=H.stage08SideRearWindows.portalFace(b,q);
  if(p.stage08Row===0&&doorway?.face===p.stage08Face&&Math.abs(along-doorway.along)<
     q.width*.5+(f.axis==='x'?p.d:p.w)*.5+.29)
    protectedBays.push({id:b.id,face:p.stage08Face,along,doorway:doorway.along});
}
check('all_window_glazing_is_attached_to_real_wall_planes',errors.length===0,errors.slice(0,10));
check('doorways_have_no_opaque_faux_glass_bays',protectedBays.length===0,protectedBays.slice(0,10));
check('1348plus_bays_on_side_and_rear',pane.length>=1400,{panes:pane.length});
check('old_reference_map_and_3d_models_retained',fs.existsSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))&&fs.existsSync(path.join(root,'assets/stage07_street_aligned_buildings.js')));
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
check('stage08_loaded_after_stage07_before_engine',html.indexOf('stage07_street_aligned_buildings.js')<html.indexOf('stage08_side_rear_windows.js')&&html.indexOf('stage08_side_rear_windows.js')<html.indexOf('engine44.js'));
check('A_B_off_controls_present',H.stage08SideRearWindows.off()===false&&html.includes('stage08_side_rear_windows.js'));
check('baseline_multi_floor_interiors_still_active',w.city20DistrictBuildings.filter(p=>!p.streetAligned).some(p=>w.structuralPlans.some(q=>q.outerShell.x===p.x&&q.outerShell.z===p.z&&q.floorCount>1)));
const report={stage:8,deviceGpuTested:false,realScreenshot:false,passed:tests.filter(t=>t.pass).length,total:tests.length,failures:issues,stats:s,tests};
fs.writeFileSync(path.join(__dirname,'STAGE08_OF35_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:report.passed,total:report.total,issues:report.failures,stats:s},null,2));
if(issues.length)process.exitCode=1;
