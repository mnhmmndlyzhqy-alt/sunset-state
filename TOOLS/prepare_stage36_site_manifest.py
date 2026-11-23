#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
site=Path('/mnt/data/sunset_stage36_site')
paths=sorted(p for p in site.rglob('*') if p.is_file())
checks={str(p.relative_to(site)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.name!='SITE_FILE_MANIFEST.json'}
manifest={'project':'SUNSET STATE','programmeStage':36,'programmeTotal':105,
  'kind':'deployable static website with optional CPU/GPU profiler',
  'authoritativeRuntimeBase':'SUNSET_STATE_STAGE35_GITHUB_PAGES_SITE.zip',
  'publicDeploymentPerformed':False,'nativeHardwareGpuVerified':False,'native1080p50fpsVerified':False,
  'actualBrowserBenchmarksCompleted':False,'filesCount':len(paths),'filesSha256':checks,
  'optionalPerfTool':'index.html?stage36qa=1','profilerIntro':'STAGE36_BENCHMARK_GUIDE.html',
  'defaultGameProfilerLoopOverhead':False,
  'latestCpuReport':'README_STAGE36_CPU_RESULTS_HE.md',
  'note':'Hash list excludes manifest itself to avoid self-reference; all other website files included.'}
(site/'SITE_FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
source=Path('/mnt/data/sunset_stage36_master')
(source/'PROJECT/STAGE36_SITE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('manifest entries:',len(checks),'site files including manifest:',len(paths))
