"""GF-OPEN-02b — GLB no editor 3D: IndexedDB, paleta, fases, ZIP e backup."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import json, struct, tempfile, os

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def minimal_glb():
    doc={"asset":{"version":"2.0"},"buffers":[{"byteLength":36}],
         "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":36}],
         "accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3","min":[0,0,0],"max":[1,1,0]}],
         "meshes":[{"primitives":[{"attributes":{"POSITION":0},"mode":4}]}],
         "nodes":[{"mesh":0}],"scenes":[{"nodes":[0]}],"scene":0}
    b=json.dumps(doc,separators=(',',':')).encode('utf-8')
    b+=b' '*((-len(b))%4)
    vertices=struct.pack('<9f',0,0,0,1,0,0,0,1,0)
    return struct.pack('<III',0x46546c67,2,12+8+len(b)+8+len(vertices))+struct.pack('<II',len(b),0x4e4f534a)+b+struct.pack('<II',len(vertices),0x004e4942)+vertices

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin='http://127.0.0.1:'+str(server.server_port)
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory() as folder:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                ctx=browser.new_context(viewport={'width':1150,'height':870},accept_downloads=True)
                errors=[]
                studio=ctx.new_page()
                studio.on('pageerror',lambda e:errors.append('studio '+str(e)))
                studio.goto(origin+'/',wait_until='load')
                studio.locator('#gdd').fill('# GF-OPEN-02b\nJogo de arena 3D com 2 fases.\n## Fase 1 — Campo\nDerrote inimigos.\n## Fase 2 — Templo\nEncontre o portal.')
                studio.locator('.engine-disclosure > summary').click()
                studio.locator('#game-dimension').select_option('3d')
                studio.locator('#game-style').select_option('arena')
                studio.locator('#generate').click()
                studio.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                studio.locator('.model-disclosure').first.locator('summary').click()
                studio.locator('#scene-asset-role').select_option('scene')
                studio.locator('#scene-asset-file').set_input_files({
                    'name':'modelo-de-teste.glb','mimeType':'model/gltf-binary','buffer':minimal_glb()})
                studio.wait_for_function("""()=>document.querySelector('#scene-asset-list').textContent.includes('1 de 4')""",timeout=30000)
                studio.locator('.scene3d-disclosure > summary').click()
                with studio.expect_popup() as popup:studio.locator('#scene3d-open').click()
                editor=popup.value
                editor.on('pageerror',lambda e:errors.append('editor '+str(e)))
                editor.wait_for_load_state('load')
                editor.locator('#viewport canvas').wait_for(timeout=30000)
                editor.locator('#kind').select_option('glb')
                editor.locator('#asset-id').select_option(index=1)
                editor.locator('#add').click()
                editor.wait_for_function("""()=>document.querySelector('#status').textContent.includes('GLB exibido')""",timeout=30000)
                editor.locator('#x').fill('7');editor.locator('#x').dispatch_event('change')
                editor.locator('#yaw').fill('45');editor.locator('#yaw').dispatch_event('change')
                editor.locator('#scale').fill('1.5');editor.locator('#scale').dispatch_event('change')
                editor.locator('#collidable').check()
                editor.locator('#send').click()
                doc=json.loads(editor.evaluate("localStorage.getItem('gameforge-scene3d-transfer-v1')"))
                model=doc['stages'][0]['objects'][0]
                assert model['kind']=='glb' and model['x']==7 and model['yaw']==45 and model['scale']==1.5
                assert model['collidable'] is True and model['assetId'].startswith('gf')
                studio.locator('#scene3d-receive').click()
                studio.locator('#scene3d-apply').click()
                studio.wait_for_function("""()=>document.querySelector('#preview').srcdoc.includes('"kind":"glb"')""",timeout=30000)
                with studio.expect_download(timeout=30000) as down:studio.locator('#export').click()
                dest=Path(folder)/'cena.zip';down.value.save_as(dest)
                with ZipFile(dest) as zip:
                    files=zip.namelist()
                    assert any(n.startswith('assets/') and n.endswith('.glb') for n in files),files
                    assert 'SCENE3D_LAYOUT.json' in files
                    saved=json.loads(zip.read('SCENE3D_LAYOUT.json'))
                    assert saved['stages'][0]['objects'][0]['assetId']==model['assetId']
                    assert '"kind":"glb"' in zip.read('game.js').decode('utf-8')
                studio.reload(wait_until='load')
                restored=json.loads(studio.locator('#scene3d-json').input_value())
                assert restored['stages'][0]['objects'][0]['x']==7
                assert not errors,errors
                print('GF-OPEN-02b Chromium: GLB indexado, preview 3D, transformação, cena, ZIP e recarga aprovados')
            finally:browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
