/**
 * Facade de compatibilidade — lógica em `@/domain/fiscal`.
 * Homologação: XML/PDF locais. Produção: POST Focus `/v2/nfsen` e `/v2/nfe`.
 *
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://doc.focusnfe.com.br/reference/nfse-nacional
 */

export {
  FISCAL_DEFAULTS,
  digits,
  stripFocusMeta,
  type ItemFiscal,
  type PlanoFiscalSaida,
  type FaixaProducao,
  planejarDocumentosSaida,
  buildDiscriminacaoServico,
  buildInfAdProdMercadoria,
  montarChaveNfe,
  montarChaveNfse,
  montarIdDps,
  buildFocusNfePayload,
  buildFocusNfseNacionalPayload,
  toFocusNfePayload,
  toFocusNfseNacionalPayload,
  resolveContextoFiscal,
  validatePreEmissao,
  checklistPreEmissao,
  itemFiscalFromProdutoLinha,
  reservarNumeroSerie,
} from "@/domain/fiscal";
