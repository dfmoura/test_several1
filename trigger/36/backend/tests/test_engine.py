import json
from pathlib import Path

import pytest

from app.engine.calculator import FaixaEntrada, OrcamentoEntrada, calcular_orcamento
from app.engine.catalog import load_catalog, apply_overrides

FIX = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))


def _entrada(data: dict, matriz_ja_cobrada: bool = False) -> OrcamentoEntrada:
    overrides = {
        "papel": {data["papel"]: data["papel_preco_arquivo"]},
        "tinta_acima_m2": data["tinta_c3"],
    }
    return OrcamentoEntrada(
        cliente=data["cliente"],
        medida=data["medida"],
        largura_cm=data["largura_cm"],
        puxada_cm=data["puxada_cm"],
        cores=data["cores"],
        papel=data["papel"],
        acabamento=data["acabamento"],
        modelos=data["modelos"],
        colunas=data["colunas"],
        etiq_por_rolo=data["etiq_por_rolo"],
        tubete=data["tubete"],
        z=data["z"],
        maquina=data["maquina"],
        maquina_roda_servico=data.get("maquina_roda_servico"),
        imposto_pct=data["imposto_pct"],
        matriz=data["matriz"],
        coluna_rebobinacao=data["coluna_rebobinacao"],
        tipo_troca_produto=data["tipo_troca_produto"],
        rpm=data["rpm"],
        faixas=[
            FaixaEntrada(quantidade=f["quantidade"], comissao_pct=f["comissao_pct"])
            for f in data["faixas"]
        ],
        overrides=overrides,
        matriz_ja_cobrada=matriz_ja_cobrada,
    )


def test_catalog_loads():
    cat = load_catalog()
    assert cat.preco_caixa == 7
    assert 'BOPP BRILHO' in cat.papel or any("BOPP BRILHO" in k for k in cat.papel)
    assert cat.maquinas == [
        "BETA",
        "160",
        "250",
        "ETIRAMA",
        "BATIDA",
        "MODULAR",
    ]
    assert cat.maquinas_roda_servico == cat.maquinas
    # HORA MÁQUINA detalhada: cada máquina com tabela própria
    for m in cat.maquinas:
        assert m in cat.hora_maquina
    # Excel agrupa BETA/160/250/ETIRAMA — no sistema as taxas do grupo são iguais
    assert cat.hora_maquina["BETA"] == cat.hora_maquina["160"]
    assert cat.hora_maquina["BETA"] == cat.hora_maquina["250"]
    assert cat.hora_maquina["BETA"] == cat.hora_maquina["ETIRAMA"]
    assert cat.taxa_hora_maquina("MODULAR", 5) == 210.0
    assert cat.taxa_hora_maquina("BETA / 160  / 250 / ETIRAMA", 5) == 190.0  # alias legado
    assert cat.normalizar_maquina("BETAFLEX") == "BETA"
    assert cat.normalizar_maquina("REFLEXO") == "160"
    assert cat.normalizar_maquina("REFLEXO 250") == "250"
    assert cat.normalizar_maquina("MODULAR SPX") == "MODULAR"


def test_maquina_roda_servico_independente_do_custo():
    """F10 ≠ G10: rarepan roda MODULAR com custo BETA; art roda 250 com custo BETA."""
    rare = _load("rarepan")
    assert rare["maquina_roda_servico"] == "MODULAR"
    assert rare["maquina"] == "BETA"
    art = _load("art")
    assert str(art["maquina_roda_servico"]) == "250"
    assert art["maquina"] == "BETA"
    # motor aceita e não usa F10 no preço
    res = calcular_orcamento(_entrada(rare))
    assert res.faixas[0].valor_etiqueta > 0


def test_mapa_facas_maquinas_padronizadas():
    """MAPA DE FACAS 20260715 ATUAL → códigos canônicos (sem BETAFLEX/REFLEXO…)."""
    import json
    from pathlib import Path

    facas = json.loads(
        (Path(__file__).resolve().parents[1] / "app" / "data" / "mapa_facas.json").read_text(
            encoding="utf-8"
        )
    )
    assert len(facas) >= 400
    permitidas = {"BETA", "160", "250", "ETIRAMA", "BATIDA", "MODULAR"}
    assert {f["maquina_catalogo"] for f in facas} <= permitidas
    # origem preservada para auditoria
    origens = {f.get("maquina_origem") for f in facas}
    assert "BETAFLEX" in origens
    assert "REFLEXO" in origens
    assert "REFLEXO 250" in origens
    assert "MODULAR SPX" in origens
    # BRAHVA ainda localizável
    brahva = [f for f in facas if f.get("medida") == "8,0X12,4" and f.get("cliente_nota") == "BRAHVA"]
    assert brahva and brahva[0]["maquina_catalogo"] == "MODULAR"


