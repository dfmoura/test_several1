import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LocalSaldoCampo } from './LocalSaldoCampo';
import { SeparacaoVolumesOverlay } from './SeparacaoVolumesOverlay';
import {
  ApiError,
  api,
  type OpInsumoOpcao,
  type OpRetiradaVolume,
  type OrdemProducao,
  type OrdemProducaoMaterial,
} from '../lib/api';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import {
  balancoMetragem,
  formatLeituraBobina,
  textoBalancoSaida,
  formatLotePick,
  formatQtdePick,
  formatVolumeDimensao,
  insumoComMetragem,
  larguraMmDoMaterial,
  linhaConfirmarSugerida,
  modoRetirada,
  nomeProdutoLinha,
  qtdeLinhaPick,
  qtdeVolumeTotal,
  rotuloPolegada,
  rotuloProdutoVolume,
  unidadeExibicao,
  volumeCabeNaLinha,
  volumesParaEscolha,
  type VolumePickMarca,
} from '../lib/producaoPick';
import {
  hrefFichaEstoque,
  OP_COMPONENTE_ORDEM,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  parseQtdeDigitada,
} from '../lib/producaoUi';

type VolumeLinha = { lote_id: number; qtde: string };

type Props = {
  op: OrdemProducao;
  podeEstoque: boolean;
  canWrite: boolean;
  onOp: (data: OrdemProducao) => void;
};

function volumesIniciais(m: OrdemProducaoMaterial): VolumeLinha[] {
  return (m.retirada?.volumes ?? [])
    .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
    .map((v) => ({
      lote_id: v.lote_id as number,
      qtde: String(parseQtdeDigitada(v.qtde_retirar)),
    }));
}

function qtdeUnidadeInicial(m: OrdemProducaoMaterial): string {
  const n = qtdeLinhaPick(m) || parseQtdeDigitada(m.qtde_planejada);
  return n > 0 ? String(n) : '';
}

function divergeDoSugerido(atual: VolumeLinha[], inicial: VolumeLinha[]): boolean {
  if (atual.length !== inicial.length) return true;
  const norm = (rows: VolumeLinha[]) => [...rows].sort((a, b) => a.lote_id - b.lote_id);
  const a = norm(atual);
  const b = norm(inicial);
  return a.some(
    (row, i) =>
      row.lote_id !== b[i].lote_id ||
      Math.abs(parseQtdeDigitada(row.qtde) - parseQtdeDigitada(b[i].qtde)) > 1e-4,
  );
}

function picksDe(materiais: OrdemProducaoMaterial[] | undefined) {
  const vols: Record<number, VolumeLinha[]> = {};
  const uns: Record<number, string> = {};
  const produtos: Record<number, number> = {};
  for (const m of materiais ?? []) {
    if (modoRetirada(m) === 'volume') vols[m.id] = volumesIniciais(m);
    else uns[m.id] = qtdeUnidadeInicial(m);
    if (m.produto?.id && opKitEstado(m) !== 'sem_estoque') produtos[m.id] = m.produto.id;
  }
  return { vols, uns, produtos };
}

