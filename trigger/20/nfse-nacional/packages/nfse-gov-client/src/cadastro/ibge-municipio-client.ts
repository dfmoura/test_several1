import type { DadosMunicipioIbge } from './types.js';

interface IbgeMunicipioResponse {
  id?: number;
  nome?: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string };
    };
  };
  'regiao-imediata'?: {
    'regiao-intermediaria'?: {
      UF?: { sigla?: string };
    };
  };
}

const DEFAULT_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

/**
 * Resolve código IBGE → nome e UF do município (API pública IBGE).
 */
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'NFSE-Nacional/1.0 (+https://github.com/nfse-nacional)',
};

function extractUf(data: IbgeMunicipioResponse): string {
  return (
    data['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla?.trim() ||
    data.microrregiao?.mesorregiao?.UF?.sigla?.trim() ||
    ''
  ).toUpperCase();
}

interface IbgeMunicipioListItem {
  id?: number;
  nome?: string;
}

export class IbgeMunicipioClient {
  private readonly municipiosPorUfCache = new Map<string, IbgeMunicipioListItem[]>();

  constructor(private readonly baseUrl = DEFAULT_BASE) {}

  /** Resolve código IBGE a partir do nome do município e UF (fallback quando só Receita WS retorna endereço). */
  async buscarCodigoPorNomeUf(nomeMunicipio: string, uf: string): Promise<string | null> {
    const ufSigla = uf.trim().toUpperCase();
    if (ufSigla.length !== 2) return null;

    const municipios = await this.listarMunicipiosUf(ufSigla);
    const alvo = normalizeNomeMunicipio(nomeMunicipio);
    if (!alvo) return null;

    const match = municipios.find((m) => normalizeNomeMunicipio(m.nome ?? '') === alvo);
    if (!match?.id) return null;

    return String(match.id).padStart(7, '0');
  }

  private async listarMunicipiosUf(uf: string): Promise<IbgeMunicipioListItem[]> {
    const cached = this.municipiosPorUfCache.get(uf);
    if (cached) return cached;

    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      {
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new Error(`IBGE municípios UF ${uf} HTTP ${response.status}`);
    }

    const data = (await response.json()) as IbgeMunicipioListItem[];
    this.municipiosPorUfCache.set(uf, data);
    return data;
  }

  async dadosMunicipio(codigoIbge: string): Promise<DadosMunicipioIbge | null> {
    const code = codigoIbge.replace(/\D/g, '');
    if (code.length !== 7) return null;

    const response = await fetch(`${this.baseUrl}/${code}`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`IBGE município HTTP ${response.status}`);
    }

    const data = (await response.json()) as IbgeMunicipioResponse;
    const nome = data.nome?.trim();
    if (!nome) return null;

    return { nome, uf: extractUf(data) };
  }

  async nomeMunicipio(codigoIbge: string): Promise<string | null> {
    const dados = await this.dadosMunicipio(codigoIbge);
    return dados?.nome ?? null;
  }
}

function normalizeNomeMunicipio(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
