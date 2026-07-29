#!/usr/bin/env python3
"""Re-extrai catálogos JSON a partir do XLSM oficial."""
from __future__ import annotations

import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSM = next(ROOT.glob("ORÇAMENTO OFICIAL*.xlsm"))
OUT = ROOT / "data" / "catalogs"
OUT.mkdir(parents=True, exist_ok=True)


def dump(name: str, data: object) -> None:
    path = OUT / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print("wrote", path)


def main() -> None:
    wb = openpyxl.load_workbook(XLSM, data_only=True)
    # Mantém a mesma lógica do bootstrap — ver histórico do extract embutido
    # Para extensão: copiar blocos do script de bootstrap.
    print("Planilha:", XLSM.name)
    print("Abas:", wb.sheetnames)
    print("Use o bootstrap Python do repositório ou reexecute o fluxo de seed.")
    print("Catálogos atuais em", OUT)


if __name__ == "__main__":
    main()
