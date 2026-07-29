/** Faturamento NFS-e / NF-e (Focus) + Bolepix (Inter) — homologação com XML/PDF. */

import {
  emitirBolepix,
} from "@reta/banco-inter";
import {
  emitirNfe,
  emitirNfseNacional,
  type FocusClientConfig,
} from "@reta/focus-nfe";
import {
  CobrancaInterStatus,
  DocSaidaStatus,
  DocSaidaTipo,
  EstoqueMovimentoTipo,
  OrdemServicoStatus,
  PedidoVendaStatus,
  Prisma,
  TipoProduto,
  TituloReceberStatus,
  type DocumentoSaidaPadrao,
} from "@prisma/client";
import { getParametro, PARAM_KEYS, round2, ensureDepositoPadrao } from "@/lib/ciclo-params";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { registrarMovimento } from "@/lib/estoque";
import { buildNfeSaidaXml, buildNfseXml } from "@/lib/fiscal-xml";
import {
  buildInfAdProdMercadoria,
  FISCAL_DEFAULTS,
  itemFiscalFromProdutoLinha,
  montarChaveNfe,
  montarChaveNfse,
  planejarDocumentosSaida,
  resolveContextoFiscal,
  reservarNumeroSerie,
  toFocusNfePayload,
  toFocusNfseNacionalPayload,
  validatePreEmissao,
  type ItemFiscal,
} from "@/lib/fiscal-emissao";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function loadFocusConfig(empresaId: string, simular: boolean): Promise<FocusClientConfig> {
  const integ = await prisma.empresaIntegracao.findUnique({
    where: { empresaId_provider: { empresaId, provider: "FOCUS_NFE" } },
  });
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  return {
    token: process.env.FOCUS_NFE_TOKEN || "",
    ambiente: empresa.ambienteFiscal === "PRODUCAO" ? "PRODUCAO" : "HOMOLOGACAO",
    simular: simular || integ?.modo === "SIMULADO" || !process.env.FOCUS_NFE_TOKEN,
    baseUrlHomolog: integ?.baseUrlHomolog || undefined,
    baseUrlProd: integ?.baseUrlProd || undefined,
  };
}

