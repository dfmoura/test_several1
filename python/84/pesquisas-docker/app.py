"""Automação demonstrativa de consultas HTTP sequenciais (Flask)."""

from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus, urlparse

import requests
from flask import Flask, jsonify, render_template, request

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("pesquisas")

# ---------------------------------------------------------------------------
# Configuração e validação
# ---------------------------------------------------------------------------

ALLOWED_SEARCH_HOSTS = frozenset(
    {
        "www.bing.com",
        "bing.com",
    }
)

ALLOWED_ENGINES = frozenset({"bing"})

MAX_HISTORY = 200
MAX_CONSULTAS = 100
MIN_CONSULTAS = 1
MIN_INTERVALO = 1
MAX_INTERVALO = 300
MIN_TIMEOUT = 1
MAX_TIMEOUT = 120


def _env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    import os

    raw = os.environ.get(name, str(default)).strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"Variável {name} deve ser um inteiro. Valor recebido: {raw!r}") from exc
    if value < minimum or value > maximum:
        raise ValueError(
            f"Variável {name} deve estar entre {minimum} e {maximum}. Valor: {value}"
        )
    return value


def _env_str(name: str, default: str) -> str:
    import os

    value = os.environ.get(name, default)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


def load_config() -> dict[str, Any]:
    total = _env_int("TOTAL_CONSULTAS", 20, MIN_CONSULTAS, MAX_CONSULTAS)
    intervalo = _env_int("INTERVALO_SEGUNDOS", 3, MIN_INTERVALO, MAX_INTERVALO)
    timeout = _env_int("TIMEOUT_HTTP", 15, MIN_TIMEOUT, MAX_TIMEOUT)
    consulta = _env_str("CONSULTA", "Qual o patrimônio real de Flavio Bolsonaro?")
    engine = _env_str("SEARCH_ENGINE", "bing").lower()
    base_url = _env_str("SEARCH_BASE_URL", "https://www.bing.com/search")

    if engine not in ALLOWED_ENGINES:
        raise ValueError(
            f"SEARCH_ENGINE inválido: {engine!r}. Permitidos: {sorted(ALLOWED_ENGINES)}"
        )

    parsed = urlparse(base_url)
    if parsed.scheme != "https":
        raise ValueError("SEARCH_BASE_URL deve usar HTTPS.")
    if parsed.hostname not in ALLOWED_SEARCH_HOSTS:
        raise ValueError(
            "SEARCH_BASE_URL rejeitada por segurança (host não permitido). "
            f"Hosts permitidos: {sorted(ALLOWED_SEARCH_HOSTS)}"
        )
    if parsed.username or parsed.password:
        raise ValueError("SEARCH_BASE_URL não pode conter credenciais.")
    if parsed.port not in (None, 443):
        raise ValueError("SEARCH_BASE_URL não pode usar portas não padrão.")

    return {
        "total_consultas": total,
        "intervalo_segundos": intervalo,
        "timeout_http": timeout,
        "consulta": consulta,
        "search_engine": engine,
        "search_base_url": f"{parsed.scheme}://{parsed.hostname}{parsed.path or '/search'}",
        "container_port": _env_int("CONTAINER_PORT", 8080, 1, 65535),
    }


def build_search_url(base_url: str, consulta: str) -> str:
    return f"{base_url}?q={quote_plus(consulta)}"


# ---------------------------------------------------------------------------
# Modelos de estado
# ---------------------------------------------------------------------------


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RequestRecord:
    numero: int
    status: str
    iniciado_em: str | None = None
    finalizado_em: str | None = None
    duracao_ms: int | None = None
    http_status: int | None = None
    erro: str | None = None
    tecnicamente_concluida: bool = False
    resultado_valido: bool = False
    observacao: str | None = None


@dataclass
class RunState:
    run_id: str | None = None
    status: str = "idle"  # idle | running | cancelling | completed | cancelled | failed
    consulta: str = ""
    total: int = 0
    intervalo_segundos: int = 0
    timeout_http: int = 0
    search_engine: str = ""
    search_url: str = ""
    iniciada_em: str | None = None
    finalizada_em: str | None = None
    tentadas: int = 0
    concluidas: int = 0
    erros: int = 0
    validas: int = 0
    progresso_percentual: float = 0.0
    mensagem: str = "Aguardando início."
    cancel_requested: bool = False
    historico_execucao: list[RequestRecord] = field(default_factory=list)

    def to_public_dict(self) -> dict[str, Any]:
        data = asdict(self)
        # Não expor flag interna de cancelamento como detalhe operacional
        data.pop("cancel_requested", None)
        return data


