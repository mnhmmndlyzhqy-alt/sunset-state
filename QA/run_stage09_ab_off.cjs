'use strict';
const assert=require('assert');
const fs=require('fs'),path=require('path');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world;
const counts={active:w.entrancePortals.filter(x=>x.interiorReady).length,portals:w.entrancePortals.length,roads:w.roads461.length,solids:w.solids.length,boxes:w.boxes.length,
  windows:w.stage08FacadeStats?.windowBays,rotated:w.city20DistrictBuildings.filter(x=>x.streetAligned).length, stage09AuditInstalled:!!w.stage09CoastalAudit};
assert(H.stage09CoastalEntries.off());
assert(!w.stage09CoastalAudit,'Stage09 no-op switch must leave world unmodified');
assert.equal(counts.active,214);assert.equal(counts.portals,429);assert.equal(counts.roads,52);
assert.equal(counts.windows,1586);assert.equal(counts.rotated,34);assert.equal(counts.boxes,194478);
fs.writeFileSync(path.join(__dirname,'STAGE09_AB_OFF.json'),JSON.stringify({stage:9,result:'PASS',gpuVerified:false,counts},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',counts},null,2));
