import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { SortableTh } from '../components/SortableTh';
import { ApiError, api, type Parceiro, type ReposicaoItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatQty } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type RowState = {
  selected: boolean;
  qtde_pedida: string;
  valor_unitario: string;
};

const SORT = {
  produto: (i: ReposicaoItem) => i.produto.codigo,
  minimo: (i: ReposicaoItem) => Number(i.estoque_minimo),
  saldo: (i: ReposicaoItem) => Number(i.saldo),
  transito: (i: ReposicaoItem) => Number(i.em_transito),
  faltante: (i: ReposicaoItem) => Number(i.faltante_comercial),
};

export function ComprasReposicaoPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('compras.escrever');
  const [itens, setItens] = useState<ReposicaoItem[]>([]);
  const [fornecedor, setFornecedor] = useState<Parceiro | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(itens, SORT, {
    initialKey: 'faltante',
    initialDir: 'desc',
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const rep = await api.get<{ data: ReposicaoItem[] }>('/estoque/reposicao');
        setItens(rep.data);
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
  const allSelected = itens.length > 0 && selectedCount === itens.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = (checked: boolean) => {
    setRows((prev) => {
      const next = { ...prev };
      for (const item of itens) {
        const cur = next[item.produto_id];
        if (!cur) continue;
        next[item.produto_id] = { ...cur, selected: checked };
      }
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite || !fornecedor) return;
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
        fornecedor_id: fornecedor.id,
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
        description="Sugestão por estoque mínimo (MP/EMB/REV), descontando saldo e OC já enviada (em trânsito). Gera rascunho — confira e envie ao fornecedor na ficha da OC."
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
                <ParceiroCombobox
                  className="span-2"
                  label="Fornecedor"
                  papel="fornecedor"
                  value={fornecedor}
                  onChange={setFornecedor}
                  required
                  disabled={!canWrite}
                  placeholder="Buscar fornecedor por nome, código ou CNPJ…"
                  hint="PAR classificado como fornecedor · busca no cadastro (não lista tudo de uma vez)."
                />
              </div>

              <div className="table-wrap table-wrap--freeze">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          disabled={!canWrite}
                          onChange={(e) => toggleAll(e.target.checked)}
                          aria-label="Selecionar todos para gerar OC"
                          title={allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                        />
                      </th>
                      <SortableTh
                        column="produto"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                      >
                        Produto
                      </SortableTh>
                      <SortableTh
                        column="minimo"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        className="num"
                      >
                        Mínimo
                      </SortableTh>
                      <SortableTh
                        column="saldo"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        className="num"
                      >
                        Saldo
                      </SortableTh>
                      <SortableTh
                        column="transito"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        className="num"
                      >
                        Trânsito
                      </SortableTh>
                      <SortableTh
                        column="faltante"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        className="num"
                      >
                        Faltante
                      </SortableTh>
                      <th className="num">Qtde OC</th>
                      <th className="num">Preço unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item) => {
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
                              aria-label={`Selecionar ${item.produto.codigo}`}
                            />
                          </td>
                          <td>
                            <strong>{item.produto.codigo}</strong>
                            <div className="muted">{item.produto.descricao_fiscal}</div>
                          </td>
                          <td className="num">
                            {formatQty(item.estoque_minimo)} {item.unidade_interna}
                          </td>
                          <td className="num">
                            {formatQty(item.saldo)} {item.unidade_interna}
                          </td>
                          <td className="num">
                            {formatQty(item.em_transito)} {item.unidade_interna}
                          </td>
                          <td className="num">
                            {formatQty(item.faltante_comercial)} {item.unidade_comercial}
                          </td>
                          <td className="num">
                            <input
                              type="text"
                              inputMode="decimal"
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
                              aria-label={`Qtde OC ${item.produto.codigo}`}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="text"
                              inputMode="decimal"
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
                              aria-label={`Preço unitário ${item.produto.codigo}`}
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
                    disabled={saving || selectedCount === 0 || !fornecedor}
                  >
                    {saving ? 'Gerando…' : `Preparar OC (${selectedCount})`}
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
