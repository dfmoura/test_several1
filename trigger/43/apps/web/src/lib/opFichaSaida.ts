import type { OrdemProducao, OrdemProducaoMaterial, OpRetiradaVolume } from './api';
import {
  balancoMetragem,
  formatLeituraBobina,
  formatLotePick,
  formatQtdePick,
  formatVolumeDimensao,
  insumoComMetragem,
  larguraMmDoMaterial,
  modoRetirada,
  nomeProdutoLinha,
  qtdeLinhaPick,
  rotuloPolegada,
  rotuloProdutoVolume,
  textoBalancoSaida,
  unidadeExibicao,
  type TextoBalancoSaida,
} from './producaoPick';
import {
  OP_COMPONENTE_ORDEM,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  parseQtdeDigitada,
  type OpKitEstado,
} from './producaoUi';

/**
 * Leitura impressa de «O que sai do estoque».
 * Um bloco por item, com as colunas que a tela mostra para aquele item.
 * Quantidade na unidade do material. Apontado no orçamento entra no mesmo grupo.
 * Sem rascunho da tela e sem saldo vivo.
 */

export type FichaSaidaColunaId =
  | 'produto'
  | 'volume'
  | 'local'
  | 'polegada'
  | 'medida'
  | 'm2'
  | 'm'
  | 'qtde'
  | 'situacao';

export type FichaSaidaColuna = {
  id: FichaSaidaColunaId;
  label: string;
  title?: string;
  num?: boolean;
};

export type FichaSaidaLinha = {
  id: string;
  estado: FichaSaidaEstado;
  valores: Partial<Record<FichaSaidaColunaId, string>>;
};

export type FichaSaidaEstado = OpKitEstado | 'apontado';

export type FichaSaidaItem = {
  id: string;
  titulo: string;
  situacao: string;
  estado: FichaSaidaEstado;
  balanco: TextoBalancoSaida | null;
  /** Linha sem lote: o que o orçamento apontou. */
  precisa: string | null;
  motivo: string | null;
  aviso: string | null;
  colunas: FichaSaidaColuna[];
  linhas: FichaSaidaLinha[];
};

export type FichaSaidaGrupo = {
  key: string;
  label: string;
  colunas: FichaSaidaColuna[];
  itens: FichaSaidaItem[];
};

const COLUNAS: FichaSaidaColuna[] = [
  { id: 'produto', label: 'Produto' },
  { id: 'volume', label: 'Volume' },
  { id: 'local', label: 'Local' },
  { id: 'polegada', label: 'Polegada' },
  { id: 'medida', label: 'Medida' },
  { id: 'm2', label: 'm²', title: 'Metro quadrado', num: true },
  { id: 'm', label: 'm', title: 'Metro linear', num: true },
  { id: 'qtde', label: 'Qtde', num: true },
  { id: 'situacao', label: 'Situação' },
];

type ApontadoGuia = {
  componente: string;
  origem_texto: string;
  qtde?: string;
  unidade?: string;
  metragem?: string | null;
  motivo?: string;
};

function rotuloMedidaLinha(origem: string | null | undefined): string | null {
  const nums = (origem ?? '').match(/\d+/g) ?? [];
  if (nums.length < 2) return null;
  return nums.slice(0, 3).join('x');
}

