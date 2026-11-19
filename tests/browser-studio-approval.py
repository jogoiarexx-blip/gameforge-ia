"""GF-ARCH-13: proposta, descarte, aprovação e mudança real em Chromium."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=os.environ.get('GF_CHROMIUM_PATH'), args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
            try:
                page = browser.new_page(viewport={'width':1100,'height':840}, accept_downloads=True)
                page.on('pageerror', lambda err: errors.append(str(err)))
                page.goto(origin+'/', wait_until='load')
                page.locator('#gdd').fill('# Arena de teste\n## Gênero\nArena 2D de combate com inimigos.\n## Fase 1\nDerrote os inimigos.')
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('arena')
                page.locator('#generate').click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')", timeout=30000)
                page.locator('#file-list').get_by_text('game.js', exact=True).click()
                before = page.locator('#file-editor').input_value()
                assert 'GAME_SPEC' in before
                page.locator('#dev-candidate').evaluate("(el)=>{for(let n=el.parentElement;n;n=n.parentElement){if(n.tagName==='DETAILS')n.open=true;}}")
                page.locator('#instruction').fill('Aumente a dificuldade sem alterar style.css')
                page.locator('#plan-improvement').click()
                plan=page.locator('#development-plan').inner_text()
                assert 'style.css' in plan and 'Protegidos' in plan, plan[-1200:]
                page.locator('#improve').click()
                page.locator('#dev-candidate').wait_for(state='visible',timeout=20000)
                assert page.locator('#file-editor').input_value() == before, 'Proposta gravou antes da aprovação'
                assert 'game.js' in page.locator('#dev-candidate-summary').inner_text()
                page.locator('#dev-candidate details > summary').click()
                assert 'ARQUIVO: game.js' in page.locator('#dev-candidate-diff').inner_text()
                page.locator('#dev-candidate-discard').click()
                assert page.locator('#dev-candidate').is_hidden()
                assert page.locator('#file-editor').input_value() == before, 'Descartar alterou o arquivo'
                page.locator('#improve').click()
                page.locator('#dev-candidate').wait_for(state='visible',timeout=20000)
                page.locator('#dev-candidate-accept').click()
                page.wait_for_function("(oldCode)=>document.querySelector('#file-editor').value!==oldCode",arg=before,timeout=30000)
                after=page.locator('#file-editor').input_value()
                assert after != before and 'GAME_SPEC' in after
                assert page.locator('#dev-candidate').is_hidden()
                assert not errors, errors
                print('GF-ARCH-13 Chromium: planejamento, proposta sem gravação, descarte e aprovação OK')
            finally:
                browser.close()
    finally:
        server.shutdown()

if __name__=='__main__':
    main()
