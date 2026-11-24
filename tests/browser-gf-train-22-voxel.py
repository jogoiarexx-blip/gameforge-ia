"""GF-TRAIN-22: editor GameForge detecta pedido voxel, relata lacunas e exporta diagnostico.
O export continua usando motor existente; nao afirma criar sandbox voxel jogavel.
"""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from zipfile import ZipFile
import json,os,tempfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin='http://127.0.0.1:'+str(server.server_port)
    try:
        with sync_playwright() as p,tempfile.TemporaryDirectory() as tmp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
                      '--enable-webgl','--disable-dev-shm-usage'])
            try:
                page=browser.new_page(viewport={'width':1150,'height':850},accept_downloads=True)
                js_errors=[]
                page.on('pageerror',lambda e:js_errors.append(str(e)))
                page.goto(origin+'/',wait_until='load')
                gdd='# Mundo voxel de teste\n## Início\nQuero um mundo voxel com chunks, forno, bancada e bússola para voltar pra casa.'
                page.locator('#gdd').fill(gdd)
                page.locator('#instruction').fill('Salvar progresso e ter P2P com amigo; controles para celular.')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('3d')
                page.locator('#game-style').select_option('rpg')
                page.locator('#analyze').click()
                page.locator('.voxel-training-disclosure > summary').click()
                report=page.locator('#voxel-training-report').inner_text()
                assert 'GF-TRAIN-22' in report,report
                assert 'Bancada, forno e receitas' in report
                assert 'Bússola e navegação' in report
                assert 'Streaming leve' in report
                assert 'Cooperação P2P' in report
                assert 'pendente' in report
                assert 'não foi criado um motor voxel completo' in report.lower()
                # As máquinas e o P2P não viram recursos já existentes no motor RPG.
                assert page.evaluate('window.GameForgeVoxelTraining?.isVoxel?.("Minecraft","")') is True
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                with page.expect_download(timeout=30000) as dl:
                    page.locator('#export').click()
                dst=Path(tmp)/'gameforge-prismal-training.zip'
                dl.value.save_as(dst)
                with ZipFile(dst) as z:
                    files=z.namelist()
                    assert 'TREINAMENTO_VOXEL_GF22.json' in files,files
                    assert 'DIAGNOSTICO_VOXEL_GF22.md' in files,files
                    audit=json.loads(z.read('TREINAMENTO_VOXEL_GF22.json'))
                    assert audit['version']==22
                    byid={x['id']:x for x in audit['items']}
                    assert byid['craft-stations']['status']=='prototipo'
                    assert byid['waypoint']['status']=='prototipo'
                    assert byid['coop-p2p']['status']=='pendente'
                    assert byid['world-save']['status']=='pendente'
                    text=z.read('DIAGNOSTICO_VOXEL_GF22.md').decode('utf-8')
                    assert 'não foi criado um motor voxel completo' in text.lower()
                    assert 'P2P' in text
                    assert 'game.js' in files
                assert not js_errors,js_errors
                print('GF-TRAIN-22: Studio, avisos de pendencias e ZIP de treino voxel validados em Chromium')
            finally:browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
