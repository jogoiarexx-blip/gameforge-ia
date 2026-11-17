"""GF-TRAIN-07 — ZIP de RPG e plataforma 3D: recuperação, novo jogo e corrupção."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import runpy
import traceback
from playwright.sync_api import sync_playwright

base=runpy.run_path(str(Path(__file__).with_name("browser-gameplay-training.py")))
OUTPUT,ROOT,QuietHandler,read_export,tele=(
    base[k] for k in ("OUTPUT","ROOT","QuietHandler","read_export","tele")
)

def exercise(page,origin,case):
    slug=case["slug"]
    genre=case["genre"]
    url=f"{origin}/tests/_browser_output/_gameplay_unpacked/{slug}/index.html"
    page.goto(url,wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'",timeout=20000)
    initial=tele(page)
    assert initial["state"]=="menu" and initial["stage"]==1
    assert initial["stages"]==3, (slug,initial)
    assert initial["genre"]==genre, (slug,initial)
    assert initial["campaignCheckpoint"] is None,initial
    payload=page.evaluate("""(genre) => {
      const factory=GameForgeAdventureCampaignSave;
      const key=factory.key(GAME_SPEC);
      const state={stage:1,score:1500,health:70,ammo:130};
      if(genre==='rpg')state.rpg={level:3,xp:45,potions:4};
      const saved=factory.make(GAME_SPEC,state);
      if(!saved)throw Error('Contrato de checkpoint rejeitou progresso legítimo');
      const store=GameForgeUrbanSave.create(
        () => localStorage,key,raw=>factory.validate(GAME_SPEC,raw));
      if(!store.write(saved))throw Error('Checkpoint não foi gravado no export');
      return {key,saved};
    }""",genre)
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    menu=tele(page)
    assert menu["campaignCheckpoint"]==1, (slug,menu)
    assert "Continuar" in page.locator("#start").inner_text()
    page.locator("#start").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'")
    loaded=tele(page)
    assert loaded["stage"]==2 and loaded["stages"]==3,(slug,loaded)
    assert loaded["score"]==1500 and loaded["health"]==70,(slug,loaded)
    assert loaded["ammo"]==130,(slug,loaded)
    assert loaded["campaignSaveStatus"]=="recovered",(slug,loaded)
    assert loaded["collected"]==0,("a nova fase não deve herdar coleta antiga",loaded)
    if genre=="rpg":
        assert loaded["rpg"]=={"level":3,"xp":45,"potions":4},loaded
        hud=page.locator("#mission").inner_text()
        assert "Nível 3" in hud and "XP 45" in hud,hud
    else:
        assert loaded["rpg"]=={"level":1,"xp":0,"potions":2},loaded
        assert loaded["required"]>0,("a fase precisa de cristais novos",loaded)

    # Movimento do runtime ainda funciona a partir da fase restaurada.
    before=tele(page)["player"]["x"]
    page.keyboard.down("ArrowRight")
    page.wait_for_timeout(360)
    page.keyboard.up("ArrowRight")
    moved=tele(page)
    assert moved["state"]=="play" and abs(moved["player"]["x"]-before)>.3,(slug,moved)

    page.locator("#restart").click()
    page.wait_for_function("window.__gameforgeTelemetry().stage === 1")
    reset=tele(page)
    assert reset["score"]==0 and reset["health"]==100 and reset["ammo"]==80,(slug,reset)
    assert reset["campaignCheckpoint"] is None,(slug,reset)
    if genre=="rpg":
        assert reset["rpg"]=={"level":1,"xp":0,"potions":2},reset
    assert page.evaluate("""key => !localStorage.getItem(key)
       && !localStorage.getItem(key+':backup') && !localStorage.getItem(key+':pending')""",
       payload["key"]), "reiniciar deixou restos do save"

    # O botão novo jogo funciona também depois de recarregar.
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    page.locator("#start").click()
    assert tele(page)["stage"]==1 and tele(page)["score"]==0

    # Save inválido não pode criar personagem superpoderoso nem liberar fase.
    page.evaluate("""key => localStorage.setItem(key,JSON.stringify({
      version:1,fingerprint:'adulterado',stage:99,score:999999999,
      health:100,ammo:1000000,rpg:{level:30,xp:1000000,potions:9}
    }))""",payload["key"])
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    assert tele(page)["campaignCheckpoint"] is None
    page.locator("#start").click()
    invalid=tele(page)
    assert invalid["stage"]==1 and invalid["score"]==0,(slug,invalid)
    assert invalid["rpg"]["level"]==1,(slug,invalid)
    return {"slug":slug,"checks":[
      "ZIP reimportado","checkpoint exportado","reload fase 2","atributos do personagem",
      "jogabilidade pós-restore","reiniciar limpa backups","corrupção rejeitada"
    ]}

def run():
    cases=json.loads((OUTPUT/"adventure-training.json").read_text(encoding="utf-8"))
    assert set(x["genre"] for x in cases)=={"rpg","platform"}
    for case in cases:read_export(case["slug"],case["files"])
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f"http://127.0.0.1:{server.server_port}"
    results,failures=[],[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=[
                "--no-sandbox","--use-gl=angle","--use-angle=swiftshader",
                "--enable-webgl","--disable-dev-shm-usage"])
            try:
                for case in cases:
                    page=browser.new_page(viewport={"width":960,"height":720})
                    errors,external=[],[]
                    page.on("pageerror",lambda error:errors.append(str(error)))
                    def route(request):
                        if request.request.url.startswith(origin+"/"):
                            request.continue_()
                        else:
                            external.append(request.request.url)
                            request.abort()
                    page.route("**/*",route)
                    try:
                        results.append(exercise(page,origin,case))
                        assert not errors,(case["slug"],"erro JS",errors)
                        assert not external,(case["slug"],"dependência externa",external)
                    except Exception:
                        shots=OUTPUT/"screenshots"
                        shots.mkdir(parents=True,exist_ok=True)
                        page.screenshot(path=str(shots/(case["slug"]+"-gftrain07-failure.png")),
                                        full_page=True)
                        if results and results[-1]["slug"]==case["slug"]:results.pop()
                        failures.append({"slug":case["slug"],"error":traceback.format_exc(),
                                         "js_errors":errors,"external":external})
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
    (OUTPUT/"adventure-training-results.json").write_text(
        json.dumps({"passed":results,"failed":failures},ensure_ascii=False,indent=2),
        encoding="utf-8"
    )
    print(f"GF-TRAIN-07: {len(results)}/2 exportações RPG/plataforma com checkpoint aprovadas")
    if failures:
        for item in failures:print("GF-TRAIN-07 FALHA",item["slug"],item["error"])
        raise AssertionError("Falhas nos checkpoints RPG/plataforma do Chromium")
    assert len(results)==2

if __name__=="__main__":
    run()
