import https from 'node:https';
import type { Ambiente } from '@nfse/shared';
import { MockSefinAdapter } from './mock-sefin.js';
import { MockAdnAdapter } from './mock-adn.js';
import { SefinAdapter } from './sefin-adapter.js';
import { AdnAdapter } from './adn-adapter.js';
import type { ICadastroConsultaGateway, ISefinGateway, IAdnGateway } from './ports.js';

export function createSefinGateway(
  ambiente: Ambiente,
  mock: boolean,
  httpsAgent?: https.Agent,
  cadastro?: ICadastroConsultaGateway,
): ISefinGateway {
  if (mock || ambiente === 'dev') {
    return new MockSefinAdapter(cadastro);
  }
  return new SefinAdapter(ambiente, httpsAgent);
}

export function createAdnGateway(
  ambiente: Ambiente,
  mock: boolean,
  httpsAgent?: https.Agent,
  cnpjTomador?: string,
): IAdnGateway {
  if (mock || ambiente === 'dev') {
    return new MockAdnAdapter(cnpjTomador);
  }
  return new AdnAdapter(ambiente, httpsAgent, cnpjTomador);
}

export * from './gov-error.js';
export * from './ports.js';
export * from './sefin-adapter.js';
export * from './adn-adapter.js';
export * from './mock-sefin.js';
export * from './mock-adn.js';
export * from './cadastro/index.js';
