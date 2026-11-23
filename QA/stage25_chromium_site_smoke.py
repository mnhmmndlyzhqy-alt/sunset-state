#!/usr/bin/env python3
"""Real Chromium DOM fixture, scripts disabled; HTTP browsing blocked by host admin."""
import json,pathlib
from playwright.sync_api import sync_playwright
R=pathlib.Path(__file__).resolve().parents[1]
SITE=pathlib.Path('/mnt/data/stage25_github_pages_site')
checks=[]
def ck(name,yes):
 checks.append({'name':name,'passed':bool(yes)})
 if not yes:print('FAIL',name)
with sync_playwright() as pw:
 with pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']) as browser:
  context=browser.new_context(java_script_enabled=False,viewport={'width':1280,'height':720})
  page=context.new_page()
  page.set_content((SITE/'index.html').read_text(),wait_until='domcontentloaded',timeout=45000)
  ck('actual_chromium_dom_title','SUNSET STATE' in page.title())
  ck('actual_chromium_play_button',page.locator('#play-button').count()==1)
  ck('actual_chromium_canvas',page.locator('canvas').count()>=1)
  ck('actual_chromium_82_script_tags',page.locator('script[src]').count()==82)
  ck('actual_chromium_css_applied',page.locator('body').evaluate('(x)=>getComputedStyle(x).margin')=='0px')
  ck('actual_chromium_menu_text',page.locator('#main-menu').count()==1)
  ck('actual_chromium_main_title',page.locator('h1').count()>=1)
  ck('actual_chromium_document_utf8',page.locator('meta[charset=utf-8]').count()==1)
  page.set_content((SITE/'START_GAME.html').read_text(),wait_until='domcontentloaded',timeout=45000)
  ck('actual_chromium_second_entry_same_title','SUNSET STATE' in page.title())
  ck('actual_chromium_second_entry_play_button',page.locator('#play-button').count()==1)
  page.set_content((SITE/'404.html').read_text(),wait_until='domcontentloaded',timeout=45000)
  ck('actual_chromium_custom_404',page.locator('h1').inner_text()=='Page not found')
  ck('actual_chromium_404_link',page.locator('a').first.get_attribute('href')=='./index.html')
  context.close()
report={'stage':25,'kind':'real Chromium DOM from local markup, JS disabled; browser network blocked by administrator',
        'httpSubpath': 'Verified separately by Python standard-library HTTP test',
        'limitations':['No browser HTTP navigation','No script execution','No real GPU/WebGL2','No 50FPS hardware benchmark'],
        'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'gpuValid':False}
(R/'QA/STAGE25_CHROMIUM_SITE_SMOKE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':[x['name'] for x in checks if not x['passed']]}))
if report['passed']<report['total']:raise SystemExit(1)
