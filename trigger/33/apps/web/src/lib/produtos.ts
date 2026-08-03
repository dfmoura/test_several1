/** Cadastro e serialização de produtos. */

import { DocumentoSaidaPadrao, TipoProduto, type Produto } from "@prisma/client";
import { dec } from "@/lib/ciclo-params";

export const TIPO_PRODUTO_LABEL: Record<TipoProduto, string> = {
  INSUMO: "Insumo",
  ACABADO: "Acabado",
  SERVICO: "Serviço",
  INTERMEDIARIO: "Intermediário",
};

export function serializeProduto(
  p: Produto & {
    papel?: { id: string; nome: string } | null;
    acabamento?: { id: string; nome: string } | null;
    tubete?: { id: string; tamanho: string } | null;
  },
) {
  return {
    id: p.id,
    empresaId: p.empresaId,
    codigo: p.codigo,
    sku: p.sku,
    descricao: p.descricao,
    descricaoFiscal: p.descricaoFiscal,
    tipo: p.tipo,
    tipoLabel: TIPO_PRODUTO_LABEL[p.tipo],
    unidade: p.unidade,
    ncm: p.ncm,
    cest: p.cest,
    ean: p.ean,
    origem: p.origem,
    cfopCompraPadrao: p.cfopCompraPadrao,
    cfopVendaPadrao: p.cfopVendaPadrao,
    naturezaOperacaoId: p.naturezaOperacaoId,
    csosn: p.csosn,
    cstIcms: p.cstIcms,
    cstPis: p.cstPis,
    cstCofins: p.cstCofins,
    cTribNac: p.cTribNac,
    cNbs: p.cNbs,
    tributacaoIss: p.tributacaoIss,
    issRetido: p.issRetido,
    codigoMunicipioPrestacao: p.codigoMunicipioPrestacao,
    ibsCbsSituacaoTributaria: p.ibsCbsSituacaoTributaria,
    ibsCbsClassificacaoTributaria: p.ibsCbsClassificacaoTributaria,
    infAdProdPadrao: p.infAdProdPadrao,
    documentoSaidaPadrao: p.documentoSaidaPadrao,
    controlaEstoque: p.controlaEstoque,
    estoqueMinimo: dec(p.estoqueMinimo),
    custoMedio: dec(p.custoMedio),
    ultimoCusto: p.ultimoCusto != null ? dec(p.ultimoCusto) : null,
    papelId: p.papelId,
    papelNome: p.papel?.nome ?? null,
    acabamentoId: p.acabamentoId,
    acabamentoNome: p.acabamento?.nome ?? null,
    tubeteId: p.tubeteId,
    tubeteTamanho: p.tubete?.tamanho ?? null,
    ativo: p.ativo,
    observacoes: p.observacoes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function parseTipoProduto(v: unknown): TipoProduto {
  if (typeof v === "string" && v in TipoProduto) return v as TipoProduto;
  throw Object.assign(new Error("Tipo de produto inválido"), { status: 400 });
}

export function parseDocSaida(v: unknown): DocumentoSaidaPadrao {
  if (v === "NFE" || v === "NFSE") return v;
  return DocumentoSaidaPadrao.NFSE;
}
