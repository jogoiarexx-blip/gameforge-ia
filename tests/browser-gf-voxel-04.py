"""GF-VOXEL-04: exported survival game, real input and saved night boundary fixture."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import os,tempfile

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
def server(root):
    s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
    Thread(target=s.serve_forever,daemon=True).start()
    return s,'http://127.0.0.1:'+str(s.server_port)
def run():
    studio,base=server(ROOT)
    try:
        with sync_playwright() as p,tempfile.TemporaryDirectory() as tmp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                page=browser.new_page(accept_downloads=True,viewport={'width':1200,'height':950})
                page.goto(base+'/tools/voxel-studio.html')
                page.locator('#title').fill('GF Survival')
                page.locator('#seed').fill('12345')
                page.locator('#mode').select_option('resources')
                page.locator('#survival').check()
                page.locator('#build').click()
                with page.expect_download(timeout=30000) as dl:page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                game,url=server(dest)
                try:
                    page.close()
                    context=browser.new_context(viewport={'width':1200,'height':950})
                    page=context.new_page()
                    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().survival!=null",timeout=30000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().survival.hunger<99.7",timeout=30000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    count=lambda:sum(s['qty'] for s in tele()['inventory'] if s and s['id']==11)
                    assert count()==3
                    page.wait_for_function("window.__gameforgeTelemetry().visuals.actors>0 && window.__gameforgeTelemetry().visuals.parts>10")
                    page.locator('#voxel-eat').click()
                    assert count()==2
                    assert tele()['survival']['hunger']>99
                    page.locator('#pause').click()
                    t=tele()['survival']['time']
                    page.wait_for_timeout(500)
                    assert tele()['survival']['time']==t
                    # Prepare a legitimate saved-world fixture just before sunset.
                    # The actual game must load it and execute the day/night transition itself.
                    key='gameforge-voxel-v1:12345:GF%20Survival:resources-v1:survival-v1'
                    page.evaluate("(key)=>{const s=JSON.parse(localStorage.getItem(key));s.survival.time=79.5;localStorage.setItem(key,JSON.stringify(s));}",key)
                    # Avoid the active document overwriting the fixture during pagehide.
                    # Open another page on the same origin instead of reloading this one.
                    # Set fixture again after opening the second page if a blur handler ran.
                    other=page.context.new_page()
                    other.goto(url+'/index.html')
                    other.evaluate("(key)=>{const s=JSON.parse(localStorage.getItem(key));s.survival.time=79.5;localStorage.setItem(key,JSON.stringify(s));}",key)
                    other.reload()
                    other.on('pageerror',lambda e:errors.append(str(e)))
                    other.wait_for_function("window.__gameforgeTelemetry?.().survival!=null",timeout=30000)
                    other.locator('#start').click()
                    other.wait_for_function("window.__gameforgeTelemetry().survival.time>=80 && window.__gameforgeTelemetry().survival.animals.some(a=>a.kind==='shade')",timeout=30000)
                    other.wait_for_function("window.__gameforgeTelemetry().visuals.actors===window.__gameforgeTelemetry().survival.animals.length")
                    assert not errors,errors
                    print('GF-VOXEL-04: alimentação, pausa, restauração e transição noturna em jogo exportado')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
