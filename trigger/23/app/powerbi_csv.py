"""Leitura de CSV dos painéis Power BI PMU (separador `;`, encoding Windows)."""

from __future__ import annotations

import csv
import io
import json
import re
from typing import Any

LICITACOES_COLUNAS = (
    "ANOPROCESSO",
    "CHAVE",
    "DSHABILITACAO",
    "DTABERTURA",
    "DTHABILITACAO",
    "DTHOMOLOGACAO",
    "DTJULGAMENTO",
    "EMPRESA",
    "MODALIDADE",
    "OBJETO",
    "PROCESSO",
    "SITUACAO",
    "SOLICITANTE",
    "VALORLICITACAO",
)

CONTRATOS_COLUNAS = (
    "ANOCONTRATO",
    "ANOPROCESSO",
    "DSOBJETOCONTRATO",
    "DTASSINATURA",
    "EMPRESA",
    "NMPESSOA",
    "NRADITIVO",
    "NRCONTRATO",
    "NRPARCELA",
    "PROCESSO",
    "VRINICIAL",
)

GESTORES_COLUNAS = (
    "ANOCONTRATO",
    "DSORGAO",
    "DSPAPEIS",
    "DTASSINATURA",
    "DTFIM",
    "DTINICIO",
    "FORNECEDOR",
    "NMPESSOAPAPEL",
    "NRCONTRATO",
    "OBJETOCONTRATO",
)


def decode_csv_bytes(data: bytes) -> tuple[str, str]:
    """Decodifica bytes do CSV PMU. Retorna (texto, encoding usado)."""
    if not data:
        return "", "empty"
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", errors="replace"), "latin-1/replace"


def _normalizar_chave(chave: str) -> str:
    return chave.strip().strip('"').upper()


def _limpar(val: Any) -> str | None:
    if val is None:
        return None
    s = str(val).strip().strip('"')
    if not s or s.lower() in ("null", "none"):
        return None
    return s


def _int_or_none(val: Any) -> int | None:
    s = _limpar(val)
    if not s:
        return None
    try:
        return int(float(s.replace(",", ".")))
    except ValueError:
        return None


def parse_csv_dicts(data: bytes, colunas_esperadas: tuple[str, ...] | None = None) -> list[dict[str, str]]:
    texto, _ = decode_csv_bytes(data)
    if not texto.strip():
        return []

    primeira = texto.split("\n", 1)[0]
    delim = ";" if ";" in primeira else ","
    reader = csv.DictReader(io.StringIO(texto), delimiter=delim, quotechar='"')
    if not reader.fieldnames:
        return []

    field_map = {_normalizar_chave(f): f for f in reader.fieldnames if f}
    rows: list[dict[str, str]] = []
    for raw in reader:
        row: dict[str, str] = {}
        for col in colunas_esperadas or tuple(field_map):
            orig = field_map.get(_normalizar_chave(col))
            row[col] = _limpar(raw.get(orig)) if orig else None  # type: ignore[assignment]
        rows.append(row)
    return rows


def row_to_json(row: dict[str, Any]) -> str:
    return json.dumps(row, ensure_ascii=False)


def licitacao_para_db(row: dict[str, str], fonte_ano: int) -> dict[str, Any]:
    processo = _limpar(row.get("PROCESSO"))
    empresa = _limpar(row.get("EMPRESA"))
    modalidade = _limpar(row.get("MODALIDADE"))
    if not processo or not empresa or not modalidade:
        raise ValueError("Licitação sem processo, empresa ou modalidade")

    return {
        "ano_processo": _int_or_none(row.get("ANOPROCESSO")) or fonte_ano,
        "chave": _limpar(row.get("CHAVE")),
        "processo": processo,
        "modalidade": modalidade,
        "objeto": _limpar(row.get("OBJETO")),
        "solicitante": _limpar(row.get("SOLICITANTE")),
        "empresa": empresa,
        "situacao": _limpar(row.get("SITUACAO")),
        "ds_habilitacao": _limpar(row.get("DSHABILITACAO")),
        "dt_abertura": _limpar(row.get("DTABERTURA")),
        "dt_habilitacao": _limpar(row.get("DTHABILITACAO")),
        "dt_julgamento": _limpar(row.get("DTJULGAMENTO")),
        "dt_homologacao": _limpar(row.get("DTHOMOLOGACAO")),
        "valor_licitacao": _limpar(row.get("VALORLICITACAO")),
        "fonte_ano_coleta": fonte_ano,
        "dados_csv_json": row_to_json(row),
    }


def contrato_para_db(row: dict[str, str], fonte_ano: int) -> dict[str, Any]:
    nr_contrato = _limpar(row.get("NRCONTRATO"))
    empresa = _limpar(row.get("EMPRESA"))
    if not nr_contrato or not empresa:
        raise ValueError("Contrato sem número ou empresa")

    return {
        "ano_contrato": _int_or_none(row.get("ANOCONTRATO")) or fonte_ano,
        "ano_processo": _int_or_none(row.get("ANOPROCESSO")),
        "ds_objeto_contrato": _limpar(row.get("DSOBJETOCONTRATO")),
        "dt_assinatura": _limpar(row.get("DTASSINATURA")),
        "empresa": empresa,
        "nm_pessoa": _limpar(row.get("NMPESSOA")),
        "nr_aditivo": _limpar(row.get("NRADITIVO")) or "0",
        "nr_contrato": nr_contrato,
        "nr_parcela": _limpar(row.get("NRPARCELA")) or "1",
        "processo": _limpar(row.get("PROCESSO")),
        "vr_inicial": _limpar(row.get("VRINICIAL")),
        "fonte_ano_coleta": fonte_ano,
        "dados_csv_json": row_to_json(row),
    }


def gestor_para_db(row: dict[str, str]) -> dict[str, Any]:
    nr_contrato = _limpar(row.get("NRCONTRATO"))
    nm_pessoa = _limpar(row.get("NMPESSOAPAPEL"))
    if not nr_contrato or not nm_pessoa:
        raise ValueError("Gestor/fiscal sem contrato ou pessoa")

    return {
        "ano_contrato": _int_or_none(row.get("ANOCONTRATO")) or 0,
        "ds_orgao": _limpar(row.get("DSORGAO")),
        "ds_papeis": _limpar(row.get("DSPAPEIS")),
        "dt_assinatura": _limpar(row.get("DTASSINATURA")),
        "dt_fim": _limpar(row.get("DTFIM")),
        "dt_inicio": _limpar(row.get("DTINICIO")),
        "fornecedor": _limpar(row.get("FORNECEDOR")),
        "nm_pessoa_papel": re.sub(r"\s+", " ", nm_pessoa),
        "nr_contrato": nr_contrato,
        "objeto_contrato": _limpar(row.get("OBJETOCONTRATO")),
        "dados_csv_json": row_to_json(row),
    }
