import { createHash } from 'node:crypto';
import { and, count, desc, eq, gte, like, lte, sum, type SQL } from 'drizzle-orm';
import type { AppConfig } from '@nfse/shared';
import { ConflictError, NotFoundError, ValidationError, GovApiError } from '@nfse/shared';
import type { ISefinGateway } from '@nfse/gov-client';
import {
  DpsStateMachine,
  NfseStateMachine,
  GeradorIdDps,
  ValidadorRegrasNegocio,
  EVENTO_CANCELAMENTO,
  applyEmissaoDefaults,
} from '@nfse/domain';
import type { EmitirNfseInput, CancelarNfseInput, SubstituirNfseInput, Nfse, EventoNfse } from '@nfse/domain';
import { DpsBuilder, EventoBuilder, gzipBase64, CertificadoProvider, dpsInfId, pedRegInfId } from '@nfse/xml';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { XmlStorage } from './storage/xml-storage.js';
import { IdempotencyStore, AuditLogger } from './repositories.js';
import { getNextDpsNumero } from './dps-sequence.js';
import { resolveEmitente } from './emitente-resolver.js';
import { CadastroEnrichmentService } from './cadastro-enrichment.js';
import type { SettingsService } from './settings-service.js';

export interface NfseAutorizadaResult {
  chaveAcesso: string;
  idDps: string;
  situacao: string;
  valorServico: number;
  emitidaEm: string;
  xmlUrl: string;
  pdfUrl: string;
}

export interface ListarNfseFiltros {
  situacao?: string;
  /** Trecho da chave de acesso (50 dígitos — padrão nacional). */
  chave?: string;
  /** Data inicial de emissão (ISO 8601 ou YYYY-MM-DD). */
  de?: string;
  /** Data final de emissão (ISO 8601 ou YYYY-MM-DD). */
  ate?: string;
  limit?: number;
  offset?: number;
}

export interface NfseListagemResult {
  total: number;
  items: Nfse[];
  resumo: {
    totalGeral: number;
    valorTotalGeral: number;
    porSituacao: { situacao: string; total: number }[];
    emitente: {
      cnpj: string;
      razaoSocial: string;
      codigoMunicipio: string;
      nomeMunicipio?: string;
      inscricaoMunicipal?: string;
      ambiente: string;
      certificadoAtivo: boolean;
    };
    certificado: {
      mock: boolean;
      cnpj?: string;
      validade?: string;
      diasParaExpirar?: number;
      clientAuth?: boolean;
    };
  };
}

export class NfseService {
  private readonly validador: ValidadorRegrasNegocio;
  private readonly dpsBuilder: DpsBuilder;
  private readonly eventoBuilder: EventoBuilder;
  private readonly certificado: CertificadoProvider;
  private readonly enrichment: CadastroEnrichmentService;

  constructor(
    private readonly db: Database,
    private readonly sefin: ISefinGateway,
    private readonly storage: XmlStorage,
    private readonly idempotency: IdempotencyStore,
    private readonly audit: AuditLogger,
    private readonly config: AppConfig,
    certificado?: CertificadoProvider,
    enrichment?: CadastroEnrichmentService,
    private readonly settings?: SettingsService,
  ) {
    this.validador = new ValidadorRegrasNegocio();
    this.dpsBuilder = new DpsBuilder();
    this.eventoBuilder = new EventoBuilder();
    this.certificado = certificado ?? CertificadoProvider.create({
      certPath: config.certPath,
      certPassword: config.certPassword,
      certPasswordFile: config.certPasswordFile,
      cnpj: config.cnpj,
      govMock: config.govMock,
      certRequired: config.certRequired,
    });
    this.enrichment = enrichment ?? new CadastroEnrichmentService(
      {
        consultarCnpj: async () => null,
        nomeMunicipio: async () => null,
        dadosMunicipio: async () => null,
      },
      false,
    );
  }

