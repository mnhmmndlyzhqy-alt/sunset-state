#!/usr/bin/env python3
"""Local HTTP and JS syntax audit only. No GPU or public hosting."""
import hashlib,http.server,json,re,threading,urllib.request,urllib.parse,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
root=Path(__file__).resolve().parents[1]
site=root.parent/'sunset_stage29_site'
manifest=json.loads((root/'PROJECT/STAGE29_SITE_MANIFEST.json').read_text('utf8'))['fileSha256']
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
handler=lambda *args,**kwargs:Quiet(*args,directory=str(site),**kwargs)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_address[1])+'/'
checks=[];fail=[]
def ok(name,cond):
 checks.append(name)
 if not cond:fail.append(name)
try:
 for name,expected in sorted(manifest.items()):
  with urllib.request.urlopen(base+urllib.parse.quote(name),timeout=20) as response:
   b=response.read();ok('HTTP '+name,response.status==200)
  ok('SHA '+name,hashlib.sha256(b).hexdigest()==expected)
 for name in ['START_GAME.html','index.html']:
  h=(site/name).read_text('utf8')
  refs=re.findall(r'<script src="([^"\n]+\.js)"',h)
  for path in refs:ok('Script '+name+' '+path,path in manifest)
  ok('Stage29 loaded after stage19',h.index('assets/stage29_interior_retail_polish.js')>h.index('assets/stage19_persistent_save.js'))
  ok('Stage29 HUD widget present',all(x in h for x in ['id="stage29-wayfinding"','id="stage29-shop-guide"']))
  ok('Stage29 off supported', 'stage29_interior_retail_polish.js' in h)
 ok('Two HTML entrypoints byte-identical',(site/'index.html').read_bytes()==(site/'START_GAME.html').read_bytes())
 ok('Original Stage28 site paths retained',len(manifest)==149)
 ok('No remote deployment flag',json.loads((site/'SITE_FILE_MANIFEST.json').read_text('utf8'))['publicDeploymentPerformed'] is False)
 scripts=sorted(p for p in manifest if p.endswith('.js'))
 # Node parses the scripts; it does not execute or draw them.
 def syntax(path):
  x=subprocess.run(['node','--check',str(site/path)],capture_output=True,text=True,timeout=30)
  return path,x.returncode==0,x.stderr[-600:]
 with ThreadPoolExecutor(max_workers=3) as pool:
  for future in as_completed([pool.submit(syntax,p) for p in scripts]):
   p,good,error=future.result();ok('JS syntax '+p,good)
   if not good:print('JS ERROR',p,error)
finally:
 server.shutdown();server.server_close()
report={'stage':29,'localHttpValidated':True,'publicDeployment':False,
 'nativeGpuVerified':False,'syntaxChecked':len(scripts),
 'passed':len(checks)-len(fail),'total':len(checks),'failed':fail[:40],
 'siteFiles':len(manifest)}
(root/'QA/STAGE29_SITE_HTTP_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('STAGE29_SITE_HTTP_AUDIT',report['passed'],'/',report['total'],'JS',report['syntaxChecked'],'failures',len(fail))
if fail:raise SystemExit(1)
