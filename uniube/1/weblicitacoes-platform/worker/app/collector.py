from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Callable
from urllib.parse import urljoin

from playwright.sync_api import Browser, Page, sync_playwright

from app.config import EMPRESAS, settings
from app.portal import (
    ano_option_value,
    create_browser_context,
    open_consulta,
    select_ano,
    select_empresa,
)
from app.utils import build_detalhe_url, extrair_modalidade, limpar_texto, parse_data_br


@dataclass
class ArquivoRecord:
    nome_arquivo: str | None = None
    url_download: str | None = None
    ordem: int | None = None


@dataclass
class LicitacaoRecord:
    empresa_codigo: str | None = None
    empresa_nome: str | None = None
    ano: int | None = None
    processo: str | None = None
    processo_numero: str | None = None
    modalidade: str | None = None
    descricao_edital: str | None = None
    objeto: str | None = None
    data_abertura: str | None = None
    data_habilitacao: str | None = None
    data_julgamento: str | None = None
    data_homologacao: str | None = None
    situacao: str | None = None
    chave: str | None = None
    descricao_habilitacao: str | None = None
    solicitante: str | None = None
    valor_licitacao: str | None = None
    local_abertura: str | None = None
    data_visita_tecnica: str | None = None
    responsavel_visita_tecnica: str | None = None
    local_saida_visita_tecnica: str | None = None
    observacoes: str | None = None
    link_pncp: str | None = None
    link_compras_gov: str | None = None
    detalhe_url: str | None = None
    detalhe_path: str | None = None
    detalhe_coletado: bool = False
    arquivos: list[ArquivoRecord] = field(default_factory=list)


DETAIL_LABEL_MAP = {
    "descrição do edital": "descricao_edital",
    "descricao do edital": "descricao_edital",
    "processo licitatório nº": "processo_numero",
    "processo licitatorio n": "processo_numero",
    "processo licitatório n": "processo_numero",
    "data abertura": "data_abertura",
    "local da abertura": "local_abertura",
    "data da visita técnica": "data_visita_tecnica",
    "data da visita tecnica": "data_visita_tecnica",
    "responsável visita técnica": "responsavel_visita_tecnica",
    "responsavel visita tecnica": "responsavel_visita_tecnica",
    "local de saída visita técnica": "local_saida_visita_tecnica",
    "local de saida visita tecnica": "local_saida_visita_tecnica",
    "habilitação": "descricao_habilitacao",
    "habilitacao": "descricao_habilitacao",
    "data habilitação": "data_habilitacao",
    "data habilitacao": "data_habilitacao",
    "julgamento": "data_julgamento",
    "data julgamento": "data_julgamento",
    "homologação": "data_homologacao",
    "homologacao": "data_homologacao",
    "data homologação": "data_homologacao",
    "data homologacao": "data_homologacao",
    "situação": "situacao",
    "situacao": "situacao",
    "modalidade": "modalidade",
    "objeto": "objeto",
    "solicitante": "solicitante",
    "valor da licitação": "valor_licitacao",
    "valor da licitacao": "valor_licitacao",
    "valor licitação": "valor_licitacao",
    "valor licitacao": "valor_licitacao",
    "observações": "observacoes",
    "observacoes": "observacoes",
    "chave": "chave",
}


def _normalize_label(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower().rstrip(":"))


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
            detalhe_path = ""
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
                    "detalhe_path": detalhe_path,
                }
            )
        break
    return rows_data


def _extract_links_from_text(text: str) -> tuple[str | None, str | None]:
    pncp = None
    compras = None
    for url in re.findall(r"https?://[^\s\"'>]+", text):
        if "pncp.gov.br" in url and not pncp:
            pncp = url.rstrip(".,;)")
        if "gov.br/compras" in url and not compras:
            compras = url.rstrip(".,;)")
    return pncp, compras


def _parse_detail_tables(page: Page) -> dict[str, str | None]:
    fields: dict[str, str | None] = {v: None for v in DETAIL_LABEL_MAP.values()}
    fields["objeto"] = None

    for table in page.query_selector_all("table"):
        for row in table.query_selector_all("tr"):
            cells = row.query_selector_all("th, td")
            if len(cells) < 2:
                continue
            label = _normalize_label(cells[0].inner_text())
            value = limpar_texto(cells[1].inner_text())
            key = DETAIL_LABEL_MAP.get(label)
            if key and value:
                fields[key] = value
            if len(cells) == 1:
                only = limpar_texto(cells[0].inner_text())
                if only and len(only) > 30 and not fields.get("descricao_edital"):
                    fields["descricao_edital"] = only

    body_text = page.inner_text("body")
    pncp, compras = _extract_links_from_text(body_text)
    fields["link_pncp"] = pncp
    fields["link_compras_gov"] = compras
    return fields


def _parse_arquivos(page: Page) -> list[ArquivoRecord]:
    arquivos: list[ArquivoRecord] = []
    ordem = 0
    for table in page.query_selector_all("table"):
        header_cells = table.query_selector_all("tr th, tr td")
        if not header_cells:
            continue
        header_text = " ".join(c.inner_text().strip().lower() for c in header_cells[:3])
        if "nome arquivo" not in header_text and "arquivo" not in header_text:
            continue
        for row in table.query_selector_all("tr")[1:]:
            cells = row.query_selector_all("td")
            if not cells:
                continue
            nome = limpar_texto(cells[0].inner_text())
            if not nome:
                continue
            link_el = cells[0].query_selector("a")
            href = None
            if link_el:
                href = link_el.get_attribute("href")
                if href:
                    href = urljoin(settings.base_url, href)
            ordem += 1
            arquivos.append(
                ArquivoRecord(nome_arquivo=nome, url_download=href, ordem=ordem)
            )
    return arquivos


