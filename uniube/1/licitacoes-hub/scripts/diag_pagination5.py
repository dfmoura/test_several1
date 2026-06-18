"""Testa URLs diferentes e char codes do total corrompido."""
import time
from playwright.sync_api import sync_playwright
from app.config import BASE_URL, USER_AGENT

URLS = [
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon?evento=y&descricaoEmpresaLicitacao=2&modoJanelaPlc=popup",
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon?evento=y&descricaoEmpresaLicitacao=0&modoJanelaPlc=popup",
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon?evento=y&modoJanelaPlc=popup",
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon?evento=y&descricaoEmpresaLicitacao=1&modoJanelaPlc=popup",
]


def test_url(page, url):
    page.goto(url, wait_until="networkidle", timeout=90000)
    time.sleep(2)
    sel = page.query_selector('select[id="corpo:formulario:codigoEmpresaLicitacao"]')
    if not sel:
        print(f"  sem select empresa")
        return
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    pag_cell = page.evaluate(
        """() => {
            for (const table of document.querySelectorAll('table')) {
                const row = table.querySelector('tr');
                if (!row) continue;
                const t = row.innerText;
                if (t.includes('até') && t.includes('de')) {
                    const cell = [...row.querySelectorAll('th,td')].find(c => c.innerText.includes('de'));
                    if (cell) return { text: cell.innerText, codes: [...cell.innerText].map(c => c.charCodeAt(0)) };
                }
            }
            return null;
        }"""
    )
    rows = page.evaluate(
        """() => {
            for (const table of document.querySelectorAll('table')) {
                const h = table.querySelector('tr');
                if (h && h.innerText.includes('Processo')) return table.querySelectorAll('tr').length - 1;
            }
            return 0;
        }"""
    )
    print(f"  p1: pag={pag_cell} data_rows={rows}")

    page.locator("#licitacoesNav button").filter(has=page.locator(".iNavProximo")).first.click()
    page.wait_for_load_state("networkidle")
    time.sleep(4)

    pag2 = page.evaluate(
        """() => {
            for (const table of document.querySelectorAll('table')) {
                const row = table.querySelector('tr');
                if (!row) continue;
                const t = row.innerText;
                if (t.includes('até') && t.includes('de')) {
                    const cell = [...row.querySelectorAll('th,td')].find(c => c.innerText.includes('de'));
                    if (cell) return { text: cell.innerText, codes: [...cell.innerText].map(c => c.charCodeAt(0)) };
                }
            }
            return null;
        }"""
    )
    rows2 = page.evaluate(
        """() => {
            for (const table of document.querySelectorAll('table')) {
                const h = table.querySelector('tr');
                if (h && h.innerText.includes('Processo')) return table.querySelectorAll('tr').length - 1;
            }
            return 0;
        }"""
    )
    print(f"  p2: pag={pag2} data_rows={rows2}")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()

    for url in URLS:
        print(f"\nURL: {url.split('?')[1]}")
        test_url(page, url)

    browser.close()
