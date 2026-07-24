/** Converte snake_case → camelCase em objetos/arrays JSON. */
export function toCamel<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => toCamel(v)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        toCamel(v),
      ]),
    ) as T;
  }
  return value as T;
}

export function asDataList<T>(payload: unknown): { data: T[] } {
  const camel = toCamel(payload);
  if (Array.isArray(camel)) return { data: camel as T[] };
  if (camel && typeof camel === "object" && Array.isArray((camel as { data?: unknown }).data)) {
    return camel as { data: T[] };
  }
  return { data: [] };
}
