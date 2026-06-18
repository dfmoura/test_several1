"""CLI — coleta, importação e consulta de licitações."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from weblicitacoes_consulta.config import EMPRESAS, OUTPUT_DIR
from weblicitacoes_consulta.db.repository import LicitacaoRepository
from weblicitacoes_consulta.scraper.collector import LicitacoesCollector
from weblicitacoes_consulta.services import import_csv, persist_records

app = typer.Typer(
    name="weblicitacoes",
    help="Coleta e consulta de licitações — Prefeitura de Uberlândia (Web Licitações).",
    no_args_is_help=True,
)
console = Console()


@app.command("coletar")
def coletar(
    ano: Optional[list[int]] = typer.Option([2026], "--ano", "-a", help="Ano(s) a coletar."),
    empresa: Optional[list[str]] = typer.Option(
        None, "--empresa", "-e", help="Código(s) de empresa (0-9). Padrão: todas."
    ),
    headless: bool = typer.Option(
        False,
        "--headless/--headed",
        help="Headless pode ser bloqueado pelo WAF; prefira --headed.",
    ),
) -> None:
    """Coleta licitações do portal Web Licitações e persiste no banco."""
    empresas = empresa or list(EMPRESAS.keys())
    console.print(f"[bold]Coletando[/bold] anos={ano} empresas={empresas}")

    def progress(msg: str) -> None:
        console.print(f"  [dim]{msg}[/dim]")

    collector = LicitacoesCollector(headless=headless, on_progress=progress)

    with LicitacaoRepository() as repo:
        sync = repo.iniciar_sync({"anos": ano, "empresas": empresas, "headless": headless})
        sync_id = sync.id

    try:
        records = collector.collect(anos=list(ano), empresas=empresas)
        novos, atualizados = persist_records(records)
        with LicitacaoRepository() as repo:
            repo.finalizar_sync(
                sync_id,
                novos=novos,
                atualizados=atualizados,
                total=len(records),
                mensagem="Coleta concluída",
            )
        console.print(
            f"\n[green]✓[/green] {len(records)} coletados — "
            f"[cyan]{novos}[/cyan] novos, [yellow]{atualizados}[/yellow] atualizados"
        )
    except Exception as exc:
        with LicitacaoRepository() as repo:
            repo.finalizar_sync(sync_id, status="error", mensagem=str(exc))
        console.print(f"[red]Erro:[/red] {exc}")
        raise typer.Exit(1) from exc


@app.command("importar-csv")
def importar_csv(
    arquivo: Path = typer.Argument(..., help="Caminho do CSV exportado (sep=;)."),
) -> None:
    """Importa licitações de um CSV municipal para o banco."""
    if not arquivo.exists():
        console.print(f"[red]Arquivo não encontrado:[/red] {arquivo}")
        raise typer.Exit(1)
    novos, atualizados = import_csv(arquivo)
    console.print(
        f"[green]✓[/green] Importação concluída — "
        f"[cyan]{novos}[/cyan] novos, [yellow]{atualizados}[/yellow] atualizados"
    )


@app.command("consultar")
def consultar(
    ano: Optional[int] = typer.Option(None, "--ano", "-a"),
    empresa: Optional[str] = typer.Option(None, "--empresa", "-e", help="Código 0-9."),
    situacao: Optional[str] = typer.Option(None, "--situacao", "-s"),
    modalidade: Optional[str] = typer.Option(None, "--modalidade", "-m"),
    texto: Optional[str] = typer.Option(None, "--texto", "-t", help="Busca em objeto/processo."),
    limit: int = typer.Option(50, "--limit", "-n"),
    exportar: Optional[Path] = typer.Option(None, "--exportar", "-o", help="Salvar JSON."),
) -> None:
    """Consulta licitações persistidas no banco."""
    with LicitacaoRepository() as repo:
        rows, total = repo.buscar(
            ano=ano,
            empresa_codigo=empresa,
            situacao=situacao,
            modalidade=modalidade,
            texto=texto,
            limit=limit,
        )

    if not rows:
        console.print("[yellow]Nenhum registro encontrado.[/yellow]")
        raise typer.Exit(0)

    table = Table(title=f"Licitações ({len(rows)} de {total})")
    table.add_column("Processo", style="cyan")
    table.add_column("Empresa", max_width=25)
    table.add_column("Ano")
    table.add_column("Abertura")
    table.add_column("Situação")
    table.add_column("Objeto", max_width=50)

    data = []
    with LicitacaoRepository() as repo:
        for row in rows:
            table.add_row(
                row.processo,
                row.empresa_nome[:25],
                str(row.ano),
                row.data_abertura.strftime("%d/%m/%Y") if row.data_abertura else "—",
                row.situacao or "—",
                (row.descricao_edital or "")[:50],
            )
            data.append(repo.licitacao_to_dict(row))

    console.print(table)

    if exportar:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        path = exportar if exportar.is_absolute() else OUTPUT_DIR / exportar
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        console.print(f"[green]Exportado:[/green] {path}")


@app.command("stats")
def stats() -> None:
    """Estatísticas do banco de dados."""
    with LicitacaoRepository() as repo:
        info = repo.estatisticas()
        syncs = repo.ultimas_syncs(5)

    console.print(f"\n[bold]Total de licitações:[/bold] {info['total']}\n")

    if info["por_ano"]:
        t = Table(title="Por ano")
        t.add_column("Ano")
        t.add_column("Qtd", justify="right")
        for ano, qtd in info["por_ano"].items():
            t.add_row(str(ano), str(qtd))
        console.print(t)

    if info["por_situacao"]:
        t = Table(title="Por situação")
        t.add_column("Situação")
        t.add_column("Qtd", justify="right")
        for sit, qtd in list(info["por_situacao"].items())[:10]:
            t.add_row(sit, str(qtd))
        console.print(t)

    if syncs:
        t = Table(title="Últimas sincronizações")
        t.add_column("ID")
        t.add_column("Início")
        t.add_column("Status")
        t.add_column("Novos")
        t.add_column("Atualiz.")
        for s in syncs:
            t.add_row(
                str(s.id),
                s.iniciado_em.strftime("%d/%m/%Y %H:%M"),
                s.status,
                str(s.novos),
                str(s.atualizados),
            )
        console.print(t)


@app.command("empresas")
def listar_empresas() -> None:
    """Lista códigos de empresas/órgãos disponíveis no portal."""
    table = Table(title="Empresas — Web Licitações Uberlândia")
    table.add_column("Código", style="cyan")
    table.add_column("Nome")
    for codigo, nome in EMPRESAS.items():
        table.add_row(codigo, nome)
    console.print(table)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
