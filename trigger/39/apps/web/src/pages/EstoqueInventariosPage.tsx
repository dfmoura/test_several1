import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type EstoqueInventario,
  type EstoqueInventarioItem,
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

  const toggle = (pid: number) => {
    setSelected((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

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
        description="Contagem cega, confrontação e recontagem. Divergência gera AJU com alçada — o saldo só muda após aprovação."
      />

      <EstoqueModuleNav />

      {error && <div className="alert alert-error">{error}</div>}

      {canWrite && (
        <form onSubmit={criar} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Abrir inventário</h3>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Selecione os SKUs. Na contagem o saldo do sistema não é exibido (contagem cega).
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
                      <th style={{ width: '2.5rem' }} />
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [actionMode, setActionMode] = useState<ItemAction | null>(null);
  const [qtde, setQtde] = useState('');
  const [checklist, setChecklist] = useState(false);
  const [motivo, setMotivo] = useState('A01');

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

  return (
    <>
      <PageHeader
        title={inv.codigo}
        description={`${invTipoLabel(inv.tipo)} · contagem cega. Saldo do sistema só aparece na confrontação.`}
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

      <div className="card" style={{ marginBottom: activeItem && actionMode ? '1rem' : undefined }}>
        <div className="table-wrap table-wrap--freeze">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produto</th>
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
                      {canWrite && aberto && ['PENDENTE', 'EM_CONTAGEM'].includes(item.status) && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openAction(item, 'contar1')}
                        >
                          Contar 1ª
                        </button>
                      )}
                      {canWrite && aberto && item.status === 'DIVERGENTE' && (
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
                <h3>
                  1ª contagem — {activeItem.produto?.codigo}
                </h3>
                <p className="muted" style={{ marginBottom: '1rem' }}>
                  Contagem cega: informe apenas o físico contado. O saldo do sistema não é
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
                <h3>
                  2ª contagem — {activeItem.produto?.codigo}
                </h3>
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
                <h3>
                  Gerar ajuste — {activeItem.produto?.codigo}
                </h3>
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
