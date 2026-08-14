import { formatCurrency, formatDecimalBr, formatKmCarro } from './format';

export const MODO_RETIRAR = 'RETIRAR';
export const MODO_ENTREGAR = 'ENTREGAR';

export type ModoEntrega = typeof MODO_RETIRAR | typeof MODO_ENTREGAR;

const MOTIVO_LABEL: Record<string, string> = {
  retirar: 'Retirada no local — frete R$ 0',
  sem_km: 'Sem km da empresa até o destino. Use Posição e distância no cadastro do parceiro.',
  sem_peso: 'Cadastre o peso estimado por caixa na aba Frete do Catálogo ORC.',
  sem_faixa: 'Nenhuma faixa de peso ativa no catálogo (ou carga acima da última faixa).',
  sob_consulta: 'Faixa sem R$/km — frete sob consulta (não inventa valor).',
};

export function modoEntregaLabel(modo: string | null | undefined): string {
  return String(modo).toUpperCase() === MODO_ENTREGAR ? 'Entregar' : 'Retirar no local';
}

export function freteMotivoLabel(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return MOTIVO_LABEL[motivo] ?? motivo;
}

export function formatValorFrete(value: string | number | null | undefined, somavel?: boolean): string {
  if (value == null || value === '') return '—';
  if (somavel === false && Number(value) === 0) return 'R$ 0,00';
  return formatCurrency(value);
}

export function formatKgFaixa(kgAte: string | number | null | undefined, acima?: boolean): string {
  if (acima || kgAte == null || kgAte === '') return 'Acima';
  return `Até ${formatDecimalBr(kgAte, 0)} kg`;
}

export function kmContextoParceiro(
  km: string | number | null | undefined,
  fonte?: string | null,
): string {
  return formatKmCarro(km, fonte) || '—';
}
