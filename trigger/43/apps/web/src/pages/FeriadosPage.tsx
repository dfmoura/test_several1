import { useCallback, useEffect, useMemo, useState } from 'react';
import { NumericInput } from '../components/NumericInput';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Feriado } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useTableSort } from '../lib/useTableSort';

const TIPOS: Array<{ value: Feriado['tipo']; label: string }> = [
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'EMPRESA', label: 'Empresa' },
];

const tipoLabel = (tipo: Feriado['tipo']) =>
  TIPOS.find((t) => t.value === tipo)?.label ?? tipo;

const SORT = {
  data: (r: Feriado) => r.data,
  nome: (r: Feriado) => r.nome,
  tipo: (r: Feriado) => r.tipo,
  anual: (r: Feriado) => (r.recorrente_anual ? 0 : 1),
  situacao: (r: Feriado) => (r.ativo ? 0 : 1),
};

export function FeriadosPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('feriado.escrever');
  const anoAtual = new Date().getFullYear();

  const [rows, setRows] = useState<Feriado[]>([]);
  const [ano, setAno] = useState(anoAtual);
  const [q, setQ] = useState('');
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Feriado>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT, {
    initialKey: 'data',
    initialDir: 'asc',
  });
  const [novo, setNovo] = useState({
    data: '',
    nome: '',
    tipo: 'EMPRESA' as Feriado['tipo'],
    recorrente_anual: false,
  });
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('ano', String(ano));
      if (q.trim()) params.set('q', q.trim());
      if (somenteAtivos) params.set('ativos', '1');
      const res = await api.get<{ data: Feriado[] }>(`/feriados?${params}`);
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar feriados.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ano, q, somenteAtivos]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      inativos: rows.filter((r) => !r.ativo).length,
      recorrentes: rows.filter((r) => r.recorrente_anual).length,
    }),
    [rows],
  );

  const patchRow = async (id: number, body: Partial<Feriado>) => {
    setSavingId(id);
    setError(null);
    try {
      await api.put<{ data: Feriado }>(`/feriados/${id}`, body);
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
    if (!novo.data || !novo.nome.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post<{ data: Feriado }>('/feriados', {
        data: novo.data,
        nome: novo.nome.trim(),
        tipo: novo.tipo,
        recorrente_anual: novo.recorrente_anual,
        ativo: true,
      });
      setNovo({ data: '', nome: '', tipo: 'EMPRESA', recorrente_anual: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar feriado.');
    } finally {
      setCreating(false);
    }
  };

  const seedNacionais = async () => {
    if (!canWrite) return;
    setSeeding(true);
    setError(null);
    setMessage('');
    try {
      const res = await api.post<{ data: { criados: number; ignorados: number } }>(
        '/feriados/seed-nacionais',
        { ano },
      );
      const d = res.data;
      setMessage(
        d.criados > 0
          ? `${d.criados} feriado(s) nacional(is) criado(s) para ${ano}.`
          : `Feriados nacionais de ${ano} já estavam cadastrados (${d.ignorados} ignorados).`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar feriados nacionais.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <PageHeader
        variant="list"
        title="Feriados"
        description="Calendário operacional — prazo em dias úteis do ORC/PED."
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={seeding}
              onClick={() => void seedNacionais()}
            >
              {seeding ? 'Gerando…' : 'Feriados nacionais'}
            </button>
          ) : undefined
        }
      />

      {message ? (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      ) : null}

      <div className="list-chrome">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          className="list-chrome__filters"
        >
          <div className="form-group" style={{ minWidth: 100 }}>
            <label>Ano</label>
            <NumericInput
              integer
              min={2000}
              max={2100}
              value={ano}
              emptyCommit={anoAtual}
              onCommit={(v) => setAno(v === '' ? anoAtual : v)}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou tipo"
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
        <p className="list-chrome__hint">
          {loading
            ? 'Carregando…'
            : `${stats.total} feriados · ${stats.recorrentes} recorrentes · ${stats.inativos} inativos`}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      {canWrite ? (
        <div className="list-chrome">
          <form onSubmit={(e) => void createRow(e)} className="list-chrome__filters">
            <div className="form-group" style={{ minWidth: 150 }}>
              <label>Data</label>
              <input
                type="date"
                value={novo.data}
                onChange={(e) => setNovo((p) => ({ ...p, data: e.target.value }))}
                disabled={creating}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Nome</label>
              <input
                value={novo.nome}
                onChange={(e) => setNovo((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex.: Aniversário da cidade"
                disabled={creating}
                maxLength={120}
                required
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>Tipo</label>
              <select
                value={novo.tipo}
                onChange={(e) =>
                  setNovo((p) => ({ ...p, tipo: e.target.value as Feriado['tipo'] }))
                }
                disabled={creating}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>&nbsp;</label>
              <label className="nat-check">
                <input
                  type="checkbox"
                  checked={novo.recorrente_anual}
                  onChange={(e) =>
                    setNovo((p) => ({ ...p, recorrente_anual: e.target.checked }))
                  }
                />
                Recorrente anual
              </label>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !novo.data || !novo.nome.trim()}
            >
              {creating ? 'Criando…' : 'Adicionar'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table nat-table">
              <thead>
                <tr>
                  <SortableTh column="data" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Data
                  </SortableTh>
                  <SortableTh column="nome" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Nome
                  </SortableTh>
                  <SortableTh column="tipo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Tipo
                  </SortableTh>
                  <SortableTh column="anual" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Anual
                  </SortableTh>
                  <SortableTh
                    column="situacao"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Situação
                  </SortableTh>
                  <th style={{ width: '14rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: '1.25rem' }}>
                      Nenhum feriado neste ano.
                      {canWrite
                        ? ' Gere os feriados nacionais ou cadastre municipais e da empresa.'
                        : null}
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => {
                    const isEditing = editingId === row.id;
                    const saving = savingId === row.id;
                    return (
                      <tr key={row.id} className={!row.ativo ? 'nat-row--inactive' : undefined}>
                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              value={String(draft.data ?? row.data)}
                              onChange={(e) => setDraft((p) => ({ ...p, data: e.target.value }))}
                              disabled={saving}
                            />
                          ) : (
                            formatDate(row.data)
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              value={String(draft.nome ?? row.nome)}
                              onChange={(e) => setDraft((p) => ({ ...p, nome: e.target.value }))}
                              disabled={saving}
                              maxLength={120}
                            />
                          ) : (
                            row.nome
                          )}
                        </td>
                        <td>{tipoLabel(row.tipo)}</td>
                        <td>{row.recorrente_anual ? 'Sim' : '—'}</td>
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
                                    disabled={saving}
                                    onClick={() =>
                                      void patchRow(row.id, {
                                        data: draft.data,
                                        nome: draft.nome?.trim(),
                                        tipo: draft.tipo,
                                        recorrente_anual: draft.recorrente_anual,
                                      })
                                    }
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
                                      setDraft({
                                        data: row.data,
                                        nome: row.nome,
                                        tipo: row.tipo,
                                        recorrente_anual: row.recorrente_anual,
                                      });
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
    </>
  );
}
