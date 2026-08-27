export type AmbienteEmitente = 'homolog' | 'prod';

export type Crt = '1' | '2' | '3';

export type NfeSituacao =
  | 'RASCUNHO'
  | 'ENVIANDO'
  | 'PROCESSANDO'
  | 'AUTORIZADA'
  | 'REJEITADA'
  | 'DENEGADA'
  | 'CANCELADA'
  | 'INUTILIZADA';

export type EventoTipo = '110111' | '110110';

export const EVENTO_CANCELAMENTO: EventoTipo = '110111';
export const EVENTO_CCE: EventoTipo = '110110';

export const HOMOLOG_DEST_NOME = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface Emitente {
  id: string;
  apelido: string;
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  crt: Crt;
  cnae?: string;
  endereco: Endereco;
  telefone?: string;
  email?: string;
  ambiente: AmbienteEmitente;
  seriePadrao: number;
  ultimoNumero: number;
  credenciadoSiare: boolean;
  certStorageKey?: string;
  certCnpj?: string;
  certValidade?: Date;
  certSubject?: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type FinalidadeParceiro = 'REVENDA' | 'INDUSTRIALIZACAO' | 'USO_CONSUMO';
export type RegimeParceiro =
  | 'SIMPLES_NACIONAL'
  | 'MEI'
  | 'PRESUMIDO'
  | 'REAL'
  | 'ISENTO'
  | 'OUTRO';
export type IeStatus =
  | 'NAO_VERIFICADA'
  | 'OK'
  | 'BAIXADA'
  | 'NAO_HABILITADA'
  | 'ISENTA';
export type TipoFornecimento = 'MERCADORIA' | 'SERVICO' | 'UTILIDADE' | 'TRIBUTO';

/** Destinatário NF-e = parceiro multi-papel (cliente / fornecedor / …). */
export interface Destinatario {
  id: string;
  emitenteId: string;
  apelido: string;
  tipo: 'PF' | 'PJ' | 'EX';
  cpfCnpj: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  indIEDest: '1' | '2' | '9';
  email?: string;
  telefone?: string;
  endereco?: Endereco;
  ativo: boolean;
  papelCliente: boolean;
  papelFornecedor: boolean;
  papelTransportadora: boolean;
  inscricaoMunicipal?: string;
  emailXml?: string;
  finalidade?: FinalidadeParceiro;
  consumidorFinal: boolean;
  regime?: RegimeParceiro;
  ieStatus: IeStatus;
  suframa?: string;
  areaIncentivada: boolean;
  cnae?: string;
  tipoFornecimento?: TipoFornecimento;
  cfopEntradaPadrao?: string;
  emiteDocumentoFiscal: boolean;
  idEstrangeiro?: string;
}

export interface Produto {
  id: string;
  emitenteId: string;
  codigo: string;
  descricao: string;
  descricaoFiscal?: string;
  ncm: string;
  cfop: string;
  cfopEntradaPadrao?: string;
  unidade: string;
  valorUnitario: number;
  origem: string;
  csosn?: string;
  cst?: string;
  cest?: string;
  gtin?: string;
  tipoItemSped: string;
  cstPis?: string;
  cstCofins?: string;
  aliquotaPis?: number;
  aliquotaCofins?: number;
  /** CST compartilhado IBS+CBS (IT 2025.002). */
  cstIbsCbs?: string;
  cclassTrib?: string;
  aliquotaIbs?: number;
  aliquotaCbs?: number;
  cstIs?: string;
  cclassTribIs?: string;
  aliquotaIs?: number;
  sujeitoIs: boolean;
  cbenef?: string;
  ativo: boolean;
}

export interface AptidacaoFiscal {
  completo: boolean;
  aptoEmissaoNfe: boolean;
  aptoReforma: boolean;
  pendencias: string[];
  pendenciasEmissao: string[];
  pendenciasReforma: string[];
}

export interface NfeItemInput {
  produtoId?: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  origem?: string;
  csosn?: string;
  cst?: string;
  cest?: string;
}

export interface DestinatarioInput {
  tipo: 'PF' | 'PJ' | 'EX';
  cpfCnpj: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  indIEDest: '1' | '2' | '9';
  email?: string;
  telefone?: string;
  endereco: Endereco;
}

export interface EmitirNfeInput {
  naturezaOperacao: string;
  serie?: number;
  destinatario: DestinatarioInput;
  itens: NfeItemInput[];
  informacoesAdicionais?: string;
  indFinal?: '0' | '1';
  indPres?: '0' | '1' | '2' | '3' | '4' | '5' | '9';
  modFrete?: '0' | '1' | '2' | '9';
  correlationId?: string;
}

export interface CancelarNfeInput {
  chaveAcesso: string;
  motivo: string;
}

export interface CceInput {
  chaveAcesso: string;
  correcao: string;
}

export interface InutilizarInput {
  serie: number;
  numeroIni: number;
  numeroFim: number;
  ano: number;
  motivo: string;
}

export interface Nfe {
  id: string;
  emitenteId: string;
  chaveAcesso: string;
  situacao: NfeSituacao;
  modelo: string;
  serie: number;
  numero: number;
  naturezaOperacao: string;
  tpAmb: '1' | '2';
  destCpfCnpj: string;
  destRazaoSocial: string;
  valorProdutos: number;
  valorNf: number;
  nRec?: string;
  nProt?: string;
  cStat?: string;
  xMotivo?: string;
  dhEmi: Date;
  dhAutorizacao?: Date;
}

export interface EventoNfe {
  id: string;
  nfeId: string;
  chaveAcesso: string;
  tipo: EventoTipo;
  sequencial: number;
  statusRegistro: 'REGISTRADO' | 'REJEITADO';
  nProt?: string;
  motivo?: string;
  createdAt: Date;
}
