from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.acompanhamento import mapa_observadores
from app.formato import data_exibicao, dinheiro_exibicao
from app.models import (
    AtaPncp,
    ColetaCursor,
    ColetaEtapa,
    ColetaJob,
    Contratacao,
    ContratacaoItem,
    ContratoPncp,
    Filial,
    FilialUasg,
    ResultadoItem,
    Acompanhamento,
)
from app.regras import rotulo_modalidade, vinculo_compra
from app.tempo import agora_negocio


def resolver_periodo(de: str | None, ate: str | None) -> tuple[date, date]:
    hoje = agora_negocio().date()
    if not de and not ate:
        return date(hoje.year, 1, 1), date(hoje.year, 12, 31)
    inicio = date.fromisoformat(de) if de else date(hoje.year, 1, 1)
    fim = date.fromisoformat(ate) if ate else hoje
    if fim < inicio:
        inicio, fim = fim, inicio
    return inicio, fim


def _soma(valores: list[Decimal | None]) -> Decimal:
    total = Decimal("0")
    for valor in valores:
        if valor is not None:
            total += valor
    return total


def _anexar_observador(db: Session, linhas: list[dict]) -> list[dict]:
    mapa = mapa_observadores(db, [linha["numero_controle_pncp"] for linha in linhas])
    for linha in linhas:
        pessoa = mapa.get(linha["numero_controle_pncp"], {})
        linha["observador_id"] = pessoa.get("id", "")
        linha["observador_nome"] = pessoa.get("nome", "")
    return linhas


def _delta(estimado: Decimal | None, homologado: Decimal | None) -> tuple[str, str]:
    if estimado is None or homologado is None:
        return "", ""
    diferenca = homologado - estimado
    if estimado == 0:
        return dinheiro_exibicao(diferenca), ""
    percentual = (diferenca / estimado * Decimal(100)).quantize(Decimal("0.1"))
    return dinheiro_exibicao(diferenca), f"{percentual}".replace(".", ",") + "%"


def _recortes(contratacoes: list[Contratacao]) -> dict:
    por_uasg: dict[str, int] = {}
    por_modalidade: dict[tuple[int | None, str], int] = {}
    por_situacao: dict[str, int] = {}
    for compra in contratacoes:
        por_uasg[compra.codigo_uasg] = por_uasg.get(compra.codigo_uasg, 0) + 1
        nome = rotulo_modalidade(compra.modalidade_nome, compra.codigo_modalidade) or "sem modalidade"
        chave = (compra.codigo_modalidade, nome)
        por_modalidade[chave] = por_modalidade.get(chave, 0) + 1
        situacao = compra.situacao or "sem situação"
        por_situacao[situacao] = por_situacao.get(situacao, 0) + 1
    return {
        "por_uasg": [
            {"codigo_uasg": codigo, "total": total}
            for codigo, total in sorted(por_uasg.items(), key=lambda item: (-item[1], item[0]))
        ],
        "por_modalidade": [
            {"codigo": codigo, "nome": nome, "total": total}
            for (codigo, nome), total in sorted(por_modalidade.items(), key=lambda item: (-item[1], item[0][1]))
        ],
        "por_situacao": [
            {"situacao": situacao, "total": total}
            for situacao, total in sorted(por_situacao.items(), key=lambda item: (-item[1], item[0]))
        ],
    }


def _contratacao(row: Contratacao) -> dict:
    return {
        "id": str(row.id),
        "numero_controle_pncp": row.numero_controle_pncp,
        "codigo_uasg": row.codigo_uasg,
        "objeto": row.objeto,
        "modalidade_nome": rotulo_modalidade(row.modalidade_nome, row.codigo_modalidade),
        "codigo_modalidade": row.codigo_modalidade,
        "modalidade_id_pncp": row.modalidade_id_pncp,
        "situacao": row.situacao,
        "valor_estimado": dinheiro_exibicao(row.valor_estimado),
        "valor_homologado": dinheiro_exibicao(row.valor_homologado),
        "data_publicacao": data_exibicao(row.data_publicacao),
        "aberta": row.aberta,
    }


