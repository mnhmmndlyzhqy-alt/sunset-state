#!/usr/bin/env python3
"""Immutable cumulative Stage28 source pack and strict 951-entry Stage27 preservation audit."""
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'SUNSET_STATE_STAGE27_OF35_FULL.zip'
OUT=ROOT.parent/'SUNSET_STATE_STAGE28_OF35_FULL.zip'
SHA='57334e132fc6c2fb16fb9fda65d92f43a9c8c7914346e6bd401d7ecd72b59aeb'
MODIFIED={'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json',
          'QA/stage05_bootstrap.cjs','README_35_STAGE_HE.md','README_GITHUB_PAGES_HE.md',
          'SITE_FILE_MANIFEST.json','START_GAME.html','index.html'}
def sha(data):return hashlib.sha256(data).hexdigest()
def audit():
    assert BASE.is_file(),'Stage27 uploaded archive required'
    assert sha(BASE.read_bytes())==SHA,'Stage27 source SHA did not match'
    with zipfile.ZipFile(BASE) as z:
        names=[n for n in z.namelist() if not n.endswith('/')]
        assert len(names)==951
        missing=[n for n in names if not (ROOT/n).is_file()]
        assert not missing,f'Unpreserved Stage27 originals: {missing}'
        different=[n for n in names if (ROOT/n).read_bytes()!=z.read(n)]
        assert set(different)==MODIFIED,f'Unexpected modifications: {set(different)^MODIFIED}'
        for n in different:
            backup=ROOT/'BACKUPS'/'STAGE28_OF35'/(n.replace('/','__')+'.stage27.original')
            assert backup.is_file() and backup.read_bytes()==z.read(n),f'Bad backup of original {n}'
    return {'stage27ArchiveSHA256':SHA,'sourceFiles':951,'retainedFiles':951,
        'modifiedSourceFiles':sorted(different),'allModifiedSourceFilesBackedUp':True,
        'noOriginalFilesDeleted':True}
def build():
    state=json.loads((ROOT/'PROJECT/STAGE28_CURRENT_STATUS.json').read_text())
    prog=json.loads((ROOT/'PROJECT/35_STAGE_PROGRESS.json').read_text())
    assert prog['currentStage']==28 and prog['nextStage']==29
    assert state['currentStage']==28 and state['nextStage']==29
    a=json.loads((ROOT/'QA/STAGE28_ACCEPTANCE_RESULT.json').read_text())
    assert a['passed']==a['total']==37
    h=json.loads((ROOT/'QA/STAGE28_SITE_HTTP_AUDIT.json').read_text())
    assert h['passed']==h['total']==465
    s=json.loads((ROOT/'QA/STAGE28_JS_SYNTAX_RESULT.json').read_text())
    assert s['passed']==s['checks']==126
    regr=json.loads((ROOT/'QA/STAGE28_REGRESSION_RESULT.json').read_text())
    assert len(regr['tests'])==3 and all(x['passed'] for x in regr['tests'])
    site=json.loads((ROOT/'PROJECT/STAGE28_SITE_MANIFEST.json').read_text())
    assert site['siteFileCount']==146
    preservation=audit()
    names=sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    for name in ['assets/stage28_architectural_facades.js','PROJECT/STAGE28_CURRENT_STATUS.json',
      'QA/STAGE28_ACCEPTANCE_RESULT.json','QA/STAGE28_SITE_HTTP_AUDIT.json',
      'QA/STAGE28_MANUAL_WEBGL_CHECKLIST_HE.md','TOOLS/export_stage28_website.py']:
      assert name in names
    with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
        for name in names:z.write(ROOT/name,arcname=name)
    with zipfile.ZipFile(OUT) as z:
        assert z.testzip() is None,'Stage28 full zip CRC failure'
        assert z.namelist()==names
        assert z.read('index.html')==z.read('START_GAME.html')
        assert b'assets/stage28_architectural_facades.js' in z.read('index.html')
    with zipfile.ZipFile(ROOT.parent/'SUNSET_STATE_STAGE28_GITHUB_PAGES_SITE.zip') as z:
        assert z.testzip() is None
        assert z.read('index.html')==(ROOT/'index.html').read_bytes()
        assert z.read('SITE_FILE_MANIFEST.json')==(ROOT/'SITE_FILE_MANIFEST.json').read_bytes()
    result={'stage':28,'nextStage':29,'preservation':preservation,
        'archive':str(OUT),'archiveBytes':OUT.stat().st_size,'archiveSHA256':sha(OUT.read_bytes()),
        'fileCount':len(names),'siteFiles':site['siteFileCount'],'crcTestPassed':True,
        'sourceAndSiteEntrypointsMatch':True,'codeAcceptance':'37/37',
        'siteLocalHttpSHA':'465/465','javascriptSyntax':'126/126',
        'regressions':{'save':'95/95','navigation':'22/22','vehicleCCD':'39/39'},
        'hardware1080p50fpsVerified':False,'publicGithubPagesDeployed':False}
    (ROOT.parent/'SUNSET_STATE_STAGE28_RELEASE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('STAGE28_FULL_CUMULATIVE_SOURCE_OK',json.dumps(result,ensure_ascii=False),flush=True)
if __name__=='__main__':build()
