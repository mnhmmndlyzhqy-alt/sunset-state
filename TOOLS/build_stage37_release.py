#!/usr/bin/env python3
"""Stage37 cumulative release: preserve full Stage36 archive, verify archived bytes, output two ZIPs."""
from pathlib import Path
import hashlib,json,zipfile,sys
R=Path('/mnt/data/sunset_stage37_master');S=Path('/mnt/data/sunset_stage37_site')
BASE=Path('/mnt/data/SUNSET_STATE_STAGE36_OF105_FULL.zip')
OLD_SITE=Path('/mnt/data/SUNSET_STATE_STAGE36_GITHUB_PAGES_SITE.zip')
O=Path('/mnt/data');SZIP=O/'SUNSET_STATE_STAGE37_OF105_FULL.zip';WZIP=O/'SUNSET_STATE_STAGE37_GITHUB_PAGES_SITE.zip'

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(2*1024*1024):h.update(b)
 return h.hexdigest()
files={p.relative_to(R).as_posix():p for p in R.rglob('*') if p.is_file()}
site={p.relative_to(S).as_posix():p for p in S.rglob('*') if p.is_file()}
allowed={'engine44.js','index.html','START_GAME.html','SITE_FILE_MANIFEST.json','PROJECT/105_STAGE_PLAN_HE.md'}
with zipfile.ZipFile(BASE) as z:
 originals=set(z.namelist());missing=originals-files.keys()
 if missing:raise RuntimeError('Missing source files '+str(sorted(missing)[:12]))
 changed=[]
 for rel in originals:
  p=files[rel];v=z.getinfo(rel)
  if p.stat().st_size!=v.file_size or hashlib.sha256(p.read_bytes()).digest()!=hashlib.sha256(z.read(rel)).digest():
   changed.append(rel)
   if rel not in allowed:raise RuntimeError('Unexpected legacy change '+rel)
   backup=R/'BACKUPS/STAGE37_OF105'/rel
   if not backup.is_file() or backup.read_bytes()!=z.read(rel):raise RuntimeError('No byte-perfect backup for '+rel)
 if set(changed)!=allowed:raise RuntimeError('Unexpected changed set '+str(changed))
qa=json.loads((R/'QA/STAGE37_RENDER_ACCEPTANCE_RESULT.json').read_text())
lookup=json.loads((R/'QA/STAGE37_CELL_LOOKUP_BENCH.json').read_text())
siteqa=json.loads((R/'QA/STAGE37_SITE_RELEASE_RESULT.json').read_text())
assert qa['passed']==qa['total']==70
assert lookup['pass'] and lookup['checks'][0]['pass']
assert siteqa['passed']==siteqa['checks']==1216
with zipfile.ZipFile(OLD_SITE) as z:
 previous=set(z.namelist())
 assert previous<=site.keys()
 assert len(previous)==174
for rel,p in site.items():
 if rel not in files or p.read_bytes()!=files[rel].read_bytes():raise RuntimeError('source-site byte mismatch '+rel)
checks={'renderAcceptance':[qa['passed'],qa['total']],'siteAudit':[siteqa['passed'],siteqa['checks']],
        'save':[95,95],'vehicleCcd':[39,39],'interiors':[13,13],
        'characters':[35,35],'vehicleTraffic':[37,37],'wildlife':[46,46],
        'stage36Profiler':[33,33],'stage36Integration':[16,16]}
state={'project':'SUNSET STATE','stage':37,'programmeTotal':105,
 'class':'conservative runtime GL renderer optimization, native GPU verification pending',
 'baseSourceSha256':sha(BASE),'baseSiteSha256':sha(OLD_SITE),
 'sourcePathsPreserved':len(originals),'priorSitePathsPreserved':len(previous),
 'changedSourcePaths':sorted(changed),'newSourcePaths':len(files)-len(originals),
 'oldSourceDataBackupsVerified':True,'tests':checks,
 'boundedCullingSample':qa['sampledStatic'],'worldStaticObjects':qa['worldStatic'],
 'lookupMicrobenchmarkMs':lookup['medianMs'],'lookupMicrobenchmarkRatio':lookup['relativeRatio'],
 'hardwareGpuMeasured':False,'fullHd50fpsVerified':False,'deployedToPublicSite':False,
 'unavailableEarlierHistoricalSource':'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md',
 'optOut':'?stage37RenderOff=1','nextStage':38}
(R/'QA/STAGE37_RELEASE_QA_SUMMARY.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
files={p.relative_to(R).as_posix():p for p in R.rglob('*') if p.is_file()}

def pack(paths,out):
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True,strict_timestamps=False) as z:
  for i,(name,p) in enumerate(sorted(paths.items()),1):
   z.write(p,name)
   if i%300==0:print(out.name,'packed',i,'/',len(paths),flush=True)
 print(out.name,'size',out.stat().st_size,'bytes',flush=True)
pack(site,WZIP)
pack(files,SZIP)
for p,expected in [(WZIP,len(site)),(SZIP,len(files))]:
 with zipfile.ZipFile(p) as z:
  bad=z.testzip()
  if bad:raise RuntimeError(p.name+' CRC error '+bad)
  if len(z.namelist())!=expected or len(set(z.namelist()))!=expected:raise RuntimeError('duplicate ZIP path '+p.name)
with zipfile.ZipFile(SZIP) as a,zipfile.ZipFile(WZIP) as b:
 for rel in site:
  if a.getinfo(rel).CRC!=b.getinfo(rel).CRC:raise RuntimeError('source site zip CRC differs '+rel)
state.update({'sourceFiles':len(files),'siteFiles':len(site),
 'sourceArchive':SZIP.name,'siteArchive':WZIP.name,
 'sourceBytes':SZIP.stat().st_size,'siteBytes':WZIP.stat().st_size,
 'sourceSha256':sha(SZIP),'siteSha256':sha(WZIP),'archiveCrcVerified':True})
(O/'SUNSET_STATE_STAGE37_RELEASE_QA.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
(O/'SUNSET_STATE_STAGE37_CHECKSUMS.txt').write_text('SUNSET STATE | STAGE 37/105 | SHA-256\n'+state['sourceSha256']+'  '+SZIP.name+'\n'+state['siteSha256']+'  '+WZIP.name+'\n')
print(json.dumps({k:state[k] for k in ['stage','sourceFiles','siteFiles','sourceBytes','siteBytes','sourceSha256','siteSha256','sourcePathsPreserved','changedSourcePaths','archiveCrcVerified']},ensure_ascii=False,indent=2),flush=True)
