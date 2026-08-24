import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api, type PlataformaMetricas } from '../lib/api';
import { formatCurrency } from '../lib/format';

export function PlataformaPainelPage() {
  const [data, setData] = useState<PlataformaMetricas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(() => {
    setErro(null);
    void api
      .plataformaMetricas()
      .then((res) => setData(res.data))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Falha ao carregar métricas.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Painel da instalação"
        description="Contas FLEXORC nesta nuvem — mensalidade paga à TRIGGER. Não mistura com o sinal PIX da gráfica."
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="dash-kpi-grid" aria-label="Saúde das contas">
            <Link to="/plataforma/contas?saude=em_dia" className="dash-kpi">
              <span className="dash-kpi-label">Em dia</span>
              <strong className="dash-kpi-value">{data.contas.em_dia}</strong>
              <span className="dash-kpi-hint">Mensalidade autenticada</span>
            </Link>
            <Link to="/plataforma/contas?saude=cortesia" className="dash-kpi">
              <span className="dash-kpi-label">Cortesia</span>
              <strong className="dash-kpi-value">{data.contas.cortesia}</strong>
              <span className="dash-kpi-hint">Período free vigente</span>
            </Link>
            <Link to="/plataforma/contas?saude=pendente" className="dash-kpi dash-kpi--alerta">
              <span className="dash-kpi-label">Pendente</span>
              <strong className="dash-kpi-value">{data.contas.pendente}</strong>
              <span className="dash-kpi-hint">Aguardando pagamento</span>
            </Link>
            <Link to="/plataforma/contas?saude=suspensa" className="dash-kpi">
              <span className="dash-kpi-label">Suspensa</span>
              <strong className="dash-kpi-value">{data.contas.suspensa}</strong>
              <span className="dash-kpi-hint">Sem fluxo de suspensão nesta fase</span>
            </Link>
            <div className="dash-kpi">
              <span className="dash-kpi-label">MRR estimado</span>
              <strong className="dash-kpi-value">{formatCurrency(data.mrr_estimado)}</strong>
              <span className="dash-kpi-hint">
                {formatCurrency(data.valor_mensalidade)} × contas em dia
              </span>
            </div>
          </section>

          <div className="card" style={{ marginTop: '1.25rem' }}>
            <div className="card-body">
              <p className="subtitle" style={{ marginTop: 0 }}>
                {data.contas.total} contas · {data.novas_7d} nos últimos 7 dias · {data.novas_30d}{' '}
                em 30 dias · até {data.max_empresas_conta} empresas por conta
              </p>
              <Link to="/plataforma/contas" className="btn btn-primary">
                Ver contas
              </Link>
              <Link to="/plataforma/configuracao/mensalidade" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>
                Plano comercial
              </Link>
            </div>
          </div>
        </>
      ) : !erro ? (
        <p className="loading">Carregando…</p>
      ) : null}
    </>
  );
}
