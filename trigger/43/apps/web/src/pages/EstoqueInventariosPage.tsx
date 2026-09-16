import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type EstoqueInventario,
  type EstoqueInventarioItem,
  type EstoqueInventarioLeitura,
  type EstoqueInventarioMeta,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  invItemStatusLabel,
  invStatusLabel,
  invTipoLabel,
} from '../lib/comprasUi';
import { formatDateTime, formatQty } from '../lib/format';

type ItemAction = 'contar1' | 'contar2' | 'gerar';

type VolumeFila = {
  lote_id: number;
  codigo: string;
  qr_payload: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  endereco: { id: number; codigo: string } | null;
};

type EnderecoScan = {
  id: number;
  codigo: string;
  prateleira?: number;
  coluna?: number;
  vao?: number;
  qr_payload: string;
};

/** Mesma ordem do Guardar (WMS leve). Contagem: default local → volumes. */
type OrdemLeitura = 'volume_primeiro' | 'vao_primeiro';

export function EstoqueInventariosPage() {
  const { id } = useParams();
  if (id) {
    return <InventarioDetail id={Number(id)} />;
  }
  return <InventarioList />;
}

function InventarioList() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const navigate = useNavigate();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState<EstoqueInventario[]>([]);
  const [meta, setMeta] = useState<EstoqueInventarioMeta | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('ROTATIVO');
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [inv, prd] = await Promise.all([
        api.get<{ data: EstoqueInventario[]; meta: EstoqueInventarioMeta }>('/estoque/inventarios'),
        api.get<{ data: Produto[] }>('/produtos'),
      ]);
      setLista(inv.data);
      setMeta(inv.meta);
      setProdutos(
        prd.data.filter((p) => p.familia === 'MP' || p.familia === 'EMB' || p.familia === 'REV'),
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const allSelected = produtos.length > 0 && selected.length === produtos.length;
  const someSelected = selected.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggle = (pid: number) => {
    setSelected((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? produtos.map((p) => p.id) : []);
  };

  const produtoIds = useMemo(() => new Set(produtos.map((p) => p.id)), [produtos]);

  // Se a lista de produtos mudar (reload), descarta IDs que sumiram.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => produtoIds.has(id)));
  }, [produtoIds]);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite || selected.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      const res = await api.post<{ data: EstoqueInventario }>('/estoque/inventarios', {
        tipo,
        produto_ids: selected,
      });
      navigate(`/estoque/inventarios/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao abrir inventário.');
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async (inv: EstoqueInventario) => {
    if (!canWrite || !inv.pode_cancelar) return;
    if (
      !window.confirm(
        `Cancelar ${inv.codigo}? O registro permanece no histórico como CANCELADO. SKUs em contagem são liberados.`,
      )
    ) {
      return;
    }
    setError(null);
    setCancelingId(inv.id);
    try {
      await api.post(`/estoque/inventarios/${inv.id}/cancelar`);
      await load(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cancelar.');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Inventários"
        description="Contagem física por QR (volume + local) com rollup para o SKU. Confrontação cega, recontagem e AJU com alçada — o saldo só muda após aprovação."
      />

      <EstoqueModuleNav />

      <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
        <strong>Novidade:</strong> inventário com bobina etiquetada usa contagem por QR
        (local → volumes). Abra um inventário e use o painel <em>Contagem por QR</em>. SKU sem
        volume continua na contagem decimal.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {canWrite && (
        <form onSubmit={criar} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Abrir inventário</h3>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Selecione os SKUs. Com volume etiquetado, a contagem é por QR (local → volumes). Sem
                volume, permanece a quantidade decimal. Saldo do sistema não aparece na contagem
                cega.
              </p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {(meta?.tipos ?? ['ROTATIVO', 'GERAL', 'VIRADA']).map((t) => (
                      <option key={t} value={t}>
                        {invTipoLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '2.5rem' }}>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          disabled={!canWrite || produtos.length === 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                          aria-label="Selecionar todos os produtos para inventário"
                          title={allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                        />
                      </th>
                      <th>Produto</th>
                      <th>Família</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(p.id)}
                            onChange={() => toggle(p.id)}
                            aria-label={`Selecionar ${p.codigo}`}
                          />
                        </td>
                        <td>
                          <strong>{p.codigo}</strong>
                          <div className="muted">{p.descricao_fiscal}</div>
                        </td>
                        <td>{p.familia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || selected.length === 0}
                >
                  {saving ? 'Abrindo…' : `Abrir inventário (${selected.length})`}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        {!loading && lista.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">
              {lista.length} inventário(s) nesta EMP
              {lista.filter((i) => !['ENCERRADO', 'CANCELADO'].includes(i.status)).length
                ? ` · ${
                    lista.filter((i) => !['ENCERRADO', 'CANCELADO'].includes(i.status)).length
                  } em aberto`
                : ''}
            </span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : lista.length === 0 ? (
            <div className="empty-state">Nenhum inventário.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>SKUs</th>
                  <th>Acuracidade</th>
                  <th>Início</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.codigo}</td>
                    <td>{invTipoLabel(inv.tipo)}</td>
                    <td>
                      <StatusPill status={invStatusLabel(inv.status)} />
                    </td>
                    <td>{inv.itens_count}</td>
                    <td>{inv.acuracidade_pct ? `${inv.acuracidade_pct}%` : '—'}</td>
                    <td>{formatDateTime(inv.iniciado_em)}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/estoque/inventarios/${inv.id}`} className="btn btn-secondary btn-sm">
                          Abrir
                        </Link>
                        {canWrite && inv.pode_cancelar ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={cancelingId === inv.id}
                            onClick={() => void cancelar(inv)}
                          >
                            {cancelingId === inv.id ? 'Cancelando…' : 'Cancelar'}
                          </button>
                        ) : null}
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

