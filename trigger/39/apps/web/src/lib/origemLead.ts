/**
 * Origem do lead — catálogo fechado (ORCAMENTO_PROSPECT §3.2 / §7).
 * Combo nativo; valores estáveis para relatório de conversão por origem.
 */

export const ORIGENS_LEAD = [
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Indicação', label: 'Indicação' },
  { value: 'Site', label: 'Site' },
  { value: 'Telefone', label: 'Telefone' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Google', label: 'Google' },
  { value: 'E-mail', label: 'E-mail' },
  { value: 'Visita', label: 'Visita' },
  { value: 'Feira / evento', label: 'Feira / evento' },
  { value: 'Outro', label: 'Outro' },
] as const;

export type OrigemLeadCanonico = (typeof ORIGENS_LEAD)[number]['value'];

const ORIGEM_SET = new Set<string>(ORIGENS_LEAD.map((o) => o.value));

export function isOrigemLeadCanonico(value: string | null | undefined): boolean {
  if (!value) return false;
  return ORIGEM_SET.has(value.trim());
}

export function origemLeadLabel(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const hit = ORIGENS_LEAD.find((o) => o.value === value.trim());
  return hit?.label ?? value;
}
