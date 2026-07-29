import { NextRequest, NextResponse } from "next/server";
import { Role, TipoParceiro, TipoPessoa } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  normalizeDocumento,
  parceiroInclude,
  serializeParceiro,
  TIPOS_PARCEIRO,
} from "@/lib/parceiros";
import { getEmpresaRaiz } from "@/lib/empresa";

const tipoSchema = z.enum(["CLIENTE", "FORNECEDOR", "VENDEDOR", "USUARIO"]);

const acessoSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).optional(),
    role: z.enum(["ADMIN", "VENDEDOR", "ORCAMENTISTA"]),
    active: z.boolean().optional(),
  })
  .optional()
  .nullable();

const bodySchema = z.object({
  codigo: z.string().trim().max(40).optional().nullable(),
  tipoPessoa: z.enum(["PF", "PJ"]).default("PJ"),
  nome: z.string().trim().min(2).max(200),
  razaoSocial: z.string().trim().max(200).optional().nullable(),
  documento: z.string().trim().max(20).optional().nullable(),
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
  observacoes: z.string().trim().max(2000).optional().nullable(),
  ativo: z.boolean().optional(),
  tipos: z.array(tipoSchema).min(1),
  comissaoPadraoPct: z.number().min(0).max(100).optional().nullable(),
  acesso: acessoSchema,
});

function emptyToNull(v: string | null | undefined) {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tipoParam = req.nextUrl.searchParams.get("tipo");
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const ativoParam = req.nextUrl.searchParams.get("ativo");
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") || 200), 500);

  let tipoFilter: TipoParceiro | undefined;
  if (tipoParam) {
    if (!TIPOS_PARCEIRO.includes(tipoParam as TipoParceiro)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    tipoFilter = tipoParam as TipoParceiro;
  }

  const items = await prisma.parceiro.findMany({
    where: {
      ...(ativoParam === "true" ? { ativo: true } : {}),
      ...(ativoParam === "false" ? { ativo: false } : {}),
      ...(tipoFilter
        ? { tipos: { some: { tipo: tipoFilter, ativo: true } } }
        : {}),
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" } },
              { razaoSocial: { contains: q, mode: "insensitive" } },
              { documento: { contains: q.replace(/\D/g, "") } },
              { email: { contains: q, mode: "insensitive" } },
              { codigo: { contains: q, mode: "insensitive" } },
              { cidade: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: parceiroInclude,
    orderBy: { nome: "asc" },
    take,
  });

  return NextResponse.json({ items: items.map(serializeParceiro) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const tipos = [...new Set(body.tipos)] as TipoParceiro[];
    const wantsUsuario = tipos.includes(TipoParceiro.USUARIO);

    if (wantsUsuario && !body.acesso?.email) {
      return NextResponse.json(
        { error: "Parceiro com tipo USUARIO exige e-mail e senha de acesso" },
        { status: 400 },
      );
    }
    if (wantsUsuario && !body.acesso?.password) {
      return NextResponse.json(
        { error: "Informe a senha inicial do usuário do sistema" },
        { status: 400 },
      );
    }

    const documento = normalizeDocumento(body.documento);
    if (documento) {
      const dup = await prisma.parceiro.findFirst({ where: { documento } });
      if (dup) {
        return NextResponse.json(
          { error: "Já existe parceiro com este documento" },
          { status: 409 },
        );
      }
    }

    if (body.acesso?.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: body.acesso.email } });
      if (emailTaken) {
        return NextResponse.json({ error: "E-mail de acesso já em uso" }, { status: 409 });
      }
    }

    const empresa = await getEmpresaRaiz();

    const created = await prisma.$transaction(async (tx) => {
      const parceiro = await tx.parceiro.create({
        data: {
          empresaId: empresa?.id ?? null,
          codigo: emptyToNull(body.codigo),
          tipoPessoa: body.tipoPessoa as TipoPessoa,
          nome: body.nome,
          razaoSocial: emptyToNull(body.razaoSocial),
          documento,
          email: emptyToNull(body.email) ?? body.acesso?.email ?? null,
          telefone: emptyToNull(body.telefone),
          celular: emptyToNull(body.celular),
          website: emptyToNull(body.website),
          cep: emptyToNull(body.cep),
          logradouro: emptyToNull(body.logradouro),
          numero: emptyToNull(body.numero),
          complemento: emptyToNull(body.complemento),
          bairro: emptyToNull(body.bairro),
          cidade: emptyToNull(body.cidade),
          uf: emptyToNull(body.uf),
          observacoes: emptyToNull(body.observacoes),
          ativo: body.ativo ?? true,
          tipos: {
            create: tipos.map((tipo) => ({
              tipo,
              comissaoPadraoPct:
                tipo === TipoParceiro.VENDEDOR ? (body.comissaoPadraoPct ?? null) : null,
            })),
          },
        },
        include: parceiroInclude,
      });

      if (wantsUsuario && body.acesso?.email && body.acesso.password) {
        await tx.user.create({
          data: {
            email: body.acesso.email,
            name: body.nome,
            passwordHash: await bcrypt.hash(body.acesso.password, 12),
            role: body.acesso.role as Role,
            active: body.acesso.active ?? true,
            parceiroId: parceiro.id,
            empresaId: empresa?.id ?? null,
          },
        });
      }

      return tx.parceiro.findUniqueOrThrow({
        where: { id: parceiro.id },
        include: parceiroInclude,
      });
    });

    await writeAudit({
      entityType: "Parceiro",
      entityId: created.id,
      action: "CREATE",
      newValue: {
        nome: created.nome,
        tipos,
        documento: created.documento,
      },
      userId: session.id,
    });

    return NextResponse.json(serializeParceiro(created), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro ao criar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
