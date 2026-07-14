const NS = 'http://www.sped.fazenda.gov.br/nfse';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatDhEmiBr(date = new Date()): string {
  const offset = -3;
  const local = new Date(date.getTime() + offset * 60 * 60 * 1000);
  const iso = local.toISOString().replace('Z', '');
  return `${iso.slice(0, 19)}-03:00`;
}

export function dpsInfId(idDps: string): string {
  return idDps.startsWith('DPS') ? idDps : `DPS${idDps}`;
}

export function nfseInfId(chaveAcesso: string): string {
  return chaveAcesso.startsWith('NFS') ? chaveAcesso : `NFS${chaveAcesso}`;
}

export function padNumeroDps(numero: string): string {
  return numero.replace(/\D/g, '').padStart(15, '0');
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
