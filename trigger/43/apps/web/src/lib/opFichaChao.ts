/**
 * Grão da ficha de chão unificada da OP — impressão, acabamento e retirada.
 * Satélite da ficha flexo retrato. Sem R$. Sem writer (confirmação em A buscar).
 * Produção: 1 linha por modelo (mesmo grão da planilha PED).
 * Retirada: volume a volume (kit da OP), bobina em metro linear + m².
 */
import type {
  OpRetiradaVolume,
  OrdemProducao,
  OrdemProducaoMaterial,
  Pedido,
  PedidoItem,
} from './api';
import { formatoLabel } from '../components/FacaShapeIcon';
import { formatDate, formatDecimalBr } from './format';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import {
  linhasComerciaisPlanilha,
  linhasProducaoPlanilhaPorModelo,
  type PedidoPlanilhaComercialLinha,
  type PedidoPlanilhaProducaoModeloLinha,
  type PedidoPlanilhaVisual,
} from './pedidoFichaPlanilha';
import {
  formatNecessidadeOp,
  formatQtdePick,
  formatVolumeDimensao,
  larguraMmParaMetro,
  leituraBobinaDaQtde,
  modoRetirada,
  opKitLinhasOrdenadas,
  unidadeExibicao,
  volumesParaEscolha,
} from './producaoPick';
import { specOperacional } from './producaoFicha';
import { opKitEstado, opKitNome, opKitOnde } from './producaoUi';
import { saidaEtiquetaLabelCurto } from './saidaEtiqueta';

export function itemPedidoDaOp(
  ordem: OrdemProducao,
  pedido: Pedido | null,
): PedidoItem | null {
  if (!pedido?.itens?.length) return null;
  const id = ordem.pedido_item?.id;
  if (id != null) {
    const found = pedido.itens.find((i) => i.id === id);
    if (found) return found;
  }
  /* Mesmo fallback da ficha flexo / materiais — OP quase sempre 1 item. */
  return pedido.itens[0] ?? null;
}

export function visualPlanilhaOf(pedido: Pedido, item: PedidoItem): PedidoPlanilhaVisual {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const saida = saidaEtiquetaLabelCurto(
    String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? ''),
  );
  const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
  const faca = formato
    ? `${formatoLabel(formato)}${spec.faca_nova ? ' · nova' : ''}`
    : null;
  return { saida: saida || null, faca };
}

/** Identidade do item (1 linha por modelo) — sem colunas de dinheiro. */
export function linhasIdentidadeChao(
  pedido: Pedido,
  item: PedidoItem,
): PedidoPlanilhaComercialLinha[] {
  return linhasComerciaisPlanilha(pedido, [item], (it) => visualPlanilhaOf(pedido, it));
}

/**
 * Parâmetros de máquina / produção — 1 linha por modelo.
 * Setup de faixa repete; rolos rateados (mesmo grão da planilha PED).
 */
export function linhasProducaoChao(
  pedido: Pedido,
  item: PedidoItem,
): PedidoPlanilhaProducaoModeloLinha[] {
  return linhasProducaoPlanilhaPorModelo(pedido, [item], (it) => visualPlanilhaOf(pedido, it));
}

/** Situação na retirada impressa — perda ≠ volume bom a levar. */
export type OpFichaChaoRetiradaSituacao = 'levar' | 'saiu' | 'perda';

/** Linha plana para caminhada na prateleira (volume a volume). */
export type OpFichaChaoRetiradaLinha = {
  key: string;
  local: string;
  volume: string;
  material: string;
  dimensao: string;
  /** Metro linear (bobina) ou qtde+unidade (demais). Perda = «PERDA». */
  levar: string;
  m2: string;
  validade: string;
  qr_payload: string | null;
  situacao: OpFichaChaoRetiradaSituacao;
};

function fmtLevar(qtde: number | string | null | undefined, unidade: string | null | undefined): string {
  const n = Number(qtde);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return formatQtdePick(n, unidadeExibicao(unidade));
}

function fmtNumChao(n: number): string {
  const scale = Math.abs(n - Math.round(n)) < 1e-6 ? 0 : 2;
  return formatDecimalBr(n, scale, { stripTrailingZeros: true });
}

function linhaRetiradaVazia(
  key: string,
  material: string,
  local: string,
  levar: string,
  situacao: OpFichaChaoRetiradaSituacao = 'levar',
): OpFichaChaoRetiradaLinha {
  return {
    key,
    local,
    volume: '—',
    material,
    dimensao: '—',
    levar,
    m2: '—',
    validade: '—',
    qr_payload: null,
    situacao,
  };
}

