#!/usr/bin/env python3
"""Verify actual Stage32 site bytes via local HTTP, script refs, and Node syntax.
This does NOT constitute a WebGL2/GPU game benchmark or remote GitHub publication.
"""
import hashlib,http.server,json,re,threading,urllib.request,urllib.parse,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
root=Path(__file__).resolve().parents[1]
site=root.parent/'sunset_stage32_site'
manifest=json.loads((site/'SITE_FILE_MANIFEST.json').read_text('utf8'))
expected=manifest['filesSha256']
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),lambda *a,**kw:Quiet(*a,directory=str(site),**kw))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_address[1])+'/'
checks=[];failed=[]
def record(title,valid):
 checks.append(title)
 if not valid:failed.append(title)
def audit_file(name):
 with urllib.request.urlopen(base+urllib.parse.quote(name),timeout=55) as response:
  payload=response.read();status=response.status
 return name,status,hashlib.sha256(payload).hexdigest()==expected[name]
try:
 with ThreadPoolExecutor(max_workers=8) as pool:
  for name,code,valid in pool.map(audit_file,sorted(expected)):
   record('HTTP 200 '+name,code==200)
   record('HTTP SHA '+name,valid)
 allrefs=[]
 for name in ('START_GAME.html','index.html'):
  h=(site/name).read_text('utf8')
  refs=re.findall(r'<script src="([^"\n]+\.js)"',h)
  for x in refs:
   record('script '+name+' '+x,x in expected)
  allrefs.extend(refs)
  record('stage31 before stage32 before engine '+name,
     h.index('assets/stage31_vehicle_traffic_polish.js')<h.index('assets/stage32_wildlife_ecology.js')<h.index('engine44.js'))
  record('one stage32 registration '+name,h.count('src="assets/stage32_wildlife_ecology.js"')==1)
 record('exactly matched game launch HTML',(site/'START_GAME.html').read_bytes()==(site/'index.html').read_bytes())
 record('preserved historical site paths',all((site/n).exists() for n in [
    'assets/stage27_route_coast_polish.js','assets/stage28_architectural_facades.js',
    'assets/stage29_interior_retail_polish.js','assets/stage30_character_polish.js',
    'assets/stage31_vehicle_traffic_polish.js','assets/stage32_wildlife_ecology.js']))
 record('manifest file count correct',manifest['filesCount']==len(expected)+1==len(list(site.rglob('*')))-len([p for p in site.rglob('*') if p.is_dir()]))
 record('no public deployment claim',manifest['publicDeploymentPerformed'] is False)
 scripts=sorted(n for n in expected if n.endswith('.js'))
 syntaxRecords=[]
 def syntax(name):
  r=subprocess.run(['node','--check',str(site/name)],capture_output=True,text=True,timeout=50)
  return name,r.returncode==0,r.stderr[-300:]
 with ThreadPoolExecutor(max_workers=4) as pool:
  for future in as_completed([pool.submit(syntax,n) for n in scripts]):
   name,p,err=future.result()
   record('Node --check '+name,p)
   syntaxRecords.append({'name':name,'ok':p,'diagnostic':err if not p else ''})
finally:
 server.shutdown();server.server_close()
report={'project':'SUNSET STATE','stage':32,'localHttpValidated':len(failed)==0,
        'publicDeployment':False,'nativeGpuVerified':False,'fullHd50FpsVerified':False,
        'filesAudited':len(expected),'jsSyntaxChecked':len(scripts),
        'scriptReferencesAudited':len(allrefs),'passed':len(checks)-len(failed),
        'total':len(checks),'failed':failed,'siteFiles':manifest['filesCount']}
(root/'QA/STAGE32_SITE_HTTP_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
syntaxResult={'stage':32,'nodeCheckCount':len(scripts),
              'passed':sum(r['ok'] for r in syntaxRecords),'failed':[r for r in syntaxRecords if not r['ok']],
              'nativeGpuVerified':False}
(root/'QA/STAGE32_JS_SYNTAX_RESULT.json').write_text(json.dumps(syntaxResult,ensure_ascii=False,indent=2)+'\n','utf8')
print('STAGE32 SITE HTTP',report['passed'],'/',report['total'],'JS',syntaxResult['passed'],'/',len(scripts),'JS refs',len(allrefs),'failed',failed[:8],flush=True)
if failed:raise SystemExit(1)
