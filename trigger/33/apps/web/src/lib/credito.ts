/**
 * Motor de crédito do cliente (INCLUSAO_LIBERACAO_LIMITE_CREDITO_CLIENTE.txt).
 *
 * Orçamento NÃO consome limite. Consumo começa na conversão ORC→PED.
 * Quem vende não libera crédito (SoD).
 */

import {
  CreditoPedidoFlag,
  PedidoVendaStatus,
  SituacaoCreditoCliente,
  TituloReceberStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getParametro, PARAM_KEYS, round2 } from "@/lib/ciclo-params";

export type VerificacaoCredito = {
  flag: CreditoPedidoFlag;
  motivo: string | null;
  limite: number;
  exposicao: number;
  disponivel: number;
  percentualSinal: number;
  situacaoCliente: SituacaoCreditoCliente;
};

const CONDICOES_SEM_CREDITO = [
  "a vista",
  "à vista",
  "avista",
  "pix",
  "antecipado",
  "adiantamento",
  "sinal",
  "50%",
];

export function condicaoExigeCredito(condicao: string | null | undefined): boolean {
  const c = (condicao || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!c.trim()) return true;
  return !CONDICOES_SEM_CREDITO.some((k) => c.includes(k.normalize("NFD").replace(/\p{M}/gu, "")));
}

export function percentualSinalDaCondicao(condicao: string | null | undefined): number {
  const c = (condicao || "").toLowerCase();
  if (c.includes("50%")) return 50;
  if (c.includes("sinal") || c.includes("adiantamento")) return 50;
  if (c.includes("pix") || c.includes("à vista") || c.includes("a vista") || c.includes("antecipado")) {
    return 100;
  }
  return 0;
}

export async function calcularExposicaoCliente(opts: {
  empresaId: string;
  parceiroId: string;
  excluirPedidoId?: string;
}): Promise<number> {
  const titulos = await prisma.tituloReceber.findMany({
    where: {
      empresaId: opts.empresaId,
      status: { in: [TituloReceberStatus.ABERTO, TituloReceberStatus.PARCIAL, TituloReceberStatus.VENCIDO] },
      OR: [
        { clienteParceiroId: opts.parceiroId },
        { pedidoVenda: { clienteParceiroId: opts.parceiroId } },
      ],
    },
    select: { valor: true, valorPago: true },
  });

  let exposicao = 0;
  for (const t of titulos) {
    exposicao += Math.max(0, Number(t.valor) - Number(t.valorPago));
  }

  const pedidosCarteira = await prisma.pedidoVenda.findMany({
    where: {
      empresaId: opts.empresaId,
      clienteParceiroId: opts.parceiroId,
      status: {
        in: [
          PedidoVendaStatus.RASCUNHO,
          PedidoVendaStatus.AGUARDA_CREDITO,
          PedidoVendaStatus.AGUARDA_ADIANTAMENTO,
          PedidoVendaStatus.LIBERADO,
          PedidoVendaStatus.CONFIRMADO,
          PedidoVendaStatus.EM_PRODUCAO,
          PedidoVendaStatus.PRODUZIDO,
          PedidoVendaStatus.FATURADO,
          PedidoVendaStatus.ENTREGUE,
        ],
      },
      ...(opts.excluirPedidoId ? { NOT: { id: opts.excluirPedidoId } } : {}),
    },
    select: {
      id: true,
      valorTotal: true,
      titulosReceber: { select: { valor: true, valorPago: true, status: true } },
    },
  });

  for (const p of pedidosCarteira) {
    const jaEmTitulo = p.titulosReceber
      .filter((t) => t.status !== TituloReceberStatus.CANCELADO)
      .reduce((s, t) => s + Number(t.valor), 0);
    // Carteira ainda não faturada: valor do pedido não coberto por título
    const residual = Math.max(0, Number(p.valorTotal) - jaEmTitulo);
    exposicao += residual;
  }

  return round2(exposicao);
}

