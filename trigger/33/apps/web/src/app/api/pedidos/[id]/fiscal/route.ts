import { NextRequest, NextResponse } from "next/server";
import { DocSaidaTipo } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import {
  dpsNumeroFromPedido,
  parseDpsNumeroFromXml,
  parseIeDestFromXml,
  parseProtocoloNfeFromXml,
} from "@/lib/fiscal/textos";
import { FISCAL_DEFAULTS } from "@/lib/fiscal-emissao";
import { TITULOS_RECEBER_INCLUDE, tituloReceberCompat } from "@/lib/faturamento";
import { buildDanfePdf, buildDanfsePdf } from "@/lib/pdf-docs";

type Ctx = { params: Promise<{ id: string }> };

async function loadDoc(pedidoId: string, tipoParam: string | null) {
  const tipo =
    tipoParam?.toUpperCase() === "NFE" ? DocSaidaTipo.NFE : DocSaidaTipo.NFSE;
  return prisma.documentoFiscalSaida.findUnique({
    where: { pedidoVendaId_tipo: { pedidoVendaId: pedidoId, tipo } },
    include: {
      pedidoVenda: {
        include: {
          clienteParceiro: true,
          itens: { include: { produto: true } },
          titulosReceber: TITULOS_RECEBER_INCLUDE,
          entrega: true,
        },
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
    const titulo = tituloReceberCompat(doc.pedidoVenda.titulosReceber);
    const entrega = doc.pedidoVenda.entrega;
    const vencimento =
      titulo?.vencimento ||
      new Date((doc.autorizadoEm || new Date()).getTime() + 28 * 86400000);
    const valorNfe = Number(doc.valorTotal);
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
            destinatarioIe: cli?.inscricaoEstadual || parseIeDestFromXml(doc.xmlBruto),
            destinatarioFone: cli?.telefone,
            numero: doc.numero || "—",
            serie: doc.serie || "1",
            chave: doc.chave,
            valor: valorNfe,
            naturezaOperacao: FISCAL_DEFAULTS.naturezaProducao,
            protocolo: parseProtocoloNfeFromXml(doc.xmlBruto),
            autorizadoEm: doc.autorizadoEm,
            pedidoNumero: doc.pedidoVenda.numero,
            vencimento,
            duplicatas: [
              {
                nDup: "001",
                dVenc: vencimento,
                vDup: valorNfe,
              },
            ],
            transporte: {
              modalidadeFrete: FISCAL_DEFAULTS.modalidadeFrete,
              nome: entrega?.transportadora || null,
              quantidade: entrega?.volumes ?? null,
              especie: entrega?.volumes ? "VOLUME" : null,
            },
            simulado: doc.simulado,
            itens: (() => {
              const all = doc.pedidoVenda.itens;
              const mercadoria = all.filter((it) => {
                const padrao = it.produto?.documentoSaidaPadrao;
                const tipoProd = it.produto?.tipo;
                if (padrao === "NFSE") return false;
                if (padrao === "NFE") return true;
                if (tipoProd === "INSUMO" || tipoProd === "INTERMEDIARIO") return true;
                return false;
              });
              const source = mercadoria.length ? mercadoria : all;
              return source.map((it, idx) => ({
                codigo: it.produto?.codigo || `P${idx + 1}`,
                descricao: it.produto?.descricao || it.descricao,
                ncm: it.produto?.ncm || "39191090",
                cfop: it.produto?.cfopVendaPadrao || "5101",
                unidade: it.unidade || "UN",
                quantidade: Number(it.quantidade),
                valorUnitario: Number(it.valorUnitario),
                valorTotal: Number(it.valorTotal),
                csosn: it.produto?.csosn || FISCAL_DEFAULTS.csosn,
                origem: 0,
                infAdProd: it.descricao || doc.discriminacao || null,
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
            tomadorTelefone: cli?.telefone,
            numero: doc.numero || "—",
            serie: doc.serie || String(FISCAL_DEFAULTS.serieDps),
            chave: doc.chave,
            valor: Number(doc.valorTotal),
            discriminacao: doc.discriminacao || "",
            cTribNac:
              doc.pedidoVenda.itens.find((i) => i.produto?.cTribNac)?.produto?.cTribNac ||
              FISCAL_DEFAULTS.cTribNac,
            cNbs:
              doc.pedidoVenda.itens.find((i) => i.produto?.cNbs)?.produto?.cNbs ||
              FISCAL_DEFAULTS.cNbs,
            simulado: doc.simulado,
            autorizadoEm: doc.autorizadoEm,
            dpsNumero:
              parseDpsNumeroFromXml(doc.xmlBruto) ||
              dpsNumeroFromPedido(doc.pedidoVenda.numero),
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
