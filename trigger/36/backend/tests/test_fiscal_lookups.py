"""Testes locais (sem rede) das regras fiscais de produto."""

from app.services.external import lookup_cest_por_ncm, sugerir_ncm_por_largura
from app.services.fiscal_tables import lookup_cfop, search_cfop, sugerir_fiscal_por_tipo


def test_cest_3919_sugerir_vazio_rlp():
    r = lookup_cest_por_ncm("39199010")
    assert r["sugerir_vazio"] is True
    assert r["cest_recomendado"] is None
    assert len(r["candidatos"]) == 1
    assert r["candidatos"][0]["codigo"] == "1001000"
    assert r["candidatos"][0]["recomendado_rlp"] is False


def test_cest_papel_autoadesivo_sem_cest():
    r = lookup_cest_por_ncm("48114190")
    assert r["sugerir_vazio"] is True
    assert r["candidatos"] == []


def test_sugerir_ncm_largura_estreita_pp():
    r = sugerir_ncm_por_largura(180, material="BOPP")
    assert r["ncm"] == "39191010"
    assert r["faixa"] == "≤ 20 cm"


def test_sugerir_ncm_largura_larga_outros():
    r = sugerir_ncm_por_largura(330, material="OUTROS")
    assert r["ncm"] == "39199090"
    assert r["faixa"] == "> 20 cm"


def test_sugerir_fiscal_acabado():
    r = sugerir_fiscal_por_tipo("ACABADO")
    assert r["tipo_item_sped"] == "04"
    assert r["cfop_saida_dentro"]["codigo"] == "5101"
    assert r["cfop_saida_fora"]["codigo"] == "6101"


def test_sugerir_fiscal_insumo():
    r = sugerir_fiscal_por_tipo("INSUMO")
    assert r["tipo_item_sped"] == "01"
    assert r["cfop_entrada"]["codigo"] == "2101"


def test_cfop_lookup():
    assert lookup_cfop("5101")["tipo"] == "SAIDA"
    assert any(c["codigo"] == "2102" for c in search_cfop("comercialização"))
