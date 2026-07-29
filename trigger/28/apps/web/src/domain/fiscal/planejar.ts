/**
 * Planejamento dual NF-e (mercadoria) + NFS-e Nacional (serviço).
 */

import type { DocumentoSaidaPadrao, TipoProduto } from "@prisma/client";
import { DocSaidaTipo } from "@prisma/client";
import { round2 } from "@/lib/ciclo-params";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";
import { FISCAL_DEFAULTS, type ItemFiscal, type PlanoFiscalSaida } from "./defaults";

export type FaixaProducao = NonNullable<OrcamentoResultSnapshot["faixas"]>[number]["production"];

function docPadraoItem(
  item: ItemFiscal,
  fallback: DocumentoSaidaPadrao,
): DocumentoSaidaPadrao {
  if (item.documentoSaidaPadrao === "NFE" || item.documentoSaidaPadrao === "NFSE") {
    return item.documentoSaidaPadrao;
  }
  if (item.tipoProduto === "SERVICO") return "NFSE";
  if (item.tipoProduto === "INSUMO" || item.tipoProduto === "INTERMEDIARIO") return "NFE";
  if (item.tipoProduto === "ACABADO") {
    return item.cTribNac || item.cNbs ? "NFSE" : fallback;
  }
  return fallback;
}