  async emitir(input: EmitirNfseInput, idempotencyKey?: string, ip?: string): Promise<NfseAutorizadaResult> {
    if (idempotencyKey) {
      const cached = await this.idempotency.get(idempotencyKey);
      if (cached) return cached as NfseAutorizadaResult;
    }

    const emitenteBase = this.emitente();
    const inputNormalizado = applyEmissaoDefaults(input, emitenteBase.optanteSimples);
    this.validador.validarEmissao(inputNormalizado);

    const { input: enrichedInput, emitente } = await this.enrichment.enriquecerEmissao(
      inputNormalizado,
      emitenteBase,
    );

    const numeroDps = String(await getNextDpsNumero(this.db));
    const idDps = this.gerarIdDps(emitente.cnpj, numeroDps);
    const payloadHash = createHash('sha256').update(JSON.stringify(enrichedInput)).digest('hex');

    const existing = await this.db.select().from(schema.dps).where(eq(schema.dps.idDps, idDps.toString())).limit(1);
    if (existing.length > 0 && existing[0]!.status === 'AUTORIZADA') {
      const nfseRow = await this.db.select().from(schema.nfse).where(eq(schema.nfse.idDps, idDps.toString())).limit(1);
      if (nfseRow[0]) {
        return this.toResult({
          chaveAcesso: nfseRow[0].chaveAcesso,
          idDps: nfseRow[0].idDps,
          situacao: nfseRow[0].situacao,
          valorServico: Number(nfseRow[0].valorServico),
          emitidaEm: nfseRow[0].emitidaEm,
        });
      }
    }

    let dpsXml = this.dpsBuilder.build({
      idDps: idDps.toString(),
      numeroDps,
      serie: this.prestadorConfig().dpsSerie,
      cnpjPrestador: emitente.cnpj,
      razaoSocial: emitente.razaoSocial,
      codigoMunicipio: emitente.codigoMunicipio,
      inscricaoMunicipal: emitente.inscricaoMunicipal,
      prestadorEmail: emitente.email,
      prestadorTelefone: emitente.telefone,
      input: enrichedInput,
      tpAmb: this.tpAmb(),
      optanteSimples: emitente.optanteSimples,
    });

    dpsXml = this.certificado.assinarXml(dpsXml, dpsInfId(idDps.toString()));
    const dpsXmlGZipB64 = gzipBase64(dpsXml);

    await this.db.insert(schema.dps).values({
      idDps: idDps.toString(),
      status: 'ENVIANDO',
      numeroDps,
      serie: this.prestadorConfig().dpsSerie,
      payloadHash,
      correlationId: enrichedInput.correlationId,
    }).onConflictDoNothing();

    const resultado = await this.sefin.emitir(dpsXmlGZipB64);

    const dpsKey = this.storage.buildNfseKey(resultado.chaveAcesso, 'dps');
    const nfseKey = this.storage.buildNfseKey(resultado.chaveAcesso, 'nfse');
    await this.storage.putXml(dpsKey, dpsXml);
    await this.storage.putXml(nfseKey, resultado.nfseXml);

    await this.db.update(schema.dps)
      .set({ status: 'AUTORIZADA', xmlStorageKey: dpsKey, updatedAt: new Date() })
      .where(eq(schema.dps.idDps, idDps.toString()));

    const nfseRow = {
      chaveAcesso: resultado.chaveAcesso,
      idDps: idDps.toString(),
      situacao: 'AUTORIZADA' as const,
      valorServico: String(enrichedInput.valores.valorServico),
      xmlStorageKey: nfseKey,
      emitidaEm: new Date(),
    };

    await this.db.insert(schema.nfse).values(nfseRow).onConflictDoNothing();

    await this.db.insert(schema.outbox).values({
      eventType: 'nfse.autorizada',
      payload: { chaveAcesso: resultado.chaveAcesso, idDps: idDps.toString() },
    });

    await this.audit.log({
      action: 'EMITIR_NFSE',
      entity: 'nfse',
      entityId: resultado.chaveAcesso,
      metadata: { idDps: idDps.toString(), valor: enrichedInput.valores.valorServico },
      ip,
    });

    const result = this.toResult({
      ...nfseRow,
      valorServico: enrichedInput.valores.valorServico,
    });

    if (idempotencyKey) {
      await this.idempotency.set(idempotencyKey, result);
    }

    return result;
  }

