"""GF-TRAIN-06: checkpoint real no ZIP exportado, reload e limpeza de novo jogo.
A fabricação controlada do checkpoint aqui testa a restauração; a transição que
produz o checkpoint durante o combate real é verificada nos testes Node do motor.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import json
import runpy
import traceback
from playwright.sync_api import sync_playwright

gf4 = runpy.run_path(str(Path(__file__).with_name("browser-gameplay-training.py")))
OUTPUT, ROOT, QuietHandler, read_export, tele = (
    gf4[name] for name in ("OUTPUT","ROOT","QuietHandler","read_export","tele")
)

def run():
    data=json.loads((OUTPUT/"gameplay-training.json").read_text(encoding="utf-8"))
    case=next(q for q in data if q["slug"]=="training-3d-boss-final")
    slug=case["slug"]
    read_export(slug,case["files"])
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f"http://127.0.0.1:{server.server_port}"
    errors=[]
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True,args=[
                "--no-sandbox","--use-gl=angle","--use-angle=swiftshader",
                "--enable-webgl","--disable-dev-shm-usage"])
            try:
                page=browser.new_page(viewport={"width":960,"height":720})
                page.on("pageerror",lambda error: errors.append(str(error)))
                try:
                    url=f"{origin}/tests/_browser_output/_gameplay_unpacked/{slug}/index.html"
                    page.goto(url,wait_until="load")
                    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                    before=tele(page)
                    assert before["state"]=="menu" and before["stage"]==1
                    assert before["campaignCheckpoint"] is None
                    result=page.evaluate("""() => {
                       const save = GameForgeShooterCampaignSave;
                       const key = save.key(GAME_SPEC);
                       const valid = save.make(GAME_SPEC, {
                           stage:1,health:77,weapon:2,kills:12,score:1400
                       });
                       const store = GameForgeUrbanSave.create(
                           () => localStorage,key,raw => save.validate(GAME_SPEC,raw));
                       if(!valid||!store.write(valid))throw Error('Não escreveu checkpoint válido');
                       return {key,valid};
                    }""")
                    page.reload(wait_until="load")
                    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
                    assert tele(page)["campaignCheckpoint"]==1
                    page.locator("#start").click()
                    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
                    loaded=tele(page)
                    assert loaded["stage"]==2 and loaded["stages"]==3, loaded
                    assert loaded["score"]==1400 and loaded["health"]==77, loaded
                    assert loaded["weapon"]==2 and loaded["kills"]==12, loaded
                    assert loaded["campaignSaveStatus"]=="recovered", loaded
                    # O botão Reiniciar significa novo jogo, não continuar do checkpoint.
                    page.locator("#restart").click()
                    fresh=tele(page)
                    assert fresh["stage"]==1 and fresh["score"]==0 and fresh["weapon"]==1, fresh
                    assert fresh["campaignCheckpoint"] is None, fresh
                    assert page.evaluate(
                        "(k) => localStorage.getItem(k)===null && localStorage.getItem(k+':backup')===null",
                        result["key"]), "reiniciar não removeu todas as cópias do checkpoint"
                    page.reload(wait_until="load")
                    page.locator("#start").click()
                    assert tele(page)["stage"]==1, "save removido não pode ser restaurado após reload"

                    # Save corrompido não pode promover fase 99 nem prêmios forjados.
                    page.evaluate("""(k) => localStorage.setItem(k,JSON.stringify({
                        version:1,fingerprint:'fake',stage:99,
                        health:100,score:99999999,weapon:3,kills:999999
                    }))""",result["key"])
                    page.reload(wait_until="load")
                    page.locator("#start").click()
                    rejected=tele(page)
                    assert rejected["stage"]==1 and rejected["score"]==0, rejected
                    assert not errors,errors
                except Exception:
                    shots=OUTPUT/"screenshots"
                    shots.mkdir(parents=True,exist_ok=True)
                    page.screenshot(path=str(shots/(slug+"-gftrain06-failure.png")),full_page=True)
                    raise
                finally:
                    page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
    print("GF-TRAIN-06: 1/1 checkpoint exportado validado: reload, novo jogo, corrupção rejeitada")

if __name__=="__main__":
    run()
