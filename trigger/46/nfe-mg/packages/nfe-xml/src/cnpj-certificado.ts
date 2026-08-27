import { X509Certificate } from 'node:crypto';

const OID_CNPJ = '2.16.76.1.3.3';

export function normalizarCnpj(value: string): string {
  return value.replace(/\D/g, '').padStart(14, '0').slice(0, 14);
}

export function extrairCnpjCertificado(certPem: string): string | undefined {
  try {
    const cert = new X509Certificate(certPem);
    const san = cert.subjectAltName ?? '';
    const oidMatch = san.match(new RegExp(`${OID_CNPJ.replace(/\./g, '\\.')}[^0-9]*([0-9]{14})`));
    if (oidMatch?.[1]) return oidMatch[1];

    const subject = cert.subject;
    const cnMatch = subject.match(/CN\s*=\s*[^:]+:(\d{14})/i)
      ?? subject.match(/(\d{14})/);
    if (cnMatch?.[1]) return cnMatch[1];
  } catch {
    return undefined;
  }
  return undefined;
}

export function extrairRazaoSocialDoSubject(certPem: string): string | undefined {
  try {
    const cert = new X509Certificate(certPem);
    const cn = /CN\s*=\s*([^,\n]+)/i.exec(cert.subject)?.[1];
    if (!cn) return undefined;
    return cn.split(':')[0]?.trim();
  } catch {
    return undefined;
  }
}

export function certificadoExpirado(certPem: string, now = new Date()): boolean {
  const cert = new X509Certificate(certPem);
  return new Date(cert.validTo) < now;
}

export function diasParaExpirar(certPem: string, now = new Date()): number {
  const cert = new X509Certificate(certPem);
  const ms = new Date(cert.validTo).getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function possuiClientAuth(certPem: string): boolean {
  try {
    const cert = new X509Certificate(certPem);
    const eku = cert.keyUsage;
    if (!eku) return true;
    return eku.includes('1.3.6.1.5.5.7.3.2') || cert.infoAccess !== undefined;
  } catch {
    return false;
  }
}

export function subjectCertificado(certPem: string): string {
  try {
    return new X509Certificate(certPem).subject;
  } catch {
    return '';
  }
}

export function validadeCertificado(certPem: string): Date {
  return new Date(new X509Certificate(certPem).validTo);
}
