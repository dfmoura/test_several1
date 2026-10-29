"""Motor de coleta — executa plano com 1 sequência HTTP por UASG; falhas recuperáveis."""

from __future__ import annotations

import json
import threading
from datetime import date, datetime, timezone
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.coleta.planejador import PlanoColeta, planejar_coleta
from app.compras.sync_contratacoes import sincronizar_contratacoes_uasg
from app.database import ExecucaoColeta, TarefaColeta

# Uma execução por vez no processo (SQLite + rate limit Compras.gov).
_LOCK = threading.Lock()

SyncFn = Callable[..., dict[str, Any]]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ColetaError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _criar_tarefas(db: Session, execucao: ExecucaoColeta, plano: PlanoColeta) -> list[TarefaColeta]:
    tarefas: list[TarefaColeta] = []
    for nec in plano.necessidades:
        t = TarefaColeta(
            execucao_id=execucao.id,
            codigo_uasg=nec.codigo_uasg,
            uasg_id=nec.uasg_id,
            modulo=plano.modulo,
            data_inicial=plano.data_inicial.isoformat(),
            data_final=plano.data_final.isoformat(),
            situacao="pendente",
            filiais_json=json.dumps(
                {
                    "ids": list(nec.filiais_ids),
                    "nomes": list(nec.filiais_nomes),
                },
                ensure_ascii=False,
            ),
        )
        db.add(t)
        tarefas.append(t)
    execucao.total_tarefas = len(tarefas)
    db.flush()
    return tarefas


def iniciar_execucao(
    db: Session,
    *,
    plano: PlanoColeta | None = None,
    origem: str = "manual",
    usuario_id: int | None = None,
    periodo_dias: int = 365,
    data_inicial: date | None = None,
    data_final: date | None = None,
    organizacao_id: int | None = None,
    codigo_uasg: str | None = None,
) -> ExecucaoColeta:
    """Cria execução + tarefas deduplicadas (ainda sem HTTP)."""
    if plano is None:
        plano = planejar_coleta(
            db,
            data_inicial=data_inicial,
            data_final=data_final,
            periodo_dias=periodo_dias,
            organizacao_id=organizacao_id,
            codigo_uasg=codigo_uasg,
        )
    if not plano.necessidades:
        alvo = (codigo_uasg or "").strip()
        if alvo:
            raise ColetaError(
                f"UASG {alvo} não está em monitoramento ativo para coletar."
            )
        raise ColetaError("Nenhuma UASG monitorada ativa para coletar.")

    exe = ExecucaoColeta(
        origem=origem,
        modulo=plano.modulo,
        situacao="pendente",
        data_inicial=plano.data_inicial.isoformat(),
        data_final=plano.data_final.isoformat(),
        usuario_id=usuario_id,
        resumo=json.dumps(
            {
                "total_uasgs_unicas": plano.total_uasgs_unicas,
                "total_vinculos_filial": plano.total_vinculos_filial,
                "dedupe_economia": max(
                    0, plano.total_vinculos_filial - plano.total_uasgs_unicas
                ),
            },
            ensure_ascii=False,
        ),
    )
    db.add(exe)
    db.flush()
    _criar_tarefas(db, exe, plano)
    db.commit()
    db.refresh(exe)
    return exe


def _rodar_tarefa(
    db: Session,
    tarefa: TarefaColeta,
    *,
    sync_fn: SyncFn,
    sync_kwargs: dict[str, Any] | None,
) -> None:
    tarefa.situacao = "em_execucao"
    tarefa.iniciado_em = _utcnow()
    tarefa.tentativas = (tarefa.tentativas or 0) + 1
    tarefa.erro = None
    db.commit()

    kwargs = {
        "codigo_uasg": tarefa.codigo_uasg,
        "data_inicial": date.fromisoformat(tarefa.data_inicial),
        "data_final": date.fromisoformat(tarefa.data_final),
    }
    if sync_kwargs:
        kwargs.update(sync_kwargs)

    try:
        resultado = sync_fn(db, **kwargs)
        tarefa.contadores_json = json.dumps(resultado, ensure_ascii=False, default=str)
        tarefa.situacao = "concluida"
        tarefa.erro = None
    except Exception as exc:  # noqa: BLE001 — falha parcial recuperável
        tarefa.situacao = "falha"
        tarefa.erro = str(exc)[:2000]
    finally:
        tarefa.terminado_em = _utcnow()
        db.commit()


