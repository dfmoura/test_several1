"""Motor de cálculo R1–R20 — puro, sem I/O."""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Any

from .catalog import Catalogo, apply_overrides, load_catalog
from .matrix_key import chave_matriz


def excel_ceiling(number: float, significance: float) -> float:
    if significance == 0:
        return number
    return math.ceil(number / significance - 1e-12) * significance


def _cores_key(cores: Any) -> str:
    if isinstance(cores, str):
        return cores.strip().upper()
    if isinstance(cores, float) and cores == int(cores):
        return str(int(cores))
    return str(cores).strip()


@dataclass
class FaixaEntrada:
    quantidade: int
    comissao_pct: float = 0.0


@dataclass
class OrcamentoEntrada:
    cliente: str
    medida: str
    largura_cm: float
    puxada_cm: float
    cores: Any
    papel: str
    acabamento: str
    modelos: int
    colunas: int
    etiq_por_rolo: int
    tubete: str
    z: float | None
    maquina: str
    maquina_roda_servico: str | None = None
    imposto_pct: float = 16.0
    matriz: str = "SIM"  # SIM | NAO
    coluna_rebobinacao: int = 1
    tipo_troca_produto: str = "SEM PARADA"
    rpm: float = 1000.0
    faixas: list[FaixaEntrada] = field(default_factory=list)
    overrides: dict[str, Any] | None = None
    matriz_ja_cobrada: bool = False  # D8 — já cobrada em pedido anterior


@dataclass
class BreakdownFaixa:
    quantidade: int
    metragem: float
    m2: float
    hora_maq: float
    hora_troca_prod: float
    hora_troca_bobina: float
    perda_acerto: float
    perda_acabamento: float
    perda_papel_troca_produto: float
    perda_bobina_m2: float
    rolos: float
    qtde_caixas: int
    rolos_por_caixa: int
    caixa_medida: str | None
    valor_papel: float
    valor_maquina: float
    valor_troca_produto: float
    valor_troca_bobina: float
    valor_papel_troca_produto: float
    valor_tinta: float
    valor_acabamento: float
    valor_rebobinacao: float
    valor_tubete: float
    valor_caixa: float
    valor_servico: float
    comissao: float
    imposto: float
    base: float
    valor_etiqueta: float
    valor_matriz: float
    valor_total: float


@dataclass
class OrcamentoResultado:
    chave_matriz: str
    cobra_matriz: bool
    valor_matriz: float
    faixas: list[BreakdownFaixa]
    catalog_snapshot: dict[str, Any] = field(default_factory=dict)


def perda_acerto_m2(cores: Any, largura_cm: float, cat: Catalogo) -> float:
    """R6."""
    k = _cores_key(cores)
    if k in ("0", "1", "2", "3"):
        return float(cat.perda_papel_0_3[k])
    if k == "4":
        return (largura_cm + 1) / 100.0 * cat.perda_papel_f6
    if k in ("4V", "5"):
        return (largura_cm / 100.0) * 250.0
    if k == "6":
        return (largura_cm / 100.0) * 260.0
    if k == "7":
        return (largura_cm / 100.0) * 270.0
    if k == "8":
        return (largura_cm / 100.0) * 280.0
    raise KeyError(f"Cores não suportadas: {cores!r}")


def perda_papel_troca_produto_m2(cores: Any, largura_cm: float, modelos: int, cat: Catalogo) -> float:
    """
    Perda de papel por acerto de produto (aba PERDA DE PAPEL ACERTO).
    Excel K13 (planilha 260728): VLOOKUP(cores, col E) * modelos
    col E = metros_lineares * (largura/100); cores 0 → 0.
    """
    metros = cat.perda_papel_acerto_metros(cores)
    if metros <= 0 or modelos <= 0:
        return 0.0
    return metros * (float(largura_cm) / 100.0) * int(modelos)


