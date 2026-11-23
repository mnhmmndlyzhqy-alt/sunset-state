'use strict';
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
for(const id of [1,24,35,50,62,67,78]){
const p=w.entrancePortals[id],plan=w.structuralPlans.find(t=>t.outerShell.x===p.buildingX&&t.outerShell.z===p.buildingZ),s=g.sceneForFloor(plan,0),e=H.interiorExtents450(plan.outerShell),b=plan.outerShell;
const candidates=[];
for(const side of [-1,1])for(const dx of [1.3,1.65,2.0,2.5])for(const dz of [1.1,1.6,2.1,2.6]){
 const x=b.x+e.X-dx,z=b.z-e.Z+dz,ww=.66,dd=1.00;
 const solids=s.solids.filter(v=>Math.abs(v.x-x)<v.hw+ww*.5+.09&&Math.abs(v.z-z)<v.hd+dd*.5+.09);
 const visuals=s.boxes.filter(v=>v.layer===4&&v.h>.18&&v.h<2.2&&v.y-v.h*.5<s.stage42Base+1.9&&v.y+v.h*.5>s.stage42Base+.2&&Math.abs(v.x-x)<v.w*.5+ww*.5+.1&&Math.abs(v.z-z)<v.d*.5+dd*.5+.1);
 candidates.push({dx,dz,solids:solids.length,visuals:visuals.length,fromDoor:Math.hypot(x-p.x,z-p.z),fromLift:Math.hypot(x-s.lift.x,z-s.lift.z)});
}
const clear=candidates.filter(o=>!o.solids&&!o.visuals&&o.fromDoor>2.75&&o.fromLift>2.9).sort((a,b)=>a.dx+b.dz-(b.dx+b.dz));
console.log(id,JSON.stringify(clear.slice(0,8)));
}
