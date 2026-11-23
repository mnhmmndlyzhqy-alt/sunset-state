'use strict';
/* Real SUNSET STATE game world (full Game constructor; mocked renderer, not GPU).
 * Stage16 glass: source retention, orientation, ray hits, 2-hit shatter, physical
 * car contact, explosion, crack and disappearance of live geometry, and runtime
 * performance probes. Not a browser pixel or FPS test.
 */
const fs=require('fs'),assert=require('assert'),{performance}=require('perf_hooks');
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const checks=[],fails=[],check=(name,pass,details)=>{
  const record={name,pass:!!pass};checks.push(record);
  if(!pass){fails.push({name,details});console.error('FAIL '+name,JSON.stringify(details)?.slice(0,500));}
};
const about={stage:16,issue:'S01-GL-01',kind:'real game JavaScript plus simulated renderer',
  gpuValidated:false,native1080pFpsValidated:false,limits:{maxBreakableFacadePanes:864,
  fpsNotMeasured:true,legacyOpaqueWallRemains:true},samples:[],metrics:{}};
const baseline={boxes:w.boxes.length,solids:w.solids.length,props:w.propSolids.length,
  roads:w.roads461.length,portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length};
const glass=w.glassPanels.filter(p=>p.stage16Facade),unselected=w.boxes.filter(b=>b.stage08Part==='glass'&&!b.stage16Backing),
  backings=w.boxes.filter(b=>b.stage16Backing);
const s=w.stage16GlassStats,owners=new Map(w.city20DistrictBuildings.map(b=>[b.id,b]));
check('module_loaded',!!H.stage16Glass&&H.stage16Glass.off()===false);
check('patch_loaded_after_engine_and_stage15',(()=>{const t=fs.readFileSync('START_GAME.html','utf8');return t.indexOf('stage16_facade_glass.js')>t.indexOf('engine44.js')&&t.indexOf('stage16_facade_glass.js')>t.indexOf('stage15_interior_physics.js');})());
check('glass_registry_864',glass.length===864&&s.selectedGlass===864);
check('legacy_glass_preserved',s.legacyGlass===124&&w.glassPanels.length===988);
check('facades_across_city',s.buildingsCovered===130&&new Set(glass.map(p=>p.stage16Owner)).size===130);
check('rotated_34_buildings',s.rotatedBuildingsCovered===34);
check('three_facades',Object.values(s.faces).every(v=>v>180));
check('unselected_facades_unchanged',unselected.length===722&&unselected.every(b=>b.material==='glass'));
check('static_backing_864',backings.length===glass.length&&backings.every(b=>b.material==='masonry'&&b.stage16OriginalMaterial==='glass'));
check('no_structural_wall_cut_claim',s.originalWallsCut===false);
check('new_collision_bodies_zero',s.collisionBodiesAdded===0&&w.solids.length===3230&&w.propSolids.length===796);
check('world_stays_original_size',baseline.boxes===194555&&baseline.roads===52&&baseline.portals===429&&baseline.active===214);
check('entrances_and_world_preserved',w.stage42Doors.length===214&&w.city20DistrictBuildings.length===130);
check('phase15_and_14_installed',!!H.stage15Interior?.installed&&!!H.stage14Lighting?.installed);
let valid=0,rotated=0,ground=0,existing=0;
for(const p of glass){
  const b=p.stage16Original,building=owners.get(p.stage16Owner),yaw=building?.stage07Yaw||0;
  const found=p.id>=124&&w.glassPanels[p.id]===p&&b?.stage16PaneId===p.id&&
    b.stage08Owner===p.stage16Owner&&b.stage08Face===p.stage16Face;
  check('id_meta_'+p.id,found);
  const geom=[p.x,p.y,p.z,p.w,p.h,p.d,p.stage16Co,p.stage16Si,p.stage16Yaw,
    p.stage16NormalX,p.stage16NormalZ].every(Number.isFinite)&&Math.min(p.w,p.h,p.d)>0;
  check('finite_geometry_'+p.id,geom);
  check('yaw_consistency_'+p.id,Math.abs(yaw-p.stage16Yaw)<1e-7&&Math.abs(b.y-p.y)<1e-7);
  const key=`${Math.floor(p.x/H.BLOCK)},${Math.floor(p.z/H.BLOCK)}`;
  check('cell_registered_'+p.id,(w.glassCells.get(key)||[]).includes(p));
  check('normal_unit_'+p.id,Math.abs(Math.hypot(p.stage16NormalX,p.stage16NormalZ)-1)<1e-6);
  check('glass_in_front_of_backing_'+p.id,Math.abs((p.x-b.x)*p.stage16NormalX+(p.z-b.z)*p.stage16NormalZ-.142)<.0001);
  if(p.stage16Yaw)rotated++;if(p.stage16Row===0)ground++;
  if(p.stage16Row===0||p.stage16Row===1)valid++;
  existing++;
}
about.metrics.registryCoverage={valid,rotated,ground,existing};
check('ground_glass_car_reachable',ground>200);
check('rotated_glass_coverage',rotated>150);
const vec=(x,y,z)=>({x,y,z});
const fireTarget=p=>({origin:vec(p.x+p.stage16NormalX*3,p.y,p.z+p.stage16NormalZ*3),
  dir:vec(-p.stage16NormalX,0,-p.stage16NormalZ)});
