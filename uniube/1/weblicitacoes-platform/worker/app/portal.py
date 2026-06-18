from __future__ import annotations

import time
from typing import Callable

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout

from app.config import settings

SEL_EMPRESA = 'select[id="corpo:formulario:codigoEmpresaLicitacao"]'
SEL_ANO = 'select[id="corpo:formulario:ano"]'

BLOCKED_MARKERS = (
    "access denied",
    "forbidden",
    "errors.edgesuite.net",
    "permission denied",
    "não tem permissão",
    "nao tem permissao",
    "akamai",
)


class PortalError(Exception):
    pass


class PortalBlockedError(PortalError):
    pass


class PortalFormNotFoundError(PortalError):
    pass


def is_blocked(page: Page) -> bool:
    try:
        title = (page.title() or "").lower()
        body = page.inner_text("body", timeout=5000).lower()
        html = page.content().lower()
    except Exception:
        return False
    blob = f"{title} {body} {html}"
    return any(marker in blob for marker in BLOCKED_MARKERS)


def _stealth_script() -> str:
    return """
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR', 'pt', 'en-US', 'en']});
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
    window.chrome = { runtime: {} };
    """


def create_browser_context(browser):
    context = browser.new_context(
        user_agent=settings.user_agent,
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
        viewport={"width": 1920, "height": 1080},
        extra_http_headers={
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
        },
    )
    context.add_init_script(_stealth_script())
    return context


def open_consulta(
    page: Page,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> None:
    log = on_progress or (lambda _m: None)
    last_error: Exception | None = None

    for attempt in range(1, settings.scraper_max_retries + 1):
        try:
            log(f"Abrindo portal (tentativa {attempt}/{settings.scraper_max_retries})…")
            page.goto(
                settings.consulta_url,
                wait_until="domcontentloaded",
                timeout=settings.scraper_nav_timeout_ms,
            )
            page.wait_for_load_state("networkidle", timeout=30000)
            time.sleep(settings.scraper_delay_sec)

            if is_blocked(page):
                raise PortalBlockedError(
                    "Portal bloqueou o acesso (WAF/Akamai). "
                    "Execute o worker na máquina local com SCRAPER_HEADLESS=false "
                    "ou importe CSV manualmente."
                )

            page.wait_for_selector(SEL_EMPRESA, state="visible", timeout=settings.scraper_form_timeout_ms)
            return
        except PortalBlockedError:
            raise
        except PlaywrightTimeout as exc:
            last_error = exc
            if is_blocked(page):
                raise PortalBlockedError(
                    "Portal bloqueou o acesso — formulário não carregou (WAF/Akamai)."
                ) from exc
            log(f"  Formulário não encontrado na tentativa {attempt}")
            time.sleep(settings.scraper_delay_sec * attempt)
        except Exception as exc:
            last_error = exc
            log(f"  Erro na tentativa {attempt}: {exc}")
            time.sleep(settings.scraper_delay_sec * attempt)

    raise PortalFormNotFoundError(
        "Formulário de licitações não carregou após várias tentativas. "
        f"Seletor esperado: {SEL_EMPRESA}. "
        f"Último erro: {last_error}"
    ) from last_error


def select_empresa(page: Page, empresa_codigo: str) -> None:
    locator = page.locator(SEL_EMPRESA)
    locator.wait_for(state="visible", timeout=settings.scraper_form_timeout_ms)
    locator.select_option(value=empresa_codigo)
    page.wait_for_load_state("networkidle", timeout=30000)
    time.sleep(settings.scraper_delay_sec)


def select_ano(page: Page, ano_value: str) -> None:
    locator = page.locator(SEL_ANO)
    locator.wait_for(state="visible", timeout=settings.scraper_form_timeout_ms)
    locator.select_option(value=ano_value)
    page.wait_for_load_state("networkidle", timeout=30000)
    time.sleep(settings.scraper_delay_sec)


def ano_option_value(page: Page, ano: int) -> str | None:
    options = page.locator(f'{SEL_ANO} option').all()
    for opt in options:
        if opt.inner_text().strip() == str(ano):
            value = opt.get_attribute("value")
            if value is not None:
                return value
    return None
