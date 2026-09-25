/**
 * Helpers da proposta comercial × itens (ADR_ORC_ITENS).
 * N=1: zero chrome multi. N>1: total do documento + acordeão por posição.
 */
import type { OrcamentoPropostaPublica } from './api';
import { normalizeTintas } from './modeloTintas';

export type OrcPropostaDescricao = NonNullable<OrcamentoPropostaPublica['descricao']>;
export type OrcPropostaFaixa = NonNullable<OrcamentoPropostaPublica['faixas']>[number];
export type OrcPropostaItem = NonNullable<OrcamentoPropostaPublica['itens']>[number];

export function isPropostaMultiItem(proposta: OrcamentoPropostaPublica): boolean {
  if (proposta.tipo_operacao === 'SERVICO') return false;
  return Array.isArray(proposta.itens) && proposta.itens.length > 1;
}

export function rotuloPropostaItem(ordem: number, rotulo?: string | null): string {
  const r = (rotulo ?? '').trim();
  return r ? `Item ${ordem} · ${r}` : `Item ${ordem}`;
}

export function totalPrimeiraFaixaItem(item: OrcPropostaItem): number {
  const fx0 = item.faixas?.[0];
  return fx0 ? Number(fx0.valor_total) || 0 : 0;
}

/** Monta descrição comercial a partir do snapshot do PED item. */
export function descricaoFromPedidoSpec(
  spec: Record<string, unknown> | null | undefined,
): OrcPropostaDescricao {
  const s = spec ?? {};
  const modelosRaw = Array.isArray(s.modelos_composicao) ? s.modelos_composicao : [];
  const modelos_composicao = modelosRaw
    .map((raw, i) => {
      const m = raw as Record<string, unknown>;
      const nome = String(m?.nome ?? '').trim();
      if (!nome) return null;
      return {
        ordem: Number(m.ordem) || i + 1,
        nome,
        percentual: Number(m.percentual) || 0,
        valor_arte: Math.max(0, Number(m.valor_arte) || 0),
        arte_url: String(m.arte_url ?? '').trim() || null,
        tintas: normalizeTintas(m.tintas),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m != null);

  return {
    medida: s.medida != null ? String(s.medida) : null,
    papel: s.papel != null ? String(s.papel) : null,
    acabamento: s.acabamento != null ? String(s.acabamento) : null,
    tubete: s.tubete != null ? String(s.tubete) : null,
    cores: s.cores != null ? String(s.cores) : null,
    etiq_por_rolo: s.etiq_por_rolo != null ? Number(s.etiq_por_rolo) : null,
    largura_cm: s.largura_cm != null ? Number(s.largura_cm) : null,
    puxada_cm: s.puxada_cm != null ? Number(s.puxada_cm) : null,
    formato_faca: s.formato_faca != null ? String(s.formato_faca) : null,
    faca_nova: Boolean(s.faca_nova),
    saida_etiqueta: s.saida_etiqueta != null ? String(s.saida_etiqueta) : null,
    modelos: s.modelos != null ? Number(s.modelos) : modelos_composicao.length || null,
    modelos_composicao: modelos_composicao.length > 0 ? modelos_composicao : null,
    tipo_servico: s.tipo_servico != null ? String(s.tipo_servico) : null,
    descricao_servico: s.descricao_servico != null ? String(s.descricao_servico) : null,
    material_cliente: s.material_cliente != null ? Boolean(s.material_cliente) : null,
    unidade: s.unidade != null ? String(s.unidade) : null,
    necessidade: s.necessidade != null ? String(s.necessidade) : null,
    produto_codigo: s.produto_codigo != null ? String(s.produto_codigo) : null,
    produto_descricao: s.produto_descricao != null ? String(s.produto_descricao) : null,
  };
}
