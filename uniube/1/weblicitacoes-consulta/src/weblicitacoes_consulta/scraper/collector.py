from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Callable

from playwright.sync_api import Browser, Page, sync_playwright

from weblicitacoes_consulta.config import (
    CONSULTA_URL,
    EMPRESAS,
    HEADLESS_DEFAULT,
    PAGE_SIZE,
    REQUEST_DELAY_SEC,
    USER_AGENT,
)


@dataclass
class LicitacaoRecord:
    empresa_codigo: str
    empresa_nome: str
    ano: int
    processo: str
    descricao_edital: str
    data_abertura: str
    habilitacao: str
    julgamento: str
    homologacao: str
    situacao: str
    detalhe_path: str | None = None


def _stealth_script() -> str:
    return "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"


def _parse_pagination(page: Page) -> tuple[int, int, int] | None:
    match = re.search(r"(\d+)\s+até\s+(\d+)\s+de\s+(\d+)", page.inner_text("body"))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def _parse_results_table(page: Page) -> list[dict[str, str]]:
    rows_data: list[dict[str, str]] = []
    for table in page.query_selector_all("table"):
        header = table.query_selector("tr")
        if not header:
            continue
        headers = [c.inner_text().strip() for c in header.query_selector_all("th, td")]
        if not any("Processo Licitatório" in h or "Descrição do Edital" in h for h in headers):
            continue
        for row in table.query_selector_all("tr")[1:]:
            cells = row.query_selector_all("td")
            if len(cells) < 7:
                continue
            link = cells[0].query_selector("a")
            detalhe_path = None
            if link:
                onclick = link.get_attribute("onclick") or ""
                path_match = re.search(r"janelaModal\('([^']+)'", onclick)
                if path_match:
                    detalhe_path = path_match.group(1)
            rows_data.append(
                {
                    "processo": cells[0].inner_text().strip(),
                    "descricao_edital": cells[1].inner_text().strip(),
                    "data_abertura": cells[2].inner_text().strip(),
                    "habilitacao": cells[3].inner_text().strip(),
                    "julgamento": cells[4].inner_text().strip(),
                    "homologacao": cells[5].inner_text().strip(),
                    "situacao": cells[6].inner_text().strip(),
                    "detalhe_path": detalhe_path or "",
                }
            )
        break
    return rows_data


class LicitacoesCollector:
    """Navega o portal Web Licitações e extrai registros paginados."""

    def __init__(
        self,
        *,
        headless: bool = HEADLESS_DEFAULT,
        delay_sec: float = REQUEST_DELAY_SEC,
        on_progress: Callable[[str], None] | None = None,
    ) -> None:
        self.headless = headless
        self.delay_sec = delay_sec
        self.on_progress = on_progress or (lambda _msg: None)

    def _log(self, msg: str) -> None:
        self.on_progress(msg)

    def collect(
        self,
        *,
        anos: list[int] | None = None,
        empresas: list[str] | None = None,
    ) -> list[LicitacaoRecord]:
        anos = anos or [2026]
        empresas = empresas or list(EMPRESAS.keys())
        all_records: list[LicitacaoRecord] = []

        with sync_playwright() as playwright:
            browser = self._launch_browser(playwright)
            try:
                context = browser.new_context(
                    user_agent=USER_AGENT,
                    locale="pt-BR",
                    viewport={"width": 1920, "height": 1080},
                )
                context.add_init_script(_stealth_script())
                page = context.new_page()
                page.goto(CONSULTA_URL, wait_until="networkidle", timeout=90000)
                time.sleep(self.delay_sec)

                for empresa_codigo in empresas:
                    empresa_nome = EMPRESAS.get(empresa_codigo, empresa_codigo)
                    for ano in anos:
                        records = self._collect_empresa_ano(page, empresa_codigo, empresa_nome, ano)
                        all_records.extend(records)
            finally:
                browser.close()

        return all_records

    def _launch_browser(self, playwright) -> Browser:
        return playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )

    def _collect_empresa_ano(
        self,
        page: Page,
        empresa_codigo: str,
        empresa_nome: str,
        ano: int,
    ) -> list[LicitacaoRecord]:
        self._log(f"Coletando {empresa_nome} — ano {ano}…")
        page.select_option("#corpo\\:formulario\\:codigoEmpresaLicitacao", empresa_codigo)
        page.wait_for_load_state("networkidle")
        time.sleep(self.delay_sec)

        ano_value = self._ano_to_option_value(page, ano)
        if ano_value is None:
            self._log(f"  Ano {ano} não disponível para {empresa_nome}")
            return []

        page.select_option("#corpo\\:formulario\\:ano", ano_value)
        page.wait_for_load_state("networkidle")
        time.sleep(self.delay_sec)

        collected: list[LicitacaoRecord] = []
        seen_processos: set[str] = set()

        while True:
            page_records = _parse_results_table(page)
            for row in page_records:
                proc = row["processo"]
                if proc in seen_processos:
                    continue
                seen_processos.add(proc)
                collected.append(
                    LicitacaoRecord(
                        empresa_codigo=empresa_codigo,
                        empresa_nome=empresa_nome,
                        ano=ano,
                        processo=proc,
                        descricao_edital=row["descricao_edital"],
                        data_abertura=row["data_abertura"],
                        habilitacao=row["habilitacao"],
                        julgamento=row["julgamento"],
                        homologacao=row["homologacao"],
                        situacao=row["situacao"],
                        detalhe_path=row.get("detalhe_path") or None,
                    )
                )

            pagination = _parse_pagination(page)
            if not pagination:
                break
            start, end, total = pagination
            self._log(f"  {empresa_nome}/{ano}: {end}/{total} registros")
            if end >= total:
                break

            next_btn = page.query_selector("#licitacoesNav button .iNavProximo")
            if not next_btn:
                break
            next_btn.evaluate("el => el.closest('button').click()")
            page.wait_for_load_state("networkidle")
            time.sleep(self.delay_sec)

        self._log(f"  → {len(collected)} licitações")
        return collected

    @staticmethod
    def _ano_to_option_value(page: Page, ano: int) -> str | None:
        options = page.locator("#corpo\\:formulario\\:ano option").all()
        for opt in options:
            if opt.inner_text().strip() == str(ano):
                value = opt.get_attribute("value")
                if value is not None:
                    return value
        return None
