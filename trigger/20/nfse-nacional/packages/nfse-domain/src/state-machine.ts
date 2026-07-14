import { ValidationError } from '@nfse/shared';
import type { DpsStatus, NfseSituacao } from './entities.js';

const DPS_TRANSITIONS: Record<DpsStatus, DpsStatus[]> = {
  RASCUNHO: ['ENVIANDO', 'REJEITADA'],
  ENVIANDO: ['AUTORIZADA', 'REJEITADA'],
  AUTORIZADA: ['CANCELADA', 'SUBSTITUIDA'],
  REJEITADA: [],
  CANCELADA: [],
  SUBSTITUIDA: [],
};

const NFSE_TRANSITIONS: Record<NfseSituacao, NfseSituacao[]> = {
  AUTORIZADA: ['CANCELADA', 'SUBSTITUIDA', 'ANALISE_FISCAL'],
  CANCELADA: [],
  SUBSTITUIDA: [],
  ANALISE_FISCAL: ['CANCELADA'],
};

export class DpsStateMachine {
  static canTransition(from: DpsStatus, to: DpsStatus): boolean {
    return DPS_TRANSITIONS[from].includes(to);
  }

  static transition(from: DpsStatus, to: DpsStatus): DpsStatus {
    if (!this.canTransition(from, to)) {
      throw new ValidationError(`Transição DPS inválida: ${from} → ${to}`);
    }
    return to;
  }
}

export class NfseStateMachine {
  static canTransition(from: NfseSituacao, to: NfseSituacao): boolean {
    return NFSE_TRANSITIONS[from].includes(to);
  }

  static transition(from: NfseSituacao, to: NfseSituacao): NfseSituacao {
    if (!this.canTransition(from, to)) {
      throw new ValidationError(`Transição NFS-e inválida: ${from} → ${to}`);
    }
    return to;
  }
}
