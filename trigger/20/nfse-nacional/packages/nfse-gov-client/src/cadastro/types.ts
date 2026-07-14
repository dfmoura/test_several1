import type { Endereco } from '@nfse/domain';

export interface AtividadeEconomicaCnpj {
  codigo: string;
  descricao: string;
}

/**
 * Dados do cartão CNPJ (Receita Federal).
 * Inscrição municipal é intencionalmente excluída — cadastro municipal, informada manualmente.
 */
export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral: string;
  email?: string;
  telefone?: string;
  endereco: Endereco;
  /** Campos complementares (Receita WS). */
  porte?: string;
  naturezaJuridica?: string;
  dataAbertura?: string;
  tipoEstabelecimento?: string;
  optanteSimples?: boolean;
  atividadePrincipal?: AtividadeEconomicaCnpj;
  /** Fontes utilizadas na consulta (ex.: brasilapi, receitaws). */
  fontes?: string[];
}

/** Nome e UF a partir do código IBGE (API pública). */
export interface DadosMunicipioIbge {
  nome: string;
  uf: string;
}

export interface ICadastroConsultaGateway {
  consultarCnpj(cnpj: string): Promise<DadosCnpj | null>;
  nomeMunicipio(codigoIbge: string): Promise<string | null>;
  dadosMunicipio(codigoIbge: string): Promise<DadosMunicipioIbge | null>;
}
