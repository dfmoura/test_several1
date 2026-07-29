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
} from "@/lib/parceiros";

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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const item = await prisma.parceiro.findUnique({
    where: { id },
    include: parceiroInclude,
  });
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(serializeParceiro(item));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = bodySchema.parse(await req.json());
    const current = await prisma.parceiro.findUnique({
      where: { id },
      include: parceiroInclude,
    });
    if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const tipos = [...new Set(body.tipos)] as TipoParceiro[];
    const wantsUsuario = tipos.includes(TipoParceiro.USUARIO);
    const documento = normalizeDocumento(body.documento);

    if (documento) {
      const dup = await prisma.parceiro.findFirst({
        where: { documento, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json(
          { error: "Já existe parceiro com este documento" },
          { status: 409 },
        );
      }
    }

    if (wantsUsuario && !current.user && !body.acesso?.password) {
      return NextResponse.json(
        { error: "Informe a senha inicial ao habilitar acesso ao sistema" },
        { status: 400 },
      );
    }
    if (wantsUsuario && !body.acesso?.email && !current.user) {
      return NextResponse.json(
        { error: "E-mail de acesso é obrigatório para usuário do sistema" },
        { status: 400 },
      );
    }

    if (body.acesso?.email) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: body.acesso.email,
          NOT: current.user ? { id: current.user.id } : undefined,
        },
      });
      if (emailTaken) {
        return NextResponse.json({ error: "E-mail de acesso já em uso" }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.parceiro.update({
        where: { id },
        data: {
          codigo: emptyToNull(body.codigo),
          tipoPessoa: body.tipoPessoa as TipoPessoa,
          nome: body.nome,
          razaoSocial: emptyToNull(body.razaoSocial),
          documento,
          email: emptyToNull(body.email) ?? body.acesso?.email ?? current.email,
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
          ativo: body.ativo ?? current.ativo,
        },
      });

      await tx.parceiroTipo.deleteMany({ where: { parceiroId: id } });
      await tx.parceiroTipo.createMany({
        data: tipos.map((tipo) => ({
          parceiroId: id,
          tipo,
          comissaoPadraoPct:
            tipo === TipoParceiro.VENDEDOR ? (body.comissaoPadraoPct ?? null) : null,
        })),
      });

      if (wantsUsuario) {
        const email = body.acesso?.email || current.user?.email;
        if (!email) throw new Error("E-mail de acesso obrigatório");

        if (current.user) {
          await tx.user.update({
            where: { id: current.user.id },
            data: {
              email,
              name: body.nome,
              role: (body.acesso?.role as Role) || current.user.role,
              active: body.acesso?.active ?? current.user.active,
              ...(body.acesso?.password
                ? { passwordHash: await bcrypt.hash(body.acesso.password, 12) }
                : {}),
            },
          });
        } else if (body.acesso?.password) {
          await tx.user.create({
            data: {
              email,
              name: body.nome,
              passwordHash: await bcrypt.hash(body.acesso.password, 12),
              role: body.acesso.role as Role,
              active: body.acesso.active ?? true,
              parceiroId: id,
            },
          });
        }
      } else if (current.user) {
        // Remove tipo USUARIO: desativa login, mantém histórico de auditoria.
        await tx.user.update({
          where: { id: current.user.id },
          data: { active: false, parceiroId: null },
        });
      }

      return tx.parceiro.findUniqueOrThrow({
        where: { id },
        include: parceiroInclude,
      });
    });

    await writeAudit({
      entityType: "Parceiro",
      entityId: id,
      action: "UPDATE",
      oldValue: {
        nome: current.nome,
        tipos: current.tipos.map((t) => t.tipo),
        ativo: current.ativo,
      },
      newValue: {
        nome: updated.nome,
        tipos,
        ativo: updated.ativo,
      },
      userId: session.id,
    });

    return NextResponse.json(serializeParceiro(updated));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro ao atualizar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const current = await prisma.parceiro.findUnique({
    where: { id },
    include: { user: true, _count: { select: { orcamentosComoCliente: true, orcamentosComoVendedor: true } } },
  });
  if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const emUso =
    current._count.orcamentosComoCliente + current._count.orcamentosComoVendedor > 0;

  if (emUso) {
    // Soft-delete: preserva FKs e histórico comercial.
    await prisma.$transaction(async (tx) => {
      await tx.parceiro.update({ where: { id }, data: { ativo: false } });
      if (current.user) {
        await tx.user.update({
          where: { id: current.user.id },
          data: { active: false },
        });
      }
    });

    await writeAudit({
      entityType: "Parceiro",
      entityId: id,
      action: "SOFT_DELETE",
      oldValue: { ativo: true },
      newValue: { ativo: false },
      userId: session.id,
    });

    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message: "Parceiro inativado (possui orçamentos vinculados).",
    });
  }

  await prisma.$transaction(async (tx) => {
    if (current.user) {
      await tx.user.update({
        where: { id: current.user.id },
        data: { parceiroId: null, active: false },
      });
    }
    await tx.parceiro.delete({ where: { id } });
  });

  await writeAudit({
    entityType: "Parceiro",
    entityId: id,
    action: "DELETE",
    oldValue: { nome: current.nome },
    userId: session.id,
  });

  return NextResponse.json({ ok: true, softDeleted: false });
}
