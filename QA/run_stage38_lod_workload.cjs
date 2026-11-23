'use strict';
const fs=require('fs'),path=require('path');
const {ctx,H,g}=require('./stage05_bootstrap.cjs');
const m=H.stage38AdaptiveLOD,GL=ctx.__Stage23RealGLRenderer;
const original=g.world.boxes;
const sample=original.filter((o,i)=>i%17===0||!!m.kind(o));
function scene(){return {source:null,cells:new Map(),global:[],skyline:[],visible:[],glazing:[],cullX:NaN,cullZ:NaN};}
function render(){let r=Object.create(GL.prototype);Object.assign(r,{qualityScale:1,glWidth:1920,glHeight:1080,cullSquared475:true,detailEnabled475:false,groupFlags476:{}});return r;}
const base=g.cam, cam=(x,y,z)=>({...base,x,y,z,tx:x+(base.tx-base.x),ty:base.ty,tz:z+(base.tz-base.z)});
const cameras=[['spawn',cam(base.x,base.y,base.z)],['east',cam(base.x+155,base.y,base.z-96)],['air',cam(base.x+330,155,base.z-95)],['west',cam(base.x-290,base.y,base.z+250)],['coast',cam(base.x+140,base.y,base.z-490)],['store',cam(base.x+70,base.y,base.z+120)]];
function workload(list,c){const stat={submitted:0,covered:0,nearHigh:0,farLow:0,originalParts:0,highInstances:0,lowInstances:0};
for(const o of list){let k=o.stage38Kind||m.kind(o);if(!k)continue;
 const d=Math.hypot(o.x-c.x,o.z-c.z);
 const t=o.stage38Tier==='low'?'low':'high';
 const cost=t==='low'?m.trianglesLow[k]:m.trianglesHigh[k];
 const weight=H.distanceVisibility(d,o.lodMin||0,o.lodMax||0,o.visibilityCap||0);
 stat.submitted+=cost;stat.covered+=cost*weight;
 if(t==='low'){stat.farLow++;stat.lowInstances++;}else{stat.nearHigh++;stat.highInstances++;}
 stat.originalParts++;}
for(let k of ['submitted','covered'])stat[k]=+stat[k].toFixed(2);
return stat;}
const measured=[];
for(const [name,c] of cameras){const r=render();
ctx.__SUNSET_STAGE38_LOD_OFF=true;const old=r.getVisibleStatic(sample,c,scene());
ctx.__SUNSET_STAGE38_LOD_OFF=false;const optimized=r.getVisibleStatic(sample,c,scene());
const a=workload(old,c),b=workload(optimized,c);
measured.push({name,old:a,new:b,submittedChangePct:+((b.submitted/a.submitted-1)*100).toFixed(2),coveredChangePct:+((b.covered/a.covered-1)*100).toFixed(2)});
}
ctx.__SUNSET_STAGE38_LOD_OFF=false;
const result={stage:38,sampledObjects:sample.length,measured,disclaimer:'CPU theoretical triangle counts from visibility output; not a GPU profile, no FPS measured'};
fs.writeFileSync(path.join(__dirname,'STAGE38_LOD_WORKLOAD_CPU.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
