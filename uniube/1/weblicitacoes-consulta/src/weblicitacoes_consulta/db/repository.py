from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from weblicitacoes_consulta.db.models import Licitacao, SessionLocal, SyncRun, init_db


def extrair_modalidade(processo: str) -> str | None:
    m = re.match(r"^([A-Z]{1,4})\s", processo.strip())
    return m.group(1) if m else None


class LicitacaoRepository:
    def __init__(self) -> None:
        init_db()
        self._session: Session = SessionLocal()

    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> LicitacaoRepository:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def iniciar_sync(self, filtros: dict[str, Any]) -> SyncRun:
        run = SyncRun(
            iniciado_em=datetime.utcnow(),
            status="running",
            filtros=json.dumps(filtros, ensure_ascii=False),
        )
        self._session.add(run)
        self._session.commit()
        self._session.refresh(run)
        return run

    def finalizar_sync(
        self,
        run: SyncRun | int,
        *,
        status: str = "ok",
        novos: int = 0,
        atualizados: int = 0,
        total: int = 0,
        mensagem: str | None = None,
    ) -> None:
        sync_id = run if isinstance(run, int) else run.id
        db_run = self._session.get(SyncRun, sync_id)
        if not db_run:
            return
        db_run.finalizado_em = datetime.utcnow()
        db_run.status = status
        db_run.novos = novos
        db_run.atualizados = atualizados
        db_run.total_coletados = total
        db_run.mensagem = mensagem
        self._session.commit()

    def upsert_licitacao(self, data: dict[str, Any]) -> str:
        stmt = select(Licitacao).where(
            Licitacao.empresa_codigo == data["empresa_codigo"],
            Licitacao.processo == data["processo"],
            Licitacao.ano == data["ano"],
        )
        existing = self._session.scalar(stmt)
        if existing:
            for key, value in data.items():
                if key in ("capturado_em",):
                    continue
                setattr(existing, key, value)
            existing.atualizado_em = datetime.utcnow()
            self._session.commit()
            return "updated"

        lic = Licitacao(**data)
        self._session.add(lic)
        self._session.commit()
        return "new"

    def buscar(
        self,
        *,
        ano: int | None = None,
        empresa_codigo: str | None = None,
        situacao: str | None = None,
        modalidade: str | None = None,
        texto: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> tuple[list[Licitacao], int]:
        stmt = select(Licitacao)
        count_stmt = select(Licitacao)

        filters = []
        if ano is not None:
            filters.append(Licitacao.ano == ano)
        if empresa_codigo is not None:
            filters.append(Licitacao.empresa_codigo == empresa_codigo)
        if situacao:
            filters.append(Licitacao.situacao.ilike(f"%{situacao}%"))
        if modalidade:
            filters.append(Licitacao.modalidade.ilike(f"%{modalidade}%"))
        if texto:
            pattern = f"%{texto}%"
            filters.append(
                or_(
                    Licitacao.descricao_edital.ilike(pattern),
                    Licitacao.processo.ilike(pattern),
                    Licitacao.empresa_nome.ilike(pattern),
                    Licitacao.objeto.ilike(pattern),
                )
            )

        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

        total = len(self._session.scalars(count_stmt).all())
        rows = self._session.scalars(
            stmt.order_by(Licitacao.data_abertura.desc().nullslast(), Licitacao.processo)
            .offset(offset)
            .limit(limit)
        ).all()
        return list(rows), total

    def estatisticas(self) -> dict[str, Any]:
        all_rows = self._session.scalars(select(Licitacao)).all()
        por_ano: dict[int, int] = {}
        por_empresa: dict[str, int] = {}
        por_situacao: dict[str, int] = {}
        for row in all_rows:
            por_ano[row.ano] = por_ano.get(row.ano, 0) + 1
            por_empresa[row.empresa_nome] = por_empresa.get(row.empresa_nome, 0) + 1
            sit = row.situacao or "—"
            por_situacao[sit] = por_situacao.get(sit, 0) + 1
        return {
            "total": len(all_rows),
            "por_ano": dict(sorted(por_ano.items(), reverse=True)),
            "por_empresa": dict(sorted(por_empresa.items(), key=lambda x: -x[1])),
            "por_situacao": dict(sorted(por_situacao.items(), key=lambda x: -x[1])),
        }

    def ultimas_syncs(self, limit: int = 10) -> list[SyncRun]:
        stmt = select(SyncRun).order_by(SyncRun.iniciado_em.desc()).limit(limit)
        return list(self._session.scalars(stmt).all())

    def licitacao_to_dict(self, lic: Licitacao) -> dict[str, Any]:
        return {
            "id": lic.id,
            "empresa_codigo": lic.empresa_codigo,
            "empresa_nome": lic.empresa_nome,
            "ano": lic.ano,
            "processo": lic.processo,
            "modalidade": lic.modalidade,
            "descricao_edital": lic.descricao_edital,
            "objeto": lic.objeto,
            "data_abertura": lic.data_abertura.isoformat() if lic.data_abertura else None,
            "habilitacao": lic.habilitacao.isoformat() if lic.habilitacao else None,
            "julgamento": lic.julgamento.isoformat() if lic.julgamento else None,
            "homologacao": lic.homologacao.isoformat() if lic.homologacao else None,
            "situacao": lic.situacao,
            "solicitante": lic.solicitante,
            "valor_licitacao": lic.valor_licitacao,
            "detalhe_url": lic.detalhe_url,
            "fonte": lic.fonte,
            "capturado_em": lic.capturado_em.isoformat() if lic.capturado_em else None,
            "atualizado_em": lic.atualizado_em.isoformat() if lic.atualizado_em else None,
        }
