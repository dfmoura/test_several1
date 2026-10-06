import type { OpRetiradaPreview, OpRetiradaVolume, OrdemProducao, OrdemProducaoMaterial } from './api';
import { formatDecimalBr } from './format';
import { opKitEstado, opKitNome, opKitOnde, parseQtdeDigitada } from './producaoUi';

/** Como o chão escolhe o que pegar — bobina = volume; o resto = unidade. */
export type ModoRetirada = 'volume' | 'unidade';

const COMPONENTES_VOLUME = new Set(['PAPEL']);
/** Grupo no código do SKU (MP-PAP-001). Família do produto é MP, não o grupo. */
const GRUPOS_VOLUME = ['MP-PAP', 'MP-FLM', 'MP-TEC', 'MP-LAM', 'MP-CLD', 'MP-ADF', 'MP-RET', 'PA-BOB'];

function codigoDeGrupoVolume(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').trim().toUpperCase();
  return GRUPOS_VOLUME.some((p) => c === p || c.startsWith(`${p}-`));
}

export function modoRetirada(m: OrdemProducaoMaterial): ModoRetirada {
  const controla = Boolean(m.retirada?.controla_lote ?? m.produto?.controla_lote);
  if (!controla) return 'unidade';
  const comp = (m.componente ?? '').toUpperCase();
  if (COMPONENTES_VOLUME.has(comp)) return 'volume';
  if (codigoDeGrupoVolume(m.produto?.codigo)) return 'volume';
  const fam = (m.produto?.familia ?? '').toUpperCase();
  if (GRUPOS_VOLUME.some((p) => fam === p || fam.startsWith(`${p}-`))) return 'volume';
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

/** Chão: bobina física (volume de estoque). */
export function formatVolumesPick(n: number): string {
  return n === 1 ? '1 bobina' : `${n} bobinas`;
}

export function formatVolumesComMetros(nVol: number, metros: string | null | undefined): string {
  const vols = formatVolumesPick(nVol);
  return metros ? `${vols} · ${metros}` : vols;
}

/** Carrinho / saída: bobinas + área oficial (comparável com o pedido). */
export function formatVolumesComArea(nVol: number, areaM2: number | null | undefined): string {
  const vols = formatVolumesPick(nVol);
  if (areaM2 == null || !(areaM2 > 0)) return vols;
  return `${vols} · ${formatQtdePick(areaM2, 'm²')}`;
}

export function modoRetiradaLabel(modo: ModoRetirada): string {
  return modo === 'volume' ? 'Por bobinas' : 'Por unidades';
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

/**
 * Área do volume em m² (unidade do writer).
 * Prefer qtde em M2; senão L×C do rolo. Não usa comprimento sozinho.
 */
export function areaM2Volume(v: OpRetiradaVolume): number | null {
  const un = (v.unidade ?? '').toUpperCase().replace('²', '2');
  const q = parseQtdeDigitada(v.qtde_retirar) || parseQtdeDigitada(v.qtde_volume);
  if (q > 0 && (un === 'M2' || un === '')) return q;
  const L = parseQtdeDigitada(v.largura_mm);
  const C = parseQtdeDigitada(v.comprimento_m);
  if (L > 0 && C > 0) return (L / 1000) * C;
  if (q > 0 && un !== 'UN' && un !== 'PC' && un !== 'KG' && un !== 'MIL' && un !== 'M' && un !== 'MT' && un !== 'ML') {
    return q;
  }
  return null;
}

export function somaAreaM2Volumes(vols: OpRetiradaVolume[]): number | null {
  if (vols.length === 0) return null;
  const areas = vols.map(areaM2Volume);
  if (!areas.every((x): x is number => x != null && x > 0)) return null;
  return areas.reduce((a, b) => a + b, 0);
}

export function formatAreaM2Volumes(vols: OpRetiradaVolume[]): string | null {
  const n = somaAreaM2Volumes(vols);
  if (n == null) return null;
  return formatQtdePick(n, 'm²');
}

/** Volumes marcados / já baixados desta linha (para leitura de chão). */
export function volumesLinhaMaterial(m: OrdemProducaoMaterial): OpRetiradaVolume[] {
  const baixados = m.retirada?.volumes_baixados ?? [];
  if (baixados.length > 0) return baixados;
  const sugeridos = volumesParaEscolha(m).filter(volumeSugerido);
  if (sugeridos.length > 0) return sugeridos;
  return volumesParaEscolha(m);
}

export function areaM2LinhaMaterial(
  m: OrdemProducaoMaterial,
  m2Oficial?: number,
): number | null {
  if (modoRetirada(m) !== 'volume') return null;
  if (m2Oficial != null && m2Oficial > 0) return m2Oficial;
  const soma = somaAreaM2Volumes(volumesLinhaMaterial(m));
  if (soma != null) return soma;
  if (m.saida_movimento_id) {
    const req = parseQtdeDigitada(m.qtde_requisitada);
    return req > 0 ? req : null;
  }
  return null;
}

export function metrosLinhaMaterial(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
  m2Oficial?: number,
): number | null {
  if (modoRetirada(m) !== 'volume') return null;
  const L = larguraMmParaMetro(m, op);
  const use = volumesLinhaMaterial(m);
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

/**
 * O que saiu / está marcado: bobinas + área (m²).
 * Comprimento do rolo é dimensão física — não comparar com metros de pista.
 */
export function formatPickPrincipal(m: OrdemProducaoMaterial, op?: OrdemProducao | null): string {
  if (modoRetirada(m) === 'volume') {
    const n = m.saida_movimento_id
      ? nVolumesApontados(m)
      : nVolumesSugeridos(m) || volumesParaEscolha(m).length;
    if (n <= 0) return 'Sem volume';
    const vols = volumesLinhaMaterial(m);
    const areaN = somaAreaM2Volumes(vols) ?? areaM2LinhaMaterial(m);
    const area = areaN != null && areaN > 0 ? formatQtdePick(areaN, 'm²') : null;
    const rolo = formatMetrosDeVolumes(vols, larguraMmParaMetro(m, op));
    if (area && rolo) return `${formatVolumesPick(n)} · ${area} · rolo ${rolo}`;
    if (area) return `${formatVolumesPick(n)} · ${area}`;
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
 * Qtde de material na língua da tela.
 * Bobina: metro linear da **pista da etiqueta** (com largura) + área em m² (writer).
 * Metros de pista ≠ comprimento do rolo quando a bobina é mais larga que a etiqueta.
 * Se o SKU veio com unidade errada (ex.: MIL), a área continua m² — a conversão assume área.
 */
export function formatQtdeMaterial(
  m: OrdemProducaoMaterial,
  op: OrdemProducao | null | undefined,
  qtde: number,
): string {
  if (!(qtde > 0)) return '—';
  if (modoRetirada(m) !== 'volume') {
    return formatQtdePick(qtde, unidadeExibicao(m.unidade));
  }
  const un = (m.unidade ?? '').toUpperCase().replace('²', '2');
  if (un === 'M' || un === 'MT' || un === 'ML') {
    return formatQtdePick(qtde, 'm');
  }
  const pistaMm = larguraMmNecessidadeOp(m, op);
  const metros = m2ParaMetros(qtde, pistaMm);
  const area = formatQtdePick(qtde, 'm²');
  if (metros == null) return area;
  const pista =
    pistaMm > 0
      ? ` de pista (${formatDecimalBr(pistaMm, 0)} mm)`
      : ' de pista';
  return `${formatQtdePick(metros, 'm')}${pista} · ${area}`;
}

/**
 * Necessidade na ficha impressa. Bobina: metro da pista e m², sem o texto de tela.
 * A linha de volumes (bobinas × metros do rolo) continua separada.
 */
function necessidadeFicha(m: OrdemProducaoMaterial, op?: OrdemProducao | null): string {
  const n = qtdeLinhaPick(m);
  if (!(n > 0)) return '—';
  if (modoRetirada(m) !== 'volume') {
    return formatQtdePick(n, unidadeExibicao(m.unidade));
  }
  const un = (m.unidade ?? '').toUpperCase().replace('²', '2');
  if (un === 'M' || un === 'MT' || un === 'ML') {
    return formatQtdePick(n, 'm');
  }
  const metros = m2ParaMetros(n, larguraMmNecessidadeOp(m, op));
  const area = formatQtdePick(n, 'm²');
  if (metros == null) return area;
  return `${formatQtdePick(metros, 'm')} · ${area}`;
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

/** Rolo padrão de substrato quando o volume ainda não tem comprimento conferido. */
const METROS_BOBINA_PADRAO = 1000;

/** Bobinas que esta linha vai levar: as já baixadas, senão as sugeridas. */
function volumesQuantoFicha(m: OrdemProducaoMaterial): OpRetiradaVolume[] {
  const baixados = m.retirada?.volumes_baixados ?? [];
  if (baixados.length > 0) return baixados;
  return (m.retirada?.volumes ?? []).filter((v) => parseQtdeDigitada(v.qtde_retirar) > 0);
}

/** Comprimento real do volume. Sem conferência, o rolo padrão de 1.000 m. */
function metrosBobinaFicha(v: OpRetiradaVolume): number {
  const direto = parseQtdeDigitada(v.comprimento_m);
  return direto > 0 ? direto : METROS_BOBINA_PADRAO;
}

/**
 * Coluna Quanto da ficha. Bobina: o que a ordem pede e, na linha de baixo,
 * quantas bobinas e a soma dos metros lineares desses volumes.
 */
export function formatQuantoFicha(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): { pedido: string; volumes: string | null } {
  const pedido = necessidadeFicha(m, op);
  if (modoRetirada(m) !== 'volume') return { pedido, volumes: null };
  const vols = volumesQuantoFicha(m);
  if (vols.length === 0) return { pedido, volumes: null };
  const metros = vols.map(metrosBobinaFicha).reduce((a, b) => a + b, 0);
  const volumes =
    metros > 0
      ? `${formatVolumesPick(vols.length)} · ${formatQtdePick(metros, 'm')}`
      : formatVolumesPick(vols.length);
  return { pedido, volumes };
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

export type LocalOverlayEscolha = {
  rotulo: 'Sugerido' | 'No carrinho' | 'Local';
  locais: string[];
};

function enderecosDistintos(
  vols: Array<{ endereco?: { codigo?: string | null } | null }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of vols) {
    const end = v.endereco?.codigo?.trim() ?? '';
    if (!end || seen.has(end)) continue;
    seen.add(end);
    out.push(end);
  }
  return out;
}

/**
 * Local no overlay de escolha.
 * Sugestão FEFO enquanto o carrinho segue a proposta; endereços marcados quando o operador muda;
 * endereços baixados quando a linha já saiu. Sem endereço, não inventa código de lote.
 */
export function localOverlayEscolha(
  m: OrdemProducaoMaterial,
  escolhidos: OpRetiradaVolume[],
): LocalOverlayEscolha | null {
  if (modoRetirada(m) !== 'volume') return null;

  if (opKitEstado(m) === 'ja_saiu') {
    const locais = enderecosDistintos(m.retirada?.volumes_baixados ?? []);
    return locais.length > 0 ? { rotulo: 'Local', locais } : null;
  }
  if (opKitEstado(m) !== 'falta_pegar') return null;

  const sugeridos = (m.retirada?.volumes ?? []).filter((v) => v.lote_id && volumeSugerido(v));
  const idsSug = sugeridos
    .map((v) => v.lote_id)
    .filter((id): id is number => typeof id === 'number')
    .sort((a, b) => a - b);
  const idsEsc = escolhidos
    .map((v) => v.lote_id)
    .filter((id): id is number => typeof id === 'number')
    .sort((a, b) => a - b);
  const mesmaSugestao =
    idsEsc.length === idsSug.length && idsEsc.every((id, i) => id === idsSug[i]);

  if (escolhidos.length === 0 || mesmaSugestao) {
    const locais = enderecosDistintos(sugeridos);
    return locais.length > 0 ? { rotulo: 'Sugerido', locais } : null;
  }

  const locais = enderecosDistintos(escolhidos);
  return locais.length > 0 ? { rotulo: 'No carrinho', locais } : null;
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
