export type ProdutoLotePolitica = {
  controla_lote: boolean;
  controla_validade: boolean;
  prazo_validade_dias: number | null;
};

/** Espelho de App\Support\ProdutoLotePolitica — estudo 32 §6.2 */
export function politicaLotePorGrupo(grupo: string | null | undefined): ProdutoLotePolitica {
  const g = (grupo ?? '').toUpperCase().trim();
  if (g === 'MP-PAP' || g === 'MP-FLM' || g === 'MP-LAM') {
    return { controla_lote: true, controla_validade: true, prazo_validade_dias: 548 };
  }
  if (g === 'MP-TIN' || g === 'MP-ADF') {
    return { controla_lote: true, controla_validade: true, prazo_validade_dias: 365 };
  }
  if (g === 'MP-CLD') {
    return { controla_lote: true, controla_validade: true, prazo_validade_dias: 730 };
  }
  if (g === 'MP-TEC') {
    return { controla_lote: true, controla_validade: false, prazo_validade_dias: null };
  }
  return { controla_lote: false, controla_validade: false, prazo_validade_dias: null };
}

export function validadeStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'A_VENCER':
      return 'A vencer';
    case 'VENCIDO':
      return 'Vencido';
    case 'SEM_VALIDADE':
      return 'Sem validade';
    case 'OK':
      return 'Ok';
    default:
      return '—';
  }
}
