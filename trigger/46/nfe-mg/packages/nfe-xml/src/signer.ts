import { SignedXml } from 'xml-crypto';
import https from 'node:https';
import { loadPfxBuffer, type PfxMaterial } from './certificado-loader.js';
import {
  extrairCnpjCertificado,
  extrairRazaoSocialDoSubject,
  certificadoExpirado,
  diasParaExpirar,
  possuiClientAuth,
  subjectCertificado,
  validadeCertificado,
  normalizarCnpj,
} from './cnpj-certificado.js';
import { CertificadoError } from '@nfe/shared';

/** Assinatura clássica NF-e (MOC) — RSA-SHA1 enveloped. */
export const NFE_XMLDSIG = {
  canonicalization: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  signature: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  digest: 'http://www.w3.org/2000/09/xmldsig#sha1',
  transforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  ] as const,
} as const;

export interface CertificadoInfo {
  validade: Date;
  diasParaExpirar: number;
  cnpj?: string;
  razaoSocial?: string;
  subject: string;
  mock: boolean;
  clientAuth: boolean;
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

  static fromPfx(pfx: Buffer, password: string): XmlSigner {
    const mat = loadPfxBuffer(pfx, password);
    return XmlSigner.fromMaterial(mat);
  }

  static fromMaterial(mat: PfxMaterial): XmlSigner {
    return new XmlSigner(mat.privateKeyPem, mat.certPem, mat.chainPem, false);
  }

  get isMock(): boolean {
    return this.mock;
  }

  info(): CertificadoInfo {
    if (this.mock) {
      const validade = new Date();
      validade.setFullYear(validade.getFullYear() + 1);
      return {
        validade,
        diasParaExpirar: 365,
        mock: true,
        clientAuth: true,
        subject: 'CN=MOCK SEFAZ',
      };
    }
    return {
      validade: validadeCertificado(this.certPem),
      diasParaExpirar: diasParaExpirar(this.certPem),
      cnpj: extrairCnpjCertificado(this.certPem),
      razaoSocial: extrairRazaoSocialDoSubject(this.certPem),
      subject: subjectCertificado(this.certPem),
      mock: false,
      clientAuth: possuiClientAuth(this.certPem),
    };
  }

  assertCnpj(esperado: string): void {
    if (this.mock) return;
    const doCert = this.info().cnpj;
    if (doCert && normalizarCnpj(doCert) !== normalizarCnpj(esperado)) {
      throw new CertificadoError(
        `CNPJ do certificado (${doCert}) diverge do emitente (${esperado})`,
      );
    }
    if (certificadoExpirado(this.certPem)) {
      throw new CertificadoError('Certificado A1 expirado');
    }
  }

  assinarXml(xml: string, referenceUri: string): string {
    if (this.mock) {
      if (xml.includes('</infNFe>')) {
        return xml.replace(
          '</infNFe>',
          '</infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/><SignatureValue>MOCK</SignatureValue></Signature>',
        );
      }
      if (xml.includes('</infEvento>')) {
        return xml.replace(
          '</infEvento>',
          '</infEvento><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/><SignatureValue>MOCK</SignatureValue></Signature>',
        );
      }
      if (xml.includes('</infInut>')) {
        return xml.replace(
          '</infInut>',
          '</infInut><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/><SignatureValue>MOCK</SignatureValue></Signature>',
        );
      }
      return xml;
    }

    const sig = new SignedXml({
      privateKey: this.privateKeyPem,
      publicCert: this.certPem,
      signatureAlgorithm: NFE_XMLDSIG.signature,
      canonicalizationAlgorithm: NFE_XMLDSIG.canonicalization,
    });
    sig.addReference({
      xpath: `//*[@Id='${referenceUri}']`,
      digestAlgorithm: NFE_XMLDSIG.digest,
      transforms: [...NFE_XMLDSIG.transforms],
      uri: `#${referenceUri}`,
    });
    sig.computeSignature(xml, {
      location: { reference: `//*[@Id='${referenceUri}']`, action: 'after' },
    });
    return sig.getSignedXml();
  }

  getHttpsAgent(): https.Agent | undefined {
    if (this.mock) return undefined;
    return new https.Agent({
      key: this.privateKeyPem,
      cert: this.chainPem ? `${this.certPem}\n${this.chainPem}` : this.certPem,
      rejectUnauthorized: true,
    });
  }
}
