import type { OrdemProducaoMaterial } from './api';
import { parseQtdeDigitada } from './producaoUi';

/** Uma bobina física a devolver (refile ou sobra) a partir do plano. */
export type BobinaRetornoUi = {
  chave: string;
  lote_pai_id: number;
  tipo: 'refile' | 'sobra' | string;
  largura_mm: string;
  comprimento_m: string;
  area_m2: string;
  qtde: string;
  status: string;
  lote_id?: number | null;
};

/**
 * Desdobra partida_prevista pendente em 1 linha por corpo (refile e/ou sobra).
 * Fonte canônica da grade «O que volta» — nunca agrega as duas em um único volume.
 */
export function bobinasRetornoPendentes(m: OrdemProducaoMaterial): BobinaRetornoUi[] {
  const out: BobinaRetornoUi[] = [];
  for (const p of m.partida_prevista ?? []) {
    if (p.status !== 'pendente') continue;
    const lista = p.bobinas?.length
      ? p.bobinas
      : [
          ...(p.refile
            ? [
                {
                  chave: `${p.lote_pai_id}-refile`,
                  lote_pai_id: p.lote_pai_id,
                  tipo: 'refile',
                  largura_mm: String(p.refile.largura_mm ?? ''),
                  comprimento_m: String(p.refile.comprimento_m ?? ''),
                  area_m2: String(p.refile.area_m2 ?? p.refile.qtde ?? ''),
                  qtde: String(p.refile.qtde ?? ''),
                  status: p.status,
                },
              ]
            : []),
          ...(p.sobra
            ? [
                {
                  chave: `${p.lote_pai_id}-sobra`,
                  lote_pai_id: p.lote_pai_id,
                  tipo: 'sobra',
                  largura_mm: String(p.sobra.largura_mm ?? ''),
                  comprimento_m: String(p.sobra.comprimento_m ?? ''),
                  area_m2: String(p.sobra.area_m2 ?? p.sobra.qtde ?? ''),
                  qtde: String(p.sobra.qtde ?? ''),
                  status: p.status,
                },
              ]
            : []),
        ];
    for (const b of lista) {
      if (parseQtdeDigitada(b.qtde) <= 0) continue;
      out.push(b as BobinaRetornoUi);
    }
  }
  return out;
}

export function rotuloBobinaRetorno(tipo: string): string {
  return tipo === 'refile' ? 'Refile' : 'Sobra (Passa)';
}
