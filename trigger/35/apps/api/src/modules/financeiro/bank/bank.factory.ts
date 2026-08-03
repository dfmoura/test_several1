import { env } from '../../../config/env.js';
import type { BankProviderPort } from './bank.port.js';
import { StubBankProvider } from './stub-bank.adapter.js';
import { HttpBankProvider } from './http-bank.adapter.js';

/**
 * BANK_ADAPTER=stub → stub (default DEV).
 * BANK_ADAPTER=http + BANK_BASE_URL + BANK_TOKEN → esqueleto HTTP (sem CNAB).
 */
export function getBankProvider(): BankProviderPort {
  if (
    env.BANK_ADAPTER === 'http' &&
    env.BANK_BASE_URL?.trim() &&
    env.BANK_TOKEN?.trim()
  ) {
    return new HttpBankProvider({
      baseUrl: env.BANK_BASE_URL.trim(),
      token: env.BANK_TOKEN.trim(),
    });
  }
  return new StubBankProvider();
}
