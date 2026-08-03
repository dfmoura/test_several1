/**
 * Orquestração financeira ERP — AR/AP, saldo/extrato Inter, conciliação, fluxo de caixa.
 * Hubs: Bolepix · Extrato · Saldo (developers.inter.co).
 */

import {
  ConciliacaoStatus,
  MovimentoBancarioOrigem,
  MovimentoBancarioTipo,
  Prisma,
  TituloPagarStatus,
  TituloReceberStatus,
} from "@prisma/client";
import { buildAging, diasAtraso } from "@/domain/financeiro/aging";
import { projetarFluxoCaixa } from "@/domain/financeiro/cashflow";
import {
  consultarExtrato,
  consultarSaldo,
  hashExtratoItem,
  INTER_DEFAULTS,
} from "@/infra/inter/client";
import { prisma } from "@/lib/db";
import { requireEmpresaRaiz } from "@/lib/empresa";

function money(n: Prisma.Decimal | number | null | undefined): number {
  return Math.round(Number(n ?? 0) * 100) / 100;
}

function valorAbertoReceber(t: {
  valor: Prisma.Decimal | number;
  valorPago: Prisma.Decimal | number;
  status: TituloReceberStatus;
}): number {
  if (t.status === TituloReceberStatus.CANCELADO || t.status === TituloReceberStatus.PAGO) {
    return 0;
  }
  return Math.max(0, money(t.valor) - money(t.valorPago));
}

function valorAbertoPagar(t: {
  valor: Prisma.Decimal | number;
  valorPago: Prisma.Decimal | number;
  status: TituloPagarStatus;
}): number {
  if (t.status === TituloPagarStatus.CANCELADO || t.status === TituloPagarStatus.PAGO) {
    return 0;
  }
  return Math.max(0, money(t.valor) - money(t.valorPago));
}

function interCfg() {
  return {
    clientId: process.env.INTER_CLIENT_ID || "",
    clientSecret: process.env.INTER_CLIENT_SECRET || "",
    ambiente: "SANDBOX" as const,
    simular: true,
  };
}

/** Garante conta Inter principal da empresa. */
export async function ensureContaBancariaPrincipal(empresaId: string) {
  const existing = await prisma.contaBancaria.findFirst({
    where: { empresaId, principal: true, ativa: true },
  });
  if (existing) return existing;
  return prisma.contaBancaria.create({
    data: {
      empresaId,
      bancoCodigo: INTER_DEFAULTS.banco,
      bancoNome: "Banco Inter",
      apelido: "Conta Inter PJ",
      tipo: "CORRENTE",
      principal: true,
      ativa: true,
      simulado: true,
    },
  });
}

/** Marca títulos vencidos (job leve — chamado no dashboard). */
export async function sincronizarVencidos(empresaId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  await prisma.tituloReceber.updateMany({
    where: {
      empresaId,
      status: TituloReceberStatus.ABERTO,
      vencimento: { lt: hoje },
    },
    data: { status: TituloReceberStatus.VENCIDO },
  });

  await prisma.tituloPagar.updateMany({
    where: {
      empresaId,
      status: TituloPagarStatus.ABERTO,
      vencimento: { lt: hoje },
    },
    data: { status: TituloPagarStatus.VENCIDO },
  });
}

/**
 * Gera título a pagar ao lançar estoque de NF de entrada.
 * Idempotente por documentoEntradaId.
 */
export async function criarTituloPagarDaEntrada(
  tx: Prisma.TransactionClient,
  opts: {
    empresaId: string;
    documentoId: string;
    pedidoCompraId?: string | null;
    fornecedorNome: string;
    fornecedorDoc?: string | null;
    fornecedorId?: string | null;
    valor: number;
    vencimento?: Date;
    descricao?: string;
  },
) {
  if (opts.valor <= 0) return null;

  const existing = await tx.tituloPagar.findUnique({
    where: { documentoEntradaId: opts.documentoId },
  });
  if (existing) return existing;

  const vencimento =
    opts.vencimento ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 28);
      return d;
    })();

  return tx.tituloPagar.create({
    data: {
      empresaId: opts.empresaId,
      pedidoCompraId: opts.pedidoCompraId || null,
      documentoEntradaId: opts.documentoId,
      fornecedorId: opts.fornecedorId || null,
      fornecedorNome: opts.fornecedorNome || "Fornecedor",
      fornecedorDoc: opts.fornecedorDoc || null,
      descricao:
        opts.descricao ||
        `NF entrada · ${opts.fornecedorNome || "compra"}${opts.pedidoCompraId ? "" : ""}`,
      valor: opts.valor,
      vencimento,
      status: TituloPagarStatus.ABERTO,
    },
  });
}

