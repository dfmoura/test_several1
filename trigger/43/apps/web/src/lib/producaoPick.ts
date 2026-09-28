import type { OpRetiradaPreview, OpRetiradaVolume, OrdemProducao, OrdemProducaoMaterial } from './api';
import { formatDecimalBr } from './format';
import { opKitEstado, opKitNome, opKitOnde, parseQtdeDigitada } from './producaoUi';

/** Como o chão escolhe o que pegar — bobina = volume; o resto = unidade. */
export type ModoRetirada = 'volume' | 'unidade';

const COMPONENTES_VOLUME = new Set(['PAPEL']);
const FAMILIAS_VOLUME = ['MP-PAP', 'MP-FLM', 'MP-LAM', 'PA-BOB'];

export function modoRetirada(m: OrdemProducaoMaterial): ModoRetirada {
  const controla = Boolean(m.retirada?.controla_lote ?? m.produto?.controla_lote);
  if (!controla) return 'unidade';
  const comp = (m.componente ?? '').toUpperCase();
  if (COMPONENTES_VOLUME.has(comp)) return 'volume';
  const fam = (m.produto?.familia ?? '').toUpperCase();
  if (FAMILIAS_VOLUME.some((p) => fam === p || fam.startsWith(`${p}-`))) return 'volume';
  const vols = m.retirada?.volumes ?? [];
  if (vols.some((v) => v.largura_mm || v.comprimento_m)) return 'volume';
  return 'unidade';
}

/** Extra / reposição: sem linha do kit, o L×C do preview distingue bobina de lote de tinta. */
export function modoRetiradaPreview(
  preview: OpRetiradaPreview,
  m?: OrdemProducaoMaterial | null,
): ModoRetirada {
  if (m) return modoRetirada(m);
  if (!preview.controla_lote) return 'unidade';
  const vols = [...preview.volumes, ...preview.candidatos];
  if (vols.some((v) => v.largura_mm || v.comprimento_m)) return 'volume';
  return 'unidade';
}

/** Lotes FEFO para confirmar sem o operador escolher volume (tinta, batelada). */
export function volumesFefoConfirm(preview?: OpRetiradaPreview | null): { lote_id: number; qtde: string }[] {
  if (!preview) return [];
  return preview.volumes
    .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
    .map((v) => ({ lote_id: v.lote_id as number, qtde: String(parseQtdeDigitada(v.qtde_retirar)) }));
}

export function nVolumesSugeridos(m: OrdemProducaoMaterial): number {
  return (m.retirada?.volumes ?? []).filter((v) => parseQtdeDigitada(v.qtde_retirar) > 0).length;
}

/** Quantidade de chão — inteiro sem casa; senão 2. Não parece planilha. */
export function formatQtdePick(n: number, unidade: string): string {
  const decimals = Math.abs(n - Math.round(n)) < 1e-6 ? 0 : 2;
  return `${formatDecimalBr(n, decimals)} ${unidade}`;
}

export function formatVolumesPick(n: number): string {
  return n === 1 ? '1 volume' : `${n} volumes`;
}

export function formatVolumesComMetros(nVol: number, metros: string | null | undefined): string {
  const vols = formatVolumesPick(nVol);
  return metros ? `${vols} · ${metros}` : vols;
}

export function modoRetiradaLabel(modo: ModoRetirada): string {
  return modo === 'volume' ? 'Por volumes' : 'Por unidades';
}

export function larguraMmDoMaterial(m: OrdemProducaoMaterial): number {
  for (const v of volumesParaEscolha(m)) {
    const n = parseQtdeDigitada(v.largura_mm);
    if (n > 0) return n;
  }
  for (const v of m.retirada?.volumes_baixados ?? []) {
    const n = parseQtdeDigitada(v.largura_mm);
    if (n > 0) return n;
  }
  return parseQtdeDigitada(m.produto?.largura_mm);
}

/** Volume → SKU → pista do PED. Dimensão do que está na prateleira. */
export function larguraMmParaMetro(m: OrdemProducaoMaterial, op?: OrdemProducao | null): number {
  const direta = larguraMmDoMaterial(m);
  if (direta > 0) return direta;
  if (modoRetirada(m) !== 'volume') return 0;
  return parseQtdeDigitada(op?.pedido_item?.largura_mm);
}

/**
 * Largura do pedido da OP (pista), não do volume que estiver na prateleira.
 * m² planejado ÷ esta largura = metro linear que a ordem precisa.
 */
export function larguraMmNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): number {
  const pista = parseQtdeDigitada(op?.pedido_item?.largura_mm);
  if (pista > 0) return pista;
  const sku = parseQtdeDigitada(m.produto?.largura_mm);
  if (sku > 0) return sku;
  return larguraMmDoMaterial(m);
}

function m2ParaMetros(m2: number, larguraMm: number): number | null {
  if (larguraMm <= 0 || m2 <= 0) return null;
  return m2 / (larguraMm / 1000);
}

