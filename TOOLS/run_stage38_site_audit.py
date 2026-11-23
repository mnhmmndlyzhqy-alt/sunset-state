#!/usr/bin/env python3
"""Stage 38: preserve baseline, build static manifest, and audit packaged website."""
from __future__ import annotations
from pathlib import Path
from collections import Counter
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from concurrent.futures import ThreadPoolExecutor
from threading import Thread
from urllib.request import urlopen
import hashlib, json, os, shutil, subprocess, time

BASE = Path('/mnt/data/sunset_stage37_master')
R = Path('/mnt/data/sunset_stage38_master')
BASE_SITE = Path('/mnt/data/sunset_stage37_site')
SITE = Path('/mnt/data/sunset_stage38_site')
PREV_CHANGED = {'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json','PROJECT/105_STAGE_PLAN_HE.md'}
WEB_CHANGED = {'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json'}
WEB_ADDED = {'README_STAGE38_HE.md','README_STAGE38_GITHUB_PAGES_HE.md','STAGE38_LOD_AB_GUIDE.html','assets/stage38_adaptive_lod.js'}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = lambda root: {p.relative_to(root).as_posix():p for p in root.rglob('*') if p.is_file()}

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(); self.src=[]
    def handle_starttag(self,tag,attrs):
        if tag=='script':
            d=dict(attrs)
            if 'src' in d:self.src.append(d['src'])

# Restore only old generated test result that was overwritten by rerunning Stage37 tests.
restored=[]
for rel,p in files(BASE).items():
    q=R/rel
    if not q.is_file():raise AssertionError(f'baseline source missing: {rel}')
    if rel not in PREV_CHANGED and sha(p)!=sha(q):
        if not rel.startswith('QA/') or not rel.endswith('_RESULT.json'):
            raise AssertionError(f'unexpected runtime/source delta: {rel}')
        shutil.copy2(p,q);restored.append(rel)
assert restored == ['QA/STAGE37_RENDER_ACCEPTANCE_RESULT.json'], restored

bdir=R/'BACKUPS/STAGE38_OF105'; bdir.mkdir(parents=True,exist_ok=True)
for rel in PREV_CHANGED:
    p=BASE/rel; b=bdir/rel; b.parent.mkdir(parents=True,exist_ok=True)
    if not b.exists():shutil.copy2(p,b)
    assert sha(b)==sha(p),f'backup mismatch {rel}'
base_hash={rel:sha(p) for rel,p in files(BASE).items()}
assert len(base_hash)==1173, len(base_hash)

# Regenerate self-excluding site manifest; baseline files remain unchanged except known edits.
b0=files(BASE_SITE); s0=files(SITE)
assert len(b0)==178, len(b0)
assert len(s0)==182, len(s0)
assert set(b0).issubset(set(s0)),list(set(b0)-set(s0))
assert set(s0)-set(b0)==WEB_ADDED,(set(s0)-set(b0))
for rel,bp in b0.items():
    if rel not in WEB_CHANGED: assert sha(bp)==sha(SITE/rel),f'Unexpected site delta: {rel}'

old_manifest=json.loads((BASE_SITE/'SITE_FILE_MANIFEST.json').read_text())
manifest={**old_manifest,
    'programmeStage':38,'programmeTotal':105,
    'kind':'cumulative browser site with range-specific foliage LOD and A/B controls',
    'authoritativeRuntimeBase':'SUNSET_STATE_STAGE37_GITHUB_PAGES_SITE.zip',
    'sourceBaseline':'SUNSET_STATE_STAGE37_OF105_FULL.zip',
    'filesCount':len(s0),
    'filesSha256':{rel:sha(p) for rel,p in sorted(s0.items()) if rel!='SITE_FILE_MANIFEST.json'},
    'optOut':'?stage38LodOff=1',
    'abGuide':'STAGE38_LOD_AB_GUIDE.html',
    'note':'Stage38 LOD modifies only draw representations; native GPU FPS/visual QA remains pending.'}
