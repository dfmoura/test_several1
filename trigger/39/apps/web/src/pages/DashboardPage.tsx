import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  IconArrow,
  IconAsset,
  IconEstoque,
  IconFinanceiro,
  IconOrcamento,
} from '../components/NavIcons';
import { useAuth } from '../lib/auth';
import { api, type PainelCard, type PainelData } from '../lib/api';
import { formatCurrency } from '../lib/format';

const KPI_ICON: Record<string, ComponentType<{ className?: string }>> = {
  orcamentos: IconOrcamento,
  pedidos: IconOrcamento,
  producao: IconAsset,
  expedicao: IconEstoque,
  receber: IconFinanceiro,
  pagar: IconFinanceiro,
};

function formatKpi(card: PainelCard): string {
  if (card.formato === 'moeda') {
    return formatCurrency(card.valor);
  }
  return Number(card.valor).toLocaleString('pt-BR');
}

export function DashboardPage() {
  const { user, empresas, empresaId, roles } = useAuth();
  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const empresaNome = currentEmpresa
    ? (currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social)
    : null;
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';
  const vendaOn = currentEmpresa?.venda_ativa !== false;
  const estoqueOn = currentEmpresa?.estoque_ativo !== false;

  const [painel, setPainel] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErro(null);
    void api
      .get<{ data: PainelData }>('/painel')
      .then((res) => {
        if (alive) setPainel(res.data);
      })
      .catch((e: unknown) => {
        if (alive) setErro(e instanceof Error ? e.message : 'Falha ao carregar o painel.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [empresaId]);

  return (
    <>
      <PageHeader
        title="Painel"
        description={`Olá, ${firstName}. Números e filas da empresa ativa — o menu cobre o restante.`}
      />

      <section className="dash-context" aria-label="Empresa ativa">
        {currentEmpresa ? (
          <div className="empresa-active empresa-active--dash">
            <span className="empresa-code">{currentEmpresa.codigo}</span>
            <span className="empresa-name">{empresaNome}</span>
          </div>
        ) : (
          <strong>Nenhuma EMP selecionada</strong>
        )}
        {roles.length > 0 ? (
          <span className="dash-context-role">{roles.join(' · ')}</span>
        ) : null}
        <StatusPill status={vendaOn ? 'VENDA ATIVA' : 'VENDA OFF'} />
        <StatusPill status={estoqueOn ? 'ESTOQUE ATIVO' : 'ESTOQUE OFF'} />
        {empresas.length > 1 ? (
          <span className="dash-context-note">
            Troque no topo · {empresas.length} liberadas nesta conta
          </span>
        ) : null}
      </section>

      {(!vendaOn || !estoqueOn) && (
        <div className="alert alert-warning" role="status">
          {!vendaOn && !estoqueOn
            ? 'Venda e estoque desligados nesta EMP — operação comercial e de saldo ficam fora daqui.'
            : !vendaOn
              ? 'Venda desligada nesta EMP — comercial e faturamento não operam aqui.'
              : 'Estoque desligado nesta EMP — saldos e movimentação não operam aqui.'}
        </div>
      )}

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : (
        <>
          <section className="dash-cadeia" aria-label="Cadeia operacional">
            <div className="dash-section-head">
              <h2>Em curso</h2>
              <p>Do orçamento ao caixa — só desta EMP.</p>
            </div>

            {loading ? (
              <p className="loading">Carregando o painel…</p>
            ) : painel && painel.cadeia.length > 0 ? (
              <div className="dash-kpi-grid">
                {painel.cadeia.map((card) => {
                  const Icon = KPI_ICON[card.id] ?? IconOrcamento;
                  return (
                    <Link
                      key={card.id}
                      to={card.to}
                      className={`dash-kpi${card.alerta ? ' dash-kpi--alerta' : ''}`}
                    >
                      <span className="dash-kpi-icon">
                        <Icon />
                      </span>
                      <span className="dash-kpi-label">{card.label}</span>
                      <strong className="dash-kpi-value">{formatKpi(card)}</strong>
                      <span className="dash-kpi-hint">{card.hint}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Seu perfil possui acesso limitado. Entre em contato com o administrador para
                    solicitar permissões adicionais.
                  </p>
                </div>
              </div>
            )}
          </section>

          {!loading && painel && painel.cadeia.length > 0 ? (
            <section className="dash-filas" aria-label="Filas que pedem ação">
              <div className="dash-section-head">
                <h2>Atenção</h2>
                <p>
                  {painel.filas.length > 0
                    ? 'O que pede ação agora nesta EMP.'
                    : 'Nada pendente nesta EMP no momento.'}
                </p>
              </div>
              {painel.filas.length > 0 ? (
                <ul className="dash-fila-list">
                  {painel.filas.map((fila) => (
                    <li key={fila.id}>
                      <Link to={fila.to} className="dash-fila">
                        <span className="dash-fila-text">
                          <span className="dash-fila-title">{fila.label}</span>
                          <span className="dash-fila-hint">{fila.hint}</span>
                        </span>
                        <span className="dash-fila-count">{fila.count}</span>
                        <IconArrow />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
