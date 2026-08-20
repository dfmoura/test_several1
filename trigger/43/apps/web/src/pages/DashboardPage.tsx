import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { AtivacaoCockpit } from '../components/AtivacaoCockpit';
import { PageHeader } from '../components/PageHeader';
import {
  IconArrow,
  IconFinanceiro,
  IconOrcamento,
  IconPartners,
  IconPatrimonio,
} from '../components/NavIcons';
import { useAuth } from '../lib/auth';
import { api, type AtivacaoData, type PainelCard, type PainelData } from '../lib/api';
import { formatCurrency } from '../lib/format';

const KPI_ICON: Record<string, ComponentType<{ className?: string }>> = {
  orcamentos: IconOrcamento,
  clientes: IconPartners,
  parceiros: IconPartners,
  patrimonio: IconPatrimonio,
  sinal: IconFinanceiro,
  receber: IconFinanceiro,
};

function formatKpi(card: PainelCard): string {
  if (card.formato === 'moeda') {
    return formatCurrency(card.valor);
  }
  return Number(card.valor).toLocaleString('pt-BR');
}

export function DashboardPage() {
  const { user, empresas, empresaId, hasPermission, maxEmpresas } = useAuth();
  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const empresaNome = currentEmpresa
    ? (currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social)
    : null;
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  const [painel, setPainel] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErro(null);
    void api
      .get<{ data: PainelData }>('/painel')
      .then((res) => setPainel(res.data))
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Falha ao carregar o painel.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [empresaId, load]);

  const ativacao = painel?.ativacao;
  const passosOperacao = ativacao?.passos.filter(
    (p) => p.fase === 'operacao' || (p.id === 'pagamento' && !p.feito),
  );
  const mostraAtivacao =
    Boolean(ativacao) &&
    ativacao?.origem === 'self_service' &&
    Boolean(passosOperacao?.some((p) => !p.feito));

  const handleAtivacao = (next: AtivacaoData) => {
    setPainel((prev) => (prev ? { ...prev, ativacao: next } : prev));
  };

  return (
    <>
      <PageHeader
        title="Painel"
        description={`Olá, ${firstName}. ${
          empresas.length === 0
            ? `Cadastre a empresa que você opera — até ${maxEmpresas} nesta conta.`
            : mostraAtivacao
              ? 'A empresa já está liberada para uso. Catálogo, parceiros e patrimônio ficam nesta história.'
              : ativacao?.pagamento_pendente
                ? 'A mensalidade FLEXORC ainda não foi paga — você orça, mas o envio espera o ASAAS.'
                : 'Orçamentos, parceiros e patrimônio desta empresa.'
        }`}
      />

      <section className="dash-context" aria-label="Empresa ativa">
        {currentEmpresa ? (
          <div className="empresa-active empresa-active--dash">
            <span className="empresa-code">{currentEmpresa.codigo}</span>
            <span className="empresa-name">{empresaNome}</span>
          </div>
        ) : (
          <strong>Nenhuma empresa nesta conta ainda</strong>
        )}
        {empresas.length > 1 ? (
          <span className="dash-context-note">
            Troque no topo · {empresas.length} liberadas nesta conta
          </span>
        ) : null}
      </section>

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {empresas.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>Comece pela empresa</h2>
            <p className="subtitle">
              A conta já está pronta. O administrador cadastra até {maxEmpresas} empresas — cada uma
              com parceiros, catálogo e orçamentos isolados.
            </p>
            {hasPermission('empresas.gerir') ? (
              <Link to="/empresas/nova" className="btn btn-primary">
                Cadastrar empresa
              </Link>
            ) : (
              <p className="form-hint" style={{ marginBottom: 0 }}>
                Peça ao administrador da conta para cadastrar a primeira empresa.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {mostraAtivacao && ativacao ? (
        <AtivacaoCockpit data={ativacao} onUpdated={handleAtivacao} />
      ) : null}

      {erro ? null : (
        <>
          <section className="dash-cadeia" aria-label="Cadeia operacional">
            <div className="dash-section-head">
              <h2>{mostraAtivacao ? 'O que você vai acompanhar' : 'Em curso'}</h2>
              <p>Do orçamento ao envio do link de aprovação.</p>
            </div>

            {loading && !painel ? (
              <p className="loading">Carregando o painel…</p>
            ) : empresas.length === 0 ? (
              <p className="form-hint" style={{ margin: 0 }}>
                Os indicadores aparecem depois da primeira empresa.
              </p>
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

          {!loading && painel && painel.cadeia.length > 0 && painel.filas.length > 0 ? (
            <section className="dash-filas" aria-label="Filas que pedem ação">
              <div className="dash-section-head">
                <h2>Atenção</h2>
                <p>O que pede ação agora nesta empresa.</p>
              </div>
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
            </section>
          ) : null}

          {!loading && painel && !mostraAtivacao && painel.filas.length === 0 ? (
            <section className="dash-filas">
              <div className="empty-state empty-state--cta">
                <p>Nada pendente nesta empresa.</p>
                <div className="btn-row">
                  <Link to="/parceiros/novo" className="btn btn-secondary">
                    Novo cliente
                  </Link>
                  <Link to="/orcamentos/novo" className="btn btn-primary">
                    Novo orçamento
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
