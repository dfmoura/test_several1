"""Acompanhamento interno da filial. A linha oficial do PNCP não guarda observador."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contas import ErroRegra
from app.models import Acompanhamento, Contratacao, Observador
from app.tempo import agora_utc


def _limpo(valor: str | None, limite: int) -> str:
    return (valor or "").strip()[:limite]


def listar_observadores(db: Session, *, somente_ativos: bool) -> list[Observador]:
    q = select(Observador).order_by(Observador.nome)
    if somente_ativos:
        q = q.where(Observador.ativo.is_(True))
    return list(db.scalars(q).all())


def criar_observador(db: Session, filial_id: uuid.UUID, nome: str, email: str, telefone: str) -> Observador:
    texto = _limpo(nome, 200)
    if len(texto) < 2:
        raise ErroRegra("Informe o nome do observador.")
    pessoa = Observador(
        tenant_id=filial_id,
        nome=texto,
        email=_limpo(email, 200),
        telefone=_limpo(telefone, 40),
        ativo=True,
        criado_em=agora_utc(),
    )
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return pessoa


def atualizar_observador(
    db: Session,
    observador_id: uuid.UUID,
    *,
    nome: str | None,
    email: str | None,
    telefone: str | None,
    ativo: bool | None,
) -> Observador:
    pessoa = db.get(Observador, observador_id)
    if pessoa is None:
        raise ErroRegra("Observador não encontrado.", status=404)
    if nome is not None:
        texto = _limpo(nome, 200)
        if len(texto) < 2:
            raise ErroRegra("Informe o nome do observador.")
        pessoa.nome = texto
    if email is not None:
        pessoa.email = _limpo(email, 200)
    if telefone is not None:
        pessoa.telefone = _limpo(telefone, 40)
    if ativo is not None:
        pessoa.ativo = ativo
    db.commit()
    db.refresh(pessoa)
    return pessoa


def definir_acompanhamento(
    db: Session,
    filial_id: uuid.UUID,
    contratacao_id: uuid.UUID,
    observador_id: uuid.UUID | None,
) -> None:
    compra = db.get(Contratacao, contratacao_id)
    if compra is None:
        raise ErroRegra("Contratação não encontrada.", status=404)
    atual = db.scalar(
        select(Acompanhamento).where(
            Acompanhamento.tenant_id == filial_id,
            Acompanhamento.alvo_tipo == "contratacao",
            Acompanhamento.alvo_chave == compra.numero_controle_pncp,
        )
    )
    if observador_id is None:
        if atual is not None:
            db.delete(atual)
        db.commit()
        return
    pessoa = db.get(Observador, observador_id)
    if pessoa is None or not pessoa.ativo or pessoa.tenant_id != filial_id:
        raise ErroRegra("Observador não encontrado nesta filial.", status=404)
    if atual is None:
        db.add(
            Acompanhamento(
                tenant_id=filial_id,
                alvo_tipo="contratacao",
                alvo_chave=compra.numero_controle_pncp,
                observador_id=pessoa.id,
            )
        )
    else:
        atual.observador_id = pessoa.id
    db.commit()


def mapa_observadores(db: Session, chaves: list[str]) -> dict[str, dict]:
    if not chaves:
        return {}
    linhas = db.execute(
        select(Acompanhamento, Observador)
        .join(Observador, Observador.id == Acompanhamento.observador_id)
        .where(
            Acompanhamento.alvo_tipo == "contratacao",
            Acompanhamento.alvo_chave.in_(chaves),
        )
    ).all()
    return {
        vinculo.alvo_chave: {
            "id": str(pessoa.id),
            "nome": pessoa.nome,
            "ativo": pessoa.ativo,
        }
        for vinculo, pessoa in linhas
    }
