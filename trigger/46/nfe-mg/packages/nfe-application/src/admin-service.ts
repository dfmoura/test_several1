import { count, desc, eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '@nfe/shared';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export class AdminService {
  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  async dashboard(emitenteId?: string) {
    const nfeWhere = emitenteId ? eq(schema.nfe.emitenteId, emitenteId) : undefined;
    const [nfeTotal] = await this.db.select({ count: count() }).from(schema.nfe).where(nfeWhere);
    const [emitTotal] = await this.db.select({ count: count() }).from(schema.emitente);
    const [outboxPending] = await this.db.select({ count: count() }).from(schema.outbox).where(eq(schema.outbox.published, false));
    const [lotePend] = await this.db.select({ count: count() }).from(schema.lote).where(eq(schema.lote.status, 'PROCESSANDO'));

    const porSituacao = await this.db
      .select({ situacao: schema.nfe.situacao, total: count() })
      .from(schema.nfe)
      .where(nfeWhere)
      .groupBy(schema.nfe.situacao);

    const recentes = await this.db.select().from(schema.nfe)
      .where(nfeWhere)
      .orderBy(desc(schema.nfe.dhEmi))
      .limit(8);

    const ultimosEventos = await this.db.select().from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(8);

    const emitentes = await this.db.select().from(schema.emitente).where(eq(schema.emitente.ativo, true));

    return {
      totais: {
        nfe: Number(nfeTotal?.count ?? 0),
        emitentes: Number(emitTotal?.count ?? 0),
        outboxPendente: Number(outboxPending?.count ?? 0),
        lotesProcessando: Number(lotePend?.count ?? 0),
      },
      nfePorSituacao: porSituacao.map((r) => ({ situacao: r.situacao, total: Number(r.total) })),
      nfeRecentes: recentes.map((r) => ({
        chaveAcesso: r.chaveAcesso,
        situacao: r.situacao,
        numero: r.numero,
        serie: r.serie,
        valorNf: Number(r.valorNf),
        dhEmi: r.dhEmi.toISOString(),
      })),
      ultimosEventos: ultimosEventos.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        createdAt: r.createdAt.toISOString(),
      })),
      certificados: emitentes.map((e) => {
        const dias = e.certValidade
          ? Math.floor((e.certValidade.getTime() - Date.now()) / 86_400_000)
          : null;
        return {
          emitenteId: e.id,
          apelido: e.apelido,
          cnpj: e.cnpj,
          presente: Boolean(e.certStorageKey),
          diasParaExpirar: dias,
        };
      }),
    };
  }

  async configPublica() {
    return {
      ambiente: this.config.ambiente,
      sefazMock: this.config.sefazMock,
      uf: this.config.uf,
      cUF: this.config.cUF,
      modelo: '55',
      layout: '4.00',
    };
  }

  async audit(limit = 50, offset = 0) {
    const [total] = await this.db.select({ count: count() }).from(schema.auditLog);
    const items = await this.db.select().from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset);
    return { total: Number(total?.count ?? 0), items };
  }

  async outbox(limit = 50, offset = 0, published?: boolean) {
    const where = published === undefined ? undefined : eq(schema.outbox.published, published);
    const [total] = await this.db.select({ count: count() }).from(schema.outbox).where(where);
    const items = await this.db.select().from(schema.outbox)
      .where(where)
      .orderBy(desc(schema.outbox.createdAt))
      .limit(limit)
      .offset(offset);
    return { total: Number(total?.count ?? 0), items };
  }

  async lotes(limit = 50, offset = 0) {
    const [total] = await this.db.select({ count: count() }).from(schema.lote);
    const items = await this.db.select().from(schema.lote)
      .orderBy(desc(schema.lote.createdAt))
      .limit(limit)
      .offset(offset);
    return { total: Number(total?.count ?? 0), items };
  }

  async inutilizacoes(emitenteId: string, limit = 50, offset = 0) {
    const where = eq(schema.inutilizacao.emitenteId, emitenteId);
    const [total] = await this.db.select({ count: count() }).from(schema.inutilizacao).where(where);
    const items = await this.db.select().from(schema.inutilizacao)
      .where(where)
      .orderBy(desc(schema.inutilizacao.createdAt))
      .limit(limit)
      .offset(offset);
    return { total: Number(total?.count ?? 0), items };
  }

  async consoleAuth(password: string): Promise<{ ok: boolean }> {
    const rows = await this.db.select().from(schema.systemSettings).where(eq(schema.systemSettings.id, 1)).limit(1);
    const hash = rows[0]?.webPasswordHash;
    if (!hash) return { ok: false };
    const given = hashPassword(password);
    if (hash.length !== given.length) return { ok: false };
    return { ok: timingSafeEqual(Buffer.from(hash), Buffer.from(given)) };
  }
}
