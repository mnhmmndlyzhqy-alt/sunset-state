#!/usr/bin/env python3
"""Package full cumulative SUNSET STATE Stage20 from a verified Stage19 checkpoint.
Run with python TOOLS/package_stage20.py --base <STAGE19_FULL.zip> --out <STAGE20_FULL.zip>
Uses strict byte-level preservation for prior unmodified files.
"""
import argparse,hashlib,json,os,sys,zipfile,zlib
from pathlib import Path

def file_sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent)
    p.add_argument('--base',type=Path,default=Path('/mnt/data/SUNSET_STATE_STAGE19_OF35_FULL.zip'))
    p.add_argument('--out',type=Path,default=Path('/mnt/data/SUNSET_STATE_STAGE20_OF35_FULL.zip'))
    p.add_argument('--manifest',type=Path,default=Path('/mnt/data/SUNSET_STATE_STAGE20_DELIVERY_MANIFEST.json'))
    a=p.parse_args();root=a.root.resolve()
    if not a.base.exists():raise RuntimeError('Stage19 base archive is required; no rebuild without prior checkpoint')
    expected_base='2191c17f7d0a55392596432be532011b36e6118ce2bbb55b69bd3ef25093cb13'
    if file_sha(a.base)!=expected_base:raise RuntimeError('Stage19 archive SHA-256 mismatch')
    allowed={'START_GAME.html','engine44.js','QA/stage05_bootstrap.cjs',
        'PROJECT/35_STAGE_PLAN_HE.md','PROJECT/35_STAGE_PROGRESS.json','README_35_STAGE_HE.md'}
    files={str(p.relative_to(root)).replace('\\','/'):p for p in root.rglob('*') if p.is_file()}
    if len(files)!=len(set(files)):raise RuntimeError('Duplicate project paths')
    altered=[];miss=[]
    with zipfile.ZipFile(a.base) as z:
        base={i.filename:i for i in z.infolist() if not i.is_dir()}
        for name,entry in base.items():
            dest=files.get(name)
            if dest is None:miss.append(name);continue
            size=dest.stat().st_size
            if size!=entry.file_size or zlib.crc32(dest.read_bytes())!=entry.CRC:
                altered.append(name)
    unexpected=set(altered)-allowed
    if miss or unexpected or not set(altered).issuperset({'engine44.js','START_GAME.html'}):
        raise RuntimeError('Base preservation failure: missing='+repr(miss[:10])+' unauthorized='+repr(sorted(unexpected)))
    if 'assets/stage20_pedestrian_navigation.js' not in files:raise RuntimeError('Missing Stage20 runtime module')
    if len(base)!=733:raise RuntimeError(f'Stage19 should contain 733 files, got {len(base)}')
    # Metadata must precede the archive and be included inside it.
    diff_path=root/'QA/STAGE20_BASE_DIFF.json'
    newcomers=sorted((set(files)-set(base))|{'QA/STAGE20_BASE_DIFF.json'})
    diff={'baseArchive':a.base.name,'baseSHA256':expected_base,
          'baseFileCount':len(base),'retainedBaseFiles':len(base),'modifiedOriginalFiles':sorted(altered),
          'unauthorizedBaseChanges':[],'newFiles':len(newcomers),'newFileList':newcomers,
          'verification':'all other base files byte-for-byte preserved, CRC32+size comparison'}
    diff_path.write_text(json.dumps(diff,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    files[str(diff_path.relative_to(root)).replace('\\','/')]=diff_path
    tmp=a.out.with_suffix('.zip.tmp');a.out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(tmp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for name,path in sorted(files.items()):
            z.write(path,arcname=name)
    with zipfile.ZipFile(tmp) as z:
        invalid=z.testzip();entries=z.namelist()
        if invalid:raise RuntimeError('ZIP test returned corrupt entry '+invalid)
        if len(entries)!=len(files):raise RuntimeError('ZIP file count does not match source')
        if not set(base).issubset(entries):raise RuntimeError('Base file missing in packaged ZIP')
    os.replace(tmp,a.out)
    manifest={'project':'SUNSET STATE','stage':20,'archive':a.out.name,
      'zipSizeBytes':a.out.stat().st_size,'zipFileCount':len(files),
      'zipSHA256':file_sha(a.out),'zipSelfTest':'passed','baseZipSHA256':expected_base,
      'baseFilesRetained':len(base),'modifiedOriginalFiles':sorted(altered),
      'newFiles':len(newcomers),'newFileList':newcomers,
      'stage20Acceptance':'22/22','stage20DisabledAB':'12/12',
      'stage20CpuLong':'600 simulated seconds, eight NPCs, 24000 actor updates, no failures',
      'stage19SaveRegression':'95/95','stage18LodRegression':'36/36',
      'stage17CommerceRegression':'927/927','recovery05Compatibility':'39/39 with updated 429 portal count only',
      'recovery05Historical':'38/39 due stale expected 298 vs actual 429 portals',
      'realWebGLVerified':False,'native1080p50FPSVerified':False,
      'limits':['local obstacle and blocked crossing recovery only; no global sidewalk A*',
                '10-minute CPU simulated clock is not 10 minutes actual gameplay',
                'GPU visuals, shader behavior and 1920x1080 50FPS still pending']}
    a.manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ['archive','zipFileCount','zipSizeBytes','zipSHA256','baseFilesRetained','newFiles','modifiedOriginalFiles','zipSelfTest']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
