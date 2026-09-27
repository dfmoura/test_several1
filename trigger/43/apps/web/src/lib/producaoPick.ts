import type { OrdemProducao, OrdemProducaoMaterial } from './api';
import { formatDecimalBr } from './format';
import { opKitEstado, opKitNome, opKitOnde, parseQtdeDigitada } from './producaoUi';

/** Quantidade de chão — inteiro sem casa; senão 2. Não parece planilha. */
export function formatQtdePick(n: number, unidade: string): string {
  const decimals = Math.abs(n - Math.round(n)) < 1e-6 ? 0 : 2;
  return `${formatDecimalBr(n, decimals)} ${unidade}`;
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
