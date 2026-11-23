'use strict';
const {H,g}=require('./stage05_bootstrap.cjs');
const w=g.world, kinds=['planter-base','safety-bollard','streetlamp-post'];
for(const kind of kinds){const b=w.boxes.find(b=>b.city20Stage15Kind===kind);const q=H.createWalker(b.x-b.w*.5-.85,b.z,-Math.PI/2);q.y=H.outdoorHeight(q.x,q.z);
 const start=q.x;
 for(let i=0;i<75;i++)H.stepWalker(q,{forward:1,strafe:0,viewYaw:-Math.PI/2,speedFactor:.25,outdoors:false},w.nearby(q.x,q.z),1/30);
 const car=H.makeCar('civilian',b.x,b.z,0,0); const body=w.stage12StreetPropSolids?.find(s=>s.stage12Source===b);
 console.log(kind,JSON.stringify({present:!!body,from:+start.toFixed(2),to:+q.x.toFixed(2),center:+b.x.toFixed(2),blocked:body?!!H.carBuildingContact(car,body):false,nearbyCount:w.nearby(b.x,b.z).length}));
}
