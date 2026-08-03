/** Porta WhatsApp oficial (Meta/BSP) — Dia-1: stub; régua completa fica em polish M06. */

export type WhatsAppEnviarTemplateInput = {
  toE164: string;
  templateName: string;
  templateParams?: string[];
  /** ORC | PED | TIT | ENT | … */
  agregadoTipo?: string | null;
  agregadoId?: string | null;
  idempotencyKey: string;
};

export type WhatsAppEnviarTemplateResult =
  | {
      ok: true;
      adapter: string;
      providerMessageId: string;
      status: 'ENVIADA' | 'ACEITA';
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      adapter: string;
      codigo: string;
      mensagem: string;
    };

export interface WhatsAppPort {
  readonly name: string;
  enviarTemplate(input: WhatsAppEnviarTemplateInput): Promise<WhatsAppEnviarTemplateResult>;
}