def _instrumento(row, tipo: str) -> dict:
    estado = vinculo_compra(row.numero_controle_pncp_compra)
    return {
        "id": str(row.id),
        "tipo": tipo,
        "numero_controle_pncp": row.numero_controle_pncp,
        "numero_controle_pncp_compra": row.numero_controle_pncp_compra or "",
        "vinculo": estado,
        "vinculo_rotulo": "não vinculado" if estado == "nao_vinculado" else "vinculado",
        "objeto": row.objeto,
        "valor": dinheiro_exibicao(row.valor),
        "data_assinatura": data_exibicao(row.data_assinatura),
        "cnpj_orgao": row.cnpj_orgao,
        "codigo_uasg": row.codigo_uasg,
    }


def painel(db: Session, inicio: date, fim: date) -> dict:
    contratacoes = db.scalars(
        select(Contratacao).where(
            Contratacao.data_publicacao.is_(None)
            | Contratacao.data_publicacao.between(inicio, fim)
        )
    ).all()
    janela_contrato = ContratoPncp.data_assinatura.is_(None) | ContratoPncp.data_assinatura.between(inicio, fim)
    janela_ata = AtaPncp.data_assinatura.is_(None) | AtaPncp.data_assinatura.between(inicio, fim)
    contratos = db.scalars(select(ContratoPncp).where(janela_contrato)).all()
    atas = db.scalars(select(AtaPncp).where(janela_ata)).all()
    uasgs = {c.codigo_uasg for c in contratacoes}
    return {
        "periodo": {"de": data_exibicao(inicio), "ate": data_exibicao(fim)},
        "contratacoes": len(contratacoes),
        "valor_estimado": dinheiro_exibicao(_soma([c.valor_estimado for c in contratacoes])),
        "valor_homologado": dinheiro_exibicao(_soma([c.valor_homologado for c in contratacoes])),
        "contratos": len(contratos),
        "atas": len(atas),
        "uasgs_com_movimento": len(uasgs),
        "uasgs_aderidas": int(
            db.scalar(
                select(func.count()).select_from(FilialUasg).where(FilialUasg.aderida.is_(True))
            )
            or 0
        ),
        "itens": int(
            db.scalar(
                select(func.count())
                .select_from(ContratacaoItem)
                .where(
                    ContratacaoItem.numero_controle_pncp.in_(
                        [c.numero_controle_pncp for c in contratacoes] or ["__vazio__"]
                    )
                )
            )
            or 0
        ),
        "resultados": int(
            db.scalar(
                select(func.count())
                .select_from(ResultadoItem)
                .where(
                    ResultadoItem.numero_controle_pncp.in_(
                        [c.numero_controle_pncp for c in contratacoes] or ["__vazio__"]
                    )
                )
            )
            or 0
        ),
        **_recortes(contratacoes),
    }


