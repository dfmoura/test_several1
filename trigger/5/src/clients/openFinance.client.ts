import axios, { type AxiosInstance } from "axios";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { mapContractsToOffers } from "./openFinance.mapper.js";
import { getMockOffers } from "./openFinance.mock.js";
import type { OfLoansListResponse } from "./openFinance.types.js";
import type { CreditOffer } from "../schemas/creditLines.schema.js";

export interface FetchCreditLinesInput {
  consentId: string;
}

export class OpenFinanceClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      timeout: env.OF_HTTP_TIMEOUT_MS,
      validateStatus: () => true,
    });
  }

  /**
   * Obtém access_token via client credentials (cenário servidor–instituição).
   * Em fluxos reais com dados do titular, o token costuma vir do authorization code + consentimento.
   */
  private async fetchClientCredentialsToken(): Promise<string | null> {
    if (!env.OF_TOKEN_URL || !env.OF_CLIENT_ID || !env.OF_CLIENT_SECRET) {
      return null;
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.OF_CLIENT_ID,
      client_secret: env.OF_CLIENT_SECRET,
      scope: env.OF_SCOPE,
    });
    const res = await this.http.post<{ access_token?: string }>(env.OF_TOKEN_URL, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (res.status >= 400 || !res.data?.access_token) {
      return null;
    }
    return res.data.access_token;
  }

  /**
   * Consulta recursos de empréstimos usando o consentimento (header típico em integrações OF).
   * Ajuste headers conforme exigência do participante (FAPI, mTLS no transporte, etc.).
   */
  async fetchCreditLines(input: FetchCreditLinesInput): Promise<CreditOffer[]> {
    if (env.MOCK_OPEN_FINANCE) {
      return getMockOffers();
    }

    if (!env.OF_API_BASE_URL) {
      return getMockOffers();
    }

    const token = await this.fetchClientCredentialsToken();
    if (!token) {
      console.warn(
        "[openFinance] Sem access_token (configure OF_TOKEN_URL + credenciais ou use MOCK_OPEN_FINANCE=true). Usando resposta mock.",
      );
      return getMockOffers();
    }

    const url = new URL(env.OF_LOANS_RESOURCE_PATH, env.OF_API_BASE_URL).toString();
    const fapiInteractionId = randomUUID();

    const res = await this.http.get<OfLoansListResponse>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-consent-id": input.consentId,
        "x-fapi-interaction-id": fapiInteractionId,
        Accept: "application/json",
      },
    });

    if (res.status >= 400 || !res.data?.data) {
      console.warn(
        `[openFinance] Falha na API (${res.status}); usando mock. Corpo: ${JSON.stringify(res.data)?.slice(0, 200)}`,
      );
      return getMockOffers();
    }

    return mapContractsToOffers(res.data.data);
  }
}
