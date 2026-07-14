import type { DadosCnpj } from './types.js';

interface BrasilApiCnpjResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number;
  email?: string | null;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  codigo_municipio_ibge?: number;
  codigo_municipio?: number;
}

const DEFAULT_BASE = 'https://brasilapi.com.br/api/cnpj/v1';
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'NFSE-Nacional/1.0 (+https://github.com/nfse-nacional)',
};

/**
 * Consulta CNPJ via Brasil API — dados abertos do Cadastro Nacional (Receita Federal).
 * Inscrição municipal não está disponível nesta fonte (cadastro manual no sistema).
 * @see https://brasilapi.com.br/docs#tag/CNPJ
 */
export class BrasilApiCnpjClient {
  constructor(private readonly baseUrl = DEFAULT_BASE) {}

  async consultar(cnpj: string): Promise<DadosCnpj | null> {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return null;

    const response = await fetch(`${this.baseUrl}/${digits}`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Brasil API CNPJ HTTP ${response.status}`);
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    return mapBrasilApiCnpj(data, digits);
  }
}

function mapBrasilApiCnpj(data: BrasilApiCnpjResponse, cnpj: string): DadosCnpj | null {
  if (!data.razao_social) return null;

  const codigoMunicipio = String(data.codigo_municipio_ibge ?? data.codigo_municipio ?? '').padStart(7, '0');
  const telefone = formatTelefone(data.ddd_telefone_1 ?? data.ddd_telefone_2);

  return {
    cnpj,
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia || undefined,
    situacaoCadastral: data.descricao_situacao_cadastral ?? String(data.situacao_cadastral ?? ''),
    email: data.email?.trim() || undefined,
    telefone,
    endereco: {
      logradouro: data.logradouro?.trim() || 'NÃO INFORMADO',
      numero: data.numero?.trim() || 'S/N',
      complemento: data.complemento?.trim() || undefined,
      bairro: data.bairro?.trim() || 'NÃO INFORMADO',
      codigoMunicipio: codigoMunicipio.length === 7 ? codigoMunicipio : '0000000',
      uf: (data.uf ?? '').toUpperCase(),
      cep: (data.cep ?? '').replace(/\D/g, ''),
      nomeMunicipio: data.municipio?.trim() || undefined,
    },
    fontes: ['brasilapi'],
  };
}

function formatTelefone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits || undefined;
}
