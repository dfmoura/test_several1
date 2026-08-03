import {
  AmbienteFiscal,
  FinalidadeCertificado,
  RegimeTributario,
  StatusCertificado,
  TipoCertificado,
  TipoCnae,
  type Empresa,
  type EmpresaCertificado,
  type EmpresaCnae,
  type Prisma,
} from "@prisma/client";
import { formatCnae, normalizeCnaeCodigo } from "@/lib/cnae";
import { formatCep, formatDocumento, normalizeDocumento } from "@/lib/parceiros";
import { prisma } from "@/lib/db";

export const REGIME_LABEL: Record<RegimeTributario, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  SIMPLES_EXCESSO: "Simples (excesso sublimite)",
  LUCRO_PRESUMIDO: "Lucro presumido",
  LUCRO_REAL: "Lucro real",
  MEI: "MEI",
  OUTRO: "Outro",
};

export const AMBIENTE_LABEL: Record<AmbienteFiscal, string> = {
  HOMOLOGACAO: "Homologação (teste)",
  PRODUCAO: "Produção",
};

export const TIPO_CERT_LABEL: Record<TipoCertificado, string> = {
  A1: "A1 (arquivo)",
  A3: "A3 (token/HSM)",
};

export const FINALIDADE_CERT_LABEL: Record<FinalidadeCertificado, string> = {
  NFSE: "NFS-e",
  NFE: "NF-e",
  CTE: "CT-e",
  GERAL: "Uso geral",
};

export const STATUS_CERT_LABEL: Record<StatusCertificado, string> = {
  ATIVO: "Ativo",
  VENCIDO: "Vencido",
  REVOGADO: "Revogado",
  PENDENTE: "Pendente (sem arquivo)",
};

export const EMPRESA_SEED_ID = "seed-emp-00001";
export const EMPRESA_PRINCIPAL_CODIGO = "EMP-00001";
export const EMPRESA_SECUNDARIA_CODIGO = "EMP-00002";

export const empresaInclude: Prisma.EmpresaInclude = {
  certificados: { orderBy: [{ ativo: "desc" }, { validadeFim: "asc" }] },
  cnaes: { where: { ativo: true }, orderBy: [{ tipo: "asc" }, { ordem: "asc" }] },
};

export type EmpresaCompleta = Empresa & {
  certificados: EmpresaCertificado[];
  cnaes: EmpresaCnae[];
};

/** @deprecated use EmpresaCompleta */
export type EmpresaComCertificados = EmpresaCompleta;

/**
 * Resolve a empresa operacional (default EMP-00001).
 * Prefere operacionalPrincipal; depois isMatriz; depois primeira ativa.
 */
export async function getEmpresaRaiz(): Promise<EmpresaCompleta | null> {
  const principal = await prisma.empresa.findFirst({
    where: { ativo: true, operacionalPrincipal: true },
    include: empresaInclude,
    orderBy: { createdAt: "asc" },
  });
  if (principal) return principal;

  const porCodigo = await prisma.empresa.findFirst({
    where: { ativo: true, codigo: EMPRESA_PRINCIPAL_CODIGO },
    include: empresaInclude,
  });
  if (porCodigo) return porCodigo;

  const matriz = await prisma.empresa.findFirst({
    where: { ativo: true, isMatriz: true },
    include: empresaInclude,
    orderBy: { createdAt: "asc" },
  });
  if (matriz) return matriz;

  return prisma.empresa.findFirst({
    where: { ativo: true },
    include: empresaInclude,
    orderBy: { createdAt: "asc" },
  });
}

/** Lista empresas do grupo (cadastro multi-CNPJ). */
export async function listEmpresasGrupo() {
  return prisma.empresa.findMany({
    where: { ativo: true },
    orderBy: [{ operacionalPrincipal: "desc" }, { codigo: "asc" }],
    select: {
      id: true,
      codigo: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      isMatriz: true,
      operacionalPrincipal: true,
      vendaHabilitada: true,
      ambienteFiscal: true,
      simularProducao: true,
    },
  });
}

export async function requireEmpresaRaiz(): Promise<EmpresaCompleta> {
  const empresa = await getEmpresaRaiz();
  if (!empresa) {
    throw Object.assign(new Error("Empresa raiz não cadastrada"), { status: 404 });
  }
  return empresa;
}

