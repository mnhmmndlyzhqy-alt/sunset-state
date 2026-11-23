'use strict';
/* Stage21: original full Game World, original collision spatial grid, fake canvas/GL only. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world,A=H.stage21HighSpeedCCD;const checks=[],fails=[];
function ok(label,value,detail){checks.push({label,passed:!!value});if(!value){fails.push({label,detail});console.error('FAIL',label,JSON.stringify(detail)?.slice(0,180));}}
ok('new guard installed on actual Game',A.stats.installed===true);
ok('road network unmodified',w.roads461.length===52);
ok('door/portal baseline retained',w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
ok('building solids still 3230',w.solids.length===3230);
ok('street props still 796',w.propSolids.length===796);
ok('existing Stage12 street bodies',w.stage12StreetPropSolids?.length===360);
ok('retail stores 59',w.retailShops.length===59);
ok('breaking glass original and new',w.glassPanels.length===988&&w.stage16GlassStats?.selectedGlass===864);
ok('walking nav plugin still available',H.stage20Pedestrian?.stats.installed===true);
ok('save plugin still available',!!H.stage19Save);
ok('eight crocodiles still run',g.stage39Life.wildlife.filter(a=>a.kind==='crocodile').length===8);
ok('world rendering geometry unchanged',w.boxes.length===194555);
const countByKind={};let actuallySweepable=0,actuallyDetected=0;
const colliders=w.stage12StreetPropSolids||[];
for(const p of colliders.slice(0,180)){
 const kind=p.stage12StreetKind;countByKind[kind]=(countByKind[kind]||0)+1;
 const car=H.makeCar('player',p.x+9,p.z,Math.PI/2);
 const contact=A.findFirst(g,car,p.x+9,p.z,p.x-9,p.z,false);
 const nearby=H.drivingSolids443(w,{x:p.x,z:p.z,deck443:false}).includes(p);
 if(nearby&&(!H.roadRaised477||H.roadRaised477({x:p.x,z:p.z,deck443:false})<.95))actuallySweepable++;
 if(contact)actuallyDetected++;
}
ok('real spatial grid exposes multiple street colliders',actuallySweepable>=20,{actuallySweepable});
ok('real world swept guard detects actual obstacles',actuallyDetected>=12,{actuallyDetected});
const probe={x:0,z:0,yaw:0,deck443:false};
ok('original bridge collision layering and surveyed raised roads exist',typeof H.sameRoadLevel443==='function'&&typeof H.deckLayer443==='function'&&w.roads461.some(r=>r.samples?.some(p=>(p.above||0)>1)));
ok('original north street route intact',w.roads461.some(r=>r.id==='northRing'));
const report={stage:21,source:'real Game constructor & 194555-box world; fake GL only',passed:checks.filter(c=>c.passed).length,total:checks.length,checks,fails,realColliderSweeps:{tested:180,sweepable:actuallySweepable,contacts:actuallyDetected,countByKind},gpuVerified:false};
fs.writeFileSync(path.join(root,'QA/STAGE21_WORLD_INTEGRITY.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE21 WORLD',report.passed+'/'+report.total,report.realColliderSweeps);
if(fails.length)process.exitCode=2;
