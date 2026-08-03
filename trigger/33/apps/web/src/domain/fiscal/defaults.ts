/**
 * Constantes fiscais — alinhadas ao estudo 32 (CADASTRO_PRODUTOS_VENDA + MAPA_FATURAMENTO).
 *
 * Produção própria (PA-ETQ) …… NF-e CFOP 5101/6101
 * Revenda (REV-RIB) …………… NF-e CFOP 5102/6102
 * Serviço avulso (SVC) ……… NFS-e quando contador definir (não é o padrão da etiqueta)
 *
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://doc.focusnfe.com.br/reference/nfse-nacional
 */

import type { DocumentoSaidaPadrao, TipoProduto } from "@prisma/client";
import { DocSaidaTipo } from "@prisma/client";

export const FISCAL_DEFAULTS = {
  cTribNac: "130501",
  cNbs: "121012100",
  xNbs: "Serviços de impressão",
  pTotTribSN: 11.81,
  opSimpNac: 3,
  regApTribSN: 1,
  regEspTrib: 0,
  serieDps: 70000,
  serieNfe: 1,
  /** Produção própria (caso principal — etiquetas). */
  cfopProducao: "5101",
  cfopProducaoInterestadual: "6101",
  /** Revenda (ribbons / material sem industrialização). */
  cfopRevenda: "5102",
  cfopRevendaInterestadual: "6102",
  /** @deprecated use cfopProducao — mantido para compat de imports legados. */
  cfopMercadoria: "5101",
  /** @deprecated use cfopProducaoInterestadual */
  cfopMercadoriaInterestadual: "6101",
  naturezaMercadoria: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
  naturezaProducao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
  csosn: "102",
  cstPis: "49",
  cstCofins: "49",
  modalidadeFrete: 9,
  presencaComprador: 1,
  tributacaoIss: 1,
  paisCodigo: "1058",
  docNfe: "https://doc.focusnfe.com.br/reference/nfe",
  docNfse: "https://doc.focusnfe.com.br/reference/nfse-nacional",
  camposNfe: "https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html",
  camposNfse: "https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html",
} as const;

export type ItemFiscal = {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  ncm?: string | null;
  cest?: string | null;
  ean?: string | null;
  cfop?: string | null;
  cTribNac?: string | null;
  cNbs?: string | null;
  codigo?: string | null;
  tipoProduto?: TipoProduto | null;
  documentoSaidaPadrao?: DocumentoSaidaPadrao | null;
  infAdProd?: string | null;
  origem?: number | null;
  csosn?: string | null;
  cstIcms?: string | null;
  cstPis?: string | null;
  cstCofins?: string | null;
  tributacaoIss?: number | null;
  issRetido?: boolean | null;
  codigoMunicipioPrestacao?: string | null;
  ibsCbsSituacaoTributaria?: string | null;
  ibsCbsClassificacaoTributaria?: string | null;
  unidadeTributavel?: string | null;
};

export type PlanoFiscalSaida = {
  emitirNfse: boolean;
  emitirNfe: boolean;
  tipos: DocSaidaTipo[];
  labelCta: string;
  resumo: string;
  nfse: {
    itens: ItemFiscal[];
    valor: number;
    discriminacao: string;
  } | null;
  nfe: {
    itens: ItemFiscal[];
    valor: number;
    naturezaOperacao: string;
  } | null;
};

export function digits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

/** Remove undefined/null e chave `_meta` antes do POST Focus. */
export function stripFocusMeta(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "_meta" || v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function indicadorIeDestToFocus(
  ind: "CONTRIBUINTE" | "ISENTO" | "NAO_CONTRIBUINTE" | string | null | undefined,
): number {
  if (ind === "CONTRIBUINTE") return 1;
  if (ind === "ISENTO") return 2;
  return 9;
}