def test_mapa_facas_redonda_e_diametro():
    """REDONDA: TAMANHO = diâmetro (Ø); puxada é a de máquina (com folga)."""
    import json
    from pathlib import Path

    facas = json.loads(
        (Path(__file__).resolve().parents[1] / "app" / "data" / "mapa_facas.json").read_text(
            encoding="utf-8"
        )
    )
    redondas = [f for f in facas if (f.get("formato") or "").upper().startswith("REDOND")]
    assert len(redondas) >= 30
    assert all(f.get("tamanho_tipo") == "diametro" for f in redondas)
    assert all((f.get("medida") or "").startswith("Ø") for f in redondas)
    # Ex.: Ø 0,9 com puxada 1,2 (não é LARGURA×PUXADA)
    amostra = next(f for f in redondas if abs((f.get("diametro_cm") or 0) - 0.9) < 1e-6)
    assert amostra["puxada"] == pytest.approx(1.2)
    assert amostra["medida"] == "Ø 0,9"


def test_mapa_facas_incompletas_analogicas():
    """Planilha oficial tem LACRE/SERRILHA sem puxada — listadas como incompletas."""
    import json
    from pathlib import Path

    facas = json.loads(
        (Path(__file__).resolve().parents[1] / "app" / "data" / "mapa_facas.json").read_text(
            encoding="utf-8"
        )
    )
    incompletas = [f for f in facas if not f.get("completa", True)]
    assert len(incompletas) >= 1
    lacre = [f for f in incompletas if f.get("medida") == "9,5X3,5"]
    assert lacre, "Pivot de exemplo 9,5X3,5 LACRE deve existir (puxada manual)"
    assert all(f.get("puxada") is None for f in lacre)


def test_caixas_catalogo_completo_excel():
    """CAIXAS gerado a partir de MEDIDA_CAIXAS (capacidade por tubete)."""
    cat = load_catalog()
    assert len(cat.caixas) >= 1500
    assert cat.qtde_caixas('3"', 1) == 1
    assert cat.qtde_caixas('3"', 12) == 1
    assert cat.qtde_caixas('3"', 13) == 2
    assert cat.qtde_caixas('1"', 20) == 1
    assert cat.qtde_caixas('1"', 21) == 2
    # volumes grandes: fórmula estável (não depende da tabela manual corrompida)
    assert cat.qtde_caixas('3"', 384) == 32
    assert cat.qtde_caixas('1"', 1182) == 60


def test_medida_caixas_empacotamento():
    """MEDIDA_CAIXAS define medida preferida e rolos/caixa por tubete."""
    cat = load_catalog()
    assert len(cat.medida_caixas) >= 9
    assert cat.rolos_por_caixa('3"') == 12
    assert cat.rolos_por_caixa('1"') == 20
    assert cat.rolos_por_caixa('1" 1/2') == 20  # mapeia para 1"
    assert cat.medida_caixa_preferida('3"') == "500x300x300"
    assert cat.medida_caixa_preferida('1"') == "250x200x200"



@pytest.mark.parametrize("name", ["oficial", "art", "rarepan", "brahva"])
def test_regressao_excel_fidelidade(name):
    """Casos batem no Excel (quando cache válido)."""
    data = _load(name)
    res = calcular_orcamento(_entrada(data))
    assert len(res.faixas) == len(data["faixas"])
    for got, exp in zip(res.faixas, data["faixas"]):
        excel = exp["excel"]
        if excel.get("etiqueta") is None:
            continue
        # ART q=4000: cache Excel de L24 sem tinta, mas fórmula G24 exige tinta (m2+perda>30).
        if name == "art" and exp["quantidade"] == 4000:
            assert got.valor_tinta > 0
            assert got.valor_etiqueta == pytest.approx(330, abs=1)
            continue
        assert got.valor_etiqueta == pytest.approx(excel["etiqueta"], abs=1), (
            f"{name} q={exp['quantidade']}: etiqueta {got.valor_etiqueta} != {excel['etiqueta']}"
        )
    if data["faixas"] and data["faixas"][0]["excel"].get("matriz") is not None:
        assert res.valor_matriz == pytest.approx(data["faixas"][0]["excel"]["matriz"], abs=1)
        # Excel I28:I32 — mesma matriz em todas as faixas com qtde
        for got, exp in zip(res.faixas, data["faixas"]):
            excel = exp["excel"]
            if excel.get("matriz") is None or excel.get("etiqueta") is None:
                continue
            # ART q=4000: cache Excel de total/etiqueta desatualizado (ver bloco acima)
            if name == "art" and exp["quantidade"] == 4000:
                continue
            assert got.valor_matriz == pytest.approx(excel["matriz"], abs=1), (
                f"{name} q={exp['quantidade']}: matriz {got.valor_matriz} != {excel['matriz']}"
            )
            if excel.get("total") is not None:
                assert got.valor_total == pytest.approx(excel["total"], abs=1), (
                    f"{name} q={exp['quantidade']}: total {got.valor_total} != {excel['total']}"
                )


