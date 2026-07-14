"""Testes de normalizers."""

from app.compras.normalizers import (
    fmt_valor_br,
    normalizar_id_compra,
    normalizar_ni,
    parse_decimal,
    tipo_item_catalogo,
)


def test_normalizar_ni_cnpj():
    assert normalizar_ni("12.345.678/0001-99") == "12345678000199"


def test_normalizar_ni_cpf():
    assert normalizar_ni("123.456.789-09") == "12345678909"


def test_normalizar_id_compra_int():
    assert normalizar_id_compra(12345) == "12345"


def test_parse_decimal_br():
    assert parse_decimal("R$ 1.234,56") == parse_decimal(1234.56)


def test_fmt_valor_br():
    assert fmt_valor_br(1500.5) == "R$ 1.500,50"


def test_tipo_item_catalogo():
    assert tipo_item_catalogo("S") == "Servico"
    assert tipo_item_catalogo("M") == "Material"
