#!/usr/bin/env python3
"""HTTP, hash, syntax, references, historical website byte preservation audit."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile,threading,urllib.parse,urllib.request,http.server,sys
SITE=Path('/mnt/data/sunset_stage37_site');ROOT=Path(__file__).resolve().parent.parent
BASE=Path('/mnt/data/SUNSET_STATE_STAGE36_GITHUB_PAGES_SITE.zip')
manifest=json.loads((SITE/'SITE_FILE_MANIFEST.json').read_text());problems=[];count=0

def ok(cond,desc):
 global count
 count+=1
 if not cond:problems.append(desc)
files=sorted(p for p in SITE.rglob('*') if p.is_file());paths={p.relative_to(SITE).as_posix() for p in files}
ok(manifest['programmeStage']==37,'manifest stage')
ok(manifest['filesCount']==len(paths),'file count')
ok(len(manifest['filesSha256'])==len(paths)-1,'hash count')
for name,expected in manifest['filesSha256'].items():
 p=SITE/name;ok(p.is_file(),'exists '+name)
 if p.is_file():ok(hashlib.sha256(p.read_bytes()).hexdigest()==expected,'sha '+name)
with zipfile.ZipFile(BASE) as z:
 previous=set(z.namelist());modified=[]
 for name in previous:
  ok(name in paths,'retains Stage36 '+name)
  if name in paths and (SITE/name).read_bytes()!=z.read(name):modified.append(name)
ok(set(modified)=={'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json'},'expected baseline differences '+str(modified))
new=paths-previous
ok(new=={'assets/stage37_render_optimization.js','STAGE37_AB_BENCHMARK.html',
        'README_STAGE37_HE.md','README_STAGE37_GITHUB_PAGES_HE.md'},'new files '+str(new))
pattern=re.compile(r'<script\s+src="([^"\n]+\.js)"',re.I);orders=[]
for htmlfile in ['index.html','START_GAME.html']:
 refs=pattern.findall((SITE/htmlfile).read_text());orders.append(refs)
 ok(refs.count('assets/stage37_render_optimization.js')==1,'one stage37 source '+htmlfile)
 ok(refs.index('assets/stage36_performance_audit.js')<refs.index('assets/stage37_render_optimization.js')<refs.index('engine44.js'),'correct script order '+htmlfile)
 for js in refs:ok((SITE/js).is_file(),'script exists '+htmlfile+' '+js)
ok(orders[0]==orders[1],'both entry scripts match')
engine=(SITE/'engine44.js').read_text()
for phrase in ['stage37RenderOptimizer?.grid(scene)','stage37RenderOptimizer.uploadStatic','stage37RenderOptimizer.skipEmpty()','Heatline.installStage36PerformanceAudit(Game)']:
 ok(phrase in engine,'renderer integration '+phrase)
jsfiles=sorted(SITE.rglob('*.js'))
for f in jsfiles:
 p=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
 ok(p.returncode==0,'node syntax '+f.relative_to(SITE).as_posix()+' '+p.stderr[:70])
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(SITE),**kw)
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
try:
 root=f'http://127.0.0.1:{server.server_port}/'
 for p in files:
  name=p.relative_to(SITE).as_posix()
  with urllib.request.urlopen(root+urllib.parse.quote(name),timeout=25) as reply:
   ok(reply.status==200,'HTTP 200 '+name)
   ok(reply.read()==p.read_bytes(),'HTTP byte equality '+name)
finally:server.shutdown();server.server_close()
result={'stage':37,'siteFiles':len(files),'priorSiteFilesPreserved':len(previous),
 'intendedPreviousFilesModified':sorted(modified),'newFiles':sorted(new),
 'javascriptSyntaxChecks':len(jsfiles),'scriptsPerEntry':len(orders[0]),
 'checks':count,'passed':count-len(problems),'failed':problems,
 'gpuMeasured':False,'native1080Fps50Verified':False,'publicDeployment':False}
(ROOT/'QA/STAGE37_SITE_RELEASE_RESULT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='failed'}|{'failed':problems[:15]},ensure_ascii=False,indent=2))
if problems:sys.exit(1)
