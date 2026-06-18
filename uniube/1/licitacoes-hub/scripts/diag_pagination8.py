"""Captura POST somente após clique próximo."""
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


def rows(page):
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            return len(table.query_selector_all("tr")) - 1
    return 0


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()
    setup(page)
    print("P1 rows", rows(page))

    posts = []
    page.on("request", lambda r: posts.append(r) if r.method == "POST" and "licitacoescon" in r.url else None)

    # Método A: click normal
    page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]").click()
    page.wait_for_load_state("networkidle")
    time.sleep(4)
    print("Após click rows", rows(page))
    if posts:
        data = posts[-1].post_data or ""
        for key in ["navDe=", "source=", "ano=", "codigoEmpresa", "j_id176", "j_id177"]:
            for part in data.split("&"):
                if key in part:
                    print(" ", part)

    # Reset
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2025")
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    posts.clear()
    print("\nReset P1 rows", rows(page))

    # Método B: TrPage._autoSubmit manual
    meta = page.evaluate(
        """() => {
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            const btn = icon?.closest('button');
            const onclick = btn?.getAttribute('onclick') || '';
            const m = onclick.match(/corpo:formulario:j_id\\d+/);
            return { onclick: onclick.slice(0, 200), source: m ? m[0] : null };
        }"""
    )
    print("meta", meta)

    page.evaluate(
        """(source) => {
            const navDe = document.querySelector('#navDe');
            if (navDe) navDe.value = '101';
            const ev = { preventDefault: () => {}, stopPropagation: () => {} };
            TrPage._autoSubmit('corpo:formulario', source, ev, 1);
        }""",
        meta["source"],
    )
    page.wait_for_load_state("networkidle")
    time.sleep(4)
    print("Após TrPage rows", rows(page))
    if posts:
        data = posts[-1].post_data or ""
        for key in ["navDe=", "source=", "ano="]:
            for part in data.split("&"):
                if key in part:
                    print(" ", part)

    browser.close()
