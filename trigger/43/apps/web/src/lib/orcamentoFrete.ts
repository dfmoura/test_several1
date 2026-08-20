import { formatCurrency, formatDecimalBr, formatKmCarro, kmCarroEhZero } from './format';
import type { Parceiro } from './api';

export const MODO_RETIRAR = 'RETIRAR';
export const MODO_ENTREGAR = 'ENTREGAR';
export const ORIGEM_CALCULADA = 'CALCULADA';
export const ORIGEM_MANUAL = 'MANUAL';

export type ModoEntrega = typeof MODO_RETIRAR | typeof MODO_ENTREGAR;
export type OrigemFrete = typeof ORIGEM_CALCULADA | typeof ORIGEM_MANUAL;

const MOTIVO_LABEL: Record<string, string> = {
  retirar: 'Retirada no local — frete R$ 0',
  sem_km: 'Sem km da empresa até o destino. Use Posição e distância no cadastro do parceiro.',
  sem_peso: 'Cadastre o peso estimado por caixa na aba Frete do Catálogo ORC.',
  sem_faixa: 'Nenhuma faixa de peso ativa no catálogo (ou carga acima da última faixa).',
  sob_consulta: 'Faixa sem R$/km — frete sob consulta (não inventa valor).',
  manual: 'Valor informado nesta proposta — mesmo em todas as quantidades.',
  sem_valor: 'Informe o valor do frete (origem Manual).',
};

export function modoEntregaLabel(modo: string | null | undefined): string {
  return String(modo).toUpperCase() === MODO_ENTREGAR ? 'Entregar' : 'Retirar no local';
}

export function origemFreteLabel(origem: string | null | undefined): string | null {
  const s = String(origem ?? '').toUpperCase();
  if (s === ORIGEM_MANUAL) return 'Manual';
  if (s === ORIGEM_CALCULADA) return 'Calculada';
  return null;
}

export function freteMotivoLabel(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return MOTIVO_LABEL[motivo] ?? motivo;
}

export function formatValorFrete(value: string | number | null | undefined, somavel?: boolean): string {
  if (value == null || value === '') return '—';
  if (somavel === false && Number(value) === 0) return 'R$ 0,00';
  return formatCurrency(value);
}

type FaixaTotalProposta = {
  valor_total?: string | number | null;
  valor_total_com_faca?: string | number | null;
  valor_total_proposta?: string | number | null;
  valor_frete?: string | number | null;
  frete_somavel?: boolean;
};

/**
 * Total comercial da faixa: motor (+ faca nova) + frete somável.
 * Frete não entra no unitário. Cliente e prospect: mesma regra.
 */
export function totalPropostaFaixa(
  fx: FaixaTotalProposta,
  facaNova?: boolean,
  valorFacaNova?: string | number | null,
): number {
  if (fx.valor_total_proposta != null && fx.valor_total_proposta !== '') {
    const gravado = Number(fx.valor_total_proposta);
    if (Number.isFinite(gravado)) return gravado;
  }
  const motor = Number(fx.valor_total) || 0;
  const comFaca =
    fx.valor_total_com_faca != null && fx.valor_total_com_faca !== ''
      ? Number(fx.valor_total_com_faca) || 0
      : motor + (Number(valorFacaNova) || 0);
  const base = facaNova ? comFaca : motor;
  if (fx.frete_somavel && fx.valor_frete != null && fx.valor_frete !== '') {
    return base + (Number(fx.valor_frete) || 0);
  }
  return base;
}

export function formatKgFaixa(kgAte: string | number | null | undefined, acima?: boolean): string {
  if (acima || kgAte == null || kgAte === '') return 'Acima';
  return `Até ${formatDecimalBr(kgAte, 0)} kg`;
}

export function kmContextoParceiro(
  km: string | number | null | undefined,
  fonte?: string | null,
): string {
  return formatKmCarro(km, fonte) || '—';
}

function kmValido(km: string | number | null | undefined, empId: number | null, distanciaEmpresaId: number | null | undefined): boolean {
  return (
    distanciaEmpresaId === empId &&
    km != null &&
    String(km) !== '' &&
    !kmCarroEhZero(km)
  );
}

