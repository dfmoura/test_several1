import type { Ambiente } from '@nfe/shared';
import type { XmlSigner } from '@nfe/xml';
import type { ISefazGateway } from './ports.js';
import { MockSefazAdapter } from './mock-sefaz.js';
import { SefazMgAdapter } from './sefaz-mg-adapter.js';

export function createSefazGateway(
  ambiente: Ambiente,
  mock: boolean,
  signer: XmlSigner,
): ISefazGateway {
  if (mock) return new MockSefazAdapter();
  return new SefazMgAdapter(signer, ambiente);
}

export * from './ports.js';
export * from './mock-sefaz.js';
export * from './sefaz-mg-adapter.js';
