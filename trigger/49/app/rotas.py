from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agenda import enfileirar_manual
from app.acompanhamento import (
    atualizar_observador,
    criar_observador,
    definir_acompanhamento,
    listar_observadores,
)
from app.coleta import configuracao
from app.config import COOKIE, MODALIDADES_COMPRAS, PAPEIS_FILIAL, PAPEIS_MASTER, settings
from app.consulta import (
    consolidado,
    detalhe_contratacao,
    listar_contratacoes,
    listar_instrumentos,
    painel,
    resolver_periodo,
    resumo_coleta,
)
from app.contas import (
    ErroRegra,
    Principal,
    auditar,
    autenticar,
    criar_filial,
    criar_sessao,
    criar_usuario,
    definir_situacao,
    desativar_usuario,
    encerrar_token,
    listar_usuarios_filial,
    listar_usuarios_master,
    vagas_filial,
)
from app.db import SessionLocal, _aplicar, sessao_do_principal
from app.escopo import definir_adesao, listar_escopo
from app.models import AtaPncp, ColetaCursor, ColetaJob, ContratoPncp, Filial, Usuario
from app.tempo import agora_negocio

router = APIRouter()


class LoginIn(BaseModel):
    usuario: str
    senha: str
    encerrar_anterior: bool = False


class FilialIn(BaseModel):
    nome: str
    cnpj: str
    municipio: str
    uf: str
    codigo_ibge: int


class UsuarioIn(BaseModel):
    usuario: str = Field(min_length=3, max_length=80)
    senha: str = Field(min_length=8, max_length=200)
    papel: str


class AdesaoIn(BaseModel):
    aderida: bool


class AgendaIn(BaseModel):
    hora: int = Field(ge=0, le=23)
    minuto: int = Field(ge=0, le=59)


class ColetaIn(BaseModel):
    tipo: str = "diario"


class ObservadorIn(BaseModel):
    nome: str
    email: str = ""
    telefone: str = ""


class ObservadorPatch(BaseModel):
    nome: str | None = None
    email: str | None = None
    telefone: str | None = None
    ativo: bool | None = None


class AcompanhamentoIn(BaseModel):
    observador_id: uuid.UUID | None = None


def _db_publico():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_login(request: Request) -> Principal:
    principal = getattr(request.state, "principal", None)
    if principal is None:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")
    return principal


def get_db(principal: Principal = Depends(require_login)):
    db = sessao_do_principal(
        str(principal.filial_id) if principal.filial_id else None,
        master=principal.master,
    )
    try:
        yield db
    finally:
        db.close()


def _exigir(principal: Principal, *papeis: str) -> None:
    if principal.papel not in papeis:
        raise HTTPException(status_code=403, detail="Acesso restrito.")


def _cookie(resposta: Response, token: str, request: Request) -> None:
    modo = settings.cookie_secure
    if modo in {"1", "true", "yes"}:
        secure = True
    elif modo in {"0", "false", "no"}:
        secure = False
    else:
        secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    resposta.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=settings.session_dias * 24 * 3600,
        path="/",
    )


def _usuario(usuario: Usuario, db: Session | None = None) -> dict:
    corpo = {
        "id": str(usuario.id),
        "usuario": usuario.username,
        "papel": usuario.papel,
        "ativo": usuario.ativo,
        "filial_id": str(usuario.filial_id) if usuario.filial_id else None,
    }
    return corpo


def _tratar(exc: ErroRegra):
    if exc.status == 409 and "sessão ativa" in exc.mensagem:
        raise HTTPException(
            status_code=409,
            detail={"detail": exc.mensagem, "acao": "encerrar_sessao_anterior"},
        ) from exc
    raise HTTPException(status_code=exc.status, detail=exc.mensagem) from exc


