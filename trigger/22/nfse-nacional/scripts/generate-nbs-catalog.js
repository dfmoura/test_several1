#!/usr/bin/env node
/**
 * Regenera nbs-catalog.ts e nbs-correlacao.ts a partir dos anexos oficiais:
 * - ANEXO_B-NBS2 (documentação atual — produção)
 * - AnexoVIII v1.01.00 (correlação LC 116 × NBS)
 *
 * Uso: node scripts/generate-nbs-catalog.js [caminho-anexo-b.xlsx] [caminho-anexo-viii.xlsx]
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const domainSrc = join(__dirname, '../packages/nfse-domain/src');

const anexoB = process.argv[2] ?? '/tmp/nbs-anexo.xlsx';
const anexoViii = process.argv[3] ?? '/tmp/anexo-viii.xlsx';

function normalizeNbs(cod) {
  if (cod == null) return null;
  const s = String(cod).trim();
  if (!s.includes('.')) return null;
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  const digits = s.replace(/\./g, '').replace(/\s/g, '');
  if (!/^\d{9}$/.test(digits) || digits[0] !== '1') return null;
  return digits;
}

function formatNbs(codigo) {
  const d = normalizeNbs(codigo);
  if (!d) return codigo;
  return `${d[0]}.${d.slice(1, 5)}.${d.slice(5, 7)}.${d.slice(7, 9)}`;
}

function normalizeLc116Prefix(item) {
  if (item == null) return null;
  const parts = String(item).trim().split('.');
  if (parts.length === 2) {
    return parts[0].padStart(2, '0') + parts[1].padStart(2, '0');
  }
  const s = String(item).trim().replace(/\./g, '');
  return s.length === 4 && /^\d+$/.test(s) ? s : null;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function readSheet(path, sheetName) {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[sheetName ?? wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}

const nbsRows = readSheet(anexoB, 'LISTA.NBS_v2.0');
const catalog = [];
const seen = new Set();

for (const row of nbsRows.slice(1)) {
  const [cod, desc] = row;
  if (cod == null || desc == null) continue;
  if (!String(cod).includes('.')) continue;
  const norm = normalizeNbs(cod);
  if (!norm || seen.has(norm)) continue;
  seen.add(norm);
  catalog.push({
    codigo: norm,
    codigoFormatado: formatNbs(norm),
    descricao: String(desc).trim(),
  });
}

const corrRows = readSheet(anexoViii, 'tabela geral');
const correlationMap = {};
let currentLc = null;

for (const row of corrRows.slice(1)) {
  const [lc, , nbs, nbsDesc] = row;
  if (lc != null) currentLc = normalizeLc116Prefix(lc);
  if (nbs == null || !currentLc) continue;
  const norm = normalizeNbs(nbs);
  if (!norm) continue;
  if (!correlationMap[currentLc]) correlationMap[currentLc] = [];
  if (!correlationMap[currentLc].includes(norm)) correlationMap[currentLc].push(norm);
  if (!seen.has(norm)) {
    seen.add(norm);
    catalog.push({
      codigo: norm,
      codigoFormatado: formatNbs(norm),
      descricao: nbsDesc ? String(nbsDesc).trim() : norm,
    });
  }
}

catalog.sort((a, b) => a.codigo.localeCompare(b.codigo));

const catalogLines = [
  '// Gerado a partir do ANEXO_B-NBS2 (SNNFSe v1.01-20260122) — Portal NFS-e Nacional',
  '',
  'export const NBS_CATALOG = [',
  ...catalog.flatMap((item) => [
    '  {',
    `    "codigo": "${item.codigo}",`,
    `    "codigoFormatado": "${item.codigoFormatado}",`,
    `    "descricao": "${esc(item.descricao)}",`,
    '  },',
  ]),
  '] as const;',
  '',
];

const corrLines = [
  '// Gerado a partir do AnexoVIII v1.01.00 — correlação Item LC 116 × NBS',
  '',
  '/** Prefixo item+subitem LC 116 (4 dígitos, ex.: 1702) → códigos NBS correlacionados. */',
  'export const NBS_CORRELACAO_LC116: Record<string, readonly string[]> = {',
  ...Object.keys(correlationMap)
    .sort()
    .map((lc) => `  "${lc}": [${correlationMap[lc].map((c) => `"${c}"`).join(', ')}],`),
  '};',
  '',
];

writeFileSync(join(domainSrc, 'nbs-catalog.ts'), catalogLines.join('\n'));
writeFileSync(join(domainSrc, 'nbs-correlacao.ts'), corrLines.join('\n'));

console.log(`Gerado: ${catalog.length} NBS, ${Object.keys(correlationMap).length} correlações LC 116`);
