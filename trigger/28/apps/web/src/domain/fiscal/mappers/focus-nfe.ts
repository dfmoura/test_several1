/**
 * Mapper → payload Focus NF-e (POST /v2/nfe?ref=).
 * @see https://doc.focusnfe.com.br/reference/emitir_nfe.md
 * @see https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html
 */

import { buildInfCplNfe } from "@/lib/fiscal/textos";
import { resolverCfop } from "../cfop";
import {
  digits,
  FISCAL_DEFAULTS,
  indicadorIeDestToFocus,
  stripFocusMeta,
  type ItemFiscal,
} from "../defaults";
import type { ContextoFiscal, DestinatarioFiscal } from "../contexto";

export type FocusNfePayloadOpts = {
  ref: string;
  ctx: ContextoFiscal;
  naturezaOperacao: string;
  dataEmissao: Date;
  serie: number;
  numero: number;
  itens: ItemFiscal[];
  valorTotal: number;
  pedidoNumero?: string | number;
  /** Quando há Bolepix / título a receber. */
  formaPagamento?: {
    indicador?: number;
    meio?: number;
    valor?: number;
  };
  /** Duplicatas (cobr/dup) — Focus: `duplicatas[]`. */
  duplicatas?: Array<{
    numero: string;
    dataVencimento: Date | string;
    valor: number;
  }>;
  /** Volumes transportados — Focus: `volumes[]`. */
  volumes?: Array<{
    quantidade?: number | string;
    especie?: string;
    marca?: string;
    numeracao?: string;
    pesoBruto?: number | string;
    pesoLiquido?: number | string;
  }>;
};

export function toFocusNfePayload(opts: FocusNfePayloadOpts): {
  payload: Record<string, unknown>;
  payloadHttp: Record<string, unknown>;
} {
  const { ctx, itens, valorTotal } = opts;
  const dest = opts.ctx.destinatario;
  const params = ctx.parametros;
  const natureza = params.naturezaMercadoria;
  const { localDestino } = resolverCfop({
    ufEmitente: ctx.empresa.uf,
    ufDestinatario: dest.uf,
    cfopDentroUf: natureza?.cfopDentroUf,
    cfopForaUf: natureza?.cfopForaUf,
  });

  const destDoc = digits(dest.documento);
  const infCpl =
    params.infCplPadrao ||
    (opts.pedidoNumero != null
      ? buildInfCplNfe({
          pedidoNumero: opts.pedidoNumero,
          valorNota: valorTotal,
          autorizadoEm: opts.dataEmissao,
          simulado: ctx.simular,
        })
      : undefined);

  const payload: Record<string, unknown> = {
    natureza_operacao: opts.naturezaOperacao || natureza?.descricao || FISCAL_DEFAULTS.naturezaMercadoria,
    data_emissao: opts.dataEmissao.toISOString().replace(/\.\d{3}Z$/, "-0300"),
    tipo_documento: 1,
    finalidade_emissao: natureza?.finalidadeEmissao ?? 1,
    local_destino: localDestino,
    consumidor_final: dest.consumidorFinal ? 1 : 0,
    presenca_comprador: params.presencaCompradorPadrao,
    cnpj_emitente: digits(ctx.empresa.cnpj),
    nome_destinatario: dest.nome,
    cnpj_destinatario: destDoc.length === 14 ? destDoc : undefined,
    cpf_destinatario: destDoc.length === 11 ? destDoc : undefined,
    inscricao_estadual_destinatario: dest.ie ? digits(dest.ie) : undefined,
    indicador_inscricao_estadual_destinatario: indicadorIeDestToFocus(dest.indicadorIeDest),
    email_destinatario: dest.email || undefined,
    logradouro_destinatario: dest.logradouro,
    numero_destinatario: dest.numero || "S/N",
    complemento_destinatario: dest.complemento || undefined,
    bairro_destinatario: dest.bairro,
    municipio_destinatario: dest.cidade,
    uf_destinatario: dest.uf,
    cep_destinatario: digits(dest.cep),
    codigo_municipio_destinatario: dest.codigoMunicipioIbge || undefined,
    pais_destinatario: dest.paisCodigo || FISCAL_DEFAULTS.paisCodigo,
    serie: opts.serie,
    numero: opts.numero,
    items: itens.map((it, idx) => mapItemNfe(it, idx, ctx, dest)),
    valor_produtos: valorTotal,
    valor_total: valorTotal,
    modalidade_frete: params.modalidadeFretePadrao,
    informacoes_adicionais_contribuinte: infCpl,
    formas_pagamento: [
      {
        indicador_pagamento: opts.formaPagamento?.indicador ?? 1,
        forma_pagamento: opts.formaPagamento?.meio ?? 15,
        valor_pagamento: opts.formaPagamento?.valor ?? valorTotal,
      },
    ],
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfe",
      doc_url: FISCAL_DEFAULTS.docNfe,
      campos_url: FISCAL_DEFAULTS.camposNfe,
    },
  };

  if (opts.duplicatas?.length) {
    payload.duplicatas = opts.duplicatas.map((d) => ({
      numero: d.numero,
      data_vencimento:
        typeof d.dataVencimento === "string"
          ? d.dataVencimento.slice(0, 10)
          : d.dataVencimento.toISOString().slice(0, 10),
      valor: d.valor,
    }));
  }

  if (opts.volumes?.length) {
    payload.volumes = opts.volumes.map((v) => ({
      quantidade: v.quantidade,
      especie: v.especie,
      marca: v.marca,
      numeracao: v.numeracao,
      peso_bruto: v.pesoBruto,
      peso_liquido: v.pesoLiquido,
    }));
  }

  return { payload, payloadHttp: stripFocusMeta(payload) };
}

