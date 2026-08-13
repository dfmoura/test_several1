import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError, api, type EstoqueExtrato } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import { StatusPill } from '../components/StatusPill';

export function EstoqueExtratoPage() {
  const { produtoId } = useParams();
  const [data, setData] = useState<EstoqueExtrato | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!produtoId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: EstoqueExtrato }>(
          `/estoque/produtos/${produtoId}/extrato`,
        );
        setData(res.data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar extrato.');
      } finally {
        setLoading(false);
      }
    })();
  }, [produtoId]);

  return (
    <>
      <PageHeader
        title="Extrato do produto"
        description="Kardex leve: movimentos do SKU na empresa ativa. Saldo oficial só via MOV."
        actions={
          <>
            <Link to="/estoque" className="btn btn-secondary">
              Saldos
            </Link>
            <Link to="/estoque/ajustes" className="btn btn-secondary">
              Ajustes
            </Link>
          </>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Carregando…</div>
      ) : data ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <strong>
                {data.produto.codigo} — {data.produto.descricao_fiscal}
              </strong>
              <div className="muted" style={{ marginTop: '0.35rem' }}>
                {data.produto.familia} · saldo {data.saldo.qtde} {data.saldo.unidade} · CM{' '}
                {formatCurrency(data.saldo.custo_medio)}
                {data.produto.controla_lote ? ' · controla lote' : ''}
              </div>
            </div>
          </div>

          {data.lotes && data.lotes.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Entrada</th>
                      <th>Vencimento</th>
                      <th>Qtde</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lotes.map((l) => (
                      <tr key={l.id}>
                        <td>{l.codigo}</td>
                        <td>{l.data_entrada ? formatDate(l.data_entrada) : '—'}</td>
                        <td>{l.data_validade ? formatDate(l.data_validade) : '—'}</td>
                        <td>
                          {l.qtde} {l.unidade}
                        </td>
                        <td>
                          <StatusPill status={l.status_label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <div className="table-wrap table-wrap--freeze">
              {data.movimentos.length === 0 ? (
                <div className="empty-state">Sem movimentos para este produto.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>MOV</th>
                      <th>Tipo</th>
                      <th>Qtde</th>
                      <th>Valor</th>
                      <th>CM após</th>
                      <th>Lote</th>
                      <th>Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movimentos.map((m, idx) => (
                      <tr key={`${m.movimento_id}-${idx}`}>
                        <td>
                          {m.movimento_codigo}
                          {m.motivo_codigo && (
                            <div className="muted">{m.motivo_codigo}</div>
                          )}
                        </td>
                        <td>{m.tipo}</td>
                        <td>
                          {m.qtde} {m.unidade}
                        </td>
                        <td>{formatCurrency(m.valor_total)}</td>
                        <td>{formatCurrency(m.custo_medio_apos)}</td>
                        <td>
                          {m.lote ? (
                            <>
                              {m.lote.codigo}
                              {m.lote.data_validade && (
                                <div className="muted">venc. {formatDate(m.lote.data_validade)}</div>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{formatDateTime(m.conferido_em || m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
