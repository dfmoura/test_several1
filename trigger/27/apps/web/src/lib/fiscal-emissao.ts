/**
 * Decisão de documentos de saída (NFS-e / NF-e) e payloads Focus NFe.
 * Homologação: gera XML/PDF locais no formato próximo aos modelos reais.
 * Produção futura: POST Focus `/v2/nfsen` e `/v2/nfe` (ver doc.focusnfe.com.br).
 *
 * Regra de negócio da gráfica:
 * - NFS-e → impressões / composição gráfica (serviço)
 * - NF-e  → produtos / mercadorias utilizados na venda
 */

import type { DocumentoSaidaPadrao, TipoProduto } from "@prisma/client";
import { DocSaidaTipo } from "@prisma/client";
import { round2 } from "@/lib/ciclo-params";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";

export type ItemFiscal = {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  ncm?: string | null;
  cfop?: string | null;
  cTribNac?: string | null;
  cNbs?: string | null;
  codigo?: string | null;
  tipoProduto?: TipoProduto | null;
  documentoSaidaPadrao?: DocumentoSaidaPadrao | null;
  infAdProd?: string | null;
};

export type PlanoFiscalSaida = {
  emitirNfse: boolean;
  emitirNfe: boolean;
  tipos: DocSaidaTipo[];
  labelCta: string;
  resumo: string;
  nfse: {
    itens: ItemFiscal[];
    valor: number;
    discriminacao: string;
  } | null;
  nfe: {
    itens: ItemFiscal[];
    valor: number;
    naturezaOperacao: string;
  } | null;
};

export type FaixaProducao = NonNullable<OrcamentoResultSnapshot["faixas"]>[number]["production"];

/** Constantes alinhadas a `modelos/nfse` e `modelos/nfe`. */
export const FISCAL_DEFAULTS = {
  cTribNac: "130501",
  cNbs: "121012100",
  xNbs: "Serviços de impressão",
  pTotTribSN: 11.81,
  opSimpNac: 3,
  regApTribSN: 1,
  regEspTrib: 0,
  serieDps: 70000,
  cfopMercadoria: "5102",
  naturezaMercadoria: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
  naturezaProducao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
  csosn: "102",
} as const;

function docPadraoItem(
  item: ItemFiscal,
  fallback: DocumentoSaidaPadrao,
): DocumentoSaidaPadrao {
  if (item.documentoSaidaPadrao === "NFE" || item.documentoSaidaPadrao === "NFSE") {
    return item.documentoSaidaPadrao;
  }
  // Impressões / serviço gráfico → NFS-e
  if (item.tipoProduto === "SERVICO") return "NFSE";
  // Insumos e intermediários comercializados → NF-e
  if (item.tipoProduto === "INSUMO" || item.tipoProduto === "INTERMEDIARIO") return "NFE";
  // Acabado (etiquetas): NFS-e se tiver código de serviço; senão fallback da empresa
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
  if (!input && itens.length) {
    parts.push(itens.map((i) => i.descricao).join("; ").toUpperCase());
  }
  return parts.join(", ");
}

/**
 * `infAdProd` no padrão dos modelos NF-e (produto + detalhe da impressão).
 */
export function buildInfAdProdMercadoria(
  input: OrcamentoInputSnapshot | null | undefined,
  quantidade: number,
  producao?: Partial<FaixaProducao> | null,
): string {
  return buildDiscriminacaoServico(input, quantidade, [], producao);
}

/** Resolve se emite NFS-e (impressões), NF-e (produtos) ou ambas. */
export function planejarDocumentosSaida(opts: {
  itens: ItemFiscal[];
  quantidadePedido: number;
  valorTotalPedido: number;
  documentoPadraoEmpresa?: DocumentoSaidaPadrao | string;
  inputSnapshot?: OrcamentoInputSnapshot | null;
  producao?: Partial<FaixaProducao> | null;
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
  if (emitirNfse) labels.push("NFS-e");
  if (emitirNfe) labels.push("NF-e");
  const labelCta = `Faturar — ${labels.join(" + ") || "nota"} + Boleto`;

  let resumo = "Sem documento fiscal configurado";
  if (emitirNfse && emitirNfe) {
    resumo = `Impressões (NFS-e ${formatMoney(vServ)}) + produtos (NF-e ${formatMoney(vMerc)})`;
  } else if (emitirNfse) {
    resumo = `Impressões — NFS-e Nacional (${formatMoney(vServ)})`;
  } else if (emitirNfe) {
    resumo = `Produtos / mercadoria — NF-e (${formatMoney(vMerc)})`;
  }

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
          naturezaOperacao: FISCAL_DEFAULTS.naturezaMercadoria,
        }
      : null,
  };
}

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function digits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

