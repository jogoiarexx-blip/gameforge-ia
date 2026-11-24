"""GF-VOXEL-02: exercise crafting in an actual exported game."""
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
                page=browser.new_page(accept_downloads=True,viewport={'width':1100,'height':800})
                page.goto(base+'/tools/voxel-studio.html')
                page.locator('#title').fill('GF Recursos')
                page.locator('#seed').fill('12345')
                page.locator('#mode').select_option('resources')
                page.locator('#build').click()
                with page.expect_download(timeout=30000) as dl:
                    page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                game,url=server(dest)
                try:
                    page.close()
                    page=browser.new_page(viewport={'width':1050,'height':850})
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().mode==='resources'",timeout=30000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().grounded",timeout=30000)
                    tele=lambda:page.evaluate('window.__gameforgeTelemetry()')
                    def count(i):
                        return sum(s['qty'] for s in tele()['inventory'] if s and s['id']==i)
                    def station(i):
                        page.locator('[data-station="%d"]'%i).click()
                    def craft(i):
                        page.locator('[data-recipe="%d"]'%i).click()
                    assert count(3)==12 and count(2)==4
                    page.locator('#voxel-bag').click()
                    craft(0)
                    assert count(4)==1 and count(3)==8
                    station(4);craft(1)
                    assert count(5)==0 and count(3)==8
                    page.locator('#voxel-bag').click()
                    # Aim at nearby empty cells above the terrain; avoid the player's AABB.
                    page.keyboard.down('ArrowDown')
                    page.wait_for_function("window.__gameforgeTelemetry().player.pitch < -0.9",timeout=15000)
                    page.keyboard.up('ArrowDown')
                    def place(i):
                        page.keyboard.press(str(i))
                        before=tele()['placed']
                        for _ in range(24):
                            t=tele();h=t['target'];a=t['player']
                            if h and h['previous']:
                                x,y,z=h['previous']
                                d=(x+.5-a['x'])**2+(y+.5-a['y']-.85)**2+(z+.5-a['z'])**2
                                overlap=(a['x']+.29>x and a['x']-.29<x+1 and a['y']+1.75>y and a['y']<y+1 and a['z']+.29>z and a['z']-.29<z+1)
                                if d<=9 and not overlap:
                                    page.keyboard.press('q')
                                    if tele()['placed']>before:return
                            page.keyboard.down('ArrowRight');page.wait_for_timeout(280);page.keyboard.up('ArrowRight')
                        raise AssertionError(('Could not place station',i,tele()))
                    place(4);assert count(4)==0
                    page.locator('#voxel-bag').click()
                    station(4);craft(1);craft(2)
                    assert count(5)==1 and count(7)==1 and count(3)==1,tele()
                    page.locator('#voxel-equip').click()
                    assert tele()['equipped']
                    page.locator('#voxel-bag').click()
                    place(5);assert count(5)==0
                    page.locator('#voxel-bag').click()
                    station(5);craft(3)
                    assert count(6)==2 and count(2)==2
                    page.locator('#voxel-bag').click()
                    page.locator('#voxel-save').click()
                    saved=tele()
                    page.reload()
                    page.wait_for_function("window.__gameforgeTelemetry?.().mode==='resources'",timeout=30000)
                    assert page.locator('#start').inner_text()=='Continuar mundo'
                    page.locator('#start').click()
                    assert tele()['inventory']==saved['inventory']
                    assert tele()['equipped'] and tele()['placed']==saved['placed']
                    assert not errors,errors
                    print('GF-VOXEL-02: estações físicas, receitas, consumo, ferramenta e reload aprovados')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
