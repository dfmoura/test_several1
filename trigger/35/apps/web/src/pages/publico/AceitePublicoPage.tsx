import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type ApiError, type Orcamento } from '../../lib/api';

export function AceitePublicoPage() {
  const { token } = useParams();
  const [proposta, setProposta] = useState<Orcamento | null>(null);
  const [expiraEm, setExpiraEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api
      .propostaPublica(token)
      .then((r) => {
        setProposta(r.proposta);
        setExpiraEm(r.expiraEm);
      })
      .catch((e: ApiError) => setErro(e.message));
  }, [token]);

  async function agir(acao: 'APROVAR' | 'RECUSAR') {
    if (!token) return;
    setPending(true);
    setErro(null);
    try {
      const res = await api.responderAceite(token, acao);
      setDone(
        acao === 'APROVAR'
          ? res.pedido
            ? `Aprovado. Pedido ${res.pedido.codigo} gerado.`
            : `Aprovado. ${res.bloqueioConversao ?? ''}`
          : 'Proposta recusada.',
      );
      setProposta(res.orcamento);
    } catch (e) {
      setErro((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="public-aceite">
      <header className="login-brand">
        <span className="brand-mark xl">RLP</span>
        <p>Proposta comercial — aceite formal</p>
      </header>

      {erro ? <p className="error">{erro}</p> : null}
      {done ? <div className="callout">{done}</div> : null}

      {proposta && !done ? (
        <div className="panel-form">
          <h1>
            {proposta.codigo} <span className="muted">v{proposta.versao}</span>
          </h1>
          <p>
            Para: <strong>{proposta.parceiro.razaoSocial}</strong>
          </p>
          {expiraEm ? (
            <p className="muted">Válido até {new Date(expiraEm).toLocaleString('pt-BR')}</p>
          ) : null}

          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtde</th>
                  <th>Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {proposta.itens.map((i) => (
                  <tr key={i.id ?? i.sequencia}>
                    <td>{i.descricao}</td>
                    <td className="mono">
                      {i.quantidade} {i.unidadeCodigo}
                    </td>
                    <td className="mono">{i.precoUnitario}</td>
                    <td className="mono">{i.valorTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Imposto estimado: <span className="mono">R$ {proposta.valorImpostoEstimado}</span>
          </p>
          <p>
            <strong>Total: R$ {proposta.valorTotal}</strong>
          </p>
          <p className="muted">Valores de imposto são estimativa — NF pode divergir.</p>

          <div className="row-actions">
            <button
              type="button"
              className="btn primary"
              disabled={pending}
              onClick={() => void agir('APROVAR')}
            >
              Aceitar proposta
            </button>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => void agir('RECUSAR')}
            >
              Recusar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
