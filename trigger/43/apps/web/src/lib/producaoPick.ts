import type { OpRetiradaPreview, OpRetiradaVolume, OrdemProducao, OrdemProducaoMaterial } from './api';
import { formatDecimalBr } from './format';
import { opKitEstado, opKitNome, opKitOnde, parseQtdeDigitada } from './producaoUi';

/** Como o chão escolhe o que pegar — bobina, tubete e caixa com lote = volume; o resto = unidade. */
export type ModoRetirada = 'volume' | 'unidade';

const COMPONENTES_VOLUME = new Set(['PAPEL', 'TUBETE', 'CAIXA']);
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

/**
 * Payload de uma linha para POST /estoque/retiradas/{op}/confirmar (happy path FEFO).
 * Volume: volumes sugeridos; unidade: só qtde planejada (writer escolhe FEFO).
 */
export function linhaConfirmarSugerida(
  m: OrdemProducaoMaterial,
): {
  material_id: number;
  qtde: string;
  volumes?: { lote_id: number; qtde: string }[];
} | null {
  if (opKitEstado(m) !== 'falta_pegar') return null;
  const qtde = String(qtdeLinhaPick(m) || parseQtdeDigitada(m.retirada?.qtde));
  if (!(parseQtdeDigitada(qtde) > 0)) return null;
  if (modoRetirada(m) === 'volume') {
    const volumes = volumesFefoConfirm(m.retirada);
    if (volumes.length === 0) return null;
    const soma = volumes.reduce((acc, v) => acc + parseQtdeDigitada(v.qtde), 0);
    return { material_id: m.id, qtde: soma.toFixed(4), volumes };
  }
  return { material_id: m.id, qtde: parseQtdeDigitada(qtde).toFixed(4) };
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

function codigoUnidade(unidade: string | null | undefined): string {
  return (unidade ?? '').trim().toUpperCase().replace('²', '2').replace('Ç', 'C');
}

/**
 * Símbolo da unidade de estoque na tela.
 * O código do cadastro (M2, UN, KG) não aparece cru.
 */
export function unidadeExibicao(unidade: string | null | undefined): string {
  switch (codigoUnidade(unidade)) {
    case '':
    case 'UN':
    case 'PC':
      return 'un';
    case 'M2':
      return 'm²';
    case 'M':
    case 'MT':
    case 'ML':
      return 'm';
    case 'KG':
      return 'kg';
    case 'G':
      return 'g';
    case 'L':
      return 'L';
    case 'MIL':
      return 'mil';
    case 'CX':
      return 'cx';
    case 'PCT':
      return 'pct';
    case 'RL':
      return 'rl';
    default:
      return (unidade ?? '').trim();
  }
}

/**
 * Bobina cuja quantidade gravada é área.
 * MIL no SKU de volume continua área: o número não é milheiro.
 */
function qtdeGravadaEhArea(unidade: string | null | undefined): boolean {
  const n = codigoUnidade(unidade);
  return n === '' || n === 'M2' || n === 'MIL';
}

function unidadeEhLinear(unidade: string | null | undefined): boolean {
  const n = codigoUnidade(unidade);
  return n === 'M' || n === 'MT' || n === 'ML';
}

/** Bobina cujo estoque é metro linear: a quantidade é o comprimento do rolo. */
export function bobinaEmMetroLinear(m: OrdemProducaoMaterial): boolean {
  return modoRetirada(m) === 'volume' && unidadeEhLinear(m.unidade);
}

function formatMetrosDeRolo(qtde: number): string {
  const decimals = Math.abs(qtde - Math.round(qtde)) < 1e-6 ? 0 : 2;
  const numero = formatDecimalBr(qtde, decimals);
  const palavra = Math.abs(qtde - 1) < 1e-6 ? 'metro de rolo' : 'metros de rolo';
  return `${numero} ${palavra}`;
}

/** Metro linear que a OP precisa (m² planejado ÷ largura). Só bobina. */
export function metrosNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): number | null {
  if (modoRetirada(m) !== 'volume') return null;
  return m2ParaMetros(qtdeLinhaPick(m), larguraMmNecessidadeOp(m, op));
}

export type LeituraQtdeMaterial = {
  /** Quantidade na unidade de estoque do produto. */
  principal: string;
  /** Comprimento da etiqueta. Só bobina em área (m²). */
  complemento: string | null;
};

