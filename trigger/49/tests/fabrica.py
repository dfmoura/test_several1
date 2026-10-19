from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cnpj import _PESOS_1, _PESOS_2, _digito
from app.db import definir_contexto, garantir_contexto, restaurar_contexto
from app.models import Filial, FilialUasg, Uasg
from app.tempo import agora_utc


def cnpj_valido_de(base12: str) -> str:
    primeiro = _digito(base12, _PESOS_1)
    segundo = _digito(base12 + primeiro, _PESOS_2)
    return base12 + primeiro + segundo


def filial_uberlandia(db: Session) -> Filial:
    return db.scalar(select(Filial).where(Filial.cnpj == "23497346000142"))


def gravar_uasg(db: Session, filial: Filial, codigo: str, cnpj_orgao: str, *, aderida: bool = True) -> None:
    tokens = definir_contexto(str(filial.id), master=False)
    garantir_contexto(db)
    try:
        if db.get(Uasg, codigo) is None:
            db.add(
                Uasg(
                    codigo_uasg=codigo,
                    nome=f"UASG {codigo}",
                    cnpj_orgao=cnpj_orgao,
                    uf=filial.uf,
                    codigo_ibge=filial.codigo_ibge,
                    ativa_oficial=True,
                    atualizada_em=agora_utc(),
                )
            )
            db.flush()
        db.add(FilialUasg(tenant_id=filial.id, codigo_uasg=codigo, aderida=aderida))
        db.commit()
    finally:
        restaurar_contexto(tokens)


def agora_fixo(hora: int, minuto: int) -> datetime:
    return datetime(2026, 10, 19, hora, minuto, tzinfo=timezone.utc).astimezone()