  async cancelar(input: CancelarNfseInput, ip?: string): Promise<{ chaveAcesso: string; situacao: string; evento: EventoNfse }> {
    const rows = await this.db.select().from(schema.nfse).where(eq(schema.nfse.chaveAcesso, input.chaveAcesso)).limit(1);
    const nfseRow = rows[0];
    if (!nfseRow) throw new NotFoundError('NFS-e', input.chaveAcesso);

    if (!NfseStateMachine.canTransition(nfseRow.situacao as Nfse['situacao'], 'CANCELADA')) {
      throw new ValidationError(`NFS-e não pode ser cancelada no status ${nfseRow.situacao}`);
    }

    const eventos = await this.db.select().from(schema.evento).where(eq(schema.evento.chaveAcesso, input.chaveAcesso));
    const sequencial = eventos.length + 1;

    let eventoXml = this.eventoBuilder.buildCancelamento({
      chaveAcesso: input.chaveAcesso,
      codigoMotivo: input.codigoMotivo,
      motivo: input.motivo,
      cnpj: this.emitente().cnpj,
      tpAmb: this.tpAmb(),
    });
    const evtId = pedRegInfId(input.chaveAcesso);
    eventoXml = this.certificado.assinarXml(eventoXml, evtId);

    const resultado = await this.sefin.registrarEvento(input.chaveAcesso, gzipBase64(eventoXml));

    if (resultado.status !== 'REGISTRADO') {
      throw new GovApiError(
        'Evento de cancelamento rejeitado pela SEFIN',
        'GOV_SEFIN_ERROR',
        400,
      );
    }

    const eventoKey = this.storage.buildNfseKey(input.chaveAcesso, 'evento', `${EVENTO_CANCELAMENTO}_${sequencial}`);
    await this.storage.putXml(eventoKey, resultado.xmlEvento);

    const [eventoRow] = await this.db.insert(schema.evento).values({
      chaveAcesso: input.chaveAcesso,
      tipo: EVENTO_CANCELAMENTO,
      sequencial,
      statusRegistro: resultado.status,
      xmlStorageKey: eventoKey,
      motivo: input.motivo,
    }).returning();

    await this.db.update(schema.nfse)
      .set({ situacao: 'CANCELADA', updatedAt: new Date() })
      .where(eq(schema.nfse.chaveAcesso, input.chaveAcesso));

    await this.db.update(schema.dps)
      .set({ status: DpsStateMachine.transition('AUTORIZADA', 'CANCELADA'), updatedAt: new Date() })
      .where(eq(schema.dps.idDps, nfseRow.idDps));

    await this.db.insert(schema.outbox).values({
      eventType: 'nfse.cancelada',
      payload: { chaveAcesso: input.chaveAcesso },
    });

    await this.audit.log({
      action: 'CANCELAR_NFSE',
      entity: 'nfse',
      entityId: input.chaveAcesso,
      metadata: { motivo: input.motivo },
      ip,
    });

    return {
      chaveAcesso: input.chaveAcesso,
      situacao: 'CANCELADA',
      evento: {
        id: eventoRow!.id,
        chaveAcesso: input.chaveAcesso,
        tipo: EVENTO_CANCELAMENTO,
        sequencial,
        statusRegistro: resultado.status,
        xmlStorageKey: eventoKey,
        motivo: input.motivo,
        createdAt: eventoRow!.createdAt,
      },
    };
  }

