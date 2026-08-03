/** Pedido de venda + OS + confirmação com ATP. */

import {
  NecessidadeCompraStatus,
  NecessidadeItemTipo,
  NecessidadeLinhaStatus,
  OrdemServicoStatus,
  OrcamentoStatus,
  PedidoVendaStatus,
  TipoProduto,
  type Prisma,
} from "@prisma/client";
import {
  FAC_MATRIZ,
  montarDescricaoComercialNf,
  resolverFamiliaPaEtq,
  type FamiliaPaEtq,
} from "@/domain/venda/familia-pa";
import { dec, getParametro, PARAM_KEYS, round2, round4 } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";
import { criarReserva, getDisponivel, liberarReserva } from "@/lib/estoque";
import { explodirNecessidades } from "@/lib/mrp";
import {
  descricaoProduto,
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { proximoCodigoFromList } from "@/lib/cadastro-codigo";
import { criarOrdensProducaoDoPedido } from "@/lib/ordem-producao";

type Tx = Prisma.TransactionClient;

async function alocarCodigoProduto(tx: Tx, empresaId: string): Promise<string> {
  const rows = await tx.produto.findMany({
    where: { empresaId },
    select: { codigo: true },
  });
  return proximoCodigoFromList(rows.map((r) => r.codigo));
}

export const PEDIDO_STATUS_LABEL: Record<PedidoVendaStatus, string> = {
  RASCUNHO: "Rascunho",
  AGUARDA_CREDITO: "Aguarda crédito",
  AGUARDA_ADIANTAMENTO: "Aguarda adiantamento",
  LIBERADO: "Liberado",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em produção",
  PRODUZIDO: "Produzido",
  FATURADO: "Faturado",
  ENTREGUE: "Entregue",
  LIQUIDADO: "Liquidado",
  CANCELADO: "Cancelado",
};

export const OS_STATUS_LABEL: Record<OrdemServicoStatus, string> = {
  PLANEJADA: "Planejada",
  AGUARDANDO_MATERIAL: "Aguardando material",
  LIBERADA: "Liberada",
  EM_PRODUCAO: "Em produção",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  RETRABALHO: "Retrabalho",
};

/**
 * Família fiscal PA-ETQ (produção própria).
 * Estudo 32: uma família estável + especificação no pedido — NÃO dual NF-e/NFS-e.
 */
async function ensureProdutoPaEtiqueta(
  tx: Tx,
  empresaId: string,
  familia: FamiliaPaEtq,
) {
  const existing = await tx.produto.findFirst({
    where: { empresaId, sku: familia.sku },
  });
  const dataPadrao = {
    descricao: familia.descricaoFiscal,
    descricaoFiscal: familia.descricaoFiscal,
    tipo: TipoProduto.ACABADO,
    unidade: familia.unidade,
    /** PA sob encomenda: estoque PA nasce na conclusão da OP; não reserva saldo desta família. */
    controlaEstoque: false,
    documentoSaidaPadrao: "NFE" as const,
    ncm: familia.ncm,
    cfopVendaPadrao: familia.cfopDentroUf,
    csosn: "102",
    cstPis: "49",
    cstCofins: "49",
    ativo: true,
  };
  if (existing) {
    return tx.produto.update({
      where: { id: existing.id },
      data: dataPadrao,
    });
  }
  const codigo = await alocarCodigoProduto(tx, empresaId);
  return tx.produto.create({
    data: {
      empresaId,
      codigo,
      sku: familia.sku,
      ...dataPadrao,
    },
  });
}

/** Ferramental/matriz (FAC) — linha na mesma NF-e de produção. */
async function ensureProdutoFacMatriz(tx: Tx, empresaId: string) {
  const existing = await tx.produto.findFirst({
    where: { empresaId, sku: FAC_MATRIZ.sku },
  });
  const dataPadrao = {
    descricao: "Matriz flexográfica / faca (1º pedido)",
    descricaoFiscal: FAC_MATRIZ.descricaoFiscal,
    tipo: TipoProduto.ACABADO,
    unidade: FAC_MATRIZ.unidade,
    controlaEstoque: false,
    documentoSaidaPadrao: "NFE" as const,
    ncm: FAC_MATRIZ.ncm,
    cfopVendaPadrao: FAC_MATRIZ.cfopDentroUf,
    csosn: "102",
    cstPis: "49",
    cstCofins: "49",
    ativo: true,
  };
  if (existing) {
    return tx.produto.update({
      where: { id: existing.id },
      data: dataPadrao,
    });
  }
  const codigo = await alocarCodigoProduto(tx, empresaId);
  return tx.produto.create({
    data: {
      empresaId,
      codigo,
      sku: FAC_MATRIZ.sku,
      ...dataPadrao,
    },
  });
}

export async function converterOrcamentoEmPedido(opts: {
  orcamentoId: string;
  faixaIndex: number;
  userId: string;
  condicaoPagamento?: string | null;
  prazoEntregaDias?: number | null;
  observacoes?: string | null;
}) {
  const orc = await prisma.orcamento.findUnique({ where: { id: opts.orcamentoId } });
  if (!orc) throw Object.assign(new Error("Orçamento não encontrado"), { status: 404 });
  if (orc.status !== OrcamentoStatus.APROVADO) {
    throw Object.assign(new Error("Só orçamento aprovado gera pedido"), { status: 400 });
  }
  if (!orc.empresaId) {
    throw Object.assign(new Error("Orçamento sem empresa"), { status: 400 });
  }

  const ja = await prisma.pedidoVenda.findUnique({ where: { orcamentoId: orc.id } });
  if (ja) {
    throw Object.assign(new Error("Este orçamento já possui pedido"), { status: 409 });
  }

  const input = orc.inputSnapshot as OrcamentoInputSnapshot;

  // Estudo 32 — validade: bloqueia conversão sem recálculo (nova versão)
  const { isOrcamentoVencido } = await import("@/lib/orcamento-input");
  const baseValidade = orc.enviadoEm || orc.createdAt;
  if (
    isOrcamentoVencido({
      baseDate: baseValidade,
      validadeDias: input.validadeDias ?? null,
      validadeProposta: input.validadeProposta ?? null,
    })
  ) {
    throw Object.assign(
      new Error(
        "Orçamento vencido (validade da proposta). Recalcule e salve uma nova versão antes de gerar o pedido.",
      ),
      { status: 409, code: "ORCAMENTO_VENCIDO" },
    );
  }
  const result = orc.resultSnapshot as OrcamentoResultSnapshot | null;
  const faixas = result?.faixas || [];
  const faixa = faixas[opts.faixaIndex];
  if (!faixa) {
    throw Object.assign(new Error("Faixa de quantidade inválida"), { status: 400 });
  }

  const quantidade = faixa.production.quantidade;
  const valorMatriz = round2(faixa.commercial.valorMatriz || 0);
  const valorEtiqueta = round2(faixa.commercial.valorEtiqueta || 0);
  const valorTotal = round2(faixa.commercial.valorTotal);
  const cobraMatriz = Boolean(input.matriz) && valorMatriz > 0;
  // Estudo 32 §7.2: um pedido → uma família PA-ETQ + custos de MP atrás; FAC na mesma NF-e.
  const valorPa = cobraMatriz ? valorEtiqueta : valorTotal;
  const familia = resolverFamiliaPaEtq(input.papel);

  return prisma.$transaction(async (tx) => {
    const prodPa = await ensureProdutoPaEtiqueta(tx, orc.empresaId!, familia);
    const descComercial = montarDescricaoComercialNf({
      familia,
      papel: input.papel,
      medida: input.medida,
      cores: input.cores,
      acabamento: input.acabamento,
      etiqPorRolo: input.etiqPorRolo != null ? Number(input.etiqPorRolo) : null,
    });

    const itensCreate: Array<{
      produtoId: string;
      descricao: string;
      quantidade: number;
      unidade: string;
      valorUnitario: number;
      valorTotal: number;
      especificacaoSnapshot: object;
      necessidadeTipo: NecessidadeItemTipo;
      ordem: number;
    }> = [
      {
        produtoId: prodPa.id,
        descricao: descComercial || descricaoProduto(input) || familia.descricaoFiscal,
        quantidade,
        unidade: familia.unidade,
        valorUnitario: quantidade > 0 ? round4(valorPa / quantidade) : valorPa,
        valorTotal: valorPa,
        especificacaoSnapshot: {
          ...input,
          kind: "PRODUCAO_PROPRIA",
          familiaSku: familia.sku,
          ncm: familia.ncm,
          cfop: familia.cfopDentroUf,
          documento: "NFE",
          production: faixa.production,
        } as object,
        necessidadeTipo: NecessidadeItemTipo.PRODUCAO,
        ordem: 0,
      },
    ];

    if (cobraMatriz) {
      const fac = await ensureProdutoFacMatriz(tx, orc.empresaId!);
      itensCreate.push({
        produtoId: fac.id,
        descricao: "Matriz flexográfica / faca (cobrada no 1º pedido)",
        quantidade: 1,
        unidade: "UN",
        valorUnitario: valorMatriz,
        valorTotal: valorMatriz,
        especificacaoSnapshot: {
          kind: "FERRAMENTAL",
          familiaSku: FAC_MATRIZ.sku,
          documento: "NFE",
          matriz: true,
        } as object,
        necessidadeTipo: NecessidadeItemTipo.SERVICO,
        ordem: 1,
      });
    }

    const pedido = await tx.pedidoVenda.create({
      data: {
        empresaId: orc.empresaId!,
        orcamentoId: orc.id,
        status: PedidoVendaStatus.RASCUNHO,
        clienteParceiroId: orc.clienteParceiroId,
        vendedorParceiroId: orc.vendedorParceiroId,
        clienteNome: orc.clienteNome,
        vendedorNome: orc.vendedorNome,
        faixaIndex: opts.faixaIndex,
        quantidade,
        valorTotal,
        condicaoPagamento: opts.condicaoPagamento ?? "Boleto 28 dias",
        prazoEntregaDias: opts.prazoEntregaDias ?? 12,
        inputSnapshot: input as object,
        comercialSnapshot: {
          faixa,
          valorMatrizBruto: result?.valorMatrizBruto,
          valorEtiqueta,
          valorMatriz,
          producao: faixa.production,
          familiaFiscal: {
            sku: familia.sku,
            ncm: familia.ncm,
            cfop: familia.cfopDentroUf,
            descricaoFiscal: familia.descricaoFiscal,
          },
          itensComerciais: itensCreate.map((i) => ({
            descricao: i.descricao,
            quantidade: i.quantidade,
            valorTotal: i.valorTotal,
            ordem: i.ordem,
          })),
        } as object,
        observacoes: opts.observacoes ?? orc.observacoes,
        createdById: opts.userId,
        itens: {
          create: itensCreate,
        },
      },
      include: { itens: { orderBy: { ordem: "asc" } } },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PedidoVenda",
        entityId: pedido.id,
        action: "CREATE_FROM_ORCAMENTO",
        newValue: {
          orcamentoId: orc.id,
          numero: pedido.numero,
          valorTotal,
          familiaSku: familia.sku,
          ncm: familia.ncm,
          itens: itensCreate.length,
          faixaIndex: opts.faixaIndex,
          canalAprovacao: orc.canalAprovacao,
        },
        userId: opts.userId,
      },
    });

    return pedido;
  }).then(async (pedido) => {
    // Motor de crédito fora da TX de criação (consultas AR/carteira)
    const { aplicarCreditoAoPedidoCriado } = await import("@/lib/aprovacao-cliente");
    return aplicarCreditoAoPedidoCriado({
      pedidoId: pedido.id,
      empresaId: pedido.empresaId,
      clienteParceiroId: pedido.clienteParceiroId,
      valorTotal: Number(pedido.valorTotal),
      condicaoPagamento: pedido.condicaoPagamento,
    });
  });
}

