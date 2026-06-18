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

    opts = page.evaluate(
        """() => [...document.querySelectorAll('#corpo\\\\:formulario\\\\:ano option')]
            .map(o => ({value: o.value, text: o.textContent.trim()}))"""
    )
    print("ano options:", opts)

    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2026")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    sel = page.evaluate(
        """() => {
            const s = document.querySelector('#corpo\\\\:formulario\\\\:ano');
            return {value: s.value, selectedText: s.options[s.selectedIndex]?.text};
        }"""
    )
    print("after select 2026:", sel)

    # posts on ano change
    posts = []
    page.on("request", lambda r: posts.append(r.post_data) if r.method == "POST" else None)
    page.locator('select[id="corpo:formulario:ano"]').select_option(label="2025")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    if posts:
        for p in (posts[-1] or "").split("&"):
            if "ano=" in p or "alteracaoAno" in p or "source=" in p:
                print("post ano change:", p)

    browser.close()
