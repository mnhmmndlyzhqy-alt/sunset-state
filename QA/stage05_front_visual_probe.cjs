const {g}=require('./stage05_bootstrap.cjs');const w=g.world;
let bad=[],details=[];
for(const s of w.city20DistrictBuildings){
 const front=s.z-s.depth/2; const old=w.boxes.filter(b=>
   !b.stage05City20&&b.layer===4&&
   Math.abs(b.x-s.x)<(b.w/2+1.35)&&
   Math.abs(b.z-front)<b.d/2+.35&&
   b.y+b.h/2>s.baseY+.5&&b.y-b.h/2<s.baseY+2.95&&
   b.w>0&&b.d>0);
 if(old.length){bad.push({id:s.id,parts:old.length});details.push({id:s.id,spec:[s.x,s.z,s.width,s.depth,s.height],old:old.slice(0,6).map(v=>({kind:v.city20Stage09Kind||v.city20Stage06Kind||'other',w:v.w,d:v.d,h:v.h,x:v.x-s.x,y:v.y-s.baseY,z:v.z-front}))})}
}
console.log(JSON.stringify({withPotentialObstruction:bad.length,bad:bad.slice(0,25),details:details.slice(0,15)},null,2))
