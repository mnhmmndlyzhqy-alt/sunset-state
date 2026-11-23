#!/usr/bin/env python3
"""Stage36 website audit: CRC-free byte hashes, local HTTP, JS, references, stage35 preservation."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile,threading,urllib.request,http.server,functools,sys,time
site=Path('/mnt/data/sunset_stage36_site')
root=Path(__file__).resolve().parent.parent
manifest=json.loads((site/'SITE_FILE_MANIFEST.json').read_text())
fail=[];checks=0

def require(cond,description):
 global checks
 checks+=1
 if not cond: fail.append(description)

paths=sorted(p for p in site.rglob('*') if p.is_file())
actual={str(p.relative_to(site)).replace('\\','/') for p in paths}
require(manifest['programmeStage']==36,'manifest stage36')
require(manifest['filesCount']==len(actual),'manifest site file count')
require(len(manifest['filesSha256'])==len(actual)-1,'manifest hash count')
for rel,sha in manifest['filesSha256'].items():
 p=site/rel
 require(p.is_file(),f'exists {rel}')
 if p.is_file():require(hashlib.sha256(p.read_bytes()).hexdigest()==sha,f'sha {rel}')
expected={'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json'}
original=Path('/mnt/data/SUNSET_STATE_STAGE35_GITHUB_PAGES_SITE.zip')
with zipfile.ZipFile(original) as z:
 previous=set(z.namelist())
 for rel in previous:
  require(rel in actual,'stage35 site file preserved: '+rel)
  if rel not in expected:
   require((site/rel).read_bytes()==z.read(rel),'unexpected stage35 site delta: '+rel)
 require(len(previous)==169,'known stage35 file count')
new=sorted(actual-previous)
require(new==sorted(['STAGE36_BENCHMARK_GUIDE.html','README_STAGE36_HE.md',
  'README_STAGE36_GITHUB_PAGES_HE.md','README_STAGE36_CPU_RESULTS_HE.md',
  'assets/stage36_performance_audit.js']),f'new files expected: {new}')
# Ensure both start pages have identical referenced script ordering and references exist.
pattern=re.compile(r'<script\s+src="([^"\n]+\.js)"',re.I)
refmap={}
for name in ['index.html','START_GAME.html']:
 html=(site/name).read_text()
 refs=pattern.findall(html);refmap[name]=refs
 require(bool(refs),'script references found: '+name)
 require(refs.count('assets/stage36_performance_audit.js')==1,'stage36 one module: '+name)
 require(refs.index('assets/stage36_performance_audit.js')<refs.index('engine44.js'),'stage36 before engine: '+name)
 for ref in refs:require((site/ref).exists(),'script reference '+name+':'+ref)
require(refmap['index.html']==refmap['START_GAME.html'],'same script ordering both entries')
engine=(site/'engine44.js').read_text()
require('Heatline.installStage36PerformanceAudit(Game)' in engine,'stage36 installer wired into game')
require('Heatline.installStage22NativeBenchmark(Game)' in engine,'stage22 benchmark preserved')
jslist=sorted(site.rglob('*.js'))
for f in jslist:
 res=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
 require(res.returncode==0,'JS syntax '+str(f.relative_to(site))+':'+(res.stderr or '')[:170])
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(site),**kwargs)
 def log_message(self,fmt,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 base=f'http://127.0.0.1:{server.server_port}/';
 for p in paths:
  rel=p.relative_to(site).as_posix()
  # Manifest has full local byte lengths, and HTTP 200 is independently verified.
  with urllib.request.urlopen(base+urllib.parse.quote(rel),timeout=10) as response:
   body=response.read()
   require(response.status==200,'HTTP status '+rel)
   require(body==p.read_bytes(),'HTTP full byte equality '+rel)
finally:
 server.shutdown();server.server_close()
result={'stage':36,'siteFiles':len(paths),'originalStage35SiteFilesPreserved':len(previous),
  'newSiteFiles':len(new),'jsSyntaxChecks':len(jslist),'referencedScripts':len(refmap['index.html']),
  'checks':checks,'passed':checks-len(fail),'failed':fail,
  'httpTests':'real localhost HTTP every file + byte-for-byte equality',
  'nativeGPUVerified':False,'publicDeploymentPerformed':False}
out=root/'QA/STAGE36_SITE_RELEASE_RESULT.json';out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='failed'}|{'failedFirst10':fail[:10]},indent=2,ensure_ascii=False))
if fail:sys.exit(1)