function complementoPista(qtde: number, pistaMm: number): string | null {
  const metros = m2ParaMetros(qtde, pistaMm);
  if (metros == null) return null;
  const metrosTxt = formatQtdePick(metros, 'm');
  if (pistaMm > 0) {
    return `${metrosTxt} de comprimento da etiqueta · largura ${formatDecimalBr(pistaMm, 0)} mm`;
  }
  return `${metrosTxt} de comprimento da etiqueta`;
}

/**
 * Quantidade na unidade de estoque do produto, mais a leitura de pista quando a bobina é área.
 * Metro linear vira “metros de rolo” (o comprimento). Quilograma não ganha m² ao lado. MIL em volume continua área.
 * Metros de pista ≠ comprimento do rolo quando a bobina é mais larga que a etiqueta.
 */
export function leituraQtdeMaterial(
  m: OrdemProducaoMaterial,
  op: OrdemProducao | null | undefined,
  qtde: number,
): LeituraQtdeMaterial {
  if (!(qtde > 0)) return { principal: '—', complemento: null };
  if (bobinaEmMetroLinear(m)) {
    return { principal: formatMetrosDeRolo(qtde), complemento: null };
  }
  const area = modoRetirada(m) === 'volume' && qtdeGravadaEhArea(m.unidade);
  if (!area) {
    return { principal: formatQtdePick(qtde, unidadeExibicao(m.unidade)), complemento: null };
  }
  return {
    principal: `${formatQtdePick(qtde, 'm²')} de área`,
    complemento: complementoPista(qtde, larguraMmNecessidadeOp(m, op)),
  };
}

function juntarLeitura(leitura: LeituraQtdeMaterial): string {
  return leitura.complemento ? `${leitura.principal} · ${leitura.complemento}` : leitura.principal;
}

/**
 * Qtde de material numa linha só. A unidade oficial vem na frente; a pista, depois.
 */
export function formatQtdeMaterial(
  m: OrdemProducaoMaterial,
  op: OrdemProducao | null | undefined,
  qtde: number,
): string {
  return juntarLeitura(leituraQtdeMaterial(m, op, qtde));
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
  if (bobinaEmMetroLinear(m)) {
    return formatMetrosDeRolo(n);
  }
  const metros = m2ParaMetros(n, larguraMmNecessidadeOp(m, op));
  const area = formatQtdePick(n, 'm²');
  if (metros == null) return area;
  return `${formatQtdePick(metros, 'm')} · ${area}`;
}

/** Comprimento do volume quando o lote ainda não tem metro conferido. */
const METROS_BOBINA_PADRAO = 1000;

/**
 * Bobina sai o volume inteiro. Cada um tem, em geral, 1.000 m.
 * A conta é do trabalho, não dos lotes que o FEFO sugeriu.
 * Sem a largura do rolo, não inventa quantas — a área sozinha não diz o número.
 */
function leituraBobinaInteira(m: OrdemProducaoMaterial, qtde: number): LeituraQtdeMaterial {
  const metrosVol = metrosPorVolume(m);
  const metrosTxt = formatQtdePick(metrosVol, 'm');
  const n = nBobinasParaCobrir(m, qtde, metrosVol);
  if (n == null) {
    return { principal: 'Bobina inteira', complemento: `de ${metrosTxt}` };
  }
  return {
    principal: formatVolumesPick(n),
    complemento: n === 1 ? `de ${metrosTxt}` : `de ${metrosTxt} cada`,
  };
}

/** Metro do rolo cheio. Retalho curto não muda o padrão de 1.000 m. */
function metrosPorVolume(m: OrdemProducaoMaterial): number {
  const cheios = comprimentosRoloCheio(m);
  if (cheios.length === 0) return METROS_BOBINA_PADRAO;
  const base = cheios[0];
  if (cheios.every((n) => Math.abs(n - base) < 0.51)) return base;
  return METROS_BOBINA_PADRAO;
}

function comprimentosRoloCheio(m: OrdemProducaoMaterial): number[] {
  return volumesParaEscolha(m)
    .map((v) => parseQtdeDigitada(v.comprimento_m))
    .filter((n) => n > 0 && Math.abs(n - METROS_BOBINA_PADRAO) <= 30);
}

/** Largura de um rolo cheio, senão a nominal do SKU. Nunca a pista da etiqueta. */
function larguraMmRoloCheio(m: OrdemProducaoMaterial): number {
  for (const v of volumesParaEscolha(m)) {
    const c = parseQtdeDigitada(v.comprimento_m);
    const cheio = c <= 0 || Math.abs(c - METROS_BOBINA_PADRAO) <= 30;
    const w = parseQtdeDigitada(v.largura_mm);
    if (cheio && w > 0) return w;
  }
  const sku = parseQtdeDigitada(m.produto?.largura_mm);
  if (sku > 0) return sku;
  for (const v of volumesParaEscolha(m)) {
    const w = parseQtdeDigitada(v.largura_mm);
    if (w > 0) return w;
  }
  return 0;
}

