#!/usr/bin/env python3
"""Cumulative static release from preserved Stage27 website allowlist."""
from pathlib import Path
import hashlib,json,zipfile,shutil

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT.parent/'sunset_stage28_site'
OUT=ROOT.parent/'SUNSET_STATE_STAGE28_GITHUB_PAGES_SITE.zip'
SOURCE='SUNSET_STATE_STAGE27_OF35_FULL.zip'
SOURCE_SHA='57334e132fc6c2fb16fb9fda65d92f43a9c8c7914346e6bd401d7ecd72b59aeb'
def sha(b):return hashlib.sha256(b).hexdigest()
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def build():
    previous=json.loads((ROOT/'PROJECT/STAGE27_SITE_MANIFEST.json').read_text(encoding='utf8'))['fileSha256']
    assert len(previous)==143,'Stop: unexpected Stage27 site baseline'
    names=set(previous)
    new={'assets/stage28_architectural_facades.js','README_STAGE28_CHANGES_HE.md','README_STAGE28_GITHUB_PAGES_HE.md'}
    assert not names.intersection(new)
    names.update(new)
    if SITE.exists():shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    files=[]
    for name in sorted(names-{'SITE_FILE_MANIFEST.json'}):
        src=ROOT/('QA/STAGE26_MANUAL_BROWSER_CHECKLIST_HE.md' if name=='README_STAGE26_BROWSER_QA_HE.md' else name)
        if not src.is_file():raise RuntimeError(f'Missing site dependency {name}')
        dst=SITE/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
        b=dst.read_bytes();files.append({'path':name,'size':len(b),'sha256':sha(b)})
    write(ROOT/'SITE_FILE_MANIFEST.json',{'project':'SUNSET STATE','programmeStage':28,
        'kind':'github-pages-site-static-assets','source':SOURCE,'sourceSha256':SOURCE_SHA,
        'incrementalFrom':27,'sourceCodePreserved':True,
        'localSiteValidated':True,'publicDeploymentPerformed':False,'hardwareGpuValidated':False,'files':files})
    shutil.copyfile(ROOT/'SITE_FILE_MANIFEST.json',SITE/'SITE_FILE_MANIFEST.json')
    site_sha={name:sha((SITE/name).read_bytes()) for name in sorted(names)}
    write(ROOT/'PROJECT/STAGE28_SITE_MANIFEST.json',{
        'stage':28,'previousSiteFileCount':143,'siteFileCount':len(names),
        'filesAdded':sorted(new),'previousSiteFilesRetained':all(p in site_sha for p in previous),
        'uploadedToGithub':False,'hardwareGpuValidated':False,'fileSha256':site_sha})
    with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
        for name in sorted(names):z.write(SITE/name,arcname=name)
    with zipfile.ZipFile(OUT) as z:
        assert z.testzip() is None
        assert len(z.namelist())==len(names)
        assert z.read('index.html')==z.read('START_GAME.html')
        assert b'assets/stage28_architectural_facades.js' in z.read('index.html')
        assert all(sha(z.read(name))==site_sha[name] for name in names)
    print('STAGE28_SITE_READY',len(names),'files, bytes',OUT.stat().st_size,'sha256',sha(OUT.read_bytes()))
if __name__=='__main__':build()
