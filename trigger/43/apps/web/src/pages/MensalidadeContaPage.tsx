import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContaFlexorcFatura } from '../components/ContaFlexorcFatura';
import { PageHeader } from '../components/PageHeader';
import { api, type AtivacaoData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

export function MensalidadeContaPage() {
  const { empresaId } = useAuth();
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
    load();
  }, [load, empresaId]);

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

  return (
    <div>
      <PageHeader
        title="Mensalidade"
        description={`Mensalidade da conta ${BRAND.product.name} — pagamento à TRIGGER.`}
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {ativacao ? (
        <ContaFlexorcFatura
          data={ativacao}
          onUpdated={setAtivacao}
          retorno={retorno}
          variant="conta"
        />
      ) : (
        <p className="subtitle">Carregando a fatura da conta…</p>
      )}
    </div>
  );
}
