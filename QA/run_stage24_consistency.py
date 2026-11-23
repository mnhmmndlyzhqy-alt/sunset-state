#!/usr/bin/env python3
"""SUNSET STATE Stage24: reproducible read-only release integrity checks.

Usage: python QA/run_stage24_consistency.py [--zip /path/archive.zip] [--write-result]
Historical result files remain untouched. --write-result is for unpacked checkout only.
"""
import argparse,hashlib,json,pathlib,re,sys,zipfile
from collections import Counter

class Folder:
 def __init__(self,root):self.root=root
 def names(self):return {p.relative_to(self.root).as_posix() for p in self.root.rglob('*') if p.is_file()}
 def bytes(self,p):return (self.root/p).read_bytes()
 def close(self):pass
class ZipFolder:
 def __init__(self,path):self.z=zipfile.ZipFile(path)
 def names(self):return {p.filename for p in self.z.infolist() if not p.is_dir()}
 def bytes(self,p):return self.z.read(p)
 def close(self):self.z.close()

def digest(b):return hashlib.sha256(b).hexdigest()
def check_project(reader):
 names=reader.names(); checked=0; failures=[]; groups=Counter()
 def chk(cond,code,category='integrity'):
  nonlocal checked
  checked+=1;groups[category]+=1
  if not cond:failures.append(code)
 def loadj(path):
  try:return json.loads(reader.bytes(path))
  except Exception as exc:failures.append('JSON '+path+' '+str(exc));return {}
 def txt(path):
  try:return reader.bytes(path).decode('utf-8')
  except Exception as exc:failures.append('UTF8 '+path+' '+str(exc));return ''

 baseline=loadj('PROJECT/STAGE24_SOURCE_INVENTORY.json')
 originals=baseline.get('sha256ByRelativePath',{})
 current=loadj('PROJECT/STAGE24_CURRENT_STATUS.json')
 progress=loadj('PROJECT/35_STAGE_PROGRESS.json')
 ledger=loadj('PROJECT/STAGE24_EVIDENCE_LEDGER.json')
 registry=loadj('PROJECT/STAGE24_PROGRESS_SOURCE_REGISTRY.json')
 delta=loadj('PROJECT/STAGE24_RECONCILIATION_DELTA.json')
 release=loadj('PROJECT/STAGE24_RELEASE_MANIFEST.json')
 bugs=loadj('QA/STAGE01_15_BUG_REGISTER.json')
 affected=set(baseline.get('plannedModifiedOriginalFiles',[]))

 chk(len(originals)==843,'Original 843 files registered','baseline')
 chk(set(originals).issubset(names),'Some prior archive paths missing','baseline')
 chk(len(affected)==5,'Unexpected number of edited legacy files','baseline')
 for path,digest0 in originals.items():
  chk(path in names,'Missing '+path,'files')
  if path not in names:continue
  # For edited files compare source original to byte-exact protected backup; otherwise current file.
  checkpath=('BACKUPS/STAGE24_OF35/'+path) if path in affected else path
  chk(checkpath in names,'Missing baseline backup '+checkpath,'sha256')
  if checkpath in names:chk(digest(reader.bytes(checkpath))==digest0,'Baseline source SHA mismatch '+checkpath,'sha256')

 chk(current.get('currentStage')==24 and current.get('nextStage')==25,'Canonical current/next stage','progress')
 chk(progress.get('currentStage')==24 and progress.get('nextStage')==25,'Legacy active stage mismatch','progress')
 chk(progress.get('sourceOfTruth')=='PROJECT/STAGE24_CURRENT_STATUS.json','Active canonical pointer','progress')
 chk(progress.get('completedStages')==list(range(1,25)),'Completed stage list wrong','progress')
 chk(progress.get('completedTechnicalStages')==list(range(1,25)),'Technical stage list wrong','progress')
 chk(current.get('completedStages')==list(range(1,25)),'Canonical completed list wrong','progress')
 chk(current.get('remainingStages')==list(range(25,36)),'Remaining stage list wrong','progress')
 chk(current.get('stageCount')==progress.get('stageCount')==35,'Total 35 stages inconsistent','progress')
 chk(progress.get('latestStageArtifact')=='SUNSET_STATE_STAGE24_OF35_FULL.zip','Latest archive pointer','progress')
 chk(current.get('currentBuild',{}).get('archive')==progress.get('latestStageArtifact'),'Canonical archive pointer','progress')
 chk(progress.get('issuesRemainingForStages')==2,'Original pending issue count incorrect','issues')
 chk(progress.get('issuesResolvedOrAuditedWithCpuQA')==23,'Original addressed issue count incorrect','issues')
 chk(progress.get('issuesSourceFixedAndCpuChecked')==18,'Source changes count incorrect','issues')
 stages=[q.get('stage') for q in progress.get('issues',[])]
 chk(stages==list(range(2,27)),'Original issue sequence mismatch','issues')
 chk(bugs.get('total')==25 and len(bugs.get('findings',[]))==25,'Original issue register total mismatch','issues')
 chk({q.get('issueId') for q in progress.get('issues',[])}=={q.get('id') for q in bugs.get('findings',[])},'Original issue IDs mismatch','issues')
 chk(len([q for q in progress.get('issues',[]) if q.get('status')!='pending'])==23,'Addressed issues and status disagree','issues')
 chk([q.get('stage') for q in progress.get('issues',[]) if q.get('status')=='pending']==[25,26],'Pending original issues unexpected','issues')
 chk(current.get('originalFindings',{}).get('pendingIds')==['S01-PU-01','S01-QA-01'],'Pending issue IDs incorrect','issues')
 fixed=progress.get('issueCounterDefinitions',{}).get('sourceFixedAndCpuCheckedStageIds',[])
 chk(fixed==[2,3,4,5,6,7,8,10,11,12,13,14,15,16,18,19,20,21],'Source fixed stage definition incorrect','issues')
 chk(len(fixed)==progress.get('issuesSourceFixedAndCpuChecked'),'Source fix definition count mismatch','issues')
 chk(len(ledger.get('issues',[]))==25,'Evidence rows != 25','evidence')
 for rec in ledger.get('issues',[]):
  s=rec.get('stage');path=rec.get('technicalReport')
  if s<=24:
   chk(path in names,f'No report for Stage{s}: {path}','evidence')
   for f in rec.get('priorRecordedEvidence',[]):chk(f in names,f'No recorded evidence {f}','evidence')
  chk(rec.get('hardwareGpuVerified') is False,'GPU evidence falsely certified for stage '+str(s),'evidence')
 chk(delta.get('sourceArchiveSha256')==baseline.get('sourceArchiveSHA256'),'Prior archive lineage SHA mismatch','lineage')
 chk(current.get('baseline',{}).get('sha256')==baseline.get('sourceArchiveSHA256'),'Current baseline archive SHA mismatch','lineage')
 chk(current.get('baseline',{}).get('files')==len(originals),'Baseline count wrong','lineage')
 chk(digest(reader.bytes('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'))==current.get('baseline',{}).get('referenceSha256'),'Reference map changed','source')
 chk('README_35_STAGE_HE.md' in names,'Missing root README','docs')
 chk(reader.bytes('PROJECT/README_35_STAGE_HISTORY_UP_TO23_HE.md')==reader.bytes('BACKUPS/STAGE24_OF35/README_35_STAGE_HE.md'),'README history not original byte content','docs')
 for path in ('PROJECT/15_STAGE_POLISH_PROGRESS.json','PROJECT/CITY20_PROGRESS.json'):
  chk(digest(reader.bytes(path))==originals.get(path),'Historical programme record altered: '+path,'legacy')
 chk(registry.get('activeProgrammeId')=='active35','Registry active programme mismatch','legacy')
 chk(len([q for q in registry.get('programmes',[]) if q.get('currentRelease')])==1,'Registry must have one active programme','legacy')
 for q in registry.get('programmes',[]):chk(q.get('path') in names,'Legacy registry references missing '+str(q.get('path')),'legacy')

 plan=txt('PROJECT/35_STAGE_PLAN_HE.md')
 rows=[int(x) for x in re.findall(r'^\|\s*(\d{1,2})\s*\|',plan,re.M)]
 chk(rows==list(range(1,36)),'Plan must contain exactly stages 1..35','docs')
 chk('24/35' in plan and '23/25' in plan,'Current progress missing from plan','docs')
 chk('24/35' in txt('README_35_STAGE_HE.md'),'Root README latest status missing','docs')
 chk('Stage 24/35' in txt('README_FIRST_HE.md'),'Opening README not marked current','docs')
 chk('ARCHIVAL CITY20' in txt('README_CITY20_HE.md'),'Legacy CITY20 doc not marked archival','docs')
 chk('24' in txt('PROJECT/STAGE24_OF35_REPORT_HE.md') and '35' in txt('PROJECT/STAGE24_OF35_REPORT_HE.md'),'Current stage report missing','docs')
 chk(current.get('qualityGates',{}).get('nativeGpu1920x1080AtLeast50FpsPassed') is False,'False 50 FPS certification','quality')
 chk(current.get('qualityGates',{}).get('nativeHardwareGpuMeasured') is False,'False hardware-GPU certification','quality')
 chk(current.get('qualityGates',{}).get('stage25PublicationCompleted') is False,'False publication certification','quality')
 chk(current.get('qualityGates',{}).get('stage26HistoricalBugClosureCompleted') is False,'False historical closure certification','quality')
 chk(current.get('qualityGates',{}).get('fullAAAQualityCertified') is False,'False AAA claim','quality')
 chk(progress.get('stage24Metrics',{}).get('gpuHardwareAcceptanceVerified') is False,'False progress GPU claim','quality')
 chk(current.get('currentBuild',{}).get('livePublishedUrl') is None,'Unverified live published URL','quality')

 game=txt('START_GAME.html')
 scripts=re.findall(r'<script[^>]*src=[\"\']([^\"\']+)',game,re.I)
 chk(len(scripts)==82,'Linked JavaScript count must remain 82','assets')
 chk(current.get('currentBuild',{}).get('jsScriptsLoaded')==len(scripts),'Recorded linked JavaScript count differs','assets')
 for path in scripts:chk(path.split('?')[0] in names,'Missing linked JavaScript '+path,'assets')
 chk('engine44.js' in scripts,'Original game engine entry missing','assets')
 chk('assets/stage23_geometry_draw_profiler.js' in scripts,'Stage23 profiler disappeared','assets')
 chk('assets/stage22_native1080_benchmark.js' in scripts,'Stage22 benchmark disappeared','assets')
 chk('assets/stage19_persistent_save.js' in scripts,'Stage19 persistence disappeared','assets')
 chk('assets/stage20_pedestrian_navigation.js' in scripts,'Stage20 navigation disappeared','assets')
 chk('assets/stage21_high_speed_ccd.js' in scripts,'Stage21 guard disappeared','assets')

 # This stage is docs-only: ALL original game source/asset bytes must be identical.
 source_paths=[p for p in originals if p=='engine44.js' or p=='START_GAME.html' or p.startswith('assets/')]
 for path in source_paths:chk(digest(reader.bytes(path))==originals[path],'Game source/asset unexpectedly edited '+path,'source')
 chk(release.get('stage')==24 and release.get('baseFileCount')==843,'Release manifest stage or baseline count wrong','release')
 chk(release.get('baseArchiveSha256')==baseline.get('sourceArchiveSHA256'),'Release base SHA mismatch','release')
 chk(release.get('modifiedBaseFilePaths')==sorted(affected),'Release edited path listing mismatch','release')
 new=sorted(names-set(originals))
 chk(release.get('newFilePaths')==new,'Release new path listing mismatch','release')
 chk(release.get('finalArchiveFileCount')==len(names),'Release file count mismatch','release')
 chk(release.get('unmodifiedOriginalPathCount')==843-5,'Unmodified originals count wrong','release')
 chk('QA/STAGE24_CONSISTENCY_RESULT.json' in names,'QA result missing from package','release')
 chk('QA/run_stage24_consistency.py' in names,'QA rerun script missing from package','release')
 chk(len(names)==release.get('finalArchiveFileCount'),'Archive/file-system file count wrong','release')
 return {'stage':24,'result':'PASS' if not failures else 'FAIL','checked':checked,'passed':checked-len(failures),
  'failed':len(failures),'failures':failures,'checksByCategory':dict(sorted(groups.items())),
  'baseOriginalFiles':len(originals),'sourceAssetsValidated':len(source_paths),
  'linkedScripts':len(scripts),'currentFiles':len(names),'hardwareGpuFpsCertified':False,
  'note':'Files and documentation checked; this is not a GPU/rendering benchmark.'}

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--zip',dest='zip',default='')
 parser.add_argument('--write-result',action='store_true')
 args=parser.parse_args()
 if args.zip and args.write_result:raise SystemExit('Cannot write a QA result into a sealed ZIP')
 root=pathlib.Path(__file__).resolve().parent.parent
 reader=ZipFolder(args.zip) if args.zip else Folder(root)
 try:
  out=check_project(reader)
  if args.zip:
   assert reader.z.testzip() is None,'ZIP CRC failed'
   out['zipCrcAllEntriesValid']=True
  if args.write_result:
   (root/'QA/STAGE24_CONSISTENCY_RESULT.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  print(json.dumps(out,ensure_ascii=False,indent=2))
  sys.exit(0 if out['failed']==0 else 1)
 finally:reader.close()
