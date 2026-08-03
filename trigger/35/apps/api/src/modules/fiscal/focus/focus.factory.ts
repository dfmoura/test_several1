import { env } from '../../../config/env.js';
import type { FocusNfePort } from './focus.port.js';
import { StubFocusNfeAdapter } from './stub-focus.adapter.js';
import { HttpFocusNfeAdapter } from './http-focus.adapter.js';

/**
 * FOCUS_ADAPTER=stub → sempre stub.
 * FOCUS_ADAPTER=http + FOCUS_BASE_URL + FOCUS_TOKEN → HTTP real;
 * sem credenciais → permanece stub (DEV seguro).
 */
export function getFocusAdapter(): FocusNfePort {
  if (
    env.FOCUS_ADAPTER === 'http' &&
    env.FOCUS_BASE_URL?.trim() &&
    env.FOCUS_TOKEN?.trim()
  ) {
    return new HttpFocusNfeAdapter({
      baseUrl: env.FOCUS_BASE_URL.trim(),
      token: env.FOCUS_TOKEN.trim(),
    });
  }
  return new StubFocusNfeAdapter();
}
