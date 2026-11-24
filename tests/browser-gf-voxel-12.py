"""GF-VOXEL-12: real exported 1024 world, worker terrain and persistent torch shader."""
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
                page.locator('#title').fill('GF Luz 1024')
                page.locator('#seed').fill('12345')
                page.locator('#size').select_option('1024')
                page.locator('#textures').check()
                page.locator('#lighting').check()
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
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'WebGLProgram' in m.text) else None)
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().mapSize===1024",timeout=45000)
                    page.locator('#start').click()
                    page.wait_for_function("(()=>{const t=window.__gameforgeTelemetry();return t.stream.terrainCompleted>0&&t.chunks===t.stream.wanted&&t.grounded&&t.triangles>0})()",timeout=90000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    t=tele()
                    assert t['cache']['total']==4096 and t['cache']['lazy']
                    assert t['cache']['resident']<=96 and t['stream']['radius']==1
                    assert t['lighting']['placed']==0 and t['lighting']['active']==0
                    page.keyboard.press('t')
                    page.wait_for_function("window.__gameforgeTelemetry().selected===30")
                    page.keyboard.down('ArrowDown')
                    try:page.wait_for_function("window.__gameforgeTelemetry().player.pitch < -.65",timeout=15000)
                    finally:page.keyboard.up('ArrowDown')
                    page.wait_for_function("window.__gameforgeTelemetry().target!==null",timeout=15000)
                    for _ in range(6):
                        page.keyboard.press('q')
                        if tele()['lighting']['placed']==1:break
                        page.keyboard.down('ArrowRight');page.wait_for_timeout(300);page.keyboard.up('ArrowRight')
                    assert tele()['lighting']['placed']==1,tele()
                    page.wait_for_function("window.__gameforgeTelemetry().lighting.active===1")
                    page.locator('#pause').click()
                    page.reload()
                    page.wait_for_function("window.__gameforgeTelemetry?.().lighting?.placed===1",timeout=45000)
                    assert page.locator('#start').inner_text()=='Continuar mundo'
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().lighting.active===1")
                    assert not errors,errors
                    print('GF-VOXEL-12: mapa 1024, worker de terreno, tocha e save aprovados')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
