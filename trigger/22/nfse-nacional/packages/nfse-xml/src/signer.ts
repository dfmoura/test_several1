import { SignedXml } from 'xml-crypto';
import https from 'node:https';
import { X509Certificate } from 'node:crypto';
import {
  loadPfxMaterial,
  loadPemMaterial,
  hasPemSidecar,
  certificadoDisponivel,
  resolveCertPassword,
  CertificadoLoadError,
  type PfxMaterial,
} from './certificado-loader.js';
import {
  extrairCnpjCertificado,
  extrairRazaoSocialDoSubject,
  certificadoExpirado,
  diasParaExpirar,
  possuiClientAuth,
  normalizarCnpj,
} from './cnpj-certificado.js';

/** Padrão SEFIN/ADN — alinhado ao Emissor Nacional (xml oficial gov.br). */
export const NFSE_XMLDSIG = {
  canonicalization: 'http://www.w3.org/2001/10/xml-exc-c14n#WithComments',
  signature: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  digest: 'http://www.w3.org/2001/04/xmlenc#sha256',
  transforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/2001/10/xml-exc-c14n#WithComments',
  ] as const,
} as const;

export interface CertificadoInfo {
  validade: Date;
  diasParaExpirar: number;
  cnpj?: string;
  /** Razão social extraída do subject ICP-Brasil (CN=...:CNPJ). */
  razaoSocial?: string;
  subject: string;
  mock: boolean;
  clientAuth: boolean;
}

export interface CertificadoOptions {
  certPath?: string;
  certPassword?: string;
  certPasswordFile?: string;
  /** CNPJ configurado — deve coincidir com o certificado (emitente automático). */
  cnpjEsperado?: string;
  /** Exige certificado real (sem mock). Default: true quando govMock=false. */
  required?: boolean;
}

export class CertificadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificadoError';
  }
}

export class XmlSigner {
  constructor(
    private readonly privateKeyPem: string,
    private readonly certPem: string,
    private readonly chainPem = '',
    private readonly mock = false,
  ) {}

  static createMock(): XmlSigner {
    return new XmlSigner('MOCK_KEY', 'MOCK_CERT', '', true);
  }

  get isMock(): boolean {
    return this.mock;
  }

  get material(): PfxMaterial {
    return {
      privateKeyPem: this.privateKeyPem,
      certPem: this.certPem,
      chainPem: this.chainPem,
    };
  }

  assinar(xml: string, elementoId: string): string {
    if (this.mock) {
      const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="${NFSE_XMLDSIG.canonicalization}"/><SignatureMethod Algorithm="${NFSE_XMLDSIG.signature}"/><Reference URI="#${elementoId}"><Transforms><Transform Algorithm="${NFSE_XMLDSIG.transforms[0]}"/><Transform Algorithm="${NFSE_XMLDSIG.transforms[1]}"/></Transforms><DigestMethod Algorithm="${NFSE_XMLDSIG.digest}"/><DigestValue>MOCK_DIGEST</DigestValue></Reference></SignedInfo><SignatureValue>MOCK</SignatureValue></Signature>`;
      if (xml.includes(`</infDPS>`)) {
        return xml.replace('</DPS>', `${signature}\n</DPS>`);
      }
      if (xml.includes(`</infPedReg>`)) {
        return xml.replace('</pedRegEvento>', `${signature}\n</pedRegEvento>`);
      }
      return xml;
    }

    const sig = new SignedXml({
      privateKey: this.privateKeyPem,
      publicCert: this.certPem,
    });
    sig.addReference({
      xpath: `//*[@Id='${elementoId}']`,
      transforms: [...NFSE_XMLDSIG.transforms],
      digestAlgorithm: NFSE_XMLDSIG.digest,
    });
    sig.signatureAlgorithm = NFSE_XMLDSIG.signature;
    sig.canonicalizationAlgorithm = NFSE_XMLDSIG.canonicalization;

    sig.computeSignature(xml, {
      location: { reference: `//*[@Id='${elementoId}']`, action: 'after' },
    });
    return sig.getSignedXml();
  }

  getCertificadoInfo(): CertificadoInfo {
    if (this.mock) {
      const validade = new Date();
      validade.setFullYear(validade.getFullYear() + 1);
      return {
        validade,
        diasParaExpirar: 365,
        cnpj: '12345678000199',
        subject: 'MOCK CERT (desenvolvimento)',
        mock: true,
        clientAuth: false,
      };
    }

    const cert = new X509Certificate(this.certPem);
    const validade = new Date(cert.validTo);
    return {
      validade,
      diasParaExpirar: diasParaExpirar(this.certPem),
      cnpj: extrairCnpjCertificado(this.certPem),
      razaoSocial: extrairRazaoSocialDoSubject(cert.subject),
      subject: cert.subject,
      mock: false,
      clientAuth: possuiClientAuth(this.certPem),
    };
  }

  createHttpsAgent(): https.Agent {
    if (this.mock) {
      throw new CertificadoError('Agente mTLS indisponível: certificado mock em uso');
    }
    return new https.Agent({
      key: this.privateKeyPem,
      cert: this.certPem,
      ca: this.chainPem || undefined,
      rejectUnauthorized: true,
      // SEFIN/ADN rejeitam HTTP/2 — força ALPN para HTTP/1.1 na negociação TLS.
      ALPNProtocols: ['http/1.1'],
    });
  }
}

