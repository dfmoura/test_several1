"""Raiz do Observatório (CNPJ único) + catálogo de UASGs do município.

Hierarquia:
  sistema_raiz (singleton)
    → localidade IBGE/UF
      → sistema_uasgs_municipio (catálogo Compras.gov)
        → sistema_unidades_compradoras (adesão / flag do Setup)

Resolução operacional (coletores): raiz → variáveis de ambiente → defaults.
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.compras.client import ComprasGovClient
from app.compras.cnpj_publico import consultar_cnpj_publico
from app.compras.normalizers import normalizar_codigo_uasg, normalizar_ni
from app.config import (
    COMPRAS_IBGE_MUNICIPIO,
    COMPRAS_ORGAOS_CNPJ,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    COMPRAS_UASG_ENDPOINT,
    COMPRAS_UF_FILTRO,
)
from app.database import (
    SessionLocal,
    SistemaRaiz,
    SistemaUasgMunicipio,
    SistemaUnidadeCompradora,
)
from app.unidades_compradoras import garantir_seed


def obter_raiz(db: Session) -> SistemaRaiz | None:
    try:
        return db.get(SistemaRaiz, 1)
    except (OperationalError, ProgrammingError):
        db.rollback()
        return None


def defaults_env() -> dict[str, Any]:
    """Valores de contingência (env) quando a raiz ainda não foi cadastrada."""
    cnpjs = [normalizar_ni(c) for c in COMPRAS_ORGAOS_CNPJ if normalizar_ni(c)]
    return {
        "cnpj": cnpjs[0] if cnpjs else None,
        "cnpjs_orgao": cnpjs,
        "codigo_municipio_ibge": int(COMPRAS_IBGE_MUNICIPIO),
        "uf": (COMPRAS_UF_FILTRO or "").upper()[:2] or None,
    }


def _aplicar_payload_cnpj(row: SistemaRaiz, mapped: dict[str, Any]) -> None:
    fonte = str(mapped.get("_fonte") or "cnpj_publico")
    row.cnpj = str(mapped.get("cnpj") or mapped.get("ni_fornecedor") or row.cnpj)
    row.razao_social = mapped.get("nome_razao_social_fornecedor")
    row.nome_fantasia = mapped.get("nome_fantasia")
    row.situacao_cadastral = mapped.get("situacao_cadastral")
    row.natureza_juridica = mapped.get("natureza_juridica_nome")
    row.porte = mapped.get("porte_empresa_nome")
    row.codigo_cnae = mapped.get("codigo_cnae")
    row.nome_cnae = mapped.get("nome_cnae")
    row.codigo_municipio_ibge = mapped.get("codigo_municipio_ibge")
    row.nome_municipio = mapped.get("nome_municipio")
    uf = mapped.get("uf_sigla")
    row.uf = str(uf).upper()[:2] if uf else None
    row.cep = mapped.get("cep")
    row.logradouro = mapped.get("logradouro")
    row.numero = mapped.get("numero_endereco")
    row.bairro = mapped.get("bairro")
    row.fonte_cnpj = fonte
    row.cnpj_dados_json = mapped.get("cnpj_dados_json")
    row.enriquecido_em = mapped.get("cnpj_enriquecido_em") or datetime.utcnow()


def consultar_cnpj_raiz(cnpj: str) -> dict[str, Any]:
    """Consulta APIs públicas e devolve payload normalizado (sem persistir)."""
    mapped = consultar_cnpj_publico(cnpj)
    return {
        "cnpj": mapped.get("cnpj") or mapped.get("ni_fornecedor"),
        "razao_social": mapped.get("nome_razao_social_fornecedor"),
        "nome_fantasia": mapped.get("nome_fantasia"),
        "situacao_cadastral": mapped.get("situacao_cadastral"),
        "natureza_juridica": mapped.get("natureza_juridica_nome"),
        "porte": mapped.get("porte_empresa_nome"),
        "codigo_cnae": mapped.get("codigo_cnae"),
        "nome_cnae": mapped.get("nome_cnae"),
        "codigo_municipio_ibge": mapped.get("codigo_municipio_ibge"),
        "nome_municipio": mapped.get("nome_municipio"),
        "uf": mapped.get("uf_sigla"),
        "cep": mapped.get("cep"),
        "logradouro": mapped.get("logradouro"),
        "numero": mapped.get("numero_endereco"),
        "bairro": mapped.get("bairro"),
        "fonte_cnpj": mapped.get("_fonte") or "cnpj_publico",
        "_mapped": mapped,
    }


def cadastrar_raiz(db: Session, cnpj: str) -> SistemaRaiz:
    """Cadastra a raiz uma única vez. Levanta ValueError/LookupError/RuntimeError."""
    existente = obter_raiz(db)
    if existente is not None:
        raise ValueError(
            "A raiz do sistema já está cadastrada. "
            "Use atualizar para refrescar os dados do mesmo CNPJ."
        )

    preview = consultar_cnpj_raiz(cnpj)
    mapped = preview.pop("_mapped")
    ni = normalizar_ni(preview.get("cnpj") or cnpj)
    if not ni or len(ni) != 14:
        raise ValueError("CNPJ inválido")
    if not preview.get("codigo_municipio_ibge"):
        raise ValueError(
            "A API pública não retornou o código IBGE do município. "
            "Não é possível definir a localidade de origem."
        )

    row = SistemaRaiz(id=1, cnpj=ni)
    _aplicar_payload_cnpj(row, mapped)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def atualizar_raiz(db: Session) -> SistemaRaiz:
    """Reconsulta APIs públicas e atualiza a raiz existente (mesmo CNPJ)."""
    row = obter_raiz(db)
    if row is None:
        raise LookupError("Cadastre a raiz do sistema antes de atualizar.")
    preview = consultar_cnpj_raiz(row.cnpj)
    mapped = preview.pop("_mapped")
    _aplicar_payload_cnpj(row, mapped)
    db.commit()
    db.refresh(row)
    return row


def raiz_para_api(row: SistemaRaiz | None) -> dict[str, Any]:
    env = defaults_env()
    if row is None:
        return {
            "cadastrada": False,
            "raiz": None,
            "defaults_env": env,
        }
    return {
        "cadastrada": True,
        "raiz": {
            "cnpj": row.cnpj,
            "razao_social": row.razao_social,
            "nome_fantasia": row.nome_fantasia,
            "situacao_cadastral": row.situacao_cadastral,
            "natureza_juridica": row.natureza_juridica,
            "porte": row.porte,
            "codigo_cnae": row.codigo_cnae,
            "nome_cnae": row.nome_cnae,
            "codigo_municipio_ibge": row.codigo_municipio_ibge,
            "nome_municipio": row.nome_municipio,
            "uf": row.uf,
            "cep": row.cep,
            "logradouro": row.logradouro,
            "numero": row.numero,
            "bairro": row.bairro,
            "fonte_cnpj": row.fonte_cnpj,
            "enriquecido_em": row.enriquecido_em.isoformat() if row.enriquecido_em else None,
            "cadastrado_em": row.cadastrado_em.isoformat() if row.cadastrado_em else None,
            "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
        },
        "defaults_env": env,
    }


# --- Resolução usada pelos coletores (raiz → env) ---


def resolver_ibge_municipio(db: Session | None = None) -> int:
    propria = db is None
    if propria:
        db = SessionLocal()
    try:
        row = obter_raiz(db)
        if row and row.codigo_municipio_ibge:
            return int(row.codigo_municipio_ibge)
    except (OperationalError, ProgrammingError):
        if db is not None:
            db.rollback()
    finally:
        if propria and db is not None:
            db.close()
    return int(COMPRAS_IBGE_MUNICIPIO)


def resolver_uf_filtro(db: Session | None = None) -> str:
    propria = db is None
    if propria:
        db = SessionLocal()
    try:
        row = obter_raiz(db)
        if row and row.uf:
            return str(row.uf).upper()[:2]
    except (OperationalError, ProgrammingError):
        if db is not None:
            db.rollback()
    finally:
        if propria and db is not None:
            db.close()
    return (COMPRAS_UF_FILTRO or "MG").upper()[:2]


def resolver_orgaos_cnpj(db: Session | None = None) -> list[str]:
    propria = db is None
    if propria:
        db = SessionLocal()
    try:
        row = obter_raiz(db)
        if row and row.cnpj:
            ni = normalizar_ni(row.cnpj)
            if ni:
                return [ni]
    except (OperationalError, ProgrammingError):
        if db is not None:
            db.rollback()
    finally:
        if propria and db is not None:
            db.close()
    out: list[str] = []
    for c in COMPRAS_ORGAOS_CNPJ:
        ni = normalizar_ni(c)
        if ni and ni not in out:
            out.append(ni)
    return out


# --- Catálogo municipal de UASGs ---


def listar_catalogo_uasgs(db: Session) -> list[SistemaUasgMunicipio]:
    try:
        return list(
            db.scalars(
                select(SistemaUasgMunicipio).order_by(
                    SistemaUasgMunicipio.codigo_uasg,
                )
            ).all()
        )
    except (OperationalError, ProgrammingError):
        db.rollback()
        return []


def sincronizar_uasgs_municipio(
    db: Session,
    *,
    on_log: Any | None = None,
) -> dict[str, Any]:
    """Busca UASGs ativas do município da raiz na API Compras.gov e atualiza o catálogo."""
    log = on_log or (lambda _: None)
    row = obter_raiz(db)
    if row is None:
        raise LookupError("Cadastre a raiz do sistema antes de sincronizar UASGs.")
    ibge = row.codigo_municipio_ibge
    uf = (row.uf or "").upper()[:2]
    if not ibge:
        raise ValueError("A raiz não possui código IBGE — atualize o cadastro via API pública.")
    if not uf:
        raise ValueError("A raiz não possui UF — atualize o cadastro via API pública.")

    log(f"Sincronizando UASGs — UF {uf} / IBGE {ibge}")
    encontrados: dict[str, dict[str, Any]] = {}

    with ComprasGovClient(on_log=log) as client:
        for raw in client.paginar(
            COMPRAS_UASG_ENDPOINT,
            params_base={
                "siglaUf": uf,
                "codigoMunicipioIbge": int(ibge),
                "statusUasg": "true",
            },
            contexto="API UASG (catálogo município)",
            tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
        ):
            from app.compras.coletor_uasg import uasg_da_api

            item = uasg_da_api(raw)
            if not item:
                continue
            codigo = item["codigo_uasg"]
            if item.get("codigo_municipio_ibge") not in (None, int(ibge)):
                continue
            encontrados[codigo] = item
        # Pequena pausa final para não martelar o gateway em syncs manuais.
        time.sleep(min(COMPRAS_PNCP_REQUEST_DELAY_SEC, 1.0))

    agora = datetime.utcnow()
    upserts = 0
    for codigo, item in encontrados.items():
        existente = db.scalar(
            select(SistemaUasgMunicipio).where(SistemaUasgMunicipio.codigo_uasg == codigo)
        )
        if existente is None:
            existente = SistemaUasgMunicipio(codigo_uasg=codigo)
            db.add(existente)
        existente.nome_uasg = item.get("nome_uasg")
        existente.sigla_uf = item.get("sigla_uf")
        existente.codigo_municipio_ibge = item.get("codigo_municipio_ibge")
        existente.nome_municipio_ibge = item.get("nome_municipio_ibge")
        existente.cnpj_cpf_orgao = item.get("cnpj_cpf_orgao")
        existente.status_uasg = item.get("status_uasg")
        existente.sincronizado_em = agora
        upserts += 1

    db.commit()
    log(f"Catálogo atualizado: {upserts} UASG(s) do município.")
    return {
        "ok": True,
        "codigo_municipio_ibge": int(ibge),
        "uf": uf,
        "total_catalogo": upserts,
        "sincronizado_em": agora.isoformat(),
    }


def catalogo_para_api(db: Session, rows: list[SistemaUasgMunicipio]) -> list[dict[str, Any]]:
    garantir_seed(db)
    adesao = {
        r.codigo: r
        for r in db.scalars(select(SistemaUnidadeCompradora)).all()
    }
    out: list[dict[str, Any]] = []
    for row in rows:
        un = adesao.get(row.codigo_uasg)
        out.append(
            {
                "codigo_uasg": row.codigo_uasg,
                "nome_uasg": row.nome_uasg,
                "sigla_uf": row.sigla_uf,
                "codigo_municipio_ibge": row.codigo_municipio_ibge,
                "nome_municipio_ibge": row.nome_municipio_ibge,
                "cnpj_cpf_orgao": row.cnpj_cpf_orgao,
                "status_uasg": row.status_uasg,
                "sincronizado_em": row.sincronizado_em.isoformat()
                if row.sincronizado_em
                else None,
                "no_setup": un is not None,
                "ativo_setup": bool(un.ativo) if un is not None else False,
                "unidade_id": un.id if un is not None else None,
            }
        )
    return out


def aderir_uasgs_ao_setup(db: Session, codigos: list[str]) -> dict[str, Any]:
    """Inclui UASGs do catálogo em ``sistema_unidades_compradoras`` (não remove existentes)."""
    garantir_seed(db)
    adicionados = 0
    reativados = 0
    ignorados = 0
    desconhecidos: list[str] = []

    max_ordem = db.scalar(select(func.max(SistemaUnidadeCompradora.ordem))) or 0

    for bruto in codigos:
        codigo = normalizar_codigo_uasg(bruto)
        if not codigo:
            continue
        cat = db.scalar(
            select(SistemaUasgMunicipio).where(SistemaUasgMunicipio.codigo_uasg == codigo)
        )
        if cat is None:
            desconhecidos.append(codigo)
            continue

        existente = db.scalar(
            select(SistemaUnidadeCompradora).where(SistemaUnidadeCompradora.codigo == codigo)
        )
        nome = (cat.nome_uasg or f"UASG {codigo}").strip()[:200]
        if existente is None:
            max_ordem = int(max_ordem) + 1
            db.add(
                SistemaUnidadeCompradora(
                    codigo=codigo,
                    nome=nome,
                    ativo=True,
                    ordem=max_ordem,
                )
            )
            adicionados += 1
        elif not existente.ativo:
            existente.ativo = True
            if nome and len(nome) >= 2:
                existente.nome = nome
            reativados += 1
        else:
            ignorados += 1

    if adicionados or reativados:
        db.commit()

    total = db.scalar(select(func.count()).select_from(SistemaUnidadeCompradora)) or 0
    return {
        "ok": True,
        "adicionados": adicionados,
        "reativados": reativados,
        "ignorados": ignorados,
        "desconhecidos": desconhecidos,
        "total_setup": int(total),
    }


def formatar_cnpj_exibicao(cnpj: str | None) -> str:
    ni = normalizar_ni(cnpj or "")
    if not ni or len(ni) != 14:
        return cnpj or ""
    return f"{ni[:2]}.{ni[2:5]}.{ni[5:8]}/{ni[8:12]}-{ni[12:]}"
