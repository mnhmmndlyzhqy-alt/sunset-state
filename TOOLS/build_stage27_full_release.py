#!/usr/bin/env python3
"""Pack cumulative Stage27 source with opt-in preservation checks against Stage26.
The original source is never modified or included twice.
"""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
ORIGINAL=ROOT.parent/'SUNSET_STATE_STAGE26_OF35_FULL.zip'
DEST=ROOT.parent/'SUNSET_STATE_STAGE27_OF35_FULL.zip'
ALLOW_CHANGED={
    'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json',
    'QA/stage05_bootstrap.cjs','README_35_STAGE_HE.md',
    'README_GITHUB_PAGES_HE.md','SITE_FILE_MANIFEST.json',
    'START_GAME.html','assets/terrain_463.js','index.html'}

def sha(data):return hashlib.sha256(data).hexdigest()

def audit_source():
    if not ORIGINAL.is_file():return {'available':False,'reason':'Source Stage26 archive not present alongside extracted project'}
    original_sha=sha(ORIGINAL.read_bytes())
    assert original_sha=='d0cbf9aacaf0197642a7304361dd2ab4a23668b65bfa98cd5e26c543d411c1e2'
    with zipfile.ZipFile(ORIGINAL) as z:
        base=[x for x in z.namelist() if not x.endswith('/')]
        assert len(base)==916
        missing=[x for x in base if not (ROOT/x).is_file()]
        assert not missing, f'Original files missing: {missing}'
        changed=[x for x in base if (ROOT/x).read_bytes()!=z.read(x)]
        assert set(changed)==ALLOW_CHANGED, f'Unexpected original modifications: {set(changed)^ALLOW_CHANGED}'
        mapping={
            'START_GAME.html':'BACKUPS/STAGE27_OF35/START_GAME.stage26.html',
            'index.html':'BACKUPS/STAGE27_OF35/index.stage26.html',
            'assets/terrain_463.js':'BACKUPS/STAGE27_OF35/terrain_463.stage26.js',
            'QA/stage05_bootstrap.cjs':'BACKUPS/STAGE27_OF35/stage05_bootstrap.stage26.cjs',
            'PROJECT/35_STAGE_PLAN_HE.md':'BACKUPS/STAGE27_OF35/35_STAGE_PLAN.stage26.md',
            'PROJECT/35_STAGE_PROGRESS.json':'BACKUPS/STAGE27_OF35/35_STAGE_PROGRESS.stage26.json',
            'README_35_STAGE_HE.md':'BACKUPS/STAGE27_OF35/README_35_STAGE.stage26.md',
            'README_GITHUB_PAGES_HE.md':'BACKUPS/STAGE27_OF35/README_GITHUB_PAGES.stage26.md',
            'SITE_FILE_MANIFEST.json':'BACKUPS/STAGE27_OF35/SITE_FILE_MANIFEST.stage26.json',
        }
        for old,backup in mapping.items():
            assert (ROOT/backup).read_bytes()==z.read(old), f'Bad original backup: {backup}'
    return {'available':True,'originalFiles':len(base),'originalFilesPreserved':len(base),
            'changedOriginalFiles':changed,'allChangedOriginalFilesBackedUp':True,
            'originalArchiveSha256':original_sha}

def build():
    preservation=audit_source()
    progress=json.loads((ROOT/'PROJECT/35_STAGE_PROGRESS.json').read_text(encoding='utf-8'))
    assert progress['currentStage']==27 and progress['nextStage']==28
    site=json.loads((ROOT/'PROJECT/STAGE27_SITE_MANIFEST.json').read_text(encoding='utf-8'))
    assert site['stage']==27 and len(site['fileSha256'])==143
    files=sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    assert 'assets/stage27_route_coast_polish.js' in files
    assert 'PROJECT/STAGE27_CURRENT_STATUS.json' in files
    assert 'QA/STAGE27_SITE_HTTP_AUDIT.json' in files
    with zipfile.ZipFile(DEST,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
        for name in files:z.write(ROOT/name,arcname=name)
    with zipfile.ZipFile(DEST) as z:
        assert z.testzip() is None,'CRC test failed'
        assert z.namelist()==files
        assert z.read('START_GAME.html')==z.read('index.html')
        assert b'assets/stage27_route_coast_polish.js' in z.read('index.html')
    digest=sha(DEST.read_bytes())
    result={'stage':27,'nextStage':28,'preservation':preservation,'archive':str(DEST),
            'archiveBytes':DEST.stat().st_size,'archiveSHA256':digest,
            'fileCount':len(files),'crcTestPassed':True,'htmlEntrypointsSame':True,
            'siteManifestFiles':len(site['fileSha256']),
            'gpuHardware1080p50fpsVerified':False,'remoteGitHubPublished':False}
    (ROOT.parent/'SUNSET_STATE_STAGE27_RELEASE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('FULL_STAGE27_PACKAGE_OK',json.dumps(result,ensure_ascii=False),flush=True)

if __name__=='__main__':build()
