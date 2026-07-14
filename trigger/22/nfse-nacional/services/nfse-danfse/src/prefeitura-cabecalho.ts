import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NfseDocument } from '@nfse/xml';
import type { MunicipioResolver } from '@nfse/xml';

function isCodigoIbgeOnly(value?: string): boolean {
  const v = value?.trim();
  return Boolean(v && /^\d{7}$/.test(v));
}

export interface PrefeituraContato {
  telefone?: string;
  email?: string;
}

export interface PrefeituraCabecalho {
  nome: string;
  telefone?: string;
  email?: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTATOS_PATH = join(__dirname, '..', 'data', 'prefeitura-contatos.json');

let contatosBase: Record<string, PrefeituraContato> | null = null;

function loadContatosBase(): Record<string, PrefeituraContato> {
  if (contatosBase) return contatosBase;
  try {
    contatosBase = JSON.parse(readFileSync(CONTATOS_PATH, 'utf-8')) as Record<string, PrefeituraContato>;
  } catch {
    contatosBase = {};
  }
  return contatosBase;
}

function loadContatosEnv(): Record<string, PrefeituraContato> {
  const raw = process.env.NFSE_PREFEITURA_CONTATOS?.trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PrefeituraContato>;
  } catch {
    return {};
  }
}

function resolveContatosPorIbge(codigoIbge: string): PrefeituraContato | undefined {
  const merged = { ...loadContatosBase(), ...loadContatosEnv() };
  const contato = merged[codigoIbge];
  if (contato) return contato;

  const envMun = process.env.NFSE_C_MUN_EMISSOR?.trim();
  if (envMun && envMun === codigoIbge) {
    const telefone = process.env.NFSE_PREFEITURA_TELEFONE?.trim();
    const email = process.env.NFSE_PREFEITURA_EMAIL?.trim();
    if (telefone || email) return { telefone, email };
  }

  return undefined;
}

/** Formato compacto do cabeçalho municipal: (34)3239-3130 */
export function fmtTelefonePrefeitura(fone?: string): string {
  const d = (fone ?? '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1)$2-$3');
  return fone ?? '';
}

export function fmtNomePrefeitura(nomeMunicipio: string): string {
  const nome = nomeMunicipio.trim();
  if (!nome) return '';
  if (/^prefeitura\b/i.test(nome)) return nome;
  return `Prefeitura Municipal de ${nome}`;
}

export function resolveCodigoMunicipioEmissor(doc: NfseDocument): string | undefined {
  return (
    doc.codigoMunicipioEmissao?.trim()
    ?? doc.prestador.endereco?.codigoMunicipio?.trim()
    ?? doc.codigoMunicipioIncidencia?.trim()
    ?? undefined
  );
}

async function resolveNomeMunicipio(
  doc: NfseDocument,
  codigoIbge: string | undefined,
  resolver?: MunicipioResolver,
): Promise<string | undefined> {
  const xLoc = doc.xLocEmi?.trim();
  if (xLoc && !isCodigoIbgeOnly(xLoc)) return xLoc;

  const codigoConsulta = isCodigoIbgeOnly(xLoc) ? xLoc : codigoIbge;
  if (!codigoConsulta) return undefined;

  const prestNome = doc.prestador.endereco?.nomeMunicipio?.trim();
  if (
    prestNome
    && !isCodigoIbgeOnly(prestNome)
    && doc.prestador.endereco?.codigoMunicipio === codigoConsulta
  ) {
    return prestNome;
  }

  if (!resolver) return undefined;

  try {
    const dados = await resolver.dadosMunicipio(codigoConsulta);
    return dados?.nome?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve o bloco de identificação da prefeitura no canto superior direito do DANFSe.
 * Nome do município: dinâmico (XML xLocEmi / IBGE). Telefone e e-mail: cadastro local por IBGE.
 */
export async function resolvePrefeituraCabecalho(
  doc: NfseDocument,
  resolver?: MunicipioResolver,
): Promise<PrefeituraCabecalho | undefined> {
  const codigoIbge = resolveCodigoMunicipioEmissor(doc);
  const nomeMunicipio = await resolveNomeMunicipio(doc, codigoIbge, resolver);
  if (!nomeMunicipio) return undefined;

  const nome = fmtNomePrefeitura(nomeMunicipio);
  const contato = codigoIbge ? resolveContatosPorIbge(codigoIbge) : undefined;

  return {
    nome,
    telefone: contato?.telefone ? fmtTelefonePrefeitura(contato.telefone) : undefined,
    email: contato?.email?.trim() || undefined,
  };
}
