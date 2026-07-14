"""Enriquecimento CNPJ público (QSA) — BrasilAPI + fallback Minha Receita."""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.compras.normalizers import normalizar_ni
from app.compras.repository import ensure_fornecedor_stub, upsert_fornecedor
from app.config import (
    CNPJ_PUBLICO_BRASILAPI_URL,
    CNPJ_PUBLICO_CACHE_DIAS,
    CNPJ_PUBLICO_HTTP_TIMEOUT_SEC,
    CNPJ_PUBLICO_MINHARECEITA_URL,
    UBERLANDIA_IBGE,
    UBERLANDIA_NOME,
    USER_AGENT,
)
from app.database import ComprasFornecedor


def _sem_acento(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def classificar_uberlandia(
    *,
    codigo_municipio_ibge: int | None = None,
    nome_municipio: str | None = None,
    uf_sigla: str | None = None,
) -> bool | None:
    """True/False quando há indício de município; None se insuficiente."""
    if codigo_municipio_ibge is not None:
        return int(codigo_municipio_ibge) == int(UBERLANDIA_IBGE)
    if not nome_municipio:
        return None
    nome = re.sub(r"\s+", "", _sem_acento(nome_municipio).upper())
    if UBERLANDIA_NOME in nome:
        if uf_sigla and str(uf_sigla).upper() not in ("MG", ""):
            return False
        return True
    return False


def _int_or_none(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _qsa_normalizado(raw_qsa: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_qsa, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw_qsa:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "nome_socio": item.get("nome_socio") or item.get("nome") or item.get("nome_do_socio"),
                "cnpj_cpf_socio": item.get("cnpj_cpf_do_socio")
                or item.get("cnpj_cpf_socio")
                or item.get("cpf_cnpj_socio"),
                "qualificacao": item.get("qualificacao_socio")
                or item.get("qualificacao")
                or item.get("qualificacao_do_socio"),
                "data_entrada": item.get("data_entrada_sociedade") or item.get("data_entrada"),
                "faixa_etaria": item.get("faixa_etaria"),
                "pais_origem": item.get("pais") or item.get("nome_pais_origem"),
            }
        )
    return out


def mapear_payload_cnpj(raw: dict[str, Any], *, fonte: str) -> dict[str, Any]:
    """Normaliza payloads BrasilAPI / Minha Receita para a dimensão local."""
    ni = normalizar_ni(raw.get("cnpj") or raw.get("ni_fornecedor"))
    if not ni or len(ni) != 14:
        raise ValueError("Payload CNPJ sem identificador válido")

    municipio = raw.get("municipio") or raw.get("nome_municipio")
    estabelecimento = raw.get("estabelecimento")
    if not municipio and isinstance(estabelecimento, dict):
        municipio = estabelecimento.get("cidade")

    uf = raw.get("uf") or raw.get("uf_sigla")
    if not uf and isinstance(estabelecimento, dict):
        uf = estabelecimento.get("estado")

    ibge = _int_or_none(raw.get("codigo_municipio_ibge") or raw.get("codigo_municipio"))
    if ibge is None and isinstance(estabelecimento, dict):
        ibge = _int_or_none(estabelecimento.get("codigo_municipio_ibge"))

    de_udi = classificar_uberlandia(
        codigo_municipio_ibge=ibge,
        nome_municipio=str(municipio) if municipio else None,
        uf_sigla=str(uf) if uf else None,
    )

    cnae = _int_or_none(raw.get("cnae_fiscal") or raw.get("codigo_cnae"))
    cnae_nome = raw.get("cnae_fiscal_descricao") or raw.get("nome_cnae")
    situacao = (
        raw.get("descricao_situacao_cadastral")
        or raw.get("situacao_cadastral")
        or raw.get("descricao_situacao")
    )
    if situacao is not None:
        situacao = str(situacao)

    qsa = _qsa_normalizado(raw.get("qsa") or raw.get("quadro_socios"))

    return {
        "ni_fornecedor": ni,
        "cnpj": ni,
        "nome_razao_social_fornecedor": (
            str(raw.get("razao_social") or raw.get("nome_razao_social_fornecedor") or "") or None
        ),
        "nome_fantasia": str(raw.get("nome_fantasia") or "") or None,
        "codigo_cnae": cnae,
        "nome_cnae": str(cnae_nome or "") or None,
        "natureza_juridica_nome": str(
            raw.get("natureza_juridica") or raw.get("natureza_juridica_nome") or ""
        )
        or None,
        "porte_empresa_nome": str(raw.get("porte") or raw.get("porte_empresa_nome") or "") or None,
        "uf_sigla": str(uf or "").upper()[:2] or None,
        "nome_municipio": str(municipio or "") or None,
        "codigo_municipio_ibge": ibge,
        "de_uberlandia": de_udi,
        "situacao_cadastral": situacao,
        "cep": str(raw.get("cep") or "") or None,
        "logradouro": str(raw.get("logradouro") or "") or None,
        "numero_endereco": str(raw.get("numero") or raw.get("numero_endereco") or "") or None,
        "bairro": str(raw.get("bairro") or "") or None,
        "qsa_json": json.dumps(qsa, ensure_ascii=False),
        "cnpj_dados_json": json.dumps(
            {"fonte": fonte, "payload": raw},
            ensure_ascii=False,
            default=str,
        ),
        "cnpj_enriquecido_em": datetime.utcnow(),
        "fonte_razao_social": "cnpj_publico",
        "_fonte": "cnpj_publico",
    }


def _http_get_json(url: str) -> dict[str, Any]:
    with httpx.Client(
        timeout=CNPJ_PUBLICO_HTTP_TIMEOUT_SEC,
        follow_redirects=True,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    ) as client:
        resp = client.get(url)
        if resp.status_code == 404:
            raise LookupError("CNPJ não encontrado na base pública")
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, dict):
            raise ValueError("Resposta CNPJ inválida")
        return data


