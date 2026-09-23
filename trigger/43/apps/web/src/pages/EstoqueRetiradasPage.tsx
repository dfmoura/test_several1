import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { StatusPill } from '../components/StatusPill';
import { api, type EstoqueRetiradaCard, type EstoqueRetiradasFila } from '../lib/api';
import { opStatusLabel } from '../lib/producaoUi';

/**
 * Fila do almoxarifado — coleta dirigida Fase B/C.
 * Duas listas, um motor (OP + SAIDA_PRODUCAO). Sem segundo estoque.
 */
export function EstoqueRetiradasPage() {
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
        if (alive) setErr(e instanceof Error ? e.message : 'Falha ao carregar retiradas.');
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
        title="Retiradas para produção"
        description="Cada requisição é uma ficha: o estoque confronta o sistema com o físico (QR ou manual). O que sai fica anexo à OP. Avaria? Requisita de novo."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar
            </Link>
            <Link className="btn btn-secondary" to="/ordens-producao">
              Ordens de produção
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {fila.resumo.total === 0
              ? 'Nenhuma retirada em aberto nesta empresa.'
              : `${fila.resumo.a_retirar} a retirar · ${fila.resumo.a_entregar} a entregar na produção.`}
          </p>
          <Secao
            titulo="A retirar no estoque"
            vazio="Nada pendente de baixa."
            cards={fila.a_retirar}
            acao="Abrir ficha"
          />
          <Secao
            titulo="A entregar na produção"
            vazio="Nenhuma baixa aguardando handoff."
            cards={fila.a_entregar}
            acao="Registrar entrega"
          />
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
}: {
  titulo: string;
  vazio: string;
  cards: EstoqueRetiradaCard[];
  acao: string;
}) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <h3 style={{ margin: '0 0 0.75rem' }}>{titulo}</h3>
        {cards.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {vazio}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>OP</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Pendentes</th>
                  <th>Já baixadas</th>
                  <th>Primeiro local</th>
                  <th>Status</th>
                  <th className="acoes" />
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.codigo}</strong>
                    </td>
                    <td>{c.pedido?.codigo ?? '—'}</td>
                    <td>{c.parceiro?.razao_social ?? '—'}</td>
                    <td>{c.linhas_pendentes}</td>
                    <td>{c.linhas_baixadas}</td>
                    <td>{c.primeiro_local ?? '—'}</td>
                    <td>
                      <StatusPill status={opStatusLabel(c.status)} />
                    </td>
                    <td>
                      <Link className="btn btn-secondary btn-sm" to={`/estoque/retiradas/${c.id}`}>
                        {acao}
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
  );
}
