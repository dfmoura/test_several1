import { useMemo, useRef, useState } from 'react';
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
  formatLeituraBobina,
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
  hrefApontamentoProducao,
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opPassoAtual,
  parseQtdeDigitada,
} from '../lib/producaoUi';

type VolumeLinha = { lote_id: number; qtde: string };

const ORDEM_GRUPO = ['PAPEL', 'TINTA', 'TUBETE', 'CAIXA', 'MANUAL'];

type Props = {
  op: OrdemProducao;
  podeEstoque: boolean;
  podeProducao: boolean;
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
    if (m.produto?.id) produtos[m.id] = m.produto.id;
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
      const ia = ORDEM_GRUPO.indexOf(a);
      const ib = ORDEM_GRUPO.indexOf(b);
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

function rotuloOpcao(o: OpInsumoOpcao): string {
  const codigo = o.codigo.trim();
  const desc = o.descricao.trim();
  if (codigo && desc) return `${codigo} — ${desc}`;
  return desc || codigo || '—';
}

function CampoLeitura({ label, value, largo = false }: { label: string; value: string; largo?: boolean }) {
  return (
    <div className={largo ? 'form-group span-2' : 'form-group'}>
      <label>{label}</label>
      <input value={value || '—'} disabled title={value || undefined} />
    </div>
  );
}

/**
 * Insumos já apontados no kit da ordem, grupo a grupo.
 * Bobina: produto, m² e metro linear em cada volume.
 * Tubete e caixa sem lote: escolha entre os SKUs da polegada ou da medida aprovada.
 */
export function OpInsumosReservados({ op, podeEstoque, podeProducao, canWrite, onOp }: Props) {
  const materiais = op.materiais;
  const grupos = useMemo(() => agrupar(materiais ?? []), [materiais]);
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
  const atual = opPassoAtual(op);
  const pendentes = (materiais ?? []).filter((m) => {
    const estado = opKitEstado(m);
    if (estado === 'falta_pegar') return true;
    if (estado !== 'sem_estoque') return false;
    const produtoId = produtos[m.id] ?? m.produto?.id;
    const opcao = (m.opcoes ?? []).find((o) => o.produto_id === produtoId);
    return Boolean(
      opcao &&
        m.produto?.id &&
        opcao.produto_id !== m.produto.id &&
        parseQtdeDigitada(opcao.qtde_disponivel) > 0,
    );
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
    void api
      .get<{ data: OpRetiradaVolume[] }>(
        `/ordens-producao/${op.id}/volumes-escolha?material_id=${m.id}`,
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

  const aplicarMarcas = (materialId: number, marcas: VolumePickMarca[]) => {
    setVolumes((prev) => ({
      ...prev,
      [materialId]: marcas
        .filter((marca) => marca.marcado && parseQtdeDigitada(marca.qtde) > 0)
        .map((marca) => ({ lote_id: marca.lote_id, qtde: marca.qtde })),
    }));
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
      const produtoId = produtos[m.id] ?? m.produto?.id ?? 0;
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
        : atual === 'entregar' && podeProducao
          ? { to: hrefApontamentoProducao(op.id), label: 'Receber na máquina' }
          : atual === 'produzir' || atual === 'devolver'
            ? podeProducao
              ? { to: hrefApontamentoProducao(op.id), label: 'Abrir a máquina' }
              : null
            : null;

  return (
    <section className="op-insumos" aria-label="Insumos reservados">
      <div className="orc-section-head">
        <h3 className="orc-subsection-title" style={{ fontSize: '1.05rem' }}>
          Insumos reservados
        </h3>
      </div>

      {err ? <div className="alert alert-error">{err}</div> : null}

      {grupos.length === 0 ? (
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
                const porVolume = modoRetirada(m) === 'volume';
                const podeEditar = Boolean(aberta && canWrite && estado === 'falta_pegar');
                const opcoes = m.opcoes ?? [];
                const produtoId = produtos[m.id] ?? m.produto?.id ?? 0;
                const opcao = opcoes.find((o) => o.produto_id === produtoId) ?? null;
                const podeTrocar = Boolean(
                  !porVolume &&
                    aberta &&
                    canWrite &&
                    opcoes.length > 1 &&
                    (estado === 'falta_pegar' || estado === 'sem_estoque'),
                );
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

                return (
                  <div key={m.id} className="orc-faixas-bloco">
                    <div className="orc-section-head">
                      <h4 className="orc-subsection-title">
                        {opKitNome(m)}
                        <span className="muted" style={{ fontWeight: 500, marginLeft: 8 }}>
                          {opKitEstadoLabel(estado)}
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

                    {porVolume && estado !== 'ja_saiu' ? (
                      escolhidos.length === 0 ? (
                        <>
                          <div className="form-grid faixa-row">
                            <CampoLeitura label="Produto" value={nomeProdutoLinha(m.produto)} largo />
                          </div>
                          <p className="form-hint" style={{ marginTop: 0 }}>
                            {estado === 'sem_estoque'
                              ? 'Sem saldo neste item.'
                              : 'Nenhum volume nesta lista.'}
                          </p>
                        </>
                      ) : (
                        escolhidos.map((linha) => {
                          const vol = volDo(m, linha.lote_id);
                          const max = vol ? qtdeVolumeTotal(vol) : 0;
                          const metragem = insumoComMetragem(m);
                          const polegada = rotuloPolegada(
                            m.origem_texto ?? m.produto?.descricao_comercial ?? m.produto?.descricao_fiscal,
                          );
                          const leitura = vol
                            ? formatLeituraBobina(vol, linha.qtde, larguraMmDoMaterial(m))
                            : null;
                          return (
                            <div key={linha.lote_id} className="form-grid faixa-row">
                              <CampoLeitura
                                label="Produto"
                                value={rotuloProdutoVolume(vol, m.produto)}
                                largo
                              />
                              <CampoLeitura
                                label="Volume"
                                value={vol ? formatLotePick(vol) : `Lote ${linha.lote_id}`}
                              />
                              <CampoLeitura label="Local" value={vol?.endereco?.codigo ?? '—'} />
                              {(m.componente ?? '').toUpperCase() === 'TUBETE' && polegada ? (
                                <CampoLeitura label="Polegada" value={polegada} />
                              ) : null}
                              {metragem ? (
                                <CampoLeitura
                                  label="Medida"
                                  value={vol ? formatVolumeDimensao(vol) ?? '—' : '—'}
                                />
                              ) : vol && formatVolumeDimensao(vol) ? (
                                <CampoLeitura label="Medida" value={formatVolumeDimensao(vol) ?? '—'} />
                              ) : null}
                              {metragem ? (
                                <>
                                  <CampoLeitura label="Metro quadrado" value={leitura?.m2 ?? '—'} />
                                  <CampoLeitura label="Metro linear" value={leitura?.metros ?? '—'} />
                                </>
                              ) : null}
                              <div className="form-group">
                                <label>Quantidade ({un})</label>
                                <input
                                  inputMode="decimal"
                                  disabled={!podeEditar || busy}
                                  value={linha.qtde}
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
                              </div>
                              {podeEditar ? (
                                <div className="form-group faixa-remove">
                                  <label>&nbsp;</label>
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
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )
                    ) : null}

                    {porVolume && estado === 'ja_saiu' ? (
                      baixados.length === 0 ? (
                        <p className="form-hint" style={{ marginTop: 0 }}>
                          Já saiu da prateleira.
                        </p>
                      ) : (
                        baixados.map((vol) => {
                          const qtde = String(parseQtdeDigitada(vol.qtde_retirar || vol.qtde_volume));
                          const metragem = insumoComMetragem(m);
                          const polegada = rotuloPolegada(
                            m.origem_texto ?? m.produto?.descricao_comercial ?? m.produto?.descricao_fiscal,
                          );
                          const leitura = metragem
                            ? formatLeituraBobina(vol, qtde, larguraMmDoMaterial(m))
                            : null;
                          return (
                            <div key={vol.lote_id ?? vol.codigo} className="form-grid faixa-row">
                              <CampoLeitura
                                label="Produto"
                                value={rotuloProdutoVolume(vol, m.produto)}
                                largo
                              />
                              <CampoLeitura label="Volume" value={formatLotePick(vol)} />
                              <CampoLeitura label="Local" value={vol.endereco?.codigo ?? '—'} />
                              {(m.componente ?? '').toUpperCase() === 'TUBETE' && polegada ? (
                                <CampoLeitura label="Polegada" value={polegada} />
                              ) : null}
                              {metragem ? (
                                <CampoLeitura label="Medida" value={formatVolumeDimensao(vol) ?? '—'} />
                              ) : formatVolumeDimensao(vol) ? (
                                <CampoLeitura label="Medida" value={formatVolumeDimensao(vol) ?? '—'} />
                              ) : null}
                              {metragem ? (
                                <>
                                  <CampoLeitura label="Metro quadrado" value={leitura?.m2 ?? '—'} />
                                  <CampoLeitura label="Metro linear" value={leitura?.metros ?? '—'} />
                                </>
                              ) : null}
                              <CampoLeitura label={`Quantidade (${un})`} value={qtde} />
                            </div>
                          );
                        })
                      )
                    ) : null}

                    {!porVolume ? (
                      <div className="form-grid faixa-row">
                        <div className="form-group span-2">
                          <label>Produto</label>
                          {podeTrocar ? (
                            <select
                              value={String(produtoId)}
                              disabled={busy}
                              onChange={(e) => {
                                const id = Number(e.target.value);
                                const prox = opcoes.find((o) => o.produto_id === id);
                                const teto = parseQtdeDigitada(prox?.qtde_disponivel);
                                setProdutos((prev) => ({ ...prev, [m.id]: id }));
                                setUnidades((prev) => {
                                  const atual = parseQtdeDigitada(prev[m.id] ?? '');
                                  if (teto > 0 && atual > teto) {
                                    return { ...prev, [m.id]: String(teto) };
                                  }
                                  return prev;
                                });
                              }}
                            >
                              {opcoes.map((o) => (
                                <option key={o.produto_id} value={o.produto_id}>
                                  {rotuloOpcao(o)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={
                                opcao
                                  ? rotuloOpcao(opcao)
                                  : nomeProdutoLinha(m.produto)
                              }
                              disabled
                            />
                          )}
                        </div>
                        {opcao?.detalhe ? (
                          <CampoLeitura
                            label={(m.componente ?? '').toUpperCase() === 'TUBETE' ? 'Polegada' : 'Medida'}
                            value={opcao.detalhe}
                          />
                        ) : null}
                        {!m.produto?.controla_lote && (opcao || m.produto?.id) ? (
                          <div className="form-group">
                            <label>Local</label>
                            {aberta && canWrite && produtoId > 0 ? (
                              <LocalSaldoCampo
                                produtoId={produtoId}
                                local={opcao?.local ?? m.local}
                                disabled={busy}
                                onSaved={() => void ressincronizar()}
                              />
                            ) : (
                              <input
                                value={
                                  opcao?.local?.nome?.trim() ||
                                  opcao?.local?.codigo ||
                                  m.local?.nome?.trim() ||
                                  m.local?.codigo ||
                                  'Sem local'
                                }
                                disabled
                              />
                            )}
                          </div>
                        ) : null}
                        {opcoes.length > 0 ? (
                          <CampoLeitura
                            label="Em estoque"
                            value={saldoOpcao > 0 ? formatQtdePick(saldoOpcao, un) : 'Sem saldo'}
                          />
                        ) : null}
                        <div className="form-group">
                          <label>Quantidade ({un})</label>
                          <input
                            inputMode="decimal"
                            disabled={estado === 'ja_saiu' || !podeEditarQtde || busy}
                            value={
                              estado === 'ja_saiu'
                                ? String(parseQtdeDigitada(m.qtde_requisitada))
                                : (unidades[m.id] ?? '')
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = parseQtdeDigitada(raw);
                              const qtde = saldoOpcao > 0 && n > saldoOpcao ? String(saldoOpcao) : raw;
                              setUnidades((prev) => ({ ...prev, [m.id]: qtde }));
                            }}
                          />
                        </div>
                      </div>
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
            </div>
          </div>
        ))
      )}

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
