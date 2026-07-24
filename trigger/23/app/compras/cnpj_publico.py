"""Enriquecimento CNPJ público (QSA / CNAEs) — cadeia de APIs públicas com fallback.

Ordem padrão: BrasilAPI → Minha Receita → CNPJá Open → Pública CNPJ.ws.
Cada fonte é tentada só se a anterior falhar (indisponível / erro transitório).
CNAEs secundários são derivados do blob `cnpj_dados_json` (sem coluna dedicada).
"""

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
    CNPJ_PUBLICO_CNPJA_URL,
    CNPJ_PUBLICO_HTTP_TIMEOUT_SEC,
    CNPJ_PUBLICO_MINHARECEITA_URL,
    CNPJ_PUBLICO_PUBLICA_URL,
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


def _texto_ou_none(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, dict):
        for key in ("text", "descricao", "nome", "name"):
            if val.get(key):
                return str(val.get(key)).strip() or None
        return None
    texto = str(val).strip()
    return texto or None


def _qsa_normalizado(raw_qsa: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_qsa, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw_qsa:
        if not isinstance(item, dict):
            continue
        # CNPJá Open: members[].person / role
        person = item.get("person") if isinstance(item.get("person"), dict) else {}
        role = item.get("role") if isinstance(item.get("role"), dict) else {}
        qualificacao = (
            item.get("qualificacao_socio")
            or item.get("qualificacao")
            or item.get("qualificacao_do_socio")
            or role.get("text")
        )
        if isinstance(qualificacao, dict):
            qualificacao = qualificacao.get("descricao") or qualificacao.get("text")
        pais = item.get("pais") or item.get("nome_pais_origem") or person.get("country")
        if isinstance(pais, dict):
            pais = pais.get("nome") or pais.get("name")
        out.append(
            {
                "nome_socio": (
                    item.get("nome_socio")
                    or item.get("nome")
                    or item.get("nome_do_socio")
                    or person.get("name")
                ),
                "cnpj_cpf_socio": (
                    item.get("cnpj_cpf_do_socio")
                    or item.get("cnpj_cpf_socio")
                    or item.get("cpf_cnpj_socio")
                    or person.get("taxId")
                ),
                "qualificacao": _texto_ou_none(qualificacao),
                "data_entrada": (
                    item.get("data_entrada_sociedade")
                    or item.get("data_entrada")
                    or item.get("since")
                ),
                "faixa_etaria": item.get("faixa_etaria") or person.get("age"),
                "pais_origem": _texto_ou_none(pais),
            }
        )
    return out


def _cnaes_secundarios_normalizado(raw_list: Any) -> list[dict[str, Any]]:
    """Normaliza lista de CNAEs secundários das APIs públicas para {codigo, descricao}."""
    if not isinstance(raw_list, list):
        return []
    out: list[dict[str, Any]] = []
    seen: set[int | None] = set()
    for item in raw_list:
        if not isinstance(item, dict):
            continue
        codigo = _int_or_none(
            item.get("codigo")
            or item.get("id")
            or item.get("code")
            or item.get("cnae")
            or item.get("cnae_fiscal")
        )
        descricao = _texto_ou_none(
            item.get("descricao")
            or item.get("text")
            or item.get("nome")
            or item.get("description")
            or item.get("cnae_fiscal_descricao")
        )
        if codigo is None and not descricao:
            continue
        # Evita duplicar o mesmo código na lista (mantém a 1ª ocorrência)
        if codigo is not None and codigo in seen:
            continue
        if codigo is not None:
            seen.add(codigo)
        out.append({"codigo": codigo, "descricao": descricao})
    return out


def extrair_cnaes_secundarios(
    raw: dict[str, Any] | None,
    *,
    fonte: str | None = None,
) -> list[dict[str, Any]]:
    """Extrai CNAEs secundários do payload bruto (BrasilAPI, Minha Receita, CNPJá, Pública)."""
    if not isinstance(raw, dict):
        return []
    fonte_l = (fonte or "").lower()

    # BrasilAPI / Minha Receita (e formato já adaptado)
    if isinstance(raw.get("cnaes_secundarios"), list):
        return _cnaes_secundarios_normalizado(raw.get("cnaes_secundarios"))

    # CNPJá Open
    if fonte_l == "cnpja" or isinstance(raw.get("sideActivities"), list):
        side = raw.get("sideActivities")
        if isinstance(side, list):
            return _cnaes_secundarios_normalizado(side)

    # Pública CNPJ.ws
    est = raw.get("estabelecimento") if isinstance(raw.get("estabelecimento"), dict) else {}
    if fonte_l == "publicacnpj" or isinstance(est.get("atividades_secundarias"), list):
        return _cnaes_secundarios_normalizado(est.get("atividades_secundarias"))

    return []


def cnaes_secundarios_de_registro(cnpj_dados_json: str | None) -> list[dict[str, Any]]:
    """Lê CNAEs secundários do blob persistido em cnpj_dados_json (sem coluna nova)."""
    if not cnpj_dados_json:
        return []
    try:
        envelope = json.loads(cnpj_dados_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(envelope, dict):
        return []
    fonte = envelope.get("fonte")
    payload = envelope.get("payload")
    if isinstance(payload, dict):
        return extrair_cnaes_secundarios(payload, fonte=str(fonte) if fonte else None)
    return extrair_cnaes_secundarios(envelope, fonte=str(fonte) if fonte else None)


def _adaptar_payload_cnpja(raw: dict[str, Any]) -> dict[str, Any]:
    """Converte resposta CNPJá Open para o formato flat esperado pelo mapper."""
    company = raw.get("company") if isinstance(raw.get("company"), dict) else {}
    address = raw.get("address") if isinstance(raw.get("address"), dict) else {}
    status = raw.get("status") if isinstance(raw.get("status"), dict) else {}
    nature = company.get("nature") if isinstance(company.get("nature"), dict) else {}
    size = company.get("size") if isinstance(company.get("size"), dict) else {}
    activity = raw.get("mainActivity") if isinstance(raw.get("mainActivity"), dict) else {}
    return {
        "cnpj": raw.get("taxId") or raw.get("cnpj"),
        "razao_social": company.get("name") or raw.get("razao_social"),
        "nome_fantasia": raw.get("alias") or raw.get("nome_fantasia"),
        "cnae_fiscal": activity.get("id"),
        "cnae_fiscal_descricao": activity.get("text"),
        "cnaes_secundarios": raw.get("sideActivities") or [],
        "descricao_situacao_cadastral": status.get("text") or raw.get("situacao_cadastral"),
        "municipio": address.get("city") or address.get("municipio"),
        "uf": address.get("state") or address.get("uf"),
        "codigo_municipio_ibge": address.get("municipality") or address.get("codigo_municipio_ibge"),
        "cep": address.get("zip") or address.get("cep"),
        "logradouro": address.get("street") or address.get("logradouro"),
        "numero": address.get("number") or address.get("numero"),
        "bairro": address.get("district") or address.get("bairro"),
        "natureza_juridica": nature.get("text"),
        "porte": size.get("text") or size.get("acronym"),
        "qsa": company.get("members") or raw.get("qsa") or [],
    }


def _adaptar_payload_publica(raw: dict[str, Any]) -> dict[str, Any]:
    """Converte resposta Pública CNPJ.ws para o formato flat esperado pelo mapper."""
    est = raw.get("estabelecimento") if isinstance(raw.get("estabelecimento"), dict) else {}
    cidade = est.get("cidade") if isinstance(est.get("cidade"), dict) else {}
    estado = est.get("estado") if isinstance(est.get("estado"), dict) else {}
    atividade = (
        est.get("atividade_principal")
        if isinstance(est.get("atividade_principal"), dict)
        else {}
    )
    porte = raw.get("porte") if isinstance(raw.get("porte"), dict) else {}
    natureza = (
        raw.get("natureza_juridica") if isinstance(raw.get("natureza_juridica"), dict) else {}
    )
    cnpj = est.get("cnpj") or raw.get("cnpj")
    if not cnpj:
        raiz = est.get("cnpj_raiz") or raw.get("cnpj_raiz")
        ordem = est.get("cnpj_ordem") or "0001"
        dv = est.get("cnpj_digito_verificador") or ""
        if raiz:
            cnpj = f"{raiz}{ordem}{dv}"
    socios = raw.get("socios") or []
    qsa = []
    for socio in socios if isinstance(socios, list) else []:
        if not isinstance(socio, dict):
            continue
        qual = socio.get("qualificacao_socio")
        qsa.append(
            {
                "nome_socio": socio.get("nome"),
                "cnpj_cpf_do_socio": socio.get("cpf_cnpj_socio"),
                "qualificacao_socio": (
                    qual.get("descricao") if isinstance(qual, dict) else qual
                ),
                "data_entrada_sociedade": socio.get("data_entrada"),
                "faixa_etaria": socio.get("faixa_etaria"),
                "pais": socio.get("pais"),
            }
        )
    return {
        "cnpj": cnpj,
        "razao_social": raw.get("razao_social"),
        "nome_fantasia": est.get("nome_fantasia"),
        "cnae_fiscal": atividade.get("id"),
        "cnae_fiscal_descricao": atividade.get("descricao"),
        "cnaes_secundarios": est.get("atividades_secundarias") or [],
        "descricao_situacao_cadastral": est.get("situacao_cadastral"),
        "municipio": cidade.get("nome"),
        "uf": estado.get("sigla"),
        "codigo_municipio_ibge": cidade.get("ibge_id"),
        "cep": est.get("cep"),
        "logradouro": est.get("logradouro"),
        "numero": est.get("numero"),
        "bairro": est.get("bairro"),
        "natureza_juridica": natureza.get("descricao"),
        "porte": porte.get("descricao"),
        "qsa": qsa,
    }


def _payload_para_mapper(raw: dict[str, Any], *, fonte: str) -> dict[str, Any]:
    if fonte == "cnpja":
        return _adaptar_payload_cnpja(raw)
    if fonte == "publicacnpj":
        return _adaptar_payload_publica(raw)
    return raw


def mapear_payload_cnpj(raw: dict[str, Any], *, fonte: str) -> dict[str, Any]:
    """Normaliza payloads das APIs públicas para a dimensão local."""
    adapted = _payload_para_mapper(raw, fonte=fonte)
    ni = normalizar_ni(adapted.get("cnpj") or adapted.get("ni_fornecedor"))
    if not ni or len(ni) != 14:
        raise ValueError("Payload CNPJ sem identificador válido")

    municipio = adapted.get("municipio") or adapted.get("nome_municipio")
    estabelecimento = adapted.get("estabelecimento")
    if not municipio and isinstance(estabelecimento, dict):
        municipio = estabelecimento.get("cidade")

    uf = adapted.get("uf") or adapted.get("uf_sigla")
    if not uf and isinstance(estabelecimento, dict):
        uf = estabelecimento.get("estado")

    ibge = _int_or_none(adapted.get("codigo_municipio_ibge") or adapted.get("codigo_municipio"))
    if ibge is None and isinstance(estabelecimento, dict):
        ibge = _int_or_none(estabelecimento.get("codigo_municipio_ibge"))

    de_udi = classificar_uberlandia(
        codigo_municipio_ibge=ibge,
        nome_municipio=str(municipio) if municipio else None,
        uf_sigla=str(uf) if uf else None,
    )

    cnae = _int_or_none(adapted.get("cnae_fiscal") or adapted.get("codigo_cnae"))
    cnae_nome = adapted.get("cnae_fiscal_descricao") or adapted.get("nome_cnae")
    situacao = (
        adapted.get("descricao_situacao_cadastral")
        or adapted.get("situacao_cadastral")
        or adapted.get("descricao_situacao")
    )
    if situacao is not None:
        situacao = str(situacao)

    qsa = _qsa_normalizado(adapted.get("qsa") or adapted.get("quadro_socios"))

    return {
        "ni_fornecedor": ni,
        "cnpj": ni,
        "nome_razao_social_fornecedor": (
            str(adapted.get("razao_social") or adapted.get("nome_razao_social_fornecedor") or "")
            or None
        ),
        "nome_fantasia": str(adapted.get("nome_fantasia") or "") or None,
        "codigo_cnae": cnae,
        "nome_cnae": str(cnae_nome or "") or None,
        "natureza_juridica_nome": str(
            adapted.get("natureza_juridica") or adapted.get("natureza_juridica_nome") or ""
        )
        or None,
        "porte_empresa_nome": str(adapted.get("porte") or adapted.get("porte_empresa_nome") or "")
        or None,
        "uf_sigla": str(uf or "").upper()[:2] or None,
        "nome_municipio": str(municipio or "") or None,
        "codigo_municipio_ibge": ibge,
        "de_uberlandia": de_udi,
        "situacao_cadastral": situacao,
        "cep": str(adapted.get("cep") or "") or None,
        "logradouro": str(adapted.get("logradouro") or "") or None,
        "numero_endereco": str(adapted.get("numero") or adapted.get("numero_endereco") or "")
        or None,
        "bairro": str(adapted.get("bairro") or "") or None,
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


def _fontes_cnpj_publico(ni: str) -> list[tuple[str, str]]:
    """Cadeia de fallbacks (ordem importa). URLs configuráveis via env."""
    return [
        ("brasilapi", f"{CNPJ_PUBLICO_BRASILAPI_URL.rstrip('/')}/{ni}"),
        ("minhareceita", f"{CNPJ_PUBLICO_MINHARECEITA_URL.rstrip('/')}/{ni}"),
        ("cnpja", f"{CNPJ_PUBLICO_CNPJA_URL.rstrip('/')}/{ni}"),
        ("publicacnpj", f"{CNPJ_PUBLICO_PUBLICA_URL.rstrip('/')}/{ni}"),
    ]


def consultar_cnpj_publico(cnpj: str) -> dict[str, Any]:
    ni = normalizar_ni(cnpj)
    if not ni or len(ni) != 14:
        raise ValueError("Informe um CNPJ válido (14 dígitos)")

    erros: list[str] = []
    for fonte, url in _fontes_cnpj_publico(ni):
        try:
            raw = _http_get_json(url)
            return mapear_payload_cnpj(raw, fonte=fonte)
        except LookupError:
            raise
        except Exception as exc:  # noqa: BLE001
            erros.append(f"{fonte}: {exc}")
    raise RuntimeError(
        "Falha ao consultar CNPJ público (todas as fontes indisponíveis) — "
        + "; ".join(erros)
    )


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

    cnaes_secundarios = cnaes_secundarios_de_registro(row.cnpj_dados_json)

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
        "cnaes_secundarios": cnaes_secundarios,
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
