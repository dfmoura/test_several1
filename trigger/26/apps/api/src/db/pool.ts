import pg from "pg";
import { env } from "../lib/env.js";

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 20,
});

export type DbClient = pg.PoolClient;

export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDb(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
