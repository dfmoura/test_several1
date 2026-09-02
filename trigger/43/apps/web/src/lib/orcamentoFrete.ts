import { formatCurrency } from './format';

export const MODO_RETIRAR = 'RETIRAR';
export const MODO_ENTREGA_PROPRIA = 'ENTREGA_PROPRIA';
export const MODO_ENTREGA_TERCEIROS = 'ENTREGA_TERCEIROS';
/** @deprecated Legado em snapshots — normalizado para ENTREGA_PROPRIA. */
export const MODO_ENTREGAR = 'ENTREGAR';

export type ModoEntrega =
  | typeof MODO_RETIRAR
  | typeof MODO_ENTREGA_PROPRIA
  | typeof MODO_ENTREGA_TERCEIROS;

export const MODOS_COM_FRETE: readonly string[] = [
  MODO_ENTREGA_PROPRIA,
  MODO_ENTREGA_TERCEIROS,
  MODO_ENTREGAR,
];

const MOTIVO_LABEL: Record<string, string> = {
  retirar: 'Retirada no local — frete R$ 0',
  a_definir: 'Frete a definir após a produção.',
  manual: 'Valor informado nesta proposta — fora do total; não entra no unitário.',
  // Legado (ORCs anteriores).
  sem_km: 'Sem km da empresa até o destino.',
  sem_peso: 'Peso estimado não cadastrado (legado).',
  sem_faixa: 'Faixa de frete do catálogo (legado).',
  sob_consulta: 'Frete sob consulta (legado).',
  sem_valor: 'Frete a definir.',
};

export function normalizarModoEntrega(modo: string | null | undefined): ModoEntrega {
  const s = String(modo ?? '').toUpperCase();
  if (s === MODO_ENTREGA_TERCEIROS) return MODO_ENTREGA_TERCEIROS;
  if (s === MODO_ENTREGA_PROPRIA || s === MODO_ENTREGAR) return MODO_ENTREGA_PROPRIA;
  return MODO_RETIRAR;
}

export function modoComFrete(modo: string | null | undefined): boolean {
  return MODOS_COM_FRETE.includes(String(modo ?? '').toUpperCase());
}

export function modoEntregaLabel(modo: string | null | undefined): string {
  const m = String(modo ?? '').toUpperCase();
  if (m === MODO_ENTREGA_TERCEIROS) return 'Entrega terceiros';
  if (m === MODO_ENTREGA_PROPRIA) return 'Entrega própria';
  if (m === MODO_ENTREGAR) return 'Entrega própria';
  return 'Retirar no local';
}

export function freteMotivoLabel(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return MOTIVO_LABEL[motivo] ?? motivo;
}

/**
 * Exibe frete comercial. Null em modo com frete → "A definir".
 */
export function formatValorFrete(
  value: string | number | null | undefined,
  opts?: { aDefinir?: boolean; somavel?: boolean },
): string {
  if (value == null || value === '') {
    return opts?.aDefinir ? 'A definir' : '—';
  }
  if (opts?.somavel === false && Number(value) === 0) return 'R$ 0,00';
  return formatCurrency(value);
}

type FaixaTotalProposta = {
  valor_total?: string | number | null;
  valor_total_com_faca?: string | number | null;
  valor_total_proposta?: string | number | null;
  valor_frete?: string | number | null;
  frete_somavel?: boolean;
};

/**
 * Total comercial da faixa: motor (+ faca nova). Frete nunca soma.
 */
export function totalPropostaFaixa(
  fx: FaixaTotalProposta,
  facaNova?: boolean,
  valorFacaNova?: string | number | null,
): number {
  if (fx.valor_total_proposta != null && fx.valor_total_proposta !== '') {
    const gravado = Number(fx.valor_total_proposta);
    if (Number.isFinite(gravado)) return gravado;
  }
  const motor = Number(fx.valor_total) || 0;
  const comFaca =
    fx.valor_total_com_faca != null && fx.valor_total_com_faca !== ''
      ? Number(fx.valor_total_com_faca) || 0
      : motor + (Number(valorFacaNova) || 0);
  return facaNova ? comFaca : motor;
}

export function hintFreteModo(modo: ModoEntrega): string {
  if (modo === MODO_RETIRAR) {
    return 'Retirar não cobra frete.';
  }
  return 'Valor opcional. Se em branco, fica a definir — costuma fechar após a produção. Não entra no total da proposta, no unitário nem em PED/FAT.';
}
