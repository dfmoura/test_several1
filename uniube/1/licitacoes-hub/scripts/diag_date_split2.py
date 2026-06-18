"""Coleta por janelas de data com submit JS."""
import time
from playwright.sync_api import sync_playwright
from app.config import CONSULTA_URL, USER_AGENT


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


def pesquisar(page, ini, fim):
    page.evaluate(
        """([ini, fim]) => {
            const i = document.querySelector('#corpo\\\\:formulario\\\\:dataAbertura_ArgINI');
            const f = document.querySelector('#corpo\\\\:formulario\\\\:dataAbertura_ArgFIM');
            const aIni = document.querySelector('#corpo\\\\:formulario\\\\:alteracaoDtIni');
            const aFim = document.querySelector('#corpo\\\\:formulario\\\\:alteracaoDtFim');
            if (i) i.value = ini;
            if (f) f.value = fim;
            if (aIni) aIni.value = 'S';
            if (aFim) aFim.value = 'S';
            TrPage._autoSubmit('corpo:formulario', 'corpo:formulario:botaoPesquisa', {preventDefault(){}, stopPropagation(){}}, 1);
        }""",
        [ini, fim],
    )
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

    janelas = [
        ("01/01/2026", "31/03/2026"),
        ("01/04/2026", "30/06/2026"),
        ("01/07/2026", "30/09/2026"),
        ("01/10/2026", "31/12/2026"),
    ]
    vistos = set()
    for ini, fim in janelas:
        pesquisar(page, ini, fim)
        r = rows(page)
        p = pag(page)
        procs = []
        for table in page.query_selector_all("table"):
            h = table.query_selector("tr")
            if h and "Processo" in h.inner_text():
                for row in table.query_selector_all("tr")[1:]:
                    cells = row.query_selector_all("td")
                    if cells:
                        procs.append(cells[0].inner_text().strip())
                break
        novos = [x for x in procs if x not in vistos]
        vistos.update(procs)
        print(f"{ini}-{fim}: rows={r} pag={p!r} novos={len(novos)} acum={len(vistos)}")

    print("TOTAL único:", len(vistos))
