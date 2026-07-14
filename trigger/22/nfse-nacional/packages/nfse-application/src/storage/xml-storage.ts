import * as Minio from 'minio';
import type { AppConfig } from '@nfse/shared';

export class XmlStorage {
  private client: Minio.Client;
  private bucket: string;

  constructor(config: Pick<AppConfig, 'minioEndpoint' | 'minioPort' | 'minioAccessKey' | 'minioSecretKey' | 'minioBucket' | 'minioUseSsl'>) {
    this.client = new Minio.Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      useSSL: config.minioUseSsl,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });
    this.bucket = config.minioBucket;
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async putXml(key: string, xml: string): Promise<string> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, Buffer.from(xml, 'utf-8'), undefined, {
      'Content-Type': 'application/xml',
    });
    return key;
  }

  async getXml(key: string): Promise<string> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  async putPdf(key: string, pdf: Buffer): Promise<string> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, pdf, undefined, {
      'Content-Type': 'application/pdf',
    });
    return key;
  }

  async getPdf(key: string): Promise<Buffer | null> {
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  buildNfseKey(chave: string, tipo: 'dps' | 'nfse' | 'evento' | 'danfse', suffix?: string): string {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    if (tipo === 'danfse') return `danfse/v7/${chave}.pdf`;
    if (tipo === 'evento') return `${ano}/${mes}/${chave}/eventos/${suffix}.xml`;
    return `${ano}/${mes}/${chave}/${tipo}.xml`;
  }
}
