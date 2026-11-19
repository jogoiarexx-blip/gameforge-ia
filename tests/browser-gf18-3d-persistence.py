"""GF-ARCH-18: valida persistência do urbano 3D em clones reais do Studio Chromium."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import json,os,tempfile,zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def run():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=http.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{http.server_port}'
    try:
        with sync_playwright() as pw, tempfile.TemporaryDirectory() as temp:
            browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--enable-webgl'])
            try:
                page=browser.new_page(viewport={'width':1200,'height':870},accept_downloads=True)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(origin+'/',wait_until='load')
                page.locator('#gdd').fill('# GF18 — Bairro urbano 3D\nMissão: enfrente um guarda, capture o armazém e salve o progresso.')
                page.locator('#instruction').fill('Criar jogo urbano 3D com salvamento e continuação da missão.')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('3d')
                page.locator('#game-style').select_option('urban-action')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=40000)
                page.locator('#gf18-run').evaluate("""el=>{
                    for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
                }""")
                page.wait_for_function("!document.querySelector('#gf18-run').disabled",timeout=12000)
                before=page.evaluate("""()=>({
                    html:document.querySelector('#preview').srcdoc,
                    keys:Object.keys(localStorage).filter(x=>x.startsWith('gameforge-urban-v1-'))
                })""")
                page.locator('#gf18-run').click()
                page.wait_for_function("""()=>{
                    const x=document.querySelector('#gf18-summary').textContent;
                    return x.includes('GF-ARCH-18 —')||x.includes('GF18 não concluído');
                }""",timeout=85000)
                summary=page.locator('#gf18-summary').inner_text()
                assert 'GF-ARCH-18 — PASS' in summary,summary
                after=page.evaluate("""()=>({
                    html:document.querySelector('#preview').srcdoc,
                    keys:Object.keys(localStorage).filter(x=>x.startsWith('gameforge-urban-v1-'))
                })""")
                assert before==after,'O jogo do Studio ou storage real foi alterado'
                assert page.locator('iframe[title="Teste GameForge descartável GF16"]').count()==0
                page.locator('#file-list').get_by_text('RESULTADOS_3D_GF18.json',exact=True).click()
                result=json.loads(page.locator('#file-editor').input_value())
                assert result['version']==18
                assert result['contract']=='URBAN_AUTOSAVE_V1'
                assert result['status']=='PASS'
                assert result['scenario']['observed']['restoredInNewClone'] is True
                page.locator('#file-list').get_by_text('MATRIZ_REQUISITOS_GF14.json',exact=True).click()
                matrix=json.loads(page.locator('#file-editor').input_value())
                assert all(x['status']!='VERIFIED' for x in matrix['requirements'])
                with page.expect_download(timeout=25000) as d:page.locator('#export').click()
                target=Path(temp)/'GF18.zip';d.value.save_as(target)
                with zipfile.ZipFile(target) as z:
                    for key in ['RESULTADOS_3D_GF18.json','RELATORIO_3D_GF18.md']:
                        assert key in z.namelist(),key
                    assert json.loads(z.read('RESULTADOS_3D_GF18.json'))['status']=='PASS'
                page.locator('#instruction').fill('Trocar missões e modelos 3D')
                with page.expect_download(timeout=25000) as d:page.locator('#export').click()
                target2=Path(temp)/'GF18_modified.zip';d.value.save_as(target2)
                with zipfile.ZipFile(target2) as z:
                    assert 'RESULTADOS_3D_GF18.json' not in z.namelist()
                    assert 'RELATORIO_3D_GF18.md' not in z.namelist()
                assert not errors,errors
                print('GF18 Chromium: clone urbano 3D salva/recria/restaura, Studio intacto, ZIP e invalidação aprovados.')
            finally:browser.close()
    finally:http.shutdown()

if __name__=='__main__':run()
