import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, type AtivacaoData, type AtivacaoPasso } from '../lib/api';
import { useAuth } from '../lib/auth';

type Props = {
  data: AtivacaoData;
  onUpdated: (next: AtivacaoData) => void;
  compact?: boolean;
};

export function AtivacaoCockpit({ data, onUpdated, compact = false }: Props) {
  const { produtoFlexorc } = useAuth();
  const [pix, setPix] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const passo = (id: string): AtivacaoPasso | undefined => data.passos.find((p) => p.id === id);
  const pagamento = passo('pagamento');
  const recebimento = passo('recebimento');

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
        setErro('Não foi possível concluir este passo. Tente de novo.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handlePix = async (e: FormEvent) => {
    e.preventDefault();
    await run('recebimento', () =>
      api.post<{ data: AtivacaoData }>('/ativacao/recebimento', { pix_chave: pix }).then((r) => r.data),
    );
    setPix('');
  };

  if (data.origem === 'legado') {
    return null;
  }

  const visiveis = (compact
    ? data.passos.filter((p) => p.id === 'pagamento')
    : data.passos.filter(
        (p) => p.fase === 'operacao' || (p.id === 'pagamento' && !p.feito),
      )
  ).filter((p) => p.id !== 'recebimento' || produtoFlexorc.sinal);

  if (visiveis.length === 0 || visiveis.every((p) => p.feito)) {
    return null;
  }

  return (
    <section className="ativacao" aria-label="Primeiros passos">
      <div className="ativacao-head">
        <h2>{compact ? 'Forma de pagamento' : 'Nesta empresa'}</h2>
        <p>
          {compact
            ? 'Mensalidade da conta FLEXORC: a gráfica paga a TRIGGER no ASAAS.'
            : 'Cadastros e o primeiro orçamento desta empresa. A mensalidade fica na conta FLEXORC.'}
        </p>
      </div>

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      <ol className="ativacao-passos">
        {visiveis.map((p) => (
          <li key={p.id} className={p.feito ? 'feito' : p.id === data.proximo ? 'atual' : undefined}>
            <span className="ativacao-mark" aria-hidden>
              {p.feito ? '✓' : p.obrigatorio ? '•' : '○'}
            </span>
            <div className="ativacao-copy">
              <strong>
                {p.label}
                {!p.obrigatorio ? <span className="ativacao-opt">opcional agora</span> : null}
              </strong>
              <span>{p.hint}</span>
            </div>
            <div className="ativacao-acao">
              {p.id === 'pagamento' && !p.feito ? (
                <Link to="/cadastro/pagamento" className="btn btn-primary btn-sm">
                  Ver a fatura
                </Link>
              ) : null}

              {p.id === 'recebimento' && !p.feito ? (
                <form className="ativacao-pix" onSubmit={(e) => void handlePix(e)}>
                  <input
                    value={pix}
                    onChange={(e) => setPix(e.target.value)}
                    placeholder="Chave PIX da empresa"
                    aria-label="Chave PIX da empresa"
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={busy !== null}>
                    {busy === 'recebimento' ? 'Salvando…' : 'Salvar'}
                  </button>
                </form>
              ) : null}

              {p.id === 'catalogo' && !p.feito && p.to ? (
                <Link to={p.to} className="btn btn-secondary btn-sm">
                  Conferir preços
                </Link>
              ) : null}

              {p.id !== 'pagamento' && p.id !== 'recebimento' && p.id !== 'catalogo' && !p.feito && p.to ? (
                <Link to={p.to} className="btn btn-secondary btn-sm">
                  {p.id === 'parceiro' ? 'Cadastrar' : p.id === 'orcamento' ? 'Orçar' : 'Abrir'}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {pagamento && !pagamento.feito && produtoFlexorc.sinal ? (
        <p className="ativacao-nota">
          A mensalidade é a conta FLEXORC (você → TRIGGER). O PIX abaixo é para receber o sinal do
          seu cliente.
        </p>
      ) : null}

      {recebimento?.feito && !data.pode_enviar_orcamento ? (
        <p className="ativacao-nota">O envio da proposta fica liberado depois da mensalidade.</p>
      ) : null}
    </section>
  );
}
