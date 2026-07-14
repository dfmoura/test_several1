import type { AppConfig } from '@nfse/shared';
import { CertificadoProvider } from '@nfse/xml';

export function createCertificadoProvider(config: AppConfig): CertificadoProvider {
  return CertificadoProvider.create({
    certPath: config.certPath,
    certPassword: config.certPassword,
    certPasswordFile: config.certPasswordFile,
    cnpj: config.cnpj,
    govMock: config.govMock,
    certRequired: config.certRequired,
  });
}
