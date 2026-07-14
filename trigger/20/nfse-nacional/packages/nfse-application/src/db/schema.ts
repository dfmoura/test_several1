import { pgTable, uuid, varchar, text, timestamp, boolean, numeric, jsonb, integer } from 'drizzle-orm/pg-core';

export const dps = pgTable('dps', {
  id: uuid('id').primaryKey().defaultRandom(),
  idDps: varchar('id_dps', { length: 43 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('RASCUNHO'),
  numeroDps: varchar('numero_dps', { length: 15 }).notNull(),
  serie: varchar('serie', { length: 5 }).notNull(),
  xmlStorageKey: text('xml_storage_key'),
  payloadHash: varchar('payload_hash', { length: 64 }),
  correlationId: varchar('correlation_id', { length: 64 }),
  chaveSubstituida: varchar('chave_substituida', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nfse = pgTable('nfse', {
  chaveAcesso: varchar('chave_acesso', { length: 50 }).primaryKey(),
  idDps: varchar('id_dps', { length: 43 }).notNull().references(() => dps.idDps),
  situacao: varchar('situacao', { length: 20 }).notNull().default('AUTORIZADA'),
  valorServico: numeric('valor_servico', { precision: 15, scale: 2 }).notNull(),
  xmlStorageKey: text('xml_storage_key'),
  chaveSubstituida: varchar('chave_substituida', { length: 50 }),
  chaveSubstituta: varchar('chave_substituta', { length: 50 }),
  emitidaEm: timestamp('emitida_em', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const evento = pgTable('evento', {
  id: uuid('id').primaryKey().defaultRandom(),
  chaveAcesso: varchar('chave_acesso', { length: 50 }).notNull().references(() => nfse.chaveAcesso),
  tipo: varchar('tipo', { length: 10 }).notNull(),
  sequencial: integer('sequencial').notNull(),
  statusRegistro: varchar('status_registro', { length: 20 }).notNull(),
  xmlStorageKey: text('xml_storage_key'),
  motivo: text('motivo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dfeRecebido = pgTable('dfe_recebido', {
  id: uuid('id').primaryKey().defaultRandom(),
  nsu: varchar('nsu', { length: 20 }).notNull().unique(),
  tipoDfe: varchar('tipo_dfe', { length: 10 }).notNull(),
  chave: varchar('chave', { length: 50 }).notNull(),
  xmlStorageKey: text('xml_storage_key'),
  metadata: jsonb('metadata'),
  processado: boolean('processado').default(false).notNull(),
  recebidoEm: timestamp('recebido_em', { withTimezone: true }).defaultNow().notNull(),
});

export const nsuControle = pgTable('nsu_controle', {
  id: integer('id').primaryKey().default(1),
  ultimoNsu: varchar('ultimo_nsu', { length: 20 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const idempotency = pgTable('idempotency', {
  key: varchar('key', { length: 64 }).primaryKey(),
  response: jsonb('response').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  published: boolean('published').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 50 }).notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  metadata: jsonb('metadata'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const parametrosMunicipio = pgTable('parametros_municipio', {
  codigoIbge: varchar('codigo_ibge', { length: 7 }).primaryKey(),
  convenioAtivo: boolean('convenio_ativo').notNull(),
  aliquotas: jsonb('aliquotas').notNull().default({}),
  cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const dpsNumeroSeq = pgTable('dps_numero_seq', {
  id: integer('id').primaryKey().default(1),
  ultimoNumero: integer('ultimo_numero').notNull().default(0),
});

/** Configurações editáveis via console — sobrescrevem .env em runtime (linha única id=1). */
export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey().default(1),
  inscricaoMunicipal: varchar('inscricao_municipal', { length: 20 }),
  codigoMunicipio: varchar('codigo_municipio', { length: 7 }),
  dpsSerie: varchar('dps_serie', { length: 5 }),
  razaoSocial: varchar('razao_social', { length: 255 }),
  syncIntervalSec: integer('sync_interval_sec'),
  cadastroEnabled: boolean('cadastro_enabled'),
  cadastroCacheTtlSec: integer('cadastro_cache_ttl_sec'),
  logLevel: varchar('log_level', { length: 10 }),
  webPasswordHash: varchar('web_password_hash', { length: 128 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
