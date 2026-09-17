import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoqueQrFilaPanel } from '../components/EstoqueQrFilaPanel';
import { IconAlertCircle, IconBan, IconCheck, IconEye, IconTag } from '../components/NavIcons';
import { ProdutoCombobox } from '../components/ProdutoCombobox';
import { StatusPill } from '../components/StatusPill';
import { useEstoqueQrFila } from '../hooks/useEstoqueQrFila';
import {
  ApiError,
  api,
  type EstoqueAjuste,
  type EstoqueAjusteMeta,
  type EstoqueLote,
  type EstoqueSaldo,
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
import {
  clampDecimalScale,
  DECIMAL_SCALE,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQty,
} from '../lib/format';
import { areaM2Volume } from '../lib/nfeExactDimensoes';
import { qtdeComercialFromAreaM2 } from '../lib/ocComposicaoVolumes';
import { formatApiFieldErrors } from '../lib/usuarios';

/** Normaliza un. para comparar M2 (aceita M² / m²). */
function normUnidadeAjuste(u: string | null | undefined): string {
  return String(u ?? '')
    .trim()
    .toUpperCase()
    .replace('M²', 'M2');
}

type VolumeLinha = {
  codigo: string;
  qtde: string;
  largura_mm: string;
  comprimento_m: string;
  data_entrada: string;
  data_validade: string;
};

type VolumeBaixaLinha = {
  lote_id: number;
  codigo: string;
  qtde_disponivel: string;
  qtde: string;
  largura_mm: string | null;
  comprimento_m: string | null;
};

type ModoContagem = 'manual' | 'qr';
type ModoVolume = 'entrada' | 'baixa';

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

function parseQty(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function somaVolumes(vols: VolumeLinha[]): string {
  let s = 0;
  for (const v of vols) {
    const n = parseQty(v.qtde);
    if (n > 0) s += n;
  }
  return clampDecimalScale(String(s), DECIMAL_SCALE.qty) || '0.0000';
}

function somaBaixas(vols: VolumeBaixaLinha[]): string {
  let s = 0;
  for (const v of vols) {
    const n = parseQty(v.qtde);
    if (n > 0) s += n;
  }
  return clampDecimalScale(String(s), DECIMAL_SCALE.qty) || '0.0000';
}

function qtyAdd(a: string, b: string): string {
  return clampDecimalScale(String(parseQty(a) + parseQty(b)), DECIMAL_SCALE.qty) || '0.0000';
}

function qtySub(a: string, b: string): string {
  return clampDecimalScale(String(parseQty(a) - parseQty(b)), DECIMAL_SCALE.qty) || '0.0000';
}

function sameUser(a?: number | null, b?: number | null): boolean {
  return a != null && b != null && Number(a) === Number(b);
}

/** lote_payload com volumes novos → etiquetas Elgin após aprovar. */
function ajuPedeEtiquetasVolume(a: EstoqueAjuste): boolean {
  const payload = a.lote_payload;
  if (!payload || payload.length === 0) return false;
  return payload.some((v) => v.volume_novo !== false && !v.lote_id);
}

/** Contagem de bobinas alocadas (Writer) — não confundir com valor_ajuste (R$). */
function ajuVolumesAlocados(a: EstoqueAjuste): number {
  return a.lote_payload?.length ?? 0;
}

function ajuVolumesEvidencia(a: EstoqueAjuste): number {
  return a.contagem_evidencia?.volumes?.length ?? 0;
}

/** Linha secundária da lista: N volume(s) com sentido ou evidência QR. */
function ajuResumoVolumesLinha(a: EstoqueAjuste): string | null {
  const n = ajuVolumesAlocados(a);
  if (n > 0) {
    const sentido = Number(a.qtde_diferenca) < 0 ? 'baixa' : 'entrada';
    return `${n} volume(s) · ${sentido}`;
  }
  const e = ajuVolumesEvidencia(a);
  if (e > 0) return `${e} volume(s) · QR evidência`;
  return null;
}

/** Qtde física + L×C dos volumes — leitura/conferência; sem alterar saldo. */
function AjusteVolumesPainel({ a }: { a: EstoqueAjuste }) {
  const payload = a.lote_payload;
  const evidencia = a.contagem_evidencia;
  const temPayload = !!payload && payload.length > 0;
  const temEvidencia = !!evidencia?.volumes && evidencia.volumes.length > 0;
  if (!temPayload && !temEvidencia) return null;

  return (
    <>
      {temPayload && (
        <div style={{ marginBottom: '1rem' }}>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Volumes ({payload!.length})
            {Number(a.qtde_diferenca) < 0 ? ' · baixa' : ' · entrada'}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>L × C</th>
                  <th>Qtde do volume</th>
                </tr>
              </thead>
              <tbody>
                {payload!.map((v, i) => (
                  <tr key={i}>
                    <td>{v.codigo ?? (v.lote_id ? `#${v.lote_id}` : '—')}</td>
                    <td className="muted">
                      {v.largura_mm || v.comprimento_m
                        ? `${v.largura_mm ?? '—'} mm × ${v.comprimento_m ?? '—'} m`
                        : '—'}
                    </td>
                    <td className="num">
                      {formatQty(v.qtde)} {a.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {temEvidencia && (
        <div style={{ marginBottom: '1rem' }}>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Contagem por QR — local <strong>{evidencia!.endereco.codigo}</strong> ·{' '}
            {evidencia!.volumes.length} volume(s) · soma{' '}
            {formatQty(evidencia!.qtde_soma)} {a.unidade}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Volume</th>
                  <th>Qtde do volume</th>
                  <th>Status</th>
                  <th>Local no sistema</th>
                </tr>
              </thead>
              <tbody>
                {evidencia!.volumes.map((v) => (
                  <tr key={v.lote_id}>
                    <td>
                      <strong>{v.codigo}</strong>
                    </td>
                    <td className="num">
                      {formatQty(v.qtde)} {v.unidade ?? a.unidade}
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
          {evidencia!.volumes.some((v) => v.status === 'LOCAL_ERRADO') && (
            <p className="muted" style={{ margin: '0.5rem 0 0' }}>
              Local errado não se corrige aqui — use{' '}
              <Link to="/estoque/guardar">Guardar no local</Link>.
            </p>
          )}
        </div>
      )}
    </>
  );
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
  const [qtdeSistema, setQtdeSistema] = useState('0.0000');
  const [checklist, setChecklist] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [volumes, setVolumes] = useState<VolumeLinha[]>([emptyVolume()]);
  const [baixas, setBaixas] = useState<VolumeBaixaLinha[]>([]);
  const [modoContagem, setModoContagem] = useState<ModoContagem>('manual');
  const [modoVolume, setModoVolume] = useState<ModoVolume>('entrada');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [causaAprovar, setCausaAprovar] = useState('');
  const [cienciaDir, setCienciaDir] = useState(false);
  const [cienciaCont, setCienciaCont] = useState(false);
  /** Após aprovar AJU com volumes novos — CTA para Elgin 50×40. */
  const [etiquetasMovimentoId, setEtiquetasMovimentoId] = useState<number | null>(null);

  const selectedProduto = produto;
  const produtoControlaLote = !!selectedProduto?.controla_lote;
  const isSaldoInicial = motivo === 'A03';
  const unidadeInternaNorm = normUnidadeAjuste(selectedProduto?.unidade_interna);
  const unidadeComercialNorm = normUnidadeAjuste(selectedProduto?.unidade_comercial);
  const mostraLxC =
    unidadeInternaNorm === 'M2' ||
    unidadeComercialNorm === 'M2' ||
    selectedProduto?.familia === 'MP';
  /** L×C deriva a qtde a registrar quando o SKU opera em M2 (norma BobinaAreaComercial). */
  const lxCPreencheQtde =
    unidadeInternaNorm === 'M2' || unidadeComercialNorm === 'M2';
  const usaVolumesManual = produtoControlaLote && modoContagem === 'manual';
  const usaVolumesEntrada = usaVolumesManual && (isSaldoInicial || modoVolume === 'entrada');
  const usaVolumesBaixa = usaVolumesManual && !isSaldoInicial && modoVolume === 'baixa';
  const podeQr = !isSaldoInicial && (!produto || produtoControlaLote);
  const usaQr = podeQr && modoContagem === 'qr';

  const carregarContextoProduto = useCallback(async (p: Produto | null) => {
    if (!p) {
      setQtdeSistema('0.0000');
      setBaixas([]);
      return;
    }
    try {
      const [saldosRes, lotesRes] = await Promise.all([
        api.get<{ data: EstoqueSaldo[] }>(`/estoque/saldos?produto_id=${p.id}`),
        p.controla_lote
          ? api.get<{ data: EstoqueLote[] }>(`/estoque/lotes?produto_id=${p.id}&com_qtde=1`)
          : Promise.resolve({ data: [] as EstoqueLote[] }),
      ]);
      const saldo = saldosRes.data.find((s) => s.produto_id === p.id);
      const sistema = clampDecimalScale(String(saldo?.qtde ?? '0'), DECIMAL_SCALE.qty) || '0.0000';
      setQtdeSistema(sistema);
      setBaixas(
        (lotesRes.data ?? []).map((l) => ({
          lote_id: l.id,
          codigo: l.codigo,
          qtde_disponivel: clampDecimalScale(String(l.qtde), DECIMAL_SCALE.qty) || '0.0000',
          qtde: '',
          largura_mm: l.largura_mm ?? null,
          comprimento_m: l.comprimento_m ?? null,
        })),
      );
    } catch {
      setQtdeSistema('0.0000');
      setBaixas([]);
    }
  }, []);

  const inferirProdutoDoVolume = useCallback(
    async (vol: { produto: { id: number } | null }) => {
      if (!vol.produto?.id) return;
      try {
        const res = await api.get<{ data: Produto }>(`/produtos/${vol.produto.id}`);
        setProduto(res.data);
        void carregarContextoProduto(res.data);
        if (!res.data.controla_lote) {
          setModoContagem('manual');
          setError('Este SKU não controla volume — use contagem manual.');
        }
      } catch {
        /* produto já pode estar selecionado; falha silenciosa na inferência */
      }
    },
    [carregarContextoProduto],
  );

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
    if (isSaldoInicial || (produto && !produto.controla_lote)) {
      if (modoContagem !== 'manual') setModoContagem('manual');
    }
    if (isSaldoInicial && modoVolume !== 'entrada') {
      setModoVolume('entrada');
    }
  }, [isSaldoInicial, produto, modoContagem, modoVolume]);

  useEffect(() => {
    if (!usaVolumesEntrada) return;
    setQtdeContada(qtyAdd(qtdeSistema, somaVolumes(volumes)));
  }, [usaVolumesEntrada, volumes, qtdeSistema]);

  useEffect(() => {
    if (!usaVolumesBaixa) return;
    setQtdeContada(qtySub(qtdeSistema, somaBaixas(baixas)));
  }, [usaVolumesBaixa, baixas, qtdeSistema]);

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
    setVolumes((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        const row = { ...v, ...patch };
        const mudouDim =
          patch.largura_mm !== undefined || patch.comprimento_m !== undefined;
        if (
          lxCPreencheQtde &&
          mudouDim &&
          row.largura_mm?.trim() &&
          row.comprimento_m?.trim()
        ) {
          const area = areaM2Volume(row.largura_mm, row.comprimento_m);
          const qtde = qtdeComercialFromAreaM2(area, {
            unidade_comercial: selectedProduto?.unidade_comercial,
            unidade_interna: selectedProduto?.unidade_interna,
            fator_conversao: selectedProduto?.fator_conversao,
          });
          if (Number(qtde) > 0) row.qtde = qtde;
        }
        return row;
      }),
    );
  };

  const patchBaixa = (loteId: number, qtde: string) => {
    setBaixas((prev) =>
      prev.map((b) => (b.lote_id === loteId ? { ...b, qtde } : b)),
    );
  };

  const openDetalhe = (a: EstoqueAjuste) => {
    setError(null);
    setMsg(null);
    setSelectedId(a.id);
    setCausaAprovar(a.causa_raiz ?? '');
    setCienciaDir(!!a.ciencia_diretoria);
    setCienciaCont(!!a.ciencia_contabilidade);
  };

  const closeDetalhe = () => {
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

    if (usaVolumesEntrada) {
      const linhas = volumes.filter((v) => parseQty(v.qtde) > 0);
      if (linhas.length === 0) {
        setError('Inclua ao menos 1 volume com quantidade (padrão do recebimento).');
        return;
      }
    }

    if (usaVolumesBaixa) {
      const linhas = baixas.filter((v) => parseQty(v.qtde) > 0);
      if (linhas.length === 0) {
        setError('Informe a quantidade a baixar em ao menos 1 volume.');
        return;
      }
      for (const v of linhas) {
        if (parseQty(v.qtde) > parseQty(v.qtde_disponivel)) {
          setError(`Volume ${v.codigo}: baixa maior que o disponível.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const qtde = usaVolumesEntrada
        ? qtyAdd(qtdeSistema, somaVolumes(volumes))
        : usaVolumesBaixa
          ? qtySub(qtdeSistema, somaBaixas(baixas))
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

      if (usaVolumesEntrada) {
        payload.lote_payload = volumes
          .filter((v) => parseQty(v.qtde) > 0)
          .map((v) => ({
            codigo: v.codigo.trim() || undefined,
            qtde: clampDecimalScale(v.qtde.replace(',', '.'), DECIMAL_SCALE.qty),
            largura_mm: v.largura_mm.trim() || undefined,
            comprimento_m: v.comprimento_m.trim() || undefined,
            data_entrada: v.data_entrada || undefined,
            data_validade: v.data_validade || undefined,
          }));
      } else if (usaVolumesBaixa) {
        payload.lote_payload = baixas
          .filter((v) => parseQty(v.qtde) > 0)
          .map((v) => ({
            lote_id: v.lote_id,
            qtde: clampDecimalScale(v.qtde.replace(',', '.'), DECIMAL_SCALE.qty),
          }));
      } else if (usaQr) {
        const evidencia = buildContagemEvidencia();
        if (evidencia) {
          payload.contagem_evidencia = evidencia;
        }
      }

      await api.post('/estoque/ajustes', payload);
      setProduto(null);
      setQtdeContada('');
      setQtdeSistema('0.0000');
      setComplemento('');
      setObservacao('');
      setVolumes([emptyVolume()]);
      setBaixas([]);
      setModoVolume('entrada');
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
      closeDetalhe();
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
      closeDetalhe();
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
      if (selectedId === id) closeDetalhe();
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
    <div className="estoque-ajustes-page">
      <PageHeader
        title="Ajustes de estoque"
        description="AJU pendente → outro usuário com alçada aprova → saldo só no MOV. Inventário cíclico em Inventários."
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
        <form
          onSubmit={submit}
          className="card estoque-ajustes-form"
          style={{ marginBottom: '0.75rem' }}
        >
          <div className="card-body">
            <div className="form-section">
              <h3>Nova contagem avulsa</h3>
              <p className="muted">
                Divergência pontual. SKU com volume: bobinas como no receber (entrada) ou baixa por
                volume; QR só como evidência.
              </p>

              {podeQr && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div className="tabs" role="tablist" aria-label="Modo de contagem">
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
                      Por volumes
                    </button>
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
                      Por QR (evidência)
                    </button>
                  </div>
                  <p className="catalogo-tab-hint">
                    Local errado → Guardar. AJU só altera saldo na aprovação.
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
                    if (!p) {
                      setQtdeContada('');
                      setQtdeSistema('0.0000');
                      setBaixas([]);
                    } else {
                      void carregarContextoProduto(p);
                      if (!p.controla_lote) {
                        setModoContagem('manual');
                        qr.limparTudo();
                      } else if (!isSaldoInicial) {
                        setModoContagem('manual');
                      }
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
                      setVolumes([emptyVolume()]);
                      if (e.target.value === 'A03') {
                        setModoVolume('entrada');
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
                {produtoControlaLote && !usaQr && !isSaldoInicial && (
                  <div className="form-group">
                    <label>Movimento dos volumes</label>
                    <select
                      value={modoVolume}
                      onChange={(e) => setModoVolume(e.target.value as ModoVolume)}
                    >
                      <option value="entrada">Entrada (registrar bobinas)</option>
                      <option value="baixa">Baixa (debitar volumes existentes)</option>
                    </select>
                  </div>
                )}
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
                    readOnly={usaVolumesEntrada || usaVolumesBaixa || usaQr}
                    title={
                      usaVolumesEntrada
                        ? 'sistema + soma dos volumes de entrada'
                        : usaVolumesBaixa
                          ? 'sistema − soma das baixas'
                          : usaQr
                            ? 'Preenchida pela soma dos volumes da fila QR'
                            : undefined
                    }
                  />
                  {produto && (usaVolumesEntrada || usaVolumesBaixa) && (
                    <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                      Saldo sistema: {formatQty(qtdeSistema)}{' '}
                      {selectedProduto?.unidade_interna ?? ''}
                      {usaVolumesEntrada
                        ? ` · Δ +${formatQty(somaVolumes(volumes))}`
                        : ` · Δ −${formatQty(somaBaixas(baixas))}`}
                    </p>
                  )}
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

                {usaVolumesEntrada && (
                  <div className="form-group span-full">
                    <div className="oc-volumes-panel oc-volumes-panel--compact">
                      <div className="oc-volumes-panel__bar">
                        <strong>
                          {isSaldoInicial ? 'Volumes de abertura' : 'Volumes a registrar'}
                        </strong>
                        <span className="muted">
                          Um por bobina · soma = diferença positiva
                          {mostraLxC && lxCPreencheQtde
                            ? ' · L×C preenche a qtde do volume'
                            : mostraLxC
                              ? ' · informe a qtde do volume (L×C é dimensão)'
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
                              <th className="col-num">
                                Qtde do volume
                                {selectedProduto?.unidade_interna
                                  ? ` (${selectedProduto.unidade_interna})`
                                  : ''}
                              </th>
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
                                    placeholder={`${isSaldoInicial ? 'VIR' : 'AJU'}-${selectedProduto?.codigo ?? 'SKU'}-${idx + 1}`}
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
                                    placeholder={
                                      lxCPreencheQtde ? 'preenche com L×C' : '0.0000'
                                    }
                                    title={
                                      lxCPreencheQtde
                                        ? 'Qtde do volume a registrar — calculada ao informar L×C (editável)'
                                        : 'Qtde do volume a registrar na unidade do SKU'
                                    }
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
                                      onClick={() =>
                                        setVolumes((prev) => prev.filter((_, i) => i !== idx))
                                      }
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
                        <span className="muted" style={{ marginLeft: '0.75rem' }}>
                          Soma: {formatQty(somaVolumes(volumes))}{' '}
                          {selectedProduto?.unidade_interna ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {usaVolumesBaixa && (
                  <div className="form-group span-full">
                    <div className="oc-volumes-panel oc-volumes-panel--compact">
                      <div className="oc-volumes-panel__bar">
                        <strong>Volumes a baixar</strong>
                        <span className="muted">
                          Informe quanto debitar em cada bobina · soma = diferença negativa
                        </span>
                      </div>
                      {baixas.length === 0 ? (
                        <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                          Nenhum volume com saldo neste SKU. Use entrada de volumes ou receba a NF.
                        </p>
                      ) : (
                        <div className="oc-volumes-scroll">
                          <table className="oc-volumes-table">
                            <thead>
                              <tr>
                                <th className="col-lote">Volume</th>
                                {mostraLxC && <th className="col-dim">Dimensão</th>}
                                <th className="col-num">Disponível</th>
                                <th className="col-num">Baixar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {baixas.map((b) => (
                                <tr key={b.lote_id}>
                                  <td className="col-lote">{b.codigo}</td>
                                  {mostraLxC && (
                                    <td className="col-dim">
                                      {b.largura_mm || b.comprimento_m
                                        ? `${b.largura_mm ?? '—'} × ${b.comprimento_m ?? '—'}`
                                        : '—'}
                                    </td>
                                  )}
                                  <td className="col-num">{formatQty(b.qtde_disponivel)}</td>
                                  <td className="col-num">
                                    <input
                                      inputMode="decimal"
                                      value={b.qtde}
                                      onChange={(e) => patchBaixa(b.lote_id, e.target.value)}
                                      placeholder="0.0000"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="muted" style={{ margin: '0.45rem 0 0' }}>
                        Soma baixas: {formatQty(somaBaixas(baixas))}{' '}
                        {selectedProduto?.unidade_interna ?? ''}
                      </p>
                    </div>
                  </div>
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

      {selected && selected.status === 'PENDENTE' && canAprovar && (
        <form
          id="aju-conferir"
          onSubmit={(e) => void aprovar(e)}
          style={{ marginBottom: '0.75rem' }}
        >
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Conferir {selected.codigo}</h3>
                <div className="detail-meta" style={{ marginBottom: '0.75rem' }}>
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
                    <span>Valor (R$)</span>
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
                <p className="muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                  {selected.produto?.descricao_fiscal}
                  {selected.motivo_codigo
                    ? ` · ${selected.motivo_codigo} ${selected.motivo_nome ?? ''}`
                    : ''}
                </p>

                <AjusteVolumesPainel a={selected} />

                {solicitanteSouEu && (
                  <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
                    Quem solicitou o ajuste não pode aprová-lo (segregação de funções). Entre com
                    outro usuário que tenha alçada de estoque.
                  </div>
                )}

                {(selected.divergencia_relevante || selected.alcada === 'DIRECAO') && (
                  <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
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
                  <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
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
                  <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
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
                  <button type="button" className="btn btn-secondary" onClick={closeDetalhe}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {selected && (selected.status !== 'PENDENTE' || !canAprovar) && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>
                {selected.codigo}
                {selected.status === 'PENDENTE'
                  ? ' · pendente'
                  : ` · ${ajStatusLabel(selected.status)}`}
              </h3>
              <div className="detail-meta" style={{ marginBottom: '0.75rem' }}>
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
                  <span>Valor (R$)</span>
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
                {selected.aprovado_por && (
                  <div>
                    <span>Conferido por</span>
                    <strong>{selected.aprovado_por.name}</strong>
                  </div>
                )}
                {selected.movimento && (
                  <div>
                    <span>Movimento</span>
                    <strong>{selected.movimento.codigo}</strong>
                  </div>
                )}
              </div>
              <p className="muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                {selected.produto?.descricao_fiscal}
                {selected.motivo_codigo
                  ? ` · ${selected.motivo_codigo} ${selected.motivo_nome ?? ''}`
                  : ''}
              </p>

              <AjusteVolumesPainel a={selected} />

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeDetalhe}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div className="card-body">
          <div className="estoque-ajustes-toolbar">
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
              <button type="button" className="btn btn-secondary" onClick={() => void load()}>
                Filtrar
              </button>
            </div>
          </div>

          <div className="table-wrap table-wrap--freeze" style={{ margin: 0 }}>
            {loading ? (
              <div className="loading">Carregando…</div>
            ) : ajustes.length === 0 ? (
              <div className="empty-state">
                {statusFiltro === 'PENDENTE'
                  ? 'Nenhum ajuste pendente de aprovação.'
                  : 'Nenhum ajuste neste filtro.'}
              </div>
            ) : (
              <table className="data-table estoque-ajustes-table">
                <thead>
                  <tr>
                    <th>AJU</th>
                    <th>SKU</th>
                    <th className="num">Sist.</th>
                    <th className="num">Cont.</th>
                    <th className="num">Δ</th>
                    <th className="num">R$</th>
                    <th>Motivo</th>
                    <th>Alçada</th>
                    <th>Status</th>
                    <th className="acoes" />
                  </tr>
                </thead>
                <tbody>
                  {ajustes.map((a) => {
                    const resumoVolumes = ajuResumoVolumesLinha(a);
                    const aguardandoAlcada =
                      a.status === 'PENDENTE' &&
                      !canAprovar &&
                      (sameUser(user?.id, a.solicitado_por?.id)
                        ? 'Você solicitou — outro usuário com alçada aprova'
                        : 'Aguardando quem tem alçada de estoque');
                    const statusTitle = [
                      a.solicitado_por?.name,
                      formatDateTime(a.created_at),
                      a.movimento?.codigo,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <tr
                        key={a.id}
                        className={selectedId === a.id ? 'is-selected' : undefined}
                      >
                        <td>
                          {a.codigo}
                          <div className="muted">{ajuOrigemLabel(a.origem)}</div>
                        </td>
                        <td className="estoque-ajustes-sku">
                          <strong>{a.produto?.codigo}</strong>
                          {a.produto?.descricao_fiscal ? (
                            <div
                              className="muted estoque-ajustes-sku-desc"
                              title={a.produto.descricao_fiscal}
                            >
                              {a.produto.descricao_fiscal}
                            </div>
                          ) : null}
                        </td>
                        <td className="num">
                          {formatQty(a.qtde_sistema)}
                          <span className="muted"> {a.unidade}</span>
                        </td>
                        <td className="num">{formatQty(a.qtde_contada)}</td>
                        <td className="num">
                          {formatQty(a.qtde_diferenca)}
                          {resumoVolumes && <div className="muted">{resumoVolumes}</div>}
                        </td>
                        <td className="num">
                          {a.valor_ajuste != null ? formatCurrency(a.valor_ajuste) : '—'}
                        </td>
                        <td title={a.motivo_nome ?? undefined}>
                          {a.motivo_codigo ?? '—'}
                          {a.aviso_fiscal ? (
                            <div className="muted" title={a.aviso_fiscal}>
                              Fiscal
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {ajuAlcadaLabel(a.alcada)}
                          {a.divergencia_relevante ? (
                            <div className="muted">Relevante</div>
                          ) : null}
                        </td>
                        <td title={statusTitle || undefined}>
                          <StatusPill status={ajStatusLabel(a.status)} />
                          <div className="muted">{formatDate(a.created_at)}</div>
                        </td>
                        <td className="acoes">
                          <div className="table-actions">
                            {a.status === 'APROVADO' &&
                              a.movimento_id != null &&
                              ajuPedeEtiquetasVolume(a) && (
                                <Link
                                  className="btn-icon"
                                  to={`/estoque/lotes/etiquetas?movimento_id=${a.movimento_id}`}
                                  title="Etiquetas dos volumes"
                                  aria-label={`Etiquetas de ${a.codigo}`}
                                >
                                  <IconTag />
                                </Link>
                              )}
                            {a.status === 'PENDENTE' &&
                              canWrite &&
                              (sameUser(user?.id, a.solicitado_por?.id) || canAprovar) && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Cancelar solicitação"
                                  aria-label={`Cancelar ${a.codigo}`}
                                  onClick={() => void cancelar(a.id)}
                                >
                                  <IconBan />
                                </button>
                              )}
                            {a.status === 'PENDENTE' && canAprovar && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Conferir e aprovar"
                                aria-label={`Conferir ${a.codigo}`}
                                onClick={() => openDetalhe(a)}
                              >
                                <IconCheck />
                              </button>
                            )}
                            {(a.status !== 'PENDENTE' || !canAprovar) && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Ver detalhe"
                                aria-label={`Ver ${a.codigo}`}
                                onClick={() => openDetalhe(a)}
                              >
                                <IconEye />
                              </button>
                            )}
                            {aguardandoAlcada ? (
                              <span
                                className="btn-icon"
                                title={aguardandoAlcada}
                                aria-label={aguardandoAlcada}
                                style={{ cursor: 'default', pointerEvents: 'auto' }}
                              >
                                <IconAlertCircle />
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