const sampled={};
for(const face of ['north','east','west']){
  const p=glass.find(v=>v.stage16Face===face&&Math.abs(v.stage16Yaw)>.02&&v.stage16Row===0);
  check('rotated_sample_'+face,!!p);
  if(!p)continue;
  sampled[face]=p.id;
  const t=fireTarget(p),hit=H.raycastCityShot(t.origin,t.dir,12,w,[],[]);
  check('exact_rotated_raycast_'+face,hit.kind==='glass'&&hit.pane===p,{wanted:p.id,got:hit.pane?.id});
  check('correct_hit_normal_'+face,Math.abs(Math.abs(hit.normal.x*p.stage16NormalX+hit.normal.z*p.stage16NormalZ)-1)<1e-5);
  const span=p.axis==='z'?p.w:p.d;
  const side=p.axis==='z'?vec(p.stage16Co,0,p.stage16Si):vec(-p.stage16Si,0,p.stage16Co);
  const outside=vec(t.origin.x+side.x*(span/2+.54),p.y,t.origin.z+side.z*(span/2+.54));
  const miss=H.raycastCityShot(outside,t.dir,11,w,[],[]);
  check('no_rotated_invisible_AABB_'+face,miss.pane!==p,{got:miss.pane?.id});
}
about.metrics.raycastSamples=sampled;
// Geometry is checked across every registered stage16 pane to catch culling,
// rotation and accidental static/dynamic duplicates, with zero GPU assumptions.
for(const p of glass){
  let draw=[];H.paneGeometry(p,draw);
  check('dynamic_glass_'+p.id,draw.length===1&&draw[0].material==='translucent_glass'&&
     Math.abs(draw[0].yaw-p.stage16Yaw)<1e-7);
  p.chips=1;draw=[];H.paneGeometry(p,draw);
  check('fracture_overlay_'+p.id,draw.length===4&&draw.filter(v=>v.stage16Fracture).length===3);
  p.shattered=true;draw=[];H.paneGeometry(p,draw);
  check('fully_vanished_'+p.id,draw.length===0);
  p.chips=0;p.shattered=false;
}
// Exercise the actual gun path, not just H.damageGlassPane in isolation.
const shot=glass.find(p=>p.stage16Row===0&&p.stage16Face==='north'&&Math.abs(p.stage16Yaw)>.01);
const hitCoords=fireTarget(shot);const oldPed=g.pedestrians;g.pedestrians=[];
const beforeShot={broken:g.panelsBroken,particles:g.particles.length};
const first=g.fireWorldRay(hitCoords.origin,hitCoords.dir);
check('real_game_first_bullet_cracks',first.kind==='glass'&&first.pane===shot&&shot.chips===1&&!shot.shattered);
const second=g.fireWorldRay(hitCoords.origin,hitCoords.dir);
check('real_game_second_bullet_breaks',second.kind==='glass'&&second.pane===shot&&shot.shattered&&g.panelsBroken===beforeShot.broken+1);
check('actual_shatter_generates_fragments',g.particles.filter(x=>x.kind==='glass').length>=28);
let brokenVisual=[];H.paneGeometry(shot,brokenVisual);
check('broken_is_not_drawn',brokenVisual.length===0);
g.pedestrians=oldPed;shot.chips=0;shot.shattered=false;
// Reuse the engine's actual car bumper damage path; rotated facade and elevated
// terrain must not make a row-0 pane immune to collisions.
const carPane=glass.find(p=>p.stage16Row===0&&p.stage16Face==='east'&&Math.abs(p.stage16Yaw)>.01);
const player=g.player;const playerBefore={x:player.x,z:player.z,vx:player.vx,vz:player.vz,speed:player.speed,hp:player.hp},
  savedReport=g.reportOffense;g.reportOffense=function(){};
