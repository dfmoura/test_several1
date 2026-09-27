import type { OpRetiradaPreview, OrdemProducao, OrdemProducaoMaterial } from './api';
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

export function modoRetiradaLabel(modo: ModoRetirada): string {
  return modo === 'volume' ? 'Por volumes' : 'Por unidades';
}

/** O que o operador lê primeiro: volumes (bobina) ou unidades (tubete, tinta, caixa). */
export function formatPickPrincipal(m: OrdemProducaoMaterial): string {
  if (modoRetirada(m) === 'volume') {
    const n = nVolumesSugeridos(m);
    if (n > 0) return formatVolumesPick(n);
    return 'Escolha volumes';
  }
  return formatQtdePick(qtdeLinhaPick(m), m.unidade);
}

export function qtdeLinhaPick(m: OrdemProducaoMaterial): number {
  return parseQtdeDigitada(m.qtde_planejada) || parseQtdeDigitada(m.qtde_requisitada);
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
