export type StageMode = 'OPERACIONAL' | 'HOMOLOGAVEL' | 'TEORICO';

export interface EtapaDef {
  ordem: number;
  codigo: string;
  titulo: string;
  href: string;
  modo: StageMode;
  regra: string;
}

export type PapelParceiro = 'CLIENTE' | 'FORNECEDOR' | 'VENDEDOR';
export type TipoProduto = 'INSUMO' | 'ACABADO' | 'SERVICO' | 'REVENDA' | 'EMBALAGEM';
export type UnidadeProduto = 'M2' | 'ML' | 'UN' | 'KG' | 'RL';

/** Loose row type for API list responses */
export type ApiRow = Record<string, unknown>;

export interface CriterioHomologacao {
  id: string;
  codigo?: string;
  titulo: string;
  descricao?: string;
  etapa?: string;
  script?: string;
  roteiros?: string[];
  status: string;
  evidencias?: string | null;
  observacao?: string | null;
  atualizado_em?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}
