#!/usr/bin/env python3
"""Stage25 publication release checks, read-only; validates canonical status and baseline history."""
import hashlib,json,pathlib,re,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
base=pathlib.Path('/mnt/data/SUNSET_STATE_STAGE24_OF35_FULL.zip')
checks=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)})
 if not ok:print('FAIL:',name)
def load(rel):return json.loads((root/rel).read_text(encoding='utf-8'))
progress=load('PROJECT/35_STAGE_PROGRESS.json');status=load('PROJECT/STAGE25_CURRENT_STATUS.json')
release=load('PROJECT/STAGE25_RELEASE_MANIFEST.json');site=load('SITE_FILE_MANIFEST.json')
check('stage25_active',progress.get('currentStage')==25 and progress.get('nextStage')==26)
check('status_stage25',status.get('currentStage')==25 and status.get('nextStage')==26)
check('stage25_canonical_pointer',progress.get('sourceOfTruth')=='PROJECT/STAGE25_CURRENT_STATUS.json')
check('completed_stage_list',progress.get('completedStages')==list(range(1,26)))
check('technical_stage_list',progress.get('completedTechnicalStages')==list(range(1,26)))
check('remaining_stage_list',status.get('remainingStages')==list(range(26,36)))
check('stage_count_35',progress.get('stageCount')==35)
check('new_main_release_pointer',progress.get('latestStageArtifact')=='SUNSET_STATE_STAGE25_OF35_FULL.zip')
check('original_issues_counter',progress.get('issueCount')==25 and len(progress['issues'])==25)
check('original_issues_completed_counter',progress.get('issuesResolvedOrAuditedWithCpuQA')==24)
check('original_issues_pending_count',progress.get('issuesRemainingForStages')==1)
check('only_stage26_pending',[x['stage'] for x in progress['issues'] if x['status']=='pending']==[26])
check('stage25_live_not_published',status['currentBuild']['githubPagesDeployed'] is False and status['currentBuild']['newLivePublishedUrl'] is None)
check('stage25_gpu_not_certified',status['qualityGates']['nativeGpu1920x1080AtLeast50FpsPassed'] is False)
check('stage25_original_fix_count_unchanged',progress.get('issuesSourceFixedAndCpuChecked')==18)
check('original_stage24_status_is_historical',load('PROJECT/STAGE24_CURRENT_STATUS.json')['currentStage']==24)
check('historic_city20_untouched',load('PROJECT/CITY20_PROGRESS.json').get('completedStages') is not None)
check('history_source_registry_exists',(root/'PROJECT/STAGE24_PROGRESS_SOURCE_REGISTRY.json').exists())
check('site_manifest_137_files',len(site.get('files',[]))==136 and status['currentBuild']['staticSiteFileCount']==137)
check('site_root_index_equal_game',(root/'index.html').read_bytes()==(root/'START_GAME.html').read_bytes())
check('deploy_guide_copied',(root/'README_GITHUB_PAGES_HE.md').exists())
check('jekyll_marker',(root/'.nojekyll').exists())
check('stage24_source_hash',release.get('baseArchiveSha256')==sha(base.read_bytes()))
rows=[int(x) for x in re.findall(r'^\|\s*(\d{1,2})\s*\|',(root/'PROJECT/35_STAGE_PLAN_HE.md').read_text(),re.M)]
check('stage_plan_1_to_35',rows==list(range(1,36)))
for k,val in [('STAGE25_PUBLISH_AUDIT.json',2511),('STAGE25_CHROMIUM_SITE_SMOKE.json',12),('STAGE25_PUBLISHED_JAVASCRIPT_SYNTAX.json',123)]:
 a=load('QA/'+k);check('release_acceptance_'+k,a['total']==val and a['passed']==val)
with zipfile.ZipFile(base) as z:
 old={i.filename:sha(z.read(i.filename)) for i in z.infolist() if not i.is_dir()}
changed=set(release['modifiedBaseFilePaths'])
check('baseline_file_count',len(old)==863)
for name,expected in sorted(old.items()):
 target=root/('BACKUPS/STAGE25_OF35/'+name if name in changed else name)
 check('source_file_sha_preserved:'+name,target.is_file() and sha(target.read_bytes())==expected)
report={'stage':25,'kind':'Canonical release consistency and byte-for-byte source retention','checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks),'failures':[c['name'] for c in checks if not c['pass']],'livePublication':False,'nativeGpuFpsVerified':False}
(root/'QA/STAGE25_RELEASE_CONSISTENCY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':report['failures'][:7]}))
if report['passed']!=report['total']:raise SystemExit(1)
