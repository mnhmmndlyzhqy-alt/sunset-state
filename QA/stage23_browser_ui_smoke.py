"""Actual Chromium UI interactions with TEST-FIXTURE WebGL methods, not gameplay GPU evidence."""
import datetime,json,pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
checks=[]
def verify(name,truth,detail=None):
    checks.append({'name':name,'pass':bool(truth),'detail':detail})
    if not truth:print('FAIL',name,detail)
with sync_playwright() as pw:
  with pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']) as browser:
    page=browser.new_page(viewport={'width':1280,'height':720},accept_downloads=True)
    page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><canvas id="c"></canvas></body></html>')
    page.evaluate('''() => {const N=URLSearchParams;window.URLSearchParams=class extends N{constructor(s){super(s||'?stage23qa=1')}};}''')
    page.add_script_tag(content=(root/'assets'/'stage23_geometry_draw_profiler.js').read_text())
    page.evaluate('''() => {
     class FakeGL {constructor(){this.TRIANGLES=4;this.FRAMEBUFFER=36160;this.drawingBufferWidth=1920;this.drawingBufferHeight=1080;}
      drawElementsInstanced(){return 1;}drawArraysInstanced(){}drawElements(){}drawArrays(){}
      bufferData(){}bufferSubData(){}bindFramebuffer(){}
     }
     class FakeGame {constructor(){this.renderer={gl:new FakeGL(),canvas:document.querySelector('#c'),
       activeStaticScene:{source:Array(100),visible:Array(55)}};this.running=true;this.cycles=0;}
       tick(t){this.cycles++;this.buildDynamic();this.renderer.gl.bufferData(34962,new Float32Array(40),35044);
         this.renderer.gl.drawElementsInstanced(4,36,5125,0,30);return 123;}
       buildDynamic(){return [1,2,3,4,5]}
     }
     window.FakeGame=FakeGame;window.Heatline.installStage23DrawProfiler(FakeGame);
     window.fakeGame=new FakeGame();fakeGame.tick(performance.now());
    }''')
    area=page.locator('#stage23-geometry-draw-profile')
    verify('panel_visible_when_opted_in',area.count()==1)
    verify('six_scene_options',area.locator('select option').count()==6)
    verify('start_enabled_in_mock',not area.locator('button').nth(0).is_disabled())
    area.locator('select').select_option('traffic')
    area.locator('button').nth(0).click()
    verify('start_sets_running_state',page.evaluate('Heatline.stage23Profiler.running'))
    verify('stop_button_enabled',not area.locator('button').nth(1).is_disabled())
    page.evaluate('''() => {for(let i=0;i<24;i++)fakeGame.tick(performance.now()+i*16)}''')
    area.locator('button').nth(1).click()
    verify('stop_clears_state',not page.evaluate('Heatline.stage23Profiler.running'))
    verify('one_result_with_calls',page.evaluate('Heatline.stage23Profiler.results.length===1 && Heatline.stage23Profiler.results[0].totals.drawCalls===24'))
    verify('capture_does_not_certify_gpu',page.evaluate('Heatline.stage23Profiler.results[0].hardwareFps50Verified===false'))
    verify('capture_does_not_report_gpu_vram',page.evaluate('Heatline.stage23Profiler.results[0].gpuResidentMemoryBytes===null'))
    verify('mock_game_original_tick_kept_running',page.evaluate('fakeGame.cycles===25'))
    with page.expect_download(timeout=12000) as event:area.locator('button').nth(2).click()
    d=event.value
    verify('real_download_filename',d.suggested_filename=='SUNSET_STATE_STAGE23_WEBGL_DRAW_PROFILE.json')
    data=json.loads(pathlib.Path(d.path()).read_text())
    verify('real_download_contents',data['stage']==23 and len(data['results'])==1)
    verify('download_marks_no_gpu_cadence_proof',data['results'][0]['hardwareFps50Verified'] is False and data['results'][0]['gpuExecutionTimeMs'] is None)
    verify('panel_status_exposes_limit', 'ללא אישור FPS' in area.locator('[aria-live=polite]').inner_text())
report={'stage':23,'kind':'Chromium UI with simulated GL functions; no real game pixels',
        'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'hardwareFps50Verified':False,'checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks)}
(root/'QA'/'STAGE23_BROWSER_UI_SMOKE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':[c['name'] for c in checks if not c['pass']]},ensure_ascii=False))
if report['passed']!=report['total']:raise SystemExit(1)
