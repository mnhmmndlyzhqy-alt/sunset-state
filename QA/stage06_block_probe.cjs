const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
for(const id of [1,6,11,12,301,303,304,350,298,428]){
const p=w.entrancePortals[id],plan=w.structuralPlans.find(q=>q.outerShell.x===p.buildingX&&q.outerShell.z===p.buildingZ),scene=g.sceneForFloor(plan,0);const n=H.stage06Orientation.dir(p),ext=H.interiorExtents450(plan.outerShell);
let hits=[];for(const t of [2.1,2.5,3,3.5,4,4.5]){
 const x=p.x-n.x*t,z=p.z-n.z*t,r=.28;
 const near=scene.solids.filter(s=>{const xx=Math.max(s.x-s.hw,Math.min(s.x+s.hw,x)),zz=Math.max(s.z-s.hd,Math.min(s.z+s.hd,z));return (xx-x)**2+(zz-z)**2<r*r;});
 if(near.length)hits.push({t,near});}
console.log(JSON.stringify({id,face:p.facing,pt:[p.x,p.z],shell:plan.outerShell,ext,entrance:scene.entrance,removedSolids:scene.stage06OriginalWallSolidsRemoved,hits},null,2));}
