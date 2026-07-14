import { formatNumeroDpsElement } from '@nfse/domain';

const NS = 'http://www.sped.fazenda.gov.br/nfse';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const BRASILIA_UTC_OFFSET_HOURS = -3;

function toBrasiliaDate(date: Date): Date {
  return new Date(date.getTime() + BRASILIA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

export function formatDhEmiBr(date = new Date()): string {
  const iso = toBrasiliaDate(date).toISOString().replace('Z', '');
  return `${iso.slice(0, 19)}-03:00`;
}

/** Data de competência (dCompet) — AAAA-MM-DD no fuso de Brasília, alinhada ao dhEmi. */
export function formatDataCompetenciaBr(date = new Date()): string {
  return toBrasiliaDate(date).toISOString().slice(0, 10);
}

export function dpsInfId(idDps: string): string {
  return idDps.startsWith('DPS') ? idDps : `DPS${idDps}`;
}

export function nfseInfId(chaveAcesso: string): string {
  return chaveAcesso.startsWith('NFS') ? chaveAcesso : `NFS${chaveAcesso}`;
}

/** Id do infPedReg — TSIdPedRegEvt (XSD v1.01 jan/2026): PRE + chave (50) + tipo evento (6). */
export function pedRegInfId(chaveAcesso: string, codigoEvento = '101101'): string {
  return `PRE${chaveAcesso}${codigoEvento}`;
}

export function padNumeroDps(numero: string): string {
  return formatNumeroDpsElement(numero);
}

export function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  return re.exec(xml)?.[1]?.trim();
}

export function extractBlock(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  return re.exec(xml)?.[1]?.trim();
}

export function extractDpsInner(signedDpsXml: string): string {
  const match = signedDpsXml.match(/<DPS[\s\S]*?>([\s\S]*)<\/DPS>/i);
  return match?.[1]?.trim() ?? signedDpsXml;
}

export function tpAmbFromAmbiente(ambiente: string): '1' | '2' {
  return ambiente === 'prod' ? '1' : '2';
}

export { NS };
