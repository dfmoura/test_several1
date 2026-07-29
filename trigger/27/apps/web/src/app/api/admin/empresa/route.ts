import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  AmbienteFiscal,
  empresaInclude,
  getEmpresaRaiz,
  normalizeCnpjEmpresa,
  RegimeTributario,
  serializeEmpresa,
  serializeEmpresaBrand,
  syncEmpresaCnaes,
  type CnaeInput,
} from "@/lib/empresa";
import { normalizeDocumento } from "@/lib/parceiros";

const emptyToNull = (v: string | null | undefined) => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const cnaeItemSchema = z.object({
  codigo: z.string().trim().min(1).max(20),
  descricao: z.string().trim().max(500).optional().nullable(),
  tipo: z.enum(["PRINCIPAL", "SECUNDARIO"]),
  fonte: z.string().trim().max(40).optional().nullable(),
});

const bodySchema = z.object({
  codigo: z.string().trim().max(40).optional().nullable(),
  razaoSocial: z.string().trim().min(2).max(200),
  nomeFantasia: z.string().trim().min(2).max(200),
  cnpj: z.string().trim().min(14).max(20),
  inscricaoEstadual: z.string().trim().max(30).optional().nullable(),
  inscricaoMunicipal: z.string().trim().max(30).optional().nullable(),
  /** Atalho: se `cnaes` não vier, monta lista a partir destes campos. */
  cnaePrincipal: z.string().trim().max(20).optional().nullable(),
  cnaePrincipalDescricao: z.string().trim().max(500).optional().nullable(),
  cnaes: z.array(cnaeItemSchema).max(80).optional(),
  regimeTributario: z
    .enum([
      "SIMPLES_NACIONAL",
      "SIMPLES_EXCESSO",
      "LUCRO_PRESUMIDO",
      "LUCRO_REAL",
      "MEI",
      "OUTRO",
    ])
    .default("SIMPLES_NACIONAL"),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().nullable(),
  celular: z.string().trim().max(30).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  cep: z.string().trim().max(12).optional().nullable(),
  logradouro: z.string().trim().max(200).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().max(100).optional().nullable(),
  cidade: z.string().trim().max(100).optional().nullable(),
  uf: z
    .string()
    .trim()
    .max(2)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase() : v)),
  codigoMunicipioIbge: z.string().trim().max(10).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  ambienteFiscal: z.enum(["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO"),
  simularProducao: z.boolean().optional(),
  ativo: z.boolean().optional(),
  observacoes: z.string().trim().max(4000).optional().nullable(),
});

function resolveCnaeInputs(body: z.infer<typeof bodySchema>): CnaeInput[] | null {
  if (body.cnaes) return body.cnaes as CnaeInput[];
  if (body.cnaePrincipal) {
    return [
      {
        codigo: body.cnaePrincipal,
        descricao: body.cnaePrincipalDescricao ?? null,
        tipo: "PRINCIPAL",
        fonte: "manual",
      },
    ];
  }
  return null;
}

/** Brand público autenticado (header). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const full = req.nextUrl.searchParams.get("full") === "1";
  const empresa = await getEmpresaRaiz();
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não cadastrada" }, { status: 404 });
  }

  if (full) {
    try {
      requireRole(session, [Role.ADMIN]);
    } catch {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    return NextResponse.json(serializeEmpresa(empresa));
  }

  return NextResponse.json(serializeEmpresaBrand(empresa));
}

/** Atualiza (ou cria) o cadastro único da empresa matriz — admin. */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const cnpj = normalizeCnpjEmpresa(body.cnpj);
    const cepDigits = normalizeDocumento(body.cep);
    const cep = cepDigits && cepDigits.length === 8 ? cepDigits : emptyToNull(body.cep);
    const cnaeInputs = resolveCnaeInputs(body);

    const existing = await getEmpresaRaiz();

    if (existing && existing.cnpj !== cnpj) {
      const conflict = await prisma.empresa.findUnique({ where: { cnpj } });
      if (conflict && conflict.id !== existing.id) {
        return NextResponse.json({ error: "CNPJ já cadastrado em outra empresa" }, { status: 409 });
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const baseData = {
        codigo: emptyToNull(body.codigo),
        razaoSocial: body.razaoSocial,
        nomeFantasia: body.nomeFantasia,
        cnpj,
        inscricaoEstadual: emptyToNull(body.inscricaoEstadual),
        inscricaoMunicipal: emptyToNull(body.inscricaoMunicipal),
        regimeTributario: body.regimeTributario as RegimeTributario,
        email: emptyToNull(body.email),
        telefone: emptyToNull(body.telefone),
        celular: emptyToNull(body.celular),
        website: emptyToNull(body.website),
        cep,
        logradouro: emptyToNull(body.logradouro),
        numero: emptyToNull(body.numero),
        complemento: emptyToNull(body.complemento),
        bairro: emptyToNull(body.bairro),
        cidade: emptyToNull(body.cidade),
        uf: emptyToNull(body.uf),
        codigoMunicipioIbge: emptyToNull(body.codigoMunicipioIbge),
        logoUrl: emptyToNull(body.logoUrl),
        ambienteFiscal: body.ambienteFiscal as AmbienteFiscal,
        simularProducao: body.simularProducao ?? true,
        ativo: body.ativo ?? true,
        observacoes: emptyToNull(body.observacoes),
        isMatriz: true as const,
      };

      const empresa = existing
        ? await tx.empresa.update({ where: { id: existing.id }, data: baseData })
        : await tx.empresa.create({ data: baseData });

      if (cnaeInputs) {
        const denorm = await syncEmpresaCnaes(tx, empresa.id, cnaeInputs);
        await tx.empresa.update({
          where: { id: empresa.id },
          data: {
            cnaePrincipal: denorm.cnaePrincipal,
            cnaePrincipalDescricao: denorm.cnaePrincipalDescricao,
          },
        });
      }

      return tx.empresa.findUniqueOrThrow({
        where: { id: empresa.id },
        include: empresaInclude,
      });
    });

    // Propaga escopo raiz em registros sem empresa (migração suave single-tenant).
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { empresaId: null },
        data: { empresaId: saved.id },
      }),
      prisma.parceiro.updateMany({
        where: { empresaId: null },
        data: { empresaId: saved.id },
      }),
      prisma.orcamento.updateMany({
        where: { empresaId: null },
        data: { empresaId: saved.id },
      }),
      prisma.parametroSistema.updateMany({
        where: { empresaId: null },
        data: { empresaId: saved.id },
      }),
    ]);

    await writeAudit({
      entityType: "Empresa",
      entityId: saved.id,
      action: existing ? "UPDATE" : "CREATE",
      oldValue: existing
        ? {
            razaoSocial: existing.razaoSocial,
            cnpj: existing.cnpj,
            cnaePrincipal: existing.cnaePrincipal,
          }
        : undefined,
      newValue: {
        razaoSocial: saved.razaoSocial,
        nomeFantasia: saved.nomeFantasia,
        cnpj: saved.cnpj,
        cnaePrincipal: saved.cnaePrincipal,
        cnaes: saved.cnaes.length,
        ambienteFiscal: saved.ambienteFiscal,
      },
      userId: session.id,
    });

    return NextResponse.json(serializeEmpresa(saved));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const status =
      e && typeof e === "object" && "status" in e ? Number((e as { status: number }).status) : 400;
    const msg = e instanceof Error ? e.message : "Erro ao salvar empresa";
    return NextResponse.json({ error: msg }, { status: status || 400 });
  }
}
