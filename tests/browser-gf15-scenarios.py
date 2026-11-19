"""GF-ARCH-15: roteiro real por requisito em Chromium e exportação de evidências."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from pathlib import Path
import json, os, tempfile, zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    errors=[]
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
              args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                page=browser.new_page(viewport={'width':1100,'height':820},accept_downloads=True)
                page.on('pageerror',lambda err:errors.append(str(err)))
                page.goto(base+'/',wait_until='load')
                page.locator('#gdd').fill('# QA GF15\n## Gênero\nJogo arena 2D.\n## Requisitos\n- Movimentar personagem pelo teclado\n- Salvar progresso')
                page.locator('#instruction').fill('Melhorar movimentação do jogador; preservar salvamento')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('arena')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                page.locator('#gf15-run').evaluate("""el=>{
                    for(let p=el.parentElement;p;p=p.parentElement) if(p.tagName==='DETAILS')p.open=true;
                }""")
                page.locator('#gf15-run').click()
                page.wait_for_function("""()=>{
                    const t=document.querySelector('#gf15-summary').textContent;
                    return t.includes('cenário(s) executado(s)')||t.includes('Não foi possível concluir');
                }""",timeout=60000)
                assert 'cenário(s) executado(s)' in page.locator('#gf15-summary').inner_text(),page.locator('#gf15-summary').inner_text()
                page.locator('#file-list').get_by_text('RESULTADOS_TESTES_GF15.json',exact=True).click()
                suite=json.loads(page.locator('#file-editor').input_value())
                assert suite['version']==15 and suite['kind']=='TYPED_QA_RESULT'
                assert suite['results']
                assert {r['id'] for r in suite['results']}>={'canvas','runtime','frames','movement'}
                assert all(r['result'] in ('PASS','FAIL','INCONCLUSIVE','ERROR') for r in suite['results'])
                page.locator('#file-list').get_by_text('MATRIZ_REQUISITOS_GF14.json',exact=True).click()
                matrix=json.loads(page.locator('#file-editor').input_value())
                assert matrix['version']==14
                assert all(r['status']!='VERIFIED' for r in matrix['requirements'])
                assert any(r['category']=='persistence' and r['status']!='VERIFIED' for r in matrix['requirements'])
                with page.expect_download(timeout=30000) as d:page.locator('#export').click()
                dest=Path(tmp)/'gf15.zip';d.value.save_as(dest)
                with zipfile.ZipFile(dest) as archive:
                    for name in ['RESULTADOS_TESTES_GF15.json','RELATORIO_TESTES_GF15.md','MATRIZ_REQUISITOS_GF14.json']:
                        assert name in archive.namelist(),name
                    saved=json.loads(archive.read('RESULTADOS_TESTES_GF15.json'))
                    assert saved['codeFingerprint']==suite['codeFingerprint']
                assert not errors,errors
                print('GF15 Chromium: roteiro tipado executado, evidencia limitada, matriz e ZIP OK')
            finally:browser.close()
    finally:server.shutdown()

if __name__=='__main__': run()
