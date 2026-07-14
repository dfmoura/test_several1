import type { IAdnGateway } from '@nfse/gov-client';
import type { Db } from './db.js';
import { getUltimoNsu, setUltimoNsu } from './db.js';
import { FileStorage } from './storage.js';
import { extractMetadata } from './nfse-service.js';

export class SyncService {
  constructor(
    private readonly db: Db,
    private readonly adn: IAdnGateway,
    private readonly storage: FileStorage,
    private readonly govMock: boolean,
  ) {}

  async sincronizar(): Promise<{ processados: number; ultimoNsu: string }> {
    let ultimoNsu = getUltimoNsu(this.db);

    if (this.govMock) {
      const count = this.db.prepare('SELECT COUNT(*) as c FROM dfe_recebido').get() as { c: number };
      if (count.c === 0 && parseInt(ultimoNsu, 10) > 0) {
        ultimoNsu = '0';
        setUltimoNsu(this.db, '0');
      }
    }

    const lote = await this.adn.sincronizarDfe(ultimoNsu);
    let processados = 0;

    for (const doc of lote.documentos) {
      const xmlPath = this.storage.put(
        `${new Date().getFullYear()}/${doc.nsu}.xml`,
        doc.xml,
      );

      const meta = extractMetadata(doc.xml, doc.chave);

      this.db.prepare(`
        INSERT OR IGNORE INTO dfe_recebido (chave, nsu, tipo_dfe, xml_path, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        doc.chave,
        doc.nsu,
        doc.tipoDfe,
        xmlPath,
        meta ? JSON.stringify(meta) : null,
      );

      processados++;
    }

    if (lote.documentos.length > 0 || !this.govMock) {
      setUltimoNsu(this.db, lote.maxNsu);
    }

    return {
      processados,
      ultimoNsu: lote.documentos.length > 0 ? lote.maxNsu : ultimoNsu,
    };
  }
}
