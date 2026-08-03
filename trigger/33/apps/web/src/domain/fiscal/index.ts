/**
 * Domínio fiscal — emissão Focus NFe / NFS-e Nacional.
 */

export {
  FISCAL_DEFAULTS,
  digits,
  stripFocusMeta,
  indicadorIeDestToFocus,
  type ItemFiscal,
  type PlanoFiscalSaida,
} from "./defaults";

export {
  planejarDocumentosSaida,
  buildDiscriminacaoServico,
  buildInfAdProdMercadoria,
  type FaixaProducao,
} from "./planejar";

export { resolverCfop } from "./cfop";
export { montarChaveNfe, montarChaveNfse, montarIdDps } from "./chaves";

export {
  resolveContextoFiscal,
  destinatarioFromParceiro,
  reservarNumeroSerie,
  itemFiscalFromProdutoLinha,
  checklistPreEmissao,
  validatePreEmissao,
  type ContextoFiscal,
  type DestinatarioFiscal,
  type ParametroFiscalResolvido,
  type ChecklistItem,
} from "./contexto";

export {
  toFocusNfePayload,
  buildFocusNfePayload,
} from "./mappers/focus-nfe";

export {
  toFocusNfseNacionalPayload,
  buildFocusNfseNacionalPayload,
} from "./mappers/focus-nfse-nacional";
