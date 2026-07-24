import type { CnpjLookupResult } from "./billing.port.js";

const MOCK_CNPJ: CnpjLookupResult = {
  cnpj: "00000000000191",
  legalName: "EMPRESA MOCK LTDA",
  tradeName: "MOCK",
  email: "contato@mock.local",
  phone: "11999999999",
  address: {
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  source: "mock",
};

export async function lookupCnpj(cnpj: string, provider: string): Promise<CnpjLookupResult> {
  const digits = cnpj.replace(/\D/g, "");
  if (provider !== "brasilapi") {
    return { ...MOCK_CNPJ, cnpj: digits, source: "mock" };
  }
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`BrasilAPI ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return {
      cnpj: digits,
      legalName: String(data.razao_social ?? data.nome ?? ""),
      tradeName: data.nome_fantasia ? String(data.nome_fantasia) : undefined,
      email: data.email ? String(data.email) : undefined,
      phone: data.ddd_telefone_1 ? String(data.ddd_telefone_1) : undefined,
      address: {
        zipCode: data.cep ? String(data.cep).replace(/\D/g, "") : undefined,
        street: data.logradouro ? String(data.logradouro) : undefined,
        number: data.numero ? String(data.numero) : undefined,
        complement: data.complemento ? String(data.complemento) : undefined,
        district: data.bairro ? String(data.bairro) : undefined,
        city: data.municipio ? String(data.municipio) : undefined,
        state: data.uf ? String(data.uf) : undefined,
      },
      source: "brasilapi",
    };
  } catch {
    return { ...MOCK_CNPJ, cnpj: digits, source: "mock" };
  }
}
