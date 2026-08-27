import { z } from 'zod';

export const AmbienteSchema = z.enum(['dev', 'homolog', 'prod']);
export type Ambiente = z.infer<typeof AmbienteSchema>;

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

export const AppConfigSchema = z.object({
  ambiente: AmbienteSchema.default('dev'),
  uf: z.string().length(2).default('MG'),
  cUF: z.string().length(2).default('31'),
  certKek: z.string().min(32),
  certRequired: z.boolean().optional(),
  apiKey: z.string().min(8),
  apiPort: z.coerce.number().default(3000),
  jwtSecret: z.string().min(16),
  databaseUrl: z.string().url(),
  redisUrl: z.string().url(),
  rabbitmqUrl: z.string().url(),
  minioEndpoint: z.string(),
  minioPort: z.coerce.number().default(9000),
  minioAccessKey: z.string(),
  minioSecretKey: z.string(),
  minioBucket: z.string().default('nfe-xml'),
  minioUseSsl: z.boolean().default(false),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  sefazMock: z.boolean().default(false),
  danfeUrl: z.string().optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return AppConfigSchema.parse({
    ambiente: env.NFE_AMBIENTE,
    uf: env.NFE_UF,
    cUF: env.NFE_CUF,
    certKek: env.NFE_CERT_KEK,
    certRequired: env.NFE_CERT_REQUIRED !== undefined
      ? envFlag(env.NFE_CERT_REQUIRED, false)
      : undefined,
    apiKey: env.NFE_API_KEY,
    apiPort: env.NFE_API_PORT,
    jwtSecret: env.NFE_JWT_SECRET,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    rabbitmqUrl: env.RABBITMQ_URL,
    minioEndpoint: env.MINIO_ENDPOINT,
    minioPort: env.MINIO_PORT,
    minioAccessKey: env.MINIO_ACCESS_KEY,
    minioSecretKey: env.MINIO_SECRET_KEY,
    minioBucket: env.MINIO_BUCKET,
    minioUseSsl: envFlag(env.MINIO_USE_SSL, false),
    logLevel: env.LOG_LEVEL,
    sefazMock: envFlag(env.NFE_SEFAZ_MOCK, false),
    danfeUrl: env.NFE_DANFE_URL,
  });
}

export interface SefazEndpoints {
  statusServico: string;
  autorizacao: string;
  retAutorizacao: string;
  consultaProtocolo: string;
  inutilizacao: string;
  recepcaoEvento: string;
  consultaCadastro: string;
}

const SERVICES = [
  'NFeStatusServico4',
  'NFeAutorizacao4',
  'NFeRetAutorizacao4',
  'NFeConsultaProtocolo4',
  'NFeInutilizacao4',
  'NFeRecepcaoEvento4',
  'CadConsultaCadastro4',
] as const;

function buildEndpoints(host: string): SefazEndpoints {
  const base = `${host}/nfe2/services`;
  return {
    statusServico: `${base}/${SERVICES[0]}`,
    autorizacao: `${base}/${SERVICES[1]}`,
    retAutorizacao: `${base}/${SERVICES[2]}`,
    consultaProtocolo: `${base}/${SERVICES[3]}`,
    inutilizacao: `${base}/${SERVICES[4]}`,
    recepcaoEvento: `${base}/${SERVICES[5]}`,
    consultaCadastro: `${base}/${SERVICES[6]}`,
  };
}

export function getSefazEndpoints(ambiente: Ambiente): SefazEndpoints {
  if (ambiente === 'prod') {
    return buildEndpoints('https://nfe.fazenda.mg.gov.br');
  }
  return buildEndpoints('https://hnfe.fazenda.mg.gov.br');
}

export function tpAmbFromAmbiente(ambiente: Ambiente): '1' | '2' {
  return ambiente === 'prod' ? '1' : '2';
}
