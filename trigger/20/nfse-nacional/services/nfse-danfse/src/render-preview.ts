import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCadastroGateway } from '@nfse/gov-client';
import { parseNfseXml, enrichNfseDocumentLocalidades } from '@nfse/xml';
import { renderDanfseV2 } from './danfse-v2-renderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultXml = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

const xmlPath = resolve(process.argv[2] ?? defaultXml);
const outPath = resolve(process.argv[3] ?? join(process.cwd(), 'danfse-preview.pdf'));

const cadastro = createCadastroGateway();
const xml = readFileSync(xmlPath, 'utf-8');
const parsed = parseNfseXml(xml);
const enriched = await enrichNfseDocumentLocalidades(parsed, cadastro);
const pdf = await renderDanfseV2(enriched);

writeFileSync(outPath, pdf);
console.log(`DANFSe gerado: ${outPath} (${pdf.length} bytes)`);
console.log(`Chave: ${enriched.chaveAcesso}`);
console.log(`Emitente: ${enriched.prestador.razaoSocial}`);
console.log(
  `Tomador município: ${enriched.tomador.endereco?.nomeMunicipio ?? '—'} - ${enriched.tomador.endereco?.uf ?? '—'}`,
);
