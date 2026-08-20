import { useState } from 'react';
import { ApiError, api, type AtivacaoData } from '../lib/api';
import { formatCnpj } from '../lib/format';

type Props = {
  data: AtivacaoData;
  onUpdated: (next: AtivacaoData) => void;
  retorno?: string | null;
};

export function ContaFlexorcFatura({ data, onUpdated, retorno }: Props) {
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const conta = data.conta;
  const paga = Boolean(conta?.paga ?? data.passos.find((p) => p.id === 'pagamento')?.feito);

  const run = async (id: string, fn: () => Promise<AtivacaoData>) => {
    setErro('');
    setBusy(id);
    try {
      onUpdated(await fn());
    } catch (e) {
      if (e instanceof ApiError) {
        const first = Object.values(e.details ?? {})[0]?.[0];
        setErro(first ?? e.message);
      } else {
        setErro('Não foi possível abrir o pagamento. Tente de novo.');
      }
    } finally {
      setBusy(null);
    }
  };

  const pagarNoAsaas = async () => {
    const next = await api.post<{ data: AtivacaoData }>('/ativacao/pagamento').then((r) => r.data);
    onUpdated(next);
    const url = next.checkout_url;
    if (url) {
      window.location.assign(url);
      return next;
    }
    if (!data.pode_confirmar_demo) {
      setErro('O ASAAS não devolveu o checkout. Confira a chave do provedor neste ambiente.');
    }
    return next;
  };

  if (!conta) {
    return <p className="subtitle">Esta empresa não usa a mensalidade self-service.</p>;
  }

  return (
    <div className="conta-fatura">
      <div className="camadas-dinheiro" aria-label="Duas cobranças distintas">
        <article className="camada-dinheiro camada-dinheiro--esta">
          <span>Esta tela</span>
          <strong>Você → TRIGGER</strong>
          <p>{conta.camada_esta}</p>
        </article>
        <article className="camada-dinheiro">
          <span>Depois, no orçamento</span>
          <strong>Seu cliente → você</strong>
          <p>{conta.camada_nao_e}</p>
        </article>
      </div>

      <div className={`fatura-card${paga ? ' fatura-card--paga' : ''}`}>
        <header className="fatura-head">
          <div>
            <p className="fatura-kicker">Conta {conta.produto}</p>
            <h2>
              {conta.plano} · {conta.periodicidade_label.toLowerCase()}
            </h2>
          </div>
          <p className="fatura-valor" aria-label="Valor da mensalidade">
            {conta.valor_formatado}
            <small>{conta.periodicidade_label}</small>
          </p>
        </header>

        <dl className="fatura-linhas">
          <div>
            <dt>Quem paga</dt>
            <dd>
              {conta.pagador.razao_social}
              <small>
                {conta.pagador.codigo}
                {conta.pagador.cnpj ? ` · ${formatCnpj(conta.pagador.cnpj)}` : ''}
              </small>
            </dd>
          </div>
          <div>
            <dt>Recebe</dt>
            <dd>
              {conta.fornecedor}
              <small>fornecimento do {conta.produto}</small>
            </dd>
          </div>
          <div>
            <dt>Como pagar</dt>
            <dd>
              {conta.meios.join(' ou ')}
              <small>No {conta.cofre}. O {conta.produto} não guarda cartão.</small>
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              {conta.status_label}
              <small>
                {paga
                  ? 'Propostas podem ser enviadas.'
                  : 'Enviar proposta espera esta confirmação.'}
              </small>
            </dd>
          </div>
        </dl>

        {erro ? (
          <div className="alert alert-error" role="alert">
            {erro}
          </div>
        ) : null}

        {retorno === 'asaas' && !paga ? (
          <div className="alert alert-info" role="status">
            Voltou do ASAAS. Esta tela atualiza sozinha quando o provedor confirmar o pagamento.
          </div>
        ) : null}
        {retorno === 'cancelado' && !paga ? (
          <div className="alert alert-warning" role="status">
            Pagamento cancelado no ASAAS. Você pode abrir de novo quando quiser.
          </div>
        ) : null}
        {retorno === 'expirado' && !paga ? (
          <div className="alert alert-warning" role="status">
            O checkout expirou. Abra um novo pagamento no ASAAS.
          </div>
        ) : null}

        {paga ? (
          <div className="alert alert-success" role="status">
            Mensalidade autenticada. Cadastre a empresa (menu Empresas) e siga para o primeiro
            cliente e o primeiro orçamento.
          </div>
        ) : (
          <div className="btn-row fatura-acoes">
            {data.billing_provider === 'mock' && data.pode_confirmar_demo ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy !== null}
                onClick={() =>
                  void run('demo', () =>
                    api.post<{ data: AtivacaoData }>('/ativacao/pagamento/confirmar-demo').then((r) => r.data),
                  )
                }
              >
                {busy === 'demo' ? 'Confirmando…' : 'Pagar nesta demonstração'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy !== null}
                onClick={() => void run('asaas', pagarNoAsaas)}
              >
                {busy === 'asaas' ? 'Abrindo ASAAS…' : 'Pagar no ASAAS'}
              </button>
            )}
            {data.pode_confirmar_demo && data.billing_provider !== 'mock' ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== null}
                onClick={() =>
                  void run('demo', () =>
                    api.post<{ data: AtivacaoData }>('/ativacao/pagamento/confirmar-demo').then((r) => r.data),
                  )
                }
              >
                {busy === 'demo' ? 'Simulando…' : 'Simular neste ambiente'}
              </button>
            ) : null}
          </div>
        )}

        {!paga && data.pode_confirmar_demo && data.billing_provider === 'mock' ? (
          <p className="ativacao-nota">
            Aqui a TRIGGER simula o ASAAS. Em produção você escolhe cartão ou PIX na página do
            provedor e volta para esta tela.
          </p>
        ) : null}
      </div>
    </div>
  );
}
