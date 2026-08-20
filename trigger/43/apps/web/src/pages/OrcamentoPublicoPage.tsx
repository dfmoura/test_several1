import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { OrcamentoPropostaView } from '../components/OrcamentoPropostaView';
import { TriggerAttribution } from '../components/TriggerAttribution';
import {
  ApiError,
  api,
  type OrcamentoAdiantamentoPublico,
  type OrcamentoPropostaPublica,
} from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatCurrency } from '../lib/format';

type Decidido = {
  status: 'APROVADO' | 'REPROVADO';
  mensagem: string;
  statusExibicao?: string | null;
  adiantamento?: OrcamentoAdiantamentoPublico | null;
} | null;

function PixPanel({
  token,
  adiantamento,
  onCopied,
  onSimulado,
}: {
  token: string;
  adiantamento: OrcamentoAdiantamentoPublico;
  onCopied: (ok: boolean) => void;
  onSimulado: (adi: OrcamentoAdiantamentoPublico) => void;
}) {
  const copia = adiantamento.pix_copia_cola ?? '';
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [simErro, setSimErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (adiantamento.pago || !copia) {
        setQrUrl(null);
        return;
      }
      // Preferência: QR do banco; senão gera a partir do EMV (copia e cola).
      const fromBank = adiantamento.pix_qr_base64;
      if (fromBank && fromBank.length > 200) {
        setQrUrl(fromBank.startsWith('data:') ? fromBank : `data:image/png;base64,${fromBank}`);
        return;
      }
      try {
        const url = await QRCode.toDataURL(copia, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 240,
          color: { dark: '#111111', light: '#ffffff' },
        });
        if (!cancelled) setQrUrl(url);
      } catch {
        if (!cancelled) setQrUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copia, adiantamento.pago, adiantamento.pix_qr_base64]);

  const copy = async () => {
    if (!copia) return;
    try {
      await navigator.clipboard.writeText(copia);
      onCopied(true);
    } catch {
      onCopied(false);
    }
  };

  const simular = async () => {
    setSimulando(true);
    setSimErro(null);
    try {
      const res = await api.publicPost<{
        data: {
          mensagem: string;
          adiantamento: OrcamentoAdiantamentoPublico | null;
        };
      }>(`/publico/orcamentos/${token}/simular-pagamento-pix`, {});
      if (res.data.adiantamento) {
        onSimulado(res.data.adiantamento);
      }
    } catch (e) {
      setSimErro(e instanceof ApiError ? e.message : 'Não foi possível confirmar o pagamento.');
    } finally {
      setSimulando(false);
    }
  };

  if (adiantamento.pago) {
    return (
      <div className="orc-pub-pix orc-pub-pix--pago">
        <h2>Pagamento confirmado</h2>
        <p>Orçamento aprovado. Obrigado!</p>
      </div>
    );
  }

  return (
    <div className="orc-pub-pix">
      <h2>Pague com PIX</h2>
      <p className="orc-pub-pix-valor">
        {formatCurrency(adiantamento.valor)}
        {adiantamento.percentual ? ` (${adiantamento.percentual}%)` : ''}
      </p>
      <p className="orc-pub-muted">
        Escaneie o QR Code ou use o Pix copia e cola. O orçamento fica em{' '}
        <strong>aguardando pagamento</strong> até a confirmação.
      </p>
      {qrUrl ? (
        <img className="orc-pub-pix-qr" src={qrUrl} alt="QR Code PIX" width={240} height={240} />
      ) : null}
      {copia ? (
        <>
          <label className="orc-pub-pix-label" htmlFor="pix-copia">
            Pix copia e cola
          </label>
          <textarea id="pix-copia" className="orc-pub-pix-emv" readOnly rows={4} value={copia} />
          <div className="orc-pub-pix-actions">
            <button type="button" className="btn btn-primary" onClick={() => void copy()}>
              Copiar código PIX
            </button>
            {adiantamento.pode_simular_pagamento ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={simulando}
                onClick={() => void simular()}
              >
                {simulando ? 'Confirmando…' : 'Já paguei (simular)'}
              </button>
            ) : null}
          </div>
          {adiantamento.pode_simular_pagamento ? (
            <p className="orc-pub-muted" style={{ marginTop: '0.65rem' }}>
              Demo: o botão dispara a baixa financeira real (mesmo caminho do webhook bancário).
            </p>
          ) : null}
          {simErro ? <p className="form-error">{simErro}</p> : null}
        </>
      ) : (
        <p className="form-error">Código PIX indisponível — contate o comercial.</p>
      )}
    </div>
  );
}

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
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [adiantamentoLive, setAdiantamentoLive] = useState<OrcamentoAdiantamentoPublico | null>(
    null,
  );

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
          const data = res.data;
          setProposta(data);
          if (data.modo === 'pagamento' && data.adiantamento) {
            setDecidido({
              status: 'APROVADO',
              mensagem: data.mensagem || 'Proposta aceita.',
              statusExibicao: data.status_exibicao ?? data.adiantamento.status_exibicao,
              adiantamento: data.adiantamento,
            });
            setAdiantamentoLive(data.adiantamento);
          } else if (data.faixas?.length) {
            setFaixaIndex(data.faixas[0]?.index ?? 0);
          }
          document.title = `Proposta ${data.codigo} · ${data.empresa.nome_fantasia || 'ORC'}`;
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

  useEffect(() => {
    if (!token || !decidido || decidido.status !== 'APROVADO') return;
    const adi = adiantamentoLive ?? decidido.adiantamento;
    if (!adi || adi.pago) return;

    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await api.publicGet<{
            data: { adiantamento: OrcamentoAdiantamentoPublico | null };
          }>(`/publico/orcamentos/${token}/adiantamento`);
          if (res.data.adiantamento) {
            setAdiantamentoLive(res.data.adiantamento);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 6000);

    return () => window.clearInterval(id);
  }, [token, decidido, adiantamentoLive]);

  const empresaNome = useMemo(() => {
    if (!proposta) return BRAND.licensee.logoAlt;
    return proposta.empresa.nome_fantasia || proposta.empresa.razao_social || BRAND.licensee.logoAlt;
  }, [proposta]);

  const bloquearAcoes =
    !proposta ||
    proposta.modo === 'pagamento' ||
    proposta.vencido ||
    !proposta.disponivel ||
    decidido !== null;

  const onCopied = useCallback((ok: boolean) => {
    setCopyMsg(ok ? 'Código PIX copiado.' : 'Não foi possível copiar — selecione o texto manualmente.');
  }, []);

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
        data: {
          status: string;
          mensagem: string;
          status_exibicao?: string | null;
          adiantamento?: OrcamentoAdiantamentoPublico | null;
        };
      }>(`/publico/orcamentos/${token}/decidir`, {
        acao: 'APROVAR',
        faixa_index: faixaIndex,
        nome_cliente: nome.trim(),
        motivo: motivo.trim() || null,
      });
      setDecidido({
        status: 'APROVADO',
        mensagem: res.data.mensagem,
        statusExibicao: res.data.status_exibicao ?? res.data.adiantamento?.status_exibicao,
        adiantamento: res.data.adiantamento ?? null,
      });
      setAdiantamentoLive(res.data.adiantamento ?? null);
      if (!res.data.adiantamento) {
        setProposta(null);
      }
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
    const adi = adiantamentoLive ?? decidido.adiantamento ?? null;
    const aguardaPagamento =
      decidido.status === 'APROVADO' &&
      !!adi &&
      !adi.pago &&
      (decidido.statusExibicao === 'AGUARDANDO_PAGAMENTO' ||
        adi.status_exibicao === 'AGUARDANDO_PAGAMENTO' ||
        adi.financeiro_status === 'AGUARDA_ADIANTAMENTO');
    const aprovadoFinal = decidido.status === 'APROVADO' && (!adi || adi.pago);

    return (
      <div className="orc-pub">
        <div className="orc-pub-shell">
          <header className="orc-pub-hero">
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
            <p className="orc-pub-kicker">Proposta comercial</p>
          </header>
          <div
            className={`orc-pub-result orc-pub-result--${
              decidido.status === 'REPROVADO'
                ? 'reprovado'
                : aguardaPagamento
                  ? 'aguardando'
                  : 'aprovado'
            }`}
          >
            <h1>
              {decidido.status === 'REPROVADO'
                ? 'Proposta recusada'
                : aguardaPagamento
                  ? 'Aguardando pagamento'
                  : 'Proposta aprovada'}
            </h1>
            <p>{decidido.mensagem}</p>
            {decidido.status === 'APROVADO' && adi ? (
              <>
                {copyMsg ? <p className="orc-pub-muted">{copyMsg}</p> : null}
                {token ? (
                  <PixPanel
                    token={token}
                    adiantamento={adi}
                    onCopied={onCopied}
                    onSimulado={(next) => {
                      setAdiantamentoLive(next);
                      setDecidido((prev) =>
                        prev
                          ? {
                              ...prev,
                              statusExibicao: next.pago ? 'APROVADO' : 'AGUARDANDO_PAGAMENTO',
                              mensagem: next.pago
                                ? 'Pagamento confirmado. Orçamento aprovado.'
                                : prev.mensagem,
                              adiantamento: next,
                            }
                          : prev,
                      );
                    }}
                  />
                ) : null}
                {aprovadoFinal ? (
                  <p className="orc-pub-muted">Este link não está mais disponível.</p>
                ) : null}
              </>
            ) : (
              <p className="orc-pub-muted">Este link não está mais disponível.</p>
            )}
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

  return (
    <OrcamentoPropostaView
      proposta={proposta}
      empresaNome={empresaNome}
      somenteLeitura={bloquearAcoes}
      faixaIndex={faixaIndex}
      onFaixaChange={setFaixaIndex}
      erro={erro}
      acoes={
        !bloquearAcoes ? (
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
        ) : null
      }
    />
  );
}
