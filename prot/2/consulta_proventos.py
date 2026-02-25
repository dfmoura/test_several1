#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consulta proventos (pagos ou provisionados) na B3 por investidor (CPF/CNPJ).

Utiliza a API B3 "Eventos Provisionados" (document.txt).
Permite filtrar os resultados por empresa (ticker ou nome).

Uso:
  python consulta_proventos.py --cpf 12345678900 --data 2024-02-19
  python consulta_proventos.py --cpf 12345678900 --data 2024-02-19 --ticker PETR4
  python consulta_proventos.py --cpf 12345678900 --data 2024-02-19 --empresa "Petrobras"
"""
import argparse
import re
from datetime import datetime

from b3_provisioned_events import (
    fetch_all_provisioned_events,
    filter_by_company,
)


def _normalize_document(doc):
    """Mantém só dígitos do CPF/CNPJ."""
    return re.sub(r"\D", "", doc) if doc else ""


def _format_date(d):
    """Garante YYYY-MM-DD."""
    if not d:
        return None
    if isinstance(d, datetime):
        return d.strftime("%Y-%m-%d")
    s = str(d).strip()
    if re.match(r"\d{4}-\d{2}-\d{2}", s):
        return s
    # DD/MM/YYYY -> YYYY-MM-DD
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    return s


def _print_events(events):
    """Imprime eventos em tabela simples."""
    if not events:
        print("Nenhum evento encontrado.")
        return

    # Cabeçalho
    cols = [
        "tickerSymbol",
        "corporationName",
        "corporateActionTypeDescription",
        "paymentDate",
        "eventQuantity",
        "grossAmount",
        "netValue",
        "approvalDate",
    ]
    widths = {c: max(len(c), 8) for c in cols}
    for e in events:
        for c in cols:
            v = e.get(c)
            if v is None:
                v = ""
            widths[c] = max(widths[c], len(str(v)[:40]))

    def row(values, sep=" "):
        return sep.join(str(v)[:40].ljust(widths[c]) for c, v in zip(cols, values))

    print(row([c for c in cols]))
    print("-" * (sum(widths.values()) + len(cols) - 1))
    for e in events:
        print(row([e.get(c, "") for c in cols]))

    # Resumo
    total_bruto = sum((e.get("grossAmount") or 0) for e in events)
    total_liquido = sum((e.get("netValue") or 0) for e in events)
    print("-" * (sum(widths.values()) + len(cols) - 1))
    print(f"Total de eventos: {len(events)} | Soma bruto: {total_bruto:.2f} | Soma líquido: {total_liquido:.2f}")


def main():
    parser = argparse.ArgumentParser(
        description="Consulta proventos B3 (Eventos Provisionados) por CPF/CNPJ e data."
    )
    parser.add_argument(
        "--cpf",
        required=True,
        help="CPF ou CNPJ do investidor (apenas dígitos ou com formatação)",
    )
    parser.add_argument(
        "--data",
        required=True,
        help="Data de referência (YYYY-MM-DD ou DD/MM/YYYY). Deve ser anterior à data atual.",
    )
    parser.add_argument(
        "--ticker",
        default=None,
        help="Filtrar por ticker do ativo (ex: PETR4)",
    )
    parser.add_argument(
        "--empresa",
        default=None,
        help="Filtrar por nome da empresa (trecho do nome)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Saída em JSON (lista de eventos)",
    )
    args = parser.parse_args()

    doc = _normalize_document(args.cpf)
    if len(doc) not in (11, 14):
        print("Erro: CPF deve ter 11 dígitos e CNPJ 14 dígitos.")
        return 2

    ref_date = _format_date(args.data)
    if not ref_date:
        print("Erro: data inválida. Use YYYY-MM-DD ou DD/MM/YYYY.")
        return 2

    try:
        events = fetch_all_provisioned_events(doc, ref_date)
    except Exception as e:
        print(f"Erro ao consultar API B3: {e}")
        return 1

    if args.ticker or args.empresa:
        events = filter_by_company(
            events,
            ticker=args.ticker,
            corporation_name=args.empresa,
        )

    if args.json:
        import json
        print(json.dumps(events, ensure_ascii=False, indent=2))
    else:
        _print_events(events)

    return 0


if __name__ == "__main__":
    exit(main())
