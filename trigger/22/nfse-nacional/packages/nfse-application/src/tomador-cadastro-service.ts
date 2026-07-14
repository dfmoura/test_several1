import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { ConflictError, NotFoundError, ValidationError } from '@nfse/shared';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import type { AuditLogger } from './repositories.js';

export interface TomadorEnderecoCadastro {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio?: string;
  uf: string;
  cep: string;
}

export interface TomadorCadastroInput {
  apelido: string;
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  email?: string;
  telefone?: string;
  inscricaoMunicipal?: string;
  endereco?: TomadorEnderecoCadastro | null;
  ativo?: boolean;
}

export interface TomadorCadastroView {
  id: string;
  apelido: string;
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  email?: string;
  telefone?: string;
  inscricaoMunicipal?: string;
  endereco?: TomadorEnderecoCadastro;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

type TomadorRow = typeof schema.tomadorCadastro.$inferSelect;

function normalizeCpfCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

function validateTomadorInput(input: TomadorCadastroInput, partial = false): TomadorCadastroInput {
  const apelido = input.apelido?.trim();
  if (!partial && !apelido) throw new ValidationError('Apelido é obrigatório');
  if (apelido && apelido.length > 120) throw new ValidationError('Apelido deve ter no máximo 120 caracteres');

  if (!partial && !input.tipo) throw new ValidationError('Tipo é obrigatório');
  if (input.tipo && input.tipo !== 'PF' && input.tipo !== 'PJ') {
    throw new ValidationError('Tipo deve ser PF ou PJ');
  }

  const cpfCnpj = normalizeCpfCnpj(input.cpfCnpj ?? '');
  if (!partial && !cpfCnpj) throw new ValidationError('CPF/CNPJ é obrigatório');
  if (cpfCnpj) {
    if (input.tipo === 'PF' && cpfCnpj.length !== 11) {
      throw new ValidationError('CPF deve ter 11 dígitos');
    }
    if (input.tipo === 'PJ' && cpfCnpj.length !== 14) {
      throw new ValidationError('CNPJ deve ter 14 dígitos');
    }
  }

  if (input.email?.trim()) {
    const email = input.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('E-mail inválido');
    }
  }

  if (input.endereco) {
    const end = input.endereco;
    const hasAny = [end.logradouro, end.numero, end.bairro, end.codigoMunicipio, end.uf, end.cep].some(
      (v) => v?.trim(),
    );
    if (hasAny) {
      if (!end.logradouro?.trim()) throw new ValidationError('Logradouro é obrigatório quando há endereço');
      if (!end.bairro?.trim()) throw new ValidationError('Bairro é obrigatório quando há endereço');
      if (!end.codigoMunicipio?.trim() || end.codigoMunicipio.replace(/\D/g, '').length !== 7) {
        throw new ValidationError('Código IBGE do município deve ter 7 dígitos');
      }
      if (!end.uf?.trim() || end.uf.trim().length !== 2) {
        throw new ValidationError('UF deve ter 2 caracteres');
      }
      if (!end.cep?.trim() || end.cep.replace(/\D/g, '').length < 8) {
        throw new ValidationError('CEP inválido');
      }
    }
  }

  return {
    ...input,
    apelido: apelido ?? input.apelido,
    cpfCnpj,
    razaoSocial: input.razaoSocial?.trim() || undefined,
    email: input.email?.trim() || undefined,
    telefone: input.telefone?.trim() || undefined,
    inscricaoMunicipal: input.inscricaoMunicipal?.trim() || undefined,
    endereco: sanitizeEndereco(input.endereco),
  };
}

function sanitizeEndereco(
  endereco?: TomadorEnderecoCadastro | null,
): TomadorEnderecoCadastro | null | undefined {
  if (endereco === null) return null;
  if (!endereco) return undefined;

  const hasAny = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.codigoMunicipio, endereco.uf, endereco.cep].some(
    (v) => v?.trim(),
  );
  if (!hasAny) return null;

  return {
    logradouro: endereco.logradouro.trim(),
    numero: endereco.numero?.trim() || 'S/N',
    complemento: endereco.complemento?.trim() || undefined,
    bairro: endereco.bairro.trim(),
    codigoMunicipio: endereco.codigoMunicipio.replace(/\D/g, ''),
    nomeMunicipio: endereco.nomeMunicipio?.trim() || undefined,
    uf: endereco.uf.trim().toUpperCase(),
    cep: endereco.cep.replace(/\D/g, ''),
  };
}

