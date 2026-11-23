const {H,g}=require('./stage05_bootstrap.cjs');const w=g.world;
const kinds={};let small=0,minW=1e9,minD=1e9,maxW=-1,maxD=-1;
const specimens=[];let blockedSelf=0,blockedOther=0,missingSolid=0,missingMass=0;
for(let i=0;i<w.city20DistrictBuildings.length;i++){
 const s=w.city20DistrictBuildings[i];
 (kinds[s.kind]??={total:0,small:0}).total++;
 const isSmall=s.width<16||s.depth<17.7||s.height<8;
 if(isSmall){small++;kinds[s.kind].small++}
 minW=Math.min(minW,s.width);minD=Math.min(minD,s.depth);maxW=Math.max(maxW,s.width);maxD=Math.max(maxD,s.depth);
 const solid=w.solids.find(c=>Math.abs(c.x-s.x)<.01&&Math.abs(c.z-s.z)<.01&&Math.abs(c.hw-(s.width+.12)/2)<.1&&Math.abs(c.hd-(s.depth+.12)/2)<.1);
 if(!solid)missingSolid++;
 const mass=w.boxes.filter(o=>o.city20BuildingId===s.id||o.city20Stage06Owner===s.id&&o.city20Stage06Kind==='massing');
 if(!mass.length)missingMass++;
 const x=s.x,z=s.z-s.depth*.5-.58;
 const around=w.nearby(x,z-1.6).filter(c=>c!==solid&&Math.abs(c.x-x)<c.hw+.8&&Math.abs(c.z-(z-1.6))<c.hd+.8);
 if(around.length)blockedOther++;
 if(solid&&Math.abs(z-1.6-solid.z)<solid.hd+.8)blockedSelf++;
 specimens.push({index:i,id:s.id,kind:s.kind,w:s.width,d:s.depth,h:s.height,x:s.x,z:s.z,y:s.baseY,solid:!!solid,mass:mass.map(o=>({id:o.city20BuildingId,owner:o.city20Stage06Owner,k:o.city20Stage06Kind,x:o.x,z:o.z,w:o.w,d:o.d,h:o.h,y:o.y,layer:o.layer,shape:o.shape})),other:around.length,coast:H.reference469.coast(x,z-1.6),road:H.coast461.isRouteRoad(x,z-1.6)});
}
console.log(JSON.stringify({count:specimens.length,small,minW,minD,maxW,maxD,kinds,blockedSelf,blockedOther,missingSolid,missingMass},null,2));
console.log('samples',JSON.stringify(specimens.slice(0,12),null,2));
console.log('risky',JSON.stringify(specimens.filter(s=>s.other>0||!s.solid||!s.mass.length||s.coast<2||s.road).slice(0,35),null,2));
require('fs').writeFileSync(__dirname+'/STAGE05_BASELINE_BUILDINGS.json',JSON.stringify(specimens,null,2));
