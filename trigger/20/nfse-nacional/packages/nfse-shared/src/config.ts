import { z } from 'zod';

export const AmbienteSchema = z.enum(['dev', 'homolog', 'prod']);
export type Ambiente = z.infer<typeof AmbienteSchema>;

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

export const AppConfigSchema = z.object({
  ambiente: AmbienteSchema.default('dev'),
  cnpj: z.string().length(14),
  codigoMunicipio: z.string().length(7),
  dpsSerie: z.string().length(5),
  razaoSocial: z.string().min(1),
  /** Inscrição municipal do prestador — cadastro manual (.env); não vem do certificado nem de APIs de CNPJ. */
  inscricaoMunicipal: z.string().optional(),
  certPath: z.string().optional(),
  certPassword: z.string().optional(),
  certPasswordFile: z.string().optional(),
  /** Exige certificado A1 real (sem mock). Default: true quando govMock=false. */
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
  minioBucket: z.string().default('nfse-xml'),
  minioUseSsl: z.boolean().default(false),
  syncIntervalSec: z.coerce.number().default(300),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  govMock: z.boolean().default(false),
  cadastroEnabled: z.boolean().default(true),
  cadastroCacheTtlSec: z.coerce.number().default(86_400),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return AppConfigSchema.parse({
    ambiente: env.NFSE_AMBIENTE,
    cnpj: env.NFSE_CNPJ,
    codigoMunicipio: env.NFSE_C_MUN_EMISSOR,
    dpsSerie: env.NFSE_DPS_SERIE,
    razaoSocial: env.NFSE_RAZAO_SOCIAL,
    inscricaoMunicipal: env.NFSE_INSCRICAO_MUNICIPAL,
    certPath: env.NFSE_CERT_PATH,
    certPassword: env.NFSE_CERT_PASSWORD,
    certPasswordFile: env.NFSE_CERT_PASSWORD_FILE,
    certRequired: env.NFSE_CERT_REQUIRED !== undefined
      ? envFlag(env.NFSE_CERT_REQUIRED, false)
      : undefined,
    apiKey: env.NFSE_API_KEY,
    apiPort: env.NFSE_API_PORT,
    jwtSecret: env.NFSE_JWT_SECRET,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    rabbitmqUrl: env.RABBITMQ_URL,
    minioEndpoint: env.MINIO_ENDPOINT,
    minioPort: env.MINIO_PORT,
    minioAccessKey: env.MINIO_ACCESS_KEY,
    minioSecretKey: env.MINIO_SECRET_KEY,
    minioBucket: env.MINIO_BUCKET,
    minioUseSsl: envFlag(env.MINIO_USE_SSL, false),
    syncIntervalSec: env.NFSE_SYNC_INTERVAL_SEC,
    logLevel: env.LOG_LEVEL,
    govMock: envFlag(env.NFSE_GOV_MOCK, false),
    cadastroEnabled: envFlag(env.NFSE_CADASTRO_ENABLED, true),
    cadastroCacheTtlSec: env.NFSE_CADASTRO_CACHE_TTL_SEC,
  });
}

export function getGovEndpoints(ambiente: Ambiente): { sefin: string; adn: string } {
  if (ambiente === 'prod') {
    return {
      sefin: 'https://sefin.nfse.gov.br/SefinNacional',
      adn: 'https://adn.nfse.gov.br',
    };
  }
  return {
    sefin: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
    adn: 'https://adn.producaorestrita.nfse.gov.br',
  };
}
