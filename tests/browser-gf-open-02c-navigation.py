"""GF-OPEN-02c — validar colisores e verificador de rotas em navegador WebGL real."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import os

ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_port)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get("GF_CHROMIUM_PATH"),
                args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"])
            try:
                page=browser.new_page(viewport={"width":1200,"height":850})
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(origin+"/tools/scene3d-editor.html",wait_until="load")
                page.locator("#viewport canvas").wait_for(timeout=30000)
                page.locator("#add").click()
                page.locator("#x").fill("0");page.locator("#x").dispatch_event("change")
                page.locator("#z").fill("13.5");page.locator("#z").dispatch_event("change")
                page.locator("#route-check").click()
                page.wait_for_function("document.querySelector('#route-status').textContent.includes('BLOQUEADA')",timeout=15000)
                assert "Posicao inicial" in page.locator("#route-status").inner_text()
                page.locator("#x").fill("8");page.locator("#x").dispatch_event("change")
                page.wait_for_function("document.querySelector('#route-status').textContent.includes('PASSAGEM ENCONTRADA')",timeout=15000)
                assert "procedurais" in page.locator("#route-status").inner_text()
                page.locator("#world-size").select_option("72")
                assert page.locator("#route-status").inner_text().startswith("PASSAGEM ENCONTRADA")
                page.locator("#show-colliders").uncheck()
                page.locator("#show-colliders").check()
                page.locator("#snap-move").select_option("0.5")
                page.locator("#snap-angle").select_option("45")
                page.locator("#mode-rotate").click()
                page.locator("#yaw").fill("90");page.locator("#yaw").dispatch_event("change")
                assert '"yaw": 90' in page.locator("#output").input_value()
                page.locator("#mode-scale").click()
                page.locator("#scale").fill("1.5");page.locator("#scale").dispatch_event("change")
                assert '"scale": 1.5' in page.locator("#output").input_value()
                page.locator("#undo").click()
                assert '"scale": 1' in page.locator("#output").input_value()
                page.locator("#redo").click()
                assert '"scale": 1.5' in page.locator("#output").input_value()
                assert not errors,errors
                print("GF-OPEN-02c Chromium: colisor visual, rota bloqueada e livre, snap, rotacao, escala e undo/redo aprovados")
            finally:browser.close()
    finally:server.shutdown()
if __name__=="__main__":run()
