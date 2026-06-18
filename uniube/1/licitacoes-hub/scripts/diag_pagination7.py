"""Analisa POST request/response da paginação."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


def setup(page):
    page.goto(CONSULTA_URL, wait_until="networkidle", timeout=90000)
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)


captured = {"req": None, "resp_body": None}


def on_request(req):
    if req.method == "POST" and "licitacoescon" in req.url and captured["req"] is None:
        captured["req"] = req.post_data


def on_response(resp):
    if resp.request.method == "POST" and "licitacoescon" in resp.url and captured["resp_body"] is None:
        try:
            captured["resp_body"] = resp.body().decode("utf-8", errors="replace")
        except Exception:
            pass


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    page.on("request", on_request)
    page.on("response", on_response)

    setup(page)
    page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]").click()
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    req = captured["req"] or ""
    print("=== POST data (keys) ===")
    for part in req.split("&"):
        if any(k in part for k in ["ano", "Empresa", "navDe", "ViewState", "j_id176", "formulario"]):
            print(part[:200])

    body = captured["resp_body"] or ""
    print(f"\n=== Response len={len(body)} ===")
    for needle in ["PE 12/2026", "CR 213/2023", "101 até", "de 176", "de 2", "codigoEmpresa", "2026"]:
        print(f"  {needle!r}: {body.count(needle)}")

    # trecho com paginação
    for marker in ["101 até", "1 até 100", "de 176"]:
        idx = body.find(marker)
        if idx >= 0:
            print(f"\ncontext {marker}: ...{body[idx:idx+120]}...")

    with open("/tmp/pag_resp.xml", "w") as f:
        f.write(body)
    print("\nsaved /tmp/pag_resp.xml")

    browser.close()
