/** Tipos do motor de cálculo — espelham a planilha oficial. */

export type CoresValue = 0 | 1 | 2 | 3 | 4 | "4V" | 5 | 6 | 7 | 8;

export interface PricingParams {
  /** R$ por caixa — planilha usa constante 7 */
  precoCaixa: number;
  /** R$/cm² matriz — default 0.28 */
  valorCm2Matriz: number;
  /** Minutos por troca de bobina após 1000 m — default 5 */
  minutosTrocaBobina: number;
  /** Limite metragem linear para zerar troca bobina — default 1000 */
  tetoMetragemTrocaBobina: number;
  /** CEILING do valor etiqueta — default 10 */
  arredondamentoEtiqueta: number;
  /** CEILING do valor matriz — default 1 */
  arredondamentoMatriz: number;
  /** Preço rebobinação (ACABAMENTOS!B6) — default 17 */
  precoRebobinacao: number;
  /** Limite m² tinta preço fixo — default 30 */
  tintaLimiteM2: number;
  /** R$ por cor abaixo do limite — default 10 */
  tintaPrecoAbaixo: number;
  /** R$/m² acima do limite — default 0.4 */
  tintaPrecoM2Acima: number;
  /** Fator perda cores=4: (largura+1)/100 * fator — default 180 */
  perdaCores4Fator: number;
}

export const DEFAULT_PARAMS: PricingParams = {
  precoCaixa: 7,
  valorCm2Matriz: 0.28,
  minutosTrocaBobina: 5,
  tetoMetragemTrocaBobina: 1000,
  arredondamentoEtiqueta: 10,
  arredondamentoMatriz: 1,
  precoRebobinacao: 17,
  tintaLimiteM2: 30,
  tintaPrecoAbaixo: 10,
  tintaPrecoM2Acima: 0.4,
  perdaCores4Fator: 180,
};

export interface CatalogLookups {
  /** nome papel → R$/m² */
  precoPapelM2: Record<string, number>;
  /** nome acabamento → R$/m² */
  precoAcabamentoM2: Record<string, number>;
  /** nome acabamento → perda m² */
  perdaAcabamentoM2: Record<string, number>;
  /** tamanho tubete → preço unitário */
  precoTubete: Record<string, number>;
  /** tipo parada → tempo em horas */
  tempoParadaH: Record<string, number>;
  /** cores 0–3 → perda fixa m² */
  perdaPapelFixoM2: Record<string, number>;
  /**
   * grupo máquina → cores → R$/hora
   * grupos: "BETA / 160  / 250 / ETIRAMA" | "BATIDA" | "MODULAR"
   */
  tarifaHora: Record<string, Record<string, number>>;
  /**
   * chave = tubete + qtdeRolos (ex.: `3"10`) → qtde caixas
   * Fidelity com VLOOKUP da planilha.
   */
  caixasPorTubeteRolos: Record<string, number>;
}

export interface QuoteFaixaInput {
  quantidade: number;
  tipoParada: string;
  /** Comissão desta faixa; se omitida, usa `comissaoPct` do cabeçalho */
  comissaoPct?: number;
}

export interface QuoteOverrides {
  /** R$/m² papel — só deste orçamento */
  papelM2?: number | null;
  /** R$/m² tinta acima do limite — só deste orçamento */
  tintaAcimaM2?: number | null;
}

export interface QuoteInput {
  larguraPapel: number;
  puxada: number;
  cores: CoresValue;
  papel: string;
  acabamento: string;
  qtdeModelos: number;
  qtdeColunas: number;
  etiqPorRolo: number;
  tubete: string;
  z: number | null;
  maquinaGrupo: string;
  impostoPct: number;
  matriz: boolean;
  /** Se true, zera cobrança de matriz neste pedido (já cobrada antes) */
  matrizJaCobrada?: boolean;
  colunaRebobinacao: number;
  rpm: number;
  comissaoPct: number;
  overrides?: QuoteOverrides | null;
  faixas: QuoteFaixaInput[];
}

export interface FaixaProduction {
  quantidade: number;
  tipoParada: string;
  horaMaquina: number;
  horaTrocaProduto: number;
  horaTrocaBobina: number;
  metragemLinear: number;
  metragemM2: number;
  perdaAcerto: number;
  perdaAcabamento: number;
  /** Exposição UI (= perda acerto × modelos) — estilo planilha 29 */
  perdaPapelTrocaProduto: number;
  perdaTrocaBobinaM2: number;
  qtdeRolos: number;
  qtdeCaixas: number;
  /** Capacidade MEDIDA_CAIXAS usada no fallback / referência */
  rolosPorCaixa: number;
}

export interface FaixaCosts {
  valorPapel: number;
  valorMaquina: number;
  valorTrocaProduto: number;
  valorTrocaBobina: number;
  /** Custo referencial da perda troca produto (não soma no valorServico — golden XLSM legado) */
  valorPapelTrocaProduto: number;
  tinta: number;
  acabamento: number;
  rebobinacao: number;
  tubete: number;
  valorCaixa: number;
  valorServico: number;
}

export interface FaixaCommercial {
  comissaoPct: number;
  comissao: number;
  imposto: number;
  servicoEncargos: number;
  valorEtiqueta: number;
  valorMatriz: number;
  valorTotal: number;
}

export interface FaixaResult {
  production: FaixaProduction;
  costs: FaixaCosts;
  commercial: FaixaCommercial;
}

export interface QuoteResult {
  valorMatrizBruto: number;
  /** Matriz apresentada (CEILING) após regras SIM / já cobrada */
  valorMatriz: number;
  matrizCobrada: boolean;
  faixas: FaixaResult[];
  alerts: string[];
}
