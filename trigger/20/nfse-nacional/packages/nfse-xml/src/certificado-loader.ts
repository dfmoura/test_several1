import forge from 'node-forge';
import { readFileSync, existsSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';

export interface PfxMaterial {
  privateKeyPem: string;
  certPem: string;
  chainPem: string;
}

export class CertificadoLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificadoLoadError';
  }
}

/** Lê senha do PFX: arquivo (Docker secret) tem prioridade sobre env. */
export function resolveCertPassword(password?: string, passwordFile?: string): string | undefined {
  if (passwordFile && existsSync(passwordFile)) {
    return readFileSync(passwordFile, 'utf-8').trim();
  }
  return password?.trim() || undefined;
}

export function loadPfxMaterial(pfxPath: string, password: string): PfxMaterial {
  if (!existsSync(pfxPath)) {
    throw new CertificadoLoadError(`Certificado não encontrado: ${pfxPath}`);
  }

  let pkcs12: forge.pkcs12.Pkcs12Pfx;
  try {
    const pfxDer = readFileSync(pfxPath);
    const pfxAsn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxDer));
    pkcs12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
  } catch {
    throw new CertificadoLoadError(
      'Senha do certificado inválida ou arquivo PFX corrompido — confira secrets/certificado.senha ou NFSE_CERT_PASSWORD',
    );
  }

  const keyBags =
    pkcs12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]
    ?? pkcs12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];

  const keyBag = keyBags?.[0];
  if (!keyBag?.key) {
    throw new CertificadoLoadError('Chave privada não encontrada no PFX');
  }

  const certBags = pkcs12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  if (certBags.length === 0 || !certBags[0]?.cert) {
    throw new CertificadoLoadError('Certificado X.509 não encontrado no PFX');
  }

  const leafCert = certBags[0].cert;
  const chainPem = certBags
    .slice(1)
    .filter((b) => b.cert)
    .map((b) => forge.pki.certificateToPem(b.cert!))
    .join('\n');

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    certPem: forge.pki.certificateToPem(leafCert),
    chainPem,
  };
}

/** Carrega PEMs auxiliares (key.pem + crt.pem) ao lado do caminho PFX. */
export function loadPemMaterial(pfxPath: string): PfxMaterial {
  const keyPath = pfxPath.replace(/\.(pfx|p12)$/i, '.key.pem');
  const certPath = pfxPath.replace(/\.(pfx|p12)$/i, '.crt.pem');
  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new CertificadoLoadError(`PEMs auxiliares não encontrados: ${keyPath}, ${certPath}`);
  }
  return {
    privateKeyPem: readFileSync(keyPath, 'utf-8'),
    certPem: readFileSync(certPath, 'utf-8'),
    chainPem: '',
  };
}

export function hasPemSidecar(pfxPath: string): boolean {
  const keyPath = pfxPath.replace(/\.(pfx|p12)$/i, '.key.pem');
  const certPath = pfxPath.replace(/\.(pfx|p12)$/i, '.crt.pem');
  return existsSync(keyPath) && existsSync(certPath);
}

/** PFX existe ou PEMs auxiliares (.key.pem + .crt.pem) estão disponíveis. */
export function certificadoDisponivel(certPath?: string): boolean {
  if (!certPath) return false;
  if (existsSync(certPath)) return true;
  return hasPemSidecar(certPath);
}

export function certPemToX509(certPem: string): X509Certificate {
  return new X509Certificate(certPem);
}