/** Chave NF-e 44 dígitos (UF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + DV). */
export function montarChaveNfe(opts: {
  cUF?: string;
  cnpj: string;
  serie: number;
  numero: number;
  dhEmi?: Date;
  tpEmis?: string;
  cNF?: string;
}): { chave: string; cNF: string; cDV: string } {
  const cUF = opts.cUF || "31";
  const d = opts.dhEmi || new Date();
  const aamm =
    String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const mod = "55";
  const serie = String(opts.serie).padStart(3, "0").slice(-3);
  const nNF = String(opts.numero).padStart(9, "0").slice(-9);
  const tpEmis = opts.tpEmis || "1";
  const cNF = (opts.cNF || String(Math.floor(Math.random() * 1e8)).padStart(8, "0")).slice(
    0,
    8,
  );
  const base = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV = String(dvModulo11(base));
  return { chave: base + cDV, cNF, cDV };
}

/**
 * Id DPS no padrão nacional (42 dígitos após "DPS"):
 * cMun(7) + tipoInsc(1) + CNPJ(14) + serie(5) + nDPS(15)
 */
export function montarIdDps(opts: {
  codigoMunicipio: string;
  cnpj: string;
  serie: number | string;
  numeroDps: number | string;
  tipoInscricao?: "1" | "2";
}): string {
  const mun = (opts.codigoMunicipio || "3170206").padStart(7, "0").slice(0, 7);
  const tipo = opts.tipoInscricao || "1";
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const serie = String(opts.serie).padStart(5, "0").slice(-5);
  const nDps = String(opts.numeroDps).replace(/\D/g, "").padStart(15, "0").slice(-15);
  return `DPS${mun}${tipo}${cnpj}${serie}${nDps}`;
}

/** Chave de acesso NFS-e Nacional (~50 dígitos), no padrão dos modelos. */
export function montarChaveNfse(opts: {
  codigoMunicipio: string;
  cnpj: string;
  numero: number;
  dhEmi?: Date;
}): string {
  const mun = (opts.codigoMunicipio || "3170206").padStart(7, "0").slice(0, 7);
  const cnpj = digits(opts.cnpj).padStart(14, "0").slice(0, 14);
  const n = String(opts.numero).padStart(13, "0").slice(-13);
  const d = opts.dhEmi || new Date();
  const aamm =
    String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const seq = String(Date.now()).slice(-10).padStart(10, "0");
  return `${mun}2${cnpj}${n}${aamm}${seq}`.slice(0, 50);
}

function dvModulo11(base: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv >= 10) return 0;
  return dv;
}

/** Payload Focus NFS-e Nacional (homologação / futuro POST /v2/nfsen?ref=). */
export function buildFocusNfseNacionalPayload(opts: {
  ref: string;
  dataEmissao: Date;
  serieDps: number;
  numeroDps: number;
  codigoMunicipio: string;
  cnpjPrestador: string;
  inscricaoMunicipal?: string | null;
  cnpjTomador?: string | null;
  cpfTomador?: string | null;
  nomeTomador?: string | null;
  emailTomador?: string | null;
  logradouroTomador?: string | null;
  numeroTomador?: string | null;
  bairroTomador?: string | null;
  cepTomador?: string | null;
  codigoMunicipioTomador?: string | null;
  descricaoServico: string;
  valorServico: number;
  codigoTributacaoNacional?: string;
  codigoNbs?: string;
}): Record<string, unknown> {
  const toma: Record<string, unknown> = {};
  const cnpjT = digits(opts.cnpjTomador);
  const cpfT = digits(opts.cpfTomador);
  if (cnpjT.length === 14) toma.cnpj_tomador = cnpjT;
  else if (cpfT.length === 11) toma.cpf_tomador = cpfT;
  if (opts.nomeTomador) toma.nome_tomador = opts.nomeTomador;
  if (opts.emailTomador) toma.email_tomador = opts.emailTomador;
  if (opts.logradouroTomador) toma.logradouro_tomador = opts.logradouroTomador;
  if (opts.numeroTomador) toma.numero_tomador = opts.numeroTomador;
  if (opts.bairroTomador) toma.bairro_tomador = opts.bairroTomador;
  if (opts.cepTomador) toma.cep_tomador = digits(opts.cepTomador);
  if (opts.codigoMunicipioTomador) {
    toma.codigo_municipio_tomador = opts.codigoMunicipioTomador;
  }

  return {
    data_emissao: opts.dataEmissao.toISOString().replace(/\.\d{3}Z$/, "-0300"),
    serie_dps: opts.serieDps,
    numero_dps: opts.numeroDps,
    data_competencia: opts.dataEmissao.toISOString().slice(0, 10),
    emitente_dps: 1,
    codigo_municipio_emissora: Number(opts.codigoMunicipio || 3170206),
    cnpj_prestador: digits(opts.cnpjPrestador),
    inscricao_municipal_prestador: opts.inscricaoMunicipal
      ? digits(opts.inscricaoMunicipal)
      : undefined,
    codigo_opcao_simples_nacional: FISCAL_DEFAULTS.opSimpNac,
    regime_apuracao_tributos_sn: FISCAL_DEFAULTS.regApTribSN,
    regime_especial_tributacao: FISCAL_DEFAULTS.regEspTrib,
    ...toma,
    codigo_municipio_prestacao: opts.codigoMunicipio || "3170206",
    codigo_tributacao_nacional_iss:
      opts.codigoTributacaoNacional || FISCAL_DEFAULTS.cTribNac,
    codigo_nbs: opts.codigoNbs || FISCAL_DEFAULTS.cNbs,
    descricao_servico: opts.descricaoServico,
    valor_servico: opts.valorServico,
    tributacao_iss: 1,
    percentual_total_tributos_simples_nacional: FISCAL_DEFAULTS.pTotTribSN,
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfsen",
      doc_url: "https://doc.focusnfe.com.br/reference/introducao",
    },
  };
}

