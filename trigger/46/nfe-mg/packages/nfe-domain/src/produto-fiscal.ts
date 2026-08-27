import type { AptidacaoFiscal, Produto } from './entities.js';
import { CST_IBS_CBS_OPTIONS, cstFromCclassTrib } from './catalogos.js';

export type ProdutoFiscalAttrs = Partial<Produto>;

const CST_IBS_SET: Set<string> = new Set(CST_IBS_CBS_OPTIONS.map((c) => c.codigo));

/**
 * Avalia produto para emissão clássica (ICMS/PIS/COFINS) e prontidão reforma (IBS/CBS/IS).
 * Não bloqueia cadastro parcial — orquestra checklist e UX de pendências.
 */
export function evaluateProdutoFiscal(attrs: ProdutoFiscalAttrs): AptidacaoFiscal {
  const pendencias: string[] = [];
  const pendenciasEmissao: string[] = [];
  const pendenciasReforma: string[] = [];

  const codigo = (attrs.codigo ?? '').trim();
  const descricao = (attrs.descricao ?? attrs.descricaoFiscal ?? '').trim();
  const ncm = (attrs.ncm ?? '').replace(/\D/g, '');
  const cfop = (attrs.cfop ?? '').replace(/\D/g, '');
  const origem = attrs.origem ?? '';

  if (!codigo) pendencias.push('Código interno');
  if (!descricao) pendencias.push('Descrição fiscal');
  if (ncm.length !== 8) pendencias.push('NCM (8 dígitos)');
  if (cfop.length !== 4) pendencias.push('CFOP de saída (4 dígitos)');
  if (!/^[0-8]$/.test(origem)) pendencias.push('Origem da mercadoria (0–8)');

  const completo = pendencias.length === 0;
  const ativo = attrs.ativo ?? true;
  if (!ativo) pendenciasEmissao.push('Produto precisa estar ativo');

  // Regime atual: CSOSN (Simples) ou CST ICMS (normal) — ao menos um para emitir com segurança.
  if (!attrs.csosn && !attrs.cst) {
    pendenciasEmissao.push('Informe CSOSN (Simples) ou CST ICMS (regime normal)');
  }

  // Reforma IBS/CBS (LC 214 / IT 2025.002)
  const cclass = (attrs.cclassTrib ?? '').replace(/\D/g, '');
  const cstIbs = (attrs.cstIbsCbs ?? '').replace(/\D/g, '');

  if (!cclass && !cstIbs) {
    pendenciasReforma.push('CST IBS/CBS ou cClassTrib (reforma tributária)');
  } else {
    if (cclass && cclass.length !== 6) {
      pendenciasReforma.push('cClassTrib deve ter 6 dígitos');
    }
    if (cclass && cclass.length >= 3) {
      const fromClass = cstFromCclassTrib(cclass)!;
      if (cstIbs && cstIbs !== fromClass) {
        pendenciasReforma.push(`CST IBS/CBS (${cstIbs}) diverge dos 3 primeiros dígitos de cClassTrib (${fromClass})`);
      }
      if (!CST_IBS_SET.has(fromClass) && !CST_IBS_SET.has(cstIbs)) {
        pendenciasReforma.push('CST IBS/CBS fora do catálogo conhecido');
      }
    }
    if (cstIbs && cstIbs.length !== 3) {
      pendenciasReforma.push('CST IBS/CBS deve ter 3 dígitos');
    }
  }

  if (attrs.sujeitoIs) {
    if (!attrs.cstIs) pendenciasReforma.push('CST do Imposto Seletivo (produto sujeito a IS)');
    if (attrs.aliquotaIs == null) pendenciasReforma.push('Alíquota do Imposto Seletivo');
  }

  // PIS/COFINS preparação Lucro Real — aviso reforma/regime, não bloqueia Simples.
  if (!attrs.cstPis || !attrs.cstCofins) {
    pendenciasReforma.push('CST PIS/COFINS (preparação regime normal / transição)');
  }

  return {
    completo,
    aptoEmissaoNfe: completo && pendenciasEmissao.length === 0,
    aptoReforma: completo && pendenciasReforma.length === 0,
    pendencias,
    pendenciasEmissao,
    pendenciasReforma,
  };
}

/** Ao informar cClassTrib, preenche CST IBS/CBS automaticamente. */
export function syncCclassTribCst(input: {
  cclassTrib?: string | null;
  cstIbsCbs?: string | null;
}): { cclassTrib?: string; cstIbsCbs?: string } {
  const cclass = input.cclassTrib?.replace(/\D/g, '') || undefined;
  let cst = input.cstIbsCbs?.replace(/\D/g, '') || undefined;
  if (cclass && cclass.length >= 3) {
    const derived = cstFromCclassTrib(cclass);
    if (derived) cst = derived;
  }
  return {
    cclassTrib: cclass && cclass.length > 0 ? cclass.slice(0, 6) : undefined,
    cstIbsCbs: cst && cst.length > 0 ? cst.slice(0, 3).padStart(3, '0') : undefined,
  };
}
