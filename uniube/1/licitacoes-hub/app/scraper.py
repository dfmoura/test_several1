from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable
from urllib.parse import quote, urljoin

from playwright.sync_api import Page, sync_playwright

from app.config import BASE_URL, CONSULTA_URL, DELAY_SEC, EMPRESAS, HEADLESS, USER_AGENT

SEL_EMPRESA = 'select[id="corpo:formulario:codigoEmpresaLicitacao"]'
SEL_ANO = 'select[id="corpo:formulario:ano"]'
SEL_NAV = "#licitacoesNav"
PAGE_SIZE = 100
MAX_PAGINAS = 500
MAX_SUBDIVISOES = 24
PAGINACAO_RE = re.compile(r"(\d+)\s+até\s+(\d+)\s+de\s+(\d+)", re.IGNORECASE)


@dataclass
class LicitacaoItem:
    empresa_codigo: str
    empresa_nome: str
    ano: int
    processo: str
    modalidade: str | None
    descricao_edital: str | None
    data_abertura: str | None
    habilitacao: str | None
    julgamento: str | None
    homologacao: str | None
    situacao: str | None
    detalhe_url: str | None


def _modalidade(processo: str) -> str | None:
    m = re.match(r"^([A-Z]{1,4})\s", processo.strip())
    return m.group(1) if m else None


def _detalhe_url(codigo: str, processo: str) -> str:
    lic = quote(processo.strip(), safe="")
    return (
        f"{BASE_URL}/weblicitacoes/f/n/licitacoesdetalhescon"
        f"?modoJanelaPlc=popup&evento=y&codigoEmpresa={codigo}"
        f"&licitacao={lic}"
    )


def _parse_br_date(texto: str) -> datetime:
    dia, mes, ano = texto.split("/")
    return datetime(int(ano), int(mes), int(dia))


def _format_br_date(data: datetime) -> str:
    return data.strftime("%d/%m/%Y")


def _subdividir_janela(data_ini: str, data_fim: str) -> list[tuple[str, str]]:
    inicio = _parse_br_date(data_ini)
    fim = _parse_br_date(data_fim)
    if inicio >= fim:
        return []
    meio = inicio + (fim - inicio) / 2
    meio = meio.replace(hour=0, minute=0, second=0, microsecond=0)
    esquerda_fim = meio
    direita_ini = meio + timedelta(days=1)
    if direita_ini > fim:
        return []
    return [
        (_format_br_date(inicio), _format_br_date(esquerda_fim)),
        (_format_br_date(direita_ini), _format_br_date(fim)),
    ]


def _parse_table(page: Page) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for table in page.query_selector_all("table"):
        header = table.query_selector("tr")
        if not header:
            continue
        headers = [c.inner_text().strip() for c in header.query_selector_all("th, td")]
        if not any(
            "Processo Licitatório" in h or "Processo Licitatorio" in h or h.startswith("Processo")
            for h in headers
        ):
            continue
        for row in table.query_selector_all("tr")[1:]:
            cells = row.query_selector_all("td")
            if len(cells) < 7:
                continue
            processo = cells[0].inner_text().strip()
            if not processo:
                continue
            detalhe_path = ""
            link = cells[0].query_selector("a")
            if link:
                onclick = link.get_attribute("onclick") or ""
                m = re.search(r"janelaModal\('([^']+)'", onclick)
                if m:
                    detalhe_path = m.group(1)
            rows.append(
                {
                    "processo": processo,
                    "descricao_edital": cells[1].inner_text().strip(),
                    "data_abertura": cells[2].inner_text().strip(),
                    "habilitacao": cells[3].inner_text().strip(),
                    "julgamento": cells[4].inner_text().strip(),
                    "homologacao": cells[5].inner_text().strip(),
                    "situacao": cells[6].inner_text().strip(),
                    "detalhe_path": detalhe_path,
                }
            )
        if rows:
            break
    return rows


def _pagination_info(page: Page) -> tuple[int, int, int] | None:
    """Lê 'X até Y de Z' somente em #licitacoesNav, com validação."""
    nav = page.query_selector(SEL_NAV)
    if not nav:
        return None
    m = PAGINACAO_RE.search(nav.inner_text())
    if not m:
        return None
    inicio, fim, total = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if inicio <= 0 or total <= 0 or fim < inicio or total < fim:
        return None
    return inicio, fim, total


