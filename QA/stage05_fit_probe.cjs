const {g,H}=require('./stage05_bootstrap.cjs'),w=g.world;
for(const id of [304,309,311,315,299,318]){
const p=w.entrancePortals[id],s=w.city20DistrictBuildings.find(v=>v.id===p.city20OwnerId),plan=w.structuralPlans.find(v=>v.outerShell.x===p.buildingX&&v.outerShell.z===p.buildingZ),q=g.sceneForFloor(plan,0);
const bad=q.boxes.filter(b=>b.layer>=4&&b.h<=4.25&&(b.x-b.w*.5<s.x-s.width*.5-.05||b.x+b.w*.5>s.x+s.width*.5+.05||b.z-b.d*.5<s.z-s.depth*.5-.05||b.z+b.d*.5>s.z+s.depth*.5+.05));
console.log(JSON.stringify({id,spec:[s.width,s.depth,s.height],compact:plan.stage05Compact,all:q.boxes.length,bad:bad.slice(0,10).map(v=>({x:v.x-s.x,z:v.z-s.z,w:v.w,d:v.d,h:v.h,y:v.y,shape:v.shape,layer:v.layer})),badCount:bad.length,stair:q.stairs},null,2));
}
