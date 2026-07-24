import type { CepLookupResult } from "./billing.port.js";

const MOCK_CEP: Omit<CepLookupResult, "zipCode"> = {
  street: "Rua Mock",
  district: "Centro",
  city: "São Paulo",
  state: "SP",
  ibgeCode: "3550308",
  source: "mock",
};

export async function lookupCep(cep: string, provider: string): Promise<CepLookupResult> {
  const digits = cep.replace(/\D/g, "");
  if (provider !== "viacep") {
    return { ...MOCK_CEP, zipCode: digits, source: "mock" };
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`ViaCEP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    if (data.erro) throw new Error("CEP não encontrado");
    return {
      zipCode: digits,
      street: data.logradouro ? String(data.logradouro) : undefined,
      complement: data.complemento ? String(data.complemento) : undefined,
      district: data.bairro ? String(data.bairro) : undefined,
      city: data.localidade ? String(data.localidade) : undefined,
      state: data.uf ? String(data.uf) : undefined,
      ibgeCode: data.ibge ? String(data.ibge) : undefined,
      source: "viacep",
    };
  } catch {
    return { ...MOCK_CEP, zipCode: digits, source: "mock" };
  }
}
