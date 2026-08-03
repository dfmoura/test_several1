import { prisma } from '../../../infrastructure/prisma/client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { nextCodigo } from '../../cadastros/shared/codigo.service.js';
import { registrarAuditoria } from '../../plataforma/auditoria/audit.service.js';
import { getWhatsAppAdapter } from './whatsapp.factory.js';
import { isWhatsAppEnvioHabilitado } from '../kill-switch.js';

export async function enviarWhatsAppTemplate(params: {
  empresaId: bigint;
  usuarioId: bigint;
  toE164: string;
  templateName: string;
  templateParams?: string[];
  agregadoTipo?: string | null;
  agregadoId?: string | null;
  idempotencyKey?: string | null;
  ip?: string | null;
  correlationId?: string | null;
}) {
  const to = normalizeE164(params.toE164);
  if (!to) {
    throw new AppError('WA_DESTINO_INVALIDO', 'toE164 inválido (use +5511999999999)', 400);
  }
  const templateName = params.templateName.trim();
  if (!templateName) {
    throw new AppError('WA_TEMPLATE_OBRIGATORIO', 'templateName obrigatório', 400);
  }

  if (!(await isWhatsAppEnvioHabilitado(params.empresaId))) {
    throw new AppError(
      'WA_KILL_SWITCH',
      'Envio WhatsApp desabilitado (whatsapp_envio_habilitado=false)',
      403,
    );
  }

  const idem =
    params.idempotencyKey?.trim() ||
    `wa-${params.empresaId}-${templateName}-${to}-${Date.now()}`;

  // Replay por outbox (sem tabela MSG dedicada nesta leva)
  const exist = await prisma.outboxEvent.findUnique({
    where: { idempotencyKey: `wa-enviada-${idem}` },
  });
  if (exist) {
    return {
      replay: true as const,
      codigo: String((exist.payload as { codigo?: string }).codigo ?? exist.agregadoId),
      adapter: 'stub',
      status: 'ENVIADA',
      providerMessageId: String(
        (exist.payload as { providerMessageId?: string }).providerMessageId ?? '',
      ),
      toE164: to,
      templateName,
    };
  }

  const codigo = await nextCodigo({ empresaId: params.empresaId, prefixo: 'MSG' });
  const wa = getWhatsAppAdapter();
  const result = await wa.enviarTemplate({
    toE164: to,
    templateName,
    templateParams: params.templateParams,
    agregadoTipo: params.agregadoTipo,
    agregadoId: params.agregadoId,
    idempotencyKey: idem,
  });

  if (!result.ok) {
    await registrarAuditoria({
      empresaId: params.empresaId,
      usuarioId: params.usuarioId,
      acao: 'INT.WA.ENVIAR',
      entidade: 'MensagemWhatsApp',
      entidadeId: codigo,
      paraJson: { erro: result.mensagem, codigo: result.codigo, toE164: to },
      ip: params.ip,
      correlationId: params.correlationId,
      sucesso: false,
    });
    throw new AppError('WA_ENVIO_FALHOU', result.mensagem, 422, { codigo: result.codigo });
  }

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'WhatsAppMensagemEnviada',
      agregadoTipo: params.agregadoTipo ?? 'mensagem_whatsapp',
      agregadoId: codigo,
      payload: {
        codigo,
        toE164: to,
        templateName,
        templateParams: params.templateParams ?? [],
        providerMessageId: result.providerMessageId,
        adapter: result.adapter,
        status: result.status,
        agregadoIdNegocio: params.agregadoId ?? null,
      },
      idempotencyKey: `wa-enviada-${idem}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'INT.WA.ENVIAR',
    entidade: 'MensagemWhatsApp',
    entidadeId: codigo,
    paraJson: {
      codigo,
      toE164: to,
      templateName,
      providerMessageId: result.providerMessageId,
      adapter: result.adapter,
      status: result.status,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    replay: false as const,
    codigo,
    adapter: result.adapter,
    status: result.status,
    providerMessageId: result.providerMessageId,
    toE164: to,
    templateName,
  };
}

function normalizeE164(raw: string): string | null {
  const s = raw.trim().replace(/[\s()-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 13) return `+${digits}`;
  return null;
}
