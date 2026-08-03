/**
 * Famílias fiscais de saída — CADASTRO_PRODUTOS_VENDA (estudo 32).
 *
 * Produção própria de etiquetas = NF-e PA-ETQ (CFOP 5101/6101).
 * Insumos (MP) alimentam custo/estoque — não são linhas da NF de venda.
 */

export type FamiliaPaEtq = {
  /** Código de negócio estável (SKU da família). */
  sku: string;
  /** Descrição fiscal curta (NF-e / SPED). */
  descricaoFiscal: string;
  ncm: string;
  /** CFOP produção própria intra-UF. */
  cfopDentroUf: string;
  cfopForaUf: string;
  unidade: string;
};

/** PA-ETQ-001 — filme plástico autoadesivo (NCM 3919.10.90). */
export const PA_ETQ_BOPP: FamiliaPaEtq = {
  sku: "PA-ETQ-001",
  descricaoFiscal: "ETIQUETAS BOPP",
  ncm: "39191090",
  cfopDentroUf: "5101",
  cfopForaUf: "6101",
  unidade: "UN",
};

/** PA-ETQ-002 — papel autoadesivo (NCM 4811.41.90). */
export const PA_ETQ_PAPEL: FamiliaPaEtq = {
  sku: "PA-ETQ-002",
  descricaoFiscal: "ETIQUETAS PAPEL AUTOADESIVO",
  ncm: "48114190",
  cfopDentroUf: "5101",
  cfopForaUf: "6101",
  unidade: "UN",
};

/** FAC — ferramentário / matriz cobrada no 1º pedido (mesma NF-e). */
export const FAC_MATRIZ = {
  sku: "FAC-MATRIZ",
  descricaoFiscal: "MATRIZ FLEXOGRAFICA / FACA (1o pedido)",
  ncm: "84425000",
  cfopDentroUf: "5101",
  cfopForaUf: "6101",
  unidade: "UN",
} as const;

const BOPP_HINTS = [
  "BOPP",
  "FILME",
  "PLAST",
  "PLÁST",
  "METALIZ",
  "TRANSP",
  "PP ",
  "POLIESTER",
  "POLIÉSTER",
  "PET",
];

const PAPEL_HINTS = [
  "COUCHE",
  "COUCHÊ",
  "TERMIC",
  "TÉRMIC",
  "PAPEL",
  "OFFSET",
  "CARTAO",
  "CARTÃO",
  "TAG",
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/** Escolhe família PA-ETQ a partir do papel/filme do orçamento. */
export function resolverFamiliaPaEtq(papel: string | null | undefined): FamiliaPaEtq {
  const p = normalize(papel || "");
  if (!p) return PA_ETQ_BOPP;
  if (BOPP_HINTS.some((h) => p.includes(normalize(h.trim())))) return PA_ETQ_BOPP;
  if (PAPEL_HINTS.some((h) => p.includes(normalize(h.trim())))) return PA_ETQ_PAPEL;
  // Filme plástico é o caso principal da amostra de NF-e de venda
  return PA_ETQ_BOPP;
}

/**
 * Descrição comercial montada (CADASTRO_PRODUTOS_VENDA §4).
 * Ex.: ETIQUETAS BOPP | BOPP FOSCO | 95x35 mm | 4 cores | verniz | 1000 etiq/rolo
 */
export function montarDescricaoComercialNf(opts: {
  familia: FamiliaPaEtq;
  papel?: string | null;
  medida?: string | null;
  cores?: string | number | null;
  acabamento?: string | null;
  etiqPorRolo?: number | null;
  pedidoCodigo?: string | null;
}): string {
  const parts = [
    opts.familia.descricaoFiscal,
    opts.papel ? String(opts.papel).toUpperCase() : null,
    opts.medida ? String(opts.medida).toUpperCase() : null,
    opts.cores != null && opts.cores !== "" ? `${opts.cores} CORES` : null,
    opts.acabamento ? String(opts.acabamento).toUpperCase() : null,
    opts.etiqPorRolo != null ? `${opts.etiqPorRolo} ETIQ/ROLO` : null,
    opts.pedidoCodigo ? `Ped ${opts.pedidoCodigo}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}
