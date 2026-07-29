/** Faturamento NFS-e / NF-e (Focus) + Bolepix (Inter) — homologação com XML/PDF. */

import {
  CobrancaInterStatus,
  DocSaidaStatus,
  DocSaidaTipo,
  EstoqueMovimentoTipo,
  OrdemServicoStatus,
  PedidoVendaStatus,
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
  buildFocusNfePayload,
  buildFocusNfseNacionalPayload,
  buildInfAdProdMercadoria,
  FISCAL_DEFAULTS,
  montarChaveNfe,
  montarChaveNfse,
  planejarDocumentosSaida,
  type ItemFiscal,
} from "@/lib/fiscal-emissao";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
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
  const simular = empresa.simularProducao || empresa.ambienteFiscal === "HOMOLOGACAO";
  const qtd = Number(pedido.quantidade);

  const itensFiscal: ItemFiscal[] = pedido.itens.map((it) => ({
    id: it.id,
    descricao: it.descricao,
    quantidade: Number(it.quantidade),
    unidade: it.unidade || "UN",
    valorUnitario: Number(it.valorUnitario),
    valorTotal: Number(it.valorTotal),
    ncm: it.produto?.ncm,
    cfop: it.produto?.cfopVendaPadrao || FISCAL_DEFAULTS.cfopMercadoria,
    cTribNac: it.produto?.cTribNac,
    cNbs: it.produto?.cNbs,
    codigo: it.produto?.codigo,
    tipoProduto: it.produto?.tipo,
    documentoSaidaPadrao: it.produto?.documentoSaidaPadrao,
    infAdProd:
      it.produto?.documentoSaidaPadrao === "NFE" || it.produto?.tipo === "INSUMO"
        ? buildInfAdProdMercadoria(input, Number(it.quantidade), producao)
        : it.descricao,
  }));

  const plano = planejarDocumentosSaida({
    itens: itensFiscal,
    quantidadePedido: qtd,
    valorTotalPedido: valor,
    documentoPadraoEmpresa: docPadrao as DocumentoSaidaPadrao,
    inputSnapshot: input,
    producao,
  });

  if (!plano.emitirNfse && !plano.emitirNfe) {
    throw Object.assign(new Error("Nenhum documento fiscal configurado para os itens"), {
      status: 400,
    });
  }

  const tomador = {
    documento: pedido.clienteParceiro?.documento || null,
    nome: pedido.clienteNome,
    email: pedido.clienteParceiro?.email,
    telefone: pedido.clienteParceiro?.telefone,
    cep: pedido.clienteParceiro?.cep,
    logradouro: pedido.clienteParceiro?.logradouro,
    numero: pedido.clienteParceiro?.numero,
    complemento: pedido.clienteParceiro?.complemento,
    bairro: pedido.clienteParceiro?.bairro,
    cidade: pedido.clienteParceiro?.cidade,
    uf: pedido.clienteParceiro?.uf,
  };

  const agora = new Date();
  const vencimento = addDays(agora, 28);

  return prisma.$transaction(async (tx) => {
    const docsCriados: Array<{ id: string; tipo: DocSaidaTipo }> = [];
    const focusPayloads: Record<string, unknown> = {};

    if (plano.nfse) {
      const numero = String(pedido.numero);
      const serie = String(FISCAL_DEFAULTS.serieDps);
      const dpsNumero = String(200000 + pedido.numero);
      const chave = montarChaveNfse({
        codigoMunicipio: empresa.codigoMunicipioIbge || "3170206",
        cnpj: empresa.cnpj,
        numero: pedido.numero,
        dhEmi: agora,
      });
      const refFocus = `pedido:${pedido.id}:nfse:1`;
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
      focusPayloads.nfse = buildFocusNfseNacionalPayload({
        ref: refFocus,
        dataEmissao: agora,
        serieDps: FISCAL_DEFAULTS.serieDps,
        numeroDps: Number(dpsNumero),
        codigoMunicipio: empresa.codigoMunicipioIbge || "3170206",
        cnpjPrestador: empresa.cnpj,
        inscricaoMunicipal: empresa.inscricaoMunicipal,
        cnpjTomador: tomador.documento,
        cpfTomador: tomador.documento,
        nomeTomador: tomador.nome,
        emailTomador: tomador.email,
        logradouroTomador: tomador.logradouro,
        numeroTomador: tomador.numero,
        bairroTomador: tomador.bairro,
        cepTomador: tomador.cep,
        descricaoServico: plano.nfse.discriminacao,
        valorServico: plano.nfse.valor,
        codigoTributacaoNacional: plano.nfse.itens[0]?.cTribNac || FISCAL_DEFAULTS.cTribNac,
        codigoNbs: plano.nfse.itens[0]?.cNbs || FISCAL_DEFAULTS.cNbs,
      });

      const doc = await tx.documentoFiscalSaida.upsert({
        where: {
          pedidoVendaId_tipo: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFSE },
        },
        create: {
          empresaId: empresa.id,
          pedidoVendaId: pedido.id,
          tipo: DocSaidaTipo.NFSE,
          status: DocSaidaStatus.AUTORIZADO,
          ambiente: empresa.ambienteFiscal,
          refFocus,
          numero,
          serie,
          chave,
          discriminacao: plano.nfse.discriminacao,
          valorTotal: plano.nfse.valor,
          simulado: simular,
          autorizadoEm: agora,
          xmlBruto: xml,
        },
        update: {
          status: DocSaidaStatus.AUTORIZADO,
          serie,
          chave,
          discriminacao: plano.nfse.discriminacao,
          valorTotal: plano.nfse.valor,
          simulado: simular,
          autorizadoEm: agora,
          xmlBruto: xml,
          mensagemErro: null,
        },
      });
      docsCriados.push({ id: doc.id, tipo: DocSaidaTipo.NFSE });
    }

    if (plano.nfe) {
      const numero = String(pedido.numero);
      const serie = "1";
      const { chave, cNF, cDV } = montarChaveNfe({
        cnpj: empresa.cnpj,
        serie: 1,
        numero: pedido.numero,
        dhEmi: agora,
      });
      const refFocus = `pedido:${pedido.id}:nfe:1`;
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
        csosn: FISCAL_DEFAULTS.csosn,
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
      });
      focusPayloads.nfe = buildFocusNfePayload({
        ref: refFocus,
        naturezaOperacao: plano.nfe.naturezaOperacao,
        dataEmissao: agora,
        cnpjEmitente: empresa.cnpj,
        destinatario: tomador,
        itens: plano.nfe.itens,
        valorTotal: plano.nfe.valor,
      });

      const doc = await tx.documentoFiscalSaida.upsert({
        where: {
          pedidoVendaId_tipo: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFE },
        },
        create: {
          empresaId: empresa.id,
          pedidoVendaId: pedido.id,
          tipo: DocSaidaTipo.NFE,
          status: DocSaidaStatus.AUTORIZADO,
          ambiente: empresa.ambienteFiscal,
          refFocus,
          numero,
          serie,
          chave,
          discriminacao: itensXml.map((i) => i.infAdProd || i.descricao).join(" | "),
          valorTotal: plano.nfe.valor,
          simulado: simular,
          autorizadoEm: agora,
          xmlBruto: xml,
        },
        update: {
          status: DocSaidaStatus.AUTORIZADO,
          chave,
          discriminacao: itensXml.map((i) => i.infAdProd || i.descricao).join(" | "),
          valorTotal: plano.nfe.valor,
          simulado: simular,
          autorizadoEm: agora,
          xmlBruto: xml,
          mensagemErro: null,
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

    const linha = `23793${String(pedido.numero).padStart(11, "0")}000000${String(Math.round(valor * 100)).padStart(10, "0")}`;
    const cobranca = await tx.cobrancaInter.upsert({
      where: { tituloReceberId: titulo.id },
      create: {
        tituloReceberId: titulo.id,
        codigoSolicitacao: `SIM-${pedido.id.slice(-8)}-${Date.now().toString(36)}`,
        nossoNumero: String(pedido.numero),
        linhaDigitavel: linha,
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${pedido.id}520400005303986540${valor.toFixed(2)}5802BR5925ETIQUETAS UDI6009UBERLANDIA62070503***6304ABCD`,
        status: CobrancaInterStatus.EMITIDA,
        simulado: true,
      },
      update: {
        status: CobrancaInterStatus.EMITIDA,
        linhaDigitavel: linha,
        simulado: true,
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
        entityType: "EntregaPedido",
        entityId: entrega.id,
        action: "REGISTRAR",
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
    include: { cobranca: true, pedidoVenda: { include: { entrega: true } } },
  });
  if (!titulo) throw Object.assign(new Error("Título não encontrado"), { status: 404 });
  if (titulo.status === TituloReceberStatus.PAGO) return titulo;

  const exigeEntrega = await getParametro<boolean>(PARAM_KEYS.liquidacaoExigeEntrega, false);

  return prisma.$transaction(async (tx) => {
    const t = await tx.tituloReceber.update({
      where: { id: titulo.id },
      data: { status: TituloReceberStatus.PAGO, pagoEm: new Date() },
    });
    if (titulo.cobranca) {
      await tx.cobrancaInter.update({
        where: { id: titulo.cobranca.id },
        data: { status: CobrancaInterStatus.PAGA, pagoEm: new Date() },
      });
    }

    const podeLiquidar = !exigeEntrega || !!titulo.pedidoVenda.entrega;
    if (podeLiquidar) {
      await tx.pedidoVenda.update({
        where: { id: titulo.pedidoVendaId },
        data: { status: PedidoVendaStatus.LIQUIDADO, liquidadoEm: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "TituloReceber",
        entityId: titulo.id,
        action: "BAIXAR",
        newValue: { via: opts.via ?? "manual" },
        userId: opts.userId,
      },
    });

    return t;
  });
}
