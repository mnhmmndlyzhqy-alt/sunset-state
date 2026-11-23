'use strict';const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const ids=[1,24,35,50,62,67,78,298,305,346,404,417,425];
const out={off:H.stage15Interior.off(),world:{boxes:w.boxes.length,solids:w.solids.length,props:w.propSolids.length,roads:w.roads461.length,portals:w.entrancePortals.filter(p=>p.interiorReady).length},scenes:[]};
for(const id of ids){const p=w.entrancePortals[id],plan=w.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ);const s=g.sceneForFloor(plan,0);
 const o=s.stage15Interior;out.scenes.push({id,boxes:s.boxes.length,solids:s.solids.length,doors:s.doors.length,rooms:s.rooms.length,
 lights:s.lights.length,pickups:s.pickups.length,stage14:!!s.stage14Lighting,
 added:o?.collidersAdded||0,baseline:o?.existingColliders??s.solids.length,
 E:s.stage15Interactions?.length||0,wallArt:o?.wallArtInteractions||0});}
const file=H.stage15Interior.off()?'QA/STAGE15_AB_OFF.json':'QA/STAGE15_AB_ON.json';
fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');console.log('Stage15 A/B',out.off?'OFF':'ON',out.world,out.scenes.length,'scenes');
