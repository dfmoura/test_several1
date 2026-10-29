"""Seed de regras de alerta padrão (Fase 9)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import AlertaRegra

REGRAS_SEED: list[dict] = [
    {
        "chave": "coleta.falhas",
        "nome": "Falhas na última coleta",
        "descricao": "Dispara se a última execução tiver tarefas com falha.",
        "metrica": "coleta_falhas",
        "operador": ">=",
        "limiar": 1,
        "severidade": "alto",
    },
    {
        "chave": "cnpj.pendentes",
        "nome": "CNPJs pendentes de enriquecimento",
        "descricao": "Dispara se houver CNPJs acima do limiar aguardando cadeia pública.",
        "metrica": "cnpj_pendentes",
        "operador": ">=",
        "limiar": 10,
        "severidade": "aviso",
    },
    {
        "chave": "compras.zeradas",
        "nome": "UASGs ativas sem contratações",
        "descricao": "Dispara se há UASG monitorada no escopo mas zero contratações.",
        "metrica": "contratacoes_zeradas",
        "operador": ">=",
        "limiar": 1,
        "severidade": "aviso",
    },
]


def garantir_seed_alertas(db: Session) -> int:
    criados = 0
    for item in REGRAS_SEED:
        existe = db.scalar(select(AlertaRegra).where(AlertaRegra.chave == item["chave"]))
        if existe:
            continue
        db.add(AlertaRegra(**item, ativo=True))
        criados += 1
    if criados:
        db.commit()
    return criados
