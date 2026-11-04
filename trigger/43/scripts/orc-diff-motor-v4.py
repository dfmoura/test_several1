#!/usr/bin/env python3
"""
Diff de preço motor v3-legado vs v4 (rv8) sobre fixtures e, opcionalmente, ORCs exportados.

Uso (sem DB):
  python3 scripts/orc-diff-motor-v4.py

Uso com JSON de ORCs reais (lista de input_snapshot + result_snapshot):
  python3 scripts/orc-diff-motor-v4.py --orcamentos /tmp/orcs_export.json

Não seed EMP. Critério staging: revisar deltas de etiqueta > R$ 10 ou > 2% antes de
`orcamento:ensure-catalogo --force`. Norma: docs/ADR_ORC_MOTOR_V4_RV8.md
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAT_PATH = ROOT / "apps/api/resources/data/orcamento/catalog_oficial.json"
BRAHVA = ROOT / "apps/api/tests/fixtures/orcamento_brahva.json"
RV4 = ROOT / "apps/api/tests/fixtures/orcamento_rv4_sample.json"
RV8 = ROOT / "apps/api/tests/fixtures/orcamento_rv8_goldens.json"


def excel_ceiling(n: float, s: float) -> float:
    if s == 0:
        return n
    return math.ceil(n / s - 1e-12) * s


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--orcamentos", type=Path, help="JSON lista de {input, result_v3_etiqueta?}")
    ap.add_argument("--threshold-abs", type=float, default=10.0)
    ap.add_argument("--threshold-pct", type=float, default=2.0)
    args = ap.parse_args()

    cat = json.loads(CAT_PATH.read_text(encoding="utf-8"))
    assert cat.get("motor_version_catalogo") == 4, "catalog_oficial deve estar em v4"

    print("=== Catálogo ===")
    print(f"fonte={cat.get('fonte_xlsm')} motor_version_catalogo={cat.get('motor_version_catalogo')}")
    print(f"ml={cat.get('perda_papel_acerto_ml')}")
    print(f"tinta cols={list((cat.get('tinta_matriz') or {}).get('rates', {}).keys())}")

    print("\n=== Fixtures golden (já recalculados sob v4) ===")
    for path in (BRAHVA, RV4, RV8):
        fx = json.loads(path.read_text(encoding="utf-8"))
        print(f"- {path.name}: ok ({'casos' in fx and len(fx['casos']) or 'faixas'} entradas)")

    if args.orcamentos:
        if not args.orcamentos.exists():
            print("Arquivo não encontrado:", args.orcamentos, file=sys.stderr)
            return 1
        rows = json.loads(args.orcamentos.read_text(encoding="utf-8"))
        print(f"\n=== Diff ORCs exportados ({len(rows)}) ===")
        print("Integração completa exige PHP/OrcamentoMotor; use staging com:")
        print("  php artisan tinker / filtro OrcamentoMotorTest após recalcular amostra.")
        print(f"Thresholds: abs≥{args.threshold_abs} ou pct≥{args.threshold_pct}%")
        alertas = 0
        for i, row in enumerate(rows):
            old = row.get("valor_etiqueta_antigo") or row.get("result_v3_etiqueta")
            new = row.get("valor_etiqueta_novo")
            if old is None or new is None:
                continue
            old_f, new_f = float(old), float(new)
            delta = new_f - old_f
            pct = (delta / old_f * 100.0) if old_f else 0.0
            if abs(delta) >= args.threshold_abs or abs(pct) >= args.threshold_pct:
                alertas += 1
                print(f"  ALERTA #{i} id={row.get('id')} {old_f:.2f} → {new_f:.2f} (Δ{delta:+.2f} / {pct:+.2f}%)")
        print(f"Alertas: {alertas}")
        return 1 if alertas else 0

    print("\n=== Staging checklist ===")
    print("1. Rodar OrcamentoMotorTest + OrcamentoGorduraTest + MultiEmpresaAceiteTest")
    print("2. Em homolog: recalcular 5–10 ORCs representativos (1 modelo, N modelos, 4V, metragem>1000)")
    print("3. Comparar valor_etiqueta novo vs snapshot antigo")
    print("4. Só então: orcamento:ensure-catalogo (sem --force em EMP já editada, se possível)")
    print("5. ORCs snapshotados não recalculam sozinhos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
