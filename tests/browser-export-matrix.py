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
                    assert info['shadows'] == item['shadows'], info
                    assert info['particles'] == item['particles'], info
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
                assert care_page.evaluate('window.__gameforgeTelemetry().simulation.slots.length') == 2
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
                    assert page.evaluate('window.__gameforgeTelemetry().simulation.slots.length') == 2
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

            for domain in ['aquarium', 'farm', 'shop']:
                page = browser.new_page(viewport={'width': 390, 'height': 844})
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(origin + '/tests/_browser_output/automation-' + domain + '/index.html', wait_until='load')
                    page.locator('#start').click()
                    page.wait_for_function('window.__gameforgeTelemetry().simulation.automation.actions > 0')
                    page.locator('#pause').click()
                    frozen = page.evaluate('window.__gameforgeTelemetry().simulation')
                    page.wait_for_timeout(250)
                    assert page.evaluate('window.__gameforgeTelemetry().simulation') == frozen
                    page.locator('#simulation-automation').click()
                    assert page.evaluate('window.__gameforgeTelemetry().simulation.automation.paused')
                    page.reload(wait_until='load')
                    page.locator('#simulation-continue').click()
                    assert page.evaluate('window.__gameforgeTelemetry().simulation.automation.paused')
                    actions = page.evaluate('window.__gameforgeTelemetry().simulation.automation.actions')
                    page.wait_for_timeout(300)
                    assert page.evaluate('window.__gameforgeTelemetry().simulation.automation.actions') == actions
                    page.locator('#simulation-automation').click()
                    assert not page.evaluate('window.__gameforgeTelemetry().simulation.automation.paused')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    page.screenshot(path=str(screenshots / ('automation-' + domain + '.png')), full_page=True)
                    page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'", timeout=8000)
                    won = page.evaluate('window.__gameforgeTelemetry().simulation')
                    assert won['sales'] == 1 and won['money'] >= 0
                    page.reload(wait_until='load')
                    page.locator('#simulation-continue').click()
                    assert page.evaluate('window.__gameforgeTelemetry().state') == 'victory'
                    assert page.evaluate('window.__gameforgeTelemetry().simulation') == won
                    assert not errors, errors
                    results.append('automation-' + domain)
                except Exception as exc:
                    failures.append(('automation-' + domain, str(exc), errors, []))
                finally:
                    page.close()

            # GF-TRAIN-12: navegação real 2D no Chromium móvel, compra, cuidado, save e vitória.
            free_page = browser.new_page(viewport={'width': 390, 'height': 844})
            free_errors = []
            free_page.on('pageerror', lambda error: free_errors.append(str(error)))
            try:
                free_page.goto(origin + '/tests/_browser_output/free-aquarium/index.html', wait_until='load')
                free_page.locator('#start').click()
                assert free_page.evaluate("window.__gameforgeTelemetry().exploration.mode") == 'free'
                free_page.keyboard.press('1')
                assert free_page.evaluate("window.__gameforgeTelemetry().simulation.slots[0]") is None
                free_page.keyboard.down('ArrowRight')
                free_page.wait_for_timeout(1250)
                free_page.keyboard.up('ArrowRight')
                free_page.keyboard.down('ArrowUp')
                free_page.wait_for_timeout(1750)
                free_page.keyboard.up('ArrowUp')
                free_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=3000)
                free_page.keyboard.press('e')
                assert free_page.evaluate("window.__gameforgeTelemetry().exploration.actionsOpen")
                free_page.get_by_role('button', name='Comprar peixe', exact=True).click()
                free_page.get_by_role('button', name='Alimentar', exact=True).click()
                assert free_page.evaluate("window.__gameforgeTelemetry().simulation.slots[0].cared")
                free_page.locator('#simulation-save').click()
                saved_position = free_page.evaluate('window.__gameforgeTelemetry().player')
                free_page.reload(wait_until='load')
                free_page.locator('#simulation-continue').click()
                restored_position = free_page.evaluate('window.__gameforgeTelemetry().player')
                assert abs(restored_position['x'] - saved_position['x']) < 0.01
                assert abs(restored_position['y'] - saved_position['y']) < 0.01
                assert not free_page.evaluate("window.__gameforgeTelemetry().exploration.actionsOpen")
                free_page.keyboard.press('e')
                free_page.wait_for_function('window.__gameforgeTelemetry().simulation.slots[0].age >= 2', timeout=7000)
                free_page.get_by_role('button', name='Vender peixe', exact=True).click()
                free_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'")
                assert free_page.evaluate('window.__gameforgeTelemetry().simulation.sales') == 1
                assert free_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                free_page.screenshot(path=str(screenshots / 'free-aquarium-mobile.png'), full_page=True)
                assert not free_errors, free_errors
                results.append('free-aquarium-mobile')
            except Exception as exc:
                failures.append(('free-aquarium-mobile', str(exc), free_errors, []))
            finally:
                free_page.close()

            # GF-TRAIN-13: conversa real com NPC, missão, recompensa única e save no Chromium móvel.
            story_page = browser.new_page(viewport={'width': 390, 'height': 844})
            story_errors = []
            story_page.on('pageerror', lambda error: story_errors.append(str(error)))
            try:
                story_page.goto(origin + '/tests/_browser_output/story-aquarium/index.html', wait_until='load')
                story_page.locator('#start').click()
                assert story_page.evaluate("window.__gameforgeTelemetry().story.event") == 'talk'
                story_page.keyboard.press('1')
                assert story_page.evaluate("window.__gameforgeTelemetry().simulation.slots[0]") is None
                story_page.keyboard.down('ArrowRight')
                story_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=8000)
                story_page.keyboard.up('ArrowRight')
                balance = story_page.evaluate("window.__gameforgeTelemetry().simulation.money")
                story_page.keyboard.press('e')
                assert story_page.evaluate("window.__gameforgeTelemetry().story.event") == 'finish'
                assert story_page.evaluate("window.__gameforgeTelemetry().simulation.money") == balance
                story_page.locator('#simulation-save').click()
                prior = story_page.evaluate("window.__gameforgeTelemetry().simulation.story")
                position = story_page.evaluate("window.__gameforgeTelemetry().player")
                story_page.reload(wait_until='load')
                story_page.locator('#simulation-continue').click()
                assert story_page.evaluate("window.__gameforgeTelemetry().simulation.story") == prior
                restored = story_page.evaluate("window.__gameforgeTelemetry().player")
                assert abs(position['x'] - restored['x']) < 0.01
                assert abs(position['y'] - restored['y']) < 0.01
                story_page.keyboard.down('ArrowLeft')
                story_page.wait_for_function("window.__gameforgeTelemetry().player.x < 320", timeout=7000)
                story_page.keyboard.up('ArrowLeft')
                story_page.keyboard.down('ArrowUp')
                story_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=6000)
                story_page.keyboard.up('ArrowUp')
                story_page.keyboard.press('e')
                assert story_page.evaluate("window.__gameforgeTelemetry().exploration.actionsOpen")
                story_page.keyboard.press('1')
                story_page.keyboard.press('2')
                story_page.wait_for_function("window.__gameforgeTelemetry().simulation.slots[0].age >= 2", timeout=6500)
                story_page.keyboard.press('3')
                story_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'", timeout=3000)
                won = story_page.evaluate("window.__gameforgeTelemetry().simulation")
                assert won['story']['rewards'] == 5 and won['story']['completed']
                assert won['sales'] == 1
                story_page.keyboard.press('3')
                assert story_page.evaluate("window.__gameforgeTelemetry().simulation") == won
                story_page.reload(wait_until='load')
                story_page.locator('#simulation-continue').click()
                assert story_page.evaluate("window.__gameforgeTelemetry().simulation") == won
                assert story_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                story_page.screenshot(path=str(screenshots / 'story-aquarium-mobile.png'), full_page=True)
                assert not story_errors, story_errors
                results.append('story-aquarium-mobile')
            except Exception as exc:
                failures.append(('story-aquarium-mobile', str(exc), story_errors, []))
            finally:
                story_page.close()

            # GF-TRAIN-14: escolha de ramo no NPC e checkpoint da missão em Chromium móvel.
            branch_page = browser.new_page(viewport={'width': 390, 'height': 844})
            branch_errors = []
            branch_page.on('pageerror', lambda error: branch_errors.append(str(error)))
            try:
                branch_page.goto(origin + '/tests/_browser_output/branch-aquarium/index.html', wait_until='load')
                branch_page.locator('#start').click()
                assert branch_page.evaluate("window.__gameforgeTelemetry().simulation.story.choice") is None
                branch_page.keyboard.press('6')
                assert branch_page.evaluate("window.__gameforgeTelemetry().simulation.story.choice") is None
                branch_page.keyboard.down('ArrowRight')
                branch_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=9000)
                branch_page.keyboard.up('ArrowRight')
                branch_page.keyboard.press('e')
                assert branch_page.evaluate("window.__gameforgeTelemetry().story.event") == 'choice'
                branch_page.locator('#simulation-choice-2').click()
                assert branch_page.evaluate("window.__gameforgeTelemetry().simulation.story.choice") == 'b'
                assert branch_page.evaluate("window.__gameforgeTelemetry().story.event") == 'finish'
                branch_page.locator('#simulation-save').click()
                before_branch = branch_page.evaluate("window.__gameforgeTelemetry().simulation.story")
                branch_page.reload(wait_until='load')
                branch_page.locator('#simulation-continue').click()
                assert branch_page.evaluate("window.__gameforgeTelemetry().simulation.story") == before_branch
                branch_page.keyboard.down('ArrowLeft')
                branch_page.wait_for_function("window.__gameforgeTelemetry().player.x < 320", timeout=7000)
                branch_page.keyboard.up('ArrowLeft')
                branch_page.keyboard.down('ArrowUp')
                branch_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=6000)
                branch_page.keyboard.up('ArrowUp')
                branch_page.keyboard.press('e')
                assert branch_page.evaluate("window.__gameforgeTelemetry().exploration.actionsOpen")
                branch_page.keyboard.press('1')
                branch_page.keyboard.press('2')
                branch_page.wait_for_function('window.__gameforgeTelemetry().simulation.slots[0].age >= 2', timeout=7000)
                branch_page.keyboard.press('3')
                branch_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'", timeout=3000)
                completed = branch_page.evaluate("window.__gameforgeTelemetry().simulation")
                assert completed['story']['rewards'] == 8 and completed['story']['completed']
                assert completed['story']['choice'] == 'b' and completed['sales'] == 1
                branch_page.reload(wait_until='load')
                branch_page.locator('#simulation-continue').click()
                assert branch_page.evaluate("window.__gameforgeTelemetry().simulation") == completed
                assert branch_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                branch_page.screenshot(path=str(screenshots / 'branch-aquarium-mobile.png'), full_page=True)
                assert not branch_errors, branch_errors
                results.append('branch-aquarium-mobile')
            except Exception as exc:
                failures.append(('branch-aquarium-mobile', str(exc), branch_errors, []))
            finally:
                branch_page.close()

            # GF-TRAIN-14: patrulha no Chromium, pausa e save da localização do NPC.
            patrol_page = browser.new_page(viewport={'width': 390, 'height': 844})
            patrol_errors = []
            patrol_page.on('pageerror', lambda error: patrol_errors.append(str(error)))
            try:
                patrol_page.goto(origin + '/tests/_browser_output/patrol-aquarium/index.html', wait_until='load')
                patrol_page.locator('#start').click()
                first = patrol_page.evaluate("window.__gameforgeTelemetry().exploration.guide.x")
                patrol_page.wait_for_function("(x) => Math.abs(window.__gameforgeTelemetry().exploration.guide.x - x) > 5", arg=first, timeout=4000)
                moving = patrol_page.evaluate("window.__gameforgeTelemetry().exploration.guide")
                assert 810 <= moving['x'] <= 885
                patrol_page.locator('#pause').click()
                frozen = patrol_page.evaluate("window.__gameforgeTelemetry().exploration.guide")
                patrol_page.wait_for_timeout(350)
                assert patrol_page.evaluate("window.__gameforgeTelemetry().exploration.guide") == frozen, 'NPC deve congelar após a pausa'
                patrol_page.locator('#simulation-save').click()
                patrol_page.reload(wait_until='load')
                patrol_page.locator('#simulation-continue').click()
                restored = patrol_page.evaluate("window.__gameforgeTelemetry().exploration.guide")
                assert abs(restored['x'] - frozen['x']) <= 3, (restored, frozen)
                assert restored['dir'] == frozen['dir'], (restored, frozen)
                patrol_page.wait_for_function("(x) => Math.abs(window.__gameforgeTelemetry().exploration.guide.x - x) > 3", arg=frozen['x'], timeout=4000)
                assert not patrol_errors, patrol_errors
                patrol_page.screenshot(path=str(screenshots / 'patrol-aquarium-mobile.png'), full_page=True)
                results.append('patrol-aquarium-mobile')
            except Exception as exc:
                failures.append(('patrol-aquarium-mobile', str(exc), patrol_errors, []))
            finally:
                patrol_page.close()

            # GF-TRAIN-15: NPC1 -> produção -> NPC2 -> save -> estoque+tempo -> vitória.
            chain_page = browser.new_page(viewport={'width': 390, 'height': 844})
            chain_errors = []
            chain_page.on('pageerror', lambda error: chain_errors.append(str(error)))
            try:
                chain_page.goto(origin + '/tests/_browser_output/chain-aquarium/index.html', wait_until='load')
                chain_page.locator('#start').click()
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.story.missionIndex === 0", timeout=3500)
                chain_page.wait_for_function("window.__gameforgeTelemetry().exploration.guide2 !== null", timeout=3500)
                chain_page.keyboard.down('ArrowRight')
                chain_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=9000)
                chain_page.keyboard.up('ArrowRight')
                chain_page.keyboard.press('e')
                chain_page.wait_for_function("window.__gameforgeTelemetry().story.event === 'start'", timeout=3500)
                chain_page.keyboard.down('ArrowLeft')
                chain_page.wait_for_function("window.__gameforgeTelemetry().player.x < 240", timeout=8000)
                chain_page.keyboard.up('ArrowLeft')
                chain_page.keyboard.down('ArrowUp')
                chain_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=7000)
                chain_page.keyboard.up('ArrowUp')
                chain_page.keyboard.press('e')
                chain_page.keyboard.press('1')
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.story.missionIndex === 1", timeout=3500)
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.story.rewards === 3", timeout=3500)
                chain_page.keyboard.down('ArrowDown')
                chain_page.wait_for_function("window.__gameforgeTelemetry().player.y > 475", timeout=8000)
                chain_page.keyboard.up('ArrowDown')
                chain_page.keyboard.down('ArrowRight')
                chain_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide-2'", timeout=7000)
                chain_page.keyboard.up('ArrowRight')
                chain_page.keyboard.press('e')
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.story.npcTalks[1] === 1", timeout=3500)
                chain_page.wait_for_function("window.__gameforgeTelemetry().story.event === 'finish'", timeout=3500)
                chain_page.locator('#simulation-save').click()
                saved = chain_page.evaluate("window.__gameforgeTelemetry().simulation.story")
                chain_page.reload(wait_until='load')
                chain_page.locator('#simulation-continue').click()
                chain_page.wait_for_function("(s)=>JSON.stringify(window.__gameforgeTelemetry().simulation.story)===JSON.stringify(s)", arg=saved, timeout=3500)
                chain_page.keyboard.down('ArrowLeft')
                chain_page.wait_for_function("window.__gameforgeTelemetry().player.x < 240", timeout=7000)
                chain_page.keyboard.up('ArrowLeft')
                chain_page.keyboard.down('ArrowUp')
                chain_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=7000)
                chain_page.keyboard.up('ArrowUp')
                chain_page.keyboard.press('e')
                chain_page.keyboard.press('2')
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.slots[0].age >= 2", timeout=7000)
                chain_page.wait_for_function("window.__gameforgeTelemetry().simulation.story.elapsed >= 3", timeout=6000)
                chain_page.keyboard.press('3')
                chain_page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'", timeout=4000)
                won = chain_page.evaluate("window.__gameforgeTelemetry().simulation")
                assert won['story']['missionIndex'] == 2 and won['story']['completed']
                assert won['story']['rewards'] == 10 and won['sales'] == 1
                assert won['story']['npcTalks'] == [1, 1]
                chain_page.reload(wait_until='load')
                chain_page.locator('#simulation-continue').click()
                chain_page.wait_for_function("(s)=>JSON.stringify(window.__gameforgeTelemetry().simulation)===JSON.stringify(s)", arg=won, timeout=3500)
                assert chain_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), chain_page.evaluate('({scrollWidth:document.documentElement.scrollWidth, innerWidth})')
                chain_page.screenshot(path=str(screenshots / 'chain-aquarium-mobile.png'), full_page=True)
                assert not chain_errors, chain_errors
                results.append('chain-aquarium-mobile')
            except Exception as exc:
                failures.append(('chain-aquarium-mobile', traceback.format_exc(limit=5), chain_errors, []))
            finally:
                chain_page.close()

            # GF-TRAIN-16: editor visual real, sem código ou perda do GDD.
            editor_page = browser.new_page(viewport={'width': 390, 'height': 844})
            editor_errors = []
            editor_page.on('pageerror', lambda error: editor_errors.append(str(error)))
            try:
                editor_page.goto(origin + '/index.html', wait_until='load')
                before_gdd = editor_page.locator('#gdd').input_value()
                editor_page.locator('#quest-editor > summary').click()
                editor_page.locator('#qe-domain').select_option('shop')
                editor_page.locator('#qe-total').select_option('4')
                assert editor_page.locator('#qe-rows fieldset').count() == 4
                editor_page.locator('#qe-action-0-1').select_option('start')
                editor_page.locator('#qe-preview').click()
                assert 'duas ações diferentes' in editor_page.locator('#qe-result').inner_text()
                editor_page.locator('#qe-action-0-1').select_option('care')
                editor_page.locator('#qe-count-0-0').fill('2')
                editor_page.locator('#qe-stock-1').fill('1')
                editor_page.locator('#qe-time-2').fill('3')
                editor_page.locator('#qe-preview').click()
                preview_text = editor_page.locator('#qe-command').input_value()
                assert '4 missões encadeadas' in preview_text and 'Missão 1: repor 2 e atender 1' in preview_text
                editor_page.locator('#qe-apply').click()
                assert editor_page.locator('#gdd').input_value() == before_gdd
                assert preview_text in editor_page.locator('#instruction').input_value()
                assert editor_page.evaluate("""() => {
                    const c = GameForgeParser.parseGdd('',document.getElementById('instruction').value).simulation;
                    return c.story.version===4&&c.story.missions.length===4&&c.story.missions[1].requires.some(r=>r.kind==='stock')&&c.story.missions[2].requires.some(r=>r.kind==='time');
                }""")
                assert not editor_errors, editor_errors
                editor_page.screenshot(path=str(screenshots / 'quest-editor-mobile.png'), full_page=True)
                results.append('quest-editor-mobile')
            except Exception as exc:
                failures.append(('quest-editor-mobile', str(exc), editor_errors, []))
            finally:
                editor_page.close()

            # GF-TRAIN-16: missão paralela jogável, etapa 2 e continuação em aparelho móvel.
            parallel_page = browser.new_page(viewport={'width': 390, 'height': 844})
            parallel_errors = []
            parallel_page.on('pageerror', lambda error: parallel_errors.append(str(error)))
            try:
                parallel_page.goto(origin + '/tests/_browser_output/parallel-aquarium/index.html', wait_until='load')
                parallel_page.locator('#start').click()
                assert parallel_page.evaluate("window.__gameforgeTelemetry().story.total") == 3
                assert parallel_page.evaluate("window.__gameforgeTelemetry().exploration.guide2") is not None
                parallel_page.keyboard.down('ArrowRight')
                parallel_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=9000)
                parallel_page.keyboard.up('ArrowRight')
                parallel_page.keyboard.press('e')
                assert parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story.started")
                parallel_page.keyboard.down('ArrowLeft')
                parallel_page.wait_for_function("window.__gameforgeTelemetry().player.x < 240", timeout=8000)
                parallel_page.keyboard.up('ArrowLeft')
                parallel_page.keyboard.down('ArrowUp')
                parallel_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=7000)
                parallel_page.keyboard.up('ArrowUp')
                parallel_page.keyboard.press('e')
                parallel_page.keyboard.press('1')
                assert parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story.progress") == [1, 0]
                parallel_page.keyboard.press('2')
                assert parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story.missionIndex") == 1
                assert parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story.rewards") == 3
                parallel_page.locator('#simulation-save').click()
                saved_state = parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story")
                parallel_page.reload(wait_until='load')
                parallel_page.locator('#simulation-continue').click()
                assert parallel_page.evaluate("window.__gameforgeTelemetry().simulation.story") == saved_state
                assert parallel_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                assert not parallel_errors, parallel_errors
                parallel_page.screenshot(path=str(screenshots / 'parallel-aquarium-mobile.png'), full_page=True)
                results.append('parallel-aquarium-mobile')
            except Exception as exc:
                failures.append(('parallel-aquarium-mobile', str(exc), parallel_errors, []))
            finally:
                parallel_page.close()

            # GF-TRAIN-17: dependência, kit utilizável e save no jogo v5 exportado.
            reward_page = browser.new_page(viewport={'width': 390, 'height': 844})
            reward_errors = []
            reward_page.on('pageerror', lambda error: reward_errors.append(str(error)))
            try:
                reward_page.goto(origin + '/tests/_browser_output/reward-aquarium/index.html', wait_until='load')
                reward_page.locator('#start').click()
                assert reward_page.evaluate('window.__gameforgeTelemetry().simulation.story.itemsEarned') == 0
                reward_page.keyboard.down('ArrowRight')
                reward_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=9000)
                reward_page.keyboard.up('ArrowRight')
                reward_page.keyboard.press('e')
                assert reward_page.evaluate("window.__gameforgeTelemetry().story.objectives[1].locked")
                reward_page.keyboard.down('ArrowLeft')
                reward_page.wait_for_function("window.__gameforgeTelemetry().player.x < 240", timeout=8000)
                reward_page.keyboard.up('ArrowLeft')
                reward_page.keyboard.down('ArrowUp')
                reward_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=7000)
                reward_page.keyboard.up('ArrowUp')
                reward_page.keyboard.press('e')
                reward_page.keyboard.press('1')
                assert not reward_page.evaluate("window.__gameforgeTelemetry().story.objectives[1].locked")
                reward_page.keyboard.press('2')
                reward_page.wait_for_function("window.__gameforgeTelemetry().simulation.kits === 2", timeout=4000)
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.story.itemsEarned") == 2
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.story.missionIndex") == 1
                reward_page.locator('#simulation-save').click()
                reward_page.reload(wait_until='load')
                reward_page.locator('#simulation-continue').click()
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.kits") == 2
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.story.itemsEarned") == 2
                reward_page.keyboard.down('ArrowRight')
                reward_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'station-1'", timeout=8500)
                reward_page.keyboard.up('ArrowRight')
                reward_page.keyboard.press('e')
                before_money = reward_page.evaluate("window.__gameforgeTelemetry().simulation.money")
                reward_page.keyboard.press('1')
                reward_page.wait_for_function("window.__gameforgeTelemetry().simulation.kits === 1", timeout=3500)
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.money") == before_money
                assert reward_page.evaluate("window.__gameforgeTelemetry().simulation.kitsUsed") == 1
                assert 'Kits: 1' in reward_page.locator('#ammo').inner_text()
                assert not reward_errors, reward_errors
                reward_page.screenshot(path=str(screenshots / 'reward-aquarium-mobile.png'), full_page=True)
                results.append('reward-aquarium-mobile')
            except Exception:
                failures.append(('reward-aquarium-mobile', traceback.format_exc(limit=5), reward_errors, []))
            finally:
                reward_page.close()

            # GF-TRAIN-17: construir, carregar e atualizar missões de projeto já gerado sem substituir GDD.
            edit_page = browser.new_page(viewport={'width': 390, 'height': 844})
            edit_errors = []
            edit_page.on('pageerror', lambda error: edit_errors.append(str(error)))
            edit_page.on('dialog', lambda dialog: dialog.accept())
            try:
                edit_page.goto(origin + '/index.html', wait_until='load')
                edit_page.locator('#gdd').fill('')
                before_gdd = edit_page.locator('#gdd').input_value()
                edit_page.locator('#quest-editor > summary').click()
                edit_page.locator('#qe-after-0').check()
                edit_page.locator('#qe-kits-0').fill('2')
                edit_page.locator('#qe-apply').click()
                assert edit_page.evaluate("""() => GameForgeParser.parseGdd('',document.getElementById('instruction').value).simulation.story.version===5""")
                edit_page.locator('#generate').click()
                edit_page.wait_for_function("document.getElementById('rerun') && !document.getElementById('rerun').disabled", timeout=17000)
                edit_page.locator('#qe-load').click()
                assert edit_page.locator('#qe-after-0').is_checked()
                assert edit_page.locator('#qe-kits-0').input_value() == '2'
                edit_page.locator('#qe-kits-0').fill('3')
                edit_page.locator('#qe-count-0-0').fill('2')
                edit_page.locator('#qe-save').click()
                assert 'Missões aplicadas' in edit_page.locator('#qe-result').inner_text()
                edit_page.locator('#file-list .file-item').filter(has_text='game.js').first.click()
                assert edit_page.evaluate("""() => {
                  const text=document.getElementById('file-editor').value;
                  const spec=GameForgeQuestEditor.extractGenerated({'game.js':text}).spec;
                  return spec.simulation.story.missions[0].itemReward===3 &&
                    spec.simulation.story.missions[0].objectives[0].count===2;
                }""")
                assert edit_page.locator('#gdd').input_value() == before_gdd
                assert not edit_errors, edit_errors
                edit_page.screenshot(path=str(screenshots / 'quest-edit-existing-mobile.png'), full_page=True)
                results.append('quest-edit-existing-mobile')
            except Exception:
                failures.append(('quest-edit-existing-mobile', traceback.format_exc(limit=5), edit_errors, []))
            finally:
                edit_page.close()

            # GF-TRAIN-18: missões em paralelo ficam bloqueadas até os pré-requisitos, boosts são reais.
            graph_page = browser.new_page(viewport={'width': 390, 'height': 844})
            graph_errors = []
            graph_page.on('pageerror', lambda error: graph_errors.append(str(error)))
            try:
                graph_page.goto(origin + '/tests/_browser_output/graph-aquarium/index.html', wait_until='load')
                graph_page.locator('#start').click()
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.activeMission") == -1
                assert graph_page.evaluate("window.__gameforgeTelemetry().story.available") == [0]
                graph_page.keyboard.down('ArrowRight')
                graph_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide'", timeout=9500)
                graph_page.keyboard.up('ArrowRight')
                graph_page.keyboard.press('e')
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.activeMission") == 0
                graph_page.keyboard.down('ArrowLeft')
                graph_page.wait_for_function("window.__gameforgeTelemetry().player.x < 240", timeout=8000)
                graph_page.keyboard.up('ArrowLeft')
                graph_page.keyboard.down('ArrowUp')
                graph_page.wait_for_function("window.__gameforgeTelemetry().exploration.near", timeout=7000)
                graph_page.keyboard.up('ArrowUp')
                graph_page.keyboard.press('e')
                graph_page.keyboard.press('1')
                graph_page.keyboard.press('2')
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.missionDone") == [True, False, False, False]
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.items.boost") == 2
                assert graph_page.evaluate("window.__gameforgeTelemetry().story.available.sort()") == [1, 2]
                graph_page.locator('#simulation-save').click()
                graph_page.reload(wait_until='load')
                graph_page.locator('#simulation-continue').click()
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.items.boost") == 2
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.missionDone[0]")
                graph_page.keyboard.down('ArrowDown')
                graph_page.wait_for_function("window.__gameforgeTelemetry().player.y > 475", timeout=8000)
                graph_page.keyboard.up('ArrowDown')
                graph_page.keyboard.down('ArrowRight')
                graph_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'guide-2'", timeout=7500)
                graph_page.keyboard.up('ArrowRight')
                graph_page.keyboard.press('e')
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.activeMission") == 1
                graph_page.keyboard.down('ArrowLeft')
                graph_page.wait_for_function("window.__gameforgeTelemetry().player.x < 575", timeout=7500)
                graph_page.keyboard.up('ArrowLeft')
                graph_page.keyboard.down('ArrowUp')
                graph_page.wait_for_function("window.__gameforgeTelemetry().exploration.nearby === 'station-1'", timeout=8500)
                graph_page.keyboard.up('ArrowUp')
                graph_page.keyboard.press('e')
                graph_page.keyboard.press('1')
                graph_page.keyboard.press('2')
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.itemsUsed.boost") == 1
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.items.boost") == 1
                assert graph_page.evaluate("window.__gameforgeTelemetry().simulation.story.missionDone") == [True, True, False, False]
                assert graph_page.evaluate("window.__gameforgeTelemetry().story.available") == [2]
                assert 'Aceleradores: 1' in graph_page.locator('#ammo').inner_text()
                assert not graph_errors, graph_errors
                graph_page.screenshot(path=str(screenshots / 'graph-aquarium-mobile.png'), full_page=True)
                results.append('graph-aquarium-mobile')
            except Exception:
                failures.append(('graph-aquarium-mobile', traceback.format_exc(limit=5), graph_errors, []))
            finally:
                graph_page.close()

            # GF-TRAIN-18: no Studio, configurar grafo e autorizar migração futura sem recriar código.
            graph_editor = browser.new_page(viewport={'width': 390, 'height': 844})
            editor18_errors = []
            graph_editor.on('pageerror', lambda error: editor18_errors.append(str(error)))
            graph_editor.on('dialog', lambda dialog: dialog.accept())
            try:
                graph_editor.goto(origin + '/index.html', wait_until='load')
                graph_editor.locator('#gdd').fill('')
                graph_editor.locator('#quest-editor > summary').click()
                graph_editor.locator('#qe-graph').check()
                graph_editor.locator('#qe-total').select_option('4')
                graph_editor.locator('#qe-boost-0').fill('2')
                graph_editor.locator('#qe-dep-3-1').check()
                graph_editor.locator('#qe-dep-3-2').check()
                graph_editor.locator('#qe-kits-1').fill('1')
                graph_editor.locator('#qe-apply').click()
                assert graph_editor.evaluate("GameForgeParser.parseGdd('',document.getElementById('instruction').value).simulation.story.version") == 6
                graph_editor.locator('#generate').click()
                graph_editor.wait_for_function("document.getElementById('rerun') && !document.getElementById('rerun').disabled", timeout=17000)
                graph_editor.locator('#qe-load').click()
                assert graph_editor.locator('#qe-graph').is_checked()
                assert graph_editor.locator('#qe-boost-0').input_value() == '2'
                assert graph_editor.locator('#qe-dep-3-2').is_checked()
                graph_editor.locator('#qe-count-3-0').fill('2')
                graph_editor.locator('#qe-migrate').check()
                graph_editor.locator('#qe-save').click()
                assert 'Migração autorizada' in graph_editor.locator('#qe-result').inner_text()
                graph_editor.locator('#file-list .file-item').filter(has_text='game.js').first.click()
                assert graph_editor.evaluate("""() => {
                  const c=GameForgeQuestEditor.extractGenerated({'game.js':document.getElementById('file-editor').value}).spec.simulation;
                  return c.story.version===6 && c.story.missions[3].objectives[0].count===2 &&
                    c.saveMigration.version===1 && c.saveMigration.previous.story.missions[3].objectives[0].count===1;
                }""")
                assert not editor18_errors, editor18_errors
                graph_editor.screenshot(path=str(screenshots / 'quest-graph-editor-mobile.png'), full_page=True)
                results.append('quest-graph-editor-mobile')
            except Exception:
                failures.append(('quest-graph-editor-mobile', traceback.format_exc(limit=5), editor18_errors, []))
            finally:
                graph_editor.close()

            # GF-SNES-01: HTML real com mapas por chunks, câmera, controles e edição.
            for snes_genre in ['platform', 'rpg']:
                label = 'snes2d-' + snes_genre + '-mobile'
                snes_page = browser.new_page(viewport={'width': 390, 'height': 844})
                snes_errors, snes_remote = [], []
                snes_page.on('pageerror', lambda error: snes_errors.append(str(error)))
                def on_snes_request(route):
                    if route.request.url.startswith(origin + '/'):
                        route.continue_()
                    else:
                        snes_remote.append(route.request.url)
                        route.abort()
                snes_page.route('**/*', on_snes_request)
                try:
                    snes_page.goto(origin + '/tests/_browser_output/snes2d-' + snes_genre + '/index.html', wait_until='load')
                    snes_page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                    assert snes_page.evaluate("window.__gameforgeTelemetry().engine") == 'snes2d'
                    assert snes_page.evaluate("window.__gameforgeTelemetry().map.chunks") == (4 if snes_genre == 'platform' else 6)
                    snes_page.locator('#start').click()
                    assert snes_page.evaluate("window.__gameforgeTelemetry().state") == 'play'
                    initial = snes_page.evaluate("window.__gameforgeTelemetry().player.x")
                    snes_page.keyboard.down('ArrowRight')
                    snes_page.wait_for_function("(base) => window.__gameforgeTelemetry().player.x > base+24", arg=initial, timeout=5500)
                    snes_page.keyboard.up('ArrowRight')
                    assert snes_page.evaluate("window.__gameforgeTelemetry().map.dirtyDraws") > 0
                    assert snes_page.evaluate("window.__gameforgeTelemetry().map.cacheHits") > 0
                    snes_page.keyboard.press('t')
                    assert snes_page.evaluate("window.__gameforgeTelemetry().edited")
                    original = snes_page.evaluate("window.__gameforgeSNES2D.getTile('collision',96,160)")
                    assert snes_page.evaluate("""() => window.__gameforgeSNES2D.setTile('collision',96,160,
                        window.__gameforgeSNES2D.getTile('collision',96,160)?0:1)""")
                    assert snes_page.evaluate("window.__gameforgeSNES2D.getTile('collision',96,160)") != original
                    snes_page.keyboard.press('t')
                    snes_page.locator('#pause').click()
                    assert snes_page.evaluate("window.__gameforgeTelemetry().paused")
                    snes_page.locator('#pause').click()
                    assert not snes_page.evaluate("window.__gameforgeTelemetry().paused")
                    assert not snes_errors, snes_errors
                    assert not snes_remote, snes_remote
                    snes_page.screenshot(path=str(screenshots / (label + '.png')), full_page=True)
                    results.append(label)
                except Exception:
                    failures.append((label, traceback.format_exc(limit=6), snes_errors, snes_remote))
                finally:
                    snes_page.close()

            # GF-SNES-01: escolha manual do motor e geração no próprio Studio móvel.
            studio_snes = browser.new_page(viewport={'width': 390, 'height': 844})
            snes_studio_errors = []
            studio_snes.on('pageerror', lambda error: snes_studio_errors.append(str(error)))
            try:
                studio_snes.goto(origin + '/index.html', wait_until='load')
                studio_snes.locator('#gdd').fill('# Bosque das Quatro Torres\\n\\n## Fase 1 - Bosque\\nUm jogo de plataforma 2D.')
                studio_snes.locator('.engine-disclosure > summary').click()
                studio_snes.locator('#game-dimension').select_option('2d')
                studio_snes.locator('#game-style').select_option('platform')
                studio_snes.locator('#game-engine-mode').select_option('snes2d')
                assert studio_snes.evaluate("""() => {
                   const s=GameForgeParser.parseGdd(document.getElementById('gdd').value,
                     document.getElementById('instruction').value,{
                     dimension:'2d',genre:'platform',engineMode:document.getElementById('game-engine-mode').value
                   });return s.engineMode==='snes2d' && s.snes2d.version===1;
                }""")
                studio_snes.locator('#generate').click()
                studio_snes.wait_for_function("document.getElementById('rerun') && !document.getElementById('rerun').disabled", timeout=17000)
                studio_snes.locator('#file-list .file-item').filter(has_text='SNES2D_CONTRATO.json').first.click()
                assert '"snes2d"' in studio_snes.locator('#file-editor').input_value()
                assert not snes_studio_errors, snes_studio_errors
                studio_snes.screenshot(path=str(screenshots / 'snes2d-studio-mobile.png'), full_page=True)
                results.append('snes2d-studio-mobile')
            except Exception:
                failures.append(('snes2d-studio-mobile', traceback.format_exc(limit=6), snes_studio_errors, []))
            finally:
                studio_snes.close()

            # GF-SNES-02: editor visual real no Studio, undo/redo, importação PNG/atlas e aplicação em game.js.
            gf_snes2_page = browser.new_page(viewport={'width': 390, 'height': 844})
            snes2_errors = []
            gf_snes2_page.on('pageerror', lambda error: snes2_errors.append(str(error)))
            try:
                import base64
                gf_snes2_page.goto(origin + '/index.html', wait_until='load')
                gf_snes2_page.locator('#gdd').fill('# Labirinto SNES 2D\n\n## Fase 1 - Bosque\nJogo de plataforma com inimigos.')
                gf_snes2_page.locator('.engine-disclosure > summary').click()
                gf_snes2_page.locator('#game-dimension').select_option('2d')
                gf_snes2_page.locator('#game-style').select_option('platform')
                gf_snes2_page.locator('#game-engine-mode').select_option('snes2d')
                gf_snes2_page.locator('#generate').click()
                gf_snes2_page.wait_for_function("document.getElementById('rerun') && !document.getElementById('rerun').disabled", timeout=17000)
                gf_snes2_page.locator('#sn2-editor > summary').click()
                gf_snes2_page.locator('#sn2-load').click()
                assert 'Mapa aberto' in gf_snes2_page.locator('#sn2-result').inner_text()
                assert 'chunk 1,1' in gf_snes2_page.locator('#sn2-metrics').inner_text()
                gf_snes2_page.locator('#sn2-layer').select_option('collision')
                gf_snes2_page.locator('#sn2-tile').select_option('1')
                canvas = gf_snes2_page.locator('#sn2-canvas')
                box = canvas.bounding_box()
                assert box is not None and box['width'] > 100
                canvas.click(position={'x': 96/512*box['width'], 'y': 96/288*box['height']})
                assert '1 modificações' in gf_snes2_page.locator('#sn2-metrics').inner_text()
                gf_snes2_page.locator('#sn2-undo').click()
                assert '0 modificações' in gf_snes2_page.locator('#sn2-metrics').inner_text()
                gf_snes2_page.locator('#sn2-redo').click()
                assert '1 modificações' in gf_snes2_page.locator('#sn2-metrics').inner_text()
                gf_snes2_page.locator('#sn2-apply').click()
                assert 'atualizados' in gf_snes2_page.locator('#sn2-result').inner_text()
                gf_snes2_page.locator('#file-list .file-item').filter(has_text='SNES2D_MAPAS.json').first.click()
                assert '"collision"' in gf_snes2_page.locator('#file-editor').input_value()
                # A imagem é gerada inteiramente no navegador; não depende de serviços externos.
                sheet = gf_snes2_page.evaluate("""() => {
                  const c=document.createElement('canvas');c.width=c.height=64;
                  const x=c.getContext('2d');x.fillStyle='#44adcc';x.fillRect(0,0,64,64);
                  x.fillStyle='#ffc483';for(let y=0;y<4;y++)for(let i=0;i<4;i++)x.fillRect(i*16+4,y*16+1,8,8);
                  return c.toDataURL('image/png');
                }""")
                gf_snes2_page.locator('#sn2-player-image').set_input_files({
                    'name':'hero.png','mimeType':'image/png','buffer':base64.b64decode(sheet.split(',',1)[1])
                })
                frames = {f'f{y}_{x}':{'x':x*16,'y':y*16,'w':16,'h':16} for y in range(4) for x in range(4)}
                animations = {name:{'fps':8,'frames':[f'f{i}_{x}' for x in range(4)]}
                              for i,name in enumerate(['idle','walk','attack','hurt'])}
                animations['attack']['hitboxes']=[{'frame':1,'x':12,'y':3,'w':5,'h':9}]
                atlas = json.dumps({'frames':frames,'animations':animations}).encode()
                gf_snes2_page.locator('#sn2-player-atlas').set_input_files({
                    'name':'atlas.json','mimeType':'application/json','buffer':atlas
                })
                gf_snes2_page.locator('#sn2-sprite-import').click()
                gf_snes2_page.wait_for_function("document.getElementById('sn2-result').textContent.includes('Spritesheets importadas')", timeout=12000)
                gf_snes2_page.locator('#sn2-apply').click()
                assert 'atualizados' in gf_snes2_page.locator('#sn2-result').inner_text()
                gf_snes2_page.locator('#file-list .file-item').filter(has_text='SNES2D_ATLAS.json').first.click()
                assert '"player"' in gf_snes2_page.locator('#file-editor').input_value()
                gf_snes2_page.locator('#file-list .file-item').filter(has_text='game.js').first.click()
                assert gf_snes2_page.evaluate("""() => {
                  const source=document.getElementById('file-editor').value;
                  const data=GameForgeSNES2DEditor.extractGenerated({'game.js':source});
                  return data.spec.snes2d.maps.stages[0].length===1 &&
                    data.spec.snes2d.sprites.player.width===64 &&
                    source.includes('const GameForgeSNES2DAnimator = ');
                }""")
                assert not snes2_errors, snes2_errors
                gf_snes2_page.screenshot(path=str(screenshots / 'snes2d-editor-atlas-mobile.png'),full_page=True)
                results.append('snes2d-editor-atlas-mobile')
            except Exception:
                failures.append(('snes2d-editor-atlas-mobile', traceback.format_exc(limit=6), snes2_errors, []))
            finally:
                gf_snes2_page.close()

            print(json.dumps({'passed': results, 'failed': failures}, ensure_ascii=False))
            assert not failures, f'GF-002 navegador encontrou {len(failures)} falha(s): {failures}'
            assert len(results) == len(matrix) + 24 + len(graphics_matrix)
        finally:
            browser.close()
            server.shutdown()

if __name__ == '__main__':
    run()
