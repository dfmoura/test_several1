import { prisma } from "@/lib/db";

const AUDIT_OPERACIONAL = [
  "Orcamento",
  "OrcamentoLinkAprovacao",
  "PedidoVenda",
  "PedidoCompra",
  "OrdemServico",
  "OrdemProducao",
  "EstoqueMovimento",
  "EstoqueReserva",
  "EstoqueSaldo",
  "DocumentoFiscalEntrada",
  "DocumentoFiscalSaida",
  "TituloReceber",
  "BaixaReceber",
  "CobrancaInter",
  "EntregaPedido",
  "NecessidadeCompra",
] as const;

export type ResetOperacionalResult = {
  deleted: Record<string, number>;
  preserved: string[];
};

/**
 * Apaga dados do ciclo operacional (orçamentos, pedidos, compras, estoque,
 * NFs, títulos). Preserva cadastros mestres: Empresa, Parceiro, User, Produto,
 * catálogos XLSM, Depósito, ParametroSistema, integrações.
 */
export async function resetOperacional(userId?: string): Promise<ResetOperacionalResult> {
  const deleted: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    const count = async (label: string, n: number) => {
      deleted[label] = n;
    };

    await count("CobrancaInter", (await tx.cobrancaInter.deleteMany()).count);
    await count("BaixaReceber", (await tx.baixaReceber.deleteMany()).count);
    await count("TituloReceber", (await tx.tituloReceber.deleteMany()).count);
    await count("EntregaPedido", (await tx.entregaPedido.deleteMany()).count);
    await count(
      "DocumentoFiscalSaida",
      (await tx.documentoFiscalSaida.deleteMany()).count,
    );
    await count("DocEntradaItem", (await tx.docEntradaItem.deleteMany()).count);
    await count(
      "DocumentoFiscalEntrada",
      (await tx.documentoFiscalEntrada.deleteMany()).count,
    );
    await count("EstoqueReserva", (await tx.estoqueReserva.deleteMany()).count);
    await count("EstoqueMovimento", (await tx.estoqueMovimento.deleteMany()).count);
    await count("EstoqueSaldo", (await tx.estoqueSaldo.deleteMany()).count);
    await count("OsNecessidade", (await tx.osNecessidade.deleteMany()).count);
    await count("OrdemProducao", (await tx.ordemProducao.deleteMany()).count);
    await count("OrdemServico", (await tx.ordemServico.deleteMany()).count);
    await count("PedidoItem", (await tx.pedidoItem.deleteMany()).count);
    await count("NecessidadeCompra", (await tx.necessidadeCompra.deleteMany()).count);
    await count("PedidoCompraItem", (await tx.pedidoCompraItem.deleteMany()).count);
    await count("PedidoCompra", (await tx.pedidoCompra.deleteMany()).count);
    await count("PedidoVenda", (await tx.pedidoVenda.deleteMany()).count);

    await tx.orcamentoLinkAprovacao.deleteMany();
    await tx.orcamento.updateMany({ data: { parentId: null } });
    await count("Orcamento", (await tx.orcamento.deleteMany()).count);

    await count(
      "AuditLogOperacional",
      (
        await tx.auditLog.deleteMany({
          where: { entityType: { in: [...AUDIT_OPERACIONAL] } },
        })
      ).count,
    );

    await tx.auditLog.create({
      data: {
        entityType: "Sistema",
        entityId: "reset-operacional",
        action: "RESET_OPERACIONAL",
        newValue: { deleted },
        userId: userId ?? null,
      },
    });
  });

  return {
    deleted,
    preserved: [
      "Empresa",
      "EmpresaCnae",
      "EmpresaCertificado",
      "EmpresaIntegracao",
      "User",
      "Parceiro",
      "ParceiroTipo",
      "Produto",
      "ProdutoFornecedor",
      "Deposito",
      "Papel",
      "Acabamento",
      "Tubete",
      "HoraParada",
      "Maquina",
      "HoraMaquinaTarifa",
      "PerdaPapel",
      "CaixaLookup",
      "Faca",
      "ParametroSistema",
    ],
  };
}
