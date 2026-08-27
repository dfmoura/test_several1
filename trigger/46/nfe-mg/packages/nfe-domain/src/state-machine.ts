import { ValidationError } from '@nfe/shared';
import type { NfeSituacao } from './entities.js';

const TRANSITIONS: Record<NfeSituacao, NfeSituacao[]> = {
  RASCUNHO: ['ENVIANDO', 'REJEITADA'],
  ENVIANDO: ['PROCESSANDO', 'AUTORIZADA', 'REJEITADA', 'DENEGADA'],
  PROCESSANDO: ['AUTORIZADA', 'REJEITADA', 'DENEGADA'],
  AUTORIZADA: ['CANCELADA'],
  REJEITADA: [],
  DENEGADA: [],
  CANCELADA: [],
  INUTILIZADA: [],
};

export class NfeStateMachine {
  static canTransition(from: NfeSituacao, to: NfeSituacao): boolean {
    return TRANSITIONS[from].includes(to);
  }

  static transition(from: NfeSituacao, to: NfeSituacao): NfeSituacao {
    if (!this.canTransition(from, to)) {
      throw new ValidationError(`Transição NF-e inválida: ${from} → ${to}`);
    }
    return to;
  }
}

export function situacaoFromCStat(cStat: string): NfeSituacao {
  if (cStat === '100') return 'AUTORIZADA';
  if (cStat === '101' || cStat === '135' || cStat === '155') return 'CANCELADA';
  if (cStat === '102') return 'INUTILIZADA';
  if (cStat === '110' || cStat === '301' || cStat === '302') return 'DENEGADA';
  if (cStat === '103' || cStat === '104' || cStat === '105') return 'PROCESSANDO';
  return 'REJEITADA';
}
