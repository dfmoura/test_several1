import { count, desc, eq } from 'drizzle-orm';
import type { AppConfig } from '@nfse/shared';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { NsuControleRepository } from './repositories.js';
import type { EmitenteResolvido } from './emitente-resolver.js';
import type { SettingsService } from './settings-service.js';

export class AdminService {
  private readonly nsuRepo: NsuControleRepository;

  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
    private readonly settings?: SettingsService,
  ) {
    this.nsuRepo = new NsuControleRepository(db);
  }

  async dashboard() {
    const [nfseTotal] = await this.db.select({ count: count() }).from(schema.nfse);
    const [dpsTotal] = await this.db.select({ count: count() }).from(schema.dps);
    const [dfeTotal] = await this.db.select({ count: count() }).from(schema.dfeRecebido);
    const [outboxPending] = await this.db
      .select({ count: count() })
      .from(schema.outbox)
      .where(eq(schema.outbox.published, false));
    const [dfePendente] = await this.db
      .select({ count: count() })
      .from(schema.dfeRecebido)
      .where(eq(schema.dfeRecebido.processado, false));

    const porSituacao = await this.db
      .select({ situacao: schema.nfse.situacao, total: count() })
      .from(schema.nfse)
      .groupBy(schema.nfse.situacao);

    const porDpsStatus = await this.db
      .select({ status: schema.dps.status, total: count() })
      .from(schema.dps)
      .groupBy(schema.dps.status);

    const recentes = await this.db
      .select()
      .from(schema.nfse)
      .orderBy(desc(schema.nfse.emitidaEm))
      .limit(5);

    const ultimosEventos = await this.db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(8);

    return {
      totais: {
        nfse: Number(nfseTotal?.count ?? 0),
        dps: Number(dpsTotal?.count ?? 0),
        dfe: Number(dfeTotal?.count ?? 0),
        outboxPendente: Number(outboxPending?.count ?? 0),
        dfePendente: Number(dfePendente?.count ?? 0),
      },
      nfsePorSituacao: porSituacao.map((r) => ({
        situacao: r.situacao,
        total: Number(r.total),
      })),
      dpsPorStatus: porDpsStatus.map((r) => ({
        status: r.status,
        total: Number(r.total),
      })),
      nfseRecentes: recentes.map((r) => ({
        chaveAcesso: r.chaveAcesso,
        situacao: r.situacao,
        valorServico: Number(r.valorServico),
        emitidaEm: r.emitidaEm.toISOString(),
      })),
      ultimosEventos: ultimosEventos.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listarAuditoria(limit = 50, offset = 0) {
    const rows = await this.db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset);
    const [totalRow] = await this.db.select({ count: count() }).from(schema.auditLog);
    return {
      total: Number(totalRow?.count ?? 0),
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        metadata: r.metadata,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listarOutbox(limit = 50, offset = 0, published?: boolean) {
    let query = this.db.select().from(schema.outbox).$dynamic();
    if (published !== undefined) {
      query = query.where(eq(schema.outbox.published, published));
    }
    const rows = await query.orderBy(desc(schema.outbox.createdAt)).limit(limit).offset(offset);
    const [totalRow] = await this.db.select({ count: count() }).from(schema.outbox);
    return {
      total: Number(totalRow?.count ?? 0),
      items: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        payload: r.payload,
        published: r.published,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listarDfe(limit = 50, offset = 0, processado?: boolean) {
    let query = this.db.select().from(schema.dfeRecebido).$dynamic();
    if (processado !== undefined) {
      query = query.where(eq(schema.dfeRecebido.processado, processado));
    }
    const rows = await query.orderBy(desc(schema.dfeRecebido.recebidoEm)).limit(limit).offset(offset);
    const [totalRow] = await this.db.select({ count: count() }).from(schema.dfeRecebido);
    return {
      total: Number(totalRow?.count ?? 0),
      items: rows.map((r) => ({
        id: r.id,
        nsu: r.nsu,
        tipoDfe: r.tipoDfe,
        chave: r.chave,
        processado: r.processado,
        recebidoEm: r.recebidoEm.toISOString(),
      })),
    };
  }

  async listarDps(limit = 50, offset = 0, status?: string) {
    let query = this.db.select().from(schema.dps).$dynamic();
    if (status) {
      query = query.where(eq(schema.dps.status, status));
    }
    const rows = await query.orderBy(desc(schema.dps.createdAt)).limit(limit).offset(offset);
    const [totalRow] = await this.db.select({ count: count() }).from(schema.dps);
    return {
      total: Number(totalRow?.count ?? 0),
      items: rows.map((r) => ({
        id: r.id,
        idDps: r.idDps,
        status: r.status,
        numeroDps: r.numeroDps,
        serie: r.serie,
        correlationId: r.correlationId,
        chaveSubstituida: r.chaveSubstituida,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async nsuStatus() {
    const ultimoNsu = await this.nsuRepo.getUltimoNsu();
    const [dfePendente] = await this.db
      .select({ count: count() })
      .from(schema.dfeRecebido)
      .where(eq(schema.dfeRecebido.processado, false));
    const syncIntervalSec = this.settings
      ? await this.settings.getEffectiveSyncIntervalSec()
      : this.config.syncIntervalSec;
    return {
      ultimoNsu,
      dfePendente: Number(dfePendente?.count ?? 0),
      syncIntervalSec,
    };
  }

  configPublica(emitente?: EmitenteResolvido | null) {
    const prestador = this.settings?.getEffectivePrestadorSync();
    return {
      ambiente: this.config.ambiente,
      cnpj: emitente?.cnpj ?? this.config.cnpj,
      razaoSocial: emitente?.razaoSocial ?? prestador?.razaoSocial ?? this.config.razaoSocial,
      codigoMunicipio: prestador?.codigoMunicipio ?? emitente?.codigoMunicipio ?? this.config.codigoMunicipio,
      nomeMunicipio: emitente?.nomeMunicipio,
      dpsSerie: prestador?.dpsSerie ?? this.config.dpsSerie,
      /** IM do prestador — .env ou override via console. */
      inscricaoMunicipal: prestador?.inscricaoMunicipal ?? emitente?.inscricaoMunicipal ?? this.config.inscricaoMunicipal,
      nomeFantasia: emitente?.nomeFantasia,
      situacaoCadastral: emitente?.situacaoCadastral,
      email: emitente?.email,
      telefone: emitente?.telefone,
      endereco: emitente?.endereco,
      porte: emitente?.porte,
      naturezaJuridica: emitente?.naturezaJuridica,
      dataAbertura: emitente?.dataAbertura,
      tipoEstabelecimento: emitente?.tipoEstabelecimento,
      optanteSimples: emitente?.optanteSimples,
      atividadePrincipal: emitente?.atividadePrincipal,
      fonteCadastro: emitente?.fonteCadastro,
      govMock: this.config.govMock,
      syncIntervalSec: this.settings?.getEffectiveSyncIntervalSecSync() ?? this.config.syncIntervalSec,
      cadastroEnabled: this.settings?.isCadastroEnabledSync() ?? this.config.cadastroEnabled,
      certificadoAtivo: emitente?.certificadoAtivo ?? false,
    };
  }
}
