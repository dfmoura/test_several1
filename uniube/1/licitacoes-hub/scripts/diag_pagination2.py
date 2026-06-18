"""Testes de navegação por navDe e inspeção completa."""
import re
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT

PAG_RE = re.compile(r"(\d+)\s+até\s+(\d+)\s+de\s+(\d+)", re.I)


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


def stats(page, label):
    nav = page.query_selector("#licitacoesNav")
    nav_txt = nav.inner_text() if nav else ""
    nav_de = page.input_value("#navDe") if page.query_selector("#navDe") else "?"
    rows = 0
    for table in page.query_selector_all("table"):
        h = table.query_selector("tr")
        if h and "Processo" in h.inner_text():
            rows = len(table.query_selector_all("tr")) - 1
    matches = PAG_RE.findall(nav_txt)
    prox = page.query_selector("#licitacoesNav .iNavProximo")
    print(f"{label}: navDe={nav_de} rows={rows} matches={matches} prox={bool(prox)}")
    print(f"  nav text: {nav_txt.replace(chr(10), ' ')[:200]}")


def click_proximo_playwright(page):
    btn = page.locator("#licitacoesNav button").filter(has=page.locator(".iNavProximo"))
    btn.first.click(timeout=10000)


def click_proximo_nativo(page):
    page.evaluate(
        """() => {
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            const btn = icon?.closest('button');
            if (!btn) return;
            btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
        }"""
    )


def paginar_navde(page, offset):
    """Define navDe e dispara submit via botão próximo (onclick chain)."""
    page.evaluate(
        f"""() => {{
            const navDe = document.querySelector('#navDe');
            if (navDe) navDe.value = '{offset}';
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            const btn = icon?.closest('button');
            if (btn) btn.click();
        }}"""
    )


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False, args=["--no-sandbox"])
    page = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1400, "height": 900}).new_page()

    print("=== Teste 1: Playwright click ===")
    setup(page)
    stats(page, "p1")
    click_proximo_playwright(page)
    try:
        page.wait_for_function(
            "() => { const v = document.querySelector('#navDe')?.value; return v && parseInt(v,10) > 1; }",
            timeout=15000,
        )
    except Exception as e:
        print(f"  wait navDe>1 timeout: {e}")
    page.wait_for_load_state("networkidle")
    time.sleep(4)
    stats(page, "p2 playwright")

    print("\n=== Teste 2: Fresh + navDe=101 antes do click ===")
    setup(page)
    stats(page, "p1 fresh")
    paginar_navde(page, 101)
    page.wait_for_load_state("networkidle")
    time.sleep(4)
    stats(page, "p2 navde101")

    print("\n=== Teste 3: Página 2 depois página 3 (navDe=201) ===")
    if page.query_selector("#licitacoesNav .iNavProximo"):
        paginar_navde(page, 201)
        page.wait_for_load_state("networkidle")
        time.sleep(4)
        stats(page, "p3 navde201")

    print("\n=== Teste 4: Todos matches no body ===")
    setup(page)
    body = page.inner_text("body")
    all_m = PAG_RE.findall(body)
    print(f"matches in body on p1: {all_m}")

    click_proximo_playwright(page)
    page.wait_for_load_state("networkidle")
    time.sleep(4)
    body2 = page.inner_text("body")
    all_m2 = PAG_RE.findall(body2)
    print(f"matches in body on p2: {all_m2}")

    browser.close()
