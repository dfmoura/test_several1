"""Tabelas fiscais locais (CFOP / SPED / origem) — estudo RLP trigger/32.

Preferência do estudo APIS_FREE: CFOP vive no ERP (carga local), não na API
a cada keystroke. Fonte: CADASTRO_PRODUTOS_COMPRA/VENDA + Convênio praticado.
"""

from __future__ import annotations

from fastapi import HTTPException

from app.services.external import digits_only

# Catálogo enxuto dos CFOPs usados pela RLP (entrada industrial/revenda + saída).
CFOP_CATALOGO: list[dict] = [
    {"codigo": "1101", "descricao": "Compra para industrialização — operação interna", "tipo": "ENTRADA"},
    {"codigo": "1102", "descricao": "Compra para comercialização — operação interna", "tipo": "ENTRADA"},
    {"codigo": "1556", "descricao": "Compra de material para uso ou consumo — operação interna", "tipo": "ENTRADA"},
    {"codigo": "2101", "descricao": "Compra para industrialização — operação interestadual", "tipo": "ENTRADA"},
    {"codigo": "2102", "descricao": "Compra para comercialização — operação interestadual", "tipo": "ENTRADA"},
    {"codigo": "2556", "descricao": "Compra de material para uso ou consumo — interestadual", "tipo": "ENTRADA"},
    {"codigo": "5101", "descricao": "Venda de produção do estabelecimento — operação interna", "tipo": "SAIDA"},
    {"codigo": "5102", "descricao": "Venda de mercadoria adquirida — operação interna", "tipo": "SAIDA"},
    {"codigo": "5901", "descricao": "Remessa para industrialização por encomenda — interna", "tipo": "SAIDA"},
    {"codigo": "5910", "descricao": "Remessa em bonificação / brinde — interna", "tipo": "SAIDA"},
    {"codigo": "5949", "descricao": "Outra saída de mercadoria não especificada — interna", "tipo": "SAIDA"},
    {"codigo": "6101", "descricao": "Venda de produção do estabelecimento — interestadual", "tipo": "SAIDA"},
    {"codigo": "6102", "descricao": "Venda de mercadoria adquirida — interestadual", "tipo": "SAIDA"},
    {"codigo": "6107", "descricao": "Venda produção interestadual a não contribuinte (DIFAL)", "tipo": "SAIDA"},
    {"codigo": "6108", "descricao": "Venda revenda interestadual a não contribuinte (DIFAL)", "tipo": "SAIDA"},
    {"codigo": "6901", "descricao": "Remessa para industrialização por encomenda — interestadual", "tipo": "SAIDA"},
    {"codigo": "6910", "descricao": "Remessa em bonificação / brinde — interestadual", "tipo": "SAIDA"},
    {"codigo": "6949", "descricao": "Outra saída de mercadoria não especificada — interestadual", "tipo": "SAIDA"},
]

TIPO_ITEM_SPED: list[dict] = [
    {"codigo": "00", "descricao": "Mercadoria para revenda"},
    {"codigo": "01", "descricao": "Matéria-prima"},
    {"codigo": "02", "descricao": "Embalagem"},
    {"codigo": "03", "descricao": "Produto em processo"},
    {"codigo": "04", "descricao": "Produto acabado"},
    {"codigo": "05", "descricao": "Subproduto"},
    {"codigo": "06", "descricao": "Produto intermediário"},
    {"codigo": "07", "descricao": "Material de uso e consumo"},
    {"codigo": "08", "descricao": "Ativo imobilizado"},
    {"codigo": "09", "descricao": "Serviços"},
    {"codigo": "10", "descricao": "Outros insumos"},
    {"codigo": "99", "descricao": "Outras"},
]

ORIGENS_MERCADORIA: list[dict] = [
    {"codigo": "0", "descricao": "Nacional (exceto códigos 3, 4, 5 e 8)"},
    {"codigo": "1", "descricao": "Estrangeira — importação direta"},
    {"codigo": "2", "descricao": "Estrangeira — adquirida no mercado interno"},
    {"codigo": "3", "descricao": "Nacional com conteúdo de importação > 40% e ≤ 70%"},
    {"codigo": "4", "descricao": "Nacional produzida em conformidade com processos produtivos básicos"},
    {"codigo": "5", "descricao": "Nacional com conteúdo de importação ≤ 40%"},
    {"codigo": "6", "descricao": "Estrangeira — importação direta, sem similar nacional (CAMEX)"},
    {"codigo": "7", "descricao": "Estrangeira — mercado interno, sem similar nacional (CAMEX)"},
    {"codigo": "8", "descricao": "Nacional com conteúdo de importação > 70%"},
]

