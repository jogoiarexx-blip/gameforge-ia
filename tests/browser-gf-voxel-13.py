"""GF-VOXEL-13: actual IndexedDB checkpoint recovery without localStorage."""
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
                page=browser.new_page(accept_downloads=True,viewport={'width':1100,'height':850})
                page.goto(base+'/tools/voxel-studio.html')
                page.locator('#title').fill('GF Regioes')
                page.locator('#size').select_option('4096')
                page.locator('#quality').select_option('low')
                page.locator('#build').click()
                with page.expect_download(timeout=45000) as dl:page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                game,url=server(dest)
                try:
                    page.close()
                    page=browser.new_page(viewport={'width':390,'height':844})
                    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().regional?.ready===true",timeout=45000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().grounded",timeout=30000)
                    page.keyboard.down('ArrowDown')
                    try:page.wait_for_function("window.__gameforgeTelemetry().player.pitch<-.95",timeout=15000)
                    finally:page.keyboard.up('ArrowDown')
                    page.keyboard.press('e')
                    page.wait_for_function("window.__gameforgeTelemetry().mined===1",timeout=15000)
                    page.locator('#pause').click()
                    page.wait_for_function("(()=>{const r=window.__gameforgeTelemetry().regional;return r.committed===r.revision&&r.regions>0&&!r.running})()",timeout=30000)
                    saved=page.evaluate('window.__gameforgeTelemetry()')
                    assert saved['cache']['total']==65536
                    assert saved['cache']['resident']<=96
                    page.evaluate('localStorage.clear()')
                    page.reload()
                    page.wait_for_function("window.__gameforgeTelemetry?.().regional?.ready===true",timeout=45000)
                    assert page.locator('#start').inner_text()=='Continuar mundo'
                    page.locator('#start').click()
                    restored=page.evaluate('window.__gameforgeTelemetry()')
                    assert restored['mined']==saved['mined'] and restored['edits']==saved['edits']
                    assert restored['regional']['committed']>=saved['regional']['committed']
                    assert not errors,errors
                    print('GF-VOXEL-13: mundo 4096, checkpoint IndexedDB e recuperação sem cópia local')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
