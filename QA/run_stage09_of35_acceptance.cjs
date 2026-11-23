'use strict';
/* Stage09 source-game terrain & interactivity verification, using real Game world
   with a fake renderer. Not GPU screenshot/FPS confirmation. */
const fs=require('fs'),path=require('path');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, api=H.stage09CoastalEntries, s=w.stage09CoastalAudit;
const active=w.entrancePortals.filter(p=>p.interiorReady),inactive=w.entrancePortals.filter(p=>!p.interiorReady);
const waterDormant=inactive.filter(p=>H.reference469.coast(p.x,p.z)<0);
const errors=[],checks=[];function test(name,ok,data){let q={name,pass:!!ok};if(data!==undefined)q.data=data;checks.push(q);if(!ok){errors.push(q);console.error('FAILED',name,JSON.stringify(data)?.slice(0,500))}}
const before={geometry:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,roadPoints:w.roads461.map(r=>JSON.stringify(r.points)),portals:w.entrancePortals.length,
  active:active.length,doors:w.stage42Doors.length,rotated:w.city20DistrictBuildings.filter(b=>b.streetAligned).length,windowBays:w.stage08FacadeStats.windowBays};
const rerun=api.inspect(w,{strict:true});
test('report_installed_once_and_idempotent',s===api.install(w)&&s.stage===9);
test('new_check_can_be_reproduced_in_strict_mode',JSON.stringify(s)===JSON.stringify(rerun));
test('source_429_portals_remain',w.entrancePortals.length===429);
test('214_usable_entrances_preserved',active.length===214);
test('215_inactive_historical_descriptors_kept_inert',inactive.length===215);
test('116_coast_flags_are_inactive_descriptors_only',waterDormant.length===116&&s.dormantWaterDescriptors===116);
test('water_flag_count_not_confused_with_active',s.waterClassifiedAll===116&&s.activeWaterAtDoor===0);
test('all_214_active_entries_outside_water',s.activeWaterAtDoor===0&&s.nearestActiveShore>=10);
test('all_214_active_6m_approaches_are_land',s.activeWaterWithin6m===0&&s.nearestApproachShore6m>3);
test('active_only_coastal_classification_clear',s.classification==='historical_inactive_descriptors_only'&&s.flags.length===0);
test('near_8m_coastal_site_reported_without_forcing_relocation',s.nearShoreAt8m.length>=1&&s.nearShoreAt8m.every(p=>p.minimum6m>0),s.nearShoreAt8m);
test('all_active_portals_still_have_physical_door_records',active.every(p=>w.stage42Doors.some(d=>d.id===p.id)));
test('all_dormant_water_ids_have_no_interactive_doors',waterDormant.every(p=>!w.stage42Doors.some(d=>d.id===p.id)));
test('all_116_water_dormant_entries_reject_direct_interaction',waterDormant.every(p=>g.enterBuilding(p.id)===false&&g.beginBuildingEntry(p.id)===false));
test('no_fake_indoor_state_from_dormant_entries',!g.indoor&&!g.entryTransition);
test('no_invalid_portal_data_found',s.invalidPortals.length===0);
test('coastal_invariant_fails_closed_in_strict_QA_for_simulated_regression',(()=>{
 const source=waterDormant[0];if(!source)return false;
 try{api.inspect({entrancePortals:[{...source,interiorReady:true}]},{strict:true});return false}catch(e){return String(e).includes('coast safety regression')}
})());
test('coastal_validator_does_not_mutate_original_descriptors',w.entrancePortals.every((p,i)=>p.id===i));
test('stage08_1586_windows_still_exist',w.stage08FacadeStats.windowBays===1586&&before.windowBays===1586);
test('stage07_34_rotations_still_exist',before.rotated===34);
test('52_roads_and_all_waypoints_unchanged',w.roads461.length===52&&w.roads461.every((r,i)=>JSON.stringify(r.points)===before.roadPoints[i]));
test('no_geometry_or_collision_change_from_inspection',w.boxes.length===before.geometry&&w.solids.length===before.solids);
test('no_door_or_portal_count_change',w.entrancePortals.length===before.portals&&w.stage42Doors.length===before.doors);
test('gpu_visual_not_claimed',s.gpuVerified===false&&s.renderedScreenshotVerified===false&&s.worldMutated===false);
test('stage09_script_position_correct',(()=>{const html=fs.readFileSync(path.join(__dirname,'../START_GAME.html'),'utf8');return html.indexOf('stage08_side_rear_windows.js')<html.indexOf('stage09_coastal_entrance_audit.js')&&html.indexOf('stage09_coastal_entrance_audit.js')<html.indexOf('engine44.js')})());
const summary={stage:9,passed:checks.filter(x=>x.pass).length,total:checks.length,failed:errors.length,source:'CPU Game world using real engine, fake graphics renderer',gpuVerified:false,stats:s,checks};
fs.writeFileSync(path.join(__dirname,'STAGE09_OF35_ACCEPTANCE.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({stage:9,passed:summary.passed,total:summary.total,failed:summary.failed,stats:s},null,2));
if(errors.length)process.exitCode=1;
