import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await requireEmpresaRaiz();
  const [parametros, naturezas, series, integracao] = await Promise.all([
    prisma.parametroFiscalEmpresa.findUnique({
      where: { empresaId: empresa.id },
      include: { naturezaMercadoria: true },
    }),
    prisma.naturezaOperacao.findMany({
      where: { empresaId: empresa.id },
      orderBy: { codigo: "asc" },
    }),
    prisma.serieDocumentoFiscal.findMany({
      where: { empresaId: empresa.id },
      orderBy: [{ tipo: "asc" }, { serie: "asc" }],
    }),
    prisma.empresaIntegracao.findUnique({
      where: { empresaId_provider: { empresaId: empresa.id, provider: "FOCUS_NFE" } },
    }),
  ]);

  return NextResponse.json({
    empresa: {
      id: empresa.id,
      cnpj: empresa.cnpj,
      razaoSocial: empresa.razaoSocial,
      inscricaoEstadual: empresa.inscricaoEstadual,
      inscricaoMunicipal: empresa.inscricaoMunicipal,
      codigoMunicipioIbge: empresa.codigoMunicipioIbge,
      uf: empresa.uf,
      ambienteFiscal: empresa.ambienteFiscal,
      simularProducao: empresa.simularProducao,
      regimeTributario: empresa.regimeTributario,
    },
    parametros: parametros
      ? {
          ...parametros,
          pTotTribSN: Number(parametros.pTotTribSN),
          pTotTribFederal:
            parametros.pTotTribFederal != null ? Number(parametros.pTotTribFederal) : null,
          pTotTribEstadual:
            parametros.pTotTribEstadual != null ? Number(parametros.pTotTribEstadual) : null,
          pTotTribMunicipal:
            parametros.pTotTribMunicipal != null ? Number(parametros.pTotTribMunicipal) : null,
        }
      : null,
    naturezas,
    series,
    focus: integracao
      ? {
          modo: integracao.modo,
          ativo: integracao.ativo,
          baseUrlHomolog: integracao.baseUrlHomolog,
          baseUrlProd: integracao.baseUrlProd,
          docs: {
            nfe: "https://doc.focusnfe.com.br/reference/nfe",
            nfse: "https://doc.focusnfe.com.br/reference/nfse-nacional",
          },
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "FINANCEIRO"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const empresa = await requireEmpresaRaiz();
  const body = await req.json();
  const section = String(body.section || "parametros");

  if (section === "parametros") {
    const p = body.parametros || {};
    const saved = await prisma.parametroFiscalEmpresa.upsert({
      where: { empresaId: empresa.id },
      update: {
        opSimpNac: Number(p.opSimpNac) || 3,
        regApTribSN: Number(p.regApTribSN) || 1,
        regEspTrib: Number(p.regEspTrib) || 0,
        pTotTribSN: Number(p.pTotTribSN) || 11.81,
        pTotTribFederal: p.pTotTribFederal != null ? Number(p.pTotTribFederal) : null,
        pTotTribEstadual: p.pTotTribEstadual != null ? Number(p.pTotTribEstadual) : null,
        pTotTribMunicipal: p.pTotTribMunicipal != null ? Number(p.pTotTribMunicipal) : null,
        csosnPadrao: p.csosnPadrao || "102",
        cstPisPadrao: p.cstPisPadrao || "49",
        cstCofinsPadrao: p.cstCofinsPadrao || "49",
        serieDpsPadrao: Number(p.serieDpsPadrao) || 70000,
        serieNfePadrao: Number(p.serieNfePadrao) || 1,
        naturezaMercadoriaId: p.naturezaMercadoriaId || null,
        modalidadeFretePadrao: Number(p.modalidadeFretePadrao) || 9,
        presencaCompradorPadrao: Number(p.presencaCompradorPadrao) || 1,
        infCplPadrao: p.infCplPadrao || null,
        textoCreditoSn: p.textoCreditoSn || null,
      },
      create: {
        empresaId: empresa.id,
        opSimpNac: Number(p.opSimpNac) || 3,
        regApTribSN: Number(p.regApTribSN) || 1,
        regEspTrib: Number(p.regEspTrib) || 0,
        pTotTribSN: Number(p.pTotTribSN) || 11.81,
        csosnPadrao: p.csosnPadrao || "102",
        cstPisPadrao: p.cstPisPadrao || "49",
        cstCofinsPadrao: p.cstCofinsPadrao || "49",
        serieDpsPadrao: Number(p.serieDpsPadrao) || 70000,
        serieNfePadrao: Number(p.serieNfePadrao) || 1,
        naturezaMercadoriaId: p.naturezaMercadoriaId || null,
      },
    });
    return NextResponse.json({ ok: true, parametros: saved });
  }

  if (section === "natureza") {
    const n = body.natureza || {};
    if (!n.codigo || !n.descricao || !n.cfopDentroUf || !n.cfopForaUf) {
      return NextResponse.json({ error: "Natureza incompleta" }, { status: 400 });
    }
    const saved = await prisma.naturezaOperacao.upsert({
      where: {
        empresaId_codigo: { empresaId: empresa.id, codigo: String(n.codigo) },
      },
      update: {
        descricao: String(n.descricao),
        cfopDentroUf: String(n.cfopDentroUf),
        cfopForaUf: String(n.cfopForaUf),
        finalidadeEmissao: Number(n.finalidadeEmissao) || 1,
        ativo: n.ativo !== false,
      },
      create: {
        empresaId: empresa.id,
        codigo: String(n.codigo),
        descricao: String(n.descricao),
        cfopDentroUf: String(n.cfopDentroUf),
        cfopForaUf: String(n.cfopForaUf),
        finalidadeEmissao: Number(n.finalidadeEmissao) || 1,
        ativo: n.ativo !== false,
      },
    });
    return NextResponse.json({ ok: true, natureza: saved });
  }

  if (section === "serie") {
    const s = body.serie || {};
    if (!s.tipo || s.serie == null) {
      return NextResponse.json({ error: "Série incompleta" }, { status: 400 });
    }
    const ambiente = s.ambiente || empresa.ambienteFiscal;
    const saved = await prisma.serieDocumentoFiscal.upsert({
      where: {
        empresaId_tipo_serie_ambiente: {
          empresaId: empresa.id,
          tipo: s.tipo,
          serie: Number(s.serie),
          ambiente,
        },
      },
      update: {
        proximoNumero: Number(s.proximoNumero) || 1,
        ativo: s.ativo !== false,
        observacoes: s.observacoes || null,
      },
      create: {
        empresaId: empresa.id,
        tipo: s.tipo,
        serie: Number(s.serie),
        proximoNumero: Number(s.proximoNumero) || 1,
        ambiente,
        ativo: s.ativo !== false,
        observacoes: s.observacoes || null,
      },
    });
    return NextResponse.json({ ok: true, serie: saved });
  }

  return NextResponse.json({ error: "section inválida" }, { status: 400 });
}
