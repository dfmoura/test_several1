"""Cliente de IA com rotação automática entre provedores cadastrados no Setup.

Features (ex.: análise de preço) devem usar apenas ``IAClient.chat`` —
nunca hardcodar API keys nem conhecer detalhes de provedor.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import (
    IA_FALLBACK_API_KEY,
    IA_FALLBACK_BASE_URL,
    IA_FALLBACK_MODEL,
    IA_FALLBACK_PROVIDER,
    IA_HTTP_TIMEOUT_SEC,
    IA_MAX_TENTATIVAS_POR_PROVEDOR,
)
from app.database import IaProvedor, SessionLocal
from app.ia_crypto import descriptografar_api_key

logger = logging.getLogger(__name__)

# Erros HTTP / condições consideradas recuperáveis → tentar próximo provedor.
# 402 = Payment Required / saldo insuficiente (ex.: DeepSeek Insufficient Balance).
_STATUS_RECUPERAVEIS = frozenset({401, 402, 403, 408, 429, 500, 502, 503, 504})


def _mensagem_erro_http(status: int, corpo: str) -> str:
    """Traduz respostas tipicas dos provedores para mensagem operacional clara."""
    texto = (corpo or "").strip()
    baixo = texto.lower()
    if status == 402 or "insufficient balance" in baixo or "insufficient_quota" in baixo:
        return (
            "Saldo/crédito insuficiente no provedor. "
            "Recarregue a conta dele ou use outro token ativo (a rotação tentará o próximo)."
        )
    if status == 401 or "invalid api key" in baixo or "incorrect api key" in baixo:
        return "API key inválida ou revogada. Verifique o token no Setup."
    if status == 429 or "rate limit" in baixo:
        return "Cota ou limite de requisições atingido. A rotação tentará o próximo provedor."
    trecho = texto[:180] if texto else f"HTTP {status}"
    return f"HTTP {status}: {trecho}"


_URLS_PADRAO: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "openai_compatible": "https://api.openai.com/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "anthropic": "https://api.anthropic.com/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "groq": "https://api.groq.com/openai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "xai": "https://api.x.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "together": "https://api.together.xyz/v1",
    "perplexity": "https://api.perplexity.ai",
}

_MODELOS_PADRAO: dict[str, str] = {
    "openai": "gpt-4o-mini",
    "openai_compatible": "gpt-4o-mini",
    "gemini": "gemini-2.0-flash",
    "anthropic": "claude-3-5-haiku-latest",
    "deepseek": "deepseek-chat",
    "groq": "llama-3.3-70b-versatile",
    "mistral": "mistral-small-latest",
    "xai": "grok-2-latest",
    "openrouter": "openai/gpt-4o-mini",
    "together": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "perplexity": "sonar",
}

# Provedores que falam o protocolo chat/completions (OpenAI-compatible).
_PROVEDORES_OPENAI_COMPAT = frozenset(
    {
        "openai",
        "openai_compatible",
        "deepseek",
        "groq",
        "mistral",
        "xai",
        "openrouter",
        "together",
        "perplexity",
    }
)


@dataclass
class ChatMessage:
    role: str
    content: str


@dataclass
class ChatResultado:
    ok: bool
    texto: str | None = None
    provedor_id: int | None = None
    provedor_nome: str | None = None
    provedor_tipo: str | None = None
    modelo: str | None = None
    tentativas: list[dict[str, Any]] = field(default_factory=list)
    erro: str | None = None


@dataclass
class _ProvedorRuntime:
    id: int | None
    nome: str
    provedor: str
    base_url: str | None
    modelo: str | None
    api_key: str
    prioridade: int


class IAError(RuntimeError):
    """Todos os provedores falharam ou não há credenciais."""


def listar_provedores_ativos(db: Session) -> list[IaProvedor]:
    return list(
        db.scalars(
            select(IaProvedor)
            .where(IaProvedor.ativo.is_(True))
            .order_by(IaProvedor.prioridade.asc(), IaProvedor.id.asc())
        ).all()
    )


def _para_runtime(row: IaProvedor) -> _ProvedorRuntime:
    return _ProvedorRuntime(
        id=row.id,
        nome=row.nome,
        provedor=row.provedor,
        base_url=row.base_url,
        modelo=row.modelo,
        api_key=descriptografar_api_key(row.api_key_criptografada),
        prioridade=row.prioridade,
    )


def _fallback_runtime() -> _ProvedorRuntime | None:
    if not IA_FALLBACK_API_KEY:
        return None
    return _ProvedorRuntime(
        id=None,
        nome="fallback-env",
        provedor=IA_FALLBACK_PROVIDER or "openai",
        base_url=IA_FALLBACK_BASE_URL or None,
        modelo=IA_FALLBACK_MODEL or None,
        api_key=IA_FALLBACK_API_KEY,
        prioridade=9999,
    )


def carregar_cadeia(db: Session | None = None) -> list[_ProvedorRuntime]:
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        rows = listar_provedores_ativos(db)
        cadeia = [_para_runtime(r) for r in rows]
        if not cadeia:
            fb = _fallback_runtime()
            if fb:
                cadeia = [fb]
        return cadeia
    finally:
        if close:
            db.close()


def _base_url(p: _ProvedorRuntime) -> str:
    if p.base_url and p.base_url.strip():
        return p.base_url.strip().rstrip("/")
    return _URLS_PADRAO.get(p.provedor, _URLS_PADRAO["openai"])


def _modelo(p: _ProvedorRuntime) -> str:
    if p.modelo and p.modelo.strip():
        return p.modelo.strip()
    return _MODELOS_PADRAO.get(p.provedor, _MODELOS_PADRAO["openai"])


def _eh_recuperavel(exc: BaseException, status: int | None = None) -> bool:
    if status is not None and status in _STATUS_RECUPERAVEIS:
        return True
    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _STATUS_RECUPERAVEIS
    return False


def _chat_openai_compatible(
    p: _ProvedorRuntime,
    messages: list[dict[str, str]],
    *,
    timeout: float,
) -> str:
    url = f"{_base_url(p)}/chat/completions"
    headers = {
        "Authorization": f"Bearer {p.api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": _modelo(p),
        "messages": messages,
        "temperature": 0.2,
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Resposta sem choices do provedor OpenAI-compatible.")
    msg = choices[0].get("message") or {}
    texto = msg.get("content")
    if not texto:
        raise RuntimeError("Resposta vazia do provedor OpenAI-compatible.")
    return str(texto).strip()


def _chat_anthropic(
    p: _ProvedorRuntime,
    messages: list[dict[str, str]],
    *,
    timeout: float,
) -> str:
    url = f"{_base_url(p)}/messages"
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    user_msgs = [m for m in messages if m["role"] != "system"]
    if not user_msgs:
        user_msgs = [{"role": "user", "content": "(vazio)"}]
    headers = {
        "x-api-key": p.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": _modelo(p),
        "max_tokens": 2048,
        "messages": user_msgs,
    }
    if system:
        body["system"] = system
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
    parts = data.get("content") or []
    textos = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text"]
    texto = "\n".join(t for t in textos if t).strip()
    if not texto:
        raise RuntimeError("Resposta vazia do provedor Anthropic.")
    return texto


def _chat_gemini(
    p: _ProvedorRuntime,
    messages: list[dict[str, str]],
    *,
    timeout: float,
) -> str:
    modelo = _modelo(p)
    url = f"{_base_url(p)}/models/{modelo}:generateContent"
    # Gemini aceita key na query; evita logar a key no body.
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = []
    for m in messages:
        if m["role"] == "system":
            continue
        role = "model" if m["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    if not contents:
        contents = [{"role": "user", "parts": [{"text": "(vazio)"}]}]
    body: dict[str, Any] = {"contents": contents}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, params={"key": p.api_key}, json=body)
        resp.raise_for_status()
        data = resp.json()
    cands = data.get("candidates") or []
    if not cands:
        raise RuntimeError("Resposta sem candidates do Gemini.")
    parts = ((cands[0].get("content") or {}).get("parts")) or []
    texto = "\n".join(
        str(part.get("text", "")) for part in parts if isinstance(part, dict)
    ).strip()
    if not texto:
        raise RuntimeError("Resposta vazia do Gemini.")
    return texto


def _disparar_chat(p: _ProvedorRuntime, messages: list[dict[str, str]], *, timeout: float) -> str:
    if p.provedor in _PROVEDORES_OPENAI_COMPAT:
        return _chat_openai_compatible(p, messages, timeout=timeout)
    if p.provedor == "anthropic":
        return _chat_anthropic(p, messages, timeout=timeout)
    if p.provedor == "gemini":
        return _chat_gemini(p, messages, timeout=timeout)
    raise ValueError(f"Provedor não suportado: {p.provedor}")


def testar_conexao_provedor(p: _ProvedorRuntime, *, timeout: float | None = None) -> dict[str, Any]:
    """Ping mínimo — uma mensagem curta (baixo custo)."""
    to = timeout if timeout is not None else min(IA_HTTP_TIMEOUT_SEC, 20.0)
    msgs = [{"role": "user", "content": "Responda apenas com a palavra OK."}]
    try:
        texto = _disparar_chat(p, msgs, timeout=to)
        return {"ok": True, "mensagem": f"Conexão OK · resposta: {texto[:80]}"}
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        detalhe = exc.response.text or ""
        return {
            "ok": False,
            "mensagem": _mensagem_erro_http(status, detalhe),
            "status": status,
            "recuperavel": _eh_recuperavel(exc, status),
        }
    except Exception as exc:  # noqa: BLE001 — reportar ao operador
        return {
            "ok": False,
            "mensagem": f"{exc.__class__.__name__}: {exc}",
            "recuperavel": _eh_recuperavel(exc),
        }


class IAClient:
    """Interface única para features — escolhe provedor e rota automaticamente."""

    def __init__(
        self,
        *,
        timeout: float | None = None,
        max_tentativas_por_provedor: int | None = None,
    ) -> None:
        self.timeout = timeout if timeout is not None else IA_HTTP_TIMEOUT_SEC
        self.max_tentativas = (
            max_tentativas_por_provedor
            if max_tentativas_por_provedor is not None
            else IA_MAX_TENTATIVAS_POR_PROVEDOR
        )

    def chat(
        self,
        messages: list[ChatMessage] | list[dict[str, str]],
        *,
        purpose: str = "geral",
        db: Session | None = None,
    ) -> ChatResultado:
        """Envia mensagens; em falha recuperável, tenta o próximo provedor ativo."""
        msgs = [
            {"role": m.role, "content": m.content}
            if isinstance(m, ChatMessage)
            else {"role": str(m["role"]), "content": str(m["content"])}
            for m in messages
        ]
        cadeia = carregar_cadeia(db)
        if not cadeia:
            return ChatResultado(
                ok=False,
                erro=(
                    "Nenhum provedor de IA ativo no Setup e sem "
                    "IA_FALLBACK_API_KEY configurada."
                ),
            )

        tentativas: list[dict[str, Any]] = []
        logger.info(
            "IA chat purpose=%s · %d provedor(es) na cadeia",
            purpose,
            len(cadeia),
        )

        for p in cadeia:
            ultimo_erro: str | None = None
            recuperavel = True
            for tentativa in range(1, max(1, self.max_tentativas) + 1):
                try:
                    texto = _disparar_chat(p, msgs, timeout=self.timeout)
                    tentativas.append(
                        {
                            "provedor_id": p.id,
                            "provedor_nome": p.nome,
                            "ok": True,
                            "tentativa": tentativa,
                        }
                    )
                    logger.info(
                        "IA atendida por provedor_id=%s nome=%s purpose=%s",
                        p.id,
                        p.nome,
                        purpose,
                    )
                    return ChatResultado(
                        ok=True,
                        texto=texto,
                        provedor_id=p.id,
                        provedor_nome=p.nome,
                        provedor_tipo=p.provedor,
                        modelo=_modelo(p),
                        tentativas=tentativas,
                    )
                except httpx.HTTPStatusError as exc:
                    status = exc.response.status_code
                    recuperavel = _eh_recuperavel(exc, status)
                    ultimo_erro = _mensagem_erro_http(status, exc.response.text or "")
                    tentativas.append(
                        {
                            "provedor_id": p.id,
                            "provedor_nome": p.nome,
                            "ok": False,
                            "tentativa": tentativa,
                            "erro": ultimo_erro,
                            "recuperavel": recuperavel,
                        }
                    )
                    logger.warning(
                        "IA falhou provedor_id=%s status=%s purpose=%s",
                        p.id,
                        status,
                        purpose,
                    )
                    if not recuperavel:
                        break
                except Exception as exc:  # noqa: BLE001
                    recuperavel = _eh_recuperavel(exc)
                    ultimo_erro = f"{exc.__class__.__name__}: {exc}"
                    tentativas.append(
                        {
                            "provedor_id": p.id,
                            "provedor_nome": p.nome,
                            "ok": False,
                            "tentativa": tentativa,
                            "erro": ultimo_erro,
                            "recuperavel": recuperavel,
                        }
                    )
                    logger.warning(
                        "IA falhou provedor_id=%s erro=%s purpose=%s",
                        p.id,
                        exc.__class__.__name__,
                        purpose,
                    )
                    if not recuperavel:
                        break
            # Próximo da cadeia se recuperável; se não, ainda assim tentamos
            # os demais (outro token pode funcionar).

        return ChatResultado(
            ok=False,
            tentativas=tentativas,
            erro="Todos os provedores de IA falharam. Verifique tokens e cotas no Setup.",
        )


# Instância compartilhada — features importam isto.
ia_client = IAClient()