def _enriquecer_apos_coleta(
    db: Session,
    *,
    on_log: Callable[[str], None],
    execucao_id: int | None = None,
) -> None:
    """Fase 2 CNPJ pós-coleta — fora do lock; nunca altera situação da execução 07."""
    from app.enriquecimento.service import (
        ate_hora_pos_coleta,
        descanso_pos_coleta_sec,
        limite_pos_coleta,
        max_sec_pos_coleta,
        tentar_enriquecer_pos_coleta,
    )

    lim = limite_pos_coleta(db)
    if lim <= 0:
        return
    teto = max_sec_pos_coleta()
    teto_txt = f", máx. {int(teto)}s/lote" if teto > 0 else ""
    on_log(
        f"Enriquecimento pós-coleta (lotes de {lim} CNPJ{teto_txt}, "
        f"até {ate_hora_pos_coleta()} BRT, descanso {int(descanso_pos_coleta_sec())}s)…"
    )
    result = tentar_enriquecer_pos_coleta(
        db,
        limit=lim,
        max_sec=teto,
        execucao_coleta_id=execucao_id,
    )
    if result.get("pulado"):
        return
    on_log(
        "Pós-coleta CNPJ: "
        f"{result.get('ok_count', 0)} ok / {result.get('erros', 0)} erro(s) "
        f"de {result.get('total', 0)}"
        f" · lotes={result.get('lotes', 0)}"
        f" · parada={result.get('motivo_parada') or '—'}"
    )


def executar_lote(
    db: Session,
    execucao_id: int,
    *,
    sync_fn: SyncFn | None = None,
    sync_kwargs: dict[str, Any] | None = None,
    apenas_falhas: bool = False,
    on_log: Callable[[str], None] | None = None,
) -> ExecucaoColeta:
    """Executa tarefas pendentes (ou só falhas) — 1 sync por UASG."""
    log = on_log or (lambda _: None)
    fn = sync_fn or sincronizar_contratacoes_uasg

    if not _LOCK.acquire(blocking=False):
        raise ColetaError("Já existe uma coleta em andamento neste processo.", 409)

    exe_out: ExecucaoColeta | None = None
    try:
        exe = db.scalar(
            select(ExecucaoColeta)
            .where(ExecucaoColeta.id == execucao_id)
            .options(joinedload(ExecucaoColeta.tarefas))
        )
        if exe is None:
            raise ColetaError("Execução não encontrada.", 404)

        exe.situacao = "em_execucao"
        exe.iniciado_em = exe.iniciado_em or _utcnow()
        db.commit()

        alvos = [
            t
            for t in exe.tarefas
            if (apenas_falhas and t.situacao == "falha")
            or (not apenas_falhas and t.situacao in ("pendente", "falha"))
        ]
        # reprocesso: resetar falhas para pendente lógico via _rodar_tarefa
        sequencias = 0
        for tarefa in sorted(alvos, key=lambda x: x.codigo_uasg):
            log(f"Tarefa UASG {tarefa.codigo_uasg} …")
            _rodar_tarefa(db, tarefa, sync_fn=fn, sync_kwargs=sync_kwargs)
            sequencias += 1

        db.refresh(exe)
        tarefas = list(
            db.scalars(
                select(TarefaColeta).where(TarefaColeta.execucao_id == exe.id)
            ).all()
        )
        ok = sum(1 for t in tarefas if t.situacao == "concluida")
        falha = sum(1 for t in tarefas if t.situacao == "falha")
        pend = sum(1 for t in tarefas if t.situacao == "pendente")

        exe.tarefas_ok = ok
        exe.tarefas_falha = falha
        exe.sequencias_http = sequencias if not apenas_falhas else (exe.sequencias_http or 0) + sequencias
        exe.terminado_em = _utcnow()

        if falha and ok:
            exe.situacao = "concluida_com_ressalvas"
        elif falha and not ok:
            exe.situacao = "falha"
        elif pend:
            exe.situacao = "em_execucao"
        else:
            exe.situacao = "concluida"

        db.commit()
        db.refresh(exe)
        exe_out = exe
        return exe
    finally:
        _LOCK.release()
        # Após liberar o lock da coleta — fase 2 não bloqueia novo lote 07.
        if exe_out is not None:
            try:
                _enriquecer_apos_coleta(db, on_log=log, execucao_id=exe_out.id)
            except Exception as exc:  # noqa: BLE001 — isolamento absoluto da 07
                log(f"Pós-coleta CNPJ ignorado: {exc}")


