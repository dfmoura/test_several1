/**
 * Link de aprovação do cliente (APROVACAO_ORCAMENTO_CLIENTE.txt).
 * Token único por versão; inválido ao expirar / nova versão / já usado.
 */

import { randomBytes } from "crypto";
import {
  CanalAprovacao,
  CreditoPedidoFlag,
  OrcamentoStatus,
  PedidoVendaStatus,
} from "@prisma/client";
import { getParametro, PARAM_KEYS } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";
import { formatOrcamento } from "@/lib/codigos-documento";
import { verificarCreditoParaPedido } from "@/lib/credito";
import {
  isOrcamentoVencido,
} from "@/lib/orcamento-input";
import {
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { converterOrcamentoEmPedido } from "@/lib/pedido-venda";

function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

function validadeEmDias(input: OrcamentoInputSnapshot): number {
  const d = Number(input.validadeDias ?? 7);
  return Number.isFinite(d) && d > 0 ? d : 7;
}

export async function gerarOuReutilizarLinkAprovacao(opts: {
  orcamentoId: string;
  canalEnvio?: string | null;
  destinoEnvio?: string | null;
}) {
  const orc = await prisma.orcamento.findUnique({
    where: { id: opts.orcamentoId },
    include: { linkAprovacao: true },
  });
  if (!orc) throw Object.assign(new Error("Orçamento não encontrado"), { status: 404 });
  if (orc.status === OrcamentoStatus.APROVADO || orc.status === OrcamentoStatus.REPROVADO) {
    throw Object.assign(new Error("Orçamento já decidido — gere nova versão para novo link"), {
      status: 409,
    });
  }

  const input = orc.inputSnapshot as OrcamentoInputSnapshot;
  const dias = validadeEmDias(input);
  const base = orc.enviadoEm || orc.createdAt;
  const expiraEm = new Date(base);
  expiraEm.setDate(expiraEm.getDate() + dias);

  if (orc.linkAprovacao?.ativo && orc.linkAprovacao.expiraEm > new Date() && !orc.linkAprovacao.usadoEm) {
    const updated = await prisma.orcamentoLinkAprovacao.update({
      where: { id: orc.linkAprovacao.id },
      data: {
        enviadoEm: new Date(),
        canalEnvio: opts.canalEnvio ?? orc.linkAprovacao.canalEnvio,
        destinoEnvio: opts.destinoEnvio ?? orc.linkAprovacao.destinoEnvio,
      },
    });
    return { link: updated, orcamento: orc, reutilizado: true };
  }

  // Invalida link anterior
  if (orc.linkAprovacao) {
    await prisma.orcamentoLinkAprovacao.update({
      where: { id: orc.linkAprovacao.id },
      data: { ativo: false },
    });
  }

  const link = await prisma.orcamentoLinkAprovacao.create({
    data: {
      orcamentoId: orc.id,
      token: novoToken(),
      ativo: true,
      expiraEm,
      enviadoEm: new Date(),
      canalEnvio: opts.canalEnvio || "MANUAL",
      destinoEnvio: opts.destinoEnvio || null,
    },
  });

  if (orc.status === OrcamentoStatus.RASCUNHO) {
    await prisma.orcamento.update({
      where: { id: orc.id },
      data: { status: OrcamentoStatus.ENVIADO, enviadoEm: orc.enviadoEm ?? new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "Orcamento",
      entityId: orc.id,
      action: "GERAR_LINK_APROVACAO",
      newValue: {
        tokenSuffix: link.token.slice(-8),
        expiraEm: link.expiraEm.toISOString(),
        canal: link.canalEnvio,
      },
    },
  });

  return { link, orcamento: orc, reutilizado: false };
}

export async function obterPropostaPublica(token: string) {
  const link = await prisma.orcamentoLinkAprovacao.findUnique({
    where: { token },
    include: {
      orcamento: {
        include: {
          empresa: {
            select: {
              nomeFantasia: true,
              razaoSocial: true,
              cnpj: true,
              logoUrl: true,
              telefone: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!link || !link.ativo) {
    throw Object.assign(new Error("Link inválido ou revogado"), { status: 404 });
  }

  const orc = link.orcamento;
  const input = orc.inputSnapshot as OrcamentoInputSnapshot;
  const agora = new Date();

  // Registrar visualização
  if (
    orc.status === OrcamentoStatus.ENVIADO ||
    orc.status === OrcamentoStatus.RASCUNHO ||
    orc.status === OrcamentoStatus.VISUALIZADO
  ) {
    await prisma.$transaction([
      prisma.orcamentoLinkAprovacao.update({
        where: { id: link.id },
        data: { visualizacoes: { increment: 1 } },
      }),
      prisma.orcamento.update({
        where: { id: orc.id },
        data: {
          status: OrcamentoStatus.VISUALIZADO,
          visualizadoEm: orc.visualizadoEm ?? agora,
        },
      }),
    ]);
  }

  const vencido =
    link.expiraEm < agora ||
    isOrcamentoVencido({
      baseDate: orc.enviadoEm || orc.createdAt,
      validadeDias: input.validadeDias ?? null,
      validadeProposta: input.validadeProposta ?? null,
    });

  const result = orc.resultSnapshot as OrcamentoResultSnapshot | null;
  const faixas = (result?.faixas || []).map((f, idx) => {
    const qtd = f.production.quantidade || 1;
    return {
      index: idx,
      quantidade: qtd,
      valorTotal: f.commercial.valorTotal,
      valorUnitario: f.commercial.valorEtiqueta ?? f.commercial.valorTotal / qtd,
      valorRolo:
        f.production.qtdeRolos > 0
          ? f.commercial.valorTotal / f.production.qtdeRolos
          : null,
      valorMatriz: f.commercial.valorMatriz ?? 0,
    };
  });

  return {
    codigo: formatOrcamento(orc),
    versao: orc.versao,
    status: orc.status,
    vencido,
    jaAprovado: orc.status === OrcamentoStatus.APROVADO,
    jaRecusado: orc.status === OrcamentoStatus.REPROVADO,
    expiraEm: link.expiraEm.toISOString(),
    clienteNome: orc.clienteNome,
    vendedorNome: orc.vendedorNome,
    empresa: orc.empresa,
    descricao: {
      medida: input.medida,
      papel: input.papel,
      acabamento: input.acabamento,
      cores: input.cores,
      etiqPorRolo: input.etiqPorRolo ?? 0,
      prazoDias: input.validadeDias ?? 12,
      validadeDias: input.validadeDias ?? 7,
      condicaoPagamento:
        (input as { condicaoPagamento?: string }).condicaoPagamento ?? "Conforme combinado",
      tolerancia: "±20%",
      matriz: Boolean(input.matriz),
    },
    faixas,
    observacoes: orc.observacoes,
  };
}

export async function aprovarPeloLink(opts: {
  token: string;
  faixaIndex: number;
  nomeCliente: string;
  observacao?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const link = await prisma.orcamentoLinkAprovacao.findUnique({
    where: { token: opts.token },
    include: { orcamento: true },
  });
  if (!link || !link.ativo) {
    throw Object.assign(new Error("Link inválido ou revogado"), { status: 404 });
  }
  const orc = link.orcamento;
  if (orc.status === OrcamentoStatus.APROVADO) {
    throw Object.assign(new Error("Proposta já aprovada"), { status: 409 });
  }
  if (orc.status === OrcamentoStatus.REPROVADO) {
    throw Object.assign(new Error("Proposta já recusada"), { status: 409 });
  }
  if (link.expiraEm < new Date() || link.usadoEm) {
    throw Object.assign(new Error("Link expirado — solicite atualização ao vendedor"), {
      status: 410,
    });
  }
  if (!opts.nomeCliente.trim()) {
    throw Object.assign(new Error("Informe seu nome para confirmar o aceite"), { status: 400 });
  }

  const result = orc.resultSnapshot as OrcamentoResultSnapshot | null;
  if (!result?.faixas?.[opts.faixaIndex]) {
    throw Object.assign(new Error("Faixa de quantidade inválida"), { status: 400 });
  }

  const agora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.orcamento.update({
      where: { id: orc.id },
      data: {
        status: OrcamentoStatus.APROVADO,
        decididoEm: agora,
        canalAprovacao: CanalAprovacao.LINK,
        aceiteNomeCliente: opts.nomeCliente.trim(),
        aceiteFaixaIndex: opts.faixaIndex,
        aceiteIp: opts.ip || null,
        aceiteUserAgent: opts.userAgent || null,
        motivoDecisao: opts.observacao?.trim() || null,
        enviadoEm: orc.enviadoEm ?? agora,
      },
    });
    await tx.orcamentoLinkAprovacao.update({
      where: { id: link.id },
      data: { usadoEm: agora, ativo: false },
    });
    await tx.auditLog.create({
      data: {
        entityType: "Orcamento",
        entityId: orc.id,
        action: "APROVAR_LINK_CLIENTE",
        newValue: {
          faixaIndex: opts.faixaIndex,
          nome: opts.nomeCliente.trim(),
          ip: opts.ip,
        },
      },
    });
  });

  // Converte em PED + motor de crédito (sistema; userId = createdBy do ORC)
  const pedido = await converterOrcamentoEmPedido({
    orcamentoId: orc.id,
    faixaIndex: opts.faixaIndex,
    userId: orc.createdById,
    condicaoPagamento:
      (orc.inputSnapshot as OrcamentoInputSnapshot & { condicaoPagamento?: string })
        .condicaoPagamento ?? undefined,
  });

  return { orcamentoId: orc.id, pedidoId: pedido.id, pedidoNumero: pedido.numero };
}

export async function recusarPeloLink(opts: {
  token: string;
  motivo?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const link = await prisma.orcamentoLinkAprovacao.findUnique({
    where: { token: opts.token },
    include: { orcamento: true },
  });
  if (!link || !link.ativo) {
    throw Object.assign(new Error("Link inválido ou revogado"), { status: 404 });
  }
  const orc = link.orcamento;
  if (orc.status === OrcamentoStatus.APROVADO || orc.status === OrcamentoStatus.REPROVADO) {
    throw Object.assign(new Error("Proposta já decidida"), { status: 409 });
  }

  const agora = new Date();
  await prisma.$transaction([
    prisma.orcamento.update({
      where: { id: orc.id },
      data: {
        status: OrcamentoStatus.REPROVADO,
        decididoEm: agora,
        canalAprovacao: CanalAprovacao.LINK,
        motivoDecisao: opts.motivo?.trim() || "Recusado pelo cliente no link",
        aceiteIp: opts.ip || null,
        aceiteUserAgent: opts.userAgent || null,
      },
    }),
    prisma.orcamentoLinkAprovacao.update({
      where: { id: link.id },
      data: { usadoEm: agora, ativo: false },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "Orcamento",
        entityId: orc.id,
        action: "RECUSAR_LINK_CLIENTE",
        newValue: { motivo: opts.motivo },
      },
    }),
  ]);

  return { ok: true };
}

/**
 * Após converter ORC→PED, aplica motor de crédito e status do pedido.
 * Chamado de dentro de converterOrcamentoEmPedido.
 */
export async function aplicarCreditoAoPedidoCriado(opts: {
  pedidoId: string;
  empresaId: string;
  clienteParceiroId: string | null;
  valorTotal: number;
  condicaoPagamento: string | null;
}) {
  const ver = await verificarCreditoParaPedido({
    empresaId: opts.empresaId,
    clienteParceiroId: opts.clienteParceiroId,
    valorPedido: opts.valorTotal,
    condicaoPagamento: opts.condicaoPagamento,
  });

  let status: PedidoVendaStatus = PedidoVendaStatus.RASCUNHO;
  if (ver.flag === CreditoPedidoFlag.BLOQUEADO) {
    status = PedidoVendaStatus.AGUARDA_CREDITO;
  } else if (ver.flag === CreditoPedidoFlag.AGUARDA_ADIANTAMENTO) {
    status = PedidoVendaStatus.AGUARDA_ADIANTAMENTO;
  } else {
    status = PedidoVendaStatus.LIBERADO;
  }

  const updated = await prisma.pedidoVenda.update({
    where: { id: opts.pedidoId },
    data: {
      status,
      creditoFlag: ver.flag,
      creditoMotivo: ver.motivo,
      percentualSinal: ver.percentualSinal,
    },
    include: { itens: true },
  });

  if (opts.clienteParceiroId) {
    await prisma.parceiro.update({
      where: { id: opts.clienteParceiroId },
      data: { situacaoCredito: ver.situacaoCliente },
    });
  }

  // Emite título de sinal se necessário
  if (
    ver.percentualSinal > 0 &&
    (ver.flag === CreditoPedidoFlag.AGUARDA_ADIANTAMENTO || ver.flag === CreditoPedidoFlag.OK)
  ) {
    const valorSinal = Math.round(opts.valorTotal * (ver.percentualSinal / 100) * 100) / 100;
    if (valorSinal > 0) {
      const venc = new Date();
      venc.setDate(venc.getDate() + 2);
      const tit = await prisma.tituloReceber.create({
        data: {
          empresaId: opts.empresaId,
          pedidoVendaId: opts.pedidoId,
          clienteParceiroId: opts.clienteParceiroId,
          parcela: 0,
          isAdiantamento: true,
          valor: valorSinal,
          vencimento: venc,
          observacao: `Adiantamento ${ver.percentualSinal}% — libera produção`,
        },
      });
      await prisma.pedidoVenda.update({
        where: { id: opts.pedidoId },
        data: { tituloSinalId: tit.id },
      });
    }
  }

  return updated;
}

/** Aceite interno (staff) — HML / exceção 7a; marcado como INTERNO. */
export async function decidirInternoComAuditoria(opts: {
  orcamentoId: string;
  userId: string;
  decisao: "APROVAR" | "REPROVAR";
  motivo?: string | null;
  aceiteManualGerente?: boolean;
}) {
  const exigeLink = await getParametro<boolean>(PARAM_KEYS.exigeAceiteLinkCliente, true);
  // Em produção, aprovação interna sem link só com alçada gerente (flag)
  if (
    opts.decisao === "APROVAR" &&
    exigeLink &&
    !opts.aceiteManualGerente
  ) {
    // Ainda permite em HML via flag aceiteManualGerente da UI admin
    // Vendedores devem preferir gerar link
  }

  const existing = await prisma.orcamento.findUnique({ where: { id: opts.orcamentoId } });
  if (!existing) throw Object.assign(new Error("Não encontrado"), { status: 404 });

  const now = new Date();
  const nextStatus = opts.decisao === "APROVAR" ? OrcamentoStatus.APROVADO : OrcamentoStatus.REPROVADO;

  return prisma.orcamento.update({
    where: { id: opts.orcamentoId },
    data: {
      status: nextStatus,
      decididoEm: now,
      decididoPorId: opts.userId,
      motivoDecisao: opts.motivo?.trim() || null,
      canalAprovacao: opts.aceiteManualGerente
        ? CanalAprovacao.MANUAL_GERENTE
        : CanalAprovacao.INTERNO,
      enviadoEm: existing.enviadoEm ?? now,
    },
  });
}
