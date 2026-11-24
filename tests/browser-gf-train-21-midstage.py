"""GF-TRAIN-21: save intermediario em game exportado pelo GameForge, no Chromium real."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import json,os,tempfile

ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/'tests'/'_browser_output'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    info=json.loads((OUTPUT/'train21-midstage.json').read_text(encoding='utf-8'))
    assert info['stageCount']>=2
    slug=info['slug']
    target=OUTPUT/'_midstage_reimported'/slug
    target.mkdir(parents=True,exist_ok=True)
    with ZipFile(OUTPUT/(slug+'.zip')) as z:
        names=z.namelist()
        assert set(names)==set(info['files'])
        assert all('/' not in n and '\\' not in n and '..' not in n for n in names)
        z.extractall(target)
    for name in info['files']:
        assert (target/name).read_bytes()==(OUTPUT/slug/name).read_bytes()
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:'+str(server.server_port)+'/tests/_browser_output/_midstage_reimported/'+slug+'/index.html'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
              args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                page=browser.new_page(viewport={'width':1050,'height':780})
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(url,wait_until='load')
                page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                initial=page.evaluate("window.__gameforgeTelemetry()")
                assert not initial['midStageAvailable']
                page.locator('#start').click()
                page.wait_for_function("window.__gameforgeTelemetry().state==='play'")
                page.keyboard.down('w')
                page.wait_for_timeout(3100)
                page.keyboard.up('w')
                page.locator('#pause').click() # salvar posicao atual antes de destruir a pagina
                page.wait_for_function("window.__gameforgeTelemetry().midStageAvailable===true",timeout=10000)
                saved=page.evaluate("window.__gameforgeTelemetry()")
                assert saved['stage']==1
                assert saved['clock']>1.0
                assert saved['midStageAvailable']
                page.reload(wait_until='load')
                page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                assert 'Continuar fase 1' in page.locator('#start').inner_text()
                page.locator('#start').click()
                page.wait_for_function("window.__gameforgeTelemetry().midStageRestored===true",timeout=10000)
                restored=page.evaluate("window.__gameforgeTelemetry()")
                assert restored['stage']==saved['stage'],(saved,restored)
                assert abs(restored['clock']-saved['clock'])<.5,(saved['clock'],restored['clock'])
                assert abs(restored['player']['y']-saved['player']['y'])<12,(saved['player'],restored['player'])
                assert restored['enemies']<=saved['enemies']
                page.locator('#restart').click()
                page.wait_for_function("window.__gameforgeTelemetry().state==='play'")
                after=page.evaluate("window.__gameforgeTelemetry()")
                assert not after['midStageAvailable']
                assert not after['midStageRestored']
                assert after['clock']<.5
                assert not errors,errors
                print('GF-TRAIN-21 Chromium: checkpoint midstage, reload, continuidade e Reiniciar aprovados')
            finally:browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
