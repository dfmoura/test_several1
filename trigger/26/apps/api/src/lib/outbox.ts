import type { DbClient } from "../db/pool.js";

export async function emitOutboxEvent(
  client: DbClient,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO integration.outbox_events (event_type, aggregate_type, aggregate_id, payload)
     VALUES ($1, $2, $3, $4)`,
    [eventType, aggregateType, aggregateId, JSON.stringify(payload)],
  );
}

export async function fetchPendingOutboxEvents(limit = 50) {
  const { pool } = await import("../db/pool.js");
  const result = await pool.query(
    `SELECT id, event_type, aggregate_type, aggregate_id, payload, attempts
     FROM integration.outbox_events
     WHERE processed_at IS NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows as Array<{
    id: string;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    payload: Record<string, unknown>;
    attempts: number;
  }>;
}

export async function markOutboxProcessed(id: string, error?: string): Promise<void> {
  const { pool } = await import("../db/pool.js");
  if (error) {
    await pool.query(
      `UPDATE integration.outbox_events
       SET attempts = attempts + 1, last_error = $2
       WHERE id = $1`,
      [id, error],
    );
  } else {
    await pool.query(
      `UPDATE integration.outbox_events SET processed_at = now() WHERE id = $1`,
      [id],
    );
  }
}
