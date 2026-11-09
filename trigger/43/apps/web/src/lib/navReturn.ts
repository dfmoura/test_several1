/**
 * Voltar semântico: destino canônico + provenance opcional em location.state.
 * Sem history.back — deep link / F5 / bookmark continuam seguros.
 */

export type NavReturn = {
  returnTo: string;
  returnLabel?: string;
};

/** Prefixos internos aceitos em returnTo (path absoluto do SPA). */
const ALLOWED_PREFIXES = [
  '/pedidos',
  '/orcamentos',
  '/ordens-producao',
  '/ordens-servico',
  '/faturamentos',
  '/expedicao',
  '/compras/nfe-destinadas',
  '/compras/nfse-tomadas',
  '/compras/nfe-recebidas',
  '/compras/nfse-vinculadas',
  '/compras/ordens',
  '/estoque',
  '/parceiros',
  '/produtos',
  '/financeiro',
  '/plataforma',
  '/patrimonio',
  '/empresas',
  '/painel',
] as const;

function isAllowedPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return false;
  const bare = path.split(/[?#]/, 1)[0] ?? path;
  return ALLOWED_PREFIXES.some(
    (prefix) => bare === prefix || bare.startsWith(`${prefix}/`),
  );
}

/** Monta state para Link/navigate em fluxo cruzado. */
export function buildReturnState(returnTo: string, returnLabel?: string): NavReturn {
  return returnLabel ? { returnTo, returnLabel } : { returnTo };
}

export function parseNavReturn(state: unknown): NavReturn | null {
  if (!state || typeof state !== 'object') return null;
  const raw = state as Record<string, unknown>;
  const returnTo = raw.returnTo;
  if (typeof returnTo !== 'string' || !isAllowedPath(returnTo)) return null;
  const returnLabel =
    typeof raw.returnLabel === 'string' && raw.returnLabel.trim()
      ? raw.returnLabel.trim()
      : undefined;
  return returnLabel ? { returnTo, returnLabel } : { returnTo };
}

/** Resolve destino do Voltar: provenance válida ou fallback canônico. */
export function resolveVoltar(
  fallback: string,
  state: unknown,
  fallbackLabel = 'Voltar',
): { to: string; label: string } {
  const parsed = parseNavReturn(state);
  if (parsed) {
    return {
      to: parsed.returnTo,
      label: parsed.returnLabel ?? fallbackLabel,
    };
  }
  return { to: fallback, label: fallbackLabel };
}
