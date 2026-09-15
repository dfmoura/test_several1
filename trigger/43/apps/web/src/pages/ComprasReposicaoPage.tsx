import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OcPedidoComposicaoPanel } from '../components/OcPedidoComposicaoPanel';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { SortableTh } from '../components/SortableTh';
import { ApiError, api, type Parceiro, type ReposicaoItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { clampDecimalScale, DECIMAL_SCALE, formatQty } from '../lib/format';
import {
  emptyOcFaixa,
  ocFaixaCompleta,
  qtdeComercialFromFaixas,
  type OcFaixaForm,
} from '../lib/ocComposicaoVolumes';
import { produtoPermiteDetalheBobinaOc } from '../lib/ocPedidoDetalheUi';
import { useTableSort } from '../lib/useTableSort';

type RowState = {
  selected: boolean;
  qtde_pedida: string;
  valor_unitario: string;
  composicao: OcFaixaForm[];
  detalheAberto: boolean;
};

const SORT = {
  produto: (i: ReposicaoItem) => i.produto.codigo,
  minimo: (i: ReposicaoItem) => Number(i.estoque_minimo),
  saldo: (i: ReposicaoItem) => Number(i.saldo),
  transito: (i: ReposicaoItem) => Number(i.em_transito),
  faltante: (i: ReposicaoItem) => Number(i.faltante_comercial),
};

function qtdeEfetiva(row: RowState, item: ReposicaoItem): string {
  if (row.composicao.length === 0) return row.qtde_pedida;
  return (
    qtdeComercialFromFaixas(row.composicao, {
      unidade_comercial: item.unidade_comercial,
      unidade_interna: item.unidade_interna,
      fator_conversao: item.produto.fator_conversao,
    }) || ''
  );
}

function faltanteDiverge(qtde: string, faltante: string): boolean {
  const a = Number(String(qtde).replace(',', '.'));
  const b = Number(String(faltante).replace(',', '.'));
  if (!(a > 0) || !(b > 0)) return false;
  return Math.abs(a - b) > 0.0001;
}

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
            composicao: [],
            detalheAberto: false,
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

  const patchRow = (produtoId: number, patch: Partial<RowState>) => {
    setRows((prev) => {
      const cur = prev[produtoId];
      if (!cur) return prev;
      return { ...prev, [produtoId]: { ...cur, ...patch } };
    });
  };

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

    const selected = itens.filter((i) => rows[i.produto_id]?.selected);
    for (const i of selected) {
      const row = rows[i.produto_id];
      if (!row) continue;
      if (row.composicao.length > 0 && !row.composicao.every(ocFaixaCompleta)) {
        setError(
          `Complete as faixas de ${i.produto.codigo} (largura × bobinas × comprimento) ou remova o detalhe.`,
        );
        return;
      }
      if (row.composicao.length > 0 && !qtdeEfetiva(row, i)) {
        setError(`Faixas de ${i.produto.codigo} devem totalizar quantidade maior que zero.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payloadItens = selected.map((i) => {
        const row = rows[i.produto_id];
        const base = {
          produto_id: i.produto_id,
          valor_unitario: row.valor_unitario,
        };
        if (row.composicao.length > 0) {
          return {
            ...base,
            composicao: row.composicao.map((f) => ({
              largura_mm: clampDecimalScale(f.largura_mm, DECIMAL_SCALE.dim),
              quantidade: clampDecimalScale(f.quantidade, DECIMAL_SCALE.qty),
              comprimento_m: clampDecimalScale(f.comprimento_m, DECIMAL_SCALE.dim),
            })),
          };
        }
        return {
          ...base,
          qtde_pedida: row.qtde_pedida,
        };
      });

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
        description="Estoque mínimo × saldo × trânsito → OC rascunho."
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

      <form onSubmit={submit} className="card reposicao-page">
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
                      <th className="num">Qtde OC (un. comercial)</th>
                      <th className="num">Preço unit.</th>
                      <th>Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item) => {
                      const row = rows[item.produto_id];
                      if (!row) return null;
                      const temComposicao = row.composicao.length > 0;
                      const permiteDetalhe =
                        item.permite_detalhe_bobina === true ||
                        produtoPermiteDetalheBobinaOc(
                          {
                            grupo: item.produto.grupo,
                            exige_dimensao_sku: item.produto.exige_dimensao_sku,
                          },
                          temComposicao,
                        );
                      const qtde = qtdeEfetiva(row, item);
                      const unCom = (item.unidade_comercial || 'un.').toUpperCase();
                      const diverge =
                        temComposicao && faltanteDiverge(qtde, item.faltante_comercial);
                      const detalheVisivel = permiteDetalhe && row.detalheAberto;

                      return (
                        <Fragment key={item.produto_id}>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={!canWrite}
                                onChange={(e) =>
                                  patchRow(item.produto_id, { selected: e.target.checked })
                                }
                                aria-label={`Selecionar ${item.produto.codigo}`}
                              />
                            </td>
                            <td title={item.produto.descricao_fiscal}>
                              <strong>{item.produto.codigo}</strong>
                              <div className="muted reposicao-page__desc">
                                {item.produto.descricao_fiscal}
                              </div>
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
                                value={temComposicao ? qtde : row.qtde_pedida}
                                readOnly={temComposicao}
                                disabled={!canWrite || !row.selected}
                                onChange={(e) => {
                                  if (temComposicao) return;
                                  patchRow(item.produto_id, { qtde_pedida: e.target.value });
                                }}
                                aria-label={`Qtde OC ${item.produto.codigo}`}
                                title={
                                  temComposicao
                                    ? diverge
                                      ? `Via faixas · ≠ faltante (${formatQty(item.faltante_comercial)} ${unCom})`
                                      : `Via faixas · ${unCom}`
                                    : undefined
                                }
                              />
                            </td>
                            <td className="num">
                              <input
                                type="text"
                                inputMode="decimal"
                                required={row.selected}
                                placeholder="0.00"
                                value={row.valor_unitario}
                                disabled={!canWrite || !row.selected}
                                onChange={(e) =>
                                  patchRow(item.produto_id, {
                                    valor_unitario: e.target.value,
                                  })
                                }
                                aria-label={`Preço unitário ${item.produto.codigo}`}
                              />
                            </td>
                            <td>
                              {permiteDetalhe ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={!canWrite || !row.selected}
                                  onClick={() => {
                                    if (detalheVisivel) {
                                      const completas = row.composicao.filter(ocFaixaCompleta);
                                      const qtdeKeep =
                                        completas.length > 0
                                          ? qtdeComercialFromFaixas(completas, {
                                              unidade_comercial: item.unidade_comercial,
                                              unidade_interna: item.unidade_interna,
                                              fator_conversao: item.produto.fator_conversao,
                                            }) || item.faltante_comercial
                                          : row.qtde_pedida || item.faltante_comercial;
                                      patchRow(item.produto_id, {
                                        detalheAberto: false,
                                        composicao: completas,
                                        qtde_pedida: qtdeKeep,
                                      });
                                      return;
                                    }
                                    patchRow(item.produto_id, {
                                      detalheAberto: true,
                                      composicao:
                                        row.composicao.length > 0
                                          ? row.composicao
                                          : [emptyOcFaixa()],
                                    });
                                  }}
                                  aria-expanded={detalheVisivel}
                                >
                                  {detalheVisivel
                                    ? 'Ocultar'
                                    : temComposicao
                                      ? `Faixas (${row.composicao.length})`
                                      : 'Detalhar'}
                                </button>
                              ) : (
                                <span className="muted" title="Qtde comercial na linha">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                          {detalheVisivel && row.selected ? (
                            <tr className="reposicao-detalhe-row">
                              <td colSpan={9}>
                                <OcPedidoComposicaoPanel
                                  composicao={row.composicao}
                                  disabled={!canWrite}
                                  compact
                                  comercial={{
                                    unidade_comercial: item.unidade_comercial,
                                    unidade_interna: item.unidade_interna,
                                    fator_conversao: item.produto.fator_conversao,
                                  }}
                                  onChange={(composicao) => {
                                    const next: RowState = {
                                      ...row,
                                      composicao,
                                      detalheAberto: true,
                                    };
                                    if (composicao.length > 0) {
                                      next.qtde_pedida =
                                        qtdeComercialFromFaixas(composicao, {
                                          unidade_comercial: item.unidade_comercial,
                                          unidade_interna: item.unidade_interna,
                                          fator_conversao: item.produto.fator_conversao,
                                        }) || row.qtde_pedida;
                                    }
                                    setRows((prev) => ({
                                      ...prev,
                                      [item.produto_id]: next,
                                    }));
                                  }}
                                />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
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
