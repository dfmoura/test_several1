import { env } from '../../../config/env.js';
import type { WhatsAppPort } from './whatsapp.port.js';
import { StubWhatsAppAdapter } from './stub-whatsapp.adapter.js';

/**
 * WA_ADAPTER=stub (default) → stub.
 * http exigiria WABA token — não implementado nesta leva (permanece stub).
 */
export function getWhatsAppAdapter(): WhatsAppPort {
  void env.WA_ADAPTER;
  return new StubWhatsAppAdapter();
}