def test_hora_troca_produto_automatica_brahva():
    """
    Excel E13 = VLOOKUP(PRETO INTEIRO)×(modelos-1) = 0,25×6 = 1,5
    mesmo com metragem < 1000 (sem troca de bobina).
    Inclui R10b: perda papel troca = 200*(9/100)*7 = 126 → ×8,0 = 1008.
    """
    data = _load("brahva")
    res = calcular_orcamento(_entrada(data))
    f0 = res.faixas[0]
    assert f0.metragem < 1000
    assert f0.hora_troca_bobina == 0
    assert f0.hora_troca_prod == pytest.approx(1.5)
    assert f0.valor_troca_produto == pytest.approx(315, abs=0.01)
    assert f0.perda_papel_troca_produto == pytest.approx(126.0)
    assert f0.valor_papel_troca_produto == pytest.approx(1008.0, abs=0.01)
    assert f0.valor_etiqueta == pytest.approx(3090, abs=1)
    # demais faixas também 1,5 h
    assert res.faixas[1].hora_troca_prod == pytest.approx(1.5)
    assert res.faixas[2].hora_troca_prod == pytest.approx(1.5)
    assert res.faixas[1].valor_etiqueta == pytest.approx(3550, abs=1)
    assert res.faixas[2].valor_etiqueta == pytest.approx(4170, abs=1)
    assert res.valor_matriz == pytest.approx(536, abs=1)
    # matriz em todas as faixas (não só na 1ª)
    assert all(f.valor_matriz == pytest.approx(536, abs=1) for f in res.faixas)
    assert res.faixas[0].valor_total == pytest.approx(3626, abs=1)
    assert res.faixas[1].valor_total == pytest.approx(4086, abs=1)
    assert res.faixas[2].valor_total == pytest.approx(4706, abs=1)


def test_matriz_em_todas_as_faixas_oficial():
    """Excel I28:I32 — mesmo CEILING(N13,1) em cada faixa; J = H+I."""
    data = _load("oficial")
    res = calcular_orcamento(_entrada(data))
    assert res.valor_matriz == pytest.approx(94, abs=1)
    for got, exp in zip(res.faixas, data["faixas"]):
        assert got.valor_matriz == pytest.approx(94, abs=1)
        assert got.valor_total == pytest.approx(exp["excel"]["total"], abs=1)


def test_perda_acabamento_inalterada_r7():
    """R7: PERDA ACABAMENTO continua VLOOKUP(acabamento) — não usa aba PAPEL ACERTO."""
    data = _load("oficial")
    res = calcular_orcamento(_entrada(data))
    # COLD STAMP + COLA → 5 m² (catálogo PERDA DE ACABAMENTO)
    assert all(f.perda_acabamento == pytest.approx(5.0) for f in res.faixas)


def test_valor_papel_troca_produto_oficial_260728():
    """
    Caso da planilha ORcAMENTO_OFICIAL2607281626:
    cores=5, largura=10,5, modelos=3 → perda = 200*(10,5/100)*3 = 63
    papel COUCHE 3,5 → valor = 220,5
    PERDA ACABAMENTO (R7) SEM ACABAMENTO = 0
    """
    from app.engine.calculator import perda_papel_troca_produto_m2
    from app.engine.catalog import load_catalog

    cat = load_catalog()
    perda = perda_papel_troca_produto_m2(5, 10.5, 3, cat)
    assert perda == pytest.approx(63.0)
    assert cat.perda_acab("SEM ACABAMENTO") == 0.0

    inp = OrcamentoEntrada(
        cliente="TESTE 260728",
        medida="10,0X6,0",
        largura_cm=10.5,
        puxada_cm=6.35,
        cores=5,
        papel="COUCHE FASSON 20G",
        acabamento="SEM ACABAMENTO",
        modelos=3,
        colunas=1,
        etiq_por_rolo=1000,
        tubete='1"',
        z=60.0,
        maquina="MODULAR",
        imposto_pct=16.0,
        matriz="SIM",
        coluna_rebobinacao=1,
        tipo_troca_produto="OUTRA MONTAGEM",
        rpm=1000.0,
        faixas=[FaixaEntrada(quantidade=20000, comissao_pct=0.0)],
    )
    res = calcular_orcamento(inp)
    f = res.faixas[0]
    assert f.perda_acabamento == 0.0
    assert f.perda_papel_troca_produto == pytest.approx(63.0)
    assert f.valor_papel_troca_produto == pytest.approx(220.5, abs=0.01)
    assert f.hora_troca_prod == pytest.approx(50 / 60 * 2)  # OUTRA MONTAGEM × (3-1)
    assert f.valor_etiqueta == pytest.approx(1990, abs=1)


