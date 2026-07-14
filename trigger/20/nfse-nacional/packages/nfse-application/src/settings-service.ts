import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AppConfig, Ambiente } from '@nfse/shared';
import { getGovEndpoints } from '@nfse/shared';
import { ValidationError } from '@nfse/shared';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import type { AuditLogger } from './repositories.js';

type SettingsRow = typeof schema.systemSettings.$inferSelect;

export interface EffectivePrestadorConfig {
  codigoMunicipio: string;
  dpsSerie: string;
  razaoSocial: string;
  inscricaoMunicipal?: string;
}

export interface SettingsOverrides {
  inscricaoMunicipal: boolean;
  codigoMunicipio: boolean;
  dpsSerie: boolean;
  razaoSocial: boolean;
  syncIntervalSec: boolean;
  cadastroEnabled: boolean;
  cadastroCacheTtlSec: boolean;
  logLevel: boolean;
  webPassword: boolean;
}

export interface AppSettingsView {
  prestador: {
    cnpj: string;
    razaoSocial: string;
    codigoMunicipio: string;
    inscricaoMunicipal?: string;
    dpsSerie: string;
    certificadoAtivo: boolean;
  };
  prestadorOverrides: Pick<
    SettingsOverrides,
    'codigoMunicipio' | 'dpsSerie' | 'razaoSocial' | 'inscricaoMunicipal'
  >;
  integracao: {
    syncIntervalSec: number;
    cadastroEnabled: boolean;
    cadastroCacheTtlSec: number;
    govMock: boolean;
    govEndpoints: { sefin: string; adn: string };
  };
  integracaoOverrides: Pick<
    SettingsOverrides,
    'syncIntervalSec' | 'cadastroEnabled' | 'cadastroCacheTtlSec'
  >;
  ambiente: {
    value: Ambiente;
    editable: false;
    requiresRestart: true;
  };
  observabilidade: {
    logLevel: string;
  };
  observabilidadeOverrides: Pick<SettingsOverrides, 'logLevel'>;
  console: {
    webPasswordConfigured: boolean;
    webPasswordOverridden: boolean;
  };
  infra: {
    certPath?: string;
    certRequired: boolean;
    certPasswordConfigured: boolean;
    databaseConfigured: boolean;
    redisConfigured: boolean;
    rabbitmqConfigured: boolean;
    minioConfigured: boolean;
    hostPorts: {
      api: number;
      web: number;
      danfse: number;
      traefikDashboard: number;
      rabbitmqUi: number;
      minioConsole: number;
      postgres: number;
      grafana: number;
      prometheus: number;
    };
  };
  restartRequired: string[];
  updatedAt?: string;
}

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

export interface UpdateSettingsInput {
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;
  dpsSerie?: string;
  razaoSocial?: string;
  syncIntervalSec?: number;
  cadastroEnabled?: boolean;
  cadastroCacheTtlSec?: number;
  logLevel?: (typeof LOG_LEVELS)[number];
}