/** Comprimento do volume (m). L×C; senão m² ÷ largura (volume, SKU ou pista). */
export function metrosLinearesVolume(v: OpRetiradaVolume, larguraMmFallback = 0): number | null {
  const direto = parseQtdeDigitada(v.comprimento_m);
  if (direto > 0) return direto;
  const larguraMm = parseQtdeDigitada(v.largura_mm) || larguraMmFallback;
  const m2 = parseQtdeDigitada(v.qtde_retirar) || parseQtdeDigitada(v.qtde_volume);
  const un = (v.unidade ?? '').toUpperCase().replace('²', '2');
  if (un === 'UN' || un === 'PC' || un === 'KG') return null;
  return m2ParaMetros(m2, larguraMm);
}

export function formatMetrosLineares(v: OpRetiradaVolume, larguraMmFallback = 0): string | null {
  const m = metrosLinearesVolume(v, larguraMmFallback);
  if (m == null) return null;
  return formatQtdePick(m, 'm');
}

export function somaMetrosDeVolumes(vols: OpRetiradaVolume[], larguraMmFallback = 0): number | null {
  if (vols.length === 0) return null;
  const metros = vols.map((v) => metrosLinearesVolume(v, larguraMmFallback));
  if (!metros.every((x): x is number => x != null && x > 0)) return null;
  return metros.reduce((a, b) => a + b, 0);
}

export function formatMetrosDeVolumes(vols: OpRetiradaVolume[], larguraMmFallback = 0): string | null {
  const n = somaMetrosDeVolumes(vols, larguraMmFallback);
  if (n == null) return null;
  return formatQtdePick(n, 'm');
}

export function metrosLinhaMaterial(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
  m2Oficial?: number,
): number | null {
  if (modoRetirada(m) !== 'volume') return null;
  const L = larguraMmParaMetro(m, op);
  const baixados = m.retirada?.volumes_baixados ?? [];
  const sugeridos = volumesParaEscolha(m).filter(volumeSugerido);
  const use = baixados.length > 0 ? baixados : sugeridos.length > 0 ? sugeridos : volumesParaEscolha(m);
  const somaVols = somaMetrosDeVolumes(use, L);
  if (somaVols != null) return somaVols;
  const m2 =
    m2Oficial != null
      ? m2Oficial
      : m.saida_movimento_id
        ? parseQtdeDigitada(m.qtde_requisitada)
        : qtdeLinhaPick(m);
  return m2ParaMetros(m2, L);
}

export function formatMetrosLinha(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
  m2Oficial?: number,
): string | null {
  const n = metrosLinhaMaterial(m, op, m2Oficial);
  if (n == null) return null;
  return formatQtdePick(n, 'm');
}

/** O que o operador lê: volumes, e metro linear quando dá para converter. */
export function formatPickPrincipal(m: OrdemProducaoMaterial, op?: OrdemProducao | null): string {
  if (modoRetirada(m) === 'volume') {
    const n = m.saida_movimento_id
      ? nVolumesApontados(m)
      : nVolumesSugeridos(m) || volumesParaEscolha(m).length;
    if (n <= 0) return 'Sem volume';
    return formatVolumesComMetros(n, formatMetrosLinha(m, op));
  }
  return formatQtdePick(qtdeLinhaPick(m), unidadeExibicao(m.unidade));
}

export function nVolumesApontados(m: OrdemProducaoMaterial): number {
  const baixados = m.retirada?.volumes_baixados?.length ?? 0;
  if (baixados > 0) return baixados;
  return nVolumesSugeridos(m);
}

export function qtdeLinhaPick(m: OrdemProducaoMaterial): number {
  return parseQtdeDigitada(m.qtde_planejada) || parseQtdeDigitada(m.qtde_requisitada);
}

/** Unidade da OP na tela (m², não M2 de planilha). */
export function unidadeExibicao(unidade: string | null | undefined): string {
  const u = (unidade ?? '').trim();
  if (!u) return 'UN';
  const n = u.toUpperCase().replace('²', '2');
  if (n === 'M2') return 'm²';
  return u;
}

/** Metro linear que a OP precisa (m² planejado ÷ largura). Só bobina. */
export function metrosNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): number | null {
  if (modoRetirada(m) !== 'volume') return null;
  return m2ParaMetros(qtdeLinhaPick(m), larguraMmNecessidadeOp(m, op));
}

/**
 * Qtde de material na língua da tela. Bobina: metro linear (pista) + m². Writer segue m².
 */
export function formatQtdeMaterial(
  m: OrdemProducaoMaterial,
  op: OrdemProducao | null | undefined,
  qtde: number,
): string {
  if (!(qtde > 0)) return '—';
  const oficial = formatQtdePick(qtde, unidadeExibicao(m.unidade));
  if (modoRetirada(m) !== 'volume') return oficial;
  const metros = m2ParaMetros(qtde, larguraMmNecessidadeOp(m, op));
  if (metros == null) return oficial;
  return `${formatQtdePick(metros, 'm')} · ${oficial}`;
}

/**
 * Quanto a OP pede deste material (`qtde_planejada`).
 */
export function formatNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): string {
  const n = qtdeLinhaPick(m);
  if (n <= 0) return 'Sem quantidade';
  return formatQtdeMaterial(m, op, n);
}

