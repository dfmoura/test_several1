import { clampDecimalScale, DECIMAL_SCALE } from './format';
import type { OrdemCompraItemComposicao } from './api';

export type VolumeSugestaoOc = {
  codigo: string;
  qtde: string;
  data_entrada: string;
  data_validade: string;
  data_fabricacao: string;
  largura_mm: string;
  comprimento_m: string;
};

export type OcComposicaoVolumesCtx = {
  ocCodigo?: string | null;
  itemOrdem?: number | null;
  /** Un. comercial do SKU — qtde do volume = comercial (m² / fator quando com≠M2). */
  unidade_comercial?: string | null;
  unidade_interna?: string | null;
  fator_conversao?: string | null;
};

const CODIGO_PREFIXO = 'INT';

function normUnidade(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace('M²', 'M2');
}

/** Espelha BobinaAreaComercial::fromAreaM2. */
export function qtdeComercialFromAreaM2(
  areaM2: number | string,
  ctx: Pick<
    OcComposicaoVolumesCtx,
    'unidade_comercial' | 'unidade_interna' | 'fator_conversao'
  > = {},
): string {
  const area = typeof areaM2 === 'number' ? areaM2 : Number(areaM2);
  if (!(area > 0)) return '';
  const com = normUnidade(ctx.unidade_comercial);
  const int = normUnidade(ctx.unidade_interna);
  if (com === 'M2' || com === '') {
    return clampDecimalScale(area, DECIMAL_SCALE.qty);
  }
  if (int !== 'M2') {
    return clampDecimalScale(area, DECIMAL_SCALE.qty);
  }
  const fator = Number(String(ctx.fator_conversao ?? '1').replace(',', '.'));
  if (!(fator > 0)) {
    return clampDecimalScale(area, DECIMAL_SCALE.qty);
  }
  return clampDecimalScale(area / fator, DECIMAL_SCALE.qty);
}

/** Σ m² físicos a partir de L×C dos volumes (confronto — não usar qtde comercial). */
export function somaAreaM2Volumes(
  vols: Array<{ largura_mm?: string; comprimento_m?: string }> | undefined,
): number {
  if (!vols?.length) return 0;
  let sum = 0;
  for (const v of vols) {
    const l = Number(v.largura_mm || 0);
    const c = Number(v.comprimento_m || 0);
    if (l > 0 && c > 0) sum += (l / 1000) * c;
  }
  return sum;
}

/** Espelha OcComposicaoVolumes::codigoInterno (máx. 60). */
export function codigoLoteInternoOc(
  ocCodigo: string | null | undefined,
  itemOrdem: number | null | undefined,
  larguraMm: string,
  comprimentoM: string,
  seq: number,
): string {
  const oc = slugOc(ocCodigo);
  const item = `I${String(Math.max(1, itemOrdem ?? 1)).padStart(2, '0')}`;
  const dim = `${dimSlug(larguraMm)}x${dimSlug(comprimentoM)}`;
  const n = String(Math.max(1, seq)).padStart(2, '0');
  let codigo = `${CODIGO_PREFIXO}-${oc}-${item}-${dim}-${n}`;
  if (codigo.length <= 60) return codigo;
  const budget = 60 - `${CODIGO_PREFIXO}--${item}-${dim}-${n}`.length;
  const ocCurto = oc.slice(0, Math.max(4, budget));
  return `${CODIGO_PREFIXO}-${ocCurto}-${item}-${dim}-${n}`;
}

/**
 * Expande faixas do pedido OC → volumes sugeridos (1 bobina inteira = 1 volume).
 * Espelha App\Support\OcComposicaoVolumes — XML/rastro prevalece; isto é fallback.
 * nLote vazio → INT-{OC}-I{ordem}-{LxC}-{seq} (interno, não aleatório).
 * qtde = unidade comercial (converte m² quando SKU ≠ M2).
 */
export function volumesFromOcComposicao(
  composicao: OrdemCompraItemComposicao[] | undefined | null,
  dataEntrada = '',
  ctx: OcComposicaoVolumesCtx = {},
): VolumeSugestaoOc[] {
  if (!composicao?.length) return [];
  const out: VolumeSugestaoOc[] = [];
  let seq = 1;

  for (const f of composicao) {
    const largura = clampDecimalScale(f.largura_mm, DECIMAL_SCALE.dim);
    const quantidade = clampDecimalScale(f.quantidade, DECIMAL_SCALE.qty);
    const comprimento = clampDecimalScale(f.comprimento_m, DECIMAL_SCALE.dim);
    const l = Number(largura);
    const q = Number(quantidade);
    const c = Number(comprimento);
    if (!(l > 0) || !(q > 0) || !(c > 0)) continue;

    const areaUnitNum = (l / 1000) * c;
    const areaUnit = clampDecimalScale(areaUnitNum, DECIMAL_SCALE.qty);
    const areaFaixa =
      clampDecimalScale(f.area_m2, DECIMAL_SCALE.qty) ||
      clampDecimalScale(q * areaUnitNum, DECIMAL_SCALE.qty);

    const isWhole = Number.isInteger(q) || /^\d+(\.0+)?$/.test(quantidade);
    const n = Math.trunc(q);
    if (isWhole && n >= 1 && n <= 500 && areaUnit) {
      for (let i = 0; i < n; i++) {
        out.push({
          codigo: codigoLoteInternoOc(
            ctx.ocCodigo,
            ctx.itemOrdem,
            largura,
            comprimento,
            seq,
          ),
          qtde: qtdeComercialFromAreaM2(areaUnitNum, ctx),
          data_entrada: dataEntrada,
          data_validade: '',
          data_fabricacao: '',
          largura_mm: largura,
          comprimento_m: comprimento,
        });
        seq++;
      }
    } else if (areaFaixa) {
      out.push({
        codigo: codigoLoteInternoOc(
          ctx.ocCodigo,
          ctx.itemOrdem,
          largura,
          comprimento,
          seq,
        ),
        qtde: qtdeComercialFromAreaM2(Number(areaFaixa), ctx),
        data_entrada: dataEntrada,
        data_validade: '',
        data_fabricacao: '',
        largura_mm: largura,
        comprimento_m: comprimento,
      });
      seq++;
    }
  }

  return out;
}

function slugOc(ocCodigo: string | null | undefined): string {
  const raw = String(ocCodigo ?? '')
    .trim()
    .toUpperCase();
  if (!raw) return 'OC';
  const slug = raw.replace(/[^A-Z0-9]+/g, '');
  return slug || 'OC';
}

function dimSlug(decimal: string): string {
  const v = clampDecimalScale(decimal, DECIMAL_SCALE.dim);
  if (!v) return '0';
  if (v.includes('.')) {
    return v.replace(/\.?0+$/, '') || '0';
  }
  return v;
}
