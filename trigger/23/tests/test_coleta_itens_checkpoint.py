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
    _adiantar_apos_timeout,
    _partir_periodo,
    _posicionar_cursor,
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
        limpar_checkpoint_itens(
            db,
            escopo=escopo_itens(
                data_inicial=date(2024, 1, 1),
                data_final=date(2024, 12, 31),
                unidades=["926922"],
            ),
        )
        db.commit()
        assert carregar_checkpoint_itens(db) is not None
        limpar_checkpoint_itens(db, escopo=escopo)
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
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS", 1)
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


def test_adiantar_apos_timeout_nao_repete_pagina_5_da_dmae():
    """Checkpoint do incidente: página 5 já estourou. A próxima noite parte a janela."""
    janelas = [("926287", date(2025, 9, 28), date(2025, 12, 26))]
    cursor = CursorItens("926287", "2025-09-28", "2025-12-26", 5)
    novas, idx, tamanho = _adiantar_apos_timeout(
        janelas,
        0,
        cursor,
        "API PNCP itens: timeout após 5 tentativa(s)",
    )
    assert idx == 0
    assert tamanho == 100 or tamanho > 0
    assert novas[0] == ("926287", date(2025, 9, 28), date(2025, 11, 11))
    assert novas[1][0] == "926287"
    assert novas[1][1] == date(2025, 11, 12)
    intactas, _, tam_none = _adiantar_apos_timeout(janelas, 0, cursor, None)
    assert intactas == janelas
    assert tam_none is None


def test_coletar_itens_nao_repete_janela_que_ja_estourou(monkeypatch):
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"926287": "DMAE"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_PAGE_SIZE", 100)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    chamadas: list[tuple[date, date, int]] = []

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def reabrir(self):
            pass

        def consultar_pagina(self, *, data_inicial, data_final, pagina, **kwargs):
            chamadas.append((data_inicial, data_final, pagina))
            if (data_final - data_inicial).days + 1 > 50:
                raise AssertionError("janela original de 90 dias não deve ser repetida")
            return _payload_item(f"ITEM-{data_inicial.isoformat()}")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    itens = coletar_itens(
        data_inicial=date(2025, 9, 28),
        data_final=date(2025, 12, 26),
        unidades=["926287"],
        cursor_inicial=CursorItens("926287", "2025-09-28", "2025-12-26", 5),
        falha_anterior="Coleta de itens incompleta: timeout após 5 tentativa(s)",
    )
    assert chamadas
    assert all(pagina == 1 for _, _, pagina in chamadas)
    assert all((fim - ini).days + 1 <= 50 for ini, fim, _ in chamadas)
    assert len(itens) >= 1


def test_partir_periodo_dmae_noventa_dias():
    """Janela real do incidente: 2025-09-28–2025-12-26 (90 dias) parte ao meio."""
    partes = _partir_periodo(date(2025, 9, 28), date(2025, 12, 26))
    assert partes == (
        (date(2025, 9, 28), date(2025, 11, 11)),
        (date(2025, 11, 12), date(2025, 12, 26)),
    )
    assert _partir_periodo(date(2025, 11, 12), date(2025, 11, 12)) is None


def test_posicionar_cursor_retoma_subjanela_e_preserva_o_resto():
    janelas = [("926287", date(2025, 9, 28), date(2025, 12, 26))]
    cursor = CursorItens(
        unidade="926287",
        periodo_ini="2025-09-28",
        periodo_fim="2025-11-11",
        pagina=1,
        tamanho_pagina=50,
    )
    novas, idx, pagina, ignorado = _posicionar_cursor(janelas, cursor)
    assert ignorado is False
    assert (idx, pagina) == (0, 1)
    assert novas == [
        ("926287", date(2025, 9, 28), date(2025, 11, 11)),
        ("926287", date(2025, 11, 12), date(2025, 12, 26)),
    ]