/**
 * Bobina (papel/filme): Levar = metro linear com sufixo "m";
 * M² = número puro (cabeçalho já diz a unidade — igual à coluna M² da impressão).
 * Tubete/caixa/UN: Levar = qtde + unidade de exibição; Dimensão/M² = —.
 */
function linhaRetiradaVolume(
  m: OrdemProducaoMaterial,
  v: OpRetiradaVolume,
  i: number,
  ordem: OrdemProducao,
  situacao: OpFichaChaoRetiradaSituacao,
): OpFichaChaoRetiradaLinha {
  const leitura = leituraBobinaDaQtde(v, v.qtde_retirar, larguraMmParaMetro(m, ordem));
  const bobina =
    modoRetirada(m) === 'volume' &&
    ((leitura.metros != null && leitura.metros > 0) || (leitura.m2 != null && leitura.m2 > 0));
  const levarBom = bobina
    ? leitura.metros != null && leitura.metros > 0
      ? formatQtdePick(leitura.metros, 'm')
      : '—'
    : fmtLevar(v.qtde_retirar, v.unidade ?? m.unidade);
  return {
    key: `${m.id}-${v.lote_id ?? v.codigo ?? i}`,
    local: (v.endereco?.codigo ?? '').trim() || '—',
    volume: (v.codigo ?? '').trim() || '—',
    material: opKitNome(m),
    dimensao: bobina ? formatVolumeDimensao(v) ?? '—' : '—',
    levar: situacao === 'perda' ? 'PERDA' : levarBom,
    m2:
      situacao === 'perda'
        ? '—'
        : bobina && leitura.m2 != null && leitura.m2 > 0
          ? fmtNumChao(leitura.m2)
          : '—',
    validade: v.data_validade ? formatDate(v.data_validade) : '—',
    // Perda: sem QR de caminhada — volume não volta / não se busca de novo.
    qr_payload: situacao === 'perda' ? null : (v.qr_payload ?? '').trim() || null,
    situacao,
  };
}

/**
 * Volumes a pegar (FEFO) ou já baixados — uma linha por volume.
 * Já saiu: perda marcada como PERDA; substituto/bom como saiu. Sem segundo writer.
 */
export function linhasRetiradaChao(ordem: OrdemProducao): OpFichaChaoRetiradaLinha[] {
  const out: OpFichaChaoRetiradaLinha[] = [];
  for (const m of opKitLinhasOrdenadas(ordem.materiais ?? [])) {
    const estado = opKitEstado(m);
    const nome = opKitNome(m);
    const vols =
      estado === 'ja_saiu'
        ? (m.retirada?.volumes_baixados ?? [])
        : volumesParaEscolha(m).filter((v) => Number(v.qtde_retirar) > 0 || v.sugerido);

    if (vols.length === 0) {
      if (estado === 'sem_estoque') {
        out.push(linhaRetiradaVazia(`${m.id}-sem`, nome, '—', 'Sem saldo'));
        continue;
      }
      const onde = opKitOnde(m);
      out.push(
        linhaRetiradaVazia(
          `${m.id}-saldo`,
          nome,
          onde === '—' ? 'Saldo' : onde,
          formatNecessidadeOp(m, ordem),
        ),
      );
      continue;
    }

    // Bom/substituto primeiro; perda no fim (auditoria, sem misturar com caminhada).
    const ordenados = [...vols].sort((a, b) => Number(Boolean(a.avariado)) - Number(Boolean(b.avariado)));
    ordenados.forEach((v, i) => {
      const situacao: OpFichaChaoRetiradaSituacao =
        estado === 'ja_saiu' ? (v.avariado ? 'perda' : 'saiu') : 'levar';
      out.push(linhaRetiradaVolume(m, v, i, ordem, situacao));
    });
  }
  return out;
}

export function opFichaChaoMeta(): {
  titulo: string;
  docLabel: string;
  secaoImpressao: string;
  hintImpressao: string;
  secaoAcabamento: string;
  secaoRetirada: string;
  hintRetirada: string;
  toolbarHint: string;
} {
  return {
    titulo: 'Ficha de chão',
    docLabel: 'Impressão · rebobinação · retirada · A4 paisagem',
    secaoImpressao: 'Impressão · máquina',
    hintImpressao: 'Largura do papel = largura × colunas de produção · 1 linha por modelo',
    secaoAcabamento: 'Acabamento · rebobinação',
    secaoRetirada: 'Retirada · prateleira',
    hintRetirada:
      'Bobina: Levar = metro linear. Marque Levado. Confirme a saída em A buscar. PERDA = volume estragado (não levar).',
    toolbarHint: 'Máquina e prateleira · A4 paisagem · sem preço',
  };
}
