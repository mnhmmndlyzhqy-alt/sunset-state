'use strict';
const fs=require('fs'),{H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,plans=new Map(w.structuralPlans.map(p=>[p.outerShell?.x+','+p.outerShell?.z,p]));
const off=H.stage14Lighting.off(),byType={legacy:0,compact:0,rotated:0},sums={boxes:0,lights:0,solids:0,doors:0,rooms:0,pickups:0,fixtures:0,newLights:0};
for(const p of w.entrancePortals.filter(p=>p.interiorReady)){
 const plan=plans.get(p.buildingX+','+p.buildingZ),s=g.sceneForFloor(plan,0);
 byType[s.stage05Compact?'compact':'legacy']++;if(s.stage07Aligned)byType.rotated++;
 for(const k of ['boxes','lights','solids','doors','rooms','pickups'])sums[k]+=s[k].length;
 sums.fixtures+=s.boxes.filter(b=>b.stage14Fixture).length;
 sums.newLights+=s.lights.filter(l=>l.stage14Real).length;
}
const summary={off,world:{boxes:w.boxes.length,solids:w.solids.length,props:w.propSolids.length,portals:w.entrancePortals.length,active:w.entrancePortals.filter(p=>p.interiorReady).length,roads:w.roads461.length},byType,sums};
const file=off?'QA/STAGE14_AB_OFF.json':'QA/STAGE14_AB_ON.json';fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n');
console.log(file,JSON.stringify(summary));