assert len(manifest['filesSha256'])==181
for t in [SITE/'SITE_FILE_MANIFEST.json',R/'SITE_FILE_MANIFEST.json',R/'PROJECT/STAGE38_SITE_MANIFEST.json']:
    t.parent.mkdir(parents=True,exist_ok=True)
    t.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

# Inspect all static files, script references, dynamic path ordering, and JS syntax.
sitefiles=files(SITE)
assert len(sitefiles)==182
sitehash={rel:sha(p) for rel,p in sitefiles.items() if rel!='SITE_FILE_MANIFEST.json'}
assert sitehash==manifest['filesSha256']
assert sha(R/'SITE_FILE_MANIFEST.json')==sha(SITE/'SITE_FILE_MANIFEST.json')
for rel,p in sitefiles.items():
    if (R/rel).is_file() and rel in ['index.html','START_GAME.html','engine44.js','assets/stage38_adaptive_lod.js','README_STAGE38_HE.md','README_STAGE38_GITHUB_PAGES_HE.md','STAGE38_LOD_AB_GUIDE.html']:
        assert sha(R/rel)==sha(p),f'game mismatch {rel}'
scriptrefs={}
for entry in ('index.html','START_GAME.html'):
    parser=Scripts();parser.feed((SITE/entry).read_text())
    arr=parser.src
    assert len(arr)==93,(entry,len(arr))
    assert len(arr)==len(set(arr))
    for src in arr:
        assert not src.startswith(('http:','https:','//')),(entry,src)
        assert (SITE/src).is_file(),(entry,src)
    assert arr.index('assets/stage36_performance_audit.js') < arr.index('assets/stage37_render_optimization.js') < arr.index('assets/stage38_adaptive_lod.js') < arr.index('engine44.js')
    scriptrefs[entry]=len(arr)

js=[str(p) for p in sitefiles.values() if p.suffix=='.js']
assert len(js)==135,len(js)
with ThreadPoolExecutor(max_workers=8) as pool:
    checks=list(pool.map(lambda p:subprocess.run(['node','--check',p],capture_output=True,text=True,timeout=40),js))
for p,c in zip(js,checks):
    if c.returncode:raise AssertionError(f'JS syntax failed: {p} {c.stderr[:700]}')

# HTTP fetch verifies exact bytes for each file, including 0-byte .nojekyll, at localhost.
class Quiet(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(SITE),**kwargs)
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);thread=Thread(target=server.serve_forever,daemon=True);thread.start()
urlbase=f'http://127.0.0.1:{server.server_port}/'
from urllib.parse import quote

def http_verify(item):
    rel,p=item
    with urlopen(urlbase+quote(rel),timeout=20) as response:
        if response.status != 200: return (rel,'bad status')
        data=response.read()
    return (rel,None if hashlib.sha256(data).digest()==hashlib.sha256(p.read_bytes()).digest() else 'bad digest')
try:
    with ThreadPoolExecutor(max_workers=12) as pool:
        httpres=list(pool.map(http_verify,sorted(sitefiles.items())))
finally:
    server.shutdown();server.server_close()
fail=[p for p,e in httpres if e]
assert not fail,fail

result={
    'stage':38,'baselineStage':37,'passed':True,
    'siteFiles':len(sitefiles),'previousSiteFilesPreserved':len(b0),'newSiteFiles':len(WEB_ADDED),
    'javascriptSyntaxPassed':len(js),'scriptReferencesPerEntrypoint':scriptrefs,
    'httpSha256Verified':len(httpres),'manifestEntriesExcludingSelf':len(sitehash),
    'restoredBaselineQAOutputs':restored,
    'codeEngineMatchesWorkingSource':True,
    'nativeGPUVerified':False,'fullHD50FpsVerified':False,'publicDeploymentPerformed':False
}
(R/'QA/STAGE38_SITE_RELEASE_RESULT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('STAGE38 SITE AUDIT',json.dumps(result,ensure_ascii=False))
