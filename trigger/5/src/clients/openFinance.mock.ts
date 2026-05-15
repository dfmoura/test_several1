import type { CreditOffer } from "../schemas/creditLines.schema.js";

/** Dados fictícios apenas para desenvolvimento — não representam ofertas reais. */
export function getMockOffers(): CreditOffer[] {
  return [
    {
      institution: "Banco Exemplo S.A. (mock)",
      type: "CREDITO_PESSOAL_SEM_CONSIGNACAO",
      interestRate: 1.89,
      maxAmount: 80_000,
      minAmount: 500,
      term: 48,
    },
    {
      institution: "Financeira Demo (mock)",
      type: "CREDITO_PESSOAL_COM_CONSIGNACAO",
      interestRate: 1.25,
      maxAmount: 120_000,
      minAmount: 200,
      term: 84,
    },
  ];
}
