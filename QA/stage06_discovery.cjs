const {g,H}=require('./stage05_bootstrap.cjs');const w=g.world;
const active=w.entrancePortals.filter(p=>p.interiorReady);
const d4={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
function rdist(x,z){let best=Infinity,id=null;for(const r of w.roads461){const pts=r.samples?.length?r.samples:r.points;for(let j=0;j<pts.length-1;j++){let a=pts[j],b=pts[j+1],dx=b.x-a.x,dz=b.z-a.z,tt=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));let d=Math.hypot(x-a.x-tt*dx,z-a.z-tt*dz);if(d<best){best=d;id=r.id;}}}return {best:+best.toFixed(2),id};}
const counts={};const samples=[];let currentNorth=0,proposals=0;
for(const p of active){const s=w.city20DistrictBuildings.find(s=>s.x===p.buildingX&&s.z===p.buildingZ);const b=w.buildings.find(b=>b.x===p.buildingX&&b.z===p.buildingZ);const shell=s?{x:s.x,z:s.z,w:s.width,d:s.depth,kind:s.kind}:{x:b.x,z:b.z,w:b.w,d:b.d,kind:b.kind};let cand=[];
 for(const [face,[dx,dz]] of Object.entries(d4)){
  let x=shell.x+dx*(shell.w/2+.7),z=shell.z+dz*(shell.d/2+.7);
  let ax=x+dx*2.1,az=z+dz*2.1;
  let near=w.nearby(ax,az).filter(v=>Math.abs(v.x-ax)<v.hw+.55&&Math.abs(v.z-az)<v.hd+.55);
  let coast=H.reference469.coast(ax,az);
  let road=rdist(ax,az);
  const site=coast>2&&!H.coast461.isRouteRoad(ax,az)&&near.length===0;
  cand.push({face,site,rd:road.best,road:road.id,coast:+coast.toFixed(2),near:near.length,approach:[+ax.toFixed(1),+az.toFixed(1)]});
 }
 let safe=cand.filter(v=>v.site);safe.sort((a,b)=>a.rd-b.rd);
 const win=safe[0]?.face||'none';counts[win]=(counts[win]||0)+1;if(win!=='north'&&win!=='none')proposals++;
 if(samples.length<18||win==='none'&&samples.length<24)samples.push({portal:p.id,kind:s?'new':'old',type:shell.kind,size:[shell.w,shell.d],win,cand});
}
console.log(JSON.stringify({count:active.length,counts,proposals,samples},null,2));
