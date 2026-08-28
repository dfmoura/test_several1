import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type BacklogItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';

type SituacaoFiltro = 'abertos' | 'concluidos' | 'todos';

export function BacklogPage() {
  const { hasGrantedPermission } = useAuth();
  const canWrite = hasGrantedPermission('backlog.escrever');

  const [rows, setRows] = useState<BacklogItem[]>([]);
  const [q, setQ] = useState('');
  const [situacao, setSituacao] = useState<SituacaoFiltro>('abertos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTarefa, setDraftTarefa] = useState('');
  const [concludingId, setConcludingId] = useState<number | null>(null);
  const [draftObservacao, setDraftObservacao] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (opts?: { q?: string; situacao?: SituacaoFiltro }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const query = opts?.q ?? q;
        const sit = opts?.situacao ?? situacao;
        if (query.trim()) params.set('q', query.trim());
        if (sit !== 'todos') params.set('situacao', sit);

        const qs = params.toString();
        const res = await api.get<{ data: BacklogItem[] }>(`/backlog${qs ? `?${qs}` : ''}`);
        setRows(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao carregar backlog.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [q, situacao],
  );

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setEditingId(null);
    setConcludingId(null);
    void load();
  };

  const stats = useMemo(() => {
    return {
      total: rows.length,
      abertos: rows.filter((r) => r.situacao === 'ABERTO').length,
      concluidos: rows.filter((r) => r.situacao === 'CONCLUIDO').length,
    };
  }, [rows]);

  const createRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const tarefa = novaTarefa.trim();
    if (!tarefa) return;
    setCreating(true);
    setError(null);
    try {
      await api.post<{ data: BacklogItem }>('/backlog', { tarefa });
      setNovaTarefa('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao lançar tarefa.');
    } finally {
      setCreating(false);
    }
  };

  const saveTarefa = async (id: number) => {
    const tarefa = draftTarefa.trim();
    if (!tarefa) return;
    setSavingId(id);
    setError(null);
    try {
      await api.put<{ data: BacklogItem }>(`/backlog/${id}`, { tarefa });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSavingId(null);
    }
  };

  const confirmarConclusao = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const observacao = draftObservacao.trim();
      await api.post<{ data: BacklogItem }>(`/backlog/${id}/concluir`, {
        observacao_conclusao: observacao || null,
      });
      setConcludingId(null);
      setDraftObservacao('');
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao concluir.');
    } finally {
      setSavingId(null);
    }
  };

  const reabrir = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      await api.post<{ data: BacklogItem }>(`/backlog/${id}/reabrir`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao reabrir.');
    } finally {
      setSavingId(null);
    }
  };

  const excluir = async (id: number) => {
    if (!window.confirm('Excluir este item do backlog?')) return;
    setSavingId(id);
    setError(null);
    try {
      await api.delete<{ ok: boolean }>(`/backlog/${id}`);
      setEditingId(null);
      setConcludingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao excluir.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Backlog"
        description="Tarefas desta empresa (BLG-). Lançamento e conclusão com data automática; na conclusão, registre uma observação opcional."
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form
            onSubmit={handleSearch}
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código BLG, tarefa ou observação"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Situação</label>
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value as SituacaoFiltro)}
              >
                <option value="abertos">Abertos</option>
                <option value="concluidos">Concluídos</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Filtrar
            </button>
          </form>
          <p className="nat-stats muted">
            {loading
              ? 'Carregando…'
              : `${stats.total} item(ns) · ${stats.abertos} aberto(s) · ${stats.concluidos} concluído(s)`}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </div>

      {canWrite ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <form
              onSubmit={(e) => void createRow(e)}
              style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
            >
              <div className="form-group" style={{ flex: 1, minWidth: 260 }}>
                <label>Nova tarefa</label>
                <input
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  placeholder="O que precisa ser feito"
                  disabled={creating}
                  maxLength={500}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !novaTarefa.trim()}
              >
                {creating ? 'Lançando…' : 'Lançar'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table nat-table">
              <thead>
                <tr>
                  <th style={{ width: '7rem' }}>Código</th>
                  <th>Tarefa</th>
                  <th style={{ width: '9rem' }}>Lançada em</th>
                  <th style={{ width: '9rem' }}>Concluída em</th>
                  <th>Observação da conclusão</th>
                  <th style={{ width: '7rem' }}>Situação</th>
                  <th style={{ width: '14rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ padding: '1.25rem' }}>
                      Nenhuma tarefa neste filtro.
                      {canWrite ? ' Lance a primeira acima.' : null}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isEditing = editingId === row.id;
                    const isConcluding = concludingId === row.id;
                    const saving = savingId === row.id;
                    const aberto = row.situacao === 'ABERTO';
                    return (
                      <tr key={row.id} className={!aberto ? 'nat-row--inactive' : undefined}>
                        <td>
                          <code className="nat-code">{row.codigo}</code>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              value={draftTarefa}
                              onChange={(e) => setDraftTarefa(e.target.value)}
                              disabled={saving}
                              aria-label="Tarefa"
                              maxLength={500}
                            />
                          ) : (
                            row.tarefa
                          )}
                        </td>
                        <td>{formatDateTime(row.lancado_em)}</td>
                        <td>{row.concluido_em ? formatDateTime(row.concluido_em) : '—'}</td>
                        <td>
                          {isConcluding ? (
                            <textarea
                              value={draftObservacao}
                              onChange={(e) => setDraftObservacao(e.target.value)}
                              disabled={saving}
                              aria-label="Observação da conclusão"
                              placeholder="Como ficou / o que foi feito (opcional)"
                              maxLength={500}
                              rows={2}
                              style={{ width: '100%', minWidth: 180, resize: 'vertical' }}
                            />
                          ) : row.observacao_conclusao ? (
                            row.observacao_conclusao
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <StatusPill status={aberto ? 'ABERTO' : 'CONCLUIDO'} />
                        </td>
                        <td>
                          {canWrite ? (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={saving || !draftTarefa.trim()}
                                    onClick={() => void saveTarefa(row.id)}
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : isConcluding ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={saving}
                                    onClick={() => void confirmarConclusao(row.id)}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => {
                                      setConcludingId(null);
                                      setDraftObservacao('');
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  {aberto ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={saving}
                                        onClick={() => {
                                          setEditingId(null);
                                          setConcludingId(row.id);
                                          setDraftObservacao('');
                                        }}
                                      >
                                        Concluir
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        disabled={saving}
                                        onClick={() => {
                                          setConcludingId(null);
                                          setEditingId(row.id);
                                          setDraftTarefa(row.tarefa);
                                        }}
                                      >
                                        Editar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      disabled={saving}
                                      onClick={() => void reabrir(row.id)}
                                    >
                                      Reabrir
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => void excluir(row.id)}
                                  >
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
