import { NextRequest, NextResponse } from "next/server";
import { FinalidadeCertificado, Role, StatusCertificado, TipoCertificado } from "@prisma/client";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { encryptBytes, encryptText, sha256Hex, toPrismaBytes } from "@/lib/crypto-secret";
import { prisma } from "@/lib/db";
import { deriveCertStatus, serializeCertificado } from "@/lib/empresa";

const emptyToNull = (v: string | null | undefined) => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const bodySchema = z.object({
  apelido: z.string().trim().min(2).max(80).optional(),
  tipo: z.enum(["A1", "A3"]).optional(),
  finalidade: z.enum(["NFSE", "NFE", "CTE", "GERAL"]).optional(),
  subjectCn: z.string().trim().max(200).optional().nullable(),
  serialNumber: z.string().trim().max(80).optional().nullable(),
  emissor: z.string().trim().max(200).optional().nullable(),
  validadeInicio: z.string().datetime().optional().nullable().or(z.string().date().optional().nullable()),
  validadeFim: z.string().datetime().optional().nullable().or(z.string().date().optional().nullable()),
  arquivoNome: z.string().trim().max(200).optional().nullable(),
  arquivoBase64: z.string().optional().nullable(),
  senha: z.string().min(1).max(200).optional().nullable(),
  limparArquivo: z.boolean().optional(),
  limparSenha: z.boolean().optional(),
  ativo: z.boolean().optional(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ATIVO", "VENCIDO", "REVOGADO", "PENDENTE"]).optional(),
});

function parseDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

type Ctx = { params: Promise<{ id: string }> };

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
    const existing = await prisma.empresaCertificado.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Certificado não encontrado" }, { status: 404 });
    }

    const body = bodySchema.parse(await req.json());

    if (body.apelido && body.apelido !== existing.apelido) {
      const dup = await prisma.empresaCertificado.findUnique({
        where: {
          empresaId_apelido: { empresaId: existing.empresaId, apelido: body.apelido },
        },
      });
      if (dup) {
        return NextResponse.json({ error: "Já existe certificado com este apelido" }, { status: 409 });
      }
    }

    let arquivoCifrado: Uint8Array | null = existing.arquivoCifrado
      ? new Uint8Array(existing.arquivoCifrado)
      : null;
    let arquivoFingerprint = existing.arquivoFingerprint;
    let arquivoNome = existing.arquivoNome;
    let senhaCifrada: Uint8Array | null = existing.senhaCifrada
      ? new Uint8Array(existing.senhaCifrada)
      : null;

    if (body.limparArquivo) {
      arquivoCifrado = null;
      arquivoFingerprint = null;
      arquivoNome = null;
    }
    if (body.arquivoBase64) {
      const raw = Buffer.from(body.arquivoBase64.replace(/^data:.*?;base64,/, ""), "base64");
      if (raw.length < 16) {
        return NextResponse.json({ error: "Arquivo de certificado inválido" }, { status: 400 });
      }
      if (raw.length > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Arquivo excede 5 MB" }, { status: 400 });
      }
      arquivoFingerprint = sha256Hex(raw);
      arquivoCifrado = encryptBytes(raw);
      arquivoNome = emptyToNull(body.arquivoNome) ?? existing.arquivoNome ?? "certificado.pfx";
    } else if (body.arquivoNome !== undefined) {
      arquivoNome = emptyToNull(body.arquivoNome);
    }

    if (body.limparSenha) senhaCifrada = null;
    if (body.senha) senhaCifrada = encryptText(body.senha);

    const validadeInicio =
      body.validadeInicio !== undefined ? parseDate(body.validadeInicio) : existing.validadeInicio;
    const validadeFim =
      body.validadeFim !== undefined ? parseDate(body.validadeFim) : existing.validadeFim;
    const ativo = body.ativo ?? existing.ativo;
    const temArquivo = arquivoCifrado != null && arquivoCifrado.length > 0;

    let status: StatusCertificado;
    if (body.status === "REVOGADO") {
      status = StatusCertificado.REVOGADO;
    } else {
      status = deriveCertStatus({
        status: body.status as StatusCertificado | undefined,
        validadeFim: validadeFim ?? null,
        temArquivo,
        ativo,
      });
    }

    const updated = await prisma.empresaCertificado.update({
      where: { id },
      data: {
        apelido: body.apelido ?? existing.apelido,
        tipo: (body.tipo as TipoCertificado | undefined) ?? existing.tipo,
        finalidade: (body.finalidade as FinalidadeCertificado | undefined) ?? existing.finalidade,
        subjectCn: body.subjectCn !== undefined ? emptyToNull(body.subjectCn) : existing.subjectCn,
        serialNumber:
          body.serialNumber !== undefined ? emptyToNull(body.serialNumber) : existing.serialNumber,
        emissor: body.emissor !== undefined ? emptyToNull(body.emissor) : existing.emissor,
        validadeInicio: validadeInicio === undefined ? existing.validadeInicio : validadeInicio,
        validadeFim: validadeFim === undefined ? existing.validadeFim : validadeFim,
        arquivoNome,
        arquivoFingerprint,
        arquivoCifrado: toPrismaBytes(arquivoCifrado),
        senhaCifrada: toPrismaBytes(senhaCifrada),
        ativo,
        status,
        observacoes:
          body.observacoes !== undefined ? emptyToNull(body.observacoes) : existing.observacoes,
      },
    });

    await writeAudit({
      entityType: "EmpresaCertificado",
      entityId: updated.id,
      action: "UPDATE",
      oldValue: { apelido: existing.apelido, status: existing.status, ativo: existing.ativo },
      newValue: { apelido: updated.apelido, status: updated.status, ativo: updated.ativo },
      userId: session.id,
    });

    return NextResponse.json(serializeCertificado(updated));
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
  const existing = await prisma.empresaCertificado.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Certificado não encontrado" }, { status: 404 });
  }

  await prisma.empresaCertificado.delete({ where: { id } });
  await writeAudit({
    entityType: "EmpresaCertificado",
    entityId: id,
    action: "DELETE",
    oldValue: { apelido: existing.apelido },
    userId: session.id,
  });

  return NextResponse.json({ ok: true });
}
