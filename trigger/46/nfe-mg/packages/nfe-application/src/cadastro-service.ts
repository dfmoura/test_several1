import { and, desc, eq } from 'drizzle-orm';
import { NotFoundError, ValidationError, onlyDigits } from '@nfe/shared';
import {
  evaluateParceiroFiscal,
  evaluateProdutoFiscal,
  suggestAreaIncentivada,
  syncCclassTribCst,
  syncIeInd,
  type Endereco,
  type FinalidadeParceiro,
  type IeStatus,
  type RegimeParceiro,
  type TipoFornecimento,
} from '@nfe/domain';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { AuditLogger } from './repositories.js';

export interface DestinatarioInput {
  apelido: string;
  tipo: 'PF' | 'PJ' | 'EX';
  cpfCnpj: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  indIEDest?: '1' | '2' | '9';
  email?: string;
  telefone?: string;
  endereco?: Endereco;
  ativo?: boolean;
  papelCliente?: boolean;
  papelFornecedor?: boolean;
  papelTransportadora?: boolean;
  inscricaoMunicipal?: string;
  emailXml?: string;
  finalidade?: FinalidadeParceiro;
  consumidorFinal?: boolean;
  regime?: RegimeParceiro;
  ieStatus?: IeStatus;
  suframa?: string;
  areaIncentivada?: boolean;
  cnae?: string;
  tipoFornecimento?: TipoFornecimento;
  cfopEntradaPadrao?: string;
  emiteDocumentoFiscal?: boolean;
  idEstrangeiro?: string;
}

export interface ProdutoInput {
  codigo: string;
  descricao: string;
  descricaoFiscal?: string;
  ncm: string;
  cfop: string;
  cfopEntradaPadrao?: string;
  unidade?: string;
  valorUnitario?: number;
  origem?: string;
  csosn?: string;
  cst?: string;
  cest?: string;
  gtin?: string;
  tipoItemSped?: string;
  cstPis?: string;
  cstCofins?: string;
  aliquotaPis?: number;
  aliquotaCofins?: number;
  /** Alias aceito: cstCbs / cstIbs */
  cstIbsCbs?: string;
  cstCbs?: string;
  cclassTrib?: string;
  aliquotaIbs?: number;
  aliquotaCbs?: number;
  cstIs?: string;
  cclassTribIs?: string;
  aliquotaIs?: number;
  sujeitoIs?: boolean;
  cbenef?: string;
  ativo?: boolean;
}