function toCertificadoError(err: unknown): CertificadoError {
  if (err instanceof CertificadoError) return err;
  if (err instanceof CertificadoLoadError) return new CertificadoError(err.message);
  throw err;
}

function loadRealMaterial(
  certPath: string,
  certPassword: string | undefined,
  certPasswordFile: string | undefined,
  cnpjEsperado: string | undefined,
): XmlSigner {
  let material: PfxMaterial;
  const password = resolveCertPassword(certPassword, certPasswordFile);

  if (hasPemSidecar(certPath)) {
    material = loadPemMaterial(certPath);
  } else {
    if (!password) {
      throw new CertificadoError(
        'Senha do certificado obrigatória: defina NFSE_CERT_PASSWORD ou NFSE_CERT_PASSWORD_FILE',
      );
    }
    material = loadPfxMaterial(certPath, password);
  }

  const signer = new XmlSigner(material.privateKeyPem, material.certPem, material.chainPem, false);

  if (certificadoExpirado(material.certPem)) {
    throw new CertificadoError('Certificado A1 expirado — renove antes de emitir NFS-e');
  }

  const cnpjCert = extrairCnpjCertificado(material.certPem);
  if (!cnpjCert) {
    throw new CertificadoError('CNPJ não encontrado no certificado e-CNPJ ICP-Brasil');
  }

  if (cnpjEsperado) {
    const esperado = normalizarCnpj(cnpjEsperado);
    if (cnpjCert !== esperado) {
      throw new CertificadoError(
        `CNPJ do certificado (${cnpjCert}) difere do emitente configurado (${esperado}). ` +
          'Ajuste NFSE_CNPJ ou use o certificado correto.',
      );
    }
  }

  if (!possuiClientAuth(material.certPem)) {
    throw new CertificadoError('Certificado sem EKU Client Authentication (mTLS gov.br)');
  }

  return signer;
}

function loadMaterial(options: CertificadoOptions): XmlSigner {
  const { certPath, certPassword, certPasswordFile, cnpjEsperado, required = false } = options;

  if (!certPath || !certificadoDisponivel(certPath)) {
    if (required) {
      const detail = certPath
        ? `Certificado A1 obrigatório não encontrado: ${certPath}`
        : 'Certificado A1 obrigatório: defina NFSE_CERT_PATH';
      throw new CertificadoError(detail);
    }
    if (certPath && !certificadoDisponivel(certPath)) {
      console.warn(
        `[nfse] Certificado não encontrado em ${certPath} — usando mock (defina NFSE_CERT_REQUIRED=true para exigir A1)`,
      );
    }
    return XmlSigner.createMock();
  }

  try {
    return loadRealMaterial(certPath, certPassword, certPasswordFile, cnpjEsperado);
  } catch (err) {
    if (!required) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(
        `[nfse] Falha ao carregar certificado em ${certPath} — usando mock (${detail}). ` +
          'Corrija secrets/certificado.senha e NFSE_CNPJ, ou defina NFSE_CERT_REQUIRED=true após configurar.',
      );
      return XmlSigner.createMock();
    }
    throw toCertificadoError(err);
  }
}

export class CertificadoProvider {
  private readonly signer: XmlSigner;

  constructor(options: CertificadoOptions = {}) {
    this.signer = loadMaterial(options);
  }

  /** Factory com validação de emitente e requisito conforme ambiente. */
  static create(options: {
    certPath?: string;
    certPassword?: string;
    certPasswordFile?: string;
    cnpj: string;
    govMock: boolean;
    certRequired?: boolean;
  }): CertificadoProvider {
    const required = options.certRequired ?? !options.govMock;
    return new CertificadoProvider({
      certPath: options.certPath,
      certPassword: options.certPassword,
      certPasswordFile: options.certPasswordFile,
      cnpjEsperado: options.cnpj,
      required,
    });
  }

  get isMock(): boolean {
    return this.signer.isMock;
  }

  assinarXml(xml: string, elementoId: string): string {
    return this.signer.assinar(xml, elementoId);
  }

  validade(): CertificadoInfo {
    return this.signer.getCertificadoInfo();
  }

  getHttpsAgent(): https.Agent | undefined {
    if (this.signer.isMock) return undefined;
    return this.signer.createHttpsAgent();
  }
}
