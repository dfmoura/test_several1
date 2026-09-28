import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type ProducaoApontamentoCard, type ProducaoApontamentosFila } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';
import { hrefApontamentoProducao, opStatusLabel } from '../lib/producaoUi';

/**
 * Porta da máquina — receber o que o estoque separou, produzir, fechar.
 */
export function ProducaoApontamentosPage() {
  const { hasPermission } = useAuth();
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

  return (
    <div className="page">
      <PageHeader
        title="Na máquina"
        description="Confira o que o estoque tirou da prateleira, confirme o recebimento e produza. A baixa do estoque já foi feita."
        actions={
          hasPermission('producao.ler') ? (
            <Link className="btn btn-secondary" to="/ordens-producao">
              Ordens de produção
            </Link>
          ) : null
        }
      />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando fila…</p> : null}

      {!loading && fila ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {fila.resumo.total === 0
              ? 'Nenhum material chegou na máquina nesta empresa.'
              : `${fila.resumo.a_receber} a receber · ${fila.resumo.a_apontar} a produzir.`}
          </p>
          <Secao
            titulo="Chegou — confirmar recebimento"
            vazio="Nada aguardando quem recebeu."
            cards={fila.a_receber}
            acao="Recebi na máquina"
          />
          <Secao
            titulo="Produzir e fechar"
            vazio="Nenhuma ordem pronta para produzir."
            cards={fila.a_apontar}
            acao="Abrir a máquina"
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
                  <th>Etiquetas</th>
                  <th>Itens que chegaram</th>
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
                      <Link className="btn btn-primary btn-sm" to={hrefApontamentoProducao(c.id)}>
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
