export type DecisaoModeloCliente = 'APROVADO' | 'REPROVADO';

/** Verbo do link. A gravação vira APROVADO ou REPROVADO. */
export type AcaoModeloCliente = 'APROVAR' | 'REPROVAR';

export type ResumoModelosCliente = {
  total: number;
  aprovados: number;
  reprovados: number;
  pendentes: number;
};

export function decisaoModeloCliente(raw: unknown): DecisaoModeloCliente | null {
  return raw === 'APROVADO' || raw === 'REPROVADO' ? raw : null;
}

export function limparDecisaoModelo<T extends { decisao?: DecisaoModeloCliente | null; decidido_em?: string | null }>(
  row: T,
): T {
  if (row.decisao == null && row.decidido_em == null) return row;
  return { ...row, decisao: null, decidido_em: null };
}

export function contarDecisoesModelos(
  listas: Array<Array<{ nome?: string | null; decisao?: string | null }> | null | undefined>,
): ResumoModelosCliente {
  let aprovados = 0;
  let reprovados = 0;
  let pendentes = 0;
  for (const rows of listas) {
    for (const row of rows ?? []) {
      if (!String(row?.nome ?? '').trim()) continue;
      if (row.decisao === 'APROVADO') aprovados++;
      else if (row.decisao === 'REPROVADO') reprovados++;
      else pendentes++;
    }
  }
  return {
    total: aprovados + reprovados + pendentes,
    aprovados,
    reprovados,
    pendentes,
  };
}

export function textoResumoModelosCliente(resumo: ResumoModelosCliente | null | undefined): string | null {
  if (!resumo || resumo.total <= 0) return null;
  const partes: string[] = [];
  if (resumo.aprovados > 0) partes.push(`${resumo.aprovados} aprov.`);
  if (resumo.reprovados > 0) partes.push(`${resumo.reprovados} reprov.`);
  if (resumo.pendentes > 0) {
    partes.push(`${resumo.pendentes} pendente${resumo.pendentes > 1 ? 's' : ''}`);
  }
  return partes.length > 0 ? partes.join(' · ') : null;
}
