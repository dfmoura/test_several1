"""Checkpoint/resume da coleta de itens PNCP e backoff de timeout."""

from __future__ import annotations

from datetime import date

import pytest

from app.compras.client import espera_retry_timeout
from app.compras.repository import (
    carregar_checkpoint_itens,
    escopo_itens,
    limpar_checkpoint_itens,
    salvar_checkpoint_itens,
)
from app.compras_pncp import (
    ColetaItensInterrompida,
    CursorItens,
    coletar_itens,
)
from app.database import SessionLocal, init_db


def test_espera_retry_timeout_cresce_com_teto(monkeypatch):
    monkeypatch.setattr("app.compras.client.COMPRAS_PNCP_TIMEOUT_BACKOFF_BASE_SEC", 8.0)
    monkeypatch.setattr("app.compras.client.COMPRAS_PNCP_TIMEOUT_BACKOFF_CAP_SEC", 90.0)
    monkeypatch.setattr("app.compras.client.random.uniform", lambda _a, _b: 0.0)
    assert espera_retry_timeout(tentativa=1) == 8.0
    assert espera_retry_timeout(tentativa=2) == 16.0
    assert espera_retry_timeout(tentativa=3) == 32.0
    assert espera_retry_timeout(tentativa=4) == 64.0
    assert espera_retry_timeout(tentativa=5) == 90.0


def test_cursor_itens_from_dict_valido_e_invalido():
    c = CursorItens.from_dict(
        {
            "unidade": "926922",
            "periodo_ini": "2025-01-01",
            "periodo_fim": "2025-03-31",
            "pagina": 8,
        }
    )
    assert c is not None
    assert c.pagina == 8
    assert CursorItens.from_dict(None) is None
    assert CursorItens.from_dict({"unidade": "x"}) is None


def test_checkpoint_itens_persistencia_escopo():
    init_db()
    db = SessionLocal()
    try:
        escopo = escopo_itens(
            data_inicial=date(2025, 1, 1),
            data_final=date(2025, 12, 31),
            unidades=["926922", "150182"],
        )
        salvar_checkpoint_itens(
            db,
            escopo=escopo,
            cursor={
                "unidade": "926922",
                "periodo_ini": "2025-01-01",
                "periodo_fim": "2025-03-31",
                "pagina": 8,
            },
            status="parcial",
            erro="timeout",
        )
        db.commit()
        ck = carregar_checkpoint_itens(db)
        assert ck is not None
        assert ck["status"] == "parcial"
        assert ck["escopo"] == escopo
        assert ck["cursor"]["pagina"] == 8
        limpar_checkpoint_itens(db)
        db.commit()
        assert carregar_checkpoint_itens(db) is None
    finally:
        db.close()


def test_coletar_itens_retoma_do_cursor_e_persiste_pagina(monkeypatch):
    """Páginas anteriores ao cursor são puladas; on_pagina recebe só o lote retomado."""
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"U1": "Unidade 1"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    payloads = {
        2: {
            "totalPaginas": 2,
            "totalRegistros": 2,
            "resultado": [
                {
                    "idCompraItem": "ITEM-2",
                    "idCompra": "C-1",
                    "numeroItem": 2,
                    "descricao": "item 2",
                }
            ],
        }
    }

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def consultar_pagina(self, *, pagina, **kwargs):
            assert pagina == 2  # não deve pedir página 1
            return payloads[pagina]

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    paginas: list[int] = []
    checkpoints: list[int] = []

    def on_pagina(info):
        paginas.append(info.pagina)

    def on_checkpoint(cursor):
        checkpoints.append(cursor.pagina)

    itens = coletar_itens(
        data_inicial=date(2025, 1, 1),
        data_final=date(2025, 12, 31),
        unidades=["U1"],
        cursor_inicial=CursorItens(
            unidade="U1",
            periodo_ini="2025-01-01",
            periodo_fim="2025-12-31",
            pagina=2,
        ),
        on_pagina=on_pagina,
        on_checkpoint=on_checkpoint,
    )
    assert paginas == [2]
    assert checkpoints == [2]
    assert [i.id_compra_item for i in itens] == ["ITEM-2"]


def test_coletar_itens_timeout_levanta_interrompida_com_cursor(monkeypatch):
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"U1": "Unidade 1"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def consultar_pagina(self, **kwargs):
            raise RuntimeError("API PNCP itens: timeout após 5 tentativa(s)")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    with pytest.raises(ColetaItensInterrompida) as ei:
        coletar_itens(
            data_inicial=date(2025, 1, 1),
            data_final=date(2025, 12, 31),
            unidades=["U1"],
        )
    assert ei.value.cursor.unidade == "U1"
    assert ei.value.cursor.pagina == 1
    assert ei.value.transiente is True
