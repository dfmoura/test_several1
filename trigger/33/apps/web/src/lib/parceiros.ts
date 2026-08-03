import { TipoParceiro, TipoPessoa, type Parceiro, type ParceiroTipo, type User } from "@prisma/client";

export const TIPOS_PARCEIRO: TipoParceiro[] = [
  TipoParceiro.CLIENTE,
  TipoParceiro.FORNECEDOR,
  TipoParceiro.VENDEDOR,
  TipoParceiro.USUARIO,
];

export const TIPO_PARCEIRO_LABEL: Record<TipoParceiro, string> = {
  CLIENTE: "Cliente",
  FORNECEDOR: "Fornecedor",
  VENDEDOR: "Vendedor",
  USUARIO: "Usuário do sistema",
};

export const TIPO_PESSOA_LABEL: Record<TipoPessoa, string> = {
  PF: "Pessoa física",
  PJ: "Pessoa jurídica",
};

export type ParceiroComTipos = Parceiro & {
  tipos: ParceiroTipo[];
  user?: Pick<User, "id" | "email" | "role" | "active"> | null;
};

/** Normaliza CPF/CNPJ para apenas dígitos (ou null se vazio). */
export function normalizeDocumento(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function formatDocumento(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}

export function formatCep(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length !== 8) return value;
  return d.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/** Máscara progressiva de CNPJ enquanto digita. */
export function formatCnpjMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.replace(/(\d{2})(\d+)/, "$1.$2");
  if (d.length <= 8) return d.replace(/(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (d.length <= 12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
}

/** Máscara progressiva de CEP enquanto digita. */
export function formatCepMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return d.replace(/(\d{5})(\d{0,3})/, "$1-$2");
}

/** Máscara progressiva de CPF enquanto digita. */
export function formatCpfMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.replace(/(\d{3})(\d+)/, "$1.$2");
  if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
}

export function serializeParceiro(p: ParceiroComTipos) {
  return {
    id: p.id,
    codigo: p.codigo,
    tipoPessoa: p.tipoPessoa,
    nome: p.nome,
    razaoSocial: p.razaoSocial,
    documento: p.documento,
    documentoFormatado: formatDocumento(p.documento),
    email: p.email,
    telefone: p.telefone,
    celular: p.celular,
    website: p.website,
    cep: p.cep,
    logradouro: p.logradouro,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    cidade: p.cidade,
    uf: p.uf,
    codigoMunicipioIbge: p.codigoMunicipioIbge,
    paisCodigo: p.paisCodigo,
    inscricaoEstadual: p.inscricaoEstadual,
    inscricaoMunicipal: p.inscricaoMunicipal,
    indicadorIeDest: p.indicadorIeDest,
    contribuinteIcms: p.contribuinteIcms,
    consumidorFinal: p.consumidorFinal,
    emailFiscal: p.emailFiscal,
    observacoes: p.observacoes,
    ativo: p.ativo,
    tipos: p.tipos.map((t) => ({
      tipo: t.tipo,
      label: TIPO_PARCEIRO_LABEL[t.tipo],
      comissaoPadraoPct: t.comissaoPadraoPct != null ? Number(t.comissaoPadraoPct) : null,
      ativo: t.ativo,
    })),
    tiposFlags: {
      cliente: p.tipos.some((t) => t.tipo === TipoParceiro.CLIENTE && t.ativo),
      fornecedor: p.tipos.some((t) => t.tipo === TipoParceiro.FORNECEDOR && t.ativo),
      vendedor: p.tipos.some((t) => t.tipo === TipoParceiro.VENDEDOR && t.ativo),
      usuario: p.tipos.some((t) => t.tipo === TipoParceiro.USUARIO && t.ativo),
    },
    acesso: p.user
      ? {
          userId: p.user.id,
          email: p.user.email,
          role: p.user.role,
          active: p.user.active,
        }
      : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const parceiroInclude = {
  tipos: { orderBy: { tipo: "asc" as const } },
  user: { select: { id: true, email: true, role: true, active: true } },
} as const;
