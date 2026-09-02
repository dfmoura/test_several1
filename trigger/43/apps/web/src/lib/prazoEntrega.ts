import { formatDate } from './format';

export type PrazoEntregaCampos = {
  prazo_entrega_dias?: number | null;
  prazo_efetivo_dias?: number | null;
  data_entrega_prevista?: string | null;
  prazo_referencia_em?: string | null;
};

export function prazoUtilLabel(
  dias: number | null | undefined,
  dataPrevista?: string | null,
  opts?: { prazoFacaDias?: number | null; facaNova?: boolean },
): string {
  if (dias == null) return '—';
  const efetivo =
    opts?.facaNova && opts?.prazoFacaDias != null && opts.prazoFacaDias > 0
      ? `${dias} (+${opts.prazoFacaDias}d faca)`
      : String(dias);
  const base = `${efetivo} d.úteis`;
  if (!dataPrevista) return base;
  return `${base} → ${formatDate(dataPrevista)}`;
}

export function prazoEntregaCompleto(campos: PrazoEntregaCampos): string {
  const dias = campos.prazo_efetivo_dias ?? campos.prazo_entrega_dias;
  return prazoUtilLabel(dias, campos.data_entrega_prevista);
}