function mapItemNfe(
  it: ItemFiscal,
  idx: number,
  ctx: ContextoFiscal,
  dest: DestinatarioFiscal,
): Record<string, unknown> {
  const natureza = ctx.parametros.naturezaMercadoria;
  const { cfop } = resolverCfop({
    ufEmitente: ctx.empresa.uf,
    ufDestinatario: dest.uf,
    cfopDentroUf: natureza?.cfopDentroUf,
    cfopForaUf: natureza?.cfopForaUf,
    cfopItem: it.cfop,
  });
  const csosn = it.csosn || ctx.parametros.csosnPadrao || FISCAL_DEFAULTS.csosn;
  const item: Record<string, unknown> = {
    numero_item: idx + 1,
    codigo_produto: it.codigo || `ITEM${idx + 1}`,
    descricao: it.descricao,
    codigo_ncm: it.ncm || "48211000",
    codigo_cest: it.cest || undefined,
    codigo_barras_comercial: it.ean || undefined,
    cfop,
    unidade_comercial: it.unidade || "UN",
    quantidade_comercial: it.quantidade,
    valor_unitario_comercial: it.valorUnitario,
    valor_bruto: it.valorTotal,
    unidade_tributavel: it.unidadeTributavel || it.unidade || "UN",
    quantidade_tributavel: it.quantidade,
    valor_unitario_tributavel: it.valorUnitario,
    icms_origem: it.origem ?? 0,
    icms_situacao_tributaria: csosn,
    pis_situacao_tributaria: it.cstPis || ctx.parametros.cstPisPadrao,
    cofins_situacao_tributaria: it.cstCofins || ctx.parametros.cstCofinsPadrao,
    informacoes_adicionais_item: it.infAdProd || undefined,
  };
  if (it.ibsCbsSituacaoTributaria) {
    item.ibs_cbs_situacao_tributaria = it.ibsCbsSituacaoTributaria;
  }
  if (it.ibsCbsClassificacaoTributaria) {
    item.ibs_cbs_classificacao_tributaria = it.ibsCbsClassificacaoTributaria;
  }
  return item;
}

/** @deprecated Prefer toFocusNfePayload with ContextoFiscal. */
export function buildFocusNfePayload(opts: {
  ref: string;
  naturezaOperacao: string;
  dataEmissao: Date;
  cnpjEmitente: string;
  destinatario: {
    documento: string | null;
    nome: string;
    ie?: string | null;
    email?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    codigoMunicipio?: string | null;
  };
  itens: ItemFiscal[];
  valorTotal: number;
  serie?: number;
  numero?: number;
}): Record<string, unknown> {
  const destDoc = digits(opts.destinatario.documento);
  return {
    natureza_operacao: opts.naturezaOperacao,
    data_emissao: opts.dataEmissao.toISOString().replace(/\.\d{3}Z$/, "-0300"),
    tipo_documento: 1,
    finalidade_emissao: 1,
    local_destino: 1,
    consumidor_final: 0,
    presenca_comprador: 1,
    cnpj_emitente: digits(opts.cnpjEmitente),
    nome_destinatario: opts.destinatario.nome,
    cnpj_destinatario: destDoc.length === 14 ? destDoc : undefined,
    cpf_destinatario: destDoc.length === 11 ? destDoc : undefined,
    inscricao_estadual_destinatario: opts.destinatario.ie
      ? digits(opts.destinatario.ie)
      : undefined,
    indicador_inscricao_estadual_destinatario: opts.destinatario.ie ? 1 : 9,
    email_destinatario: opts.destinatario.email || undefined,
    logradouro_destinatario: opts.destinatario.logradouro,
    numero_destinatario: opts.destinatario.numero || "S/N",
    bairro_destinatario: opts.destinatario.bairro,
    municipio_destinatario: opts.destinatario.cidade,
    uf_destinatario: opts.destinatario.uf,
    cep_destinatario: digits(opts.destinatario.cep),
    codigo_municipio_destinatario: opts.destinatario.codigoMunicipio || undefined,
    serie: opts.serie,
    numero: opts.numero,
    items: opts.itens.map((it, idx) => ({
      numero_item: idx + 1,
      codigo_produto: it.codigo || `ITEM${idx + 1}`,
      descricao: it.descricao,
      codigo_ncm: it.ncm || "48211000",
      cfop: it.cfop || FISCAL_DEFAULTS.cfopMercadoria,
      unidade_comercial: it.unidade || "UN",
      quantidade_comercial: it.quantidade,
      valor_unitario_comercial: it.valorUnitario,
      valor_bruto: it.valorTotal,
      unidade_tributavel: it.unidade || "UN",
      quantidade_tributavel: it.quantidade,
      valor_unitario_tributavel: it.valorUnitario,
      icms_origem: it.origem ?? 0,
      icms_situacao_tributaria: it.csosn || FISCAL_DEFAULTS.csosn,
      pis_situacao_tributaria: it.cstPis || FISCAL_DEFAULTS.cstPis,
      cofins_situacao_tributaria: it.cstCofins || FISCAL_DEFAULTS.cstCofins,
      informacoes_adicionais_item: it.infAdProd || undefined,
    })),
    valor_produtos: opts.valorTotal,
    valor_total: opts.valorTotal,
    modalidade_frete: 9,
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfe",
      doc_url: FISCAL_DEFAULTS.docNfe,
    },
  };
}
