"""Avaliação de alertas operacionais — nativo, por escopo, sem Power BI."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import AlertaRegra, Contratacao, ExecucaoColeta, Unidade
from app.enriquecimento.service import contar_pendentes_cnpj
from app.escopo import codigos_uasg_escopo, codigos_uasg_por_filiais


def _cmp(valor: int, operador: str, limiar: int) -> bool:
    if operador == ">=":
        return valor >= limiar
    if operador == ">":
        return valor > limiar
    if operador == "==":
        return valor == limiar
    if operador == "<=":
        return valor <= limiar
    if operador == "<":
        return valor < limiar
    return False


def _metricas(
    db: Session,
    *,
    unidade: Unidade | None,
    escopo_uasgs: list[str] | None,
) -> dict[str, int]:
    ultima = db.scalar(
        select(ExecucaoColeta).order_by(ExecucaoColeta.id.desc()).limit(1)
    )
    coleta_falhas = int(ultima.tarefas_falha) if ultima else 0

    cnpj_pend = contar_pendentes_cnpj(db)

    uasgs = 0 if escopo_uasgs is None else len(escopo_uasgs)
    if escopo_uasgs is None:
        # admin sem unidade: métrica global
        n_contr = int(db.scalar(select(func.count()).select_from(Contratacao)) or 0)
        contratacoes_zeradas = 0  # não aplica sem escopo de UASG
    elif not escopo_uasgs:
        n_contr = 0
        contratacoes_zeradas = 0
    else:
        n_contr = int(
            db.scalar(
                select(func.count())
                .select_from(Contratacao)
                .where(Contratacao.unidade_compradora.in_(escopo_uasgs))
            )
            or 0
        )
        contratacoes_zeradas = 1 if (uasgs > 0 and n_contr == 0) else 0

    return {
        "coleta_falhas": coleta_falhas,
        "cnpj_pendentes": cnpj_pend,
        "contratacoes_zeradas": contratacoes_zeradas,
        "contratacoes": n_contr,
        "uasgs_monitoradas": uasgs if escopo_uasgs is not None else -1,
    }


def listar_regras(db: Session) -> list[AlertaRegra]:
    return list(
        db.scalars(select(AlertaRegra).order_by(AlertaRegra.chave.asc())).all()
    )


def avaliar_alertas(
    db: Session,
    *,
    unidade: Unidade | None,
    ids_filiais: list[int] | None = None,
) -> dict[str, Any]:
    if ids_filiais is not None:
        escopo = codigos_uasg_por_filiais(db, ids_filiais)
    elif unidade is None:
        escopo = None
    else:
        escopo = codigos_uasg_escopo(db, unidade)
    metricas = _metricas(db, unidade=unidade, escopo_uasgs=escopo)
    disparados: list[dict[str, Any]] = []
    ok: list[dict[str, Any]] = []

    for regra in listar_regras(db):
        if not regra.ativo:
            continue
        valor = int(metricas.get(regra.metrica, 0))
        item = {
            "id": regra.id,
            "chave": regra.chave,
            "nome": regra.nome,
            "metrica": regra.metrica,
            "valor": valor,
            "operador": regra.operador,
            "limiar": regra.limiar,
            "severidade": regra.severidade,
            "disparado": _cmp(valor, regra.operador, regra.limiar),
        }
        if item["disparado"]:
            disparados.append(item)
        else:
            ok.append(item)

    return {
        "unidade_id": unidade.id if unidade else None,
        "metricas": metricas,
        "disparados": disparados,
        "ok": ok,
        "total_ativos": len(disparados) + len(ok),
        "power_bi": False,
    }


def atualizar_regra(
    db: Session,
    regra_id: int,
    *,
    limiar: int | None = None,
    ativo: bool | None = None,
    severidade: str | None = None,
) -> AlertaRegra:
    row = db.get(AlertaRegra, regra_id)
    if row is None:
        raise ValueError("Regra não encontrada.")
    if limiar is not None:
        if limiar < 0 or limiar > 1_000_000:
            raise ValueError("Limiar inválido.")
        row.limiar = limiar
    if ativo is not None:
        row.ativo = bool(ativo)
    if severidade is not None:
        sev = severidade.strip().lower()
        if sev not in {"info", "aviso", "alto", "critico"}:
            raise ValueError("Severidade inválida.")
        row.severidade = sev
    db.commit()
    db.refresh(row)
    return row
