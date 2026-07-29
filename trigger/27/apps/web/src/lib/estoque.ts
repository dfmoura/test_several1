/** Estoque: saldos, movimentos e reservas (razão append-only). */

import {
  EstoqueMovimentoTipo,
  EstoqueReservaStatus,
  type Prisma,
} from "@prisma/client";
import { dec, ensureDepositoPadrao, round4 } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

async function getOrCreateSaldo(
  tx: Tx,
  empresaId: string,
  depositoId: string,
  produtoId: string,
) {
  const existing = await tx.estoqueSaldo.findUnique({
    where: { depositoId_produtoId: { depositoId, produtoId } },
  });
  if (existing) return existing;
  return tx.estoqueSaldo.create({
    data: {
      empresaId,
      depositoId,
      produtoId,
      quantidade: 0,
      reservado: 0,
      custoMedio: 0,
    },
  });
}

export async function getDisponivel(
  empresaId: string,
  produtoId: string,
  depositoId?: string,
): Promise<{ quantidade: number; reservado: number; disponivel: number; custoMedio: number; depositoId: string }> {
  const deposito = depositoId
    ? await prisma.deposito.findFirstOrThrow({ where: { id: depositoId, empresaId } })
    : await ensureDepositoPadrao(empresaId);
  const saldo = await prisma.estoqueSaldo.findUnique({
    where: { depositoId_produtoId: { depositoId: deposito.id, produtoId } },
  });
  const quantidade = dec(saldo?.quantidade);
  const reservado = dec(saldo?.reservado);
  return {
    quantidade,
    reservado,
    disponivel: round4(quantidade - reservado),
    custoMedio: dec(saldo?.custoMedio),
    depositoId: deposito.id,
  };
}

export async function registrarMovimento(
  tx: Tx,
  opts: {
    empresaId: string;
    depositoId: string;
    produtoId: string;
    tipo: EstoqueMovimentoTipo;
    quantidade: number;
    custoUnitario?: number | null;
    documentoTipo?: string;
    documentoId?: string;
    observacao?: string;
    userId?: string;
    /** Se true, ajusta quantidade física (+/-). RESERVA/LIBERA só mexem em reservado. */
    afetaFisico?: boolean;
    afetaReservado?: number;
  },
) {
  const qtd = round4(opts.quantidade);
  if (qtd === 0 && !opts.afetaReservado) {
    throw Object.assign(new Error("Quantidade do movimento deve ser ≠ 0"), { status: 400 });
  }

  const saldo = await getOrCreateSaldo(tx, opts.empresaId, opts.depositoId, opts.produtoId);
  let quantidade = dec(saldo.quantidade);
  let reservado = dec(saldo.reservado);
  let custoMedio = dec(saldo.custoMedio);

  const afetaFisico =
    opts.afetaFisico ??
    (opts.tipo !== EstoqueMovimentoTipo.RESERVA &&
      opts.tipo !== EstoqueMovimentoTipo.LIBERA_RESERVA);

  if (afetaFisico) {
    if (
      opts.tipo === EstoqueMovimentoTipo.ENTRADA_COMPRA ||
      opts.tipo === EstoqueMovimentoTipo.ENTRADA_PRODUCAO ||
      (opts.tipo === EstoqueMovimentoTipo.AJUSTE_INVENTARIO && qtd > 0) ||
      (opts.tipo === EstoqueMovimentoTipo.ESTORNO && qtd > 0)
    ) {
      const entrada = Math.abs(qtd);
      const custo = opts.custoUnitario ?? custoMedio;
      if (quantidade + entrada > 0) {
        custoMedio = round4((quantidade * custoMedio + entrada * custo) / (quantidade + entrada));
      } else {
        custoMedio = custo;
      }
      quantidade = round4(quantidade + entrada);
      await tx.produto.update({
        where: { id: opts.produtoId },
        data: { custoMedio, ultimoCusto: custo },
      });
    } else {
      const saida = Math.abs(qtd);
      if (quantidade - saida < -0.0001) {
        const prod = await tx.produto.findUnique({ where: { id: opts.produtoId } });
        if (!prod?.permiteSaldoNegativo) {
          throw Object.assign(
            new Error(`Estoque insuficiente para ${prod?.codigo ?? opts.produtoId}`),
            { status: 400 },
          );
        }
      }
      quantidade = round4(quantidade - saida);
    }
  }

  if (opts.afetaReservado != null) {
    reservado = round4(reservado + opts.afetaReservado);
    if (reservado < -0.0001) reservado = 0;
  }

  await tx.estoqueSaldo.update({
    where: { id: saldo.id },
    data: { quantidade, reservado, custoMedio },
  });

  return tx.estoqueMovimento.create({
    data: {
      empresaId: opts.empresaId,
      depositoId: opts.depositoId,
      produtoId: opts.produtoId,
      tipo: opts.tipo,
      quantidade: qtd,
      custoUnitario: opts.custoUnitario ?? null,
      saldoApos: quantidade,
      documentoTipo: opts.documentoTipo,
      documentoId: opts.documentoId,
      observacao: opts.observacao,
      userId: opts.userId,
    },
  });
}

