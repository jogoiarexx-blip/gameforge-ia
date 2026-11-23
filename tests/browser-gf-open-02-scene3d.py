"""GF-OPEN-02: edicao visual 3D -> Studio -> game.js -> ZIP e revisao de cena."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import json,os,tempfile

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def run():
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_port)
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory() as temp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get("GF_CHROMIUM_PATH"),
                args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"])
            try:
                context=browser.new_context(viewport={"width":1150,"height":850},accept_downloads=True)
                errors=[]
                editor=context.new_page()
                editor.on("pageerror",lambda e:errors.append("editor: "+str(e)))
                editor.goto(origin+"/tools/scene3d-editor.html",wait_until="load")
                editor.locator("#viewport canvas").wait_for(timeout=30000)
                editor.locator("#add").click()
                editor.locator("#x").fill("7")
                editor.locator("#x").dispatch_event("change")
                editor.locator("#kind").select_option("lamp")
                editor.locator("#add").click()
                editor.locator("#send").click()
                raw=editor.evaluate("localStorage.getItem('gameforge-scene3d-transfer-v1')")
                data=json.loads(raw)
                assert len(data["stages"][0]["objects"])==2
                assert data["stages"][0]["objects"][0]["x"]==7
                assert data["stages"][0]["objects"][1]["kind"]=="lamp"
                studio=context.new_page()
                studio.on("pageerror",lambda e:errors.append("studio: "+str(e)))
                studio.goto(origin+"/",wait_until="load")
                studio.locator("#gdd").fill("# Cena Visual\nJogo de arena 3D com cristais, inimigos e uma fase.\n## Fase 1 — Campo\nDerrote os inimigos.")
                studio.locator(".engine-disclosure > summary").click()
                studio.locator("#game-dimension").select_option("3d")
                studio.locator("#game-style").select_option("arena")
                studio.locator(".scene3d-disclosure > summary").click()
                studio.locator("#scene3d-receive").click()
                assert json.loads(studio.locator("#scene3d-json").input_value())["stages"][0]["objects"][0]["x"]==7
                studio.locator("#generate").click()
                studio.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                files=studio.evaluate("""()=>({
                    hasScene:!!document.querySelector('#file-list')?.textContent.includes('SCENE3D_LAYOUT.json'),
                    source:document.querySelector('#preview')?.srcdoc||''
                })""")
                assert files["hasScene"]
                assert '"sceneObjects"' in files["source"]
                with studio.expect_download(timeout=30000) as download:
                    studio.locator("#export").click()
                target=Path(temp)/"gf-open-02.zip"
                download.value.save_as(target)
                with ZipFile(target) as z:
                    assert "SCENE3D_LAYOUT.json" in z.namelist()
                    spec=json.loads(z.read("SCENE3D_LAYOUT.json"))
                    assert len(spec["stages"][0]["objects"])==2
                    assert '"sceneObjects"' in z.read("game.js").decode("utf-8")
                editor.locator("#object-list button").first.click()
                editor.locator("#x").fill("9")
                editor.locator("#x").dispatch_event("change")
                editor.locator("#send").click()
                studio.locator("#scene3d-receive").click()
                studio.locator("#scene3d-apply").click()
                studio.wait_for_function("""()=>document.querySelector("#preview").srcdoc.includes('"x":9')""",timeout=30000)
                latest=studio.evaluate("document.querySelector('#preview').srcdoc")
                assert '"x":9' in latest, "Alteracao de cena nao entrou no game.js"
                studio.reload(wait_until="load")
                assert json.loads(studio.locator("#scene3d-json").input_value())["stages"][0]["objects"][0]["x"]==9
                assert not errors,errors
                print("GF-OPEN-02 Chromium: editor WebGL, transferencia, geracao, revisao, ZIP e recarga aprovados")
            finally: browser.close()
    finally: server.shutdown()

if __name__=="__main__": run()
