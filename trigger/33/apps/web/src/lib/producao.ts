/** Produção: iniciar / concluir OS com baixa de insumos, entrada de acabado e sobra. */

import {
  EstoqueMovimentoTipo,
  NecessidadeLinhaStatus,
  OrdemServicoStatus,
  PedidoVendaStatus,
} from "@prisma/client";
import { ensureDepositoPadrao, getParametro, PARAM_KEYS, round4 } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";
import { consumirReserva, registrarMovimento } from "@/lib/estoque";

export async function iniciarProducao(opts: { ordemServicoId: string; userId: string }) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: opts.ordemServicoId },
    include: { pedido: true },
  });
  if (!os) throw Object.assign(new Error("OS não encontrada"), { status: 404 });
  if (os.status !== OrdemServicoStatus.LIBERADA) {
    throw Object.assign(new Error("OS precisa estar liberada (materiais ok) para iniciar"), {
      status: 400,
    });
  }
  if (
    os.pedido.status === PedidoVendaStatus.AGUARDA_CREDITO ||
    os.pedido.status === PedidoVendaStatus.AGUARDA_ADIANTAMENTO
  ) {
    throw Object.assign(
      new Error("Produção bloqueada: aguarde liberação de crédito / baixa do adiantamento"),
      { status: 400 },
    );
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
    // Espelha nas OPs planejadas vinculadas
    await tx.ordemProducao.updateMany({
      where: {
        ordemServicoId: os.id,
        status: { in: ["PLANEJADA", "EMPENHADA", "EM_SETUP"] },
      },
      data: { status: "EM_PRODUCAO", iniciadoEm: new Date(), responsavelId: opts.userId },
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

/**
 * Conclui OS: consome reservas, entra PA, registra sobra/retalho se informada.
 * Spec: TRATAMENTO_SOBRA_BOBINA_RETALHO.txt
 */
export async function concluirProducao(opts: {
  ordemServicoId: string;
  userId: string;
  sobraMetros?: number | null;
  opId?: string | null;
}) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: opts.ordemServicoId },
    include: {
      reservas: true,
      necessidades: { include: { produto: true } },
      pedido: { include: { itens: { include: { produto: true } }, ordensProducao: true } },
    },
  });
  if (!os) throw Object.assign(new Error("OS não encontrada"), { status: 404 });
  if (os.status !== OrdemServicoStatus.EM_PRODUCAO) {
    throw Object.assign(new Error("OS precisa estar em produção para concluir"), { status: 400 });
  }

  const minSobra = await getParametro<number>(PARAM_KEYS.sobraComprimentoMinimoM, 100);

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

    // Retorno de sobra: devolve metros ao SKU original se >= mínimo útil
    const sobra = opts.sobraMetros != null ? Number(opts.sobraMetros) : null;
    if (sobra != null && sobra >= minSobra) {
      const papelNec = os.necessidades.find(
        (n) => n.produtoId && (n.origemChave?.includes("papel") || n.unidade === "M2" || n.unidade === "M"),
      );
      if (papelNec?.produtoId) {
        const deposito = await ensureDepositoPadrao(os.empresaId);
        await registrarMovimento(tx, {
          empresaId: os.empresaId,
          depositoId: deposito.id,
          produtoId: papelNec.produtoId,
          tipo: EstoqueMovimentoTipo.RETORNO_SOBRA,
          quantidade: round4(sobra),
          custoUnitario: 0,
          documentoTipo: opts.opId ? "OrdemProducao" : "OrdemServico",
          documentoId: opts.opId || os.id,
          userId: opts.userId,
          afetaFisico: true,
          observacao: `Sobra/retalho ${sobra} m — retorno à bobina (mín. ${minSobra} m)`,
        });
      }
    } else if (sobra != null && sobra > 0 && sobra < minSobra) {
      // Apara/sucata: baixa como refugo (não volta ao estoque aproveitável)
      const papelNec = os.necessidades.find((n) => n.produtoId);
      if (papelNec?.produtoId) {
        await tx.auditLog.create({
          data: {
            entityType: "OrdemServico",
            entityId: os.id,
            action: "APARA_SUCATA",
            newValue: { metros: sobra, motivo: `Abaixo do mínimo útil (${minSobra} m)` },
            userId: opts.userId,
          },
        });
      }
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

    // Marca OPs vinculadas concluídas se ainda abertas
    await tx.ordemProducao.updateMany({
      where: {
        ordemServicoId: os.id,
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
      data: {
        status: "CONCLUIDA",
        concluidoEm: new Date(),
        ...(sobra != null ? { sobraMetros: sobra } : {}),
      },
    });

    const opsAbertas = await tx.ordemProducao.count({
      where: {
        pedidoVendaId: os.pedidoVendaId,
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
    });
    if (opsAbertas === 0) {
      await tx.pedidoVenda.update({
        where: { id: os.pedidoVendaId },
        data: { status: PedidoVendaStatus.PRODUZIDO },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "OrdemServico",
        entityId: os.id,
        action: "CONCLUIR_PRODUCAO",
        newValue: { sobraMetros: sobra },
        userId: opts.userId,
      },
    });

    return updated;
  });
}