def planejar_e_executar(
    db: Session,
    *,
    origem: str = "manual",
    usuario_id: int | None = None,
    periodo_dias: int = 365,
    data_inicial: date | None = None,
    data_final: date | None = None,
    organizacao_id: int | None = None,
    codigo_uasg: str | None = None,
    sync_fn: SyncFn | None = None,
    sync_kwargs: dict[str, Any] | None = None,
    on_log: Callable[[str], None] | None = None,
) -> ExecucaoColeta:
    """Atalho: planeja (com dedupe) + executa o lote."""
    plano = planejar_coleta(
        db,
        data_inicial=data_inicial,
        data_final=data_final,
        periodo_dias=periodo_dias,
        organizacao_id=organizacao_id,
        codigo_uasg=codigo_uasg,
    )
    exe = iniciar_execucao(
        db,
        plano=plano,
        origem=origem,
        usuario_id=usuario_id,
        codigo_uasg=codigo_uasg,
    )
    return executar_lote(
        db,
        exe.id,
        sync_fn=sync_fn,
        sync_kwargs=sync_kwargs,
        on_log=on_log,
    )


def reprocessar_falhas(
    db: Session,
    execucao_id: int,
    *,
    sync_fn: SyncFn | None = None,
    sync_kwargs: dict[str, Any] | None = None,
) -> ExecucaoColeta:
    return executar_lote(
        db,
        execucao_id,
        sync_fn=sync_fn,
        sync_kwargs=sync_kwargs,
        apenas_falhas=True,
    )


def execucao_para_dict(exe: ExecucaoColeta, *, com_tarefas: bool = True) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": exe.id,
        "origem": exe.origem,
        "modulo": exe.modulo,
        "situacao": exe.situacao,
        "data_inicial": exe.data_inicial,
        "data_final": exe.data_final,
        "iniciado_em": exe.iniciado_em.isoformat() if exe.iniciado_em else None,
        "terminado_em": exe.terminado_em.isoformat() if exe.terminado_em else None,
        "total_tarefas": exe.total_tarefas,
        "tarefas_ok": exe.tarefas_ok,
        "tarefas_falha": exe.tarefas_falha,
        "sequencias_http": exe.sequencias_http,
        "resumo": json.loads(exe.resumo) if exe.resumo else None,
        "criado_em": exe.criado_em.isoformat() if exe.criado_em else None,
    }
    if com_tarefas:
        tarefas = exe.tarefas or []
        out["tarefas"] = [
            {
                "id": t.id,
                "codigo_uasg": t.codigo_uasg,
                "modulo": t.modulo,
                "situacao": t.situacao,
                "tentativas": t.tentativas,
                "filiais": json.loads(t.filiais_json) if t.filiais_json else None,
                "contadores": json.loads(t.contadores_json) if t.contadores_json else None,
                "erro": t.erro,
                "data_inicial": t.data_inicial,
                "data_final": t.data_final,
            }
            for t in sorted(tarefas, key=lambda x: x.codigo_uasg)
        ]
    return out
