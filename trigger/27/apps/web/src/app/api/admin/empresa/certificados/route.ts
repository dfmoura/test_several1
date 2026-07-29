import { NextRequest, NextResponse } from "next/server";
import { FinalidadeCertificado, Role, StatusCertificado, TipoCertificado } from "@prisma/client";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { encryptBytes, encryptText, sha256Hex, toPrismaBytes } from "@/lib/crypto-secret";
import { prisma } from "@/lib/db";
import {
  deriveCertStatus,
  requireEmpresaRaiz,
  serializeCertificado,
} from "@/lib/empresa";

const emptyToNull = (v: string | null | undefined) => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const bodySchema = z.object({
  apelido: z.string().trim().min(2).max(80),
  tipo: z.enum(["A1", "A3"]).default("A1"),
  finalidade: z.enum(["NFSE", "NFE", "CTE", "GERAL"]).default("GERAL"),
  subjectCn: z.string().trim().max(200).optional().nullable(),
  serialNumber: z.string().trim().max(80).optional().nullable(),
  emissor: z.string().trim().max(200).optional().nullable(),
  validadeInicio: z.string().datetime().optional().nullable().or(z.string().date().optional().nullable()),
  validadeFim: z.string().datetime().optional().nullable().or(z.string().date().optional().nullable()),
  arquivoNome: z.string().trim().max(200).optional().nullable(),
  /** Base64 do .pfx/.p12 (opcional em simulação). */
  arquivoBase64: z.string().optional().nullable(),
  senha: z.string().min(1).max(200).optional().nullable(),
  ativo: z.boolean().optional(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const empresa = await requireEmpresaRaiz();
    return NextResponse.json({
      empresaId: empresa.id,
      items: empresa.certificados.map(serializeCertificado),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
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
    const empresa = await requireEmpresaRaiz();
    const body = bodySchema.parse(await req.json());

    const dup = await prisma.empresaCertificado.findUnique({
      where: { empresaId_apelido: { empresaId: empresa.id, apelido: body.apelido } },
    });
    if (dup) {
      return NextResponse.json({ error: "Já existe certificado com este apelido" }, { status: 409 });
    }

    let arquivoCifrado: Uint8Array | null = null;
    let arquivoFingerprint: string | null = null;
    let arquivoNome = emptyToNull(body.arquivoNome);
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
      arquivoNome = arquivoNome ?? "certificado.pfx";
    }

    let senhaCifrada: Uint8Array | null = null;
    if (body.senha) {
      senhaCifrada = encryptText(body.senha);
    }

    const validadeInicio = parseDate(body.validadeInicio ?? null);
    const validadeFim = parseDate(body.validadeFim ?? null);
    const ativo = body.ativo ?? true;
    const temArquivo = arquivoCifrado != null;
    const status = deriveCertStatus({
      validadeFim,
      temArquivo,
      ativo,
    });

    const created = await prisma.empresaCertificado.create({
      data: {
        empresaId: empresa.id,
        apelido: body.apelido,
        tipo: body.tipo as TipoCertificado,
        finalidade: body.finalidade as FinalidadeCertificado,
        status: status as StatusCertificado,
        subjectCn: emptyToNull(body.subjectCn),
        serialNumber: emptyToNull(body.serialNumber),
        emissor: emptyToNull(body.emissor),
        validadeInicio,
        validadeFim,
        arquivoNome,
        arquivoFingerprint,
        arquivoCifrado: toPrismaBytes(arquivoCifrado),
        senhaCifrada: toPrismaBytes(senhaCifrada),
        ativo,
        observacoes: emptyToNull(body.observacoes),
      },
    });

    await writeAudit({
      entityType: "EmpresaCertificado",
      entityId: created.id,
      action: "CREATE",
      newValue: {
        apelido: created.apelido,
        tipo: created.tipo,
        finalidade: created.finalidade,
        status: created.status,
        temArquivo,
      },
      userId: session.id,
    });

    return NextResponse.json(serializeCertificado(created), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const status = e && typeof e === "object" && "status" in e ? Number((e as { status: number }).status) : 400;
    const msg = e instanceof Error ? e.message : "Erro ao criar certificado";
    return NextResponse.json({ error: msg }, { status: status || 400 });
  }
}
