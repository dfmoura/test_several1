export const NS_NFE = 'http://www.portalfiscal.inf.br/nfe';

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

export function nfeInfId(chave: string): string {
  const d = chave.replace(/\D/g, '');
  return `NFe${d}`;
}

export function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  return re.exec(xml)?.[1]?.trim();
}

export function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, 'i');
  return re.exec(xml)?.[1];
}

export function digits(value: string, len?: number): string {
  const d = value.replace(/\D/g, '');
  return len ? d.padStart(len, '0').slice(0, len) : d;
}