def _pesquisar_periodo(page: Page, data_ini: str, data_fim: str) -> None:
    """Aplica filtro de datas e dispara pesquisa (botão oculto via TrPage)."""
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
            TrPage._autoSubmit(
                'corpo:formulario',
                'corpo:formulario:botaoPesquisa',
                { preventDefault() {}, stopPropagation() {} },
                1
            );
        }""",
        [data_ini, data_fim],
    )
    page.wait_for_load_state("networkidle", timeout=45000)
    try:
        page.wait_for_function(
            """() => {
                const nav = document.querySelector('#licitacoesNav');
                if (!nav) return false;
                const m = nav.innerText.match(/(\\d+)\\s+até\\s+(\\d+)\\s+de\\s+(\\d+)/i);
                if (!m) return false;
                const total = parseInt(m[3], 10);
                const fim = parseInt(m[2], 10);
                const ini = parseInt(m[1], 10);
                return total > 0 && fim >= ini && total >= fim;
            }""",
            timeout=20000,
        )
    except Exception:
        time.sleep(DELAY_SEC)
    time.sleep(DELAY_SEC)


def _rows_to_items(
    rows: list[dict[str, str]],
    *,
    empresa_codigo: str,
    empresa_nome: str,
    ano: int,
    vistos: set[str],
) -> list[LicitacaoItem]:
    novos: list[LicitacaoItem] = []
    for row in rows:
        proc = row["processo"]
        if proc in vistos:
            continue
        vistos.add(proc)
        path = row.get("detalhe_path") or ""
        detalhe = urljoin(BASE_URL, path) if path else _detalhe_url(empresa_codigo, proc)
        novos.append(
            LicitacaoItem(
                empresa_codigo=empresa_codigo,
                empresa_nome=empresa_nome,
                ano=ano,
                processo=proc,
                modalidade=_modalidade(proc),
                descricao_edital=row["descricao_edital"] or None,
                data_abertura=row["data_abertura"] or None,
                habilitacao=row["habilitacao"] or None,
                julgamento=row["julgamento"] or None,
                homologacao=row["homologacao"] or None,
                situacao=row["situacao"] or None,
                detalhe_url=detalhe,
            )
        )
    return novos


def _pode_avancar_pagina(page: Page) -> bool:
    return bool(
        page.evaluate(
            """() => {
                const icon = document.querySelector('#licitacoesNav .iNavProximo');
                if (!icon) return false;
                const btn = icon.closest('button');
                if (!btn) return false;
                return !btn.disabled
                    && btn.getAttribute('aria-disabled') !== 'true'
                    && !btn.classList.contains('disabled');
            }"""
        )
    )


def _click_proxima_pagina(page: Page, inicio_antes: int | None) -> bool:
    if not _pode_avancar_pagina(page):
        return False

    clicou = page.evaluate(
        """() => {
            const icon = document.querySelector('#licitacoesNav .iNavProximo');
            if (!icon) return false;
            const btn = icon.closest('button');
            if (!btn || btn.disabled) return false;
            btn.click();
            return true;
        }"""
    )
    if not clicou:
        return False

    page.wait_for_load_state("networkidle", timeout=45000)

    if inicio_antes is not None:
        try:
            page.wait_for_function(
                """(prev) => {
                    const nav = document.querySelector('#licitacoesNav');
                    if (!nav) return false;
                    const m = nav.innerText.match(/(\\d+)\\s+até\\s+(\\d+)\\s+de\\s+(\\d+)/i);
                    if (!m) return false;
                    const ini = parseInt(m[1], 10);
                    const fim = parseInt(m[2], 10);
                    const tot = parseInt(m[3], 10);
                    return ini > prev && fim >= ini && tot >= fim;
                }""",
                inicio_antes,
                timeout=20000,
            )
        except Exception:
            time.sleep(DELAY_SEC * 2)

    time.sleep(DELAY_SEC)
    return True


def _coletar_paginas_janela(
    page: Page,
    *,
    empresa_codigo: str,
    empresa_nome: str,
    ano: int,
    vistos: set[str],
    total_esperado: int,
    on_log: Callable[[str], None],
) -> list[LicitacaoItem]:
    """Fallback: paginação dentro de uma janela pequena (portal pode falhar)."""
    resultado: list[LicitacaoItem] = []
    pagina = 0

    while pagina < MAX_PAGINAS:
        pagina += 1
        rows = _parse_table(page)
        novos = _rows_to_items(
            rows,
            empresa_codigo=empresa_codigo,
            empresa_nome=empresa_nome,
            ano=ano,
            vistos=vistos,
        )
        resultado.extend(novos)

        pag = _pagination_info(page)
        if pag:
            inicio, fim, total = pag
            on_log(
                f"    Página {pagina}: {inicio}–{fim} de {total} "
                f"({len(novos)} novos, {len(vistos)} acumulados)"
            )
            if len(vistos) >= total_esperado or fim >= total:
                break
        else:
            break

        if len(novos) == 0 and pagina > 1:
            break

        inicio_antes = pag[0] if pag else None
        if not _click_proxima_pagina(page, inicio_antes):
            break

        pag_depois = _pagination_info(page)
        if inicio_antes is not None and pag_depois and pag_depois[0] <= inicio_antes:
            break

    return resultado


def _coletar_por_janelas(
    page: Page,
    *,
    empresa_codigo: str,
    empresa_nome: str,
    ano: int,
    on_log: Callable[[str], None],
) -> list[LicitacaoItem]:
    """
    Coleta por intervalos de data para evitar paginação quebrada do portal JSF.
    Subdivide automaticamente períodos com mais de 100 registros.
    """
    resultado: list[LicitacaoItem] = []
    vistos: set[str] = set()
    pendentes: list[tuple[str, str]] = [(f"01/01/{ano}", f"31/12/{ano}")]
    subdivisoes = 0

    while pendentes:
        data_ini, data_fim = pendentes.pop(0)
        on_log(f"  Período {data_ini} – {data_fim}…")
        _pesquisar_periodo(page, data_ini, data_fim)

        pag = _pagination_info(page)
        if pag is None:
            on_log("    Sem dados válidos neste período")
            continue

        inicio, fim, total = pag

        if total > PAGE_SIZE or fim < total:
            subdivisoes += 1
            if subdivisoes > MAX_SUBDIVISOES:
                on_log(
                    f"    {total} registros — limite de subdivisões; "
                    "tentando paginação como fallback"
                )
                rows = _parse_table(page)
                novos = _rows_to_items(
                    rows,
                    empresa_codigo=empresa_codigo,
                    empresa_nome=empresa_nome,
                    ano=ano,
                    vistos=vistos,
                )
                resultado.extend(novos)
                extras = _coletar_paginas_janela(
                    page,
                    empresa_codigo=empresa_codigo,
                    empresa_nome=empresa_nome,
                    ano=ano,
                    vistos=vistos,
                    total_esperado=total,
                    on_log=on_log,
                )
                resultado.extend(extras)
                continue

            on_log(f"    {total} registros — subdividindo período")
            for parte in reversed(_subdividir_janela(data_ini, data_fim)):
                pendentes.insert(0, parte)
            continue

        rows = _parse_table(page)
        novos = _rows_to_items(
            rows,
            empresa_codigo=empresa_codigo,
            empresa_nome=empresa_nome,
            ano=ano,
            vistos=vistos,
        )
        resultado.extend(novos)
        on_log(f"    {total} registros ({len(novos)} novos, {len(vistos)} acumulados)")

    return resultado


def coletar(
    *,
    empresa_codigo: str,
    ano: int,
    on_log: Callable[[str], None] | None = None,
) -> list[LicitacaoItem]:
    log = on_log or (lambda _: None)
    empresa_nome = EMPRESAS.get(empresa_codigo, empresa_codigo)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=HEADLESS,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        try:
            ctx = browser.new_context(user_agent=USER_AGENT, locale="pt-BR", viewport={"width": 1400, "height": 900})
            ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page = ctx.new_page()

            log("Abrindo portal…")
            page.goto(CONSULTA_URL, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_selector(SEL_EMPRESA, state="visible", timeout=60000)
            time.sleep(DELAY_SEC)

            log(f"Selecionando {empresa_nome}…")
            page.locator(SEL_EMPRESA).select_option(value=empresa_codigo)
            page.wait_for_load_state("networkidle")
            time.sleep(DELAY_SEC)

            ano_val = None
            for opt in page.locator(f"{SEL_ANO} option").all():
                if opt.inner_text().strip() == str(ano):
                    ano_val = opt.get_attribute("value")
                    break
            if not ano_val:
                log(f"Ano {ano} não disponível para {empresa_nome}")
                return []

            log(f"Selecionando ano {ano}…")
            page.locator(SEL_ANO).select_option(value=ano_val)
            page.wait_for_load_state("networkidle")
            time.sleep(DELAY_SEC)

            log("Coletando por intervalos de data (evita paginação quebrada do portal)…")
            resultado = _coletar_por_janelas(
                page,
                empresa_codigo=empresa_codigo,
                empresa_nome=empresa_nome,
                ano=ano,
                on_log=log,
            )
        finally:
            browser.close()

    log(f"Coletados: {len(resultado)} registros")
    return resultado
