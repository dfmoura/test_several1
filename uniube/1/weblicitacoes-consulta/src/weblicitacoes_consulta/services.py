from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

from weblicitacoes_consulta.config import BASE_URL, EMPRESAS
from weblicitacoes_consulta.db.repository import LicitacaoRepository, extrair_modalidade
from weblicitacoes_consulta.scraper.collector import LicitacaoRecord
from weblicitacoes_consulta.utils import limpar_texto, parse_data_br


def _empresa_codigo_por_nome(nome: str) -> tuple[str, str]:
    nome_norm = limpar_texto(nome).upper()
    for codigo, label in EMPRESAS.items():
        if label.upper() in nome_norm or nome_norm in label.upper():
            return codigo, label
    for codigo, label in EMPRESAS.items():
        sigla = label.split(" - ")[-1].strip().upper()
        if sigla and sigla in nome_norm:
            return codigo, label
    return "?", nome


def record_to_db_payload(record: LicitacaoRecord) -> dict:
    detalhe_url = None
    if record.detalhe_path:
        detalhe_url = f"{BASE_URL}{record.detalhe_path}"
    return {
        "empresa_codigo": record.empresa_codigo,
        "empresa_nome": record.empresa_nome,
        "ano": record.ano,
        "processo": record.processo,
        "modalidade": extrair_modalidade(record.processo),
        "descricao_edital": record.descricao_edital,
        "objeto": record.descricao_edital,
        "data_abertura": parse_data_br(record.data_abertura),
        "habilitacao": parse_data_br(record.habilitacao),
        "julgamento": parse_data_br(record.julgamento),
        "homologacao": parse_data_br(record.homologacao),
        "situacao": record.situacao or None,
        "detalhe_url": detalhe_url,
        "fonte": "scraper",
        "capturado_em": datetime.utcnow(),
    }


def persist_records(records: list[LicitacaoRecord]) -> tuple[int, int]:
    novos = atualizados = 0
    with LicitacaoRepository() as repo:
        for record in records:
            result = repo.upsert_licitacao(record_to_db_payload(record))
            if result == "new":
                novos += 1
            else:
                atualizados += 1
    return novos, atualizados


def import_csv(path: Path) -> tuple[int, int]:
    df = pd.read_csv(path, sep=";", encoding="latin-1", dtype=str)
    df.columns = [c.strip().strip('"') for c in df.columns]
    novos = atualizados = 0

    with LicitacaoRepository() as repo:
        for _, row in df.iterrows():
            empresa_nome = limpar_texto(row.get("EMPRESA"))
            codigo, nome = _empresa_codigo_por_nome(empresa_nome)
            ano = int(str(row.get("ANOPROCESSO", "0")).strip() or 0)
            processo = limpar_texto(row.get("PROCESSO"))
            if not processo:
                continue
            payload = {
                "empresa_codigo": codigo,
                "empresa_nome": nome if codigo != "?" else empresa_nome,
                "ano": ano,
                "processo": processo,
                "modalidade": limpar_texto(row.get("MODALIDADE")) or extrair_modalidade(processo),
                "descricao_edital": limpar_texto(row.get("OBJETO")),
                "objeto": limpar_texto(row.get("OBJETO")),
                "data_abertura": parse_data_br(row.get("DTABERTURA")),
                "habilitacao": parse_data_br(row.get("DTHABILITACAO")),
                "julgamento": parse_data_br(row.get("DTJULGAMENTO")),
                "homologacao": parse_data_br(row.get("DTHOMOLOGACAO")),
                "situacao": limpar_texto(row.get("SITUACAO")) or None,
                "solicitante": limpar_texto(row.get("SOLICITANTE")) or None,
                "valor_licitacao": limpar_texto(row.get("VALORLICITACAO")) or None,
                "detalhe_url": None,
                "fonte": "csv",
                "capturado_em": datetime.utcnow(),
            }
            result = repo.upsert_licitacao(payload)
            if result == "new":
                novos += 1
            else:
                atualizados += 1
    return novos, atualizados
