"""Testes: análise de preço de mercado via IA (Propostas abertas)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.analise_preco import (
    extrair_json_resposta,
    montar_prompt,
    normalizar_comparativo_mercado,
)
from app.auth.service import criar_usuario
from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    PropostaAnalisePreco,
    SessionLocal,
    init_db,
)
from app.ia_client import ChatResultado
from app.ia_crypto import reset_fernet_cache
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "1")
    monkeypatch.setenv("IA_TOKEN_SECRET", "teste-segredo-ia-observatorio-local")
    monkeypatch.delenv("IA_FALLBACK_API_KEY", raising=False)
    reset_fernet_cache()
    init_db()
    with TestClient(app) as c:
        yield c
    reset_fernet_cache()


@pytest.fixture()
def client_auth(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "0")
    monkeypatch.setenv("IA_TOKEN_SECRET", "teste-segredo-ia-observatorio-local")
    monkeypatch.delenv("IA_FALLBACK_API_KEY", raising=False)
    reset_fernet_cache()
    init_db()
    with TestClient(app) as c:
        yield c
    reset_fernet_cache()


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _criar_item_aberto(
    *,
    descricao: str = "Cadeira escolar empilhável",
    ncm: str = "94018000",
    quantidade: str = "100",
    unitario: str = "85,00",
    total: str = "8.500,00",
) -> int:
    db = SessionLocal()
    try:
        enc = (datetime.now() + timedelta(days=5)).strftime("%d/%m/%Y %H:%M")
        sufixo = uuid.uuid4().hex[:10]
        id_compra = f"ia{sufixo}"
        # Marcadores deliberadamente artificiais (só no DB isolado dos testes).
        c = CompraContratacao(
            chave_compra=id_compra,
            id_compra=id_compra,
            numero="TEST-IA-90099",
            processo="PROC-TEST-IA/2026",
            ano=2026,
            unidade_compradora="926922",
            unidade_nome="TEST-ISOLADO",
            modalidade_codigo="6",
            modalidade_descricao="Pregão - Eletrônico",
            objeto="[TESTE] Aquisição de mobiliário escolar",
            data_encerramento_proposta_pncp=enc,
        )
        db.add(c)
        db.flush()
        item = CompraContratacaoItem(
            contratacao_id=c.id,
            id_compra=id_compra,
            id_compra_item=f"{id_compra}-1",
            numero_item_compra=1,
            numero_item_pncp=1,
            descricao_resumida=descricao,
            descricao_detalhada=descricao,
            quantidade=quantidade,
            unidade_medida="UN",
            valor_unitario_estimado=unitario,
            valor_total=total,
            dados_pncp_json=f'{{"codigoNCM": "{ncm}", "descricaoNCM": "Assentos"}}',
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item.id
    finally:
        db.close()


def test_montar_prompt_inclui_campos_chave():
    prompt = montar_prompt(
        {
            "descricao": "Caneta esferográfica azul",
            "ncm": "96081000",
            "qtd": "500 UN",
            "valor_unitario": "R$ 1,20",
            "total_estimado": "R$ 600,00",
        }
    )
    assert "Caneta esferográfica azul" in prompt
    assert "96081000" in prompt
    assert "500 UN" in prompt
    assert "R$ 1,20" in prompt
    assert "R$ 600,00" in prompt
    assert "Faixa de preço unitário" in prompt
    assert "Achados de preço por site/fonte" in prompt
    assert "Mercado Livre" in prompt
    assert "Painel de Preços" in prompt
    assert '"achados"' in prompt
    assert "unitário_processo" in prompt
    assert "mais_barato" in prompt


def test_normalizar_comparativo_corrige_inversao_processo_mais_barato():
    """Caso real: processo 12,80 vs mercado típico 16,00 — IA rotulou mais_caro por engano."""
    bruto = {
        "faixa_unitario": {"minimo": 14.9, "tipico": 16.0, "maximo": 18.9},
        "comparativo": "mais_caro",
        "desvio_percentual_aprox": 20,
        "achados": [
            {"site": "Magazine Luiza", "preco_unitario": 14.9},
            {"site": "Kabum", "preco_unitario": 16.0},
        ],
    }
    out = normalizar_comparativo_mercado(bruto, 12.80)
    assert out is not None
    assert out["comparativo"] == "mais_barato"
    assert out["desvio_percentual_aprox"] == -20.0
    # Não altera a faixa nem os achados
    assert out["faixa_unitario"]["tipico"] == 16.0
    assert len(out["achados"]) == 2


def test_normalizar_comparativo_processo_mais_caro():
    out = normalizar_comparativo_mercado(
        {
            "faixa_unitario": {"minimo": 10, "tipico": 12, "maximo": 14},
            "comparativo": "mais_barato",
            "desvio_percentual_aprox": -30,
        },
        18.0,
    )
    assert out is not None
    assert out["comparativo"] == "mais_caro"
    assert out["desvio_percentual_aprox"] == 50.0


def test_normalizar_comparativo_alinhado_dentro_do_limiar():
    out = normalizar_comparativo_mercado(
        {
            "faixa_unitario": {"minimo": 80, "tipico": 90, "maximo": 100},
            "comparativo": "mais_caro",
            "desvio_percentual_aprox": 6,
        },
        85.0,
    )
    assert out is not None
    assert out["comparativo"] == "alinhado"
    assert out["desvio_percentual_aprox"] == -5.6


def test_normalizar_comparativo_sem_referencia_preserva_ia():
    bruto = {"comparativo": "indeterminado", "desvio_percentual_aprox": None}
    out = normalizar_comparativo_mercado(bruto, 12.80)
    assert out == bruto


def test_extrair_json_resposta_de_fence():
    texto = """
