import type { DadosCnpj } from './types.js';

interface ReceitaWsAtividade {
  code?: string;
  text?: string;
}

interface ReceitaWsSimples {
  optante?: boolean;
}

interface ReceitaWsCnpjResponse {
  status?: string;
  message?: string;
  cnpj?: string;
  nome?: string;
  fantasia?: string;
  situacao?: string;
  tipo?: string;
  porte?: string;
  natureza_juridica?: string;
  abertura?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  atividade_principal?: ReceitaWsAtividade[];
  simples?: ReceitaWsSimples;
}

const DEFAULT_BASE = 'https://www.receitaws.com.br/v1/cnpj';
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'NFSE-Nacional/1.0 (+https://github.com/nfse-nacional)',
};

/**
 * Consulta CNPJ via Receita WS — dados públicos da Receita Federal.
 * Complementa a Brasil API com campos adicionais (porte, natureza jurídica, Simples, etc.).
 * Inscrição municipal não está disponível nesta fonte (cadastro manual no sistema).
 * @see https://receitaws.com.br/
 */
export class ReceitaWsCnpjClient {
  constructor(private readonly baseUrl = DEFAULT_BASE) {}

  async consultar(cnpj: string): Promise<DadosCnpj | null> {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return null;

    const response = await fetch(`${this.baseUrl}/${digits}`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Receita WS CNPJ HTTP ${response.status}`);
    }

    const data = (await response.json()) as ReceitaWsCnpjResponse;
    if (data.status && data.status !== 'OK') return null;

    return mapReceitaWsCnpj(data, digits);
  }
}

function mapReceitaWsCnpj(data: ReceitaWsCnpjResponse, cnpj: string): DadosCnpj | null {
  if (!data.nome?.trim()) return null;

  const atividade = data.atividade_principal?.[0];
  const telefone = formatTelefone(data.telefone);
  const nomeMunicipio = formatMunicipioNome(data.municipio);

  return {
    cnpj,
    razaoSocial: data.nome.trim(),
    nomeFantasia: data.fantasia?.trim() || undefined,
    situacaoCadastral: data.situacao?.trim() || '',
    email: data.email?.trim() || undefined,
    telefone,
    endereco: {
      logradouro: data.logradouro?.trim() || 'NÃO INFORMADO',
      numero: data.numero?.trim() || 'S/N',
      complemento: data.complemento?.trim() || undefined,
      bairro: data.bairro?.trim() || 'NÃO INFORMADO',
      codigoMunicipio: '0000000',
      uf: (data.uf ?? '').toUpperCase(),
      cep: (data.cep ?? '').replace(/\D/g, ''),
      nomeMunicipio,
    },
    porte: data.porte?.trim() || undefined,
    naturezaJuridica: data.natureza_juridica?.trim() || undefined,
    dataAbertura: data.abertura?.trim() || undefined,
    tipoEstabelecimento: data.tipo?.trim() || undefined,
    optanteSimples: data.simples?.optante,
    atividadePrincipal: atividade?.code
      ? { codigo: atividade.code.trim(), descricao: atividade.text?.trim() ?? '' }
      : undefined,
    fontes: ['receitaws'],
  };
}

function formatTelefone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits || undefined;
}

function formatMunicipioNome(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  return raw
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
