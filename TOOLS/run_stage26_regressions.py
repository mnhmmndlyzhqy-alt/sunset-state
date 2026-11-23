#!/usr/bin/env python3
"""Portable, self-contained regression runner. Preserves all historical QA reports in place.
Usage: python TOOLS/run_stage26_regressions.py QA/run_stage21_high_speed_acceptance.cjs ...
Requires Node.js. Slow world tests can take time; no real GPU is used.
"""
from pathlib import Path
import subprocess,sys,json,time
root=Path(__file__).resolve().parent.parent
scripts=sys.argv[1:] or ['QA/run_stage21_high_speed_acceptance.cjs','QA/run_stage22_benchmark_acceptance.cjs','QA/run_stage23_profiler_acceptance.cjs']
results=[]
for script in scripts:
 p=root/script
 if not p.is_file():
  results.append({'script':script,'status':'missing'});continue
 before={f:f.read_bytes() for f in (root/'QA').glob('*.json')}
 started=time.monotonic()
 print('START',script,flush=True)
 try:
  res=subprocess.run(['node',script],cwd=root,capture_output=True,timeout=75)
  status='passed' if res.returncode==0 else 'failed'
  out=res.stdout.decode('utf8','replace')[-1700:];err=res.stderr.decode('utf8','replace')[-1000:];code=res.returncode
 except subprocess.TimeoutExpired as exc:
  status='timed_out';out=(exc.stdout or b'').decode('utf8','replace')[-1700:];err=(exc.stderr or b'').decode('utf8','replace')[-1000:];code=None
 finally:
  after=list((root/'QA').glob('*.json'))
  for f in after:
   if f in before:
    if f.read_bytes()!=before[f]:f.write_bytes(before[f])
   elif not f.name.startswith('STAGE26_'):
    f.unlink()
 info={'script':script,'status':status,'exitCode':code,'elapsedSeconds':round(time.monotonic()-started,2),
  'stdoutTail':out,'stderrTail':err,'gpuOrVisualValidated':False,'historicalReportFilesRestored':True}
 results.append(info)
 print('FINISH',script,status,info['elapsedSeconds'],flush=True)
record={'stage':26,'notes':'Re-executes actual original Node scripts with fake renderer; historic QA files restored. Not GPU or browser validation.',
 'complete':all(r['status']=='passed' for r in results),'runs':results}
(root/'QA/STAGE26_PORTABLE_RERUN_RESULT.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('STAGE26 PORTABLE REGRESSIONS',sum(r['status']=='passed' for r in results),'/',len(results))
if not record['complete']:sys.exit(1)