  async substituir(input: SubstituirNfseInput, idempotencyKey?: string, ip?: string): Promise<NfseAutorizadaResult> {
    const rows = await this.db.select().from(schema.nfse).where(eq(schema.nfse.chaveAcesso, input.chaveSubstituida)).limit(1);
    const original = rows[0];
    if (!original) throw new NotFoundError('NFS-e', input.chaveSubstituida);
    if (original.situacao !== 'AUTORIZADA') {
      throw new ConflictError('Apenas NFS-e autorizada pode ser substituída');
    }

    const emitenteBase = this.emitente();
    const emitInput: EmitirNfseInput = applyEmissaoDefaults(
      { ...input },
      emitenteBase.optanteSimples,
    );
    this.validador.validarEmissao(emitInput);
    const { input: enrichedInput, emitente } = await this.enrichment.enriquecerEmissao(
      emitInput,
      emitenteBase,
    );
    const numeroDps = String(await getNextDpsNumero(this.db));
    const idDps = this.gerarIdDps(emitente.cnpj, numeroDps);

    let dpsXml = this.dpsBuilder.build({
      idDps: idDps.toString(),
      numeroDps,
      serie: this.prestadorConfig().dpsSerie,
      cnpjPrestador: emitente.cnpj,
      razaoSocial: emitente.razaoSocial,
      codigoMunicipio: emitente.codigoMunicipio,
      inscricaoMunicipal: emitente.inscricaoMunicipal,
      prestadorEmail: emitente.email,
      prestadorTelefone: emitente.telefone,
      input: enrichedInput,
      chaveSubstituida: input.chaveSubstituida,
      tpAmb: this.tpAmb(),
      optanteSimples: emitente.optanteSimples,
    });

    dpsXml = this.certificado.assinarXml(dpsXml, dpsInfId(idDps.toString()));
    const resultado = await this.sefin.emitir(gzipBase64(dpsXml));

    const dpsKey = this.storage.buildNfseKey(resultado.chaveAcesso, 'dps');
    const nfseKey = this.storage.buildNfseKey(resultado.chaveAcesso, 'nfse');
    await this.storage.putXml(dpsKey, dpsXml);
    await this.storage.putXml(nfseKey, resultado.nfseXml);

    await this.db.insert(schema.dps).values({
      idDps: idDps.toString(),
      status: 'AUTORIZADA',
      numeroDps,
      serie: this.prestadorConfig().dpsSerie,
      chaveSubstituida: input.chaveSubstituida,
      xmlStorageKey: dpsKey,
    });

    await this.db.insert(schema.nfse).values({
      chaveAcesso: resultado.chaveAcesso,
      idDps: idDps.toString(),
      situacao: 'AUTORIZADA',
      valorServico: String(enrichedInput.valores.valorServico),
      xmlStorageKey: nfseKey,
      chaveSubstituida: input.chaveSubstituida,
    });

    await this.db.update(schema.nfse)
      .set({ situacao: 'SUBSTITUIDA', chaveSubstituta: resultado.chaveAcesso, updatedAt: new Date() })
      .where(eq(schema.nfse.chaveAcesso, input.chaveSubstituida));

    await this.audit.log({
      action: 'SUBSTITUIR_NFSE',
      entity: 'nfse',
      entityId: resultado.chaveAcesso,
      metadata: { chaveSubstituida: input.chaveSubstituida },
      ip,
    });

    const result = this.toResult({
      chaveAcesso: resultado.chaveAcesso,
      idDps: idDps.toString(),
      situacao: 'AUTORIZADA',
      valorServico: enrichedInput.valores.valorServico,
      emitidaEm: new Date(),
    });

    if (idempotencyKey) await this.idempotency.set(idempotencyKey, result);
    return result;
  }