function fmtQtdeBr(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function coresLabel(cores: number | string | undefined): string | null {
  if (cores == null || cores === "") return null;
  const s = String(cores).toUpperCase();
  if (s === "4V") return "QUATRO CORES VERSO";
  const n = Number(cores);
  if (!Number.isFinite(n)) return `${s} CORES`;
  if (n === 0) return "SEM COR";
  if (n === 1) return "UMA COR";
  const map: Record<number, string> = {
    2: "DUAS",
    3: "TRÊS",
    4: "QUATRO",
    5: "CINCO",
    6: "SEIS",
    7: "SETE",
    8: "OITO",
  };
  return `${map[n] || String(n)} CORES`;
}

/**
 * Discriminação no padrão dos modelos NFS-e:
 * "X ROLOS, Y ETIQUETAS, TAMANHO …, PAPEL …, CORES …"
 */
export function buildDiscriminacaoServico(
  input: OrcamentoInputSnapshot | null | undefined,
  quantidade: number,
  itens: ItemFiscal[],
  producao?: Partial<FaixaProducao> | null,
): string {
  if (!input && itens.length === 1 && itens[0].descricao) {
    return itens[0].descricao.toUpperCase();
  }

  const parts: string[] = [];
  const rolos = producao?.qtdeRolos;
  if (rolos != null && rolos > 0) {
    parts.push(`${fmtQtdeBr(rolos)} ROLOS`);
  }
  parts.push(`${fmtQtdeBr(quantidade)} ETIQUETAS`);
  if (input?.medida) parts.push(`TAMANHO ${String(input.medida).toUpperCase()}`);
  if (input?.papel) parts.push(`PAPEL ${String(input.papel).toUpperCase()}`);
  const cores = coresLabel(input?.cores);
  if (cores) parts.push(cores);
  if (input?.acabamento) parts.push(String(input.acabamento).toUpperCase());
  if (input?.etiqPorRolo) {
    parts.push(`${fmtQtdeBr(Number(input.etiqPorRolo))} ETIQUETAS POR ROLO`);
  }
  if (input?.qtdeModelos && Number(input.qtdeModelos) > 1) {
    parts.push(`${input.qtdeModelos} MODELOS`);
  }
  if (input && Array.isArray((input as { modelos?: unknown }).modelos)) {
    const modelos = (input as { modelos?: Array<{ nome?: string; qtde?: number }> }).modelos;
    if (modelos?.length) {
      const detalhe = modelos
        .map((m) => {
          const q = m.qtde != null ? fmtQtdeBr(Number(m.qtde)) : null;
          const nome = (m.nome || "").toUpperCase();
          return [q, nome].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .join(" / ");
      if (detalhe) parts.push(`MODELOS ${detalhe}`);
    }
  }
  if (!input && itens.length) {
    parts.push(itens.map((i) => i.descricao).join("; ").toUpperCase());
  }
  return parts.join(", ");
}

export function buildInfAdProdMercadoria(
  input: OrcamentoInputSnapshot | null | undefined,
  quantidade: number,
  producao?: Partial<FaixaProducao> | null,
): string {
  return buildDiscriminacaoServico(input, quantidade, [], producao);
}

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Resolve se emite NFS-e (impressões), NF-e (produtos) ou ambas. */
export function planejarDocumentosSaida(opts: {
  itens: ItemFiscal[];
  quantidadePedido: number;
  valorTotalPedido: number;
  documentoPadraoEmpresa?: DocumentoSaidaPadrao | string;
  inputSnapshot?: OrcamentoInputSnapshot | null;
  producao?: Partial<FaixaProducao> | null;
  naturezaOperacaoPadrao?: string | null;
}): PlanoFiscalSaida {
  const fallback =
    opts.documentoPadraoEmpresa === "NFE" || opts.documentoPadraoEmpresa === "NFSE"
      ? opts.documentoPadraoEmpresa
      : ("NFSE" as DocumentoSaidaPadrao);

  const itens = opts.itens.length
    ? opts.itens
    : [
        {
          descricao: "Impressão de etiquetas",
          quantidade: opts.quantidadePedido,
          unidade: "UN",
          valorUnitario:
            opts.quantidadePedido > 0
              ? round2(opts.valorTotalPedido / opts.quantidadePedido)
              : opts.valorTotalPedido,
          valorTotal: opts.valorTotalPedido,
          documentoSaidaPadrao: fallback,
          tipoProduto: "ACABADO" as TipoProduto,
          cTribNac: FISCAL_DEFAULTS.cTribNac,
          cNbs: FISCAL_DEFAULTS.cNbs,
        },
      ];

  const nfseItens: ItemFiscal[] = [];
  const nfeItens: ItemFiscal[] = [];

  for (const it of itens) {
    const doc = docPadraoItem(it, fallback);
    if (doc === "NFE") {
      nfeItens.push({
        ...it,
        cfop: it.cfop || FISCAL_DEFAULTS.cfopMercadoria,
        infAdProd:
          it.infAdProd ||
          buildInfAdProdMercadoria(opts.inputSnapshot, it.quantidade, opts.producao),
      });
    } else {
      nfseItens.push({
        ...it,
        cTribNac: it.cTribNac || FISCAL_DEFAULTS.cTribNac,
        cNbs: it.cNbs || FISCAL_DEFAULTS.cNbs,
      });
    }
  }

  const valorNfse = round2(nfseItens.reduce((s, i) => s + Number(i.valorTotal), 0));
  const valorNfe = round2(nfeItens.reduce((s, i) => s + Number(i.valorTotal), 0));

  let vServ = valorNfse;
  let vMerc = valorNfe;
  if (nfseItens.length && !nfeItens.length) vServ = opts.valorTotalPedido;
  if (nfeItens.length && !nfseItens.length) vMerc = opts.valorTotalPedido;
  if (nfseItens.length && nfeItens.length && Math.abs(vServ + vMerc - opts.valorTotalPedido) > 0.05) {
    const soma = valorNfse + valorNfe || 1;
    vServ = round2((opts.valorTotalPedido * valorNfse) / soma);
    vMerc = round2(opts.valorTotalPedido - vServ);
  }

  const emitirNfse = nfseItens.length > 0 && vServ > 0;
  const emitirNfe = nfeItens.length > 0 && vMerc > 0;
  const tipos: DocSaidaTipo[] = [];
  if (emitirNfse) tipos.push(DocSaidaTipo.NFSE);
  if (emitirNfe) tipos.push(DocSaidaTipo.NFE);

  const labels: string[] = [];
  if (emitirNfse) labels.push("NFS-e serviço");
  if (emitirNfe) labels.push("NF-e revenda");
  const labelCta =
    emitirNfse && emitirNfe
      ? "Faturar — NF-e revenda + NFS-e serviço + Bolepix"
      : `Faturar — ${labels.join(" + ") || "nota"} + Bolepix`;

  let resumo = "Sem documento fiscal configurado";
  if (emitirNfse && emitirNfe) {
    resumo =
      `Revenda (NF-e ${formatMoney(vMerc)}) + ` +
      `Prestação de serviço (NFS-e ${formatMoney(vServ)})`;
  } else if (emitirNfse) {
    resumo = `Prestação de serviço — NFS-e Nacional (${formatMoney(vServ)})`;
  } else if (emitirNfe) {
    resumo = `Revenda de mercadoria — NF-e (${formatMoney(vMerc)})`;
  }

  const natureza =
    opts.naturezaOperacaoPadrao || FISCAL_DEFAULTS.naturezaMercadoria;

  return {
    emitirNfse,
    emitirNfe,
    tipos,
    labelCta,
    resumo,
    nfse: emitirNfse
      ? {
          itens: nfseItens,
          valor: vServ,
          discriminacao: buildDiscriminacaoServico(
            opts.inputSnapshot,
            opts.quantidadePedido,
            nfseItens,
            opts.producao,
          ),
        }
      : null,
    nfe: emitirNfe
      ? {
          itens: nfeItens,
          valor: vMerc,
          naturezaOperacao: natureza,
        }
      : null,
  };
}
