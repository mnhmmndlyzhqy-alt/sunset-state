'use strict';
/* Run this with STAGE08_WINDOWS_OFF=1, comparing with normal Stage08 acceptance. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const off=process.env.STAGE08_WINDOWS_OFF==='1';
const params={off,stage08Loaded:typeof H.stage08SideRearWindows?.off==='function',stats:!!w.stage08FacadeStats,meshes:w.boxes.filter(b=>b.stage08Facade).length,
 roads:w.roads461.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,
 portalCount:w.entrancePortals.length,rotations:w.city20DistrictBuildings.filter(b=>b.streetAligned).length,
 wBoxes:w.boxes.length,stage07Boxes:w.stage07AlignmentStats?.boxesAtFinalize};
assert(off,'A/B baseline must run with STAGE08_WINDOWS_OFF=1');
assert(params.stage08Loaded&&H.stage08SideRearWindows.off()&&!params.stats&&!params.meshes);
assert(params.roads===52&&params.active===214&&params.portalCount===429&&params.rotations===34);
assert(params.wBoxes===188644&&params.stage07Boxes<=params.wBoxes);
fs.writeFileSync(path.join(__dirname,'STAGE08_AB_DISABLED.json'),JSON.stringify(params,null,2)+'\n');
console.log(JSON.stringify(params,null,2));
