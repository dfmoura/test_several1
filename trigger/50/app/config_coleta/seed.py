"""Seed do catálogo de parâmetros de coleta (Fase 3)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import ParametroColeta

# Catálogo oficial v1 — chaves estáveis para Fase 4/5.
PARAMETROS_SEED: list[dict] = [
    {
        "chave": "coleta.modulos",
        "nome": "Módulos de coleta",
        "descricao": "Lista JSON de módulos: contratacoes, itens, resultados, fornecedores.",
        "tipo_valor": "json",
        "modulo": "coleta",
        "valor_padrao": '["contratacoes","itens","resultados"]',
        "permite_excecao_filial": True,
    },
    {
        "chave": "coleta.periodo_dias",
        "nome": "Período de referência (dias)",
        "descricao": "Janela retroativa padrão da coleta incremental.",
        "tipo_valor": "int",
        "modulo": "coleta",
        "valor_padrao": "365",
        "permite_excecao_filial": True,
    },
    {
        "chave": "coleta.incremental",
        "nome": "Coleta incremental",
        "descricao": "Se true, coleta apenas alterações desde a última execução.",
        "tipo_valor": "bool",
        "modulo": "coleta",
        "valor_padrao": "true",
        "permite_excecao_filial": False,
    },
    {
        "chave": "coleta.rate_limit_rpm",
        "nome": "Rate limit (req/min)",
        "descricao": "Teto de requisições por minuto à API Compras.gov.",
        "tipo_valor": "int",
        "modulo": "coleta",
        "valor_padrao": "30",
        "permite_excecao_filial": False,
    },
    {
        "chave": "enriquecimento.cnpj",
        "nome": "Enriquecer CNPJ",
        "descricao": (
            "Fase 2 após coleta 07: cadeia pública de CNPJ com orçamento "
            "(CNPJ_PUBLICO_POS_COLETA_LIMIT / MAX_SEC)."
        ),
        "tipo_valor": "bool",
        "modulo": "enriquecimento",
        "valor_padrao": "true",
        "permite_excecao_filial": True,
    },
    {
        "chave": "enriquecimento.cep",
        "nome": "Enriquecer CEP",
        "descricao": "Dispara cadeia de APIs públicas de CEP.",
        "tipo_valor": "bool",
        "modulo": "enriquecimento",
        "valor_padrao": "true",
        "permite_excecao_filial": True,
    },
]


def garantir_seed_parametros(db: Session) -> int:
    """Insere parâmetros ausentes; não sobrescreve existentes. Retorna quantos criou."""
    criados = 0
    for item in PARAMETROS_SEED:
        existe = db.scalar(
            select(ParametroColeta).where(ParametroColeta.chave == item["chave"])
        )
        if existe:
            continue
        db.add(ParametroColeta(**item, ativo=True))
        criados += 1
    if criados:
        db.commit()
    return criados
