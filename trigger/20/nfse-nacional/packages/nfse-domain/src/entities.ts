export type DpsStatus =
  | 'RASCUNHO'
  | 'ENVIANDO'
  | 'AUTORIZADA'
  | 'REJEITADA'
  | 'CANCELADA'
  | 'SUBSTITUIDA';

export type NfseSituacao =
  | 'AUTORIZADA'
  | 'CANCELADA'
  | 'SUBSTITUIDA'
  | 'ANALISE_FISCAL';

export type EventoTipo =
  | 'e101101'
  | 'e105102'
  | 'e101103'
  | 'e202201'
  | 'e203202'
  | 'e204203';

export const EVENTO_CANCELAMENTO: EventoTipo = 'e101101';
export const EVENTO_CANCELAMENTO_SUBSTITUICAO: EventoTipo = 'e105102';

export interface Dps {
  id: string;
  idDps: string;
  status: DpsStatus;
  numeroDps: string;
  serie: string;
  xmlStorageKey?: string;
  payloadHash?: string;
  correlationId?: string;
  chaveSubstituida?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nfse {
  chaveAcesso: string;
  idDps: string;
  situacao: NfseSituacao;
  valorServico: number;
  xmlStorageKey?: string;
  chaveSubstituida?: string;
  chaveSubstituta?: string;
  emitidaEm: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventoNfse {
  id: string;
  chaveAcesso: string;
  tipo: EventoTipo;
  sequencial: number;
  statusRegistro: 'REGISTRADO' | 'REJEITADO';
  xmlStorageKey?: string;
  motivo?: string;
  createdAt: Date;
}

export interface DocumentoFiscalRecebido {
  id: string;
  nsu: string;
  tipoDfe: string;
  chave: string;
  xmlStorageKey?: string;
  processado: boolean;
  recebidoEm: Date;
}

export interface ParametrosMunicipais {
  codigoIbge: string;
  convenioAtivo: boolean;
  aliquotas: Record<string, number>;
  cachedAt: Date;
  expiresAt: Date;
}

export interface EmitirNfseInput {
  tomador: import('./value-objects.js').Tomador;
  servico: import('./value-objects.js').Servico;
  valores: import('./value-objects.js').Valores;
  /** Situação perante o Simples Nacional (opSimpNac). Padrão: derivado do cadastro do prestador. */
  opSimpNac?: import('./tributacao-simples-nacional.js').OpSimpNac;
  /** Regime de apuração SN (regApTribSN) — obrigatório quando opSimpNac = 2 ou 3. */
  regApTribSN?: import('./tributacao-simples-nacional.js').RegApTribSN;
  /** Regime especial de tributação do prestador (regEspTrib). Padrão: 0 (Nenhum). */
  regimeEspecialTributacao?: import('./value-objects.js').RegimeEspecialTributacao;
  /** Valor aproximado dos tributos (totTrib). Padrão: alíquota SN 6,00% (emissor nacional). */
  totTrib?: import('./value-objects.js').TotTrib;
  discriminacao?: string;
  dataCompetencia?: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export interface CancelarNfseInput {
  chaveAcesso: string;
  codigoMotivo: string;
  motivo: string;
}

export interface SubstituirNfseInput extends EmitirNfseInput {
  chaveSubstituida: string;
}