function parseUpdateInput(input: UpdateSettingsInput): UpdateSettingsInput {
  const result: UpdateSettingsInput = {};
  if (input.inscricaoMunicipal !== undefined) {
    if (input.inscricaoMunicipal.length > 20) throw new ValidationError('Inscrição municipal inválida');
    result.inscricaoMunicipal = input.inscricaoMunicipal;
  }
  if (input.codigoMunicipio !== undefined) {
    if (input.codigoMunicipio.length !== 7) throw new ValidationError('Código IBGE deve ter 7 dígitos');
    result.codigoMunicipio = input.codigoMunicipio;
  }
  if (input.dpsSerie !== undefined) {
    if (input.dpsSerie.length !== 5) throw new ValidationError('Série DPS deve ter 5 caracteres');
    result.dpsSerie = input.dpsSerie;
  }
  if (input.razaoSocial !== undefined) {
    if (!input.razaoSocial.trim()) throw new ValidationError('Razão social obrigatória');
    result.razaoSocial = input.razaoSocial.trim();
  }
  if (input.syncIntervalSec !== undefined) {
    if (input.syncIntervalSec < 30 || input.syncIntervalSec > 86400) {
      throw new ValidationError('Intervalo de sync deve estar entre 30 e 86400 segundos');
    }
    result.syncIntervalSec = input.syncIntervalSec;
  }
  if (input.cadastroEnabled !== undefined) result.cadastroEnabled = input.cadastroEnabled;
  if (input.cadastroCacheTtlSec !== undefined) {
    if (input.cadastroCacheTtlSec < 60 || input.cadastroCacheTtlSec > 604800) {
      throw new ValidationError('Cache TTL deve estar entre 60 e 604800 segundos');
    }
    result.cadastroCacheTtlSec = input.cadastroCacheTtlSec;
  }
  if (input.logLevel !== undefined) {
    if (!LOG_LEVELS.includes(input.logLevel)) throw new ValidationError('Nível de log inválido');
    result.logLevel = input.logLevel;
  }
  return result;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '****';
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function cod<K extends keyof SettingsOverrides>(
  overrides: SettingsOverrides,
  ...keys: K[]
): Pick<SettingsOverrides, K> {
  return Object.fromEntries(keys.map((k) => [k, overrides[k]])) as Pick<SettingsOverrides, K>;
}

export class SettingsService {
  private cache: SettingsRow | null = null;
  private cacheAt = 0;
  private readonly cacheTtlMs = 5000;

  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
    private readonly audit?: AuditLogger,
  ) {}

  async getRow(): Promise<SettingsRow | null> {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < this.cacheTtlMs) {
      return this.cache;
    }
    const rows = await this.db.select().from(schema.systemSettings).where(eq(schema.systemSettings.id, 1)).limit(1);
    this.cache = rows[0] ?? null;
    this.cacheAt = now;
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
    this.cacheAt = 0;
  }

  getOverrides(row: SettingsRow | null): SettingsOverrides {
    return {
      inscricaoMunicipal: row?.inscricaoMunicipal != null,
      codigoMunicipio: row?.codigoMunicipio != null,
      dpsSerie: row?.dpsSerie != null,
      razaoSocial: row?.razaoSocial != null,
      syncIntervalSec: row?.syncIntervalSec != null,
      cadastroEnabled: row?.cadastroEnabled != null,
      cadastroCacheTtlSec: row?.cadastroCacheTtlSec != null,
      logLevel: row?.logLevel != null,
      webPassword: row?.webPasswordHash != null,
    };
  }

  async getEffectivePrestador(): Promise<EffectivePrestadorConfig> {
    const row = await this.getRow();
    return this.mergePrestador(row);
  }

  /** Leitura síncrona a partir do cache — fallback para .env se cache vazio. */
  getEffectivePrestadorSync(): EffectivePrestadorConfig {
    return this.mergePrestador(this.cache);
  }

  private mergePrestador(row: SettingsRow | null): EffectivePrestadorConfig {
    return {
      codigoMunicipio: row?.codigoMunicipio ?? this.config.codigoMunicipio,
      dpsSerie: row?.dpsSerie ?? this.config.dpsSerie,
      razaoSocial: row?.razaoSocial ?? this.config.razaoSocial,
      inscricaoMunicipal: row?.inscricaoMunicipal ?? this.config.inscricaoMunicipal,
    };
  }

  async getEffectiveSyncIntervalSec(): Promise<number> {
    const row = await this.getRow();
    return row?.syncIntervalSec ?? this.config.syncIntervalSec;
  }

  getEffectiveSyncIntervalSecSync(): number {
    return this.cache?.syncIntervalSec ?? this.config.syncIntervalSec;
  }

  async isCadastroEnabled(): Promise<boolean> {
    const row = await this.getRow();
    return row?.cadastroEnabled ?? this.config.cadastroEnabled;
  }

  isCadastroEnabledSync(): boolean {
    return this.cache?.cadastroEnabled ?? this.config.cadastroEnabled;
  }

  async getEffectiveCadastroCacheTtlSec(): Promise<number> {
    const row = await this.getRow();
    return row?.cadastroCacheTtlSec ?? this.config.cadastroCacheTtlSec;
  }

  async getEffectiveLogLevel(): Promise<string> {
    const row = await this.getRow();
    return row?.logLevel ?? this.config.logLevel;
  }

  async verifyConsolePassword(password: string, envFallback: string): Promise<boolean> {
    const row = await this.getRow();
    if (row?.webPasswordHash) {
      return verifyPassword(password, row.webPasswordHash);
    }
    return password === envFallback;
  }

  async buildView(params: {
    cnpj: string;
    certificadoAtivo: boolean;
    env?: NodeJS.ProcessEnv;
  }): Promise<AppSettingsView> {
    const row = await this.getRow();
    const overrides = this.getOverrides(row);
    const prestador = await this.getEffectivePrestador();
    const env = params.env ?? process.env;

    const restartRequired: string[] = [];
    if (overrides.syncIntervalSec) restartRequired.push('syncIntervalSec');
    if (overrides.logLevel) restartRequired.push('logLevel');

    const hostPorts = {
      api: Number(env.NFSE_HOST_PORT_API ?? 18100),
      web: Number(env.NFSE_HOST_PORT_WEB ?? 18102),
      danfse: Number(env.NFSE_HOST_PORT_DANFSE ?? 18101),
      traefikDashboard: Number(env.NFSE_HOST_PORT_TRAEFIK_DASHBOARD ?? 18181),
      rabbitmqUi: Number(env.NFSE_HOST_PORT_RABBITMQ_UI ?? 18672),
      minioConsole: Number(env.NFSE_HOST_PORT_MINIO_CONSOLE ?? 19001),
      postgres: Number(env.NFSE_HOST_PORT_POSTGRES ?? 15432),
      grafana: Number(env.NFSE_HOST_PORT_GRAFANA ?? 18200),
      prometheus: Number(env.NFSE_HOST_PORT_PROMETHEUS ?? 19090),
    };

    return {
      prestador: {
        cnpj: params.cnpj,
        ...prestador,
        certificadoAtivo: params.certificadoAtivo,
      },
      prestadorOverrides: cod(overrides, 'codigoMunicipio', 'dpsSerie', 'razaoSocial', 'inscricaoMunicipal'),
      integracao: {
        syncIntervalSec: row?.syncIntervalSec ?? this.config.syncIntervalSec,
        cadastroEnabled: row?.cadastroEnabled ?? this.config.cadastroEnabled,
        cadastroCacheTtlSec: row?.cadastroCacheTtlSec ?? this.config.cadastroCacheTtlSec,
        govMock: this.config.govMock,
        govEndpoints: getGovEndpoints(this.config.ambiente),
      },
      integracaoOverrides: cod(overrides, 'syncIntervalSec', 'cadastroEnabled', 'cadastroCacheTtlSec'),
      ambiente: {
        value: this.config.ambiente,
        editable: false,
        requiresRestart: true,
      },
      observabilidade: {
        logLevel: row?.logLevel ?? this.config.logLevel,
      },
      observabilidadeOverrides: cod(overrides, 'logLevel'),
      console: {
        webPasswordConfigured: Boolean(row?.webPasswordHash || env.NFSE_WEB_PASSWORD),
        webPasswordOverridden: overrides.webPassword,
      },
      infra: {
        certPath: this.config.certPath,
        certRequired: this.config.certRequired ?? !this.config.govMock,
        certPasswordConfigured: Boolean(this.config.certPassword || this.config.certPasswordFile),
        databaseConfigured: Boolean(this.config.databaseUrl),
        redisConfigured: Boolean(this.config.redisUrl),
        rabbitmqConfigured: Boolean(this.config.rabbitmqUrl),
        minioConfigured: Boolean(this.config.minioEndpoint),
        hostPorts,
      },
      restartRequired,
      updatedAt: row?.updatedAt?.toISOString(),
    };
  }

  async update(input: UpdateSettingsInput, ip?: string): Promise<void> {
    const parsed = parseUpdateInput(input);
    await this.getRow();
    const changes: Record<string, unknown> = {};

    const fields = [
      'inscricaoMunicipal',
      'codigoMunicipio',
      'dpsSerie',
      'razaoSocial',
      'syncIntervalSec',
      'cadastroEnabled',
      'cadastroCacheTtlSec',
      'logLevel',
    ] as const;

    for (const field of fields) {
      if (parsed[field] !== undefined) {
        changes[field] = parsed[field];
      }
    }

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('Nenhum campo informado para atualização');
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, val] of Object.entries(changes)) {
      set[key] = val;
    }

    await this.db
      .insert(schema.systemSettings)
      .values({ id: 1, ...set })
      .onConflictDoUpdate({
        target: schema.systemSettings.id,
        set,
      });

    this.invalidateCache();
    await this.getRow();

    await this.audit?.log({
      action: 'SETTINGS_UPDATE',
      entity: 'system_settings',
      entityId: '1',
      metadata: changes,
      ip,
    });
  }

  async updateConsolePassword(
    currentPassword: string,
    newPassword: string,
    envFallback: string,
    ip?: string,
  ): Promise<void> {
    if (newPassword.length < 6) {
      throw new ValidationError('Nova senha deve ter no mínimo 6 caracteres');
    }

    const valid = await this.verifyConsolePassword(currentPassword, envFallback);
    if (!valid) {
      throw new ValidationError('Senha atual incorreta');
    }

    const webPasswordHash = hashPassword(newPassword);

    await this.db
      .insert(schema.systemSettings)
      .values({ id: 1, webPasswordHash, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.systemSettings.id,
        set: { webPasswordHash, updatedAt: new Date() },
      });

    this.invalidateCache();

    await this.audit?.log({
      action: 'CONSOLE_PASSWORD_UPDATE',
      entity: 'system_settings',
      entityId: '1',
      metadata: { hash: createHash('sha256').update(newPassword).digest('hex').slice(0, 8) },
      ip,
    });
  }

  async resetField(field: keyof UpdateSettingsInput, ip?: string): Promise<void> {
    const columnMap: Record<keyof UpdateSettingsInput, keyof SettingsRow | null> = {
      inscricaoMunicipal: 'inscricaoMunicipal',
      codigoMunicipio: 'codigoMunicipio',
      dpsSerie: 'dpsSerie',
      razaoSocial: 'razaoSocial',
      syncIntervalSec: 'syncIntervalSec',
      cadastroEnabled: 'cadastroEnabled',
      cadastroCacheTtlSec: 'cadastroCacheTtlSec',
      logLevel: 'logLevel',
    };

    const column = columnMap[field];
    if (!column) {
      throw new ValidationError('Campo não pode ser resetado');
    }

    await this.db
      .insert(schema.systemSettings)
      .values({ id: 1, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.systemSettings.id,
        set: { [column]: null, updatedAt: new Date() },
      });

    this.invalidateCache();

    await this.audit?.log({
      action: 'SETTINGS_RESET',
      entity: 'system_settings',
      entityId: '1',
      metadata: { field },
      ip,
    });
  }
}

export { maskUrl, hashPassword, verifyPassword };
