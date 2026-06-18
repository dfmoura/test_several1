"""Executa onclick do botão próximo e inspeciona tabela de paginação."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


def setup(page):
    page.goto(CONSULTA_URL, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_selector('select[id="corpo:formulario:codigoEmpresaLicitacao"]')
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)


def pag_table_cells(page):
    for i, table in enumerate(page.query_selector_all("table")):
        rows = table.query_selector_all("tr")
        if not rows:
            continue
        h = rows[0].inner_text()
        if "até" in h and "de" in h:
            cells = rows[0].query_selector_all("th, td")
            parts = [c.inner_text().strip() for c in cells]
            print(f"  pag table[{i}] cells: {parts}")
            if len(rows) > 1:
                for ri, row in enumerate(rows[1:3]):
                    parts2 = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
                    print(f"    row{ri+1}: {parts2}")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    setup(page)
    print("=== Página 1 ===")
    pag_table_cells(page)

    onclick = page.evaluate(
        """() => {
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            const btn = icon?.closest('button');
            return btn ? btn.getAttribute('onclick') : null;
        }"""
    )
    print(f"onclick próximo: {onclick[:200] if onclick else None}...")

    # Método: eval onclick via _chain
    page.evaluate(
        """() => {
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            const btn = icon?.closest('button');
            if (!btn) return;
            const fn = new Function('event', btn.getAttribute('onclick').replace(/^return /, ''));
            fn({ preventDefault: () => {}, stopPropagation: () => {} });
        }"""
    )
    page.wait_for_load_state("networkidle")
    time.sleep(5)
    print("\n=== Página 2 (onclick via Function) ===")
    pag_table_cells(page)
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            print(f"  data rows: {len(table.query_selector_all('tr'))-1}")

    browser.close()
