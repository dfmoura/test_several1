/**
 * Regenera XML de documentos fiscais já autorizados (homologação).
 * Não reemite na SEFAZ/Focus — apenas alinha fixtures locais ao padrão atual.
 */

import { DocSaidaStatus, DocSaidaTipo } from "@prisma/client";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { buildNfeSaidaXml, buildNfseXml } from "@/lib/fiscal-xml";
import {
  buildInfAdProdMercadoria,
  FISCAL_DEFAULTS,
  montarChaveNfe,
  montarChaveNfse,
  planejarDocumentosSaida,
  type ItemFiscal,
} from "@/lib/fiscal-emissao";
import { dpsNumeroFromPedido } from "@/lib/fiscal/textos";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";
import type { DocumentoSaidaPadrao } from "@prisma/client";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function reemitirDocumentosFiscais(pedidoId: string) {
  const empresa = await requireEmpresaRaiz();
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: pedidoId },
    include: {
      docsSaida: true,
      itens: { include: { produto: true } },
      clienteParceiro: true,
      tituloReceber: true,
    },
  });
  if (!pedido) throw Object.assign(new Error("Pedido não encontrado"), { status: 404 });
  if (!pedido.docsSaida.length) {
    throw Object.assign(new Error("Pedido sem documentos fiscais"), { status: 400 });
  }

  const input = pedido.inputSnapshot as OrcamentoInputSnapshot;
  const comercial = pedido.comercialSnapshot as {
    faixa?: NonNullable<OrcamentoResultSnapshot["faixas"]>[number];
  } | null;
  const producao = comercial?.faixa?.production ?? null;
  const valor = Number(pedido.valorTotal);
  const qtd = Number(pedido.quantidade);
  const agora = pedido.docsSaida[0]?.autorizadoEm || new Date();
  const vencimento = pedido.tituloReceber?.vencimento || addDays(agora, 28);
  const simular = true;

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
    documentoPadraoEmpresa: "NFSE" as DocumentoSaidaPadrao,
    inputSnapshot: input,
    producao,
  });

  const tomador = {
    documento: pedido.clienteParceiro?.documento || null,
    nome: pedido.clienteNome,
    email: pedido.clienteParceiro?.emailFiscal || pedido.clienteParceiro?.email,
    telefone: pedido.clienteParceiro?.telefone,
    cep: pedido.clienteParceiro?.cep,
    logradouro: pedido.clienteParceiro?.logradouro,
    numero: pedido.clienteParceiro?.numero,
    complemento: pedido.clienteParceiro?.complemento,
    bairro: pedido.clienteParceiro?.bairro,
    cidade: pedido.clienteParceiro?.cidade,
    uf: pedido.clienteParceiro?.uf,
    ie: pedido.clienteParceiro?.inscricaoEstadual,
    codigoMunicipio: pedido.clienteParceiro?.codigoMunicipioIbge,
  };

  const updated: string[] = [];

  if (plano.nfse) {
    const numero = String(pedido.numero);
    const serie = String(FISCAL_DEFAULTS.serieDps);
    const dpsNumero = dpsNumeroFromPedido(pedido.numero);
    const chave =
      pedido.docsSaida.find((d) => d.tipo === DocSaidaTipo.NFSE)?.chave ||
      montarChaveNfse({
        codigoMunicipio: empresa.codigoMunicipioIbge || "3170206",
        cnpj: empresa.cnpj,
        numero: pedido.numero,
        dhEmi: agora,
      });
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
    await prisma.documentoFiscalSaida.updateMany({
      where: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFSE },
      data: {
        xmlBruto: xml,
        discriminacao: plano.nfse.discriminacao,
        valorTotal: plano.nfse.valor,
        serie,
        chave,
        status: DocSaidaStatus.AUTORIZADO,
        simulado: simular,
      },
    });
    updated.push("NFSE");
  }

  if (plano.nfe) {
    const numero = String(pedido.numero);
    const serie = "1";
    const existing = pedido.docsSaida.find((d) => d.tipo === DocSaidaTipo.NFE);
    const { chave, cNF, cDV } = existing?.chave
      ? {
          chave: existing.chave,
          cNF: existing.chave.slice(35, 43),
          cDV: existing.chave.slice(43, 44),
        }
      : montarChaveNfe({
          cnpj: empresa.cnpj,
          serie: 1,
          numero: pedido.numero,
          dhEmi: agora,
        });
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
        it.infAdProd || buildInfAdProdMercadoria(input, it.quantidade, producao),
      csosn: FISCAL_DEFAULTS.csosn,
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
    await prisma.documentoFiscalSaida.updateMany({
      where: { pedidoVendaId: pedido.id, tipo: DocSaidaTipo.NFE },
      data: {
        xmlBruto: xml,
        discriminacao: itensXml.map((i) => i.infAdProd || i.descricao).join(" | "),
        valorTotal: plano.nfe.valor,
        chave,
        status: DocSaidaStatus.AUTORIZADO,
        simulado: simular,
      },
    });
    updated.push("NFE");
  }

  return { pedidoId, updated };
}
