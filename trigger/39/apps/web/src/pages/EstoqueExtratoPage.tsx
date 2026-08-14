import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type EstoqueExtrato } from '../lib/api';
import { formatValorPosicao, movTipoLabel, qtdeKardex } from '../lib/estoqueUi';
import { useAuth } from '../lib/auth';
import {
  familiaLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQty,
  formatUnitPrice,
} from '../lib/format';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';

export function EstoqueExtratoPage() {
  const { produtoId } = useParams();
  const { hasPermission } = useAuth();
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

  const produto = data?.produto;
  const saldo = data?.saldo;

  return (
    <>
      <PageHeader
        title={produto ? produto.codigo : 'Extrato do produto'}
        description={
          produto
            ? produto.descricao_fiscal
            : loading
              ? 'Carregando…'
              : 'Kardex do SKU na empresa ativa. Saldo oficial só via MOV.'
        }
        actions={
          <div className="btn-row">
            <Link to="/estoque" className="btn btn-secondary">
              Voltar
            </Link>
            {produtoId && hasPermission('produto.ler') ? (
              <Link to={`/produtos/${produtoId}`} className="btn btn-secondary">
                Cadastro
              </Link>
            ) : null}
          </div>
        }
      />

      <EstoqueModuleNav />

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Carregando…</div>
      ) : data && produto && saldo ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Família</span>
                  <strong>
                    {produto.familia} · {familiaLabel(produto.familia)}
                  </strong>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>
                    {formatQty(saldo.qtde)} {saldo.unidade}
                  </strong>
                </div>
                <div>
                  <span>Custo médio</span>
                  <strong>{formatUnitPrice(saldo.custo_medio)}</strong>
                </div>
                <div>
                  <span>Valor da posição</span>
                  <strong>{formatValorPosicao(saldo.qtde, saldo.custo_medio)}</strong>
                </div>
                <div>
                  <span>Lote</span>
                  <strong>
                    {produto.controla_lote
                      ? produto.controla_validade
                        ? 'Controla lote e validade'
                        : 'Controla lote'
                      : 'Sem lote'}
                  </strong>
                </div>
                <div>
                  <span>Movimentos</span>
                  <strong>{data.movimentos_count}</strong>
                </div>
              </div>
              <p className="muted" style={{ margin: '0.85rem 0 0' }}>
                Kardex do mais antigo ao mais recente. Quantidade positiva entra; negativa sai para
                produção. Ajuste mostra a magnitude — o sinal está no documento AJU.
              </p>
            </div>
          </div>

          {data.lotes && data.lotes.length > 0 ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body" style={{ paddingBottom: 0 }}>
                <div className="form-section">
                  <h3>Lotes em aberto</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Ordem FEFO: vence primeiro, sai primeiro.
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Entrada</th>
                      <th>Vencimento</th>
                      <th className="num">Qtde</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lotes.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <strong>{l.codigo}</strong>
                        </td>
                        <td>{l.data_entrada ? formatDate(l.data_entrada) : '—'}</td>
                        <td>{l.data_validade ? formatDate(l.data_validade) : '—'}</td>
                        <td className="num">
                          {formatQty(l.qtde)} {l.unidade}
                        </td>
                        <td>
                          <StatusPill
                            status={l.status_label || validadeStatusLabel(l.status)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : produto.controla_lote ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="empty-state">Nenhum lote com saldo neste SKU.</div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div className="form-section">
                <h3>Kardex</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  Cada linha é um item de movimento. O saldo do topo é a verdade oficial após o
                  último MOV.
                </p>
              </div>
            </div>
            <div className="table-wrap table-wrap--freeze">
              {data.movimentos.length === 0 ? (
                <div className="empty-state">Sem movimentos para este produto.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Quando</th>
                      <th>MOV</th>
                      <th>Tipo</th>
                      <th className="num">Qtde</th>
                      <th className="num">Valor</th>
                      <th className="num">CM após</th>
                      <th>Lote / documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movimentos.map((m, idx) => {
                      const qk = qtdeKardex(m.tipo, m.qtde, m.unidade);
                      const doc = m.nf_numero
                        ? `NF ${m.nf_numero}`
                        : m.motivo_codigo
                          ? m.motivo_codigo
                          : null;
                      return (
                        <tr key={`${m.movimento_id}-${idx}`}>
                          <td>{formatDateTime(m.conferido_em || m.created_at)}</td>
                          <td>
                            <strong>{m.movimento_codigo ?? '—'}</strong>
                          </td>
                          <td>{movTipoLabel(m.tipo)}</td>
                          <td className={`num ${qk.className}`}>{qk.text}</td>
                          <td className="num">{formatCurrency(m.valor_total)}</td>
                          <td className="num">{formatUnitPrice(m.custo_medio_apos)}</td>
                          <td>
                            {m.lote ? (
                              <>
                                {m.lote.codigo}
                                {m.lote.data_validade ? (
                                  <div className="muted">
                                    venc. {formatDate(m.lote.data_validade)}
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                            {doc ? <div className="muted">{doc}</div> : null}
                          </td>
                        </tr>
                      );
                    })}
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
