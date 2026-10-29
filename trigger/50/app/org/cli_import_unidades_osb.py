"""CLI: python -m app.org.cli_import_unidades_osb [--dry-run] [--sem-municipios]."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.config import BASE_DIR, DB_PATH
from app.database import SessionLocal, configure_engine, init_db
from app.org.import_unidades_osb import importar_unidades_osb


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Importa filiais OSB de unidades-osb.txt (idempotente por CNPJ)."
    )
    parser.add_argument(
        "--arquivo",
        type=Path,
        default=None,
        help="Caminho do arquivo-fonte (padrão: unidades-osb.txt na raiz).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula sem gravar no banco.",
    )
    parser.add_argument(
        "--sem-municipios",
        action="store_true",
        help="Não associa municípios IBGE.",
    )
    args = parser.parse_args(argv)

    configure_engine(DB_PATH)
    init_db()

    arquivo = args.arquivo
    if arquivo is None:
        candidato = BASE_DIR / "unidades-osb.txt"
        arquivo = candidato if candidato.is_file() else None

    with SessionLocal() as db:
        result = importar_unidades_osb(
            db,
            path=arquivo,
            vincular_municipios=not args.sem_municipios,
            dry_run=args.dry_run,
        )

    payload = {
        "dry_run": args.dry_run,
        "db": str(DB_PATH),
        "criadas": result.criadas,
        "atualizadas": result.atualizadas,
        "inalteradas": result.inalteradas,
        "municipios_ok": result.municipios_ok,
        "municipios_falha": result.municipios_falha,
        "erros": result.erros,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if result.erros and result.criadas == 0 and result.atualizadas == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
