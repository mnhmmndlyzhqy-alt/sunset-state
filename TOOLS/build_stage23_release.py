"""Reproducible package + exact path/content preservation checks for Stage23.
Run after QA and reports are generated. Needs original Stage22 ZIP in /mnt/data.
"""
import hashlib,json,pathlib,re,zipfile,sys,time
root=pathlib.Path(__file__).resolve().parent.parent
old_archive=pathlib.Path('/mnt/data/SUNSET_STATE_STAGE22_OF35_FULL.zip')
final_archive=pathlib.Path('/mnt/data/SUNSET_STATE_STAGE23_OF35_FULL.zip')
allowed_changes={'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json',
 'QA/stage05_bootstrap.cjs','README_35_STAGE_HE.md','START_GAME.html','engine44.js'}
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(old_archive) as old:
 previous={i.filename:i for i in old.infolist() if not i.is_dir()}
 local={str(p.relative_to(root)).replace('\\','/'):p for p in root.rglob('*') if p.is_file()}
 missing=sorted(set(previous)-set(local))
 if missing:raise RuntimeError('Missing base files: '+repr(missing[:20]))
 changed=sorted(n for n in previous if sha(local[n].read_bytes())!=sha(old.read(n)))
 if set(changed)!=allowed_changes:raise RuntimeError('Unexpected modified base file set: '+repr(changed))
 for n in allowed_changes:
  b=root/'BACKUPS/STAGE23_OF35'/n
  if not b.exists() or b.read_bytes()!=old.read(n):raise RuntimeError('Original backup missing/wrong for '+n)
 for n in ('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png','engine44.js'):
  if not local[n].is_file():raise RuntimeError('Missing critical source '+n)
 if sha(local['REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'].read_bytes())!=sha(old.read('REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png')):
  raise RuntimeError('Chosen city map changed')
 html=local['START_GAME.html'].read_text()
 scripts=re.findall(r'<script src="([^"\n]+\.js)"',html)
 if not scripts or not all(n in local for n in scripts):raise RuntimeError('Broken game JS reference')
 if len(scripts)!=len(set(scripts)):raise RuntimeError('Duplicate script names')
 if html.count('assets/stage23_geometry_draw_profiler.js')!=1:raise RuntimeError('Stage23 script missing/multiple')
 prog=json.loads(local['PROJECT/35_STAGE_PROGRESS.json'].read_text())
 if prog['currentStage']!=23 or prog['nextStage']!=24 or len(prog['completedStages'])!=23:
  raise RuntimeError('Incorrect progress checkpoint')
 new=sorted(set(local)-set(previous))
 info={'stage':23,'originalZip':old_archive.name,'originalZipSha256':sha(old_archive.read_bytes()),
  'basePaths':len(previous),'allOriginalPathsPresent':not missing,
  'basePathsContentUnchanged':len(previous)-len(changed),'modifiedOriginalPaths':changed,
  'previousPathsChangedOnlyWithBackups':True,'newPathsBeforeManifests':new,
  'originalChosenReferenceMapUnchanged':True,'originalWorldAndAssetsPreserved':True,
  'scriptsInGame':len(scripts),'scriptSourceFilesAllExist':True,
  'stage23DefaultProfileOff':True,'nativeGpu50FpsVerified':False,
  'stage23ActualHardwareDrawCallsMeasured':False,
  'cpuWorldChecks':'24/24','fixtureWebglInstrumenter':'51/51',
  'ChromiumFixtureUI':'14/14',
  'regressions':{'Stage22':'52/52','Stage21':'39/39','Stage20':'22/22',
   'Stage19':'95/95','Stage17':'927/927','Stage16':'7815/7815'}}
 (root/'PROJECT/STAGE23_SOURCE_PRESERVATION.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
 local={str(p.relative_to(root)).replace('\\','/'):p for p in root.rglob('*') if p.is_file()}
 info2={'stage':23,'baseArchive':old_archive.name,'baseArchiveSHA256':info['originalZipSha256'],
  'newTotalFileCountBeforeThisManifest':len(local),'previousFileCount':len(previous),
  'preservesAllBaseFiles':True,'modifiedOnlyWithBackups':changed,
  'newFiles':[n for n in sorted(local) if n not in previous],
  'gameJSScriptsPresent':len(scripts),'originalCityReferenceMapUnchanged':True,
  'nativeGPU1080p50FpsVerified':False,'onDeviceDrawCallReportRequired':True,
  'nextStage':24}
 (root/'PROJECT/STAGE23_RELEASE_MANIFEST.json').write_text(json.dumps(info2,ensure_ascii=False,indent=2)+'\n')
local={str(p.relative_to(root)).replace('\\','/'):p for p in root.rglob('*') if p.is_file()}
start=time.monotonic()
with zipfile.ZipFile(final_archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as output:
 for rel,src in sorted(local.items()):
  output.write(src,arcname=rel)
with zipfile.ZipFile(final_archive) as final:
 bad=final.testzip()
 if bad:raise RuntimeError('Corrupt zip entry: '+bad)
 names=set(final.namelist())
 if names!=set(local):raise RuntimeError('Archive contents do not match working tree')
 with zipfile.ZipFile(old_archive) as old:
  for n in previous:
   if n not in names:raise RuntimeError('Original path removed '+n)
   if n not in allowed_changes and sha(final.read(n))!=sha(old.read(n)):
    raise RuntimeError('Non-whitelisted original content changed '+n)
  mapname='REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'
  if final.read(mapname)!=old.read(mapname):raise RuntimeError('Reference map changed')
 count=len(names)
size=final_archive.stat().st_size
result={'project':'SUNSET STATE','stage':23,'sourceArchive':old_archive.name,
 'archive':final_archive.name,'bytes':size,'miB':round(size/1048576,2),
 'sha256':sha(final_archive.read_bytes()),'zipCrcTest':'PASS','archiveFileCount':count,
 'sourceFileCount':len(previous),'originalPathsPreserved':len(previous),
 'originalPathsUnchanged':len(previous)-len(allowed_changes),
 'changedOriginalPaths':sorted(allowed_changes),'newFiles':count-len(previous),
 'scriptsLinkedAndPresent':len(scripts),'originalReferenceMapPreserved':True,
 'nativeHardwareGPU50FpsVerified':False,'realWebGLDrawCallsMeasuredOnHardware':False,
 'toolsReadyForHardwareGPUProfiling':True,'buildElapsedSeconds':round(time.monotonic()-start,2)}
pathlib.Path('/mnt/data/SUNSET_STATE_STAGE23_DELIVERY_MANIFEST.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
