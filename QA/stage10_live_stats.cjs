'use strict';const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world;console.log(JSON.stringify({stage10:w.stage10PlanterAudit,previousStage09:w.stage09CoastalAudit&&{active:w.stage09CoastalAudit.activePortals,water:w.stage09CoastalAudit.activeWaterAtDoor},objects:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,doors:w.entrancePortals.length},null,2));