export function kmDestinoParceiro(p: Parceiro | null, empId: number | null): {
  km: string | number | null;
  fonte: string | null;
  label: string;
} | null {
  if (!p) return null;
  const entrega =
    (p.enderecos_entrega ?? []).find((e) => e.principal) ?? (p.enderecos_entrega ?? [])[0];
  if (entrega && kmValido(entrega.distancia_km, empId, entrega.distancia_empresa_id)) {
    return {
      km: entrega.distancia_km ?? null,
      fonte: entrega.distancia_fonte ?? null,
      label: `entrega${entrega.apelido ? ` (${entrega.apelido})` : ''}`,
    };
  }
  if (kmValido(p.distancia_km, empId, p.distancia_empresa_id)) {
    return {
      km: p.distancia_km ?? null,
      fonte: p.distancia_fonte ?? null,
      label: 'endereço fiscal',
    };
  }
  return null;
}

export function hintFreteEntregar(
  p: Parceiro | null,
  empId: number | null,
  catalogFrete?: {
    peso_caixa_kg?: string | number | null;
    faixas?: Array<{
      kg_ate: string | number | null;
      acima: boolean;
      preco_por_km: string | number | null;
      minimo_rs: string | number | null;
    }>;
  } | null,
): string {
  if (!p) return 'Escolha o parceiro. O km gravado no cadastro entra no fechamento — sem nova rota.';
  const dest = kmDestinoParceiro(p, empId);
  if (!dest) {
    return 'Sem km desta empresa até o destino. No cadastro do parceiro: Posição e distância, depois Salvar. Entregar não inventa km.';
  }
  const kmTxt = formatKmCarro(dest.km, dest.fonte) || 'km gravado';
  const peso = catalogFrete?.peso_caixa_kg;
  const faixas = catalogFrete?.faixas ?? [];
  const comTarifa = faixas.filter((f) => f.preco_por_km != null && String(f.preco_por_km) !== '');
  if (peso == null || Number(peso) <= 0) {
    return `${kmTxt} · ${dest.label}. Cadastre o peso da caixa na aba Frete do Catálogo — sem isso o frete não fecha.`;
  }
  if (comTarifa.length === 0) {
    return `${kmTxt} · ${dest.label}. Faixas ativas sem R$/km — frete sob consulta (não inventa valor).`;
  }
  const pesoTxt = formatDecimalBr(peso, 3);
  return `${kmTxt} · ${dest.label}. Peso est. = caixas × ${pesoTxt} kg escolhe a faixa. Fechamento: máx(mínimo, R$/km × km), teto para cima. Compõe o total; não entra no unitário.`;
}

export function hintFreteManual(): string {
  return 'Valor único desta proposta, igual em todas as quantidades. Não usa km nem faixa do catálogo. Fotografado no cálculo. Compõe o total; não entra no unitário. R$ 0 = entrega sem cobrança.';
}

export function explicarFechamentoFrete(
  fx: {
    kg_est?: string | number | null;
    faixa_frete_kg_ate?: string | number | null;
    preco_por_km?: string | number | null;
    minimo_rs?: string | number | null;
    valor_frete?: string | number | null;
    frete_somavel?: boolean;
  },
  km: string | number | null | undefined,
  origem?: string | null,
): string | null {
  if (String(origem ?? '').toUpperCase() === ORIGEM_MANUAL) {
    if (fx.valor_frete == null || fx.valor_frete === '') {
      return MOTIVO_LABEL.sem_valor;
    }
    return `${MOTIVO_LABEL.manual} ${formatCurrency(fx.valor_frete)}`;
  }
  if (!fx.frete_somavel || fx.valor_frete == null || fx.valor_frete === '') {
    return null;
  }
  if (km == null || String(km) === '' || kmCarroEhZero(km)) {
    return null;
  }
  const partes: string[] = [];
  if (fx.kg_est != null && String(fx.kg_est) !== '') {
    partes.push(`${formatDecimalBr(fx.kg_est, 3)} kg`);
  }
  partes.push(formatKgFaixa(fx.faixa_frete_kg_ate));
  const preco =
    fx.preco_por_km != null && String(fx.preco_por_km) !== ''
      ? `${formatCurrency(fx.preco_por_km)}/km`
      : 'R$/km';
  const minimo =
    fx.minimo_rs != null && String(fx.minimo_rs) !== ''
      ? formatCurrency(fx.minimo_rs)
      : 'R$ 0,00';
  partes.push(`máx(${minimo}, ${preco} × ${formatDecimalBr(km, 3)} km)`);
  partes.push(`= ${formatCurrency(fx.valor_frete)}`);
  return partes.join(' · ');
}