function InventarioDetail({ id }: { id: number }) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const [inv, setInv] = useState<EstoqueInventario | null>(null);
  const [meta, setMeta] = useState<EstoqueInventarioMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [actionMode, setActionMode] = useState<ItemAction | null>(null);
  const [qtde, setQtde] = useState('');
  const [checklist, setChecklist] = useState(false);
  const [motivo, setMotivo] = useState('A01');

  const endRef = useRef<HTMLInputElement>(null);
  const volRef = useRef<HTMLInputElement>(null);
  const [rodadaFisica, setRodadaFisica] = useState<1 | 2>(1);
  const [ordem, setOrdem] = useState<OrdemLeitura>('vao_primeiro');
  const [enderecoQr, setEnderecoQr] = useState('');
  const [volumeQr, setVolumeQr] = useState('');
  const [endereco, setEndereco] = useState<EnderecoScan | null>(null);
  const [fila, setFila] = useState<VolumeFila[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: EstoqueInventario; meta: EstoqueInventarioMeta }>(
        `/estoque/inventarios/${id}`,
      );
      setInv(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const activeItem = (inv?.itens ?? []).find((i) => i.id === activeItemId) ?? null;

  const openAction = (item: EstoqueInventarioItem, mode: ItemAction) => {
    setError(null);
    setMsg(null);
    setActiveItemId(item.id);
    setActionMode(mode);
    setQtde('');
    setChecklist(false);
    setMotivo(
      inv?.tipo === 'GERAL' ? 'A02' : inv?.tipo === 'VIRADA' ? 'A03' : 'A01',
    );
  };

  const closeAction = () => {
    setActiveItemId(null);
    setActionMode(null);
    setQtde('');
    setChecklist(false);
  };

  const submitContagem = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeItem || (actionMode !== 'contar1' && actionMode !== 'contar2')) return;
    if (!qtde.trim()) {
      setError('Informe a quantidade contada.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const rodada = actionMode === 'contar1' ? 1 : 2;
      await api.post(`/estoque/inventarios/${id}/itens/${activeItem.id}/contar-${rodada}`, {
        qtde,
      });
      closeAction();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na contagem.');
    } finally {
      setSaving(false);
    }
  };

  const submitGerarAjuste = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeItem || actionMode !== 'gerar') return;
    if (!checklist) {
      setError('Confirme o checklist antes de gerar o ajuste.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/estoque/inventarios/${id}/itens/${activeItem.id}/gerar-ajuste`, {
        checklist_confirmado: true,
        motivo_codigo: motivo || undefined,
      });
      closeAction();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const encerrar = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post(`/estoque/inventarios/${id}/encerrar`);
      closeAction();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao encerrar.');
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async () => {
    if (!inv || !inv.pode_cancelar) return;
    if (
      !window.confirm(
        `Cancelar ${inv.codigo}? O registro permanece no histórico como CANCELADO. SKUs em contagem são liberados.`,
      )
    ) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/estoque/inventarios/${id}/cancelar`);
      closeAction();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cancelar.');
    } finally {
      setSaving(false);
    }
  };

  const focusPrimeiro = (o: OrdemLeitura = ordem) => {
    setTimeout(() => {
      if (o === 'vao_primeiro') {
        endRef.current?.focus();
      } else {
        volRef.current?.focus();
      }
    }, 50);
  };

  const limparSessao = (opts?: { manterVao?: boolean; manterFila?: boolean }) => {
    setVolumeQr('');
    setError(null);
    if (!opts?.manterFila) {
      setFila([]);
    }
    if (!opts?.manterVao) {
      setEndereco(null);
      setEnderecoQr('');
    }
  };

  const trocarOrdem = (nova: OrdemLeitura) => {
    if (nova === ordem) return;
    setOrdem(nova);
    setMsg(null);
    setError(null);
    setVolumeQr('');
    focusPrimeiro(nova);
  };

  const adicionarVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('END:')) {
      setError('Esse QR é de local (END:…). Use o campo do local.');
      volRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const res = await api.get<{ data: VolumeFila }>(
        `/estoque/volumes/por-qr?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      if (fila.some((v) => v.lote_id === vol.lote_id)) {
        setError(`Volume ${vol.codigo} já está na fila.`);
        setVolumeQr('');
        setTimeout(() => volRef.current?.focus(), 50);
        return;
      }
      const item = { ...vol, qr_payload: vol.qr_payload || p };
      setFila((prev) => [...prev, item]);
      setMsg(
        `Volume ${vol.codigo} na fila (${fila.length + 1}). Continue lendo ou registre a fila no local.`,
      );
      setVolumeQr('');
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      setSaving(false);
    }
  };

  const removerDaFila = (loteId: number) => {
    setFila((prev) => prev.filter((v) => v.lote_id !== loteId));
    setError(null);
    setMsg(null);
    setTimeout(() => volRef.current?.focus(), 50);
  };

  const resolverLocal = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('VOL:')) {
      setError('Esse QR é de volume (VOL:…). Use o campo do volume para incluir na fila.');
      endRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const res = await api.get<{ data: EnderecoScan }>(
        `/estoque/enderecos/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setEndereco({ ...res.data, qr_payload: res.data.qr_payload || p });
      setEnderecoQr(p);
      const n = fila.length;
      setMsg(
        n > 0
          ? `Local ${res.data.codigo} confirmado. Pronto para registrar ${n} volume${n === 1 ? '' : 's'}.`
          : `Local ${res.data.codigo} confirmado. Inclua 1 ou mais volumes na fila.`,
      );
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setEndereco(null);
      setError(err instanceof ApiError ? err.message : 'Local não reconhecido.');
      endRef.current?.select();
    } finally {
      setSaving(false);
    }
  };

  const registrarFila = async () => {
    if (fila.length === 0) {
      setError('Inclua ao menos 1 volume na fila.');
      volRef.current?.focus();
      return;
    }
    const endPayload = (endereco?.qr_payload || enderecoQr).trim();
    if (!endereco || !endPayload) {
      setError('Confirme o local (QR END:…) antes de registrar a fila.');
      endRef.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    setMsg(null);

    const ok: string[] = [];
    const falhas: { codigo: string; motivo: string }[] = [];
    const restantes: VolumeFila[] = [];

    for (const vol of fila) {
      const vQr = (vol.qr_payload || '').trim();
      if (!vQr) {
        falhas.push({ codigo: vol.codigo, motivo: 'QR ausente' });
        restantes.push(vol);
        continue;
      }
      try {
        await api.post<{ data: EstoqueInventarioLeitura }>(
          `/estoque/inventarios/${id}/leituras`,
          {
            volume_qr: vQr,
            endereco_qr: endPayload,
            rodada: rodadaFisica,
          },
        );
        ok.push(vol.codigo);
      } catch (err) {
        falhas.push({
          codigo: vol.codigo,
          motivo: err instanceof ApiError ? err.message : 'Falha na leitura',
        });
        restantes.push(vol);
      }
    }

    setFila(restantes);
    await load();
    setSaving(false);

    const localCodigo = endereco.codigo;
    if (falhas.length === 0) {
      setMsg(
        ok.length === 1
          ? `Volume ${ok[0]} registrado em ${localCodigo}. Inclua mais volumes neste local ou feche a rodada.`
          : `${ok.length} volumes registrados em ${localCodigo}. Inclua mais ou feche a rodada.`,
      );
      setTimeout(() => volRef.current?.focus(), 50);
      return;
    }

    if (ok.length > 0) {
      setMsg(`${ok.length} volume(s) em ${localCodigo}. ${falhas.length} pendente(s) na fila.`);
    }
    setError(falhas.map((f) => `${f.codigo}: ${f.motivo}`).join(' · '));
    setTimeout(() => volRef.current?.focus(), 50);
  };

  const anularLeitura = async (leituraId: number) => {
    setError(null);
    setSaving(true);
    try {
      await api.post(`/estoque/inventarios/${id}/leituras/${leituraId}/anular`);
      setMsg('Leitura anulada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao anular.');
    } finally {
      setSaving(false);
    }
  };

  const fecharRodada = async () => {
    if (fila.length > 0) {
      setError('Registre ou limpe a fila antes de fechar a rodada.');
      return;
    }
    if (
      !window.confirm(
        `Fechar ${rodadaFisica}ª contagem por QR? Volumes não lidos serão faltantes; a quantidade do SKU será a soma dos volumes encontrados.`,
      )
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const res = await api.post<{
        data: {
          inventario: EstoqueInventario;
          locais_errados: number;
          faltantes: number;
        };
      }>(`/estoque/inventarios/${id}/fechar-rodada-fisica`, { rodada: rodadaFisica });
      setInv(res.data.inventario);
      setMsg(
        `${rodadaFisica}ª contagem física fechada` +
          (res.data.faltantes ? ` · ${res.data.faltantes} faltante(s)` : '') +
          (res.data.locais_errados ? ` · ${res.data.locais_errados} local(is) errado(s)` : '') +
          '.',
      );
      limparSessao();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao fechar rodada física.');
    } finally {
      setSaving(false);
    }
  };

  const onEndKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void resolverLocal(enderecoQr);
    }
  };

  const onVolKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void adicionarVolume(volumeQr);
    }
  };

  const onFilaSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (volumeQr.trim()) {
      void adicionarVolume(volumeQr);
      return;
    }
    if (!endereco && enderecoQr.trim()) {
      void resolverLocal(enderecoQr);
      return;
    }
    void registrarFila();
  };

  if (loading && !inv) {
    return (
      <>
        <PageHeader title="Inventário" description="Carregando…" />
        <EstoqueModuleNav />
        <div className="loading">Carregando…</div>
      </>
    );
  }

  if (!inv) {
    return (
      <>
        <PageHeader title="Inventário" description="Não encontrado." />
        <EstoqueModuleNav />
        <div className="alert alert-error">{error || 'Inventário não encontrado.'}</div>
      </>
    );
  }

  const aberto = !['ENCERRADO', 'CANCELADO'].includes(inv.status);
  const motivos = meta?.motivos ?? [];
  const skusComVolume = inv.contagem_fisica?.skus_com_volume ?? 0;
  const temVolume = skusComVolume > 0;
  const leiturasRodada = (inv.leituras ?? []).filter((l) => l.rodada === rodadaFisica);
  const podeFechar1 = (inv.itens ?? []).some(
    (i) => i.modo_contagem === 'VOLUME' && ['PENDENTE', 'EM_CONTAGEM'].includes(i.status),
  );
  const podeFechar2 = (inv.itens ?? []).some(
    (i) => i.modo_contagem === 'VOLUME' && i.status === 'DIVERGENTE',
  );

  return (
    <>
      <PageHeader
        title={inv.codigo}
        description={`${invTipoLabel(inv.tipo)} · contagem física por QR quando houver volume; saldo SKU só na confrontação.`}
        actions={
          <div className="btn-row">
            <StatusPill status={invStatusLabel(inv.status)} />
            <Link to="/estoque/inventarios" className="btn btn-secondary">
              Lista
            </Link>
            {canWrite && inv.pode_cancelar ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => void cancelar()}
              >
                Cancelar inventário
              </button>
            ) : null}
            {canWrite && aberto && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void encerrar()}
              >
                Encerrar
              </button>
            )}
          </div>
        }
      />

      <EstoqueModuleNav />

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="detail-meta">
            <div>
              <span>Tipo</span>
              <strong>{invTipoLabel(inv.tipo)}</strong>
            </div>
            <div>
              <span>SKUs</span>
              <strong>{inv.itens_count}</strong>
            </div>
            <div>
              <span>Com volume</span>
              <strong>{skusComVolume}</strong>
            </div>
            <div>
              <span>Acuracidade</span>
              <strong>{inv.acuracidade_pct ? `${inv.acuracidade_pct}%` : '—'}</strong>
            </div>
            <div>
              <span>Início</span>
              <strong>{formatDateTime(inv.iniciado_em)}</strong>
            </div>
            <div>
              <span>Encerrado</span>
              <strong>{formatDateTime(inv.encerrado_em)}</strong>
            </div>
          </div>
        </div>
      </div>

      {canWrite && aberto && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Contagem por QR (volume + local)</h3>
              {!temVolume ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  Nenhum SKU deste inventário tem volume etiquetado com saldo. Inclua MP/bobinas
                  com lote (qtde &gt; 0) ao abrir o INV, ou use a contagem decimal na tabela
                  abaixo. Para amarrar volume ↔ local antes:{' '}
                  <Link to="/estoque/guardar">Guardar</Link>.
                </p>
              ) : (
                <>
                  <p className="muted" style={{ marginBottom: '0.75rem' }}>
                    Mesma dinâmica do Guardar: monte a fila de volumes no local, registre em
                    lote e só depois feche a rodada. Local errado não altera saldo — use{' '}
                    <Link to="/estoque/guardar">Guardar</Link>.
                  </p>

                  <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label>Rodada</label>
                      <select
                        value={rodadaFisica}
                        onChange={(e) => setRodadaFisica(Number(e.target.value) as 1 | 2)}
                      >
                        <option value={1}>1ª contagem</option>
                        <option value={2} disabled={!podeFechar2 && rodadaFisica !== 2}>
                          2ª contagem (divergentes)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Ordem de leitura"
                    style={{ maxWidth: '42rem', marginBottom: '0.5rem' }}
                  >
                    <button
                      type="button"
                      role="tab"
                      className={`tab${ordem === 'vao_primeiro' ? ' active' : ''}`}
                      aria-selected={ordem === 'vao_primeiro'}
                      onClick={() => trocarOrdem('vao_primeiro')}
                    >
                      Local → volume
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className={`tab${ordem === 'volume_primeiro' ? ' active' : ''}`}
                      aria-selected={ordem === 'volume_primeiro'}
                      onClick={() => trocarOrdem('volume_primeiro')}
                    >
                      Volume → local
                    </button>
                  </div>
                  <p className="catalogo-tab-hint" style={{ maxWidth: '42rem', marginTop: 0 }}>
                    {ordem === 'vao_primeiro'
                      ? 'Na estante: confirme o local, monte a fila e só então registre.'
                      : 'Com volumes em mãos: monte a fila, confirme o local e só então registre.'}{' '}
                    A leitura não grava — só o botão Registrar fila.
                  </p>

                  <form
                    onSubmit={onFilaSubmit}
                    style={{ display: 'grid', gap: '1rem', maxWidth: '42rem' }}
                  >
                    {(() => {
                      const nFila = fila.length;
                      const podeRegistrar =
                        nFila > 0 && Boolean(endereco) && canWrite && !saving;
                      const labelVol =
                        ordem === 'vao_primeiro'
                          ? '2. Incluir volume (VOL:…)'
                          : '1. Incluir volume (VOL:…)';
                      const labelEnd =
                        ordem === 'vao_primeiro'
                          ? '1. Local (END:…)'
                          : '2. Local (END:…)';
                      const submitLabel = saving
                        ? 'Processando…'
                        : volumeQr.trim()
                          ? 'Incluir na fila'
                          : podeRegistrar
                            ? nFila === 1
                              ? `Registrar 1 volume em ${endereco!.codigo}`
                              : `Registrar ${nFila} volumes em ${endereco!.codigo}`
                            : nFila === 0
                              ? 'Inclua volumes na fila'
                              : !endereco
                                ? 'Confirme o local'
                                : 'Registrar fila';
                      const submitDisabled =
                        saving ||
                        !canWrite ||
                        (!volumeQr.trim() && !podeRegistrar);

                      const campoVolume = (
                        <div className="form-group" key="vol">
                          <label htmlFor="inv_volume_qr">{labelVol}</label>
                          <input
                            id="inv_volume_qr"
                            ref={volRef}
                            value={volumeQr}
                            onChange={(e) => setVolumeQr(e.target.value)}
                            onKeyDown={onVolKey}
                            placeholder="Leia o QR — Enter inclui na fila (ainda não registra)"
                            autoComplete="off"
                            disabled={saving || !canWrite}
                          />
                        </div>
                      );

                      const campoVao = (
                        <div className="form-group" key="end">
                          <label htmlFor="inv_endereco_qr">{labelEnd}</label>
                          <input
                            id="inv_endereco_qr"
                            ref={endRef}
                            value={enderecoQr}
                            onChange={(e) => setEnderecoQr(e.target.value)}
                            onKeyDown={onEndKey}
                            placeholder={
                              endereco
                                ? 'Local ativo — leia outro END para trocar'
                                : 'Leia o QR do local (registro só ao confirmar a fila)'
                            }
                            autoComplete="off"
                            disabled={saving || !canWrite}
                          />
                        </div>
                      );

                      const previewVao = endereco ? (
                        <div className="alert alert-info" style={{ margin: 0 }} key="end-prev">
                          <strong>Local {endereco.codigo}</strong>
                          <div className="muted">
                            {endereco.prateleira != null
                              ? `Prat. ${endereco.prateleira} · Col. ${endereco.coluna} · Local ${endereco.vao}`
                              : 'Local confirmado'}
                            {nFila > 0
                              ? ` · ${nFila} volume${nFila === 1 ? '' : 's'} na fila`
                              : ' · aguardando volumes'}
                          </div>
                        </div>
                      ) : null;

                      const listaFila =
                        nFila > 0 ? (
                          <div key="fila" style={{ display: 'grid', gap: '0.5rem' }}>
                            <div className="muted" style={{ fontSize: '0.9rem' }}>
                              Fila — {nFila} volume{nFila === 1 ? '' : 's'} (ainda sem registrar
                              {endereco ? `; local ${endereco.codigo}` : ''})
                            </div>
                            <div className="table-wrap">
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Volume</th>
                                    <th>Produto</th>
                                    <th>Qtde</th>
                                    <th>Hoje</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {fila.map((v, idx) => (
                                    <tr key={v.lote_id}>
                                      <td>{idx + 1}</td>
                                      <td>
                                        <strong>{v.codigo}</strong>
                                      </td>
                                      <td>
                                        {v.produto ? (
                                          <>
                                            <strong>{v.produto.codigo}</strong>
                                            <div className="muted" style={{ fontSize: '0.85rem' }}>
                                              {v.produto.descricao_fiscal}
                                            </div>
                                          </>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td>
                                        {formatQty(v.qtde)} {v.unidade}
                                      </td>
                                      <td className="muted">
                                        {v.endereco?.codigo ?? 'sem local'}
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          disabled={saving}
                                          onClick={() => removerDaFila(v.lote_id)}
                                          aria-label={`Remover volume ${v.codigo} da fila`}
                                        >
                                          Remover
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="muted" key="fila-vazia" style={{ margin: 0 }}>
                            Nenhum volume na fila. Leia 1 ou mais QRs de volume (Enter) antes de
                            registrar no local.
                          </p>
                        );

                      const campos =
                        ordem === 'vao_primeiro'
                          ? [campoVao, previewVao, campoVolume, listaFila]
                          : [campoVolume, listaFila, campoVao, previewVao];

                      return (
                        <>
                          {campos}
                          <div className="btn-row">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={submitDisabled}
                            >
                              {submitLabel}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={saving || !podeRegistrar}
                              onClick={() => void registrarFila()}
                            >
                              Registrar fila no inventário
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={saving}
                              onClick={() => {
                                limparSessao();
                                setMsg(null);
                                focusPrimeiro();
                              }}
                            >
                              Limpar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={
                                saving ||
                                fila.length > 0 ||
                                (rodadaFisica === 1 ? !podeFechar1 : !podeFechar2)
                              }
                              onClick={() => void fecharRodada()}
                              title={
                                fila.length > 0
                                  ? 'Registre ou limpe a fila antes'
                                  : undefined
                              }
                            >
                              Fechar {rodadaFisica}ª contagem por QR
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </form>

                  {leiturasRodada.length > 0 && (
                    <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
                      <div className="muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Leituras já registradas nesta rodada
                      </div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>SKU</th>
                            <th>Local lido</th>
                            <th>Esperado</th>
                            <th>Qtde</th>
                            <th>Resultado</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {leiturasRodada.map((l) => (
                            <tr key={l.id}>
                              <td>{l.lote?.codigo ?? '—'}</td>
                              <td>{l.produto?.codigo ?? '—'}</td>
                              <td>{l.endereco_lido?.codigo ?? '—'}</td>
                              <td>{l.endereco_esperado?.codigo ?? '—'}</td>
                              <td className="num">
                                {formatQty(l.qtde_volume)} {l.unidade}
                              </td>
                              <td>
                                <StatusPill status={leituraResultadoLabel(l.resultado)} />
                              </td>
                              <td>
                                {l.resultado !== 'FALTANTE' && l.resultado !== 'ANULADA' ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => void anularLeitura(l.id)}
                                  >
                                    Anular
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: activeItem && actionMode ? '1rem' : undefined }}>
        <div className="table-wrap table-wrap--freeze">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Modo</th>
                <th>Sistema</th>
                <th>1ª</th>
                <th>2ª</th>
                <th>Δ</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(inv.itens ?? []).map((item) => (
                <tr
                  key={item.id}
                  className={activeItemId === item.id ? 'clickable' : undefined}
                  style={
                    activeItemId === item.id
                      ? { background: 'rgba(26, 53, 104, 0.06)' }
                      : undefined
                  }
                >
                  <td>
                    <strong>{item.produto?.codigo}</strong>
                    <div className="muted">{item.produto?.descricao_fiscal}</div>
                  </td>
                  <td>
                    {item.modo_contagem === 'VOLUME'
                      ? `QR (${item.volumes_ativos ?? 0})`
                      : 'Decimal'}
                  </td>
                  <td className="num">
                    {item.qtde_sistema_corte !== undefined
                      ? `${formatQty(item.qtde_sistema_corte)} ${item.unidade}`
                      : '— (cego)'}
                  </td>
                  <td className="num">
                    {item.qtde_1 != null ? formatQty(item.qtde_1) : '—'}
                    {item.contado_por_1 && (
                      <div className="muted">{item.contado_por_1.name}</div>
                    )}
                  </td>
                  <td className="num">
                    {item.qtde_2 != null ? formatQty(item.qtde_2) : '—'}
                    {item.contado_por_2 && (
                      <div className="muted">{item.contado_por_2.name}</div>
                    )}
                  </td>
                  <td className="num">
                    {item.qtde_diferenca != null ? formatQty(item.qtde_diferenca) : '—'}
                  </td>
                  <td>
                    <StatusPill status={invItemStatusLabel(item.status)} />
                    {item.ajuste && (
                      <div className="muted" style={{ marginTop: '0.25rem' }}>
                        {item.ajuste.codigo}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="table-actions table-actions--wrap">
                      {canWrite &&
                        aberto &&
                        item.modo_contagem !== 'VOLUME' &&
                        ['PENDENTE', 'EM_CONTAGEM'].includes(item.status) && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openAction(item, 'contar1')}
                          >
                            Contar 1ª
                          </button>
                        )}
                      {canWrite &&
                        aberto &&
                        item.modo_contagem !== 'VOLUME' &&
                        item.status === 'DIVERGENTE' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openAction(item, 'contar2')}
                          >
                            Contar 2ª
                          </button>
                        )}
                      {canWrite && aberto && item.status === 'RECONTADO' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openAction(item, 'gerar')}
                        >
                          Gerar AJU
                        </button>
                      )}
                      {item.status === 'OK' && <span className="muted">Sem ajuste</span>}
                      {(item.status === 'AJU_GERADO' || item.status === 'AJU_PENDENTE') && (
                        <Link to="/estoque/ajustes" className="btn btn-secondary btn-sm">
                          Ver AJU
                        </Link>
                      )}
                      {item.modo_contagem === 'VOLUME' &&
                        ['PENDENTE', 'EM_CONTAGEM', 'DIVERGENTE'].includes(item.status) && (
                          <span className="muted">Via QR acima</span>
                        )}
                      <Link
                        to={`/estoque/extrato/${item.produto_id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Extrato
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeItem && actionMode === 'contar1' && (
        <form onSubmit={(e) => void submitContagem(e)}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>1ª contagem — {activeItem.produto?.codigo}</h3>
                <p className="muted" style={{ marginBottom: '1rem' }}>
                  Contagem cega decimal (SKU sem volume etiquetado). O saldo do sistema não é
                  mostrado nesta etapa.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Quantidade contada ({activeItem.unidade})</label>
                    <input
                      required
                      inputMode="decimal"
                      autoFocus
                      value={qtde}
                      onChange={(e) => setQtde(e.target.value)}
                      placeholder="0.0000"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Registrando…' : 'Registrar 1ª contagem'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeAction}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeItem && actionMode === 'contar2' && (
        <form onSubmit={(e) => void submitContagem(e)}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>2ª contagem — {activeItem.produto?.codigo}</h3>
                <p className="muted" style={{ marginBottom: '1rem' }}>
                  Recontagem cega por outra pessoa. Quem fez a 1ª não deve registrar a 2ª.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Quantidade recontada ({activeItem.unidade})</label>
                    <input
                      required
                      inputMode="decimal"
                      autoFocus
                      value={qtde}
                      onChange={(e) => setQtde(e.target.value)}
                      placeholder="0.0000"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Registrando…' : 'Registrar 2ª contagem'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeAction}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeItem && actionMode === 'gerar' && (
        <form onSubmit={(e) => void submitGerarAjuste(e)}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Gerar ajuste — {activeItem.produto?.codigo}</h3>
                <p className="muted" style={{ marginBottom: '1rem' }}>
                  Confirme o checklist de investigação (NF, OP, sobra, endereço, unidade). O AJU
                  nasce pendente e só altera o saldo após aprovação com alçada.
                </p>
                {activeItem.qtde_diferenca != null && (
                  <p style={{ marginBottom: '1rem' }}>
                    Diferença: <strong>{formatQty(activeItem.qtde_diferenca)}</strong>{' '}
                    {activeItem.unidade}
                    {activeItem.qtde_final != null && (
                      <span className="muted">
                        {' '}
                        · contado {formatQty(activeItem.qtde_final)} · sistema{' '}
                        {activeItem.qtde_sistema_corte != null
                          ? formatQty(activeItem.qtde_sistema_corte)
                          : '—'}
                      </span>
                    )}
                  </p>
                )}
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Motivo</label>
                    <select
                      required
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    >
                      {(motivos.length
                        ? motivos
                        : [
                            { codigo: 'A01', nome: 'Diferença de inventário rotativo' },
                            { codigo: 'A02', nome: 'Diferença de inventário geral' },
                            { codigo: 'A03', nome: 'Saldo inicial / implantação ERP' },
                          ]
                      ).map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.codigo} — {m.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group span-full">
                    <label className="checkbox-item" style={{ maxWidth: '40rem' }}>
                      <input
                        type="checkbox"
                        checked={checklist}
                        onChange={(e) => setChecklist(e.target.checked)}
                      />
                      <span>
                        Checklist confirmado — ajuste é último recurso (sem documento pendente que
                        explique a diferença).
                      </span>
                    </label>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !checklist}
                  >
                    {saving ? 'Gerando…' : 'Gerar AJU'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeAction}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </>
  );
}

function leituraResultadoLabel(resultado: string): string {
  switch (resultado) {
    case 'ENCONTRADO':
      return 'Encontrado';
    case 'LOCAL_ERRADO':
      return 'Local errado';
    case 'FALTANTE':
      return 'Faltante';
    case 'FORA_ESCOPO':
      return 'Fora do escopo';
    case 'ANULADA':
      return 'Anulada';
    default:
      return resultado;
  }
}
