#!/usr/bin/env python3
"""Build a cumulative Stage29 source and site from the exact Stage28 artifacts.
All Stage28 ZIP paths retained; only 8 existing source paths may change.
"""
from pathlib import Path
import json,hashlib,zipfile,shutil,os,subprocess
R=Path(__file__).resolve().parents[1]
P=R.parent
SOURCE=P/'SUNSET_STATE_STAGE28_OF35_FULL.zip'
BASE_SITE=P/'SUNSET_STATE_STAGE28_GITHUB_PAGES_SITE.zip'
SITE=P/'sunset_stage29_site'
SITE_ZIP=P/'SUNSET_STATE_STAGE29_GITHUB_PAGES_SITE.zip'
FULL_ZIP=P/'SUNSET_STATE_STAGE29_OF35_FULL.zip'
CHANGED={
 'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json',
 'QA/stage05_bootstrap.cjs','README_35_STAGE_HE.md','README_GITHUB_PAGES_HE.md',
 'START_GAME.html','engine44.js','index.html'}
SITE_PATCH={n for n in CHANGED if n in json.loads((R/'PROJECT/STAGE28_SITE_MANIFEST.json').read_text())['fileSha256']}
ADDED_SITE={'assets/stage29_interior_retail_polish.js','README_STAGE29_CHANGES_HE.md','README_STAGE29_GITHUB_PAGES_HE.md'}

def sha(data):return hashlib.sha256(data).hexdigest()
def jsonput(path,obj):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def safe_name(name):
 return name and not name.startswith('/') and '..' not in Path(name).parts and '\\' not in name

def prepare_site():
 old=json.loads((R/'PROJECT/STAGE28_SITE_MANIFEST.json').read_text('utf8'))['fileSha256']
 with zipfile.ZipFile(BASE_SITE) as zin:
  assert set(zin.namelist())==set(old),'Original site must exactly match Stage28 manifest'
  if SITE.exists():shutil.rmtree(SITE)
  SITE.mkdir(parents=True)
  for name in sorted(zin.namelist()):
   assert safe_name(name)
   data=zin.read(name)
   assert sha(data)==old[name],name
   dest=SITE/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 for name in sorted(SITE_PATCH|ADDED_SITE):
  src=R/name
  assert src.is_file(),name
  dst=SITE/name;dst.parent.mkdir(parents=True,exist_ok=True)
  shutil.copyfile(src,dst)
 # The site manifest is always regenerated after modifications.
 paths=sorted(old.keys()|ADDED_SITE)
 assert len(paths)==149
 files=[]
 for name in paths:
  if name=='SITE_FILE_MANIFEST.json':continue
  data=(SITE/name).read_bytes()
  files.append({'path':name,'size':len(data),'sha256':sha(data)})
 manifest={'project':'SUNSET STATE','programmeStage':29,'kind':'github-pages-site-static-assets',
   'source':'SUNSET_STATE_STAGE28_OF35_FULL.zip','sourceSha256':sha(SOURCE.read_bytes()),
   'incrementalFrom':28,'sourceCodePreserved':True,'localSiteValidated':True,
   'publicDeploymentPerformed':False,'hardwareGpuValidated':False,'files':files}
 jsonput(SITE/'SITE_FILE_MANIFEST.json',manifest)
 shutil.copy2(SITE/'SITE_FILE_MANIFEST.json',R/'SITE_FILE_MANIFEST.json')
 newSha={name:sha((SITE/name).read_bytes()) for name in paths}
 originalOk=all(newSha[name]==hashval for name,hashval in old.items() if name not in SITE_PATCH and name!='SITE_FILE_MANIFEST.json')
 assert originalOk,'Unexpected Stage28 site modification'
 jsonput(R/'PROJECT/STAGE29_SITE_MANIFEST.json',{
  'stage':29,'previousSiteFileCount':len(old),'siteFileCount':len(paths),
  'filesAdded':sorted(ADDED_SITE),'intentionallyChangedExistingSitePaths':sorted(SITE_PATCH|{'SITE_FILE_MANIFEST.json'}),
  'previousSiteFilesRetained':True,'unchangedSiteHashesVerified':True,
  'uploadedToGithub':False,'hardwareGpuValidated':False,'fileSha256':newSha})
 with zipfile.ZipFile(SITE_ZIP,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as zout:
  for name in paths:zout.write(SITE/name,arcname=name)
 with zipfile.ZipFile(SITE_ZIP) as z:
  assert len(z.namelist())==149 and z.testzip() is None
  assert z.read('START_GAME.html')==z.read('index.html')
  assert b'assets/stage29_interior_retail_polish.js' in z.read('index.html')
 print('SITE_READY',len(paths),'ZIP_BYTES',SITE_ZIP.stat().st_size)


def prepare_full():
 with zipfile.ZipFile(SOURCE) as orig:
  old=set(orig.namelist())
  allfiles={str(p.relative_to(R)).replace(os.sep,'/'):p for p in R.rglob('*') if p.is_file()}
  assert old.issubset(allfiles), 'Stage28 cumulative files missing'
  for name in sorted(old):
   if name in CHANGED or name=='SITE_FILE_MANIFEST.json':continue
   assert sha(orig.read(name))==sha(allfiles[name].read_bytes()),'Unintended Stage28 source mutation: '+name
  new=set(allfiles)-old
  print('SOURCE_BUNDLE',len(old),'prior files,',len(new),'new files',len(allfiles),'total')
  with zipfile.ZipFile(FULL_ZIP,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as out:
   for name,p in sorted(allfiles.items()):
    assert safe_name(name),name
    out.write(p,arcname=name)
 with zipfile.ZipFile(FULL_ZIP) as z:
  assert z.testzip() is None
  assert old.issubset(z.namelist())
  assert z.read('START_GAME.html')==z.read('index.html')
  assert json.loads(z.read('PROJECT/35_STAGE_PROGRESS.json'))['nextStage']==30
  assert z.read('assets/stage29_interior_retail_polish.js')== (R/'assets/stage29_interior_retail_polish.js').read_bytes()
  assert z.read('BACKUPS/STAGE29_OF35/engine44.js')==zipfile.ZipFile(SOURCE).read('engine44.js')
 print('FULL_READY',len(allfiles),'ZIP_BYTES',FULL_ZIP.stat().st_size)

if __name__=='__main__':
 prepare_site()
 prepare_full()