function nBobinasParaCobrir(
  m: OrdemProducaoMaterial,
  qtde: number,
  metrosVol: number,
): number | null {
  if (!(metrosVol > 0) || !(qtde > 0)) return null;
  if (unidadeEhLinear(m.unidade)) {
    return Math.max(1, Math.ceil(qtde / metrosVol - 1e-9));
  }
  if (!qtdeGravadaEhArea(m.unidade)) return null;
  const larguraMm = larguraMmRoloCheio(m);
  if (!(larguraMm > 0)) return null;
  const areaUma = (larguraMm / 1000) * metrosVol;
  if (!(areaUma > 0)) return null;
  return Math.max(1, Math.ceil(qtde / areaUma - 1e-9));
}

/**
 * Quanto a OP pede deste material (`qtde_planejada`), em duas leituras.
 * Bobina: quantas inteiras, com o metro de cada volume.
 */
export function leituraNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): LeituraQtdeMaterial {
  const n = qtdeLinhaPick(m);
  if (n <= 0) return { principal: 'Sem quantidade', complemento: null };
  if (modoRetirada(m) === 'volume') return leituraBobinaInteira(m, n);
  return leituraQtdeMaterial(m, op, n);
}

/**
 * Quanto a OP pede deste material (`qtde_planejada`).
 */
export function formatNecessidadeOp(
  m: OrdemProducaoMaterial,
  op?: OrdemProducao | null,
): string {
  return juntarLeitura(leituraNecessidadeOp(m, op));
}

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
  return formatQtdePick(qtdeVolumeTotal(v), unidadeExibicao(v.unidade || 'M2'));
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

export function nomeProdutoLinha(produto: {
  codigo?: string | null;
  descricao_fiscal?: string | null;
  descricao_comercial?: string | null;
} | null | undefined): string {
  const desc = (produto?.descricao_comercial ?? '').trim() || (produto?.descricao_fiscal ?? '').trim();
  const sku = (produto?.codigo ?? '').trim();
  if (sku && desc) return `${sku} — ${desc}`;
  return desc || sku || '—';
}

export function rotuloProdutoVolume(
  v: OpRetiradaVolume | undefined,
  fallback?: { codigo?: string | null; descricao_fiscal?: string | null; descricao_comercial?: string | null } | null,
): string {
  const sku = (v?.sku ?? '').trim();
  const desc = (v?.descricao ?? '').trim();
  if (sku && desc) return `${sku} — ${desc}`;
  if (desc || sku) return desc || sku;
  return nomeProdutoLinha(fallback);
}

/**
 * m² e metro linear da quantidade que sai deste volume.
 * A quantidade em m² escala o comprimento do rolo; em metro, a área sai da largura.
 */
export function leituraBobinaDaQtde(
  v: OpRetiradaVolume,
  qtdeInformada: string | number,
  larguraMmFallback = 0,
): { m2: number | null; metros: number | null } {
  const qtde = typeof qtdeInformada === 'number' ? qtdeInformada : parseQtdeDigitada(qtdeInformada);
  const largura = parseQtdeDigitada(v.largura_mm) || larguraMmFallback;
  const comprimento = parseQtdeDigitada(v.comprimento_m);
  const total = qtdeVolumeTotal(v);

  if (unidadeEhLinear(v.unidade)) {
    const metros = qtde > 0 ? qtde : comprimento > 0 ? comprimento : null;
    const m2 = metros != null && largura > 0 ? (largura / 1000) * metros : null;
    return { m2, metros };
  }

  if (qtdeGravadaEhArea(v.unidade)) {
    const m2 = qtde > 0 ? qtde : null;
    let metros: number | null = null;
    if (comprimento > 0 && total > 0 && qtde > 0) {
      metros = comprimento * (qtde / total);
    } else if (m2 != null && largura > 0) {
      metros = m2 / (largura / 1000);
    }
    return { m2, metros };
  }

  if (largura > 0 && comprimento > 0) {
    const fator = total > 0 && qtde > 0 ? Math.min(qtde / total, 1) : qtde > 0 ? 1 : 0;
    if (fator <= 0) return { m2: null, metros: null };
    return { m2: (largura / 1000) * comprimento * fator, metros: comprimento * fator };
  }

  return { m2: null, metros: null };
}

