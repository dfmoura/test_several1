"""Lista todos os botões de navegação e testa iNavUltimo / anterior."""
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


def data_rows(page):
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            return len(table.query_selector_all("tr")) - 1
    return 0


def pag_text(page):
    return page.evaluate(
        """() => {
            for (const table of document.querySelectorAll('table')) {
                const row = table.querySelector('tr');
                if (row && row.innerText.includes('até')) return row.innerText.trim();
            }
            return '?';
        }"""
    )


def list_nav_buttons(page):
    return page.evaluate(
        """() => {
            const nav = document.querySelector('#licitacoesNav');
            if (!nav) return [];
            return [...nav.querySelectorAll('button')].map(btn => ({
                cls: btn.className,
                onclick: (btn.getAttribute('onclick') || '').slice(0, 120),
                icons: [...btn.querySelectorAll('span, i')].map(x => x.className).join(','),
                disabled: btn.disabled
            }));
        }"""
    )


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    setup(page)
    print("P1:", pag_text(page), "rows=", data_rows(page))
    for b in list_nav_buttons(page):
        print(" ", b)

    # último
    for cls in [".iNavUltimo", ".iNavProximo", ".iNavAnterior", ".iNavPrimeiro"]:
        el = page.query_selector(f"#licitacoesNav {cls}")
        print(f"icon {cls}: {bool(el)}")

    ult = page.query_selector("#licitacoesNav .iNavUltimo")
    if ult:
        ult.evaluate("el => el.closest('button').click()")
        page.wait_for_load_state("networkidle")
        time.sleep(4)
        print("Após último:", pag_text(page), "rows=", data_rows(page))

    browser.close()
