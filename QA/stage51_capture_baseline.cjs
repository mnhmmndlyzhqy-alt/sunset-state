'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const {g,H,warnings,errors,scripts}=require('./stage51_bootstrap.cjs');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const physical=w=>({
 roads:digest(w.roads461.map(r=>({id:r.id,width:r.width,points:r.points}))),
 solids:digest(w.solids.map(o=>[o.x,o.z,o.hw,o.hd,o.y,o.h,o.yaw])),
 portals:digest(w.entrancePortals.map(o=>[o.id,o.x,o.z,o.buildingX,o.buildingZ,o.interiorReady])),
 count:{roads:w.roads461.length,solids:w.solids.length,propSolids:w.propSolids.length,portals:w.entrancePortals.length,activePortals:w.entrancePortals.filter(p=>p.interiorReady).length,shops:w.retailShops.length,buildings:w.buildings.length,people:g.pedestrians.length}
});
const before=physical(g.world);g.restart({reuseWorld:true});
g.profile.credits=987;g.worldHour=17.35;
const result=g.stage19SaveNow('slot1');
if(!result.ok)throw Error('Baseline save failed: '+result.error);
const save=g.stage19SaveSystem.exportText('slot1');
const report={kind:'Stage 50 all classic scripts + real Game; simulated DOM/render surface',scripts:scripts.length,world:before,saveSchema:H.stage19Save.schema,warnings,errors};
fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));
fs.writeFileSync(process.argv[3],save);
console.log(JSON.stringify(report));