function volumesMarcados(m: OrdemProducaoMaterial): OpRetiradaVolume[] {
  return (m.retirada?.volumes ?? []).filter(
    (v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0,
  );
}

function volumesQueSairam(m: OrdemProducaoMaterial): OpRetiradaVolume[] {
  const devolver = m.retirada?.volumes_a_devolver ?? [];
  if (devolver.length > 0) return devolver;
  return m.retirada?.volumes_baixados ?? [];
}

function qtdeTexto(n: number, unidade: string, jaSaiu: boolean): string {
  if (!(n > 0) && !jaSaiu) return '—';
  return formatQtdePick(Math.max(n, 0), unidade);
}

/** Mesma frase de «Apontado no orçamento» na tela. */
function textoApontado(a: ApontadoGuia): string {
  const n = parseQtdeDigitada(a.qtde);
  const metros = parseQtdeDigitada(a.metragem);
  const un = (a.unidade ?? '').toUpperCase();
  const area = un === 'M2' || un === 'M²';
  if (!(n > 0) && !(metros > 0)) return '—';
  if (area && metros > 0) return `${formatQtdePick(n, 'm²')} · ${formatQtdePick(metros, 'm')}`;
  if (area) return formatQtdePick(n, 'm²');
  return formatQtdePick(n, unidadeExibicao(a.unidade));
}

function colunasDe(usadas: Set<FichaSaidaColunaId>): FichaSaidaColuna[] {
  return COLUNAS.filter((c) => usadas.has(c.id));
}

function itemDeMaterial(m: OrdemProducaoMaterial, op: OrdemProducao): FichaSaidaItem {
  const estado = opKitEstado(m);
  const jaSaiu = estado === 'ja_saiu';
  const comp = (m.componente ?? '').toUpperCase();
  const ehTubete = comp === 'TUBETE';
  const ehCaixa = comp === 'CAIXA';
  const volumeDireto = Boolean(m.escolher_produto && comp === 'ACABAMENTO' && !jaSaiu);
  const produtoId = estado === 'sem_estoque' ? 0 : (m.produto?.id ?? 0);
  const opcao = (m.opcoes ?? []).find((o) => o.produto_id === produtoId) ?? null;
  const porVolume =
    volumeDireto || modoRetirada(m) === 'volume' || Boolean(m.escolher_produto && opcao?.controla_lote);
  const situacao =
    m.escolher_produto && !jaSaiu
      ? !volumeDireto && produtoId <= 0
        ? 'Escolher'
        : 'Falta pegar'
      : opKitEstadoLabel(estado);
  const estadoVisual: OpKitEstado = situacao === 'Falta pegar' ? 'falta_pegar' : estado;
  const un = unidadeExibicao(m.unidade || m.retirada?.unidade);
  const metragem = insumoComMetragem(m);
  const titulo = opKitNome(m);
  const usadas = new Set<FichaSaidaColunaId>();
  const vols = jaSaiu ? volumesQueSairam(m) : porVolume ? volumesMarcados(m) : [];
  const saldo = metragem
    ? balancoMetragem(
        m,
        op,
        vols.map((vol) => ({
          vol,
          qtde: jaSaiu
            ? parseQtdeDigitada(vol.qtde_retirar || vol.qtde_volume)
            : parseQtdeDigitada(vol.qtde_retirar),
        })),
      )
    : null;

  const linhas: FichaSaidaLinha[] = [];
  let aviso: string | null = null;

  if (porVolume && vols.length > 0) {
    usadas.add('produto');
    usadas.add('volume');
    usadas.add('local');
    usadas.add('qtde');
    const polegada = ehTubete
      ? rotuloPolegada(m.origem_texto ?? m.produto?.descricao_comercial ?? m.produto?.descricao_fiscal)
      : null;
    const medidaCaixa = ehCaixa ? rotuloMedidaLinha(m.origem_texto) : null;
    const mostrarMedida = ehCaixa
      ? Boolean(medidaCaixa)
      : metragem || vols.some((vol) => Boolean(formatVolumeDimensao(vol)));
    if (polegada) usadas.add('polegada');
    if (mostrarMedida) usadas.add('medida');
    if (metragem) {
      usadas.add('m2');
      usadas.add('m');
    }
    usadas.add('situacao');
    vols.forEach((vol, i) => {
      const qtde = jaSaiu
        ? parseQtdeDigitada(vol.qtde_retirar || vol.qtde_volume)
        : parseQtdeDigitada(vol.qtde_retirar);
      const leitura = metragem ? formatLeituraBobina(vol, qtde, larguraMmDoMaterial(m)) : null;
      const medidaVol = formatVolumeDimensao(vol);
      linhas.push({
        id: `${m.id}-${vol.lote_id ?? vol.codigo ?? i}`,
        estado: estadoVisual,
        valores: {
          produto: rotuloProdutoVolume(vol, m.produto),
          volume: vol.lote_id || vol.codigo ? formatLotePick(vol) : '—',
          local: vol.endereco?.codigo?.trim() || '—',
          ...(polegada ? { polegada } : {}),
          ...(mostrarMedida ? { medida: ehCaixa ? medidaCaixa || '—' : medidaVol || '—' } : {}),
          ...(metragem ? { m2: leitura?.m2 ?? '—', m: leitura?.metros ?? '—' } : {}),
          qtde: qtdeTexto(qtde, un, jaSaiu),
          situacao,
        },
      });
    });
  } else if (m.produto?.id || (!porVolume && !(estado === 'sem_estoque' && produtoId <= 0))) {
    usadas.add('produto');
    usadas.add('qtde');
    usadas.add('situacao');
    const localSomenteLeitura = ehTubete || ehCaixa;
    const local =
      opcao?.local ?? (produtoId > 0 && produtoId === m.produto?.id ? m.local : null);
    const rotuloLocal = local?.nome?.trim() || local?.codigo?.trim() || '';
    const mostraLocal =
      !m.produto?.controla_lote &&
      Boolean(opcao || m.produto?.id) &&
      (!localSomenteLeitura || rotuloLocal !== '');
    if (mostraLocal) usadas.add('local');
    const detalhe = opcao?.detalhe?.trim() || '';
    if (detalhe && ehTubete) usadas.add('polegada');
    if (detalhe && ehCaixa) usadas.add('medida');
    const n = jaSaiu ? parseQtdeDigitada(m.qtde_requisitada) : qtdeLinhaPick(m);
    linhas.push({
      id: String(m.id),
      estado: estadoVisual,
      valores: {
        produto: m.produto?.id ? nomeProdutoLinha(m.produto) : titulo,
        ...(mostraLocal ? { local: rotuloLocal || 'Sem local' } : {}),
        ...(detalhe && ehTubete ? { polegada: detalhe } : {}),
        ...(detalhe && ehCaixa ? { medida: detalhe } : {}),
        qtde: qtdeTexto(n, un, jaSaiu),
        situacao,
      },
    });
  } else {
    aviso = avisoSemLinha(m, { porVolume, volumeDireto, jaSaiu, produtoId, estado });
    usadas.add('produto');
    usadas.add('qtde');
    usadas.add('situacao');
    linhas.push({
      id: String(m.id),
      estado: estadoVisual,
      valores: {
        produto: aviso ? `${titulo} · ${aviso}` : titulo,
        qtde: qtdeTexto(qtdeLinhaPick(m), un, jaSaiu),
        situacao,
      },
    });
    aviso = null;
  }

  return {
    id: String(m.id),
    titulo,
    situacao,
    estado: estadoVisual,
    balanco: saldo ? textoBalancoSaida(saldo, jaSaiu) : null,
    precisa: null,
    motivo: null,
    aviso,
    colunas: colunasDe(usadas),
    linhas,
  };
}

function avisoSemLinha(
  m: OrdemProducaoMaterial,
  ctx: {
    porVolume: boolean;
    volumeDireto: boolean;
    jaSaiu: boolean;
    produtoId: number;
    estado: OpKitEstado;
  },
): string | null {
  if (ctx.porVolume && ctx.jaSaiu) return 'Já saiu da prateleira.';
  if (ctx.porVolume && ctx.volumeDireto) return null;
  if (ctx.porVolume && m.escolher_produto && ctx.produtoId > 0) return 'Nenhum volume nesta lista.';
  if (ctx.porVolume && ctx.estado === 'sem_estoque') return 'Sem saldo neste item.';
  if (ctx.porVolume) return 'Nenhum volume nesta lista.';
  if ((m.opcoes ?? []).length === 0 && m.escolher_produto) return 'Nenhum item com saldo.';
  return 'Sem saldo neste item.';
}

function itemDeApontado(a: ApontadoGuia, key: string): FichaSaidaItem {
  const titulo = opKitNome({ componente: a.componente, origem_texto: a.origem_texto });
  const situacao = a.motivo ? 'Sem cadastro' : 'Apontado no orçamento';
  return {
    id: `apontado-${key}-${a.origem_texto}`,
    titulo,
    situacao,
    estado: 'apontado',
    balanco: null,
    precisa: null,
    motivo: a.motivo?.trim() || null,
    aviso: null,
    colunas: colunasDe(new Set(['produto', 'qtde', 'situacao'])),
    linhas: [
      {
        id: `apontado-${key}-${a.origem_texto}`,
        estado: 'apontado',
        valores: { produto: titulo, qtde: textoApontado(a), situacao },
      },
    ],
  };
}

function grupoDe(key: string, itens: FichaSaidaItem[]): FichaSaidaGrupo {
  const usadas = new Set<FichaSaidaColunaId>();
  for (const item of itens) {
    for (const coluna of item.colunas) usadas.add(coluna.id);
  }
  return { key, label: opComponenteLabel(key), colunas: colunasDe(usadas), itens };
}

function ordemDaChave(key: string): number {
  const i = OP_COMPONENTE_ORDEM.indexOf(key as (typeof OP_COMPONENTE_ORDEM)[number]);
  return i === -1 ? OP_COMPONENTE_ORDEM.length : i;
}

function apontadosDaTela(op: OrdemProducao, presentes: Set<string>): ApontadoGuia[] {
  const lista: ApontadoGuia[] = [
    ...(op.disponibilidade?.componentes_nao_casados ?? []),
    ...(op.disponibilidade?.guia_apontada ?? []),
  ];
  return lista.filter((a) => !presentes.has((a.componente ?? '').trim().toUpperCase()));
}

export function fichaSaidaEstoque(op: OrdemProducao): FichaSaidaGrupo[] {
  const map = new Map<string, OrdemProducaoMaterial[]>();
  for (const m of op.materiais ?? []) {
    const key = (m.componente ?? 'OUTRO').trim().toUpperCase() || 'OUTRO';
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }

  const grupos: FichaSaidaGrupo[] = [...map.keys()]
    .sort((a, b) => ordemDaChave(a) - ordemDaChave(b) || a.localeCompare(b, 'pt-BR'))
    .map((key) => grupoDe(key, (map.get(key) ?? []).map((m) => itemDeMaterial(m, op))));

  const orfaos = new Map<string, FichaSaidaItem[]>();
  for (const a of apontadosDaTela(op, new Set(map.keys()))) {
    const key = (a.componente ?? 'OUTRO').trim().toUpperCase() || 'OUTRO';
    const arr = orfaos.get(key) ?? [];
    arr.push(itemDeApontado(a, key));
    orfaos.set(key, arr);
  }
  for (const key of [...orfaos.keys()].sort(
    (a, b) => ordemDaChave(a) - ordemDaChave(b) || a.localeCompare(b, 'pt-BR'),
  )) {
    grupos.push(grupoDe(key, orfaos.get(key) ?? []));
  }
  return grupos;
}