function statusLinha(opts: {
  produtoId: string | null;
  necessaria: number;
  reservada: number;
}): NecessidadeLinhaStatus {
  if (!opts.produtoId) return NecessidadeLinhaStatus.SEM_PRODUTO;
  if (opts.reservada + 0.0001 >= opts.necessaria) return NecessidadeLinhaStatus.OK;
  if (opts.reservada > 0) return NecessidadeLinhaStatus.PARCIAL;
  return NecessidadeLinhaStatus.FALTA;
}

export async function confirmarPedido(opts: { pedidoId: string; userId: string }) {
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: opts.pedidoId },
    include: { itens: true, ordensServico: true },
  });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });

  // Spec: produção só de PED LIBERADO (crédito/sinal ok). RASCUNHO legado ainda permitido em HML.
  const podeConfirmar =
    pedido.status === PedidoVendaStatus.LIBERADO ||
    pedido.status === PedidoVendaStatus.RASCUNHO;
  if (!podeConfirmar) {
    if (pedido.status === PedidoVendaStatus.AGUARDA_CREDITO) {
      throw Object.assign(
        new Error("Pedido bloqueado por crédito — financeiro precisa liberar"),
        { status: 400, code: "AGUARDA_CREDITO" },
      );
    }
    if (pedido.status === PedidoVendaStatus.AGUARDA_ADIANTAMENTO) {
      throw Object.assign(
        new Error("Aguarde a baixa do adiantamento para liberar produção"),
        { status: 400, code: "AGUARDA_ADIANTAMENTO" },
      );
    }
    throw Object.assign(
      new Error("Só pedido liberado (ou rascunho legado) pode ser confirmado/explodido"),
      { status: 400 },
    );
  }

  if (pedido.ordensServico.length > 0) {
    throw Object.assign(new Error("Pedido já possui OS — já foi confirmado"), { status: 409 });
  }

  const input = pedido.inputSnapshot as OrcamentoInputSnapshot;
  const comercial = pedido.comercialSnapshot as {
    faixa?: NonNullable<OrcamentoResultSnapshot["faixas"]>[number];
  } | null;
  const reservaOn = await getParametro<boolean>(PARAM_KEYS.reservaNaConfirmacao, true);
  const pctMin = await getParametro<number>(PARAM_KEYS.percentualMinimoLiberacaoOs, 100);

  return prisma.$transaction(async (tx) => {
    const explodidas = await explodirNecessidades({
      empresaId: pedido.empresaId,
      input,
      resultFaixa: comercial?.faixa ?? null,
    });

    const os = await tx.ordemServico.create({
      data: {
        empresaId: pedido.empresaId,
        pedidoVendaId: pedido.id,
        status: OrdemServicoStatus.PLANEJADA,
        tecnicoSnapshot: {
          medida: input.medida,
          papel: input.papel,
          cores: input.cores,
          maquina: input.maquinaRoda,
          faca: input.formatoFaca,
          acabamento: input.acabamento,
        } as object,
        previstoEm: pedido.dataPrevista,
      },
    });

    let totalNec = 0;
    let totalRes = 0;

    for (const line of explodidas) {
      let reservada = 0;
      const nec = await tx.osNecessidade.create({
        data: {
          ordemServicoId: os.id,
          produtoId: line.produtoId,
          descricao: line.descricao,
          unidade: line.unidade,
          qtdNecessaria: line.quantidade,
          qtdReservada: 0,
          status: line.produtoId
            ? NecessidadeLinhaStatus.FALTA
            : NecessidadeLinhaStatus.SEM_PRODUTO,
          origemChave: line.origemChave,
        },
      });

      totalNec += line.quantidade;

      if (reservaOn && line.produtoId && line.quantidade > 0) {
        const prod = await tx.produto.findUnique({ where: { id: line.produtoId } });
        if (prod?.controlaEstoque) {
          const r = await criarReserva(tx, {
            empresaId: pedido.empresaId,
            produtoId: line.produtoId,
            quantidade: line.quantidade,
            pedidoVendaId: pedido.id,
            ordemServicoId: os.id,
            osNecessidadeId: nec.id,
            userId: opts.userId,
            permitirParcial: true,
          });
          reservada = r.reservada;
          totalRes += reservada;
          await tx.osNecessidade.update({
            where: { id: nec.id },
            data: {
              qtdReservada: reservada,
              status: statusLinha({
                produtoId: line.produtoId,
                necessaria: line.quantidade,
                reservada,
              }),
            },
          });
        } else {
          await tx.osNecessidade.update({
            where: { id: nec.id },
            data: {
              qtdReservada: line.quantidade,
              status: NecessidadeLinhaStatus.OK,
            },
          });
          totalRes += line.quantidade;
        }
      }

      const falta = round4(line.quantidade - reservada);
      if (line.produtoId && falta > 0.0001) {
        await tx.necessidadeCompra.create({
          data: {
            empresaId: pedido.empresaId,
            pedidoVendaId: pedido.id,
            produtoId: line.produtoId,
            descricao: line.descricao,
            unidade: line.unidade,
            quantidade: falta,
            status: NecessidadeCompraStatus.ABERTA,
          },
        });
      } else if (!line.produtoId) {
        await tx.necessidadeCompra.create({
          data: {
            empresaId: pedido.empresaId,
            pedidoVendaId: pedido.id,
            produtoId: null,
            descricao: `${line.descricao} (cadastre o produto)`,
            unidade: line.unidade,
            quantidade: line.quantidade,
            status: NecessidadeCompraStatus.ABERTA,
          },
        });
      }
    }

    const cobertura = totalNec > 0 ? (totalRes / totalNec) * 100 : 100;
    const osStatus =
      cobertura + 0.01 >= pctMin
        ? OrdemServicoStatus.LIBERADA
        : OrdemServicoStatus.AGUARDANDO_MATERIAL;

    await tx.ordemServico.update({
      where: { id: os.id },
      data: { status: osStatus },
    });

    // OP industrial (estudo: PED LIBERADO → OP)
    await criarOrdensProducaoDoPedido(tx, {
      pedidoId: pedido.id,
      empresaId: pedido.empresaId,
      ordemServicoId: os.id,
      qtdPlanejada: Number(pedido.quantidade),
      tecnicoSnapshot: {
        medida: input.medida,
        papel: input.papel,
        cores: input.cores,
        maquina: input.maquinaRoda,
        faca: input.formatoFaca,
        acabamento: input.acabamento,
      },
      previstoEm: pedido.dataPrevista,
    });

    const updated = await tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: {
        status: PedidoVendaStatus.CONFIRMADO,
        confirmadoEm: new Date(),
      },
      include: {
        itens: true,
        ordensServico: { include: { necessidades: true } },
        ordensProducao: true,
        necessidadesCompra: true,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PedidoVenda",
        entityId: pedido.id,
        action: "CONFIRMAR",
        newValue: { osStatus, cobertura },
        userId: opts.userId,
      },
    });

    return updated;
  });
}

