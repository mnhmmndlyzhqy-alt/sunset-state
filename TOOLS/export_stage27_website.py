#!/usr/bin/env python3
"""Regenerate the Stage27 GitHub Pages site from extracted cumulative project.
No network access, uses only the previously audited site-file allowlist plus stage27 files.
"""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT.parent/'sunset_stage27_site'
OUT=ROOT.parent/'SUNSET_STATE_STAGE27_GITHUB_PAGES_SITE.zip'
SOURCE='SUNSET_STATE_STAGE26_OF35_FULL.zip'
SOURCE_SHA='d0cbf9aacaf0197642a7304361dd2ab4a23668b65bfa98cd5e26c543d411c1e2'

def sha(data): return hashlib.sha256(data).hexdigest()
def jsonwrite(p, obj): p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def build():
    old=json.loads((ROOT/'PROJECT/STAGE26_SITE_MANIFEST.json').read_text(encoding='utf-8'))['fileSha256']
    assert len(old)==140, 'Stage26 site allowlist is unexpected; stop to avoid incomplete release'
    # Preserve original Stage26 website metadata while updating root manifest for Stage27.
    if not (ROOT/'BACKUPS/STAGE27_OF35/SITE_FILE_MANIFEST.stage26.json').exists():
        shutil.copyfile(ROOT/'SITE_FILE_MANIFEST.json',ROOT/'BACKUPS/STAGE27_OF35/SITE_FILE_MANIFEST.stage26.json')
    names=set(old)
    names |= {'assets/stage27_route_coast_polish.js', 'README_STAGE27_CHANGES_HE.md',
              'README_STAGE27_GITHUB_PAGES_HE.md'}
    names.discard('SITE_FILE_MANIFEST.json')
    notes=(ROOT/'PROJECT/STAGE27_OF35_REPORT_HE.md').read_text(encoding='utf-8')
    (ROOT/'README_STAGE27_CHANGES_HE.md').write_text(notes,encoding='utf-8')
    (ROOT/'README_STAGE27_GITHUB_PAGES_HE.md').write_text((ROOT/'README_GITHUB_PAGES_HE.md').read_text(encoding='utf-8'),encoding='utf-8')
    if SITE.exists(): shutil.rmtree(SITE)
    SITE.mkdir(parents=True,exist_ok=True)
    info=[]
    for name in sorted(names):
        if name=='README_STAGE26_BROWSER_QA_HE.md':
            src=ROOT/'QA/STAGE26_MANUAL_BROWSER_CHECKLIST_HE.md'
        else: src=ROOT/name
        if not src.is_file(): raise FileNotFoundError(f'Missing Stage27 site source: {name} from {src}')
        dest=SITE/name
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(src,dest)
        data=dest.read_bytes()
        info.append({'path':name,'size':len(data),'sha256':sha(data)})
    site_manifest={
      'project':'SUNSET STATE','programmeStage':27,
      'kind':'github-pages-site-static-assets',
      'source':SOURCE,'sourceSha256':SOURCE_SHA,
      'gameCodeAssetsModified':True,'localSiteValidated':True,
      'publicDeploymentPerformed':False,'hardwareGpuValidated':False,
      'files':info}
    jsonwrite(ROOT/'SITE_FILE_MANIFEST.json',site_manifest)
    shutil.copyfile(ROOT/'SITE_FILE_MANIFEST.json',SITE/'SITE_FILE_MANIFEST.json')
    allnames=sorted(names|{'SITE_FILE_MANIFEST.json'})
    site_sha={n:sha((SITE/n).read_bytes()) for n in allnames}
    jsonwrite(ROOT/'PROJECT/STAGE27_SITE_MANIFEST.json',{
      'stage':27,'base':'SUNSET_STATE_STAGE26_GITHUB_PAGES_SITE.zip',
      'baseSiteFilesRetained':140,'stage27ExtraSiteFiles':len(allnames)-140,
      'newFiles':['assets/stage27_route_coast_polish.js','README_STAGE27_CHANGES_HE.md',
                  'README_STAGE27_GITHUB_PAGES_HE.md'],
      'uploadedToGithub':False,'nativeGpuCertified':False,
      'fileSha256':site_sha})
    with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as archive:
        for name in allnames: archive.write(SITE/name,arcname=name)
    with zipfile.ZipFile(OUT) as verify:
        assert verify.testzip() is None, 'Site archive CRC failed'
        assert set(verify.namelist())==set(allnames), 'Missing site file(s)'
        for name in allnames:
            assert sha(verify.read(name))==site_sha[name],f'Hash mismatch: {name}'
    print('STAGE27_SITE_READY',len(allnames),'files, ZIP bytes',OUT.stat().st_size,'sha256',sha(OUT.read_bytes()),'output',OUT,flush=True)
    return OUT

if __name__=='__main__':build()
