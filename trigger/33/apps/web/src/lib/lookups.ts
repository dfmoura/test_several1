/** Consultas públicas BR (proxy server-side). Fontes: BrasilAPI + ViaCEP (fallback CEP). */

import { formatCnae, normalizeCnaeCodigo, toCnaeInfo, type CnaeInfo } from "@/lib/cnae";
import { formatCep, formatCnpjMask, formatDocumento } from "@/lib/parceiros";

export type CnpjLookupResult = {
  documento: string;
  documentoFormatado: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoMunicipioIbge: string | null;
  /** CNAE fiscal principal (RFB). */
  cnaePrincipal: CnaeInfo | null;
  /** CNAEs secundários (RFB). */
  cnaesSecundarios: CnaeInfo[];
  fonte: "brasilapi" | "minhareceita";
};

export type CepLookupResult = {
  cep: string;
  cepFormatado: string;
  logradouro: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoMunicipioIbge: string | null;
  fonte: "brasilapi" | "viacep";
};

export type IbgeMunicipioResult = {
  codigo: string;
  nome: string;
  uf: string;
  ufSigla: string;
};

const TIMEOUT_MS = 8000;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

async function fetchJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } finally {
    clearTimeout(timer);
  }
}

type CnaeSecundarioRaw = {
  codigo?: string | number | null;
  code?: string | number | null;
  descricao?: string | null;
  description?: string | null;
  text?: string | null;
};

type BrasilApiCnpj = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string | null;
  ddd_telefone_1?: string | null;
  descricao_tipo_de_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  uf?: string | null;
  municipio?: string | null;
  codigo_municipio?: number | string | null;
  codigo_municipio_ibge?: number | string | null;
  /** Código CNAE principal (número ou string). */
  cnae_fiscal?: string | number | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: CnaeSecundarioRaw[] | null;
};

type BrasilApiCep = {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  location?: {
    type?: string;
    coordinates?: { longitude?: string; latitude?: string };
  };
  /** BrasilAPI CEP v2 retorna código IBGE do município. */
  ibge?: string | number | null;
};

type ViaCep = {
  erro?: boolean | string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string | null;
};

function formatPhone(dddTel: string | null | undefined): string | null {
  if (!dddTel) return null;
  const d = digitsOnly(dddTel);
  if (d.length < 10) return dddTel.trim() || null;
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  return dddTel.trim();
}

function buildLogradouro(
  tipo: string | null | undefined,
  logradouro: string | null | undefined,
) {
  const street = (logradouro || "").trim();
  if (!street) return null;
  const prefix = (tipo || "").trim();
  if (!prefix) return street;
  if (street.toLowerCase().startsWith(prefix.toLowerCase())) return street;
  return `${prefix} ${street}`;
}

function parseCnaesFromReceita(d: BrasilApiCnpj): {
  cnaePrincipal: CnaeInfo | null;
  cnaesSecundarios: CnaeInfo[];
} {
  const principal = toCnaeInfo(d.cnae_fiscal, d.cnae_fiscal_descricao ?? null);

  const seen = new Set<string>();
  if (principal) seen.add(principal.codigo);

  const secundarios: CnaeInfo[] = [];
  for (const raw of d.cnaes_secundarios || []) {
    const info = toCnaeInfo(
      raw.codigo ?? raw.code,
      raw.descricao ?? raw.description ?? raw.text ?? null,
    );
    if (!info || seen.has(info.codigo)) continue;
    seen.add(info.codigo);
    secundarios.push(info);
  }

  return { cnaePrincipal: principal, cnaesSecundarios: secundarios };
}