export async function faturarPedido(opts: { pedidoId: string; userId: string }) {
  const empresa = await requireEmpresaRaiz();
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: opts.pedidoId },
    include: {
      ordensServico: true,
      docsSaida: true,
      tituloReceber: true,
      itens: { include: { produto: true } },
      clienteParceiro: true,
    },
  });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });

  const jaAutorizado = pedido.docsSaida.some((d) => d.status === DocSaidaStatus.AUTORIZADO);
  if (jaAutorizado) {
    throw Object.assign(new Error("Pedido já faturado"), { status: 400 });
  }
  if (
    pedido.status !== PedidoVendaStatus.CONFIRMADO &&
    pedido.status !== PedidoVendaStatus.EM_PRODUCAO
  ) {
    throw Object.assign(new Error("Pedido não está apto a faturar"), { status: 400 });
  }

  const exigeOs = await getParametro<boolean>(PARAM_KEYS.exigeOsConcluida, true);
  if (exigeOs) {
    const ok = pedido.ordensServico.every((o) => o.status === OrdemServicoStatus.CONCLUIDA);
    if (!ok || !pedido.ordensServico.length) {
      throw Object.assign(new Error("Todas as OS precisam estar concluídas para faturar"), {
        status: 400,
      });
    }
  }

  const docPadrao = await getParametro<string>(PARAM_KEYS.documentoPadrao, "NFSE");
  const input = pedido.inputSnapshot as OrcamentoInputSnapshot;
  const comercial = pedido.comercialSnapshot as {
    faixa?: NonNullable<OrcamentoResultSnapshot["faixas"]>[number];
  } | null;
  const producao = comercial?.faixa?.production ?? null;
  const valor = round2(Number(pedido.valorTotal));
  const qtd = Number(pedido.quantidade);

  const ctx = await resolveContextoFiscal({
    empresa,
    clienteParceiro: pedido.clienteParceiro,
    clienteNome: pedido.clienteNome,
  });
  const simular = ctx.simular;
  const focusCfg = await loadFocusConfig(empresa.id, simular);

  const itensFiscal: ItemFiscal[] = pedido.itens.map((it) =>
    itemFiscalFromProdutoLinha({
      id: it.id,
      descricao: it.descricao,
      quantidade: Number(it.quantidade),
      unidade: it.unidade || "UN",
      valorUnitario: Number(it.valorUnitario),
      valorTotal: Number(it.valorTotal),
      produto: it.produto,
      infAdProd:
        it.produto?.documentoSaidaPadrao === "NFE" || it.produto?.tipo === "INSUMO"
          ? buildInfAdProdMercadoria(input, Number(it.quantidade), producao)
          : it.descricao,
    }),
  );

  const plano = planejarDocumentosSaida({
    itens: itensFiscal,
    quantidadePedido: qtd,
    valorTotalPedido: valor,
    documentoPadraoEmpresa: docPadrao as DocumentoSaidaPadrao,
    inputSnapshot: input,
    producao,
    naturezaOperacaoPadrao:
      ctx.parametros.naturezaMercadoria?.descricao || FISCAL_DEFAULTS.naturezaMercadoria,
  });

  if (!plano.emitirNfse && !plano.emitirNfe) {
    throw Object.assign(new Error("Nenhum documento fiscal configurado para os itens"), {
      status: 400,
    });
  }

  validatePreEmissao({ ctx, plano });

  const dest = ctx.destinatario;
  const tomador = {
    documento: dest.documento,
    nome: dest.nome,
    email: dest.email,
    telefone: dest.telefone,
    cep: dest.cep,
    logradouro: dest.logradouro,
    numero: dest.numero,
    complemento: dest.complemento,
    bairro: dest.bairro,
    cidade: dest.cidade,
    uf: dest.uf,
    ie: dest.ie,
    codigoMunicipio: dest.codigoMunicipioIbge,
  };

  const agora = new Date();
  const vencimento = addDays(agora, 28);

  // Reserva numeração fora da tx principal (série atômica).
  let nfeNum = { serie: ctx.parametros.serieNfePadrao, numero: pedido.numero };
  let nfseNum = {
    serie: ctx.parametros.serieDpsPadrao,
    numero: pedido.numero,
  };
  if (plano.emitirNfe && ctx.serieNfe) {
    nfeNum = await reservarNumeroSerie(ctx.serieNfe.id);
  }
  if (plano.emitirNfse && ctx.serieNfse) {
    nfseNum = await reservarNumeroSerie(ctx.serieNfse.id);
  }

  return prisma.$transaction(async (tx) => {
    const docsCriados: Array<{ id: string; tipo: DocSaidaTipo }> = [];
    const focusPayloads: Record<string, unknown> = {};

    if (plano.nfse) {
      const numero = String(nfseNum.numero);
      const serie = String(nfseNum.serie);
      const dpsNumero = String(nfseNum.numero);
      const chave = montarChaveNfse({
        codigoMunicipio: empresa.codigoMunicipioIbge || "3170206",
        cnpj: empresa.cnpj,
        numero: nfseNum.numero,
        dhEmi: agora,
      });
      const refFocus = `pedido:${pedido.id}:nfse:${nfseNum.numero}`;
      const xml = buildNfseXml({
        empresa,
        tomador,
        numero,
        serie,
        valor: plano.nfse.valor,
        discriminacao: plano.nfse.discriminacao,
        cTribNac: plano.nfse.itens[0]?.cTribNac || FISCAL_DEFAULTS.cTribNac,
        cNbs: plano.nfse.itens[0]?.cNbs || FISCAL_DEFAULTS.cNbs,
        chave,
        dpsNumero,
        autorizadoEm: agora,
      });

      const { payload, payloadHttp } = toFocusNfseNacionalPayload({
        ref: refFocus,
        ctx,
        dataEmissao: agora,
        serieDps: nfseNum.serie,
        numeroDps: nfseNum.numero,
        descricaoServico: plano.nfse.discriminacao,
        valorServico: plano.nfse.valor,
        itens: plano.nfse.itens,
      });
      focusPayloads.nfse = payload;

      const emitResult = await emitirNfseNacional(focusCfg, refFocus, payloadHttp);
      const statusDoc =
        emitResult.status === "autorizado"
          ? DocSaidaStatus.AUTORIZADO
          : emitResult.status === "erro_autorizacao"
            ? DocSaidaStatus.ERRO
            : DocSaidaStatus.ENVIADO;

      const doc = await tx.documentoFiscalSaida.upsert({
        where: {
          pedidoVendaId_tipo: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFSE },
        },
        create: {
          empresaId: empresa.id,
          pedidoVendaId: pedido.id,
          tipo: DocSaidaTipo.NFSE,
          status: statusDoc,
          ambiente: empresa.ambienteFiscal,
          refFocus,
          numero,
          serie,
          chave: emitResult.chave || chave,
          discriminacao: plano.nfse.discriminacao,
          valorTotal: plano.nfse.valor,
          simulado: emitResult.simulado,
          autorizadoEm: statusDoc === DocSaidaStatus.AUTORIZADO ? agora : null,
          xmlBruto: statusDoc === DocSaidaStatus.AUTORIZADO ? xml : null,
          requestJson: payload as Prisma.InputJsonValue,
          responseJson: (emitResult.responseBody ?? {
            status: emitResult.status,
          }) as Prisma.InputJsonValue,
          mensagemErro: emitResult.mensagem || null,
        },
        update: {
          status: statusDoc,
          serie,
          numero,
          chave: emitResult.chave || chave,
          discriminacao: plano.nfse.discriminacao,
          valorTotal: plano.nfse.valor,
          simulado: emitResult.simulado,
          autorizadoEm: statusDoc === DocSaidaStatus.AUTORIZADO ? agora : null,
          xmlBruto: statusDoc === DocSaidaStatus.AUTORIZADO ? xml : null,
          requestJson: payload as Prisma.InputJsonValue,
          responseJson: (emitResult.responseBody ?? {
            status: emitResult.status,
          }) as Prisma.InputJsonValue,
          mensagemErro: emitResult.mensagem || null,
        },
      });
      docsCriados.push({ id: doc.id, tipo: DocSaidaTipo.NFSE });
    }

    if (plano.nfe) {
      const numero = String(nfeNum.numero);
      const serie = String(nfeNum.serie);
      const { chave, cNF, cDV } = montarChaveNfe({
        cnpj: empresa.cnpj,
        serie: nfeNum.serie,
        numero: nfeNum.numero,
        dhEmi: agora,
      });
      const refFocus = `pedido:${pedido.id}:nfe:${nfeNum.numero}`;
      const itensXml = plano.nfe.itens.map((it, idx) => ({
        codigo: it.codigo || `P${idx + 1}`,
        descricao: it.descricao.slice(0, 120),
        ncm: it.ncm || "48211000",
        cfop: it.cfop || FISCAL_DEFAULTS.cfopMercadoria,
        unidade: it.unidade || "UN",
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        valorTotal: it.valorTotal,
        infAdProd:
          it.infAdProd ||
          buildInfAdProdMercadoria(input, it.quantidade, producao),
        csosn: it.csosn || ctx.parametros.csosnPadrao || FISCAL_DEFAULTS.csosn,
        xPed: String(pedido.numero),
        nItemPed: idx + 1,
      }));
      const xml = buildNfeSaidaXml({
        empresa,
        destinatario: tomador,
        numero,
        serie,
        chave,
        cNF,
        cDV,
        naturezaOperacao: plano.nfe.naturezaOperacao,
        valor: plano.nfe.valor,
        itens: itensXml,
        vencimento,
        autorizadoEm: agora,
        pedidoNumero: pedido.numero,
        simulado: simular,
      });

      const { payload, payloadHttp } = toFocusNfePayload({
        ref: refFocus,
        ctx,
        naturezaOperacao: plano.nfe.naturezaOperacao,
        dataEmissao: agora,
        serie: nfeNum.serie,
        numero: nfeNum.numero,
        itens: plano.nfe.itens,
        valorTotal: plano.nfe.valor,
        pedidoNumero: pedido.numero,
        formaPagamento: { indicador: 1, meio: 15, valor: plano.nfe.valor },
        duplicatas: [
          {
            numero: "001",
            dataVencimento: vencimento,
            valor: plano.nfe.valor,
          },
        ],
      });
      focusPayloads.nfe = payload;

      const emitResult = await emitirNfe(focusCfg, refFocus, payloadHttp);
      const statusDoc =
        emitResult.status === "autorizado"
          ? DocSaidaStatus.AUTORIZADO
          : emitResult.status === "erro_autorizacao"
            ? DocSaidaStatus.ERRO
            : DocSaidaStatus.ENVIADO;

      const doc = await tx.documentoFiscalSaida.upsert({
        where: {
          pedidoVendaId_tipo: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFE },
        },
        create: {
          empresaId: empresa.id,
          pedidoVendaId: pedido.id,
          tipo: DocSaidaTipo.NFE,
          status: statusDoc,
          ambiente: empresa.ambienteFiscal,
          refFocus,
          numero,
          serie,
          chave: emitResult.chave || chave,
          discriminacao: itensXml.map((i) => i.infAdProd || i.descricao).join(" | "),
          valorTotal: plano.nfe.valor,
          simulado: emitResult.simulado,
          autorizadoEm: statusDoc === DocSaidaStatus.AUTORIZADO ? agora : null,
          xmlBruto: statusDoc === DocSaidaStatus.AUTORIZADO ? xml : null,
          requestJson: payload as Prisma.InputJsonValue,
          responseJson: (emitResult.responseBody ?? {
            status: emitResult.status,
          }) as Prisma.InputJsonValue,
          mensagemErro: emitResult.mensagem || null,
        },
        update: {
          status: statusDoc,
          serie,
          numero,
          chave: emitResult.chave || chave,
          discriminacao: itensXml.map((i) => i.infAdProd || i.descricao).join(" | "),
          valorTotal: plano.nfe.valor,
          simulado: emitResult.simulado,
          autorizadoEm: statusDoc === DocSaidaStatus.AUTORIZADO ? agora : null,
          xmlBruto: statusDoc === DocSaidaStatus.AUTORIZADO ? xml : null,
          requestJson: payload as Prisma.InputJsonValue,
          responseJson: (emitResult.responseBody ?? {
            status: emitResult.status,
          }) as Prisma.InputJsonValue,
          mensagemErro: emitResult.mensagem || null,
        },
      });
      docsCriados.push({ id: doc.id, tipo: DocSaidaTipo.NFE });
    }

    if (!plano.emitirNfse) {
      await tx.documentoFiscalSaida.deleteMany({
        where: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFSE },
      });
    }
    if (!plano.emitirNfe) {
      await tx.documentoFiscalSaida.deleteMany({
        where: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFE },
      });
    }

    for (const it of pedido.itens) {
      if (!it.produtoId || !it.produto?.controlaEstoque) continue;
      if (
        it.produto.tipo !== TipoProduto.ACABADO &&
        it.produto.tipo !== TipoProduto.INTERMEDIARIO
      ) {
        continue;
      }
      const deposito = await ensureDepositoPadrao(empresa.id);
      await registrarMovimento(tx, {
        empresaId: empresa.id,
        depositoId: deposito.id,
        produtoId: it.produtoId,
        tipo: EstoqueMovimentoTipo.SAIDA_VENDA,
        quantidade: Number(it.quantidade),
        documentoTipo: "PedidoVenda",
        documentoId: pedido.id,
        userId: opts.userId,
        afetaFisico: true,
        observacao: "Saída por faturamento",
      });
    }

    const titulo = await tx.tituloReceber.upsert({
      where: { pedidoVendaId: pedido.id },
      create: {
        empresaId: empresa.id,
        pedidoVendaId: pedido.id,
        valor,
        vencimento,
        status: TituloReceberStatus.ABERTO,
      },
      update: { valor, vencimento, status: TituloReceberStatus.ABERTO },
    });

    const bolepix = await emitirBolepix(
      {
        clientId: process.env.INTER_CLIENT_ID || "",
        clientSecret: process.env.INTER_CLIENT_SECRET || "",
        ambiente: "SANDBOX",
        simular: true,
      },
      {
        seuNumero: String(pedido.numero),
        valorNominal: valor,
        dataVencimento: vencimento.toISOString().slice(0, 10),
        pagador: {
          cpfCnpj: tomador.documento || "00000000000000",
          nome: tomador.nome || pedido.clienteNome,
          email: tomador.email || undefined,
          cep: tomador.cep || undefined,
          endereco: tomador.logradouro || undefined,
          numero: tomador.numero || undefined,
          bairro: tomador.bairro || undefined,
          cidade: tomador.cidade || undefined,
          uf: tomador.uf || undefined,
        },
        mensagem: {
          linha1: `Pedido ${pedido.numero}`,
          linha2: plano.resumo.slice(0, 78),
        },
      },
    );

    const cobranca = await tx.cobrancaInter.upsert({
      where: { tituloReceberId: titulo.id },
      create: {
        tituloReceberId: titulo.id,
        codigoSolicitacao: bolepix.codigoSolicitacao,
        nossoNumero: bolepix.nossoNumero,
        linhaDigitavel: bolepix.linhaDigitavel,
        pixCopiaECola: bolepix.pixCopiaECola,
        status: CobrancaInterStatus.EMITIDA,
        simulado: bolepix.simulado,
      },
      update: {
        status: CobrancaInterStatus.EMITIDA,
        codigoSolicitacao: bolepix.codigoSolicitacao,
        nossoNumero: bolepix.nossoNumero,
        linhaDigitavel: bolepix.linhaDigitavel,
        pixCopiaECola: bolepix.pixCopiaECola,
        simulado: bolepix.simulado,
        mensagemErro: null,
      },
    });

    const pedidoUp = await tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: { status: PedidoVendaStatus.FATURADO, faturadoEm: agora },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PedidoVenda",
        entityId: pedido.id,
        action: "FATURAR",
        newValue: {
          docs: docsCriados,
          plano: { tipos: plano.tipos, resumo: plano.resumo },
          tituloId: titulo.id,
          cobrancaId: cobranca.id,
          focus: Object.keys(focusPayloads),
          series: { nfe: nfeNum, nfse: nfseNum },
        },
        userId: opts.userId,
      },
    });

    const docsSaida = await tx.documentoFiscalSaida.findMany({
      where: { pedidoVendaId: pedido.id },
    });

    return {
      pedido: pedidoUp,
      docsSaida,
      docSaida: docsSaida.find((d) => d.tipo === DocSaidaTipo.NFSE) || docsSaida[0] || null,
      titulo,
      cobranca,
      plano,
    };
  });
}

