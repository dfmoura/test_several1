/**
 * Feature flags do SPA (build-time via Vite).
 * Relatórios IA: congelado por padrão — reabrir com VITE_RELATORIO_IA_HABILITADO=true + rebuild
 * e RELATORIO_IA_HABILITADO=true na API.
 */
export const FEATURES = {
  relatorioIa: import.meta.env.VITE_RELATORIO_IA_HABILITADO === 'true',
} as const;
