#!/usr/bin/env python3
"""Stage27 targeted real-code regression checks. Restores all historical QA files verbatim."""
from pathlib import Path
import os, subprocess, hashlib, tempfile, shutil, json, concurrent.futures, time
root=Path(__file__).resolve().parents[1]
qa=root/'QA'
checks=[
 ('stage16_glass_historical','run_stage16_of35_acceptance.cjs',True),
 ('stage19_saves','run_stage19_of35_acceptance.cjs',False),
 ('stage20_pedestrians','run_stage20_navigation_acceptance.cjs',False),
 ('stage21_vehicle_ccd','run_stage21_high_speed_acceptance.cjs',False),
 ('stage22_benchmark_mock','run_stage22_benchmark_acceptance.cjs',False),
 ('stage23_profiler_mock','run_stage23_profiler_acceptance.cjs',False),
 ('stage26_all25_historical','run_stage26_historical_closure.cjs',True),
]
def run(job):
 name,script,compat=job
 env=os.environ.copy()
 if compat:env['STAGE27_ROADS_OFF']='1'
 started=time.time()
 try:
  p=subprocess.run(['node',str(qa/script)],cwd=root,env=env,capture_output=True,text=True,timeout=155)
  return {'name':name,'source':script,'compatibilityModeStage26':compat,'passed':p.returncode==0,
    'exitCode':p.returncode,'durationSec':round(time.time()-started,2),'output':(p.stdout+'\n'+p.stderr)[-1600:]}
 except subprocess.TimeoutExpired as e:
  return {'name':name,'source':script,'compatibilityModeStage26':compat,'passed':False,'timeout':True,
    'durationSec':round(time.time()-started,2),'output':str(e)[-500:]}
with tempfile.TemporaryDirectory(prefix='sunset_stage27_qa_') as tmp:
 temporary=Path(tmp)
 existing={f.relative_to(qa):f for f in qa.rglob('*') if f.is_file()}
 for rel,f in existing.items():
  dest=temporary/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest)
 started=time.time()
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  results=list(pool.map(run,checks))
 for f in qa.rglob('*'):
  if f.is_file() and f.relative_to(qa) not in existing:f.unlink()
 for rel in existing:
  original=(temporary/rel).read_bytes()
  f=qa/rel
  if not f.is_file() or f.read_bytes()!=original:
   f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(original)
 report={'stage':27,'mode':'Historical validators in immutable compatibility mode where exact Stage26 geometry is asserted; otherwise current Stage27 real code',
  'runtimeSec':round(time.time()-started,2),'checks':results,'passed':sum(q['passed'] for q in results),
  'total':len(results),'allPassed':all(q['passed'] for q in results),'oldQAReportsPreserved':True,
  'extendedRetail17Rerun':'Not run; Stage26 earlier timed out',
  'nativeGpuVerified':False}
 (qa/'STAGE27_REGRESSION_RESULT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'passed':report['passed'],'total':report['total'],'runtimeSec':report['runtimeSec'],
   'checks':[{'name':q['name'],'passed':q['passed'],'secs':q['durationSec'],'exitCode':q.get('exitCode'),'timeout':q.get('timeout')} for q in results]},ensure_ascii=False,indent=2),flush=True)
 raise SystemExit(0 if report['allPassed'] else 1)
