"""Inspeciona todas as tabelas e HTML na página 2."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


def setup(page, empresa="0", ano="2026"):
    page.goto(CONSULTA_URL, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_selector('select[id="corpo:formulario:codigoEmpresaLicitacao"]')
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option(empresa)
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label=ano)
    page.wait_for_load_state("networkidle")
    time.sleep(3)


def dump_tables(page):
    for i, table in enumerate(page.query_selector_all("table")):
        rows = table.query_selector_all("tr")
        if not rows:
            continue
        h = rows[0].inner_text().strip().replace("\n", " | ")[:120]
        print(f"  table[{i}]: {len(rows)-1} data rows, header={h!r}")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()

    for emp, nome in [("0", "PMU"), ("2", "emp2")]:
        print(f"\n===== Empresa {emp} ({nome}) =====")
        setup(page, emp)
        nav = page.query_selector("#licitacoesNav")
        print(f"P1 nav: {nav.inner_text().strip()!r}")
        dump_tables(page)

        page.locator("#licitacoesNav button").filter(has=page.locator(".iNavProximo")).first.click()
        page.wait_for_load_state("networkidle")
        for wait in [2, 5, 10]:
            time.sleep(wait)
            nav2 = page.query_selector("#licitacoesNav")
            txt = nav2.inner_text().strip() if nav2 else "?"
            nrows = sum(
                len(t.query_selector_all("tr")) - 1
                for t in page.query_selector_all("table")
                if t.query_selector("tr") and "Processo" in t.query_selector("tr").inner_text()
            )
            print(f"  t+{wait}s: nav={txt!r} processo-rows={nrows}")
        dump_tables(page)

        # nav outer html snippet with "de"
        if nav2:
            html = nav2.inner_html()
            idx = html.lower().find("de")
            print(f"  nav html around 'de': ...{html[max(0,idx-80):idx+80]}...")

    browser.close()
