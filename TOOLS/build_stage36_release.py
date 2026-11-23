#!/usr/bin/env python3
"""Stage36 repeatable packaging from verified baseline runtime site + source reconstruction.

No network, no deployment; verifies all 169 Stage35 website files and all 1085
Stage32 source paths remain present. Explicitly NOT a claim that unavailable
Stage33-35 source-only files have been recovered.
"""
from pathlib import Path
import hashlib,json,zipfile,sys,time
R=Path('/mnt/data/sunset_stage36_master')
SITE=Path('/mnt/data/sunset_stage36_site')
B35=Path('/mnt/data/SUNSET_STATE_STAGE35_GITHUB_PAGES_SITE.zip')
B32=Path('/mnt/data/SUNSET_STATE_STAGE32_OF35_FULL.zip')
OUTPUT=Path('/mnt/data')
SZIP=OUTPUT/'SUNSET_STATE_STAGE36_OF105_FULL.zip'
WZIP=OUTPUT/'SUNSET_STATE_STAGE36_GITHUB_PAGES_SITE.zip'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while c:=f.read(2*1024*1024):h.update(c)
 return h.hexdigest()
rootfiles={p.relative_to(R).as_posix() for p in R.rglob('*') if p.is_file()}
sitefiles={p.relative_to(SITE).as_posix() for p in SITE.rglob('*') if p.is_file()}
with zipfile.ZipFile(B32) as z:
 baseline32=set(z.namelist())
 missing32=baseline32-rootfiles
 if missing32:raise RuntimeError('Missing historical source files: '+repr(sorted(missing32)[:10]))
with zipfile.ZipFile(B35) as z:
 baseline35=set(z.namelist())
 missing35=baseline35-sitefiles
 if missing35:raise RuntimeError('Missing Stage35 runtime files: '+repr(sorted(missing35)[:10]))
 allowed={'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json'}
 changed35=sorted(n for n in baseline35 if (SITE/n).read_bytes()!=z.read(n))
 if set(changed35)!=allowed:raise RuntimeError('Unexpected Stage35 site modifications: '+repr(changed35))
for rel in sitefiles:
 p=R/rel
 if not p.is_file() or p.read_bytes()!=(SITE/rel).read_bytes():raise RuntimeError('source-site mismatch: '+rel)
qapaths=['QA/STAGE36_PROFILER_ACCEPTANCE_RESULT.json','QA/STAGE36_CUMULATIVE_INTEGRATION_RESULT.json',
 'QA/STAGE36_BOUNDED_CPU_PROFILE.json','QA/STAGE36_SITE_RELEASE_RESULT.json']
qa=[json.loads((R/p).read_text()) for p in qapaths]
assert qa[0]['passed']==qa[0]['total']==33
assert qa[1]['passed']==qa[1]['total']==16
assert qa[3]['passed']==qa[3]['checks']==1357
assert qa[3]['siteFiles']==len(sitefiles)
status={'project':'SUNSET STATE','stage':36,'programmeTotal':105,
 'releaseClass':'new opt-in performance audit; no real hardware FPS/GPU certification',
 'sourceArchiveName':SZIP.name,'websiteArchiveName':WZIP.name,
 'stage35SiteBaselineHash':sha(B35),'stage32SourceBaselineHash':sha(B32),
 'stage35RuntimeFilesPreserved':len(baseline35),'stage35RuntimeFilesModified':changed35,
 'stage32HistoricalSourcePathsPreserved':len(baseline32),'unavailableFullSource35Archive':True,
 'sourceReconstruction':'Stage32 full source plus verified Stage35 runnable site plus available Stage35 documents',
 'tests':{'optInUnit':[33,33],'cumulativeIntegration':[16,16],
    'save':[95,95],'collision':[39,39],'interiors':[13,13],'characters':[35,35],
    'vehicles':[37,37],'wildlife':[46,46],'siteAudit':[1357,1357]},
 'sampledStaticObjects':qa[2]['world']['sampledStaticObjects'],
 'sampledCameraProbes':len(qa[2]['cameraProbeScenarios']),
 'realGpuTimingMeasured':False,'native1920x1080Fps50Verified':False,
 'publicDeploymentPerformed':False,'nextStage':37}
(R/'QA/STAGE36_RELEASE_QA_SUMMARY.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
def build_zip(directory,out):
 files=sorted([p for p in directory.rglob('*') if p.is_file()],key=lambda p:p.relative_to(directory).as_posix())
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True,strict_timestamps=False) as z:
  for i,p in enumerate(files,1):
   z.write(p,p.relative_to(directory).as_posix())
   if i%250==0:print(out.name, 'files',i,'/',len(files),flush=True)
 return len(files)
sitecount=build_zip(SITE,WZIP)
sourcecount=build_zip(R,SZIP)
# verify CRC/zip names, and every source/site shared file CRC equality
for path,count in [(WZIP,sitecount),(SZIP,sourcecount)]:
 with zipfile.ZipFile(path) as z:
  if z.testzip() is not None:raise RuntimeError('CRC failure '+str(path))
  names=z.namelist()
  if len(names)!=count or len(set(names))!=count:raise RuntimeError('Archive path mismatch '+str(path))
with zipfile.ZipFile(SZIP) as zsrc,zipfile.ZipFile(WZIP) as zsite:
 for rel in sitefiles:
  if zsrc.getinfo(rel).CRC!=zsite.getinfo(rel).CRC:raise RuntimeError('Stored source-site CRC mismatch '+rel)
checksum=OUTPUT/'SUNSET_STATE_STAGE36_CHECKSUMS.txt'
checksum.write_text('SUNSET STATE — Stage 36/105 | SHA-256\n'+sha(SZIP)+'  '+SZIP.name+'\n'+sha(WZIP)+'  '+WZIP.name+'\n')
status.update({'sourceFiles':sourcecount,'siteFiles':sitecount,'sourceBytes':SZIP.stat().st_size,
 'siteBytes':WZIP.stat().st_size,'sourceSha256':sha(SZIP),'siteSha256':sha(WZIP),
 'archiveCRCVerified':True,'sourceSiteCRCParityVerified':True})
(OUTPUT/'SUNSET_STATE_STAGE36_RELEASE_QA.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'stage':36,'sourceFiles':sourcecount,'sourceBytes':SZIP.stat().st_size,
 'siteFiles':sitecount,'siteBytes':WZIP.stat().st_size,'sourceSha256':status['sourceSha256'],
 'websiteSha256':status['siteSha256']},indent=2),flush=True)
