import Fastify from 'fastify';
import { loadConfig, createLogger } from '@nfse/shared';
import {
  createDb,
  NfseService,
  XmlStorage,
  IdempotencyStore,
  AuditLogger,
  createCertificadoProvider,
  DfeRecebidasService,
  resolveEmitente,
} from '@nfse/application';
import { createSefinGateway, createCadastroGateway } from '@nfse/gov-client';
import { parseNfseXml, enrichNfseDocumentLocalidades } from '@nfse/xml';
import { renderDanfseV2 } from './danfse-v2-renderer.js';

async function generateDanfsePdf(
  chave: string,
  nfseService: NfseService,
  storage: XmlStorage,
  cadastro: ReturnType<typeof createCadastroGateway>,
): Promise<Buffer> {
  const cachedKey = storage.buildNfseKey(chave, 'danfse');
  try {
    const cached = await storage.getPdf(cachedKey);
    if (cached) return cached;
  } catch {
    // sem cache
  }

  const nfse = await nfseService.consultar(chave);
  const xml = nfse.xml ?? await nfseService.getXml(chave);
  const parsed = parseNfseXml(xml, chave);
  const enriched = await enrichNfseDocumentLocalidades(parsed, cadastro);
  const pdf = await renderDanfseV2(enriched, nfse.situacao, { cadastro });

  try {
    await storage.putPdf(cachedKey, pdf);
  } catch {
    // cache opcional
  }

  return pdf;
}

async function generateDanfseRecebidaPdf(
  chave: string,
  dfeRecebidasService: DfeRecebidasService,
  storage: XmlStorage,
  cadastro: ReturnType<typeof createCadastroGateway>,
): Promise<Buffer> {
  const cachedKey = storage.buildNfseKey(chave, 'danfse');
  try {
    const cached = await storage.getPdf(cachedKey);
    if (cached) return cached;
  } catch {
    // sem cache
  }

  const recebida = await dfeRecebidasService.consultar(chave);
  const xml = await dfeRecebidasService.getXml(chave);
  const parsed = parseNfseXml(xml, chave);
  const enriched = await enrichNfseDocumentLocalidades(parsed, cadastro);
  const pdf = await renderDanfseV2(enriched, recebida.situacao, { cadastro });

  try {
    await storage.putPdf(cachedKey, pdf);
  } catch {
    // cache opcional
  }

  return pdf;
}

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfse-danfse', config.logLevel);
  const db = createDb(config.databaseUrl);
  const certificado = createCertificadoProvider(config);
  const cadastro = createCadastroGateway(config.cadastroCacheTtlSec);
  const sefin = createSefinGateway(config.ambiente, config.govMock, certificado.getHttpsAgent());
  const storage = new XmlStorage(config);
  const nfseService = new NfseService(db, sefin, storage, new IdempotencyStore(db), new AuditLogger(db), config, certificado);
  const dfeRecebidasService = new DfeRecebidasService(
    db,
    storage,
    config,
    () => resolveEmitente(config, certificado.validade()).cnpj,
  );

  const app = Fastify({ logger: false });

  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/generate/:chave', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const pdf = await generateDanfsePdf(chave, nfseService, storage, cadastro);
    return reply.type('application/pdf').send(pdf);
  });

  app.get('/generate-recebida/:chave', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const pdf = await generateDanfseRecebidaPdf(chave, dfeRecebidasService, storage, cadastro);
    return reply.type('application/pdf').send(pdf);
  });

  app.post('/preview', async (request, reply) => {
    const body = request.body as { xml?: string; situacao?: string };
    if (!body?.xml?.trim()) {
      return reply.status(400).send({ detail: 'Campo xml é obrigatório' });
    }
    const parsed = parseNfseXml(body.xml);
    const enriched = await enrichNfseDocumentLocalidades(parsed, cadastro);
    const pdf = await renderDanfseV2(enriched, body.situacao, { cadastro });
    return reply.type('application/pdf').send(pdf);
  });

  const port = 3001;
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'nfse-danfse started');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
