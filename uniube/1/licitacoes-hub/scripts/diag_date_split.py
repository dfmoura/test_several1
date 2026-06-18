"""Testa coleta por intervalo de datas (evita paginação)."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT

SEL_INI = 'input[id="corpo:formulario:dataAbertura_ArgINI"]'
SEL_FIM = 'input[id="corpo:formulario:dataAbertura_ArgFIM"]'
SEL_PESQUISA = 'button[id="corpo:formulario:botaoPesquisa"]'


def rows(page):
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            return len(table.query_selector_all("tr")) - 1
    return 0


def pag(page):
    for table in page.query_selector_all("table"):
        row = table.query_selector("tr")
        if row and "até" in row.inner_text():
            return row.inner_text().strip()
    return "?"


def buscar(page, ini, fim):
    page.locator(SEL_INI).fill(ini)
    page.locator(SEL_FIM).fill(fim)
    page.locator(SEL_PESQUISA).click()
    page.wait_for_load_state("networkidle")
    time.sleep(3)


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    page.goto(CONSULTA_URL, wait_until="networkidle", timeout=90000)
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    print("Ano 2026 inteiro:", pag(page), "rows=", rows(page))

    total = 0
    for mes in range(1, 13):
        ini = f"01/{mes:02d}/2026"
        # último dia simplificado
        fim = f"28/{mes:02d}/2026" if mes == 2 else (f"30/{mes:02d}/2026" if mes in (4, 6, 9, 11) else f"31/{mes:02d}/2026")
        buscar(page, ini, fim)
        r = rows(page)
        p = pag(page)
        total += r
        print(f"  {ini}-{fim}: rows={r} pag={p}")

    print("soma meses (com duplicatas possíveis):", total)
    browser.close()
