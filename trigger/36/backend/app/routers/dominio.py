"""Rotas: empresas, naturezas, patrimônio, devoluções — estudo trigger/32."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, DbDep, require_perms
from app.domain import rbac as R
from app.models import (
    BemCategoria,
    BemPatrimonio,
    BemStatus,
    CobrancaStatus,
    Devolucao,
    DevolucaoStatus,
    DocumentoFiscalSaida,
    Empresa,
    MovTipo,
    NaturezaGerencial,
    Pedido,
    PedidoStatus,
    Produto,
    ProdutoTipo,
    Titulo,
    TituloStatus,
    TituloTipo,
    User,
)
from app.services.codes import apply_stock_move, dec, next_business_code, next_codigo, write_audit
from app.services.naturezas import natureza_valida

router = APIRouter(tags=["dominio-estendido"])


def _require(user: User, *perms: str, any_of: bool = False) -> None:
    from app.domain.rbac import user_has_any, user_has_perm

    ok = user_has_any(user.role, *perms) if any_of else user_has_perm(user.role, *perms)
    if not ok:
        raise HTTPException(403, "Sem permissão")


# =============================================================================
# empresas (cadastro principal multi-CNPJ)
# =============================================================================


@router.get("/empresas")
def list_empresas(db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PARCEIRO_LER, R.PERM_RELATORIOS, R.PERM_PARAMETROS, any_of=True)
    rows = db.query(Empresa).order_by(Empresa.codigo).all()
    return [_emp_out(e, atual=user.empresa_id) for e in rows]


@router.get("/empresas/atual")
def empresa_atual(db: DbDep, user: CurrentUser):
    e = db.get(Empresa, user.empresa_id)
    if not e:
        raise HTTPException(404)
    return _emp_out(e, atual=user.empresa_id)


class EmpresaUpdateIn(BaseModel):
    nome_fantasia: str | None = None
    ativo: bool | None = None
    vende: bool | None = None


@router.patch("/empresas/{eid}")
def update_empresa(
    eid: int,
    body: EmpresaUpdateIn,
    db: DbDep,
    user: Annotated[User, Depends(require_perms(R.PERM_PARAMETROS))],
):
    e = db.get(Empresa, eid)
    if not e:
        raise HTTPException(404)
    if body.nome_fantasia is not None:
        e.nome_fantasia = body.nome_fantasia
    if body.ativo is not None:
        e.ativo = body.ativo
    if body.vende is not None:
        # EMP-00002: só ativa venda com alçada ADMIN + flag explícita
        if e.codigo == "EMP-00002" and body.vende:
            write_audit(
                db,
                empresa_id=user.empresa_id,
                user=user,
                acao="ATIVAR_VENDA_EMP",
                entidade="Empresa",
                entidade_id=e.codigo,
                detalhe={"vende": True, "aviso": "requer parecer contador+direção"},
            )
        e.vende = body.vende
    db.commit()
    db.refresh(e)
    return _emp_out(e, atual=user.empresa_id)


def _emp_out(e: Empresa, atual: int | None = None) -> dict[str, Any]:
    return {
        "id": e.id,
        "codigo": e.codigo,
        "cnpj": e.cnpj,
        "razao_social": e.razao_social,
        "nome_fantasia": e.nome_fantasia,
        "uf": e.uf,
        "ativo": e.ativo,
        "vende": e.vende,
        "inativo_operacional_venda": not e.vende,
        "atual": atual == e.id if atual is not None else False,
        "papel": "OPERACAO_PRINCIPAL" if e.vende else "CADASTRO_SEM_VENDA",
    }


# =============================================================================
# naturezas
# =============================================================================


@router.get("/naturezas")
def list_naturezas(db: DbDep, user: CurrentUser, grupo: int | None = None, so_lancamento: bool = False):
    _require(user, R.PERM_FIN_LER, R.PERM_RELATORIOS, any_of=True)
    q = db.query(NaturezaGerencial).filter(NaturezaGerencial.ativo.is_(True))
    if grupo is not None:
        q = q.filter(NaturezaGerencial.grupo == grupo)
    if so_lancamento:
        q = q.filter(NaturezaGerencial.aceita_lancamento.is_(True))
    rows = q.order_by(NaturezaGerencial.codigo).all()
    return [
        {
            "id": n.id,
            "codigo": n.codigo,
            "descricao": n.descricao,
            "grupo": n.grupo,
            "aceita_lancamento": n.aceita_lancamento,
            "proibido_lai": n.codigo.startswith("9"),
        }
        for n in rows
    ]


# =============================================================================
# patrimônio
# =============================================================================


class BemIn(BaseModel):
    descricao: str
    categoria: str = "MAQUINA"
    marca: str | None = None
    modelo: str | None = None
    numero_serie: str | None = None
    data_aquisicao: str | None = None
    valor_aquisicao: Decimal = Decimal("0")
    local: str | None = None
    responsavel: str | None = None
    status: str = "ATIVO"
    garantia_ate: str | None = None
    natureza_aquisicao: str = "4.01"
    fornecedor_id: int | None = None
    observacao: str | None = None


def _bem_out(b: BemPatrimonio) -> dict:
    return {
        "id": b.id,
        "codigo": b.codigo,
        "descricao": b.descricao,
        "categoria": b.categoria.value,
        "marca": b.marca,
        "modelo": b.modelo,
        "numero_serie": b.numero_serie,
        "data_aquisicao": b.data_aquisicao,
        "valor_aquisicao": b.valor_aquisicao,
        "local": b.local,
        "responsavel": b.responsavel,
        "status": b.status.value,
        "garantia_ate": b.garantia_ate,
        "natureza_aquisicao": b.natureza_aquisicao,
        "fornecedor_id": b.fornecedor_id,
        "observacao": b.observacao,
        "created_at": b.created_at,
    }


@router.get("/patrimonio")
def list_patrimonio(db: DbDep, user: CurrentUser):
    _require(user, R.PERM_RELATORIOS, R.PERM_PROD_LER, R.PERM_FIN_LER, any_of=True)
    rows = (
        db.query(BemPatrimonio)
        .filter(BemPatrimonio.empresa_id == user.empresa_id)
        .order_by(BemPatrimonio.codigo)
        .all()
    )
    return [_bem_out(b) for b in rows]


@router.post("/patrimonio", status_code=201)
def create_bem(body: BemIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PARAMETROS, R.PERM_FIN_WRITE, any_of=True)
    if body.natureza_aquisicao.startswith("9") or not natureza_valida(db, body.natureza_aquisicao):
        raise HTTPException(400, "Natureza inválida ou LAI/9.xx proibida")
    seq = next_codigo(db, user.empresa_id, BemPatrimonio, width=5)
    codigo = f"BEM-{seq}"
    from datetime import date as date_cls

    da = date_cls.fromisoformat(body.data_aquisicao) if body.data_aquisicao else None
    ga = date_cls.fromisoformat(body.garantia_ate) if body.garantia_ate else None
    b = BemPatrimonio(
        empresa_id=user.empresa_id,
        codigo=codigo,
        descricao=body.descricao,
        categoria=BemCategoria(body.categoria),
        marca=body.marca,
        modelo=body.modelo,
        numero_serie=body.numero_serie,
        data_aquisicao=da,
        valor_aquisicao=dec(body.valor_aquisicao),
        local=body.local,
        responsavel=body.responsavel,
        status=BemStatus(body.status),
        garantia_ate=ga,
        natureza_aquisicao=body.natureza_aquisicao,
        fornecedor_id=body.fornecedor_id,
        observacao=body.observacao,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _bem_out(b)


@router.patch("/patrimonio/{bid}")
def update_bem(bid: int, body: BemIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PARAMETROS, R.PERM_FIN_WRITE, any_of=True)
    b = (
        db.query(BemPatrimonio)
        .filter(BemPatrimonio.id == bid, BemPatrimonio.empresa_id == user.empresa_id)
        .first()
    )
    if not b:
        raise HTTPException(404)
    from datetime import date as date_cls

    b.descricao = body.descricao
    b.categoria = BemCategoria(body.categoria)
    b.marca = body.marca
    b.modelo = body.modelo
    b.numero_serie = body.numero_serie
    b.data_aquisicao = date_cls.fromisoformat(body.data_aquisicao) if body.data_aquisicao else None
    b.valor_aquisicao = dec(body.valor_aquisicao)
    b.local = body.local
    b.responsavel = body.responsavel
    b.status = BemStatus(body.status)
    b.garantia_ate = date_cls.fromisoformat(body.garantia_ate) if body.garantia_ate else None
    b.natureza_aquisicao = body.natureza_aquisicao
    b.fornecedor_id = body.fornecedor_id
    b.observacao = body.observacao
    db.commit()
    db.refresh(b)
    return _bem_out(b)


# =============================================================================
# devoluções
# =============================================================================


class DevolucaoIn(BaseModel):
    pedido_id: int
    motivo: str = Field(min_length=5)
    valor: Decimal | None = None
    observacao: str | None = None
    estado_mercadoria: str = "INTEGRO"  # INTEGRO | AVARIADO


def _dev_out(d: Devolucao) -> dict:
    return {
        "id": d.id,
        "codigo": d.codigo,
        "pedido_id": d.pedido_id,
        "documento_fiscal_id": d.documento_fiscal_id,
        "parceiro_id": d.parceiro_id,
        "status": d.status.value,
        "motivo": d.motivo,
        "valor": d.valor,
        "natureza_codigo": d.natureza_codigo,
        "nf_devolucao_chave": d.nf_devolucao_chave,
        "nf_devolucao_numero": d.nf_devolucao_numero,
        "titulo_estorno_id": d.titulo_estorno_id,
        "itens": d.itens or [],
        "observacao": d.observacao,
        "concluida_em": d.concluida_em,
        "created_at": d.created_at,
    }


@router.get("/devolucoes")
def list_devolucoes(db: DbDep, user: CurrentUser):
    _require(user, R.PERM_FISCAL_LER, R.PERM_FIN_LER, R.PERM_PEDIDO_LER, any_of=True)
    rows = (
        db.query(Devolucao)
        .filter(Devolucao.empresa_id == user.empresa_id)
        .order_by(Devolucao.id.desc())
        .limit(200)
        .all()
    )
    return [_dev_out(d) for d in rows]


@router.post("/devolucoes", status_code=201)
def criar_devolucao(body: DevolucaoIn, db: DbDep, user: CurrentUser):
    """Abre DEV e conclui fluxo HML: estoque + estorno título + NF devolução simulada."""
    _require(user, R.PERM_FISCAL_EMITIR, R.PERM_FIN_WRITE, any_of=True)
    ped = db.query(Pedido).filter(Pedido.id == body.pedido_id, Pedido.empresa_id == user.empresa_id).first()
    if not ped:
        raise HTTPException(404, "Pedido não encontrado")
    if ped.status not in (
        PedidoStatus.FATURADO,
        PedidoStatus.FATURADO_PARCIAL,
        PedidoStatus.ENTREGUE,
        PedidoStatus.ENCERRADO,
    ):
        raise HTTPException(400, f"Pedido {ped.status.value} não admite devolução de venda")

    doc = (
        db.query(DocumentoFiscalSaida)
        .filter(DocumentoFiscalSaida.pedido_id == ped.id)
        .order_by(DocumentoFiscalSaida.id.desc())
        .first()
    )
    valor = dec(body.valor if body.valor is not None else ped.valor_total)

    d = Devolucao(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "DEV", Devolucao),
        pedido_id=ped.id,
        documento_fiscal_id=doc.id if doc else None,
        parceiro_id=ped.parceiro_id,
        status=DevolucaoStatus.PENDENTE,
        motivo=body.motivo.strip(),
        valor=valor,
        natureza_codigo="1.02.01",
        itens=[
            {
                "descricao": "Devolução total/parcial",
                "valor": str(valor),
                "estado": body.estado_mercadoria,
            }
        ],
        observacao=body.observacao,
        nf_devolucao_numero=str(9000 + ped.id),
        nf_devolucao_chave=f"DEV{ped.codigo.replace('-', '')}",
    )
    db.add(d)
    db.flush()

    # 1) Estoque — entrada devolução se íntegro
    if body.estado_mercadoria.upper() == "INTEGRO":
        pa = (
            db.query(Produto)
            .filter(
                Produto.empresa_id == user.empresa_id,
                Produto.tipo == ProdutoTipo.ACABADO,
                Produto.ativo.is_(True),
            )
            .order_by(Produto.id)
            .first()
        )
        if pa:
            q = Decimal(ped.quantidade or 0) or Decimal("1")
            # proporcional se valor parcial
            if ped.valor_total and valor < ped.valor_total:
                q = dec(q * (valor / ped.valor_total), "0.0001")
            try:
                apply_stock_move(
                    db,
                    empresa_id=user.empresa_id,
                    produto=pa,
                    tipo=MovTipo.ENTRADA_DEVOLUCAO,
                    quantidade=q,
                    custo_unitario=pa.custo_medio or Decimal("0"),
                    documento_ref=d.codigo,
                    observacao=f"Devolução {d.codigo}",
                    pedido_id=ped.id,
                    devolucao_id=d.id,
                )
            except ValueError:
                pass

    # 2) Financeiro — cancela/abate TIT aberto ou gera crédito
    titulos = (
        db.query(Titulo)
        .filter(
            Titulo.pedido_id == ped.id,
            Titulo.tipo == TituloTipo.RECEBER,
            Titulo.status.in_([TituloStatus.ABERTO, TituloStatus.PARCIAL]),
        )
        .all()
    )
    resto = valor
    for t in titulos:
        if resto <= 0:
            break
        abate = min(resto, t.valor_aberto)
        t.valor_aberto = dec(t.valor_aberto - abate)
        t.status = TituloStatus.BAIXADO if t.valor_aberto == 0 else TituloStatus.PARCIAL
        for c in t.cobrancas:
            if t.status == TituloStatus.BAIXADO:
                c.status = CobrancaStatus.CANCELADA
        resto = dec(resto - abate)

    if resto > 0:
        # já recebido — gera crédito (título negativo / a pagar ao cliente) natureza 1.02.01
        credito = Titulo(
            empresa_id=user.empresa_id,
            codigo=next_business_code(db, "TIT", Titulo),
            tipo=TituloTipo.PAGAR,
            status=TituloStatus.ABERTO,
            parceiro_id=ped.parceiro_id,
            pedido_id=ped.id,
            descricao=f"Crédito devolução {d.codigo}",
            valor=resto,
            valor_aberto=resto,
            vencimento=datetime.utcnow().date(),
            natureza_codigo="1.02.01",
        )
        db.add(credito)
        db.flush()
        d.titulo_estorno_id = credito.id
    elif titulos:
        d.titulo_estorno_id = titulos[0].id

    d.status = DevolucaoStatus.CONCLUIDA
    d.concluida_em = datetime.utcnow()

    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="DEVOLUCAO_CONCLUIDA",
        entidade="Devolucao",
        entidade_id=d.codigo,
        detalhe={"pedido": ped.codigo, "valor": str(valor), "natureza": "1.02.01"},
    )
    db.commit()
    db.refresh(d)
    return _dev_out(d)
