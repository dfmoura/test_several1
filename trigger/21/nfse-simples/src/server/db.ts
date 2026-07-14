import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Config } from './config.js';

export type Db = Database.Database;

export function createDb(config: Config): Db {
  const dbPath = join(config.dataDir, 'nfse.db');
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS nfse (
      chave_acesso TEXT PRIMARY KEY,
      id_dps TEXT NOT NULL,
      situacao TEXT NOT NULL DEFAULT 'AUTORIZADA',
      valor_servico REAL NOT NULL,
      tomador_nome TEXT,
      tomador_doc TEXT,
      descricao TEXT,
      xml_path TEXT,
      emitida_em TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dps_seq (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      proximo INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO dps_seq (id, proximo) VALUES (1, 1);

    CREATE TABLE IF NOT EXISTS dfe_recebido (
      chave TEXT PRIMARY KEY,
      nsu TEXT NOT NULL,
      tipo_dfe TEXT NOT NULL,
      xml_path TEXT,
      metadata TEXT,
      recebido_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nsu_controle (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ultimo_nsu TEXT NOT NULL DEFAULT '0'
    );

    INSERT OR IGNORE INTO nsu_controle (id, ultimo_nsu) VALUES (1, '0');

    CREATE INDEX IF NOT EXISTS idx_nfse_emitida ON nfse(emitida_em DESC);
    CREATE INDEX IF NOT EXISTS idx_dfe_recebido ON dfe_recebido(recebido_em DESC);
  `);

  return db;
}

export function nextDpsNumero(db: Db): number {
  const row = db.prepare('SELECT proximo FROM dps_seq WHERE id = 1').get() as { proximo: number };
  const numero = row.proximo;
  db.prepare('UPDATE dps_seq SET proximo = proximo + 1 WHERE id = 1').run();
  return numero;
}

export function getUltimoNsu(db: Db): string {
  const row = db.prepare('SELECT ultimo_nsu FROM nsu_controle WHERE id = 1').get() as { ultimo_nsu: string };
  return row.ultimo_nsu;
}

export function setUltimoNsu(db: Db, nsu: string): void {
  db.prepare('UPDATE nsu_controle SET ultimo_nsu = ? WHERE id = 1').run(nsu);
}
