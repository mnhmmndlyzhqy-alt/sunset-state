'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'../..'), read=p=>fs.readFileSync(path.join(root,p),'utf8');
const scripts=[...read('START_GAME.html').matchAll(/<script\s+src="([^"]+\.js)"/g)].map(m=>m[1]);
function load(original){const c={console,Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,TextEncoder,Math,Date,Buffer,URLSearchParams,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''}};c.globalThis=c;c.window=c;vm.createContext(c);for(const s of scripts)new vm.Script(original&&s==='assets/coast_461.js'?read('BACKUPS/STAGE03_OF35/coast_461.stage02.js'):read(s),{filename:s}).runInContext(c,{timeout:60000});new vm.Script(read('engine44.js')).runInContext(c,{timeout:60000});return {H:c.Heatline,w:new c.Heatline.World()};}
const before=load(true),after=load(false),checks=[];
function check(name,pass,details){checks.push({name,pass:!!pass,details});if(!pass)console.error('FAILED',name,details||'');}
const id='privateSpine469',get=(v)=>v.w.roads461.find(r=>r.id===id),a=get(before),b=get(after);
const len=pts=>pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-pts[i].x,p.z-pts[i].z),0);
const bends=pts=>pts.slice(1,-1).map((p,i)=>{const a=pts[i],c=pts[i+2],u=[p.x-a.x,p.z-a.z],v=[c.x-p.x,c.z-p.z];return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI});
const xz=p=>[p.x,p.z].map(v=>Math.round(v*1e8)/1e8),same=(p,q)=>JSON.stringify(xz(p))===JSON.stringify(xz(q));
const beforeRaw=before.H.coast461.roads.find(r=>r.id===id), afterRaw=after.H.coast461.roads.find(r=>r.id===id);
check('base_waypoints_14_to_13',beforeRaw.points.length===14&&afterRaw.points.length===13,{before:beforeRaw.points.length,after:afterRaw.points.length});
check('only_spurious_first_waypoint_removed',beforeRaw.points.length===afterRaw.points.length+1&&beforeRaw.points.slice(1).every((p,i)=>same(p,afterRaw.points[i])));
check('false_house_spur_removed',same(beforeRaw.points[1],afterRaw.points[0])&&!same(beforeRaw.points[0],afterRaw.points[0]));
check('end_of_road_unchanged',same(beforeRaw.points.at(-1),afterRaw.points.at(-1)));
check('crossing_anchor_preserved',same(beforeRaw.points[2],afterRaw.points[1]));
check('135_degree_hook_removed',Math.max(...bends(beforeRaw.points))>135&&Math.max(...bends(afterRaw.points))<80,{maxBefore:Math.max(...bends(beforeRaw.points)),maxAfter:Math.max(...bends(afterRaw.points))});
check('source_line_changed_only_one_route',before.H.coast461.roads.every(r=>{if(r.id===id)return true;const t=after.H.coast461.roads.find(n=>n.id===r.id);return r.points.length===t.points.length&&r.points.every((p,i)=>same(p,t.points[i]));}));
check('52_routes_preserved',before.w.roads461.length===52&&after.w.roads461.length===52);
check('51_other_road_sample_centerlines_same',before.w.roads461.filter(r=>r.id!==id).every(r=>{const t=after.w.roads461.find(n=>n.id===r.id);return r.samples.length===t.samples.length&&r.samples.every((p,i)=>same(p,t.samples[i])&&Math.abs(p.y-t.samples[i].y)<1e-7)}));
check('sampled_road_finite',b.samples.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
check('unchanged_downstream_road_endpoint',same(a.samples.at(-1),b.samples.at(-1)));
check('road_centerline_has_no_extreme_sample_bend',Math.max(...bends(b.samples))<85,{maxSampleBend:Math.max(...bends(b.samples))});
check('road_at_centerline',b.samples.every((p,i)=>i%5!==0||!!after.H.coast461.roadAt(p.x,p.z)));
check('building_counts_identical',before.w.buildings.length===after.w.buildings.length&&before.w.city20DistrictBuildings.length===after.w.city20DistrictBuildings.length);
check('portals_identical',before.w.entrancePortals.length===after.w.entrancePortals.length&&before.w.entrancePortals.every((p,i)=>{let q=after.w.entrancePortals[i];return p.id===q.id&&p.x===q.x&&p.z===q.z;}));
check('collision_solids_remain_within_expected_local_road_delta',Math.abs(before.w.solids.length-after.w.solids.length)<=4,{before:before.w.solids.length,after:after.w.solids.length});
check('other_road_widths_preserved',before.w.roads461.every(r=>after.w.roads461.find(q=>q.id===r.id).width===r.width));
const simulations=[];
for(const dir of [1,-1]){
 const start=dir===1?7:Math.min(55,b.samples.length-10),p=b.samples[start],q=b.samples[start+dir*3],yaw=Math.atan2(-(q.x-p.x),-(q.z-p.z));
 const car=after.H.makeCar('civilian',p.x,p.z,yaw,0);car.speed=5;car.vx=-Math.sin(yaw)*5;car.vz=-Math.cos(yaw)*5;car.route477={road:b,index:start,dir,offset:0,finished:false};
 const game={world:after.w,civilian:[car],police:[],player:{x:9999,z:9999,alive:false}};
 let invalid=0,offroad=0,steps=0;for(let i=0;i<700;i++){let x=car.x,z=car.z;const command=after.H.trafficControl477(game,car,{mustStop:false,giveWay:false,emergency:false});after.H.stepCar(car,command,.03);after.H.guardBridgeRails477(car,x,z);steps++;if(![car.x,car.z,car.speed,car.yaw].every(Number.isFinite)){invalid++;break;}if(!after.H.coast461.roadAt(car.x,car.z))offroad++;}
 simulations.push({direction:dir,start,steps,invalid,offroad,endX:car.x,endZ:car.z});
}
for(const s of simulations)check('traffic_finite_dir_'+s.direction,s.invalid===0,s);
const metrics={route:id,waypointsBefore:beforeRaw.points.length,waypointsAfter:afterRaw.points.length,lengthBefore:len(beforeRaw.points),lengthAfter:len(afterRaw.points),removedMeters:len(beforeRaw.points)-len(afterRaw.points),maxBendBefore:Math.max(...bends(beforeRaw.points)),maxBendAfter:Math.max(...bends(afterRaw.points)),samplesBefore:a.samples.length,samplesAfter:b.samples.length,maxSampleBendAfter:Math.max(...bends(b.samples)),roadCount:after.w.roads461.length,entrances:after.w.entrancePortals.length,solids:after.w.solids.length,solidsBefore:before.w.solids.length,simulations};
const report={stage:3,totalStages:35,issueId:'S01-RD-02',kind:'actual game source, Node CPU engine, no GPU',checks,passed:checks.filter(c=>c.pass).length,total:checks.length,metrics,GPUverified:false};
fs.writeFileSync(path.join(root,'QA/35_STAGE_MASTER/STAGE03_PRIVATE_SPINE_ACCEPTANCE.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),metrics},null,2));if(report.passed!==report.total)process.exitCode=2;
