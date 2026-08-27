import { createHash } from 'node:crypto';
import { and, count, desc, eq, gte, like, lte, sum } from 'drizzle-orm';
import type { AppConfig } from '@nfe/shared';
import { NotFoundError, ValidationError, ConflictError, onlyDigits } from '@nfe/shared';
import { createSefazGateway } from '@nfe/sefaz-client';
import {
  ValidadorRegrasNegocio,
  NfeStateMachine,
  gerarChaveAcesso,
  gerarCNF,
  aammFromDate,
  round2,
  EVENTO_CANCELAMENTO,
  EVENTO_CCE,
  situacaoFromCStat,
  type EmitirNfeInput,
  type CancelarNfeInput,
  type CceInput,
  type InutilizarInput,
} from '@nfe/domain';
import {
  NfeBuilder,
  EventoBuilder,
  InutilizacaoBuilder,
  wrapEnviNFe,
  wrapProcNFe,
  nfeInfId,
  eventoInfId,
  inutInfId,
  formatDhEmiBr,
} from '@nfe/xml';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { XmlStorage } from './storage/xml-storage.js';
import { IdempotencyStore, AuditLogger } from './repositories.js';
import { EmitenteService } from './emitente-service.js';

export interface NfeAutorizadaResult {
  id: string;
  chaveAcesso: string;
  situacao: string;
  serie: number;
  numero: number;
  nProt?: string;
  nRec?: string;
  cStat?: string;
  xMotivo?: string;
  valorNf: number;
  dhEmi: string;
  xmlUrl: string;
  pdfUrl: string;
}

export class NfeService {
  private readonly validador = new ValidadorRegrasNegocio();
  private readonly builder = new NfeBuilder();
  private readonly eventoBuilder = new EventoBuilder();
  private readonly inutBuilder = new InutilizacaoBuilder();

  constructor(
    private readonly db: Database,
    private readonly storage: XmlStorage,
    private readonly idempotency: IdempotencyStore,
    private readonly audit: AuditLogger,
    private readonly emitentes: EmitenteService,
    private readonly config: AppConfig,
  ) {}

  async emitir(emitenteId: string, input: EmitirNfeInput, idempotencyKey?: string, ip?: string): Promise<NfeAutorizadaResult> {
    if (idempotencyKey) {
      const cached = await this.idempotency.get(idempotencyKey);
      if (cached) return cached as NfeAutorizadaResult;
    }

    const emitente = await this.emitentes.obterDominio(emitenteId);
    this.validador.validarEmissao(input, emitente.crt);

    const ambiente = emitente.ambiente === 'prod' ? 'prod' : 'homolog';
    const tpAmb = ambiente === 'prod' ? '1' as const : '2' as const;
    const serie = input.serie ?? emitente.seriePadrao;
    const numero = await this.emitentes.nextNumero(emitenteId, serie, ambiente);
    const now = new Date();
    const cNF = gerarCNF();
    const chave = gerarChaveAcesso({
      aamm: aammFromDate(now),
      cnpj: emitente.cnpj,
      serie,
      numero,
      cNF,
    });
    const cDV = chave.slice(-1);
    const valorNf = round2(input.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0));

    let xml = this.builder.build({
      chaveAcesso: chave,
      cNF,
      cDV,
      serie,
      numero,
      emitente,
      input,
      tpAmb,
      dhEmi: now,
    });

    const signer = await this.emitentes.signerFor(emitenteId);
    xml = signer.assinarXml(xml, nfeInfId(chave));
    const envi = wrapEnviNFe(xml, String(Date.now()).slice(-15), '1');

    const [inserted] = await this.db.insert(schema.nfe).values({
      emitenteId,
      chaveAcesso: chave,
      situacao: 'ENVIANDO',
      serie,
      numero,
      naturezaOperacao: input.naturezaOperacao.slice(0, 60),
      tpAmb,
      destCpfCnpj: onlyDigits(input.destinatario.cpfCnpj),
      destRazaoSocial: input.destinatario.razaoSocial,
      valorProdutos: String(valorNf),
      valorNf: String(valorNf),
      dhEmi: now,
      payloadHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      correlationId: input.correlationId,
    }).returning();