def calcular_matriz(z: float | None, largura_cm: float, colunas: int, cores: Any, cat: Catalogo) -> float:
    """R20."""
    if z is None or float(z) < 1:
        return 0.0
    try:
        ncores = float(str(cores).upper().replace("V", "")) if str(cores).upper() != "4V" else 4.0
        # 4V ainda multiplica por 4 cores na prática da fórmula Excel (C3=E8); E8 pode ser "4V"
        # Na planilha: C3 = ORÇAMENTO!$E$8 — se for texto "4V", Excel pode tratar como 0 em produto.
        # Nos casos reais 4V não aparece; cores numéricas sim.
        if isinstance(cores, str) and cores.upper() == "4V":
            ncores = 4.0  # manter 4V como 4 cores na matriz [Alta]
        else:
            ncores = float(cores)
    except (TypeError, ValueError):
        ncores = 0.0
    largura_matriz = largura_cm * colunas
    return ((((float(z) * 3.175) / 10) + 4) * (largura_matriz + 4) * ncores) * cat.matriz_cm2


def calcular_faixa(
    q: int,
    comissao_pct: float,
    inp: OrcamentoEntrada,
    cat: Catalogo,
    valor_matriz_faixa: float,
) -> BreakdownFaixa:
    puxada = float(inp.puxada_cm)
    largura = float(inp.largura_cm)
    colunas = int(inp.colunas)
    modelos = int(inp.modelos)
    etiq = int(inp.etiq_por_rolo)
    rpm = float(inp.rpm)
    col_reb = int(inp.coluna_rebobinacao) or 1
    limite = cat.limite_metragem_bobina

    # R1
    metragem = (puxada / 100.0) * q / colunas
    # R2
    m2 = excel_ceiling((q * largura * puxada) / 10000.0, 0.1)
    # R3
    hora_maq = (metragem / rpm) + cat.setup_horas
    # R4 — hora troca bobina (só se metragem >= 1000)
    if metragem < limite:
        hora_troca_bobina = 0.0
        tem_troca_bobina = False
    else:
        hora_troca_bobina = (((metragem / 1000.0) - 1) * 5) / 60.0
        tem_troca_bobina = True
    # R5 — HORA TROCA PRODUTO (automático, igual Excel E13:E16)
    # = VLOOKUP(tipo, HORA PARADA col B) * (modelos - 1)
    # Independente de metragem / troca de bobina. Evidência BRAHVA:
    # q=7000 metragem<1000 → Excel E13=1.5 e valor=315.
    hora_troca_prod = cat.hora_parada(inp.tipo_troca_produto) * (modelos - 1)
    # R6–R8 + perda papel troca produto (aba PERDA DE PAPEL ACERTO × modelos)
    # R7 perda_acabamento permanece VLOOKUP(acabamento) — não misturar com a aba nova.
    perda_acerto = perda_acerto_m2(inp.cores, largura, cat)
    perda_acab = cat.perda_acab(inp.acabamento)
    perda_papel_troca = perda_papel_troca_produto_m2(inp.cores, largura, modelos, cat)
    if metragem <= limite:
        perda_bobina_m2 = 0.0
    else:
        perda_bobina_m2 = (5 * (largura - 0.75) * colunas / 100.0) * (metragem / 1000.0)
    # R9 — rolos e caixas (MEDIDA_CAIXAS: CEILING(rolos / capacidade))
    rolos = q / etiq
    rolos_por_caixa = cat.rolos_por_caixa(inp.tubete)
    caixa_medida = cat.medida_caixa_preferida(inp.tubete)
    qtde_caixas = cat.qtde_caixas(inp.tubete, rolos)

    taxa = cat.taxa_hora_maquina(inp.maquina, inp.cores)
    # R10–R16
    preco_papel = cat.preco_papel(inp.papel)
    valor_papel = (m2 + perda_acerto + perda_bobina_m2) * preco_papel
    valor_maquina = taxa * hora_maq
    valor_troca_produto = taxa * hora_troca_prod
    valor_troca_bobina = taxa * hora_troca_bobina if tem_troca_bobina else 0.0
    # VALOR PAPEL TROCA PRODUTO — perda da aba nova × preço papel
    # (na planilha G21 está com fórmula copiada de troca bobina; motor usa a regra correta)
    valor_papel_troca_produto = perda_papel_troca * preco_papel

    area_tinta = m2 + perda_acerto
    if area_tinta <= cat.tinta_faixa_m2:
        # cores * 10 — 4V?
        ck = _cores_key(inp.cores)
        ncores = 4 if ck == "4V" else float(inp.cores)
        valor_tinta = ncores * cat.tinta_ate_30_por_cor
    else:
        valor_tinta = area_tinta * cat.tinta_acima_m2

    valor_acabamento = cat.preco_acabamento(inp.acabamento) * (m2 + perda_acerto + perda_acab)
    valor_rebob = ((metragem * colunas) / col_reb / 1000.0) * cat.preco_rebobinacao()
    valor_tubete = (q / etiq) * cat.preco_tubete(inp.tubete)
    valor_caixa = qtde_caixas * cat.preco_caixa

    valor_servico = (
        valor_papel
        + valor_maquina
        + valor_troca_produto
        + valor_troca_bobina
        + valor_papel_troca_produto
        + valor_tinta
        + valor_acabamento
        + valor_rebob
        + valor_tubete
        + valor_caixa
    )
    comissao = valor_servico * comissao_pct / 100.0
    imposto = valor_servico * float(inp.imposto_pct) / 100.0
    base = valor_servico + comissao + imposto
    valor_etiqueta = excel_ceiling(base, cat.ceiling_etiqueta)
    vm = float(valor_matriz_faixa)
    return BreakdownFaixa(
        quantidade=q,
        metragem=metragem,
        m2=m2,
        hora_maq=hora_maq,
        hora_troca_prod=hora_troca_prod,
        hora_troca_bobina=hora_troca_bobina,
        perda_acerto=perda_acerto,
        perda_acabamento=perda_acab,
        perda_papel_troca_produto=perda_papel_troca,
        perda_bobina_m2=perda_bobina_m2,
        rolos=rolos,
        qtde_caixas=qtde_caixas,
        rolos_por_caixa=rolos_por_caixa,
        caixa_medida=caixa_medida,
        valor_papel=valor_papel,
        valor_maquina=valor_maquina,
        valor_troca_produto=valor_troca_produto,
        valor_troca_bobina=valor_troca_bobina,
        valor_papel_troca_produto=valor_papel_troca_produto,
        valor_tinta=valor_tinta,
        valor_acabamento=valor_acabamento,
        valor_rebobinacao=valor_rebob,
        valor_tubete=valor_tubete,
        valor_caixa=valor_caixa,
        valor_servico=valor_servico,
        comissao=comissao,
        imposto=imposto,
        base=base,
        valor_etiqueta=valor_etiqueta,
        valor_matriz=vm,
        valor_total=valor_etiqueta + vm,
    )