function numOrUndef(v: number | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function enrichParceiro(row: typeof schema.destinatario.$inferSelect) {
  const aptidao = evaluateParceiroFiscal({
    id: row.id,
    emitenteId: row.emitenteId,
    apelido: row.apelido,
    tipo: row.tipo as 'PF' | 'PJ' | 'EX',
    cpfCnpj: row.cpfCnpj,
    razaoSocial: row.razaoSocial ?? undefined,
    inscricaoEstadual: row.inscricaoEstadual ?? undefined,
    indIEDest: row.indIEDest as '1' | '2' | '9',
    email: row.email ?? undefined,
    telefone: row.telefone ?? undefined,
    endereco: (row.endereco as Endereco | null) ?? undefined,
    ativo: row.ativo,
    papelCliente: row.papelCliente,
    papelFornecedor: row.papelFornecedor,
    papelTransportadora: row.papelTransportadora,
    inscricaoMunicipal: row.inscricaoMunicipal ?? undefined,
    emailXml: row.emailXml ?? undefined,
    finalidade: (row.finalidade as FinalidadeParceiro | null) ?? undefined,
    consumidorFinal: row.consumidorFinal,
    regime: (row.regime as RegimeParceiro | null) ?? undefined,
    ieStatus: row.ieStatus as IeStatus,
    suframa: row.suframa ?? undefined,
    areaIncentivada: row.areaIncentivada,
    cnae: row.cnae ?? undefined,
    tipoFornecimento: (row.tipoFornecimento as TipoFornecimento | null) ?? undefined,
    cfopEntradaPadrao: row.cfopEntradaPadrao ?? undefined,
    emiteDocumentoFiscal: row.emiteDocumentoFiscal,
    idEstrangeiro: row.idEstrangeiro ?? undefined,
  });
  return { ...row, aptidao };
}

function enrichProduto(row: typeof schema.produto.$inferSelect) {
  const aptidao = evaluateProdutoFiscal({
    id: row.id,
    emitenteId: row.emitenteId,
    codigo: row.codigo,
    descricao: row.descricao,
    descricaoFiscal: row.descricaoFiscal ?? undefined,
    ncm: row.ncm,
    cfop: row.cfop,
    cfopEntradaPadrao: row.cfopEntradaPadrao ?? undefined,
    unidade: row.unidade,
    valorUnitario: Number(row.valorUnitario),
    origem: row.origem,
    csosn: row.csosn ?? undefined,
    cst: row.cst ?? undefined,
    cest: row.cest ?? undefined,
    gtin: row.gtin ?? undefined,
    tipoItemSped: row.tipoItemSped,
    cstPis: row.cstPis ?? undefined,
    cstCofins: row.cstCofins ?? undefined,
    aliquotaPis: row.aliquotaPis != null ? Number(row.aliquotaPis) : undefined,
    aliquotaCofins: row.aliquotaCofins != null ? Number(row.aliquotaCofins) : undefined,
    cstIbsCbs: row.cstIbsCbs ?? undefined,
    cclassTrib: row.cclassTrib ?? undefined,
    aliquotaIbs: row.aliquotaIbs != null ? Number(row.aliquotaIbs) : undefined,
    aliquotaCbs: row.aliquotaCbs != null ? Number(row.aliquotaCbs) : undefined,
    cstIs: row.cstIs ?? undefined,
    cclassTribIs: row.cclassTribIs ?? undefined,
    aliquotaIs: row.aliquotaIs != null ? Number(row.aliquotaIs) : undefined,
    sujeitoIs: row.sujeitoIs,
    cbenef: row.cbenef ?? undefined,
    ativo: row.ativo,
  });
  return { ...row, aptidao };
}

export class DestinatarioService {
  constructor(private readonly db: Database, private readonly audit: AuditLogger) {}

  async listar(emitenteId: string) {
    const rows = await this.db.select().from(schema.destinatario)
      .where(eq(schema.destinatario.emitenteId, emitenteId))
      .orderBy(desc(schema.destinatario.updatedAt));
    return rows.map(enrichParceiro);
  }

  async criar(emitenteId: string, input: DestinatarioInput, ip?: string) {
    const doc = onlyDigits(input.cpfCnpj);
    if (input.tipo === 'PJ' && doc.length !== 14) throw new ValidationError('CNPJ inválido');
    if (input.tipo === 'PF' && doc.length !== 11) throw new ValidationError('CPF inválido');

    let synced;
    try {
      synced = syncIeInd({
        inscricaoEstadual: input.inscricaoEstadual,
        indIEDest: input.indIEDest,
        ieStatus: input.ieStatus,
      });
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : 'IE/indIEDest inconsistentes');
    }

    const finalidade = input.finalidade;
    const consumidorFinal =
      finalidade === 'USO_CONSUMO' ? true : (input.consumidorFinal ?? false);
    const areaIncentivada =
      input.areaIncentivada
      ?? suggestAreaIncentivada(input.endereco?.uf, input.suframa);

    const [row] = await this.db.insert(schema.destinatario).values({
      emitenteId,
      apelido: input.apelido,
      tipo: input.tipo,
      cpfCnpj: doc || onlyDigits(input.idEstrangeiro ?? ''),
      razaoSocial: input.razaoSocial,
      inscricaoEstadual: synced.inscricaoEstadual
        ? (isIeText(synced.inscricaoEstadual) ? synced.inscricaoEstadual : onlyDigits(synced.inscricaoEstadual) || synced.inscricaoEstadual)
        : undefined,
      indIEDest: synced.indIEDest,
      email: input.email,
      telefone: input.telefone,
      endereco: input.endereco,
      ativo: input.ativo ?? true,
      papelCliente: input.papelCliente ?? true,
      papelFornecedor: input.papelFornecedor ?? false,
      papelTransportadora: input.papelTransportadora ?? false,
      inscricaoMunicipal: input.inscricaoMunicipal,
      emailXml: input.emailXml ?? input.email,
      finalidade,
      consumidorFinal,
      regime: input.regime,
      ieStatus: synced.ieStatus,
      suframa: input.suframa,
      areaIncentivada,
      cnae: input.cnae ? onlyDigits(input.cnae).slice(0, 7) : undefined,
      tipoFornecimento: input.tipoFornecimento,
      cfopEntradaPadrao: input.cfopEntradaPadrao,
      emiteDocumentoFiscal: input.emiteDocumentoFiscal ?? true,
      idEstrangeiro: input.idEstrangeiro,
    }).returning();
    await this.audit.log({ action: 'CRIAR_DESTINATARIO', entity: 'destinatario', entityId: row!.id, emitenteId, ip });
    return enrichParceiro(row!);
  }

  async atualizar(emitenteId: string, id: string, input: Partial<DestinatarioInput>, ip?: string) {
    const existing = await this.obterRaw(emitenteId, id);

    let synced;
    try {
      synced = syncIeInd({
        inscricaoEstadual: input.inscricaoEstadual !== undefined
          ? input.inscricaoEstadual
          : existing.inscricaoEstadual,
        indIEDest: input.indIEDest !== undefined
          ? input.indIEDest
          : (existing.indIEDest as '1' | '2' | '9'),
        ieStatus: input.ieStatus !== undefined
          ? input.ieStatus
          : (existing.ieStatus as IeStatus),
      });
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : 'IE/indIEDest inconsistentes');
    }

    const finalidade = input.finalidade !== undefined
      ? input.finalidade
      : (existing.finalidade as FinalidadeParceiro | undefined);
    const consumidorFinal =
      finalidade === 'USO_CONSUMO'
        ? true
        : (input.consumidorFinal ?? existing.consumidorFinal);

    const endereco = input.endereco ?? (existing.endereco as Endereco | undefined);
    const suframa = input.suframa !== undefined ? input.suframa : existing.suframa ?? undefined;
    const areaIncentivada =
      input.areaIncentivada
      ?? suggestAreaIncentivada(endereco?.uf, suframa);

    const [row] = await this.db.update(schema.destinatario).set({
      apelido: input.apelido ?? existing.apelido,
      razaoSocial: input.razaoSocial ?? existing.razaoSocial,
      inscricaoEstadual: synced.inscricaoEstadual
        ? (isIeText(synced.inscricaoEstadual) ? synced.inscricaoEstadual : onlyDigits(synced.inscricaoEstadual) || synced.inscricaoEstadual)
        : null,
      indIEDest: synced.indIEDest,
      email: input.email ?? existing.email,
      telefone: input.telefone ?? existing.telefone,
      endereco: endereco ?? existing.endereco,
      ativo: input.ativo ?? existing.ativo,
      papelCliente: input.papelCliente ?? existing.papelCliente,
      papelFornecedor: input.papelFornecedor ?? existing.papelFornecedor,
      papelTransportadora: input.papelTransportadora ?? existing.papelTransportadora,
      inscricaoMunicipal: input.inscricaoMunicipal ?? existing.inscricaoMunicipal,
      emailXml: input.emailXml ?? existing.emailXml,
      finalidade: finalidade ?? null,
      consumidorFinal,
      regime: input.regime !== undefined ? input.regime : existing.regime,
      ieStatus: synced.ieStatus,
      suframa: suframa ?? null,
      areaIncentivada,
      cnae: input.cnae !== undefined
        ? (input.cnae ? onlyDigits(input.cnae).slice(0, 7) : null)
        : existing.cnae,
      tipoFornecimento: input.tipoFornecimento !== undefined
        ? input.tipoFornecimento
        : existing.tipoFornecimento,
      cfopEntradaPadrao: input.cfopEntradaPadrao !== undefined
        ? input.cfopEntradaPadrao
        : existing.cfopEntradaPadrao,
      emiteDocumentoFiscal: input.emiteDocumentoFiscal ?? existing.emiteDocumentoFiscal,
      idEstrangeiro: input.idEstrangeiro !== undefined
        ? input.idEstrangeiro
        : existing.idEstrangeiro,
      updatedAt: new Date(),
    }).where(eq(schema.destinatario.id, id)).returning();
    await this.audit.log({ action: 'ATUALIZAR_DESTINATARIO', entity: 'destinatario', entityId: id, emitenteId, ip });
    return enrichParceiro(row!);
  }

  async obter(emitenteId: string, id: string) {
    return enrichParceiro(await this.obterRaw(emitenteId, id));
  }

  private async obterRaw(emitenteId: string, id: string) {
    const rows = await this.db.select().from(schema.destinatario)
      .where(and(eq(schema.destinatario.id, id), eq(schema.destinatario.emitenteId, emitenteId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Destinatário', id);
    return rows[0];
  }
}

function isIeText(ie: string): boolean {
  return /[A-Za-z]/.test(ie);
}

export class ProdutoService {
  constructor(private readonly db: Database, private readonly audit: AuditLogger) {}

  async listar(emitenteId: string) {
    const rows = await this.db.select().from(schema.produto)
      .where(eq(schema.produto.emitenteId, emitenteId))
      .orderBy(desc(schema.produto.updatedAt));
    return rows.map(enrichProduto);
  }

  async criar(emitenteId: string, input: ProdutoInput, ip?: string) {
    const ncm = onlyDigits(input.ncm);
    if (ncm.length !== 8) throw new ValidationError('NCM deve ter 8 dígitos');

    const reforma = syncCclassTribCst({
      cclassTrib: input.cclassTrib,
      cstIbsCbs: input.cstIbsCbs ?? input.cstCbs,
    });

    const [row] = await this.db.insert(schema.produto).values({
      emitenteId,
      codigo: input.codigo,
      descricao: input.descricao.slice(0, 120),
      descricaoFiscal: input.descricaoFiscal?.slice(0, 120) ?? input.descricao.slice(0, 120),
      ncm,
      cfop: input.cfop,
      cfopEntradaPadrao: input.cfopEntradaPadrao,
      unidade: input.unidade ?? 'UN',
      valorUnitario: String(input.valorUnitario ?? 0),
      origem: input.origem ?? '0',
      csosn: input.csosn,
      cst: input.cst,
      cest: input.cest ? onlyDigits(input.cest).slice(0, 7) : undefined,
      gtin: input.gtin ? onlyDigits(input.gtin) : undefined,
      tipoItemSped: input.tipoItemSped ?? '00',
      cstPis: input.cstPis,
      cstCofins: input.cstCofins,
      aliquotaPis: numOrUndef(input.aliquotaPis),
      aliquotaCofins: numOrUndef(input.aliquotaCofins),
      cstIbsCbs: reforma.cstIbsCbs,
      cclassTrib: reforma.cclassTrib,
      aliquotaIbs: numOrUndef(input.aliquotaIbs),
      aliquotaCbs: numOrUndef(input.aliquotaCbs),
      cstIs: input.cstIs,
      cclassTribIs: input.cclassTribIs,
      aliquotaIs: numOrUndef(input.aliquotaIs),
      sujeitoIs: input.sujeitoIs ?? false,
      cbenef: input.cbenef,
      ativo: input.ativo ?? true,
    }).returning();
    await this.audit.log({ action: 'CRIAR_PRODUTO', entity: 'produto', entityId: row!.id, emitenteId, ip });
    return enrichProduto(row!);
  }

  async atualizar(emitenteId: string, id: string, input: Partial<ProdutoInput>, ip?: string) {
    const existing = await this.obterRaw(emitenteId, id);
    const reforma = syncCclassTribCst({
      cclassTrib: input.cclassTrib !== undefined ? input.cclassTrib : existing.cclassTrib,
      cstIbsCbs: input.cstIbsCbs !== undefined || input.cstCbs !== undefined
        ? (input.cstIbsCbs ?? input.cstCbs)
        : existing.cstIbsCbs,
    });

    const [row] = await this.db.update(schema.produto).set({
      codigo: input.codigo ?? existing.codigo,
      descricao: input.descricao?.slice(0, 120) ?? existing.descricao,
      descricaoFiscal: input.descricaoFiscal?.slice(0, 120)
        ?? existing.descricaoFiscal
        ?? existing.descricao,
      ncm: input.ncm ? onlyDigits(input.ncm) : existing.ncm,
      cfop: input.cfop ?? existing.cfop,
      cfopEntradaPadrao: input.cfopEntradaPadrao !== undefined
        ? input.cfopEntradaPadrao
        : existing.cfopEntradaPadrao,
      unidade: input.unidade ?? existing.unidade,
      valorUnitario: input.valorUnitario !== undefined ? String(input.valorUnitario) : existing.valorUnitario,
      origem: input.origem ?? existing.origem,
      csosn: input.csosn !== undefined ? input.csosn : existing.csosn,
      cst: input.cst !== undefined ? input.cst : existing.cst,
      cest: input.cest !== undefined
        ? (input.cest ? onlyDigits(input.cest).slice(0, 7) : null)
        : existing.cest,
      gtin: input.gtin !== undefined
        ? (input.gtin ? onlyDigits(input.gtin) : null)
        : existing.gtin,
      tipoItemSped: input.tipoItemSped ?? existing.tipoItemSped,
      cstPis: input.cstPis !== undefined ? input.cstPis : existing.cstPis,
      cstCofins: input.cstCofins !== undefined ? input.cstCofins : existing.cstCofins,
      aliquotaPis: input.aliquotaPis !== undefined ? numOrUndef(input.aliquotaPis) ?? null : existing.aliquotaPis,
      aliquotaCofins: input.aliquotaCofins !== undefined ? numOrUndef(input.aliquotaCofins) ?? null : existing.aliquotaCofins,
      cstIbsCbs: reforma.cstIbsCbs ?? null,
      cclassTrib: reforma.cclassTrib ?? null,
      aliquotaIbs: input.aliquotaIbs !== undefined ? numOrUndef(input.aliquotaIbs) ?? null : existing.aliquotaIbs,
      aliquotaCbs: input.aliquotaCbs !== undefined ? numOrUndef(input.aliquotaCbs) ?? null : existing.aliquotaCbs,
      cstIs: input.cstIs !== undefined ? input.cstIs : existing.cstIs,
      cclassTribIs: input.cclassTribIs !== undefined ? input.cclassTribIs : existing.cclassTribIs,
      aliquotaIs: input.aliquotaIs !== undefined ? numOrUndef(input.aliquotaIs) ?? null : existing.aliquotaIs,
      sujeitoIs: input.sujeitoIs ?? existing.sujeitoIs,
      cbenef: input.cbenef !== undefined ? input.cbenef : existing.cbenef,
      ativo: input.ativo ?? existing.ativo,
      updatedAt: new Date(),
    }).where(eq(schema.produto.id, id)).returning();
    await this.audit.log({ action: 'ATUALIZAR_PRODUTO', entity: 'produto', entityId: id, emitenteId, ip });
    return enrichProduto(row!);
  }

  async obter(emitenteId: string, id: string) {
    return enrichProduto(await this.obterRaw(emitenteId, id));
  }

  private async obterRaw(emitenteId: string, id: string) {
    const rows = await this.db.select().from(schema.produto)
      .where(and(eq(schema.produto.id, id), eq(schema.produto.emitenteId, emitenteId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Produto', id);
    return rows[0];
  }
}