export type CnaeInput = {
  codigo: string;
  descricao?: string | null;
  tipo: "PRINCIPAL" | "SECUNDARIO";
  fonte?: string | null;
};

/** Normaliza lista: 1 principal + N secundários, sem códigos duplicados. */
export function normalizeCnaeList(items: CnaeInput[]): Array<{
  codigo: string;
  descricao: string | null;
  tipo: TipoCnae;
  ordem: number;
  fonte: string | null;
}> {
  const out: Array<{
    codigo: string;
    descricao: string | null;
    tipo: TipoCnae;
    ordem: number;
    fonte: string | null;
  }> = [];
  const seen = new Set<string>();

  const principal = items.find((i) => i.tipo === "PRINCIPAL");
  if (principal) {
    const codigo = normalizeCnaeCodigo(principal.codigo);
    if (codigo) {
      seen.add(codigo);
      out.push({
        codigo,
        descricao: principal.descricao?.trim() || null,
        tipo: TipoCnae.PRINCIPAL,
        ordem: 0,
        fonte: principal.fonte?.trim() || null,
      });
    }
  }

  let ordem = 1;
  for (const item of items) {
    if (item.tipo !== "SECUNDARIO") continue;
    const codigo = normalizeCnaeCodigo(item.codigo);
    if (!codigo || seen.has(codigo)) continue;
    seen.add(codigo);
    out.push({
      codigo,
      descricao: item.descricao?.trim() || null,
      tipo: TipoCnae.SECUNDARIO,
      ordem: ordem++,
      fonte: item.fonte?.trim() || null,
    });
  }

  return out;
}

/** Substitui CNAEs da empresa e denormaliza o principal. */
export async function syncEmpresaCnaes(
  tx: Prisma.TransactionClient,
  empresaId: string,
  items: CnaeInput[],
): Promise<{ cnaePrincipal: string | null; cnaePrincipalDescricao: string | null }> {
  const normalized = normalizeCnaeList(items);
  await tx.empresaCnae.deleteMany({ where: { empresaId } });
  if (normalized.length > 0) {
    await tx.empresaCnae.createMany({
      data: normalized.map((c) => ({
        empresaId,
        codigo: c.codigo,
        descricao: c.descricao,
        tipo: c.tipo,
        ordem: c.ordem,
        fonte: c.fonte,
        ativo: true,
      })),
    });
  }
  const principal = normalized.find((c) => c.tipo === TipoCnae.PRINCIPAL);
  return {
    cnaePrincipal: principal?.codigo ?? null,
    cnaePrincipalDescricao: principal?.descricao ?? null,
  };
}

export function deriveCertStatus(opts: {
  status?: StatusCertificado;
  validadeFim?: Date | null;
  temArquivo: boolean;
  ativo: boolean;
}): StatusCertificado {
  if (!opts.ativo || opts.status === StatusCertificado.REVOGADO) {
    return opts.status === StatusCertificado.REVOGADO
      ? StatusCertificado.REVOGADO
      : StatusCertificado.PENDENTE;
  }
  if (opts.validadeFim && opts.validadeFim.getTime() < Date.now()) {
    return StatusCertificado.VENCIDO;
  }
  if (!opts.temArquivo && opts.status !== StatusCertificado.ATIVO) {
    return StatusCertificado.PENDENTE;
  }
  return StatusCertificado.ATIVO;
}

export function serializeCnae(c: EmpresaCnae) {
  return {
    id: c.id,
    codigo: c.codigo,
    codigoFormatado: formatCnae(c.codigo),
    descricao: c.descricao,
    tipo: c.tipo,
    ordem: c.ordem,
    fonte: c.fonte,
    ativo: c.ativo,
  };
}

