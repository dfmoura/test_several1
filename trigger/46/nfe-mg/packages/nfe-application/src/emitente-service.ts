import { and, desc, eq } from 'drizzle-orm';
import type { AppConfig } from '@nfe/shared';
import { NotFoundError, ValidationError, CertificadoError, onlyDigits } from '@nfe/shared';
import { createSefazGateway } from '@nfe/sefaz-client';
import { XmlSigner, loadPfxBuffer } from '@nfe/xml';
import {
  extrairCnpjCertificado,
  validadeCertificado,
  subjectCertificado,
  certificadoExpirado,
  possuiClientAuth,
} from '@nfe/xml';
import type { AmbienteEmitente, Crt, Emitente, Endereco } from '@nfe/domain';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { XmlStorage } from './storage/xml-storage.js';
import { encryptSecret, decryptSecret } from './crypto-vault.js';
import { AuditLogger } from './repositories.js';

export interface EmitenteInput {
  apelido: string;
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  crt: Crt;
  cnae?: string;
  endereco: Endereco;
  telefone?: string;
  email?: string;
  ambiente?: AmbienteEmitente;
  seriePadrao?: number;
  credenciadoSiare?: boolean;
}

function toDomain(row: typeof schema.emitente.$inferSelect): Emitente {
  return {
    id: row.id,
    apelido: row.apelido,
    cnpj: row.cnpj,
    inscricaoEstadual: row.inscricaoEstadual,
    razaoSocial: row.razaoSocial,
    nomeFantasia: row.nomeFantasia ?? undefined,
    crt: row.crt as Crt,
    cnae: row.cnae ?? undefined,
    endereco: row.endereco as Endereco,
    telefone: row.telefone ?? undefined,
    email: row.email ?? undefined,
    ambiente: row.ambiente as AmbienteEmitente,
    seriePadrao: row.seriePadrao,
    ultimoNumero: row.ultimoNumero,
    credenciadoSiare: row.credenciadoSiare,
    certStorageKey: row.certStorageKey ?? undefined,
    certCnpj: row.certCnpj ?? undefined,
    certValidade: row.certValidade ?? undefined,
    certSubject: row.certSubject ?? undefined,
    ativo: row.ativo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class EmitenteService {
  constructor(
    private readonly db: Database,
    private readonly storage: XmlStorage,
    private readonly audit: AuditLogger,
    private readonly config: AppConfig,
  ) {}

  async listar() {
    const rows = await this.db.select().from(schema.emitente).orderBy(desc(schema.emitente.createdAt));
    return rows.map((r) => this.toPublic(r));
  }

  async obter(id: string) {
    const row = await this.getRow(id);
    return this.toPublic(row);
  }

  async obterDominio(id: string): Promise<Emitente> {
    return toDomain(await this.getRow(id));
  }

  async criar(input: EmitenteInput, ip?: string) {
    const cnpj = onlyDigits(input.cnpj);
    if (cnpj.length !== 14) throw new ValidationError('CNPJ do emitente inválido');
    const [row] = await this.db.insert(schema.emitente).values({
      apelido: input.apelido,
      cnpj,
      inscricaoEstadual: onlyDigits(input.inscricaoEstadual),
      razaoSocial: input.razaoSocial,
      nomeFantasia: input.nomeFantasia,
      crt: input.crt,
      cnae: input.cnae,
      endereco: input.endereco,
      telefone: input.telefone,
      email: input.email,
      ambiente: input.ambiente ?? 'homolog',
      seriePadrao: input.seriePadrao ?? 1,
      credenciadoSiare: input.credenciadoSiare ?? false,
      credenciadoSiareEm: input.credenciadoSiare ? new Date() : null,
    }).returning();
    if (!row) throw new ValidationError('Falha ao criar emitente');
    await this.db.insert(schema.serieNumeracao).values({
      emitenteId: row.id,
      serie: row.seriePadrao,
      ultimoNumero: 0,
      ambiente: row.ambiente,
    }).onConflictDoNothing();
    await this.audit.log({ action: 'CRIAR_EMITENTE', entity: 'emitente', entityId: row.id, emitenteId: row.id, ip });
    return this.toPublic(row);
  }

  async atualizar(id: string, input: Partial<EmitenteInput>, ip?: string) {
    const current = await this.getRow(id);
    const [row] = await this.db.update(schema.emitente).set({
      apelido: input.apelido ?? current.apelido,
      inscricaoEstadual: input.inscricaoEstadual ? onlyDigits(input.inscricaoEstadual) : current.inscricaoEstadual,
      razaoSocial: input.razaoSocial ?? current.razaoSocial,
      nomeFantasia: input.nomeFantasia ?? current.nomeFantasia,
      crt: input.crt ?? current.crt,
      cnae: input.cnae ?? current.cnae,
      endereco: input.endereco ?? current.endereco,
      telefone: input.telefone ?? current.telefone,
      email: input.email ?? current.email,
      ambiente: input.ambiente ?? current.ambiente,
      seriePadrao: input.seriePadrao ?? current.seriePadrao,
      credenciadoSiare: input.credenciadoSiare ?? current.credenciadoSiare,
      credenciadoSiareEm: input.credenciadoSiare ? new Date() : current.credenciadoSiareEm,
      updatedAt: new Date(),
    }).where(eq(schema.emitente.id, id)).returning();
    await this.audit.log({ action: 'ATUALIZAR_EMITENTE', entity: 'emitente', entityId: id, emitenteId: id, ip });
    return this.toPublic(row!);
  }

  async uploadCertificado(id: string, pfx: Buffer, password: string, ip?: string) {
    const row = await this.getRow(id);
    let material;
    try {
      material = loadPfxBuffer(pfx, password);
    } catch (err) {
      throw new CertificadoError(err instanceof Error ? err.message : 'PFX inválido');
    }
    const signer = XmlSigner.fromMaterial(material);
    const info = signer.info();
    if (info.cnpj && info.cnpj !== row.cnpj) {
      throw new CertificadoError(
        `CNPJ do certificado (${info.cnpj}) diverge do emitente (${row.cnpj})`,
      );
    }
    if (certificadoExpirado(material.certPem)) {
      throw new CertificadoError('Certificado A1 expirado');
    }

    const key = this.storage.certKey(id);
    const encPfx = encryptSecret(pfx, this.config.certKek);
    await this.storage.putBytes(key, Buffer.from(encPfx, 'utf8'), 'application/octet-stream');
    const pwdEnc = encryptSecret(password, this.config.certKek);

    const [updated] = await this.db.update(schema.emitente).set({
      certStorageKey: key,
      certPasswordEnc: pwdEnc,
      certCnpj: info.cnpj ?? extrairCnpjCertificado(material.certPem),
      certValidade: info.validade ?? validadeCertificado(material.certPem),
      certSubject: info.subject ?? subjectCertificado(material.certPem),
      updatedAt: new Date(),
    }).where(eq(schema.emitente.id, id)).returning();

    await this.audit.log({
      action: 'UPLOAD_CERTIFICADO',
      entity: 'emitente',
      entityId: id,
      emitenteId: id,
      ip,
      metadata: { cnpj: info.cnpj, validade: info.validade?.toISOString(), clientAuth: possuiClientAuth(material.certPem) },
    });
    return this.toPublic(updated!);
  }

  async signerFor(id: string): Promise<XmlSigner> {
    const row = await this.getRow(id);
    if (!row.certStorageKey || !row.certPasswordEnc) {
      if (this.config.sefazMock) return XmlSigner.createMock();
      throw new CertificadoError('Emitente sem certificado A1. Faça o upload no wizard.');
    }
    const enc = (await this.storage.getBytes(row.certStorageKey)).toString('utf8');
    const pfx = decryptSecret(enc, this.config.certKek);
    const password = decryptSecret(row.certPasswordEnc, this.config.certKek).toString('utf8');
    const signer = XmlSigner.fromPfx(pfx, password);
    signer.assertCnpj(row.cnpj);
    return signer;
  }

  async statusServico(id: string) {
    const row = await this.getRow(id);
    const signer = await this.signerFor(id);
    const ambiente = row.ambiente === 'prod' ? 'prod' : 'homolog';
    const sefaz = createSefazGateway(ambiente, this.config.sefazMock, signer);
    const tpAmb = row.ambiente === 'prod' ? '1' : '2';
    const result = await sefaz.statusServico(tpAmb);
    await this.audit.log({
      action: 'STATUS_SERVICO',
      entity: 'emitente',
      entityId: id,
      emitenteId: id,
      metadata: { cStat: result.cStat, mock: this.config.sefazMock },
    });
    return { ...result, mock: this.config.sefazMock, ambiente: row.ambiente };
  }

  async nextNumero(emitenteId: string, serie: number, ambiente: string): Promise<number> {
    const rows = await this.db.select().from(schema.serieNumeracao).where(
      and(
        eq(schema.serieNumeracao.emitenteId, emitenteId),
        eq(schema.serieNumeracao.serie, serie),
        eq(schema.serieNumeracao.ambiente, ambiente),
      ),
    ).limit(1);

    if (rows.length === 0) {
      await this.db.insert(schema.serieNumeracao).values({
        emitenteId, serie, ultimoNumero: 1, ambiente,
      });
      await this.db.update(schema.emitente)
        .set({ ultimoNumero: 1, updatedAt: new Date() })
        .where(eq(schema.emitente.id, emitenteId));
      return 1;
    }

    const atual = rows[0]!.ultimoNumero + 1;
    await this.db.update(schema.serieNumeracao)
      .set({ ultimoNumero: atual })
      .where(eq(schema.serieNumeracao.id, rows[0]!.id));
    await this.db.update(schema.emitente)
      .set({ ultimoNumero: atual, updatedAt: new Date() })
      .where(eq(schema.emitente.id, emitenteId));
    return atual;
  }

  certificadoAlerta(row: typeof schema.emitente.$inferSelect) {
    if (!row.certValidade) {
      return { nivel: this.config.sefazMock ? 'mock' : 'ausente', dias: null as number | null };
    }
    const dias = Math.floor((row.certValidade.getTime() - Date.now()) / 86_400_000);
    let nivel: 'ok' | 'aviso' | 'atencao' | 'critico' | 'expirado' = 'ok';
    if (dias < 0) nivel = 'expirado';
    else if (dias <= 7) nivel = 'critico';
    else if (dias <= 15) nivel = 'atencao';
    else if (dias <= 30) nivel = 'aviso';
    return { nivel, dias };
  }

  private async getRow(id: string) {
    const rows = await this.db.select().from(schema.emitente).where(eq(schema.emitente.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundError('Emitente', id);
    return rows[0];
  }

  toPublic(row: typeof schema.emitente.$inferSelect) {
    const alerta = this.certificadoAlerta(row);
    return {
      id: row.id,
      apelido: row.apelido,
      cnpj: row.cnpj,
      inscricaoEstadual: row.inscricaoEstadual,
      razaoSocial: row.razaoSocial,
      nomeFantasia: row.nomeFantasia,
      crt: row.crt,
      cnae: row.cnae,
      endereco: row.endereco,
      telefone: row.telefone,
      email: row.email,
      ambiente: row.ambiente,
      seriePadrao: row.seriePadrao,
      ultimoNumero: row.ultimoNumero,
      credenciadoSiare: row.credenciadoSiare,
      credenciadoSiareEm: row.credenciadoSiareEm?.toISOString() ?? null,
      certificado: {
        presente: Boolean(row.certStorageKey),
        cnpj: row.certCnpj,
        validade: row.certValidade?.toISOString() ?? null,
        subject: row.certSubject,
        alerta: alerta.nivel,
        diasParaExpirar: alerta.dias,
      },
      ativo: row.ativo,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
