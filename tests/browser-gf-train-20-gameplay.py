"""GF-TRAIN-20: testar games EXPORTADOS (ZIP) em Chromium, não somente GAME_SPEC.

Recupera conceitos da antiga GF-TRAIN-04 sem integrar engines/branches obsoletos.
Seis motores reais: teclado, relógio, pausa, retomada, reinício, ZIP íntegro,
e ausência de dependência de rede. Três cenários gerados de pedidos PT-BR:
sobrevivência real, loja compra real e tiro do shooter 3D.
Um smoke de toque virtual em viewport móvel não substitui aparelho físico.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
import json,math,os,re,traceback
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/'tests'/'_browser_output'
BASE=[('2d-platform','ArrowRight',True),
      ('2d-arena','ArrowRight',True),
      ('3d-arena','ArrowRight',True),
      ('3d-fps','ArrowRight',True),
      ('3d-shooter','ArrowRight',True),
      ('3d-racing','ArrowUp',False)]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def read_zip(slug,files):
    destination=OUTPUT/'_train20_unpacked'/slug
    destination.mkdir(parents=True,exist_ok=True)
    with ZipFile(OUTPUT/(slug+'.zip')) as z:
        entries=z.namelist()
        assert set(entries)==set(files),(slug,'ZIP diferente da exportacao original',entries)
        assert all(not name.startswith(('/','\\')) and
          '..' not in Path(name).parts and '\\' not in name for name in entries)
        z.extractall(destination)
    for name in files:
        assert (destination/name).read_bytes()==(OUTPUT/slug/name).read_bytes(),(slug,name)
    return destination

def tele(page):
    return page.evaluate('window.__gameforgeTelemetry()')

def boot(page,base,slug):
    page.goto(base+'/tests/_browser_output/_train20_unpacked/'+slug+'/index.html',wait_until='load')
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'",timeout=20000)
    assert tele(page)['state']=='menu',(slug,'not menu',tele(page))
    page.locator('#start').click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'",timeout=12000)
    return tele(page)

def run():
    matrix=json.loads((OUTPUT/'matrix.json').read_text(encoding='utf-8'))
    catalog={m['slug']:m for m in matrix}
    extra=json.loads((OUTPUT/'gameplay-train20.json').read_text(encoding='utf-8'))
    assert len(matrix)==16 and len(extra)==3
    for slug,_,_ in BASE:
        assert slug in catalog,slug
        read_zip(slug,catalog[slug]['files'])
    for test in extra:read_zip(test['slug'],test['files'])
    screenshots=OUTPUT/'screenshots';screenshots.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    passed,failed=[],[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
          args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
        try:
            for slug,key,expect_move in BASE:
                page=browser.new_page(viewport={'width':960,'height':720})
                exceptions,external=[],[]
                page.on('pageerror',lambda e:exceptions.append(str(e)))
                def block(route):
                    if not route.request.url.startswith(base+'/'):
                        external.append(route.request.url);route.abort()
                    else:route.continue_()
                page.route('**/*',block)
                try:
                    before=boot(page,base,slug)
                    assert isinstance(before.get('clock'),(int,float)),(slug,before)
                    page.keyboard.down(key)
                    page.wait_for_timeout(440)
                    page.keyboard.up(key)
                    moved=tele(page)
                    assert moved['state']=='play',(slug,'state after movement',moved)
                    assert moved['clock']>before['clock']+.11,(slug,'simulation not ticking',moved)
                    assert all(math.isfinite(moved['player'][v]) for v in ('x','y')),(slug,'coordinates',moved)
                    if expect_move:
                        delta=abs(moved['player']['x']-before['player']['x'])
                        assert delta>.3,(slug,'no movement despite input',delta)
                    else:
                        assert moved['clock']>0.2,(slug,'racing clock stopped')
                    page.locator('#pause').click()
                    page.wait_for_function("window.__gameforgeTelemetry().paused === true",timeout=5000)
                    frozen=tele(page)
                    page.wait_for_timeout(300)
                    still=tele(page)
                    assert abs(still['clock']-frozen['clock'])<.045,(slug,'clock not frozen')
                    assert still['frames']>frozen['frames'],(slug,'rendering frozen during pause')
                    page.locator('#pause').click()
                    page.wait_for_function("window.__gameforgeTelemetry().paused === false",timeout=5000)
                    page.wait_for_timeout(230)
                    resumed=tele(page)
                    assert resumed['clock']>still['clock']+.07,(slug,'resume broken')
                    page.locator('#restart').click()
                    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'",timeout=5000)
                    restarted=tele(page)
                    assert restarted['clock']<resumed['clock'],(slug,'restart did not reset')
                    assert not exceptions,(slug,'JS errors',exceptions)
                    assert not external,(slug,'network not offline',external)
                    passed.append({'slug':slug,'checks':['zip-integrity','boot','movement',
                      'simulation-clock','pause-freeze','render-while-paused','resume','restart',
                      'js-errors','local-only']})
                except Exception:
                    page.screenshot(path=str(screenshots/(slug+'-gftrain20-fail.png')),full_page=True)
                    failed.append({'slug':slug,'error':traceback.format_exc(),'pageerrors':exceptions,'network':external})
                finally:page.close()
            for item in extra:
                slug=item['slug']
                page=browser.new_page(viewport={'width':960,'height':720})
                exceptions=[]
                page.on('pageerror',lambda e:exceptions.append(str(e)))
                try:
                    initial=boot(page,base,slug)
                    if slug=='train20-arena-survive':
                        assert initial['missionMode']=='survive' and initial['missionReady'] is False
                        page.wait_for_function("window.__gameforgeTelemetry().missionReady === true",timeout=13500)
                        done=tele(page)
                        assert done['surviveRemaining']==0,(slug,done)
                        assert done['state']=='play',(slug,done['state'])
                        checks=['boot','survival-5-real-seconds','mission-ready']
                    elif slug=='train20-fps-store':
                        assert initial['combatEconomy'] and initial['combatEconomy']['credits']>=30
                        page.keyboard.press('b')
                        page.wait_for_function("window.__gameforgeTelemetry().combatEconomy?.shopOpen === true",timeout=6000)
                        shop=tele(page)['combatEconomy']
                        page.get_by_role('dialog',name='Loja de combate').get_by_role('button',name=re.compile('Comprar 40 balas')).click()
                        bought=tele(page)['combatEconomy']
                        assert bought['credits']<shop['credits'],(slug,'credits unchanged',shop,bought)
                        assert bought['reserve']>shop['reserve'],(slug,'ammo not delivered',shop,bought)
                        page.keyboard.press('b')
                        page.wait_for_function("window.__gameforgeTelemetry().combatEconomy?.shopOpen === false",timeout=6000)
                        checks=['boot','store-opens','actual-ammo-purchase','credits-debit','store-closes']
                    elif slug=='train20-shooter-boss':
                        assert initial['stages']==3 and initial['stage']==1,(slug,initial)
                        page.keyboard.down('Space')
                        page.wait_for_timeout(310)
                        firing=tele(page)
                        page.keyboard.up('Space')
                        assert firing['playerBullets']>=1,(slug,'not firing',firing)
                        checks=['boot','three-stages','projectile-spawn']
                    else:raise AssertionError('Unrecognized GF-TRAIN-20 scenario: '+slug)
                    assert not exceptions,(slug,exceptions)
                    passed.append({'slug':slug,'checks':checks})
                except Exception:
                    page.screenshot(path=str(screenshots/(slug+'-gftrain20-fail.png')),full_page=True)
                    failed.append({'slug':slug,'error':traceback.format_exc(),'pageerrors':exceptions})
                finally:page.close()
            # Browser emulado com touch: valida eventos pointer nos botões exportados,
            # sem alegar que houve teste em smartphone físico.
            for slug in ['2d-platform','3d-arena']:
                page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                try:
                    before=boot(page,base,slug)
                    button=page.locator('[data-control="right"]').first
                    box=button.bounding_box()
                    assert box and box['width']>0 and box['height']>0,(slug,'mobile control not visible')
                    x=box['x']+box['width']/2
                    y=box['y']+box['height']/2
                    # CDP gera um touchStart/touchEnd real no Chromium, com pointerId ativo.
                    # Evita eventos sintéticos que fazem setPointerCapture lançar NotFoundError.
                    cdp=page.context.new_cdp_session(page)
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart',
                        'touchPoints':[{'x':x,'y':y,'id':27,'radiusX':2,'radiusY':2}]})
                    page.wait_for_timeout(470)
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    after=tele(page)
                    assert after['state']=='play'
                    assert abs(after['player']['x']-before['player']['x'])>.3,(slug,'touch not moving',before,after)
                    assert not errors,(slug,errors)
                    passed.append({'slug':'mobile-'+slug,'checks':['viewport-390','pointer-touch','motion']})
                except Exception:
                    page.screenshot(path=str(screenshots/(slug+'-mobile-gftrain20-fail.png')),full_page=True)
                    failed.append({'slug':'mobile-'+slug,'error':traceback.format_exc(),'pageerrors':errors})
                finally:page.close()
        finally:browser.close()
    server.shutdown()
    report={'version':20,'kind':'REAL_EXPORTED_GAMEPLAY','passed':passed,'failed':failed,
      'coverage':['keyboard','browser-touch-emulation','ZIP','offline','pause','resume',
        'restart','3D-survival','FPS-store-buy','shooter-projectiles'],
      'limits':'Não mede FPS em celulares reais; não valida chefão derrotado, checkpoints no meio da fase, multiplayer ou animações GLB.'}
    (OUTPUT/'gameplay-train20-results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print('GF-TRAIN-20: '+str(len(passed))+'/11 cenários reais em Chromium')
    for item in failed:print('FALHA',item['slug'],item['error'][-2500:])
    assert not failed, str(len(failed))+' falhas na bateria GF-TRAIN-20'
    assert len(passed)==11,'Matriz de gameplay foi reduzida sem atualizar aceite'
if __name__=='__main__':run()
