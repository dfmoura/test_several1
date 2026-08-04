"""Normalização canônica de porte de empresa."""

from app.compras.porte import (
    brutos_equivalentes,
    catalogar_portes,
    chave_porte,
    porte_equivale,
    rotulo_porte,
)


def test_chave_unifica_grafias_tipograficas():
    assert chave_porte("MICRO EMPRESA") == "MICROEMPRESA"
    assert chave_porte("MICROEMPRESA") == "MICROEMPRESA"
    assert chave_porte("Microempresa") == "MICROEMPRESA"
    assert chave_porte("ME") == "MICROEMPRESA"

    assert chave_porte("EMPRESA DE PEQUENO PORTE") == "EMPRESADEPEQUENOPORTE"
    assert chave_porte("Empresa de Pequeno Porte") == "EMPRESADEPEQUENOPORTE"
    assert chave_porte("EPP") == "EMPRESADEPEQUENOPORTE"

    assert chave_porte("DEMAIS") == "DEMAIS"
    assert chave_porte("Demais") == "DEMAIS"


def test_chave_futura_agrupa_por_compactacao():
    # Valor ainda não mapeado: mesma chave se só muda caixa/espaço/hífen
    assert chave_porte("Grande Porte") == chave_porte("GRANDE-PORTE")
    assert chave_porte("Grande Porte") == "GRANDEPORTE"


def test_rotulo_canonico():
    assert rotulo_porte("MICRO EMPRESA") == "Microempresa"
    assert rotulo_porte("EMPRESA DE PEQUENO PORTE") == "Empresa de Pequeno Porte"
    assert rotulo_porte("Demais") == "Demais"


def test_catalogar_deduplica():
    cat = catalogar_portes(
        [
            "MICRO EMPRESA",
            "MICROEMPRESA",
            "ME",
            "EMPRESA DE PEQUENO PORTE",
            "Empresa de Pequeno Porte",
            "DEMAIS",
            "Demais",
            None,
            "",
        ]
    )
    ids = [c["id"] for c in cat]
    nomes = [c["nome"] for c in cat]
    assert ids == sorted(ids, key=lambda i: next(c["nome"] for c in cat if c["id"] == i).casefold())
    assert set(ids) == {"MICROEMPRESA", "EMPRESADEPEQUENOPORTE", "DEMAIS"}
    assert "Microempresa" in nomes
    assert "Empresa de Pequeno Porte" in nomes
    assert "Demais" in nomes
    assert len(cat) == 3


def test_porte_equivale_filtro():
    assert porte_equivale("MICRO EMPRESA", "MICROEMPRESA")
    assert porte_equivale("MICROEMPRESA", "ME")
    assert porte_equivale("Empresa de Pequeno Porte", "EPP")
    assert porte_equivale(None, "_vazio_")
    assert not porte_equivale("DEMAIS", "_vazio_")
    assert not porte_equivale("MICRO EMPRESA", "DEMAIS")


def test_brutos_equivalentes():
    conhecidos = ["MICRO EMPRESA", "MICROEMPRESA", "DEMAIS", "Demais"]
    assert set(brutos_equivalentes("ME", conhecidos)) == {"MICRO EMPRESA", "MICROEMPRESA"}
    assert set(brutos_equivalentes("Demais", conhecidos)) == {"DEMAIS", "Demais"}