function toView(row: TomadorRow): TomadorCadastroView {
  const endereco = row.endereco as TomadorEnderecoCadastro | null;
  return {
    id: row.id,
    apelido: row.apelido,
    tipo: row.tipo as 'PF' | 'PJ',
    cpfCnpj: row.cpfCnpj,
    razaoSocial: row.razaoSocial ?? undefined,
    email: row.email ?? undefined,
    telefone: row.telefone ?? undefined,
    inscricaoMunicipal: row.inscricaoMunicipal ?? undefined,
    endereco: endereco ?? undefined,
    ativo: row.ativo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class TomadorCadastroService {
  constructor(
    private readonly db: Database,
    private readonly audit?: AuditLogger,
  ) {}

  async listar(params?: {
    q?: string;
    ativo?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: TomadorCadastroView[] }> {
    const limit = Math.min(Math.max(params?.limit ?? 100, 1), 500);
    const offset = Math.max(params?.offset ?? 0, 0);
    const conditions = [];

    if (params?.ativo !== undefined) {
      conditions.push(eq(schema.tomadorCadastro.ativo, params.ativo));
    }

    const q = params?.q?.trim();
    if (q) {
      const pattern = `%${q.replace(/\s+/g, '%')}%`;
      const digits = q.replace(/\D/g, '');
      const searchParts = [
        ilike(schema.tomadorCadastro.apelido, pattern),
        ilike(schema.tomadorCadastro.razaoSocial, pattern),
      ];
      if (digits) {
        searchParts.push(ilike(schema.tomadorCadastro.cpfCnpj, `%${digits}%`));
      }
      conditions.push(or(...searchParts));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.tomadorCadastro)
      .where(where);

    const rows = await this.db
      .select()
      .from(schema.tomadorCadastro)
      .where(where)
      .orderBy(asc(schema.tomadorCadastro.apelido))
      .limit(limit)
      .offset(offset);

    return {
      total: countRow?.total ?? 0,
      items: rows.map(toView),
    };
  }

  async obter(id: string): Promise<TomadorCadastroView> {
    const rows = await this.db
      .select()
      .from(schema.tomadorCadastro)
      .where(eq(schema.tomadorCadastro.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundError('Tomador', id);
    return toView(row);
  }

  async criar(input: TomadorCadastroInput, ip?: string): Promise<TomadorCadastroView> {
    const data = validateTomadorInput(input);

    const existing = await this.db
      .select({ id: schema.tomadorCadastro.id })
      .from(schema.tomadorCadastro)
      .where(eq(schema.tomadorCadastro.cpfCnpj, data.cpfCnpj))
      .limit(1);
    if (existing[0]) {
      throw new ConflictError('Já existe um tomador cadastrado com este CPF/CNPJ');
    }

    const [row] = await this.db
      .insert(schema.tomadorCadastro)
      .values({
        apelido: data.apelido,
        tipo: data.tipo,
        cpfCnpj: data.cpfCnpj,
        razaoSocial: data.razaoSocial,
        email: data.email,
        telefone: data.telefone,
        inscricaoMunicipal: data.inscricaoMunicipal,
        endereco: data.endereco ?? null,
        ativo: data.ativo ?? true,
      })
      .returning();

    await this.audit?.log({
      action: 'TOMADOR_CRIADO',
      entity: 'tomador_cadastro',
      entityId: row!.id,
      metadata: { apelido: data.apelido, cpfCnpj: data.cpfCnpj },
      ip,
    });

    return toView(row!);
  }

  async atualizar(
    id: string,
    input: Partial<TomadorCadastroInput>,
    ip?: string,
  ): Promise<TomadorCadastroView> {
    const current = await this.obter(id);
    const merged: TomadorCadastroInput = {
      apelido: input.apelido ?? current.apelido,
      tipo: input.tipo ?? current.tipo,
      cpfCnpj: input.cpfCnpj ?? current.cpfCnpj,
      razaoSocial: input.razaoSocial ?? current.razaoSocial,
      email: input.email ?? current.email,
      telefone: input.telefone ?? current.telefone,
      inscricaoMunicipal: input.inscricaoMunicipal ?? current.inscricaoMunicipal,
      endereco: input.endereco !== undefined ? input.endereco : current.endereco,
      ativo: input.ativo ?? current.ativo,
    };
    const data = validateTomadorInput(merged);

    if (data.cpfCnpj !== current.cpfCnpj) {
      const existing = await this.db
        .select({ id: schema.tomadorCadastro.id })
        .from(schema.tomadorCadastro)
        .where(eq(schema.tomadorCadastro.cpfCnpj, data.cpfCnpj))
        .limit(1);
      if (existing[0] && existing[0].id !== id) {
        throw new ConflictError('Já existe um tomador cadastrado com este CPF/CNPJ');
      }
    }

    const [row] = await this.db
      .update(schema.tomadorCadastro)
      .set({
        apelido: data.apelido,
        tipo: data.tipo,
        cpfCnpj: data.cpfCnpj,
        razaoSocial: data.razaoSocial,
        email: data.email,
        telefone: data.telefone,
        inscricaoMunicipal: data.inscricaoMunicipal,
        endereco: data.endereco ?? null,
        ativo: data.ativo ?? true,
        updatedAt: new Date(),
      })
      .where(eq(schema.tomadorCadastro.id, id))
      .returning();

    await this.audit?.log({
      action: 'TOMADOR_ATUALIZADO',
      entity: 'tomador_cadastro',
      entityId: id,
      metadata: { apelido: data.apelido },
      ip,
    });

    return toView(row!);
  }

  async excluir(id: string, ip?: string): Promise<void> {
    await this.obter(id);
    await this.db.delete(schema.tomadorCadastro).where(eq(schema.tomadorCadastro.id, id));
    await this.audit?.log({
      action: 'TOMADOR_EXCLUIDO',
      entity: 'tomador_cadastro',
      entityId: id,
      ip,
    });
  }
}
