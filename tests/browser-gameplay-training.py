"""GF-TRAIN-04: gameplay real de jogos exportados no Chromium, não apenas parsing."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import math
import zipfile
import traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "tests" / "_browser_output"
SCENES = [
    ("2d-platform", "ArrowRight", True),
    ("2d-arena", "ArrowRight", True),
    ("3d-arena", "ArrowRight", True),
    ("3d-fps", "ArrowRight", True),
    ("3d-shooter", "ArrowRight", True),
    ("3d-racing", "ArrowUp", False),
]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def tele(page):
    return page.evaluate("window.__gameforgeTelemetry()")

def read_export(slug, expected_files):
    dest = OUTPUT / "_gameplay_unpacked" / slug
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT / (slug + ".zip")) as archive:
        entries = archive.namelist()
        assert set(entries) == set(expected_files), (slug, "arquivos do ZIP divergentes")
        assert all("/" not in name and "\\" not in name and ".." not in name for name in entries), slug
        archive.extractall(dest)
    for name in expected_files:
        assert (dest / name).read_bytes() == (OUTPUT / slug / name).read_bytes(), (slug, name)
    return dest

def play(page, origin, slug):
    page.goto(f"{origin}/tests/_browser_output/_gameplay_unpacked/{slug}/index.html", wait_until="load")
    page.wait_for_function("typeof window.__gameforgeTelemetry === 'function'", timeout=20000)
    assert tele(page)["state"] == "menu", (slug, "não abriu no menu")
    page.locator("#start").click()
    page.wait_for_function("window.__gameforgeTelemetry().state === 'play'", timeout=10000)

def run():
    matrix = json.loads((OUTPUT / "matrix.json").read_text(encoding="utf-8"))
    mapped = {item["slug"]: item for item in matrix}
    manifest = json.loads((OUTPUT / "gameplay-training.json").read_text(encoding="utf-8"))
    assert len(manifest) == 3, "Esperados 3 jogos de treinamento gerados"
    for slug, _, _ in SCENES:
        assert slug in mapped, slug
        read_export(slug, mapped[slug]["files"])
    for entry in manifest:
        read_export(entry["slug"], entry["files"])
    screenshots = OUTPUT / "screenshots"
    screenshots.mkdir(parents=True, exist_ok=True)
    results, failures = [], []
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
                      "--enable-webgl", "--disable-dev-shm-usage"],
            )
            try:
                for slug, key, move_required in SCENES:
                    page = browser.new_page(viewport={"width": 960, "height": 720})
                    errors, externals = [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    def route(request):
                        if not request.request.url.startswith(origin + "/"):
                            externals.append(request.request.url)
                            request.abort()
                        else:
                            request.continue_()
                    page.route("**/*", route)
                    try:
                        play(page, origin, slug)
                        before = tele(page)
                        assert isinstance(before.get("clock"), (int, float)), (slug, before)
                        page.keyboard.down(key)
                        page.wait_for_timeout(420)
                        page.keyboard.up(key)
                        moved = tele(page)
                        assert moved["state"] == "play", (slug, "interrompeu a sessão", moved)
                        assert moved["clock"] > before["clock"] + 0.12, (slug, "simulação travada")
                        for coordinate in ["x", "y"]:
                            assert math.isfinite(moved["player"][coordinate]), (slug, coordinate)
                        if move_required:
                            displacement = abs(moved["player"]["x"] - before["player"]["x"])
                            assert displacement > 0.35, (slug, "tecla não moveu o jogador", displacement)
                        page.locator("#pause").click()
                        page.wait_for_function("window.__gameforgeTelemetry().paused === true", timeout=5000)
                        frozen = tele(page)
                        page.wait_for_timeout(300)
                        still = tele(page)
                        assert abs(still["clock"] - frozen["clock"]) < 0.04, (slug, "relógio avançou na pausa")
                        assert still["frames"] > frozen["frames"], (slug, "renderização parou junto da pausa")
                        page.locator("#pause").click()
                        page.wait_for_function("window.__gameforgeTelemetry().paused === false", timeout=5000)
                        page.wait_for_timeout(230)
                        resumed = tele(page)
                        assert resumed["clock"] > still["clock"] + 0.07, (slug, "retomada não simulou")
                        page.locator("#restart").click()
                        page.wait_for_function("window.__gameforgeTelemetry().state === 'play'", timeout=6000)
                        restarted = tele(page)
                        assert restarted["clock"] < resumed["clock"], (slug, "reinício não zerou relógio")
                        assert not errors, (slug, errors)
                        assert not externals, (slug, "depende de rede externa", externals)
                        results.append({"slug":slug,"checks":["boot","teclado","simulação","pausa","retomada","reinício","sem JS errors","offline"]})
                    except Exception:
                        page.screenshot(path=str(screenshots / (slug + "-gftrain04-failure.png")), full_page=True)
                        failures.append((slug, traceback.format_exc(), errors, externals))
                    finally:
                        page.close()

                for entry in manifest:
                    slug = entry["slug"]
                    page = browser.new_page(viewport={"width": 960, "height": 720})
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    try:
                        play(page, origin, slug)
                        initial = tele(page)
                        if slug == "training-3d-survive":
                            assert initial["missionMode"] == "survive", initial
                            assert initial["missionReady"] is False, initial
                            page.wait_for_function(
                                "window.__gameforgeTelemetry().missionReady === true", timeout=12000)
                            done = tele(page)
                            assert done["surviveRemaining"] == 0, done
                            assert done["state"] == "play", ("sobrevivência não completável", done)
                            checks = ["objetivo executável", "tempo cumprido", "vitória desbloqueável"]
                        elif slug == "training-3d-fps-store":
                            economy = initial["combatEconomy"]
                            assert economy and economy["credits"] >= 0, initial
                            page.keyboard.press("b")
                            page.wait_for_function(
                                "window.__gameforgeTelemetry().combatEconomy?.shopOpen === true", timeout=5000)
                            page.keyboard.press("b")
                            page.wait_for_function(
                                "window.__gameforgeTelemetry().combatEconomy?.shopOpen === false", timeout=5000)
                            checks = ["economia inicial", "loja abre e fecha"]
                        elif slug == "training-3d-boss-final":
                            assert initial["stage"] == 1 and initial["stages"] == 3, initial
                            page.keyboard.down("Space")
                            page.wait_for_timeout(300)
                            firing = tele(page)
                            page.keyboard.up("Space")
                            assert firing["playerBullets"] >= 1, ("nave não atirou", firing)
                            checks = ["campanha de 3 fases", "disparo jogável"]
                        else:
                            raise AssertionError("Jogo de treinamento desconhecido: " + slug)
                        assert not errors, (slug, errors)
                        results.append({"slug":slug,"checks":checks})
                    except Exception:
                        page.screenshot(path=str(screenshots / (slug + "-gftrain04-failure.png")), full_page=True)
                        failures.append((slug, traceback.format_exc(), errors))
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()

    (OUTPUT / "gameplay-training-results.json").write_text(
        json.dumps({"passed":results,"failed":failures}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"GF-TRAIN-04: {len(results)}/9 sessões reais aprovadas")
    if failures:
        for slug, *details in failures:
            print("FALHA", slug, *details)
        raise AssertionError(f"{len(failures)} sessão(ões) falharam no Chromium")
    assert len(results) == 9, "A matriz de gameplay perdeu cenários"

if __name__ == "__main__":
    run()
