import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { api, type EstoqueSeparacaoCard, type EstoqueSeparacaoFila } from '../lib/api';
import { formatDecimalBr } from '../lib/format';

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

  return (
    <div className="page">
      <PageHeader
        title="A separar"
        description="Revenda a separar. Escolha volumes, confirme — o saldo sai na NF-e."
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
            {fila.a_separar.length === 0 ? null : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Primeiro local</th>
                      <th className="acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {fila.a_separar.map((c) => (
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
