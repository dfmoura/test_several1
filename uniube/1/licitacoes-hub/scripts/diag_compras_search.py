"""Diagnóstico — pesquisa Compras.gov e interceptação de APIs."""
from __future__ import annotations

import json
import time

from playwright.sync_api import sync_playwright

from app.config import USER_AGENT

URL = "https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras"
UNIDADE = "926922"


def main() -> None:
    api_calls: list[dict] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        ctx = browser.new_context(user_agent=USER_AGENT, locale="pt-BR", viewport={"width": 1400, "height": 900})
        ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = ctx.new_page()

        def on_resp(resp):
            u = resp.url
            if "comprasnet-fase-externa" in u or (
                "cnetmobile" in u and resp.request.resource_type in ("xhr", "fetch")
            ):
                entry = {"url": u, "method": resp.request.method, "status": resp.status}
                try:
                    if resp.status == 200 and "json" in (resp.headers.get("content-type") or ""):
                        entry["json"] = resp.json()
                except Exception:
                    pass
                api_calls.append(entry)

        page.on("response", on_resp)
        page.goto(URL, wait_until="domcontentloaded", timeout=90000)
        time.sleep(3)

        # unidade compradora
        page.locator("#unidadeCompradora").fill(UNIDADE)
        time.sleep(1)

        # clicar pesquisar
        btn = page.get_by_role("button", name="Pesquisar")
        if btn.count():
            btn.first.click()
        else:
            page.locator("button:has-text('Pesquisar')").first.click()
        time.sleep(8)

        info = page.evaluate(
            """() => {
                const pag = document.querySelector('mat-paginator');
                const rows = [...document.querySelectorAll('table tbody tr, mat-row, .mat-row')];
                const links = [...document.querySelectorAll('a, button')].filter(el =>
                    /acompanhar|contrata/i.test(el.innerText || '')
                ).map(el => ({tag: el.tagName, txt: el.innerText.slice(0,80), href: el.getAttribute('href')}));
                return {
                    paginator: pag ? pag.innerText : null,
                    rowCount: rows.length,
                    bodySnippet: document.body.innerText.slice(0, 2500),
                    links,
                };
            }"""
        )
        print("INFO", json.dumps(info, ensure_ascii=False, indent=2)[:5000])
        print("APIS", json.dumps(api_calls, ensure_ascii=False, indent=2)[:12000])
        browser.close()


if __name__ == "__main__":
    main()
