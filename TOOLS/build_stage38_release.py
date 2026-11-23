#!/usr/bin/env python3
"""Build Stage38 cumulative source/site archives with immutable baseline provenance."""
from pathlib import Path
import hashlib, json, zipfile, os, shutil, time
BASE=Path('/mnt/data/sunset_stage37_master')
SRC=Path('/mnt/data/sunset_stage38_master')
BASE_SITE=Path('/mnt/data/sunset_stage37_site')
SITE=Path('/mnt/data/sunset_stage38_site')
BASE_ZIP=Path('/mnt/data/SUNSET_STATE_STAGE37_OF105_FULL.zip')
OUT=Path('/mnt/data')
FULL_ZIP=OUT/'SUNSET_STATE_STAGE38_OF105_FULL.zip'
SITE_ZIP=OUT/'SUNSET_STATE_STAGE38_GITHUB_PAGES_SITE.zip'
QA_OUT=OUT/'SUNSET_STATE_STAGE38_RELEASE_QA.json'
CHECKSUMS=OUT/'SUNSET_STATE_STAGE38_CHECKSUMS.txt'
STAGE37_HASH='c957a52e8b325050602a4ebc216570c14674b31a46de8bc793b4a29d6547a00c'

def filehash(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    return h.hexdigest()

def paths(root):return {p.relative_to(root).as_posix():p for p in root.rglob('*') if p.is_file()}

assert filehash(BASE_ZIP)==STAGE37_HASH,'Stage37 baseline ZIP hash not verified'
b=paths(BASE);w=paths(SRC)
assert len(b)==1173,len(b)
assert set(b)<=set(w),'Old source file missing'
changed=sorted(rel for rel,p in b.items() if filehash(p)!=filehash(w[rel]))
expected=sorted(['engine44.js','index.html','START_GAME.html','SITE_FILE_MANIFEST.json','PROJECT/105_STAGE_PLAN_HE.md'])
assert changed==expected,(changed,expected)
backup=SRC/'BACKUPS/STAGE38_OF105'
for rel in changed:
    assert filehash(backup/rel)==filehash(b[rel]),f'Missing/incorrect backup: {rel}'
for rel in (set(b)-set(changed)):
    if filehash(b[rel])!=filehash(w[rel]):raise AssertionError(f'Unexpected source mutation: {rel}')

site_old=paths(BASE_SITE);site_new=paths(SITE)
assert len(site_old)==178 and len(site_new)==182
assert set(site_old)<=set(site_new)
newsite=sorted(set(site_new)-set(site_old))
assert set(newsite)=={'README_STAGE38_HE.md','README_STAGE38_GITHUB_PAGES_HE.md','STAGE38_LOD_AB_GUIDE.html','assets/stage38_adaptive_lod.js'},newsite
for rel in set(site_old)-{'index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json'}:
    assert filehash(site_old[rel])==filehash(site_new[rel]),f'Unexpected site file change: {rel}'
assert all(filehash(SRC/rel)==filehash(SITE/rel) for rel in ('engine44.js','index.html','START_GAME.html','assets/stage38_adaptive_lod.js'))

qa=json.loads((SRC/'QA/STAGE38_LOD_ACCEPTANCE_RESULT.json').read_text())
assert qa['passed']==qa['total']==84,qa.get('passed')
assert qa['convertedModels']==4944
siteaudit=json.loads((SRC/'QA/STAGE38_SITE_RELEASE_RESULT.json').read_text())
assert siteaudit['passed'] and siteaudit['httpSha256Verified']==182
assert siteaudit['javascriptSyntaxPassed']==135
regressions={
    'save':('stage19','95/95'),
    'vehicleCCD':('stage21','39/39'),
    'interiorRetail':('stage29','13/13'),
    'characters':('stage30','35/35'),
    'traffic':('stage31','37/37'),
    'animals':('stage32','46/46'),
    'profiler':('stage36unit','33'),
    'profilerIntegration':('stage36integration','16'),
    'priorRenderAB':('stage37','70'),
}
for name,(log,needle) in regressions.items():
    val=(SRC/f'QA/STAGE38_REGRESSION_{log}.log').read_text()
    assert needle in val,(name,log,needle)
    if log in {'stage37','stage36unit','stage36integration'}:
        assert '"failed": []' in val,(name,val[-250:])

workload=json.loads((SRC/'QA/STAGE38_LOD_WORKLOAD_CPU.json').read_text())
assert workload['stage']==38 and workload['sampledObjects']==16281
assert len(workload['measured'])==6 and all(x['submittedChangePct']<0 for x in workload['measured'])
report={
    'project':'SUNSET STATE','stage':38,'programmeTotal':105,'releaseStatus':'cumulative CPU-verified browser release; pending GPU visual/FPS validation',
    'baselineSource':'SUNSET_STATE_STAGE37_OF105_FULL.zip','baselineSourceSha256':STAGE37_HASH,
    'sourceBaselineFilesPreserved':len(b),'sourceBaselineChangedWithBackups':changed,
    'newSourceFilesBeforeReleaseReport':sorted(set(w)-set(b)),
    'siteBaselineFilesPreserved':len(site_old),'siteChangedFiles':sorted(['engine44.js','index.html','START_GAME.html','SITE_FILE_MANIFEST.json']),
    'siteNewFiles':newsite,'siteFiles':len(site_new),'siteHttpSha256Passed':182,'siteJavaScriptSyntaxPassed':135,
    'acceptanceTests':{'pass':84,'total':84},
    'stage37RenderingRegression':{'pass':70,'total':70},
    'cumulativeRegressions':{'save':[95,95],'vehicleCollision':[39,39],'interiorsShops':[13,13],'characters':[35,35],'traffic':[37,37],'wildlife':[46,46],'profiler':[33,33],'profilerIntegration':[16,16]},
    'stage38RenderOnlyFoliageParts':4944,
    'theoreticalFoliageTriangles':qa['theoreticalFoliageTriangles'],
    'cameraWorkloadCpuEstimatedPctReductionRange':[round(abs(max(x['submittedChangePct'] for x in workload['measured'])),2),round(abs(min(x['submittedChangePct'] for x in workload['measured'])),2)],
    'nativeGpuMeasured':False,'fullHd50FpsVerified':False,'visualPopCheckVerified':False,'publicDeployed':False,
    'disableFlag':'?stage38LodOff=1',
    'historicalSourceLimitation':'PROJECT/STAGE36_SOURCE_PROVENANCE_HE.md'
}
qap=SRC/'PROJECT/STAGE38_RELEASE_QA.json'
qap.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
QA_OUT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')


def build_zip(root,out,level=5):
    if out.exists():out.unlink()
    fs=paths(root)
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=level,allowZip64=True) as z:
        for rel,p in sorted(fs.items()):
            if p.is_symlink():raise AssertionError(f'symlink not allowed {p}')
            z.write(p,arcname=rel)
    with zipfile.ZipFile(out) as z:
        names=z.namelist()
        assert len(names)==len(fs) and len(names)==len(set(names)),(len(names),len(fs))
        assert set(names)==set(fs),'Wrong archive file paths'
        bad=z.testzip()
        assert bad is None,f'CRC failure in {out}: {bad}'
        for rel in ('index.html','START_GAME.html','engine44.js','SITE_FILE_MANIFEST.json','assets/stage38_adaptive_lod.js'):
            if rel in fs:
                assert hashlib.sha256(z.read(rel)).hexdigest()==filehash(fs[rel]),(out,rel)
    return len(fs),out.stat().st_size,filehash(out)

sc,sbytes,sh=build_zip(SITE,SITE_ZIP)
print('STAGE38 SITE ZIP',sc,sbytes,sh,flush=True)
fc,fbytes,fh=build_zip(SRC,FULL_ZIP)
print('STAGE38 SOURCE ZIP',fc,fbytes,fh,flush=True)
assert sc==182 and fc>=1190
CHECKSUMS.write_text(f'{fh}  {FULL_ZIP.name}\n{sh}  {SITE_ZIP.name}\n{filehash(QA_OUT)}  {QA_OUT.name}\n')
print('STAGE38 ARCHIVES VERIFIED',{'sourceFiles':fc,'sourceBytes':fbytes,'websiteFiles':sc,'websiteBytes':sbytes,'checksums':str(CHECKSUMS)})
