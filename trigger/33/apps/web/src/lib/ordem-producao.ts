/**
 * Ordem de Produção — chão de fábrica (PRODUCAO_OPERACIONAL_GERENCIAL.txt).
 * OP é filha do PED LIBERADO; convive com OS no mesmo ERP.
 */

import {
  NecessidadeItemTipo,
  OrdemProducaoStatus,
  OrdemServicoStatus,
  PedidoVendaStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatOp } from "@/lib/codigos-documento";

type Tx = Prisma.TransactionClient;

const STATUS_LIBERA_OP: PedidoVendaStatus[] = [
  PedidoVendaStatus.LIBERADO,
  PedidoVendaStatus.CONFIRMADO,
  PedidoVendaStatus.EM_PRODUCAO,
];

export const OP_STATUS_LABEL: Record<OrdemProducaoStatus, string> = {
  PLANEJADA: "Planejada",
  EMPENHADA: "Empenhada",
  EM_SETUP: "Em setup",
  EM_PRODUCAO: "Em produção",
  PAUSADA: "Pausada",
  AGUARDA_INSUMO: "Aguarda insumo",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

/** Cria OP(s) industriais a partir dos itens PRODUCAO do pedido (+ vínculo OS). */
export async function criarOrdensProducaoDoPedido(
  tx: Tx,
  opts: {
    pedidoId: string;
    empresaId: string;
    ordemServicoId?: string | null;
    qtdPlanejada: number;
    tecnicoSnapshot?: object;
    previstoEm?: Date | null;
  },
) {
  const itens = await tx.pedidoItem.findMany({
    where: {
      pedidoVendaId: opts.pedidoId,
      necessidadeTipo: NecessidadeItemTipo.PRODUCAO,
    },
    orderBy: { ordem: "asc" },
  });

  // Fallback: pedido sem item PRODUCAO → 1 OP no primeiro item
  const alvos =
    itens.length > 0
      ? itens
      : await tx.pedidoItem.findMany({
          where: { pedidoVendaId: opts.pedidoId },
          orderBy: { ordem: "asc" },
          take: 1,
        });

  const ops = [];
  for (const item of alvos) {
    const op = await tx.ordemProducao.create({
      data: {
        empresaId: opts.empresaId,
        pedidoVendaId: opts.pedidoId,
        pedidoItemId: item.id,
        ordemServicoId: opts.ordemServicoId || null,
        status: OrdemProducaoStatus.PLANEJADA,
        qtdPlanejada: opts.qtdPlanejada || Number(item.quantidade),
        tecnicoSnapshot: opts.tecnicoSnapshot ?? undefined,
        previstoEm: opts.previstoEm ?? null,
        prioridade: 100,
      },
    });
    ops.push(op);
  }
  return ops;
}

export async function listarFilaPcp(opts?: { empresaId?: string }) {
  const ops = await prisma.ordemProducao.findMany({
    where: {
      ...(opts?.empresaId ? { empresaId: opts.empresaId } : {}),
      status: {
        notIn: [OrdemProducaoStatus.CONCLUIDA, OrdemProducaoStatus.CANCELADA],
      },
    },
    include: {
      pedido: {
        select: {
          id: true,
          numero: true,
          clienteNome: true,
          status: true,
          dataPrevista: true,
          valorTotal: true,
          createdAt: true,
        },
      },
      pedidoItem: { select: { descricao: true, quantidade: true } },
      ordemServico: { select: { id: true, numero: true, status: true } },
    },
    orderBy: [{ prioridade: "asc" }, { previstoEm: "asc" }, { createdAt: "asc" }],
    take: 200,
  });

  return ops.map((op) => ({
    id: op.id,
    codigo: formatOp(op),
    numero: op.numero,
    status: op.status,
    statusLabel: OP_STATUS_LABEL[op.status],
    prioridade: op.prioridade,
    qtdPlanejada: Number(op.qtdPlanejada),
    qtdBoa: Number(op.qtdBoa),
    qtdRefugo: Number(op.qtdRefugo),
    sobraMetros: op.sobraMetros != null ? Number(op.sobraMetros) : null,
    previstoEm: op.previstoEm?.toISOString() ?? null,
    iniciadoEm: op.iniciadoEm?.toISOString() ?? null,
    pedido: {
      id: op.pedido.id,
      codigo: `PED-${op.pedido.createdAt.getFullYear()}-${String(op.pedido.numero).padStart(5, "0")}`,
      numero: op.pedido.numero,
      clienteNome: op.pedido.clienteNome,
      status: op.pedido.status,
      dataPrevista: op.pedido.dataPrevista?.toISOString() ?? null,
    },
    item: op.pedidoItem
      ? { descricao: op.pedidoItem.descricao, quantidade: Number(op.pedidoItem.quantidade) }
      : null,
    os: op.ordemServico
      ? {
          id: op.ordemServico.id,
          numero: op.ordemServico.numero,
          status: op.ordemServico.status,
        }
      : null,
  }));
}

export async function iniciarOp(opts: { opId: string; userId: string }) {
  const op = await prisma.ordemProducao.findUnique({
    where: { id: opts.opId },
    include: { pedido: true, ordemServico: true },
  });
  if (!op) throw Object.assign(new Error("OP não encontrada"), { status: 404 });
  if (!STATUS_LIBERA_OP.includes(op.pedido.status)) {
    throw Object.assign(
      new Error("OP só inicia com PED liberado (crédito/sinal ok)"),
      { status: 400 },
    );
  }
  if (
    op.status !== OrdemProducaoStatus.PLANEJADA &&
    op.status !== OrdemProducaoStatus.EMPENHADA &&
    op.status !== OrdemProducaoStatus.EM_SETUP
  ) {
    throw Object.assign(new Error("Status da OP não permite iniciar"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ordemProducao.update({
      where: { id: op.id },
      data: {
        status: OrdemProducaoStatus.EM_PRODUCAO,
        iniciadoEm: new Date(),
        responsavelId: opts.userId,
      },
    });
    await tx.pedidoVenda.update({
      where: { id: op.pedidoVendaId },
      data: { status: PedidoVendaStatus.EM_PRODUCAO },
    });
    if (
      op.ordemServicoId &&
      op.ordemServico &&
      op.ordemServico.status === OrdemServicoStatus.LIBERADA
    ) {
      await tx.ordemServico.update({
        where: { id: op.ordemServicoId },
        data: { status: OrdemServicoStatus.EM_PRODUCAO, iniciadoEm: new Date() },
      });
    }
    await tx.auditLog.create({
      data: {
        entityType: "OrdemProducao",
        entityId: op.id,
        action: "INICIAR_OP",
        userId: opts.userId,
      },
    });
    return updated;
  });
}

export async function apontarOp(opts: {
  opId: string;
  userId: string;
  qtdBoa?: number;
  qtdRefugo?: number;
  sobraMetros?: number | null;
  pausar?: boolean;
  motivoPausa?: string | null;
}) {
  const op = await prisma.ordemProducao.findUnique({ where: { id: opts.opId } });
  if (!op) throw Object.assign(new Error("OP não encontrada"), { status: 404 });
  if (
    op.status !== OrdemProducaoStatus.EM_PRODUCAO &&
    op.status !== OrdemProducaoStatus.PAUSADA
  ) {
    throw Object.assign(new Error("OP precisa estar em produção ou pausada"), { status: 400 });
  }

  return prisma.ordemProducao.update({
    where: { id: op.id },
    data: {
      qtdBoa: opts.qtdBoa != null ? opts.qtdBoa : op.qtdBoa,
      qtdRefugo: opts.qtdRefugo != null ? opts.qtdRefugo : op.qtdRefugo,
      sobraMetros: opts.sobraMetros !== undefined ? opts.sobraMetros : op.sobraMetros,
      status: opts.pausar ? OrdemProducaoStatus.PAUSADA : OrdemProducaoStatus.EM_PRODUCAO,
      observacoes: opts.motivoPausa
        ? [op.observacoes, `Pausa: ${opts.motivoPausa}`].filter(Boolean).join("\n")
        : op.observacoes,
    },
  });
}

export async function concluirOp(opts: {
  opId: string;
  userId: string;
  qtdBoa?: number;
  qtdRefugo?: number;
  sobraMetros?: number | null;
}) {
  const op = await prisma.ordemProducao.findUnique({
    where: { id: opts.opId },
    include: {
      pedido: { include: { ordensProducao: true, ordensServico: true } },
    },
  });
  if (!op) throw Object.assign(new Error("OP não encontrada"), { status: 404 });
  if (
    op.status !== OrdemProducaoStatus.EM_PRODUCAO &&
    op.status !== OrdemProducaoStatus.PAUSADA
  ) {
    throw Object.assign(new Error("OP precisa estar em produção para concluir"), { status: 400 });
  }

  const { concluirProducao } = await import("@/lib/producao");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ordemProducao.update({
      where: { id: op.id },
      data: {
        status: OrdemProducaoStatus.CONCLUIDA,
        concluidoEm: new Date(),
        qtdBoa: opts.qtdBoa != null ? opts.qtdBoa : op.qtdBoa,
        qtdRefugo: opts.qtdRefugo != null ? opts.qtdRefugo : op.qtdRefugo,
        sobraMetros: opts.sobraMetros !== undefined ? opts.sobraMetros : op.sobraMetros,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "OrdemProducao",
        entityId: op.id,
        action: "CONCLUIR_OP",
        newValue: {
          qtdBoa: Number(updated.qtdBoa),
          qtdRefugo: Number(updated.qtdRefugo),
          sobraMetros: updated.sobraMetros != null ? Number(updated.sobraMetros) : null,
        },
        userId: opts.userId,
      },
    });

    // Se todas as OPs do PED concluídas → PRODUZIDO (e conclui OS espelhada se houver)
    const restantes = await tx.ordemProducao.count({
      where: {
        pedidoVendaId: op.pedidoVendaId,
        status: { notIn: [OrdemProducaoStatus.CONCLUIDA, OrdemProducaoStatus.CANCELADA] },
      },
    });

    if (restantes === 0) {
      await tx.pedidoVenda.update({
        where: { id: op.pedidoVendaId },
        data: { status: PedidoVendaStatus.PRODUZIDO },
      });
    }

    return updated;
  }).then(async (updated) => {
    // Baixa de insumos via OS se ainda em produção (reusa fluxo existente)
    if (op.ordemServicoId) {
      const os = await prisma.ordemServico.findUnique({ where: { id: op.ordemServicoId } });
      if (os?.status === OrdemServicoStatus.EM_PRODUCAO) {
        await concluirProducao({
          ordemServicoId: os.id,
          userId: opts.userId,
          sobraMetros: opts.sobraMetros ?? (op.sobraMetros != null ? Number(op.sobraMetros) : null),
          opId: op.id,
        });
      } else if (os && os.status === OrdemServicoStatus.LIBERADA) {
        // Garante baixa mesmo se OS não foi iniciada via fluxo antigo
        await prisma.ordemServico.update({
          where: { id: os.id },
          data: { status: OrdemServicoStatus.EM_PRODUCAO, iniciadoEm: new Date() },
        });
        await concluirProducao({
          ordemServicoId: os.id,
          userId: opts.userId,
          sobraMetros: opts.sobraMetros ?? null,
          opId: op.id,
        });
      }
    }
    return updated;
  });
}