export async function verificarCreditoParaPedido(opts: {
  empresaId: string;
  clienteParceiroId: string | null | undefined;
  valorPedido: number;
  condicaoPagamento?: string | null;
}): Promise<VerificacaoCredito> {
  const sinalPctDefault = await getParametro<number>(PARAM_KEYS.creditoSinalPctNovoCliente, 50);
  const tolerancAtrasoDias = await getParametro<number>(PARAM_KEYS.creditoToleranciaAtrasoDias, 7);

  if (!opts.clienteParceiroId) {
    // Prospect / sem cadastro → exige adiantamento integral
    return {
      flag: CreditoPedidoFlag.AGUARDA_ADIANTAMENTO,
      motivo: "Cliente sem cadastro fiscal — exige adiantamento (prospect)",
      limite: 0,
      exposicao: 0,
      disponivel: 0,
      percentualSinal: 100,
      situacaoCliente: SituacaoCreditoCliente.NORMAL,
    };
  }

  const parceiro = await prisma.parceiro.findUnique({
    where: { id: opts.clienteParceiroId },
  });
  if (!parceiro) {
    return {
      flag: CreditoPedidoFlag.BLOQUEADO,
      motivo: "Parceiro não encontrado",
      limite: 0,
      exposicao: 0,
      disponivel: 0,
      percentualSinal: sinalPctDefault,
      situacaoCliente: SituacaoCreditoCliente.BLOQUEADO,
    };
  }

  if (parceiro.situacaoCredito === SituacaoCreditoCliente.BLOQUEIO_MANUAL) {
    return {
      flag: CreditoPedidoFlag.BLOQUEADO,
      motivo: "Cliente com bloqueio manual de crédito",
      limite: Number(parceiro.limiteCredito),
      exposicao: 0,
      disponivel: 0,
      percentualSinal: percentualSinalDaCondicao(opts.condicaoPagamento) || sinalPctDefault,
      situacaoCliente: SituacaoCreditoCliente.BLOQUEIO_MANUAL,
    };
  }

  const limite = Number(parceiro.limiteCredito);
  const exposicao = await calcularExposicaoCliente({
    empresaId: opts.empresaId,
    parceiroId: parceiro.id,
  });
  const disponivel = round2(Math.max(0, limite - exposicao));

  // Títulos em atraso além da tolerância
  const corte = new Date();
  corte.setDate(corte.getDate() - tolerancAtrasoDias);
  const titulosVencidos = await prisma.tituloReceber.findMany({
    where: {
      empresaId: opts.empresaId,
      status: { in: [TituloReceberStatus.VENCIDO, TituloReceberStatus.ABERTO, TituloReceberStatus.PARCIAL] },
      vencimento: { lt: corte },
      OR: [
        { clienteParceiroId: parceiro.id },
        { pedidoVenda: { clienteParceiroId: parceiro.id } },
      ],
    },
    select: { valor: true, valorPago: true },
  });
  const temAtrasoRelevante = titulosVencidos.some((t) => Number(t.valor) - Number(t.valorPago) > 0.009);

  const exigeCredito = condicaoExigeCredito(opts.condicaoPagamento);
  const sinalPct = percentualSinalDaCondicao(opts.condicaoPagamento);

  // Limite 0 ou condição à vista/PIX → adiantamento
  if (!exigeCredito || limite <= 0 || sinalPct >= 100) {
    return {
      flag: CreditoPedidoFlag.AGUARDA_ADIANTAMENTO,
      motivo:
        limite <= 0
          ? "Limite zero — somente à vista / adiantamento"
          : "Condição exige recebimento antecipado",
      limite,
      exposicao,
      disponivel,
      percentualSinal: sinalPct || (limite <= 0 ? sinalPctDefault : 100),
      situacaoCliente: temAtrasoRelevante
        ? SituacaoCreditoCliente.BLOQUEADO
        : SituacaoCreditoCliente.NORMAL,
    };
  }

  if (sinalPct > 0 && sinalPct < 100) {
    // Misto: verifica saldo a prazo contra limite
    const saldoPrazo = round2(opts.valorPedido * (1 - sinalPct / 100));
    if (temAtrasoRelevante || saldoPrazo > disponivel + 0.009) {
      return {
        flag: CreditoPedidoFlag.BLOQUEADO,
        motivo: temAtrasoRelevante
          ? "Cliente com títulos em atraso"
          : `Saldo a prazo (R$ ${saldoPrazo.toFixed(2)}) excede disponível (R$ ${disponivel.toFixed(2)})`,
        limite,
        exposicao,
        disponivel,
        percentualSinal: sinalPct,
        situacaoCliente: SituacaoCreditoCliente.BLOQUEADO,
      };
    }
    return {
      flag: CreditoPedidoFlag.AGUARDA_ADIANTAMENTO,
      motivo: `Sinal de ${sinalPct}% + saldo a prazo dentro do limite`,
      limite,
      exposicao,
      disponivel,
      percentualSinal: sinalPct,
      situacaoCliente:
        exposicao / Math.max(limite, 1) >= 0.8
          ? SituacaoCreditoCliente.ATENCAO
          : SituacaoCreditoCliente.NORMAL,
    };
  }

  if (temAtrasoRelevante) {
    return {
      flag: CreditoPedidoFlag.BLOQUEADO,
      motivo: "Cliente com títulos em atraso além da tolerância",
      limite,
      exposicao,
      disponivel,
      percentualSinal: 0,
      situacaoCliente: SituacaoCreditoCliente.BLOQUEADO,
    };
  }

  if (opts.valorPedido > disponivel + 0.009) {
    return {
      flag: CreditoPedidoFlag.BLOQUEADO,
      motivo: `Pedido (R$ ${opts.valorPedido.toFixed(2)}) excede crédito disponível (R$ ${disponivel.toFixed(2)})`,
      limite,
      exposicao,
      disponivel,
      percentualSinal: 0,
      situacaoCliente: SituacaoCreditoCliente.BLOQUEADO,
    };
  }

  return {
    flag: CreditoPedidoFlag.OK,
    motivo: null,
    limite,
    exposicao,
    disponivel,
    percentualSinal: 0,
    situacaoCliente:
      exposicao / Math.max(limite, 1) >= 0.8
        ? SituacaoCreditoCliente.ATENCAO
        : SituacaoCreditoCliente.NORMAL,
  };
}

