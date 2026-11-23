#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
S=Path('/mnt/data/sunset_stage37_site');R=Path('/mnt/data/sunset_stage37_master')
files=sorted(p for p in S.rglob('*') if p.is_file())
checks={p.relative_to(S).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.name!='SITE_FILE_MANIFEST.json'}
manifest={'project':'SUNSET STATE','programmeStage':37,'programmeTotal':105,
 'kind':'runnable cumulative browser site with conservative rendering optimization',
 'authoritativeRuntimeBase':'SUNSET_STATE_STAGE36_GITHUB_PAGES_SITE.zip',
 'sourceBaseline':'SUNSET_STATE_STAGE36_OF105_FULL.zip',
 'publicDeploymentPerformed':False,'nativeHardwareGpuVerified':False,'native1080p50fpsVerified':False,
 'actualBrowserBenchmarksCompleted':False,'filesCount':len(files),'filesSha256':checks,
 'optOut':'?stage37RenderOff=1','profile':'?stage36qa=1',
 'abGuide':'STAGE37_AB_BENCHMARK.html',
 'note':'Hashes exclude this manifest to avoid self reference. GPU 50FPS not certified.'}
(S/'SITE_FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'SITE_FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'PROJECT/STAGE37_SITE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('manifest',len(checks),'site files including manifest',len(files))