export function formatLeituraBobina(
  v: OpRetiradaVolume,
  qtdeInformada: string | number,
  larguraMmFallback = 0,
): { m2: string | null; metros: string | null } {
  const leitura = leituraBobinaDaQtde(v, qtdeInformada, larguraMmFallback);
  return {
    m2: leitura.m2 != null && leitura.m2 > 0 ? formatQtdePick(leitura.m2, 'm²') : null,
    metros: leitura.metros != null && leitura.metros > 0 ? formatQtdePick(leitura.metros, 'm') : null,
  };
}

export type BalancoMetragem = {
  precisaM2: number;
  precisaM: number | null;
  escolhidoM2: number;
  escolhidoM: number | null;
  faltaM2: number;
  faltaM: number | null;
  passaM2: number;
  passaM: number | null;
};

/**
 * Necessidade da bobina em m² e metro linear da ordem, menos o que já está na escolha.
 * O metro linear da ordem usa a largura da etiqueta. A escolha abate os dois na mesma base.
 */
export function balancoMetragem(
  m: OrdemProducaoMaterial,
  op: OrdemProducao | null | undefined,
  linhas: Array<{ vol?: OpRetiradaVolume; qtde: string | number }>,
): BalancoMetragem | null {
  if (!insumoComMetragem(m)) return null;
  const qtde = qtdeLinhaPick(m);
  if (!(qtde > 0)) return null;
  const largura = larguraMmNecessidadeOp(m, op);
  const linear = bobinaEmMetroLinear(m);
  const precisaM = linear ? qtde : m2ParaMetros(qtde, largura);
  const precisaM2 = linear ? (largura > 0 ? (largura / 1000) * qtde : 0) : qtde;

  let escolhidoM2 = 0;
  let escolhidoMdireto = 0;
  for (const linha of linhas) {
    const qtdeLinha = typeof linha.qtde === 'number' ? linha.qtde : parseQtdeDigitada(linha.qtde);
    if (!(qtdeLinha > 0)) continue;
    if (!linha.vol) {
      if (linear) escolhidoMdireto += qtdeLinha;
      else if (qtdeGravadaEhArea(m.unidade)) escolhidoM2 += qtdeLinha;
      continue;
    }
    const leitura = leituraBobinaDaQtde(linha.vol, qtdeLinha, larguraMmDoMaterial(m));
    if (linear) {
      if (leitura.metros != null && leitura.metros > 0) escolhidoMdireto += leitura.metros;
      else escolhidoMdireto += qtdeLinha;
      continue;
    }
    if (leitura.m2 != null && leitura.m2 > 0) escolhidoM2 += leitura.m2;
    else if (qtdeGravadaEhArea(m.unidade)) escolhidoM2 += qtdeLinha;
  }
  const escolhidoM = linear ? escolhidoMdireto : largura > 0 ? escolhidoM2 / (largura / 1000) : null;
  if (linear && largura > 0) escolhidoM2 = (largura / 1000) * escolhidoMdireto;

  const faltaM2 = precisaM2 > 1e-4 ? Math.max(0, precisaM2 - escolhidoM2) : 0;
  const passaM2 = precisaM2 > 1e-4 ? Math.max(0, escolhidoM2 - precisaM2) : 0;
  const faltaM = precisaM == null || escolhidoM == null ? null : Math.max(0, precisaM - escolhidoM);
  const passaM = precisaM == null || escolhidoM == null ? null : Math.max(0, escolhidoM - precisaM);

  return {
    precisaM2,
    precisaM,
    escolhidoM2,
    escolhidoM,
    faltaM2,
    faltaM,
    passaM2,
    passaM,
  };
}

export function rotuloPolegada(raw: string | null | undefined): string | null {
  switch (chavePolegada(raw)) {
    case '1':
      return '1"';
    case '1.5':
      return '1 1/2"';
    case '3':
      return '3"';
    default:
      return null;
  }
}

