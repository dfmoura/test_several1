import { and, count, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { AppConfig } from '@nfse/shared';
import { NotFoundError } from '@nfse/shared';
import { parseNfseXml } from '@nfse/xml';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import type { XmlStorage } from './storage/xml-storage.js';

export interface DfeNfseMetadata {
  prestadorCnpj?: string;
  prestadorCpf?: string;
  prestadorRazaoSocial?: string;
  tomadorCnpj?: string;
  tomadorCpf?: string;
  tomadorRazaoSocial?: string;
  valorServico?: number;
  emitidaEm?: string;
  situacao?: string;
  discriminacao?: string;
}

export interface NfseRecebida {
  chave: string;
  nsu: string;
  tipoDfe: string;
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  tomadorCnpj: string;
  tomadorRazaoSocial?: string;
  valorServico: number;
  emitidaEm?: string;
  situacao?: string;
  recebidoEm: string;
  processado: boolean;
}

export interface NfseRecebidasListagem {
  total: number;
  items: NfseRecebida[];
  resumo: {
    cnpjTomador: string;
    totalGeral: number;
    valorTotalGeral: number;
    ultimoNsu?: string;
    fonte: 'ADN';
  };
}

export class DfeRecebidasService {
  constructor(
    private readonly db: Database,
    private readonly storage: XmlStorage,
    private readonly config: AppConfig,
    private readonly cnpjTomadorResolver?: () => string,
  ) {}

  private cnpjTomador(): string {
    return (this.cnpjTomadorResolver?.() ?? this.config.cnpj).replace(/\D/g, '');
  }

  async listar(filtros: {
    chave?: string;
    de?: string;
    ate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<NfseRecebidasListagem> {
    const cnpjTomador = this.cnpjTomador();
    const limit = Math.min(Math.max(filtros.limit ?? 25, 1), 100);
    const offset = Math.max(filtros.offset ?? 0, 0);

    await this.enriquecerMetadadosPendentes();

    const tomadorMatch = sql`${schema.dfeRecebido.metadata}->>'tomadorCnpj' = ${cnpjTomador}`;
    const prestadorExterno = sql`${schema.dfeRecebido.metadata}->>'prestadorCnpj' IS DISTINCT FROM ${cnpjTomador}`;

    const conditions = [tomadorMatch, prestadorExterno];

    if (filtros.chave) {
      const digits = filtros.chave.replace(/\D/g, '');
      if (digits) {
        conditions.push(sql`${schema.dfeRecebido.chave} LIKE ${'%' + digits + '%'}`);
      }
    }

    if (filtros.de) {
      const de = new Date(filtros.de);
      if (!Number.isNaN(de.getTime())) {
        conditions.push(sql`(${schema.dfeRecebido.metadata}->>'emitidaEm')::timestamptz >= ${de.toISOString()}`);
      }
    }

    if (filtros.ate) {
      const ate = new Date(filtros.ate);
      if (!Number.isNaN(ate.getTime())) {
        ate.setHours(23, 59, 59, 999);
        conditions.push(sql`(${schema.dfeRecebido.metadata}->>'emitidaEm')::timestamptz <= ${ate.toISOString()}`);
      }
    }

    const where = and(...conditions);

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(schema.dfeRecebido)
      .where(where);

    const rows = await this.db
      .select()
      .from(schema.dfeRecebido)
      .where(where)
      .orderBy(desc(schema.dfeRecebido.recebidoEm))
      .limit(limit)
      .offset(offset);

    const allTomadorRows = await this.db
      .select({ metadata: schema.dfeRecebido.metadata })
      .from(schema.dfeRecebido)
      .where(and(tomadorMatch, prestadorExterno));

    let valorTotalGeral = 0;
    for (const r of allTomadorRows) {
      const meta = r.metadata as DfeNfseMetadata | null;
      valorTotalGeral += Number(meta?.valorServico ?? 0);
    }

    const [nsuRow] = await this.db.select().from(schema.nsuControle).limit(1);

    return {
      total: Number(totalRow?.count ?? 0),
      items: rows.map((r) => this.toRecebida(r)),
      resumo: {
        cnpjTomador,
        totalGeral: allTomadorRows.length,
        valorTotalGeral,
        ultimoNsu: nsuRow?.ultimoNsu,
        fonte: 'ADN',
      },
    };
  }

  async consultar(chave: string): Promise<NfseRecebida & { xmlStorageKey?: string }> {
    const cnpjTomador = this.cnpjTomador();
    const rows = await this.db
      .select()
      .from(schema.dfeRecebido)
      .where(eq(schema.dfeRecebido.chave, chave))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundError('NFS-e recebida', chave);
    }

    const row = rows[0]!;
    const meta = await this.resolveMetadata(row);
    const tomadorCnpj = meta.tomadorCnpj?.replace(/\D/g, '');
    const prestadorCnpj = meta.prestadorCnpj?.replace(/\D/g, '');

    if (tomadorCnpj !== cnpjTomador || prestadorCnpj === cnpjTomador) {
      throw new NotFoundError('NFS-e recebida para este CNPJ', chave);
    }

    return {
      ...this.toRecebida({ ...row, metadata: meta }),
      xmlStorageKey: row.xmlStorageKey ?? undefined,
    };
  }

  async getXml(chave: string): Promise<string> {
    const item = await this.consultar(chave);
    if (!item.xmlStorageKey) {
      throw new NotFoundError('XML recebido', chave);
    }
    return this.storage.getXml(item.xmlStorageKey);
  }

  static extractMetadata(xml: string, chave?: string): DfeNfseMetadata | null {
    try {
      const doc = parseNfseXml(xml, chave);
      return {
        prestadorCnpj: doc.prestador.cnpj?.replace(/\D/g, ''),
        prestadorCpf: doc.prestador.cpf?.replace(/\D/g, ''),
        prestadorRazaoSocial: doc.prestador.razaoSocial,
        tomadorCnpj: doc.tomador.cnpj?.replace(/\D/g, ''),
        tomadorCpf: doc.tomador.cpf?.replace(/\D/g, ''),
        tomadorRazaoSocial: doc.tomador.razaoSocial,
        valorServico: doc.valores.valorServico,
        emitidaEm: doc.dhEmi ?? doc.dhProc,
        situacao: doc.situacao ?? 'AUTORIZADA',
        discriminacao: doc.servico.discriminacao ?? doc.servico.descricao,
      };
    } catch {
      return null;
    }
  }

  private async enriquecerMetadadosPendentes(): Promise<void> {
    const pendentes = await this.db
      .select()
      .from(schema.dfeRecebido)
      .where(
        or(
          isNull(schema.dfeRecebido.metadata),
          sql`${schema.dfeRecebido.metadata}->>'tomadorCnpj' IS NULL`,
          sql`${schema.dfeRecebido.metadata}->>'prestadorCnpj' IS NULL`,
        ),
      )
      .limit(50);

    for (const row of pendentes) {
      if (!row.xmlStorageKey) continue;
      try {
        const xml = await this.storage.getXml(row.xmlStorageKey);
        const meta = DfeRecebidasService.extractMetadata(xml, row.chave);
        if (meta) {
          await this.db
            .update(schema.dfeRecebido)
            .set({ metadata: meta })
            .where(eq(schema.dfeRecebido.id, row.id));
        }
      } catch {
        // ignora documentos ilegíveis
      }
    }
  }

  private async resolveMetadata(row: typeof schema.dfeRecebido.$inferSelect): Promise<DfeNfseMetadata> {
    if (row.metadata && typeof row.metadata === 'object') {
      return row.metadata as DfeNfseMetadata;
    }
    if (!row.xmlStorageKey) return {};
    const xml = await this.storage.getXml(row.xmlStorageKey);
    const meta = DfeRecebidasService.extractMetadata(xml, row.chave) ?? {};
    await this.db
      .update(schema.dfeRecebido)
      .set({ metadata: meta })
      .where(eq(schema.dfeRecebido.id, row.id));
    return meta;
  }

  private toRecebida(row: {
    nsu: string;
    tipoDfe: string;
    chave: string;
    metadata: unknown;
    recebidoEm: Date;
    processado: boolean;
  }): NfseRecebida {
    const meta = (row.metadata ?? {}) as DfeNfseMetadata;
    return {
      chave: row.chave,
      nsu: row.nsu,
      tipoDfe: row.tipoDfe,
      prestadorCnpj: meta.prestadorCnpj ?? meta.prestadorCpf ?? '',
      prestadorRazaoSocial: meta.prestadorRazaoSocial ?? 'Prestador não identificado',
      tomadorCnpj: meta.tomadorCnpj ?? meta.tomadorCpf ?? '',
      tomadorRazaoSocial: meta.tomadorRazaoSocial,
      valorServico: Number(meta.valorServico ?? 0),
      emitidaEm: meta.emitidaEm,
      situacao: meta.situacao ?? 'AUTORIZADA',
      recebidoEm: row.recebidoEm.toISOString(),
      processado: row.processado,
    };
  }
}
