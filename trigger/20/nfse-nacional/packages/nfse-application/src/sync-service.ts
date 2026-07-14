import { count } from 'drizzle-orm';
import type { IAdnGateway } from '@nfse/gov-client';
import type { AppConfig } from '@nfse/shared';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';
import { XmlStorage } from './storage/xml-storage.js';
import { DfeRecebidasService } from './dfe-recebidas-service.js';
import { NsuControleRepository } from './repositories.js';

export class SyncService {
  private readonly nsuRepo: NsuControleRepository;

  constructor(
    private readonly db: Database,
    private readonly adn: IAdnGateway,
    private readonly storage: XmlStorage,
    private readonly config?: Pick<AppConfig, 'govMock'>,
  ) {
    this.nsuRepo = new NsuControleRepository(db);
  }

  async sincronizarDfe(): Promise<{ processados: number; ultimoNsu: string }> {
    let ultimoNsu = await this.nsuRepo.getUltimoNsu();

    if (this.config?.govMock) {
      const [dfeCountRow] = await this.db.select({ count: count() }).from(schema.dfeRecebido);
      if (Number(dfeCountRow?.count ?? 0) === 0 && parseInt(ultimoNsu, 10) > 0) {
        ultimoNsu = '0';
        await this.nsuRepo.atualizar('0');
      }
    }

    const lote = await this.adn.sincronizarDfe(ultimoNsu);

    let processados = 0;
    for (const doc of lote.documentos) {
      const key = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/dfe/${doc.nsu}.xml`;
      await this.storage.putXml(key, doc.xml);

      const meta = DfeRecebidasService.extractMetadata(doc.xml, doc.chave);

      await this.db.insert(schema.dfeRecebido).values({
        nsu: doc.nsu,
        tipoDfe: doc.tipoDfe,
        chave: doc.chave,
        xmlStorageKey: key,
        metadata: meta ?? undefined,
        processado: false,
      }).onConflictDoNothing();

      await this.db.insert(schema.outbox).values({
        eventType: 'dfe.recebido',
        payload: { nsu: doc.nsu, chave: doc.chave, tipo: doc.tipoDfe },
      });

      processados++;
    }

    if (lote.documentos.length > 0 || !this.config?.govMock) {
      await this.nsuRepo.atualizar(lote.maxNsu);
    }

    return { processados, ultimoNsu: lote.documentos.length > 0 ? lote.maxNsu : ultimoNsu };
  }
}
