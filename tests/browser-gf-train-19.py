"""GF-TRAIN-19: diagnóstico 3D real em Chromium, geração e exportação ZIP."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
import os,json,tempfile

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def run():
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_port)
    try:
        with sync_playwright() as p,tempfile.TemporaryDirectory() as temp:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get("GF_CHROMIUM_PATH"),
                args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"])
            try:
                page=browser.new_page(viewport={"width":1180,"height":830},accept_downloads=True)
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(origin+"/",wait_until="load")
                page.locator("#gdd").fill("# Arena de Treinamento\n## Fase 1 — Campo\nColocar GLB no cenário da fase.")
                page.locator("#instruction").fill("Quero três caminhos alternativos e controles para celular.")
                page.locator(".engine-disclosure > summary").click()
                page.locator("#game-dimension").select_option("3d")
                page.locator("#game-style").select_option("arena")
                page.locator("#analyze").click()
                page.locator(".three-training-disclosure > summary").click()
                report=page.locator("#three-training-report").inner_text()
                assert "GF-TRAIN-19" in report,report
                assert "Posicionar GLB no cenário por fase" in report
                assert "Três caminhos ou rotas alternativas físicas" in report
                assert "pendente" in report
                assert "Controles para celular e toque" in report
                page.locator("#generate").click()
                page.wait_for_function("document.querySelector('#preview').hasAttribute('srcdoc')",timeout=30000)
                with page.expect_download(timeout=30000) as item:
                    page.locator("#export").click()
                target=Path(temp)/"gameforge-train19.zip"
                item.value.save_as(target)
                with ZipFile(target) as z:
                    files=z.namelist()
                    assert "TREINAMENTO_3D_GF19.json" in files,files
                    assert "DIAGNOSTICO_3D_GF19.md" in files,files
                    diagnostic=json.loads(z.read("TREINAMENTO_3D_GF19.json"))
                    assert diagnostic["version"]==19
                    byid={x["id"]:x for x in diagnostic["items"]}
                    assert byid["scene-glb"]["status"]=="manual"
                    assert byid["alternate-paths"]["status"]=="pendente"
                    assert byid["mobile-controls"]["status"]=="parcial"
                    assert "GAME_SPEC" in z.read("game.js").decode("utf-8")
                assert not errors,errors
                print("GF-TRAIN-19 Chromium: diagnostico 3D, prioridade, jogos e ZIP aprovados")
            finally:browser.close()
    finally:server.shutdown()
if __name__=="__main__":run()
