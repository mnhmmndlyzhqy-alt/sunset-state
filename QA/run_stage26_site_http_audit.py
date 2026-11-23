#!/usr/bin/env python3
import pathlib,subprocess,hashlib,json,re,http.server,socketserver,threading,tempfile,os,urllib.request,time,sys,shutil
R=pathlib.Path(__file__).resolve().parent.parent
S=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path('/mnt/data/stage26_github_pages_site')
_tmp_site=None
if os.environ.get('STAGE26_OFFLINE')=='1' or not S.is_dir():
 _tmp_site=tempfile.TemporaryDirectory(prefix='sunset_stage26_http_site_')
 S=pathlib.Path(_tmp_site.name)
 m=json.loads((R/'PROJECT/STAGE26_SITE_MANIFEST.json').read_text('utf8'))
 for name,sha in m['fileSha256'].items():
  src=R/name
  if name=='README_STAGE26_BROWSER_QA_HE.md':src=R/'QA/STAGE26_MANUAL_BROWSER_CHECKLIST_HE.md'
  dest=S/name;dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(src,dest)
 (S/'STAGE26_SITE_FILE_MANIFEST.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

checks=[];fails=[]
def ck(name,x):
 checks.append(name)
 if not x:fails.append(name);print('FAIL',name,file=sys.stderr)
js=sorted(S.rglob('*.js'))
for f in js:
 proc=subprocess.run(['node','--check',str(f)],capture_output=True,timeout=60)
 ck('syntax '+f.relative_to(S).as_posix(),proc.returncode==0)
assert len(js)>=123,len(js)
with tempfile.TemporaryDirectory(prefix='sunset_stage26_http_') as temp:
 t=pathlib.Path(temp);os.symlink(S,t/'sunset-state')
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*args,**kwargs):super().__init__(*args,directory=temp,**kwargs)
  def log_message(self,*args):pass
 with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  url=f'http://127.0.0.1:{server.server_address[1]}/sunset-state/'
  for f in sorted(S.rglob('*')):
   if not f.is_file():continue
   name=f.relative_to(S).as_posix()
   with urllib.request.urlopen(url+name,timeout=12) as res:
    content=res.read();code=res.status;headers=res.headers
   ck('HTTP 200 '+name,code==200)
   ck('GET content SHA256 '+name,hashlib.sha256(content).digest()==hashlib.sha256(f.read_bytes()).digest())
   if f.suffix=='.js':ck('JS MIME '+name,'javascript' in headers.get_content_type())
  # Entry from a project subpath and query optin, not a file:// fallback.
  for route in ['index.html?stage26qa=1','START_GAME.html?stage26qa=1','QA/STAGE26_25_FINDINGS_BROWSER.js']:
   with urllib.request.urlopen(url+route,timeout=12) as res:body=res.read()
   ck('subpath QA URL '+route,len(body)>100)
  server.shutdown();thread.join(timeout=2)
report={'stage':26,'scope':'Local HTTP, subpath, all shipped JS syntax and exact content SHA; not browser WebGL or publication',
 'websiteFiles':len([f for f in S.rglob('*') if f.is_file()]),'jsSyntaxChecked':len(js),
 'passed':len(checks)-len(fails),'checks':len(checks),'failures':fails,'nativeHardwareGpu':False,'deployed':False}
(R/'QA/STAGE26_SITE_HTTP_RESULT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('STAGE26 WEBSITE TEST',report['passed'],'/',report['checks'],'JS',len(js),'site files',report['websiteFiles'])
if fails:sys.exit(1)
