const {g}=require('./stage05_bootstrap.cjs'),w=g.world;let stats={};let examples=[];
for(const p of w.entrancePortals.filter(p=>p.interiorReady)){
const b=w.city20DistrictBuildings.find(s=>s.x===p.buildingX&&s.z===p.buildingZ),old=w.buildings.find(b=>b.x===p.buildingX&&b.z===p.buildingZ);const d=b?{x:b.x,z:b.z,w:b.width,d:b.depth}:{x:old.x,z:old.z,w:old.w,d:old.d};
const matches=w.solids.filter(s=>Math.abs(s.z-d.z)<.15&&s.hd>d.d*.40&&s.hw>.25&&Math.abs(s.x-d.x)<d.w*.51).sort((a,b)=>a.x-b.x);
const rear=w.solids.filter(s=>Math.abs(s.x-d.x)<.4&&s.hw>1&&Math.abs(s.z-(d.z+d.d*.5-.4))<.20&&s.hd<1);
const key=(matches.length+'/'+rear.length)+(b?'new':'old');stats[key]=(stats[key]||0)+1;
if(matches.length!==2||rear.length!==1)if(examples.length<30)examples.push({id:p.id,kind:b?'new':'old',xy:[d.x,d.z],shape:[d.w,d.d],found:matches.map(s=>[s.x,s.z,s.hw,s.hd]),rear:rear.map(s=>[s.x,s.z,s.hw,s.hd])});}
console.log(JSON.stringify({stats,examples},null,2));
