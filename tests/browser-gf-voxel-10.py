"""GF-VOXEL-10: pixel editor, PNG/WEBP imports and custom texture in actual ZIP."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import os,tempfile,base64,json,re

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
def server(root):
    s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
    Thread(target=s.serve_forever,daemon=True).start()
    return s,'http://127.0.0.1:'+str(s.server_port)
def run():
    studio,base=server(ROOT)
    try:
        with sync_playwright() as p,tempfile.TemporaryDirectory() as tmp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('GF_CHROMIUM_PATH'),
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage'])
            try:
                page=browser.new_page(accept_downloads=True,viewport={'width':1200,'height':950})
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/tools/voxel-studio.html')
                page.locator('summary').filter(has_text='Editor de texturas').click()
                page.locator('#atlas-material').select_option('3')
                pixel=lambda:page.evaluate("Array.from(document.querySelector('#texture-tile').getContext('2d').getImageData(0,0,1,1).data)")
                original=pixel()
                page.locator('#atlas-color').fill('#fa1e3c')
                page.locator('#atlas-fill').click()
                assert pixel()==[250,30,60,255]
                page.locator('#atlas-undo').click()
                assert pixel()==original
                page.locator('#atlas-color').fill('#123456')
                page.locator('#texture-tile').click(position={'x':4,'y':4})
                assert pixel()==[18,52,86,255]
                def image(mime,color):
                    url=page.evaluate("(o)=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle=o.color;x.fillRect(0,0,16,16);return c.toDataURL(o.mime,1)}",{'mime':mime,'color':color})
                    assert url.startswith('data:'+mime)
                    return base64.b64decode(url.split(',')[1])
                page.locator('#atlas-import-tile').set_input_files({'name':'stone.png','mimeType':'image/png','buffer':image('image/png','#0c8cda')})
                page.wait_for_function("document.querySelector('#atlas-status').textContent.includes('Imagem importada')")
                assert pixel()==[12,140,218,255]
                page.locator('#atlas-material').select_option('8')
                page.locator('#atlas-import-tile').set_input_files({'name':'wood.webp','mimeType':'image/webp','buffer':image('image/webp','#aa7733')})
                page.wait_for_function("(()=>{const d=document.querySelector('#texture-tile').getContext('2d').getImageData(0,0,1,1).data;return Math.abs(d[0]-170)<7&&Math.abs(d[1]-119)<7&&Math.abs(d[2]-51)<7})()")
                assert page.locator('#textures').is_checked()
                page.locator('#build').click()
                with page.expect_download(timeout=45000) as dl:page.locator('#download').click()
                path=Path(tmp)/'world.zip';dl.value.save_as(path)
                dest=Path(tmp)/'game';dest.mkdir()
                with ZipFile(path) as z:z.extractall(dest)
                source=(dest/'game.js').read_text(encoding='utf-8')
                spec=json.loads(re.search(r'const GAME_SPEC = (.*?);\n',source).group(1))
                data=bytes.fromhex(spec['voxel']['atlas'])
                assert spec['voxel']['textures'] and len(data)==32768
                assert data[3*16*4:3*16*4+4]==bytes([12,140,218,255])
                game,url=server(dest)
                try:
                    page.goto(url+'/index.html')
                    page.wait_for_function("window.__gameforgeTelemetry?.().textured===true",timeout=45000)
                    page.locator('#start').click()
                    page.wait_for_function("window.__gameforgeTelemetry().triangles>0",timeout=45000)
                    assert page.evaluate("GAME_SPEC.voxel.atlas.length") == 65536
                    assert not errors,errors
                    print('GF-VOXEL-10: editor, undo, PNG/WEBP, atlas integrado e ZIP jogável')
                finally:game.shutdown()
            finally:browser.close()
    finally:studio.shutdown()
if __name__=='__main__':run()
