import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoqueQrFilaPanel } from '../components/EstoqueQrFilaPanel';
import { ProdutoCombobox } from '../components/ProdutoCombobox';
import { StatusPill } from '../components/StatusPill';
import { useEstoqueQrFila } from '../hooks/useEstoqueQrFila';
import {
  ApiError,
  api,
  type EstoqueAjuste,
  type EstoqueAjusteMeta,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ajStatusLabel } from '../lib/comprasUi';
import {
  estoqueQrSomaQtde,
  estoqueQrStatusVolume,
  type EstoqueAjusteContagemEvidencia,
} from '../lib/estoqueQrFila';
import { ajuAlcadaLabel, ajuOrigemLabel } from '../lib/estoqueUi';
import { clampDecimalScale, DECIMAL_SCALE, formatCurrency, formatDateTime, formatQty } from '../lib/format';
import { areaM2Volume } from '../lib/nfeExactDimensoes';
import { formatApiFieldErrors } from '../lib/usuarios';

type VolumeLinha = {
  codigo: string;
  qtde: string;
  largura_mm: string;
  comprimento_m: string;
  data_entrada: string;
  data_validade: string;
};

type ModoContagem = 'manual' | 'qr';

function emptyVolume(): VolumeLinha {
  return {
    codigo: '',
    qtde: '',
    largura_mm: '',
    comprimento_m: '',
    data_entrada: '',
    data_validade: '',
  };
}

function somaVolumes(vols: VolumeLinha[]): string {
  let s = 0;
  for (const v of vols) {
    const n = Number(String(v.qtde).replace(',', '.'));
    if (n > 0) s += n;
  }
  return clampDecimalScale(String(s), DECIMAL_SCALE.qty) || '0.0000';
}

function sameUser(a?: number | null, b?: number | null): boolean {
  return a != null && b != null && Number(a) === Number(b);
}

/** A03/VIRADA / lote_payload → volumes físicos → etiquetas Elgin. */
function ajuPedeEtiquetasVolume(a: EstoqueAjuste): boolean {
  if (a.lote_payload && a.lote_payload.length > 0) return true;
  if (a.motivo_codigo === 'A03') return true;
  if (a.origem === 'VIRADA') return true;
  return false;
}

