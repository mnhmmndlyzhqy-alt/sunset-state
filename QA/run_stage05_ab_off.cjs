'use strict';
/* Toggle regression: Stage05 disabled must reproduce intact Stage04. */
if(!process.env.STAGE05_ENTRIES_OFF)throw Error('Set STAGE05_ENTRIES_OFF=1 for the A/B run');
const fs=require('fs'),path=require('path');const {g,H}=require('./stage05_bootstrap.cjs');const w=g.world;
const tests=[
 ['stage05_disabled',!w.stage05City20Stats],
 ['legacy_84_ready',w.entrancePortals.filter(p=>p.interiorReady).length===84],
 ['legacy_299_total',w.entrancePortals.length===299],
 ['legacy_215_orphans_remain_unready',w.entrancePortals.slice(0,298).filter(p=>!p.interiorReady).length===215],
 ['city20_130_decorative_shells_preserved',w.city20DistrictBuildings.length===130],
 ['city20_no_gameplay_portal_added',w.city20DistrictBuildings.every(s=>!s.interiorAvailable)],
 ['legacy_84_city_buildings',w.buildings.length===84],
 ['all_52_roads_retained',w.roads461.length===52],
 ['stage04_hotel_still_open',w.stage04AccessStats?.oneCompactHotelOpened===true],
 ['stage05_compact_runtime_not_used',w.structuralPlans.every(s=>!s.stage05Compact)],
];
const result={scope:'A/B toggle Stage05 OFF with actual game world, fake renderer',pass:tests.filter(x=>x[1]).length,total:tests.length,cases:tests.map(x=>({name:x[0],pass:x[1]}))};
fs.writeFileSync(path.join(__dirname,'STAGE05_AB_OFF_ACCEPTANCE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(result.pass!==result.total)process.exitCode=1;