/** Mesma chave do motor (`InsumoEscolhaRelacao`): 1 | 1.5 | 3. */
export function chavePolegada(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim().replace(/[″”]/g, '"');
  if (!t) return null;
  const fold = t.toUpperCase();
  if (/1\s*1\s*\/\s*2|1[,.]\s*5/.test(t)) return '1.5';
  if (/(^|[^0-9])3\s*(?:"|POL)/.test(fold) || /^3\s*"?$/.test(t.trim())) return '3';
  if (/(^|[^0-9])1\s*(?:"|POL)/.test(fold) || /^1\s*"?$/.test(t.trim())) return '1';
  if (/(^|[^0-9])76\s*MM/.test(fold)) return '3';
  if (/(^|[^0-9])40\s*MM/.test(fold)) return '1.5';
  if (/(^|[^0-9])25\s*MM/.test(fold)) return '1';
  return null;
}

function gruposMedida(texto: string): string[] {
  return texto.match(/\d+/g) ?? [];
}

function caixaCompativel(medida: string, texto: string): boolean {
  const precisa = gruposMedida(medida);
  if (precisa.length === 0) return false;
  const tem = gruposMedida(texto);
  if (tem.length < precisa.length) return false;
  for (let i = 0; i <= tem.length - precisa.length; i++) {
    if (precisa.every((n, j) => tem[i + j] === n)) return true;
  }
  return false;
}

function parece(v: OpRetiradaVolume, ...trechos: string[]): boolean {
  const texto = `${v.sku ?? ''} ${v.descricao ?? ''}`.toUpperCase();
  return trechos.some((t) => texto.includes(t));
}

/**
 * Papel e demais bobinas: qualquer volume do catálogo da linha.
 * Tubete: a polegada aprovada. Caixa: a medida aprovada. O SKU da linha sempre entra.
 */
export function volumeCabeNaLinha(m: OrdemProducaoMaterial, v: OpRetiradaVolume): boolean {
  const comp = (m.componente ?? '').trim().toUpperCase();
  if (comp !== 'TUBETE' && comp !== 'CAIXA') return true;
  if (m.produto?.id && v.produto_id && v.produto_id === m.produto.id) return true;
  if (!v.produto_id) return true;
  if (comp === 'TUBETE') {
    if (!parece(v, 'TUBETE', 'EMB-TUB')) return false;
    const aprovada =
      chavePolegada(m.origem_texto) ??
      chavePolegada(m.produto?.descricao_comercial) ??
      chavePolegada(m.produto?.descricao_fiscal);
    if (!aprovada) return false;
    return chavePolegada(`${v.sku ?? ''} ${v.descricao ?? ''}`) === aprovada;
  }
  if (!parece(v, 'CAIXA', 'EMB-CX')) return false;
  return caixaCompativel(m.origem_texto ?? '', `${v.sku ?? ''} ${v.descricao ?? ''}`);
}

export function insumoComMetragem(m: OrdemProducaoMaterial): boolean {
  const comp = (m.componente ?? '').trim().toUpperCase();
  if (comp === 'TUBETE' || comp === 'CAIXA') return false;
  return modoRetirada(m) === 'volume';
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
    v.sku,
    v.descricao,
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

/** Marca de volume na porta A separar / pick compartilhado (BL-119). */
export type VolumePickMarca = {
  lote_id: number;
  qtde: string;
  marcado: boolean;
  lido?: boolean;
};

function qtdePickLegivel(raw: string | null | undefined): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw ?? '';
  return String(n);
}

/** Monta marcas a partir do preview FEFO (sugeridos + candidatos). */
export function marcasDePreviewVolumes(
  volumes: OpRetiradaVolume[],
  candidatos: OpRetiradaVolume[] = [],
): VolumePickMarca[] {
  const sugeridos = volumes.filter((v) => v.lote_id);
  const outros = candidatos.filter(
    (c) => c.lote_id && !sugeridos.some((s) => s.lote_id === c.lote_id),
  );
  const de = (vols: OpRetiradaVolume[], sugerido: boolean): VolumePickMarca[] =>
    vols.map((v) => ({
      lote_id: v.lote_id as number,
      qtde: qtdePickLegivel(
        sugerido && Number(v.qtde_retirar) > 0 ? v.qtde_retirar : (v.qtde_volume ?? v.qtde_retirar),
      ),
      marcado: sugerido && Number(v.qtde_retirar) > 0,
    }));
  return [...de(sugeridos, true), ...de(outros, false)];
}

/** Caminhada do almoxarifado: volumes com local primeiro, ordenados pelo código. */
export function ordenarMarcasPorLocal<T extends { lote_id: number }>(
  marcas: T[],
  localDe: (loteId: number) => string | null | undefined,
): T[] {
  return [...marcas].sort((a, b) => {
    const ea = localDe(a.lote_id) ?? '';
    const eb = localDe(b.lote_id) ?? '';
    if (!ea && eb) return 1;
    if (ea && !eb) return -1;
    return ea.localeCompare(eb, 'pt-BR');
  });
}

/**
 * Semântica do pick: `debita` = confirmação grava MOV (A buscar);
 * `snapshot` = só registra no PED (A separar). Não funde endpoints.
 */
export type VolumePickModo = 'debita' | 'snapshot';
