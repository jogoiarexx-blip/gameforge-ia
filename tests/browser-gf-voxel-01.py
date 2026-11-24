"""GF-VOXEL-01 — play actual exported sandbox; not an assertion of hardware performance."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import os,tempfile,json

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
                page=browser.new_page(viewport={'width':1100,'height':800},accept_downloads=True)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/tools/voxel-studio.html')
                page.locator('#title').fill('GF Voxel Browser')
                page.locator('#seed').fill('12345')
                page.locator('#build').click()
                frame=page.frame_locator('#preview')
                frame.locator('#start').wait_for(timeout=30000)
                frame.locator('#start').click(timeout=30000)
                frame.locator('#overlay.hidden').wait_for(state='attached',timeout=30000)
                with page.expect_download(timeout=30000) as event:
                    page.locator('#download').click()
                path=Path(tmp)/'world.zip';event.value.save_as(path)
                out=Path(tmp)/'game';out.mkdir()
                with ZipFile(path) as z:
                    assert set(z.namelist())=={'index.html','game.js','style.css','engine-3d.js','THREE-LICENSE.txt','LEIA-VOXEL.md'}
                    z.extractall(out)
                assert not errors,errors
                page.close()
                game,url=server(out)
                try:
                    page=browser.new_page(viewport={'width':1000,'height':720})
                    errors=[];external=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    def offline(route):
                        if route.request.url.startswith(url+'/'):route.continue_()
                        else:external.append(route.request.url);route.abort()
                    page.route('**/*',offline)
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().engine==='voxel-v1'",timeout=30000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().state==='play' && window.__gameforgeTelemetry().frames>1",timeout=30000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    initial=tele()
                    assert initial['chunks']==16 and initial['triangles']>0,initial
                    page.wait_for_function("window.__gameforgeTelemetry().visuals.visible && window.__gameforgeTelemetry().visuals.held==='block'")
                    page.wait_for_function("window.__gameforgeTelemetry().grounded",timeout=15000)
                    page.keyboard.down('ArrowDown')
                    page.wait_for_function("window.__gameforgeTelemetry().player.pitch < -0.95",timeout=15000)
                    page.keyboard.up('ArrowDown')
                    page.wait_for_function("window.__gameforgeTelemetry().target !== null",timeout=10000)
                    page.keyboard.press('e')
                    page.wait_for_function("window.__gameforgeTelemetry().mined===1",timeout=15000)
                    assert tele()['edits']==1
                    assert tele()['visuals']['actions']>=1 and tele()['visuals']['action']=='mine'
                    # Mining may remove the floor under the player; aim at an adjacent surface
                    # and place a block outside the player collider, using real input only.
                    page.keyboard.down('ArrowUp')
                    page.wait_for_function("window.__gameforgeTelemetry().player.pitch > -0.65",timeout=15000)
                    page.keyboard.up('ArrowUp')
                    page.keyboard.press('3')
                    page.wait_for_function("window.__gameforgeTelemetry().selected===3")
                    for _ in range(6):
                        page.keyboard.press('q')
                        if tele()['placed']>=1:break
                        page.keyboard.down('ArrowRight');page.wait_for_timeout(320);page.keyboard.up('ArrowRight')
                    assert tele()['placed']>=1,tele()
                    page.locator('#pause').click()
                    page.wait_for_function("window.__gameforgeTelemetry().paused")
                    saved=tele()
                    assert 'Salvo' in saved['saveStatus'],saved
                    record=page.evaluate("JSON.parse(localStorage.getItem('gameforge-voxel-v1:12345:'+encodeURIComponent('GF Voxel Browser')))")
                    assert record['mined']==1 and record['placed']>=1 and record['edits']
                    page.reload()
                    page.wait_for_function("window.__gameforgeTelemetry?.().engine==='voxel-v1'",timeout=30000)
                    assert page.locator('#start').inner_text()=='Continuar mundo'
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().state==='play'")
                    restored=tele()
                    assert restored['edits']==saved['edits']
                    assert restored['mined']==saved['mined'] and restored['placed']==saved['placed']
                    assert abs(restored['player']['x']-record['player']['x'])<.1
                    assert not errors,errors
                    assert not external,external
                    print('GF-VOXEL-01: preview, ZIP, WebGL, mineração, construção, save/reload e offline aprovados')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