def _payload_item(chave: str) -> dict:
    return {
        "totalPaginas": 1,
        "totalRegistros": 1,
        "resultado": [
            {
                "idCompraItem": chave,
                "idCompra": "C-1",
                "numeroItem": 1,
                "descricao": chave,
            }
        ],
    }


def test_coletar_itens_timeout_divide_janela_e_conclui(monkeypatch):
    """A mesma página não é repetida até falhar a cadeia: a janela pesada é partida."""
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"926287": "DMAE"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS", 3)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    chamadas: list[tuple[date, date]] = []

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def reabrir(self):
            pass

        def consultar_pagina(self, *, data_inicial, data_final, pagina, **kwargs):
            chamadas.append((data_inicial, data_final))
            if (data_final - data_inicial).days + 1 > 15:
                raise RuntimeError("API PNCP itens: timeout após 2 tentativa(s)")
            return _payload_item(f"ITEM-{data_inicial.isoformat()}-p{pagina}")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    itens = coletar_itens(
        data_inicial=date(2025, 9, 28),
        data_final=date(2025, 10, 17),
        unidades=["926287"],
    )
    assert chamadas[0] == (date(2025, 9, 28), date(2025, 10, 17))
    assert all((fim - ini).days + 1 <= 15 for ini, fim in chamadas[1:])
    assert len(itens) >= 1


def test_coletar_itens_terceira_falha_seguida_pausa_com_janela_menor(monkeypatch):
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"U1": "Unidade 1"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS", 2)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def reabrir(self):
            pass

        def consultar_pagina(self, **kwargs):
            raise RuntimeError("API PNCP itens: timeout após 2 tentativa(s)")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    with pytest.raises(ColetaItensInterrompida) as ei:
        coletar_itens(
            data_inicial=date(2025, 1, 1),
            data_final=date(2025, 1, 20),
            unidades=["U1"],
        )
    assert ei.value.cursor.periodo_ini == "2025-01-01"
    assert ei.value.cursor.periodo_fim == "2025-01-10"
    assert ei.value.cursor.pagina == 1


def test_coletar_itens_timeout_em_um_dia_reduz_pagina(monkeypatch):
    monkeypatch.setattr(
        "app.compras_pncp.obter_unidades_compradoras",
        lambda: {"U1": "Unidade 1"},
    )
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", 365)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_PAGE_SIZE", 100)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_PAGE_SIZE_MIN", 25)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS", 3)
    monkeypatch.setattr("app.compras_pncp.COMPRAS_PNCP_REQUEST_DELAY_SEC", 0)
    monkeypatch.setattr("app.compras_pncp.DELAY_SEC", 0)

    tamanhos: list[int] = []

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def close(self):
            pass

        def reabrir(self):
            pass

        def consultar_pagina(self, *, tamanho_pagina, **kwargs):
            tamanhos.append(tamanho_pagina)
            if tamanho_pagina > 25:
                raise RuntimeError("API PNCP itens: timeout após 2 tentativa(s)")
            return _payload_item("ITEM-DIA")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    itens = coletar_itens(
        data_inicial=date(2025, 6, 1),
        data_final=date(2025, 6, 1),
        unidades=["U1"],
    )
    assert tamanhos[0] == 100
    assert 25 in tamanhos
    assert [i.id_compra_item for i in itens] == ["ITEM-DIA"]


def test_http_429_nao_divide_janela(monkeypatch):
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
            raise RuntimeError("API PNCP itens HTTP 429: limite")

    monkeypatch.setattr("app.compras_pncp.PncpItensClient", FakeClient)

    with pytest.raises(ColetaItensInterrompida) as ei:
        coletar_itens(
            data_inicial=date(2025, 1, 1),
            data_final=date(2025, 3, 31),
            unidades=["U1"],
        )
    assert ei.value.cursor.periodo_ini == "2025-01-01"
    assert ei.value.cursor.periodo_fim == "2025-03-31"
