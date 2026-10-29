"""Normalizadores de chaves oficiais Compras.gov."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any


def normalizar_ni(val: Any) -> str | None:
    """Remove pontuação; pad CNPJ 14 / CPF 11."""
    if val is None:
        return None
    digits = re.sub(r"\D", "", str(val))
    if not digits:
        return None
    if len(digits) <= 11:
        return digits.zfill(11)
    return digits.zfill(14)


def normalizar_codigo_uasg(val: Any) -> str | None:
    if val is None or val == "":
        return None
    return str(val).strip()


def normalizar_id_compra(val: Any) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s or None


def fmt_valor_br(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return str(val)


def fmt_num_br(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        txt = f"{val:,.4f}".rstrip("0").rstrip(".")
        return txt.replace(",", "X").replace(".", ",").replace("X", ".")
    return str(val)


def fmt_data_br(val: Any) -> str | None:
    if val is None or val == "":
        return None
    texto = str(val).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(texto[:19], fmt).strftime("%d/%m/%Y %H:%M")
        except ValueError:
            continue
    return texto


def link_pncp(raw: dict[str, Any]) -> str | None:
    cnpj = raw.get("orgaoEntidadeCnpj")
    ano = raw.get("anoCompraPncp")
    seq = raw.get("sequencialCompraPncp")
    if cnpj and ano and seq is not None:
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return None


def _int(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def contratacao_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Normaliza registro da API 07 → dict pronto para upsert."""
    id_compra = normalizar_id_compra(raw.get("idCompra") or raw.get("id_compra"))
    if not id_compra:
        return None
    unidade = normalizar_codigo_uasg(
        raw.get("unidadeOrgaoCodigoUnidade") or raw.get("unidade_compradora")
    )
    ano = raw.get("anoCompraPncp") or raw.get("ano")
    try:
        ano_int = int(ano) if ano is not None else 0
    except (TypeError, ValueError):
        ano_int = 0

    existe = raw.get("existeResultado")
    if not isinstance(existe, bool):
        existe = None

    return {
        "id_compra": id_compra,
        "unidade_compradora": unidade or "000000",
        "unidade_nome": str(
            raw.get("unidadeOrgaoNomeUnidade") or raw.get("unidade_nome") or ""
        )
        or None,
        "ano": ano_int,
        "numero": str(raw.get("numeroCompra") or raw.get("numero") or "") or None,
        "numero_controle_pncp": str(
            raw.get("numeroControlePNCP") or raw.get("numero_controle_pncp") or ""
        )
        or None,
        "modalidade_codigo": str(
            raw.get("codigoModalidade") or raw.get("modalidade_codigo") or ""
        )
        or None,
        "modalidade_descricao": str(
            raw.get("modalidadeNome") or raw.get("modalidade_descricao") or ""
        )
        or None,
        "objeto": str(raw.get("objetoCompra") or raw.get("objeto") or "") or None,
        "situacao": str(
            raw.get("situacaoCompraNomePncp") or raw.get("situacao") or ""
        )
        or None,
        "processo": str(raw.get("processo") or "") or None,
        "valor_total_estimado": fmt_valor_br(
            raw.get("valorTotalEstimado")
            if "valorTotalEstimado" in raw
            else raw.get("valor_total_estimado")
        ),
        "valor_total_homologado": fmt_valor_br(
            raw.get("valorTotalHomologado")
            if "valorTotalHomologado" in raw
            else raw.get("valor_total_homologado")
        ),
        "data_publicacao_pncp": fmt_data_br(
            raw.get("dataPublicacaoPncp") or raw.get("data_publicacao_pncp")
        ),
        "data_abertura_proposta_pncp": fmt_data_br(
            raw.get("dataAberturaPropostaPncp") or raw.get("data_abertura_proposta_pncp")
        ),
        "data_encerramento_proposta_pncp": fmt_data_br(
            raw.get("dataEncerramentoPropostaPncp")
            or raw.get("data_encerramento_proposta_pncp")
        ),
        "link_pncp": raw.get("link_pncp") or link_pncp(raw),
        "orgao_entidade_cnpj": normalizar_ni(
            raw.get("orgaoEntidadeCnpj") or raw.get("orgao_entidade_cnpj")
        ),
        "existe_resultado": existe,
        "dados_json": json.dumps(raw, ensure_ascii=False, default=str),
    }


