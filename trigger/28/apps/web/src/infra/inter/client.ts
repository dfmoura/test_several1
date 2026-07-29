/** Bridge Banco Inter — reexporta o pacote de integração. */
export {
  INTER_DEFAULTS,
  emitirBolepix,
  consultarExtrato,
  consultarSaldo,
  interpretarWebhookCobranca,
  hashExtratoItem,
  type InterAmbiente,
  type InterClientConfig,
  type BolepixEmitRequest,
  type BolepixEmitResult,
  type ExtratoResult,
  type ExtratoItem,
  type ExtratoSimuladoSeed,
  type SaldoResult,
} from "@reta/banco-inter";
