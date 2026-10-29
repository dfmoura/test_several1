"""Parser e import idempotente das filiais OSB."""

from __future__ import annotations

from sqlalchemy import func, select

from app.database import Unidade
from app.org.import_unidades_osb import (
    gerar_codigo,
    importar_unidades_osb,
    parse_unidades_osb,
)
from app.org.service import criar_organizacao, criar_unidade


_AMOSTRA = """
# cabeçalho
## MINAS GERAIS (MG) — 2 unidades
UBERLÂNDIA – MG | Presidente: Marco Aurelio Freitas Santos | CNPJ: 23.497.346/0001-42
ITABIRA – MG | Presidente: Jenisse Maria Guimarães Lanza | CNPJ: 29.767.697/0001-02
## PARANÁ (PR) — 1 unidade
CAMPOS GERAIS – PR | Presidente: Murilo Coelho | CNPJ: 11.822.041/0001-80
"""


def test_parse_unidades_osb_basico():
    itens = parse_unidades_osb(_AMOSTRA)
    assert len(itens) == 3
    assert itens[0].cnpj == "23497346000142"
    assert itens[0].uf == "MG"
    assert "UBERLÂNDIA" in itens[0].nome
    assert itens[2].municipio_chave == "CAMPOS GERAIS"


def test_gerar_codigo_override_udi():
    usados: set[str] = set()
    assert gerar_codigo("UBERLÂNDIA", "MG", "23497346000142", usados) == "OSBUDI"


def test_import_idempotente_por_cnpj(client, db):
    # client garante DB de teste inicializado
    _ = client
    org = criar_organizacao(db, nome="Observatório Social Brasil", codigo="OSB")
    criar_unidade(
        db,
        organizacao_id=org.id,
        tipo="matriz",
        nome="Observatório Social Brasil",
        codigo="OSB",
        cnpj="10498528000196",
    )
    # Filial já existente (mesmo CNPJ Uberlândia)
    criar_unidade(
        db,
        organizacao_id=org.id,
        tipo="filial",
        nome="OSB Uberlândia/MG",
        codigo="OSBUDI",
        cnpj="23497346000142",
    )

    fontes = parse_unidades_osb(_AMOSTRA)
    r1 = importar_unidades_osb(
        db, fontes=fontes, vincular_municipios=False, dry_run=False
    )
    assert r1.criadas == 2  # Itabira + Campos Gerais
    assert r1.atualizadas + r1.inalteradas == 1  # Uberlândia

    r2 = importar_unidades_osb(
        db, fontes=fontes, vincular_municipios=False, dry_run=False
    )
    assert r2.criadas == 0
    assert r2.atualizadas == 0
    assert r2.inalteradas == 3

    n_filiais = db.scalar(
        select(func.count())
        .select_from(Unidade)
        .where(Unidade.organizacao_id == org.id, Unidade.tipo == "filial")
    )
    assert n_filiais == 3
