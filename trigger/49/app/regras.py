from __future__ import annotations

from datetime import date, datetime, timedelta

from app.config import MODALIDADES_COMPRAS


def periodo_diario(dia: date, janela_dias: int) -> tuple[date, date]:
    dias = max(1, janela_dias)
    return dia - timedelta(days=dias), dia


def periodo_e_ano_inteiro(inicio: date, fim: date) -> bool:
    return inicio.month == 1 and inicio.day == 1 and (fim - inicio).days > 300


def rotulo_modalidade(modalidade_nome: str, codigo_modalidade: int | None) -> str:
    nome = (modalidade_nome or "").strip()
    if nome:
        return nome
    if codigo_modalidade is None:
        return ""
    return MODALIDADES_COMPRAS.get(codigo_modalidade, "")


def parametro_codigo_modalidade(codigo_modalidade: int) -> dict[str, int]:
    """Filtro e coleta usam codigoModalidade, nunca modalidadeIdPncp."""
    return {"codigoModalidade": int(codigo_modalidade)}


def dentro_da_madrugada(
    momento: datetime,
    hora: int,
    minuto: int,
    hora_fim: int,
    minuto_fim: int,
) -> bool:
    atual = (momento.hour, momento.minute)
    return (hora, minuto) <= atual < (hora_fim, minuto_fim)


def rodizio(ids: list[str], ultimo: str | None) -> list[str]:
    ordenados = sorted(ids)
    if not ordenados or ultimo not in ordenados:
        return ordenados
    indice = ordenados.index(ultimo)
    return ordenados[indice + 1 :] + ordenados[: indice + 1]


def faixa_b_autorizada(etapas: dict[str, str]) -> bool:
    # A1 é dimensão auxiliar: erro nela não barra a Faixa B.
    for codigo in ("A2", "A3", "A4"):
        if etapas.get(codigo) != "ok":
            return False
    return True


def decidir_backup(*, coleta_ativa: bool, ja_adiou: bool) -> str:
    if not coleta_ativa:
        return "executar"
    if not ja_adiou:
        return "adiar_30"
    return "executar_registrando"


def decidir_faixa_cd(*, habilitada: bool, anterior_ok: bool) -> bool:
    return habilitada and anterior_ok


def vinculo_compra(numero_controle_pncp_compra: str | None) -> str:
    if (numero_controle_pncp_compra or "").strip():
        return "vinculado"
    return "nao_vinculado"


def a1_deve_rodar(
    ultima_sync: datetime | None,
    escopo_alterado_em: datetime | None,
    agora: datetime,
) -> bool:
    if ultima_sync is None:
        return True
    if escopo_alterado_em and escopo_alterado_em > ultima_sync:
        return True
    return agora - ultima_sync >= timedelta(days=7)
