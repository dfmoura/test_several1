import type { XmlSigner } from '@nfe/xml';

export interface StatusServicoResult {
  cStat: string;
  xMotivo: string;
  tMed?: string;
  dhRecbto?: string;
}

export interface ResultadoAutorizacao {
  modo: 'sincrona' | 'recibo';
  cStat: string;
  xMotivo: string;
  chaveAcesso?: string;
  nProt?: string;
  nRec?: string;
  dhRecbto?: string;
  xmlRetorno: string;
}

export interface ResultadoConsulta {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  chaveAcesso?: string;
  xmlProt?: string;
}

export interface ResultadoEvento {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  xmlRetorno: string;
}

export interface ResultadoInutilizacao {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  xmlRetorno: string;
}

export interface ISefazGateway {
  statusServico(tpAmb: '1' | '2'): Promise<StatusServicoResult>;
  autorizar(enviNFeXml: string, tpAmb: '1' | '2'): Promise<ResultadoAutorizacao>;
  consultarRecibo(nRec: string, tpAmb: '1' | '2'): Promise<ResultadoAutorizacao>;
  consultarProtocolo(chave: string, tpAmb: '1' | '2'): Promise<ResultadoConsulta>;
  registrarEvento(eventoXml: string, tpAmb: '1' | '2'): Promise<ResultadoEvento>;
  inutilizar(inutXml: string, tpAmb: '1' | '2'): Promise<ResultadoInutilizacao>;
}

export type SefazGatewayFactory = (signer: XmlSigner) => ISefazGateway;
