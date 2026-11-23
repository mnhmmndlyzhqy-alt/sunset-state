'use strict';
const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
const list=[
 ['A/B flag honored',H.stage17Retail.off()],
 ['no extra world metadata',!w.stage17RetailStats&&!w.stage17VenueContracts],
 ['60 old decorations kept',w.city20DeepAuditRepairStats?.commercialVenues===60&&w.city20DeepAuditRepairStats?.storefrontDetailsAdded===342],
 ['original stage14 inactive preserved',w.city20Stage14Stats?.commercialFronts===0],
 ['street commerce retained',w.retailShops.length===59&&w.streetVenues.length===66],
 ['original city parts retained',w.boxes.length===194555&&w.solids.length===3230&&w.propSolids.length===796],
 ['existing travel preserved',w.roads461.length===52&&w.entrancePortals.filter(p=>p.interiorReady).length===214],
 ['previous glass retained',w.glassPanels.length===988&&w.stage16GlassStats?.selectedGlass===864],
 ['previous interior systems retained',!!H.stage14Lighting?.installed&&!!H.stage15Interior?.installed]
];
const failed=list.filter(([,pass])=>!pass);
const report={stage:17,mode:'OFF',checks:list.length,passed:list.length-failed.length,failed:failed.map(([name])=>name),gpuValidated:false};
fs.writeFileSync('QA/STAGE17_AB_OFF_ACCEPTANCE.json',JSON.stringify(report,null,2)+'\n');
console.log('Stage17 OFF:',report.passed+'/'+report.checks,'passed',failed.map(x=>x[0]));
if(failed.length)process.exitCode=1;
