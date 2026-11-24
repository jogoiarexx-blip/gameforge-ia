"""GF-VOXEL-09: export, real texture shader, worker chunks, movement and mobile radius."""
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
                page.locator('#title').fill('GF Paisagem')
                page.locator('#seed').fill('12345')
                page.locator('#mode').select_option('resources')
                page.locator('#forest').check()
                page.locator('#size').select_option('128')
                page.locator('#landscape').check()
                page.locator('#textures').check()
                page.locator('#quality').select_option('low')
                page.locator('#build').click()
                with page.expect_download(timeout=45000) as dl:page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                game,url=server(dest)
                try:
                    page.close()
                    ctx=browser.new_context(viewport={'width':1200,'height':950})
                    errors=[]
                    def watch(pg):
                        pg.on('pageerror',lambda e:errors.append(str(e)))
                        pg.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'WebGLProgram' in m.text) else None)
                    page=ctx.new_page();watch(page);page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().mapSize===128",timeout=45000)
                    page.locator('#start').click()
                    page.wait_for_function("(()=>{const t=window.__gameforgeTelemetry();return t.stream.workerCompleted>0&&t.chunks===t.stream.wanted&&t.stream.faces<t.stream.exposed&&t.triangles>0})()",timeout=90000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    t=tele()
                    assert t['textured'] and t['landscape'] and len(t['trees'])>64
                    assert t['stream']['radius']==2 and t['chunks']==25 and t['stream']['worker']=='worker'
                    page.locator('#voxel-save').click()
                    page.locator('#pause').click()
                    # A legitimate far-away save fixture, followed by actual movement across a chunk boundary.
                    other=ctx.new_page();watch(other);other.goto(url+'/index.html')
                    key='gameforge-voxel-v1:12345:GF%20Paisagem:resources-v1:forest-v1:map-128:landscape-v1'
                    other.evaluate("(key)=>{const s=JSON.parse(localStorage.getItem(key));s.player={x:47.5,y:56,z:35.5,yaw:0,pitch:-.4};localStorage.setItem(key,JSON.stringify(s));}",key)
                    other.reload()
                    other.wait_for_function("window.__gameforgeTelemetry?.().player.x===47.5",timeout=45000)
                    other.locator('#start').click()
                    other.wait_for_function("window.__gameforgeTelemetry().chunks===window.__gameforgeTelemetry().stream.wanted",timeout=90000)
                    assert other.evaluate("window.__gameforgeTelemetry().stream.center.cx")==2
                    assert '0,2' in other.evaluate("window.__gameforgeTelemetry().stream.keys")
                    other.keyboard.down('d')
                    try:other.wait_for_function("window.__gameforgeTelemetry().stream.center.cx===3",timeout=15000)
                    finally:other.keyboard.up('d')
                    other.wait_for_function("!window.__gameforgeTelemetry().stream.keys.includes('0,2')",timeout=15000)
                    other.set_viewport_size({'width':390,'height':844})
                    other.wait_for_function("window.__gameforgeTelemetry().stream.radius===1",timeout=15000)
                    other.locator('#voxel-render-distance').click()
                    other.wait_for_function("window.__gameforgeTelemetry().stream.radius===2",timeout=15000)
                    assert not errors,errors
                    print('GF-VOXEL-09: textura, greedy, worker real, unload e distância mobile')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
