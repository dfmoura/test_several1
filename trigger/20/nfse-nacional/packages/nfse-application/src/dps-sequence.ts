import { eq, sql } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';

export async function getNextDpsNumero(db: Database): Promise<number> {
  await db
    .insert(schema.dpsNumeroSeq)
    .values({ id: 1, ultimoNumero: 0 })
    .onConflictDoNothing();

  const result = await db
    .update(schema.dpsNumeroSeq)
    .set({ ultimoNumero: sql`${schema.dpsNumeroSeq.ultimoNumero} + 1` })
    .where(eq(schema.dpsNumeroSeq.id, 1))
    .returning({ ultimoNumero: schema.dpsNumeroSeq.ultimoNumero });

  return result[0]!.ultimoNumero;
}
