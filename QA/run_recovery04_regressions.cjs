'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir=__dirname,files=fs.readdirSync(dir).filter(f=>/^run_.*\.cjs$/.test(f)&&!['run_physics_recovery04.cjs','run_recovery04_regressions.cjs'].includes(f)).sort();
const results=[];let index=0,active=0;
(async()=>{
 await new Promise(resolve=>{
  function next(){
   if(index===files.length&&active===0)return resolve();
   while(active<2&&index<files.length){
    const f=files[index++];active++;const started=Date.now();
    const p=cp.spawn(process.execPath,[path.join(dir,f)],{cwd:path.resolve(dir,'..'),env:process.env});
    let out='',err='';p.stdout.on('data',b=>{out=(out+b).slice(-1800)});p.stderr.on('data',b=>{err=(err+b).slice(-2500)});
    p.on('error',e=>{err+=e.message});
    p.on('close',(code,signal)=>{
     const ok=code===0;results.push({name:f,passed:ok,exit:code,signal,elapsedMs:Date.now()-started,output:out,errors:err});
     process.stdout.write((ok?'PASS ':'FAIL ')+f+' '+((Date.now()-started)/1000).toFixed(1)+'s\n');
     active--;next();
    });
   }
  }
  next();
 });
 const report={scope:'Historic suite and full-world audit, phase4 unchanged behavior regression',count:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.errors.slice(-500)})),results,hardwareFPSVerified:false};
 fs.writeFileSync(path.join(dir,'PHYSICS_RECOVERY04_REGRESSIONS.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`REGRESSIONS ${report.passed}/${report.count}`);
 if(report.failed.length)process.exitCode=2;
})();
