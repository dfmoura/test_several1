import type { ReactNode } from 'react';
import type { StageMode } from '../types';
import { StageBadge } from './StageBadge';
import { StatusChip } from './StatusChip';

interface PageHeaderProps {
  ordem: number;
  codigo: string;
  titulo: string;
  modo: StageMode;
  regra: string;
  actions?: ReactNode;
}

export function PageHeader({ ordem, codigo, titulo, modo, regra, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-top">
        <div>
          <div className="page-header-meta" style={{ marginBottom: '0.35rem' }}>
            <StageBadge codigo={codigo} ordem={ordem} />
            <StatusChip mode={modo} />
          </div>
          <h1>{titulo}</h1>
        </div>
        {actions ? <div className="btn-row">{actions}</div> : null}
      </div>
      <p className="page-header-rule">{regra}</p>
    </header>
  );
}
