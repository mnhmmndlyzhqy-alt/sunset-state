'use strict';
const fs=require('fs'),path=require('path');
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const summary={stage:10,off:!w.stage10PlanterAudit,boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,
 planters:w.boxes.filter(b=>b.city20Stage15Kind==='planter-base').length,shrub:w.boxes.filter(b=>b.city20Stage16Kind==='planter-shrub').length,
 doors:w.stage42Doors.length,rotated:w.stage07AlignmentStats?.realRotations,windows:w.stage08FacadeStats?.windowBays};
fs.writeFileSync(path.join(__dirname,'STAGE10_AB_OFF.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));if(!summary.off)process.exitCode=1;
