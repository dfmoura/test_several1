from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    MovementType,
    NfeDuplicata,
    NfeImport,
    NfeItem,
    NfeStatus,
    Payable,
    PayableStatus,
    Product,
    ProductUnit,
    PurchaseOrder,
    PurchaseOrderStatus,
    StockMovement,
    Supplier,
    SupplierProductCode,
)
from ..schemas import NfeAcceptRequest, NfeOut
from ..services.nfe_parser import NfeParseError, parse_nfe_xml
from ..services.stock import compute_measures

router = APIRouter(prefix="/api/nfe", tags=["nfe"])


def _nfe_query():
    return select(NfeImport).options(
        selectinload(NfeImport.items).selectinload(NfeItem.product),
        selectinload(NfeImport.duplicatas),
    )


@router.get("", response_model=list[NfeOut])
def list_nfes(status: str | None = None, db: Session = Depends(get_db)):
    q = _nfe_query().order_by(NfeImport.created_at.desc())
    if status:
        q = q.where(NfeImport.status == NfeStatus(status))
    return db.scalars(q).all()


@router.get("/{nfe_id}", response_model=NfeOut)
def get_nfe(nfe_id: int, db: Session = Depends(get_db)):
    nfe = db.scalar(_nfe_query().where(NfeImport.id == nfe_id))
    if not nfe:
        raise HTTPException(404, "NF-e não encontrada.")
    return nfe


def _get_or_create_supplier(db: Session, parsed) -> Supplier:
    supplier = db.scalar(select(Supplier).where(Supplier.cnpj == parsed.emit_cnpj))
    if supplier:
        return supplier
    end = parsed.emit_endereco
    supplier = Supplier(
        cnpj=parsed.emit_cnpj,
        razao_social=parsed.emit_nome,
        ie=parsed.emit_ie,
        cep=end.get("cep"),
        logradouro=end.get("logradouro"),
        numero=end.get("numero"),
        complemento=end.get("complemento"),
        bairro=end.get("bairro"),
        municipio=end.get("municipio"),
        uf=end.get("uf"),
        telefone=end.get("telefone"),
        observacao="Cadastrado automaticamente via importação de NF-e.",
    )
    db.add(supplier)
    db.flush()
    return supplier


@router.post("/upload", response_model=list[NfeOut])
async def upload_xml(files: list[UploadFile], db: Session = Depends(get_db)):
    """Importa um ou mais XMLs de NF-e. Notas ficam PENDENTES até o aceite."""
    imported: list[int] = []
    errors: list[str] = []

    for file in files:
        content = await file.read()
        try:
            parsed = parse_nfe_xml(content)
        except NfeParseError as exc:
            errors.append(f"{file.filename}: {exc}")
            continue

        if db.scalar(select(NfeImport).where(NfeImport.chave == parsed.chave)):
            errors.append(f"{file.filename}: NF-e {parsed.numero} já importada (chave duplicada).")
            continue

        supplier = _get_or_create_supplier(db, parsed)

        nfe = NfeImport(
            chave=parsed.chave,
            numero=parsed.numero,
            serie=parsed.serie,
            emitida_em=parsed.emitida_em,
            emit_cnpj=parsed.emit_cnpj,
            emit_nome=parsed.emit_nome,
            supplier_id=supplier.id,
            valor_produtos=parsed.valor_produtos,
            valor_total=parsed.valor_total,
            valor_icms=parsed.valor_icms,
            valor_ipi=parsed.valor_ipi,
            xml_filename=file.filename,
            raw_xml=content.decode("utf-8", errors="replace"),
        )
        db.add(nfe)
        db.flush()

        for item in parsed.items:
            # matching automático pelo de/para fornecedor+código
            mapping = db.scalar(
                select(SupplierProductCode).where(
                    SupplierProductCode.supplier_id == supplier.id,
                    SupplierProductCode.codigo_fornecedor == item.codigo_fornecedor,
                )
            )
            db.add(
                NfeItem(
                    nfe_id=nfe.id,
                    n_item=item.n_item,
                    codigo_fornecedor=item.codigo_fornecedor,
                    descricao=item.descricao,
                    ncm=item.ncm,
                    cfop=item.cfop,
                    unidade=item.unidade,
                    quantidade=item.quantidade,
                    valor_unitario=item.valor_unitario,
                    valor_total=item.valor_total,
                    valor_icms=item.valor_icms,
                    valor_ipi=item.valor_ipi,
                    product_id=mapping.product_id if mapping else None,
                )
            )

        for dup in parsed.duplicatas:
            db.add(
                NfeDuplicata(
                    nfe_id=nfe.id, numero=dup.numero, vencimento=dup.vencimento, valor=dup.valor
                )
            )

        imported.append(nfe.id)

    db.commit()

    if not imported and errors:
        raise HTTPException(422, "; ".join(errors))

    result = db.scalars(_nfe_query().where(NfeImport.id.in_(imported))).all()
    return result