    if (!inserted) throw new ConflictError('Falha ao persistir NF-e (possível duplicidade de numeração)');

    for (const [i, item] of input.itens.entries()) {
      await this.db.insert(schema.nfeItem).values({
        nfeId: inserted.id,
        nItem: i + 1,
        produtoId: item.produtoId,
        codigo: item.codigo,
        descricao: item.descricao.slice(0, 120),
        ncm: onlyDigits(item.ncm).slice(0, 8),
        cfop: item.cfop,
        unidade: item.unidade,
        quantidade: String(item.quantidade),
        valorUnitario: String(item.valorUnitario),
        valorTotal: String(round2(item.quantidade * item.valorUnitario)),
        origem: item.origem ?? '0',
        csosn: item.csosn,
        cst: item.cst,
        cest: item.cest,
      });
    }

    const xmlKey = this.storage.buildNfeKey(chave, 'nfe');
    await this.storage.putXml(xmlKey, xml);

    const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
    const resultado = await sefaz.autorizar(envi, tpAmb);

    let situacao = NfeStateMachine.transition('ENVIANDO', situacaoFromCStat(resultado.cStat) === 'PROCESSANDO' ? 'PROCESSANDO' : situacaoFromCStat(resultado.cStat) === 'AUTORIZADA' ? 'AUTORIZADA' : situacaoFromCStat(resultado.cStat));
    if (resultado.modo === 'recibo') situacao = 'PROCESSANDO';

    let procKey: string | undefined;
    if (resultado.cStat === '100' && resultado.xmlRetorno.includes('nfeProc')) {
      procKey = this.storage.buildNfeKey(chave, 'procNFe');
      await this.storage.putXml(procKey, resultado.xmlRetorno);
    } else if (resultado.cStat === '100' && resultado.nProt) {
      const proc = wrapProcNFe(xml, resultado.nProt, resultado.dhRecbto ?? formatDhEmiBr());
      procKey = this.storage.buildNfeKey(chave, 'procNFe');
      await this.storage.putXml(procKey, proc);
    }

    if (resultado.nRec) {
      await this.db.insert(schema.lote).values({
        emitenteId,
        idLote: String(Date.now()).slice(-15),
        nRec: resultado.nRec,
        nfeId: inserted.id,
        status: 'PROCESSANDO',
        proximoPollEm: new Date(Date.now() + 3000),
      });
    }

    await this.db.update(schema.nfe).set({
      situacao,
      xmlStorageKey: xmlKey,
      procNfeStorageKey: procKey,
      nRec: resultado.nRec,
      nProt: resultado.nProt,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      dhAutorizacao: situacao === 'AUTORIZADA' ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(schema.nfe.id, inserted.id));

    await this.db.insert(schema.outbox).values({
      eventType: situacao === 'AUTORIZADA' ? 'nfe.autorizada' : 'nfe.enviada',
      payload: { chaveAcesso: chave, emitenteId, situacao },
    });

    await this.audit.log({
      action: 'EMITIR_NFE',
      entity: 'nfe',
      entityId: chave,
      emitenteId,
      ip,
      metadata: { cStat: resultado.cStat, numero, serie, mock: this.config.sefazMock },
    });

    const result: NfeAutorizadaResult = {
      id: inserted.id,
      chaveAcesso: chave,
      situacao,
      serie,
      numero,
      nProt: resultado.nProt,
      nRec: resultado.nRec,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      valorNf,
      dhEmi: now.toISOString(),
      xmlUrl: `/v1/nfe/${chave}/xml`,
      pdfUrl: `/v1/nfe/${chave}/danfe`,
    };

    if (idempotencyKey) await this.idempotency.set(idempotencyKey, result);
    return result;
  }

