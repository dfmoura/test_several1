/** Pedido de venda + OS + confirmação com ATP. */

import {
  NecessidadeCompraStatus,
  NecessidadeLinhaStatus,
  OrdemServicoStatus,
  OrcamentoStatus,
  PedidoVendaStatus,
  TipoProduto,
  type Prisma,
} from "@prisma/client";
import { dec, getParametro, PARAM_KEYS, round2, round4 } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";
import { criarReserva, getDisponivel, liberarReserva } from "@/lib/estoque";
import { explodirNecessidades } from "@/lib/mrp";
import {
  descricaoProduto,
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";

type Tx = Prisma.TransactionClient;

export const PEDIDO_STATUS_LABEL: Record<PedidoVendaStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em produção",
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

async function ensureProdutoServicoVenda(
  tx: Tx,
  empresaId: string,
  input: OrcamentoInputSnapshot,
) {
  const codigo = `SRV-${(input.papel || "ETQ").slice(0, 12).replace(/\s+/g, "-").toUpperCase()}`;
  const existing = await tx.produto.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });
  if (existing) return existing;
  return tx.produto.create({
    data: {
      empresaId,
      codigo,
      descricao: descricaoProduto(input) || "Etiquetas acabadas",
      descricaoFiscal: "Composição gráfica — etiquetas (impressão)",
      tipo: TipoProduto.ACABADO,
      unidade: "UN",
      controlaEstoque: true,
      documentoSaidaPadrao: "NFSE",
      cTribNac: "130501",
      cNbs: "121012100",
      ncm: "48211000",
      ativo: true,
    },
  });
}

async function ensureProdutoMatriz(tx: Tx, empresaId: string) {
  const codigo = "SRV-MATRIZ";
  const existing = await tx.produto.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });
  if (existing) return existing;
  return tx.produto.create({
    data: {
      empresaId,
      codigo,
      descricao: "Matriz flexográfica (1º pedido)",
      descricaoFiscal: "Serviço de confecção de matriz — 1º pedido",
      tipo: TipoProduto.SERVICO,
      unidade: "UN",
      controlaEstoque: false,
      documentoSaidaPadrao: "NFSE",
      cTribNac: "130501",
      cNbs: "121012100",
      ativo: true,
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
  // Valor do serviço de impressão (sem matriz, se cobrada à parte)
  const valorImpressao = cobraMatriz ? valorEtiqueta : valorTotal;
  const valorUnitario =
    quantidade > 0 ? round4(valorImpressao / quantidade) : valorImpressao;

  return prisma.$transaction(async (tx) => {
    const produto = await ensureProdutoServicoVenda(tx, orc.empresaId!, input);
    const descPrincipal =
      descricaoProduto(input) ||
      produto.descricao ||
      "Impressão de etiquetas";

    const itensCreate: Array<{
      produtoId: string;
      descricao: string;
      quantidade: number;
      unidade: string;
      valorUnitario: number;
      valorTotal: number;
      especificacaoSnapshot: object;
      ordem: number;
    }> = [
      {
        produtoId: produto.id,
        descricao: descPrincipal,
        quantidade,
        unidade: "UN",
        valorUnitario,
        valorTotal: valorImpressao,
        especificacaoSnapshot: {
          ...input,
          kind: "IMPRESSAO",
          production: faixa.production,
        } as object,
        ordem: 0,
      },
    ];

    if (cobraMatriz) {
      const matrizProd = await ensureProdutoMatriz(tx, orc.empresaId!);
      itensCreate.push({
        produtoId: matrizProd.id,
        descricao: "Matriz flexográfica (cobrada no 1º pedido)",
        quantidade: 1,
        unidade: "UN",
        valorUnitario: valorMatriz,
        valorTotal: valorMatriz,
        especificacaoSnapshot: { kind: "MATRIZ", matriz: true } as object,
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
          itens: itensCreate.length,
          faixaIndex: opts.faixaIndex,
        },
        userId: opts.userId,
      },
    });

    return pedido;
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
    include: { itens: true },
  });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });
  if (pedido.status !== PedidoVendaStatus.RASCUNHO) {
    throw Object.assign(new Error("Só pedido em rascunho pode ser confirmado"), { status: 400 });
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

    const updated = await tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: {
        status: PedidoVendaStatus.CONFIRMADO,
        confirmadoEm: new Date(),
      },
      include: {
        itens: true,
        ordensServico: { include: { necessidades: true } },
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

    return tx.ordemServico.update({
      where: { id: os.id },
      data: { status: osStatus },
      include: { necessidades: true },
    });
  });
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