export async function baixarTituloPagar(opts: {
  tituloId: string;
  userId: string;
  valorPago?: number;
  via?: string;
}) {
  const titulo = await prisma.tituloPagar.findUnique({ where: { id: opts.tituloId } });
  if (!titulo) throw Object.assign(new Error("Título a pagar não encontrado"), { status: 404 });
  if (titulo.status === TituloPagarStatus.PAGO) return titulo;

  const aberto = valorAbertoPagar(titulo);
  const pagoAgora = opts.valorPago != null ? money(opts.valorPago) : aberto;
  if (pagoAgora <= 0) {
    throw Object.assign(new Error("Valor de pagamento inválido"), { status: 400 });
  }

  const novoPago = Math.min(money(titulo.valor), money(titulo.valorPago) + pagoAgora);
  const liquidado = novoPago >= money(titulo.valor) - 0.009;
  const agora = new Date();
  const conta = await ensureContaBancariaPrincipal(titulo.empresaId);

  return prisma.$transaction(async (tx) => {
    const t = await tx.tituloPagar.update({
      where: { id: titulo.id },
      data: {
        valorPago: novoPago,
        status: liquidado ? TituloPagarStatus.PAGO : TituloPagarStatus.PARCIAL,
        pagoEm: liquidado ? agora : titulo.pagoEm,
      },
    });

    const mov = await tx.movimentoBancario.create({
      data: {
        empresaId: titulo.empresaId,
        contaBancariaId: conta.id,
        dataEntrada: agora,
        tipoOperacao: MovimentoBancarioTipo.DEBITO,
        tipoTransacao: "PAGAMENTO",
        valor: pagoAgora,
        titulo: `Pagamento · ${titulo.fornecedorNome}`,
        descricao: titulo.descricao,
        origem: MovimentoBancarioOrigem.BAIXA_PAGAR,
        simulado: true,
        tituloPagarId: titulo.id,
        hashExterno: `pagar-${titulo.id}-${agora.toISOString()}`,
      },
    });

    await tx.conciliacaoBancaria.create({
      data: {
        movimentoBancarioId: mov.id,
        tituloPagarId: titulo.id,
        status: ConciliacaoStatus.CONCILIADO,
        matchedAt: agora,
        matchedById: opts.userId,
        observacao: opts.via || "baixa-manual",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TituloPagar",
        entityId: titulo.id,
        action: "BAIXAR",
        newValue: { via: opts.via || "manual", valorPago: pagoAgora, liquidado },
        userId: opts.userId,
      },
    });

    return t;
  });
}

/** Após baixa de AR — registra crédito bancário e concilia. */
export async function registrarBaixaReceberNoBanco(opts: {
  tx: Prisma.TransactionClient;
  tituloId: string;
  empresaId: string;
  valor: number;
  clienteNome: string;
  userId: string;
  via?: string;
}) {
  const conta = await opts.tx.contaBancaria.findFirst({
    where: { empresaId: opts.empresaId, principal: true, ativa: true },
  });
  const contaId =
    conta?.id ??
    (
      await opts.tx.contaBancaria.create({
        data: {
          empresaId: opts.empresaId,
          bancoCodigo: INTER_DEFAULTS.banco,
          bancoNome: "Banco Inter",
          apelido: "Conta Inter PJ",
          principal: true,
          ativa: true,
          simulado: true,
        },
      })
    ).id;

  const agora = new Date();
  const mov = await opts.tx.movimentoBancario.create({
    data: {
      empresaId: opts.empresaId,
      contaBancariaId: contaId,
      dataEntrada: agora,
      tipoOperacao: MovimentoBancarioTipo.CREDITO,
      tipoTransacao: "PIX",
      valor: opts.valor,
      titulo: `Recebimento · ${opts.clienteNome}`,
      descricao: `Baixa título ${opts.tituloId.slice(0, 8)}`,
      origem: MovimentoBancarioOrigem.BAIXA_RECEBER,
      simulado: true,
      tituloReceberId: opts.tituloId,
      hashExterno: `receber-${opts.tituloId}-${agora.toISOString()}`,
    },
  });

  await opts.tx.conciliacaoBancaria.create({
    data: {
      movimentoBancarioId: mov.id,
      tituloReceberId: opts.tituloId,
      status: ConciliacaoStatus.CONCILIADO,
      matchedAt: agora,
      matchedById: opts.userId,
      observacao: opts.via || "baixa-receber",
    },
  });

  return mov;
}

