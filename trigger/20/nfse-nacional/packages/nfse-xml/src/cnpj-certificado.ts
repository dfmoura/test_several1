import forge from 'node-forge';
import { X509Certificate } from 'node:crypto';

const CNPJ_OID = '2.16.76.1.3.3';
const CLIENT_AUTH_OID = '1.3.6.1.5.5.7.3.2';

/** Extrai CNPJ (14 dígitos) de certificado e-CNPJ ICP-Brasil. */
export function extrairCnpjCertificado(certPem: string): string | undefined {
  const fromSubject = extrairCnpjDoSubject(new X509Certificate(certPem).subject);
  if (fromSubject) return fromSubject;

  try {
    const cert = forge.pki.certificateFromPem(certPem);
    return extrairCnpjForge(cert);
  } catch {
    return undefined;
  }
}

function extrairCnpjDoSubject(subject: string): string | undefined {
  const colonMatch = subject.match(/:(\d{14})(?:[,/]|$)/);
  if (colonMatch?.[1]) return colonMatch[1];

  const digits = subject.replace(/\D/g, '');
  const cnpjMatches = digits.match(/\d{14}/g);
  if (!cnpjMatches) return undefined;
  return cnpjMatches.find((c) => c.length === 14);
}

function extrairCnpjForge(cert: forge.pki.Certificate): string | undefined {
  for (const attr of cert.subject.attributes) {
    const value = String(attr.value);
    const fromCn = extrairCnpjDoSubject(value);
    if (fromCn) return fromCn;
  }

  const sanExt = cert.getExtension({ name: 'subjectAltName' }) as {
    altNames?: Array<{ type: number; value?: { type?: string; value?: unknown } }>;
  } | null;
  if (sanExt?.altNames) {
    for (const alt of sanExt.altNames) {
      if (alt.type === 0 && alt.value) {
        const oid = alt.value.type;
        if (oid === CNPJ_OID || oid === forge.pki.oids[CNPJ_OID]) {
          const cnpj = decodeIcpBrasilCnpj(alt.value.value);
          if (cnpj) return cnpj;
        }
      }
    }
  }

  return undefined;
}

function decodeIcpBrasilCnpj(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 14 ? digits.slice(-14) : undefined;
  }
  if (raw instanceof Uint8Array || Buffer.isBuffer(raw)) {
    const buf = Buffer.from(raw);
    if (buf.length >= 8) {
      const bcd = buf.slice(-8);
      let result = '';
      for (const byte of bcd) {
        result += String(Math.floor(byte / 16));
        result += String(byte % 16);
      }
      return result.length === 14 ? result : undefined;
    }
  }
  return undefined;
}

export function certificadoExpirado(certPem: string): boolean {
  const cert = new X509Certificate(certPem);
  return new Date(cert.validTo).getTime() <= Date.now();
}

export function diasParaExpirar(certPem: string): number {
  const cert = new X509Certificate(certPem);
  const validade = new Date(cert.validTo);
  return Math.ceil((validade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function possuiClientAuth(certPem: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const eku = cert.getExtension({ name: 'extKeyUsage' }) as { extKeyUsage?: string[] } | null;
    if (!eku?.extKeyUsage) return true;
    return eku.extKeyUsage.some((oid: string) => oid === CLIENT_AUTH_OID || oid === 'clientAuth');
  } catch {
    return true;
  }
}

export function normalizarCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/** Razão social no padrão ICP-Brasil: CN=RAZAO SOCIAL:CNPJ ou CN=RAZAO SOCIAL. */
export function extrairRazaoSocialDoSubject(subject: string): string | undefined {
  const comCnpj = subject.match(/CN=([^,]+?):[\d./-]{14,18}(?:,|$)/i);
  if (comCnpj?.[1]) {
    const nome = comCnpj[1].trim();
    if (nome) return nome;
  }

  const cnSimples = subject.match(/CN=([^,/]+)/i);
  if (cnSimples?.[1]) {
    const nome = cnSimples[1].trim();
    const digits = nome.replace(/\D/g, '');
    if (nome && digits.length !== 14) return nome;
  }

  return undefined;
}
