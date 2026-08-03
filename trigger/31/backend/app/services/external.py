"""Consultas a APIs públicas gratuitas para agilizar cadastros.

- CNPJ:  BrasilAPI (dados da Receita Federal, inclui regime tributário)
- CEP:   BrasilAPI v2 (com fallback ViaCEP)
- NCM:   BrasilAPI (tabela NCM completa, busca por código ou descrição)
"""

import httpx
from fastapi import HTTPException

BRASILAPI = "https://brasilapi.com.br/api"
TIMEOUT = httpx.Timeout(15.0)


async def _get(url: str) -> dict | list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers={"User-Agent": "rlp-erp/1.0"})
    if resp.status_code == 404:
        raise HTTPException(404, "Registro não encontrado na API pública.")
    if resp.status_code != 200:
        raise HTTPException(502, f"API pública indisponível ({resp.status_code}).")
    return resp.json()


async def lookup_cnpj(cnpj: str) -> dict:
    cnpj = "".join(filter(str.isdigit, cnpj))
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
        ) or None,
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
    cep = "".join(filter(str.isdigit, cep))
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
        }
    return {
        "cep": cep,
        "logradouro": data.get("street"),
        "bairro": data.get("neighborhood"),
        "municipio": data.get("city"),
        "uf": data.get("state"),
    }


async def search_ncm(query: str) -> list[dict]:
    query = query.strip()
    if not query:
        raise HTTPException(400, "Informe um código ou descrição para buscar.")
    data = await _get(f"{BRASILAPI}/ncm/v1?search={query}")
    if isinstance(data, dict):
        data = [data]
    return [
        {"codigo": item.get("codigo"), "descricao": item.get("descricao")}
        for item in data[:50]
    ]
