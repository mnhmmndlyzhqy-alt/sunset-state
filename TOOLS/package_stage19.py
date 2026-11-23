#!/usr/bin/env python3
"""Stage 19 cumulative artifact packaging + baseline byte comparisons.
No source files omitted, no previous game systems replaced. Run from any cwd."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib,json
root=Path(__file__).resolve().parent.parent
source=Path('/mnt/data/SUNSET_STATE_STAGE18_OF35_FULL.zip')
final=Path('/mnt/data/SUNSET_STATE_STAGE19_OF35_FULL.zip')
manifest=Path('/mnt/data/SUNSET_STATE_STAGE19_DELIVERY_MANIFEST.json')
sha=lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
expected_mods={'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json',
 'README_35_STAGE_HE.md','START_GAME.html','engine44.js'}
with ZipFile(source) as f:
 old_names={x.filename for x in f.infolist() if not x.is_dir()}
 missing=[a for a in sorted(old_names) if not (root/a).is_file()]
 changed=[a for a in sorted(old_names) if not missing and f.read(a)!=(root/a).read_bytes()]
assert not missing,missing
assert set(changed)==expected_mods,(set(changed)^expected_mods)
tests=json.loads((root/'QA/STAGE19_OF35_ACCEPTANCE.json').read_text())
ui=json.loads((root/'QA/STAGE19_UI_AND_AUTOSAVE.json').read_text())
assert tests['passed']==tests['total']==95,tests
assert ui['passed']==ui['total']==17,ui
base_progress=json.loads((root/'PROJECT/35_STAGE_PROGRESS.json').read_text())
assert base_progress['currentStage']==19 and base_progress['nextStage']==20
(root/'QA/STAGE19_BASE_DIFF.json').write_text(json.dumps({
 'from':'SUNSET_STATE_STAGE18_OF35_FULL.zip','originalFileCount':len(old_names),
 'missing':missing,'byteChangedExisting':changed,'added':sorted(str(x.relative_to(root)) for x in root.rglob('*') if x.is_file() and str(x.relative_to(root)) not in old_names)
},ensure_ascii=False,indent=2)+'\n')
files=sorted(x for x in root.rglob('*') if x.is_file())
if final.exists():final.unlink()
with ZipFile(final,'w',ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
 for x in files:z.write(x,str(x.relative_to(root)))
with ZipFile(final) as z:
 corrupt=z.testzip();names=[i.filename for i in z.infolist() if not i.is_dir()]
assert corrupt is None,corrupt
assert len(names)==len(files)==len(set(names))
assert old_names.issubset(set(names))
assert 'START_GAME.html' in names and 'assets/stage19_persistent_save.js' in names
# Verify original untouched baseline files byte-for-byte even after ZIP serialization.
with ZipFile(source) as old, ZipFile(final) as new:
 for name in old_names-expected_mods:
  assert old.read(name)==new.read(name),name
out={
 'project':'SUNSET STATE','stage':19,'archive':final.name,
 'zipSizeBytes':final.stat().st_size,'zipFileCount':len(names),
 'zipSha256':sha(final),'zipSelfTest':'passed',
 'baseZipSha256':sha(source),'baseFilesRetained':len(old_names),
 'modifiedOriginalFiles':changed,'newFiles':len(names)-len(old_names),
 'newFileList':sorted(set(names)-old_names),
 'stage19Acceptance':'95/95','stage19AutosaveAndUi':'17/17','stage18LodRegression':'36/36',
 'stage17FullRegression':'timeout; not counted as passed',
 'realBrowserAndGPUVerified':False,'native1080p50FPSVerified':False,
 'caveats':['Dynamic traffic/police/projectiles re-created on load',
 'Transit restores on-foot instead of seated',
 'Active races do not resume mid-course',
 'localStorage is origin-specific; JSON export is portable']}
manifest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['zipSizeBytes','zipFileCount','zipSha256','baseFilesRetained','newFiles','stage19Acceptance','stage19AutosaveAndUi']},ensure_ascii=False,indent=2))
