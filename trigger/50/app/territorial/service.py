"""Regras: municípios por filial, sync UASG, monitoramento FILIAL_UASG."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.compras.sync_uasg import sincronizar_uasgs_municipio
from app.database import (
    FilialMunicipio,
    FilialUasg,
    Municipio,
    Unidade,
    Uasg,
    Usuario,
)
from app.org.service import is_admin_plataforma, papel_na_unidade, usuario_acessa_unidade
from app.territorial.ibge import IbgeLookupError, buscar_municipio_ibge


class TerritorialError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _unidade_filial(db: Session, unidade_id: int) -> Unidade:
    u = db.get(Unidade, unidade_id)
    if u is None:
        raise TerritorialError("Unidade não encontrada.", status_code=404)
    if u.tipo != "filial":
        raise TerritorialError("Municípios e UASGs de monitoramento aplicam-se à filial.")
    return u


def pode_configurar(db: Session, user: Usuario, unidade_id: int) -> bool:
    if is_admin_plataforma(user):
        return True
    if not usuario_acessa_unidade(db, user, unidade_id):
        return False
    papel = papel_na_unidade(db, user, unidade_id)
    return papel in {
        "admin_plataforma",
        "admin_matriz",
        "gestor_matriz",
        "gestor_filial",
    }


def exigir_acesso(db: Session, user: Usuario, unidade_id: int) -> None:
    if not usuario_acessa_unidade(db, user, unidade_id):
        raise TerritorialError("Sem acesso a esta unidade.", status_code=403)


def exigir_configurar(db: Session, user: Usuario, unidade_id: int) -> None:
    exigir_acesso(db, user, unidade_id)
    if not pode_configurar(db, user, unidade_id):
        raise TerritorialError("Sem permissão para configurar território.", status_code=403)


def resolver_municipio_ibge(
    db: Session,
    codigo_ibge: int,
    *,
    forcar_remoto: bool = False,
) -> dict:
    """Resolve município: cache local → API oficial IBGE Localidades."""
    if codigo_ibge <= 0:
        raise TerritorialError("Código IBGE inválido.")

    if not forcar_remoto:
        cached = db.get(Municipio, codigo_ibge)
        if cached is not None and cached.nome and cached.uf:
            return {
                "codigo_ibge": cached.codigo_ibge,
                "nome": cached.nome,
                "uf": cached.uf,
                "fonte": "cache_local",
            }

    try:
        remoto = buscar_municipio_ibge(codigo_ibge)
    except IbgeLookupError as exc:
        raise TerritorialError(
            exc.message,
            status_code=404 if exc.not_found else 502,
        ) from exc

    # Atualiza cache local (catálogo IBGE do produto).
    row = db.get(Municipio, codigo_ibge)
    if row is None:
        row = Municipio(
            codigo_ibge=int(remoto["codigo_ibge"]),
            nome=str(remoto["nome"]),
            uf=str(remoto["uf"]),
            ativo=True,
        )
        db.add(row)
    else:
        row.nome = str(remoto["nome"])
        row.uf = str(remoto["uf"])
        row.ativo = True
    db.commit()

    return {
        "codigo_ibge": int(remoto["codigo_ibge"]),
        "nome": str(remoto["nome"]),
        "uf": str(remoto["uf"]),
        "fonte": "ibge_localidades",
    }


def garantir_municipio(
    db: Session,
    *,
    codigo_ibge: int,
    nome: str | None = None,
    uf: str | None = None,
) -> Municipio:
    if codigo_ibge <= 0:
        raise TerritorialError("Código IBGE inválido.")

    nome_ok = (nome or "").strip()
    uf_ok = (uf or "").strip().upper()[:2]

    # Sem nome/UF (ou incompleto): resolve pelo IBGE oficial.
    if len(nome_ok) < 2 or len(uf_ok) != 2:
        resolvido = resolver_municipio_ibge(db, codigo_ibge)
        nome_ok = str(resolvido["nome"])
        uf_ok = str(resolvido["uf"])

    if len(uf_ok) != 2:
        raise TerritorialError("UF inválida.")
    if len(nome_ok) < 2:
        raise TerritorialError("Nome do município deve ter ao menos 2 caracteres.")

    row = db.get(Municipio, codigo_ibge)
    if row is None:
        row = Municipio(codigo_ibge=codigo_ibge, nome=nome_ok, uf=uf_ok, ativo=True)
        db.add(row)
    else:
        row.nome = nome_ok
        row.uf = uf_ok
        row.ativo = True
    db.commit()
    db.refresh(row)
    return row


def associar_municipio(
    db: Session,
    *,
    unidade_id: int,
    codigo_ibge: int,
    nome: str | None = None,
    uf: str | None = None,
) -> FilialMunicipio:
    _unidade_filial(db, unidade_id)
    mun = garantir_municipio(db, codigo_ibge=codigo_ibge, nome=nome, uf=uf)
    row = db.scalar(
        select(FilialMunicipio).where(
            FilialMunicipio.unidade_id == unidade_id,
            FilialMunicipio.codigo_municipio_ibge == mun.codigo_ibge,
        )
    )
    agora = _utcnow()
    if row is None:
        row = FilialMunicipio(
            unidade_id=unidade_id,
            codigo_municipio_ibge=mun.codigo_ibge,
            ativo=True,
            ativado_em=agora,
        )
        db.add(row)
    else:
        row.ativo = True
        row.ativado_em = agora
        row.desativado_em = None
    db.commit()
    db.refresh(row)
    return row


def desassociar_municipio(db: Session, *, unidade_id: int, codigo_ibge: int) -> FilialMunicipio:
    _unidade_filial(db, unidade_id)
    row = db.scalar(
        select(FilialMunicipio).where(
            FilialMunicipio.unidade_id == unidade_id,
            FilialMunicipio.codigo_municipio_ibge == codigo_ibge,
        )
    )
    if row is None:
        raise TerritorialError("Vínculo município não encontrado.", status_code=404)
    row.ativo = False
    row.desativado_em = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def listar_municipios_filial(
    db: Session,
    unidade_id: int,
    *,
    apenas_ativos: bool = False,
) -> list[FilialMunicipio]:
    _unidade_filial(db, unidade_id)
    stmt = (
        select(FilialMunicipio)
        .where(FilialMunicipio.unidade_id == unidade_id)
        .options(joinedload(FilialMunicipio.municipio))
        .order_by(FilialMunicipio.id.asc())
    )
    if apenas_ativos:
        stmt = stmt.where(FilialMunicipio.ativo.is_(True))
    return list(db.scalars(stmt).unique().all())


def sync_municipio_filial(
    db: Session,
    *,
    unidade_id: int,
    codigo_ibge: int,
    registros: list[dict] | None = None,
) -> dict:
    _unidade_filial(db, unidade_id)
    vinculo = db.scalar(
        select(FilialMunicipio).where(
            FilialMunicipio.unidade_id == unidade_id,
            FilialMunicipio.codigo_municipio_ibge == codigo_ibge,
            FilialMunicipio.ativo.is_(True),
        )
    )
    if vinculo is None:
        raise TerritorialError(
            "Associe o município à filial (ativo) antes de sincronizar UASGs.",
            status_code=409,
        )
    mun = db.get(Municipio, codigo_ibge)
    if mun is None:
        raise TerritorialError("Município não cadastrado.", status_code=404)
    return sincronizar_uasgs_municipio(
        db,
        codigo_municipio_ibge=codigo_ibge,
        uf=mun.uf,
        registros=registros,
    )


def listar_catalogo_uasg(db: Session, codigo_ibge: int) -> list[Uasg]:
    return list(
        db.scalars(
            select(Uasg)
            .where(Uasg.codigo_municipio_ibge == codigo_ibge)
            .order_by(Uasg.codigo_uasg.asc())
        ).all()
    )


def ativar_uasg(db: Session, *, unidade_id: int, uasg_id: int) -> FilialUasg:
    _unidade_filial(db, unidade_id)
    uasg = db.get(Uasg, uasg_id)
    if uasg is None:
        raise TerritorialError("UASG não encontrada no catálogo.", status_code=404)

    # Exige município ativo compatível (ou UASG sem IBGE)
    if uasg.codigo_municipio_ibge is not None:
        ok = db.scalar(
            select(FilialMunicipio.id).where(
                FilialMunicipio.unidade_id == unidade_id,
                FilialMunicipio.codigo_municipio_ibge == uasg.codigo_municipio_ibge,
                FilialMunicipio.ativo.is_(True),
            )
        )
        if ok is None:
            raise TerritorialError(
                "Associe o município da UASG à filial antes de monitorar.",
                status_code=409,
            )

    row = db.scalar(
        select(FilialUasg).where(
            FilialUasg.unidade_id == unidade_id,
            FilialUasg.uasg_id == uasg_id,
        )
    )
    agora = _utcnow()
    if row is None:
        row = FilialUasg(
            unidade_id=unidade_id,
            uasg_id=uasg_id,
            ativo=True,
            ativado_em=agora,
        )
        db.add(row)
    else:
        row.ativo = True
        row.ativado_em = agora
        row.desativado_em = None
    db.commit()
    db.refresh(row)
    return row


def desativar_uasg(db: Session, *, unidade_id: int, uasg_id: int) -> FilialUasg:
    _unidade_filial(db, unidade_id)
    row = db.scalar(
        select(FilialUasg).where(
            FilialUasg.unidade_id == unidade_id,
            FilialUasg.uasg_id == uasg_id,
        )
    )
    if row is None:
        raise TerritorialError("Monitoramento UASG não encontrado.", status_code=404)
    row.ativo = False
    row.desativado_em = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def listar_uasgs_filial(
    db: Session,
    unidade_id: int,
    *,
    apenas_ativos: bool = False,
) -> list[FilialUasg]:
    _unidade_filial(db, unidade_id)
    stmt = (
        select(FilialUasg)
        .where(FilialUasg.unidade_id == unidade_id)
        .options(joinedload(FilialUasg.uasg))
        .order_by(FilialUasg.id.asc())
    )
    if apenas_ativos:
        stmt = stmt.where(FilialUasg.ativo.is_(True))
    return list(db.scalars(stmt).unique().all())
