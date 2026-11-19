"""GF-ARCH-16 — integrações reais no Chromium para QA em prévia descartável."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import json,os,tempfile,zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    errors=[]
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory() as temp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
              args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
            try:
                page=browser.new_page(viewport={'width':1100,'height':820},accept_downloads=True)
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/',wait_until='load')
                page.locator('#gdd').fill('# QA descartável GF16\n## Gênero\nArena 2D com chefe e inimigos.\n## Requisitos\n- Inimigos patrulham o cenário\n- Chefe com vida\n- Missão termina ao vencer a fase\n- Guardar checkpoint')
                page.locator('#instruction').fill('Verifique os inimigos, chefe, missões e salvamento de checkpoints')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('arena')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                page.locator('#gf16-run').evaluate("""el=>{
                    for(let q=el.parentElement;q;q=q.parentElement)
                        if(q.tagName==='DETAILS')q.open=true;
                }""")
                before=page.evaluate("""async()=>{
                    const frame=document.querySelector('#preview'),t=GameForgeVisualQA.transport(frame);
                    try{
                        await t.send('ping');
                        const s=await t.send('inspect');
                        return {srcdocLength:frame.srcdoc.length,state:s.telemetry?.state,
                                hasSandbox:frame.getAttribute('sandbox')};
                    }finally{t.close();}
                }""")
                page.locator('#gf16-run').click()
                page.wait_for_function("""()=>{
                    const t=document.querySelector('#gf16-summary').textContent;
                    return t.includes('prévia descartável encerrada')||t.includes('Teste avançado não concluído');
                }""",timeout=90000)
                msg=page.locator('#gf16-summary').inner_text()
                assert 'prévia descartável encerrada' in msg,msg
                assert page.locator('iframe[title="Teste GameForge descartável GF16"]').count()==0
                after=page.evaluate("""async()=>{
                    const frame=document.querySelector('#preview'),t=GameForgeVisualQA.transport(frame);
                    try{
                        const s=await t.send('inspect');
                        return {srcdocLength:frame.srcdoc.length,state:s.telemetry?.state,
                                hasSandbox:frame.getAttribute('sandbox')};
                    }finally{t.close();}
                }""")
                assert before==after,(before,after)
                page.locator('#file-list').get_by_text('RESULTADOS_AVANCADOS_GF16.json',exact=True).click()
                suite=json.loads(page.locator('#file-editor').input_value())
                assert suite['version']==16 and suite['kind']=='ISOLATED_ADVANCED_QA_RESULT'
                assert suite['isolated'] is True
                assert suite['originPolicy']=='sandbox=allow-scripts (no allow-same-origin)'
                assert suite['results'] and {x['id'] for x in suite['results']}>={'enemy','boss','mission','save'}
                assert all(x['result'] in ('PASS','FAIL','INCONCLUSIVE') for x in suite['results'])
                page.locator('#file-list').get_by_text('MATRIZ_REQUISITOS_GF14.json',exact=True).click()
                matrix=json.loads(page.locator('#file-editor').input_value())
                assert all(x['status']!='VERIFIED' for x in matrix['requirements'])
                with page.expect_download(timeout=30000) as download:page.locator('#export').click()
                output=Path(temp)/'gf16.zip';download.value.save_as(output)
                with zipfile.ZipFile(output) as archive:
                    for fname in ['RESULTADOS_AVANCADOS_GF16.json','RELATORIO_AVANCADO_GF16.md','MATRIZ_REQUISITOS_GF14.json']:
                        assert fname in archive.namelist(),fname
                    saved=json.loads(archive.read('RESULTADOS_AVANCADOS_GF16.json'))
                    assert saved['codeFingerprint']==suite['codeFingerprint']
                # Stale-run evidence must not survive changed user requirements.
                page.locator('#instruction').fill('Agora o objetivo é criar um jogo diferente')
                with page.expect_download(timeout=30000) as d:page.locator('#export').click()
                second=Path(temp)/'stale.zip';d.value.save_as(second)
                with zipfile.ZipFile(second) as z:
                    assert 'RESULTADOS_AVANCADOS_GF16.json' not in z.namelist()
                    assert 'RELATORIO_AVANCADO_GF16.md' not in z.namelist()
                assert not errors,errors
                print('GF16: iframe independente fechado; partida intacta, evidências válidas e expiração no ZIP conferidas')
            finally:browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
