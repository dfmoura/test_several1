import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type ProducaoApontamentoCard, type ProducaoApontamentosFila } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { opStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  op: (c: ProducaoApontamentoCard) => c.codigo,
  pedido: (c: ProducaoApontamentoCard) => c.pedido?.codigo,
  cliente: (c: ProducaoApontamentoCard) => c.parceiro?.razao_social,
  item: (c: ProducaoApontamentoCard) => c.pedido_item?.descricao,
  planejado: (c: ProducaoApontamentoCard) => Number(c.qtde_planejada),
  status: (c: ProducaoApontamentoCard) => c.status,
};

/**
 * Produção · A fechar — fila de OP com material já saído.
 * Espelho de Estoque · A buscar. Fecha em /ordens-producao/:id/fechar.
 */
export function OpAFecharPage() {
  const [fila, setFila] = useState<ProducaoApontamentosFila | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<{ data: ProducaoApontamentosFila }>('/ordens-producao/apontamentos')
      .then((res) => {
        if (alive) setFila(res.data);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : 'Falha ao carregar a fila.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const cards: ProducaoApontamentoCard[] = useMemo(
    () =>
      fila?.a_fechar ??
      [...(fila?.a_receber ?? []), ...(fila?.a_apontar ?? [])],
    [fila],
  );
  const total = fila?.resumo.a_fechar ?? fila?.resumo.total ?? cards.length;
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(cards, SORT);

  return (
    <div className="page">
      <PageHeader
        title="A fechar"
        description="Ordens com material já na máquina. Informe boas e refugo por modelo — isso atualiza a quantidade faturável do pedido."
        actions={
          <Link className="btn btn-secondary" to="/ordens-producao">
            Ordens de produção
          </Link>
        }
      />

      {err ? (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      ) : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {total === 0
              ? 'Nenhuma ordem pronta para fechar nesta empresa.'
              : `${total} ordem${total === 1 ? '' : 'es'} a fechar.`}
          </p>

          <div className="card">
            <div className="card-body">
              <h3 style={{ margin: '0 0 0.75rem' }}>Fechar a ordem</h3>
              {cards.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Quando o estoque confirmar a saída em A buscar, a ordem aparece aqui.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <SortableTh column="op" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          OP
                        </SortableTh>
                        <SortableTh
                          column="pedido"
                          sorts={sorts}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={requestSort}
                        >
                          Pedido
                        </SortableTh>
                        <SortableTh
                          column="cliente"
                          sorts={sorts}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={requestSort}
                        >
                          Cliente
                        </SortableTh>
                        <SortableTh
                          column="item"
                          sorts={sorts}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={requestSort}
                        >
                          Item
                        </SortableTh>
                        <SortableTh
                          column="planejado"
                          sorts={sorts}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={requestSort}
                          className="num"
                        >
                          Planejado
                        </SortableTh>
                        <SortableTh
                          column="status"
                          sorts={sorts}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={requestSort}
                        >
                          Status
                        </SortableTh>
                        <th className="acoes" />
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.codigo}</strong>
                          </td>
                          <td>
                            {c.pedido ? (
                              <Link to={`/pedidos/${c.pedido.id}`}>{c.pedido.codigo}</Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{c.parceiro?.razao_social ?? '—'}</td>
                          <td>{c.pedido_item?.descricao ?? '—'}</td>
                          <td className="num">{formatDecimalBr(Number(c.qtde_planejada), 0)}</td>
                          <td>
                            <StatusPill status={opStatusLabel(c.status)} />
                          </td>
                          <td className="acoes">
                            <Link
                              to={`/ordens-producao/${c.id}/fechar`}
                              className="btn btn-primary btn-sm"
                            >
                              Fechar
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
