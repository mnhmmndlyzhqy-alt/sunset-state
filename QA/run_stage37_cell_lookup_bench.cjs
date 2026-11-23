'use strict';
/* Stage37 deterministic lookup microbenchmark on the genuine engine scene index.
   Measures only cell lookup cost in Node, NOT full culling, WebGL, or FPS. */
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks');
const {ctx,H,g}=require('./stage05_bootstrap.cjs');
const GL=ctx.__Stage23RealGLRenderer,r=Object.create(GL.prototype);
Object.assign(r,{qualityScale:1,glWidth:1920,glHeight:1080,cullSquared475:true,
 detailEnabled475:false,groupFlags476:{},instanceScratch:new Float32Array(0)});
const boxes=g.world.boxes.filter((_,i)=>i%14===0);
const p=g.cam,c={...p};
const s={source:null,cells:new Map(),global:[],skyline:[],visible:[],cullX:NaN,cullZ:NaN};
ctx.__SUNSET_STAGE37_RENDER_OFF=false;
r.getVisibleStatic(boxes,c,s);
const rows=H.stage37RenderOptimizer.grid(s);if(!rows||!rows.size)throw Error('no indexed rows');
const probes=[[c.x,c.z],[c.x+200,c.z],[c.x-400,c.z+300],[c.x+650,c.z+190],[c.x,c.z-500],[c.x-550,c.z-70]]
  .map(([x,z])=>[Math.floor(x/90),Math.floor(z/90)]);
let signature=0;
function sample(mode,loops){
 let found=0,objects=0;
 for(let k=0;k<loops;k++)for(const [ix,iz]of probes){
  for(let dx=-18;dx<=18;dx++){
   const row=mode==='indexed'?rows.get(ix+dx):null;
   if(mode==='indexed'&&!row)continue;
   for(let dz=-18;dz<=18;dz++){
    const cell=mode==='indexed'?row.get(iz+dz):s.cells.get(`${ix+dx},${iz+dz}`);
    if(cell){found++;objects+=cell.length;}
   }
  }
 }
 return {found,objects};
}
const checks=[];const a=sample('legacy',1),b=sample('indexed',1);
checks.push({name:'exact_cell_match_all_probes',pass:a.found===b.found&&a.objects===b.objects,baseline:a,optimized:b});
const trials=[],times={legacy:[],indexed:[]};
for(let i=0;i<8;i++){
 const modes=i%2===0?['legacy','indexed']:['indexed','legacy'];
 const trial={};
 for(const mode of modes){
  const begin=performance.now(),v=sample(mode,45),ms=performance.now()-begin;
  signature+=v.objects;trial[mode]=+ms.toFixed(3);times[mode].push(ms);
 }
 trials.push(trial);
}
function median(v){const s=v.slice().sort((x,y)=>x-y);return +((s[3]+s[4])/2).toFixed(3);}
const p50Legacy=median(times.legacy),p50Indexed=median(times.indexed);
const output={stage:37,environment:'Node CPU, exact cell data from cumulative real world (1/14 sampled objects)',
  limitations:'Microbenchmark of spatial Map lookups only. Not a full world frame, WebGL, GPU, or FPS.',
  worldBoxCount:g.world.boxes.length,workingSample:boxes.length,gridCells:s.cells.size,
  cameras:probes.length,windowsPerProbe:1369,loopsPerTrial:45,trials,
  medianMs:{legacy:p50Legacy,indexed:p50Indexed},relativeRatio:+(p50Legacy/p50Indexed).toFixed(3),
  checks,checksum:signature,pass:checks.every(x=>x.pass)};
fs.writeFileSync(path.join(__dirname,'STAGE37_CELL_LOOKUP_BENCH.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({pass:output.pass,gridCells:output.gridCells,median:output.medianMs,ratio:output.relativeRatio,checks},null,2));
if(!output.pass)process.exitCode=1;
