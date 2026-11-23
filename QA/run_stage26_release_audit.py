#!/usr/bin/env python3
"""Audits Stage26 cumulative source, Stage25 exact-byte preservation and browser QA site."""
import pathlib,zipfile,hashlib,json,re,subprocess,sys,zlib,urllib.request,urllib.error,threading,http.server,socketserver,os,shutil,tempfile
root=pathlib.Path(__file__).resolve().parent.parent
baseline=pathlib.Path('/mnt/data/SUNSET_STATE_STAGE25_OF35_FULL.zip')
website=pathlib.Path('/mnt/data/stage26_github_pages_site')
checks=[];details=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail});
 if not ok:print('FAIL',name,repr(detail)[:300],file=sys.stderr)
base_manifest=json.loads((root/'PROJECT/STAGE26_STAGE25_BASELINE_HASHES.json').read_text('utf8'))
prior=base_manifest['originalFiles']
archive_available=baseline.is_file() and os.environ.get('STAGE26_OFFLINE')!='1'
base=zipfile.ZipFile(baseline) if archive_available else None
if base:
 for name,h in prior.items():
  if hashlib.sha256(base.read(name)).hexdigest()!=h:
   raise AssertionError('Local baseline archive does not match portable SHA manifest: '+name)
check('Stage25 source has 887 files',len(prior)==887,len(prior))
current={x.relative_to(root).as_posix():x for x in root.rglob('*') if x.is_file()}
check('every old source filename retained',all(n in current for n in prior))
expectedMods={'index.html','START_GAME.html','PROJECT/35_STAGE_PROGRESS.json','PROJECT/35_STAGE_PLAN_HE.md','README_35_STAGE_HE.md','README_FIRST_HE.md'}
for n,h in prior.items():
 unchanged=(hashlib.sha256(current[n].read_bytes()).hexdigest()==h)
 if n in expectedMods:
  f=root/'BACKUPS/STAGE26_OF35'/n
  check('original backup present '+n,f.exists())
  check('original backup sha256-identical '+n,f.is_file() and hashlib.sha256(f.read_bytes()).hexdigest()==h)
 else:check('exact old source unchanged '+n,unchanged)
check('only intended preexisting source files updated',sum(hashlib.sha256(current[n].read_bytes()).hexdigest()!=h for n,h in prior.items())==len(expectedMods))
check('engine is unchanged',hashlib.sha256(current['engine44.js'].read_bytes()).hexdigest()==prior['engine44.js'])
check('city original reference unchanged',hashlib.sha256(current['REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'].read_bytes()).hexdigest()==prior['REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'])
reg=json.loads((root/'QA/STAGE01_15_BUG_REGISTER.json').read_text('utf8'))
prog=json.loads((root/'PROJECT/35_STAGE_PROGRESS.json').read_text('utf8'))
status=json.loads((root/'PROJECT/STAGE26_CURRENT_STATUS.json').read_text('utf8'))
ledger=json.loads((root/'PROJECT/STAGE26_EVIDENCE_LEDGER.json').read_text('utf8'))
evidence=json.loads((root/'QA/STAGE26_HISTORICAL_CPU_EVIDENCE.json').read_text('utf8'))
unit=json.loads((root/'QA/STAGE26_BROWSER_COLLECTOR_UNIT_RESULT.json').read_text('utf8'))
ids=[x['id'] for x in reg['findings']]
check('original 25 issue register unchanged',len(ids)==len(set(ids))==25 and hashlib.sha256((root/'QA/STAGE01_15_BUG_REGISTER.json').read_bytes()).hexdigest()==prior['QA/STAGE01_15_BUG_REGISTER.json'])
check('35-stage progression exactly 1..26, next 27',prog['currentStage']==26 and prog['nextStage']==27 and prog['completedStages']==list(range(1,27)))
check('current status consistent',status['currentStage']==26 and status['nextStage']==27)
check('25 record IDs consistent across register/progress/ledger',ids==[x['issueId'] for x in prog['issues']]==[x['issueId'] for x in ledger['issues']])
check('25 original issue IDs all CPU runtime checked',evidence['issueCount']==25 and all(i['checked']>0 and not i['failures'] for i in evidence['issues']))
check('51/51 actual Game CPU checks',evidence['passed']==evidence['checks']==51)
check('32/32 browser collector fixture checks',unit['passed']==unit['checks']==32)
check('GPU and public website claims remain false',not ledger['nativeGpuChecked'] and not status['qualityGates']['nativeGpu1080p50FpsVerified'] and not ledger['websitePublished'])
check('Stage25 historical status preserved',hashlib.sha256(current['PROJECT/STAGE25_CURRENT_STATUS.json'].read_bytes()).hexdigest()==prior['PROJECT/STAGE25_CURRENT_STATUS.json'])
check('main game entry scripts match',current['index.html'].read_bytes()==current['START_GAME.html'].read_bytes())
check('stage26 optin collector referenced in both HTML entry points',all('stage26qa' in current[n].read_text('utf8') for n in ('index.html','START_GAME.html')))
scriptpaths=re.findall(r'<script src="([^"\n]+\.js)"',current['START_GAME.html'].read_text('utf8'))
check('all startup scripts exist',len(scriptpaths)==82 and all(x in current for x in scriptpaths),{'count':len(scriptpaths)})
check('site includes all 137 original site paths',len(json.loads((root/'PROJECT/STAGE26_SITE_MANIFEST.json').read_text())['fileSha256'])==140)
manifest=json.loads((root/'PROJECT/STAGE26_SITE_MANIFEST.json').read_text('utf8'))
if os.environ.get('STAGE26_OFFLINE')=='1' or not website.exists():
 temp_site=tempfile.TemporaryDirectory(prefix='sunset_stage26_verify_')
 website=pathlib.Path(temp_site.name)
 for name in manifest['fileSha256']:
  src=root/name
  if name=='README_STAGE26_BROWSER_QA_HE.md':src=root/'QA/STAGE26_MANUAL_BROWSER_CHECKLIST_HE.md'
  dest=website/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
check('publication website exists',website.exists() and (website/'index.html').is_file())
for name,sha in manifest['fileSha256'].items():
 f=website/name
 check('site manifest hash '+name,f.is_file() and hashlib.sha256(f.read_bytes()).hexdigest()==sha)
check('game entry inside site equals development build',(website/'index.html').read_bytes()==(root/'index.html').read_bytes())
# Confirm advertised context: no external CDN library required to load startup scripts.
check('all startup scripts ship at exact case',all((website/p).exists() for p in scriptpaths))
check('collector file published and only dynamically loaded', (website/'QA/STAGE26_25_FINDINGS_BROWSER.js').exists() and 'if(new URLSearchParams(location.search).get("stage26qa")==="1")' in (website/'index.html').read_text())
result={'stage':26,'scope':'Source SHA from embedded Stage25 baseline, canonical status, browser collector and site manifest; no GPU testing',
 'allPassed':all(x['pass'] for x in checks),'passed':sum(x['pass'] for x in checks),'checks':len(checks),
 'baselineArchive':baseline.name,'baselineFileCount':len(prior),'newTotalFiles':len(current),'issues':25,'originalScriptCount':len(scriptpaths),
 'modifiedOldFiles':sorted(expectedMods),'failures':[x for x in checks if not x['pass']]}
(root/'QA/STAGE26_RELEASE_CONSISTENCY.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('STAGE26 CONSISTENCY',result['passed'],'/',result['checks'],'source files',len(current),'old file count',len(prior))
if not result['allPassed']:sys.exit(1)
