import type { OrcamentoFaixaResult } from './api';
import { formatDecimalBr } from './format';
import {
  alocarQuantidadePorModelo,
  type ModeloComposicaoForm,
} from './orcamentoForm';

/**
 * Entrada mínima para a Guia de produção (ADR-039-ORC-004).
 * Vem do form (rascunho) ou de input_snapshot (ORC salvo).
 */
export type OrcGuiaProducaoEspec = {
  medida?: string | null;
  largura_cm?: number | string | null;
  puxada_cm?: number | string | null;
  cores?: string | number | null;
  papel?: string | null;
  acabamento?: string | null;
  maquina?: string | null;
  tubete?: string | null;
  etiq_por_rolo?: number | string | null;
  modelos?: number | string | null;
  colunas?: number | string | null;
  coluna_rebobinacao?: number | string | null;
  tipo_troca_produto?: string | null;
  rpm?: number | string | null;
  z?: number | string | null;
  faca_nova?: boolean | null;
  formato_faca?: string | null;
  matriz?: string | null;
  valor_faca_nova?: number | string | null;
};

export type GuiaProducaoGrupo =
  | 'ferramental'
  | 'material'
  | 'insumo'
  | 'embalagem'
  | 'maquina'
  | 'processo'
  | 'arte';

export type GuiaProducaoLinha = {
  grupo: GuiaProducaoGrupo;
  item: string;
  especificacao: string;
  quantidade: string;
  nota?: string;
};

export const GUIA_PRODUCAO_GRUPO_LABEL: Record<GuiaProducaoGrupo, string> = {
  ferramental: 'Ferramental',
  material: 'Material',
  insumo: 'Insumo',
  embalagem: 'Embalagem',
  maquina: 'Máquina',
  processo: 'Processo',
  arte: 'Artes / modelos',
};

