#!/usr/bin/env python3
"""Interface de linha de comando para consultas públicas."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from contratos_consulta.api import ApiCatalog, ApiClient
from contratos_consulta.config import OUTPUT_DIR

console = Console()


def cmd_list(args: argparse.Namespace) -> int:
    catalog = ApiCatalog()
    endpoints = (
        catalog.public_get_endpoints
        if args.public_only
        else catalog.all_endpoints
    )
    if args.tag:
        endpoints = [e for e in endpoints if args.tag.lower() in e.tag_label.lower()]

    table = Table(title="Endpoints da API Contratos.gov.br")
    table.add_column("Acesso", style="bold")
    table.add_column("Método")
    table.add_column("Caminho")
    table.add_column("Resumo")

    for ep in endpoints:
        access = "Público" if ep.is_public else "Requer login"
        style = "green" if ep.is_safe_read else ("yellow" if ep.is_public else "red")
        table.add_row(
            f"[{style}]{access}[/]",
            ep.method,
            ep.path,
            ep.summary[:70],
        )
    console.print(table)
    console.print(
        f"\n[dim]Total: {len(endpoints)} | Públicos GET: {len(catalog.public_get_endpoints)}[/dim]"
    )
    return 0


def cmd_consult(args: argparse.Namespace) -> int:
    catalog = ApiCatalog()
    ep = catalog.get_by_id(args.endpoint)
    if not ep:
        console.print("[red]Endpoint não encontrado. Use: list --public-only[/red]")
        return 1

    if ep.requires_auth:
        console.print(
            Panel(
                "Este endpoint exige autenticação (Bearer). "
                "Sem credenciais, a API retornará 401.",
                title="Aviso",
                border_style="yellow",
            )
        )
        if not args.force:
            console.print("[dim]Use --force para tentar mesmo assim.[/dim]")
            return 1

    path_values = {}
    query_values = {}
    for item in args.param or []:
        if "=" not in item:
            console.print(f"[red]Parâmetro inválido (use nome=valor): {item}[/red]")
            return 1
        key, value = item.split("=", 1)
        key = key.strip()
        value = value.strip()
        if "{" + key + "}" in ep.path:
            path_values[key] = value
        else:
            query_values[key] = value

    try:
        url = catalog.build_url(ep, path_values, query_values or None)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        return 1

    console.print(f"[cyan]GET[/cyan] {url}")
    client = ApiClient()
    response = client.get(url) if ep.method == "GET" else client.request(ep.method, url)

    if response.error:
        console.print(f"[red]{response.error}[/red]")
        return 2

    status_style = "green" if response.ok else "red"
    console.print(
        f"[{status_style}]HTTP {response.status_code}[/] "
        f"({response.elapsed_ms:.0f} ms)"
    )

    if response.is_auth_error:
        console.print(
            "[yellow]Autenticação necessária. Este sistema usa apenas endpoints públicos.[/yellow]"
        )

    output = response.pretty_json()
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output, encoding="utf-8")
        console.print(f"[green]Salvo em:[/green] {out_path}")
    else:
        console.print(Panel(output[:12000] + ("" if len(output) > 12000 else "")))

    return 0 if response.ok else 3


def cmd_quick(args: argparse.Namespace) -> int:
    """Atalhos para consultas frequentes."""
    shortcuts = {
        "orgaos": "GET:/api/contrato/orgaos",
        "unidades": "GET:/api/contrato/unidades",
    }
    key = args.what.lower()
    if key not in shortcuts:
        console.print(f"[red]Atalho desconhecido. Opções: {', '.join(shortcuts)}[/red]")
        return 1
    args.endpoint = shortcuts[key]
    args.param = []
    args.force = False
    args.output = args.output
    return cmd_consult(args)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Consulta pública à API Contratos.gov.br (sem login).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python -m contratos_consulta.cli list --public-only
  python -m contratos_consulta.cli quick orgaos
  python -m contratos_consulta.cli consult \\
    --endpoint "GET:/api/contrato/id/{contrato_id}" \\
    --param contrato_id=12345
  python -m contratos_consulta.cli consult \\
    --endpoint "GET:/api/contrato/ug/{unidade_codigo}" \\
    --param unidade_codigo=200999 -o output/contratos.json
        """,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="Lista endpoints do catálogo")
    p_list.add_argument(
        "--public-only",
        action="store_true",
        help="Mostra apenas GET públicos (sem login)",
    )
    p_list.add_argument("--tag", help="Filtra por tag/categoria")
    p_list.set_defaults(func=cmd_list)

    p_consult = sub.add_parser("consult", help="Executa uma consulta")
    p_consult.add_argument(
        "--endpoint",
        required=True,
        help='ID do endpoint, ex: GET:/api/contrato/orgaos',
    )
    p_consult.add_argument(
        "--param",
        action="append",
        help="Parâmetro nome=valor (path ou query)",
    )
    p_consult.add_argument(
        "-o", "--output",
        help="Arquivo JSON de saída",
    )
    p_consult.add_argument(
        "--force",
        action="store_true",
        help="Tenta endpoint que exige autenticação",
    )
    p_consult.set_defaults(func=cmd_consult)

    p_quick = sub.add_parser("quick", help="Consultas rápidas")
    p_quick.add_argument("what", choices=["orgaos", "unidades"])
    p_quick.add_argument("-o", "--output", help="Arquivo JSON de saída")
    p_quick.set_defaults(func=cmd_quick)

    return parser


def main(argv: list[str] | None = None) -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
