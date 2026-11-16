"""GF-TRAIN-05: compra, prêmio de missão e save/reload em ZIPs realmente exportados."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import traceback
from playwright.sync_api import sync_playwright

# O arquivo da rodada anterior usa hífens no nome; não é módulo importável.
# Reutilizamos as funções de QA sem executar o main guard do script original.
import runpy
_gf4 = runpy.run_path(str(Path(__file__).with_name("browser-gameplay-training.py")))
OUTPUT, ROOT, QuietHandler, read_export, play, tele = (
    _gf4[k] for k in ("OUTPUT", "ROOT", "QuietHandler", "read_export", "play", "tele")
)

def assert_no_errors(errors, label):
    assert not errors, (label, "erros JavaScript no navegador", errors)

def shop_cycle(page):
    slug = "training-3d-fps-store"
    start = tele(page)
    initial = start.get("combatEconomy")
    assert start["state"] == "play" and initial, (slug, start)
    assert initial["prices"]["ammo"] == 30, "comando de preço não está ativo no motor"
    assert initial["purchases"] == 0
    assert initial["reserve"] < initial["maxReserve"] - 120
    page.keyboard.press("b")
    page.wait_for_function("window.__gameforgeTelemetry().combatEconomy.shopOpen === true")
    opened = tele(page)
    assert opened["paused"] is True, (slug, "loja deve pausar combate", opened)
    before_clock = opened["clock"]
    page.wait_for_timeout(270)
    assert abs(tele(page)["clock"] - before_clock) < .04, "loja deixou o tempo correr durante compras"
    for count in range(1, 4):
        page.keyboard.press("1")
        page.wait_for_function(
            "(n) => window.__gameforgeTelemetry().combatEconomy.purchases === n",
            arg=count, timeout=3000)
        live = tele(page)["combatEconomy"]
        assert live["credits"] == initial["credits"] - 30 * count, (count, live)
        assert live["reserve"] == initial["reserve"] + 40 * count, (count, live)
        assert live["spent"] == 30 * count and live["purchases"] == count, live
        assert len(live["history"]) == count, "uma compra deve criar exatamente um registro"
    no_money = tele(page)["combatEconomy"]
    page.keyboard.press("1")
    page.wait_for_timeout(120)
    assert tele(page)["combatEconomy"] == no_money, "compra sem saldo alterou créditos ou estoque"
    page.keyboard.press("3")
    page.wait_for_timeout(100)
    assert tele(page)["combatEconomy"] == no_money, "upgrade caro foi entregue gratuitamente"
    page.keyboard.press("b")
    page.wait_for_function("window.__gameforgeTelemetry().combatEconomy.shopOpen === false")
    page.wait_for_timeout(210)
    assert tele(page)["clock"] > before_clock, "combate não retomou após fechar a loja"
    page.locator("#restart").click()
    page.wait_for_function(
        "window.__gameforgeTelemetry().combatEconomy.purchases === 0", timeout=6000)
    reset = tele(page)["combatEconomy"]
    assert reset["credits"] == initial["credits"], ("saldo não reiniciado", reset)
    assert reset["reserve"] == initial["reserve"], ("estoque não reiniciado", reset)
    assert reset["spent"] == 0 and reset["history"] == [], ("histórico não reiniciado", reset)
    return {"scenario": slug, "checks": ["preço 30", "3 compras reais", "saldo e reserva",
        "sem compra sem saldo", "sem upgrade grátis", "pausa no comércio",
        "retomada", "reinício da economia"]}

def urban_campaign(page, origin):
    slug = "3d-urban-action"
    begin = tele(page)
    assert begin["state"] == "play" and begin["enemies"] == 1, begin
    assert begin["mission"]["complete"] is False, begin
    assert begin["mission"]["captured"] is False, begin
    initial_score,initial_hp = begin["score"],begin["enemyHp"]
    page.keyboard.press("Space")
    page.wait_for_function("(h) => window.__gameforgeTelemetry().enemyHp < h",
                           arg=initial_hp, timeout=3000)
    damaged = tele(page)
    assert damaged["enemyHp"] == initial_hp - 25, damaged
    assert damaged["score"] == initial_score, "um tiro não conclui o objetivo"
    assert damaged["mission"]["complete"] is False
    # O salvamento parcial deve resistir a um reload ANTES de derrotar o guarda.
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    page.locator("#start").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'", timeout=5000)
    restored = tele(page)
    assert restored["enemyHp"] == damaged["enemyHp"], "dano parcial não foi restaurado"
    assert restored["mission"]["guardDefeated"] is False, "não pode adiantar a missão ao carregar"
    assert restored["score"] == initial_score, "não pode premiar antes da captura"

    for _ in range(6):
        if tele(page)["mission"]["guardDefeated"]:
            break
        page.keyboard.press("Space")
        page.wait_for_timeout(480)
    defeated = tele(page)
    assert defeated["mission"]["guardDefeated"], ("guarda não foi derrotado", defeated)
    assert defeated["enemies"] == 0
    assert defeated["score"] == initial_score, "derrotar o guarda não deve duplicar bônus de missão"
    page.keyboard.press("e")
    assert tele(page)["mission"]["complete"] is False, "porta distante não pode encerrar a missão"
    page.keyboard.down("w")
    page.wait_for_function("window.__gameforgeTelemetry().player.z < -6",
                           timeout=10000)
    page.keyboard.up("w")
    page.keyboard.down("a")
    page.wait_for_function("window.__gameforgeTelemetry().player.x < -5.3",
                           timeout=7500)
    page.keyboard.up("a")
    page.keyboard.press("e")
    page.wait_for_function("window.__gameforgeTelemetry().state === 'victory'", timeout=5000)
    won = tele(page)
    assert won["mission"]["captured"] and won["mission"]["complete"]
    assert won["mission"]["rewardGranted"], won
    assert won["score"] == initial_score + 450, (initial_score,won)
    assert won["saveEnabled"], "salvamento no navegador indisponível"
    # Estado completo não pode ser recompensado duas vezes ao recarregar.
    page.reload(wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'")
    page.locator("#start").click()
    reloaded = tele(page)
    assert reloaded["mission"]["complete"] and reloaded["score"] == won["score"], reloaded
    page.keyboard.press("e")
    assert tele(page)["score"] == won["score"], "recompensa duplicada por interação"
    return {"scenario": slug, "checks": ["dano parcial", "salvamento pré-vitória",
        "guarda derrotável", "não concluir longe da porta", "captura jogável",
        "recompensa +450 única", "vitória restaurada após reload"]}

def run():
    matrix = json.loads((OUTPUT/"matrix.json").read_text(encoding="utf-8"))
    extras = json.loads((OUTPUT/"gameplay-training.json").read_text(encoding="utf-8"))
    urban = next(x for x in matrix if x["slug"] == "3d-urban-action")
    fps = next(x for x in extras if x["slug"] == "training-3d-fps-store")
    for x in (urban,fps):
        read_export(x["slug"],x["files"])
    shots = OUTPUT/"screenshots"
    shots.mkdir(parents=True,exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    passed, failed = [], []
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True,
                args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader",
                    "--enable-webgl","--disable-dev-shm-usage"])
            try:
                for slug, func in [(fps["slug"],shop_cycle),(urban["slug"],urban_campaign)]:
                    page = browser.new_page(viewport={"width":960,"height":720})
                    errors=[]
                    page.on("pageerror",lambda error:errors.append(str(error)))
                    try:
                        play(page,origin,slug)
                        passed.append(func(page, origin) if slug==urban["slug"] else func(page))
                        assert_no_errors(errors,slug)
                    except Exception:
                        page.screenshot(path=str(shots/(slug+"-gftrain05-failure.png")),full_page=True)
                        failed.append({"scenario":slug,"error":traceback.format_exc(),"jsErrors":errors})
                        if passed and passed[-1].get("scenario")==slug:passed.pop()
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
    result={"version":5,"total":2,"passed":passed,"failed":failed}
    (OUTPUT/"gameplay-lifecycle-results.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"GF-TRAIN-05: {len(passed)}/2 ciclos de economia e missão aprovados")
    if failed:
        for x in failed:print("GF-TRAIN-05 FALHA:",x["scenario"],x["error"],x["jsErrors"])
        raise AssertionError(f"{len(failed)} ciclo(s) falharam")
    assert len(passed)==2

if __name__=="__main__":
    run()