/** Payload Focus NF-e (homologação / futuro POST /v2/nfe?ref=). */
export function buildFocusNfePayload(opts: {
  ref: string;
  naturezaOperacao: string;
  dataEmissao: Date;
  cnpjEmitente: string;
  destinatario: {
    documento: string | null;
    nome: string;
    ie?: string | null;
    email?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    codigoMunicipio?: string | null;
  };
  itens: ItemFiscal[];
  valorTotal: number;
}): Record<string, unknown> {
  const destDoc = digits(opts.destinatario.documento);
  return {
    natureza_operacao: opts.naturezaOperacao,
    data_emissao: opts.dataEmissao.toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    local_destino: 1,
    consumidor_final: 0,
    presenca_comprador: 1,
    cnpj_emitente: digits(opts.cnpjEmitente),
    nome_destinatario: opts.destinatario.nome,
    cnpj_destinatario: destDoc.length === 14 ? destDoc : undefined,
    cpf_destinatario: destDoc.length === 11 ? destDoc : undefined,
    inscricao_estadual_destinatario: opts.destinatario.ie
      ? digits(opts.destinatario.ie)
      : undefined,
    email_destinatario: opts.destinatario.email || undefined,
    logradouro_destinatario: opts.destinatario.logradouro,
    numero_destinatario: opts.destinatario.numero || "S/N",
    bairro_destinatario: opts.destinatario.bairro,
    municipio_destinatario: opts.destinatario.cidade,
    uf_destinatario: opts.destinatario.uf,
    cep_destinatario: digits(opts.destinatario.cep),
    codigo_municipio_destinatario: opts.destinatario.codigoMunicipio || undefined,
    items: opts.itens.map((it, idx) => ({
      numero_item: idx + 1,
      codigo_produto: it.codigo || `ITEM${idx + 1}`,
      descricao: it.descricao,
      codigo_ncm: it.ncm || "48211000",
      cfop: it.cfop || FISCAL_DEFAULTS.cfopMercadoria,
      unidade_comercial: it.unidade || "UN",
      quantidade_comercial: it.quantidade,
      valor_unitario_comercial: it.valorUnitario,
      valor_bruto: it.valorTotal,
      unidade_tributavel: it.unidade || "UN",
      quantidade_tributavel: it.quantidade,
      valor_unitario_tributavel: it.valorUnitario,
      icms_origem: 0,
      icms_situacao_tributaria: FISCAL_DEFAULTS.csosn,
      informacoes_adicionais_item: it.infAdProd || undefined,
    })),
    valor_produtos: opts.valorTotal,
    valor_total: opts.valorTotal,
    modalidade_frete: 9,
    _meta: {
      ref: opts.ref,
      hub: "focusnfe",
      doc: "nfe",
      doc_url: "https://doc.focusnfe.com.br/reference/introducao",
    },
  };
}
