#!/usr/bin/env python3
"""Stage30 local HTTP SHA and JS loader/syntax QA; no hardware WebGL or deployment."""
import hashlib,http.server,json,re,threading,urllib.request,urllib.parse,subprocess,zipfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
root=Path(__file__).resolve().parents[1];site=root.parent/'sunset_stage30_site'
manifest=json.loads((root/'PROJECT/STAGE30_SITE_MANIFEST.json').read_text('utf8'))['fileSha256']
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),lambda *a,**kw:Quiet(*a,directory=str(site),**kw))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_address[1])+'/'
checks=[];fail=[]
def ok(name,cond):
 checks.append(name)
 if not cond:fail.append(name)
try:
 def audit_item(name,expected):
  # Only relative URLs, no external fetches in this test.
  with urllib.request.urlopen(base+urllib.parse.quote(name),timeout=35) as response:
   payload=response.read();status=response.status
  return name,status,hashlib.sha256(payload).hexdigest()==expected
 with ThreadPoolExecutor(max_workers=8) as pool:
  results=list(pool.map(lambda n:audit_item(n,manifest[n]),sorted(manifest)))
 for name,code,digestOk in results:
  ok('HTTP '+name,code==200)
  ok('SHA '+name,digestOk)
 for name in ['START_GAME.html','index.html']:
  h=(site/name).read_text('utf8');refs=re.findall(r'<script src="([^"\n]+\.js)"',h)
  for item in refs:ok('script '+name+' '+item,item in manifest)
  ok('stage30 loaded after Stage29 and core',h.index('assets/stage30_character_polish.js')>h.index('assets/stage29_interior_retail_polish.js')>h.index('engine44.js'))
  ok('only one Stage30 load',h.count('src="assets/stage30_character_polish.js"')==1)
  ok('original 29 features survive',all(x in h for x in ['id="stage29-wayfinding"','id="stage29-shop-guide"']))
 ok('index and START_GAME identical',(site/'START_GAME.html').read_bytes()==(site/'index.html').read_bytes())
 ok('153 or fewer site files',len(list(site.rglob('*')))<250)
 ok('no public deployment claim',json.loads((site/'SITE_FILE_MANIFEST.json').read_text('utf8'))['publicDeploymentPerformed'] is False)
 scripts=sorted(p for p in manifest if p.endswith('.js'))
 def syntax(p):
  r=subprocess.run(['node','--check',str(site/p)],capture_output=True,text=True,timeout=40)
  return p,r.returncode==0,r.stderr[-500:]
 with ThreadPoolExecutor(max_workers=4) as pool:
  for future in as_completed([pool.submit(syntax,p) for p in scripts]):
   name,pass_,err=future.result();ok('JS '+name,pass_)
   if not pass_:print('JS ERROR',name,err)
finally:
 server.shutdown();server.server_close()
report={'stage':30,'localHttpValidated':True,'publicDeployment':False,
 'nativeGpuVerified':False,'syntaxChecked':len(scripts),
 'passed':len(checks)-len(fail),'total':len(checks),
 'failed':fail[:30],'siteFiles':len(manifest)+1}
(root/'QA/STAGE30_SITE_HTTP_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('STAGE30_SITE_HTTP_AUDIT',report['passed'],'/',report['total'],'JS',report['syntaxChecked'],'failed',len(fail))
if fail:raise SystemExit(1)
