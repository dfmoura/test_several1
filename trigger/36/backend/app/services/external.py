"""Consultas a APIs públicas gratuitas para agilizar cadastros.

- CNPJ:  BrasilAPI (dados da Receita Federal, inclui regime tributário)
- CEP:   BrasilAPI v2 (com fallback ViaCEP)
- NCM:   BrasilAPI (tabela NCM completa, busca por código ou descrição)
- CEST:  tabela local alinhada ao estudo RLP (Convênio ICMS 142/2018 /
         REVISAO_ICMS_ST + CADASTRO_PRODUTOS_*) — BrasilAPI não oferece CEST
"""

from __future__ import annotations

import re
from decimal import Decimal

import httpx
from fastapi import HTTPException

BRASILAPI = "https://brasilapi.com.br/api"
TIMEOUT = httpx.Timeout(15.0)

# CEST vinculado a prefixo de NCM (8 dígitos sem pontuação).
# Fonte: estudo trigger/32 (REVISAO_ICMS_ST + CADASTRO_PRODUTOS_*).
# Para a RLP (etiquetas / insumos industriais), a recomendação padrão é
# CEST vazio — o vínculo abaixo existe para alertar e permitir override.
_CEST_POR_PREFIXO_NCM: list[dict] = [
    {
        "ncm_prefixos": ["3919"],
        "codigo": "1001000",
        "descricao": (
            "Chapas, folhas, tiras, fitas, películas e outras formas planas, "
            "autoadesivas, de plásticos, mesmo em rolos (materiais de construção)"
        ),
        "segmento": "10 — Materiais de construção e congêneres",
        "recomendado_rlp": False,
        "justificativa": (
            "NCM 3919 consta do CEST 10.010.00 apenas quando destinado a "
            "CONSTRUÇÕES. Para filmes/etiquetas da RLP manter CEST vazio "
            "(ver REVISAO_ICMS_ST.txt)."
        ),
    },
]

# NCMs do estudo sem CEST (insumo/revenda de etiquetas) — resposta explícita.
_NCM_SEM_CEST_PREFIXOS = (
    "3215",  # tintas de impressão (não o segmento "tintas e vernizes" de ST)
    "3212",  # cold/hot stamping foils
    "4810",  # papel tag / cartão
    "4811",  # papel autoadesivo
    "5806",  # tecidos / fitas
    "5903",
    "5906",
    "9612",  # ribbon
    "3920",  # filme PP sem adesivo (laminação)
)


def digits_only(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def format_ncm(codigo: str | None) -> str | None:
    d = digits_only(codigo)
    if len(d) == 8:
        return f"{d[:4]}.{d[4:6]}.{d[6:]}"
    if len(d) == 4:
        return f"{d[:2]}.{d[2:]}"
    return codigo


def format_cest(codigo: str | None) -> str | None:
    d = digits_only(codigo)
    if len(d) == 7:
        return f"{d[:2]}.{d[2:5]}.{d[5:]}"
    return codigo


async def _get(url: str) -> dict | list:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, headers={"User-Agent": "rlp-erp/1.0"})
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Falha ao consultar API pública: {exc.__class__.__name__}") from exc
    if resp.status_code == 404:
        raise HTTPException(404, "Registro não encontrado na API pública.")
    if resp.status_code != 200:
        raise HTTPException(502, f"API pública indisponível ({resp.status_code}).")
    return resp.json()


def _ncm_item(item: dict) -> dict:
    codigo_raw = item.get("codigo") or ""
    codigo = digits_only(codigo_raw) or codigo_raw
    return {
        "codigo": codigo if len(digits_only(codigo_raw)) == 8 else codigo_raw.replace(".", ""),
        "codigo_formatado": codigo_raw if "." in codigo_raw else format_ncm(codigo_raw),
        "descricao": item.get("descricao"),
        "data_inicio": item.get("data_inicio"),
        "data_fim": item.get("data_fim"),
        "fonte": "BrasilAPI",
    }


async def lookup_cnpj(cnpj: str) -> dict:
    cnpj = digits_only(cnpj)
    if len(cnpj) != 14:
        raise HTTPException(400, "CNPJ deve ter 14 dígitos.")
    data = await _get(f"{BRASILAPI}/cnpj/v1/{cnpj}")
    return {
        "cnpj": cnpj,
        "razao_social": data.get("razao_social"),
        "nome_fantasia": data.get("nome_fantasia"),
        "email": data.get("email"),
        "telefone": data.get("ddd_telefone_1"),
        "cep": (data.get("cep") or "").replace("-", "") or None,
        "logradouro": " ".join(
            filter(None, [data.get("descricao_tipo_de_logradouro"), data.get("logradouro")])
        )
        or None,
        "numero": data.get("numero"),
        "complemento": data.get("complemento"),
        "bairro": data.get("bairro"),
        "municipio": data.get("municipio"),
        "uf": data.get("uf"),
        "situacao_cadastral": data.get("descricao_situacao_cadastral"),
        "cnae_principal": data.get("cnae_fiscal_descricao"),
        "porte": data.get("porte"),
        "opcao_simples": data.get("opcao_pelo_simples"),
        "natureza_juridica": data.get("natureza_juridica"),
    }


