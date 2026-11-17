"""GF-002: valida exports reais em Chromium, não apenas o motor isolado em VM."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json
import os
import tempfile
import zipfile
import traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'tests' / '_browser_output'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def run():
    assert (OUTPUT / 'matrix.json').exists(), 'Execute node tools/build-browser-fixtures.cjs antes do navegador'
    matrix = json.loads((OUTPUT / 'matrix.json').read_text())
    assert len(matrix) == 16, 'Matriz de gêneros alterada: atualizar cobertura'
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
            headless=True, executable_path=os.environ.get("GF_CHROMIUM_PATH"), args=[
                '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
                '--enable-webgl', '--disable-dev-shm-usage'
            ]
        )
        try:
            for item in matrix:
                label = item['slug']
                viewport = {'width': 390, 'height': 844} if label in ('2d-simulation', '2d-arena', '3d-fps', '3d-urban-action') else {'width': 960, 'height': 720}
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
                    graphics = active.get('graphics') or {}
                    assert graphics.get('style') == 'illustrated', (label, graphics)
                    assert graphics.get('finishes', 0) > 0 if item['dimension'] == '2d' else graphics.get('scenes', 0) > 0, (label, graphics)
                    if label in ('2d-arena', '2d-platform', '2d-simulation'):
                        cache = graphics.get('cache') or {}
                        assert cache.get('entries', 0) > 0, (label, cache)
                        assert cache.get('hits', 0) > 0, (label, cache)
                        assert cache.get('bytes', 0) <= cache.get('maxBytes', 0), (label, cache)
                    assert active.get('state') in ('play', 'victory', 'intermission'), (label, active)
                    assert active.get('player') and isinstance(active['player'].get('x'), (float, int)), label
                    page.screenshot(path=str(screenshots / (label + '-gameplay.png')), full_page=True)
                    page.locator('#pause').click()
                    page.wait_for_function(
                        "window.__gameforgeTelemetry().paused === true", timeout=5000
                    )
                    if label == '2d-simulation':
                        page.wait_for_timeout(250)
                        assert page.evaluate('window.__gameforgeTelemetry().simulation.slots.every(x => x === null)')
                        page.locator('#pause').click()
                        page.get_by_role('button', name='Plantar', exact=True).click()
                        page.get_by_role('button', name='Regar', exact=True).click()
                        page.wait_for_function('window.__gameforgeTelemetry().simulation.slots.some(x => x && x.age >= 2)', timeout=6000)
                        page.get_by_role('button', name='Colher', exact=True).click()
                        assert page.evaluate('window.__gameforgeTelemetry().simulation.inventory') == 1
                        page.get_by_role('button', name='Vender colheita', exact=True).click()
                        assert page.evaluate('window.__gameforgeTelemetry().state') == 'victory'
                        assert page.evaluate('window.__gameforgeTelemetry().simulation.sales') == 1
                    if label == '3d-urban-action':
                        assert isinstance(active.get('guardWaypoints'), int), 'Motor urbano deve expor a rota do guarda'
                        assert active['guardWaypoints'] >= 0
                        # Missão jogada em Chromium: combate -> armazém -> recompensa -> reload.
                        page.locator('#restart').click()
                        page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
                        for _ in range(6):
                            if page.evaluate('window.__gameforgeTelemetry().mission.guardDefeated'):
                                break
                            page.keyboard.press('Space')
                            page.wait_for_timeout(480)
                        assert page.evaluate('window.__gameforgeTelemetry().mission.guardDefeated'), 'Guarda não é derrotável'
                        page.keyboard.down('w')
                        page.wait_for_function(
                            "window.__gameforgeTelemetry().player.z < -6", timeout=9500
                        )
                        page.keyboard.up('w')
                        page.keyboard.down('a')
                        page.wait_for_function(
                            "window.__gameforgeTelemetry().player.x < -5.3", timeout=6500
                        )
                        page.keyboard.up('a')
                        page.keyboard.press('e')
                        page.wait_for_function(
                            "window.__gameforgeTelemetry().mission.complete === true", timeout=5000
                        )
                        won = page.evaluate('window.__gameforgeTelemetry()')
                        assert won['score'] == 1450 and won['state'] == 'victory', won
                        assert won['saveEnabled'], 'Progresso deve ser salvo fora de iframe'
                        page.reload(wait_until='load')
                        page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                        page.locator('#start').click()
                        restored = page.evaluate('window.__gameforgeTelemetry()')
                        assert restored['mission']['complete'] and restored['score'] == 1450, restored
                        page.keyboard.press('e')
                        assert page.evaluate('window.__gameforgeTelemetry().score') == 1450, 'Recompensa duplicada'

                    assert not page_errors, (label, page_errors)
                    assert not remote_requests, (label, remote_requests)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (label, 'rolagem horizontal')
                    results.append(label)
                    if True:  # Galeria completa de todos os modelos
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
                assert urban_page.locator('#generate').is_enabled(), 'URB-01 é jogável e deve permitir gerar o primeiro bairro'
                with urban_page.expect_download(timeout=15000) as d:
                    urban_page.locator('#download-urban-plan').click()
                zip_path = Path(tmp) / 'urban-plan.zip'
                d.value.save_as(zip_path)
                with zipfile.ZipFile(zip_path) as archive:
                    contract = json.loads(archive.read('GAME_DESIGN_CONTRACT.json'))
                    assert contract['genre'] == 'urban-action'
                    assert contract['dimension'] == '3d'
                    assert contract['camera'] == 'third-person'
                    assert contract['engineAvailability']['status'] == 'prototype'
                    assert archive.read('GDD_original.md').decode('utf-8') == urban_source
                    assert 'vertical slice' in archive.read('PLANO_URBAN_ACTION.md').decode('utf-8').lower()
                    assert 'game.js' not in archive.namelist(), 'ZIP de planejamento não deve conter jogo misturado'
                urban_page.locator('#generate').click()
                urban_page.wait_for_function(
                    "document.querySelector('#preview').hasAttribute('srcdoc')", timeout=25000
                )
                urban_preview = urban_page.frame_locator('#preview')
                urban_preview.locator('#start').wait_for(timeout=20000)
                urban_preview.locator('#start').click()
                urban_page.locator('#file-list').get_by_text('game.js',exact=True).wait_for(timeout=15000)
                with urban_page.expect_download(timeout=20000) as game_download:
                    urban_page.locator('#export').click()
                urban_zip = Path(tmp) / 'urb-01-jogavel.zip'
                game_download.value.save_as(urban_zip)
                with zipfile.ZipFile(urban_zip) as archive:
                    assert (b'gameForgeUrban3DBoot' in archive.read('game.js') or b'gameForgeUrbanMissionBoot' in archive.read('game.js')), 'Deve exportar o motor urbano padrão ou o de missões estruturadas'
                    assert b'gameForgeUrbanRulesFactory' in archive.read('game.js')
                    assert 'engine-3d.js' in archive.namelist()
                    assert 'SLICE_URBAN_3D.md' in archive.namelist()
                    assert archive.read('GDD_original.md').decode('utf-8') == urban_source
                urban_page.screenshot(path=str(screenshots / 'urban-action-studio.png'),full_page=True)
                assert not urban_errors, urban_errors
                results.append('urban-design-slice-and-export')
            except Exception as exc:
                urban_page.screenshot(path=str(screenshots / 'urban-design-failure.png'), full_page=True)
                failures.append(('urban-design-slice-and-export', type(exc).__name__+': '+str(exc)+'\n'+traceback.format_exc(), urban_errors, []))
            finally:
                urban_page.close()
            # Missões semânticas: GDD -> grafo de ações -> ZIP -> jogo -> save.
            semantic_page = browser.new_page(viewport={'width': 1000, 'height': 750}, accept_downloads=True)
            semantic_errors = []
            semantic_page.on('pageerror', lambda error: semantic_errors.append(str(error)))
            try:
                semantic_page.goto(origin + '/', wait_until='load')
                mission_gdd = (
                    '# Porto Vesper - Campanha Urbana 3D\n'
                    'Jogo de ação criminal urbana 3D em terceira pessoa com negócios, bairros e missões.\n'
                    '## Missão 1 — Recuperar provas\n'
                    'Colete 2 provas no bairro.\n'
                    'Depois entregue 2 provas no armazém.\n'
                    'Recompensa 600.\n'
                    '## Missão 2 — Retomar o armazém\n'
                    'Capture o armazém depois de eliminar 1 guarda.\n'
                    'Recompensa 850.\n'
                )
                semantic_page.locator('#gdd').fill(mission_gdd)
                semantic_page.locator('#analyze').click()
                analysis = semantic_page.locator('#analysis').inner_text()
                assert 'Como o jogo funciona' in analysis, analysis[:1100]
                assert '2 fase(s) interpretada(s)' in analysis, analysis[:1100]
                semantic_page.locator('#generate').click()
                semantic_page.wait_for_function(
                    "document.querySelector('#preview').hasAttribute('srcdoc')", timeout=25000
                )
                with semantic_page.expect_download(timeout=20000) as d:
                    semantic_page.locator('#export').click()
                bundle = Path(tmp) / 'semantic-missions.zip'
                d.value.save_as(bundle)
                unpack = OUTPUT / '_semantic_reimported'
                unpack.mkdir(exist_ok=True)
                with zipfile.ZipFile(bundle) as archive:
                    graph = json.loads(archive.read('MODELO_ACOES.json'))
                    assert len(graph['missions']) == 2, graph
                    assert graph['missions'][0]['steps'][0]['action'] == 'collect'
                    assert graph['missions'][0]['steps'][0]['quantity'] == 2
                    assert graph['missions'][1]['steps'][0]['action'] == 'eliminate'
                    assert 'gameForgeUrbanMissionBoot' in archive.read('game.js').decode('utf-8')
                    assert 'PLANO_ACOES.md' in archive.namelist()
                    archive.extractall(unpack)
                assert not semantic_errors, semantic_errors
                game_page = browser.new_page(viewport={'width': 960, 'height': 720})
                game_errors = []
                requests = []
                game_page.on('pageerror', lambda error: game_errors.append(str(error)))
                def block_external(route):
                    if route.request.url.startswith(origin+'/'):
                        route.continue_()
                    else:
                        requests.append(route.request.url)
                        route.abort()
                game_page.route('**/*', block_external)
                try:
                    game_page.goto(origin+'/tests/_browser_output/_semantic_reimported/index.html')
                    game_page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'",timeout=18000)
                    game_page.locator('#start').click()
                    assert game_page.evaluate('window.__gameforgeTelemetry().stages') == 2
                    assert isinstance(game_page.evaluate('window.__gameforgeTelemetry().guardWaypoints'), list), 'Missões urbanas devem expor rotas por guarda'
                    assert game_page.evaluate('window.__gameforgeTelemetry().mission.step') == 'collect'
                    game_page.keyboard.down('w')
                    game_page.wait_for_function(
                        "window.__gameforgeTelemetry().mission.step === 'deliver'",timeout=6000
                    )
                    game_page.keyboard.up('w')
                    game_page.keyboard.press('e')
                    assert game_page.evaluate('window.__gameforgeTelemetry().mission.step') == 'deliver', 'Entrega não pode ocorrer longe'
                    game_page.keyboard.down('w')
                    game_page.wait_for_function("window.__gameforgeTelemetry().player.z < -6.6",timeout=8500)
                    game_page.keyboard.up('w')
                    game_page.keyboard.down('a')
                    game_page.wait_for_function("window.__gameforgeTelemetry().player.x < -5.5",timeout=6000)
                    game_page.keyboard.up('a')
                    game_page.keyboard.press('e')
                    game_page.wait_for_function("window.__gameforgeTelemetry().state === 'intermission'",timeout=5000)
                    assert game_page.evaluate('window.__gameforgeTelemetry().score') == 1600
                    game_page.reload(wait_until='load')
                    game_page.locator('#start').click()
                    game_page.wait_for_function("window.__gameforgeTelemetry().stage === 2",timeout=5000)
                    assert game_page.evaluate('window.__gameforgeTelemetry().score') == 1600
                    for _ in range(5):
                        if game_page.evaluate("window.__gameforgeTelemetry().mission.step === 'capture'"):
                            break
                        game_page.keyboard.press('Space')
                        game_page.wait_for_timeout(450)
                    assert game_page.evaluate("window.__gameforgeTelemetry().mission.step === 'capture'"), 'Segunda missão não teve combate funcional'
                    game_page.keyboard.down('w')
                    game_page.wait_for_function("window.__gameforgeTelemetry().player.z < -6.6",timeout=8500)
                    game_page.keyboard.up('w')
                    game_page.keyboard.down('a')
                    game_page.wait_for_function("window.__gameforgeTelemetry().player.x < -5.5",timeout=6000)
                    game_page.keyboard.up('a')
                    game_page.keyboard.press('e')
                    game_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'",timeout=5000)
                    assert game_page.evaluate('window.__gameforgeTelemetry().score') == 2450
                    game_page.reload(wait_until='load')
                    assert game_page.evaluate('window.__gameforgeTelemetry().score') == 2450
                    assert not game_errors, game_errors
                    assert not requests, requests
                    game_page.screenshot(path=str(screenshots/'urban-semantic-campaign.png'),full_page=True)
                finally:
                    game_page.close()
                results.append('urban-semantic-two-missions')
            except Exception as exc:
                semantic_page.screenshot(path=str(screenshots/'urban-semantic-failure.png'),full_page=True)
                failures.append(('urban-semantic-two-missions',str(exc)+'\n'+traceback.format_exc(),semantic_errors,[]))
            finally:
                semantic_page.close()

            graphics_matrix = json.loads((OUTPUT / 'graphics-matrix.json').read_text())
            for item in graphics_matrix:
                page = browser.new_page(viewport={'width': 960, 'height': 720})
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(f"{origin}/tests/_browser_output/{item['slug']}/index.html", wait_until='load')
                    page.locator('#start').click()
                    page.wait_for_function('window.__gameforgeTelemetry().frames >= 8')
                    info = page.evaluate('window.__gameforgeTelemetry().graphics')
                    assert info['style'] == item['style'], info
                    assert info['effectiveQuality'] == 'high', info
                    if item['style'] == 'pixel':
                        assert page.evaluate("getComputedStyle(document.getElementById('game')).imageRendering") == 'pixelated'
                    assert info['finishes'] > 0 if item['dimension'] == '2d' else info['materials'] > 0, info
                    assert not errors, errors
                    page.screenshot(path=str(screenshots / (item['slug'] + '.png')), full_page=True)
                    results.append(item['slug'])
                except Exception as exc:
                    failures.append((item['slug'], str(exc), errors, []))
                finally:
                    page.close()

            # Cuidado real por tanque, interrupção/retomada e venda com valor por idade.
            care_page = browser.new_page(viewport={'width': 390, 'height': 844})
            care_errors = []
            care_page.on('pageerror', lambda error: care_errors.append(str(error)))
            try:
                care_page.goto(origin + '/tests/_browser_output/aquarium-care/index.html', wait_until='load')
                care_page.locator('#start').click()
                care_page.get_by_role('button', name='Comprar peixe', exact=True).click()
                care_page.get_by_role('button', name='Alimentar', exact=True).click()
                care_page.locator('[data-control="right"]').click()
                care_page.get_by_role('button', name='Comprar peixe', exact=True).click()
                care_page.locator('[data-control="left"]').click()
                care_page.wait_for_function('window.__gameforgeTelemetry().simulation.tanks[0].water === 0', timeout=12000)
                frozen = care_page.evaluate('window.__gameforgeTelemetry().simulation')
                assert abs(frozen['slots'][0]['age'] - 5) < 1e-6, frozen
                assert frozen['slots'][1]['age'] == 0, frozen
                assert frozen['slots'][1]['satiety'] == 0, frozen
                care_page.locator('#pause').click()
                paused_care = care_page.evaluate('window.__gameforgeTelemetry().simulation')
                care_page.wait_for_timeout(350)
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation') == paused_care
                care_page.locator('#simulation-save').click()
                assert 'Salvo' in care_page.locator('#simulation-save-status').inner_text()
                saved_care = care_page.evaluate('window.__gameforgeTelemetry().simulation')
                care_page.reload(wait_until='load')
                care_page.wait_for_timeout(400)
                assert care_page.evaluate('window.__gameforgeTelemetry().state') == 'menu'
                care_page.locator('#simulation-continue').click()
                restored_care = care_page.evaluate('window.__gameforgeTelemetry().simulation')
                assert restored_care['money'] == saved_care['money']
                assert restored_care['sales'] == saved_care['sales']
                assert restored_care['slots'] == saved_care['slots'], (restored_care, saved_care)
                care_page.get_by_role('button', name='Alimentar' , exact=True).click()
                care_page.get_by_role('button', name='Trocar água', exact=True).click()
                care_page.wait_for_function('window.__gameforgeTelemetry().simulation.slots[0].age >= 6', timeout=6000)
                active_care = care_page.evaluate('window.__gameforgeTelemetry()')
                assert active_care['selected']['value'] >= 12, active_care
                assert active_care['simulation']['slots'][1]['age'] == 0
                assert 'Saciedade' in care_page.locator('#mission').inner_text()
                assert care_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                care_page.screenshot(path=str(screenshots / 'aquarium-care-mobile.png'), full_page=True)
                care_page.get_by_role('button', name='Vender peixe', exact=True).click()
                care_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'")
                sold = care_page.evaluate('window.__gameforgeTelemetry().simulation')
                care_page.keyboard.press('3')
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation') == sold
                assert sold['sales'] == 1 and sold['slots'][0] is None
                care_page.reload(wait_until='load')
                care_page.locator('#simulation-continue').click()
                assert care_page.evaluate('window.__gameforgeTelemetry().state') == 'victory'
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation') == sold
                care_page.locator('#restart').click()
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation.sales') == 0
                care_page.reload(wait_until='load')
                care_page.locator('#simulation-continue').click()
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation.sales') == 0
                assert not care_errors, care_errors
                results.append('aquarium-care-mobile')
            except Exception as exc:
                failures.append(('aquarium-care-mobile', str(exc), care_errors, []))
            finally:
                care_page.close()

            for domain in ['farm', 'shop']:
                page = browser.new_page(viewport={'width': 960, 'height': 720})
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(origin + '/tests/_browser_output/save-' + domain + '/index.html', wait_until='load')
                    page.locator('#start').click()
                    page.keyboard.press('1')
                    page.keyboard.press('2')
                    page.wait_for_function('window.__gameforgeTelemetry().simulation.slots[0].age >= 2')
                    page.keyboard.press('3')
                    before = page.evaluate('window.__gameforgeTelemetry().simulation')
                    page.reload(wait_until='load')
                    page.locator('#simulation-continue').click()
                    assert page.evaluate('window.__gameforgeTelemetry().simulation') == before
                    if domain == 'farm':
                        assert before['inventory'] == 1
                        page.keyboard.press('4')
                    else:
                        assert before['complete']
                    page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'")
                    won = page.evaluate('window.__gameforgeTelemetry().simulation')
                    page.reload(wait_until='load')
                    page.locator('#simulation-continue').click()
                    page.keyboard.press('4')
                    assert page.evaluate('window.__gameforgeTelemetry().simulation') == won
                    page.screenshot(path=str(screenshots / ('save-' + domain + '.png')), full_page=True)
                    assert not errors, errors
                    results.append('save-' + domain)
                except Exception as exc:
                    failures.append(('save-' + domain, str(exc), errors, []))
                finally:
                    page.close()

            print(json.dumps({'passed': results, 'failed': failures}, ensure_ascii=False))
            assert not failures, f'GF-002 navegador encontrou {len(failures)} falha(s): {failures}'
            assert len(results) == len(matrix) + 6 + len(graphics_matrix)
        finally:
            browser.close()
            server.shutdown()

if __name__ == '__main__':
    run()
