import type { EventoTipo } from '@nfse/domain';

export interface ResultadoEmissao {
  chaveAcesso: string;
  idDps: string;
  nfseXml: string;
  alertas?: string[];
}

export interface ResultadoEvento {
  tipo: EventoTipo;
  sequencial: number;
  xmlEvento: string;
  status: 'REGISTRADO' | 'REJEITADO';
}

export interface EventoGov {
  tipo: EventoTipo;
  sequencial: number;
  xml: string;
  dataRegistro: string;
}

export interface DocumentoDfe {
  nsu: string;
  tipoDfe: string;
  chave: string;
  xml: string;
}

export interface LoteDfe {
  documentos: DocumentoDfe[];
  ultimoNsu: string;
  maxNsu: string;
}

export interface ISefinGateway {
  emitir(dpsXmlGZipB64: string): Promise<ResultadoEmissao>;
  consultarNfse(chave: string): Promise<string>;
  consultarDps(id: string): Promise<string | null>;
  verificarDps(id: string): Promise<boolean>;
  registrarEvento(chave: string, pedidoXmlGZipB64: string): Promise<ResultadoEvento>;
  listarEventos(chave: string): Promise<EventoGov[]>;
}

export interface IAdnGateway {
  sincronizarDfe(ultimoNsu: string): Promise<LoteDfe>;
  baixarDanfse(chave: string): Promise<Buffer | null>;
  listarEventosNfse(chave: string): Promise<EventoGov[]>;
}

export interface IParametrosMunicipaisGateway {
  obterConvenio(codigoIbge: string): Promise<{ ativo: boolean }>;
  obterAliquotas(codigoIbge: string): Promise<Record<string, number>>;
}

export interface GovErrorResponse {
  erros?: Array<{ Codigo: string; Descricao: string }>;
}

export type { DadosCnpj, ICadastroConsultaGateway } from './cadastro/types.js';
