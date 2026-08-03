import type {
  WhatsAppEnviarTemplateInput,
  WhatsAppEnviarTemplateResult,
  WhatsAppPort,
} from './whatsapp.port.js';

/** Stub Meta/WABA — não chama provedor; registra envio fictício. Conta pessoal = proibida por contrato. */
export class StubWhatsAppAdapter implements WhatsAppPort {
  readonly name = 'stub';

  async enviarTemplate(
    input: WhatsAppEnviarTemplateInput,
  ): Promise<WhatsAppEnviarTemplateResult> {
    const ts = Date.now();
    return {
      ok: true,
      adapter: this.name,
      providerMessageId: `wamid.stub.${ts}`,
      status: 'ENVIADA',
      raw: {
        modo: 'stub',
        toE164: input.toE164,
        templateName: input.templateName,
        templateParams: input.templateParams ?? [],
        idempotencyKey: input.idempotencyKey,
        aviso: 'Sem provedor real — só auditoria/outbox',
      },
    };
  }
}