@router.post("/api/sessao")
def login(payload: LoginIn, request: Request, resposta: Response, db: Session = Depends(_db_publico)):
    try:
        usuario = autenticar(db, payload.usuario, payload.senha)
        token = criar_sessao(db, usuario, substituir=payload.encerrar_anterior)
    except ErroRegra as exc:
        if exc.status == 409:
            return JSONResponse(
                status_code=409,
                content={"detail": exc.mensagem, "acao": "encerrar_sessao_anterior"},
            )
        _tratar(exc)
    _cookie(resposta, token, request)
    return {"usuario": usuario.username, "papel": usuario.papel}


@router.delete("/api/sessao")
def logout(request: Request, resposta: Response):
    db = SessionLocal()
    try:
        encerrar_token(db, request.cookies.get(COOKIE))
    finally:
        db.close()
    resposta.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/api/eu")
def eu(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    filial = db.get(Filial, principal.filial_id) if principal.filial_id else None
    return {
        "usuario": principal.username,
        "papel": principal.papel,
        "filial_id": str(principal.filial_id) if principal.filial_id else None,
        "filial": filial.nome if filial else None,
        "municipio": filial.municipio if filial else None,
        "uf": filial.uf if filial else None,
    }


@router.get("/api/filiais")
def get_filiais(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, *PAPEIS_MASTER)
    return [
        {
            "id": str(f.id),
            "nome": f.nome,
            "cnpj": f.cnpj,
            "municipio": f.municipio,
            "uf": f.uf,
            "codigo_ibge": f.codigo_ibge,
            "situacao": f.situacao,
            "cnpj_conferencia_pendente": f.cnpj_conferencia_pendente,
        }
        for f in db.scalars(select(Filial).order_by(Filial.nome)).all()
    ]


@router.post("/api/filiais", status_code=201)
def post_filial(
    payload: FilialIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "master_admin")
    try:
        filial = criar_filial(db, autor=principal, **payload.model_dump())
    except ErroRegra as exc:
        _tratar(exc)
    return {"id": str(filial.id)}


@router.post("/api/filiais/{filial_id}/suspender")
def suspender(filial_id: uuid.UUID, principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "master_admin")
    try:
        definir_situacao(db, filial_id, "suspensa", autor=principal)
    except ErroRegra as exc:
        _tratar(exc)
    return {"situacao": "suspensa"}


@router.post("/api/filiais/{filial_id}/reativar")
def reativar(filial_id: uuid.UUID, principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "master_admin")
    try:
        definir_situacao(db, filial_id, "ativa", autor=principal)
    except ErroRegra as exc:
        _tratar(exc)
    return {"situacao": "ativa"}


@router.get("/api/usuarios")
def get_usuarios(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "filial_gestor")
    usuarios = listar_usuarios_filial(db, principal.filial_id)
    return {"vagas": vagas_filial(db, principal.filial_id), "usuarios": [_usuario(u) for u in usuarios]}


@router.post("/api/usuarios", status_code=201)
def post_usuario(payload: UsuarioIn, principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "filial_gestor")
    if payload.papel not in PAPEIS_FILIAL:
        raise HTTPException(status_code=403, detail="Papel inválido para a filial.")
    try:
        usuario = criar_usuario(
            db,
            username=payload.usuario,
            senha=payload.senha,
            papel=payload.papel,
            filial_id=principal.filial_id,
            autor=principal,
        )
    except ErroRegra as exc:
        _tratar(exc)
    return _usuario(usuario)


@router.post("/api/usuarios/{usuario_id}/desativar")
def post_desativar(
    usuario_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "filial_gestor")
    try:
        usuario = desativar_usuario(db, usuario_id, autor=principal)
    except ErroRegra as exc:
        _tratar(exc)
    return _usuario(usuario)


@router.post("/api/filiais/{filial_id}/usuarios", status_code=201)
def post_usuario_onboarding(
    filial_id: uuid.UUID,
    payload: UsuarioIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "master_admin")
    if db.get(Filial, filial_id) is None:
        raise HTTPException(status_code=404, detail="Filial não encontrada.")
    if payload.papel not in PAPEIS_FILIAL:
        raise HTTPException(status_code=403, detail="Papel inválido para a filial.")
    try:
        usuario = criar_usuario(
            db,
            username=payload.usuario,
            senha=payload.senha,
            papel=payload.papel,
            filial_id=filial_id,
            autor=principal,
        )
    except ErroRegra as exc:
        _tratar(exc)
    auditar(db, "onboarding_usuario", str(filial_id), usuario_id=principal.usuario_id, filial_id=filial_id)
    db.commit()
    return _usuario(usuario)


@router.get("/api/master/usuarios")
def get_master_usuarios(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, *PAPEIS_MASTER)
    return {"usuarios": [_usuario(u) for u in listar_usuarios_master(db)]}


@router.post("/api/master/usuarios", status_code=201)
def post_master_usuario(
    payload: UsuarioIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "master_admin")
    if payload.papel not in PAPEIS_MASTER:
        raise HTTPException(status_code=403, detail="Papel master inválido.")
    try:
        usuario = criar_usuario(
            db,
            username=payload.usuario,
            senha=payload.senha,
            papel=payload.papel,
            filial_id=None,
            autor=principal,
        )
    except ErroRegra as exc:
        _tratar(exc)
    return _usuario(usuario)


@router.get("/api/escopo")
def get_escopo(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "filial_gestor", "filial_analista")
    linhas = []
    for uasg, adesao in listar_escopo(db):
        linhas.append(
            {
                "codigo_uasg": uasg.codigo_uasg,
                "nome": uasg.nome,
                "ativa_oficial": uasg.ativa_oficial,
                "aderida": adesao.aderida,
            }
        )
    if not any(item["aderida"] for item in linhas):
        return {"uasgs": linhas, "vazio": "nenhuma UASG aderida — a coleta ainda não tem escopo"}
    return {"uasgs": linhas, "vazio": ""}


@router.post("/api/escopo/{codigo_uasg}")
def post_adesao(
    codigo_uasg: str,
    payload: AdesaoIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "filial_gestor")
    try:
        adesao = definir_adesao(db, principal.filial_id, codigo_uasg, payload.aderida)
    except ErroRegra as exc:
        _tratar(exc)
    return {"codigo_uasg": adesao.codigo_uasg, "aderida": adesao.aderida}


@router.get("/api/painel")
def get_painel(
    de: str | None = None,
    ate: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    inicio, fim = resolver_periodo(de, ate)
    corpo = painel(db, inicio, fim)
    corpo["coleta"] = resumo_coleta(db, principal.filial_id)
    if corpo["uasgs_aderidas"] == 0:
        corpo["vazio"] = "nenhuma UASG aderida — a coleta ainda não tem escopo"
    return corpo


def _filtros_instrumentos(uasg, objeto, vinculo) -> dict:
    return {"uasg": uasg, "objeto": objeto, "vinculo": vinculo}


def _recorte_filial(db: Session, filial_id: uuid.UUID):
    anterior = (str(db.info.get("filial_id", "")), str(db.info.get("acesso", "")))
    db.info["rls_explicito"] = True
    db.info["filial_id"] = str(filial_id)
    db.info["acesso"] = ""
    _aplicar(db, str(filial_id), "")
    return anterior


def _soltar_recorte(db: Session, anterior: tuple[str, str]) -> None:
    db.info["filial_id"], db.info["acesso"] = anterior
    _aplicar(db, anterior[0], anterior[1])


def _pessoa(pessoa) -> dict:
    return {
        "id": str(pessoa.id),
        "nome": pessoa.nome,
        "email": pessoa.email,
        "telefone": pessoa.telefone,
        "ativo": pessoa.ativo,
    }


def _filtros_compra(uasg, codigo_modalidade, situacao, objeto, fornecedor, observador) -> dict:
    return {
        "uasg": uasg,
        "codigo_modalidade": codigo_modalidade,
        "situacao": situacao,
        "objeto": objeto,
        "fornecedor": fornecedor,
        "observador": observador,
    }


@router.get("/api/catalogo/modalidades")
def get_modalidades(principal: Principal = Depends(require_login)):
    _exigir(principal, *PAPEIS_FILIAL, *PAPEIS_MASTER)
    return {
        "modalidades": [
            {"codigo": codigo, "nome": nome}
            for codigo, nome in MODALIDADES_COMPRAS.items()
        ]
    }


@router.get("/api/observadores")
def get_observadores(
    ativos: bool = False,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    return {"observadores": [_pessoa(pessoa) for pessoa in listar_observadores(db, somente_ativos=ativos)]}


@router.post("/api/observadores", status_code=201)
def post_observador(
    payload: ObservadorIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "filial_gestor")
    try:
        pessoa = criar_observador(db, principal.filial_id, payload.nome, payload.email, payload.telefone)
    except ErroRegra as exc:
        _tratar(exc)
    return _pessoa(pessoa)


@router.patch("/api/observadores/{observador_id}")
def patch_observador(
    observador_id: uuid.UUID,
    payload: ObservadorPatch,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "filial_gestor")
    try:
        pessoa = atualizar_observador(
            db,
            observador_id,
            nome=payload.nome,
            email=payload.email,
            telefone=payload.telefone,
            ativo=payload.ativo,
        )
    except ErroRegra as exc:
        _tratar(exc)
    return _pessoa(pessoa)


@router.put("/api/contratacoes/{contratacao_id}/observador")
def put_observador_contratacao(
    contratacao_id: uuid.UUID,
    payload: AcompanhamentoIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    try:
        definir_acompanhamento(db, principal.filial_id, contratacao_id, payload.observador_id)
    except ErroRegra as exc:
        _tratar(exc)
    return {"contratacao_id": str(contratacao_id), "observador_id": str(payload.observador_id or "")}


@router.get("/api/contratacoes")
def get_contratacoes(
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    codigo_modalidade: str | None = None,
    situacao: str | None = None,
    objeto: str | None = None,
    fornecedor: str | None = None,
    observador: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    inicio, fim = resolver_periodo(de, ate)
    return {
        "periodo": {"de": inicio.isoformat(), "ate": fim.isoformat()},
        "contratacoes": listar_contratacoes(
            db,
            inicio,
            fim,
            _filtros_compra(uasg, codigo_modalidade, situacao, objeto, fornecedor, observador),
        ),
    }


@router.get("/api/contratacoes/{contratacao_id}")
def get_contratacao(
    contratacao_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    corpo = detalhe_contratacao(db, contratacao_id)
    if corpo is None:
        raise HTTPException(status_code=404, detail="Contratação não encontrada.")
    return corpo


@router.get("/api/contratos")
def get_contratos(
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    objeto: str | None = None,
    vinculo: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    inicio, fim = resolver_periodo(de, ate)
    return {
        "contratos": listar_instrumentos(
            db, ContratoPncp, "contrato", inicio, fim, _filtros_instrumentos(uasg, objeto, vinculo)
        )
    }


@router.get("/api/atas")
def get_atas(
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    objeto: str | None = None,
    vinculo: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_FILIAL)
    inicio, fim = resolver_periodo(de, ate)
    return {
        "atas": listar_instrumentos(
            db, AtaPncp, "ata", inicio, fim, _filtros_instrumentos(uasg, objeto, vinculo)
        )
    }


@router.get("/api/coleta")
def get_coleta(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "filial_gestor")
    return resumo_coleta(db, principal.filial_id)


@router.post("/api/coleta")
def post_coleta(
    payload: ColetaIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "filial_gestor")
    try:
        job = enfileirar_manual(db, principal.filial_id, payload.tipo)
    except ErroRegra as exc:
        _tratar(exc)
    auditar(
        db,
        "disparo_coleta",
        payload.tipo,
        usuario_id=principal.usuario_id,
        filial_id=principal.filial_id,
    )
    db.commit()
    return {"id": str(job.id), "status": job.status}


@router.get("/api/master/consolidado")
def get_consolidado(
    de: str | None = None,
    ate: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_MASTER)
    inicio, fim = resolver_periodo(de, ate)
    return consolidado(db, inicio, fim)


@router.get("/api/master/filiais/{filial_id}/painel")
def get_drill(
    filial_id: uuid.UUID,
    de: str | None = None,
    ate: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, *PAPEIS_MASTER)
    filial = db.get(Filial, filial_id)
    if filial is None:
        raise HTTPException(status_code=404, detail="Filial não encontrada.")
    auditar(db, "drill_down", filial.municipio, usuario_id=principal.usuario_id, filial_id=filial.id)
    db.commit()
    inicio, fim = resolver_periodo(de, ate)
    recorte = _recorte_filial(db, filial.id)
    try:
        corpo = painel(db, inicio, fim)
        corpo["coleta"] = resumo_coleta(db, filial.id)
        if corpo["uasgs_aderidas"] == 0:
            corpo["vazio"] = "nenhuma UASG aderida — a coleta ainda não tem escopo"
    finally:
        _soltar_recorte(db, recorte)
    corpo["filial"] = _ficha(filial)
    return corpo


def _ficha(filial: Filial) -> dict:
    return {
        "id": str(filial.id),
        "nome": filial.nome,
        "municipio": filial.municipio,
        "uf": filial.uf,
    }


def _filial_master(db: Session, principal: Principal, filial_id: uuid.UUID) -> Filial:
    _exigir(principal, *PAPEIS_MASTER)
    filial = db.get(Filial, filial_id)
    if filial is None:
        raise HTTPException(status_code=404, detail="Filial não encontrada.")
    auditar(db, "drill_down", filial.municipio, usuario_id=principal.usuario_id, filial_id=filial.id)
    db.commit()
    return filial


@router.get("/api/master/filiais/{filial_id}/contratacoes")
def get_drill_contratacoes(
    filial_id: uuid.UUID,
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    codigo_modalidade: str | None = None,
    situacao: str | None = None,
    objeto: str | None = None,
    fornecedor: str | None = None,
    observador: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    inicio, fim = resolver_periodo(de, ate)
    recorte = _recorte_filial(db, filial.id)
    try:
        linhas = listar_contratacoes(
            db,
            inicio,
            fim,
            _filtros_compra(uasg, codigo_modalidade, situacao, objeto, fornecedor, observador),
        )
    finally:
        _soltar_recorte(db, recorte)
    return {"filial": _ficha(filial), "contratacoes": linhas}


@router.get("/api/master/filiais/{filial_id}/contratacoes/{contratacao_id}")
def get_drill_detalhe(
    filial_id: uuid.UUID,
    contratacao_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    recorte = _recorte_filial(db, filial.id)
    try:
        corpo = detalhe_contratacao(db, contratacao_id)
    finally:
        _soltar_recorte(db, recorte)
    if corpo is None:
        raise HTTPException(status_code=404, detail="Contratação não encontrada.")
    corpo["filial"] = _ficha(filial)
    return corpo


@router.get("/api/master/filiais/{filial_id}/contratos")
def get_drill_contratos(
    filial_id: uuid.UUID,
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    objeto: str | None = None,
    vinculo: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    inicio, fim = resolver_periodo(de, ate)
    recorte = _recorte_filial(db, filial.id)
    try:
        linhas = listar_instrumentos(
            db, ContratoPncp, "contrato", inicio, fim, _filtros_instrumentos(uasg, objeto, vinculo)
        )
    finally:
        _soltar_recorte(db, recorte)
    return {"filial": _ficha(filial), "contratos": linhas}


@router.get("/api/master/filiais/{filial_id}/atas")
def get_drill_atas(
    filial_id: uuid.UUID,
    de: str | None = None,
    ate: str | None = None,
    uasg: str | None = None,
    objeto: str | None = None,
    vinculo: str | None = None,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    inicio, fim = resolver_periodo(de, ate)
    recorte = _recorte_filial(db, filial.id)
    try:
        linhas = listar_instrumentos(
            db, AtaPncp, "ata", inicio, fim, _filtros_instrumentos(uasg, objeto, vinculo)
        )
    finally:
        _soltar_recorte(db, recorte)
    return {"filial": _ficha(filial), "atas": linhas}


@router.get("/api/master/filiais/{filial_id}/escopo")
def get_drill_escopo(
    filial_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    recorte = _recorte_filial(db, filial.id)
    try:
        linhas = [
            {
                "codigo_uasg": uasg.codigo_uasg,
                "nome": uasg.nome,
                "ativa_oficial": uasg.ativa_oficial,
                "aderida": adesao.aderida,
            }
            for uasg, adesao in listar_escopo(db)
        ]
    finally:
        _soltar_recorte(db, recorte)
    vazio = ""
    if not any(item["aderida"] for item in linhas):
        vazio = "nenhuma UASG aderida — a coleta ainda não tem escopo"
    return {"filial": _ficha(filial), "uasgs": linhas, "vazio": vazio}


@router.get("/api/master/filiais/{filial_id}/coleta")
def get_drill_coleta(
    filial_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    return {"filial": _ficha(filial), "coleta": resumo_coleta(db, filial.id)}


@router.get("/api/master/filiais/{filial_id}/observadores")
def get_drill_observadores(
    filial_id: uuid.UUID,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    filial = _filial_master(db, principal, filial_id)
    recorte = _recorte_filial(db, filial.id)
    try:
        pessoas = [_pessoa(pessoa) for pessoa in listar_observadores(db, somente_ativos=False)]
    finally:
        _soltar_recorte(db, recorte)
    return {"filial": _ficha(filial), "observadores": pessoas}


@router.get("/api/master/fila")
def get_fila(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, *PAPEIS_MASTER)
    jobs = db.scalars(select(ColetaJob).order_by(ColetaJob.noite.desc(), ColetaJob.faixa)).all()
    filiais = {f.id: f for f in db.scalars(select(Filial)).all()}
    cursores: dict = {}
    for cursor in db.scalars(select(ColetaCursor)).all():
        atual = cursores.get(cursor.filial_id)
        if atual is None or cursor.atualizado_em > atual.atualizado_em:
            cursores[cursor.filial_id] = cursor
    return {
        "jobs": [
            {
                "id": str(job.id),
                "filial": filiais[job.filial_id].municipio if job.filial_id in filiais else "",
                "filial_id": str(job.filial_id),
                "faixa": job.faixa,
                "tipo": job.tipo,
                "noite": job.noite.isoformat(),
                "status": job.status,
                "motivo": job.motivo,
                "chamadas": job.chamadas,
                "cursor": (
                    f"{cursores[job.filial_id].codigo_uasg} {cursores[job.filial_id].tipo} pág. {cursores[job.filial_id].pagina}"
                    if job.filial_id in cursores
                    else ""
                ),
            }
            for job in jobs
        ]
    }


@router.post("/api/master/fila/{job_id}/cancelar")
def cancelar(job_id: uuid.UUID, principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, "master_admin")
    job = db.get(ColetaJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    if job.status in {"ok", "cancelado"}:
        return {"status": job.status}
    job.status = "cancelado"
    job.motivo = "Cancelado pelo master_admin."
    db.commit()
    return {"status": "cancelado"}


@router.get("/api/master/agenda")
def get_agenda(principal: Principal = Depends(require_login), db: Session = Depends(get_db)):
    _exigir(principal, *PAPEIS_MASTER)
    cfg = configuracao(db)
    return {
        "hora": cfg.hora,
        "minuto": cfg.minuto,
        "janela_dias": cfg.janela_dias,
        "backup_hora": cfg.backup_hora,
        "backup_minuto": cfg.backup_minuto,
        "faixa_c": settings.faixa_c,
        "faixa_d": settings.faixa_d,
        "relogio": agora_negocio().strftime("%d/%m/%Y %H:%M"),
    }


@router.put("/api/master/agenda")
def put_agenda(
    payload: AgendaIn,
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
):
    _exigir(principal, "master_admin")
    cfg = configuracao(db)
    cfg.hora = payload.hora
    cfg.minuto = payload.minuto
    db.commit()
    return {"hora": cfg.hora, "minuto": cfg.minuto}
