import { NextRequest, NextResponse } from "next/server";
import { DocSaidaTipo } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import { buildDanfePdf, buildDanfsePdf } from "@/lib/pdf-docs";

type Ctx = { params: Promise<{ id: string }> };

async function loadDoc(pedidoId: string, tipoParam: string | null) {
  const tipo =
    tipoParam?.toUpperCase() === "NFE" ? DocSaidaTipo.NFE : DocSaidaTipo.NFSE;
  return prisma.documentoFiscalSaida.findUnique({
    where: { pedidoVendaId_tipo: { pedidoVendaId: pedidoId, tipo } },
    include: {
      pedidoVenda: {
        include: { clienteParceiro: true, itens: { include: { produto: true } } },
      },
    },
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const tipo = req.nextUrl.searchParams.get("tipo");
  const fmt = req.nextUrl.searchParams.get("fmt") || "xml";

  const doc = await loadDoc(id, tipo);
  if (!doc) {
    return NextResponse.json({ error: "Documento fiscal não encontrado" }, { status: 404 });
  }

  if (fmt === "xml") {
    if (!doc.xmlBruto) {
      return NextResponse.json({ error: "XML ainda não disponível" }, { status: 404 });
    }
    const name = `${doc.tipo.toLowerCase()}-${doc.numero || id}.xml`;
    return new NextResponse(doc.xmlBruto, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (fmt === "pdf") {
    const empresa = await getEmpresaRaiz();
    if (!empresa) {
      return NextResponse.json({ error: "Empresa não cadastrada" }, { status: 404 });
    }
    const cli = doc.pedidoVenda.clienteParceiro;
    const pdf =
      doc.tipo === DocSaidaTipo.NFE
        ? await buildDanfePdf({
            empresa,
            destinatarioNome: doc.pedidoVenda.clienteNome,
            destinatarioDoc: cli?.documento,
            destinatarioEndereco: [cli?.logradouro, cli?.numero, cli?.complemento]
              .filter(Boolean)
              .join(", "),
            destinatarioBairro: cli?.bairro,
            destinatarioCidade: cli?.cidade,
            destinatarioUf: cli?.uf,
            destinatarioCep: cli?.cep,
            numero: doc.numero || "—",
            serie: doc.serie || "1",
            chave: doc.chave,
            valor: Number(doc.valorTotal),
            naturezaOperacao: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
            autorizadoEm: doc.autorizadoEm,
            simulado: doc.simulado,
            itens: (() => {
              const all = doc.pedidoVenda.itens;
              const mercadoria = all.filter((it) => {
                const padrao = it.produto?.documentoSaidaPadrao;
                const tipo = it.produto?.tipo;
                if (padrao === "NFSE") return false;
                if (padrao === "NFE") return true;
                if (tipo === "INSUMO" || tipo === "INTERMEDIARIO") return true;
                return false;
              });
              const source = mercadoria.length ? mercadoria : all;
              return source.map((it, idx) => ({
                codigo: it.produto?.codigo || `P${idx + 1}`,
                descricao: it.descricao,
                ncm: it.produto?.ncm || "48211000",
                cfop: it.produto?.cfopVendaPadrao || "5102",
                unidade: it.unidade || "UN",
                quantidade: Number(it.quantidade),
                valorUnitario: Number(it.valorUnitario),
                valorTotal: Number(it.valorTotal),
                infAdProd: doc.discriminacao || it.descricao,
              }));
            })(),
          })
        : await buildDanfsePdf({
            empresa,
            tomadorNome: doc.pedidoVenda.clienteNome,
            tomadorDoc: cli?.documento,
            tomadorEndereco: [cli?.logradouro, cli?.numero, cli?.complemento]
              .filter(Boolean)
              .join(", "),
            tomadorCidadeUf:
              cli?.cidade && cli?.uf ? `${cli.cidade} - ${cli.uf}` : cli?.cidade || null,
            tomadorCep: cli?.cep,
            tomadorEmail: cli?.email,
            numero: doc.numero || "—",
            serie: doc.serie || "70000",
            chave: doc.chave,
            valor: Number(doc.valorTotal),
            discriminacao: doc.discriminacao || "",
            cTribNac:
              doc.pedidoVenda.itens.find((i) => i.produto?.cTribNac)?.produto?.cTribNac ||
              "130501",
            cNbs:
              doc.pedidoVenda.itens.find((i) => i.produto?.cNbs)?.produto?.cNbs ||
              "121012100",
            simulado: doc.simulado,
            autorizadoEm: doc.autorizadoEm,
            dpsNumero: doc.numero,
          });

    const name = `${doc.tipo.toLowerCase()}-${doc.numero || id}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "fmt inválido (xml|pdf)" }, { status: 400 });
}
