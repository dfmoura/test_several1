import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Parametro } from '../lib/api';
import { useTableSort } from '../lib/useTableSort';

/** Rótulos canônicos — estudo 32 / PARAMETROS_EMPRESA_OFICIAIS. */
const PARAM_HINTS: Record<string, string> = {
  valor_minimo_capitalizar_bem:
    'Patrimônio · valor mínimo (R$) para capitalizar bem (gerencial; depreciação oficial = contador)',
  empresa_default: 'Empresa padrão sugerida no login',
  emp_00002_venda_habilitada: 'EMP-00002 · venda/estoque só após homologação',
  lai_no_erp: 'Proibido grupo natureza 9.xx / LAI no ERP',
};

function paramHint(chave: string): string | null {
  return PARAM_HINTS[chave] ?? null;
}

const SORT = {
  chave: (p: Parametro) => p.chave,
  valor: (p: Parametro) => p.valor,
  status: (p: Parametro) => p.status,
  versao: (p: Parametro) => p.versao,
};

export function ParametrosPage() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(parametros, SORT);
  const [editing, setEditing] = useState<Parametro | null>(null);
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Parametro[] }>('/parametros');
      setParametros(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (p: Parametro) => {
    setEditing(p);
    setChave(p.chave);
    setValor(p.valor ?? '');
    setMessage('');
    setError('');
  };

  const startNew = () => {
    setEditing(null);
    setChave('');
    setValor('');
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    if (!chave.trim()) {
      setError('Informe a chave do parâmetro.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/parametros', { chave: chave.trim(), valor });
      setMessage('Parâmetro salvo. Status: PENDENTE_RATIFICACAO.');
      startNew();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Parâmetros"
        description="Configurações operacionais da empresa ativa"
        actions={
          <button type="button" className="btn btn-secondary" onClick={startNew}>
            Novo parâmetro
          </button>
        }
      />

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--navy)' }}>
            {editing ? `Editar: ${editing.chave}` : 'Novo parâmetro'}
          </h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Chave</label>
              <input
                value={chave}
                disabled={Boolean(editing)}
                onChange={(e) => setChave(e.target.value)}
                placeholder="ex: lai_no_erp"
              />
            </div>
            <div className="form-group span-2">
              <label>Valor</label>
              <input value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Salvando…' : 'Salvar parâmetro'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : parametros.length === 0 ? (
            <div className="empty-state">Nenhum parâmetro configurado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="chave" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Chave
                  </SortableTh>
                  <SortableTh column="valor" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Valor
                  </SortableTh>
                  <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="versao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Versão
                  </SortableTh>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>{p.chave}</div>
                      {paramHint(p.chave) ? (
                        <small style={{ color: 'var(--text-muted)' }}>{paramHint(p.chave)}</small>
                      ) : null}
                    </td>
                    <td>{p.valor ?? '—'}</td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                    <td>{p.versao}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(p)}
                      >
                        Editar
                      </button>
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
