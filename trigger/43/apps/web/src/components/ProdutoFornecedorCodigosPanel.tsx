import { useEffect, useState } from 'react';
import { api, type Parceiro, type ProdutoFornecedorCodigo } from '../lib/api';

type Props = {
  produtoId: number;
  canWrite: boolean;
  initialRows?: ProdutoFornecedorCodigo[];
};

type Draft = {
  fornecedor_id: string;
  c_prod: string;
  x_prod: string;
};

const emptyDraft = (): Draft => ({
  fornecedor_id: '',
  c_prod: '',
  x_prod: '',
});

function fornecedorLabel(p: Pick<Parceiro, 'codigo' | 'razao_social' | 'nome_fantasia'>): string {
  const nome = p.nome_fantasia || p.razao_social;
  return `${p.codigo} — ${nome}`;
}

export function ProdutoFornecedorCodigosPanel({ produtoId, canWrite, initialRows }: Props) {
  const [rows, setRows] = useState<ProdutoFornecedorCodigo[]>(initialRows ?? []);
  const [fornecedores, setFornecedores] = useState<Parceiro[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [loading, setLoading] = useState(!initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialRows) {
      setRows(initialRows);
      setLoading(false);
    }
  }, [initialRows]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [maps, pars] = await Promise.all([
          initialRows
            ? Promise.resolve(null)
            : api.get<{ data: ProdutoFornecedorCodigo[] }>(
                `/produtos/${produtoId}/fornecedor-codigos`,
              ),
          api.get<{ data: Parceiro[] }>('/parceiros?papel=fornecedor'),
        ]);
        if (cancelled) return;
        if (maps) setRows(maps.data);
        setFornecedores(pars.data.filter((p) => p.papel_fornecedor));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar de-para.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [produtoId, initialRows]);

  const handleAdd = async () => {
    if (!canWrite) return;
    if (!draft.fornecedor_id || !draft.c_prod.trim()) {
      setError('Informe fornecedor e cProd.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{ data: ProdutoFornecedorCodigo }>(
        `/produtos/${produtoId}/fornecedor-codigos`,
        {
          fornecedor_id: Number(draft.fornecedor_id),
          c_prod: draft.c_prod.trim(),
          x_prod: draft.x_prod.trim() || null,
        },
      );
      setRows((prev) => [...prev, res.data].sort((a, b) => a.c_prod.localeCompare(b.c_prod)));
      setDraft(emptyDraft());
      setMessage('Código do fornecedor vinculado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao vincular cProd.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (row: ProdutoFornecedorCodigo) => {
    if (!canWrite) return;
    const ok = window.confirm(
      `Remover o vínculo ${row.c_prod} de ${row.fornecedor?.codigo ?? 'fornecedor'}?`,
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.delete(`/produtos/${produtoId}/fornecedor-codigos/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setMessage('Vínculo removido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover vínculo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="produto-depara span-2">
      <div className="fiscal-section-title">Códigos do fornecedor (de-para)</div>
      <p className="form-hint produto-depara-lead">
        Ponte obrigatória para entrada assistida: <code>cProd</code> + descrição da NF do
        fornecedor ↔ este SKU. Ex.: Avery <code>AAS029-EX4</code> → ECOPRINT Exact 1000. Várias
        linhas na NF com o mesmo cProd e dezenas de bobinas = um SKU + N volumes.
      </p>

      {loading && <div className="form-hint">Carregando vínculos…</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && rows.length === 0 && (
        <p className="form-hint">Nenhum cProd vinculado ainda.</p>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table produto-depara-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>cProd</th>
                <th>Descrição na NF</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.fornecedor
                      ? fornecedorLabel(row.fornecedor)
                      : `Fornecedor #${row.fornecedor_id}`}
                  </td>
                  <td>
                    <code>{row.c_prod}</code>
                  </td>
                  <td>{row.x_prod || '—'}</td>
                  {canWrite && (
                    <td className="produto-depara-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={saving}
                        onClick={() => void handleRemove(row)}
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <div className="form-grid produto-depara-add">
          <div className="form-group">
            <label>Fornecedor</label>
            <select
              value={draft.fornecedor_id}
              disabled={saving || fornecedores.length === 0}
              onChange={(e) => setDraft((d) => ({ ...d, fornecedor_id: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {fornecedorLabel(f)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>cProd</label>
            <input
              value={draft.c_prod}
              disabled={saving}
              placeholder="Ex.: AAS029-EX4"
              maxLength={60}
              onChange={(e) => setDraft((d) => ({ ...d, c_prod: e.target.value }))}
            />
          </div>
          <div className="form-group span-2">
            <label>Descrição na NF (xProd)</label>
            <input
              value={draft.x_prod}
              disabled={saving}
              placeholder="Como aparece na nota do fornecedor"
              maxLength={240}
              onChange={(e) => setDraft((d) => ({ ...d, x_prod: e.target.value }))}
            />
          </div>
          <div className="form-group span-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving}
              onClick={() => void handleAdd()}
            >
              {saving ? 'Salvando…' : 'Vincular cProd'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