def consultar_cnpj_publico(cnpj: str) -> dict[str, Any]:
    ni = normalizar_ni(cnpj)
    if not ni or len(ni) != 14:
        raise ValueError("Informe um CNPJ válido (14 dígitos)")

    erros: list[str] = []
    for fonte, url in (
        ("brasilapi", f"{CNPJ_PUBLICO_BRASILAPI_URL.rstrip('/')}/{ni}"),
        ("minhareceita", f"{CNPJ_PUBLICO_MINHARECEITA_URL.rstrip('/')}/{ni}"),
    ):
        try:
            raw = _http_get_json(url)
            return mapear_payload_cnpj(raw, fonte=fonte)
        except LookupError:
            raise
        except Exception as exc:  # noqa: BLE001
            erros.append(f"{fonte}: {exc}")
    raise RuntimeError("Falha ao consultar CNPJ público — " + "; ".join(erros))


def cache_cnpj_valido(row: ComprasFornecedor, *, dias: int | None = None) -> bool:
    if not row.cnpj_enriquecido_em or not row.cnpj_dados_json:
        return False
    limite = dias if dias is not None else CNPJ_PUBLICO_CACHE_DIAS
    return row.cnpj_enriquecido_em >= datetime.utcnow() - timedelta(days=limite)


def fornecedor_para_api(row: ComprasFornecedor) -> dict[str, Any]:
    qsa: list[dict[str, Any]] = []
    if row.qsa_json:
        try:
            parsed = json.loads(row.qsa_json)
            if isinstance(parsed, list):
                qsa = parsed
        except json.JSONDecodeError:
            qsa = []

    de_udi = row.de_uberlandia
    if de_udi is None:
        de_udi = classificar_uberlandia(
            codigo_municipio_ibge=row.codigo_municipio_ibge,
            nome_municipio=row.nome_municipio,
            uf_sigla=row.uf_sigla,
        )

    tipo = "cnpj" if len(row.ni_fornecedor) > 11 else "cpf"
    return {
        "id": row.id,
        "ni_fornecedor": row.ni_fornecedor,
        "tipo": tipo,
        "cnpj": row.cnpj,
        "cpf": row.cpf,
        "razao_social": row.nome_razao_social_fornecedor,
        "nome_fantasia": row.nome_fantasia,
        "porte": row.porte_empresa_nome,
        "natureza_juridica": row.natureza_juridica_nome,
        "cnae_codigo": row.codigo_cnae,
        "cnae": row.nome_cnae,
        "situacao_cadastral": row.situacao_cadastral,
        "uf": row.uf_sigla,
        "municipio": row.nome_municipio,
        "codigo_municipio_ibge": row.codigo_municipio_ibge,
        "de_uberlandia": de_udi,
        "origem_local": (
            "Uberlândia"
            if de_udi is True
            else ("Fora de Uberlândia" if de_udi is False else "Não classificado")
        ),
        "cep": row.cep,
        "logradouro": row.logradouro,
        "numero": row.numero_endereco,
        "bairro": row.bairro,
        "ativo": row.ativo,
        "habilitado_licitar": row.habilitado_licitar,
        "qsa": qsa,
        "cnpj_enriquecido_em": row.cnpj_enriquecido_em.isoformat()
        if row.cnpj_enriquecido_em
        else None,
        "compras_gov_enriquecido_em": row.compras_gov_enriquecido_em.isoformat()
        if row.compras_gov_enriquecido_em
        else None,
        "fonte_razao_social": row.fonte_razao_social,
        "cache_valido": cache_cnpj_valido(row),
    }


def obter_fornecedor_detalhe(
    db: Session,
    ni: str,
    *,
    refresh: bool = False,
    nome_hint: str | None = None,
) -> dict[str, Any]:
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("Identificador do fornecedor inválido")

    row, _ = ensure_fornecedor_stub(db, ni_norm, nome=nome_hint)

    # CPF: sem QSA em API pública de CNPJ
    if len(ni_norm) <= 11:
        db.commit()
        data = fornecedor_para_api(row)
        data["aviso"] = "Pessoa física (CPF) — QSA e cadastro CNPJ não se aplicam."
        return data

    if refresh or not cache_cnpj_valido(row):
        mapped = consultar_cnpj_publico(ni_norm)
        row, _ = upsert_fornecedor(db, mapped)
        db.commit()

    return fornecedor_para_api(row)
