"""Planejador central — consolida necessidades das filiais com dedupe por UASG."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import FilialUasg, Uasg, Unidade


@dataclass(frozen=True)
class NecessidadeUasg:
    """Pedido consolidado: uma UASG pedida por uma ou mais filiais."""

    codigo_uasg: str
    uasg_id: int
    nome_uasg: str | None
    filiais_ids: tuple[int, ...]
    filiais_nomes: tuple[str, ...]


@dataclass
class PlanoColeta:
    data_inicial: date
    data_final: date
    modulo: str
    necessidades: list[NecessidadeUasg] = field(default_factory=list)

    @property
    def total_uasgs_unicas(self) -> int:
        return len(self.necessidades)

    @property
    def total_vinculos_filial(self) -> int:
        return sum(len(n.filiais_ids) for n in self.necessidades)

    def to_dict(self) -> dict[str, Any]:
        return {
            "data_inicial": self.data_inicial.isoformat(),
            "data_final": self.data_final.isoformat(),
            "modulo": self.modulo,
            "total_uasgs_unicas": self.total_uasgs_unicas,
            "total_vinculos_filial": self.total_vinculos_filial,
            "dedupe_economia": max(
                0, self.total_vinculos_filial - self.total_uasgs_unicas
            ),
            "necessidades": [
                {
                    "codigo_uasg": n.codigo_uasg,
                    "uasg_id": n.uasg_id,
                    "nome_uasg": n.nome_uasg,
                    "filiais_ids": list(n.filiais_ids),
                    "filiais_nomes": list(n.filiais_nomes),
                    "filiais_count": len(n.filiais_ids),
                }
                for n in self.necessidades
            ],
        }


def planejar_coleta(
    db: Session,
    *,
    data_inicial: date | None = None,
    data_final: date | None = None,
    periodo_dias: int = 365,
    modulo: str = "07",
    organizacao_id: int | None = None,
    unidade_ids: list[int] | None = None,
    codigo_uasg: str | None = None,
) -> PlanoColeta:
    """Consolida FILIAL_UASG ativos → uma necessidade por codigo_uasg.

    Duas filiais na mesma UASG produzem **uma** entrada no plano.
    ``codigo_uasg`` opcional restringe o plano a uma única UASG monitorada.
    """
    hoje = date.today()
    fim = data_final or hoje
    inicio = data_inicial or (fim - timedelta(days=max(1, periodo_dias)))
    if fim < inicio:
        raise ValueError("data_final anterior a data_inicial.")

    alvo = (codigo_uasg or "").strip() or None

    stmt = (
        select(FilialUasg)
        .where(FilialUasg.ativo.is_(True))
        .options(
            joinedload(FilialUasg.uasg),
            joinedload(FilialUasg.unidade),
        )
    )
    rows = list(db.scalars(stmt).unique().all())

    por_uasg: dict[str, dict[str, Any]] = {}
    for link in rows:
        uni: Unidade | None = link.unidade
        uasg: Uasg | None = link.uasg
        if uni is None or uasg is None or not uni.ativo:
            continue
        if uni.tipo != "filial":
            continue
        if organizacao_id is not None and uni.organizacao_id != organizacao_id:
            continue
        if unidade_ids is not None and uni.id not in unidade_ids:
            continue
        codigo = (uasg.codigo_uasg or "").strip()
        if not codigo:
            continue
        if alvo is not None and codigo != alvo:
            continue
        bucket = por_uasg.setdefault(
            codigo,
            {
                "uasg_id": uasg.id,
                "nome_uasg": uasg.nome_uasg,
                "filiais": {},
            },
        )
        bucket["filiais"][uni.id] = uni.nome

    necessidades = [
        NecessidadeUasg(
            codigo_uasg=codigo,
            uasg_id=int(data["uasg_id"]),
            nome_uasg=data["nome_uasg"],
            filiais_ids=tuple(sorted(data["filiais"].keys())),
            filiais_nomes=tuple(
                data["filiais"][i] for i in sorted(data["filiais"].keys())
            ),
        )
        for codigo, data in sorted(por_uasg.items())
    ]
    return PlanoColeta(
        data_inicial=inicio,
        data_final=fim,
        modulo=modulo,
        necessidades=necessidades,
    )