  async consultar(chave: string, refresh = false): Promise<Nfse & { xml?: string }> {
    const rows = await this.db.select().from(schema.nfse).where(eq(schema.nfse.chaveAcesso, chave)).limit(1);
    let nfseRow = rows[0];
    if (!nfseRow) throw new NotFoundError('NFS-e', chave);

    let xml: string | undefined;
    if (refresh) {
      xml = await this.sefin.consultarNfse(chave);
      if (nfseRow.xmlStorageKey) {
        await this.storage.putXml(nfseRow.xmlStorageKey, xml);
      }
    } else if (nfseRow.xmlStorageKey) {
      xml = await this.storage.getXml(nfseRow.xmlStorageKey);
    }

    return {
      chaveAcesso: nfseRow.chaveAcesso,
      idDps: nfseRow.idDps,
      situacao: nfseRow.situacao as Nfse['situacao'],
      valorServico: Number(nfseRow.valorServico),
      xmlStorageKey: nfseRow.xmlStorageKey ?? undefined,
      chaveSubstituida: nfseRow.chaveSubstituida ?? undefined,
      chaveSubstituta: nfseRow.chaveSubstituta ?? undefined,
      emitidaEm: nfseRow.emitidaEm,
      createdAt: nfseRow.createdAt,
      updatedAt: nfseRow.updatedAt,
      xml,
    };
  }

