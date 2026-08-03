import type { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/prisma/client.js';

export type AuditInput = {
  empresaId?: bigint | null;
  usuarioId?: bigint | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  deJson?: Prisma.InputJsonValue;
  paraJson?: Prisma.InputJsonValue;
  ip?: string | null;
  correlationId?: string | null;
  sucesso?: boolean;
};

export async function registrarAuditoria(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      empresaId: input.empresaId ?? null,
      usuarioId: input.usuarioId ?? null,
      acao: input.acao,
      entidade: input.entidade,
      entidadeId: input.entidadeId ?? null,
      deJson: input.deJson,
      paraJson: input.paraJson,
      ip: input.ip ?? null,
      correlationId: input.correlationId ?? null,
      sucesso: input.sucesso ?? true,
    },
  });
}
