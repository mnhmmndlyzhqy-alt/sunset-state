'use strict';
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const enabled=!!w.stage13NarrowLobbyStats;
const ids=[1,24,35,50,62,67,78],scenes=ids.map(id=>{
 const p=w.entrancePortals[id],plan=w.structuralPlans.find(v=>v.outerShell.x===p.buildingX&&v.outerShell.z===p.buildingZ),s=g.sceneForFloor(plan,0);
 return {id,boxes:s.boxes.length,solids:s.solids.length,lights:s.lights.length,pickups:s.pickups.length,rooms:s.rooms.length,doors:s.doors.length,
   entrance:s.entrance,lift:s.lift,stage13Furnished:!!s.stage13NarrowFurnished,stage13Meshes:s.boxes.filter(v=>v.stage13NarrowLobby).length};
});
const result={enabled,worldBoxes:w.boxes.length,worldSolids:w.solids.length,propSolids:w.propSolids.length,roads:w.roads461.length,
  portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,newMeshes:w.boxes.filter(v=>v.stage13NarrowLobby).length,scenes};
fs.writeFileSync(enabled?'QA/STAGE13_AB_ON.json':'QA/STAGE13_AB_OFF.json',JSON.stringify(result,null,2)+'\n');
console.log('Stage13 A/B:',enabled?'ON':'OFF',result.worldBoxes,'world boxes; 7 indoor scenes');
