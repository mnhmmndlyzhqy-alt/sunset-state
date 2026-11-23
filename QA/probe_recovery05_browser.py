import asyncio, json, pathlib, time, http.server, socketserver, threading, functools
from playwright.async_api import async_playwright
root=pathlib.Path(__file__).resolve().parents[1]
async def main():
 class Handler(http.server.SimpleHTTPRequestHandler):
  def log_message(self, *args): pass
 handler=functools.partial(Handler,directory=str(root))
 server=socketserver.TCPServer(('127.0.0.1',0),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 result={'scope':'Headless Chromium, software WebGL may differ from player GPU','started':time.strftime('%Y-%m-%d %H:%M:%S'),'browserReady':False,'gameCreated':False,'canvasWebGL':False,'playClicked':False,'errors':[],'notes':[]}
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'])
   page=await browser.new_page(viewport={'width':1280,'height':720})
   page.on('pageerror',lambda e:result['errors'].append(str(e)[:240]))
   page.on('console',lambda e:result['notes'].append('console:'+e.text[:120]) if e.type=='error' else None)
   try:
    await page.goto(f'http://127.0.0.1:{server.server_address[1]}/START_GAME.html?qa=473',wait_until='domcontentloaded',timeout=25000)
    result['browserReady']=True
    try:
     await page.wait_for_function('Boolean(window.__SUNSET_QA473?.game)',timeout=15000)
     result['gameCreated']=True
    except Exception as e: result['notes'].append('No QA game object: '+str(e)[:160])
    try:
     result['canvasWebGL']=await page.evaluate('Boolean(document.querySelector("canvas")?.getContext("webgl2"))')
    except Exception as e:result['notes'].append('Canvas query failed: '+str(e)[:140])
    try:
     await page.locator('#play-button').click(timeout=7000)
     result['playClicked']=True
     await page.wait_for_timeout(900)
     result['gameRunning']=await page.evaluate('Boolean(window.__SUNSET_QA473?.game?.running)')
     await page.screenshot(path=str(root/'QA/RECOVERY05_BROWSER_SMOKE.png'),timeout=7000)
     result['screenshot']='QA/RECOVERY05_BROWSER_SMOKE.png'
    except Exception as e:result['notes'].append('Play/screenshot incomplete: '+str(e)[:180])
   except Exception as e:result['notes'].append('Page load incomplete: '+str(e)[:180])
   await browser.close()
 except Exception as e:result['notes'].append('Browser launch failed: '+str(e)[:200])
 server.shutdown()
 (root/'QA/CITY_LIFE_RECOVERY05_BROWSER.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps(result,indent=2,ensure_ascii=False))
asyncio.run(main())
