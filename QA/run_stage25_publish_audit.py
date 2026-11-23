#!/usr/bin/env python3
"""Stage25 reproducible audit: exact stage24 preservation, Pages subpath, scripts, assets, hashes and HTTP."""
import argparse,hashlib,http.server,functools,json,pathlib,re,threading,urllib.request,urllib.parse,urllib.error,zipfile,time,tempfile,shutil,os
from html.parser import HTMLParser

P=pathlib.Path(__file__).resolve().parents[1]
DEFAULT_SITE=pathlib.Path('/mnt/data/stage25_github_pages_site')
DEFAULT_BASE=pathlib.Path('/mnt/data/SUNSET_STATE_STAGE24_OF35_FULL.zip')
class Assets(HTMLParser):
 def __init__(self):super().__init__();self.scripts=[];self.refs=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='script' and d.get('src'):self.scripts.append(d['src'])
  for attr in ('src','href'):
   if attr in d:self.refs.append((tag,attr,d[attr]))

def sha(data):return hashlib.sha256(data).hexdigest()

def run(root=P,site=DEFAULT_SITE,base=DEFAULT_BASE,do_http=True):
 checks=[]
 def check(name,condition,detail=''):
  checks.append({'name':name,'passed':bool(condition),'detail':str(detail) if detail else ''})
  if not condition:print('FAIL',name,detail,flush=True)
 def read(p):return p.read_bytes()
 with zipfile.ZipFile(base) as z:
  prior={x.filename:sha(z.read(x.filename)) for x in z.infolist() if not x.is_dir()}
 source={f.relative_to(root).as_posix():f for f in root.rglob('*') if f.is_file()}
 check('preserved_stage24_count',len(prior)==863,len(prior))
 for path,digest in sorted(prior.items()):
  check('source_member_exists:'+path,path in source)
  if path in source and not path.startswith('PROJECT/35_STAGE_PROGRESS.json'):
   # Original edits are verified using protected backups.
   if path in {'PROJECT/35_STAGE_PLAN_HE.md','README_35_STAGE_HE.md','README_FIRST_HE.md'}:
    f=root/'BACKUPS/STAGE25_OF35'/path
   else:f=source[path]
   check('source_member_sha:'+path,f.exists() and sha(read(f))==digest)
 for name in ['PROJECT/35_STAGE_PROGRESS.json','PROJECT/35_STAGE_PLAN_HE.md','README_35_STAGE_HE.md','README_FIRST_HE.md']:
  protected=root/'BACKUPS/STAGE25_OF35'/name
  check('stage25_modified_source_backup:'+name,protected.exists() and sha(read(protected))==prior.get(name))
 game_files=['START_GAME.html','engine44.js']+[p.relative_to(root).as_posix() for p in (root/'assets').rglob('*') if p.is_file()]
 for name in sorted(game_files):
  check('game_asset_preserved:'+name,(site/name).is_file() and (root/name).is_file() and sha(read(site/name))==sha(read(root/name)))
 check('index_equals_game',read(site/'index.html')==read(root/'START_GAME.html'))
 check('jekyll_disabled',(site/'.nojekyll').exists())
 check('safe_default_404',(site/'404.html').exists())
 check('launch_helper_present',(site/'RUN_GAME_WINDOWS.bat').exists())
 html=(site/'index.html').read_text(encoding='utf-8')
 parsed=Assets();parsed.feed(html)
 check('main_82_scripts',len(parsed.scripts)==82,len(parsed.scripts))
 check('engine_at_expected_position', parsed.scripts.count('engine44.js')==1 and parsed.scripts.index('engine44.js')>40)
 for name in parsed.scripts:
  check('html_script_exact_case:'+name,not name.startswith('/') and (site/name).is_file())
 for tag,attr,value in parsed.refs:
  if value.startswith(('http:','https:','data:','#')):continue
  if re.search(r'(^|/)\.\.(/|$)',urllib.parse.unquote(value)):
   check('no_parent_path:'+value,False)
  if value.startswith('/'):
   check('no_root_absolute_asset:'+value,False)
 optional=['QA/recovery07_live_checklist.js','QA/STAGE01_15_LIVE_AUDIT.js','QA/city20_browser_benchmark.js']
 for item in optional:check('optional_qa_script_exists:'+item,(site/item).is_file())
 for wav in ['radio-boulevard.wav','radio-quay.wav']:
  check('audio_445_exists:'+wav,(site/'assets/audio445'/wav).is_file())
 for i in range(468,473):check('satellite_exists:'+str(i),(site/f'assets/satellite_{i}.png').is_file())
 for name in ['crocodile_hi','crocodile_mid','crocodile_far','flamingo_hi','flamingo_mid','flamingo_far','heron_hi','heron_far','airliner_hi','airliner_mid','fish_unique','urban_01-oat-jacket','rail_21-locomotive-407']:
  check('ondemand_asset:'+name,(site/f'assets/{name}.js').is_file())
 manifest=json.loads((site/'SITE_FILE_MANIFEST.json').read_text())
 records=manifest['files'];indexed={v['path']:v for v in records}
 listpaths={p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file()}-{'SITE_FILE_MANIFEST.json'}
 check('site_manifest_exact_members',set(indexed)==listpaths)
 for path in sorted(indexed):
  f=site/path
  check('site_manifest_sha:'+path,sha(read(f))==indexed[path]['sha256'] and f.stat().st_size==indexed[path]['size'])
 check('max_individual_file_below_100MB',max(f.stat().st_size for f in site.rglob('*') if f.is_file())<100_000_000)
 check('static_site_uncompressed_below_1GB',sum(f.stat().st_size for f in site.rglob('*') if f.is_file())<1_000_000_000)
 if do_http:
  with tempfile.TemporaryDirectory() as temp:
   relroot=pathlib.Path(temp);(relroot/'sunset-state').symlink_to(site,target_is_directory=True)
   class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
   handler=functools.partial(Quiet,directory=str(relroot))
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
   thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   baseurl=f'http://127.0.0.1:{server.server_port}/sunset-state/'
   try:
    with urllib.request.urlopen(baseurl,timeout=12) as r:
     check('http_subpath_index_serves_game',r.status==200 and r.read()==read(site/'index.html'))
    for p in sorted(listpaths):
     try:
      req=urllib.request.Request(baseurl+urllib.parse.quote(p),method='HEAD')
      with urllib.request.urlopen(req,timeout=12) as r:
       check('http_subpath_asset_status:'+p,r.status==200)
       check('http_subpath_asset_length:'+p,int(r.headers.get('Content-Length') or -1)==(site/p).stat().st_size)
       if p.endswith('.js'):check('http_script_mime:'+p,'javascript' in r.headers.get('Content-Type','').lower())
     except Exception as e:
      check('http_subpath_asset_status:'+p,False,str(e))
    for sample in ['index.html','engine44.js','assets/stage21_high_speed_ccd.js','assets/crocodile_mid.js','assets/audio445/radio-quay.wav','assets/satellite_472.png','QA/recovery07_live_checklist.js']:
     with urllib.request.urlopen(baseurl+sample,timeout=24) as r:check('http_payload_exact:'+sample,sha(r.read())==sha(read(site/sample)))
   finally:server.shutdown();server.server_close()
 report={'stage':25,'kind':'static GitHub Pages release plus local HTTP subpath test, NOT hardware WebGL/GPU','baseline':str(base),
         'releaseSite':str(site),'checks':checks,'passed':sum(q['passed'] for q in checks),'total':len(checks),'failures':[q for q in checks if not q['passed']],
         'nativeHardwareGpuTested':False,'publishedToGitHub':False}
 return report
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--no-http',action='store_true');a.add_argument('--write-result',action='store_true');o=a.parse_args()
 report=run(do_http=not o.no_http)
 if o.write_result:(P/'QA/STAGE25_PUBLISH_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':report['failures'][:6],'http':not o.no_http},ensure_ascii=False))
 raise SystemExit(0 if report['passed']==report['total'] else 1)