player.x=carPane.x+carPane.stage16NormalX*1.8;
player.z=carPane.z+carPane.stage16NormalZ*1.8;
player.vx=-carPane.stage16NormalX*13;player.vz=-carPane.stage16NormalZ*13;player.speed=13;
const shardsBefore=g.particles.filter(x=>x.kind==='glass').length;
g.breakGlassOnCarContact(player,carPane.x+carPane.stage16NormalX*2.2,
  carPane.z+carPane.stage16NormalZ*2.2);
check('vehicle_rotated_facade_shatters',carPane.shattered);
check('vehicle_generates_glass_particles',g.particles.filter(x=>x.kind==='glass').length>=shardsBefore+16);
check('vehicle_damage_is_bounded',player.hp>=playerBefore.hp-8);
Object.assign(player,playerBefore);g.reportOffense=savedReport;
carPane.chips=0;carPane.shattered=false;
// The new panels also use the existing explosion and shard paths.
const blast=glass.find(p=>p.stage16Row===0&&p.stage16Face==='west');
const oldExploded=blast.shattered;g.detonateBlast(blast.x,blast.z,9);
check('grenade_breaks_selected_facade',blast.shattered);
blast.shattered=oldExploded;blast.chips=0;
// A concrete CPU timing number is diagnostic only, never an actual FPS claim.
const bench=glass.find(p=>p.stage16Row===0);let hits=0;
const start=performance.now();
for(let j=0;j<160;j++){
  const hit=H.raycastCityShot(...((t)=>[t.origin,t.dir,24,w,[],[]])(fireTarget(bench)));
  if(hit.kind==='glass')hits++;
}
const timeMs=performance.now()-start;
about.metrics.raycast160Ms=+timeMs.toFixed(2);
check('raycast_perf_finite',Number.isFinite(timeMs)&&timeMs<10000);
check('raycast_hits_remain_stable',hits===160);
// Guarantee our acceptance itself restores modified panes so snapshots reflect
// newly loaded gameplay, not the destructive tests.
for(const p of glass){p.chips=0;p.shattered=false;}
check('restored_all_test_panes',glass.every(p=>p.chips===0&&!p.shattered));
const summary={stage:16,checks:checks.length,passed:checks.filter(x=>x.pass).length,
  failed:fails,notes:about,metadata:{legacyGlass:124,newGlass:864,buildingCount:130,
  originalWallsNotCut:true,gpuCheckPending:true}};
fs.writeFileSync('QA/STAGE16_OF35_ACCEPTANCE.json',JSON.stringify(summary,null,2)+'\n');
console.log('Stage16:',summary.passed+'/'+summary.checks,'passed','failures',fails.length,
  'new panes',glass.length,'raycast 160 (CPU)',timeMs.toFixed(1)+'ms');
if(fails.length)process.exitCode=1;
