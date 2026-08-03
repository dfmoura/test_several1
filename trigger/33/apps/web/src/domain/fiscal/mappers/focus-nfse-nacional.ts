/**
 * Mapper → payload Focus NFS-e Nacional (POST /v2/nfsen?ref=).
 * @see https://doc.focusnfe.com.br/reference/emitir_dps_nacional.md
 * @see https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html
 */

import {
  digits,
  FISCAL_DEFAULTS,
  stripFocusMeta,
  type ItemFiscal,
} from "../defaults";
import type { ContextoFiscal } from "../contexto";

export type FocusNfsePayloadOpts = {
  ref: string;
  ctx: ContextoFiscal;
  dataEmissao: Date;
  serieDps: number;
  numeroDps: number;
  descricaoServico: string;
  valorServico: number;
  itens?: ItemFiscal[];
};

export function toFocusNfseNacionalPayload(opts: FocusNfsePayloadOpts): {
  payload: Record<string, unknown>;
  payloadHttp: Record<string, unknown>;
} {
  const { ctx } = opts;
  const dest = ctx.destinatario;
  const params = ctx.parametros;
  const munEmp = ctx.empresa.codigoMunicipioIbge || "3170206";
  const item0 = opts.itens?.[0];

  const toma: Record<string, unknown> = {};
  const cnpjT = digits(dest.documento);
  const cpfT = digits(dest.documento);
  if (cnpjT.length === 14) toma.cnpj_tomador = cnpjT;
  else if (cpfT.length === 11) toma.cpf_tomador = cpfT;
  if (dest.nome) toma.nome_tomador = dest.nome;
  if (dest.email) toma.email_tomador = dest.email;
  if (dest.im) toma.inscricao_municipal_tomador = digits(dest.im);
  if (dest.logradouro) toma.logradouro_tomador = dest.logradouro;
  if (dest.numero) toma.numero_tomador = dest.numero;
  if (dest.complemento) toma.complemento_tomador = dest.complemento;
  if (dest.bairro) toma.bairro_tomador = dest.bairro;
  if (dest.cep) toma.cep_tomador = digits(dest.cep);
  if (dest.codigoMunicipioIbge) {
    toma.codigo_municipio_tomador = dest.codigoMunicipioIbge;
  }
  if (dest.uf) toma.uf_tomador = dest.uf;

  const munPrestacao =
    item0?.codigoMunicipioPrestacao || munEmp;

  const payload: Record<string, unknown> = {
    data_emissao: opts.dataEmissao.toISOString().replace(/\.\d{3}Z$/, "-0300"),
    serie_dps: opts.serieDps,
    numero_dps: opts.numeroDps,
    data_competencia: opts.dataEmissao.toISOString().slice(0, 10),
    emitente_dps: 1,
    codigo_municipio_emissora: Number(munEmp),
    cnpj_prestador: digits(ctx.empresa.cnpj),
    inscricao_municipal_prestador: ctx.empresa.inscricaoMunicipal
      ? digits(ctx.empresa.inscricaoMunicipal)
      : undefined,
    codigo_opcao_simples_nacional: params.opSimpNac,
    regime_apuracao_tributos_sn: params.regApTribSN,
    regime_especial_tributacao: params.regEspTrib,
    ...toma,
    codigo_municipio_prestacao: munPrestacao,
    codigo_tributacao_nacional_iss:
      item0?.cTribNac || FISCAL_DEFAULTS.cTribNac,
    codigo_nbs: item0?.cNbs || FISCAL_DEFAULTS.cNbs,
    descricao_servico: opts.descricaoServico,
    valor_servico: opts.valorServico,
    tributacao_iss: item0?.tributacaoIss ?? FISCAL_DEFAULTS.tributacaoIss,
    iss_retido: item0?.issRetido ? true : undefined,
    percentual_total_tributos_simples_nacional: params.pTotTribSN,
    percentual_total_tributos_federais: params.pTotTribFederal ?? undefined,
    percentual_total_tributos_estaduais: params.pTotTribEstadual ?? undefined,
    percentual_total_tributos_municipais: params.pTotTribMunicipal ?? undefined,
    ibs_cbs_situacao_tributaria: item0?.ibsCbsSituacaoTributaria || undefined,
    ibs_cbs_classificacao_tributaria:
      item0?.ibsCbsClassificacaoTributaria || undefined,
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfsen",
      doc_url: FISCAL_DEFAULTS.docNfse,
      campos_url: FISCAL_DEFAULTS.camposNfse,
    },
  };

  return { payload, payloadHttp: stripFocusMeta(payload) };
}

