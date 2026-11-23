"""Real Chromium DOM/controls smoke for the Stage22 benchmark overlay.
This test intentionally runs a TEST-FIXTURE Game, not real WebGL. Do not count it as 1080p FPS proof.
"""
import json, pathlib, datetime
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'QA'/'STAGE22_BROWSER_UI_SMOKE.json'
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
with sync_playwright() as p:
    with p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',
            args=['--no-sandbox','--disable-dev-shm-usage']) as browser:
        page=browser.new_page(viewport={'width':1280,'height':720},accept_downloads=True)
        page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><canvas id="game"></canvas></body></html>')
        page.evaluate('''() => {const Native=URLSearchParams; window.URLSearchParams=class extends Native{
            constructor(arg){super(arg||'?stage22qa=1')}
        };}''')
        page.add_script_tag(content=(root/'assets'/'stage22_native1080_benchmark.js').read_text())
        page.evaluate('''() => {
          class FixtureGame {
            constructor(){this.running=true;this.paused=false;this.over=false;this.inside=false;
              this.inVehicle=false;this.visualMode450='native1080';this.renderer={canvas:document.querySelector('canvas'),
              name:'NO REAL WEBGL IN SMOKE TEST',renderNative475:false};this.lastPaint=0;}
            tick(now){this.lastPaint=now;return 1;}
          }
          window.FixtureGame=FixtureGame;
          window.Heatline.installStage22NativeBenchmark(FixtureGame);
          window.fixture=new FixtureGame();
          fixture.tick(performance.now());
        }''')
        check('benchmark_panel_visible_only_in_optin_fixture',page.locator('#stage22-bench-panel').count()==1)
        check('six_scene_options_present',page.locator('#stage22-bench-panel select option').count()==6)
        page.locator('#stage22-bench-panel select').select_option('interior_lobby')
        page.locator('#stage22-bench-panel input[type=checkbox]').check()
        page.locator('#stage22-bench-panel button').nth(0).click()
        message=page.locator('#stage22-bench-panel [aria-live=polite]').inner_text()
        check('wrong_scene_cannot_be_started', 'אינו מתאים' in message, message)
        page.locator('#stage22-bench-panel select').select_option('downtown_walk')
        page.locator('#stage22-bench-panel input[type=checkbox]').check()
        page.locator('#stage22-bench-panel button').nth(0).click()
        check('start_button_starts_warmup',page.evaluate('window.Heatline.stage22Benchmark.recording') is True)
        check('stop_button_enabled_while_running',not page.locator('#stage22-bench-panel button').nth(1).is_disabled())
        page.locator('#stage22-bench-panel button').nth(1).click()
        check('manual_stop_records_one_unverified_result',page.evaluate('window.Heatline.stage22Benchmark.records.length')==1)
        check('no_gpu_never_passes',page.evaluate('window.Heatline.stage22Benchmark.records[0].allConditionsPassed') is False)
        with page.expect_download(timeout=15000) as download_info:
            page.locator('#stage22-bench-panel button').nth(2).click()
        downloaded=download_info.value
        check('browser_json_report_downloads',downloaded.suggested_filename=='SUNSET_STATE_STAGE22_REAL_1080P_GPU_BENCHMARK.json')
        data=json.loads(pathlib.Path(downloaded.path()).read_text())
        check('report_does_not_claim_unverified_hardware',data['allSixScenesPassed'] is False and data['nativeHardwareGpuBenchmarkPerformed'] is False)
report={'stage':22,'kind':'browser-UI-fixture-only','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'hardwareBenchmarkPerformed':False,'checks':checks,'passed':sum(x['pass'] for x in checks),'total':len(checks)}
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':[x['name'] for x in checks if not x['pass']]},ensure_ascii=False))
if report['passed']!=report['total']:raise SystemExit(1)
