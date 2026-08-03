import { prisma } from '../../infrastructure/prisma/client.js';

export type KillSwitchKey =
  | 'focus_emissao_habilitada'
  | 'bank_cobranca_habilitada'
  | 'whatsapp_envio_habilitado';

const DEFAULTS: Record<KillSwitchKey, boolean> = {
  focus_emissao_habilitada: true,
  bank_cobranca_habilitada: true,
  whatsapp_envio_habilitado: true,
};

async function readBool(empresaId: bigint, chave: KillSwitchKey): Promise<boolean> {
  const p = await prisma.parametroEmpresa.findUnique({
    where: { empresaId_chave: { empresaId, chave } },
  });
  if (!p) return DEFAULTS[chave];
  return p.valor.trim().toLowerCase() !== 'false';
}

export async function isFocusEmissaoHabilitada(empresaId: bigint): Promise<boolean> {
  return readBool(empresaId, 'focus_emissao_habilitada');
}

export async function isBankCobrancaHabilitada(empresaId: bigint): Promise<boolean> {
  return readBool(empresaId, 'bank_cobranca_habilitada');
}

export async function isWhatsAppEnvioHabilitado(empresaId: bigint): Promise<boolean> {
  return readBool(empresaId, 'whatsapp_envio_habilitado');
}

export async function getKillSwitchStatus(empresaId: bigint) {
  const [focus, bank, whatsapp] = await Promise.all([
    isFocusEmissaoHabilitada(empresaId),
    isBankCobrancaHabilitada(empresaId),
    isWhatsAppEnvioHabilitado(empresaId),
  ]);
  return { focus, bank, whatsapp };
}
