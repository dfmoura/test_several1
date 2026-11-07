import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type EstoqueRetiradaCard, type EstoqueRetiradasFila } from '../lib/api';
import { useAuth } from '../lib/auth';
import { opStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  op: (c: EstoqueRetiradaCard) => c.codigo,
  pedido: (c: EstoqueRetiradaCard) => c.pedido?.codigo,
  cliente: (c: EstoqueRetiradaCard) => c.parceiro?.razao_social,
  falta: (c: EstoqueRetiradaCard) => c.linhas_pendentes,
  saiu: (c: EstoqueRetiradaCard) => c.linhas_baixadas,
  local: (c: EstoqueRetiradaCard) => c.primeiro_local,
  status: (c: EstoqueRetiradaCard) => c.status,
};

/**
 * Porta do estoque — o que sai da prateleira.
 * Confirmar aqui = SAIDA_PRODUCAO. A produção recebe na máquina.
 */
export function EstoqueRetiradasPage() {
  const { hasPermission } = useAuth();
  const [fila, setFila] = useState<EstoqueRetiradasFila | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<{ data: EstoqueRetiradasFila }>('/estoque/retiradas')
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

  return (
    <div className="page">
      <PageHeader
        title="A buscar"
        description="O que a produção precisa e ainda está na prateleira. Marque o volume e confirme — isso sai do estoque. Quem recebe é o chão de fábrica."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Saldos
            </Link>
            {hasPermission('producao.ler') ? (
              <Link className="btn btn-secondary" to="/ordens-producao">
                Ordens de produção
              </Link>
            ) : null}
          </>
        }
      />

      <EstoqueModuleNav />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {fila.resumo.a_retirar === 0
              ? 'Nada para buscar nesta empresa.'
              : `${fila.resumo.a_retirar} ordem${fila.resumo.a_retirar === 1 ? '' : 's'} a buscar.`}
          </p>
          <Secao
            titulo="Sai da prateleira agora"
            vazio="Nenhum material aguardando busca."
            cards={fila.a_retirar}
            acao="Abrir lista"
          />
          {fila.a_entregar.length > 0 ? (
            <Secao
              titulo="Já saiu — a produção recebe"
              vazio=""
              cards={fila.a_entregar}
              acao={null}
              nota="Confirmado no estoque. A produção fecha a ordem em Produção · A fechar."
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Secao({
  titulo,
  vazio,
  cards,
  acao,
  nota,
}: {
  titulo: string;
  vazio: string;
  cards: EstoqueRetiradaCard[];
  acao: string | null;
  nota?: string;
}) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(cards, SORT);
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <h3 style={{ margin: '0 0 0.75rem' }}>{titulo}</h3>
        {nota ? (
          <p className="muted" style={{ margin: '0 0 0.75rem' }}>
            {nota}
          </p>
        ) : null}
        {cards.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {vazio}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="op" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    OP
                  </SortableTh>
                  <SortableTh column="pedido" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Pedido
                  </SortableTh>
                  <SortableTh column="cliente" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Cliente
                  </SortableTh>
                  <SortableTh
                    column="falta"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="num"
                  >
                    Falta pegar
                  </SortableTh>
                  <SortableTh
                    column="saiu"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="num"
                  >
                    Já saiu
                  </SortableTh>
                  <SortableTh column="local" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Primeiro local
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  {acao ? <th className="acoes" /> : null}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.codigo}</strong>
                    </td>
                    <td>{c.pedido?.codigo ?? '—'}</td>
                    <td>{c.parceiro?.razao_social ?? '—'}</td>
                    <td className="num">{c.linhas_pendentes}</td>
                    <td className="num">{c.linhas_baixadas}</td>
                    <td>{c.primeiro_local ?? '—'}</td>
                    <td>
                      <StatusPill status={opStatusLabel(c.status)} />
                    </td>
                    {acao ? (
                      <td>
                        <Link className="btn btn-primary btn-sm" to={`/estoque/retiradas/${c.id}`}>
                          {acao}
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
