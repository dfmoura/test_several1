import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TriggerAttribution } from '../components/TriggerAttribution';
import {
  ApiError,
  api,
  type OrcamentoPropostaPublica,
} from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatCnpj, formatCurrency, formatDateTime, formatPhone } from '../lib/format';

type Decidido = { status: 'APROVADO' | 'REPROVADO'; mensagem: string } | null;

export function OrcamentoPublicoPage() {
  const { token } = useParams();
  const [proposta, setProposta] = useState<OrcamentoPropostaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [faixaIndex, setFaixaIndex] = useState(0);
  const [nome, setNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pending, setPending] = useState(false);
  const [decidido, setDecidido] = useState<Decidido>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      setIndisponivel(false);
      try {
        const res = await api.publicGet<{ data: OrcamentoPropostaPublica }>(
          `/publico/orcamentos/${token}`,
        );
        if (!cancelled) {
          setProposta(res.data);
          setFaixaIndex(res.data.faixas[0]?.index ?? 0);
          document.title = `Proposta ${res.data.codigo} · ${res.data.empresa.nome_fantasia || 'ORC'}`;
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && (e.status === 410 || e.status === 404)) {
            setIndisponivel(true);
            setErro(e.message);
          } else {
            setErro(e instanceof Error ? e.message : 'Falha ao carregar a proposta');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const empresaNome = useMemo(() => {
    if (!proposta) return BRAND.licensee.logoAlt;
    return proposta.empresa.nome_fantasia || proposta.empresa.razao_social || BRAND.licensee.logoAlt;
  }, [proposta]);

  const bloquearAcoes =
    !proposta || proposta.vencido || !proposta.disponivel || decidido !== null;

  const handleAprovar = async () => {
    if (!token || bloquearAcoes) return;
    if (nome.trim().length < 2) {
      setErro('Informe seu nome para confirmar o aceite.');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const res = await api.publicPost<{
        data: { status: string; mensagem: string };
      }>(`/publico/orcamentos/${token}/decidir`, {
        acao: 'APROVAR',
        faixa_index: faixaIndex,
        nome_cliente: nome.trim(),
        motivo: motivo.trim() || null,
      });
      setDecidido({
        status: 'APROVADO',
        mensagem: res.data.mensagem,
      });
      setProposta(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível aprovar');
    } finally {
      setPending(false);
    }
  };

  const handleRecusar = async () => {
    if (!token || bloquearAcoes) return;
    if (!window.confirm('Confirma a recusa desta proposta?')) return;
    setPending(true);
    setErro(null);
    try {
      const res = await api.publicPost<{
        data: { status: string; mensagem: string };
      }>(`/publico/orcamentos/${token}/decidir`, {
        acao: 'RECUSAR',
        motivo: motivo.trim() || null,
      });
      setDecidido({
        status: 'REPROVADO',
        mensagem: res.data.mensagem,
      });
      setProposta(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível recusar');
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="orc-pub">
        <p className="loading">Carregando proposta…</p>
      </div>
    );
  }

  if (decidido) {
    return (
      <div className="orc-pub">
        <div className="orc-pub-shell">
          <header className="orc-pub-hero">
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
            <p className="orc-pub-kicker">Proposta comercial</p>
          </header>
          <div className={`orc-pub-result orc-pub-result--${decidido.status.toLowerCase()}`}>
            <h1>{decidido.status === 'APROVADO' ? 'Proposta aprovada' : 'Proposta recusada'}</h1>
            <p>{decidido.mensagem}</p>
            <p className="orc-pub-muted">Este link não está mais disponível.</p>
          </div>
          <footer className="orc-pub-foot">
            <TriggerAttribution variant="print" />
          </footer>
        </div>
      </div>
    );
  }

  if (indisponivel || !proposta) {
    return (
      <div className="orc-pub">
        <div className="orc-pub-shell">
          <header className="orc-pub-hero">
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
          </header>
          <div className="orc-pub-result orc-pub-result--gone">
            <h1>Proposta indisponível</h1>
            <p>{erro || 'Este link expirou, foi revogado ou já foi respondido.'}</p>
            <p className="orc-pub-muted">Solicite uma atualização ao seu contato comercial.</p>
          </div>
          <footer className="orc-pub-foot">
            <TriggerAttribution variant="print" />
          </footer>
        </div>
      </div>
    );
  }

  const desc = proposta.descricao;

  return (
    <div className="orc-pub">
      <div className="orc-pub-shell">
        <header className="orc-pub-hero">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
          <div>
            <p className="orc-pub-kicker">Proposta comercial</p>
            <h1>{empresaNome}</h1>
            <p className="orc-pub-sub">
              {proposta.codigo} · v{proposta.versao}
              {proposta.expira_em ? ` · válida até ${formatDateTime(proposta.expira_em)}` : ''}
            </p>
          </div>
        </header>

        {proposta.vencido ? (
          <div className="orc-pub-banner orc-pub-banner--warn">
            Proposta vencida — solicite uma atualização ao vendedor. Não é possível aprovar este
            link.
          </div>
        ) : null}

        {erro ? <p className="form-error">{erro}</p> : null}

        <section className="orc-pub-card">
          <h2>Cliente</h2>
          <p className="orc-pub-lead">{proposta.cliente_nome}</p>
          <div className="orc-pub-meta">
            {proposta.empresa.cnpj ? <span>CNPJ {formatCnpj(proposta.empresa.cnpj)}</span> : null}
            {proposta.empresa.telefone ? (
              <span>{formatPhone(proposta.empresa.telefone)}</span>
            ) : null}
            {proposta.empresa.email ? <span>{proposta.empresa.email}</span> : null}
            {proposta.empresa.municipio ? (
              <span>
                {proposta.empresa.municipio}
                {proposta.empresa.uf ? `/${proposta.empresa.uf}` : ''}
              </span>
            ) : null}
          </div>
        </section>

        <section className="orc-pub-card">
          <h2>Especificação</h2>
          <dl className="orc-pub-spec">
            <div>
              <dt>Material</dt>
              <dd>{desc.papel || '—'}</dd>
            </div>
            <div>
              <dt>Medida</dt>
              <dd>{desc.medida || '—'}</dd>
            </div>
            <div>
              <dt>Acabamento</dt>
              <dd>{desc.acabamento || '—'}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{desc.cores || '—'}</dd>
            </div>
            <div>
              <dt>Etiq./rolo</dt>
              <dd>{desc.etiq_por_rolo?.toLocaleString('pt-BR') ?? '—'}</dd>
            </div>
            {desc.faca_nova ? (
              <div>
                <dt>Faca</dt>
                <dd>Nova{desc.formato_faca ? ` · ${desc.formato_faca}` : ''}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="orc-pub-card">
          <h2>Faixas de quantidade</h2>
          <p className="orc-pub-hint">Selecione a quantidade que deseja aprovar.</p>
          <div className="orc-pub-faixas" role="radiogroup" aria-label="Faixas">
            {proposta.faixas.map((fx) => {
              const selected = faixaIndex === fx.index;
              return (
                <label
                  key={fx.index}
                  className={`orc-pub-faixa${selected ? ' is-selected' : ''}${bloquearAcoes ? ' is-disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="faixa"
                    checked={selected}
                    disabled={bloquearAcoes}
                    onChange={() => setFaixaIndex(fx.index)}
                  />
                  <div>
                    <strong>{fx.quantidade.toLocaleString('pt-BR')} etiquetas</strong>
                    <span>
                      Total {formatCurrency(fx.valor_total)}
                      {fx.valor_unitario != null
                        ? ` · unit. ${formatCurrency(fx.valor_unitario)}`
                        : ''}
                      {fx.valor_rolo != null ? ` · rolo ${formatCurrency(fx.valor_rolo)}` : ''}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {proposta.cobra_matriz ? (
            <p className="orc-pub-note">
              Matriz {formatCurrency(proposta.valor_matriz)}
              {proposta.matriz_nota ? ` — ${proposta.matriz_nota}` : ''}
            </p>
          ) : null}
        </section>

        <section className="orc-pub-card">
          <h2>Condições</h2>
          <ul className="orc-pub-conds">
            <li>
              Prazo de entrega: <strong>{proposta.prazo_entrega_dias} dias úteis</strong>
            </li>
            <li>
              Validade da proposta: <strong>{proposta.validade_dias} dias</strong>
            </li>
            <li>
              Tolerância de quantidade: <strong>±{proposta.tolerancia_qtd_pct}%</strong>
            </li>
          </ul>
        </section>

        {!bloquearAcoes ? (
          <section className="orc-pub-card orc-pub-actions">
            <h2>Sua decisão</h2>
            <div className="form-group">
              <label htmlFor="orc-pub-nome">Seu nome (obrigatório para aprovar)</label>
              <input
                id="orc-pub-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome de quem aprova"
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="orc-pub-obs">Observação (opcional)</label>
              <textarea
                id="orc-pub-obs"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Comentário para o comercial"
              />
            </div>
            <div className="btn-row orc-pub-btns">
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => void handleAprovar()}
              >
                Aprovar proposta
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => void handleRecusar()}
              >
                Recusar
              </button>
            </div>
          </section>
        ) : null}

        <footer className="orc-pub-foot">
          <TriggerAttribution variant="print" />
        </footer>
      </div>
    </div>
  );
}