/** @deprecated Prefer toFocusNfseNacionalPayload with ContextoFiscal. */
export function buildFocusNfseNacionalPayload(opts: {
  ref: string;
  dataEmissao: Date;
  serieDps: number;
  numeroDps: number;
  codigoMunicipio: string;
  cnpjPrestador: string;
  inscricaoMunicipal?: string | null;
  cnpjTomador?: string | null;
  cpfTomador?: string | null;
  nomeTomador?: string | null;
  emailTomador?: string | null;
  logradouroTomador?: string | null;
  numeroTomador?: string | null;
  bairroTomador?: string | null;
  cepTomador?: string | null;
  codigoMunicipioTomador?: string | null;
  descricaoServico: string;
  valorServico: number;
  codigoTributacaoNacional?: string;
  codigoNbs?: string;
}): Record<string, unknown> {
  const toma: Record<string, unknown> = {};
  const cnpjT = digits(opts.cnpjTomador);
  const cpfT = digits(opts.cpfTomador);
  if (cnpjT.length === 14) toma.cnpj_tomador = cnpjT;
  else if (cpfT.length === 11) toma.cpf_tomador = cpfT;
  if (opts.nomeTomador) toma.nome_tomador = opts.nomeTomador;
  if (opts.emailTomador) toma.email_tomador = opts.emailTomador;
  if (opts.logradouroTomador) toma.logradouro_tomador = opts.logradouroTomador;
  if (opts.numeroTomador) toma.numero_tomador = opts.numeroTomador;
  if (opts.bairroTomador) toma.bairro_tomador = opts.bairroTomador;
  if (opts.cepTomador) toma.cep_tomador = digits(opts.cepTomador);
  if (opts.codigoMunicipioTomador) {
    toma.codigo_municipio_tomador = opts.codigoMunicipioTomador;
  }

  return {
    data_emissao: opts.dataEmissao.toISOString().replace(/\.\d{3}Z$/, "-0300"),
    serie_dps: opts.serieDps,
    numero_dps: opts.numeroDps,
    data_competencia: opts.dataEmissao.toISOString().slice(0, 10),
    emitente_dps: 1,
    codigo_municipio_emissora: Number(opts.codigoMunicipio || 3170206),
    cnpj_prestador: digits(opts.cnpjPrestador),
    inscricao_municipal_prestador: opts.inscricaoMunicipal
      ? digits(opts.inscricaoMunicipal)
      : undefined,
    codigo_opcao_simples_nacional: FISCAL_DEFAULTS.opSimpNac,
    regime_apuracao_tributos_sn: FISCAL_DEFAULTS.regApTribSN,
    regime_especial_tributacao: FISCAL_DEFAULTS.regEspTrib,
    ...toma,
    codigo_municipio_prestacao: opts.codigoMunicipio || "3170206",
    codigo_tributacao_nacional_iss:
      opts.codigoTributacaoNacional || FISCAL_DEFAULTS.cTribNac,
    codigo_nbs: opts.codigoNbs || FISCAL_DEFAULTS.cNbs,
    descricao_servico: opts.descricaoServico,
    valor_servico: opts.valorServico,
    tributacao_iss: 1,
    percentual_total_tributos_simples_nacional: FISCAL_DEFAULTS.pTotTribSN,
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfsen",
      doc_url: FISCAL_DEFAULTS.docNfse,
    },
  };
}