class LicitacoesCollector:
    """Coleta listagem (licitacoescon) e detalhes (licitacoesdetalhescon)."""

    def __init__(
        self,
        *,
        headless: bool | None = None,
        delay_sec: float | None = None,
        on_progress: Callable[[str], None] | None = None,
    ) -> None:
        self.headless = settings.scraper_headless if headless is None else headless
        self.delay_sec = delay_sec if delay_sec is not None else settings.scraper_delay_sec
        self.on_progress = on_progress or (lambda _msg: None)

    def _log(self, msg: str) -> None:
        self.on_progress(msg)

    def collect(
        self,
        *,
        anos: list[int] | None = None,
        empresas: list[str] | None = None,
        coletar_detalhes: bool = True,
    ) -> list[LicitacaoRecord]:
        anos = anos or [2026]
        empresas = empresas or list(EMPRESAS.keys())
        all_records: list[LicitacaoRecord] = []

        with sync_playwright() as playwright:
            browser = self._launch_browser(playwright)
            try:
                context = create_browser_context(browser)
                page = context.new_page()
                page.set_default_timeout(settings.scraper_form_timeout_ms)
                open_consulta(page, on_progress=self._log)

                for empresa_codigo in empresas:
                    empresa_nome = EMPRESAS.get(empresa_codigo, empresa_codigo)
                    for ano in anos:
                        records = self._collect_empresa_ano(
                            page,
                            empresa_codigo,
                            empresa_nome,
                            ano,
                            coletar_detalhes=coletar_detalhes,
                        )
                        all_records.extend(records)
            finally:
                browser.close()

        return all_records

    def _launch_browser(self, playwright) -> Browser:
        args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
        ]
        for headless in (self.headless, True) if not self.headless else (True,):
            mode = "headless" if headless else "headed"
            self._log(f"Iniciando Chromium ({mode})…")
            try:
                return playwright.chromium.launch(headless=headless, args=args)
            except Exception as exc:
                if headless is True and not self.headless:
                    self._log(f"  Falha headed: {exc}")
                    continue
                raise
        raise RuntimeError("Não foi possível iniciar o Chromium")

    def _collect_empresa_ano(
        self,
        page: Page,
        empresa_codigo: str,
        empresa_nome: str,
        ano: int,
        *,
        coletar_detalhes: bool,
    ) -> list[LicitacaoRecord]:
        self._log(f"Coletando {empresa_nome} — ano {ano}")
        select_empresa(page, empresa_codigo)

        ano_value = ano_option_value(page, ano)
        if ano_value is None:
            self._log(f"  Ano {ano} indisponível para {empresa_nome}")
            return []

        select_ano(page, ano_value)

        collected: list[LicitacaoRecord] = []
        seen_processos: set[str] = set()

        while True:
            page_records = _parse_results_table(page)
            for row in page_records:
                proc = row["processo"]
                if proc in seen_processos:
                    continue
                seen_processos.add(proc)
                detalhe_path = row.get("detalhe_path") or None
                detalhe_url = (
                    urljoin(settings.base_url, detalhe_path)
                    if detalhe_path
                    else build_detalhe_url(empresa_codigo, proc)
                )
                record = LicitacaoRecord(
                    empresa_codigo=empresa_codigo,
                    empresa_nome=empresa_nome,
                    ano=ano,
                    processo=proc,
                    processo_numero=proc,
                    modalidade=extrair_modalidade(proc),
                    descricao_edital=row["descricao_edital"] or None,
                    objeto=row["descricao_edital"] or None,
                    data_abertura=row["data_abertura"] or None,
                    data_habilitacao=row["habilitacao"] or None,
                    data_julgamento=row["julgamento"] or None,
                    data_homologacao=row["homologacao"] or None,
                    situacao=row["situacao"] or None,
                    detalhe_path=detalhe_path,
                    detalhe_url=detalhe_url,
                )
                if coletar_detalhes and detalhe_url:
                    self._enrich_from_detail(page, record)
                collected.append(record)

            pagination = _parse_pagination(page)
            if not pagination:
                break
            start, end, total = pagination
            self._log(f"  {empresa_nome}/{ano}: {end}/{total}")
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

    def _enrich_from_detail(self, page: Page, record: LicitacaoRecord) -> None:
        if not record.detalhe_url:
            return
        try:
            page.goto(record.detalhe_url, wait_until="networkidle", timeout=60000)
            time.sleep(self.delay_sec)
            fields = _parse_detail_tables(page)
            for attr, value in fields.items():
                if value and hasattr(record, attr):
                    current = getattr(record, attr)
                    if current in (None, "", "-", "—"):
                        setattr(record, attr, value)
            if fields.get("descricao_edital") and not record.objeto:
                record.objeto = fields["descricao_edital"]
            record.arquivos = _parse_arquivos(page)
            record.detalhe_coletado = True
            self._log(f"    Detalhe: {record.processo} ({len(record.arquivos)} arquivos)")
        except Exception as exc:
            self._log(f"    Falha detalhe {record.processo}: {exc}")
            record.detalhe_coletado = False

