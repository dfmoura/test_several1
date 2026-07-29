/**
 * Textos e helpers fiscais alinhados aos fixtures em `modelos/nfe` e `modelos/nfse`.
 */

import { FISCAL_DEFAULTS } from "@/domain/fiscal/defaults";

/** Alíquota de crédito ICMS para optante SN (Lei Complementar 123/2006 art. 23) — padrão dos modelos. */
export const ALIQUOTA_CREDITO_ICMS_SN = 3.79;

export function creditoIcmsSimplesNacional(
  valorNota: number,
  aliquotaPct = ALIQUOTA_CREDITO_ICMS_SN,
): number {
  return Math.round(valorNota * (aliquotaPct / 100) * 100) / 100;
}

/** `infCpl` no padrão dos modelos NF-e reais. */
export function buildInfCplNfe(opts: {
  pedidoNumero: string | number;
  valorNota: number;
  autorizadoEm?: Date | null;
  simulado?: boolean;
  aliquotaCreditoPct?: number;
}): string {
  const credito = creditoIcmsSimplesNacional(
    opts.valorNota,
    opts.aliquotaCreditoPct ?? ALIQUOTA_CREDITO_ICMS_SN,
  );
  const aliquota = (opts.aliquotaCreditoPct ?? ALIQUOTA_CREDITO_ICMS_SN)
    .toFixed(2)
    .replace(".", ",");
  const creditoFmt = credito.toFixed(2).replace(".", ",");
  const dataEmi = opts.autorizadoEm
    ? opts.autorizadoEm.toLocaleDateString("pt-BR").replace(/\//g, "-")
    : "";
  const parts = [
    "Documento emitido por ME ou EPP optante pelo Simples Nacional",
    `DOCUMENTO ORIUNDO DO PEDIDO DE VENDA NRO ${opts.pedidoNumero}`,
    `PERMITE O APROVEITAMENTO DO CREDITO DE ICMS NO VALOR DE R$${creditoFmt} CORRESPONDENTE ALIQUOTA DE ${aliquota}%, NOS TERMOS DO ART. 23 DA LEI COMPLEMENTAR N 123, DE 2006`,
  ];
  if (dataEmi) parts.push(`Data de emissão: ${dataEmi}`);
  if (opts.simulado) {
    parts.push("Homologacao Focus NFe — documento simulado, sem valor fiscal.");
  }
  return parts.join("");
}

/** Número DPS determinístico (distinto de nNFSe). */
export function dpsNumeroFromPedido(pedidoNumero: number | string): string {
  const n = Number(String(pedidoNumero).replace(/\D/g, "")) || 0;
  return String(200000 + n);
}

/** Extrai nDPS do XML NFS-e quando disponível. */
export function parseDpsNumeroFromXml(xml: string | null | undefined): string | null {
  if (!xml) return null;
  const m = xml.match(/<nDPS>([^<]+)<\/nDPS>/i);
  return m?.[1]?.trim() || null;
}

/** Extrai protocolo de autorização (nProt) do XML NF-e. */
export function parseProtocoloNfeFromXml(xml: string | null | undefined): string | null {
  if (!xml) return null;
  const m = xml.match(/<nProt>([^<]+)<\/nProt>/i);
  return m?.[1]?.trim() || null;
}

/** Extrai IE do destinatário do XML NF-e. */
export function parseIeDestFromXml(xml: string | null | undefined): string | null {
  if (!xml) return null;
  const dest = xml.match(/<dest>[\s\S]*?<\/dest>/i)?.[0];
  if (!dest) return null;
  const m = dest.match(/<IE>([^<]+)<\/IE>/i);
  return m?.[1]?.trim() || null;
}

export function urlConsultaNfe(chave: string, homolog: boolean): string {
  if (homolog) {
    return `https://hom.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=&nfe=${chave}`;
  }
  return `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=&nfe=${chave}`;
}

/**
 * Texto oficial do bloco de autenticação no DANFE
 * (Manual de Orientação do Contribuinte / modelos `modelos/nfe`).
 */
export function textoConsultaAutenticidadeNfe(): string {
  return [
    "Consulta de autenticidade no portal nacional da NF-e",
    "www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora",
  ].join("\n");
}

export { FISCAL_DEFAULTS };
