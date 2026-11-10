import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { api, type EstoqueSeparacaoCard, type EstoqueSeparacaoFila } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  pedido: (c: EstoqueSeparacaoCard) => c.pedido_codigo,
  cliente: (c: EstoqueSeparacaoCard) => c.parceiro?.razao_social,
  produto: (c: EstoqueSeparacaoCard) =>
    c.produto ? `${c.produto.codigo} · ${c.produto.descricao}` : c.descricao,
  qtde: (c: EstoqueSeparacaoCard) => Number(c.qtde),
  local: (c: EstoqueSeparacaoCard) => c.primeiro_local,
};

/**
 * Porta do estoque para revenda.
 * Confirmar aqui não grava MOV — a saída do saldo é a NF-e.
 */
export function EstoqueSeparacoesPage() {
  const [fila, setFila] = useState<EstoqueSeparacaoFila | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<{ data: EstoqueSeparacaoFila }>('/estoque/separacoes')
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

  const n = fila?.resumo.a_separar ?? 0;
  const rows = useMemo(() => fila?.a_separar ?? [], [fila]);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT);

  return (
    <div className="page">
      <PageHeader
        variant="list"
        title="A separar"
        description="Revenda a separar — volumes confirmados saem na NF-e."
        actions={
          <Link className="btn btn-secondary" to="/estoque/retiradas">
            A buscar
          </Link>
        }
      />

      <EstoqueModuleNav />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <div className="card">
          <div className="card-body">
            <p className="muted" style={{ marginTop: 0 }}>
              {n === 0
                ? 'Nada de revenda para separar nesta empresa.'
                : `${n} item${n === 1 ? '' : 's'} a separar.`}
            </p>
            {sorted.length === 0 ? null : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
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
                        column="produto"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                      >
                        Produto
                      </SortableTh>
                      <SortableTh
                        column="qtde"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        className="num"
                      >
                        Quantidade
                      </SortableTh>
                      <SortableTh
                        column="local"
                        sorts={sorts}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                      >
                        Primeiro local
                      </SortableTh>
                      <th className="acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c) => (
                      <Linha key={c.pedido_item_id} card={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Linha({ card }: { card: EstoqueSeparacaoCard }) {
  const nome = card.produto
    ? `${card.produto.codigo} · ${card.produto.descricao}`
    : card.descricao;
  return (
    <tr>
      <td>
        <strong>{card.pedido_codigo ?? '—'}</strong>
      </td>
      <td>{card.parceiro?.razao_social ?? '—'}</td>
      <td>{nome}</td>
      <td>
        {formatDecimalBr(card.qtde, 4, { stripTrailingZeros: true })} {card.unidade}
      </td>
      <td>{card.primeiro_local ?? '—'}</td>
      <td>
        <Link className="btn btn-primary btn-sm" to={`/estoque/separacoes/${card.pedido_item_id}`}>
          Abrir lista
        </Link>
      </td>
    </tr>
  );
}