function agrupar(linhas: OrdemProducaoMaterial[]) {
  const map = new Map<string, OrdemProducaoMaterial[]>();
  for (const m of linhas) {
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
    .map((key) => ({
      key,
      label: opComponenteLabel(key),
      linhas: map.get(key) ?? [],
    }));
}

type ApontadoGuia = {
  componente: string;
  origem_texto: string;
  qtde?: string;
  unidade?: string;
  metragem?: string | null;
  motivo?: string;
};

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

function LinhaApontada({ a }: { a: ApontadoGuia }) {
  return (
    <div className="orc-faixas-bloco">
      <div className="orc-section-head">
        <h4 className="orc-subsection-title">
          {opKitNome({ componente: a.componente, origem_texto: a.origem_texto })}
          <span className="muted" style={{ fontWeight: 500, marginLeft: 8 }}>
            {a.motivo ? 'Sem cadastro' : 'Apontado no orçamento'}
          </span>
        </h4>
      </div>
      <p className="op-insumo-balanco">
        <span>
          <em>Precisa</em>
          <strong>{textoApontado(a)}</strong>
        </span>
      </p>
      {a.motivo ? <p className="form-hint" style={{ marginTop: 0 }}>{a.motivo}</p> : null}
    </div>
  );
}

function BalancoPapel({
  material,
  op,
  linhas,
  saiu = false,
}: {
  material: OrdemProducaoMaterial;
  op: OrdemProducao;
  linhas: Array<{ vol?: OpRetiradaVolume; qtde: string | number }>;
  saiu?: boolean;
}) {
  const saldo = balancoMetragem(material, op, linhas);
  if (!saldo) return null;
  const texto = textoBalancoSaida(saldo, saiu);
  return (
    <p
      className="op-insumo-balanco"
      aria-live="polite"
      title="Metro linear da etiqueta. A área escolhida abate os dois."
    >
      <span>
        <em>Precisa</em>
        <strong>{texto.precisa}</strong>
      </span>
      <span>
        <em>{texto.marcadoRotulo}</em>
        <strong>{texto.marcado}</strong>
      </span>
      <span className={`op-insumo-balanco__${texto.tom}`}>
        <em>{texto.coberturaRotulo}</em>
        <strong>{texto.cobertura}</strong>
      </span>
    </p>
  );
}

function rotuloMedidaLinha(origem: string | null | undefined): string | null {
  const nums = (origem ?? '').match(/\d+/g) ?? [];
  if (nums.length < 2) return null;
  return nums.slice(0, 3).join('x');
}

function rotuloOpcao(o: OpInsumoOpcao, unidade?: string): string {
  const codigo = o.codigo.trim();
  const desc = o.descricao.trim();
  const nome = codigo && desc ? `${codigo} — ${desc}` : desc || codigo || '—';
  if (!unidade) return nome;
  const qtde = parseQtdeDigitada(o.qtde_disponivel);
  return qtde > 0 ? `${nome} · ${formatQtdePick(qtde, unidade)}` : nome;
}

function OpcoesBobina({
  opcoes,
  grupo,
  unidade,
}: {
  opcoes: OpInsumoOpcao[];
  grupo?: { codigo: string; nome: string } | null;
  unidade?: string;
}) {
  const item = (o: OpInsumoOpcao) => (
    <option key={o.produto_id} value={o.produto_id}>
      {rotuloOpcao(o, unidade)}
    </option>
  );
  const codigo = grupo?.codigo ?? '';
  if (!codigo) return <>{opcoes.map(item)}</>;
  const doGrupo = opcoes.filter((o) => (o.detalhe ?? '') === codigo);
  const demais = opcoes.filter((o) => (o.detalhe ?? '') !== codigo);
  if (demais.length === 0) return <>{opcoes.map(item)}</>;
  const rotuloGrupo = grupo?.nome ? `${codigo} · ${grupo.nome}` : codigo;
  return (
    <>
      {doGrupo.length > 0 ? <optgroup label={rotuloGrupo}>{doGrupo.map(item)}</optgroup> : null}
      <optgroup label="Outras bobinas">{demais.map(item)}</optgroup>
    </>
  );
}

type CelulaInsumo = {
  key: string;
  label: string;
  title?: string;
  num?: boolean;
  /** Largura da coluna. O produto fica sem token e ocupa o resto do cartão. */
  w?: string;
  node: ReactNode;
};

function classeCelula(c: CelulaInsumo): string | undefined {
  const partes = [c.num ? 'num' : '', c.key === 'produto' ? 'op-insumo-produto' : ''].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : undefined;
}

/** Uma linha por registro, na largura do cartão. O texto que não cabe fica no tooltip. */
function TabelaRegistro({ linhas }: { linhas: { id: string | number; cols: CelulaInsumo[] }[] }) {
  const cab = linhas[0]?.cols ?? [];
  if (cab.length === 0) return null;
  return (
    <div className="table-wrap op-insumo-linha">
      <table className="data-table">
        <colgroup>
          {cab.map((c) => (
            <col key={c.key} className={c.w ?? (c.key === 'produto' ? undefined : `op-insumo-w--${c.key}`)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cab.map((c) => (
              <th key={c.key} className={classeCelula(c)} title={c.title}>
                {c.label || <span className="sr-only">Ação</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id}>
              {linha.cols.map((c) => (
                <td key={c.key} className={classeCelula(c)}>
                  {typeof c.node === 'string' ? <span title={c.node}>{c.node}</span> : c.node}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function colunasVolume(args: {
  produto: string;
  volume: string;
  local: string;
  polegada: string | null;
  medida: string | null;
  m2: string | null;
  metros: string | null;
  qtdeLabel: string;
  qtde: ReactNode;
  acao?: ReactNode;
}): CelulaInsumo[] {
  const cols: CelulaInsumo[] = [
    {
      key: 'produto',
      label: 'Produto',
      node: <span title={args.produto}>{args.produto}</span>,
    },
    { key: 'volume', label: 'Volume', node: args.volume },
    { key: 'local', label: 'Local', node: args.local },
  ];
  if (args.polegada) cols.push({ key: 'polegada', label: 'Polegada', node: args.polegada });
  if (args.medida != null) cols.push({ key: 'medida', label: 'Medida', node: args.medida });
  if (args.m2 != null) {
    cols.push({ key: 'm2', label: 'm²', title: 'Metro quadrado', num: true, node: args.m2 });
  }
  if (args.metros != null) {
    cols.push({ key: 'ml', label: 'm', title: 'Metro linear', num: true, node: args.metros });
  }
  cols.push({ key: 'qtde', label: 'Qtde', title: args.qtdeLabel, num: true, node: args.qtde });
  if (args.acao) cols.push({ key: 'acao', label: '', node: args.acao });
  return cols;
}

/**
 * Insumos já apontados no kit da ordem, grupo a grupo.
 * Cada item escolhido fica numa linha, dentro da largura do cartão.
 * Bobina: o que a ordem precisa em m² e metro linear, abatido pela escolha.
 * Tubete e caixa sem lote: escolha entre os SKUs da polegada ou da medida aprovada.
 */
export function OpInsumosReservados({ op, podeEstoque, canWrite, onOp }: Props) {
  const materiais = op.materiais;
  const grupos = useMemo(() => agrupar(materiais ?? []), [materiais]);
  const apontados = useMemo(() => {
    const tem = new Set((materiais ?? []).map((m) => (m.componente ?? '').trim().toUpperCase()));
    const lista: ApontadoGuia[] = [
      ...(op.disponibilidade?.componentes_nao_casados ?? []),
      ...(op.disponibilidade?.guia_apontada ?? []),
    ];
    return lista.filter((a) => !tem.has((a.componente ?? '').trim().toUpperCase()));
  }, [materiais, op.disponibilidade]);
  const assinatura = useMemo(
    () =>
      (materiais ?? [])
        .map((m) => `${m.id}:${m.saida_movimento_id ?? ''}:${m.qtde_requisitada}:${m.pendente}`)
        .join('|'),
    [materiais],
  );

  const inicial = picksDe(materiais);
  const [epoch, setEpoch] = useState(assinatura);
  const [volumes, setVolumes] = useState<Record<number, VolumeLinha[]>>(inicial.vols);
  const [unidades, setUnidades] = useState<Record<number, string>>(inicial.uns);
  const [produtos, setProdutos] = useState<Record<number, number>>(inicial.produtos);
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [overlayMaterialId, setOverlayMaterialId] = useState<number | null>(null);
  const [catalogoOverlay, setCatalogoOverlay] = useState<OpRetiradaVolume[]>([]);
  const [conhecidos, setConhecidos] = useState<Record<number, OpRetiradaVolume>>({});
  const [overlayBusy, setOverlayBusy] = useState(false);
  const overlayTicket = useRef(0);

  if (epoch !== assinatura) {
    const next = picksDe(materiais);
    setEpoch(assinatura);
    setVolumes(next.vols);
    setUnidades(next.uns);
    setProdutos(next.produtos);
    setMotivos({});
  }

  const aberta = ['ABERTA', 'EM_ANDAMENTO'].includes(op.status);
  const pendentes = (materiais ?? []).filter((m) => {
    const estado = opKitEstado(m);
    if (estado === 'falta_pegar') return true;
    if (estado !== 'sem_estoque') return false;
    const produtoId = produtos[m.id] ?? 0;
    const opcao = (m.opcoes ?? []).find((o) => o.produto_id === produtoId);
    return Boolean(opcao && parseQtdeDigitada(opcao.qtde_disponivel) > 0);
  });

  const lembrar = (lista: OpRetiradaVolume[]) => {
    setConhecidos((prev) => {
      let mudou = false;
      const next = { ...prev };
      for (const v of lista) {
        if (!v.lote_id || next[v.lote_id] === v) continue;
        next[v.lote_id] = v;
        mudou = true;
      }
      return mudou ? next : prev;
    });
  };

  const volDo = (m: OrdemProducaoMaterial, loteId: number) =>
    conhecidos[loteId] ?? volumesParaEscolha(m).find((v) => v.lote_id === loteId);

  const juntarCatalogo = (base: OpRetiradaVolume[], extra: OpRetiradaVolume[]) => {
    const seen = new Set<number>();
    const out: OpRetiradaVolume[] = [];
    for (const v of [...base, ...extra]) {
      if (!v.lote_id || seen.has(v.lote_id)) continue;
      seen.add(v.lote_id);
      out.push(v);
    }
    return out;
  };

  const abrirOverlay = (m: OrdemProducaoMaterial) => {
    const ticket = overlayTicket.current + 1;
    overlayTicket.current = ticket;
    const base = volumesParaEscolha(m);
    lembrar(base);
    setCatalogoOverlay(base);
    setOverlayMaterialId(m.id);
    setOverlayBusy(true);
    const produtoMarcado = (volumes[m.id] ?? [])
      .map((v) => conhecidos[v.lote_id]?.produto_id ?? 0)
      .find((id) => id > 0) ?? 0;
    const produtoQuery =
      (m.escolher_produto ? (produtos[m.id] ?? 0) : 0) ||
      ((m.componente ?? '').toUpperCase() === 'ACABAMENTO' ? produtoMarcado : 0);
    void api
      .get<{ data: OpRetiradaVolume[] }>(
        `/ordens-producao/${op.id}/volumes-escolha?material_id=${m.id}${
          produtoQuery > 0 ? `&produto_id=${produtoQuery}` : ''
        }`,
      )
      .then((res) => {
        if (overlayTicket.current !== ticket) return;
        const lista = juntarCatalogo(base, res.data ?? []).filter((v) => volumeCabeNaLinha(m, v));
        lembrar(lista);
        setCatalogoOverlay(lista);
      })
      .catch(() => {
        /* o preview do kit já abre a lista */
      })
      .finally(() => {
        if (overlayTicket.current === ticket) setOverlayBusy(false);
      });
  };

  const gravarEscolha = (materialId: number, produtoId: number | null) => {
    void api
      .post<{ data: OrdemProducao }>(`/ordens-producao/${op.id}/escolha`, {
        material_id: materialId,
        produto_id: produtoId,
      })
      .then((res) => {
        onOp(res.data);
        const next = picksDe(res.data.materiais);
        setVolumes((prev) => {
          if ((prev[materialId] ?? []).length > 0 || !next.vols[materialId]) return prev;
          return { ...prev, [materialId]: next.vols[materialId] };
        });
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : 'Não foi possível gravar o item.');
      });
  };

  const aplicarMarcas = (materialId: number, marcas: VolumePickMarca[]) => {
    const linhas = marcas
      .filter((marca) => marca.marcado && parseQtdeDigitada(marca.qtde) > 0)
      .map((marca) => ({ lote_id: marca.lote_id, qtde: marca.qtde }));
    setVolumes((prev) => ({ ...prev, [materialId]: linhas }));
    const material = (materiais ?? []).find((item) => item.id === materialId);
    if (!material || material.saida_movimento_id) return;
    const volumeDireto =
      (material.componente ?? '').toUpperCase() === 'ACABAMENTO' && Boolean(material.escolher_produto);
    if (!volumeDireto) return;
    const ids = new Set<number>();
    for (const linha of linhas) {
      const id = volDo(material, linha.lote_id)?.produto_id ?? 0;
      if (id > 0) ids.add(id);
    }
    const atual = material.produto?.id ?? 0;
    if (ids.size === 1 && [...ids][0] !== atual) gravarEscolha(materialId, [...ids][0]);
    else if (ids.size === 0 && linhas.length === 0 && atual > 0) gravarEscolha(materialId, null);
  };

  const marcasDoOverlay = (materialId: number): VolumePickMarca[] => {
    const escolhidos = new Map((volumes[materialId] ?? []).map((v) => [v.lote_id, v.qtde]));
    const vistos = new Set<number>();
    const out: VolumePickMarca[] = [];
    for (const v of catalogoOverlay) {
      if (!v.lote_id || vistos.has(v.lote_id)) continue;
      vistos.add(v.lote_id);
      const qtdeEscolhida = escolhidos.get(v.lote_id);
      out.push({
        lote_id: v.lote_id,
        qtde:
          qtdeEscolhida ??
          String(qtdeVolumeTotal(v) || parseQtdeDigitada(v.qtde_retirar) || ''),
        marcado: qtdeEscolhida != null,
      });
    }
    return out;
  };

  const lerQrOverlay = async (payload: string) => {
    const material = (materiais ?? []).find((m) => m.id === overlayMaterialId);
    if (!material) return;
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/retiradas/${op.id}/volume?payload=${encodeURIComponent(payload)}`,
      );
      const vol = res.data;
      const linha: OpRetiradaVolume = {
        lote_id: vol.lote_id,
        codigo: vol.codigo,
        nf_numero: vol.nf_numero,
        qtde_volume: vol.qtde,
        qtde_retirar: vol.qtde,
        unidade: vol.unidade,
        data_entrada: vol.data_entrada,
        data_validade: null,
        status: null,
        status_label: null,
        largura_mm: null,
        comprimento_m: null,
        endereco: vol.endereco,
        sugerido: false,
        motivo: 'ESTOQUE',
        ordem_politica: null,
        sku: vol.produto?.codigo ?? null,
        produto_id: vol.produto?.id ?? null,
        descricao: vol.produto?.descricao_fiscal ?? null,
      };
      if (!volumeCabeNaLinha(material, linha)) {
        throw new Error('Volume de outro produto.');
      }
      lembrar([linha]);
      setCatalogoOverlay((prev) => juntarCatalogo(prev, [linha]));
      const volumeDireto =
        (material.componente ?? '').toUpperCase() === 'ACABAMENTO' &&
        Boolean(material.escolher_produto) &&
        !material.saida_movimento_id;
      const produtoDoVolume = vol.produto?.id ?? 0;
      if (volumeDireto && produtoDoVolume > 0 && produtoDoVolume !== (material.produto?.id ?? 0)) {
        const outros = (volumes[material.id] ?? [])
          .map((item) => volDo(material, item.lote_id)?.produto_id ?? 0)
          .filter((id) => id > 0 && id !== produtoDoVolume);
        if (outros.length === 0) gravarEscolha(material.id, produtoDoVolume);
      }
      setVolumes((prev) => {
        const atuais = prev[material.id] ?? [];
        if (atuais.some((v) => v.lote_id === vol.lote_id)) return prev;
        return {
          ...prev,
          [material.id]: [...atuais, { lote_id: vol.lote_id, qtde: vol.qtde }],
        };
      });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw e instanceof Error ? e : new Error('Volume não reconhecido.');
    }
  };

  const ressincronizar = async () => {
    const atual = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${op.id}`);
    onOp(atual.data);
  };

  const confirmar = async () => {
    type Linha = {
      material_id: number;
      qtde: string;
      produto_id?: number;
      volumes?: { lote_id: number; qtde: string }[];
      volumes_motivo?: string;
    };
    const fila: Linha[] = [];
    let algumaAjuste = false;

    for (const m of pendentes) {
      const produtoEscolhido = produtos[m.id] ?? 0;
      const opcaoEscolhida = (m.opcoes ?? []).find((o) => o.produto_id === produtoEscolhido);
      const volumeDireto =
        (m.componente ?? '').toUpperCase() === 'ACABAMENTO' && Boolean(m.escolher_produto);
      if (volumeDireto) {
        const escolhidos = (volumes[m.id] ?? []).filter((v) => parseQtdeDigitada(v.qtde) > 0);
        if (escolhidos.length === 0) {
          setErr(`Escolha um volume de ${opKitNome(m)}.`);
          return;
        }
        const produtosDaLinha = new Set<number>();
        for (const linha of escolhidos) {
          const idVol = volDo(m, linha.lote_id)?.produto_id;
          if (idVol) produtosDaLinha.add(idVol);
        }
        if (produtosDaLinha.size !== 1) {
          setErr(`Em ${opKitNome(m)}, escolha volumes de um só produto.`);
          return;
        }
        const soma = escolhidos.reduce((acc, v) => acc + parseQtdeDigitada(v.qtde), 0);
        fila.push({
          material_id: m.id,
          qtde: soma.toFixed(4),
          produto_id: [...produtosDaLinha][0],
          volumes: escolhidos.map((v) => ({
            lote_id: v.lote_id,
            qtde: parseQtdeDigitada(v.qtde).toFixed(4),
          })),
        });
        algumaAjuste = true;
        continue;
      }
      if (m.escolher_produto && opcaoEscolhida?.controla_lote) {
        const escolhidos = (volumes[m.id] ?? []).filter((v) => parseQtdeDigitada(v.qtde) > 0);
        if (escolhidos.length === 0) {
          setErr(`Escolha um volume de ${opKitNome(m)}.`);
          return;
        }
        const produtosDaLinha = new Set<number>();
        for (const linha of escolhidos) {
          const produtoId = volDo(m, linha.lote_id)?.produto_id;
          if (produtoId) produtosDaLinha.add(produtoId);
        }
        if (produtosDaLinha.size > 1 || [...produtosDaLinha].some((id) => id !== opcaoEscolhida.produto_id)) {
          setErr(`Em ${opKitNome(m)}, escolha volumes do item selecionado.`);
          return;
        }
        const soma = escolhidos.reduce((acc, v) => acc + parseQtdeDigitada(v.qtde), 0);
        fila.push({
          material_id: m.id,
          qtde: soma.toFixed(4),
          produto_id: opcaoEscolhida.produto_id,
          volumes: escolhidos.map((v) => ({
            lote_id: v.lote_id,
            qtde: parseQtdeDigitada(v.qtde).toFixed(4),
          })),
        });
        continue;
      }
      if (modoRetirada(m) === 'volume') {
        const escolhidos = (volumes[m.id] ?? []).filter((v) => parseQtdeDigitada(v.qtde) > 0);
        const diverge = divergeDoSugerido(escolhidos, volumesIniciais(m));
        if (!diverge) {
          const sugerida = linhaConfirmarSugerida(m);
          if (sugerida) fila.push(sugerida);
          continue;
        }
        if (escolhidos.length === 0) {
          setErr(`Deixe ao menos um volume em ${opKitNome(m)}, ou volte à sugestão.`);
          return;
        }
        const produtosDaLinha = new Set<number>();
        for (const linha of escolhidos) {
          const produtoId = volDo(m, linha.lote_id)?.produto_id;
          if (produtoId) produtosDaLinha.add(produtoId);
        }
        if (produtosDaLinha.size > 1) {
          setErr(`Em ${opKitNome(m)}, escolha volumes de um só produto.`);
          return;
        }
        const motivo = (motivos[m.id] ?? '').trim();
        if (motivo.length < 3) {
          setErr(`Informe o motivo da troca em ${opKitNome(m)}.`);
          return;
        }
        const soma = escolhidos.reduce((acc, v) => acc + parseQtdeDigitada(v.qtde), 0);
        fila.push({
          material_id: m.id,
          qtde: soma.toFixed(4),
          volumes: escolhidos.map((v) => ({
            lote_id: v.lote_id,
            qtde: parseQtdeDigitada(v.qtde).toFixed(4),
          })),
          volumes_motivo: motivo,
        });
        algumaAjuste = true;
        continue;
      }
      const qtde = parseQtdeDigitada(unidades[m.id] ?? '');
      const planejada = qtdeLinhaPick(m);
      const produtoId =
        opKitEstado(m) === 'sem_estoque' ? (produtos[m.id] ?? 0) : (produtos[m.id] ?? m.produto?.id ?? 0);
      if (opKitEstado(m) === 'sem_estoque' && !(produtoId > 0)) {
        setErr(`Escolha o produto de ${opKitNome(m)}.`);
        return;
      }
      if (m.escolher_produto && produtoId > 0) {
        if (!(qtde > 0)) {
          setErr(`Informe a quantidade de ${opKitNome(m)}.`);
          return;
        }
        fila.push({
          material_id: m.id,
          qtde: qtde.toFixed(4),
          produto_id: produtoId,
        });
        algumaAjuste = true;
        continue;
      }
      const trocou = Boolean(produtoId && m.produto?.id && produtoId !== m.produto.id);
      const opcao = (m.opcoes ?? []).find((o) => o.produto_id === produtoId);
      const teto = opcao
        ? parseQtdeDigitada(opcao.qtde_disponivel)
        : parseQtdeDigitada(m.qtde_disponivel);
      if (!trocou && Math.abs(qtde - planejada) <= 1e-4) {
        const sugerida = linhaConfirmarSugerida(m);
        if (sugerida) fila.push(sugerida);
        continue;
      }
      if (!(qtde > 0)) {
        setErr(`Informe a quantidade de ${opKitNome(m)}.`);
        return;
      }
      if (teto > 0 && qtde > teto + 1e-4) {
        setErr(`A quantidade de ${opKitNome(m)} passa do que há em estoque.`);
        return;
      }
      fila.push({
        material_id: m.id,
        qtde: qtde.toFixed(4),
        ...(trocou ? { produto_id: produtoId } : {}),
      });
      algumaAjuste = true;
    }

    if (fila.length === 0) {
      setErr('Nenhum volume ou unidade com saldo para confirmar.');
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const abertos = (materiais ?? []).filter((m) => opKitEstado(m) !== 'ja_saiu');
      const tudoSugerido =
        !algumaAjuste && abertos.length > 0 && abertos.every((m) => linhaConfirmarSugerida(m));
      if (tudoSugerido) {
        const res = await api.post<{ data: OrdemProducao }>(
          `/estoque/retiradas/${op.id}/confirmar-pendentes`,
        );
        onOp(res.data);
        return;
      }
      for (const linha of fila) {
        const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
          linhas: [linha],
        });
        onOp(res.data);
      }
    } catch (e) {
      try {
        await ressincronizar();
      } catch {
        /* a mensagem abaixo cobre a falha */
      }
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar a saída.');
    } finally {
      setBusy(false);
    }
  };

  const cta =
    op.status === 'CANCELADA' && op.pedido
      ? { to: `/pedidos/${op.pedido.id}`, label: `Voltar ao pedido ${op.pedido.codigo}` }
        : op.status === 'CONCLUIDA' && op.pedido
          ? { to: `/pedidos/${op.pedido.id}`, label: `Continuar no pedido ${op.pedido.codigo}` }
          : null;

  return (
    <section className="op-insumos" aria-label="O que sai do estoque">
      <div className="orc-section-head">
        <h3 className="orc-subsection-title" style={{ fontSize: '1.05rem' }}>
          O que sai do estoque
        </h3>
      </div>

      {err ? <div className="alert alert-error">{err}</div> : null}

      {grupos.length === 0 && apontados.length === 0 ? (
        <p className="muted">Ainda sem insumos nesta ordem.</p>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.key} className="card">
            <div className="card-body">
              <h4 className="orc-subsection-title" style={{ marginBottom: '0.75rem' }}>
                {grupo.label}
              </h4>
              {grupo.linhas.map((m) => {
                const estado = opKitEstado(m);
                const volumeDireto = Boolean(
                  m.escolher_produto &&
                    (m.componente ?? '').toUpperCase() === 'ACABAMENTO' &&
                    estado !== 'ja_saiu',
                );
                const produtoPedidoPre =
                  estado === 'sem_estoque' ? (produtos[m.id] ?? 0) : (produtos[m.id] ?? m.produto?.id ?? 0);
                const opcaoPre = (m.opcoes ?? []).find((o) => o.produto_id === produtoPedidoPre) ?? null;
                const porVolume =
                  volumeDireto ||
                  modoRetirada(m) === 'volume' ||
                  Boolean(m.escolher_produto && opcaoPre?.controla_lote);
                const podeEditar = Boolean(
                  aberta &&
                    canWrite &&
                    (volumeDireto ||
                      estado === 'falta_pegar' ||
                      (m.escolher_produto && produtoPedidoPre > 0)),
                );
                const opcoes = m.opcoes ?? [];
                const produtoPedido =
                  estado === 'sem_estoque' ? (produtos[m.id] ?? 0) : (produtos[m.id] ?? m.produto?.id ?? 0);
                const opcao = opcoes.find((o) => o.produto_id === produtoPedido) ?? null;
                const produtoId = estado === 'sem_estoque' && produtoPedido > 0 && !opcao ? 0 : produtoPedido;
                const localDaEscolha =
                  opcao?.local ?? (produtoId > 0 && produtoId === m.produto?.id ? m.local : null);
                const podeTrocar = Boolean(
                  !porVolume &&
                    aberta &&
                    canWrite &&
                    opcoes.length > 0 &&
                    (estado === 'sem_estoque' || (estado === 'falta_pegar' && opcoes.length > 1)),
                );
                const escolherProduto = (raw: string) => {
                  const id = Number(raw);
                  const atual = m.produto?.id ?? 0;
                  if (!id) {
                    setVolumes((prev) => ({ ...prev, [m.id]: [] }));
                    setProdutos((prev) => {
                      const next = { ...prev };
                      delete next[m.id];
                      return next;
                    });
                    if (atual > 0 && !m.saida_movimento_id) gravarEscolha(m.id, null);
                    return;
                  }
                  const prox = opcoes.find((o) => o.produto_id === id);
                  const teto = parseQtdeDigitada(prox?.qtde_disponivel);
                  setVolumes((prev) => ({ ...prev, [m.id]: [] }));
                  setProdutos((prev) => ({ ...prev, [m.id]: id }));
                  if (id !== atual && !m.saida_movimento_id) gravarEscolha(m.id, id);
                  setUnidades((prev) => {
                    const planejada = qtdeLinhaPick(m);
                    const atual = parseQtdeDigitada(prev[m.id] ?? '');
                    const base = atual > 0 ? atual : planejada;
                    const qtde = teto > 0 && base > teto ? String(teto) : base > 0 ? String(base) : '';
                    return { ...prev, [m.id]: qtde };
                  });
                };
                const saldoOpcao = opcao
                  ? parseQtdeDigitada(opcao.qtde_disponivel)
                  : parseQtdeDigitada(m.qtde_disponivel);
                const podeEditarQtde = Boolean(
                  !porVolume &&
                    aberta &&
                    canWrite &&
                    (estado === 'falta_pegar' || (podeTrocar && saldoOpcao > 0)),
                );
                const escolhidos = volumes[m.id] ?? [];
                const diverge = porVolume && divergeDoSugerido(escolhidos, volumesIniciais(m));
                const baixados =
                  m.retirada?.volumes_a_devolver?.length
                    ? m.retirada.volumes_a_devolver
                    : (m.retirada?.volumes_baixados ?? []);
                const un = unidadeExibicao(m.unidade || m.retirada?.unidade);
                const metragem = insumoComMetragem(m);
                const polegada = rotuloPolegada(
                  m.origem_texto ?? m.produto?.descricao_comercial ?? m.produto?.descricao_fiscal,
                );
                const componente = (m.componente ?? '').toUpperCase();
                const ehTubete = componente === 'TUBETE';
                const ehCaixa = componente === 'CAIXA';
                const medidaCaixaRotulo = ehCaixa ? rotuloMedidaLinha(m.origem_texto) : null;
                const localSomenteLeitura = ehTubete || ehCaixa;
                const rotuloLocal =
                  localDaEscolha?.nome?.trim() || localDaEscolha?.codigo?.trim() || '';
                const qtdeLabel = `Quantidade (${un})`;
                const mostrarMedidaPendentes =
                  metragem ||
                  escolhidos.some((linha) => Boolean(formatVolumeDimensao(volDo(m, linha.lote_id))));
                const mostrarMedidaBaixados =
                  metragem || baixados.some((vol) => Boolean(formatVolumeDimensao(vol)));

                const rotuloEstado =
                  m.escolher_produto && estado !== 'ja_saiu'
                    ? !volumeDireto && produtoId <= 0
                      ? 'Escolher'
                      : 'Falta pegar'
                    : opKitEstadoLabel(estado);
                const estadoVisual = rotuloEstado === 'Falta pegar' ? 'falta_pegar' : estado;

                return (
                  <div key={m.id} className={`orc-faixas-bloco op-insumo-bloco op-insumo-bloco--${estadoVisual}`}>
                    <div className="orc-section-head">
                      <h4 className="orc-subsection-title">
                        {opKitNome(m)}
                        <span className={`op-insumo-estado op-kit-lista__st--${estadoVisual}`}>
                          {rotuloEstado}
                        </span>
                      </h4>
                      {podeEditar && porVolume ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy}
                          onClick={() => abrirOverlay(m)}
                        >
                          + volume
                        </button>
                      ) : null}
                    </div>

                    {m.escolher_produto && !volumeDireto && estado !== 'ja_saiu' ? (
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label>
                          {m.grupo
                            ? `Item do grupo ${m.grupo.codigo}${m.grupo.nome ? ` · ${m.grupo.nome}` : ''}`
                            : 'Item'}
                        </label>
                        <select
                          value={produtoId > 0 ? String(produtoId) : ''}
                          disabled={busy || !canWrite}
                          aria-label={`Escolher item de ${m.grupo?.codigo ?? 'matéria-prima'}`}
                          onChange={(e) => escolherProduto(e.target.value)}
                        >
                          <option value="">Escolher</option>
                          <OpcoesBobina opcoes={opcoes} grupo={m.grupo} unidade={un} />
                        </select>
                        {opcoes.length === 0 ? (
                          <p className="form-hint">Nenhum item com saldo.</p>
                        ) : null}
                      </div>
                    ) : null}

                    {metragem ? (
                      <BalancoPapel
                        material={m}
                        op={op}
                        saiu={estado === 'ja_saiu'}
                        linhas={
                          estado === 'ja_saiu'
                            ? baixados.map((vol) => ({
                                vol,
                                qtde: parseQtdeDigitada(vol.qtde_retirar || vol.qtde_volume),
                              }))
                            : escolhidos.map((linha) => ({
                                vol: volDo(m, linha.lote_id),
                                qtde: linha.qtde,
                              }))
                        }
                      />
                    ) : null}

                    {porVolume && estado !== 'ja_saiu' ? (
                      escolhidos.length === 0 ? (
                        volumeDireto ? null : m.escolher_produto && produtoId > 0 ? (
                          <p className="form-hint" style={{ marginTop: 0 }}>
                            Nenhum volume nesta lista.
                          </p>
                        ) : estado === 'sem_estoque' ? (
                          <p className="form-hint" style={{ marginTop: 0 }}>
                            Sem saldo neste item.
                          </p>
                        ) : (
                          <>
                            <p className="op-insumo-previsto">
                              <span>Produto</span>
                              <strong>{nomeProdutoLinha(m.produto)}</strong>
                            </p>
                            <p className="form-hint" style={{ marginTop: 0 }}>
                              Nenhum volume nesta lista.
                            </p>
                          </>
                        )
                      ) : (
                        <TabelaRegistro
                          linhas={escolhidos.map((linha) => {
                            const vol = volDo(m, linha.lote_id);
                            const max = vol ? qtdeVolumeTotal(vol) : 0;
                            const leitura = vol
                              ? formatLeituraBobina(vol, linha.qtde, larguraMmDoMaterial(m))
                              : null;
                            const medidaVol = vol ? formatVolumeDimensao(vol) : null;
                            return {
                              id: linha.lote_id,
                              cols: colunasVolume({
                                produto: rotuloProdutoVolume(vol, m.produto),
                                volume: vol ? formatLotePick(vol) : `Lote ${linha.lote_id}`,
                                local: vol?.endereco?.codigo ?? '—',
                                polegada: ehTubete && polegada ? polegada : null,
                                medida: ehCaixa
                                  ? medidaCaixaRotulo
                                  : mostrarMedidaPendentes
                                    ? medidaVol ?? '—'
                                    : null,
                                m2: metragem ? leitura?.m2 ?? '—' : null,
                                metros: metragem ? leitura?.metros ?? '—' : null,
                                qtdeLabel,
                                qtde: (
                                  <input
                                    inputMode="decimal"
                                    disabled={!podeEditar || busy}
                                    value={linha.qtde}
                                    aria-label={qtdeLabel}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const n = parseQtdeDigitada(raw);
                                      const qtde = max > 0 && n > max ? String(max) : raw;
                                      setVolumes((prev) => ({
                                        ...prev,
                                        [m.id]: (prev[m.id] ?? []).map((v) =>
                                          v.lote_id === linha.lote_id ? { ...v, qtde } : v,
                                        ),
                                      }));
                                    }}
                                  />
                                ),
                                acao: podeEditar ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={busy}
                                    onClick={() =>
                                      setVolumes((prev) => ({
                                        ...prev,
                                        [m.id]: (prev[m.id] ?? []).filter(
                                          (v) => v.lote_id !== linha.lote_id,
                                        ),
                                      }))
                                    }
                                  >
                                    Remover
                                  </button>
                                ) : undefined,
                              }),
                            };
                          })}
                        />
                      )
                    ) : null}

                    {porVolume && estado === 'ja_saiu' ? (
                      baixados.length === 0 ? (
                        <p className="form-hint" style={{ marginTop: 0 }}>
                          Já saiu da prateleira.
                        </p>
                      ) : (
                        <TabelaRegistro
                          linhas={baixados.map((vol) => {
                            const qtde = String(parseQtdeDigitada(vol.qtde_retirar || vol.qtde_volume));
                            const leitura = metragem
                              ? formatLeituraBobina(vol, qtde, larguraMmDoMaterial(m))
                              : null;
                            const medidaVol = formatVolumeDimensao(vol);
                            return {
                              id: vol.lote_id ?? vol.codigo ?? qtde,
                              cols: colunasVolume({
                                produto: rotuloProdutoVolume(vol, m.produto),
                                volume: formatLotePick(vol),
                                local: vol.endereco?.codigo ?? '—',
                                polegada: ehTubete && polegada ? polegada : null,
                                medida: ehCaixa
                                  ? medidaCaixaRotulo
                                  : mostrarMedidaBaixados
                                    ? medidaVol ?? '—'
                                    : null,
                                m2: metragem ? leitura?.m2 ?? '—' : null,
                                metros: metragem ? leitura?.metros ?? '—' : null,
                                qtdeLabel,
                                qtde,
                              }),
                            };
                          })}
                        />
                      )
                    ) : null}

                    {!m.escolher_produto && !porVolume && estado === 'sem_estoque' && produtoId <= 0 ? (
                      !podeTrocar ? (
                        <p className="form-hint" style={{ marginTop: 0 }}>
                          Sem saldo neste item.
                        </p>
                      ) : (
                        <TabelaRegistro
                          linhas={[
                            {
                              id: m.id,
                              cols: [
                                {
                                  key: 'produto',
                                  label: 'Produto',
                                  node: (
                                    <select
                                      value=""
                                      disabled={busy}
                                      aria-label="Escolher produto"
                                      onChange={(e) => escolherProduto(e.target.value)}
                                    >
                                      <option value="">Escolher</option>
                                      {opcoes.map((o) => (
                                        <option key={o.produto_id} value={o.produto_id}>
                                          {rotuloOpcao(o, un)}
                                        </option>
                                      ))}
                                    </select>
                                  ),
                                },
                              ],
                            },
                          ]}
                        />
                      )
                    ) : null}

                    {!porVolume && !(estado === 'sem_estoque' && produtoId <= 0) ? (
                      <TabelaRegistro
                        linhas={[
                          {
                            id: m.id,
                            cols: [
                              {
                                key: 'produto',
                                label: 'Produto',
                                node: podeTrocar && !m.escolher_produto ? (
                                  <select
                                    value={produtoId > 0 ? String(produtoId) : ''}
                                    disabled={busy}
                                    title={opcao ? rotuloOpcao(opcao) : undefined}
                                    aria-label="Escolher produto"
                                    onChange={(e) => escolherProduto(e.target.value)}
                                  >
                                    {estado === 'sem_estoque' ? <option value="">Escolher</option> : null}
                                    {opcoes.map((o) => (
                                      <option key={o.produto_id} value={o.produto_id}>
                                        {rotuloOpcao(o, un)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span title={opcao ? rotuloOpcao(opcao) : nomeProdutoLinha(m.produto)}>
                                    {opcao ? rotuloOpcao(opcao) : nomeProdutoLinha(m.produto)}
                                  </span>
                                ),
                              },
                              ...(opcao?.detalhe && (ehTubete || componente === 'CAIXA')
                                ? [
                                    {
                                      key: 'detalhe',
                                      label: ehTubete ? 'Polegada' : 'Medida',
                                      node: opcao.detalhe,
                                    },
                                  ]
                                : []),
                              ...(!m.produto?.controla_lote &&
                              (opcao || m.produto?.id) &&
                              (!localSomenteLeitura || rotuloLocal !== '')
                                ? [
                                    {
                                      key: 'local',
                                      label: 'Local',
                                      w:
                                        !localSomenteLeitura && aberta && canWrite && produtoId > 0
                                          ? 'op-insumo-w--lugar'
                                          : undefined,
                                      node: localSomenteLeitura ? (
                                        rotuloLocal
                                      ) : aberta && canWrite && produtoId > 0 ? (
                                        <LocalSaldoCampo
                                          produtoId={produtoId}
                                          local={localDaEscolha}
                                          disabled={busy}
                                          onSaved={() => void ressincronizar()}
                                        />
                                      ) : (
                                        rotuloLocal || 'Sem local'
                                      ),
                                    },
                                  ]
                                : []),
                              ...(opcoes.length > 0
                                ? [
                                    {
                                      key: 'estoque',
                                      label: 'Em estoque',
                                      num: true,
                                      node: saldoOpcao > 0 ? formatQtdePick(saldoOpcao, un) : 'Sem saldo',
                                    },
                                  ]
                                : []),
                              {
                                key: 'qtde',
                                label: 'Qtde',
                                title: qtdeLabel,
                                num: true,
                                node:
                                  estado === 'ja_saiu' ? (
                                    String(parseQtdeDigitada(m.qtde_requisitada))
                                  ) : (
                                    <input
                                      inputMode="decimal"
                                      disabled={!podeEditarQtde || busy}
                                      value={unidades[m.id] ?? ''}
                                      aria-label={qtdeLabel}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const n = parseQtdeDigitada(raw);
                                        const qtde =
                                          saldoOpcao > 0 && n > saldoOpcao ? String(saldoOpcao) : raw;
                                        setUnidades((prev) => ({ ...prev, [m.id]: qtde }));
                                      }}
                                    />
                                  ),
                              },
                            ],
                          },
                        ]}
                      />
                    ) : null}

                    {podeEditar && diverge ? (
                      <div className="form-group" style={{ maxWidth: 480, marginTop: '0.35rem' }}>
                        <label>Motivo da troca</label>
                        <input
                          value={motivos[m.id] ?? ''}
                          disabled={busy}
                          placeholder="Volume diferente da sugestão"
                          onChange={(e) =>
                            setMotivos((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {apontados
                .filter((a) => (a.componente ?? '').trim().toUpperCase() === grupo.key)
                .map((a) => (
                  <LinhaApontada key={`${a.componente}-${a.origem_texto}`} a={a} />
                ))}
            </div>
          </div>
        ))
      )}
      {apontados
        .filter((a) => !grupos.some((g) => g.key === (a.componente ?? '').trim().toUpperCase()))
        .reduce<Array<{ key: string; linhas: ApontadoGuia[] }>>((acc, a) => {
          const key = (a.componente ?? '').trim().toUpperCase() || 'OUTRO';
          const grupo = acc.find((g) => g.key === key);
          if (grupo) grupo.linhas.push(a);
          else acc.push({ key, linhas: [a] });
          return acc;
        }, [])
        .sort((a, b) => {
          const ia = OP_COMPONENTE_ORDEM.indexOf(a.key as (typeof OP_COMPONENTE_ORDEM)[number]);
          const ib = OP_COMPONENTE_ORDEM.indexOf(b.key as (typeof OP_COMPONENTE_ORDEM)[number]);
          if (ia === -1 && ib === -1) return a.key.localeCompare(b.key, 'pt-BR');
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        })
        .map((grupo) => (
          <div key={grupo.key} className="card">
            <div className="card-body">
              <h4 className="orc-subsection-title" style={{ marginBottom: '0.75rem' }}>
                {opComponenteLabel(grupo.key)}
              </h4>
              {grupo.linhas.map((a) => (
                <LinhaApontada key={`${a.componente}-${a.origem_texto}`} a={a} />
              ))}
            </div>
          </div>
        ))}

      {aberta && canWrite && pendentes.length > 0 ? (
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmar()}>
            Confirmar saída
          </button>
        </div>
      ) : null}

      {aberta && !canWrite && pendentes.length > 0 && podeEstoque ? (
        <div className="btn-row">
          <Link to={hrefFichaEstoque(op.id)} className="btn btn-primary">
            Confirmar saída no estoque
          </Link>
        </div>
      ) : null}

      {cta ? (
        <div className="btn-row">
          <Link to={cta.to} className="btn btn-secondary">
            {cta.label}
          </Link>
        </div>
      ) : null}

      {overlayMaterialId != null
        ? (() => {
            const material = (materiais ?? []).find((m) => m.id === overlayMaterialId);
            if (!material) return null;
            const un = unidadeExibicao(material.unidade || material.retirada?.unidade);
            const pedidoQtde = String(qtdeLinhaPick(material) || '');
            return (
              <SeparacaoVolumesOverlay
                titulo={opKitNome(material)}
                pedidoQtde={pedidoQtde}
                unidade={un}
                volumes={catalogoOverlay}
                marcas={marcasDoOverlay(material.id)}
                busy={busy}
                modo="debita"
                mostrarProduto
                hint={
                  overlayBusy
                    ? 'Carregando o estoque. Marque um ou mais volumes. A confirmação da saída fica na ordem.'
                    : 'Marque um ou mais volumes. A confirmação da saída fica na ordem.'
                }
                onLerQr={canWrite ? lerQrOverlay : undefined}
                onChangeMarcas={(next) => aplicarMarcas(material.id, next)}
                onClose={() => {
                  overlayTicket.current += 1;
                  setOverlayMaterialId(null);
                }}
              />
            );
          })()
        : null}
    </section>
  );
}