function txt(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === '' ? fallback : s;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function qty(value: number | null | undefined, digits = 0, suffix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const body = formatDecimalBr(value, digits);
  return suffix ? `${body} ${suffix}` : body;
}

function cm(value: unknown): string {
  const n = num(value);
  if (n == null) return '—';
  return `${formatDecimalBr(n, 2)} cm`;
}

/**
 * Lista operacional do que será usado para produzir a faixa selecionada.
 * Só quantidades físicas — sem R$ (PRODUCAO §2.6 / ADR-039-ORC-004).
 */
export function buildGuiaProducaoLinhas(
  espec: OrcGuiaProducaoEspec | null | undefined,
  faixa: OrcamentoFaixaResult | null | undefined,
  modelosComposicao?: ModeloComposicaoForm[] | null,
): GuiaProducaoLinha[] {
  if (!espec || !faixa) return [];

  const linhas: GuiaProducaoLinha[] = [];
  const m2 = Number(faixa.m2) || 0;
  const perdaAcerto = Number(faixa.perda_acerto) || 0;
  const perdaBobina = Number(faixa.perda_bobina_m2) || 0;
  const perdaTroca = Number(faixa.perda_papel_troca_produto) || 0;
  const perdaAcab = Number(faixa.perda_acabamento) || 0;
  const papelTotal = m2 + perdaAcerto + perdaBobina + perdaTroca;
  const acabArea = m2 + perdaAcerto + perdaAcab;
  const tintaArea = m2 + perdaAcerto;
  const metragem = Number(faixa.metragem) || 0;
  const rolos = Number(faixa.rolos) || 0;
  const caixas = Number(faixa.qtde_caixas) || 0;
  const q = Number(faixa.quantidade) || 0;

  const medida = txt(espec.medida);
  const formato = txt(espec.formato_faca, '');
  const z = num(espec.z);
  const facaNova = Boolean(espec.faca_nova);
  const matrizFlag = String(espec.matriz ?? 'SIM').toUpperCase();
  const cobraMatrizHint = ['SIM', 'S', 'YES', 'TRUE', '1'].includes(matrizFlag);

  linhas.push({
    grupo: 'ferramental',
    item: facaNova ? 'Faca nova' : 'Faca',
    especificacao: [medida, formato || null, z != null ? `Z ${formatDecimalBr(z, 0)}` : null]
      .filter(Boolean)
      .join(' · '),
    quantidade: facaNova ? '1 un.' : 'conforme mapa',
    nota: facaNova
      ? 'Ferramental a fabricar / cotar (prazo extra na proposta).'
      : cobraMatrizHint
        ? 'Matriz conforme política do 1º pedido deste modelo.'
        : undefined,
  });

  linhas.push({
    grupo: 'material',
    item: 'Papel / filme',
    especificacao: [
      txt(espec.papel),
      `largura ${cm(espec.largura_cm)}`,
      `puxada ${cm(espec.puxada_cm)}`,
      `${txt(espec.colunas)} col.`,
    ].join(' · '),
    quantidade: qty(papelTotal, 2, 'm²'),
    nota: [
      `líquido ${qty(m2, 2, 'm²')}`,
      perdaAcerto > 0 ? `acerto ${qty(perdaAcerto, 2, 'm²')}` : null,
      perdaBobina > 0 ? `troca bobina ${qty(perdaBobina, 2, 'm²')}` : null,
      perdaTroca > 0 ? `troca arte ${qty(perdaTroca, 2, 'm²')}` : null,
      `metragem ${qty(metragem, 1, 'm')}`,
    ]
      .filter(Boolean)
      .join(' · '),
  });

  const cores = txt(espec.cores);
  if (cores !== '—' && cores !== '0') {
    linhas.push({
      grupo: 'insumo',
      item: 'Tinta',
      especificacao: `${cores} cor(es)`,
      quantidade: qty(tintaArea, 2, 'm² cobertos'),
      nota: 'Área de impressão (m² + acerto). Consumo real na OP.',
    });
  }

  const acab = txt(espec.acabamento);
  if (acab !== '—' && !/^sem\s/i.test(acab)) {
    linhas.push({
      grupo: 'insumo',
      item: 'Acabamento',
      especificacao: acab,
      quantidade: qty(acabArea, 2, 'm²'),
      nota:
        perdaAcab > 0
          ? `inclui perda de acabamento ${qty(perdaAcab, 2, 'm²')}`
          : undefined,
    });
  } else if (acab !== '—') {
    linhas.push({
      grupo: 'processo',
      item: 'Acabamento',
      especificacao: acab,
      quantidade: '—',
      nota: 'Sem material de acabamento adicional.',
    });
  }

  linhas.push({
    grupo: 'embalagem',
    item: 'Tubete',
    especificacao: txt(espec.tubete),
    quantidade: qty(rolos, 0, 'un.'),
    nota: `${txt(espec.etiq_por_rolo)} etiq./rolo · ${qty(q, 0, 'etiq.')}`,
  });

  linhas.push({
    grupo: 'embalagem',
    item: 'Caixa',
    especificacao: txt(faixa.caixa_medida, txt(espec.tubete)),
    quantidade: qty(caixas, 0, 'un.'),
    nota:
      Number(faixa.rolos_por_caixa) > 0
        ? `${qty(Number(faixa.rolos_por_caixa), 0, 'rolos/caixa')}`
        : undefined,
  });

  linhas.push({
    grupo: 'maquina',
    item: 'Máquina',
    especificacao: txt(espec.maquina),
    quantidade: qty(Number(faixa.hora_maq), 2, 'h'),
    nota: [
      num(espec.rpm) != null ? `${formatDecimalBr(num(espec.rpm)!, 0)} rpm` : null,
      Number(faixa.hora_troca_prod) > 0
        ? `troca produto ${qty(Number(faixa.hora_troca_prod), 2, 'h')}`
        : null,
      Number(faixa.hora_troca_bobina) > 0
        ? `troca bobina ${qty(Number(faixa.hora_troca_bobina), 2, 'h')}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
  });

  linhas.push({
    grupo: 'processo',
    item: 'Rebobinação',
    especificacao: `coluna reb. ${txt(espec.coluna_rebobinacao, '1')}`,
    quantidade: qty(metragem, 1, 'm lineares'),
    nota: txt(espec.tipo_troca_produto, '')
      ? `troca de produto: ${txt(espec.tipo_troca_produto)}`
      : undefined,
  });

  const modelos = (modelosComposicao ?? []).filter((m) => String(m.nome ?? '').trim() !== '');
  if (modelos.length > 0 && q > 0) {
    const aloc = alocarQuantidadePorModelo(q, modelos);
    for (const row of aloc) {
      linhas.push({
        grupo: 'arte',
        item: `Arte ${row.ordem}`,
        especificacao: row.nome,
        quantidade: qty(row.quantidade, 0, 'etiq.'),
        nota: `${formatDecimalBr(row.percentual, 2)}% da faixa`,
      });
    }
  } else {
    const nModelos = num(espec.modelos);
    if (nModelos != null && nModelos > 1) {
      linhas.push({
        grupo: 'arte',
        item: 'Modelos',
        especificacao: `${nModelos} artes (sem nomes no snapshot)`,
        quantidade: qty(nModelos, 0, 'un.'),
        nota: 'Detalhe a composição no ORC para produção.',
      });
    }
  }

  return linhas;
}

/** Extrai especificação a partir de input_snapshot / form parcial. */
export function especFromSnapshot(
  snap: Record<string, unknown> | null | undefined,
): OrcGuiaProducaoEspec {
  if (!snap) return {};
  return {
    medida: snap.medida as string | undefined,
    largura_cm: snap.largura_cm as number | string | undefined,
    puxada_cm: snap.puxada_cm as number | string | undefined,
    cores: snap.cores as string | number | undefined,
    papel: snap.papel as string | undefined,
    acabamento: snap.acabamento as string | undefined,
    maquina: snap.maquina as string | undefined,
    tubete: snap.tubete as string | undefined,
    etiq_por_rolo: snap.etiq_por_rolo as number | string | undefined,
    modelos: snap.modelos as number | string | undefined,
    colunas: snap.colunas as number | string | undefined,
    coluna_rebobinacao: snap.coluna_rebobinacao as number | string | undefined,
    tipo_troca_produto: snap.tipo_troca_produto as string | undefined,
    rpm: snap.rpm as number | string | undefined,
    z: snap.z as number | string | null | undefined,
    faca_nova: Boolean(snap.faca_nova),
    formato_faca: (snap.formato_faca as string | null | undefined) ?? null,
    matriz: snap.matriz as string | undefined,
    valor_faca_nova: snap.valor_faca_nova as number | string | undefined,
  };
}