def listar_contratacoes(db: Session, inicio: date, fim: date, filtros: dict) -> list[dict]:
    q = select(Contratacao).where(
        Contratacao.data_publicacao.is_(None) | Contratacao.data_publicacao.between(inicio, fim)
    )
    if filtros.get("uasg"):
        q = q.where(Contratacao.codigo_uasg == filtros["uasg"])
    if filtros.get("codigo_modalidade") not in (None, ""):
        try:
            codigo = int(filtros["codigo_modalidade"])
        except (TypeError, ValueError):
            codigo = -1
        q = q.where(Contratacao.codigo_modalidade == codigo)
    if filtros.get("situacao"):
        q = q.where(Contratacao.situacao.ilike(f"%{filtros['situacao']}%"))
    if filtros.get("objeto"):
        q = q.where(Contratacao.objeto.ilike(f"%{filtros['objeto']}%"))
    if filtros.get("fornecedor"):
        texto = f"%{filtros['fornecedor']}%"
        numeros = select(ResultadoItem.numero_controle_pncp).where(
            or_(
                ResultadoItem.nome_fornecedor.ilike(texto),
                ResultadoItem.ni_fornecedor.ilike(texto),
            )
        )
        q = q.where(Contratacao.numero_controle_pncp.in_(numeros))
    if filtros.get("observador") == "sem":
        vinculados = select(Acompanhamento.alvo_chave).where(Acompanhamento.alvo_tipo == "contratacao")
        q = q.where(Contratacao.numero_controle_pncp.not_in(vinculados))
    elif filtros.get("observador"):
        try:
            observador_id = uuid.UUID(str(filtros["observador"]))
        except ValueError:
            observador_id = uuid.UUID(int=0)
        vinculados = select(Acompanhamento.alvo_chave).where(
            Acompanhamento.alvo_tipo == "contratacao",
            Acompanhamento.observador_id == observador_id,
        )
        q = q.where(Contratacao.numero_controle_pncp.in_(vinculados))
    q = q.order_by(Contratacao.data_publicacao.desc().nullslast(), Contratacao.numero_controle_pncp)
    return _anexar_observador(db, [_contratacao(row) for row in db.scalars(q).all()])


def detalhe_contratacao(db: Session, contratacao_id: uuid.UUID) -> dict | None:
    row = db.get(Contratacao, contratacao_id)
    if row is None:
        return None
    itens = db.scalars(
        select(ContratacaoItem)
        .where(ContratacaoItem.numero_controle_pncp == row.numero_controle_pncp)
        .order_by(ContratacaoItem.numero_item)
    ).all()
    resultados = db.scalars(
        select(ResultadoItem)
        .where(ResultadoItem.numero_controle_pncp == row.numero_controle_pncp)
        .order_by(ResultadoItem.numero_item)
    ).all()
    corpo = _contratacao(row)
    delta_valor, delta_percentual = _delta(row.valor_estimado, row.valor_homologado)
    corpo["delta_valor"] = delta_valor
    corpo["delta_percentual"] = delta_percentual
    _anexar_observador(db, [corpo])
    corpo["itens"] = [
        {
            "numero_item": item.numero_item,
            "descricao": item.descricao,
            "descricao_detalhada": item.descricao_detalhada,
            "quantidade": "" if item.quantidade is None else str(item.quantidade).replace(".", ","),
            "unidade_medida": item.unidade_medida,
            "valor_unitario": dinheiro_exibicao(item.valor_unitario),
            "material_ou_servico": item.material_ou_servico,
            "situacao_item": item.situacao_item,
            "tem_resultado": item.tem_resultado,
            "valor_total": dinheiro_exibicao(item.valor_total),
            "nome_fornecedor": item.nome_fornecedor,
        }
        for item in itens
    ]
    corpo["resultados"] = [
        {
            "numero_item": resultado.numero_item,
            "ni_fornecedor": resultado.ni_fornecedor,
            "nome_fornecedor": resultado.nome_fornecedor,
            "valor": dinheiro_exibicao(resultado.valor),
            "data_resultado": data_exibicao(resultado.data_resultado),
        }
        for resultado in resultados
    ]
    return corpo


def listar_instrumentos(db: Session, modelo, tipo: str, inicio: date, fim: date, filtros: dict) -> list[dict]:
    q = select(modelo).where(
        modelo.data_assinatura.is_(None) | modelo.data_assinatura.between(inicio, fim)
    )
    if filtros.get("uasg"):
        q = q.where(modelo.codigo_uasg == filtros["uasg"])
    if filtros.get("objeto"):
        q = q.where(modelo.objeto.ilike(f"%{filtros['objeto']}%"))
    vinculo = filtros.get("vinculo") or ""
    if vinculo == "nao_vinculado":
        q = q.where(
            or_(modelo.numero_controle_pncp_compra.is_(None), modelo.numero_controle_pncp_compra == "")
        )
    elif vinculo == "vinculado":
        q = q.where(
            modelo.numero_controle_pncp_compra.is_not(None),
            modelo.numero_controle_pncp_compra != "",
        )
    q = q.order_by(modelo.numero_controle_pncp)
    return [_instrumento(row, tipo) for row in db.scalars(q).all()]


