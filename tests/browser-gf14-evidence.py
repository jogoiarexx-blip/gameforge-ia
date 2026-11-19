"""GF-ARCH-14: geração, interface e exportação da matriz em Chromium."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
from pathlib import Path
import json, os, tempfile, zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    failures=[]
    try:
        with sync_playwright() as pw, tempfile.TemporaryDirectory() as temp:
            browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
              args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
            try:
                page=browser.new_page(viewport={'width':1100,'height':820},accept_downloads=True)
                page.on('pageerror',lambda e:failures.append(str(e)))
                page.goto(origin+'/',wait_until='load')
                page.locator('#gdd').fill('# Auditoria GF14\n## Gênero\nArena 2D com inimigos.\n## Requisitos\n- Permitir movimentação por teclado\n- Salvar progresso.')
                page.locator('#instruction').fill('Melhore a movimentação do personagem e o salvamento.')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('arena')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                page.wait_for_function("document.querySelector('#file-list').textContent.includes('MATRIZ_REQUISITOS_GF14.json')",timeout=15000)
                page.locator('#file-list').get_by_text('MATRIZ_REQUISITOS_GF14.json',exact=True).click()
                m=json.loads(page.locator('#file-editor').input_value())
                assert m['version']==14
                assert m['requirements']
                assert all(r['status'] in ('UNVERIFIED','UNSUPPORTED') for r in m['requirements'])
                page.locator('#gf14-inspect').evaluate("""el=>{
                   for(let p=el.parentElement;p;p=p.parentElement){if(p.tagName==='DETAILS')p.open=true;}
                }""")
                page.locator('#gf14-inspect').click()
                assert 'requisito' in page.locator('#gf14-summary').inner_text().lower()
                with page.expect_download(timeout=30000) as d:page.locator('#export').click()
                out=Path(temp)/'gf14.zip';d.value.save_as(out)
                with zipfile.ZipFile(out) as z:
                    for name in ['MAPA_CODIGO_GF14.json','MATRIZ_REQUISITOS_GF14.json','RELATORIO_REQUISITOS_GF14.md']:
                        assert name in z.namelist(), name
                    assert json.loads(z.read('MATRIZ_REQUISITOS_GF14.json'))['version']==14
                assert not failures, failures
                print('GF-ARCH-14 Chromium: matriz, painel, backup e ZIP validados')
            finally:browser.close()
    finally:server.shutdown()

if __name__=='__main__': main()
