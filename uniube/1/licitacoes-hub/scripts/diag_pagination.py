"""Diagnóstico de paginação do portal — executar dentro do container."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


def nav_html(page):
    el = page.query_selector("#licitacoesNav")
    return el.inner_html() if el else None


def count_rows(page):
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            return len(table.query_selector_all("tr")) - 1
    return 0


def nav_text(page):
    el = page.query_selector("#licitacoesNav")
    return el.inner_text().strip() if el else "?"


def dump(label, page):
    print(f"\n=== {label} ===")
    print(f"nav: {nav_text(page)!r}")
    print(f"rows: {count_rows(page)}")
    html = nav_html(page)
    if html:
        print(f"nav html (first 800): {html[:800]}")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    ctx = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900})
    page = ctx.new_page()
    page.goto(CONSULTA_URL, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_selector('select[id="corpo:formulario:codigoEmpresaLicitacao"]')
    time.sleep(2)
    page.locator('select[id="corpo:formulario:codigoEmpresaLicitacao"]').select_option("0")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    dump("Página 1", page)

    # Método A: JS click no botão próximo
    print("\n--- Método A: JS click .iNavProximo ---")
    page.evaluate(
        "() => document.querySelector('#licitacoesNav .iNavProximo')?.closest('button')?.click()"
    )
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    dump("Após A", page)

    # Voltar página 1 recarregando filtros
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2025")
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    dump("Reset pág 1", page)

    # Método B: Playwright locator click
    print("\n--- Método B: locator click ---")
    btn = page.locator("#licitacoesNav .iNavProximo").locator("xpath=ancestor::button[1]")
    if btn.count():
        btn.first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(3)
    dump("Após B", page)

    # Reset
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2025")
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Método C: input de página se existir
    print("\n--- Método C: inspecionar inputs no nav ---")
    inputs = page.evaluate(
        """() => {
            const nav = document.querySelector('#licitacoesNav');
            if (!nav) return [];
            return [...nav.querySelectorAll('input, select, button, a')].map(el => ({
                tag: el.tagName,
                type: el.type || '',
                id: el.id,
                name: el.name,
                value: el.value,
                cls: el.className,
                text: (el.innerText || '').trim().slice(0, 40),
                disabled: el.disabled
            }));
        }"""
    )
    for inp in inputs:
        print(inp)

    browser.close()
