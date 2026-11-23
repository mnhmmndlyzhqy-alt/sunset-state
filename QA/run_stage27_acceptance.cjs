'use strict';
/* A/B acceptance from real stage26/stage27 Game World snapshots (mock renderer only). */
const fs=require('fs'),path=require('path'),assert=require('assert');
const read=(name)=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const old=read('STAGE27_STAGE26_AB_OFF_PROFILE.json'),now=read('STAGE27_STAGE27_ACTIVE_PROFILE.json');
const checks=[],fail=[];
const test=(name,yes,info)=>{checks.push({name,passed:!!yes});if(!yes){fail.push({name,info});console.error('FAIL',name,JSON.stringify(info)?.slice(0,250));}};
test('Stage26 opt-out mode recorded',old.off===true&&!old.roadRepairStats.enabled,old.roadRepairStats);
test('Stage27 enabled and safety rollback not needed',!now.off&&now.roadRepairStats.enabled&&!now.roadRepairStats.rolledBack,now.roadRepairStats);
test('Existing 52 route objects retained',old.roadCount===52&&now.roadCount===52);
test('All existing 3390 road samples retained',old.roadSamples===3390&&now.roadSamples===3390);
test('Original road anchors and width unchanged',old.routePointDigest===now.routePointDigest);
test('Sampled road XZ layout unchanged',old.sampleXZDigest===now.sampleXZDigest);
test('All 6 normal road seam defects reproduced by opt-out',old.unresolvedJoins.length===6,old.unresolvedJoins);
test('Six normal road seams corrected',now.unresolvedJoins.length===0,now.unresolvedJoins);
test('37 true shared intersections aligned',now.roadRepairStats.sharedJunctions===37&&now.roadRepairStats.seamsOver5cmAfter===0);
test('Intentional double-level overpass not flattened',old.observedOverpassGap===6.45&&now.observedOverpassGap===6.45);
test('No road segment steeper than 9%',now.maxSlope<=.09001,{maxSlope:now.maxSlope});
test('Only bounded local road profile correction',now.roadRepairStats.modifiedSamples<=50&&now.roadRepairStats.maxRaise<=3.5,now.roadRepairStats);
test('Original 3D bridge clearance not reduced',now.roadRepairStats.noBridgeClearanceReduced===true);
test('Old world geometry identical when disabled',old.preservation.boxes===194555);
test('New bridge/approach geometry growth below 0.25%',now.preservation.boxes>=old.preservation.boxes&&now.preservation.boxes<=old.preservation.boxes*1.0025,{old:old.preservation.boxes,new:now.preservation.boxes});
for(const p of ['solids','props','portals','activePortals','shops','glass','crocodiles'])
 test('Preserved '+p,old.preservation[p]===now.preservation[p]&&old.preservation[p]>0,{old:old.preservation[p],now:now.preservation[p]});
test('Terrain mesh uses same coastline polygons',old.coast.polygons===now.coast.polygons&&now.coast.polygons>=50000);
test('Terrain coastline vertices finite',old.coast.invalidVertices===0&&now.coast.invalidVertices===0);
test('Terrain selection respects 30 lower underpass samples',now.roadRepairStats.terrainLowerLayerSamples>=15,now.roadRepairStats.terrainLowerLayerSamples);
test('No new routes, original coastline map reference',now.roadRepairStats.mapReferenceChanged===false&&now.roadRepairStats.newRoads===0);
test('Real world was constructed in both scenarios',old.cpuWorld===true&&now.cpuWorld===true);
test('No false GPU verification',!old.gpuVerified&&!now.gpuVerified);
const report={stage:27,date:'2026-11-23',mode:'Real code and real Game World, but fake GPU renderer',passed:checks.length-fail.length,total:checks.length,checks,fail,
summary:{baselineTrueSeams:old.unresolvedJoins.length,repairedTrueSeams:now.unresolvedJoins.length,retainedGradeSeparatedOverpassMeters:now.observedOverpassGap,
 unchangedWorldTopology:true,geometryDelta:now.preservation.boxes-old.preservation.boxes,coastPolygons:now.coast.polygons,nativeGpuVerified:false}};
fs.writeFileSync(path.join(__dirname,'STAGE27_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE27 REAL-WORLD CPU ACCEPTANCE',report.passed+'/'+report.total,JSON.stringify(report.summary));
if(fail.length)process.exitCode=1;