def test_r10_r12_r13_papel_tinta_acabamento_260728():
    """
    R10/R12/R13 — regras oficiais (layout BRAHVA), independentes da coluna J nova.
    Caso 260728 q=20000: m2=133,4; perda_acerto=26,25; bobina≈0,619; papel=3,5; tinta C3=0,4.
    Acabamento SEM → 0; com VERNIZ → 0,3×(m2+acerto+0).
    """
    base = dict(
        cliente="TESTE 260728",
        medida="10,0X6,0",
        largura_cm=10.5,
        puxada_cm=6.35,
        cores=5,
        papel="COUCHE FASSON 20G",
        modelos=3,
        colunas=1,
        etiq_por_rolo=1000,
        tubete='1"',
        z=60.0,
        maquina="MODULAR",
        imposto_pct=16.0,
        matriz="SIM",
        coluna_rebobinacao=1,
        tipo_troca_produto="OUTRA MONTAGEM",
        rpm=1000.0,
        faixas=[FaixaEntrada(quantidade=20000, comissao_pct=0.0)],
    )
    f = calcular_orcamento(
        OrcamentoEntrada(**base, acabamento="SEM ACABAMENTO")
    ).faixas[0]
    assert f.m2 == pytest.approx(133.4)
    assert f.perda_acerto == pytest.approx(26.25)
    assert f.perda_bobina_m2 == pytest.approx(0.619125)
    # R10: (m2 + acerto + bobina) × preço — NÃO inclui perda papel troca (R10b)
    assert f.valor_papel == pytest.approx(560.9419375, abs=0.01)
    # R12: (m2 + acerto) > 30 → × TINTA!C3
    assert f.valor_tinta == pytest.approx(63.86, abs=0.01)
    assert f.valor_acabamento == 0.0

    f_v = calcular_orcamento(
        OrcamentoEntrada(**base, acabamento="VERNIZ")
    ).faixas[0]
    # R13: preço × (m2 + acerto + perda_acab); VERNIZ perda=0
    assert f_v.valor_acabamento == pytest.approx(0.3 * (133.4 + 26.25 + 0), abs=0.01)
    # papel/tinta inalterados pelo acabamento
    assert f_v.valor_papel == pytest.approx(f.valor_papel, abs=0.01)
    assert f_v.valor_tinta == pytest.approx(f.valor_tinta, abs=0.01)


def test_r10_r12_r13_brahva_fidelidade_excel():
    """BRAHVA q=7000: papel 804, tinta 80,4, acabamento verniz 30,15 (cache Excel)."""
    data = _load("brahva")
    f = calcular_orcamento(_entrada(data)).faixas[0]
    assert f.valor_papel == pytest.approx(804.0, abs=0.01)
    assert f.valor_tinta == pytest.approx(80.4, abs=0.01)
    assert f.valor_acabamento == pytest.approx(30.15, abs=0.01)


def test_hora_troca_produto_sem_parada_zero():
    """SEM PARADA → tempo 0 → hora troca produto sempre 0 (oficial / rarepan)."""
    data = _load("oficial")
    res = calcular_orcamento(_entrada(data))
    assert all(f.hora_troca_prod == 0 for f in res.faixas)
    assert all(f.valor_troca_produto == 0 for f in res.faixas)


def test_matriz_nao_cobra_se_ja_cobrada():
    data = _load("oficial")
    res = calcular_orcamento(_entrada(data, matriz_ja_cobrada=True))
    assert res.cobra_matriz is False
    assert res.valor_matriz == 0
    assert all(f.valor_matriz == 0 for f in res.faixas)


def test_override_tinta():
    data = _load("brahva")
    inp = _entrada(data)
    inp.overrides = {"tinta_acima_m2": 0.4, "papel": {data["papel"]: 8.5}}
    res = calcular_orcamento(inp)
    # só garante que roda e snapshot guarda override
    assert res.catalog_snapshot["tinta_acima_m2"] == 0.4


def test_cores_4v_perda():
    from app.engine.calculator import perda_acerto_m2

    cat = load_catalog()
    assert perda_acerto_m2("4V", 10, cat) == pytest.approx(25.0)


def test_tubete_1_5_vira_1():
    cat = load_catalog()
    assert cat.preco_tubete('1" 1/2') == cat.preco_tubete('1"')