/** Reavalia reservas da OS após entrada de estoque. */
export async function reavaliarMateriaisOs(opts: {
  ordemServicoId: string;
  userId?: string;
}) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: opts.ordemServicoId },
    include: { necessidades: { include: { reserva: true } }, pedido: true },
  });
  if (!os) throw Object.assign(new Error("OS não encontrada"), { status: 404 });
  if (
    os.status === OrdemServicoStatus.CONCLUIDA ||
    os.status === OrdemServicoStatus.CANCELADA ||
    os.status === OrdemServicoStatus.EM_PRODUCAO
  ) {
    return os;
  }

  const pctMin = await getParametro<number>(PARAM_KEYS.percentualMinimoLiberacaoOs, 100);

  return prisma.$transaction(async (tx) => {
    let totalNec = 0;
    let totalRes = 0;

    for (const nec of os.necessidades) {
      totalNec += dec(nec.qtdNecessaria);
      let reservada = dec(nec.qtdReservada);

      if (
        nec.produtoId &&
        nec.status !== NecessidadeLinhaStatus.OK &&
        nec.status !== NecessidadeLinhaStatus.ATENDIDA
      ) {
        const falta = round4(dec(nec.qtdNecessaria) - reservada);
        if (falta > 0) {
          const disp = await getDisponivel(os.empresaId, nec.produtoId);
          const aReservar = Math.min(falta, disp.disponivel);
          if (aReservar > 0) {
            const r = await criarReserva(tx, {
              empresaId: os.empresaId,
              produtoId: nec.produtoId,
              quantidade: aReservar,
              pedidoVendaId: os.pedidoVendaId,
              ordemServicoId: os.id,
              osNecessidadeId: nec.reserva ? undefined : nec.id,
              userId: opts.userId,
              permitirParcial: true,
            });
            reservada = round4(reservada + r.reservada);
            await tx.osNecessidade.update({
              where: { id: nec.id },
              data: {
                qtdReservada: reservada,
                status: statusLinha({
                  produtoId: nec.produtoId,
                  necessaria: dec(nec.qtdNecessaria),
                  reservada,
                }),
              },
            });
          }
        }
      }
      totalRes += reservada;
    }

    const cobertura = totalNec > 0 ? (totalRes / totalNec) * 100 : 100;
    const osStatus =
      cobertura + 0.01 >= pctMin
        ? OrdemServicoStatus.LIBERADA
        : OrdemServicoStatus.AGUARDANDO_MATERIAL;

    // Fecha necessidades de compra dos produtos já cobertos pela reserva
    const updatedNec = await tx.osNecessidade.findMany({
      where: { ordemServicoId: os.id },
      select: { produtoId: true, status: true },
    });
    const produtosCobertos = updatedNec
      .filter(
        (n) =>
          n.produtoId &&
          (n.status === NecessidadeLinhaStatus.OK ||
            n.status === NecessidadeLinhaStatus.ATENDIDA),
      )
      .map((n) => n.produtoId!);
    if (produtosCobertos.length) {
      await tx.necessidadeCompra.updateMany({
        where: {
          pedidoVendaId: os.pedidoVendaId,
          produtoId: { in: produtosCobertos },
          status: {
            in: [NecessidadeCompraStatus.ABERTA, NecessidadeCompraStatus.EM_COMPRA],
          },
        },
        data: { status: NecessidadeCompraStatus.ATENDIDA },
      });
    }

    return tx.ordemServico.update({
      where: { id: os.id },
      data: { status: osStatus },
      include: { necessidades: true },
    });
  });
}

