"""Probe the local browser's *real* WebGL2 capabilities without claiming game FPS.
Run with: python QA/stage22_probe_browser.py. Requires playwright + Chromium.
If no physical GPU exists, the report must say NOT VERIFIED.
"""
import json, pathlib, subprocess, datetime
ROOT=pathlib.Path(__file__).resolve().parent
result={"stage":22,"timestamp":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "probeOnly":True,"gameRendered":False,"hardwareGpuVerified":False,
        "native1080Fps50Verified":False,"measuredGameFps":None,
        "deviceDriExists":pathlib.Path('/dev/dri').exists(),"browser":{},"errors":[]}
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        executable='/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').exists() else p.chromium.executable_path
        with p.chromium.launch(executable_path=executable,headless=True,
                args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader',
                      '--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']) as browser:
            page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
            page.set_content('<canvas id="bench"></canvas>')
            details=page.evaluate("""() => {
                const c=document.querySelector('#bench'),g=c.getContext('webgl2');
                if(!g)return {webgl2:false,reason:'getContext(webgl2) returned null'};
                const ext=g.getExtension('WEBGL_debug_renderer_info');
                return {webgl2:true,version:g.getParameter(g.VERSION),renderer:g.getParameter(g.RENDERER),
                    unmaskedRenderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,
                    drawingBuffer:[g.drawingBufferWidth,g.drawingBufferHeight]};
            }""")
            result['browser']=details
            result['adapterClassification']='software-or-unavailable' if (not details.get('webgl2') or
                any(s in str(details.get('unmaskedRenderer','')).lower() for s in ['swiftshader','llvmpipe','software'])) else 'unidentified-requires-real-GPU-check'
except Exception as exc:
    result['errors'].append(f'{type(exc).__name__}: {exc}'[:600])
result['conclusion']='GPU-based full-game 1920x1080@50FPS cannot be verified in this container.'
path=ROOT/'STAGE22_CONTAINER_GPU_PROBE.json'
path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