export function serializeCertificado(c: EmpresaCertificado) {
  const temArquivo = c.arquivoCifrado != null && c.arquivoCifrado.length > 0;
  const status = deriveCertStatus({
    status: c.status,
    validadeFim: c.validadeFim,
    temArquivo,
    ativo: c.ativo,
  });
  return {
    id: c.id,
    empresaId: c.empresaId,
    apelido: c.apelido,
    tipo: c.tipo,
    tipoLabel: TIPO_CERT_LABEL[c.tipo],
    finalidade: c.finalidade,
    finalidadeLabel: FINALIDADE_CERT_LABEL[c.finalidade],
    status,
    statusLabel: STATUS_CERT_LABEL[status],
    subjectCn: c.subjectCn,
    serialNumber: c.serialNumber,
    emissor: c.emissor,
    validadeInicio: c.validadeInicio?.toISOString() ?? null,
    validadeFim: c.validadeFim?.toISOString() ?? null,
    arquivoNome: c.arquivoNome,
    arquivoFingerprint: c.arquivoFingerprint,
    temArquivo,
    temSenha: c.senhaCifrada != null && c.senhaCifrada.length > 0,
    ativo: c.ativo,
    observacoes: c.observacoes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeEmpresa(e: EmpresaCompleta) {
  const principal =
    e.cnaes.find((c) => c.tipo === TipoCnae.PRINCIPAL) ||
    (e.cnaePrincipal
      ? ({
          codigo: e.cnaePrincipal,
          descricao: e.cnaePrincipalDescricao,
          tipo: TipoCnae.PRINCIPAL,
        } as Pick<EmpresaCnae, "codigo" | "descricao" | "tipo">)
      : null);
  const secundarios = e.cnaes.filter((c) => c.tipo === TipoCnae.SECUNDARIO);

  return {
    id: e.id,
    codigo: e.codigo,
    razaoSocial: e.razaoSocial,
    nomeFantasia: e.nomeFantasia,
    cnpj: e.cnpj,
    cnpjFormatado: formatDocumento(e.cnpj),
    inscricaoEstadual: e.inscricaoEstadual,
    inscricaoMunicipal: e.inscricaoMunicipal,
    cnaePrincipal: principal?.codigo ?? e.cnaePrincipal,
    cnaePrincipalFormatado: formatCnae(principal?.codigo ?? e.cnaePrincipal),
    cnaePrincipalDescricao: principal?.descricao ?? e.cnaePrincipalDescricao,
    cnaes: e.cnaes.map(serializeCnae),
    cnaesSecundarios: secundarios.map(serializeCnae),
    regimeTributario: e.regimeTributario,
    regimeTributarioLabel: REGIME_LABEL[e.regimeTributario],
    email: e.email,
    telefone: e.telefone,
    celular: e.celular,
    website: e.website,
    cep: e.cep,
    cepFormatado: formatCep(e.cep),
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    cidade: e.cidade,
    uf: e.uf,
    codigoMunicipioIbge: e.codigoMunicipioIbge,
    logoUrl: e.logoUrl,
    ambienteFiscal: e.ambienteFiscal,
    ambienteFiscalLabel: AMBIENTE_LABEL[e.ambienteFiscal],
    simularProducao: e.simularProducao,
    isMatriz: e.isMatriz,
    operacionalPrincipal: e.operacionalPrincipal,
    vendaHabilitada: e.vendaHabilitada,
    parentId: e.parentId,
    ativo: e.ativo,
    observacoes: e.observacoes,
    certificados: e.certificados.map(serializeCertificado),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Brand mínimo para header / PDF (sem dados sensíveis). */
export function serializeEmpresaBrand(
  e: Pick<
    Empresa,
    | "id"
    | "codigo"
    | "nomeFantasia"
    | "razaoSocial"
    | "cnpj"
    | "ambienteFiscal"
    | "simularProducao"
    | "operacionalPrincipal"
    | "vendaHabilitada"
    | "logoUrl"
  >,
) {
  return {
    id: e.id,
    codigo: e.codigo,
    nomeFantasia: e.nomeFantasia,
    razaoSocial: e.razaoSocial,
    cnpjFormatado: formatDocumento(e.cnpj),
    ambienteFiscal: e.ambienteFiscal,
    simularProducao: e.simularProducao,
    operacionalPrincipal: e.operacionalPrincipal,
    vendaHabilitada: e.vendaHabilitada,
    logoUrl: e.logoUrl ?? "/brand/logotipo-retaetiquetas.png",
  };
}

export function normalizeCnpjEmpresa(value: string): string {
  const d = normalizeDocumento(value);
  if (!d || d.length !== 14) {
    throw Object.assign(new Error("CNPJ da empresa deve ter 14 dígitos"), { status: 400 });
  }
  return d;
}

export {
  AmbienteFiscal,
  FinalidadeCertificado,
  RegimeTributario,
  StatusCertificado,
  TipoCertificado,
  TipoCnae,
};
