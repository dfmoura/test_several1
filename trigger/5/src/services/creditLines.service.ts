import { OpenFinanceClient } from "../clients/openFinance.client.js";
import type { CreditLinesRequest, CreditOffer } from "../schemas/creditLines.schema.js";

const client = new OpenFinanceClient();

/**
 * Consulta linhas de crédito disponíveis via API de Empréstimos (Open Finance).
 * O CPF é validado na entrada para conformidade com o contrato da API; não é persistido.
 */
export async function queryCreditLines(input: CreditLinesRequest): Promise<{ offers: CreditOffer[] }> {
  const offers = await client.fetchCreditLines({
    consentId: input.consentId,
  });
  return { offers };
}
