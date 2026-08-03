"""Elo estoque ↔ produção (ESTOQUE_FLUXO_SAIDA_RETORNO_PA) + seed da jornada demo."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models import (
    BemCategoria,
    BemPatrimonio,
    BemStatus,
    Cobranca,
    CobrancaStatus,
    DocFiscalStatus,
    DocFiscalTipo,
    DocumentoFiscalSaida,
    Empresa,
    Entrega,
    EntregaStatus,
    ItemNatureza,
    MovTipo,
    OpStatus,
    Orcamento,
    OrcamentoStatus,
    OrdemProducao,
    Parceiro,
    Pedido,
    PedidoItem,
    PedidoStatus,
    Produto,
    ProdutoTipo,
    Titulo,
    TituloStatus,
    TituloTipo,
    Unidade,
)
from app.services.codes import apply_stock_move, dec, next_business_code, next_codigo


def _mp_padrao(db: Session, empresa_id: int) -> Produto | None:
    return (
        db.query(Produto)
        .filter(
            Produto.empresa_id == empresa_id,
            Produto.tipo == ProdutoTipo.INSUMO,
            Produto.controla_estoque.is_(True),
            Produto.ativo.is_(True),
        )
        .order_by(Produto.id)
        .first()
    )


def _pa_encomenda(db: Session, empresa_id: int, op: OrdemProducao) -> Produto:
    """PA sob encomenda: um SKU ACABADO por empresa (reutilizado) ou cria."""
    pa = (
        db.query(Produto)
        .filter(
            Produto.empresa_id == empresa_id,
            Produto.tipo == ProdutoTipo.ACABADO,
            Produto.ativo.is_(True),
        )
        .order_by(Produto.id)
        .first()
    )
    if pa:
        return pa
    codigo = next_codigo(db, empresa_id, Produto)
    pa = Produto(
        empresa_id=empresa_id,
        codigo=codigo,
        sku="PA-ENCOMENDA",
        descricao="Produto acabado (encomenda)",
        tipo=ProdutoTipo.ACABADO,
        unidade=Unidade.UN,
        grupo="PA",
        ncm="48219000",
        controla_estoque=True,
        custo_medio=Decimal("0"),
    )
    db.add(pa)
    db.flush()
    return pa


def empenhar_mp_pedido(db: Session, *, empresa_id: int, pedido: Pedido, ops: list[OrdemProducao]) -> list[dict]:
    """Reserva MP ao liberar pedido (empenho)."""
    mp = _mp_padrao(db, empresa_id)
    eventos: list[dict] = []
    if not mp or not mp.controla_estoque:
        return [{"evento": "EMPENHO_SKIP", "motivo": "sem insumo controlado"}]
    for op in ops:
        if op.tipo != "OP":
            continue
        # consumo estimado simbólico HML: 0.001 m² por etiqueta, mín 5
        q = max(Decimal("5"), dec(Decimal(op.quantidade) * Decimal("0.001"), "0.0001"))
        q = min(q, mp.saldo_disponivel) if mp.saldo_disponivel > 0 else q
        if q <= 0 or mp.saldo_disponivel <= 0:
            eventos.append({"op": op.codigo, "evento": "EMPENHO_SKIP", "motivo": "sem saldo MP"})
            continue
        try:
            apply_stock_move(
                db,
                empresa_id=empresa_id,
                produto=mp,
                tipo=MovTipo.RESERVA,
                quantidade=q,
                documento_ref=op.codigo,
                observacao=f"Empenho OP {op.codigo} / {pedido.codigo}",
                op_id=op.id,
                pedido_id=pedido.id,
            )
            pts = list(op.apontamentos or [])
            pts.append(
                {
                    "evento": "EMPENHO_MP",
                    "produto_id": mp.id,
                    "quantidade": str(q),
                    "em": datetime.utcnow().isoformat(),
                }
            )
            op.apontamentos = pts
            eventos.append({"op": op.codigo, "evento": "EMPENHO_MP", "quantidade": str(q), "sku": mp.sku})
        except ValueError as e:
            eventos.append({"op": op.codigo, "evento": "EMPENHO_SKIP", "motivo": str(e)})
    return eventos


def concluir_op_com_estoque(
    db: Session,
    *,
    empresa_id: int,
    op: OrdemProducao,
    qtd_sobra: Decimal | None = None,
) -> dict[str, Any]:
    """Baixa MP (consome reserva), entra PA e opcionalmente ENTRADA_SOBRA."""
    resultado: dict[str, Any] = {"movimentos": []}
    pts = list(op.apontamentos or [])

    if op.tipo == "OP":
        mp = _mp_padrao(db, empresa_id)
        # quantidade empenhada na OP (último EMPENHO) ou estimativa
        q_mp = Decimal("5")
        for ev in reversed(pts):
            if ev.get("evento") == "EMPENHO_MP" and ev.get("quantidade"):
                q_mp = dec(ev["quantidade"], "0.0001")
                break
        if mp and mp.controla_estoque and (mp.saldo_qtd or 0) > 0:
            q_baixa = min(q_mp, mp.saldo_qtd or Decimal("0"))
            if q_baixa > 0:
                try:
                    mov = apply_stock_move(
                        db,
                        empresa_id=empresa_id,
                        produto=mp,
                        tipo=MovTipo.BAIXA_MP,
                        quantidade=q_baixa,
                        documento_ref=op.codigo,
                        observacao="Baixa MP ao concluir OP",
                        consumir_reserva=True,
                        op_id=op.id,
                        pedido_id=op.pedido_id,
                    )
                    resultado["movimentos"].append({"tipo": "BAIXA_MP", "id": mov.id, "qtd": str(q_baixa)})
                    pts.append(
                        {
                            "evento": "BAIXA_MP",
                            "produto_id": mp.id,
                            "quantidade": str(q_baixa),
                            "em": datetime.utcnow().isoformat(),
                        }
                    )
                except ValueError as e:
                    pts.append({"evento": "BAIXA_MP_SKIP", "motivo": str(e), "em": datetime.utcnow().isoformat()})

            sobra = qtd_sobra
            if sobra is None:
                sobra = dec(q_baixa * Decimal("0.05"), "0.0001") if q_baixa > 0 else Decimal("0")
            if sobra and sobra > 0 and mp:
                try:
                    mov_s = apply_stock_move(
                        db,
                        empresa_id=empresa_id,
                        produto=mp,
                        tipo=MovTipo.ENTRADA_SOBRA,
                        quantidade=sobra,
                        custo_unitario=mp.custo_medio or Decimal("0"),
                        documento_ref=op.codigo,
                        observacao="Retorno sobra aproveitável",
                        op_id=op.id,
                        pedido_id=op.pedido_id,
                    )
                    resultado["movimentos"].append({"tipo": "ENTRADA_SOBRA", "id": mov_s.id, "qtd": str(sobra)})
                    pts.append(
                        {
                            "evento": "ENTRADA_SOBRA",
                            "produto_id": mp.id,
                            "quantidade": str(sobra),
                            "em": datetime.utcnow().isoformat(),
                        }
                    )
                except ValueError as e:
                    pts.append({"evento": "SOBRA_SKIP", "motivo": str(e), "em": datetime.utcnow().isoformat()})

        # ENTRADA_PA — quantidade boa = OP.quantidade
        pa = _pa_encomenda(db, empresa_id, op)
        custo_pa = Decimal("0")
        if mp and mp.custo_medio:
            custo_pa = mp.custo_medio
        try:
            mov_pa = apply_stock_move(
                db,
                empresa_id=empresa_id,
                produto=pa,
                tipo=MovTipo.ENTRADA_PA,
                quantidade=Decimal(op.quantidade),
                custo_unitario=custo_pa,
                documento_ref=op.codigo,
                observacao=f"PA encomenda pedido {op.pedido_id}",
                op_id=op.id,
                pedido_id=op.pedido_id,
            )
            resultado["movimentos"].append(
                {"tipo": "ENTRADA_PA", "id": mov_pa.id, "qtd": str(op.quantidade), "produto_id": pa.id}
            )
            pts.append(
                {
                    "evento": "ENTRADA_PA",
                    "produto_id": pa.id,
                    "quantidade": str(op.quantidade),
                    "em": datetime.utcnow().isoformat(),
                }
            )
        except ValueError as e:
            pts.append({"evento": "ENTRADA_PA_SKIP", "motivo": str(e), "em": datetime.utcnow().isoformat()})

    op.apontamentos = pts
    resultado["apontamentos"] = pts
    return resultado


def baixa_pa_na_venda(db: Session, *, empresa_id: int, pedido: Pedido, doc_ref: str) -> list[dict]:
    """SAIDA_VENDA do PA ao faturar (expedição simbólica)."""
    pa = (
        db.query(Produto)
        .filter(
            Produto.empresa_id == empresa_id,
            Produto.tipo == ProdutoTipo.ACABADO,
            Produto.ativo.is_(True),
        )
        .order_by(Produto.id)
        .first()
    )
    out: list[dict] = []
    if not pa or (pa.saldo_qtd or 0) <= 0:
        return out
    q = min(pa.saldo_qtd, Decimal(pedido.quantidade or 0) or pa.saldo_qtd)
    if q <= 0:
        return out
    try:
        mov = apply_stock_move(
            db,
            empresa_id=empresa_id,
            produto=pa,
            tipo=MovTipo.SAIDA_VENDA,
            quantidade=q,
            documento_ref=doc_ref,
            observacao=f"Saída PA faturamento {pedido.codigo}",
            pedido_id=pedido.id,
            consumir_reserva=False,
            permitir_negativo=False,
        )
        out.append({"tipo": "SAIDA_VENDA", "id": mov.id, "qtd": str(q)})
    except ValueError:
        pass
    return out


def seed_patrimonio_demo(db: Session, emp: Empresa) -> int:
    """Bens demo se patrimônio vazio."""
    if db.query(BemPatrimonio).filter(BemPatrimonio.empresa_id == emp.id).count() > 0:
        return 0
    bens = [
        BemPatrimonio(
            empresa_id=emp.id,
            codigo="BEM-00001",
            descricao="Impressora flexográfica Mark Andy",
            categoria=BemCategoria.MAQUINA,
            marca="Mark Andy",
            modelo="2200",
            numero_serie="MA-DEMO-001",
            data_aquisicao=datetime.utcnow().date().replace(year=2019),
            valor_aquisicao=Decimal("185000.00"),
            local="Produção — linha 1",
            responsavel="Produção",
            status=BemStatus.ATIVO,
            natureza_aquisicao="4.01",
        ),
        BemPatrimonio(
            empresa_id=emp.id,
            codigo="BEM-00002",
            descricao="Rebobinadeira",
            categoria=BemCategoria.MAQUINA,
            marca="RLP",
            modelo="RB-600",
            data_aquisicao=datetime.utcnow().date().replace(year=2021),
            valor_aquisicao=Decimal("42000.00"),
            local="Produção — acabamento",
            status=BemStatus.ATIVO,
            natureza_aquisicao="4.01",
        ),
        BemPatrimonio(
            empresa_id=emp.id,
            codigo="BEM-00003",
            descricao="Servidor ERP / Focus",
            categoria=BemCategoria.INFORMATICA,
            marca="Dell",
            modelo="PowerEdge",
            valor_aquisicao=Decimal("12500.00"),
            local="TI",
            status=BemStatus.ATIVO,
            natureza_aquisicao="4.02",
        ),
    ]
    for b in bens:
        db.add(b)
    return len(bens)


def seed_jornada_demo(db: Session, emp: Empresa, *, force: bool = False) -> dict[str, Any]:
    """Popula uma jornada completa visível se ainda não houver pedidos."""
    seed_patrimonio_demo(db, emp)
    if not force and db.query(Pedido).filter(Pedido.empresa_id == emp.id).count() > 0:
        return {"skipped": True, "reason": "ja_existem_pedidos"}

    cliente = (
        db.query(Parceiro)
        .filter(Parceiro.empresa_id == emp.id, Parceiro.codigo == "0001")
        .first()
    )
    if not cliente:
        return {"skipped": True, "reason": "sem_cliente"}

    mp = _mp_padrao(db, emp.id)
    if mp and (mp.saldo_qtd or 0) < Decimal("100"):
        apply_stock_move(
            db,
            empresa_id=emp.id,
            produto=mp,
            tipo=MovTipo.ENTRADA_MANUAL,
            quantidade=Decimal("500"),
            custo_unitario=Decimal("2.50"),
            documento_ref="SEED-MP",
            observacao="Saldo inicial HML para jornada demo",
        )

    return _seed_jornada_core(db, emp, cliente, mp)


def _seed_jornada_core(
    db: Session, emp: Empresa, cliente: Parceiro, mp: Produto | None
) -> dict[str, Any]:
    # PA sem precisar OP fake
    pa = (
        db.query(Produto)
        .filter(Produto.empresa_id == emp.id, Produto.tipo == ProdutoTipo.ACABADO)
        .first()
    )
    if not pa:
        pa = Produto(
            empresa_id=emp.id,
            codigo=next_codigo(db, emp.id, Produto),
            sku="PA-ENCOMENDA",
            descricao="Produto acabado (encomenda)",
            tipo=ProdutoTipo.ACABADO,
            unidade=Unidade.UN,
            grupo="PA",
            ncm="48219000",
            controla_estoque=True,
        )
        db.add(pa)
        db.flush()

    # ---- Pedido 1: AGUARDA_CREDITO (fila financeira)
    orc1 = Orcamento(
        empresa_id=emp.id,
        codigo=next_business_code(db, "ORC", Orcamento),
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=OrcamentoStatus.APROVADO,
        input_snapshot={"seed": True, "quantidade": 5000},
        result_snapshot={"faixas": [{"index": 0, "quantidade": 5000, "valor_total": "850.00"}]},
        faixa_escolhida=0,
        aprovado_em=datetime.now(timezone.utc),
    )
    db.add(orc1)
    db.flush()
    ped1 = Pedido(
        empresa_id=emp.id,
        codigo=next_business_code(db, "PED", Pedido),
        orcamento_id=orc1.id,
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=PedidoStatus.AGUARDA_CREDITO,
        snapshot={"seed": True},
        quantidade=5000,
        valor_etiquetas=Decimal("850.00"),
        valor_total=Decimal("850.00"),
    )
    db.add(ped1)
    db.flush()
    db.add(
        PedidoItem(
            pedido_id=ped1.id,
            natureza=ItemNatureza.PRODUCAO,
            descricao="Etiqueta demo 50x30mm",
            quantidade=5000,
            valor_unitario=Decimal("0.17"),
            valor_total=Decimal("850.00"),
        )
    )

    # ---- Pedido 2: jornada quase completa (FATURADO + TIT/COB + ENT + BX parcial)
    orc2 = Orcamento(
        empresa_id=emp.id,
        codigo=next_business_code(db, "ORC", Orcamento),
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=OrcamentoStatus.APROVADO,
        input_snapshot={"seed": True, "quantidade": 10000},
        result_snapshot={"faixas": [{"index": 0, "quantidade": 10000, "valor_total": "1500.00"}]},
        faixa_escolhida=0,
        aprovado_em=datetime.now(timezone.utc),
    )
    db.add(orc2)
    db.flush()
    ped2 = Pedido(
        empresa_id=emp.id,
        codigo=next_business_code(db, "PED", Pedido),
        orcamento_id=orc2.id,
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=PedidoStatus.FATURADO,
        snapshot={"seed": True, "jornada": "completa"},
        quantidade=10000,
        valor_etiquetas=Decimal("1500.00"),
        valor_total=Decimal("1500.00"),
        credito_ok=True,
        credito_liberacao={
            "modo": "credito",
            "excecao": False,
            "liberado_em": datetime.utcnow().isoformat(),
            "autor": "seed",
        },
    )
    db.add(ped2)
    db.flush()
    item2 = PedidoItem(
        pedido_id=ped2.id,
        natureza=ItemNatureza.PRODUCAO,
        descricao="Etiqueta seed fluxo completo",
        quantidade=10000,
        valor_unitario=Decimal("0.15"),
        valor_total=Decimal("1500.00"),
    )
    db.add(item2)
    db.flush()

    op2 = OrdemProducao(
        empresa_id=emp.id,
        codigo=next_business_code(db, "OP", OrdemProducao),
        pedido_id=ped2.id,
        pedido_item_id=item2.id,
        tipo="OP",
        status=OpStatus.CONCLUIDA,
        descricao=item2.descricao,
        quantidade=item2.quantidade,
        apontamentos=[
            {"evento": "INICIO", "em": datetime.utcnow().isoformat()},
            {"evento": "CONCLUSAO", "em": datetime.utcnow().isoformat()},
        ],
        concluidas_em=datetime.utcnow(),
    )
    db.add(op2)
    db.flush()

    # empenho + baixa + pa + sobra do ped2
    if mp and (mp.saldo_disponivel or 0) >= Decimal("10"):
        apply_stock_move(
            db,
            empresa_id=emp.id,
            produto=mp,
            tipo=MovTipo.RESERVA,
            quantidade=Decimal("10"),
            documento_ref=op2.codigo,
            observacao="Seed empenho",
            op_id=op2.id,
            pedido_id=ped2.id,
        )
        apply_stock_move(
            db,
            empresa_id=emp.id,
            produto=mp,
            tipo=MovTipo.BAIXA_MP,
            quantidade=Decimal("10"),
            documento_ref=op2.codigo,
            observacao="Seed BAIXA_MP",
            consumir_reserva=True,
            op_id=op2.id,
            pedido_id=ped2.id,
        )
        apply_stock_move(
            db,
            empresa_id=emp.id,
            produto=mp,
            tipo=MovTipo.ENTRADA_SOBRA,
            quantidade=Decimal("0.5"),
            custo_unitario=mp.custo_medio or Decimal("2.50"),
            documento_ref=op2.codigo,
            observacao="Seed sobra",
            op_id=op2.id,
            pedido_id=ped2.id,
        )
    apply_stock_move(
        db,
        empresa_id=emp.id,
        produto=pa,
        tipo=MovTipo.ENTRADA_PA,
        quantidade=Decimal("10000"),
        custo_unitario=Decimal("0.08"),
        documento_ref=op2.codigo,
        observacao="Seed ENTRADA_PA",
        op_id=op2.id,
        pedido_id=ped2.id,
    )
    apply_stock_move(
        db,
        empresa_id=emp.id,
        produto=pa,
        tipo=MovTipo.SAIDA_VENDA,
        quantidade=Decimal("10000"),
        documento_ref=ped2.codigo,
        observacao="Seed SAIDA_VENDA",
        pedido_id=ped2.id,
        consumir_reserva=False,
    )

    doc = DocumentoFiscalSaida(
        empresa_id=emp.id,
        codigo=next_business_code(db, "NF", DocumentoFiscalSaida),
        pedido_id=ped2.id,
        tipo=DocFiscalTipo.NFSE,
        status=DocFiscalStatus.SIMULADO,
        numero="1001",
        chave=f"SIM{ped2.codigo.replace('-', '')}NFSE",
        valor_total=ped2.valor_total,
        idempotency_key=f"FAT-{ped2.codigo}-NFSE",
        payload={"seed": True, "simulado": True},
    )
    db.add(doc)
    db.flush()

    tit = Titulo(
        empresa_id=emp.id,
        codigo=next_business_code(db, "TIT", Titulo),
        tipo=TituloTipo.RECEBER,
        status=TituloStatus.ABERTO,
        parceiro_id=cliente.id,
        pedido_id=ped2.id,
        documento_fiscal_id=doc.id,
        descricao=f"Faturamento {ped2.codigo}",
        valor=ped2.valor_total,
        valor_aberto=ped2.valor_total,
        vencimento=datetime.utcnow().date() + timedelta(days=14),
        natureza_codigo="1.01.01",
    )
    db.add(tit)
    db.flush()

    cob = Cobranca(
        empresa_id=emp.id,
        codigo=next_business_code(db, "COB", Cobranca),
        titulo_id=tit.id,
        status=CobrancaStatus.REGISTRADA,
        provider="SIMULADO",
        nosso_numero=f"SIM{tit.id:08d}",
        linha_digitavel=f"23793.38128 60000.000003 00000.000400 1 {int(tit.valor * 100):014d}",
        valor=tit.valor,
        vencimento=tit.vencimento,
        idempotency_key=f"COB-{tit.codigo}",
    )
    db.add(cob)

    ent = Entrega(
        empresa_id=emp.id,
        codigo=next_business_code(db, "ENT", Entrega),
        pedido_id=ped2.id,
        status=EntregaStatus.EXPEDIDA,
        volumes=2,
        rolos=10,
        transportadora="Transportadora Demo",
        expedida_em=datetime.utcnow(),
        observacao="Romaneio seed — aguarda confirmação cliente",
    )
    db.add(ent)

    # Pedido 3: EM_PRODUCAO com OP aberta
    orc3 = Orcamento(
        empresa_id=emp.id,
        codigo=next_business_code(db, "ORC", Orcamento),
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=OrcamentoStatus.APROVADO,
        input_snapshot={"seed": True},
        result_snapshot={"faixas": [{"index": 0, "quantidade": 2000, "valor_total": "420.00"}]},
        faixa_escolhida=0,
        aprovado_em=datetime.now(timezone.utc),
    )
    db.add(orc3)
    db.flush()
    ped3 = Pedido(
        empresa_id=emp.id,
        codigo=next_business_code(db, "PED", Pedido),
        orcamento_id=orc3.id,
        parceiro_id=cliente.id,
        cliente_nome=cliente.razao_social,
        status=PedidoStatus.EM_PRODUCAO,
        snapshot={"seed": True},
        quantidade=2000,
        valor_etiquetas=Decimal("420.00"),
        valor_total=Decimal("420.00"),
        credito_ok=True,
        credito_liberacao={"modo": "credito", "excecao": False, "autor": "seed"},
    )
    db.add(ped3)
    db.flush()
    item3 = PedidoItem(
        pedido_id=ped3.id,
        natureza=ItemNatureza.PRODUCAO,
        descricao="Etiqueta em produção",
        quantidade=2000,
        valor_unitario=Decimal("0.21"),
        valor_total=Decimal("420.00"),
    )
    db.add(item3)
    db.flush()
    op3 = OrdemProducao(
        empresa_id=emp.id,
        codigo=next_business_code(db, "OP", OrdemProducao),
        pedido_id=ped3.id,
        pedido_item_id=item3.id,
        tipo="OP",
        status=OpStatus.EM_ANDAMENTO,
        descricao=item3.descricao,
        quantidade=item3.quantidade,
        apontamentos=[{"evento": "INICIO", "em": datetime.utcnow().isoformat()}],
    )
    db.add(op3)
    db.flush()
    if mp and (mp.saldo_disponivel or 0) >= Decimal("5"):
        apply_stock_move(
            db,
            empresa_id=emp.id,
            produto=mp,
            tipo=MovTipo.RESERVA,
            quantidade=Decimal("5"),
            documento_ref=op3.codigo,
            observacao="Seed empenho OP em andamento",
            op_id=op3.id,
            pedido_id=ped3.id,
        )
        pts = list(op3.apontamentos or [])
        pts.append({"evento": "EMPENHO_MP", "produto_id": mp.id, "quantidade": "5", "em": datetime.utcnow().isoformat()})
        op3.apontamentos = pts

    # Patrimônio demo (também via seed_patrimonio_demo)
    seed_patrimonio_demo(db, emp)

    return {
        "skipped": False,
        "pedidos": [ped1.codigo, ped2.codigo, ped3.codigo],
        "op": [op2.codigo, op3.codigo],
        "titulo": tit.codigo,
        "cobranca": cob.codigo,
        "entrega": ent.codigo,
        "fiscal": doc.codigo,
    }