async def lookup_cep(cep: str) -> dict:
    cep = digits_only(cep)
    if len(cep) != 8:
        raise HTTPException(400, "CEP deve ter 8 dígitos.")
    try:
        data = await _get(f"{BRASILAPI}/cep/v2/{cep}")
    except HTTPException:
        # fallback ViaCEP
        data = await _get(f"https://viacep.com.br/ws/{cep}/json/")
        if isinstance(data, dict) and data.get("erro"):
            raise HTTPException(404, "CEP não encontrado.")
        return {
            "cep": cep,
            "logradouro": data.get("logradouro"),
            "bairro": data.get("bairro"),
            "municipio": data.get("localidade"),
            "uf": data.get("uf"),
            "ibge": data.get("ibge"),
        }
    return {
        "cep": cep,
        "logradouro": data.get("street"),
        "bairro": data.get("neighborhood"),
        "municipio": data.get("city"),
        "uf": data.get("state"),
        "ibge": (data.get("city_ibge") or data.get("ibge")),
    }


async def search_ncm(query: str) -> list[dict]:
    query = query.strip()
    if not query:
        raise HTTPException(400, "Informe um código ou descrição para buscar.")
    # Preferir dígitos nus na busca por código
    q = digits_only(query) if digits_only(query) and len(digits_only(query)) >= 4 else query
    data = await _get(f"{BRASILAPI}/ncm/v1?search={q}")
    if isinstance(data, dict):
        data = [data]
    # Preferir folhas de 8 dígitos no topo
    items = [_ncm_item(item) for item in data]
    items.sort(key=lambda x: (0 if len(digits_only(x["codigo"])) == 8 else 1, x["codigo"]))
    return items[:50]


async def lookup_ncm(codigo: str) -> dict:
    """Consulta um NCM exato (8 dígitos) na BrasilAPI."""
    codigo = digits_only(codigo)
    if len(codigo) != 8:
        raise HTTPException(400, "NCM deve ter 8 dígitos.")
    try:
        data = await _get(f"{BRASILAPI}/ncm/v1/{codigo}")
    except HTTPException:
        # algumas bases só aceitam com pontos
        data = await _get(f"{BRASILAPI}/ncm/v1/{format_ncm(codigo)}")
    if isinstance(data, list):
        if not data:
            raise HTTPException(404, "NCM não encontrado.")
        data = data[0]
    item = _ncm_item(data)
    item["cest"] = lookup_cest_por_ncm(codigo)
    return item


def lookup_cest_por_ncm(ncm: str) -> dict:
    """Sugestão de CEST a partir do NCM (tabela local do estudo RLP)."""
    ncm = digits_only(ncm)
    if len(ncm) < 4:
        raise HTTPException(400, "Informe um NCM (ao menos 4 dígitos) para sugerir CEST.")

    candidatos: list[dict] = []
    for regra in _CEST_POR_PREFIXO_NCM:
        if any(ncm.startswith(p) for p in regra["ncm_prefixos"]):
            candidatos.append(
                {
                    "codigo": regra["codigo"],
                    "codigo_formatado": format_cest(regra["codigo"]),
                    "descricao": regra["descricao"],
                    "segmento": regra["segmento"],
                    "recomendado_rlp": regra["recomendado_rlp"],
                    "justificativa": regra["justificativa"],
                }
            )

    sem_cest = any(ncm.startswith(p) for p in _NCM_SEM_CEST_PREFIXOS)
    recomendado = None if (not candidatos or all(not c["recomendado_rlp"] for c in candidatos)) else next(
        (c["codigo"] for c in candidatos if c["recomendado_rlp"]), None
    )

    if candidatos:
        mensagem = candidatos[0]["justificativa"]
    elif sem_cest:
        mensagem = (
            "NCM da operação atual da RLP sem CEST aplicável (estudo / NF-e amostradas). "
            "Manter CEST vazio."
        )
    else:
        mensagem = (
            "NCM sem vínculo CEST conhecido na tabela local do ERP. "
            "Manter vazio ou validar com o contador / Convênio ICMS 142/2018."
        )

    return {
        "ncm": ncm,
        "ncm_formatado": format_ncm(ncm),
        "cest_recomendado": recomendado,
        "sugerir_vazio": recomendado is None,
        "candidatos": candidatos,
        "mensagem": mensagem,
        "fonte": "tabela local RLP (Convênio ICMS 142/2018 / estudo trigger/32)",
    }


def sugerir_ncm_por_largura(
    largura_mm: float | Decimal | str,
    material: str = "PP",
) -> dict:
    """Regra do estudo: NCM 3919 desdobra por largura da bobina (≤ 20 cm vs > 20 cm).

    - largura ≤ 200 mm → 3919.10.xx
    - largura > 200 mm → 3919.90.xx
    Material PP → ...10; demais → ...90
    """
    try:
        mm = float(largura_mm)
    except (TypeError, ValueError):
        raise HTTPException(400, "Informe largura_mm numérica.") from None
    if mm <= 0:
        raise HTTPException(400, "largura_mm deve ser > 0.")

    mat = (material or "PP").strip().upper()
    is_pp = mat in {"PP", "BOPP", "POLIPROPILENO", "POLYPROPYLENE"}
    sufixo = "10" if is_pp else "90"
    faixa = "391910" if mm <= 200 else "391990"
    codigo = f"{faixa}{sufixo}"

    return {
        "largura_mm": mm,
        "limite_mm": 200,
        "faixa": "≤ 20 cm" if mm <= 200 else "> 20 cm",
        "material": "PP" if is_pp else "OUTROS",
        "ncm": codigo,
        "ncm_formatado": format_ncm(codigo),
        "descricao_regra": (
            "Bobina autoadesiva de plástico (NCM 3919): "
            f"{'rolos de largura ≤ 20 cm' if mm <= 200 else 'outras (largura > 20 cm)'} — "
            f"{'de polipropileno' if is_pp else 'outras matérias'}."
        ),
        "fonte": "CADASTRO_PRODUTOS_COMPRA / LISTAGEM_NCM (estudo RLP)",
    }
