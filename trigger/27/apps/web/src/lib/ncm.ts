/** Lookup NCM via BrasilAPI. */

const TIMEOUT_MS = 8000;

export type NcmLookupResult = {
  codigo: string;
  descricao: string | null;
  fonte: "brasilapi";
};

async function fetchJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

export async function lookupNcm(codigo: string): Promise<NcmLookupResult | null> {
  const digits = codigo.replace(/\D/g, "");
  if (digits.length < 4 || digits.length > 8) return null;

  const r = await fetchJson<{ codigo?: string; descricao?: string }>(
    `https://brasilapi.com.br/api/ncm/v1/${digits}`,
  );
  if (r.ok) {
    return {
      codigo: (r.data.codigo || digits).replace(/\D/g, ""),
      descricao: r.data.descricao ?? null,
      fonte: "brasilapi",
    };
  }
  return null;
}

export async function searchNcm(query: string): Promise<NcmLookupResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetchJson<Array<{ codigo?: string; descricao?: string }>>(
    `https://brasilapi.com.br/api/ncm/v1?search=${encodeURIComponent(q)}`,
  );
  if (!r.ok || !Array.isArray(r.data)) return [];
  return r.data.slice(0, 20).map((row) => ({
    codigo: String(row.codigo || "").replace(/\D/g, ""),
    descricao: row.descricao ?? null,
    fonte: "brasilapi" as const,
  }));
}
