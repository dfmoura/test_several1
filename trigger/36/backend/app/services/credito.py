"""Motor de análise de crédito do cliente (domínio RLP — trigger/32).

Política: LIMITE É POLÍTICA, LIBERAÇÃO É EXCEÇÃO.
  • EXPOSIÇÃO = títulos a receber em aberto + carteira (PED não faturados)
  • SALDO = LIMITE − EXPOSIÇÃO
  • Situação calculada: NORMAL | ATENCAO | BLOQUEADO | BLOQUEIO_MANUAL
  • Orçamento só ALERTA; conversão/liberação/faturamento verificam de verdade.

Não altera o ciclo ORC→PED→OP→NF→TIT→BX: só informa e exige justificativa
quando a liberação for exceção à regra.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Pedido,
    PedidoStatus,
    Titulo,
    TituloStatus,
    TituloTipo,
)
from app.services.codes import dec

# Status de PED que ainda consomem limite (carteira — ainda não viraram TIT).
_CARTEIRA_STATUS = (
    PedidoStatus.NOVO,
    PedidoStatus.AGUARDA_CREDITO,
    PedidoStatus.AGUARDA_ADIANTAMENTO,
    PedidoStatus.LIBERADO,
    PedidoStatus.EM_PRODUCAO,
    PedidoStatus.EM_SEPARACAO,
)

_TITULO_ABERTO = (TituloStatus.ABERTO, TituloStatus.PARCIAL)


class SituacaoCredito(str, Enum):
    NORMAL = "NORMAL"
    ATENCAO = "ATENCAO"
    BLOQUEADO = "BLOQUEADO"
    BLOQUEIO_MANUAL = "BLOQUEIO_MANUAL"


class MotivoBloqueio(str, Enum):
    LIMITE = "LIMITE"
    ATRASO = "ATRASO"
    MANUAL = "MANUAL"


class AlcadaLiberacao(str, Enum):
    """Alçada sugerida (§5) — informativa; enforcement leve via justificativa."""

    AUTOMATICA = "AUTOMATICA"  # dentro do limite, sem atraso
    FINANCEIRO = "FINANCEIRO"  # estouro até 10% ou liberação pontual
    DIRECAO = "DIRECAO"  # atraso, estouro >10%, bloqueio manual


@dataclass(frozen=True)
class CreditoParametros:
    """Parâmetros de política (§6.2 / §5) — centralizados, não espalhados na API."""

    tolerancia_atraso_dias: int = 3
    alerta_exposicao_pct: Decimal = Decimal("80")
    validade_analise_meses: int = 12
    alcada_financeiro_limite: Decimal = Decimal("10000")
    alcada_estouro_pct_financeiro: Decimal = Decimal("10")
    liberacao_validade_dias: int = 7
    motivo_min_len: int = 15
    sugestao_teto_entrada: Decimal = Decimal("5000")


DEFAULT_PARAMS = CreditoParametros()


@dataclass
class TituloVencidoInfo:
    titulo_id: int
    codigo: str
    valor_aberto: Decimal
    vencimento: date | None
    dias_atraso: int


@dataclass
class AnaliseCredito:
    parceiro_id: int
    limite: Decimal
    titulos_abertos: Decimal
    carteira_pedidos: Decimal
    exposicao: Decimal
    saldo_disponivel: Decimal
    situacao: SituacaoCredito
    motivos: list[str] = field(default_factory=list)
    motivos_bloqueio: list[str] = field(default_factory=list)
    pct_uso_limite: Decimal = Decimal("0")
    atraso_max_dias: int = 0
    titulos_vencidos: list[TituloVencidoInfo] = field(default_factory=list)
    bloqueio_manual: bool = False
    analise_vencida: bool = False
    credito_validade_ate: date | None = None
    params: CreditoParametros = field(default_factory=CreditoParametros)

    @property
    def bloqueia(self) -> bool:
        return self.situacao in (SituacaoCredito.BLOQUEADO, SituacaoCredito.BLOQUEIO_MANUAL)

    def to_dict(self, *, incluir_titulos: bool = True) -> dict[str, Any]:
        data: dict[str, Any] = {
            "parceiro_id": self.parceiro_id,
            "limite": self.limite,
            "titulos_abertos": self.titulos_abertos,
            "carteira_pedidos": self.carteira_pedidos,
            "exposicao": self.exposicao,
            "saldo_disponivel": self.saldo_disponivel,
            "situacao": self.situacao.value,
            "motivos": list(self.motivos),
            "motivos_bloqueio": list(self.motivos_bloqueio),
            "pct_uso_limite": self.pct_uso_limite,
            "atraso_max_dias": self.atraso_max_dias,
            "bloqueia": self.bloqueia,
            "bloqueio_manual": self.bloqueio_manual,
            "analise_vencida": self.analise_vencida,
            "credito_validade_ate": self.credito_validade_ate.isoformat()
            if self.credito_validade_ate
            else None,
            "params": {
                "tolerancia_atraso_dias": self.params.tolerancia_atraso_dias,
                "alerta_exposicao_pct": self.params.alerta_exposicao_pct,
                "liberacao_validade_dias": self.params.liberacao_validade_dias,
            },
        }
        if incluir_titulos:
            data["titulos_vencidos"] = [
                {
                    "titulo_id": t.titulo_id,
                    "codigo": t.codigo,
                    "valor_aberto": t.valor_aberto,
                    "vencimento": t.vencimento.isoformat() if t.vencimento else None,
                    "dias_atraso": t.dias_atraso,
                }
                for t in self.titulos_vencidos
            ]
        return data


@dataclass
class VerificacaoPedido:
    """Resultado da verificação plena para um PED (§6.1 pontos 2–3)."""

    analise: AnaliseCredito
    valor_pedido: Decimal
    exposicao_com_pedido: Decimal
    saldo_apos: Decimal
    libera_automatico: bool
    requer_justificativa: bool
    alcada: AlcadaLiberacao
    motivos: list[str] = field(default_factory=list)
    estouro: Decimal = Decimal("0")
    estouro_pct: Decimal = Decimal("0")

    def to_dict(self) -> dict[str, Any]:
        return {
            "analise": self.analise.to_dict(),
            "valor_pedido": self.valor_pedido,
            "exposicao_com_pedido": self.exposicao_com_pedido,
            "saldo_apos": self.saldo_apos,
            "libera_automatico": self.libera_automatico,
            "requer_justificativa": self.requer_justificativa,
            "alcada": self.alcada.value,
            "motivos": list(self.motivos),
            "estouro": self.estouro,
            "estouro_pct": self.estouro_pct,
        }


def sugerir_limite_inicial(
    compra_mensal_estimada: Decimal | float | str,
    *,
    params: CreditoParametros = DEFAULT_PARAMS,
    restricao_bureau: bool = False,
) -> Decimal:
    """Régua §3.3 — sugestão; decisão humana permanece no Financeiro."""
    if restricao_bureau:
        return Decimal("0.00")
    base = dec(compra_mensal_estimada)
    if base <= 0:
        return Decimal("0.00")
    return min(base, params.sugestao_teto_entrada)


def _hoje() -> date:
    return datetime.utcnow().date()


def somar_titulos_abertos(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Titulo.valor_aberto), 0))
        .filter(
            Titulo.empresa_id == empresa_id,
            Titulo.parceiro_id == parceiro_id,
            Titulo.tipo == TituloTipo.RECEBER,
            Titulo.status.in_(_TITULO_ABERTO),
        )
        .scalar()
    )
    return dec(total or 0)


def somar_carteira_pedidos(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    excluir_pedido_id: int | None = None,
) -> Decimal:
    q = db.query(func.coalesce(func.sum(Pedido.valor_total), 0)).filter(
        Pedido.empresa_id == empresa_id,
        Pedido.parceiro_id == parceiro_id,
        Pedido.status.in_(_CARTEIRA_STATUS),
    )
    if excluir_pedido_id is not None:
        q = q.filter(Pedido.id != excluir_pedido_id)
    return dec(q.scalar() or 0)


def listar_titulos_vencidos(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    referencia: date | None = None,
) -> list[TituloVencidoInfo]:
    ref = referencia or _hoje()
    rows = (
        db.query(Titulo)
        .filter(
            Titulo.empresa_id == empresa_id,
            Titulo.parceiro_id == parceiro_id,
            Titulo.tipo == TituloTipo.RECEBER,
            Titulo.status.in_(_TITULO_ABERTO),
            Titulo.vencimento.isnot(None),
            Titulo.vencimento < ref,
        )
        .order_by(Titulo.vencimento.asc())
        .all()
    )
    out: list[TituloVencidoInfo] = []
    for t in rows:
        dias = (ref - t.vencimento).days if t.vencimento else 0
        out.append(
            TituloVencidoInfo(
                titulo_id=t.id,
                codigo=t.codigo,
                valor_aberto=dec(t.valor_aberto or 0),
                vencimento=t.vencimento,
                dias_atraso=max(0, dias),
            )
        )
    return out


def avaliar_parceiro(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    limite: Decimal | float | str | None,
    bloqueio_manual: bool = False,
    credito_validade_ate: date | None = None,
    excluir_pedido_id: int | None = None,
    params: CreditoParametros = DEFAULT_PARAMS,
    referencia: date | None = None,
) -> AnaliseCredito:
    """Calcula exposição e situação do cliente (§2)."""
    ref = referencia or _hoje()
    lim = dec(limite or 0)
    titulos = somar_titulos_abertos(db, empresa_id=empresa_id, parceiro_id=parceiro_id)
    carteira = somar_carteira_pedidos(
        db,
        empresa_id=empresa_id,
        parceiro_id=parceiro_id,
        excluir_pedido_id=excluir_pedido_id,
    )
    exposicao = dec(titulos + carteira)
    saldo = dec(lim - exposicao)
    pct = Decimal("0.00")
    if lim > 0:
        pct = dec((exposicao / lim) * Decimal("100"))

    vencidos = listar_titulos_vencidos(
        db, empresa_id=empresa_id, parceiro_id=parceiro_id, referencia=ref
    )
    atraso_max = max((v.dias_atraso for v in vencidos), default=0)
    atraso_bloqueante = atraso_max > params.tolerancia_atraso_dias

    motivos: list[str] = []
    motivos_bloq: list[str] = []
    situacao = SituacaoCredito.NORMAL

    analise_vencida = bool(credito_validade_ate and credito_validade_ate < ref)

    if bloqueio_manual:
        situacao = SituacaoCredito.BLOQUEIO_MANUAL
        motivos_bloq.append(MotivoBloqueio.MANUAL.value)
        motivos.append("Bloqueio manual do financeiro/direção")
    elif atraso_bloqueante:
        situacao = SituacaoCredito.BLOQUEADO
        motivos_bloq.append(MotivoBloqueio.ATRASO.value)
        motivos.append(
            f"Título vencido há {atraso_max} dia(s) "
            f"(tolerância {params.tolerancia_atraso_dias}d)"
        )
    elif lim <= 0 and exposicao > 0:
        situacao = SituacaoCredito.BLOQUEADO
        motivos_bloq.append(MotivoBloqueio.LIMITE.value)
        motivos.append("Limite zero — venda a prazo exige análise/concessão de crédito")
    elif exposicao > lim:
        situacao = SituacaoCredito.BLOQUEADO
        motivos_bloq.append(MotivoBloqueio.LIMITE.value)
        motivos.append(f"Exposição {exposicao} acima do limite {lim}")
    elif lim > 0 and pct >= params.alerta_exposicao_pct:
        situacao = SituacaoCredito.ATENCAO
        motivos.append(f"Uso do limite em {pct}% (≥ {params.alerta_exposicao_pct}%)")
    elif atraso_max >= 1:
        situacao = SituacaoCredito.ATENCAO
        motivos.append(f"Título vencido há {atraso_max} dia(s) dentro da tolerância")

    if analise_vencida:
        motivos.append("Análise de crédito vencida — reconsulta antes de aumentar limite")

    if situacao == SituacaoCredito.NORMAL and not motivos:
        motivos.append("Sem atraso e dentro do limite")

    return AnaliseCredito(
        parceiro_id=parceiro_id,
        limite=lim,
        titulos_abertos=titulos,
        carteira_pedidos=carteira,
        exposicao=exposicao,
        saldo_disponivel=saldo if saldo > 0 else Decimal("0.00"),
        situacao=situacao,
        motivos=motivos,
        motivos_bloqueio=motivos_bloq,
        pct_uso_limite=pct,
        atraso_max_dias=atraso_max,
        titulos_vencidos=vencidos,
        bloqueio_manual=bloqueio_manual,
        analise_vencida=analise_vencida,
        credito_validade_ate=credito_validade_ate,
        params=params,
    )


def verificar_pedido(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    limite: Decimal | float | str | None,
    valor_pedido: Decimal | float | str,
    pedido_id: int | None = None,
    bloqueio_manual: bool = False,
    credito_validade_ate: date | None = None,
    liberacoes_mes_cliente: int = 0,
    params: CreditoParametros = DEFAULT_PARAMS,
) -> VerificacaoPedido:
    """Verificação plena ao liberar PED por crédito (§6 / §7).

    O valor do pedido em análise é somado à exposição excluindo-o da carteira
    (evita double-count se já estiver AGUARDA_CREDITO).
    """
    valor = dec(valor_pedido)
    analise = avaliar_parceiro(
        db,
        empresa_id=empresa_id,
        parceiro_id=parceiro_id,
        limite=limite,
        bloqueio_manual=bloqueio_manual,
        credito_validade_ate=credito_validade_ate,
        excluir_pedido_id=pedido_id,
        params=params,
    )
    lim = analise.limite
    exposicao_com = dec(analise.exposicao + valor)
    saldo_apos = dec(lim - exposicao_com)
    estouro = dec(max(Decimal("0"), exposicao_com - lim)) if lim >= 0 else valor
    estouro_pct = Decimal("0.00")
    if lim > 0 and estouro > 0:
        estouro_pct = dec((estouro / lim) * Decimal("100"))

    motivos: list[str] = []
    libera_auto = True
    alcada = AlcadaLiberacao.AUTOMATICA

    if bloqueio_manual:
        libera_auto = False
        alcada = AlcadaLiberacao.DIRECAO
        motivos.append("Cliente com bloqueio manual")
    if analise.atraso_max_dias > params.tolerancia_atraso_dias:
        libera_auto = False
        alcada = AlcadaLiberacao.DIRECAO
        motivos.append(
            f"Atraso de {analise.atraso_max_dias}d exige liberação com alçada da direção"
        )
    if lim <= 0:
        libera_auto = False
        if alcada == AlcadaLiberacao.AUTOMATICA:
            alcada = AlcadaLiberacao.FINANCEIRO
        motivos.append("Limite zero — liberação é exceção (preferir à vista/adiantamento)")
    elif exposicao_com > lim:
        libera_auto = False
        motivos.append(f"Pedido estoura limite em R$ {estouro}")
        if (
            estouro_pct > params.alcada_estouro_pct_financeiro
            or liberacoes_mes_cliente >= 1
        ):
            alcada = AlcadaLiberacao.DIRECAO
            motivos.append(
                "Estouro >10% ou reincidência no mês — alçada direção (§5)"
            )
        else:
            alcada = AlcadaLiberacao.FINANCEIRO

    return VerificacaoPedido(
        analise=analise,
        valor_pedido=valor,
        exposicao_com_pedido=exposicao_com,
        saldo_apos=saldo_apos if saldo_apos > 0 else Decimal("0.00"),
        libera_automatico=libera_auto,
        requer_justificativa=not libera_auto,
        alcada=alcada,
        motivos=motivos or ["Dentro da política — liberação automática"],
        estouro=estouro,
        estouro_pct=estouro_pct,
    )


def contar_liberacoes_credito_mes(
    db: Session,
    *,
    empresa_id: int,
    parceiro_id: int,
    excluir_pedido_id: int | None = None,
    referencia: date | None = None,
) -> int:
    """Conta liberações excepcionais do cliente no mês corrente (reincidência §5)."""
    ref = referencia or _hoje()
    inicio = datetime(ref.year, ref.month, 1)
    q = db.query(Pedido).filter(
        Pedido.empresa_id == empresa_id,
        Pedido.parceiro_id == parceiro_id,
        Pedido.credito_ok.is_(True),
        Pedido.updated_at >= inicio,
    )
    if excluir_pedido_id is not None:
        q = q.filter(Pedido.id != excluir_pedido_id)
    count = 0
    for p in q.all():
        snap = getattr(p, "credito_liberacao", None) or {}
        if isinstance(snap, dict) and snap.get("modo") == "credito" and snap.get("excecao"):
            count += 1
    return count


def montar_snapshot_liberacao(
    *,
    verificacao: VerificacaoPedido,
    modo: str,
    justificativa: str | None,
    user_email: str | None,
    excecao: bool,
) -> dict[str, Any]:
    """Fotografia da liberação (§7.3) — mesmo espírito do snapshot do ORC."""
    agora = datetime.utcnow()
    validade = agora + timedelta(days=verificacao.analise.params.liberacao_validade_dias)
    return {
        "modo": modo,
        "excecao": excecao,
        "liberado_em": agora.isoformat(),
        "valido_ate": validade.date().isoformat(),
        "autor": user_email,
        "justificativa": (justificativa or "").strip() or None,
        "alcada": verificacao.alcada.value,
        "motivos": list(verificacao.motivos),
        "fotografia": {
            "limite": str(verificacao.analise.limite),
            "exposicao": str(verificacao.analise.exposicao),
            "exposicao_com_pedido": str(verificacao.exposicao_com_pedido),
            "valor_liberado": str(verificacao.valor_pedido),
            "atraso_max_dias": verificacao.analise.atraso_max_dias,
            "situacao": verificacao.analise.situacao.value,
            "estouro": str(verificacao.estouro),
            "estouro_pct": str(verificacao.estouro_pct),
        },
    }


def liberacao_ainda_valida(snapshot: dict[str, Any] | None, *, hoje: date | None = None) -> bool:
    if not snapshot:
        return False
    ref = hoje or _hoje()
    raw = snapshot.get("valido_ate")
    if not raw:
        return True
    try:
        limite = date.fromisoformat(str(raw)[:10])
    except ValueError:
        return True
    return ref <= limite


def validar_justificativa(texto: str | None, *, params: CreditoParametros = DEFAULT_PARAMS) -> str:
    j = (texto or "").strip()
    if len(j) < params.motivo_min_len:
        raise ValueError(
            f"Justificativa obrigatória na liberação excepcional "
            f"(mínimo {params.motivo_min_len} caracteres)"
        )
    return j


def alerta_orcamento(analise: AnaliseCredito, valor_estimado: Decimal | float | str | None = None) -> dict[str, Any]:
    """Alerta não-bloqueante para ORC (§6.1 ponto 1)."""
    base = analise.to_dict(incluir_titulos=False)
    base["bloqueante"] = False
    base["tipo"] = "ALERTA"
    if valor_estimado is not None:
        v = dec(valor_estimado)
        base["valor_estimado"] = v
        base["caberia_no_limite"] = (analise.exposicao + v) <= analise.limite and not analise.bloqueia
    return base


def params_to_public_dict(params: CreditoParametros = DEFAULT_PARAMS) -> dict[str, Any]:
    d = asdict(params)
    for k, v in list(d.items()):
        if isinstance(v, Decimal):
            d[k] = str(v)
    return d