  async consultar(chave: string) {
    const row = await this.getByChave(chave);
    const itens = await this.db.select().from(schema.nfeItem).where(eq(schema.nfeItem.nfeId, row.id));
    const eventos = await this.db.select().from(schema.evento).where(eq(schema.evento.chaveAcesso, chave));
    return {
      ...this.toPublic(row),
      itens: itens.map((i) => ({
        nItem: i.nItem,
        codigo: i.codigo,
        descricao: i.descricao,
        ncm: i.ncm,
        cfop: i.cfop,
        unidade: i.unidade,
        quantidade: Number(i.quantidade),
        valorUnitario: Number(i.valorUnitario),
        valorTotal: Number(i.valorTotal),
        csosn: i.csosn,
        cst: i.cst,
      })),
      eventos: eventos.map((e) => ({
        tipo: e.tipo,
        sequencial: e.sequencial,
        status: e.statusRegistro,
        nProt: e.nProt,
        motivo: e.motivo,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async listar(emitenteId: string, filtros: {
    situacao?: string;
    chave?: string;
    de?: string;
    ate?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(schema.nfe.emitenteId, emitenteId)];
    if (filtros.situacao) conditions.push(eq(schema.nfe.situacao, filtros.situacao));
    if (filtros.chave) conditions.push(like(schema.nfe.chaveAcesso, `%${filtros.chave}%`));
    if (filtros.de) conditions.push(gte(schema.nfe.dhEmi, new Date(filtros.de)));
    if (filtros.ate) conditions.push(lte(schema.nfe.dhEmi, new Date(filtros.ate)));

    const where = and(...conditions);
    const limit = Math.min(filtros.limit ?? 50, 200);
    const offset = filtros.offset ?? 0;

    const [totalRow] = await this.db.select({ count: count(), soma: sum(schema.nfe.valorNf) }).from(schema.nfe).where(where);
    const items = await this.db.select().from(schema.nfe).where(where).orderBy(desc(schema.nfe.dhEmi)).limit(limit).offset(offset);
    const porSituacao = await this.db
      .select({ situacao: schema.nfe.situacao, total: count() })
      .from(schema.nfe)
      .where(eq(schema.nfe.emitenteId, emitenteId))
      .groupBy(schema.nfe.situacao);

    return {
      total: Number(totalRow?.count ?? 0),
      valorTotal: Number(totalRow?.soma ?? 0),
      items: items.map((r) => this.toPublic(r)),
      porSituacao: porSituacao.map((s) => ({ situacao: s.situacao, total: Number(s.total) })),
    };
  }

  async cancelar(chave: string, input: CancelarNfeInput, ip?: string) {
    this.validador.validarCancelamento(input);
    const row = await this.getByChave(chave);
    if (row.situacao !== 'AUTORIZADA') {
      throw new ValidationError(`NF-e em situação ${row.situacao} não pode ser cancelada`);
    }
    NfeStateMachine.transition('AUTORIZADA', 'CANCELADA');

    const emitente = await this.emitentes.obterDominio(row.emitenteId);
    const signer = await this.emitentes.signerFor(row.emitenteId);
    const seq = 1;
    let xml = this.eventoBuilder.build({
      chaveAcesso: chave,
      cnpj: emitente.cnpj,
      tipo: EVENTO_CANCELAMENTO,
      sequencial: seq,
      tpAmb: row.tpAmb as '1' | '2',
      motivo: input.motivo,
    });
    xml = signer.assinarXml(xml, eventoInfId(chave, EVENTO_CANCELAMENTO, seq));

    const ambiente = emitente.ambiente === 'prod' ? 'prod' : 'homolog';
    const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
    const result = await sefaz.registrarEvento(xml, row.tpAmb as '1' | '2');

    const ok = result.cStat === '135' || result.cStat === '155' || result.cStat === '101';
    const key = this.storage.buildNfeKey(chave, 'evento', `${EVENTO_CANCELAMENTO}_${seq}`);
    await this.storage.putXml(key, xml);

    await this.db.insert(schema.evento).values({
      nfeId: row.id,
      chaveAcesso: chave,
      tipo: EVENTO_CANCELAMENTO,
      sequencial: seq,
      statusRegistro: ok ? 'REGISTRADO' : 'REJEITADO',
      nProt: result.nProt,
      xmlStorageKey: key,
      motivo: input.motivo,
    });

    if (ok) {
      await this.db.update(schema.nfe).set({
        situacao: 'CANCELADA',
        cStat: result.cStat,
        xMotivo: result.xMotivo,
        updatedAt: new Date(),
      }).where(eq(schema.nfe.id, row.id));
    }

    await this.audit.log({
      action: 'CANCELAR_NFE',
      entity: 'nfe',
      entityId: chave,
      emitenteId: row.emitenteId,
      ip,
      metadata: { cStat: result.cStat },
    });

    return { chaveAcesso: chave, situacao: ok ? 'CANCELADA' : row.situacao, cStat: result.cStat, xMotivo: result.xMotivo, nProt: result.nProt };
  }

  async cartaCorrecao(chave: string, input: CceInput, ip?: string) {
    this.validador.validarCce(input);
    const row = await this.getByChave(chave);
    if (row.situacao !== 'AUTORIZADA') {
      throw new ValidationError('Carta de correção só é permitida em NF-e autorizada');
    }
    const emitente = await this.emitentes.obterDominio(row.emitenteId);
    const existentes = await this.db.select().from(schema.evento).where(
      and(eq(schema.evento.chaveAcesso, chave), eq(schema.evento.tipo, EVENTO_CCE)),
    );
    const seq = existentes.length + 1;
    const signer = await this.emitentes.signerFor(row.emitenteId);
    let xml = this.eventoBuilder.build({
      chaveAcesso: chave,
      cnpj: emitente.cnpj,
      tipo: EVENTO_CCE,
      sequencial: seq,
      tpAmb: row.tpAmb as '1' | '2',
      motivo: input.correcao,
    });
    xml = signer.assinarXml(xml, eventoInfId(chave, EVENTO_CCE, seq));
    const ambiente = emitente.ambiente === 'prod' ? 'prod' : 'homolog';
    const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
    const result = await sefaz.registrarEvento(xml, row.tpAmb as '1' | '2');
    const ok = result.cStat === '135';
    const key = this.storage.buildNfeKey(chave, 'evento', `${EVENTO_CCE}_${seq}`);
    await this.storage.putXml(key, xml);
    await this.db.insert(schema.evento).values({
      nfeId: row.id,
      chaveAcesso: chave,
      tipo: EVENTO_CCE,
      sequencial: seq,
      statusRegistro: ok ? 'REGISTRADO' : 'REJEITADO',
      nProt: result.nProt,
      xmlStorageKey: key,
      motivo: input.correcao,
    });
    await this.audit.log({ action: 'CCE', entity: 'nfe', entityId: chave, emitenteId: row.emitenteId, ip, metadata: { seq, cStat: result.cStat } });
    return { chaveAcesso: chave, sequencial: seq, cStat: result.cStat, xMotivo: result.xMotivo, nProt: result.nProt };
  }

  async inutilizar(emitenteId: string, input: InutilizarInput, ip?: string) {
    if (input.motivo.trim().length < 15) throw new ValidationError('Justificativa deve ter no mínimo 15 caracteres');
    if (input.numeroFim < input.numeroIni) throw new ValidationError('Faixa de numeração inválida');
    const emitente = await this.emitentes.obterDominio(emitenteId);
    const tpAmb = emitente.ambiente === 'prod' ? '1' as const : '2' as const;
    const signer = await this.emitentes.signerFor(emitenteId);
    const params = {
      cnpj: emitente.cnpj,
      ie: emitente.inscricaoEstadual,
      ano: input.ano,
      serie: input.serie,
      nNFIni: input.numeroIni,
      nNFFin: input.numeroFim,
      tpAmb,
      motivo: input.motivo,
    };
    let xml = this.inutBuilder.build(params);
    xml = signer.assinarXml(xml, inutInfId(params));
    const ambiente = emitente.ambiente === 'prod' ? 'prod' : 'homolog';
    const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
    const result = await sefaz.inutilizar(xml, tpAmb);
    const key = this.storage.buildNfeKey('inut', 'inut', `${emitente.cnpj}_${input.serie}_${input.numeroIni}_${input.numeroFim}`);
    await this.storage.putXml(key, xml);
    const [row] = await this.db.insert(schema.inutilizacao).values({
      emitenteId,
      serie: input.serie,
      numeroIni: input.numeroIni,
      numeroFim: input.numeroFim,
      ano: input.ano,
      tpAmb,
      motivo: input.motivo,
      nProt: result.nProt,
      cStat: result.cStat,
      xmlStorageKey: key,
    }).returning();
    await this.audit.log({ action: 'INUTILIZAR', entity: 'inutilizacao', entityId: row!.id, emitenteId, ip, metadata: { cStat: result.cStat } });
    return {
      id: row!.id,
      cStat: result.cStat,
      xMotivo: result.xMotivo,
      nProt: result.nProt,
      serie: input.serie,
      numeroIni: input.numeroIni,
      numeroFim: input.numeroFim,
    };
  }

  async getXml(chave: string): Promise<string> {
    const row = await this.getByChave(chave);
    const key = row.procNfeStorageKey ?? row.xmlStorageKey;
    if (!key) throw new NotFoundError('XML', chave);
    return this.storage.getXml(key);
  }

  async processarRecibosPendentes(limit = 20): Promise<number> {
    const pendentes = await this.db.select().from(schema.lote).where(eq(schema.lote.status, 'PROCESSANDO')).limit(limit);
    let processed = 0;
    for (const lote of pendentes) {
      if (!lote.nfeId || !lote.nRec) continue;
      const nfeRows = await this.db.select().from(schema.nfe).where(eq(schema.nfe.id, lote.nfeId)).limit(1);
      const nfe = nfeRows[0];
      if (!nfe) continue;
      const emitente = await this.emitentes.obterDominio(nfe.emitenteId);
      const signer = await this.emitentes.signerFor(nfe.emitenteId);
      const ambiente = emitente.ambiente === 'prod' ? 'prod' : 'homolog';
      const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
      const ret = await sefaz.consultarRecibo(lote.nRec, nfe.tpAmb as '1' | '2');
      if (ret.modo === 'recibo' && (ret.cStat === '105' || ret.cStat === '103')) {
        await this.db.update(schema.lote).set({
          tentativas: lote.tentativas + 1,
          proximoPollEm: new Date(Date.now() + Math.min(30_000, 3000 * (lote.tentativas + 1))),
          updatedAt: new Date(),
        }).where(eq(schema.lote.id, lote.id));
        continue;
      }
      const situacao = situacaoFromCStat(ret.cStat);
      await this.db.update(schema.nfe).set({
        situacao,
        nProt: ret.nProt,
        cStat: ret.cStat,
        xMotivo: ret.xMotivo,
        dhAutorizacao: situacao === 'AUTORIZADA' ? new Date() : undefined,
        updatedAt: new Date(),
      }).where(eq(schema.nfe.id, nfe.id));
      await this.db.update(schema.lote).set({ status: 'CONCLUIDO', updatedAt: new Date() }).where(eq(schema.lote.id, lote.id));
      processed += 1;
    }
    return processed;
  }

  private async getByChave(chave: string) {
    const rows = await this.db.select().from(schema.nfe).where(eq(schema.nfe.chaveAcesso, chave)).limit(1);
    if (!rows[0]) throw new NotFoundError('NF-e', chave);
    return rows[0];
  }

  toPublic(row: typeof schema.nfe.$inferSelect) {
    return {
      id: row.id,
      emitenteId: row.emitenteId,
      chaveAcesso: row.chaveAcesso,
      situacao: row.situacao,
      modelo: row.modelo,
      serie: row.serie,
      numero: row.numero,
      naturezaOperacao: row.naturezaOperacao,
      tpAmb: row.tpAmb,
      destCpfCnpj: row.destCpfCnpj,
      destRazaoSocial: row.destRazaoSocial,
      valorProdutos: Number(row.valorProdutos),
      valorNf: Number(row.valorNf),
      nRec: row.nRec,
      nProt: row.nProt,
      cStat: row.cStat,
      xMotivo: row.xMotivo,
      dhEmi: row.dhEmi.toISOString(),
      dhAutorizacao: row.dhAutorizacao?.toISOString() ?? null,
    };
  }
}
