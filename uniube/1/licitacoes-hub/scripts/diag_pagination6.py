"""Compara processos página 1/2 com CSV e captura rede no clique."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


def processos(page):
    procs = []
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if not h or "Processo" not in h.inner_text():
            continue
        for row in table.query_selector_all("tr")[1:]:
            cells = row.query_selector_all("td")
            if cells:
                p = cells[0].inner_text().strip()
                if p:
                    procs.append(p)
        break
    return procs


def setup(page):
    page.goto(CONSULTA_URL, wait_until="networkidle", timeout=90000)
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()

    responses = []

    def on_resp(resp):
        if resp.request.method == "POST" and "licitacoescon" in resp.url:
            responses.append({"url": resp.url, "status": resp.status, "len": len(resp.body() or b"")})

    page.on("response", on_resp)

    setup(page)
    p1 = processos(page)
    print(f"P1 count={len(p1)}")
    print(f"  first: {p1[:3]}")
    print(f"  last:  {p1[-3:]}")

    with page.expect_response(lambda r: r.request.method == "POST", timeout=30000) as resp_info:
        page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]").click()
    resp = resp_info.value
    print(f"POST status={resp.status} body_len={len(resp.body())}")
    page.wait_for_load_state("networkidle")
    time.sleep(5)

    p2 = processos(page)
    print(f"P2 count={len(p2)} procs={p2}")

    # navDe e campos hidden
    hidden = page.evaluate(
        """() => [...document.querySelectorAll('input[type=hidden]')]
            .filter(i => i.name && (i.name.includes('formulario') || i.id === 'navDe'))
            .map(i => ({id: i.id, name: i.name, value: (i.value||'').slice(0,80)}))"""
    )
    print("hidden fields sample:", hidden[:15])

    browser.close()
