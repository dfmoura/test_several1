/**
 * Linhagem comercial ORC — ADR_ORC_LINHAGEM_COMERCIAL.
 * Dono = ORC; PED só ecoa. ≠ versao (revisão do mesmo documento).
 */

export type OrcLinhagem = 'NOVO' | 'REPETICAO' | 'REPETICAO_ALTERADA';

export type OrcOrigemRef = {
  id: number;
  codigo: string;
};

/** Rótulo curto para StatusPill / ficha-chip. */
export function linhagemLabel(linhagem?: string | null): string | null {
  switch (linhagem) {
    case 'NOVO':
      return 'Novo';
    case 'REPETICAO':
      return 'Repetição';
    case 'REPETICAO_ALTERADA':
      return 'Repetição c/ alteração';
    default:
      return null;
  }
}

/** Lista: só destaca cópia (Novo implícito). */
export function linhagemLabelLista(linhagem?: string | null): string | null {
  if (linhagem === 'REPETICAO' || linhagem === 'REPETICAO_ALTERADA') {
    return linhagemLabel(linhagem);
  }
  return null;
}

/** Proposta / ficha cliente: referência leve, sem jargão de alteração. */
export function linhagemRefCliente(origemCodigo?: string | null): string | null {
  const c = (origemCodigo ?? '').trim();
  return c !== '' ? `Ref. ${c}` : null;
}
