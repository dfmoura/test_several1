import type { Config } from './config.js';
import type { CertificadoInfo } from '@nfse/xml';

export interface EmitenteInfo {
  cnpj: string;
  razaoSocial: string;
  codigoMunicipio: string;
  inscricaoMunicipal?: string;
  certificadoAtivo: boolean;
}

export function resolveEmitente(config: Config, cert: CertificadoInfo): EmitenteInfo {
  const certificadoAtivo = !cert.mock;
  return {
    cnpj: certificadoAtivo && cert.cnpj ? cert.cnpj : config.cnpj,
    razaoSocial: certificadoAtivo && cert.razaoSocial ? cert.razaoSocial : config.razaoSocial,
    codigoMunicipio: config.codigoMunicipio,
    inscricaoMunicipal: config.inscricaoMunicipal,
    certificadoAtivo,
  };
}

export function tpAmb(config: Config): '1' | '2' {
  return config.ambiente === 'prod' ? '1' : '2';
}
