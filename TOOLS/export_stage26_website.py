#!/usr/bin/env python3
"""Rebuild the Stage26 GitHub Pages website directly from the full source package.
No previous archives or temporary sandbox paths are needed.
"""
from pathlib import Path
import json,zipfile,hashlib,shutil,sys
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'PROJECT/STAGE26_SITE_MANIFEST.json').read_text('utf8'))
output=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else root/'EXPORTED_STAGE26_WEBSITE'
if output==root:raise SystemExit('Output cannot be the project root')
output.mkdir(parents=True,exist_ok=True)
for name,sha in manifest['fileSha256'].items():
 source=root/name
 if name=='README_STAGE26_BROWSER_QA_HE.md':source=root/'QA/STAGE26_MANUAL_BROWSER_CHECKLIST_HE.md'
 if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=sha:raise RuntimeError('Source missing/changed: '+name)
 dest=output/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
(output/'STAGE26_SITE_FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
archive=output.parent/'SUNSET_STATE_STAGE26_GITHUB_PAGES_REBUILT.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
 for f in sorted(output.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(output).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
print('Exported',len([f for f in output.rglob('*') if f.is_file()]),'site files to',output,'and',archive)
