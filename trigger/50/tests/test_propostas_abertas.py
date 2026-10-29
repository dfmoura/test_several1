"""Propostas abertas — itens com prazo PNCP vigente (visão filial · sem IA)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from app.database import Contratacao, FilialUasg, ItemContratacao, Orgao, Uasg


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200


def _filial_com_uasg(client, db) -> tuple[int, str]:
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Prop", "codigo": _uid("OP").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial P",
            "codigo": "FP",
            "matriz_id": matriz["id"],
        },
    ).json()

    orgao = Orgao(codigo_orgao=9501, nome_orgao="ORG PROP")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="444444",
        orgao_id=orgao.id,
        nome_uasg="UASG P",
        sigla_uf="PR",
    )
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    db.commit()

    r = client.post("/api/auth/filtro-visao", json={"unidade_id": filial["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["escopo"]["modo"] == "filial"
    return filial["id"], "444444"


def _seed_aberta(
    db,
    *,
    codigo_uasg: str = "444444",
    id_compra: str = "compra-prop-001",
    encerramento: datetime | None = None,
    material: str = "M",
    catalogo: int | None = 12345,
    unitario: str = "100.00",
    total: str = "1000.00",
) -> tuple[Contratacao, ItemContratacao]:
    enc = encerramento or (datetime.now() + timedelta(hours=36))
    enc_txt = enc.strftime("%d/%m/%Y %H:%M")
    c = Contratacao(
        id_compra=id_compra,
        unidade_compradora=codigo_uasg,
        unidade_nome="UASG P",
        ano=enc.year,
        numero="50/2026",
        numero_controle_pncp="PNCP-PROP-1",
        modalidade_codigo="5",
        modalidade_descricao="Pregão - Eletrônico",
        objeto="Aquisição de material de teste propostas",
        situacao="Divulgada no PNCP",
        processo="PROC-PROP-1",
        valor_total_estimado=total,
        data_encerramento_proposta_pncp=enc_txt,
        data_abertura_proposta_pncp=(enc - timedelta(days=5)).strftime("%d/%m/%Y %H:%M"),
    )
    db.add(c)
    db.flush()
    it = ItemContratacao(
        id_compra_item=f"{id_compra}-1",
        id_compra=id_compra,
        contratacao_id=c.id,
        numero_item_pncp=1,
        descricao_resumida="Caderno universitário 200 folhas",
        material_ou_servico=material,
        material_ou_servico_nome="Material" if material == "M" else "Serviço",
        cod_item_catalogo=catalogo,
        quantidade="10",
        valor_unitario_estimado=unitario,
        valor_total=total,
        situacao_compra_item_nome="Em andamento",
    )
    db.add(it)
    db.commit()
    db.refresh(c)
    db.refresh(it)
    return c, it


def test_propostas_exige_visao_filial(client, db):
    _bootstrap_admin(client)
    r = client.get("/api/propostas-abertas/itens")
    assert r.status_code == 403
    assert "filial" in r.json()["detail"].lower()


def test_propostas_filtros_uasg_so_da_filial_visao(client, db):
    """Select de UASG = cadastro Filial↔UASG da visão filtrada (não de outra filial)."""
    _bootstrap_admin(client)
    filial_id, codigo = _filial_com_uasg(client, db)
    # UASG órfã (sem vínculo com a filial) não pode aparecer no filtro.
    orgao = Orgao(codigo_orgao=9502, nome_orgao="ORG OUTRA")
    db.add(orgao)
    db.flush()
    db.add(
        Uasg(
            codigo_uasg="555555",
            orgao_id=orgao.id,
            nome_uasg="UASG FORA",
            sigla_uf="SP",
        )
    )
    db.commit()

    r = client.get("/api/propostas-abertas/filtros")
    assert r.status_code == 200, r.text
    body = r.json()
    codigos = [u["codigo"] for u in body["uasgs"]]
    assert codigos == [codigo]
    assert "555555" not in codigos
    assert body["filial_id"] == filial_id


def test_propostas_lista_item_aberto_e_exclui_encerrado(client, db):
    _bootstrap_admin(client)
    _filial_com_uasg(client, db)
    _seed_aberta(db, id_compra="compra-prop-aberta")
    _seed_aberta(
        db,
        id_compra="compra-prop-fechada",
        encerramento=datetime.now() - timedelta(hours=2),
    )

    r = client.get("/api/propostas-abertas/itens?horizonte=todos")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["id_compra"] == "compra-prop-aberta"
    assert item["urgencia"] in {"critica", "alta", "media", "normal"}
    assert item["horas_restantes"] > 0
    assert "analise_ia" not in item


def test_propostas_horizonte_24h_filtra(client, db):
    _bootstrap_admin(client)
    _filial_com_uasg(client, db)
    _seed_aberta(
        db,
        id_compra="compra-prop-12h",
        encerramento=datetime.now() + timedelta(hours=12),
    )
    _seed_aberta(
        db,
        id_compra="compra-prop-5d",
        encerramento=datetime.now() + timedelta(days=5),
    )

    r = client.get("/api/propostas-abertas/itens?horizonte=24h")
    assert r.status_code == 200
    ids = {x["id_compra"] for x in r.json()["items"]}
    assert ids == {"compra-prop-12h"}


def test_propostas_resumo_e_detalhe(client, db):
    _bootstrap_admin(client)
    _filial_com_uasg(client, db)
    _, it = _seed_aberta(db, id_compra="compra-prop-det")

    resumo = client.get("/api/propostas-abertas/resumo")
    assert resumo.status_code == 200
    rs = resumo.json()
    assert rs["itens"] == 1
    assert rs["contratacoes"] == 1
    assert rs["urgentes_72h"] == 1

    det = client.get(f"/api/propostas-abertas/itens/{it.id}")
    assert det.status_code == 200
    body = det.json()
    assert body["item"]["item_id"] == it.id
    assert body["contratacao"]["id"]
    assert "leitura" in body
    assert "analise_ia" not in body
    assert "pesquisa_preco" not in body or body.get("pesquisa_preco") in (None, [])


def test_propostas_fora_escopo_uasg(client, db):
    _bootstrap_admin(client)
    _filial_com_uasg(client, db)
    _seed_aberta(db, codigo_uasg="999999", id_compra="compra-outra-uasg")

    r = client.get("/api/propostas-abertas/itens")
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_propostas_sort_valor_e_pagina(client, db):
    _bootstrap_admin(client)
    _filial_com_uasg(client, db)
    _seed_aberta(
        db,
        id_compra="compra-prop-a",
        unitario="50",
        total="500",
        encerramento=datetime.now() + timedelta(days=2),
    )
    _seed_aberta(
        db,
        id_compra="compra-prop-b",
        unitario="200",
        total="2000",
        encerramento=datetime.now() + timedelta(days=3),
    )

    r = client.get(
        "/api/propostas-abertas/itens"
        "?sort=valor_total_num&sort_dir=desc&page=1&page_size=1"
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["id_compra"] == "compra-prop-b"