export async function getFinanceiroDashboard(empresaId: string) {
  await sincronizarVencidos(empresaId);
  const conta = await ensureContaBancariaPrincipal(empresaId);

  const [receber, pagar] = await Promise.all([
    prisma.tituloReceber.findMany({
      where: { empresaId, status: { in: ["ABERTO", "VENCIDO", "PARCIAL"] } },
      include: {
        pedidoVenda: { select: { numero: true, clienteNome: true, id: true } },
        cobranca: { select: { status: true, nossoNumero: true, simulado: true } },
      },
      orderBy: { vencimento: "asc" },
    }),
    prisma.tituloPagar.findMany({
      where: { empresaId, status: { in: ["ABERTO", "VENCIDO", "PARCIAL"] } },
      orderBy: { vencimento: "asc" },
    }),
  ]);

  const agingReceber = buildAging(
    receber.map((t) => ({ valorAberto: valorAbertoReceber(t), vencimento: t.vencimento })),
  );
  const agingPagar = buildAging(
    pagar.map((t) => ({ valorAberto: valorAbertoPagar(t), vencimento: t.vencimento })),
  );

  const totalReceber = agingReceber.reduce((s, b) => s + b.valor, 0);
  const totalPagar = agingPagar.reduce((s, b) => s + b.valor, 0);
  const vencidoReceber = agingReceber
    .filter((b) => b.id !== "a_vencer")
    .reduce((s, b) => s + b.valor, 0);
  const vencidoPagar = agingPagar
    .filter((b) => b.id !== "a_vencer")
    .reduce((s, b) => s + b.valor, 0);

  const saldoDisponivel = money(conta.saldoDisponivel);
  const saldoBase =
    saldoDisponivel > 0
      ? saldoDisponivel
      : Math.max(0, 80_000 + totalReceber * 0.15 - totalPagar * 0.1);

  const saldoApi = await consultarSaldo(interCfg(), { saldoBase });

  await prisma.contaBancaria.update({
    where: { id: conta.id },
    data: {
      saldoDisponivel: saldoApi.disponivel,
      saldoBloqueado:
        saldoApi.bloqueadoAdministrativo +
        saldoApi.bloqueadoCheque +
        saldoApi.bloqueadoJudicialmente,
      saldoConsultadoEm: new Date(saldoApi.consultadoEm),
      simulado: saldoApi.simulado,
    },
  });

  const pendentesConciliacao = await prisma.movimentoBancario.count({
    where: {
      empresaId,
      conciliacao: { is: null },
    },
  });

  const fluxo = projetarFluxoCaixa({
    saldoInicial: saldoApi.disponivel,
    horizonteDias: 30,
    entradas: receber.map((t) => ({
      vencimento: t.vencimento,
      valorAberto: valorAbertoReceber(t),
      referencia: t.pedidoVenda ? `PV-${t.pedidoVenda.numero}` : `TIT-${t.id.slice(0, 8)}`,
    })),
    saidas: pagar.map((t) => ({
      vencimento: t.vencimento,
      valorAberto: valorAbertoPagar(t),
      referencia: t.descricao.slice(0, 40),
    })),
  });

  return {
    hubs: {
      cobranca: INTER_DEFAULTS.docCobranca,
      extrato: INTER_DEFAULTS.docExtrato,
      saldo: INTER_DEFAULTS.docSaldo,
    },
    conta: {
      id: conta.id,
      apelido: conta.apelido,
      bancoCodigo: conta.bancoCodigo,
      bancoNome: conta.bancoNome,
      simulado: saldoApi.simulado,
      saldo: {
        disponivel: saldoApi.disponivel,
        bloqueado:
          saldoApi.bloqueadoAdministrativo +
          saldoApi.bloqueadoCheque +
          saldoApi.bloqueadoJudicialmente,
        limite: saldoApi.limite,
        consultadoEm: saldoApi.consultadoEm,
      },
    },
    kpi: {
      aReceber: Math.round(totalReceber * 100) / 100,
      aPagar: Math.round(totalPagar * 100) / 100,
      vencidoReceber: Math.round(vencidoReceber * 100) / 100,
      vencidoPagar: Math.round(vencidoPagar * 100) / 100,
      saldoDisponivel: saldoApi.disponivel,
      posicaoLiquida: Math.round((saldoApi.disponivel + totalReceber - totalPagar) * 100) / 100,
      qtdReceber: receber.length,
      qtdPagar: pagar.length,
      pendentesConciliacao,
    },
    agingReceber,
    agingPagar,
    fluxo,
  };
}

