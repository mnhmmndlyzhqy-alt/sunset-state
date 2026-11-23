'use strict';
const fs=require('fs');const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, S=H.stage11Lamps, checks=[];
function test(condition,label){checks.push({label,pass:!!condition});if(!condition)console.error('FAIL',label);}
function close(a,b,eps=1e-6){return Math.abs(a-b)<=eps;}
function initial(){const posts=w.boxes.filter(b=>b.city20Stage15Kind==='streetlamp-post');const heads=w.boxes.filter(b=>b.city20Stage15Kind==='streetlamp-head');return{posts,heads};}
const {posts,heads}=initial();const original=S.audit(w,{strict:true});const stats=w.stage11LampAudit;
test(!!stats,'Stage 11 module activated');
test(S.disabled()===false,'Stage 11 enabled in normal game');
test(stats.stage===11&&stats.issueId==='S01-ST-02','Correct stage and bug ID');
test(stats.historicalUnresolvedLamps===30,'Historic unresolved 30 retained as audit context');
test(stats.originallyAuthoredLamps===99,'Original authored lamp count retained');
test(stats.livePosts===28&&stats.liveHeads===28,'28 real post/head pairs in active world');
test(stats.activeOwnerPosts===28&&stats.inactiveOwnerPosts===0,'All live lamp owners active');
test(stats.pairedPosts===28&&stats.orphanHeads===0,'All lamp heads paired');
test(stats.preRepair.unsafeSites===0&&stats.horizontalRelocations===0,'No invented XY relocation');
test(stats.preRepair.misalignedBasesOver2cm===22,'22 lamp bases misaligned over 2cm before repair');
test(stats.preRepair.floatingBasesOver20cm===3&&stats.preRepair.buriedBasesOver20cm===2,'Five significant height discrepancies identified');
test(stats.preRepair.maximumAbsOffset>.37&&stats.preRepair.maximumAbsOffset<.39,'Worst initial ground gap approx 38 cm');
test(stats.heightCorrections===25,'25 height corrections applied (over 1.5 cm)');
test(stats.unsafeHorizontalSites===0&&stats.misalignedBasesOver2cm===0,'All live placements safe and grounded');
test(stats.maxAbsoluteBaseOffset<=.015,'Post bottoms match the terrain to within 1.5 cm');
test(stats.cleared===true&&original.cleared===true,'Strict post-fix audit passes');
test(stats.unresolvedAttempts.length===0,'No unresolved lamp issues');
test(stats.geometryAdded===0&&stats.collisionBodiesAdded===0,'No extra geometry or colliders');
test(w.roads461.length===52,'52 roads preserved');
test(w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214,'All 214 live doors preserved');
test(w.solids.length===3230&&w.boxes.length===194478,'All collision and renderer object counts preserved');
test(w.city20Stage15Stats.lightPosts===99,'Original CITY20 stage15 metrics unchanged');
test(w.stage10PlanterAudit?.livePlanterSites===166&&w.stage10PlanterAudit?.unsafeSites===0,'Stage 10 plant safety preserved');
test(w.stage08FacadeStats?.windowBays===1586&&w.boxes.filter(b=>b.stage08Part==='glass').length===1586,'Stage 8 windows remain present');
for(const post of posts){const paired=S.match(S.collect(w),post);test(paired.length===1,'lamp '+post.city20Stage15Portal+' has exactly one head');
 const gap=post.y-post.h*.5-H.outdoorHeight(post.x,post.z);
 test(Math.abs(gap)<=.01501,'lamp '+post.city20Stage15Portal+' sits on terrain');
 test(close(paired[0].x,post.x)&&close(paired[0].z,post.z),'lamp '+post.city20Stage15Portal+' head shares XY');
}
const idx=posts.findIndex(p=>p.city20Stage15Portal===2),post=posts[idx],head=S.match(S.collect(w),post)[0];
const saved=[post.x,post.y,post.z,head.x,head.y,head.z];
const oldRoad=H.coast461.isRouteRoad;
// Synthetic test: inject a fake unsafe road footprint around one lamp only.
try{
 const injected={x:post.x,z:post.z};
 H.coast461.isRouteRoad=function(x,z){return Math.hypot(x-injected.x,z-injected.z)<.62||oldRoad(x,z);};
 test(S.assess(w,S.collect(w),post).issues.includes('road_footprint'),'Synthetic carriageway overlap detected');
 delete w.stage11LampAudit;
 const repaired=S.repair(w,{force:true});
 const walked=Math.hypot(post.x-injected.x,post.z-injected.z);
 test(repaired.horizontalRelocations===1&&walked>.3,'One synthetic unsafe lamp relocated');
 test(close(head.x-post.x,0)&&close(head.z-post.z,0),'Head moves together with pole');
 test(repaired.unsafeHorizontalSites===0,'Synthetic relocation lands at safe position');
 test(Math.abs(post.y-post.h*.5-H.outdoorHeight(post.x,post.z))<=.01501,'Relocated lamp is still grounded');
 H.coast461.isRouteRoad=()=>true;
 test(S.alternate(w,S.collect(w),post)===null,'When every candidate is unsafe, no invented safe site is used');
}finally{
 H.coast461.isRouteRoad=oldRoad;
 [post.x,post.y,post.z,head.x,head.y,head.z]=saved;
 w.stage11LampAudit=stats;
}
const savedHeadX=head.x;head.x+=25;
try{test(S.assess(w,S.collect(w),post).issues.includes('unpaired_head'),'Missing or detached light-head is flagged');}
finally{head.x=savedHeadX;}
test(S.audit(w,{strict:true}).cleared,'World restored after synthetic tests');
test(w.stage11LampAudit===stats,'Real-world stage11 stats preserved after injections');
test(stats.gpuVerified===false&&stats.real1080pFpsVerified===false,'No false GPU / native FPS verification');
const result={stage:11,issueId:'S01-ST-02',tests:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass),world:{postCount:posts.length,headCount:heads.length,activeDoors:w.entrancePortals.filter(p=>p.interiorReady).length,roads:w.roads461.length,boxes:w.boxes.length,solids:w.solids.length},stage11:stats,checks};
fs.writeFileSync('QA/STAGE11_OF35_ACCEPTANCE.json',JSON.stringify(result,null,2));
console.log('Stage11 CPU acceptance:',result.passed+'/'+result.tests,'passed');
if(result.failed.length){console.error(JSON.stringify(result.failed,null,2));process.exit(1)}
