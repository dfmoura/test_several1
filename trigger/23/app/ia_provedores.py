"""Setup · Provedores de IA — CRUD de tokens + teste de conexão.

Somente admin (prefixo ``/api/sistema``). A API key nunca é devolvida em
texto pleno — apenas máscara. Features consomem ``app.ia_client.IAClient``.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import PROVEDORES_IA, IaProvedor, get_db
from app.ia_client import _ProvedorRuntime, testar_conexao_provedor
from app.ia_crypto import (
    criptografar_api_key,
    descriptografar_api_key,
    mascarar_api_key,
)

router = APIRouter(prefix="/api/sistema/ia-provedores", tags=["ia-provedores"])


class IaProvedorCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    provedor: str = Field(default="openai", max_length=40)
    base_url: str | None = Field(default=None, max_length=500)
    modelo: str | None = Field(default=None, max_length=120)
    api_key: str = Field(min_length=8, max_length=500)
    prioridade: int = Field(default=100, ge=1, le=9999)
    ativo: bool = True


class IaProvedorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    provedor: str | None = Field(default=None, max_length=40)
    base_url: str | None = Field(default=None, max_length=500)
    modelo: str | None = Field(default=None, max_length=120)
    api_key: str | None = Field(default=None, min_length=8, max_length=500)
    prioridade: int | None = Field(default=None, ge=1, le=9999)
    ativo: bool | None = None


def _validar_provedor(valor: str) -> str:
    v = (valor or "").strip().lower()
    if v not in PROVEDORES_IA:
        raise ValueError(
            f"Provedor inválido. Use: {', '.join(sorted(PROVEDORES_IA))}."
        )
    return v


def _limpar_opcional(valor: str | None) -> str | None:
    if valor is None:
        return None
    t = valor.strip()
    return t or None


def provedor_para_out(row: IaProvedor) -> dict[str, Any]:
    return {
        "id": row.id,
        "nome": row.nome,
        "provedor": row.provedor,
        "base_url": row.base_url,
        "modelo": row.modelo,
        "api_key_mascara": row.api_key_mascara,
        "prioridade": row.prioridade,
        "ativo": row.ativo,
        "ultimo_teste_em": row.ultimo_teste_em.isoformat() if row.ultimo_teste_em else None,
        "ultimo_teste_ok": row.ultimo_teste_ok,
        "ultimo_teste_msg": row.ultimo_teste_msg,
        "criado_em": row.criado_em.isoformat() if row.criado_em else None,
        "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
    }


def listar_provedores(db: Session, *, incluir_inativos: bool = True) -> list[IaProvedor]:
    stmt = select(IaProvedor).order_by(
        IaProvedor.prioridade.asc(),
        IaProvedor.id.asc(),
    )
    if not incluir_inativos:
        stmt = stmt.where(IaProvedor.ativo.is_(True))
    return list(db.scalars(stmt).all())


def criar_provedor(db: Session, dados: IaProvedorCreate) -> IaProvedor:
    try:
        tipo = _validar_provedor(dados.provedor)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    api_key = dados.api_key.strip()
    row = IaProvedor(
        nome=dados.nome.strip(),
        provedor=tipo,
        base_url=_limpar_opcional(dados.base_url),
        modelo=_limpar_opcional(dados.modelo),
        api_key_criptografada=criptografar_api_key(api_key),
        api_key_mascara=mascarar_api_key(api_key),
        prioridade=dados.prioridade,
        ativo=dados.ativo,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def atualizar_provedor(db: Session, pid: int, dados: IaProvedorUpdate) -> IaProvedor:
    row = db.get(IaProvedor, pid)
    if row is None:
        raise HTTPException(404, "Provedor de IA não encontrado.")

    if dados.nome is not None:
        row.nome = dados.nome.strip()
    if dados.provedor is not None:
        try:
            row.provedor = _validar_provedor(dados.provedor)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
    if "base_url" in dados.model_fields_set:
        row.base_url = _limpar_opcional(dados.base_url)
    if "modelo" in dados.model_fields_set:
        row.modelo = _limpar_opcional(dados.modelo)
    if dados.prioridade is not None:
        row.prioridade = dados.prioridade
    if dados.ativo is not None:
        row.ativo = dados.ativo
    if dados.api_key is not None and dados.api_key.strip():
        key = dados.api_key.strip()
        row.api_key_criptografada = criptografar_api_key(key)
        row.api_key_mascara = mascarar_api_key(key)

    db.commit()
    db.refresh(row)
    return row


def remover_provedor(db: Session, pid: int) -> None:
    row = db.get(IaProvedor, pid)
    if row is None:
        raise HTTPException(404, "Provedor de IA não encontrado.")
    db.delete(row)
    db.commit()


def _runtime_de_row(row: IaProvedor) -> _ProvedorRuntime:
    return _ProvedorRuntime(
        id=row.id,
        nome=row.nome,
        provedor=row.provedor,
        base_url=row.base_url,
        modelo=row.modelo,
        api_key=descriptografar_api_key(row.api_key_criptografada),
        prioridade=row.prioridade,
    )


def testar_provedor(db: Session, pid: int) -> dict[str, Any]:
    row = db.get(IaProvedor, pid)
    if row is None:
        raise HTTPException(404, "Provedor de IA não encontrado.")
    try:
        runtime = _runtime_de_row(row)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    resultado = testar_conexao_provedor(runtime)
    row.ultimo_teste_em = datetime.now(timezone.utc).replace(tzinfo=None)
    row.ultimo_teste_ok = bool(resultado.get("ok"))
    msg = str(resultado.get("mensagem") or "")[:300]
    row.ultimo_teste_msg = msg
    db.commit()
    db.refresh(row)
    return {
        "ok": row.ultimo_teste_ok,
        "mensagem": row.ultimo_teste_msg,
        "provedor": provedor_para_out(row),
    }


# --- Rotas -------------------------------------------------------------------


@router.get("")
def api_listar(db: Session = Depends(get_db)) -> dict:
    rows = listar_provedores(db)
    ativos = sum(1 for r in rows if r.ativo)
    return {
        "items": [provedor_para_out(r) for r in rows],
        "total": len(rows),
        "ativos": ativos,
        "aviso_custo": (
            "O uso consome crédito do provedor externo (OpenAI, Gemini, Anthropic etc.). "
            "AWS Free Tier não cobre APIs de IA."
        ),
    }


@router.post("", status_code=201)
def api_criar(body: IaProvedorCreate, db: Session = Depends(get_db)) -> dict:
    row = criar_provedor(db, body)
    return provedor_para_out(row)


@router.get("/{pid}")
def api_obter(pid: int, db: Session = Depends(get_db)) -> dict:
    row = db.get(IaProvedor, pid)
    if row is None:
        raise HTTPException(404, "Provedor de IA não encontrado.")
    return provedor_para_out(row)


@router.patch("/{pid}")
def api_atualizar(
    pid: int,
    body: IaProvedorUpdate,
    db: Session = Depends(get_db),
) -> dict:
    row = atualizar_provedor(db, pid, body)
    return provedor_para_out(row)


@router.delete("/{pid}")
def api_remover(pid: int, db: Session = Depends(get_db)) -> dict:
    remover_provedor(db, pid)
    return {"ok": True, "id": pid}


@router.post("/{pid}/testar")
def api_testar(pid: int, db: Session = Depends(get_db)) -> dict:
    return testar_provedor(db, pid)
