/**
 * Planejamento de documentos de saída — estudo 32 / MAPA_FATURAMENTO.
 *
 * Produção própria (PA-ETQ / ACABADO NFE) → NF-e CFOP 5101/6101
 * Revenda (REV / INSUMO comercializado) → NF-e CFOP 5102/6102
 * Serviço avulso (SVC / SERVICO NFSE) → NFS-e (quando item for serviço)
 *
 * Etiqueta sob encomenda NÃO é dual NF-e+NFS-e.
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
  // Só SERVICO puro vai para NFS-e; ACABADO / INSUMO / PA = NF-e.
  if (item.tipoProduto === "SERVICO") return "NFSE";
  if (
    item.tipoProduto === "ACABADO" ||
    item.tipoProduto === "INSUMO" ||
    item.tipoProduto === "INTERMEDIARIO"
  ) {
    return "NFE";
  }
  return fallback;
}

function isCfopProducao(cfop: string | null | undefined): boolean {
  const c = (cfop || "").trim();
  return c.startsWith("5101") || c.startsWith("6101") || c.startsWith("6107");
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
 * Texto auxiliar do produto (infAdProd) / discriminação legada.
 * Padrão comercial das etiquetas na NF-e.
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

/** Planeja NF-e / NFS-e a partir dos itens do PED (sem inventar dual de etiqueta). */
export function planejarDocumentosSaida(opts: {
  itens: ItemFiscal[];
  quantidadePedido: number;
  valorTotalPedido: number;
  documentoPadraoEmpresa?: DocumentoSaidaPadrao | string;
  inputSnapshot?: OrcamentoInputSnapshot | null;
  producao?: Partial<FaixaProducao> | null;
  naturezaOperacaoPadrao?: string | null;
}): PlanoFiscalSaida {
  const rawPadrao = String(opts.documentoPadraoEmpresa || "NFE").toUpperCase();
  const fallback: DocumentoSaidaPadrao =
    rawPadrao === "NFSE" ? "NFSE" : ("NFE" as DocumentoSaidaPadrao);

  const itens = opts.itens.length
    ? opts.itens
    : [
        {
          descricao: "Etiquetas — produção própria",
          quantidade: opts.quantidadePedido,
          unidade: "UN",
          valorUnitario:
            opts.quantidadePedido > 0
              ? round2(opts.valorTotalPedido / opts.quantidadePedido)
              : opts.valorTotalPedido,
          valorTotal: opts.valorTotalPedido,
          documentoSaidaPadrao: fallback,
          tipoProduto: "ACABADO" as TipoProduto,
          cfop: FISCAL_DEFAULTS.cfopProducao,
          ncm: "39191090",
        },
      ];

  const nfseItens: ItemFiscal[] = [];
  const nfeItens: ItemFiscal[] = [];

  for (const it of itens) {
    const doc = docPadraoItem(it, fallback);
    if (doc === "NFE") {
      const cfopPadrao = isCfopProducao(it.cfop)
        ? it.cfop || FISCAL_DEFAULTS.cfopProducao
        : it.cfop || FISCAL_DEFAULTS.cfopProducao;
      nfeItens.push({
        ...it,
        cfop: cfopPadrao,
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
  if (emitirNfe) tipos.push(DocSaidaTipo.NFE);
  if (emitirNfse) tipos.push(DocSaidaTipo.NFSE);

  const producaoNfe = nfeItens.some((i) => isCfopProducao(i.cfop) || i.tipoProduto === "ACABADO");
  const labels: string[] = [];
  if (emitirNfe) labels.push(producaoNfe ? "NF-e produção" : "NF-e revenda");
  if (emitirNfse) labels.push("NFS-e serviço");
  const labelCta =
    labels.length > 1
      ? `Faturar — ${labels.join(" + ")} + boleto`
      : `Faturar — ${labels[0] || "NF-e"} + boleto`;

  let resumo = "Sem documento fiscal configurado";
  if (emitirNfe && emitirNfse) {
    resumo =
      `NF-e (${formatMoney(vMerc)}) + NFS-e serviço (${formatMoney(vServ)})`;
  } else if (emitirNfse) {
    resumo = `Serviço avulso — NFS-e Nacional (${formatMoney(vServ)})`;
  } else if (emitirNfe) {
    resumo = producaoNfe
      ? `Produção própria — NF-e CFOP 5101/6101 (${formatMoney(vMerc)})`
      : `Revenda — NF-e CFOP 5102/6102 (${formatMoney(vMerc)})`;
  }

  const natureza =
    opts.naturezaOperacaoPadrao ||
    (producaoNfe ? FISCAL_DEFAULTS.naturezaProducao : FISCAL_DEFAULTS.naturezaMercadoria);

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
