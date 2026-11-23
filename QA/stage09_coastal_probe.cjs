'use strict';
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, c=H.reference469.coast, D=H.stage06Orientation;
const normals={north:{x:0,z:-1},south:{x:0,z:1},east:{x:1,z:0},west:{x:-1,z:0}};
const active=w.entrancePortals.filter(p=>p.interiorReady);
const probes=active.map(p=>{
 const n=D?.dir?.(p)||normals[p.facing]||normals.north;
 const shore=c(p.x,p.z);const steps=[0,1.25,2.15,3.1,4.5,6,8].map(d=>({d,shore:+c(p.x+n.x*d,p.z+n.z*d).toFixed(3)}));
 return {id:p.id,old:!p.stage05City20,face:p.facing,rotated:!!p.stage07Aligned,shore:+shore.toFixed(3),minApproach:Math.min(...steps.map(q=>q.shore)),steps};
});
const counters={active:active.length,nearPointZero:probes.filter(p=>p.shore<.1).length,thresholdThree:probes.filter(p=>p.shore<3).length,approachWaterAt3_1:probes.filter(p=>p.steps.filter(q=>q.d<=3.1).some(q=>q.shore<0)).length,approachWaterAt6:probes.filter(p=>p.steps.filter(q=>q.d<=6).some(q=>q.shore<0)).length,approachWaterAt8:probes.filter(p=>p.steps.some(q=>q.shore<0)).length,shallowApproachAt8:probes.filter(p=>p.steps.some(q=>q.shore<2)).length,approachUnder3At8:probes.filter(p=>p.steps.some(q=>q.shore<3)).length};
console.log(JSON.stringify({counters,closest:probes.sort((a,b)=>a.minApproach-b.minApproach).slice(0,30)},null,2));
