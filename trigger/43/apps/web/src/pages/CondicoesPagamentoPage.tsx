import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type CondicaoPagamentoSugestao } from '../lib/api';
import { useAuth } from '../lib/auth';

export function CondicoesPagamentoPage() {
  const { hasAnyPermission, empresaId } = useAuth();
  const canWrite = hasAnyPermission('condicao_pagamento.escrever', 'parceiro.escrever', 'compras.escrever');

  const [rows, setRows] = useState<CondicaoPagamentoSugestao[]>([]);
  const [q, setQ] = useState('');
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTexto, setDraftTexto] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [novoTexto, setNovoTexto] = useState('');
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');
  const autoSeedTried = useRef(false);

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
      const res = await api.get<{ data: CondicaoPagamentoSugestao[] }>(
        `/condicoes-pagamento-sugestoes${qs ? `?${qs}` : ''}`,
      );
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar sugestões.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, somenteAtivos]);

  useEffect(() => {
    if (!empresaId) return;
    autoSeedTried.current = false;
    void load();
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || !canWrite || loading || autoSeedTried.current || error) return;
    if (rows.length > 0) return;

    autoSeedTried.current = true;
    void (async () => {
      try {
        await api.post<{ data: { criados: number; total: number } }>(
          '/condicoes-pagamento-sugestoes/seed-canonicos',
        );
        setMessage('Lista canônica aplicada nesta empresa (28 DDL, 14/28/42, à vista…).');
        await load();
      } catch (e) {
        autoSeedTried.current = false;
        setError(e instanceof Error ? e.message : 'Falha ao preparar a lista canônica.');
      }
    })();
  }, [empresaId, canWrite, loading, rows.length, error, load]);

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

  const patchRow = async (id: number, body: Partial<CondicaoPagamentoSugestao>) => {
    setSavingId(id);
    setError(null);
    try {
      await api.put<{ data: CondicaoPagamentoSugestao }>(`/condicoes-pagamento-sugestoes/${id}`, body);
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
    const texto = novoTexto.trim();
    if (!texto) return;
    setCreating(true);
    setError(null);
    try {
      await api.post<{ data: CondicaoPagamentoSugestao }>('/condicoes-pagamento-sugestoes', {
        texto,
        ativo: true,
      });
      setNovoTexto('');
      setMessage(`Condição "${texto}" adicionada.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar sugestão.');
    } finally {
      setCreating(false);
    }
  };

  const seedCanonicos = async () => {
    if (!canWrite) return;
    setSeeding(true);
    setError(null);
    setMessage('');
    try {
      const res = await api.post<{
        data: { criados: number; existentes: number; total: number };
      }>('/condicoes-pagamento-sugestoes/seed-canonicos');
      const d = res.data;
      setMessage(
        d.criados > 0
          ? `${d.criados} sugestão(ões) da lista canônica criadas. Ajuste ou inclua as da operação.`
          : `Lista canônica já estava nesta empresa (${d.total} sugestões). Inclua as da operação se faltar.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar a lista canônica.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Condições de pagamento"
        description="Condições de pagamento desta empresa para parceiros, orçamentos e ordens de compra. A lista canônica (28 DDL, 14/28/42, à vista…) é criada automaticamente ao abrir esta tela."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={seeding}
              onClick={() => void seedCanonicos()}
            >
              {seeding ? 'Gerando…' : 'Lista canônica'}
            </button>
          ) : undefined
        }
      />

      {message ? (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      ) : null}

      {!empresaId ? (
        <div className="alert alert-error" role="alert">
          Selecione uma empresa ativa no topo da tela para carregar as sugestões desta instalação.
        </div>
      ) : null}

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
                placeholder="Texto da condição"
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
              : `${stats.total} sugestões · ${stats.inativos} inativas`}
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
                <label>Nova sugestão</label>
                <input
                  value={novoTexto}
                  onChange={(e) => setNovoTexto(e.target.value)}
                  placeholder="Ex.: 28 DDL, 14/28/42"
                  disabled={creating}
                  maxLength={64}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating || !novoTexto.trim()}>
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
                  <th>Texto</th>
                  <th style={{ width: '6rem' }}>Ordem</th>
                  <th style={{ width: '7rem' }}>Situação</th>
                  <th style={{ width: '14rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: '1.25rem' }}>
                      Nenhuma sugestão nesta empresa.
                      {canWrite
                        ? ' Gere a lista canônica (28 DDL, 14/28/42…) ou adicione as condições da operação.'
                        : null}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isEditing = editingId === row.id;
                    const saving = savingId === row.id;
                    return (
                      <tr key={row.id} className={!row.ativo ? 'nat-row--inactive' : undefined}>
                        <td>
                          {isEditing ? (
                            <input
                              value={draftTexto}
                              onChange={(e) => setDraftTexto(e.target.value)}
                              disabled={saving}
                              aria-label="Texto"
                              maxLength={64}
                            />
                          ) : (
                            row.texto
                          )}
                        </td>
                        <td className="muted">{row.ordenacao}</td>
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
                                    disabled={saving || !draftTexto.trim()}
                                    onClick={() => void patchRow(row.id, { texto: draftTexto.trim() })}
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
                                      setDraftTexto(row.texto);
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
        As sugestões aparecem no{' '}
        <Link to="/parceiros">cadastro de parceiros</Link>, nos{' '}
        <Link to="/orcamentos">orçamentos</Link> e nas{' '}
        <Link to="/compras/ordens">ordens de compra</Link>. O valor gravado no documento permanece
        texto livre — não há vínculo com catálogo COND-.
      </p>
    </>
  );
}
