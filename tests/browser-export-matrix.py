"""GF-002: valida exports reais em Chromium, não apenas o motor isolado em VM."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json
import tempfile
import zipfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'tests' / '_browser_output'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def run():
    assert (OUTPUT / 'matrix.json').exists(), 'Execute node tools/build-browser-fixtures.cjs antes do navegador'
    matrix = json.loads((OUTPUT / 'matrix.json').read_text())
    assert len(matrix) == 15, 'Matriz de gêneros alterada: atualizar cobertura'
    screenshots = OUTPUT / 'screenshots'
    screenshots.mkdir(exist_ok=True)
    extracted = OUTPUT / '_reimported'
    extracted.mkdir(exist_ok=True)
    for item in matrix:
        destination = extracted / item['slug']
        destination.mkdir(exist_ok=True)
        with zipfile.ZipFile(OUTPUT / (item['slug'] + '.zip')) as archive:
            assert set(archive.namelist()) == set(item['files'])
            archive.extractall(destination)
        for name in item['files']:
            assert (destination / name).read_bytes() == (OUTPUT / item['slug'] / name).read_bytes(), (item['slug'], name)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    results = []
    failures = []
    with sync_playwright() as playwright, tempfile.TemporaryDirectory() as tmp:
        browser = playwright.chromium.launch(
            headless=True, args=[
                '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
                '--enable-webgl', '--disable-dev-shm-usage'
            ]
        )
        try:
            for item in matrix:
                label = item['slug']
                viewport = {'width': 390, 'height': 844} if label in ('2d-arena', '3d-fps', '3d-urban-action') else {'width': 960, 'height': 720}
                page = browser.new_page(viewport=viewport)
                page_errors = []
                remote_requests = []
                page.on('pageerror', lambda error: page_errors.append(str(error)))
                def on_request(route):
                    if not route.request.url.startswith(origin + '/'):
                        remote_requests.append(route.request.url)
                        route.abort()
                    else:
                        route.continue_()
                page.route('**/*', on_request)
                try:
                    page.goto(f"{origin}/tests/_browser_output/_reimported/{label}/index.html", wait_until='load')
                    page.wait_for_function(
                        "typeof window.__gameforgeTelemetry === 'function'", timeout=20000
                    )
                    initial = page.evaluate("window.__gameforgeTelemetry()")
                    assert initial['state'] == 'menu', (label, 'menu', initial)
                    page.locator('#start').click()
                    page.wait_for_function(
                        "window.__gameforgeTelemetry().state === 'play'", timeout=10000
                    )
                    page.keyboard.down('ArrowRight')
                    page.wait_for_timeout(180)
                    page.keyboard.up('ArrowRight')
                    active = page.evaluate("window.__gameforgeTelemetry()")
                    assert active.get('state') in ('play', 'victory', 'intermission'), (label, active)
                    assert active.get('player') and isinstance(active['player'].get('x'), (float, int)), label
                    page.locator('#pause').click()
                    page.wait_for_function(
                        "window.__gameforgeTelemetry().paused === true", timeout=5000
                    )
                    assert not page_errors, (label, page_errors)
                    assert not remote_requests, (label, remote_requests)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (label, 'rolagem horizontal')
                    results.append(label)
                    if label in ('2d-arena', '3d-fps', '3d-shooter', '3d-urban-action'):
                        page.screenshot(path=str(screenshots / (label + '.png')), full_page=True)
                except Exception as exc:
                    page.screenshot(path=str(screenshots / (label + '-failure.png')), full_page=True)
                    failures.append((label, str(exc), page_errors, remote_requests))
                finally:
                    page.close()

            # Teste da interface real: GDD -> geração -> prévia sandbox -> editar -> ZIP.
            page = browser.new_page(viewport={'width': 1366, 'height': 900}, accept_downloads=True)
            page_errors = []
            page.on('pageerror', lambda error: page_errors.append(str(error)))
            try:
                page.goto(origin + '/', wait_until='load')
                page.locator('#project-name').fill('GF-002 exportação no navegador')
                page.locator('#gdd').fill(
                    '# Projeto de teste\n## Gênero\nArena 2D de combate com inimigos.\n'
                    '## Fase 1\nEnfrentar inimigos e alcançar o objetivo.'
                )
                page.locator('.engine-disclosure > summary').click()
                page.locator('#game-dimension').select_option('2d')
                page.locator('#game-style').select_option('arena')
                page.locator('#generate').click()
                page.wait_for_function(
                    "document.querySelector('#preview').hasAttribute('srcdoc')", timeout=20000
                )
                preview = page.frame_locator('#preview')
                preview.locator('#start').wait_for(timeout=15000)
                preview.locator('#start').click()
                assert preview.locator('#game').count() == 1
                page.locator('#file-list').get_by_text('game.js', exact=True).click()
                original_code = page.locator('#file-editor').input_value()
                assert 'GAME_SPEC' in original_code
                marker = '\n// GF-002: edição preservada na exportação'
                page.locator('#file-editor').fill(original_code + marker)
                page.locator('#apply-edit').click()
                page.wait_for_function(
                    "document.querySelector('#preview').getAttribute('srcdoc').includes('GF-002: edição')",
                    timeout=20000
                )
                with page.expect_download(timeout=20000) as download:
                    page.locator('#export').click()
                bundle = Path(tmp) / 'gameforge-edited.zip'
                download.value.save_as(bundle)
                with zipfile.ZipFile(bundle) as archive:
                    assert marker in archive.read('game.js').decode('utf-8')
                    assert 'index.html' in archive.namelist()
                    assert 'style.css' in archive.namelist()
                assert not page_errors, page_errors
                page.screenshot(path=str(screenshots / 'studio-editor-preview-zip.png'), full_page=True)
                results.append('studio-editor-preview-zip')
            except Exception as exc:
                page.screenshot(path=str(screenshots / 'studio-editor-failure.png'), full_page=True)
                failures.append(('studio-editor-preview-zip', str(exc), page_errors, []))
            finally:
                page.close()
            # GDD urbano Three.js: interpretação correta, contrato, sem motor falso.
            urban_page = browser.new_page(viewport={'width': 390, 'height': 844}, accept_downloads=True)
            urban_errors = []
            urban_page.on('pageerror', lambda error: urban_errors.append(str(error)))
            try:
                urban_page.goto(origin + '/', wait_until='load')
                urban_source = (
                    '# Porto Vesper — Urban Action 3D\\n'
                    '## Gênero e câmera\\n'
                    'Ação criminal urbana 3D em terceira pessoa com câmera por trás do jogador.\\n'
                    '## Mundo e mecânicas\\n'
                    'Cidade explorável com carros, polícia, negócios, territórios, inimigos e missões.\\n'
                    '## Primeira missão\\n'
                    'Entrar no armazém, vencer guarda e capturar um negócio com renda.\\n'
                )
                urban_page.locator('#gdd').fill(urban_source)
                urban_page.locator('#analyze').click()
                assert 'ação urbana' in urban_page.locator('#analysis').inner_text().lower()
                assert urban_page.locator('#download-urban-plan').is_visible()
                assert urban_page.locator('#generate').is_disabled(), 'motor urbano não existe: botão deve bloquear geração falsa'
                with urban_page.expect_download(timeout=15000) as d:
                    urban_page.locator('#download-urban-plan').click()
                zip_path = Path(tmp) / 'urban-plan.zip'
                d.value.save_as(zip_path)
                with zipfile.ZipFile(zip_path) as archive:
                    contract = json.loads(archive.read('GAME_DESIGN_CONTRACT.json'))
                    assert contract['genre'] == 'urban-action'
                    assert contract['dimension'] == '3d'
                    assert contract['camera'] == 'third-person'
                    assert contract['engineAvailability']['status'] == 'planned'
                    assert archive.read('GDD_original.md').decode('utf-8') == urban_source
                    assert 'vertical slice' in archive.read('PLANO_URBAN_ACTION.md').decode('utf-8').lower()
                    assert 'game.js' not in archive.namelist(), 'não exportar jogo inexistente'
                assert not urban_errors, urban_errors
                results.append('urban-design-planning')
            except Exception as exc:
                urban_page.screenshot(path=str(screenshots / 'urban-design-failure.png'), full_page=True)
                failures.append(('urban-design-planning', str(exc), urban_errors, []))
            finally:
                urban_page.close()
            print(json.dumps({'passed': results, 'failed': failures}, ensure_ascii=False))
            assert not failures, f'GF-002 navegador encontrou {len(failures)} falha(s): {failures}'
            assert len(results) == 17
        finally:
            browser.close()
            server.shutdown()

if __name__ == '__main__':
    run()
