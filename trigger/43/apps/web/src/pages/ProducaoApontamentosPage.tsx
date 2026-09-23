import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type ProducaoApontamentoCard, type ProducaoApontamentosFila } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { hrefApontamentoProducao, opStatusLabel } from '../lib/producaoUi';

/**
 * Fila do chão — apontar e concluir a OP.
 * Duas listas, um motor (POST …/concluir). Sem documento APONT-.
 */
export function ProducaoApontamentosPage() {
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
        if (alive) setErr(e instanceof Error ? e.message : 'Falha ao carregar apontamentos.');
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
        title="Apontamentos de produção"
        description="Quem está na máquina recebe o material, aponta retorno e perda de processo e conclui a OP. O PCP só lê o resultado na ordem."
        actions={
          <>
            <Link className="btn btn-secondary" to="/ordens-producao">
              Ordens de produção
            </Link>
            <Link className="btn btn-secondary" to="/estoque/retiradas">
              Retiradas
            </Link>
          </>
        }
      />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {fila.resumo.total === 0
              ? 'Nenhuma OP com material na máquina nesta empresa.'
              : `${fila.resumo.a_receber} a receber · ${fila.resumo.a_apontar} a concluir.`}
          </p>
          <Secao
            titulo="A receber na máquina"
            vazio="Nada aguardando quem recebeu."
            cards={fila.a_receber}
            acao="Registrar recebimento"
          />
          <Secao
            titulo="A apontar e concluir"
            vazio="Nenhuma OP pronta para concluir."
            cards={fila.a_apontar}
            acao="Abrir apontamento"
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
  cards: ProducaoApontamentoCard[];
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
                  <th>Planejada</th>
                  <th>Baixadas</th>
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
                    <td>{formatDecimalBr(Number(c.qtde_planejada), 0)}</td>
                    <td>{c.linhas_baixadas}</td>
                    <td>
                      <StatusPill status={opStatusLabel(c.status)} />
                    </td>
                    <td>
                      <Link className="btn btn-secondary btn-sm" to={hrefApontamentoProducao(c.id)}>
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
