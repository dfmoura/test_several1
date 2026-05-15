import type { CreditOffer } from "../schemas/creditLines.schema.js";
import type { OfLoanContract } from "./openFinance.types.js";

function parseMoney(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function pickNominalRate(rates: OfLoanContract["interestRates"]): number {
  if (!rates?.length) return 0;
  const nominal = rates.find((r) => r.taxType?.toUpperCase().includes("NOMINAL"));
  const rate = nominal ?? rates[0];
  return parseMoney(rate?.taxRate);
}

/**
 * Mapeia contratos/linhas retornados pela API institucional para o formato simplificado da API.
 */
export function mapContractsToOffers(contracts: OfLoanContract[]): CreditOffer[] {
  return contracts.map((c) => {
    const institution = c.brandName ?? c.companyName ?? "Instituição";
    const type = c.productSubTypeCategory ?? c.productType ?? "EMPRESTIMO";
    const maxAmount = parseMoney(c.availableAmount?.amount ?? c.contractAmount?.amount);
    const minAmount = parseMoney(c.minimumAmount?.amount) || Math.min(maxAmount, 100) || 0;
    const interestRate = pickNominalRate(c.interestRates);
    const term = typeof c.termInMonths === "number" ? c.termInMonths : 12;

    return {
      institution,
      type,
      interestRate,
      maxAmount,
      minAmount,
      term,
    };
  });
}
