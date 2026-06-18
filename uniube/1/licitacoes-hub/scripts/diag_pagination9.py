"""Testa botaoAcaoRecuperaPorDemanda e parse da resposta AJAX."""
import re
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


def count_from_response(body: str):
    pe = len(re.findall(r"PE \d+/\d{4}", body))
    cr = len(re.findall(r"CR \d+/\d{4}", body))
    pag = re.findall(r"(\d+) até (\d+) de (\d+)", body)
    return pe, cr, pag


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    setup(page)

    resp_body = {"v": ""}

    def on_resp(resp):
        if resp.request.method == "POST" and "licitacoescon" in resp.url:
            try:
                resp_body["v"] = resp.body().decode("utf-8", errors="replace")
            except Exception:
                pass

    page.on("response", on_resp)

    page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]").click()
    page.wait_for_load_state("networkidle")
    time.sleep(5)

    pe, cr, pag = count_from_response(resp_body["v"])
    print("Resposta AJAX após próximo: PE=", pe, "CR=", cr, "pag=", pag)

    # tentar botaoAcaoRecuperaPorDemanda após paginar
    page.evaluate(
        """() => {
            const b = document.querySelector('#corpo\\\\:formulario\\\\:botaoAcaoRecuperaPorDemanda');
            if (b) b.click();
        }"""
    )
    page.wait_for_load_state("networkidle")
    time.sleep(5)
    pe2, cr2, pag2 = count_from_response(resp_body["v"])
    rows = 0
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            rows = len(table.query_selector_all("tr")) - 1
    print("Após RecuperaPorDemanda: dom_rows=", rows, "resp PE=", pe2, "CR=", cr2, "pag=", pag2)

    browser.close()
