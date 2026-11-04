#!/usr/bin/env python3
"""
Reconcilia mapa de facas a partir de inventário xlsx achatado (headers do template).

Invariantes (mesmo espírito do FacasMapaService):
  - nunca apaga faca do JSON atual sem match
  - preserva id estável quando a geometria casa
  - geometria nova vira linha nova (id novo)
  - metadados do xlsx atualizam a linha casada

Uso (dry-run padrão):
  python3 scripts/reconcile_mapa_facas_xlsx.py \\
    --xlsx /home/dfmoura/Downloads/mapa_facas.xlsx

Gravar JSON oficial + relatório:
  python3 scripts/reconcile_mapa_facas_xlsx.py \\
    --xlsx /home/dfmoura/Downloads/mapa_facas.xlsx --write
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from collections import Counter
from datetime import datetime
from pathlib import Path

try:
    import openpyxl
except ImportError as e:  # pragma: no cover
    raise SystemExit("Instale openpyxl: pip install openpyxl") from e

ROOT = Path(__file__).resolve().parents[1]
OUT_MAPA = ROOT / "apps/api/resources/data/orcamento/mapa_facas.json"
REPORT_DIR = ROOT / "docs/fixtures"
FONTE = "MAPA DE FACAS 20261103 XLSX"

MAQ_MAP = {
    "BETAFLEX": "BETA",
    "BETA": "BETA",
    "ETIRAMA": "ETIRAMA",
    "MODULAR SPX": "MODULAR",
    "MODULAR": "MODULAR",
    "REFLEXO": "160",
    "REFLEXO 160": "160",
    "160": "160",
    "REFLEXO 250": "250",
    "250": "250",
    "BATIDA": "BATIDA",
}

META_FIELDS = (
    "conjugada",
    "fornecedor",
    "cliente_nota",
    "cilindro",
    "colunas_mapa",
    "maquina_origem",
    "n_facas",
)


def _norm_spaces(s: str) -> str:
    return " ".join(str(s).strip().split())


def _fmt_num(x, max_decimals: int = 6) -> str:
    if x is None:
        return ""
    if isinstance(x, (int, float)):
        if abs(x - round(x)) < 1e-9:
            return str(int(round(x)))
        s = f"{x:.{max_decimals}f}".rstrip("0").rstrip(".")
        return s.replace(".", ",")
    return str(x).replace(".", ",")


def _to_float(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        return None if math.isnan(f) else f
    s = str(v).strip().upper()
    s = s.replace("Ø", "").replace("⌀", "").replace("DIAM", "")
    s = s.replace(",", ".").strip()
    m = re.match(r"^[^\d]*(\d+(?:\.\d+)?)", s)
    if not m:
        try:
            return float(s)
        except ValueError:
            return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def _is_redonda(formato: str | None) -> bool:
    return bool(formato and "REDOND" in formato.upper())


def _norm_medida(medida: str | None) -> str | None:
    if not medida:
        return None
    s = _norm_spaces(medida).upper()
    s = s.replace("×", "X").replace("⌀", "Ø")
    # "Ø3,3" / "Ø 3,3"
    if "Ø" in s:
        d = _to_float(s)
        if d is not None:
            return f"Ø {_fmt_num(d)}"
        compact = s.replace(" ", "")
        if compact.startswith("Ø") and len(compact) > 1:
            return "Ø " + compact[1:]
        return s
    compact = s.replace(" ", "")
    if "X" in compact:
        left, right = compact.split("X", 1)
        a = _to_float(left)
        b = _to_float(right)
        if a is not None and b is not None:
            return f"{_fmt_num(a)}X{_fmt_num(b)}"
        return f"{left}X{right}"
    f = _to_float(s)
    # texto (PICOTE / CORTE LONGITUDINAL / SEM MEDIDA): preserva espaços
    return _fmt_num(f) if f is not None else s


def _round_key(v, nd: int):
    f = _to_float(v)
    if f is None:
        return None
    return round(f, nd)


def _identity_key(row: dict) -> tuple:
    """Chave de inventário operacional: máquina + N FACA + formato + medida canônica."""
    return (
        str(row.get("maquina_catalogo") or ""),
        str(row.get("formato") or "").upper(),
        row.get("n_facas"),
        _norm_medida(str(row.get("medida") or "")) or "",
    )


def _build_label(row: dict) -> str:
    parts = []
    if row.get("medida"):
        parts.append(str(row["medida"]))
    if row.get("formato"):
        parts.append(str(row["formato"]))
    if row.get("maquina_catalogo"):
        parts.append(str(row["maquina_catalogo"]))
    if row.get("z") is not None:
        parts.append(f"Z={_fmt_num(row['z'], 4)}")
    if row.get("repeticao") is not None:
        parts.append(f"REP={_fmt_num(row['repeticao'], 6)}")
    pux = row.get("puxada")
    completa = bool(row.get("completa", True))
    parts.append("pux=" + (_fmt_num(pux, 4) if pux is not None else ("—" if completa else "MANUAL")))
    if _is_redonda(row.get("formato")):
        parts.append("diâmetro")
    return " · ".join(parts)


def _canon_from_excel(raw: dict) -> dict | None:
    formato = raw.get("Formato")
    if formato is None or str(formato).strip() == "":
        return None
    formato = _norm_spaces(str(formato)).upper()

    maq_raw = raw.get("Máquina")
    if maq_raw is None or str(maq_raw).strip() == "":
        return None
    maq_u = _norm_spaces(str(maq_raw)).upper()
    # openpyxl pode entregar 160/250 como int
    if maq_u in MAQ_MAP:
        maq_std = MAQ_MAP[maq_u]
    elif maq_u.replace(".0", "") in MAQ_MAP:
        maq_std = MAQ_MAP[maq_u.replace(".0", "")]
    else:
        maq_std = maq_u

    larg = _to_float(raw.get("Largura (cm)"))
    diam = _to_float(raw.get("Diâmetro (cm)"))
    pux = _to_float(raw.get("Puxada (cm)"))
    z = _to_float(raw.get("Z"))
    rep = _to_float(raw.get("Repetição"))
    tamanho_cell = raw.get("Tamanho (cm)")
    med_cell = raw.get("Medida")

    tamanho_tipo = None
    diametro_cm = None
    medida = None
    tamanho_raw = None

    med_str = None if med_cell is None else str(med_cell).strip()
    if med_str == "":
        med_str = None

    if _is_redonda(formato):
        dval = diam if diam is not None else _to_float(med_cell)
        if dval is None and med_str and ("Ø" in med_str.upper() or "⌀" in med_str):
            dval = _to_float(med_str)
        if dval is not None:
            medida = f"Ø {_fmt_num(dval)}"
            diametro_cm = dval
            tamanho_raw = _fmt_num(dval)
            tamanho_tipo = "diametro"
        elif med_str:
            medida = _norm_medida(med_str) or med_str
            tamanho_tipo = "diametro"
    else:
        if med_str and ("X" in med_str.upper() or "×" in med_str):
            medida = re.sub(r"[xX×]", "X", med_str.upper().replace(" ", ""))
            medida = medida.replace(".", ",") if re.search(r"\d\.\d", medida) else medida
            # normaliza decimal ponto residual em cada lado
            parts = medida.split("X", 1)
            if len(parts) == 2:
                a = _fmt_num(_to_float(parts[0]) if _to_float(parts[0]) is not None else parts[0])
                b = _fmt_num(_to_float(parts[1]) if _to_float(parts[1]) is not None else parts[1])
                medida = f"{a}X{b}"
            tamanho_tipo = "retangular"
            tamanho_raw = parts[1] if len(parts) == 2 else None
        else:
            # Medida nua = altura/tamanho; identidade = larguraXtamanho (padrão sync).
            tf = _to_float(med_cell)
            if tf is None:
                tf = _to_float(tamanho_cell)
            if tf is not None and larg is not None and larg > 0:
                medida = f"{_fmt_num(larg)}X{_fmt_num(tf)}"
                tamanho_raw = _fmt_num(tf)
                tamanho_tipo = "altura"
            elif tf is not None:
                medida = _fmt_num(tf)
                tamanho_raw = medida
                tamanho_tipo = "altura"
            elif larg is not None and pux is not None:
                medida = f"{_fmt_num(larg)}X{_fmt_num(pux)}"
                tamanho_raw = _fmt_num(pux)
                tamanho_tipo = "composto"

    if not medida:
        # incompletas oficiais (PICOTE/GAP/…) — fallback como no PHP forSeed
        medida = formato or "SEM MEDIDA"
        tamanho_tipo = tamanho_tipo or "desconhecido"

    tipo_tam_cell = raw.get("Tipo do tamanho")
    if tipo_tam_cell is not None and str(tipo_tam_cell).strip():
        tamanho_tipo = str(tipo_tam_cell).strip()

    if tamanho_raw is None and tamanho_cell is not None and str(tamanho_cell).strip():
        tamanho_raw = str(tamanho_cell).strip().replace(".", ",")

    n_facas = raw.get("N FACA")
    n_f = None
    if n_facas is not None and str(n_facas).strip() != "":
        try:
            n_f = int(float(n_facas))
        except (TypeError, ValueError):
            n_f = None

    faca_cell = raw.get("Faca")
    faca = _norm_spaces(str(faca_cell)).upper() if faca_cell is not None and str(faca_cell).strip() else formato

    incompleta = pux is None or z is None
    maq_origem = raw.get("Máquina origem")
    maq_origem_s = _norm_spaces(str(maq_origem)) if maq_origem is not None and str(maq_origem).strip() else None

    def _txt(key: str):
        v = raw.get(key)
        if v is None:
            return None
        s = _norm_spaces(str(v))
        return s or None

    col = raw.get("Colunas")
    col_s = None
    if col is not None and str(col).strip() != "":
        col_s = str(col).strip()
        if col_s.endswith(".0") and col_s.replace(".0", "").isdigit():
            col_s = col_s[:-2]

    cil = raw.get("Cilindro")
    cil_s = None
    if cil is not None and str(cil).strip() != "":
        cil_s = str(cil).strip()
        if isinstance(cil, float) and cil == int(cil):
            cil_s = str(int(cil))

    row = {
        "medida": medida,
        "tamanho_raw": tamanho_raw,
        "tamanho_tipo": tamanho_tipo,
        "diametro_cm": diametro_cm,
        "formato": formato,
        "faca": faca,
        "puxada": pux,
        "z": z,
        "repeticao": rep,
        "maquina_catalogo": maq_std,
        "maquina_origem": maq_origem_s,
        "largura_faca": larg,
        "n_facas": n_f,
        "cilindro": cil_s,
        "colunas_mapa": col_s,
        "conjugada": _txt("Conjugada"),
        "fornecedor": _txt("Fornecedor"),
        "cliente_nota": _txt("Cliente"),
        "completa": not incompleta,
        "label": "",
    }
    row["label"] = _build_label(row)
    return row


def _geom_key(row: dict) -> tuple:
    # Tolerância folgada: planilha e JSON arredondam puxada de formas diferentes.
    return (
        str(row.get("maquina_catalogo") or ""),
        str(row.get("formato") or "").upper(),
        _norm_medida(str(row.get("medida") or "")) or "",
        row.get("n_facas"),
        _round_key(row.get("largura_faca"), 2),
        _round_key(row.get("puxada"), 2),
        _round_key(row.get("z"), 1),
        _round_key(row.get("repeticao"), 2),
    )


def _medium_key(row: dict) -> tuple:
    """Sem medida textual — útil quando o Excel traz medida nua e o JSON já canônico."""
    return (
        str(row.get("maquina_catalogo") or ""),
        str(row.get("formato") or "").upper(),
        row.get("n_facas"),
        _round_key(row.get("largura_faca"), 2),
        _round_key(row.get("puxada"), 2),
        _round_key(row.get("z"), 1),
    )


def _load_excel(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    expected = {
        "ID",
        "Formato",
        "Medida",
        "Largura (cm)",
        "Puxada (cm)",
        "Z",
        "Máquina",
        "N FACA",
    }
    missing = expected - set(headers)
    if missing:
        raise SystemExit(f"Headers inesperados em {path}: faltam {sorted(missing)}")

    out: list[dict] = []
    skipped = 0
    for r in ws.iter_rows(min_row=2, values_only=True):
        if all(v is None or (isinstance(v, str) and not str(v).strip()) for v in r):
            continue
        raw = dict(zip(headers, r))
        canon = _canon_from_excel(raw)
        if canon is None:
            skipped += 1
            continue
        out.append(canon)
    print(f"Excel: {len(out)} linhas canônicas | puladas={skipped}")
    return out


def _meta_diff(old: dict, new: dict) -> dict:
    diff = {}
    for f in META_FIELDS:
        ov = old.get(f)
        nv = new.get(f)
        if f == "n_facas":
            ov = None if ov is None else int(ov)
            nv = None if nv is None else int(nv)
        else:
            ov = None if ov is None or str(ov).strip() == "" else _norm_spaces(str(ov))
            nv = None if nv is None or str(nv).strip() == "" else _norm_spaces(str(nv))
        if ov != nv:
            diff[f] = {"de": ov, "para": nv}
    # completa pode mudar se puxada/Z foram preenchidos no Excel
    if bool(old.get("completa", True)) != bool(new.get("completa", True)):
        diff["completa"] = {"de": bool(old.get("completa", True)), "para": bool(new.get("completa", True))}
    return diff


def reconcile(excel_rows: list[dict], json_rows: list[dict]) -> dict:
    by_geom: dict[tuple, list[dict]] = {}
    by_medium: dict[tuple, list[dict]] = {}
    by_identity: dict[tuple, list[dict]] = {}
    for j in json_rows:
        by_geom.setdefault(_geom_key(j), []).append(j)
        by_medium.setdefault(_medium_key(j), []).append(j)
        by_identity.setdefault(_identity_key(j), []).append(j)

    # Identidades ambíguas no JSON (mesmo N FACA+medida) — não casar por identity.
    ambiguous_identity = {k for k, v in by_identity.items() if len(v) > 1}

    used_json_ids: set[int] = set()
    matched: list[dict] = []
    created: list[dict] = []
    meta_updates: list[dict] = []
    geom_updates: list[dict] = []
    match_via = Counter()

    max_id = max((int(j.get("id") or 0) for j in json_rows), default=0)
    next_id = max_id + 1

    def _pick(cands: list[dict]) -> dict | None:
        free = [c for c in cands if int(c.get("id") or 0) not in used_json_ids]
        return free[0] if len(free) == 1 else (free[0] if free else None)

    for er in excel_rows:
        via = None
        old = None

        gk = _geom_key(er)
        old = _pick(by_geom.get(gk, []))
        if old is not None:
            via = "geom"

        if old is None:
            ik = _identity_key(er)
            if ik not in ambiguous_identity and ik[2] is not None and ik[3]:
                # identity só se único no JSON e único livre
                id_cands = [c for c in by_identity.get(ik, []) if int(c.get("id") or 0) not in used_json_ids]
                if len(by_identity.get(ik, [])) == 1 and len(id_cands) == 1:
                    old = id_cands[0]
                    via = "identity"

        if old is None:
            mk = _medium_key(er)
            medium_all = by_medium.get(mk, [])
            medium_free = [c for c in medium_all if int(c.get("id") or 0) not in used_json_ids]
            if len(medium_all) == 1 and len(medium_free) == 1:
                old = medium_free[0]
                via = "medium"

        if old is not None and via is not None:
            oid = int(old["id"])
            used_json_ids.add(oid)
            match_via[via] += 1
            merged = dict(er)
            merged["id"] = oid
            merged["medida"] = _norm_medida(str(merged.get("medida") or "")) or merged.get("medida")
            # preserva tamanho_tipo/raw do JSON se Excel não trouxe algo melhor
            if not merged.get("tamanho_raw") and old.get("tamanho_raw"):
                merged["tamanho_raw"] = old.get("tamanho_raw")
            if not merged.get("tamanho_tipo") and old.get("tamanho_tipo"):
                merged["tamanho_tipo"] = old.get("tamanho_tipo")
            # match medium: identidade textual do JSON é a estável no ORC/picker
            if via == "medium":
                merged["medida"] = _norm_medida(str(old.get("medida") or "")) or merged["medida"]
                if old.get("diametro_cm") is not None:
                    merged["diametro_cm"] = old.get("diametro_cm")
            merged["label"] = _build_label(merged)

            # geometria mudou no inventário (xlsx manda) — no JSON atualizamos in-place
            # preservando id; EMP não recebe --force (API continua imutável).
            geom_fields = ("medida", "puxada", "z", "repeticao", "largura_faca", "diametro_cm", "formato")
            gdiff = {}
            for f in geom_fields:
                ov, nv = old.get(f), merged.get(f)
                if f in ("puxada", "z", "repeticao", "largura_faca", "diametro_cm"):
                    if _round_key(ov, 3) != _round_key(nv, 3):
                        gdiff[f] = {"de": ov, "para": nv}
                elif f == "medida":
                    if (_norm_medida(str(ov or "")) or "") != (_norm_medida(str(nv or "")) or ""):
                        gdiff[f] = {"de": ov, "para": nv}
                elif (ov or None) != (nv or None):
                    gdiff[f] = {"de": ov, "para": nv}
            if gdiff:
                geom_updates.append({"id": oid, "via": via, "diff": gdiff, "label": merged["label"]})

            md = _meta_diff(old, merged)
            if md:
                meta_updates.append({"id": oid, "diff": md, "label": merged["label"]})
            matched.append(merged)
        else:
            row = dict(er)
            row["id"] = next_id
            next_id += 1
            row["medida"] = _norm_medida(str(row.get("medida") or "")) or row.get("medida")
            row["label"] = _build_label(row)
            created.append(row)
            match_via["new"] += 1

    retained = [j for j in json_rows if int(j.get("id") or 0) not in used_json_ids]
    out_rows = sorted(matched + retained, key=lambda r: int(r["id"])) + created

    return {
        "fonte": FONTE,
        "excel": len(excel_rows),
        "json_antes": len(json_rows),
        "json_depois": len(out_rows),
        "matched": len(matched),
        "created": len(created),
        "retained_absent_from_xlsx": len(retained),
        "meta_updates": len(meta_updates),
        "geom_updates": len(geom_updates),
        "match_via": dict(match_via),
        "out_rows": out_rows,
        "created_rows": created,
        "retained_rows": retained,
        "meta_update_rows": meta_updates,
        "geom_update_rows": geom_updates,
    }


def _serialize_row(row: dict) -> dict:
    """Campos do JSON oficial (mesmo contrato do sync_orcamento_from_xlsm)."""
    return {
        "id": int(row["id"]),
        "medida": row.get("medida") or "",
        "tamanho_raw": row.get("tamanho_raw"),
        "tamanho_tipo": row.get("tamanho_tipo"),
        "diametro_cm": row.get("diametro_cm"),
        "formato": row.get("formato"),
        "faca": row.get("faca") or row.get("formato"),
        "puxada": row.get("puxada"),
        "z": row.get("z"),
        "repeticao": row.get("repeticao"),
        "maquina_catalogo": row.get("maquina_catalogo"),
        "maquina_origem": row.get("maquina_origem"),
        "largura_faca": row.get("largura_faca"),
        "n_facas": row.get("n_facas"),
        "cilindro": row.get("cilindro"),
        "colunas_mapa": row.get("colunas_mapa"),
        "conjugada": row.get("conjugada"),
        "fornecedor": row.get("fornecedor"),
        "cliente_nota": row.get("cliente_nota"),
        "completa": bool(row.get("completa", True)),
        "label": row.get("label") or _build_label(row),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--xlsx", type=Path, required=True)
    ap.add_argument("--json", type=Path, default=OUT_MAPA)
    ap.add_argument("--write", action="store_true", help="Grava mapa_facas.json + backup + relatório")
    ap.add_argument("--report", type=Path, default=None)
    args = ap.parse_args(argv)

    if not args.xlsx.exists():
        print("Arquivo não encontrado:", args.xlsx)
        return 1
    if not args.json.exists():
        print("JSON oficial não encontrado:", args.json)
        return 1

    excel_rows = _load_excel(args.xlsx)
    json_rows = json.loads(args.json.read_text(encoding="utf-8"))
    if not isinstance(json_rows, list):
        print("JSON inválido: esperava lista")
        return 1

    result = reconcile(excel_rows, json_rows)

    print(
        "Reconcile:",
        f"matched={result['matched']}",
        f"created={result['created']}",
        f"retained={result['retained_absent_from_xlsx']}",
        f"meta_updates={result['meta_updates']}",
        f"geom_updates={result['geom_updates']}",
        f"via={result['match_via']}",
        f"json {result['json_antes']}→{result['json_depois']}",
    )

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report = {
        "fonte": result["fonte"],
        "xlsx": str(args.xlsx),
        "json": str(args.json),
        "gerado_em": stamp,
        "resumo": {
            "excel": result["excel"],
            "json_antes": result["json_antes"],
            "json_depois": result["json_depois"],
            "matched": result["matched"],
            "created": result["created"],
            "retained_absent_from_xlsx": result["retained_absent_from_xlsx"],
            "meta_updates": result["meta_updates"],
            "geom_updates": result["geom_updates"],
            "match_via": result["match_via"],
        },
        "created_sample": [
            {
                "id": r["id"],
                "maquina_catalogo": r.get("maquina_catalogo"),
                "formato": r.get("formato"),
                "medida": r.get("medida"),
                "n_facas": r.get("n_facas"),
                "cliente_nota": r.get("cliente_nota"),
                "label": r.get("label"),
            }
            for r in result["created_rows"][:40]
        ],
        "retained_sample": [
            {
                "id": r.get("id"),
                "maquina_catalogo": r.get("maquina_catalogo"),
                "formato": r.get("formato"),
                "medida": r.get("medida"),
                "n_facas": r.get("n_facas"),
                "cliente_nota": r.get("cliente_nota"),
                "label": r.get("label"),
            }
            for r in result["retained_rows"][:40]
        ],
        "meta_updates_sample": result["meta_update_rows"][:40],
        "geom_updates_sample": result["geom_update_rows"][:40],
    }

    report_path = args.report or (REPORT_DIR / f"mapa_facas_reconcile_{stamp}.json")
    if args.write:
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        bak = args.json.with_suffix(args.json.suffix + f".bak-{stamp}")
        shutil.copy2(args.json, bak)
        print("Backup:", bak)

        payload = [_serialize_row(r) for r in result["out_rows"]]
        args.json.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print("Wrote", args.json, f"({len(payload)} facas) fonte={FONTE}")

        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Report:", report_path)
    else:
        # dry-run: ainda grava relatório em /tmp-like no REPORT_DIR se possível
        try:
            REPORT_DIR.mkdir(parents=True, exist_ok=True)
            dry = REPORT_DIR / f"mapa_facas_reconcile_DRYRUN_{stamp}.json"
            dry.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("Dry-run report:", dry)
        except OSError:
            print(json.dumps(report["resumo"], ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