/** Liberação pontual de um pedido bloqueado (alçada financeiro). */
export async function liberarCreditoPedido(opts: {
  pedidoId: string;
  userId: string;
  motivo: string;
}) {
  const pedido = await prisma.pedidoVenda.findUnique({ where: { id: opts.pedidoId } });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });
  if (
    pedido.creditoFlag !== CreditoPedidoFlag.BLOQUEADO &&
    pedido.status !== PedidoVendaStatus.AGUARDA_CREDITO
  ) {
    throw Object.assign(new Error("Pedido não está bloqueado por crédito"), { status: 400 });
  }
  if (!opts.motivo.trim()) {
    throw Object.assign(new Error("Motivo obrigatório na liberação de crédito"), { status: 400 });
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: {
        creditoFlag: CreditoPedidoFlag.LIBERADO_MANUAL,
        creditoMotivo: opts.motivo.trim(),
        liberadoCreditoEm: new Date(),
        liberadoCreditoPorId: opts.userId,
        status:
          Number(pedido.percentualSinal) > 0
            ? PedidoVendaStatus.AGUARDA_ADIANTAMENTO
            : PedidoVendaStatus.LIBERADO,
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "PedidoVenda",
        entityId: pedido.id,
        action: "LIBERAR_CREDITO",
        newValue: { motivo: opts.motivo.trim() },
        userId: opts.userId,
      },
    });
    return updated;
  });
}

/** Após baixa de sinal: libera PED para produção se era o bloqueio. */
export async function liberarPedidoAposBaixaSinal(
  tx: Prisma.TransactionClient,
  opts: { pedidoId: string; userId?: string },
) {
  const pedido = await tx.pedidoVenda.findUnique({ where: { id: opts.pedidoId } });
  if (!pedido) return null;
  if (pedido.status !== PedidoVendaStatus.AGUARDA_ADIANTAMENTO) return pedido;
  if (
    pedido.creditoFlag !== CreditoPedidoFlag.AGUARDA_ADIANTAMENTO &&
    pedido.creditoFlag !== CreditoPedidoFlag.LIBERADO_MANUAL &&
    pedido.creditoFlag !== CreditoPedidoFlag.OK
  ) {
    return pedido;
  }

  return tx.pedidoVenda.update({
    where: { id: pedido.id },
    data: {
      status: PedidoVendaStatus.LIBERADO,
      creditoFlag: CreditoPedidoFlag.OK,
      creditoMotivo: "Adiantamento baixado — produção liberada",
      liberadoCreditoEm: new Date(),
    },
  });
}
