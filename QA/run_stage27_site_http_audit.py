#!/usr/bin/env python3
"""Repeatable HTTP and SHA256 audit for Stage27 static website."""
import hashlib
import http.server
import json
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT.parent/'sunset_stage27_site'
REPORT=ROOT/'QA/STAGE27_SITE_HTTP_AUDIT.json'

def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def audit():
    manifest=json.loads((ROOT/'PROJECT/STAGE27_SITE_MANIFEST.json').read_text(encoding='utf8'))
    assert SITE.is_dir(),f'Generate the site first: python TOOLS/export_stage27_website.py'
    checks=0
    for name,want in manifest['fileSha256'].items():
        target=SITE/name
        assert target.is_file(),f'Missing: {name}'
        assert sha(target)==want,f'Bad sha: {name}'
        checks+=1
    assert sha(SITE/'index.html')==sha(SITE/'START_GAME.html')
    checks+=1
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(SITE),**kwargs)
        def log_message(self,*args): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_address[1]}/'
    try:
        for name in manifest['fileSha256']:
            request=urllib.request.Request(base+urllib.parse.quote(name),method='HEAD')
            with urllib.request.urlopen(request,timeout=6) as r:
                assert r.status==200,f'{name}: HTTP {r.status}'
            checks+=1
        with urllib.request.urlopen(base+'index.html',timeout=8) as r:
            html=r.read().decode('utf-8')
            assert r.status==200
        checks+=1
        scripts=re.findall(r'<script\b[^>]*\bsrc\s*=\s*[\"\']([^\"\']+)',html,re.I)
        assert 'assets/stage27_route_coast_polish.js' in scripts
        for file in scripts:
            if file.startswith(('http:', 'https:', '//')): continue
            file=file.split('?')[0]
            assert (SITE/file).is_file(),f'Broken script reference: {file}'
            with urllib.request.urlopen(urllib.request.Request(base+urllib.parse.quote(file),method='HEAD'),timeout=6) as r:
                assert r.status==200
            checks+=1
    finally:server.shutdown();server.server_close()
    report={'stage':27,'passed':True,'testsPassed':checks,'testsFailed':0,
            'files':len(manifest['fileSha256']),'htmlScripts':len(scripts),
            'relativeGitHubPagesSubpathCompatible':True,'publicDeploymentPerformed':False,
            'nativeGpuVerified':False}
    REPORT.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('STAGE27 SITE HTTP/SHA AUDIT:',f'{checks}/{checks}','files:',len(manifest['fileSha256']),'scripts:',len(scripts))
    return report

if __name__=='__main__':audit()
