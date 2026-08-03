import type { StageMode } from '../types';

const MODE_LABEL: Record<StageMode, string> = {
  OPERACIONAL: 'Operacional',
  HOMOLOGAVEL: 'Homologável',
  TEORICO: 'Teórico',
};

interface StatusChipProps {
  mode: StageMode;
}

export function StatusChip({ mode }: StatusChipProps) {
  const cls = mode.toLowerCase() as 'operacional' | 'homologavel' | 'teorico';
  return <span className={`chip ${cls}`}>{MODE_LABEL[mode]}</span>;
}

interface DocStatusChipProps {
  status: string;
}

export function DocStatusChip({ status }: DocStatusChipProps) {
  const normalized = status.replace(/_/g, ' ');
  return <span className="chip">{normalized}</span>;
}

interface CreditoChipProps {
  situacao: string;
}

export function CreditoChip({ situacao }: CreditoChipProps) {
  const s = situacao.toUpperCase();
  const cls =
    s === 'NORMAL'
      ? 'credito-normal'
      : s === 'ATENCAO'
        ? 'credito-atencao'
        : s === 'BLOQUEIO_MANUAL'
          ? 'credito-manual'
          : 'credito-bloqueado';
  const label = s.replace(/_/g, ' ');
  return <span className={`chip ${cls}`}>{label}</span>;
}

interface PapelChipProps {
  papel: string;
}

export function PapelChip({ papel }: PapelChipProps) {
  const cls = papel.toLowerCase();
  return <span className={`chip ${cls}`}>{papel}</span>;
}
