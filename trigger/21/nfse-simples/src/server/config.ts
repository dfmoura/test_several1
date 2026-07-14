import { getGovEndpoints, type Ambiente } from '@nfse/shared';

export { getGovEndpoints, type Ambiente };

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

export interface Config {
  ambiente: Ambiente;
  cnpj: string;
  codigoMunicipio: string;
  dpsSerie: string;
  razaoSocial: string;
  inscricaoMunicipal?: string;
  certPath?: string;
  certPassword?: string;
  certPasswordFile?: string;
  certRequired: boolean;
  govMock: boolean;
  port: number;
  webPassword: string;
  sessionSecret: string;
  dataDir: string;
  syncIntervalSec: number;
  logLevel: 'info' | 'warn' | 'error' | 'debug';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const ambiente = (env.NFSE_AMBIENTE ?? 'homolog') as Ambiente;
  if (!['dev', 'homolog', 'prod'].includes(ambiente)) {
    throw new Error('NFSE_AMBIENTE deve ser dev, homolog ou prod');
  }

  const cnpj = (env.NFSE_CNPJ ?? '').replace(/\D/g, '');
  if (cnpj.length !== 14) {
    throw new Error('NFSE_CNPJ deve ter 14 dígitos');
  }

  const codigoMunicipio = env.NFSE_C_MUN_EMISSOR ?? '';
  if (codigoMunicipio.length !== 7) {
    throw new Error('NFSE_C_MUN_EMISSOR deve ter 7 dígitos (IBGE)');
  }

  const sessionSecret = env.NFSE_SESSION_SECRET ?? '';
  if (sessionSecret.length < 16) {
    throw new Error('NFSE_SESSION_SECRET deve ter no mínimo 16 caracteres');
  }

  return {
    ambiente,
    cnpj,
    codigoMunicipio,
    dpsSerie: (env.NFSE_DPS_SERIE ?? '00001').padStart(5, '0').slice(-5),
    razaoSocial: env.NFSE_RAZAO_SOCIAL ?? 'Empresa',
    inscricaoMunicipal: env.NFSE_INSCRICAO_MUNICIPAL,
    certPath: env.NFSE_CERT_PATH,
    certPassword: env.NFSE_CERT_PASSWORD,
    certPasswordFile: env.NFSE_CERT_PASSWORD_FILE,
    certRequired: envFlag(env.NFSE_CERT_REQUIRED, ambiente !== 'dev'),
    govMock: envFlag(env.NFSE_GOV_MOCK, ambiente === 'dev'),
    port: Number(env.NFSE_PORT ?? env.PORT ?? 18210),
    webPassword: env.NFSE_WEB_PASSWORD ?? 'admin',
    sessionSecret,
    dataDir: env.NFSE_DATA_DIR ?? './data',
    syncIntervalSec: Number(env.NFSE_SYNC_INTERVAL_SEC ?? 300),
    logLevel: (env.LOG_LEVEL as Config['logLevel']) ?? 'info',
  };
}

export function ambienteLabel(ambiente: Ambiente): string {
  switch (ambiente) {
    case 'prod': return 'Produção';
    case 'homolog': return 'Homologação (Produção Restrita)';
    default: return 'Desenvolvimento';
  }
}

export function isProducao(ambiente: Ambiente): boolean {
  return ambiente === 'prod';
}