/** Reserva quantidade disponível (parcial se necessário). */
export async function criarReserva(
  tx: Tx,
  opts: {
    empresaId: string;
    produtoId: string;
    quantidade: number;
    pedidoVendaId?: string;
    ordemServicoId?: string;
    osNecessidadeId?: string;
    userId?: string;
    permitirParcial?: boolean;
  },
): Promise<{ reservada: number; reservaId: string | null }> {
  const qtdPedida = round4(opts.quantidade);
  if (qtdPedida <= 0) return { reservada: 0, reservaId: null };

  const deposito = await ensureDepositoPadrao(opts.empresaId);
  const saldo = await getOrCreateSaldo(tx, opts.empresaId, deposito.id, opts.produtoId);
  const disponivel = round4(dec(saldo.quantidade) - dec(saldo.reservado));
  const reservar = opts.permitirParcial ? Math.min(qtdPedida, Math.max(0, disponivel)) : qtdPedida;

  if (reservar <= 0) return { reservada: 0, reservaId: null };

  if (!opts.permitirParcial && reservar + 0.0001 < qtdPedida) {
    throw Object.assign(new Error("Estoque insuficiente para reserva total"), { status: 400 });
  }

  await registrarMovimento(tx, {
    empresaId: opts.empresaId,
    depositoId: deposito.id,
    produtoId: opts.produtoId,
    tipo: EstoqueMovimentoTipo.RESERVA,
    quantidade: reservar,
    afetaFisico: false,
    afetaReservado: reservar,
    documentoTipo: "EstoqueReserva",
    documentoId: opts.osNecessidadeId ?? opts.ordemServicoId,
    userId: opts.userId,
  });

  const reserva = await tx.estoqueReserva.create({
    data: {
      empresaId: opts.empresaId,
      depositoId: deposito.id,
      produtoId: opts.produtoId,
      quantidade: reservar,
      status: EstoqueReservaStatus.ATIVA,
      pedidoVendaId: opts.pedidoVendaId,
      ordemServicoId: opts.ordemServicoId,
      osNecessidadeId: opts.osNecessidadeId,
    },
  });

  return { reservada: reservar, reservaId: reserva.id };
}

export async function liberarReserva(
  tx: Tx,
  reservaId: string,
  userId?: string,
) {
  const reserva = await tx.estoqueReserva.findUniqueOrThrow({ where: { id: reservaId } });
  if (reserva.status !== EstoqueReservaStatus.ATIVA) return;

  const qtd = dec(reserva.quantidade);
  await registrarMovimento(tx, {
    empresaId: reserva.empresaId,
    depositoId: reserva.depositoId,
    produtoId: reserva.produtoId,
    tipo: EstoqueMovimentoTipo.LIBERA_RESERVA,
    quantidade: qtd,
    afetaFisico: false,
    afetaReservado: -qtd,
    documentoTipo: "EstoqueReserva",
    documentoId: reserva.id,
    userId,
  });

  await tx.estoqueReserva.update({
    where: { id: reservaId },
    data: { status: EstoqueReservaStatus.LIBERADA },
  });
}

/** Consome reserva (baixa física + reduz reservado). */
export async function consumirReserva(
  tx: Tx,
  reservaId: string,
  userId?: string,
) {
  const reserva = await tx.estoqueReserva.findUniqueOrThrow({ where: { id: reservaId } });
  if (reserva.status !== EstoqueReservaStatus.ATIVA) return;

  const qtd = dec(reserva.quantidade);
  await registrarMovimento(tx, {
    empresaId: reserva.empresaId,
    depositoId: reserva.depositoId,
    produtoId: reserva.produtoId,
    tipo: EstoqueMovimentoTipo.BAIXA_PRODUCAO,
    quantidade: qtd,
    afetaFisico: true,
    afetaReservado: -qtd,
    documentoTipo: "EstoqueReserva",
    documentoId: reserva.id,
    userId,
  });

  await tx.estoqueReserva.update({
    where: { id: reservaId },
    data: { status: EstoqueReservaStatus.CONSUMIDA },
  });
}

export async function entradaCompra(
  tx: Tx,
  opts: {
    empresaId: string;
    produtoId: string;
    quantidade: number;
    custoUnitario: number;
    documentoId: string;
    userId?: string;
  },
) {
  const deposito = await ensureDepositoPadrao(opts.empresaId);
  return registrarMovimento(tx, {
    empresaId: opts.empresaId,
    depositoId: deposito.id,
    produtoId: opts.produtoId,
    tipo: EstoqueMovimentoTipo.ENTRADA_COMPRA,
    quantidade: opts.quantidade,
    custoUnitario: opts.custoUnitario,
    documentoTipo: "DocumentoFiscalEntrada",
    documentoId: opts.documentoId,
    userId: opts.userId,
    afetaFisico: true,
  });
}

export async function ajusteInventario(
  opts: {
    empresaId: string;
    produtoId: string;
    quantidadeDelta: number;
    motivo: string;
    userId: string;
  },
) {
  const deposito = await ensureDepositoPadrao(opts.empresaId);
  return prisma.$transaction(async (tx) => {
    return registrarMovimento(tx, {
      empresaId: opts.empresaId,
      depositoId: deposito.id,
      produtoId: opts.produtoId,
      tipo: EstoqueMovimentoTipo.AJUSTE_INVENTARIO,
      quantidade: opts.quantidadeDelta,
      observacao: opts.motivo,
      userId: opts.userId,
      documentoTipo: "AjusteInventario",
      afetaFisico: true,
    });
  });
}
