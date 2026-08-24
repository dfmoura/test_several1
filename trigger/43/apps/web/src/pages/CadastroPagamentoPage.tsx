import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ContaFlexorcFatura } from '../components/ContaFlexorcFatura';
import { OnboardingShell } from '../components/OnboardingShell';
import { api, type AtivacaoData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

export function CadastroPagamentoPage() {
  const { user, initialized } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const retorno = params.get('retorno');
  const [ativacao, setAtivacao] = useState<AtivacaoData | null>(null);
  const [erro, setErro] = useState('');

  const load = useCallback(() => {
    setErro('');
    void api
      .get<{ data: AtivacaoData }>('/ativacao')
      .then((res) => setAtivacao(res.data))
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar a mensalidade.');
      });
  }, []);

  useEffect(() => {
    if (initialized && user) {
      load();
    }
  }, [initialized, user, load]);

  useEffect(() => {
    if (!ativacao || ativacao.conta?.paga) {
      return;
    }
    if (retorno !== 'asaas') {
      return;
    }
    const t = window.setInterval(load, 4000);
    const stop = window.setTimeout(() => window.clearInterval(t), 180000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(stop);
    };
  }, [ativacao, retorno, load]);

  if (!initialized) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        Carregando…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const paga = Boolean(ativacao?.conta?.paga);
  const temEmpresa = Boolean(ativacao?.passos.some((p) => p.id === 'empresa' && p.feito));
  const dest = paga && !temEmpresa ? '/empresas/nova' : '/';
  const cta = paga
    ? temEmpresa
      ? `Entrar no ${BRAND.product.name}`
      : 'Cadastrar a empresa'
    : 'Usar agora — empresas depois de entrar';

  return (
    <OnboardingShell
      title="Mensalidade da conta"
      subtitle={`Você paga a TRIGGER pelo ${BRAND.product.name}. Depois, o administrador master cadastra até 3 empresas e os usuários desta conta.`}
      maxWidth={640}
    >
      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {ativacao ? (
        <ContaFlexorcFatura data={ativacao} onUpdated={setAtivacao} retorno={retorno} />
      ) : (
        <p className="subtitle">Preparando a fatura da conta…</p>
      )}

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => navigate(dest, { replace: true })}>
          {cta}
        </button>
      </div>
    </OnboardingShell>
  );
}