def item_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    id_item = normalizar_id_compra(raw.get("idCompraItem") or raw.get("id_compra_item"))
    id_compra = normalizar_id_compra(raw.get("idCompra") or raw.get("id_compra"))
    if not id_item or not id_compra:
        return None
    tem = raw.get("temResultado")
    if not isinstance(tem, bool):
        tem = None
    return {
        "id_compra_item": id_item,
        "id_compra": id_compra,
        "numero_item_pncp": _int(raw.get("numeroItemPncp") or raw.get("numero_item_pncp")),
        "numero_item_compra": _int(
            raw.get("numeroItemCompra") or raw.get("numero_item_compra")
        ),
        "descricao_resumida": str(
            raw.get("descricaoResumida") or raw.get("descricao_resumida") or ""
        )
        or None,
        "descricao_detalhada": str(
            raw.get("descricaodetalhada")
            or raw.get("descricaoDetalhada")
            or raw.get("descricao_detalhada")
            or ""
        )
        or None,
        "material_ou_servico": str(
            raw.get("materialOuServico") or raw.get("material_ou_servico") or ""
        )
        or None,
        "material_ou_servico_nome": str(
            raw.get("materialOuServicoNome") or raw.get("material_ou_servico_nome") or ""
        )
        or None,
        "cod_item_catalogo": _int(
            raw.get("codItemCatalogo") or raw.get("cod_item_catalogo")
        ),
        "unidade_medida": str(raw.get("unidadeMedida") or raw.get("unidade_medida") or "")
        or None,
        "quantidade": fmt_num_br(raw.get("quantidade")),
        "valor_unitario_estimado": fmt_valor_br(
            raw.get("valorUnitarioEstimado")
            if "valorUnitarioEstimado" in raw
            else raw.get("valor_unitario_estimado")
        ),
        "valor_total": fmt_valor_br(
            raw.get("valorTotal") if "valorTotal" in raw else raw.get("valor_total")
        ),
        "situacao_compra_item_nome": str(
            raw.get("situacaoCompraItemNome") or raw.get("situacao_compra_item_nome") or ""
        )
        or None,
        "tem_resultado": tem,
        "dados_json": json.dumps(raw, ensure_ascii=False, default=str),
    }


def resultado_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    id_item = normalizar_id_compra(raw.get("idCompraItem") or raw.get("id_compra_item"))
    id_compra = normalizar_id_compra(raw.get("idCompra") or raw.get("id_compra"))
    if not id_item or not id_compra:
        return None
    seq = _int(raw.get("sequencialResultado") or raw.get("sequencial_resultado")) or 0
    return {
        "id_compra_item": id_item,
        "id_compra": id_compra,
        "sequencial_resultado": seq,
        "ni_fornecedor": normalizar_ni(
            raw.get("niFornecedor") or raw.get("ni_fornecedor")
        ),
        "nome_razao_social_fornecedor": str(
            raw.get("nomeRazaoSocialFornecedor")
            or raw.get("nome_razao_social_fornecedor")
            or ""
        )
        or None,
        "quantidade_homologada": fmt_num_br(
            raw.get("quantidadeHomologada")
            if "quantidadeHomologada" in raw
            else raw.get("quantidade_homologada")
        ),
        "valor_unitario_homologado": fmt_valor_br(
            raw.get("valorUnitarioHomologado")
            if "valorUnitarioHomologado" in raw
            else raw.get("valor_unitario_homologado")
        ),
        "valor_total_homologado": fmt_valor_br(
            raw.get("valorTotalHomologado")
            if "valorTotalHomologado" in raw
            else raw.get("valor_total_homologado")
        ),
        "situacao": str(
            raw.get("situacaoCompraItemResultadoNome") or raw.get("situacao") or ""
        )
        or None,
        "porte_fornecedor_nome": str(
            raw.get("porteFornecedorNome") or raw.get("porte_fornecedor_nome") or ""
        )
        or None,
        "data_resultado_pncp": str(
            raw.get("dataResultadoPncp")
            or raw.get("dataInclusaoPncp")
            or raw.get("data_resultado_pncp")
            or ""
        )
        or None,
        "percentual_desconto": fmt_num_br(
            raw.get("percentualDesconto")
            if "percentualDesconto" in raw
            else raw.get("percentual_desconto")
        ),
        "dados_json": json.dumps(raw, ensure_ascii=False, default=str),
    }
