"""GF-TRAIN-08: ZIP real, restaurar objetivos parciais sem duplicar prêmios."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import runpy
import traceback
from playwright.sync_api import sync_playwright

gf4=runpy.run_path(str(Path(__file__).with_name("browser-gameplay-training.py")))
OUTPUT,ROOT,QuietHandler,read_export,tele=(
    gf4[k] for k in ("OUTPUT","ROOT","QuietHandler","read_export","tele")
)

def test_partial(page,origin,entry):
    slug=entry["slug"]
    genre=entry["genre"]
    url=f"{origin}/tests/_browser_output/_gameplay_unpacked/{slug}/index.html"
    page.goto(url,wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    first=tele(page)
    assert first["state"]=="menu" and first["stage"]==1
    page.locator("#start").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
    original=tele(page)
    assert original["campaignCheckpoint"] is None
    payload=page.evaluate("""genre => {
      const campaign=GameForgeAdventureCampaignSave;
      const key=campaign.key(GAME_SPEC);
      const progress=genre==='rpg'
       ?{crystals:[],defeated:[0],platformCheckpoint:0}
       :{crystals:[0],defeated:[],platformCheckpoint:1};
      const data={
       stage:0,score:genre==='rpg'?70:80,health:90,ammo:75,progress,
       ...(genre==='rpg'?{rpg:{level:1,xp:25,potions:2}}:{})
      };
      const invalid=campaign.make(GAME_SPEC,{
       ...data,progress:{...progress,crystals:[0,0]}
      });
      if(invalid!==null)throw Error('IDs de objetivos repetidos não foram rejeitados');
      const checkpoint=campaign.make(GAME_SPEC,data);
      if(!checkpoint)throw Error('Checkpoint de fase 1 inválido');
      const store=GameForgeUrbanSave.create(
       ()=>localStorage,key,v=>campaign.validate(GAME_SPEC,v));
      if(!store.write(checkpoint))throw Error('Save parcial offline não foi gravado');
      return {key,checkpoint};
    }""",genre)
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    assert tele(page)["campaignCheckpoint"]==0
    assert "Continuar" in page.locator("#start").inner_text()
    page.locator("#start").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
    restored=tele(page)
    assert restored["stage"]==1
    assert restored["score"]==payload["checkpoint"]["score"],restored
    assert restored["health"]==90 and restored["ammo"]==75,restored
    assert restored["campaignSaveStatus"]=="recovered",restored
    assert restored["campaignProgress"]==payload["checkpoint"]["progress"],restored
    if genre=="platform":
        assert restored["collected"]==1,restored
        assert restored["platformCheckpoint"]==1,restored
        assert restored["player"]["x"]>0,restored
    else:
        assert restored["enemies"]==original["enemies"]-1,restored
        assert restored["defeatedObjectives"]==1,restored
        assert restored["rpg"]=={"level":1,"xp":25,"potions":2},restored
    # Alguns centímetros de movimento não devem recriar a moeda/inimigo pago.
    page.wait_for_timeout(300)
    stable=tele(page)
    assert stable["score"]==payload["checkpoint"]["score"],stable
    page.locator("#restart").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
    reset=tele(page)
    assert reset["stage"]==1 and reset["score"]==0,reset
    assert reset["campaignCheckpoint"] is None,reset
    assert reset["collected"]==0,reset
    assert reset["defeatedObjectives"]==0,reset
    assert page.evaluate("""key =>
      !localStorage.getItem(key) &&
      !localStorage.getItem(key+':backup') &&
      !localStorage.getItem(key+':pending')""",
      payload["key"]), "Novo jogo deve limpar todas as versões de checkpoint"
    return {"slug":slug,"checks":[
      "ZIP exportado","primeira fase parcial","atributos preservados",
      "objetivos já cumpridos removidos","sem recompensa repetida","Novo jogo limpa tudo"
    ]}

def main():
    cases=json.loads((OUTPUT/"adventure-training.json").read_text(encoding="utf-8"))
    assert {x["genre"] for x in cases}=={"rpg","platform"}
    for entry in cases:read_export(entry["slug"],entry["files"])
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_port}"
    results,failures=[],[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=[
              "--no-sandbox","--use-gl=angle","--use-angle=swiftshader",
              "--enable-webgl","--disable-dev-shm-usage"])
            try:
                for entry in cases:
                    page=browser.new_page(viewport={"width":960,"height":720})
                    errors=[]
                    page.on("pageerror",lambda err: errors.append(str(err)))
                    try:
                        results.append(test_partial(page,base,entry))
                        assert not errors,(entry["slug"],errors)
                    except Exception:
                        shots=OUTPUT/"screenshots"
                        shots.mkdir(parents=True,exist_ok=True)
                        page.screenshot(path=str(shots/(entry["slug"]+"-gftrain08-failure.png")),
                          full_page=True)
                        failures.append({"slug":entry["slug"],"error":traceback.format_exc(),
                          "js_errors":errors})
                        if results and results[-1]["slug"]==entry["slug"]:results.pop()
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
    (OUTPUT/"midstage-training-results.json").write_text(
        json.dumps({"passed":results,"failed":failures},ensure_ascii=False,indent=2),
        encoding="utf-8")
    print(f"GF-TRAIN-08: {len(results)}/2 ZIPs com objetivos intermediários restaurados")
    if failures:
        for failure in failures:
            print("GF-TRAIN-08 FALHA:",failure["slug"],failure["error"])
        raise AssertionError(f"{len(failures)} cenários de save parcial falharam")

if __name__=="__main__":
    main()
