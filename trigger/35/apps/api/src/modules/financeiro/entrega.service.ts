import { prisma } from '../../infrastructure/prisma/client.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, NotFoundError } from '../shared/errors/app-error.js';

function serializeEnt(e: {
  id: bigint;
  codigo: string;
  status: string;
  volumes: number;
  observacoes: string | null;
  despachadoEm: Date;
  entregueEm: Date | null;
  criadoEm: Date;
  pedido: { id: bigint; codigo: string; status: string };
}) {
  return {
    id: e.id.toString(),
    codigo: e.codigo,
    status: e.status,
    volumes: e.volumes,
    observacoes: e.observacoes,
    despachadoEm: e.despachadoEm,
    entregueEm: e.entregueEm,
    criadoEm: e.criadoEm,
    pedido: {
      id: e.pedido.id.toString(),
      codigo: e.pedido.codigo,
      status: e.pedido.status,
    },
  };
}

async function exigirNfAntesExpedir(empresaId: bigint): Promise<boolean> {
  const p = await prisma.parametroEmpresa.findUnique({
    where: {
      empresaId_chave: { empresaId, chave: 'politica_nf_antes_expedir' },
    },
  });
  return (p?.valor ?? 'true').toLowerCase() !== 'false';
}

/** UC-FIN-010 — Romaneio mínimo + confirmação (PED → ENTREGUE). */
export async function registrarEntrega(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  volumes?: number;
  observacoes?: string | null;
  confirmarAgora?: boolean;
  ip?: string;
  correlationId?: string;
}) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: {
      documentosFiscais: { where: { status: 'AUTORIZADA' } },
      entregas: true,
    },
  });
  if (!pedido) throw new NotFoundError('Pedido não encontrado');
  if (pedido.status === 'ENTREGUE' || pedido.status === 'ENCERRADO') {
    throw new AppError('PED_JA_ENTREGUE', `Pedido já em ${pedido.status}`, 409);
  }
  if (pedido.status === 'CANCELADO') {
    throw new AppError('PED_CANCELADO', 'Pedido cancelado', 400);
  }
  if (
    !['FATURADO', 'FATURADO_PARCIAL', 'EM_SEPARACAO', 'EM_PRODUCAO', 'LIBERADO'].includes(
      pedido.status,
    )
  ) {
    throw new AppError('PED_NAO_EXPEDIVEL', `PED em ${pedido.status} não expede`, 400);
  }

  if (await exigirNfAntesExpedir(params.empresaId)) {
    if (pedido.documentosFiscais.length === 0) {
      throw new AppError(
        'NF_ANTES_EXPEDIR',
        'Política exige NF autorizada antes de expedir',
        400,
      );
    }
  }

  const ja = pedido.entregas.find((e) => e.status !== 'CANCELADA');
  if (ja) {
    throw new AppError(
      'ENT_JA_EXISTE',
      `Já existe ${ja.codigo} (${ja.status}) para este PED (dia-1 = 1 ENT)`,
      409,
    );
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'ENT');
  const confirmar = params.confirmarAgora !== false;
  const created = await prisma.$transaction(async (tx) => {
    const ent = await tx.entrega.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        pedidoId: pedido.id,
        status: confirmar ? 'ENTREGUE' : 'DESPACHADA',
        volumes: params.volumes && params.volumes > 0 ? params.volumes : 1,
        observacoes: params.observacoes ?? null,
        entregueEm: confirmar ? new Date() : null,
        criadoPorId: params.usuarioId,
      },
      include: { pedido: true },
    });
    if (confirmar) {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: 'ENTREGUE' },
      });
    }
    return ent;
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: confirmar ? 'EntregaConfirmada' : 'EntregaDespachada',
      agregadoTipo: 'entrega',
      agregadoId: created.id.toString(),
      payload: { codigo: created.codigo, pedidoCodigo: pedido.codigo },
      idempotencyKey: `ent-${pedido.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: confirmar ? 'FIN.ENT.CONFIRMAR' : 'FIN.ENT.DESPACHAR',
    entidade: 'Entrega',
    entidadeId: created.codigo,
    deJson: { pedidoStatus: pedido.status },
    paraJson: {
      status: created.status,
      pedidoStatus: confirmar ? 'ENTREGUE' : pedido.status,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  const fresh = await prisma.entrega.findUniqueOrThrow({
    where: { id: created.id },
    include: { pedido: true },
  });
  return serializeEnt(fresh);
}

export async function confirmarEntrega(params: {
  empresaId: bigint;
  usuarioId: bigint;
  entregaId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const ent = await prisma.entrega.findFirst({
    where: { id: params.entregaId, empresaId: params.empresaId },
    include: { pedido: true },
  });
  if (!ent) throw new NotFoundError('Entrega não encontrada');
  if (ent.status === 'ENTREGUE') {
    return serializeEnt(ent);
  }
  if (ent.status === 'CANCELADA') {
    throw new AppError('ENT_CANCELADA', 'Entrega cancelada', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const e = await tx.entrega.update({
      where: { id: ent.id },
      data: { status: 'ENTREGUE', entregueEm: new Date() },
      include: { pedido: true },
    });
    await tx.pedido.update({
      where: { id: ent.pedidoId },
      data: { status: 'ENTREGUE' },
    });
    return e;
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIN.ENT.CONFIRMAR',
    entidade: 'Entrega',
    entidadeId: ent.codigo,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeEnt(
    await prisma.entrega.findUniqueOrThrow({
      where: { id: updated.id },
      include: { pedido: true },
    }),
  );
}

export async function listarEntregas(params: {
  empresaId: bigint;
  limit?: number;
}) {
  const rows = await prisma.entrega.findMany({
    where: { empresaId: params.empresaId },
    include: { pedido: true },
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 50, 100),
  });
  return rows.map(serializeEnt);
}