export async function lookupCnpj(raw: string): Promise<CnpjLookupResult> {
  const cnpj = digitsOnly(raw);
  if (cnpj.length !== 14) {
    throw Object.assign(new Error("CNPJ deve ter 14 dígitos"), { status: 400 });
  }

  // BrasilAPI (preferencial) → Minha Receita (fallback; mesma forma de payload da RF).
  const sources: Array<{ url: string; fonte: CnpjLookupResult["fonte"] }> = [
    { url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, fonte: "brasilapi" },
    { url: `https://minhareceita.org/${cnpj}`, fonte: "minhareceita" },
  ];

  let lastStatus = 502;
  for (const src of sources) {
    const result = await fetchJson<BrasilApiCnpj>(src.url);
    if (!result.ok) {
      lastStatus = result.status;
      continue;
    }

    const d = result.data;
    if (!d.razao_social && !d.nome_fantasia) {
      lastStatus = 502;
      continue;
    }

    const cepDigits = d.cep ? digitsOnly(d.cep) : "";
    const { cnaePrincipal, cnaesSecundarios } = parseCnaesFromReceita(d);

    const ibgeRaw = d.codigo_municipio_ibge ?? d.codigo_municipio;
    const ibgeCode = ibgeRaw ? String(ibgeRaw).replace(/\D/g, "") : null;

    return {
      documento: cnpj,
      documentoFormatado: formatDocumento(cnpj) || formatCnpjMask(cnpj),
      razaoSocial: d.razao_social?.trim() || null,
      nomeFantasia: d.nome_fantasia?.trim() || null,
      email: d.email?.trim() || null,
      telefone: formatPhone(d.ddd_telefone_1),
      cep: cepDigits.length === 8 ? formatCep(cepDigits) : null,
      logradouro: buildLogradouro(d.descricao_tipo_de_logradouro, d.logradouro),
      numero: d.numero?.trim() || null,
      complemento: d.complemento?.trim() || null,
      bairro: d.bairro?.trim() || null,
      cidade: d.municipio?.trim() || null,
      uf: d.uf?.trim()?.toUpperCase() || null,
      codigoMunicipioIbge: ibgeCode && ibgeCode.length === 7 ? ibgeCode : null,
      cnaePrincipal,
      cnaesSecundarios,
      fonte: src.fonte,
    };
  }

  if (lastStatus === 404) {
    throw Object.assign(new Error("CNPJ não encontrado"), { status: 404 });
  }
  throw Object.assign(new Error("Falha ao consultar CNPJ nas APIs públicas"), {
    status: lastStatus >= 500 ? 502 : lastStatus,
  });
}

export async function lookupCep(raw: string): Promise<CepLookupResult> {
  const cep = digitsOnly(raw);
  if (cep.length !== 8) {
    throw Object.assign(new Error("CEP deve ter 8 dígitos"), { status: 400 });
  }

  const brasil = await fetchJson<BrasilApiCep>(
    `https://brasilapi.com.br/api/cep/v2/${cep}`,
  );
  if (brasil.ok) {
    const d = brasil.data;
    const ibge = d.ibge ? String(d.ibge).replace(/\D/g, "") : null;
    return {
      cep,
      cepFormatado: formatCep(cep),
      logradouro: d.street?.trim() || null,
      complemento: null,
      bairro: d.neighborhood?.trim() || null,
      cidade: d.city?.trim() || null,
      uf: d.state?.trim()?.toUpperCase() || null,
      codigoMunicipioIbge: ibge && ibge.length === 7 ? ibge : null,
      fonte: "brasilapi",
    };
  }

  const via = await fetchJson<ViaCep>(`https://viacep.com.br/ws/${cep}/json/`);
  if (!via.ok) {
    throw Object.assign(new Error("Falha ao consultar CEP"), { status: 502 });
  }
  if (via.data.erro === true || via.data.erro === "true") {
    throw Object.assign(new Error("CEP não encontrado"), { status: 404 });
  }

  const viaIbge = via.data.ibge ? String(via.data.ibge).replace(/\D/g, "") : null;
  return {
    cep,
    cepFormatado: formatCep(cep),
    logradouro: via.data.logradouro?.trim() || null,
    complemento: via.data.complemento?.trim() || null,
    bairro: via.data.bairro?.trim() || null,
    cidade: via.data.localidade?.trim() || null,
    uf: via.data.uf?.trim()?.toUpperCase() || null,
    codigoMunicipioIbge: viaIbge && viaIbge.length === 7 ? viaIbge : null,
    fonte: "viacep",
  };
}

type IbgeApiMunicipio = {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string; nome?: string };
    };
  };
};

export async function lookupIbgeMunicipios(
  query: string,
): Promise<IbgeMunicipioResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`;
  const result = await fetchJson<IbgeApiMunicipio[]>(url);
  if (!result.ok) return [];

  const lower = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return result.data
    .filter((m) => {
      const nome = m.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return nome.includes(lower);
    })
    .slice(0, 20)
    .map((m) => ({
      codigo: String(m.id),
      nome: m.nome,
      uf: m.microrregiao?.mesorregiao?.UF?.nome || "",
      ufSigla: m.microrregiao?.mesorregiao?.UF?.sigla || "",
    }));
}

export async function lookupIbgeMunicipioPorCidadeUf(
  cidade: string,
  uf: string,
): Promise<string | null> {
  const ufClean = uf.trim().toUpperCase();
  const cidadeClean = cidade
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!cidadeClean || !ufClean) return null;

  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufClean}/municipios`;
  const result = await fetchJson<IbgeApiMunicipio[]>(url);
  if (!result.ok) return null;

  const match = result.data.find((m) => {
    const nome = m.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return nome === cidadeClean;
  });

  return match ? String(match.id) : null;
}

export { formatCnae, normalizeCnaeCodigo };
