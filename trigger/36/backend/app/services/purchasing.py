"""Compras (M07) — necessidade → OC → amarra NF-e. Paralelo ao fluxo ORC→BX."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import (
    NecessidadeCompra,
    NecessidadeCompraItem,
    NecessidadeOrigem,
    NecessidadeStatus,
    OrdemCompra,
    OrdemCompraItem,
    OrdemCompraStatus,
    Produto,
)
from app.services.codes import dec, next_business_code


def _necessidade_out(n: NecessidadeCompra) -> dict:
    return {
        "id": n.id,
        "codigo": n.codigo,
        "status": n.status.value,
        "origem": n.origem.value,
        "urgencia": n.urgencia,
        "solicitante": n.solicitante,
        "op_id": n.op_id,
        "observacao": n.observacao,
        "created_at": n.created_at,
        "itens": [
            {
                "id": i.id,
                "produto_id": i.produto_id,
                "descricao": i.descricao,
                "quantidade": i.quantidade,
                "unidade": i.unidade,
                "qtd_atendida": i.qtd_atendida,
                "observacao": i.observacao,
            }
            for i in n.itens
        ],
    }


def _ordem_out(o: OrdemCompra) -> dict:
    return {
        "id": o.id,
        "codigo": o.codigo,
        "parceiro_id": o.parceiro_id,
        "necessidade_id": o.necessidade_id,
        "status": o.status.value,
        "urgencia": o.urgencia,
        "previsao_entrega": o.previsao_entrega,
        "condicao_pagamento": o.condicao_pagamento,
        "observacao": o.observacao,
        "created_at": o.created_at,
        "parceiro_nome": o.parceiro.razao_social if o.parceiro else None,
        "itens": [
            {
                "id": i.id,
                "produto_id": i.produto_id,
                "descricao": i.descricao,
                "quantidade": i.quantidade,
                "unidade": i.unidade,
                "preco_unitario": i.preco_unitario,
                "qtd_recebida": i.qtd_recebida,
                "valor_linha": dec(i.quantidade * i.preco_unitario),
            }
            for i in o.itens
        ],
        "valor_total": dec(sum((i.quantidade * i.preco_unitario for i in o.itens), Decimal("0"))),
    }


def quantidade_sugerida_compra(produto: Produto) -> Decimal:
    """Sugere lote: max(lote_compra, limiar − disponível) com mínimo de 1 unidade útil."""
    disponivel = produto.saldo_disponivel
    limiar = produto.limiar_reposicao
    falta = limiar - disponivel
    if falta <= 0:
        return Decimal("0")
    lote = produto.lote_compra or Decimal("0")
    if lote > 0:
        return max(lote, falta)
    return falta


def gerar_necessidades_reposicao(
    db: Session,
    *,
    empresa_id: int,
    solicitante: str | None = None,
) -> list[NecessidadeCompra]:
    """Cria NEC- para produtos abaixo do ponto de pedido (ou mínimo), sem duplicar abertas."""
    produtos = (
        db.query(Produto)
        .filter(
            Produto.empresa_id == empresa_id,
            Produto.controla_estoque.is_(True),
            Produto.ativo.is_(True),
        )
        .all()
    )
    criadas: list[NecessidadeCompra] = []
    for p in produtos:
        limiar = p.limiar_reposicao
        if limiar <= 0:
            continue
        if p.saldo_disponivel >= limiar:
            continue
        sugerida = quantidade_sugerida_compra(p)
        if sugerida <= 0:
            continue
        # já existe necessidade aberta/em compra para o SKU?
        aberta = (
            db.query(NecessidadeCompraItem)
            .join(NecessidadeCompra)
            .filter(
                NecessidadeCompra.empresa_id == empresa_id,
                NecessidadeCompra.status.in_(
                    [NecessidadeStatus.ABERTA, NecessidadeStatus.EM_COMPRA]
                ),
                NecessidadeCompraItem.produto_id == p.id,
            )
            .first()
        )
        if aberta:
            continue
        nec = NecessidadeCompra(
            empresa_id=empresa_id,
            codigo=next_business_code(db, "NEC", NecessidadeCompra),
            status=NecessidadeStatus.ABERTA,
            origem=NecessidadeOrigem.MINIMO,
            urgencia=p.saldo_disponivel <= 0,
            solicitante=solicitante or "SISTEMA",
            observacao=f"Reposição automática — disponível {p.saldo_disponivel} < limiar {limiar}",
        )
        nec.itens.append(
            NecessidadeCompraItem(
                produto_id=p.id,
                descricao=p.descricao,
                quantidade=sugerida,
                unidade=p.unidade.value,
            )
        )
        db.add(nec)
        db.flush()
        criadas.append(nec)
    return criadas


def criar_necessidade(
    db: Session,
    *,
    empresa_id: int,
    itens: list[dict],
    origem: NecessidadeOrigem = NecessidadeOrigem.MANUAL,
    urgencia: bool = False,
    solicitante: str | None = None,
    op_id: int | None = None,
    observacao: str | None = None,
) -> NecessidadeCompra:
    if not itens:
        raise ValueError("Inclua ao menos um item na necessidade")
    nec = NecessidadeCompra(
        empresa_id=empresa_id,
        codigo=next_business_code(db, "NEC", NecessidadeCompra),
        status=NecessidadeStatus.ABERTA,
        origem=origem,
        urgencia=urgencia,
        solicitante=solicitante,
        op_id=op_id,
        observacao=observacao,
    )
    for raw in itens:
        prod = db.query(Produto).filter(
            Produto.id == raw["produto_id"], Produto.empresa_id == empresa_id
        ).first()
        if not prod:
            raise ValueError(f"Produto {raw['produto_id']} inválido")
        nec.itens.append(
            NecessidadeCompraItem(
                produto_id=prod.id,
                descricao=raw.get("descricao") or prod.descricao,
                quantidade=dec(raw["quantidade"], "0.0001"),
                unidade=raw.get("unidade") or prod.unidade.value,
                observacao=raw.get("observacao"),
            )
        )
    db.add(nec)
    db.flush()
    return nec


def criar_ordem_compra(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    itens: list[dict],
    necessidade_id: int | None = None,
    urgencia: bool = False,
    previsao_entrega=None,
    condicao_pagamento: str | None = None,
    observacao: str | None = None,
) -> OrdemCompra:
    if not itens:
        raise ValueError("Inclua ao menos um item na OC")
    oc = OrdemCompra(
        empresa_id=empresa_id,
        codigo=next_business_code(db, "OC", OrdemCompra),
        parceiro_id=parceiro_id,
        necessidade_id=necessidade_id,
        status=OrdemCompraStatus.RASCUNHO,
        urgencia=urgencia,
        previsao_entrega=previsao_entrega,
        condicao_pagamento=condicao_pagamento,
        observacao=observacao,
    )
    for raw in itens:
        prod = None
        if raw.get("produto_id"):
            prod = db.query(Produto).filter(
                Produto.id == raw["produto_id"], Produto.empresa_id == empresa_id
            ).first()
            if not prod:
                raise ValueError(f"Produto {raw['produto_id']} inválido")
        oc.itens.append(
            OrdemCompraItem(
                produto_id=prod.id if prod else None,
                descricao=raw.get("descricao") or (prod.descricao if prod else ""),
                quantidade=dec(raw["quantidade"], "0.0001"),
                unidade=raw.get("unidade") or (prod.unidade.value if prod else "M2"),
                preco_unitario=dec(raw.get("preco_unitario") or 0, "0.000001"),
            )
        )
    db.add(oc)
    if necessidade_id:
        nec = (
            db.query(NecessidadeCompra)
            .filter(NecessidadeCompra.id == necessidade_id, NecessidadeCompra.empresa_id == empresa_id)
            .first()
        )
        if nec and nec.status == NecessidadeStatus.ABERTA:
            nec.status = NecessidadeStatus.EM_COMPRA
    db.flush()
    return oc


def aplicar_recebimento_oc(
    db: Session,
    *,
    ordem: OrdemCompra,
    recebimentos: list[tuple[int | None, Decimal]],
) -> None:
    """Atualiza qtd_recebida dos itens da OC (produto_id → qtd). Fecha NEC se atendida."""
    by_prod = {i.produto_id: i for i in ordem.itens if i.produto_id}
    for produto_id, qtd in recebimentos:
        if not produto_id or produto_id not in by_prod:
            continue
        item = by_prod[produto_id]
        item.qtd_recebida = dec(item.qtd_recebida + qtd, "0.0001")

    if all(i.qtd_recebida >= i.quantidade for i in ordem.itens):
        ordem.status = OrdemCompraStatus.RECEBIDA
    elif any(i.qtd_recebida > 0 for i in ordem.itens):
        ordem.status = OrdemCompraStatus.PARCIAL
    else:
        return

    if ordem.necessidade_id:
        nec = db.get(NecessidadeCompra, ordem.necessidade_id)
        if nec:
            for ni in nec.itens:
                if ni.produto_id in by_prod:
                    recebido = by_prod[ni.produto_id].qtd_recebida
                    ni.qtd_atendida = dec(min(recebido, ni.quantidade), "0.0001")
            if all(i.qtd_atendida >= i.quantidade for i in nec.itens):
                nec.status = NecessidadeStatus.ATENDIDA
