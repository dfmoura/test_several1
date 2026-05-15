/**
 * Estrutura flexível inspirada em respostas típicas de APIs de Empréstimos (Open Finance).
 * Ajuste os campos conforme a versão da especificação do participante.
 */
export interface OfMoneyAmount {
  amount?: string;
  currency?: string;
}

export interface OfInterestRate {
  taxType?: string;
  taxRate?: string;
  taxPeriodicity?: string;
}

export interface OfLoanContract {
  brandName?: string;
  companyName?: string;
  productType?: string;
  productSubTypeCategory?: string;
  contractAmount?: OfMoneyAmount;
  /** Limite disponível / valor máximo contratável, quando existir no payload */
  availableAmount?: OfMoneyAmount;
  /** Valor mínimo de operação, se informado */
  minimumAmount?: OfMoneyAmount;
  interestRates?: OfInterestRate[];
  /** Prazo em meses, se existir */
  termInMonths?: number;
  installmentPeriodicity?: string;
}

export interface OfLoansListResponse {
  data?: OfLoanContract[];
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