/** Reavalia todas as OS de um pedido (ex.: após entrada NFe já lançada). */
export async function reavaliarMateriaisPedido(opts: {
  pedidoId: string;
  userId?: string;
}) {
  const oss = await prisma.ordemServico.findMany({
    where: {
      pedidoVendaId: opts.pedidoId,
      status: {
        in: [
          OrdemServicoStatus.PLANEJADA,
          OrdemServicoStatus.AGUARDANDO_MATERIAL,
          OrdemServicoStatus.LIBERADA,
        ],
      },
    },
    select: { id: true },
  });
  const results = [];
  for (const os of oss) {
    results.push(
      await reavaliarMateriaisOs({
        ordemServicoId: os.id,
        userId: opts.userId,
      }),
    );
  }
  return results;
}

export async function cancelarPedido(opts: { pedidoId: string; userId: string }) {
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: opts.pedidoId },
    include: { reservas: true, ordensServico: true },
  });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });
  if (
    pedido.status === PedidoVendaStatus.FATURADO ||
    pedido.status === PedidoVendaStatus.LIQUIDADO ||
    pedido.status === PedidoVendaStatus.ENTREGUE
  ) {
    throw Object.assign(new Error("Pedido faturado/entregue não pode ser cancelado sem estorno"), {
      status: 400,
    });
  }

  return prisma.$transaction(async (tx) => {
    for (const r of pedido.reservas) {
      if (r.status === "ATIVA") await liberarReserva(tx, r.id, opts.userId);
    }
    await tx.ordemServico.updateMany({
      where: { pedidoVendaId: pedido.id },
      data: { status: OrdemServicoStatus.CANCELADA },
    });
    await tx.necessidadeCompra.updateMany({
      where: { pedidoVendaId: pedido.id, status: NecessidadeCompraStatus.ABERTA },
      data: { status: NecessidadeCompraStatus.CANCELADA },
    });
    return tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: { status: PedidoVendaStatus.CANCELADO, canceladoEm: new Date() },
    });
  });
}