  async listar(filtros: ListarNfseFiltros = {}): Promise<NfseListagemResult> {
    const where = this.buildNfseListWhere(filtros);
    const limit = Math.min(Math.max(filtros.limit ?? 25, 1), 100);
    const offset = Math.max(filtros.offset ?? 0, 0);

    const porSituacao = await this.db
      .select({ situacao: schema.nfse.situacao, total: count() })
      .from(schema.nfse)
      .groupBy(schema.nfse.situacao);

    const [valorRow] = await this.db
      .select({ total: sum(schema.nfse.valorServico) })
      .from(schema.nfse);

    const [totalGeralRow] = await this.db.select({ count: count() }).from(schema.nfse);

    let countQuery = this.db.select({ count: count() }).from(schema.nfse).$dynamic();
    let listQuery = this.db.select().from(schema.nfse).$dynamic();
    if (where) {
      countQuery = countQuery.where(where);
      listQuery = listQuery.where(where);
    }

    const [filteredCountRow] = await countQuery;
    const rows = await listQuery
      .orderBy(desc(schema.nfse.emitidaEm))
      .limit(limit)
      .offset(offset);

    const emitente = this.emitenteInfo();
    const cert = this.certificado.validade();

    return {
      total: Number(filteredCountRow?.count ?? 0),
      items: rows.map((r) => ({
        chaveAcesso: r.chaveAcesso,
        idDps: r.idDps,
        situacao: r.situacao as Nfse['situacao'],
        valorServico: Number(r.valorServico),
        xmlStorageKey: r.xmlStorageKey ?? undefined,
        chaveSubstituida: r.chaveSubstituida ?? undefined,
        chaveSubstituta: r.chaveSubstituta ?? undefined,
        emitidaEm: r.emitidaEm,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      resumo: {
        totalGeral: Number(totalGeralRow?.count ?? 0),
        valorTotalGeral: Number(valorRow?.total ?? 0),
        porSituacao: porSituacao.map((r) => ({
          situacao: r.situacao,
          total: Number(r.total),
        })),
        emitente: {
          cnpj: emitente.cnpj,
          razaoSocial: emitente.razaoSocial,
          codigoMunicipio: emitente.codigoMunicipio,
          nomeMunicipio: emitente.nomeMunicipio,
          inscricaoMunicipal: emitente.inscricaoMunicipal,
          ambiente: this.config.ambiente,
          certificadoAtivo: emitente.certificadoAtivo,
        },
        certificado: {
          mock: cert.mock,
          cnpj: cert.cnpj,
          validade: cert.validade.toISOString(),
          diasParaExpirar: cert.diasParaExpirar,
          clientAuth: cert.clientAuth,
        },
      },
    };
  }

  private buildNfseListWhere(filtros: ListarNfseFiltros): SQL | undefined {
    const conditions: SQL[] = [];

    if (filtros.situacao) {
      conditions.push(eq(schema.nfse.situacao, filtros.situacao));
    }

    const chaveDigits = filtros.chave?.replace(/\D/g, '') ?? '';
    if (chaveDigits.length > 0) {
      conditions.push(like(schema.nfse.chaveAcesso, `%${chaveDigits}%`));
    }

    if (filtros.de) {
      const de = new Date(filtros.de);
      if (!Number.isNaN(de.getTime())) {
        conditions.push(gte(schema.nfse.emitidaEm, de));
      }
    }

    if (filtros.ate) {
      const ate = new Date(filtros.ate);
      if (!Number.isNaN(ate.getTime())) {
        ate.setHours(23, 59, 59, 999);
        conditions.push(lte(schema.nfse.emitidaEm, ate));
      }
    }

    if (conditions.length === 0) return undefined;
    return and(...conditions);
  }

  async consultarDps(id: string): Promise<{ idDps: string; status: string; chaveAcesso?: string }> {
    const rows = await this.db.select().from(schema.dps).where(eq(schema.dps.idDps, id)).limit(1);
    if (rows.length > 0) {
      const dpsRow = rows[0]!;
      const nfseRows = await this.db.select().from(schema.nfse).where(eq(schema.nfse.idDps, id)).limit(1);
      return {
        idDps: id,
        status: dpsRow.status,
        chaveAcesso: nfseRows[0]?.chaveAcesso,
      };
    }

    const chave = await this.sefin.consultarDps(id);
    return { idDps: id, status: chave ? 'AUTORIZADA' : 'NAO_ENCONTRADA', chaveAcesso: chave ?? undefined };
  }

  async listarEventos(chave: string): Promise<EventoNfse[]> {
    const rows = await this.db.select().from(schema.evento).where(eq(schema.evento.chaveAcesso, chave));
    return rows.map((r) => ({
      id: r.id,
      chaveAcesso: r.chaveAcesso,
      tipo: r.tipo as EventoNfse['tipo'],
      sequencial: r.sequencial,
      statusRegistro: r.statusRegistro as EventoNfse['statusRegistro'],
      xmlStorageKey: r.xmlStorageKey ?? undefined,
      motivo: r.motivo ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  async getXml(chave: string): Promise<string> {
    const nfse = await this.consultar(chave);
    if (nfse.xml) return nfse.xml;
    throw new NotFoundError('XML', chave);
  }

  certificadoInfo() {
    return this.certificado.validade();
  }

  emitenteInfo() {
    const prestador = this.settings?.getEffectivePrestadorSync();
    return resolveEmitente(this.config, this.certificado.validade(), prestador);
  }

  private emitente() {
    return this.emitenteInfo();
  }

  private prestadorConfig() {
    return this.settings?.getEffectivePrestadorSync() ?? {
      codigoMunicipio: this.config.codigoMunicipio,
      dpsSerie: this.config.dpsSerie,
      razaoSocial: this.config.razaoSocial,
      inscricaoMunicipal: this.config.inscricaoMunicipal,
    };
  }

  private gerarIdDps(cnpj: string, numeroDps: string) {
    const p = this.prestadorConfig();
    return new GeradorIdDps(p.codigoMunicipio, cnpj, p.dpsSerie).gerar(numeroDps);
  }

  private tpAmb(): '1' | '2' {
    return this.config.ambiente === 'prod' ? '1' : '2';
  }

  private toResult(row: { chaveAcesso: string; idDps: string; situacao: string; valorServico: number; emitidaEm: Date }): NfseAutorizadaResult {
    return {
      chaveAcesso: row.chaveAcesso,
      idDps: row.idDps,
      situacao: row.situacao,
      valorServico: Number(row.valorServico),
      emitidaEm: row.emitidaEm.toISOString(),
      xmlUrl: `/v1/nfse/${row.chaveAcesso}/xml`,
      pdfUrl: `/v1/nfse/${row.chaveAcesso}/danfse`,
    };
  }
}
