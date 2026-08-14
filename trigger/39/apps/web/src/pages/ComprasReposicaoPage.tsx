import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError, api, type Parceiro, type ReposicaoItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatQty } from '../lib/format';

type RowState = {
  selected: boolean;
  qtde_pedida: string;
  valor_unitario: string;
};

export function ComprasReposicaoPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('compras.escrever');
  const [itens, setItens] = useState<ReposicaoItem[]>([]);
  const [fornecedores, setFornecedores] = useState<Parceiro[]>([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [rep, par] = await Promise.all([
          api.get<{ data: ReposicaoItem[] }>('/estoque/reposicao'),
          api.get<{ data: Parceiro[] }>('/parceiros'),
        ]);
        setItens(rep.data);
        setFornecedores(par.data.filter((p) => p.papel_fornecedor));
        const initial: Record<number, RowState> = {};
        for (const item of rep.data) {
          initial[item.produto_id] = {
            selected: true,
            qtde_pedida: item.faltante_comercial,
            valor_unitario: '',
          };
        }
        setRows(initial);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCount = useMemo(
    () => Object.values(rows).filter((r) => r.selected).length,
    [rows],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setSaving(true);
    try {
      const payloadItens = itens
        .filter((i) => rows[i.produto_id]?.selected)
        .map((i) => ({
          produto_id: i.produto_id,
          qtde_pedida: rows[i.produto_id].qtde_pedida,
          valor_unitario: rows[i.produto_id].valor_unitario,
        }));

      const res = await api.post<{ data: { id: number } }>('/estoque/reposicao/gerar-oc', {
        fornecedor_id: Number(fornecedorId),
        itens: payloadItens,
      });
      navigate(`/compras/ordens/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar OC.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="A repor"
        description="Sugestão por estoque mínimo (MP/EMB/REV), descontando saldo e OC em trânsito. Confirme fornecedor e preços para gerar a OC."
        actions={
          <div className="btn-row">
            <Link to="/estoque" className="btn btn-secondary">
              Estoque
            </Link>
            <Link to="/compras/ordens" className="btn btn-secondary">
              Ordens
            </Link>
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit} className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : itens.length === 0 ? (
            <div className="empty-state">
              Nenhum item abaixo do mínimo. Cadastre <code>estoque_minimo</code> nos insumos ou
              receba mercadoria.
            </div>
          ) : (
            <>
              <div className="detail-meta" style={{ marginBottom: '1rem' }}>
                <div>
                  <span>Itens abaixo do mínimo</span>
                  <strong>{itens.length}</strong>
                </div>
                <div>
                  <span>Selecionados para OC</span>
                  <strong>{selectedCount}</strong>
                </div>
              </div>

              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <label>
                  Fornecedor
                  <select
                    required
                    value={fornecedorId}
                    onChange={(e) => setFornecedorId(e.target.value)}
                    disabled={!canWrite}
                  >
                    <option value="">Selecione…</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.codigo} — {f.nome_fantasia || f.razao_social}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Produto</th>
                      <th>Mínimo</th>
                      <th>Saldo</th>
                      <th>Trânsito</th>
                      <th>Faltante</th>
                      <th>Qtde OC</th>
                      <th>Preço unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const row = rows[item.produto_id];
                      return (
                        <tr key={item.produto_id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={row?.selected ?? false}
                              disabled={!canWrite}
                              onChange={(e) =>
                                setRows((prev) => ({
                                  ...prev,
                                  [item.produto_id]: {
                                    ...prev[item.produto_id],
                                    selected: e.target.checked,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <strong>{item.produto.codigo}</strong>
                            <div className="muted">{item.produto.descricao_fiscal}</div>
                          </td>
                          <td>
                            {formatQty(item.estoque_minimo)} {item.unidade_interna}
                          </td>
                          <td>
                            {formatQty(item.saldo)} {item.unidade_interna}
                          </td>
                          <td>
                            {formatQty(item.em_transito)} {item.unidade_interna}
                          </td>
                          <td>
                            {formatQty(item.faltante_comercial)} {item.unidade_comercial}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row?.qtde_pedida ?? ''}
                              disabled={!canWrite || !row?.selected}
                              onChange={(e) =>
                                setRows((prev) => ({
                                  ...prev,
                                  [item.produto_id]: {
                                    ...prev[item.produto_id],
                                    qtde_pedida: e.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              required={row?.selected}
                              placeholder="0.00"
                              value={row?.valor_unitario ?? ''}
                              disabled={!canWrite || !row?.selected}
                              onChange={(e) =>
                                setRows((prev) => ({
                                  ...prev,
                                  [item.produto_id]: {
                                    ...prev[item.produto_id],
                                    valor_unitario: e.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canWrite && (
                <div className="btn-row" style={{ marginTop: '1rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || selectedCount === 0 || !fornecedorId}
                  >
                    {saving ? 'Gerando…' : `Gerar OC (${selectedCount})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </>
  );
}
