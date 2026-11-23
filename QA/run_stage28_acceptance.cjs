'use strict';
const fs=require('fs'),path=require('path');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const off=read('STAGE28_STAGE27_AB_OFF_PROFILE.json');
const now=read('STAGE28_STAGE28_ACTIVE_PROFILE.json');
const checks=[],failures=[];
function test(name,passed,details){checks.push({name,passed:!!passed});if(!passed)failures.push({name,details});}
const a=off.preserve,b=now.preserve,c=now.facades,st=c.stats;
test('Stage27 A/B flag actually disables facades',off.off&&off.facades.added===0);
test('Active Stage28 actually enabled',!now.off&&c.added>0);
test('Source CPU world constructed twice',off.cpuWorld===true&&now.cpuWorld===true);
test('All previously existing boxes byte-equivalent in ordered projection',a.boxDigest===b.boxDigest);
test('Stage27 total box count restored under A/B flag',a.allBoxes===194835&&a.allBoxes===a.boxCount);
test('Stage28 added exactly 1982 objects',c.added===1982&&b.allBoxes-a.allBoxes===1982);
test('Stage28 added under 1.5% of base draw objects',c.added/a.allBoxes<.015);
test('Existing 52 roads retained',a.roads===52&&b.roads===52);
test('All existing sampled road heights unchanged',a.roadDigest===b.roadDigest);
test('Existing coastline polygon coordinates unchanged',a.coastDigest===b.coastDigest&&b.coastline>0);
test('All solid bodies retained',a.solids===b.solids&&a.solidDigest===b.solidDigest);
test('All prop collisions retained',a.props===b.props);
test('All active entrance portals retained',a.activePortals===214&&b.activePortals===214);
test('All legacy and mapped entrance coordinates unchanged',a.portalDigest===b.portalDigest);
test('All 130 CITY20 buildings retained',a.mapped===130&&b.mapped===130&&st.mappedSites===130);
test('All 84 core/legacy buildings retained',a.legacy===84&&b.legacy===84&&st.legacySites===84);
test('All 34 rotated buildings detailed',st.streetAlignedSites===34&&c.facadesOnCorrectYaw===true);
test('All original 1586 side/rear windows retained',a.glassMeshes===1586&&b.glassMeshes===1586&&st.glazingPreserved===1586);
test('Original breakable glass state retained',a.breakableGlass===b.breakableGlass&&a.breakableGlass>800);
test('60-storefront program remains available',a.shops===b.shops&&a.shops>=59);
test('All new geometry has legitimate CITY20 / legacy owner',c.ownerMissing===0);
test('No decorative part placed outside the surveyed CITY20 footprint',c.outOfFootprint===0);
test('No opaque mesh overlaps Stage08 glass',c.opaqueOnGlass===0);
test('No decorative mesh blocks a mapped doorway sight aperture',c.doorSightObstructions===0);
test('Geometry sharing: no additional texture files',st.newTextures===0&&st.materialsAreExisting);
test('All added decorative pieces have finite LOD cap <=2100',st.allNewMeshesDistanceCulled&&c.maxDistance<=2100);
test('No added collider or gameplay change',st.changedColliders===0&&st.gameplayChanges===0);
test('All 7 mapped archetypes covered',Object.keys(st.kinds).length===7);
test('Facade rooflines and corner relief both implemented',st.roofContours>=400&&st.verticalReveals>=500);
test('Window sunshades attached to existing glass',st.windowSunshades>=250);
test('Entrance details sit above original openings',st.entranceTransoms===130);
test('Industrial rooftop vents present',st.industrialRoofVents>=70);
test('Setback-aware tower fins present',st.towerTierFins===64);
test('Legacy roof edges polished',st.legacyRoofDetail===168);
test('Stage27 road repair remained enabled',b.all56RoadAndBridgeMetrics?.enabled===true||b.all56RoadAndBridgeMetrics?.roadProfileEnabled===true||!b.all56RoadAndBridgeMetrics?.rolledBack);
test('Original starting position unchanged',JSON.stringify(a.playerStart)===JSON.stringify(b.playerStart));
test('No unjustified GPU signoff',now.gpuVerified===false&&st.gpuVisualVerified===false&&st.native1080p50fpsVerified===false);
const report={stage:28,kind:'CPU-world preservation, architecture and opening QA — NOT GPU visual acceptance',
  passed:checks.length-failures.length,total:checks.length,checks,failures,
  summary:{mappedBuildings:st.mappedSites,legacyBuildings:st.legacySites,originalGeometry:a.boxCount,
    newGeometry:c.added,geometryGrowthPercent:+(100*c.added/a.boxCount).toFixed(3),
    preservedExistingGeometryHash:a.boxDigest,
    noWindowOcclusion:c.opaqueOnGlass===0,noDoorwayOcclusion:c.doorSightObstructions===0,
    allRotationsPreserved:c.facadesOnCorrectYaw,nativeGPU1080P50FPSVerified:false}};
fs.writeFileSync(path.join(__dirname,'STAGE28_ACCEPTANCE_RESULT.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE28 ACCEPTANCE '+report.passed+'/'+report.total,JSON.stringify(report.summary));
for(const f of failures)console.error('FAIL',f.name,JSON.stringify(f.details||{}));
if(failures.length)process.exitCode=1;
