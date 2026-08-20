/** Trilhos de saída — ADR_OPERACOES_SAIDA. Não misturar com EMP/stage. */

export const TIPO_INDUSTRIALIZACAO = 'INDUSTRIALIZACAO';
export const TIPO_SERVICO = 'SERVICO';
export const TIPO_CESSAO_BEM = 'CESSAO_BEM';

export type TipoOperacaoSaida =
  | typeof TIPO_INDUSTRIALIZACAO
  | typeof TIPO_SERVICO
  | typeof TIPO_CESSAO_BEM;

export type TipoServicoSaida = 'REBOBINACAO' | 'ACERTO' | 'AVULSO' | 'MANUTENCAO';

export function tipoOperacaoFromSnap(snap: Record<string, unknown> | null | undefined): TipoOperacaoSaida {
  const raw = String(snap?.tipo_operacao ?? snap?.necessidade ?? '').toUpperCase();
  if (raw === TIPO_SERVICO || raw.includes('SERV')) return TIPO_SERVICO;
  if (raw === TIPO_CESSAO_BEM) return TIPO_CESSAO_BEM;
  return TIPO_INDUSTRIALIZACAO;
}

export function tipoOperacaoLabel(tipo: string | null | undefined): string {
  const t = String(tipo || '').toUpperCase();
  if (t === TIPO_SERVICO) return 'Serviço';
  if (t === TIPO_CESSAO_BEM) return 'Cessão';
  return 'Etiquetas';
}

export function tipoServicoLabel(tipo: string | null | undefined): string {
  const labels: Record<string, string> = {
    REBOBINACAO: 'Rebobinação',
    ACERTO: 'Acerto / corte',
    AVULSO: 'Serviço avulso',
    MANUTENCAO: 'Manutenção de equipamento',
  };
  const t = String(tipo || '').toUpperCase();
  return labels[t] ?? t;
}
