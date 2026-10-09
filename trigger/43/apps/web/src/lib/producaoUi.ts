/** Labels de status — Pedidos · OP (estudo trigger/32 GERACAO_PEDIDO + PRODUCAO_OPERACIONAL). */

/** Cadeia PED (Pedido::STATUSES) — ordem do pipeline operacional. */
export const PED_STATUSES = [
  'LIBERADO',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'FATURADO',
  'EM_ENTREGA',
  'ENTREGUE',
  'ENCERRADO',
  'CANCELADO',
] as const;

export type PedStatus = (typeof PED_STATUSES)[number];

const PED_LABELS: Record<string, string> = {
  LIBERADO: 'Liberado',
  EM_PRODUCAO: 'Em produção',
  PRODUZIDO: 'Produzido',
  FATURADO: 'Faturado',
  EM_ENTREGA: 'Em entrega',
  ENTREGUE: 'Entregue',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
};

const PED_ITEM_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_PRODUCAO: 'Em produção',
  PRODUZIDO: 'Produzido',
  CANCELADO: 'Cancelado',
};

const NEC_LABELS: Record<string, string> = {
  PRODUCAO: 'Produção',
  SERVICO: 'Serviço',
  REVENDA: 'Revenda',
};

const OP_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const MAT_LABELS: Record<string, string> = {
  PENDENTE: 'Falta pegar',
  REQUISITADO: 'Já saiu',
  AGUARDANDO_MATERIAL: 'Sem estoque',
};

const COMPONENTE_LABELS: Record<string, string> = {
  PAPEL: 'Papel',
  TUBETE: 'Tubete',
  CAIXA: 'Caixa',
  TINTA: 'Tinta',
  ACABAMENTO: 'Acabamento',
  MANUAL: 'Extra',
};

/** Ordem dos grupos em «O que sai do estoque» e na ficha impressa. */
export const OP_COMPONENTE_ORDEM = ['PAPEL', 'TINTA', 'ACABAMENTO', 'TUBETE', 'CAIXA', 'MANUAL'] as const;

/** Jornada humana da OP (kit → máquina → sobra → fechar). */
export type OpJornadaPasso = 'pegar' | 'entregar' | 'produzir' | 'devolver' | 'fechar';

/** Estado do item no kit — o que o chão precisa ver. */
export type OpKitEstado = 'falta_pegar' | 'ja_saiu' | 'sem_estoque';

