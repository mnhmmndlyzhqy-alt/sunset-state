'use strict';
/* Regression: build complete original and Stage-02 worlds from exactly the
 * same archived source, with only the historic coast_461.js swapped. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const scripts=[...read('START_GAME.html').matchAll(/<script\s+src="([^"]+\.js)"/g)].map(x=>x[1]);
function build(old){
 const c={console,Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,
 TextEncoder,Math,Date,Buffer,URLSearchParams,performance:{now:()=>Date.now()},
 atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
 setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''}};
 c.globalThis=c;c.window=c;vm.createContext(c);
 for(const s of scripts){const code=old&&s==='assets/coast_461.js'?read('BACKUPS/STAGE02_OF35/coast_461.original.js'):read(s);new vm.Script(code,{filename:s}).runInContext(c,{timeout:60000});}
 new vm.Script(read('engine44.js'),{filename:'engine44.js'}).runInContext(c,{timeout:60000});
 const w=new c.Heatline.World();return {H:c.Heatline,w};
}
const a=build(true),b=build(false);
const checks=[];
const check=(name,pass,data)=>{checks.push({name,pass:!!pass,data});if(!pass)console.error('FAIL '+name,JSON.stringify(data));};
const round=q=>[q.x,q.y,q.z].map(n=>Math.round(n*1e8)/1e8);
const cmpSamples=(a,b)=>a.length===b.length&&a.every((p,i)=>round(p).every((v,k)=>v===round(b[i])[k]));
check('reference_road_count',a.w.roads461.length===52&&b.w.roads461.length===52);
let sameOther=0,otherChanges=[];
for(const r of b.w.roads461){const old=a.w.roads461.find(t=>t.id===r.id);if(r.id==='northRing')continue;
 if(old&&cmpSamples(old.samples,r.samples))sameOther++;
 else otherChanges.push({id:r.id,old:old?.samples.length,new:r.samples.length});}
check('all_51_other_road_profiles_UNCHANGED',sameOther===51,{sameOther,otherChanges});
const orig=a.w.roads461.find(q=>q.id==='northRing'),next=b.w.roads461.find(q=>q.id==='northRing');
check('north_ring_sample_count_reduced',orig.samples.length>next.samples.length,{before:orig.samples.length,after:next.samples.length});
check('north_ring_endpoints_preserved',Math.hypot(orig.samples[0].x-next.samples[0].x,orig.samples[0].z-next.samples[0].z)<1e-8&&
 Math.hypot(orig.samples.at(-1).x-next.samples.at(-1).x,orig.samples.at(-1).z-next.samples.at(-1).z)<1e-8);
check('interior_portals_identical',a.w.entrancePortals.length===b.w.entrancePortals.length&&
 a.w.entrancePortals.every((p,i)=>{let q=b.w.entrancePortals[i];return p.id===q.id&&p.x===q.x&&p.z===q.z&&p.interiorReady===q.interiorReady;}),
 {before:a.w.entrancePortals.length,after:b.w.entrancePortals.length});
check('building_masses_identical',a.w.city20DistrictBuildings.length===b.w.city20DistrictBuildings.length&&
 a.w.city20DistrictBuildings.every((p,i)=>{let q=b.w.city20DistrictBuildings[i];return p.id===q.id&&p.x===q.x&&p.z===q.z&&p.baseY===q.baseY;}));
check('collision_solid_count_preserved',a.w.solids.length===b.w.solids.length,{before:a.w.solids.length,after:b.w.solids.length});
check('animal_habitat_preserved',a.H.CROC_SITES477.length===b.H.CROC_SITES477.length&&a.H.CROC_SITES477.length===8);
const out={kind:'A/B full world CPU comparison; no actual WebGL',stage:2,totalStages:35,
 baseline:{totalRoadSamples:a.w.roads461.reduce((n,r)=>n+r.samples.length,0),northRingSamples:orig.samples.length,boxes:a.w.boxes.length,solids:a.w.solids.length},
 repaired:{totalRoadSamples:b.w.roads461.reduce((n,r)=>n+r.samples.length,0),northRingSamples:next.samples.length,boxes:b.w.boxes.length,solids:b.w.solids.length},
 passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
fs.writeFileSync(path.join(root,'QA/35_STAGE_MASTER/STAGE02_AB_FULL_WORLD.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.passed,total:out.total,baseline:out.baseline,repaired:out.repaired,failed:checks.filter(c=>!c.pass)},null,2));
if(out.passed!==out.total)process.exitCode=2;
