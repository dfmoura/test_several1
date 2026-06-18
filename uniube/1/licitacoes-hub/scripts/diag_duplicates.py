import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT).new_page()
    page.goto(CONSULTA_URL, wait_until="networkidle", timeout=90000)
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    def count_ids():
        return page.evaluate(
            """() => ({
                navDe: document.querySelectorAll('#navDe').length,
                ano: document.querySelectorAll('#corpo\\\\:formulario\\\\:ano').length,
                forms: document.querySelectorAll('#corpo\\\\:formulario').length,
                licitacoesNav: document.querySelectorAll('#licitacoesNav').length,
                plcItens: document.querySelectorAll('[id^=\"corpo:formulario:plcLogicaItens\"]').length,
            })"""
        )

    print("before:", count_ids())
    page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]").click()
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    print("after p2:", count_ids())

    browser.close()