# ---------------------------------------------------------------------------
# Executor sequencial
# ---------------------------------------------------------------------------


class SearchRunner:
    """Executa consultas HTTP sequenciais com proteção contra concorrência."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._config_error: str | None = None
        self._config = self._safe_load_config()
        self._state = RunState(
            consulta=self._config["consulta"],
            total=self._config["total_consultas"],
            intervalo_segundos=self._config["intervalo_segundos"],
            timeout_http=self._config["timeout_http"],
            search_engine=self._config["search_engine"],
            search_url=build_search_url(
                self._config["search_base_url"], self._config["consulta"]
            ),
            mensagem=(
                f"Configuração inválida: {self._config_error}"
                if self._config_error
                else "Aguardando início."
            ),
        )
        self._history: list[dict[str, Any]] = []
        self._worker: threading.Thread | None = None
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": "PesquisasDocker/1.0 (+demonstracao-educacional; sem evasao)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "pt-BR,pt;q=0.9",
            }
        )
        if self._config_error:
            logger.error("Configuração inicial inválida: %s", self._config_error)
        else:
            logger.info(
                "Aplicação inicializada. consulta=%r total=%s intervalo=%ss",
                self._config["consulta"],
                self._config["total_consultas"],
                self._config["intervalo_segundos"],
            )

    def _default_config(self) -> dict[str, Any]:
        return {
            "total_consultas": 20,
            "intervalo_segundos": 3,
            "timeout_http": 15,
            "consulta": "Qual o patrimônio real de Flavio Bolsonaro?",
            "search_engine": "bing",
            "search_base_url": "https://www.bing.com/search",
            "container_port": 8080,
        }

    def _safe_load_config(self) -> dict[str, Any]:
        try:
            cfg = load_config()
            self._config_error = None
            return cfg
        except ValueError as exc:
            self._config_error = str(exc)
            return self._default_config()

    def get_config_public(self) -> dict[str, Any]:
        with self._lock:
            payload = {
                "consulta": self._config["consulta"],
                "total_consultas": self._config["total_consultas"],
                "intervalo_segundos": self._config["intervalo_segundos"],
                "timeout_http": self._config["timeout_http"],
                "search_engine": self._config["search_engine"],
                "search_url": build_search_url(
                    self._config["search_base_url"], self._config["consulta"]
                ),
                "aviso": (
                    "Respostas HTTP (incluindo 200) indicam apenas sucesso técnico "
                    "da requisição. Não comprovam contabilização como pesquisa "
                    "válida pelo mecanismo de busca."
                ),
            }
            if self._config_error:
                payload["config_error"] = self._config_error
            return payload

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            payload = self._state.to_public_dict()
            payload["config"] = self.get_config_public()
            payload["ok"] = True
            return payload

    def get_history(self) -> dict[str, Any]:
        with self._lock:
            return {
                "ok": True,
                "total": len(self._history),
                "history": list(self._history),
                "aviso": (
                    "O histórico registra apenas métricas técnicas da aplicação. "
                    "Não implica que as consultas foram contabilizadas pelo buscador."
                ),
            }

    def clear_history(self) -> dict[str, Any]:
        with self._lock:
            if self._state.status in ("running", "cancelling"):
                return {
                    "ok": False,
                    "error": "Não é possível limpar o histórico durante uma execução ativa.",
                }
            self._history.clear()
            self._state.historico_execucao.clear()
            logger.info("Histórico da aplicação limpo.")
            return {"ok": True, "message": "Histórico limpo com sucesso."}

    def start(self) -> dict[str, Any]:
        with self._lock:
            if self._state.status in ("running", "cancelling"):
                return {
                    "ok": False,
                    "error": "Já existe uma execução em andamento.",
                    "status": self._state.status,
                }

            try:
                self._config = load_config()
                self._config_error = None
            except ValueError as exc:
                self._config_error = str(exc)
                return {"ok": False, "error": str(exc)}

            run_id = str(uuid.uuid4())
            self._state = RunState(
                run_id=run_id,
                status="running",
                consulta=self._config["consulta"],
                total=self._config["total_consultas"],
                intervalo_segundos=self._config["intervalo_segundos"],
                timeout_http=self._config["timeout_http"],
                search_engine=self._config["search_engine"],
                search_url=build_search_url(
                    self._config["search_base_url"], self._config["consulta"]
                ),
                iniciada_em=utc_now_iso(),
                mensagem="Execução iniciada.",
                cancel_requested=False,
            )

            self._worker = threading.Thread(
                target=self._run_loop,
                name=f"search-runner-{run_id[:8]}",
                daemon=True,
            )
            self._worker.start()
            logger.info(
                "Início da execução run_id=%s total=%s intervalo=%ss",
                run_id,
                self._state.total,
                self._state.intervalo_segundos,
            )
            return {
                "ok": True,
                "message": "Execução iniciada em segundo plano.",
                "run_id": run_id,
                "status": self.get_status(),
            }

    def cancel(self) -> dict[str, Any]:
        with self._lock:
            if self._state.status not in ("running", "cancelling"):
                return {
                    "ok": False,
                    "error": "Não há execução ativa para cancelar.",
                    "status": self._state.status,
                }
            self._state.cancel_requested = True
            self._state.status = "cancelling"
            self._state.mensagem = "Cancelamento solicitado. Aguardando término seguro..."
            logger.info("Cancelamento solicitado para run_id=%s", self._state.run_id)
            return {
                "ok": True,
                "message": "Cancelamento solicitado com segurança.",
                "status": self.get_status(),
            }

    def _append_history(self, record: RequestRecord, run_id: str) -> None:
        item = asdict(record)
        item["run_id"] = run_id
        item["consulta"] = self._state.consulta
        self._history.append(item)
        if len(self._history) > MAX_HISTORY:
            overflow = len(self._history) - MAX_HISTORY
            del self._history[:overflow]
        self._state.historico_execucao.append(record)

    def _sleep_interruptible(self, seconds: int) -> bool:
        """Retorna True se o cancelamento foi solicitado durante a espera."""
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            with self._lock:
                if self._state.cancel_requested:
                    return True
            time.sleep(min(0.2, end - time.monotonic()))
        with self._lock:
            return self._state.cancel_requested

    def _evaluate_response(self, response: requests.Response) -> tuple[bool, bool, str]:
        """
        Retorna (tecnicamente_concluida, resultado_valido, observacao).

        resultado_valido aqui significa apenas critério técnico verificável
        (status 2xx + corpo HTML não vazio). NÃO significa contabilização
        pelo mecanismo de busca.
        """
        tecnicamente = response.status_code is not None
        content_type = (response.headers.get("Content-Type") or "").lower()
        body_len = len(response.content or b"")
        valido = (
            200 <= response.status_code < 300
            and "text/html" in content_type
            and body_len > 0
        )
        if valido:
            obs = (
                "Critério técnico atendido (HTTP 2xx + HTML). "
                "Isso não prova contabilização pelo buscador."
            )
        elif 200 <= response.status_code < 300:
            obs = (
                "HTTP 2xx recebido, mas o critério técnico de HTML não foi atendido. "
                "Não interpretar como pesquisa contabilizada."
            )
        else:
            obs = "Resposta HTTP recebida com status não bem-sucedido."
        return tecnicamente, valido, obs

    def _run_loop(self) -> None:
        run_id: str
        total: int
        intervalo: int
        timeout: int
        url: str

        with self._lock:
            run_id = self._state.run_id or ""
            total = self._state.total
            intervalo = self._state.intervalo_segundos
            timeout = self._state.timeout_http
            url = self._state.search_url

        try:
            for numero in range(1, total + 1):
                with self._lock:
                    if self._state.cancel_requested:
                        break

                record = RequestRecord(
                    numero=numero,
                    status="em_andamento",
                    iniciado_em=utc_now_iso(),
                )
                started = time.perf_counter()
                logger.info("Requisição %s/%s iniciada", numero, total)

                try:
                    response = self._session.get(url, timeout=timeout, allow_redirects=True)
                    duracao_ms = int((time.perf_counter() - started) * 1000)
                    tecnicamente, valido, obs = self._evaluate_response(response)

                    record.finalizado_em = utc_now_iso()
                    record.duracao_ms = duracao_ms
                    record.http_status = response.status_code
                    record.tecnicamente_concluida = tecnicamente
                    record.resultado_valido = valido
                    record.observacao = obs
                    record.status = "concluida" if tecnicamente else "erro"
                    if not (200 <= response.status_code < 400):
                        record.status = "erro"
                        record.erro = f"HTTP {response.status_code}"

                    logger.info(
                        "Requisição %s/%s http=%s duracao_ms=%s",
                        numero,
                        total,
                        response.status_code,
                        duracao_ms,
                    )

                except requests.Timeout:
                    duracao_ms = int((time.perf_counter() - started) * 1000)
                    record.finalizado_em = utc_now_iso()
                    record.duracao_ms = duracao_ms
                    record.status = "erro"
                    record.erro = f"Timeout após {timeout}s"
                    record.observacao = "Falha de rede: tempo limite excedido."
                    logger.error("Requisição %s/%s timeout", numero, total)

                except requests.RequestException as exc:
                    duracao_ms = int((time.perf_counter() - started) * 1000)
                    record.finalizado_em = utc_now_iso()
                    record.duracao_ms = duracao_ms
                    record.status = "erro"
                    record.erro = f"Erro de rede: {type(exc).__name__}"
                    record.observacao = "Falha de rede ao realizar a requisição HTTP."
                    logger.error("Requisição %s/%s erro de rede: %s", numero, total, type(exc).__name__)

                except Exception as exc:  # noqa: BLE001 - captura falhas inesperadas no worker
                    duracao_ms = int((time.perf_counter() - started) * 1000)
                    record.finalizado_em = utc_now_iso()
                    record.duracao_ms = duracao_ms
                    record.status = "erro"
                    record.erro = f"Falha inesperada: {type(exc).__name__}"
                    record.observacao = "Erro interno ao processar a requisição."
                    logger.exception("Requisição %s/%s falha inesperada", numero, total)

                with self._lock:
                    self._state.tentadas += 1
                    if record.tecnicamente_concluida and record.status == "concluida":
                        self._state.concluidas += 1
                    if record.status == "erro":
                        self._state.erros += 1
                    if record.resultado_valido:
                        self._state.validas += 1
                    self._state.progresso_percentual = round(
                        (self._state.tentadas / total) * 100, 1
                    )
                    self._state.mensagem = (
                        f"Processando consulta {numero} de {total}."
                    )
                    self._append_history(record, run_id)

                if numero < total:
                    if self._sleep_interruptible(intervalo):
                        break

            with self._lock:
                if self._state.cancel_requested:
                    self._state.status = "cancelled"
                    self._state.mensagem = "Execução cancelada com segurança."
                    logger.info("Execução cancelada run_id=%s", run_id)
                else:
                    self._state.status = "completed"
                    self._state.mensagem = (
                        "Execução concluída. Resultados são apenas técnicos; "
                        "não afirmam contabilização pelo buscador."
                    )
                    logger.info(
                        "Término da execução run_id=%s tentadas=%s concluidas=%s erros=%s",
                        run_id,
                        self._state.tentadas,
                        self._state.concluidas,
                        self._state.erros,
                    )
                self._state.finalizada_em = utc_now_iso()
                self._state.cancel_requested = False

        except Exception as exc:  # noqa: BLE001
            logger.exception("Falha crítica na execução run_id=%s", run_id)
            with self._lock:
                self._state.status = "failed"
                self._state.mensagem = f"Falha inesperada: {type(exc).__name__}"
                self._state.finalizada_em = utc_now_iso()
                self._state.cancel_requested = False


# ---------------------------------------------------------------------------
# Aplicação Flask
# ---------------------------------------------------------------------------

app = Flask(__name__)
runner = SearchRunner()


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def index():
    return render_template("index.html", config=runner.get_config_public())


@app.get("/api/status")
def api_status():
    return jsonify(runner.get_status())


@app.post("/api/start")
def api_start():
    if request.content_length and request.content_length > 0:
        if request.mimetype not in ("application/json", "application/x-www-form-urlencoded"):
            return jsonify({"ok": False, "error": "Tipo de conteúdo não suportado."}), 415

    result = runner.start()
    if result.get("ok"):
        return jsonify(result), 200
    if "andamento" in result.get("error", ""):
        return jsonify(result), 409
    return jsonify(result), 400


@app.post("/api/cancel")
def api_cancel():
    result = runner.cancel()
    code = 200 if result.get("ok") else 409
    return jsonify(result), code


@app.get("/api/history")
def api_history():
    return jsonify(runner.get_history())


@app.post("/api/history/clear")
def api_history_clear():
    result = runner.clear_history()
    code = 200 if result.get("ok") else 409
    return jsonify(result), code


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"ok": False, "error": "Endpoint não encontrado."}), 404


@app.errorhandler(405)
def method_not_allowed(_error):
    return jsonify({"ok": False, "error": "Método HTTP não permitido."}), 405


@app.errorhandler(500)
def internal_error(_error):
    logger.exception("Erro interno não tratado")
    return jsonify({"ok": False, "error": "Erro interno do servidor."}), 500


if __name__ == "__main__":
    cfg = load_config()
    logger.info(
        "Inicializando aplicação Flask na porta %s (somente uso interno do container)",
        cfg["container_port"],
    )
    # Em produção o entrypoint usa gunicorn; este ramo serve para depuração local no container.
    app.run(host="0.0.0.0", port=cfg["container_port"], debug=False, threaded=True)
