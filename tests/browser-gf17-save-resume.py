"""GF-ARCH-17 — recuperação do jogo em dois clones virtuais e em origem real de fixture."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import json,os,tempfile,zipfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory() as folder:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
             args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                errors=[]
                page=browser.new_page(viewport={'width':1100,'height':840},accept_downloads=True)
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(origin+'/',wait_until='load')
                page.locator('#gdd').fill('# Fazenda GF17\nJogo de simulação de fazenda com dois canteiros. Crescer em dois segundos, meta de dez moedas, salvar progresso e continuar depois.')
                page.locator('#instruction').fill('Crie uma fazenda com salvamento e continuação do progresso.')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('simulation')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                page.locator('#gf17-run').evaluate("""el=>{
                    for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
                }""")
                # Confirmar contrato ANTES do teste.
                contract=page.evaluate("""()=>{
                    const f=document.querySelector('#file-editor');
                    const l=document.querySelector('#file-list');
                    return GameForgeParser.parseGdd(document.querySelector('#gdd').value,
                       document.querySelector('#instruction').value,{dimension:'2d',genre:'simulation'})
                       .simulation?.persistence?.enabled;
                }""")
                assert contract is True,'O parser não ativou salvamento'
                page.wait_for_function("!document.querySelector('#gf17-run').disabled",timeout=15000)
                before=page.evaluate("""()=>({
                    html:document.querySelector('#preview').srcdoc,
                    keys:Object.keys(localStorage).filter(k=>k.startsWith('gameforge-simulation-v1-'))
                })""")
                page.locator('#gf17-run').click()
                page.wait_for_function("""()=>{
                    const x=document.querySelector('#gf17-summary').textContent;
                    return x.includes('GF-ARCH-17 —')||x.includes('Teste de restauração não concluído');
                }""",timeout=70000)
                feedback=page.locator('#gf17-summary').inner_text()
                assert 'GF-ARCH-17 — PASS' in feedback,feedback
                assert page.locator('iframe[title="Teste GameForge descartável GF16"]').count()==0
                after=page.evaluate("""()=>({
                    html:document.querySelector('#preview').srcdoc,
                    keys:Object.keys(localStorage).filter(k=>k.startsWith('gameforge-simulation-v1-'))
                })""")
                assert before==after,'A prévia ativa ou o storage real mudou'
                page.locator('#file-list').get_by_text('RESULTADOS_RESTAURACAO_GF17.json',exact=True).click()
                suite=json.loads(page.locator('#file-editor').input_value())
                assert suite['version']==17 and suite['status']=='PASS'
                assert suite['scenarios'][0]['observed']['mutatedBeforeSave']
                assert suite['scenarios'][0]['observed']['stateEqual']
                with page.expect_download(timeout=30000) as item:page.locator('#export').click()
                dest=Path(folder)/'GF17.zip';item.value.save_as(dest)
                with zipfile.ZipFile(dest) as z:
                    for name in ('RESULTADOS_RESTAURACAO_GF17.json','RELATORIO_RESTAURACAO_GF17.md'):
                        assert name in z.namelist(),name
                page.locator('#instruction').fill('Agora altere o jogo e o salvamento')
                with page.expect_download(timeout=30000) as item:page.locator('#export').click()
                dest2=Path(folder)/'GF17_after_change.zip';item.value.save_as(dest2)
                with zipfile.ZipFile(dest2) as z:
                    assert 'RESULTADOS_RESTAURACAO_GF17.json' not in z.namelist(),'Evidência obsoleta exportada'
                assert not errors,errors
                # Controle positivo com localStorage VERDADEIRO, apenas no navegador de CI.
                native=browser.new_page()
                native_errors=[]
                native.on('pageerror',lambda e:native_errors.append(str(e)))
                native.goto(origin+'/tests/_browser_output/save-farm/index.html',wait_until='load')
                native.locator('#start').click()
                native.locator('#simulation-action-start').click()
                native.locator('#simulation-save').click()
                s=native.evaluate('window.__gameforgeTelemetry().simulation')
                assert s['slots'][0] is not None
                native.reload(wait_until='load')
                native.locator('#simulation-continue').click()
                recovered=native.evaluate('window.__gameforgeTelemetry().simulation')
                assert recovered['money']==s['money']
                assert recovered['slots'][0] is not None
                assert not native_errors,native_errors
                print('GF17 Chromium: clones opacos, salvar/restaurar virtual, ZIP sem evidência obsoleta e salvamento real em fixture aprovados')
            finally:browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