def resumo_coleta(db: Session, filial_id: uuid.UUID) -> dict:
    job = db.scalar(
        select(ColetaJob)
        .where(ColetaJob.filial_id == filial_id)
        .order_by(ColetaJob.noite.desc(), ColetaJob.faixa)
    )
    if job is None:
        return {"status": "sem coleta", "motivo": "", "etapas": [], "cursor": ""}
    etapas = db.scalars(select(ColetaEtapa).where(ColetaEtapa.job_id == job.id)).all()
    cursor = db.scalar(
        select(ColetaCursor)
        .where(ColetaCursor.filial_id == filial_id)
        .order_by(ColetaCursor.atualizado_em.desc())
    )
    return {
        "id": str(job.id),
        "faixa": job.faixa,
        "tipo": job.tipo,
        "noite": data_exibicao(job.noite),
        "status": job.status,
        "motivo": job.motivo,
        "cursor": (
            f"{cursor.codigo_uasg} {cursor.tipo} pág. {cursor.pagina}" if cursor else ""
        ),
        "etapas": [
            {
                "codigo": etapa.codigo,
                "status": etapa.status,
                "mensagens": [linha for linha in etapa.mensagem.splitlines() if linha][-15:],
            }
            for etapa in etapas
        ],
    }


def consolidado(db: Session, inicio: date, fim: date) -> dict:
    filiais = db.scalars(select(Filial).order_by(Filial.municipio)).all()
    adesoes = db.scalars(select(FilialUasg).where(FilialUasg.aderida.is_(True))).all()
    contratacoes = db.scalars(
        select(Contratacao).where(
            Contratacao.data_publicacao.is_(None)
            | Contratacao.data_publicacao.between(inicio, fim)
        )
    ).all()
    contratos = db.scalars(select(ContratoPncp)).all()
    linhas = []
    suspensas = []
    totais = {"contratacoes": 0, "valor_homologado": Decimal("0"), "contratos": 0}
    for filial in filiais:
        codigos = {a.codigo_uasg for a in adesoes if a.tenant_id == filial.id}
        suas = [c for c in contratacoes if c.codigo_uasg in codigos]
        seus_contratos = [c for c in contratos if c.codigo_uasg in codigos or c.tenant_id == filial.id]
        job = db.scalar(
            select(ColetaJob)
            .where(ColetaJob.filial_id == filial.id)
            .order_by(ColetaJob.noite.desc())
        )
        linha = {
            "id": str(filial.id),
            "nome": filial.nome,
            "municipio": filial.municipio,
            "uf": filial.uf,
            "situacao": filial.situacao,
            "uasgs_aderidas": len(codigos),
            "contratacoes": len(suas),
            "valor_homologado": dinheiro_exibicao(_soma([c.valor_homologado for c in suas])),
            "contratos": len(seus_contratos),
            "ultima_coleta": job.status if job else "sem coleta",
        }
        if filial.situacao != "ativa":
            suspensas.append(linha)
            continue
        linhas.append(linha)
        totais["contratacoes"] += len(suas)
        totais["valor_homologado"] += _soma([c.valor_homologado for c in suas])
        totais["contratos"] += len(seus_contratos)
    return {
        "periodo": {"de": data_exibicao(inicio), "ate": data_exibicao(fim)},
        "totais": {
            "contratacoes": totais["contratacoes"],
            "valor_homologado": dinheiro_exibicao(totais["valor_homologado"]),
            "contratos": totais["contratos"],
        },
        "filiais": linhas,
        "suspensas": suspensas,
    }
