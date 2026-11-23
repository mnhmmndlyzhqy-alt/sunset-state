from pathlib import Path
import concurrent.futures,subprocess,json,time,sys
root=Path(__file__).resolve().parents[1]
checks=sorted((root/'QA').glob('run_stage*_acceptance.cjs'))
checks += [root/'QA'/n for n in [
 'run_stage01_baseline.cjs','run_visual_recovery01.cjs','run_interior_recovery02.cjs','run_animal_recovery03.cjs',
 'run_physics_recovery04.cjs','run_city_life_recovery05.cjs','run_city_life_recovery05_crowd.cjs',
 'run_deep_audit_acceptance.cjs','run_performance_recovery06.cjs','run_recovery07_smoke.cjs'
]]
checks=[c for c in checks if c.exists()]
def test(p):
 started=time.monotonic()
 try:
  r=subprocess.run(['node',str(p)],cwd=root,timeout=80,capture_output=True,text=True)
  rc=r.returncode
  error=(r.stderr+'\n'+r.stdout).strip()[-1000:] if rc else ''
  return {'test':p.name,'pass':rc==0,'exit':rc,'seconds':round(time.monotonic()-started,2),'message':error}
 except subprocess.TimeoutExpired:
  return {'test':p.name,'pass':False,'exit':'timeout','seconds':round(time.monotonic()-started,2),'message':'timeout 80s'}
print('Begin',len(checks),'regressions',flush=True)
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
 futures={ex.submit(test,c):c for c in checks}
 for f in concurrent.futures.as_completed(futures):
  r=f.result();results.append(r)
  print(('PASS' if r['pass'] else 'FAIL'),r['test'],r['seconds'],flush=True)
summary={'scope':'Accumulated Node tests only; browser GPU rendered QA not available','total':len(results),'passed':sum(r['pass'] for r in results),'failed':sum(not r['pass'] for r in results),'checks':sorted(results,key=lambda x:x['test'])}
(root/'QA'/'RECOVERY07_REGRESSIONS.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
print('FINAL',summary['passed'],'/',summary['total'],flush=True)
if summary['failed']:sys.exit(2)
