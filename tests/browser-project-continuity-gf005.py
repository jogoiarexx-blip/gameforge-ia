"""GF-005: Chromium validates command-only continuity, SHA-256 GLB ZIP restoration,
storage quotas and rollback in separate browser profiles. No external network needed."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from io import BytesIO
import json, struct, tempfile, zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/'tests'/'_browser_output'
SCREEN=OUTPUT/'screenshots'
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def triangle_glb():
    """Minimal valid glTF 2.0 triangle with embedded BIN, no external resources."""
    vertices=struct.pack('<9f', 0.,0.,0., 1.,0.,0., 0.,1.,0.)
    doc={
        'asset':{'version':'2.0'},'buffers':[{'byteLength':len(vertices)}],
        'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(vertices)}],
        'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC3',
                      'min':[0,0,0],'max':[1,1,0]}],
        'meshes':[{'primitives':[{'attributes':{'POSITION':0},'mode':4}]}],
        'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}],'scene':0
    }
    payload=json.dumps(doc,separators=(',',':')).encode()
    payload+=b' '*((-len(payload))%4)
    chunk=b''.join((struct.pack('<I',len(payload)),b'JSON',payload,
                    struct.pack('<I',len(vertices)),b'BIN\x00',vertices))
    return b'glTF'+struct.pack('<II',2,12+len(chunk))+chunk

def rewrite_model(archive, asset_name):
    """Create a CRC-valid ZIP with GLB same-size corruption (SHA still fails)."""
    output=BytesIO()
    with zipfile.ZipFile(BytesIO(archive)) as src,zipfile.ZipFile(output,'w',compression=zipfile.ZIP_STORED) as dst:
        for info in src.infolist():
            content=bytearray(src.read(info.filename))
            if info.filename==asset_name:
                content[-5]^=19
            dst.writestr(info.filename,content)
    return output.getvalue()

def run():
    SCREEN.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/'
    errors=[]
    with sync_playwright() as p,tempfile.TemporaryDirectory() as directory:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage',
            '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
        try:
            original=browser.new_context(viewport={'width':1280,'height':850},accept_downloads=True)
            page=original.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base,wait_until='load')
            page.locator('#project-name').fill('GF005 Projeto Comando')
            page.locator('#gdd').fill('')
            command='Crie FPS 3D com duas fases, loja para comprar munição e melhorar armas.'
            page.locator('#instruction').fill(command)
            # Token is intentionally hidden in offline mode; set its value to
            # verify the serializer cannot leak it into portable backups.
            page.evaluate("document.querySelector('#api-token').value='GF005_TOKEN_NUNCA_EXPORTAR'")
            page.locator('#generate').click()
            page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=25000)
            assert page.locator('#gdd').input_value()==''
            page.locator('#file-list').get_by_text('game.js',exact=True).click()
            initial=page.locator('#file-editor').input_value()
            assert 'GAME_SPEC' in initial
            marker='\\n// GF005: edição de código persistente'
            page.locator('#file-editor').fill(initial+marker)
            page.locator('#apply-edit').click()
            page.wait_for_function("document.querySelector('#preview').getAttribute('srcdoc').includes('GF005: edição')",
                                   timeout=20000)

            # Upload of a real miniature GLB to IndexedDB, with manifest digest.
            glb=triangle_glb()
            page.locator('#scene-asset-file').set_input_files(
                {'name':'triangulo.glb','mimeType':'model/gltf-binary','buffer':glb})
            page.wait_for_function("document.querySelector('#scene-asset-list').textContent.includes('1 de 4')",timeout=25000)
            page.wait_for_function("document.querySelector('#project-storage-status').textContent.includes('Salvo')",timeout=15000)
            page.wait_for_timeout(850)
            page.reload()
            page.wait_for_function("document.querySelector('#scene-asset-list').textContent.includes('1 de 4')",timeout=15000)
            assert page.locator('#gdd').input_value()==''

            page.locator('.backup-disclosure > summary').click()
            with page.expect_download(timeout=30000) as d:page.locator('#project-backup').click()
            path=Path(directory)/'gf005.gameforge.zip';d.value.save_as(path)
            with zipfile.ZipFile(path) as z:
                meta=json.loads(z.read('PROJETO.gameforge.json'))['project']
                manifest=json.loads(meta['files']['ASSET_LIBRARY.json'])
                assert meta['gdd']=='' and command in meta['instruction']
                assert 'GF005_TOKEN_NUNCA_EXPORTAR' not in path.read_bytes().decode('latin-1')
                assert len(manifest['assets'])==1
                asset=manifest['assets'][0];assert len(asset['sha256'])==64
                binary_name='assets/'+asset['id']+'.glb'
                assert z.read(binary_name)==glb
                assert meta['files']['game.js'].startswith('/* Jogo criado')
                assert marker in meta['files']['game.js']
                corrupt=rewrite_model(path.read_bytes(),binary_name)
                tampered=Path(directory)/'adulterado.gameforge.zip';tampered.write_bytes(corrupt)
            # The exported ZIP must be byte-identical after local reload.
            with page.expect_download(timeout=30000) as d:page.locator('#export').click()
            complete=Path(directory)/'jogo-completo.zip';d.value.save_as(complete)
            with zipfile.ZipFile(complete) as z:
                assert z.read(binary_name)==glb
                assert 'game.js' in z.namelist() and 'index.html' in z.namelist()

            clean=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
            restored=clean.new_page();restored.on('pageerror',lambda e:errors.append(str(e)))
            restored.goto(base,wait_until='load')
            restored.locator('#project-file').set_input_files(path)
            restored.locator('#project-restore-dialog').wait_for(state='visible')
            restored.locator('#project-restore-confirm').click()
            restored.wait_for_function("document.querySelector('#scene-asset-list').textContent.includes('1 de 4')",timeout=15000)
            restored.locator('#file-list').get_by_text('game.js',exact=True).click()
            assert restored.locator('#file-editor').input_value()==meta['files']['game.js']
            spec=restored.evaluate("""async ({id,length,sha})=>{
                const raw=localStorage.getItem('gameforge-studio-v03');
                const stored=GameForgeProject.restoreStored(raw);
                const bin=await GameForgeAssetLibrary.get(stored.assetProjectId,id,length,sha);
                return {size:bin.length,gdd:stored.gdd,instruction:stored.instruction,
                        stages:GameForgeProject.activeSpec(stored.files,null).stages.length}
            }""",{'id':asset['id'],'length':asset['bytes'],'sha':asset['sha256']})
            assert spec['size']==len(glb) and spec['gdd']=='' and spec['stages']==2
            assert command in spec['instruction']

            # Reuse restored project, apply one supported gameplay change and
            # undo it without losing the code that came from the other computer.
            restored.locator('.development-disclosure > summary').click()
            restored.locator('#instruction').fill('adicione uma fase "Terceira Etapa"')
            restored.locator('#improve').click()
            restored.wait_for_function("document.querySelector('#feedback').textContent.includes('Melhoria salva')",
                                       timeout=30000)
            restored.locator('#file-list').get_by_text('game.js',exact=True).click()
            assert 'Terceira Etapa' in restored.locator('#file-editor').input_value()
            restored.locator('#undo-improvement').click()
            restored.locator('#file-list').get_by_text('game.js',exact=True).click()
            assert restored.locator('#file-editor').input_value()==meta['files']['game.js']

            # SHA-256 must catch same-size GLB modification even after a ZIP is
            # recompressed with correct CRC. Existing project may NOT be replaced.
            restored.locator('#project-file').set_input_files(tampered)
            restored.wait_for_function("document.querySelector('#feedback').textContent.includes('Integridade')",timeout=12000)
            assert restored.locator('#project-restore-dialog').is_hidden()
            assert restored.locator('#file-editor').input_value()==meta['files']['game.js']

            # Simulated IndexedDB failure during transaction must not switch project.
            restored.evaluate("""()=>{window.gf005Put=GameForgeAssetLibrary.put;
                GameForgeAssetLibrary.put=async()=>{throw Error('Falha simulada no disco');};}""")
            restored.locator('#project-file').set_input_files(path)
            restored.locator('#project-restore-dialog').wait_for(state='visible')
            restored.locator('#project-restore-confirm').click()
            restored.wait_for_function("document.querySelector('#feedback').textContent.includes('Falha simulada')",timeout=12000)
            assert restored.locator('#project-restore-dialog').is_hidden()
            assert restored.locator('#file-editor').input_value()==meta['files']['game.js']
            restored.evaluate("()=>{GameForgeAssetLibrary.put=window.gf005Put;}")

            # Persistence failure should warn and still let the user download backup.
            restored.evaluate("""()=>{Storage.prototype.setItem=function(){
                throw new DOMException('Sem espaço','QuotaExceededError');};}""")
            restored.locator('#project-name').fill('Nome com quota indisponível')
            restored.locator('#project-name').blur()
            restored.wait_for_function("document.querySelector('#project-storage-status').textContent.includes('Não salvo')",timeout=15000)
            assert restored.locator('#project-backup').is_enabled()
            assert restored.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile horizontal overflow'
            restored.screenshot(path=str(SCREEN/'gf005-restore-mobile.png'),full_page=True)
            assert not errors,errors
            print(json.dumps({'gf005':'ok','glb_bytes':len(glb),'sha256':asset['sha256'],
                  'tests':['command-only','code edit','browser reload','GLB+ZIP','clean context',
                    'incremental improvement','undo','CRC-valid tampering blocked',
                    'IndexedDB failure rollback','quota warning','mobile']},
                  ensure_ascii=False))
        finally:
            browser.close()
            server.shutdown()
if __name__=='__main__':run()
