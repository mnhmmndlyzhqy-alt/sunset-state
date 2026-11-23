#!/usr/bin/env python3
"""Loopback web server for Stage28; local static integrity only, no GPU or remote deploy."""
import hashlib,http.server,json,os,re,threading,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT.parent/'sunset_stage28_site'
manifest=json.loads((ROOT/'PROJECT/STAGE28_SITE_MANIFEST.json').read_text())['fileSha256']
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
handler=lambda *a,**kw:Quiet(*a,directory=str(SITE),**kw)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
base='http://127.0.0.1:'+str(server.server_address[1])+'/'
checks=[];fails=[]
def check(label,ok):
 checks.append(label)
 if not ok:fails.append(label)
def sha(b):return hashlib.sha256(b).hexdigest()
try:
 for name,expected in sorted(manifest.items()):
  uri=base+urllib.parse.quote(name)
  with urllib.request.urlopen(uri,timeout=18) as r:
   b=r.read();check('HTTP '+name,r.status==200)
  check('SHA '+name,sha(b)==expected)
 for name in ['index.html','START_GAME.html']:
  html=(SITE/name).read_text()
  for src in re.findall(r'<script src="([^"\n]+\.js)"',html):
   check('script reference '+name+' '+src,src in manifest)
 check('same HTML root entry points',(SITE/'index.html').read_bytes()==(SITE/'START_GAME.html').read_bytes())
 check('Stage28 script included in both HTML',all('assets/stage28_architectural_facades.js' in (SITE/n).read_text() for n in ['index.html','START_GAME.html']))
 check('Stage27 script included in both HTML',all('assets/stage27_route_coast_polish.js' in (SITE/n).read_text() for n in ['index.html','START_GAME.html']))
 check('original Stage27 pages still present',len(manifest)==146)
 check('metadata says not remotely deployed',json.loads((SITE/'SITE_FILE_MANIFEST.json').read_text())['publicDeploymentPerformed'] is False)
finally:server.shutdown();server.server_close()
result={'stage':28,'testedRealLocalHttp':True,'localUrl':None,'gpuVerified':False,
 'passed':len(checks)-len(fails),'total':len(checks),'failed':fails,'files':len(manifest)}
(ROOT/'QA/STAGE28_SITE_HTTP_AUDIT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('STAGE28_LOCAL_HTTP_AUDIT',result['passed'],'/',result['total'],'failures',fails[:12])
if fails:raise SystemExit(1)
