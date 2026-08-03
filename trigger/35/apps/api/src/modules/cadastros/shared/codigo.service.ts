import { prisma } from '../../../infrastructure/prisma/client.js';
import type { Prisma } from '@prisma/client';

/** Gera código legível (PAR-00001, FAC-00001, …) com sequência por empresa+prefixo. */
export async function nextCodigo(params: {
  empresaId: bigint;
  prefixo: string;
  pad?: number;
}): Promise<string> {
  const n = await nextSeq(params.empresaId, params.prefixo);
  const pad = params.pad ?? 5;
  return `${params.prefixo}-${n.toString().padStart(pad, '0')}`;
}

/** DOC interno + documentos de negócio AAAA-NNNNN */
export async function nextCodigoDocumento(
  empresaId: bigint,
  tipo:
    | 'ORC'
    | 'PED'
    | 'MOV'
    | 'OP'
    | 'OS'
    | 'DF'
    | 'TIT'
    | 'BX'
    | 'COB'
    | 'ENT'
    | 'INV'
    | 'BAM'
    | 'COT'
    | 'OC'
    | 'NFC',
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = tx
    ? await nextSeqInTx(tx, empresaId, `${tipo}${year}`)
    : await nextSeq(empresaId, `${tipo}${year}`);
  return `${tipo}-${year}-${n.toString().padStart(5, '0')}`;
}

async function nextSeq(empresaId: bigint, prefixo: string): Promise<bigint> {
  return prisma.$transaction(async (tx) => nextSeqInTx(tx, empresaId, prefixo));
}

async function nextSeqInTx(
  tx: Prisma.TransactionClient,
  empresaId: bigint,
  prefixo: string,
): Promise<bigint> {
  const existing = await tx.sequenciaCodigo.findUnique({
    where: { empresaId_prefixo: { empresaId, prefixo } },
  });
  if (!existing) {
    await tx.sequenciaCodigo.create({
      data: { empresaId, prefixo, proximo: 2n },
    });
    return 1n;
  }
  const atual = existing.proximo;
  await tx.sequenciaCodigo.update({
    where: { id: existing.id },
    data: { proximo: atual + 1n },
  });
  return atual;
}