export function EstoqueAjustesPage() {
  const { hasPermission, user } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const canAprovar = hasPermission('estoque.aprovar');
  const canGestor = hasPermission('estoque.aprovar_gestor');
  const [ajustes, setAjustes] = useState<EstoqueAjuste[]>([]);
  const [meta, setMeta] = useState<EstoqueAjusteMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('PENDENTE');

  const [produto, setProduto] = useState<Produto | null>(null);
  const [motivo, setMotivo] = useState('A01');
  const [complemento, setComplemento] = useState('');
  const [qtdeContada, setQtdeContada] = useState('');
  const [checklist, setChecklist] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [loteCodigo, setLoteCodigo] = useState('');
  const [loteEntrada, setLoteEntrada] = useState('');
  const [loteValidade, setLoteValidade] = useState('');
  const [volumes, setVolumes] = useState<VolumeLinha[]>([emptyVolume()]);
  const [modoContagem, setModoContagem] = useState<ModoContagem>('qr');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [causaAprovar, setCausaAprovar] = useState('');
  const [cienciaDir, setCienciaDir] = useState(false);
  const [cienciaCont, setCienciaCont] = useState(false);
  /** Após aprovar A03/VIRADA com volumes — CTA para Elgin 50×40. */
  const [etiquetasMovimentoId, setEtiquetasMovimentoId] = useState<number | null>(null);

  const selectedProduto = produto;
  const produtoControlaLote = !!selectedProduto?.controla_lote;
  const isSaldoInicial = motivo === 'A03';
  const usaVolumesVirada = isSaldoInicial && produtoControlaLote;
  const mostraLxC = usaVolumesVirada;
  const podeQr = !usaVolumesVirada && (!produto || produtoControlaLote);
  const usaQr = podeQr && modoContagem === 'qr';

  const inferirProdutoDoVolume = useCallback(async (vol: { produto: { id: number } | null }) => {
    if (!vol.produto?.id) return;
    try {
      const res = await api.get<{ data: Produto }>(`/produtos/${vol.produto.id}`);
      setProduto(res.data);
      if (!res.data.controla_lote) {
        setModoContagem('manual');
        setError('Este SKU não controla volume — use contagem manual.');
      }
    } catch {
      /* produto já pode estar selecionado; falha silenciosa na inferência */
    }
  }, []);

  const qr = useEstoqueQrFila({
    canWrite,
    produtoIdEsperado: usaQr ? produto?.id ?? null : null,
    onPrimeiroVolume: usaQr && !produto ? inferirProdutoDoVolume : undefined,
    focoInicial: false,
  });

  useEffect(() => {
    if (!usaQr) return;
    if (qr.fila.length === 0) {
      setQtdeContada('');
      return;
    }
    setQtdeContada(
      clampDecimalScale(estoqueQrSomaQtde(qr.fila), DECIMAL_SCALE.qty) || '0.0000',
    );
  }, [usaQr, qr.fila]);

  useEffect(() => {
    if (usaVolumesVirada || (produto && !produto.controla_lote)) {
      if (modoContagem !== 'manual') setModoContagem('manual');
    }
  }, [usaVolumesVirada, produto, modoContagem]);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFiltro) qs.set('status', statusFiltro);
      if (de) qs.set('de', de);
      if (ate) qs.set('ate', ate);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const aj = await api.get<{ data: EstoqueAjuste[]; meta: EstoqueAjusteMeta }>(
        `/estoque/ajustes${suffix}`,
      );
      setAjustes(aj.data);
      setMeta(aj.meta);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao carregar ajustes.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    document.getElementById('aju-conferir')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedId]);

  const selected = ajustes.find((a) => a.id === selectedId) ?? null;

  const patchVolume = (idx: number, patch: Partial<VolumeLinha>) => {
    setVolumes((prev) => {
      const next = prev.map((v, i) => {
        if (i !== idx) return v;
        const row = { ...v, ...patch };
        const unidM2 = selectedProduto?.unidade_interna?.toUpperCase() === 'M2';
        if (
          unidM2 &&
          (patch.largura_mm !== undefined || patch.comprimento_m !== undefined) &&
          row.largura_mm &&
          row.comprimento_m
        ) {
          const area = areaM2Volume(row.largura_mm, row.comprimento_m);
          if (Number(area) > 0) row.qtde = area;
        }
        return row;
      });
      if (usaVolumesVirada) {
        setQtdeContada(somaVolumes(next));
      }
      return next;
    });
  };

  const openAprovar = (a: EstoqueAjuste) => {
    setError(null);
    setMsg(null);
    setSelectedId(a.id);
    setCausaAprovar(a.causa_raiz ?? '');
    setCienciaDir(!!a.ciencia_diretoria);
    setCienciaCont(!!a.ciencia_contabilidade);
  };

  const closeAprovar = () => {
    setSelectedId(null);
    setCausaAprovar('');
    setCienciaDir(false);
    setCienciaCont(false);
  };

  const buildContagemEvidencia = (): EstoqueAjusteContagemEvidencia | null => {
    if (!usaQr || !qr.endereco || qr.fila.length === 0) return null;
    const soma = clampDecimalScale(estoqueQrSomaQtde(qr.fila), DECIMAL_SCALE.qty) || '0.0000';
    return {
      modo: 'QR_VOLUME_LOCAL',
      endereco: { id: qr.endereco.id, codigo: qr.endereco.codigo },
      qtde_soma: soma,
      volumes: qr.fila.map((v) => ({
        lote_id: v.lote_id,
        codigo: v.codigo,
        qtde: clampDecimalScale(String(v.qtde).replace(',', '.'), DECIMAL_SCALE.qty) || '0.0000',
        unidade: v.unidade,
        status: estoqueQrStatusVolume(v, qr.endereco),
        endereco_atual: v.endereco?.codigo ?? null,
      })),
    };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite || !produto) return;
    setError(null);
    setMsg(null);

    if (usaQr) {
      if (qr.fila.length === 0) {
        setError('Inclua ao menos 1 volume na fila QR.');
        return;
      }
      if (!qr.endereco) {
        setError('Confirme o local (QR END:…) antes de solicitar o ajuste.');
        return;
      }
    }

    setSaving(true);
    try {
      const qtde =
        usaVolumesVirada
          ? somaVolumes(volumes)
          : usaQr
            ? clampDecimalScale(estoqueQrSomaQtde(qr.fila), DECIMAL_SCALE.qty) || '0.0000'
            : qtdeContada;

      const payload: Record<string, unknown> = {
        produto_id: Number(produto!.id),
        motivo_codigo: motivo,
        motivo_complemento: complemento || null,
        qtde_contada: qtde,
        checklist_confirmado: checklist,
        observacao: observacao || null,
        origem: 'CONTAGEM_AVULSA',
      };

      if (usaVolumesVirada) {
        const linhas = volumes
          .filter((v) => Number(String(v.qtde).replace(',', '.')) > 0)
          .map((v) => ({
            codigo: v.codigo.trim() || undefined,
            qtde: clampDecimalScale(v.qtde.replace(',', '.'), DECIMAL_SCALE.qty),
            largura_mm: v.largura_mm.trim() || undefined,
            comprimento_m: v.comprimento_m.trim() || undefined,
            data_entrada: v.data_entrada || undefined,
            data_validade: v.data_validade || undefined,
          }));
        if (linhas.length > 0) {
          payload.lote_payload = linhas;
        }
      } else if (usaQr) {
        const evidencia = buildContagemEvidencia();
        if (evidencia) {
          payload.contagem_evidencia = evidencia;
        }
      } else if (produtoControlaLote) {
        payload.lote_codigo = loteCodigo || null;
        payload.lote_data_entrada = loteEntrada || null;
        payload.lote_data_validade = loteValidade || null;
      }

      await api.post('/estoque/ajustes', payload);
      setProduto(null);
      setQtdeContada('');
      setComplemento('');
      setObservacao('');
      setLoteCodigo('');
      setLoteEntrada('');
      setLoteValidade('');
      setVolumes([emptyVolume()]);
      setChecklist(false);
      qr.limparTudo();
      setMsg('Solicitação de ajuste registrada.');
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao solicitar ajuste.',
      );
    } finally {
      setSaving(false);
    }
  };

  const aprovar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMsg(null);
    setEtiquetasMovimentoId(null);
    setSaving(true);
    const pedirEtiquetas = ajuPedeEtiquetasVolume(selected);
    try {
      const res = await api.post<{
        data: {
          ajuste: EstoqueAjuste;
          movimento?: { id: number; codigo: string; tipo: string } | null;
        };
      }>(`/estoque/ajustes/${selected.id}/aprovar`, {
        causa_raiz: causaAprovar || selected.causa_raiz || null,
        ciencia_diretoria: cienciaDir,
        ciencia_contabilidade: cienciaCont,
      });
      const movId = res.data.movimento?.id ?? res.data.ajuste?.movimento_id ?? null;
      setMsg(`${selected.codigo} aprovado.`);
      if (pedirEtiquetas && movId) {
        setEtiquetasMovimentoId(movId);
      }
      closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? formatApiFieldErrors(err.details, err.message) : 'Falha ao aprovar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const rejeitar = async () => {
    if (!selected) return;
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      await api.post(`/estoque/ajustes/${selected.id}/rejeitar`, {
        observacao: 'Rejeitado na conferência',
      });
      setMsg(`${selected.codigo} rejeitado.`);
      closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao rejeitar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async (id: number) => {
    if (
      !window.confirm(
        'Cancelar esta solicitação de ajuste? O registro permanece no histórico como CANCELADO.',
      )
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await api.post(`/estoque/ajustes/${id}/cancelar`);
      if (selectedId === id) closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao cancelar.',
      );
    }
  };

  const motivoFiscal = ['A04', 'A06', 'A09'].includes(motivo);
  const solicitanteSouEu = sameUser(user?.id, selected?.solicitado_por?.id);
  const podeAprovarSelecionado =
    !!selected &&
    selected.status === 'PENDENTE' &&
    canAprovar &&
    !solicitanteSouEu &&
    ((selected.alcada ?? 'LIDER') === 'LIDER' || canGestor);

  return (
    <>
      <PageHeader
        title="Ajustes de estoque"
        description="AJU nasce pendente. Outro usuário com alçada confere e aprova — o saldo só muda no movimento. Contagem avulsa com volume etiquetado: QR (volume + local), mesma dinâmica do Guardar. Motivo A03 = virada/saldo inicial; inventário cíclico nasce em Inventários."
      />

      <EstoqueModuleNav />

      {msg && (
        <div className="alert alert-success" style={{ display: 'grid', gap: '0.65rem' }}>
          <div>{msg}</div>
          {etiquetasMovimentoId != null && (
            <div className="btn-row" style={{ margin: 0 }}>
              <Link
                className="btn btn-primary btn-sm"
                to={`/estoque/lotes/etiquetas?movimento_id=${etiquetasMovimentoId}`}
              >
                Imprimir etiquetas dos volumes
              </Link>
              <Link className="btn btn-secondary btn-sm" to="/estoque/guardar">
                Guardar no local
              </Link>
            </div>
          )}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {canWrite && !selected && (
        <form onSubmit={submit} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Nova contagem avulsa</h3>
              <p className="muted" style={{ marginBottom: '0.85rem' }}>
                Divergência pontual autorizada. Inventário cíclico/geral nasce em Inventários.
                Motivo <strong>A03</strong> = saldo inicial — volumes físicos quando o SKU controla
                lote. Demais motivos com bobina etiquetada: preferir contagem por QR (local →
                volumes).
              </p>

              {podeQr && (
                <div style={{ marginBottom: '1rem' }}>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Modo de contagem"
                    style={{ maxWidth: '28rem' }}
                  >
                    <button
                      type="button"
                      role="tab"
                      className={`tab${modoContagem === 'qr' ? ' active' : ''}`}
                      aria-selected={modoContagem === 'qr'}
                      onClick={() => {
                        setModoContagem('qr');
                        setError(null);
                      }}
                    >
                      Por QR (volume + local)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`tab${modoContagem === 'manual' ? ' active' : ''}`}
                      aria-selected={modoContagem === 'manual'}
                      onClick={() => {
                        setModoContagem('manual');
                        qr.limparTudo();
                        setError(null);
                      }}
                    >
                      Manual
                    </button>
                  </div>
                  <p className="catalogo-tab-hint" style={{ maxWidth: '42rem', marginTop: '-0.35rem' }}>
                    A qtde contada é a soma dos volumes lidos no local. Local errado corrige-se no
                    Guardar — o AJU só altera saldo na aprovação.
                  </p>
                </div>
              )}

              <div className="form-grid">
                <ProdutoCombobox
                  className="span-full"
                  label="Produto"
                  value={produto}
                  onChange={(p) => {
                    setProduto(p);
                    setVolumes([emptyVolume()]);
                    if (!p) setQtdeContada('');
                    if (p && !p.controla_lote) {
                      setModoContagem('manual');
                      qr.limparTudo();
                    }
                  }}
                  familias={['MP', 'EMB', 'REV']}
                  required
                  showSummary
                  placeholder="Buscar por código, descrição, NCM ou grupo…"
                  emptyMessage="Nenhum MP/EMB/REV encontrado. Ajuste o termo ou cadastre o SKU."
                />
                <div className="form-group">
                  <label>Motivo</label>
                  <select
                    value={motivo}
                    onChange={(e) => {
                      setMotivo(e.target.value);
                      if (e.target.value === 'A03') {
                        setVolumes([emptyVolume()]);
                        qr.limparTudo();
                      }
                    }}
                  >
                    {(meta?.motivos ?? []).map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.codigo} — {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Qtde contada
                    {selectedProduto?.unidade_interna
                      ? ` (${selectedProduto.unidade_interna})`
                      : ''}
                  </label>
                  <input
                    required
                    inputMode="decimal"
                    value={qtdeContada}
                    onChange={(e) => setQtdeContada(e.target.value)}
                    placeholder="0.0000"
                    readOnly={usaVolumesVirada || usaQr}
                    title={
                      usaVolumesVirada
                        ? 'Preenchida pela soma dos volumes abaixo'
                        : usaQr
                          ? 'Preenchida pela soma dos volumes da fila QR'
                          : undefined
                    }
                  />
                </div>

                {usaQr && (
                  <div className="form-group span-full">
                    <EstoqueQrFilaPanel
                      qr={qr}
                      idPrefix="aju_qr"
                      embedded
                      avisarLocalErrado
                      hint="Leitor USB / paste + Enter. Monte a fila no local e solicite o AJU abaixo — a leitura não grava saldo."
                    />
                    {qr.fila.length > 0 && (
                      <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                        Soma da fila: {formatQty(estoqueQrSomaQtde(qr.fila))}{' '}
                        {selectedProduto?.unidade_interna ?? qr.fila[0]?.unidade ?? ''}
                        {qr.endereco ? ` · local ${qr.endereco.codigo}` : ' · confirme o local'}
                      </p>
                    )}
                  </div>
                )}

                {usaVolumesVirada && (
                  <div className="form-group span-full">
                    <div className="oc-volumes-panel oc-volumes-panel--compact">
                      <div className="oc-volumes-panel__bar">
                        <strong>Volumes de abertura</strong>
                        <span className="muted">
                          Um por bobina · soma = qtde contada
                          {selectedProduto?.unidade_interna?.toUpperCase() === 'M2'
                            ? ' · L×C preenche M²'
                            : ''}
                        </span>
                      </div>
                      <div className="oc-volumes-scroll">
                        <table className="oc-volumes-table">
                          <thead>
                            <tr>
                              <th className="col-idx">#</th>
                              <th className="col-lote">Código / nLote</th>
                              {mostraLxC && <th className="col-dim">Largura mm</th>}
                              {mostraLxC && <th className="col-dim">Comp. m</th>}
                              <th className="col-num">Qtde</th>
                              <th className="col-date">Entrada</th>
                              {selectedProduto?.controla_validade && (
                                <th className="col-date">Validade</th>
                              )}
                              <th className="col-acoes" />
                            </tr>
                          </thead>
                          <tbody>
                            {volumes.map((v, idx) => (
                              <tr key={idx}>
                                <td className="col-idx">{idx + 1}</td>
                                <td className="col-lote">
                                  <input
                                    value={v.codigo}
                                    onChange={(e) =>
                                      patchVolume(idx, { codigo: e.target.value })
                                    }
                                    placeholder={`VIR-${selectedProduto?.codigo ?? 'SKU'}-${idx + 1}`}
                                  />
                                </td>
                                {mostraLxC && (
                                  <td className="col-dim">
                                    <input
                                      inputMode="decimal"
                                      value={v.largura_mm}
                                      onChange={(e) =>
                                        patchVolume(idx, { largura_mm: e.target.value })
                                      }
                                      placeholder="210"
                                    />
                                  </td>
                                )}
                                {mostraLxC && (
                                  <td className="col-dim">
                                    <input
                                      inputMode="decimal"
                                      value={v.comprimento_m}
                                      onChange={(e) =>
                                        patchVolume(idx, { comprimento_m: e.target.value })
                                      }
                                      placeholder="1000"
                                    />
                                  </td>
                                )}
                                <td className="col-num">
                                  <input
                                    required
                                    inputMode="decimal"
                                    value={v.qtde}
                                    onChange={(e) =>
                                      patchVolume(idx, { qtde: e.target.value })
                                    }
                                    placeholder="0.0000"
                                  />
                                </td>
                                <td className="col-date">
                                  <input
                                    type="date"
                                    value={v.data_entrada}
                                    onChange={(e) =>
                                      patchVolume(idx, { data_entrada: e.target.value })
                                    }
                                  />
                                </td>
                                {selectedProduto?.controla_validade && (
                                  <td className="col-date">
                                    <input
                                      type="date"
                                      value={v.data_validade}
                                      onChange={(e) =>
                                        patchVolume(idx, { data_validade: e.target.value })
                                      }
                                    />
                                  </td>
                                )}
                                <td className="col-acoes">
                                  {volumes.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => {
                                        const next = volumes.filter((_, i) => i !== idx);
                                        setVolumes(next);
                                        setQtdeContada(somaVolumes(next));
                                      }}
                                    >
                                      Remover
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="form-actions" style={{ marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setVolumes((prev) => [...prev, emptyVolume()])}
                        >
                          + Volume
                        </button>
                        <span className="muted">
                          Soma: {formatQty(somaVolumes(volumes))}{' '}
                          {selectedProduto?.unidade_interna ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {produtoControlaLote && !usaVolumesVirada && !usaQr && (
                  <>
                    <div className="form-group">
                      <label>Lote (opcional na baixa / informado na entrada)</label>
                      <input
                        value={loteCodigo}
                        onChange={(e) => setLoteCodigo(e.target.value)}
                        placeholder="Lote do fornecedor"
                      />
                    </div>
                    <div className="form-group">
                      <label>Entrada do lote</label>
                      <input
                        type="date"
                        value={loteEntrada}
                        onChange={(e) => setLoteEntrada(e.target.value)}
                      />
                    </div>
                    {selectedProduto?.controla_validade && (
                      <div className="form-group">
                        <label>Vencimento</label>
                        <input
                          type="date"
                          value={loteValidade}
                          onChange={(e) => setLoteValidade(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label>Complemento / evidência</label>
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </div>
                <div className="form-group span-2">
                  <label>Observação</label>
                  <input
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>
                <div className="form-group span-full">
                  <label className="checkbox-item" style={{ maxWidth: '40rem' }}>
                    <input
                      type="checkbox"
                      checked={checklist}
                      onChange={(e) => setChecklist(e.target.checked)}
                      required
                    />
                    <span>
                      Confirmei o checklist (NF pendente, OP, sobra, endereço, unidade) — ajuste é
                      último recurso.
                    </span>
                  </label>
                </div>
              </div>
              {motivoFiscal && (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                  Pode exigir NF-e de baixa (CFOP 5.927) — validar com a contabilidade. O ERP não
                  emite a nota pelo ajuste.
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || !checklist}>
                  {saving ? 'Salvando…' : 'Solicitar AJU'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <p className="muted" style={{ margin: '0 0 0.85rem' }}>
            Fila da alçada. Quem solicitou não aprova. Pendente pode ser cancelado — o registro
            permanece no histórico.
          </p>
          <div className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group">
              <label>Situação</label>
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                <option value="PENDENTE">Pendentes (fila)</option>
                <option value="">Todas</option>
                <option value="APROVADO">Aprovados</option>
                <option value="REJEITADO">Rejeitados</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
            <div className="form-group">
              <label>De</label>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Até</label>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="button" className="btn btn-secondary" onClick={() => void load()}>
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {selected && selected.status === 'PENDENTE' && (
        <form
          id="aju-conferir"
          onSubmit={(e) => void aprovar(e)}
          style={{ marginBottom: '1rem' }}
        >
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Conferir {selected.codigo}</h3>
                <div className="detail-meta" style={{ marginBottom: '1rem' }}>
                  <div>
                    <span>Produto</span>
                    <strong>{selected.produto?.codigo}</strong>
                  </div>
                  <div>
                    <span>Sistema</span>
                    <strong>
                      {formatQty(selected.qtde_sistema)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Contado</span>
                    <strong>
                      {formatQty(selected.qtde_contada)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Diferença</span>
                    <strong>
                      {formatQty(selected.qtde_diferenca)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Valor</span>
                    <strong>
                      {selected.valor_ajuste != null
                        ? formatCurrency(selected.valor_ajuste)
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Alçada</span>
                    <strong>{ajuAlcadaLabel(selected.alcada)}</strong>
                  </div>
                  <div>
                    <span>Origem</span>
                    <strong>{ajuOrigemLabel(selected.origem)}</strong>
                  </div>
                  <div>
                    <span>Solicitado por</span>
                    <strong>{selected.solicitado_por?.name ?? '—'}</strong>
                  </div>
                </div>
                <p className="muted" style={{ marginTop: 0, marginBottom: '1rem' }}>
                  {selected.produto?.descricao_fiscal}
                  {selected.motivo_codigo
                    ? ` · ${selected.motivo_codigo} ${selected.motivo_nome ?? ''}`
                    : ''}
                </p>

                {selected.lote_payload && selected.lote_payload.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p className="muted" style={{ margin: '0 0 0.5rem' }}>
                      Volumes de abertura ({selected.lote_payload.length})
                    </p>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>L × C</th>
                            <th>Qtde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.lote_payload.map((v, i) => (
                            <tr key={i}>
                              <td>{v.codigo ?? '—'}</td>
                              <td className="muted">
                                {v.largura_mm || v.comprimento_m
                                  ? `${v.largura_mm ?? '—'} mm × ${v.comprimento_m ?? '—'} m`
                                  : '—'}
                              </td>
                              <td className="num">
                                {formatQty(v.qtde)} {selected.unidade}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selected.contagem_evidencia?.volumes &&
                  selected.contagem_evidencia.volumes.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p className="muted" style={{ margin: '0 0 0.5rem' }}>
                        Contagem por QR — local{' '}
                        <strong>{selected.contagem_evidencia.endereco.codigo}</strong> ·{' '}
                        {selected.contagem_evidencia.volumes.length} volume(s) · soma{' '}
                        {formatQty(selected.contagem_evidencia.qtde_soma)} {selected.unidade}
                      </p>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Volume</th>
                              <th>Qtde</th>
                              <th>Status</th>
                              <th>Local no sistema</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.contagem_evidencia.volumes.map((v) => (
                              <tr key={v.lote_id}>
                                <td>
                                  <strong>{v.codigo}</strong>
                                </td>
                                <td className="num">
                                  {formatQty(v.qtde)} {v.unidade ?? selected.unidade}
                                </td>
                                <td>
                                  {v.status === 'LOCAL_ERRADO'
                                    ? 'Local errado'
                                    : v.status === 'ENCONTRADO'
                                      ? 'No local'
                                      : 'Sem local'}
                                </td>
                                <td className="muted">{v.endereco_atual ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selected.contagem_evidencia.volumes.some(
                        (v) => v.status === 'LOCAL_ERRADO',
                      ) && (
                        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                          Local errado não se corrige aqui — use{' '}
                          <Link to="/estoque/guardar">Guardar no local</Link>.
                        </p>
                      )}
                    </div>
                  )}

                {solicitanteSouEu && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    Quem solicitou o ajuste não pode aprová-lo (segregação de funções). Entre com
                    outro usuário que tenha alçada de estoque.
                  </div>
                )}

                {(selected.divergencia_relevante || selected.alcada === 'DIRECAO') && (
                  <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="form-group span-2">
                      <label>Causa raiz</label>
                      <input
                        value={causaAprovar}
                        onChange={(e) => setCausaAprovar(e.target.value)}
                        placeholder="Obrigatória em divergência relevante / alçada direção"
                        required={
                          !!selected.divergencia_relevante || selected.alcada === 'DIRECAO'
                        }
                      />
                    </div>
                  </div>
                )}

                {selected.alcada === 'DIRECAO' && canGestor && (
                  <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={cienciaDir}
                          onChange={(e) => setCienciaDir(e.target.checked)}
                          required
                        />
                        <span>Ciência diretoria</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={cienciaCont}
                          onChange={(e) => setCienciaCont(e.target.checked)}
                          required
                        />
                        <span>Ciência contabilidade</span>
                      </label>
                    </div>
                  </div>
                )}

                {(selected.alcada ?? 'LIDER') !== 'LIDER' && !canGestor && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    Esta solicitação exige alçada de gestor.
                  </div>
                )}

                <div className="form-actions">
                  {podeAprovarSelecionado && (
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Aprovando…' : 'Aprovar e lançar movimento'}
                    </button>
                  )}
                  {podeAprovarSelecionado && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={() => void rejeitar()}
                    >
                      Rejeitar
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={closeAprovar}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : ajustes.length === 0 ? (
            <div className="empty-state">
              {statusFiltro === 'PENDENTE'
                ? 'Nenhum ajuste pendente de aprovação.'
                : 'Nenhum ajuste neste filtro.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Sistema</th>
                  <th>Contado</th>
                  <th>Δ / Valor</th>
                  <th>Motivo</th>
                  <th>Alçada</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr
                    key={a.id}
                    style={
                      selectedId === a.id
                        ? { background: 'rgba(26, 53, 104, 0.06)' }
                        : undefined
                    }
                  >
                    <td>
                      {a.codigo}
                      <div className="muted">{ajuOrigemLabel(a.origem)}</div>
                    </td>
                    <td>
                      <strong>{a.produto?.codigo}</strong>
                      <div className="muted">{a.produto?.descricao_fiscal}</div>
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_sistema)} {a.unidade}
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_contada)} {a.unidade}
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_diferenca)}
                      <div className="muted">
                        {a.valor_ajuste != null ? formatCurrency(a.valor_ajuste) : '—'}
                      </div>
                    </td>
                    <td>
                      {a.motivo_codigo}
                      <div className="muted">{a.motivo_nome}</div>
                      {a.aviso_fiscal && <div className="muted">{a.aviso_fiscal}</div>}
                    </td>
                    <td>
                      {ajuAlcadaLabel(a.alcada)}
                      {a.divergencia_relevante && <div className="muted">Relevante</div>}
                    </td>
                    <td>
                      <StatusPill status={ajStatusLabel(a.status)} />
                      <div className="muted" style={{ marginTop: '0.25rem' }}>
                        {a.solicitado_por?.name}
                      </div>
                      <div className="muted">{formatDateTime(a.created_at)}</div>
                      {a.movimento && <div className="muted">{a.movimento.codigo}</div>}
                    </td>
                    <td>
                      <div className="table-actions">
                        {a.status === 'APROVADO' &&
                          a.movimento_id != null &&
                          ajuPedeEtiquetasVolume(a) && (
                            <Link
                              className="btn btn-secondary btn-sm"
                              to={`/estoque/lotes/etiquetas?movimento_id=${a.movimento_id}`}
                            >
                              Etiquetas
                            </Link>
                          )}
                        {a.status === 'PENDENTE' &&
                          canWrite &&
                          (sameUser(user?.id, a.solicitado_por?.id) || canAprovar) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void cancelar(a.id)}
                            >
                              Cancelar
                            </button>
                          )}
                        {a.status === 'PENDENTE' && canAprovar && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openAprovar(a)}
                          >
                            Conferir
                          </button>
                        )}
                        {a.status === 'PENDENTE' && !canAprovar && (
                          <span className="muted">
                            {sameUser(user?.id, a.solicitado_por?.id)
                              ? 'Você solicitou — outro usuário com alçada aprova'
                              : 'Aguardando quem tem alçada de estoque'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