export async function listarContasReceber(empresaId: string, filtro?: string) {
  await sincronizarVencidos(empresaId);
  const statusFilter =
    filtro === "vencidos"
      ? ([TituloReceberStatus.VENCIDO] as TituloReceberStatus[])
      : filtro === "abertos"
        ? ([TituloReceberStatus.ABERTO, TituloReceberStatus.PARCIAL] as TituloReceberStatus[])
        : filtro === "pagos"
          ? ([TituloReceberStatus.PAGO] as TituloReceberStatus[])
          : undefined;

  const rows = await prisma.tituloReceber.findMany({
    where: {
      empresaId,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    },
    include: {
      pedidoVenda: {
        select: { id: true, numero: true, clienteNome: true, status: true },
      },
      cobranca: {
        select: {
          id: true,
          status: true,
          nossoNumero: true,
          linhaDigitavel: true,
          pixCopiaECola: true,
          simulado: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { vencimento: "asc" }],
    take: 200,
  });

  return rows.map((t) => {
    const aberto = valorAbertoReceber(t);
    const dias = diasAtraso(t.vencimento);
    return {
      id: t.id,
      pedidoId: t.pedidoVenda?.id ?? null,
      pedidoNumero: t.pedidoVenda?.numero ?? null,
      clienteNome: t.pedidoVenda?.clienteNome ?? "—",
      valor: money(t.valor),
      valorPago: money(t.valorPago),
      valorAberto: aberto,
      vencimento: t.vencimento.toISOString(),
      status: t.status,
      diasAtraso: dias,
      pagoEm: t.pagoEm?.toISOString() ?? null,
      cobranca: t.cobranca
        ? {
            status: t.cobranca.status,
            nossoNumero: t.cobranca.nossoNumero,
            simulado: t.cobranca.simulado,
            temLinha: Boolean(t.cobranca.linhaDigitavel),
            temPix: Boolean(t.cobranca.pixCopiaECola),
          }
        : null,
    };
  });
}

export async function listarContasPagar(empresaId: string, filtro?: string) {
  await sincronizarVencidos(empresaId);
  const statusFilter =
    filtro === "vencidos"
      ? ([TituloPagarStatus.VENCIDO] as TituloPagarStatus[])
      : filtro === "abertos"
        ? ([TituloPagarStatus.ABERTO, TituloPagarStatus.PARCIAL] as TituloPagarStatus[])
        : filtro === "pagos"
          ? ([TituloPagarStatus.PAGO] as TituloPagarStatus[])
          : undefined;

  const rows = await prisma.tituloPagar.findMany({
    where: {
      empresaId,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    },
    include: {
      pedidoCompra: { select: { id: true, numero: true } },
    },
    orderBy: [{ status: "asc" }, { vencimento: "asc" }],
    take: 200,
  });

  return rows.map((t) => {
    const aberto = valorAbertoPagar(t);
    return {
      id: t.id,
      pedidoCompraId: t.pedidoCompraId,
      pedidoCompraNumero: t.pedidoCompra?.numero ?? null,
      fornecedorNome: t.fornecedorNome,
      fornecedorDoc: t.fornecedorDoc,
      descricao: t.descricao,
      valor: money(t.valor),
      valorPago: money(t.valorPago),
      valorAberto: aberto,
      vencimento: t.vencimento.toISOString(),
      status: t.status,
      diasAtraso: diasAtraso(t.vencimento),
      pagoEm: t.pagoEm?.toISOString() ?? null,
    };
  });
}

/**
 * Sincroniza extrato Inter → movimentos bancários (idempotente por hash).
 * Em homologação, semeia créditos/débitos a partir de baixas recentes se o extrato local estiver vazio.
 */
export async function sincronizarExtratoInter(opts: {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
  userId: string;
}) {
  const conta = await ensureContaBancariaPrincipal(opts.empresaId);

  const [recebidos, pagos] = await Promise.all([
    prisma.tituloReceber.findMany({
      where: {
        empresaId: opts.empresaId,
        status: TituloReceberStatus.PAGO,
        pagoEm: { gte: new Date(opts.dataInicio), lte: new Date(`${opts.dataFim}T23:59:59`) },
      },
      include: { pedidoVenda: { select: { clienteNome: true, numero: true } } },
      take: 50,
    }),
    prisma.tituloPagar.findMany({
      where: {
        empresaId: opts.empresaId,
        status: TituloPagarStatus.PAGO,
        pagoEm: { gte: new Date(opts.dataInicio), lte: new Date(`${opts.dataFim}T23:59:59`) },
      },
      take: 50,
    }),
  ]);

  const extrato = await consultarExtrato(interCfg(), {
    dataInicio: opts.dataInicio,
    dataFim: opts.dataFim,
    seed: {
      creditos: recebidos.map((t) => ({
        valor: money(t.valor),
        titulo: t.pedidoVenda ? `PIX · PV-${t.pedidoVenda.numero}` : `PIX · recebimento`,
        descricao: t.pedidoVenda?.clienteNome ?? "Cliente",
        dataEntrada: (t.pagoEm || t.updatedAt).toISOString().slice(0, 10),
        tipoTransacao: "PIX",
        idTransacao: `ar-${t.id}`,
      })),
      debitos: pagos.map((t) => ({
        valor: money(t.valor),
        titulo: `Pagamento · ${t.fornecedorNome}`,
        descricao: t.descricao,
        dataEntrada: (t.pagoEm || t.updatedAt).toISOString().slice(0, 10),
        tipoTransacao: "PAGAMENTO",
        idTransacao: `ap-${t.id}`,
      })),
    },
  });

  let importados = 0;
  let ignorados = 0;

  for (const item of extrato.transacoes) {
    if (item.valor <= 0 && item.titulo.includes("Sem movimentos")) {
      ignorados++;
      continue;
    }
    const hash = item.idTransacao
      ? `id-${item.idTransacao}`
      : hashExtratoItem(item);

    try {
      await prisma.movimentoBancario.create({
        data: {
          empresaId: opts.empresaId,
          contaBancariaId: conta.id,
          dataEntrada: new Date(`${item.dataEntrada}T12:00:00`),
          tipoOperacao:
            item.tipoOperacao === "C"
              ? MovimentoBancarioTipo.CREDITO
              : MovimentoBancarioTipo.DEBITO,
          tipoTransacao: item.tipoTransacao,
          valor: item.valor,
          titulo: item.titulo,
          descricao: item.descricao,
          hashExterno: hash,
          origem: MovimentoBancarioOrigem.EXTRATO_INTER,
          simulado: extrato.simulado,
          detalhesJson: (item.detalhes as Prisma.InputJsonValue) ?? undefined,
        },
      });
      importados++;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        ignorados++;
        continue;
      }
      throw e;
    }
  }

  // Auto-match óbvio: crédito com valor igual a título AR aberto/pago no dia
  const sugestoes = await sugerirConciliacoes(opts.empresaId);

  return {
    simulado: extrato.simulado,
    dataInicio: opts.dataInicio,
    dataFim: opts.dataFim,
    importados,
    ignorados,
    totalApi: extrato.transacoes.length,
    sugestoes: sugestoes.length,
    doc: INTER_DEFAULTS.docExtrato,
  };
}

export async function listarMovimentos(empresaId: string, opts?: { soPendentes?: boolean }) {
  const rows = await prisma.movimentoBancario.findMany({
    where: {
      empresaId,
      ...(opts?.soPendentes ? { conciliacao: { is: null } } : {}),
    },
    include: {
      conciliacao: true,
      tituloReceber: {
        include: { pedidoVenda: { select: { numero: true, clienteNome: true } } },
      },
      tituloPagar: true,
    },
    orderBy: { dataEntrada: "desc" },
    take: 100,
  });

  return rows.map((m) => ({
    id: m.id,
    dataEntrada: m.dataEntrada.toISOString(),
    tipoOperacao: m.tipoOperacao,
    tipoTransacao: m.tipoTransacao,
    valor: money(m.valor),
    titulo: m.titulo,
    descricao: m.descricao,
    origem: m.origem,
    simulado: m.simulado,
    conciliado: m.conciliacao?.status === ConciliacaoStatus.CONCILIADO,
    conciliacaoStatus: m.conciliacao?.status ?? ConciliacaoStatus.PENDENTE,
    tituloReceberId: m.tituloReceberId,
    tituloPagarId: m.tituloPagarId,
    matchLabel: m.tituloReceber
      ? `AR · PV-${m.tituloReceber.pedidoVenda?.numero ?? "—"} · ${m.tituloReceber.pedidoVenda?.clienteNome ?? "—"}`
      : m.tituloPagar
        ? `AP · ${m.tituloPagar.fornecedorNome}`
        : null,
  }));
}

export async function sugerirConciliacoes(empresaId: string) {
  const pendentes = await prisma.movimentoBancario.findMany({
    where: { empresaId, conciliacao: { is: null }, valor: { gt: 0 } },
    take: 50,
  });

  const sugestoes: Array<{
    movimentoId: string;
    tituloReceberId?: string;
    tituloPagarId?: string;
    confianca: "alta" | "media";
    motivo: string;
  }> = [];

  for (const m of pendentes) {
    const valor = money(m.valor);
    if (m.tipoOperacao === MovimentoBancarioTipo.CREDITO) {
      const match = await prisma.tituloReceber.findFirst({
        where: {
          empresaId,
          status: { in: [TituloReceberStatus.ABERTO, TituloReceberStatus.VENCIDO, TituloReceberStatus.PAGO] },
          valor: valor,
        },
        include: { pedidoVenda: { select: { numero: true } } },
      });
      if (match) {
        sugestoes.push({
          movimentoId: m.id,
          tituloReceberId: match.id,
          confianca: "alta",
          motivo: `Valor idêntico ao título PV-${match.pedidoVenda?.numero ?? "—"}`,
        });
      }
    } else {
      const match = await prisma.tituloPagar.findFirst({
        where: {
          empresaId,
          status: { in: [TituloPagarStatus.ABERTO, TituloPagarStatus.VENCIDO, TituloPagarStatus.PAGO] },
          valor: valor,
        },
      });
      if (match) {
        sugestoes.push({
          movimentoId: m.id,
          tituloPagarId: match.id,
          confianca: "alta",
          motivo: `Valor idêntico ao AP · ${match.fornecedorNome}`,
        });
      }
    }
  }

  return sugestoes;
}

export async function conciliarMovimento(opts: {
  movimentoId: string;
  userId: string;
  tituloReceberId?: string;
  tituloPagarId?: string;
  ignorar?: boolean;
}) {
  const mov = await prisma.movimentoBancario.findUnique({
    where: { id: opts.movimentoId },
    include: { conciliacao: true },
  });
  if (!mov) throw Object.assign(new Error("Movimento não encontrado"), { status: 404 });
  if (mov.conciliacao?.status === ConciliacaoStatus.CONCILIADO) {
    return mov.conciliacao;
  }

  if (opts.ignorar) {
    return prisma.conciliacaoBancaria.upsert({
      where: { movimentoBancarioId: mov.id },
      create: {
        movimentoBancarioId: mov.id,
        status: ConciliacaoStatus.IGNORADO,
        matchedAt: new Date(),
        matchedById: opts.userId,
        observacao: "Ignorado na conciliação",
      },
      update: {
        status: ConciliacaoStatus.IGNORADO,
        matchedAt: new Date(),
        matchedById: opts.userId,
      },
    });
  }

  if (!opts.tituloReceberId && !opts.tituloPagarId) {
    throw Object.assign(new Error("Informe título a receber ou a pagar"), { status: 400 });
  }

  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.movimentoBancario.update({
      where: { id: mov.id },
      data: {
        tituloReceberId: opts.tituloReceberId || null,
        tituloPagarId: opts.tituloPagarId || null,
      },
    });

    if (opts.tituloReceberId) {
      const t = await tx.tituloReceber.findUnique({
        where: { id: opts.tituloReceberId },
        include: { pedidoVenda: true, cobranca: true },
      });
      if (t && t.status !== TituloReceberStatus.PAGO) {
        await tx.tituloReceber.update({
          where: { id: t.id },
          data: {
            status: TituloReceberStatus.PAGO,
            valorPago: t.valor,
            pagoEm: agora,
          },
        });
        if (t.cobranca) {
          await tx.cobrancaInter.update({
            where: { id: t.cobranca.id },
            data: { status: "PAGA", pagoEm: agora },
          });
        }
        if (t.pedidoVendaId) {
          const pendentes = await tx.tituloReceber.count({
            where: {
              pedidoVendaId: t.pedidoVendaId,
              status: { notIn: [TituloReceberStatus.PAGO, TituloReceberStatus.CANCELADO] },
            },
          });
          if (pendentes === 0) {
            await tx.pedidoVenda.update({
              where: { id: t.pedidoVendaId },
              data: { status: "LIQUIDADO", liquidadoEm: agora },
            });
          }
        }
      }
    }

    if (opts.tituloPagarId) {
      const t = await tx.tituloPagar.findUnique({ where: { id: opts.tituloPagarId } });
      if (t && t.status !== TituloPagarStatus.PAGO) {
        await tx.tituloPagar.update({
          where: { id: t.id },
          data: {
            status: TituloPagarStatus.PAGO,
            valorPago: t.valor,
            pagoEm: agora,
          },
        });
      }
    }

    return tx.conciliacaoBancaria.upsert({
      where: { movimentoBancarioId: mov.id },
      create: {
        movimentoBancarioId: mov.id,
        tituloReceberId: opts.tituloReceberId || null,
        tituloPagarId: opts.tituloPagarId || null,
        status: ConciliacaoStatus.CONCILIADO,
        matchedAt: agora,
        matchedById: opts.userId,
      },
      update: {
        tituloReceberId: opts.tituloReceberId || null,
        tituloPagarId: opts.tituloPagarId || null,
        status: ConciliacaoStatus.CONCILIADO,
        matchedAt: agora,
        matchedById: opts.userId,
      },
    });
  });
}

export async function getFluxoCaixa(empresaId: string, horizonteDias = 30) {
  const dash = await getFinanceiroDashboard(empresaId);
  const fluxo = projetarFluxoCaixa({
    saldoInicial: dash.conta.saldo.disponivel,
    horizonteDias,
    entradas: (await listarContasReceber(empresaId))
      .filter((t) => t.valorAberto > 0)
      .map((t) => ({
        vencimento: t.vencimento,
        valorAberto: t.valorAberto,
        referencia: `PV-${t.pedidoNumero}`,
      })),
    saidas: (await listarContasPagar(empresaId))
      .filter((t) => t.valorAberto > 0)
      .map((t) => ({
        vencimento: t.vencimento,
        valorAberto: t.valorAberto,
        referencia: t.descricao.slice(0, 40),
      })),
  });
  return { ...fluxo, hubs: dash.hubs, conta: dash.conta };
}

export async function requireEmpresaFinanceiro() {
  return requireEmpresaRaiz();
}
