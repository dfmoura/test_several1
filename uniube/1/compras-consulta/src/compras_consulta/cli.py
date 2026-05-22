#!/usr/bin/env python3
"""Linha de comando — consultas públicas Compras.gov.br."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from compras_consulta.api import ApiCatalog, ApiClient
from compras_consulta.config import OUTPUT_DIR

console = Console()


def cmd_list(args: argparse.Namespace) -> int:
    catalog = ApiCatalog()
    endpoints = (
        catalog.public_get_endpoints
        if args.public_only
        else catalog.all_endpoints
    )
    if args.tag:
        endpoints = [
            e for e in endpoints if args.tag.lower() in e.tag_label.lower()
        ]

    table = Table(title="API Dados Abertos — Compras.gov.br v2.0")
    table.add_column("Acesso", style="bold")
    table.add_column("Método")
    table.add_column("Caminho")
    table.add_column("Resumo")

    for ep in endpoints:
        access = "Público" if ep.is_public else "Login"
        style = "green" if ep.is_safe_read else "red"
        table.add_row(
            f"[{style}]{access}[/]",
            ep.method,
            ep.path,
            (ep.summary or "")[:60],
        )
    console.print(table)
    console.print(
        f"\n[dim]Total: {len(endpoints)} | GET públicos: "
        f"{len(catalog.public_get_endpoints)}[/dim]"
    )
    return 0


def cmd_consult(args: argparse.Namespace) -> int:
    catalog = ApiCatalog()
    ep = catalog.get_by_id(args.endpoint)
    if not ep:
        console.print("[red]Endpoint não encontrado. Use: list --public-only[/red]")
        return 1

    if ep.requires_auth and not args.force:
        console.print(
            Panel(
                "Endpoint restrito (Alice/usuários). Este projeto usa apenas dados abertos.",
                title="Aviso",
                border_style="yellow",
            )
        )
        return 1

    path_values: dict[str, str] = {}
    query_values: dict[str, str] = {}
    for item in args.param or []:
        if "=" not in item:
            console.print(f"[red]Use nome=valor: {item}[/red]")
            return 1
        key, value = item.split("=", 1)
        key, value = key.strip(), value.strip()
        if "{" + key + "}" in ep.path:
            path_values[key] = value
        else:
            query_values[key] = value

    if "pagina" not in query_values and "page" not in query_values:
        for p in ep.parameters:
            if p.name == "pagina":
                query_values["pagina"] = "1"
                break
            if p.name == "page":
                query_values["page"] = "1"
                break

    try:
        url = catalog.build_url(ep, path_values, query_values or None)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        return 1

    console.print(f"[cyan]GET[/cyan] {url}")
    response = ApiClient().get(url)

    if response.error:
        console.print(f"[red]{response.error}[/red]")
        return 2

    style = "green" if response.ok else "red"
    console.print(
        f"[{style}]HTTP {response.status_code}[/] ({response.elapsed_ms:.0f} ms)"
    )

    output = response.pretty_json()
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output, encoding="utf-8")
        console.print(f"[green]Salvo em:[/green] {out_path}")
    else:
        preview = output[:15000] + ("…" if len(output) > 15000 else "")
        console.print(Panel(preview))

    return 0 if response.ok else 3


def cmd_quick(args: argparse.Namespace) -> int:
    shortcuts = {
        "grupos-material": "GET:/modulo-material/1_consultarGrupoMaterial",
        "secoes-servico": "GET:/modulo-servico/1_consultarSecaoServico",
        "uasg": "GET:/modulo-uasg/1_consultarUasg",
        "orgaos": "GET:/modulo-uasg/2_consultarOrgao",
        "licitacoes": "GET:/modulo-legado/1_consultarLicitacao",
        "contratos": "GET:/modulo-contratos/1_consultarContratos",
        "fornecedor": "GET:/modulo-fornecedor/1_consultarFornecedor",
    }
    key = args.what.lower()
    if key not in shortcuts:
        console.print(
            f"[red]Atalho inválido. Opções: {', '.join(shortcuts)}[/red]"
        )
        return 1
    args.endpoint = shortcuts[key]
    args.param = list(args.param or [])
    if not any(p.startswith("pagina=") or p.startswith("page=") for p in args.param):
        args.param.append("pagina=1")
    args.force = False
    return cmd_consult(args)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Consulta pública — API Dados Abertos Compras.gov.br v2.0",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="Lista endpoints")
    p_list.add_argument("--public-only", action="store_true")
    p_list.add_argument("--tag", help="Filtra módulo/tag")
    p_list.set_defaults(func=cmd_list)

    p_consult = sub.add_parser("consult", help="Executa GET")
    p_consult.add_argument("--endpoint", required=True)
    p_consult.add_argument("--param", action="append")
    p_consult.add_argument("-o", "--output")
    p_consult.add_argument("--force", action="store_true")
    p_consult.set_defaults(func=cmd_consult)

    p_quick = sub.add_parser("quick", help="Consultas rápidas")
    p_quick.add_argument(
        "what",
        choices=[
            "grupos-material",
            "secoes-servico",
            "uasg",
            "orgaos",
            "licitacoes",
            "contratos",
            "fornecedor",
        ],
    )
    p_quick.add_argument("--param", action="append")
    p_quick.add_argument("-o", "--output")
    p_quick.set_defaults(func=cmd_quick)

    return parser


def main(argv: list[str] | None = None) -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