def calcular_orcamento(
    inp: OrcamentoEntrada,
    catalog: Catalogo | None = None,
) -> OrcamentoResultado:
    base_cat = catalog or load_catalog()
    cat = apply_overrides(base_cat, inp.overrides)

    ck = chave_matriz(
        inp.cliente, inp.medida, inp.z, inp.cores, inp.largura_cm, inp.colunas
    )
    quer_matriz = str(inp.matriz).strip().upper() in ("SIM", "S", "YES", "TRUE", "1")
    cobra = quer_matriz and not inp.matriz_ja_cobrada
    matriz_raw = calcular_matriz(inp.z, inp.largura_cm, inp.colunas, inp.cores, cat) if quer_matriz else 0.0
    valor_matriz = excel_ceiling(matriz_raw, 1) if cobra else 0.0

    # Excel I28:I32: o mesmo valor da matriz entra em TODAS as faixas de qtde
    # (cada linha é alternativa; o cliente escolhe uma). Cobrança entre pedidos
    # (matriz_ja_cobrada) zera em todas. No CONSOLIDADO o valor aparece 1× aparte.
    resultados: list[BreakdownFaixa] = []
    for faixa in inp.faixas:
        resultados.append(
            calcular_faixa(
                faixa.quantidade, faixa.comissao_pct, inp, cat, valor_matriz
            )
        )

    snapshot = {
        "papel": dict(cat.papel),
        "tinta_acima_m2": cat.tinta_acima_m2,
        "preco_caixa": cat.preco_caixa,
        "matriz_cm2": cat.matriz_cm2,
        "acabamentos": dict(cat.acabamentos),
    }
    return OrcamentoResultado(
        chave_matriz=ck,
        cobra_matriz=cobra,
        valor_matriz=valor_matriz,
        faixas=resultados,
        catalog_snapshot=snapshot,
    )


def resultado_to_dict(res: OrcamentoResultado) -> dict[str, Any]:
    return {
        "chave_matriz": res.chave_matriz,
        "cobra_matriz": res.cobra_matriz,
        "valor_matriz": res.valor_matriz,
        "faixas": [asdict(f) for f in res.faixas],
        "catalog_snapshot": res.catalog_snapshot,
    }