1) Resumo: item X
```json
{"resumo_item": "item X", "faixa_unitario": {"minimo": 10, "tipico": 12, "maximo": 15}, "comparativo": "alinhado", "observacoes": "ok", "fontes": ["marketplace"]}
```
"""
    data = extrair_json_resposta(texto)
    assert data is not None
    assert data["comparativo"] == "alinhado"
    assert data["faixa_unitario"]["tipico"] == 12


def test_get_mercado_ia_campos_e_prompt(client):
    item_id = _criar_item_aberto()
    r = client.get(f"/api/propostas-abertas/itens/{item_id}/mercado-ia")
    assert r.status_code == 200
    body = r.json()
    assert body["campos"]["descricao"] == "Cadeira escolar empilhável"
    assert "94018000" in body["campos"]["ncm"]
    assert "100" in body["campos"]["qtd"]
    assert "85,00" in body["campos"]["valor_unitario"]
    assert "8.500,00" in body["campos"]["total_estimado"]
    assert "Cadeira escolar empilhável" in body["prompt_previsto"]
    assert body["prompt_versao"] == "v3"
    assert body["historico"] == []


def test_listagem_expoe_resumo_da_ultima_analise_ia(client):
    descricao = f"Indicador IA {uuid.uuid4().hex[:10]}"
    item_id = _criar_item_aberto(descricao=descricao)
    db = SessionLocal()
    try:
        db.add_all(
            [
                PropostaAnalisePreco(
                    item_id=item_id,
                    prompt_enviado="teste anterior",
                    status="erro",
                    erro="falha anterior",
                ),
                PropostaAnalisePreco(
                    item_id=item_id,
                    prompt_enviado="teste atual",
                    status="ok",
                    resposta_json=json.dumps(
                        {
                            "comparativo": "mais_barato",
                            "desvio_percentual_aprox": -0.15,
                        }
                    ),
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    r = client.get("/api/propostas-abertas/itens", params={"texto": descricao})
    assert r.status_code == 200
    item = next(row for row in r.json()["items"] if row["item_id"] == item_id)
    assert item["analise_ia"]["status"] == "ok"
    assert item["analise_ia"]["comparativo"] == "mais_barato"
    assert item["analise_ia"]["desvio_percentual_aprox"] == -0.15


def test_listagem_normaliza_comparativo_invertido_no_historico(client):
    """Histórico antigo com rótulo invertido deve aparecer corrigido na listagem."""
    descricao = f"Sinalizador {uuid.uuid4().hex[:10]}"
    item_id = _criar_item_aberto(
        descricao=descricao,
        unitario="12,80",
        total="256,00",
        quantidade="20",
    )
    db = SessionLocal()
    try:
        db.add(
            PropostaAnalisePreco(
                item_id=item_id,
                prompt_enviado="legado",
                status="ok",
                resposta_json=json.dumps(
                    {
                        "faixa_unitario": {"minimo": 14.9, "tipico": 16.0, "maximo": 18.9},
                        "comparativo": "mais_caro",
                        "desvio_percentual_aprox": 20,
                    }
                ),
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.get("/api/propostas-abertas/itens", params={"texto": descricao})
    assert r.status_code == 200
    item = next(row for row in r.json()["items"] if row["item_id"] == item_id)
    assert item["analise_ia"]["comparativo"] == "mais_barato"
    assert item["analise_ia"]["desvio_percentual_aprox"] == -20.0

    detalhe = client.get(f"/api/propostas-abertas/itens/{item_id}/mercado-ia").json()
    est = detalhe["ultima"]["resposta_estruturada"]
    assert est["comparativo"] == "mais_barato"
    assert est["desvio_percentual_aprox"] == -20.0


def test_post_mercado_ia_persiste_sucesso(client):
    item_id = _criar_item_aberto()
    fake = ChatResultado(
        ok=True,
        texto=(
            "1) Resumo do item\n"
            "```json\n"
            '{"resumo_item": "Cadeira escolar", "faixa_unitario": '
            '{"minimo": 70, "tipico": 90, "maximo": 120}, '
            '"comparativo": "alinhado", "desvio_percentual_aprox": 6, '
            '"observacoes": "estimativa", "fontes": ["Mercado Livre", "Magazine Luiza"], '
            '"achados": ['
            '{"site": "Mercado Livre", "tipo": "marketplace", "preco_unitario": 89.9, '
            '"produto": "Cadeira empilhável", "url": null, "referencia_data": "pesquisa atual", "nota": null}'
            "]}\n"
            "```"
        ),
        provedor_id=1,
        provedor_nome="OpenAI teste",
        provedor_tipo="openai",
        modelo="gpt-4o-mini",
    )
    with patch("app.analise_preco.ia_client.chat", return_value=fake):
        r = client.post(f"/api/propostas-abertas/itens/{item_id}/mercado-ia", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["provedor_nome"] == "OpenAI teste"
    assert body["prompt_versao"] == "v3"
    assert body["resposta_estruturada"]["faixa_unitario"]["tipico"] == 90
    assert body["resposta_estruturada"]["achados"][0]["site"] == "Mercado Livre"
    # Unitário 85 vs típico 90 → alinhado, desvio recalculado no servidor
    assert body["resposta_estruturada"]["comparativo"] == "alinhado"
    assert body["resposta_estruturada"]["desvio_percentual_aprox"] == -5.6
    assert "Cadeira escolar empilhável" in body["prompt_enviado"]
    assert "Achados de preço por site/fonte" in body["prompt_enviado"]

    hist = client.get(f"/api/propostas-abertas/itens/{item_id}/mercado-ia").json()
    assert len(hist["historico"]) == 1
    assert hist["ultima"]["id"] == body["id"]

    db = SessionLocal()
    try:
        row = db.get(PropostaAnalisePreco, body["id"])
        assert row is not None
        assert row.item_id == item_id
        assert row.status == "ok"
        persistido = json.loads(row.resposta_json)
        assert persistido["comparativo"] == "alinhado"
        assert persistido["desvio_percentual_aprox"] == -5.6
    finally:
        db.close()


def test_post_mercado_ia_corrige_inversao_ao_persistir(client):
    item_id = _criar_item_aberto(unitario="12,80", total="256,00", quantidade="20")
    fake = ChatResultado(
        ok=True,
        texto=(
            "```json\n"
            '{"resumo_item": "Sinalizador LED", "faixa_unitario": '
            '{"minimo": 14.9, "tipico": 16.0, "maximo": 18.9}, '
            '"comparativo": "mais_caro", "desvio_percentual_aprox": 20, '
            '"observacoes": "teste", "fontes": ["Kabum"], '
            '"achados": ['
            '{"site": "Kabum", "tipo": "marketplace", "preco_unitario": 16.0, '
            '"produto": "Sinalizador", "url": null, "referencia_data": null, "nota": null}'
            "]}\n"
            "```"
        ),
        provedor_nome="mock",
        provedor_tipo="openai",
        modelo="gpt-4o-mini",
    )
    with patch("app.analise_preco.ia_client.chat", return_value=fake):
        r = client.post(f"/api/propostas-abertas/itens/{item_id}/mercado-ia", json={})
    assert r.status_code == 200
    est = r.json()["resposta_estruturada"]
    assert est["comparativo"] == "mais_barato"
    assert est["desvio_percentual_aprox"] == -20.0


def test_post_mercado_ia_erro_nao_quebra_item(client):
    item_id = _criar_item_aberto()
    fake = ChatResultado(ok=False, erro="Todos os provedores de IA falharam.")
    with patch("app.analise_preco.ia_client.chat", return_value=fake):
        r = client.post(f"/api/propostas-abertas/itens/{item_id}/mercado-ia", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "erro"
    assert "falharam" in (body["erro"] or "").lower()

    # Item original intacto
    local = client.get(f"/api/propostas-abertas/itens/{item_id}/analise-preco")
    assert local.status_code == 200
    assert local.json()["item"]["descricao_resumida"] == "Cadeira escolar empilhável"


def test_consulta_nao_dispara_busca(client_auth):
    db = SessionLocal()
    admin_user = _uid("adm")
    consulta_user = _uid("con")
    try:
        from app.auth.service import AuthError

        try:
            criar_usuario(db, username=admin_user, senha="admin123", papel="admin")
            criar_usuario(db, username=consulta_user, senha="cons1234", papel="consulta")
        except AuthError as exc:
            pytest.skip(str(exc))
    finally:
        db.close()

    item_id = _criar_item_aberto()

    # Login consulta
    r = client_auth.post(
        "/api/auth/login",
        json={"username": consulta_user, "password": "cons1234"},
    )
    assert r.status_code == 200
    denied = client_auth.post(f"/api/propostas-abertas/itens/{item_id}/mercado-ia", json={})
    assert denied.status_code == 403

    # Login admin consegue
    client_auth.post("/api/auth/logout")
    r = client_auth.post(
        "/api/auth/login",
        json={"username": admin_user, "password": "admin123"},
    )
    assert r.status_code == 200
    fake = ChatResultado(
        ok=True,
        texto="Resumo sem JSON",
        provedor_nome="mock",
        provedor_tipo="openai",
        modelo="x",
    )
    with patch("app.analise_preco.ia_client.chat", return_value=fake):
        ok = client_auth.post(f"/api/propostas-abertas/itens/{item_id}/mercado-ia", json={})
    assert ok.status_code == 200
    assert ok.json()["status"] == "ok"
