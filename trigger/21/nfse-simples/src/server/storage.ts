import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { Config } from './config.js';

export class FileStorage {
  private readonly xmlDir: string;

  constructor(config: Config) {
    this.xmlDir = join(config.dataDir, 'xml');
    mkdirSync(this.xmlDir, { recursive: true });
  }

  buildKey(chave: string, tipo: 'nfse' | 'dps' | 'evento' | 'dfe', suffix?: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const name = suffix ? `${tipo}_${suffix}` : tipo;
    return `${year}/${month}/${chave}/${name}.xml`;
  }

  put(relativePath: string, content: string): string {
    const full = join(this.xmlDir, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
    return relativePath;
  }

  get(relativePath: string): string {
    const full = join(this.xmlDir, relativePath);
    if (!existsSync(full)) {
      throw new Error(`Arquivo não encontrado: ${relativePath}`);
    }
    return readFileSync(full, 'utf8');
  }

  exists(relativePath: string): boolean {
    return existsSync(join(this.xmlDir, relativePath));
  }
}
