/** Produção: iniciar / concluir OS com baixa de insumos e entrada de acabado. */

import {
  EstoqueMovimentoTipo,
  NecessidadeLinhaStatus,
  OrdemServicoStatus,
  PedidoVendaStatus,
} from "@prisma/client";
import { ensureDepositoPadrao } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";
import { consumirReserva, registrarMovimento } from "@/lib/estoque";

export async function iniciarProducao(opts: { ordemServicoId: string; userId: string }) {
  const os = await prisma.ordemServico.findUnique({ where: { id: opts.ordemServicoId } });
  if (!os) throw Object.assign(new Error("OS não encontrada"), { status: 404 });
  if (os.status !== OrdemServicoStatus.LIBERADA) {
    throw Object.assign(new Error("OS precisa estar liberada (materiais ok) para iniciar"), {
      status: 400,
    });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ordemServico.update({
      where: { id: os.id },
      data: {
        status: OrdemServicoStatus.EM_PRODUCAO,
        iniciadoEm: new Date(),
        responsavelId: opts.userId,
      },
    });
    await tx.pedidoVenda.update({
      where: { id: os.pedidoVendaId },
      data: { status: PedidoVendaStatus.EM_PRODUCAO },
    });
    await tx.auditLog.create({
      data: {
        entityType: "OrdemServico",
        entityId: os.id,
        action: "INICIAR_PRODUCAO",
        userId: opts.userId,
      },
    });
    return updated;
  });
}

export async function concluirProducao(opts: { ordemServicoId: string; userId: string }) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: opts.ordemServicoId },
    include: {
      reservas: true,
      necessidades: true,
      pedido: { include: { itens: { include: { produto: true } } } },
    },
  });
  if (!os) throw Object.assign(new Error("OS não encontrada"), { status: 404 });
  if (os.status !== OrdemServicoStatus.EM_PRODUCAO) {
    throw Object.assign(new Error("OS precisa estar em produção para concluir"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    for (const r of os.reservas) {
      if (r.status === "ATIVA") {
        await consumirReserva(tx, r.id, opts.userId);
      }
    }
    for (const nec of os.necessidades) {
      await tx.osNecessidade.update({
        where: { id: nec.id },
        data: {
          qtdAtendida: nec.qtdReservada,
          status: NecessidadeLinhaStatus.ATENDIDA,
        },
      });
    }

    // Entrada do produto acabado no estoque
    const deposito = await ensureDepositoPadrao(os.empresaId);
    for (const it of os.pedido.itens) {
      if (!it.produtoId || !it.produto?.controlaEstoque) continue;
      await registrarMovimento(tx, {
        empresaId: os.empresaId,
        depositoId: deposito.id,
        produtoId: it.produtoId,
        tipo: EstoqueMovimentoTipo.ENTRADA_PRODUCAO,
        quantidade: Number(it.quantidade),
        custoUnitario: Number(it.valorUnitario),
        documentoTipo: "OrdemServico",
        documentoId: os.id,
        userId: opts.userId,
        afetaFisico: true,
        observacao: `Produção OS ${os.numero}`,
      });
    }

    const updated = await tx.ordemServico.update({
      where: { id: os.id },
      data: {
        status: OrdemServicoStatus.CONCLUIDA,
        concluidoEm: new Date(),
      },
      include: { necessidades: true },
    });

    await tx.auditLog.create({
      data: {
        entityType: "OrdemServico",
        entityId: os.id,
        action: "CONCLUIR_PRODUCAO",
        userId: opts.userId,
      },
    });

    return updated;
  });
}