/** Caminhada de estoque: local primeiro (WMS). Sem local vai no fim. */
export function opKitLinhasOrdenadas(linhas: OrdemProducaoMaterial[]): OrdemProducaoMaterial[] {
  return [...linhas].sort((a, b) => {
    const oa = opKitOnde(a);
    const ob = opKitOnde(b);
    if (oa === '—' && ob !== '—') return 1;
    if (ob === '—' && oa !== '—') return -1;
    const c = oa.localeCompare(ob, 'pt-BR');
    if (c !== 0) return c;
    return opKitNome(a).localeCompare(opKitNome(b), 'pt-BR');
  });
}

export function proximaLinhaPick(op: OrdemProducao): OrdemProducaoMaterial | null {
  return opKitLinhasOrdenadas(op.materiais ?? []).find((m) => opKitEstado(m) === 'falta_pegar') ?? null;
}

/** Bobinas manuseáveis: sugeridas + outras, sem duplicar. */
export function volumesParaEscolha(m: OrdemProducaoMaterial): OpRetiradaVolume[] {
  const seen = new Set<number>();
  const out: OpRetiradaVolume[] = [];
  for (const v of [...(m.retirada?.volumes ?? []), ...(m.retirada?.candidatos ?? [])]) {
    if (!v.lote_id || seen.has(v.lote_id)) continue;
    seen.add(v.lote_id);
    out.push(v);
  }
  return out;
}

export function qtdeVolumeTotal(v: OpRetiradaVolume): number {
  return parseQtdeDigitada(v.qtde_volume) || parseQtdeDigitada(v.qtde_retirar);
}

export function formatVolumeTotal(v: OpRetiradaVolume): string {
  return formatQtdePick(qtdeVolumeTotal(v), v.unidade || 'M2');
}

export function formatLotePick(v: { codigo?: string | null; lote_id?: number | null }): string {
  const cod = (v.codigo ?? '').trim();
  return `Lote ${cod || v.lote_id || '—'}`;
}

export function formatVolumeDimensao(v: OpRetiradaVolume): string | null {
  const largura = v.largura_mm ? `${formatDecimalBr(Number(v.largura_mm), 0)} mm` : null;
  const comp = v.comprimento_m ? `${formatDecimalBr(Number(v.comprimento_m), 0)} m` : null;
  if (largura && comp) return `${largura} × ${comp}`;
  return largura || comp;
}

export function volumeSugerido(v: OpRetiradaVolume): boolean {
  return Boolean(v.sugerido) || parseQtdeDigitada(v.qtde_retirar) > 0;
}

function foldBusca(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function compactoBusca(s: string): string {
  return foldBusca(s).replace(/[^a-z0-9]+/g, '');
}

function variantesNumero(raw: string | number | null | undefined): string[] {
  if (raw == null || String(raw).trim() === '') return [];
  const s = String(raw).trim();
  const n = Number(s.replace(',', '.'));
  return [s, s.replace('.', ','), s.replace(',', '.'), Number.isFinite(n) ? String(n) : ''].filter(Boolean);
}

function variantesLote(codigo: string | null | undefined, loteId: number | null | undefined): string[] {
  const raw = (codigo ?? '').trim();
  const semPref = raw.replace(/^(vol|lote|lot)[:\s-]*/i, '');
  return [
    loteId != null ? String(loteId) : '',
    raw,
    semPref,
    compactoBusca(raw),
    compactoBusca(semPref),
    ...raw.split(/[-_/.\s:]+/),
    ...semPref.split(/[-_/.\s:]+/),
  ].filter((s) => s !== '');
}

/** Só identidade do lote — o filtro do overlay não mistura SKU. */
export function volumeTextoLote(v: OpRetiradaVolume): string {
  return [
    ...variantesLote(v.codigo, v.lote_id),
    ...variantesLote(v.nf_numero, null),
    v.nf_numero,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ');
}

export function volumeTextoBusca(v: OpRetiradaVolume): string {
  const end = v.endereco?.codigo ?? '';
  return [
    volumeTextoLote(v),
    end,
    ...end.split(/[-_/.\s]+/),
    ...variantesNumero(v.qtde_volume),
    ...variantesNumero(v.qtde_retirar),
    ...variantesNumero(v.largura_mm),
    ...variantesNumero(v.comprimento_m),
    formatVolumeTotal(v),
    formatMetrosLineares(v),
    formatVolumeDimensao(v),
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ');
}

export function volumePassaFiltro(v: OpRetiradaVolume, consulta: string): boolean {
  let q = foldBusca(consulta).trim();
  if (!q) return true;
  q = q.replace(/^(lote|lot|vol|volume)\b[:\s-]*/g, '').trim() || q;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  const hayLote = `${foldBusca(volumeTextoLote(v))} ${compactoBusca(volumeTextoLote(v))}`;
  const hayResto = foldBusca(volumeTextoBusca(v));
  return tokens.every((t) => {
    const c = compactoBusca(t);
    if (c.length >= 2 && hayLote.includes(c)) return true;
    if (hayLote.includes(t) || hayResto.includes(t)) return true;
    return false;
  });
}
