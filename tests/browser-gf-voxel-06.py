"""GF-VOXEL-06 — chest transfer and drop persistence in an exported game."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import os,tempfile,math

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
                page.locator('#title').fill('GF Baus')
                page.locator('#seed').fill('12345')
                page.locator('#mode').select_option('resources')
                page.locator('#storage').check()
                page.locator('#build').click()
                with page.expect_download(timeout=30000) as dl:page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                game,url=server(dest)
                try:
                    page.close()
                    page=browser.new_page(viewport={'width':1200,'height':950})
                    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().storage!=null",timeout=30000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().grounded",timeout=15000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    def count(i):return sum(s['qty'] for s in tele()['inventory'] if s and s['id']==i)
                    def aim(x,y,z):
                        a=tele()['player'];dx=x-a['x'];dy=y-a['y']-1.58;dz=z-a['z']
                        yaw=math.atan2(dx,-dz);pitch=math.atan2(dy,math.hypot(dx,dz))
                        box=page.locator('#game').bounding_box()
                        for _ in range(14):
                            a=tele()['player'];delta=math.atan2(math.sin(yaw-a['yaw']),math.cos(yaw-a['yaw']))
                            dd=pitch-a['pitch']
                            if abs(delta)<.02 and abs(dd)<.02:return
                            cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
                            mx=max(-160,min(160,delta/.005));my=max(-110,min(110,-dd/.005))
                            page.mouse.move(cx,cy);page.mouse.down();page.mouse.move(cx+mx,cy+my,steps=4);page.mouse.up()
                        raise AssertionError(('aim',tele()))
                    page.locator('#voxel-bag').click()
                    page.locator('[data-recipe="4"]').click()
                    assert count(12)==1 and count(3)==9
                    page.locator('#voxel-bag').click()
                    aim(2.5,50.95,.5)
                    assert tele()['target']['id']==1,tele()['target']
                    page.keyboard.press('9');page.keyboard.press('q')
                    page.wait_for_function("window.__gameforgeTelemetry().storage.chests.length===1")
                    assert count(12)==0
                    c=tele()['storage']['chests'][0]['cell']
                    aim(c[0]+.5,c[1]+.5,c[2]+.5)
                    page.locator('#voxel-chest').click()
                    page.locator('[data-deposit="3"]').click()
                    assert count(3)==8
                    assert tele()['storage']['chests'][0]['bag'][0]['qty']==1
                    page.locator('#voxel-bag').click()
                    page.keyboard.press('e')
                    assert tele()['storage']['chests'][0]['bag'][0]['qty']==1
                    page.keyboard.press('2')
                    page.keyboard.press('g')
                    assert count(2)==3
                    page.locator('#pause').click()
                    assert len(tele()['storage']['drops'])==1
                    page.reload()
                    page.wait_for_function("window.__gameforgeTelemetry?.().storage?.chests.length===1")
                    assert page.locator('#start').inner_text()=='Continuar mundo'
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().storage.drops.length===0",timeout=20000)
                    assert count(2)==4 and count(3)==8
                    aim(c[0]+.5,c[1]+.5,c[2]+.5)
                    page.locator('#voxel-chest').click()
                    page.locator('[data-withdraw="3"]').click()
                    assert count(3)==9
                    assert all(v is None for v in tele()['storage']['chests'][0]['bag'])
                    assert not errors,errors
                    print('GF-VOXEL-06: baú, proteção, transferência, drop e coleta após reload')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
