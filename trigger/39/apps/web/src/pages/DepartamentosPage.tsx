import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Departamento } from '../lib/api';
import { useAuth } from '../lib/auth';

export function DepartamentosPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('departamento.escrever');

  const [rows, setRows] = useState<Departamento[]>([]);
  const [q, setQ] = useState('');
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftNome, setDraftNome] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (opts?: { q?: string; ativos?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const query = opts?.q ?? q;
      const ativos = opts?.ativos ?? somenteAtivos;
      if (query.trim()) params.set('q', query.trim());
      if (ativos) params.set('ativos', '1');

      const qs = params.toString();
      const res = await api.get<{ data: Departamento[] }>(`/departamentos${qs ? `?${qs}` : ''}`);
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar departamentos.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, somenteAtivos]);

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setEditingId(null);
    void load();
  };

  const stats = useMemo(() => {
    return {
      total: rows.length,
      inativos: rows.filter((r) => !r.ativo).length,
    };
  }, [rows]);

  const patchRow = async (id: number, body: Partial<Departamento>) => {
    setSavingId(id);
    setError(null);
    try {
      await api.put<{ data: Departamento }>(`/departamentos/${id}`, body);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSavingId(null);
    }
  };

  const createRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    setCreating(true);
    setError(null);
    try {
      await api.post<{ data: Departamento }>('/departamentos', { nome, ativo: true });
      setNovoNome('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar departamento.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Departamentos"
        description="Unidades organizacionais da empresa ativa (DEP-). Usados no colaborador e como local do patrimônio. Não confundir com centro de custo financeiro."
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
                placeholder="Código DEP ou nome"
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>&nbsp;</label>
              <label className="nat-check">
                <input
                  type="checkbox"
                  checked={somenteAtivos}
                  onChange={(e) => setSomenteAtivos(e.target.checked)}
                />
                Só ativos
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Filtrar
            </button>
          </form>
          <p className="nat-stats muted">
            {loading
              ? 'Carregando…'
              : `${stats.total} departamentos · ${stats.inativos} inativos`}
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
              <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                <label>Novo departamento</label>
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Comercial"
                  disabled={creating}
                  maxLength={64}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating || !novoNome.trim()}>
                {creating ? 'Criando…' : 'Adicionar'}
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
                  <th style={{ width: '18%' }}>Código</th>
                  <th>Nome</th>
                  <th style={{ width: '7rem' }}>Situação</th>
                  <th style={{ width: '14rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: '1.25rem' }}>
                      Nenhum departamento encontrado.
                      {canWrite ? ' Use o formulário acima para criar o primeiro.' : null}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isEditing = editingId === row.id;
                    const saving = savingId === row.id;
                    return (
                      <tr key={row.id} className={!row.ativo ? 'nat-row--inactive' : undefined}>
                        <td>
                          <code className="nat-code">{row.codigo}</code>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              value={draftNome}
                              onChange={(e) => setDraftNome(e.target.value)}
                              disabled={saving}
                              aria-label="Nome"
                              maxLength={64}
                            />
                          ) : (
                            row.nome
                          )}
                        </td>
                        <td>
                          <StatusPill status={row.ativo ? 'ATIVO' : 'INATIVO'} />
                        </td>
                        <td>
                          {canWrite ? (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={saving || !draftNome.trim()}
                                    onClick={() => void patchRow(row.id, { nome: draftNome.trim() })}
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
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => {
                                      setEditingId(row.id);
                                      setDraftNome(row.nome);
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={saving}
                                    onClick={() => void patchRow(row.id, { ativo: !row.ativo })}
                                  >
                                    {row.ativo ? 'Inativar' : 'Reativar'}
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

      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Cadastre aqui e selecione no{' '}
        <Link to="/parceiros">parceiro colaborador</Link> e no{' '}
        <Link to="/patrimonio">patrimônio</Link>. Centro de custo financeiro permanece fase futura
        (ADR Departamentos).
      </p>
    </>
  );
}
