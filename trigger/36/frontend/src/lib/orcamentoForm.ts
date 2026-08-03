import type { ApiRow } from '../types';

export interface FaixaForm {
  quantidade: number;
  comissao_pct: number;
}

export interface OrcForm {
  cliente: string;
  parceiro_id: number | '';
  medida: string;
  largura_cm: number;
  puxada_cm: number;
  cores: string;
  papel: string;
  acabamento: string;
  modelos: number;
  colunas: number;
  etiq_por_rolo: number;
  tubete: string;
  z: number | '';
  maquina: string;
  maquina_roda_servico: string;
  imposto_pct: number;
  matriz: 'SIM' | 'NAO';
  coluna_rebobinacao: number;
  tipo_troca_produto: string;
  rpm: number;
  faixas: FaixaForm[];
  prazo_entrega_dias: number;
  validade_dias: number;
  tolerancia_qtd_pct: number;
  observacao: string;
  faca_formato: string;
  repeticao: number | '';
  faca_incompleta: boolean;
}

export const CORES_OPCOES = ['0', '1', '2', '3', '4', '4V', '5', '6', '7', '8'];

export const STATUS_EDITAVEL = new Set(['RASCUNHO', 'CALCULADO']);

export function isOrcEditavel(status: string | undefined | null): boolean {
  return STATUS_EDITAVEL.has(String(status || ''));
}

export function defaultOrcForm(catalog: ApiRow | null): OrcForm {
  const papeis = (catalog?.papeis as string[]) ?? [];
  const acabamentos = (catalog?.acabamentos as string[]) ?? [];
  const maquinas = (catalog?.maquinas as string[]) ?? [];
  return {
    cliente: '',
    parceiro_id: '',
    medida: '',
    largura_cm: 0,
    puxada_cm: 0,
    cores: '4',
    papel: papeis[0] ?? 'COUCHE',
    acabamento: acabamentos[0] ?? 'SEM ACABAMENTO',
    modelos: 1,
    colunas: 1,
    etiq_por_rolo: 1000,
    tubete: '1"',
    z: '',
    maquina: maquinas[0] ?? 'BETA',
    maquina_roda_servico: maquinas[0] ?? 'BETA',
    imposto_pct: (catalog?.imposto_pct_default as number) ?? 16,
    matriz: 'SIM',
    coluna_rebobinacao: 1,
    tipo_troca_produto: 'SEM PARADA',
    rpm: 1000,
    faixas: [
      { quantidade: 5000, comissao_pct: 3 },
      { quantidade: 10000, comissao_pct: 2.5 },
      { quantidade: 20000, comissao_pct: 2 },
    ],
    prazo_entrega_dias: 12,
    validade_dias: 7,
    tolerancia_qtd_pct: 20,
    observacao: '',
    faca_formato: '',
    repeticao: '',
    faca_incompleta: false,
  };
}

export function formFromSnapshot(snap: ApiRow | null | undefined, catalog: ApiRow | null): OrcForm {
  const base = defaultOrcForm(catalog);
  if (!snap) return base;
  const faixasRaw = (snap.faixas as FaixaForm[]) ?? base.faixas;
  return {
    ...base,
    cliente: String(snap.cliente ?? ''),
    parceiro_id: snap.parceiro_id == null || snap.parceiro_id === '' ? '' : Number(snap.parceiro_id),
    medida: String(snap.medida ?? ''),
    largura_cm: Number(snap.largura_cm) || 0,
    puxada_cm: Number(snap.puxada_cm) || 0,
    cores: String(snap.cores ?? base.cores),
    papel: String(snap.papel ?? base.papel),
    acabamento: String(snap.acabamento ?? base.acabamento),
    modelos: Number(snap.modelos) || 1,
    colunas: Number(snap.colunas) || 1,
    etiq_por_rolo: Number(snap.etiq_por_rolo) || 1000,
    tubete: String(snap.tubete ?? base.tubete),
    z: snap.z == null || snap.z === '' ? '' : Number(snap.z),
    maquina: String(snap.maquina ?? base.maquina),
    maquina_roda_servico: String(snap.maquina_roda_servico ?? snap.maquina ?? base.maquina_roda_servico),
    imposto_pct: Number(snap.imposto_pct) || base.imposto_pct,
    matriz: String(snap.matriz) === 'NAO' ? 'NAO' : 'SIM',
    coluna_rebobinacao: Number(snap.coluna_rebobinacao) || 1,
    tipo_troca_produto: String(snap.tipo_troca_produto ?? base.tipo_troca_produto),
    rpm: Number(snap.rpm) || 1000,
    faixas: faixasRaw.map((f) => ({
      quantidade: Number(f.quantidade) || 0,
      comissao_pct: Number(f.comissao_pct) || 0,
    })),
    prazo_entrega_dias: Number(snap.prazo_entrega_dias) || 12,
    validade_dias: Number(snap.validade_dias) || 7,
    tolerancia_qtd_pct: Number(snap.tolerancia_qtd_pct) || 20,
    observacao: String(snap.observacao ?? ''),
    faca_formato: '',
    repeticao: '',
    faca_incompleta: !snap.puxada_cm,
  };
}

export function payloadFromForm(form: OrcForm): Record<string, unknown> {
  return {
    cliente: form.cliente,
    parceiro_id: form.parceiro_id === '' ? null : form.parceiro_id,
    medida: form.medida,
    largura_cm: form.largura_cm,
    puxada_cm: form.puxada_cm,
    cores: form.cores,
    papel: form.papel,
    acabamento: form.acabamento,
    modelos: form.modelos,
    colunas: form.colunas,
    etiq_por_rolo: form.etiq_por_rolo,
    tubete: form.tubete,
    z: form.z === '' ? null : form.z,
    maquina: form.maquina,
    maquina_roda_servico: form.maquina_roda_servico || null,
    imposto_pct: form.imposto_pct,
    matriz: form.matriz,
    coluna_rebobinacao: form.coluna_rebobinacao,
    tipo_troca_produto: form.tipo_troca_produto,
    rpm: form.rpm,
    faixas: form.faixas,
    prazo_entrega_dias: form.prazo_entrega_dias,
    validade_dias: form.validade_dias,
    tolerancia_qtd_pct: form.tolerancia_qtd_pct,
    observacao: form.observacao || null,
  };
}