export function pedStatusLabel(status: string): string {
  return PED_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function pedItemStatusLabel(status: string): string {
  return PED_ITEM_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function necessidadeLabel(necessidade: string): string {
  return NEC_LABELS[necessidade] ?? necessidade.replace(/_/g, ' ');
}

/** Rótulo comercial da posição no PED (contrato, não chão). */
export function necessidadeContratoLabel(necessidade: string): string {
  if (necessidade === 'PRODUCAO') return 'Etiqueta';
  return necessidadeLabel(necessidade);
}

export function opStatusLabel(status: string): string {
  return OP_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function opMaterialStatusLabel(status: string): string {
  return MAT_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function opComponenteLabel(componente: string | null | undefined): string {
  const key = (componente ?? '').trim().toUpperCase();
  if (!key) return 'Material';
  return COMPONENTE_LABELS[key] ?? key.charAt(0) + key.slice(1).toLowerCase();
}

/** Nome humano da linha do kit — o que a pessoa vai buscar. */
export function opKitNome(m: {
  componente?: string | null;
  origem_texto?: string | null;
  produto?: { descricao_fiscal?: string | null; codigo?: string | null } | null;
}): string {
  const papel = (m.origem_texto ?? '').trim();
  const humano = opComponenteLabel(m.componente);
  if (papel && humano === 'Papel') return papel;
  if (papel && humano !== 'Material') return `${humano} · ${papel}`;
  return (m.produto?.descricao_fiscal ?? '').trim() || humano;
}

/** Status operacional da linha de material (empenho leve × saldo). */
export function opMaterialLinhaStatus(m: {
  pendente?: boolean;
  aguardando_material?: boolean;
}): string {
  if (m.aguardando_material) return 'AGUARDANDO_MATERIAL';
  return m.pendente ? 'PENDENTE' : 'REQUISITADO';
}

export function opKitEstado(m: {
  pendente?: boolean;
  aguardando_material?: boolean;
}): OpKitEstado {
  if (m.aguardando_material && m.pendente !== false) return 'sem_estoque';
  return m.pendente ? 'falta_pegar' : 'ja_saiu';
}

export function opKitEstadoLabel(estado: OpKitEstado): string {
  if (estado === 'ja_saiu') return 'Já saiu';
  if (estado === 'sem_estoque') return 'Sem estoque';
  return 'Falta pegar';
}

/** Local sugerido ou já baixado — o “onde” do kit. */
export function opKitOnde(m: {
  retirada?: {
    volumes?: Array<{ endereco?: { codigo: string } | null; codigo?: string | null }>;
    volumes_baixados?: Array<{ endereco?: { codigo: string } | null; codigo?: string | null }>;
  } | null;
}): string {
  const vols = [
    ...(m.retirada?.volumes ?? []),
    ...(m.retirada?.volumes_baixados ?? []),
  ];
  for (const v of vols) {
    const end = v.endereco?.codigo?.trim();
    if (end) return end;
  }
  for (const v of vols) {
    const cod = v.codigo?.trim();
    if (cod) return cod;
  }
  return '—';
}

/** Resumo do kit na timeline do pedido. */
export function opMaterialResumoLabel(resumo: {
  total: number;
  pendentes: number;
  requisitados: number;
}): string {
  if (resumo.total <= 0) {
    return 'Sem kit';
  }
  if (resumo.pendentes === 0) {
    return `Já saiu (${resumo.requisitados}/${resumo.total})`;
  }
  if (resumo.requisitados === 0) {
    return `Falta pegar (${resumo.pendentes}/${resumo.total})`;
  }
  return `Parcial · ${resumo.requisitados} já saiu, ${resumo.pendentes} falta pegar`;
}

/**
 * Passo corrente da jornada humana.
 * Pegar → entregar → produzir. Devolver e fechar são a mesma porta (produção).
 */
export function opPassoAtual(op: {
  status: string;
  materiais?: Array<{ pendente?: boolean }> | null;
  handoff?: { entregue?: boolean } | null;
}): OpJornadaPasso {
  if (op.status === 'CONCLUIDA' || op.status === 'CANCELADA') {
    return 'fechar';
  }
  const mats = op.materiais ?? [];
  const temSaida = mats.some((m) => !m.pendente);
  if (!temSaida) {
    return 'pegar';
  }
  if (!op.handoff?.entregue) {
    return 'entregar';
  }
  return 'produzir';
}

/** Impõe teto na quantidade digitada (avaria ≤ requisitado). */
export function capQtdeAte(value: string, teto: number): string {
  if (value.trim() === '') return '';
  const n = parseQtdeDigitada(value);
  if (n <= 0) return value;
  if (teto >= 0 && n > teto) return String(teto);
  return value;
}

/** Quantidade digitada (aceita vírgula BR ou ponto). */
export function parseQtdeDigitada(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim().replace(/\s/g, '');
  if (raw === '') return 0;
  // 1.234,56 → 1234.56 | 1234,56 → 1234.56 | 1234.56 → 1234.56
  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Consumo de processo: requisitado − avaria (separação) − retorno − perda de processo. */
export function qtdeConsumidaApontada(
  requisitada: string | number,
  retorno: string | number,
  perda: string | number,
  avaria: string | number = 0,
): number {
  const r = parseQtdeDigitada(requisitada);
  const av = parseQtdeDigitada(avaria);
  const ret = parseQtdeDigitada(retorno);
  const p = parseQtdeDigitada(perda);
  return Math.max(0, r - av - ret - p);
}

export function ehMaterialProducao(m: {
  componente?: string | null;
  produto?: { familia?: string | null } | null;
}): boolean {
  return (
    (m.componente ?? '').toUpperCase() === 'PAPEL' ||
    (m.produto?.familia ?? '').toUpperCase() === 'MP'
  );
}

/**
 * Papel mínimo para a qtde boa.
 * Base = empenho (qtde planejada do papel), não a soma das baixas —
 * complementar cobre perda e não sobe a meta.
 */
export function papelMinimoParaQtdeBoa(
  empenhoPapel: string | number,
  qtdePlanejadaOp: string | number,
  qtdeBoa: string | number,
  tolPct: string | number,
): number {
  const empenho = parseQtdeDigitada(empenhoPapel);
  const planejada = parseQtdeDigitada(qtdePlanejadaOp);
  const boa = parseQtdeDigitada(qtdeBoa);
  const tol = parseQtdeDigitada(tolPct);
  if (empenho <= 0 || planejada <= 0 || boa <= 0) return 0;
  const necessario = empenho * (boa / planejada);
  return Math.max(0, necessario * (1 - tol / 100));
}

/** Porta do almoxarifado — confirmação física só na ficha (ADR coleta dirigida). */
export function hrefFichaEstoque(
  opId: number,
  q?: { materialId?: number; produtoId?: number; qtde?: string | number },
): string {
  const p = new URLSearchParams();
  if (q?.materialId) p.set('material_id', String(q.materialId));
  if (q?.produtoId) p.set('produto_id', String(q.produtoId));
  if (q?.qtde != null && String(q.qtde).trim() !== '') {
    const n = parseQtdeDigitada(q.qtde);
    if (n > 0) p.set('qtde', String(n));
  }
  const qs = p.toString();
  return `/estoque/retiradas/${opId}${qs ? `?${qs}` : ''}`;
}

/** Porta do chão — apontar retorno/perda e concluir (ADR apontamento). */
export function hrefApontamentoProducao(opId: number): string {
  return `/ordens-producao/apontamentos/${opId}`;
}
