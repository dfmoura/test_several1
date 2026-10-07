export type ProdutoLotePolitica = {
  controla_lote: boolean;
  controla_validade: boolean;
  prazo_validade_dias: number | null;
};

/**
 * Espelho de App\Support\ProdutoLotePolitica — estudo 32 §6.2 / ADR_ESTOQUE_LOTE_VALIDADE.
 * Volume = estoque_lotes quando controla_lote; localização (Guardar) só existe no volume.
 */
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
  if (g === 'MP-TEC' || g === 'MP-RET') {
    return { controla_lote: true, controla_validade: false, prazo_validade_dias: null };
  }
  // REV/EMB (e default): sem volume — saldo só SKU; não entram no mapa de locais.
  if (g === 'REV-RIB' || g === 'EMB-TUB' || g === 'EMB-CX') {
    return { controla_lote: false, controla_validade: false, prazo_validade_dias: null };
  }
  return { controla_lote: false, controla_validade: false, prazo_validade_dias: null };
}

/** Texto de ajuda: volume ↔ local (não misturar com endereço no SKU). */
export function hintLoteVolumeLocal(controlaLote: boolean): string {
  if (controlaLote) {
    return 'Volume na entrada (bobina/lote) → etiqueta → Guardar no local. Sem volume não há endereço no mapa.';
  }
  return 'Sem volume: saldo só por SKU. Tubete, caixa, ribbon, MUC e PA não usam local por volume.';
}

/** Aviso se o operador desliga lote num grupo que a política liga (MP bobina/tinta). */
export function avisoLoteDesligadoContraPolitica(
  grupo: string | null | undefined,
  controlaLote: boolean,
): string | null {
  if (controlaLote) return null;
  if (!politicaLotePorGrupo(grupo).controla_lote) return null;
  return 'Este grupo normalmente controla volume. Sem lote não há Guardar nem local no mapa.';
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
