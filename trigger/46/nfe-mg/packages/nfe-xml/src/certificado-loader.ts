import forge from 'node-forge';
import { readFileSync, existsSync } from 'node:fs';

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

export function resolveCertPassword(password?: string, passwordFile?: string): string | undefined {
  if (passwordFile && existsSync(passwordFile)) {
    return readFileSync(passwordFile, 'utf-8').trim();
  }
  return password?.trim() || undefined;
}

export function loadPfxBuffer(pfx: Buffer, password: string): PfxMaterial {
  let pkcs12: forge.pkcs12.Pkcs12Pfx;
  try {
    const pfxAsn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
    pkcs12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
  } catch {
    throw new CertificadoLoadError(
      'Senha do certificado inválida ou arquivo PFX corrompido',
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

export function loadPfxMaterial(pfxPath: string, password: string): PfxMaterial {
  if (!existsSync(pfxPath)) {
    throw new CertificadoLoadError(`Certificado não encontrado: ${pfxPath}`);
  }
  return loadPfxBuffer(readFileSync(pfxPath), password);
}