@router.post("/{nfe_id}/accept", response_model=NfeOut)
def accept_nfe(nfe_id: int, payload: NfeAcceptRequest, db: Session = Depends(get_db)):
    """Dá o aceite na NF-e: vincula produtos, gera entrada de estoque e contas a pagar."""
    nfe = db.scalar(_nfe_query().where(NfeImport.id == nfe_id))
    if not nfe:
        raise HTTPException(404, "NF-e não encontrada.")
    if nfe.status != NfeStatus.PENDENTE:
        raise HTTPException(409, f"NF-e já está com status {nfe.status.value}.")

    mapping_by_item = {m.item_id: m for m in payload.mappings}
    items_by_id = {i.id: i for i in nfe.items}

    # resolve produto de cada item (existente ou criado agora)
    for item_id, mapping in mapping_by_item.items():
        item = items_by_id.get(item_id)
        if not item:
            raise HTTPException(400, f"Item {item_id} não pertence a esta NF-e.")
        if mapping.create_product:
            data = mapping.create_product
            product = Product(
                sku=data.sku,
                descricao=data.descricao,
                grupo=data.grupo,
                unidade=ProductUnit(data.unidade),
                largura_mm=data.largura_mm,
                comprimento_m=data.comprimento_m,
                gramatura=data.gramatura,
                ncm=data.ncm or item.ncm,
                localizacao=data.localizacao,
                estoque_minimo=data.estoque_minimo,
                observacao=data.observacao,
            )
            db.add(product)
            db.flush()
            item.product_id = product.id
        elif mapping.product_id:
            item.product_id = mapping.product_id

    missing = [i.n_item for i in nfe.items if not i.product_id]
    if missing:
        raise HTTPException(
            422, f"Itens sem produto vinculado: {missing}. Vincule ou cadastre antes do aceite."
        )

    # salva o de/para para matching automático futuro
    for item in nfe.items:
        exists = db.scalar(
            select(SupplierProductCode).where(
                SupplierProductCode.supplier_id == nfe.supplier_id,
                SupplierProductCode.codigo_fornecedor == item.codigo_fornecedor,
            )
        )
        if not exists and nfe.supplier_id:
            db.add(
                SupplierProductCode(
                    supplier_id=nfe.supplier_id,
                    codigo_fornecedor=item.codigo_fornecedor,
                    product_id=item.product_id,
                )
            )

    # entrada de estoque + atualização de custo médio
    for item in nfe.items:
        product = db.get(Product, item.product_id)
        base_qty, qtd_m2, qtd_ml = compute_measures(product, item.quantidade, item.unidade)
        db.add(
            StockMovement(
                product_id=product.id,
                tipo=MovementType.ENTRADA_NFE,
                quantidade=base_qty,
                qtd_m2=qtd_m2,
                qtd_ml=qtd_ml,
                custo_unitario=(item.valor_total / base_qty) if base_qty else None,
                referencia=f"NF-e {nfe.numero} ({nfe.emit_nome})",
                nfe_item_id=item.id,
            )
        )
        if base_qty:
            product.custo_medio = item.valor_total / base_qty

    # financeiro: uma conta a pagar por duplicata
    if payload.gerar_financeiro:
        total_parcelas = len(nfe.duplicatas) or 1
        if nfe.duplicatas:
            for idx, dup in enumerate(nfe.duplicatas, start=1):
                db.add(
                    Payable(
                        supplier_id=nfe.supplier_id,
                        nfe_id=nfe.id,
                        descricao=f"NF-e {nfe.numero} - {nfe.emit_nome}",
                        parcela=f"{idx}/{total_parcelas}",
                        vencimento=dup.vencimento,
                        valor=dup.valor,
                        status=PayableStatus.ABERTO,
                    )
                )
        else:
            db.add(
                Payable(
                    supplier_id=nfe.supplier_id,
                    nfe_id=nfe.id,
                    descricao=f"NF-e {nfe.numero} - {nfe.emit_nome}",
                    parcela="1/1",
                    vencimento=(nfe.emitida_em or datetime.now(timezone.utc)).date(),
                    valor=float(nfe.valor_total),
                    status=PayableStatus.ABERTO,
                )
            )

    if payload.purchase_order_id:
        order = db.get(PurchaseOrder, payload.purchase_order_id)
        if order:
            nfe.purchase_order_id = order.id
            order.status = PurchaseOrderStatus.RECEBIDO

    nfe.status = NfeStatus.ACEITA
    nfe.accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.expire_all()  # garante que a resposta traga os produtos recém-vinculados

    return db.scalar(_nfe_query().where(NfeImport.id == nfe_id))


@router.post("/{nfe_id}/reject", response_model=NfeOut)
def reject_nfe(nfe_id: int, db: Session = Depends(get_db)):
    nfe = db.scalar(_nfe_query().where(NfeImport.id == nfe_id))
    if not nfe:
        raise HTTPException(404, "NF-e não encontrada.")
    if nfe.status != NfeStatus.PENDENTE:
        raise HTTPException(409, f"NF-e já está com status {nfe.status.value}.")
    nfe.status = NfeStatus.REJEITADA
    db.commit()
    return nfe