# Mapeamento tipo de produto do ERP → sugestão fiscal (estudo seções CFOP).
# Entrada padrão interestadual (maioria dos fornecedores da RLP fora de MG).
SUGESTAO_POR_TIPO_PRODUTO: dict[str, dict] = {
    "INSUMO": {
        "tipo_item_sped": "01",
        "origem": "0",
        "csosn": "102",
        "cfop_entrada": "2101",
        "cfop_saida_dentro": None,
        "cfop_saida_fora": None,
        "mensagem": "Matéria-prima: CFOP entrada 1101 (MG) / 2101 (outra UF). Padrão sugerido 2101.",
    },
    "EMBALAGEM": {
        "tipo_item_sped": "02",
        "origem": "0",
        "csosn": "102",
        "cfop_entrada": "2101",
        "cfop_saida_dentro": None,
        "cfop_saida_fora": None,
        "mensagem": "Embalagem (tipo SPED 02): mesma lógica de entrada da MP (1101/2101).",
    },
    "ACABADO": {
        "tipo_item_sped": "04",
        "origem": "0",
        "csosn": "102",
        "cfop_entrada": None,
        "cfop_saida_dentro": "5101",
        "cfop_saida_fora": "6101",
        "mensagem": "Produção própria: saída 5101 (MG) / 6101 (outra UF). Avaliar 6107 se não contribuinte.",
    },
    "REVENDA": {
        "tipo_item_sped": "00",
        "origem": "0",
        "csosn": "102",
        "cfop_entrada": "2102",
        "cfop_saida_dentro": "5102",
        "cfop_saida_fora": "6102",
        "mensagem": "Revenda: entrada 1102/2102; saída 5102/6102 (6108 se não contribuinte).",
    },
    "SERVICO": {
        "tipo_item_sped": "09",
        "origem": "0",
        "csosn": "102",
        "cfop_entrada": None,
        "cfop_saida_dentro": None,
        "cfop_saida_fora": None,
        "mensagem": "Serviço: confirmar com contador NF-e vs NFS-e antes de emitir.",
    },
}

_CFOP_IDX = {c["codigo"]: c for c in CFOP_CATALOGO}


def search_cfop(query: str = "", tipo: str | None = None) -> list[dict]:
    q = (query or "").strip().lower()
    tipo_n = (tipo or "").strip().upper() or None
    out: list[dict] = []
    for item in CFOP_CATALOGO:
        if tipo_n and item["tipo"] != tipo_n:
            continue
        blob = f"{item['codigo']} {item['descricao']}".lower()
        if q and q not in blob and digits_only(q) not in item["codigo"]:
            continue
        out.append(item)
    return out


def lookup_cfop(codigo: str) -> dict:
    codigo = digits_only(codigo)
    if len(codigo) != 4:
        raise HTTPException(400, "CFOP deve ter 4 dígitos.")
    item = _CFOP_IDX.get(codigo)
    if not item:
        raise HTTPException(
            404,
            "CFOP não está no catálogo local do ERP. Preencha manualmente ou amplie a tabela.",
        )
    return item


def sugerir_fiscal_por_tipo(tipo_produto: str) -> dict:
    tipo = (tipo_produto or "").strip().upper()
    base = SUGESTAO_POR_TIPO_PRODUTO.get(tipo)
    if not base:
        raise HTTPException(400, f"Tipo de produto desconhecido: {tipo_produto}")

    def enrich(codigo: str | None) -> dict | None:
        if not codigo:
            return None
        info = _CFOP_IDX.get(codigo, {"codigo": codigo, "descricao": None, "tipo": None})
        return info

    return {
        "tipo_produto": tipo,
        "tipo_item_sped": base["tipo_item_sped"],
        "origem": base["origem"],
        "csosn": base["csosn"],
        "cfop_entrada": enrich(base["cfop_entrada"]),
        "cfop_saida_dentro": enrich(base["cfop_saida_dentro"]),
        "cfop_saida_fora": enrich(base["cfop_saida_fora"]),
        "mensagem": base["mensagem"],
        "origens": ORIGENS_MERCADORIA,
        "tipos_item_sped": TIPO_ITEM_SPED,
        "fonte": "CADASTRO_PRODUTOS_COMPRA/VENDA (estudo RLP)",
    }
