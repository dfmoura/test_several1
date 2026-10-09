import type { OpRetiradaVolume, OrdemProducao, OrdemProducaoMaterial } from './api';
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
 * Mesmos grupos, os mesmos volumes gravados e a mesma conta de metragem.
 * Sem rascunho da tela, sem saldo vivo e sem a guia do orçamento.
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
  estado: OpKitEstado;
  valores: Partial<Record<FichaSaidaColunaId, string>>;
};

export type FichaSaidaMaterial = {
  id: number;
  chamada: string | null;
  linhas: FichaSaidaLinha[];
};

export type FichaSaidaGrupo = {
  key: string;
  label: string;
  colunas: FichaSaidaColuna[];
  materiais: FichaSaidaMaterial[];
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

type MaterialFicha = {
  chamada: string | null;
  linhas: FichaSaidaLinha[];
  colunas: Set<FichaSaidaColunaId>;
};

function materialFicha(m: OrdemProducaoMaterial, op: OrdemProducao): MaterialFicha {
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
  const colunas = new Set<FichaSaidaColunaId>(['produto', 'qtde', 'situacao']);

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
  const balanco = saldo ? textoBalancoSaida(saldo, jaSaiu) : null;
  const faixa = balanco
    ? `Precisa ${balanco.precisa} · ${balanco.marcadoRotulo} ${balanco.marcado} · ${balanco.coberturaRotulo} ${balanco.cobertura}`
    : null;

  const linhas: FichaSaidaLinha[] = [];

  if (porVolume && vols.length > 0) {
    colunas.add('volume');
    colunas.add('local');
    const polegada = ehTubete
      ? rotuloPolegada(m.origem_texto ?? m.produto?.descricao_comercial ?? m.produto?.descricao_fiscal)
      : null;
    const medidaCaixa = ehCaixa ? rotuloMedidaLinha(m.origem_texto) : null;
    const mostrarMedida = ehCaixa
      ? Boolean(medidaCaixa)
      : metragem || vols.some((vol) => Boolean(formatVolumeDimensao(vol)));
    if (polegada) colunas.add('polegada');
    if (mostrarMedida) colunas.add('medida');
    if (metragem) {
      colunas.add('m2');
      colunas.add('m');
    }
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
          qtde: qtdeTexto(qtde, unidadeExibicao(vol.unidade || un), jaSaiu),
          situacao,
        },
      });
    });
  } else if (!porVolume && !(estado === 'sem_estoque' && produtoId <= 0)) {
    const localSomenteLeitura = ehTubete || ehCaixa;
    const local =
      opcao?.local ?? (produtoId > 0 && produtoId === m.produto?.id ? m.local : null);
    const rotuloLocal = local?.nome?.trim() || local?.codigo?.trim() || '';
    const mostraLocal =
      !m.produto?.controla_lote &&
      Boolean(opcao || m.produto?.id) &&
      (!localSomenteLeitura || rotuloLocal !== '');
    if (mostraLocal) colunas.add('local');
    const detalhe = opcao?.detalhe?.trim() || '';
    if (detalhe && ehTubete) colunas.add('polegada');
    if (detalhe && ehCaixa) colunas.add('medida');
    const n = jaSaiu ? parseQtdeDigitada(m.qtde_requisitada) : qtdeLinhaPick(m);
    linhas.push({
      id: String(m.id),
      estado: estadoVisual,
      valores: {
        produto: nomeProdutoLinha(m.produto),
        ...(mostraLocal ? { local: rotuloLocal || 'Sem local' } : {}),
        ...(detalhe && ehTubete ? { polegada: detalhe } : {}),
        ...(detalhe && ehCaixa ? { medida: detalhe } : {}),
        qtde: qtdeTexto(n, un, jaSaiu),
        situacao,
      },
    });
  } else {
    const aviso = avisoSemLinha(m, {
      porVolume,
      volumeDireto,
      jaSaiu,
      produtoId,
      estado,
    });
    if (porVolume) colunas.add('volume');
    colunas.add('local');
    linhas.push({
      id: String(m.id),
      estado: estadoVisual,
      valores: {
        produto: aviso ? `${titulo} · ${aviso}` : titulo,
        ...(porVolume ? { volume: '—' } : {}),
        local: '—',
        qtde: '—',
        situacao,
      },
    });
  }

  const produtos = linhas.map((l) => l.valores.produto ?? '');
  const repeteTitulo = produtos.some((p) => p !== titulo && !p.startsWith(`${titulo} ·`));
  const chamada = faixa || repeteTitulo ? [titulo, faixa].filter(Boolean).join(' · ') : null;

  return { chamada, linhas, colunas };
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

export function fichaSaidaEstoque(op: OrdemProducao): FichaSaidaGrupo[] {
  const map = new Map<string, OrdemProducaoMaterial[]>();
  for (const m of op.materiais ?? []) {
    const key = (m.componente ?? 'OUTRO').trim().toUpperCase() || 'OUTRO';
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return [...map.keys()]
    .sort((a, b) => {
      const ia = OP_COMPONENTE_ORDEM.indexOf(a as (typeof OP_COMPONENTE_ORDEM)[number]);
      const ib = OP_COMPONENTE_ORDEM.indexOf(b as (typeof OP_COMPONENTE_ORDEM)[number]);
      if (ia === -1 && ib === -1) return a.localeCompare(b, 'pt-BR');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .map((key) => {
      const materiais = (map.get(key) ?? []).map((m) => ({ m, ficha: materialFicha(m, op) }));
      const usadas = new Set<FichaSaidaColunaId>();
      for (const item of materiais) {
        for (const id of item.ficha.colunas) usadas.add(id);
      }
      return {
        key,
        label: opComponenteLabel(key),
        colunas: COLUNAS.filter((c) => usadas.has(c.id)),
        materiais: materiais.map(({ m, ficha }) => ({
          id: m.id,
          chamada: ficha.chamada,
          linhas: ficha.linhas,
        })),
      };
    });
}