export async function registrarEntrega(opts: {
  pedidoId: string;
  userId: string;
  volumes?: number | null;
  rolos?: number | null;
  caixas?: number | null;
  modalidade?: string | null;
  observacoes?: string | null;
}) {
  const pedido = await prisma.pedidoVenda.findUnique({ where: { id: opts.pedidoId } });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });
  if (
    pedido.status !== PedidoVendaStatus.FATURADO &&
    pedido.status !== PedidoVendaStatus.ENTREGUE &&
    pedido.status !== PedidoVendaStatus.LIQUIDADO
  ) {
    throw Object.assign(new Error("Entrega só após faturamento"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    const entrega = await tx.entregaPedido.upsert({
      where: { pedidoVendaId: pedido.id },
      create: {
        pedidoVendaId: pedido.id,
        volumes: opts.volumes ?? null,
        rolos: opts.rolos ?? null,
        caixas: opts.caixas ?? null,
        modalidade: opts.modalidade ?? "CLIENTE_RETIRA",
        observacoes: opts.observacoes ?? null,
        createdById: opts.userId,
      },
      update: {
        dataEntrega: new Date(),
        volumes: opts.volumes ?? undefined,
        rolos: opts.rolos ?? undefined,
        caixas: opts.caixas ?? undefined,
        modalidade: opts.modalidade ?? undefined,
        observacoes: opts.observacoes ?? undefined,
      },
    });

    if (pedido.status === PedidoVendaStatus.FATURADO) {
      await tx.pedidoVenda.update({
        where: { id: pedido.id },
        data: { status: PedidoVendaStatus.ENTREGUE, entregueEm: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "PedidoVenda",
        entityId: pedido.id,
        action: "ENTREGA",
        newValue: { entregaId: entrega.id },
        userId: opts.userId,
      },
    });

    return entrega;
  });
}

export async function baixarTituloReceber(opts: {
  tituloId: string;
  userId: string;
  via?: string;
}) {
  const titulo = await prisma.tituloReceber.findUnique({
    where: { id: opts.tituloId },
    include: { pedidoVenda: true, cobranca: true },
  });
  if (!titulo) throw Object.assign(new Error("Título não encontrado"), { status: 404 });
  if (titulo.status === TituloReceberStatus.PAGO) return titulo;

  const exigeEntrega = await getParametro<boolean>(PARAM_KEYS.liquidacaoExigeEntrega, false);
  if (exigeEntrega) {
    const entrega = await prisma.entregaPedido.findUnique({
      where: { pedidoVendaId: titulo.pedidoVendaId },
    });
    if (!entrega) {
      throw Object.assign(new Error("Entrega obrigatória antes do recebimento"), {
        status: 400,
      });
    }
  }

  const agora = new Date();
  const { registrarBaixaReceberNoBanco } = await import("@/lib/financeiro");

  return prisma.$transaction(async (tx) => {
    const t = await tx.tituloReceber.update({
      where: { id: titulo.id },
      data: {
        status: TituloReceberStatus.PAGO,
        valorPago: titulo.valor,
        pagoEm: agora,
      },
    });
    if (titulo.cobranca) {
      await tx.cobrancaInter.update({
        where: { id: titulo.cobranca.id },
        data: { status: CobrancaInterStatus.PAGA, pagoEm: agora },
      });
    }
    await tx.pedidoVenda.update({
      where: { id: titulo.pedidoVendaId },
      data: { status: PedidoVendaStatus.LIQUIDADO, liquidadoEm: agora },
    });
    await registrarBaixaReceberNoBanco({
      tx,
      tituloId: titulo.id,
      empresaId: titulo.empresaId,
      valor: Number(titulo.valor),
      clienteNome: titulo.pedidoVenda.clienteNome,
      userId: opts.userId,
      via: opts.via || "manual",
    });
    await tx.auditLog.create({
      data: {
        entityType: "TituloReceber",
        entityId: titulo.id,
        action: "BAIXAR",
        newValue: { via: opts.via || "manual" },
        userId: opts.userId,
      },
    });
    return t;
  });
}
