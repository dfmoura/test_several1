/**
 * Espelho de App\Support\NfeExactDimensoes (ADR_CADASTRO_INSUMO_VOLUME F2.1).
 * Padrão Avery: `4x205x1000`, `1x215x900 | 1x215x1050 | 4x215x1000`.
 */
import { clampDecimalScale, DECIMAL_SCALE, comprimentoFromAreaLargura } from './format';

export type ExactDimSlot = {
  largura_mm: string;
  comprimento_m: string;
  area_m2: string;
};

function areaM2(larguraMm: string, comprimentoM: string): string {
  const l = Number(larguraMm);
  const c = Number(comprimentoM);
  if (!(l > 0) || !(c > 0)) return '0';
  return clampDecimalScale(String((l / 1000) * c), DECIMAL_SCALE.qty);
}

/** Expande slots N×L×C de infAdProd. */
export function expandirSlotsExact(infAdProd: string | null | undefined): ExactDimSlot[] {
  if (!infAdProd?.trim()) return [];
  const re = /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/giu;
  const slots: ExactDimSlot[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(infAdProd)) !== null) {
    const n = Number(m[1]);
    if (!(n >= 1 && n <= 500)) continue;
    const largura = clampDecimalScale(m[2]!.replace(',', '.'), DECIMAL_SCALE.dim);
    const comprimento = clampDecimalScale(m[3]!.replace(',', '.'), DECIMAL_SCALE.dim);
    if (!(Number(largura) > 0) || !(Number(comprimento) > 0)) continue;
    const area = areaM2(largura, comprimento);
    for (let i = 0; i < n; i++) {
      slots.push({ largura_mm: largura, comprimento_m: comprimento, area_m2: area });
    }
  }
  return slots;
}

/** Heurística legado: "60 MM" em xProd ou sufixo numérico do cProd. */
export function sugerirLarguraMmLegado(
  xProd: string | null | undefined,
  cProd: string,
): string {
  if (xProd) {
    const mm = xProd.match(/\b(\d{2,4})\s*MM\b/i);
    if (mm?.[1]) return clampDecimalScale(mm[1], DECIMAL_SCALE.dim);
  }
  const suf = cProd.match(/(\d{2,3})$/);
  if (suf?.[1]) {
    const n = Number(suf[1]);
    if (n >= 10 && n <= 500) return clampDecimalScale(String(n), DECIMAL_SCALE.dim);
  }
  return '';
}

export type VolumeDimInput = {
  qtde: string;
  largura_mm?: string;
  comprimento_m?: string;
};

/**
 * Amarras 1:1 slot Exact → volume por área. Fallback: heurística L + deriva C.
 */
export function amarrarDimensoesVolumes<T extends VolumeDimInput>(
  volumes: T[],
  infAdProd: string | null | undefined,
  xProd: string | null | undefined,
  cProd: string,
): T[] {
  const slots = expandirSlotsExact(infAdProd);
  const used = slots.map(() => false);
  const fallbackL = sugerirLarguraMmLegado(xProd, cProd);

  return volumes.map((vol) => {
    const qtde = clampDecimalScale(vol.qtde || '0', DECIMAL_SCALE.qty);
    for (let s = 0; s < slots.length; s++) {
      if (used[s]) continue;
      const slot = slots[s]!;
      if (qtde === slot.area_m2 || Number(qtde) === Number(slot.area_m2)) {
        used[s] = true;
        return {
          ...vol,
          largura_mm: slot.largura_mm,
          comprimento_m: slot.comprimento_m,
        };
      }
    }
    if (fallbackL) {
      return {
        ...vol,
        largura_mm: fallbackL,
        comprimento_m: comprimentoFromAreaLargura(qtde, fallbackL) || '',
      };
    }
    return {
      ...vol,
      largura_mm: vol.largura_mm ?? '',
      comprimento_m: vol.comprimento_m ?? '',
    };
  });
}
