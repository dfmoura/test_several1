from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.runtime import runtime
from app.desdobrar import desdobrar_mock, desdobrar_openai
from app.schemas import (
    DesdobrarIn,
    FinalizeOut,
    MessageIn,
    MessageOut,
    PropostaDraftOut,
    SessionCreate,
    SessionOut,
)
from app.sessions import Turn

app = FastAPI(title="Trigger Assistência", version="1.0.0", docs_url=None, redoc_url=None)


def require_api_key(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.api_key.strip()
    provided = None
    if x_api_key:
        provided = x_api_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    if not expected or provided != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")


class LlmUpdate(BaseModel):
    mode: str = Field(..., max_length=32)
    model: str = Field(..., min_length=1, max_length=200)
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str | None = Field(default=None, max_length=512)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "assistencia",
        "llm": runtime.effective_mode(),
    }


@app.get("/v1/admin/llm", dependencies=[Depends(require_api_key)])
def get_llm() -> dict:
    return runtime.public_llm()


@app.put("/v1/admin/llm", dependencies=[Depends(require_api_key)])
def put_llm(body: LlmUpdate) -> dict:
    try:
        runtime.apply(
            mode=body.mode,
            model=body.model,
            base_url=body.base_url,
            api_key=body.api_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return runtime.public_llm()


@app.post("/v1/admin/llm/test", dependencies=[Depends(require_api_key)])
def test_llm() -> dict:
    return runtime.test_llm()


@app.post("/v1/sessions", response_model=SessionOut, dependencies=[Depends(require_api_key)])
def create_session(body: SessionCreate | None = None) -> SessionOut:
    _ = body
    sess = runtime.store.create()
    reply = runtime.engine.opening()
    sess.turns.append(Turn("assistant", reply))
    return SessionOut(session_id=sess.id, reply=reply)


@app.post("/v1/desdobrar", response_model=PropostaDraftOut, dependencies=[Depends(require_api_key)])
def desdobrar_proposta(body: DesdobrarIn) -> PropostaDraftOut:
    """Rascunho operacional: escopo + plano de etapas. Não inventa preço nem prazo."""
    payload = body.model_dump()
    try:
        if runtime.effective_mode() == "openai":
            draft = desdobrar_openai(runtime._engine_settings(), payload)
        else:
            draft = desdobrar_mock(payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Falha ao desdobrar a demanda") from exc
    return PropostaDraftOut.model_validate(draft)


@app.post(
    "/v1/sessions/{session_id}/messages",
    response_model=MessageOut,
    dependencies=[Depends(require_api_key)],
)
def post_message(session_id: str, body: MessageIn, settings: Settings = Depends(get_settings)) -> MessageOut:
    sess = runtime.store.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Mensagem vazia")
    if len(message) > settings.max_message_chars:
        raise HTTPException(status_code=400, detail="Mensagem longa demais")
    try:
        reply = runtime.engine.reply(sess, message)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Falha ao gerar resposta") from exc
    return MessageOut(session_id=sess.id, reply=reply)


@app.post(
    "/v1/sessions/{session_id}/compose",
    response_model=FinalizeOut,
    dependencies=[Depends(require_api_key)],
)
@app.post(
    "/v1/sessions/{session_id}/finalize",
    response_model=FinalizeOut,
    dependencies=[Depends(require_api_key)],
)
def compose_descricao(session_id: str, settings: Settings = Depends(get_settings)) -> FinalizeOut:
    """Monta a descrição sem encerrar a sessão — dá para continuar a conversa."""
    sess = runtime.store.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    try:
        descricao = runtime.engine.finalize(sess).strip()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Falha ao montar a descrição") from exc
    if not descricao:
        raise HTTPException(status_code=422, detail="Não foi possível montar a descrição")
    descricao = descricao[: settings.max_descricao_chars]
    return FinalizeOut(session_id=sess.id, descricao=descricao)
