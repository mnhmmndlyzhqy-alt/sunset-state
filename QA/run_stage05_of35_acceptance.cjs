'use strict';
/* Genuine engine/Game CPU traversal, fake renderer. NO GPU/FPS/visual claims. */
const fs=require('fs'),path=require('path');
const {ctx,H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
g.nav445.draw=()=>{};g.nav445.bake=()=>{};g.updateHUD=()=>{};
const flags=process.env.STAGE05_ENTRIES_OFF==='1';
const tests=[],failures=[],descriptions=[];
function check(label,ok,detail={}){const t={label,pass:!!ok,detail};tests.push(t);if(!ok){failures.push(t);console.error('FAILED',label,JSON.stringify(detail).slice(0,700));}}
check('stage04_full_game_world_preserved',w.buildings.length===84&&w.roads461.length===52,{legacyBuildings:w.buildings.length,roads:w.roads461.length});
check('stage2_and_stage3_road_fixes_preserved',w.roads461.find(r=>r.id==='northRing')?.points?.length>1&&w.roads461.find(r=>r.id==='privateSpine469')?.points?.length===13);
check('city20_registered_building_footprints_still_130',w.city20DistrictBuildings.length===130);
check('stage04_compact_hotel_unchanged',w.stage04AccessStats?.oneCompactHotelOpened===true&&w.entrancePortals[298]?.stage04CompactHotel===true);
check('stage04_orphan_215_portals_remain_disabled',w.entrancePortals.slice(0,298).filter(p=>!p.interiorReady).length===215);
check('all_legacy_portal_id_values_preserved',w.entrancePortals.slice(0,299).every((p,i)=>p.id===i));
check('stage05_portal_count_429',w.entrancePortals.length===429,{total:w.entrancePortals.length});
check('active_entrance_count_214',w.entrancePortals.filter(p=>p.interiorReady).length===214,{ready:w.entrancePortals.filter(p=>p.interiorReady).length});
check('stage05_registry_reports_130_entries',w.stage05City20Stats?.entrancesAdded===130,w.stage05City20Stats?.entrancesAdded);
check('stage05_registry_130_actual_split_collision_footprints',w.stage05City20Stats?.splitCollisionFootprints===130);
check('stage05_registry_130_cut_exterior_masses',w.stage05City20Stats?.cutExteriorVolumes>=130);
check('all_registered_new_plans_130',w.structuralPlans.filter(p=>p.stage05City20).length===130);
const legacyIDs=new Set(w.entrancePortals.slice(0,299).map(p=>p.id)),seen=new Set();
const entries=w.entrancePortals.slice(299);const trafficBefore=w.roads461.map(v=>v.id+':'+v.points.length).join('|');
const cover=entries.map(p=>{
 const s=w.city20DistrictBuildings.find(s=>s.id===p.city20OwnerId),plan=w.structuralPlans.find(t=>t.outerShell.x===p.buildingX&&t.outerShell.z===p.buildingZ);
 const door=w.stage42Doors.find(d=>d.id===p.id);
 const indexed=[...w.lobbyDoors443.values()].some(arr=>arr.some(d=>d.id===p.id));
 const orphanClear=!legacyIDs.has(p.id)&&!seen.has(p.id);seen.add(p.id);
 const center=!!s&&p.x===s.x&&p.z<s.z-s.depth*.5;
 const coast=!!s&&H.reference469.coast(p.x,p.z-1.7)>1.5&&!H.coast461.isRouteRoad(p.x,p.z-1.7);
 const newId=!!s&&!!plan&&plan.stage05City20&&plan.stage05Kind===s.kind;
 let pathClear=!!s,blocks=[];
 // Exercise w.nearby()'s live spatial collision index along every centerline.
 if(s)for(let z=p.z-1.5;z<s.z+s.depth*.5-2.15;z+=.40){
   const matches=w.nearby(p.x,z).filter(o=>Math.abs(o.x-p.x)<o.hw+.63&&Math.abs(o.z-z)<o.hd+.63);
   if(matches.length){pathClear=false;if(blocks.length<4)blocks.push([+z.toFixed(2),matches.length]);}
 }
 return {id:p.id,owner:p.city20OwnerId,valid:orphanClear&&center&&coast&&newId&&!!door&&indexed&&pathClear,center,coast,newId,door:!!door,indexed,pathClear,blocks};
});
check('all_130_unique_reachable_new_entrance_descriptors',cover.length===130&&cover.every(c=>c.valid),{bad:cover.filter(c=>!c.valid).slice(0,12)});
check('all_130_new_doors_registered_for_the_game',cover.every(c=>c.door&&c.indexed));
check('all_130_new_external_collision_passages_clear',cover.every(c=>c.pathClear),{bad:cover.filter(c=>!c.pathClear).slice(0,10)});
check('all_130_reference_entrance_sites_safe_land_not_road',cover.every(c=>c.coast));
check('all_130_no_existing_legacy_entry_ids_overwritten',!entries.some(p=>p.id<299));
check('city20_built_new_interior_metadata_available',w.city20DistrictBuildings.every(s=>s.interiorAvailable&&s.city20Stage05PortalId>=299));
check('only_exact_130_new_owners',new Set(entries.map(p=>p.city20OwnerId)).size===130);
check('no_road_point_count_changes',w.roads461.map(v=>v.id+':'+v.points.length).join('|')===trafficBefore);
// Gameplay tests: Game.nearestEntrance -> begin -> animated entry -> real interiors
// -> floor transition when available -> exit animation -> returns outdoors.
const gameplay=[];
for(const p of entries){
  const spec=w.city20DistrictBuildings.find(s=>s.id===p.city20OwnerId),plan=w.structuralPlans.find(q=>q.stage05City20&&q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);
  g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
  g.avatar.x=p.x;g.avatar.z=p.z-2.05;g.avatar.y=H.outdoorHeight(g.avatar.x,g.avatar.z);
  let nearest=false,begun=false,inside=false,sceneFit=false,liftOK=null,exit=false,error=null;
  try{
    nearest=g.nearestEntrance()?.id===p.id;
    begun=g.beginBuildingEntry(p.id);
    if(begun){g.updateBuildingEntry(2);const v=g.indoor;inside=v?.portalId===p.id&&!!v.scene&&!!v.plan;
      if(inside){
        const q=v.scene,bounds=q.bounds,origin={x:spec.x,z:spec.z};
        const fit=()=>bounds.xmin>=origin.x-spec.width*.5-.03&&bounds.xmax<=origin.x+spec.width*.5+.03&&
          bounds.zmin>=origin.z-spec.depth*.5-.03&&bounds.zmax<=origin.z+spec.depth*.5+.03;
        const vertices=q.boxes.filter(b=>b.layer>=4&&b.h<=4.25&&b.w>0&&b.d>0&&q.stage05Compact);
        const noCutOut=vertices.every(b=>b.x-b.w*.5>=origin.x-spec.width*.5-.05&&b.x+b.w*.5<=origin.x+spec.width*.5+.05&&
          b.z-b.d*.5>=origin.z-spec.depth*.5-.06&&b.z+b.d*.5<=origin.z+spec.depth*.5+.06);
        // Wall motifs may protrude a few cm; hidden rooms beyond the shell are not allowed.
        sceneFit=fit()&&(!q.stage05Compact||noCutOut);
        if(plan.floorCount>1){
          const lift=q.lift;g.avatar.x=lift.x;g.avatar.z=lift.z+.45;
          const started=g.startElevatorTo(1);
          if(started)for(let k=0;k<220&&g.indoor?.liftRide;k++)g.updateInterior(.045,0,0);
          const up=started&&g.indoor?.floor===1;
          if(up){const landing=g.indoor.scene.lift;g.avatar.x=landing.x;g.avatar.z=landing.z+.45;
            const down=g.startElevatorTo(0);if(down)for(let k=0;k<220&&g.indoor?.liftRide;k++)g.updateInterior(.045,0,0);
            liftOK=down&&g.indoor?.floor===0;
          }else liftOK=false;
        } else liftOK=q.maxFloor===0;
        g.avatar.x=g.indoor.scene.entrance.x;g.avatar.z=g.indoor.scene.entrance.z;
        const initiated=g.exitBuilding();if(initiated)for(let k=0;k<55&&g.exitTransition;k++)g.stage42UpdateExit(.045);
        exit=initiated&&!g.indoor&&!g.exitTransition;
      }
    }
  }catch(e){error=e.stack||String(e);}
  gameplay.push({id:p.id,kind:spec.kind,compact:plan.stage05Compact,floors:plan.floorCount,nearest,begun,inside,sceneFit,liftOK,exit,error});
}
for(const [label,key] of [['all_130_new_portals_nearest_discoverable','nearest'],['all_130_new_gameplay_transitions_begin','begun'],['all_130_new_actual_interiors_render_scene_data','inside'],['all_130_interior_bounds_inside_real_buildings','sceneFit'],['all_130_available_lifts_reach_1st_and_return','liftOK'],['all_130_exits_return_to_actual_street','exit']])
  check(label,gameplay.every(g=>g[key]===true),{failed:gameplay.filter(g=>g[key]!==true).slice(0,12)});
check('all_130_real_gameplay_scenarios_no_exceptions',gameplay.every(g=>!g.error),{bad:gameplay.filter(g=>g.error).slice(0,3)});
// Prove 84 old doors were not broken by added ids by exercising direct game paths.
const old=w.entrancePortals.filter(p=>p.interiorReady&&!p.stage05City20),legacy=[];
for(const p of old){
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;
 g.avatar.x=p.x;g.avatar.z=p.z-2;g.avatar.y=H.outdoorHeight(p.x,p.z-2);
 const begin=g.beginBuildingEntry(p.id);
 if(begin)g.updateBuildingEntry(2);
 const inside=!!g.indoor&&g.indoor.portalId===p.id;
 if(inside){g.avatar.x=g.indoor.scene.entrance.x;g.avatar.z=g.indoor.scene.entrance.z;const ex=g.exitBuilding();if(ex)for(let k=0;k<55&&g.exitTransition;k++)g.stage42UpdateExit(.045);}
 legacy.push({id:p.id,begin,inside,exit:!g.indoor&&!g.exitTransition});
}
check('all_84_legacy_building_entry_exit_paths_preserved',legacy.length===84&&legacy.every(v=>v.begin&&v.inside&&v.exit),{bad:legacy.filter(v=>!v.begin||!v.inside||!v.exit).slice(0,5)});

// Check real external, pre-stage05 render meshes are not still blocking a
// doorway visually. Physics-clear does not by itself guarantee mesh-clear.
const visuallyBlocked=[];
for(const s of w.city20DistrictBuildings){
 const front=s.z-s.depth*.5;
 const overlapping=w.boxes.filter(b=>!b.stage05City20&&b.layer===4&&
  Math.abs(b.x-s.x)<b.w*.5+1.35&&Math.abs(b.z-front)<b.d*.5+.35&&
  b.y+b.h*.5>s.baseY+.5&&b.y-b.h*.5<s.baseY+2.95);
 if(overlapping.length)visuallyBlocked.push({id:s.id,count:overlapping.length});
}
check('all_130_external_doorways_free_of_hidden_full_width_visual_facades',visuallyBlocked.length===0,{blocked:visuallyBlocked.slice(0,8)});
// Last-floor scenes use the same shell for high villas and tall towers.
const upperBad=[];
for(const p of entries){
 const spec=w.city20DistrictBuildings.find(s=>s.id===p.city20OwnerId);
 const plan=w.structuralPlans.find(q=>q.stage05City20&&q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);
 const scene=g.sceneForFloor(plan,plan.floorCount-1);
 const good=scene?.boxes?.every(b=>!plan.stage05Compact||b.layer<4||b.h>4.25||
  (b.x-b.w*.5>=spec.x-spec.width*.5-.06&&b.x+b.w*.5<=spec.x+spec.width*.5+.06&&
   b.z-b.d*.5>=spec.z-spec.depth*.5-.06&&b.z+b.d*.5<=spec.z+spec.depth*.5+.06));
 if(!good)upperBad.push(p.id);
}
check('all_130_last_floor_scenes_fit_original_building_shell',upperBad.length===0,{bad:upperBad.slice(0,8)});
// Exercise actual stair control and continuous walk progression, not only lift.
const testStair=entries.find(p=>{const plan=w.structuralPlans.find(q=>q.stage05City20&&q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);return plan.stage05Compact&&plan.floorCount>1;});
let stairOK=false,stairError='';
try{
 g.indoor=null;g.entryTransition=null;g.exitTransition=null;g.inVehicle=false;
 g.avatar.x=testStair.x;g.avatar.z=testStair.z-2;g.avatar.y=H.outdoorHeight(g.avatar.x,g.avatar.z);
 if(g.beginBuildingEntry(testStair.id)){
  g.updateBuildingEntry(2);
  const up=g.indoor.scene.stairs.up;g.avatar.x=up.x;g.avatar.z=up.z;
  const started=g.startStairs(1);for(let i=0;i<80&&g.indoor?.stairTrip;i++)g.updateStairs(.2,1);
  stairOK=started&&g.indoor?.floor===1&&!g.indoor.stairTrip;
 }
}catch(e){stairError=String(e)}
check('compact_villa_stair_walk_reaches_first_floor',stairOK,{id:testStair?.id,error:stairError});

check('cpu_world_objects_finite_after_stage05',w.boxes.every(o=>[o.x,o.y,o.z,o.w,o.h,o.d].every(Number.isFinite)));
const result={stage:5,source:'real Game class, city20 generator, exterior world/physics and interior runtime, with fake renderer',gpuVerified:false,pass:tests.filter(t=>t.pass).length,total:tests.length,failed:failures.length,summary:{newBuildings:w.city20DistrictBuildings.length,oldAccessible:old.length,newAccessible:entries.length,totalAccessible:w.entrancePortals.filter(p=>p.interiorReady).length,portals:w.entrancePortals.length,compact:w.stage05City20Stats?.compactInteriors,gameplayTested:gameplay.length,legacyTested:legacy.length,buildings:w.buildings.length,roads:w.roads461.length},cases:tests,gameplay};
fs.writeFileSync(path.join(__dirname,'STAGE05_OF35_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.pass,total:result.total,failures:failures.slice(0,4),summary:result.summary},null,2));
if(failures.length)process.exitCode=1;
