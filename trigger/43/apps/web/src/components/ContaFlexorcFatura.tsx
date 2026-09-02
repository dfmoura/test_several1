import { useEffect, useState } from 'react';
import { ApiError, api, type AtivacaoData } from '../lib/api';
import { formatDateTime } from '../lib/format';
import QRCode from 'qrcode';

type Props = {
  data: AtivacaoData;
  onUpdated: (next: AtivacaoData) => void;
  retorno?: string | null;
  /** onboarding = alta; conta = tela permanente no app. */
  variant?: 'onboarding' | 'conta';
};

function MensalidadePixPanel({
  copia,
  qrBase64,
  vencimento,
  expiraEm,
}: {
  copia: string;
  qrBase64: string | null | undefined;
  vencimento: string | null | undefined;
  expiraEm: string | null | undefined;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!copia) {
        setQrUrl(null);
        return;
      }
      if (qrBase64 && qrBase64.length > 40) {
        setQrUrl(qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`);
        return;
      }
      try {
        const url = await QRCode.toDataURL(copia, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
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
  }, [copia, qrBase64]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copia);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const expiraLabel = (() => {
    if (!expiraEm) return null;
    try {
      const d = new Date(expiraEm);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return null;
    }
  })();

  return (
    <div className="fatura-pix" role="region" aria-label="Pagamento PIX">
      <p className="subtitle" style={{ marginTop: 0 }}>
        Pague com PIX
        {vencimento ? ` · vencimento ${vencimento.split('-').reverse().join('/')}` : ''}
        {expiraLabel ? ` · QR válido até ${expiraLabel}` : ''}
      </p>
      {qrUrl ? (
        <img src={qrUrl} alt="QR Code PIX da mensalidade" width={220} height={220} />
      ) : null}
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
          {copiado ? 'Copiado' : 'Copiar PIX copia e cola'}
        </button>
      </div>
      <textarea
        className="fatura-pix-emv"
        readOnly
        value={copia}
        rows={3}
        aria-label="Código PIX copia e cola"
      />
      <p className="ativacao-nota">
        Após o pagamento, esta tela confirma sozinha. Se o QR expirar, gere um novo nesta tela.
      </p>
    </div>
  );
}

export function ContaFlexorcFatura({ data, onUpdated, retorno, variant = 'onboarding' }: Props) {
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const conta = data.conta;
  const modo = conta?.modo ?? (conta?.paga ? 'pago' : 'pendente');
  const pagoAsaas = Boolean(conta?.pagamento_autenticado);
  const cortesia = modo === 'cortesia' || (conta?.cortesia?.vigente === true && !pagoAsaas);
  const suspensa = modo === 'suspensa' || conta?.status === 'SUSPENSA';
  const encerrada =
    modo === 'cortesia_encerrada' ||
    Boolean(conta?.cortesia && conta.cortesia.vigente === false && !pagoAsaas && !suspensa && !cortesia);
  const liberado = Boolean(conta?.paga ?? data.passos.find((p) => p.id === 'pagamento')?.feito);
  const dias = conta?.dias_ate_proxima;
  const permanente = variant === 'conta';
  const alertaCortesia = Boolean(conta?.alerta_cortesia || conta?.cortesia?.alerta);
  const alertaNivel = conta?.alerta_cortesia_nivel ?? conta?.cortesia?.alerta_nivel ?? null;
  const primeiraFmt = conta?.primeira_cobranca_formatada ?? conta?.proxima_cobranca_formatada;
  const ehInter = data.billing_provider === 'inter';
  const pixCopia = ehInter ? (data.pix_copia_cola ?? conta?.pix_copia_cola ?? null) : null;
  const pixQr = ehInter ? (data.pix_qr_base64 ?? conta?.pix_qr_base64 ?? null) : null;
  const pixVenc = ehInter ? (data.pix_vencimento ?? conta?.pix_vencimento ?? null) : null;
  const pixExpiraEm = ehInter ? (data.pix_expira_em ?? conta?.pix_expira_em ?? null) : null;
  const podeGerarPix = ehInter && Boolean(data.pode_gerar_pix ?? conta?.pode_gerar_pix);
  const mostrarPix = ehInter && Boolean(pixCopia) && (podeGerarPix || !pagoAsaas || suspensa || encerrada || cortesia);

  useEffect(() => {
    if (!ehInter || !pixCopia || pagoAsaas) return;
    const t = window.setInterval(() => {
      void api
        .get<{ data: AtivacaoData }>('/ativacao')
        .then((r) => onUpdated(r.data))
        .catch(() => undefined);
    }, 4000);
    const stop = window.setTimeout(() => window.clearInterval(t), 180000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(stop);
    };
  }, [ehInter, pixCopia, pagoAsaas, onUpdated]);

  // Quando o TTL do QR passar, refresca a fatura (expira no backend e libera “Gerar PIX”).
  useEffect(() => {
    if (!ehInter || !pixExpiraEm || pagoAsaas) return;
    const ms = new Date(pixExpiraEm).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms > 12 * 60 * 60 * 1000) return;
    const delay = Math.max(1000, ms + 500);
    const t = window.setTimeout(() => {
      void api
        .get<{ data: AtivacaoData }>('/ativacao')
        .then((r) => onUpdated(r.data))
        .catch(() => undefined);
    }, delay);
    return () => window.clearTimeout(t);
  }, [ehInter, pixExpiraEm, pagoAsaas, onUpdated]);

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
    // Inter nunca redireciona — só Checkout ASAAS.
    if (data.billing_provider === 'inter') {
      return gerarPix();
    }
    const next = await api.post<{ data: AtivacaoData }>('/ativacao/pagamento').then((r) => r.data);
    onUpdated(next);
    if (next.billing_provider === 'inter') {
      return next;
    }
    const url = next.checkout_url;
    if (url && next.billing_provider === 'asaas') {
      window.location.assign(url);
      return next;
    }
    if (!data.pode_confirmar_demo) {
      setErro('Não foi possível abrir o pagamento. Tente de novo em instantes.');
    }
    return next;
  };

  const gerarPix = async () => {
    return api.post<{ data: AtivacaoData }>('/ativacao/pagamento').then((r) => r.data);
  };

  if (!conta) {
    return (
      <p className="subtitle">
        Esta conta não usa cobrança de mensalidade pelo app. O envio de propostas
        segue liberado.
      </p>
    );
  }

  const planoTitulo = cortesia
    ? `Cortesia · ${conta.periodicidade_label.toLowerCase()}`
    : encerrada
      ? `Mensalidade · cortesia encerrada`
      : `${conta.plano} · ${conta.periodicidade_label.toLowerCase()}`;

  const labelPagar = cortesia
    ? ehInter
      ? 'Gerar PIX agora'
      : 'Autenticar mensalidade agora'
    : encerrada
      ? ehInter
        ? 'Gerar novo PIX'
        : 'Pagar agora para continuar'
      : ehInter
        ? pixCopia
          ? 'Atualizar PIX'
          : 'Gerar PIX'
        : 'Pagar agora';

  const acoesPagar = (
    <div className="btn-row fatura-acoes">
      {data.billing_provider === 'mock' && data.pode_confirmar_demo ? (
        <button
          type="button"
          className={cortesia ? 'btn btn-secondary' : 'btn btn-primary'}
          disabled={busy !== null}
          onClick={() =>
            void run('demo', () =>
              api
                .post<{ data: AtivacaoData }>('/ativacao/pagamento/confirmar-demo')
                .then((r) => r.data),
            )
          }
        >
          {busy === 'demo'
            ? 'Confirmando…'
            : cortesia
              ? 'Autenticar mensalidade agora'
              : encerrada
                ? 'Pagar agora para continuar'
                : 'Pagar nesta demonstração'}
        </button>
      ) : ehInter ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => void run('inter', gerarPix)}
        >
          {busy === 'inter' ? 'Gerando PIX…' : labelPagar}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => void run('asaas', pagarNoAsaas)}
        >
          {busy === 'asaas' ? 'Abrindo pagamento…' : labelPagar}
        </button>
      )}
      {!cortesia && !encerrada && data.pode_confirmar_demo && data.billing_provider !== 'mock' ? (
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
          {busy === 'demo' ? 'Confirmando…' : 'Confirmar na demonstração'}
        </button>
      ) : null}
    </div>
  );

  const blocoPix =
    mostrarPix && pixCopia ? (
      <MensalidadePixPanel
        copia={pixCopia}
        qrBase64={pixQr}
        vencimento={pixVenc}
        expiraEm={pixExpiraEm}
      />
    ) : null;

  const avisoPixExpirado =
    ehInter && podeGerarPix && !pixCopia && !pagoAsaas ? (
      <div className="alert alert-warning" role="status">
        O PIX anterior expirou ou foi substituído. Gere um novo QR para pagar.
      </div>
    ) : null;

  return (
    <div className="conta-fatura">
      {!permanente ? (
        <div className="camadas-dinheiro" aria-label="Duas cobranças distintas">
          <article
            className={`camada-dinheiro camada-dinheiro--esta${cortesia ? ' camada-dinheiro--cortesia' : ''}`}
          >
            <span>Esta tela</span>
            <strong>{cortesia ? 'TRIGGER → você (cortesia)' : 'Você → TRIGGER'}</strong>
            <p>{conta.camada_esta}</p>
          </article>
          <article className="camada-dinheiro">
            <span>Depois, no orçamento</span>
            <strong>Seu cliente → você</strong>
            <p>{conta.camada_nao_e}</p>
          </article>
        </div>
      ) : null}

      {(cortesia || encerrada || (pagoAsaas && !suspensa && !cortesia)) && (
        <div
          className={`fatura-ciclo${cortesia ? ' fatura-ciclo--cortesia' : ''}${encerrada ? ' fatura-ciclo--encerrada' : ''}`}
          role="status"
          aria-label={cortesia ? 'Período cortesia' : encerrada ? 'Cortesia encerrada' : 'Próxima mensalidade'}
        >
          <div className="fatura-ciclo-dias">
            <span className="fatura-ciclo-num">
              {encerrada ? '0' : dias === null || dias === undefined ? '—' : dias}
            </span>
            <span className="fatura-ciclo-unit">
              {encerrada
                ? 'dias restantes'
                : cortesia
                ? dias === 1
                  ? 'dia restante'
                  : 'dias restantes'
                : dias === 1
                  ? 'dia até a próxima'
                  : 'dias até a próxima'}
            </span>
          </div>
          <div className="fatura-ciclo-copy">
            <strong>{conta.status_label}</strong>
            <p>
              {encerrada
                ? (conta.renovacao_label ??
                    `Encerrou em ${conta.cortesia?.ate_formatada ?? '—'} · pague a 1ª mensalidade hoje`)
                : cortesia
                ? (conta.renovacao_label ??
                    `Até ${conta.cortesia?.ate_formatada ?? conta.proxima_cobranca_formatada ?? '—'}${
                      conta.cortesia?.motivo ? ` · ${conta.cortesia.motivo}` : ''
                    }`)
                : (conta.renovacao_label ?? conta.periodicidade_label)}
            </p>
          </div>
        </div>
      )}

      <div
        className={`fatura-card${pagoAsaas && !suspensa && !cortesia ? ' fatura-card--paga' : ''}${cortesia ? ' fatura-card--cortesia' : ''}${encerrada ? ' fatura-card--encerrada' : ''}${suspensa ? ' fatura-card--suspensa' : ''}`}
      >
        <header className="fatura-head">
          <div>
            <p className="fatura-kicker">
              {conta.produto} → {conta.fornecedor}
            </p>
            <h2>{planoTitulo}</h2>
          </div>
          <p
            className="fatura-valor"
            aria-label={cortesia ? 'Valor após a cortesia' : 'Valor da mensalidade'}
          >
            {cortesia ? (
              <>
                <span className="fatura-valor-free">Free</span>
                <small>Tabela {conta.valor_formatado} após</small>
              </>
            ) : (
              <>
                {conta.valor_formatado}
                <small>{conta.periodicidade_label}</small>
              </>
            )}
          </p>
        </header>

        <dl className="fatura-linhas">
          <div>
            <dt>Conta</dt>
            <dd>
              {conta.pagador.razao_social}
              <small>{conta.pagador.codigo}</small>
            </dd>
          </div>
          <div>
            <dt>Meios</dt>
            <dd>
              {conta.meios.join(' ou ')}
              <small>{conta.cofre}</small>
            </dd>
          </div>
          {!permanente ? (
            <div>
              <dt>Situação</dt>
              <dd>
                {conta.status_label}
                <small>
                  {suspensa
                    ? 'Conta suspensa — regularize com PIX ou fale com a TRIGGER.'
                    : cortesia
                      ? `Bonificação vigente até ${conta.cortesia?.ate_formatada ?? '—'}.`
                      : pagoAsaas
                        ? conta.proxima_cobranca_formatada
                          ? `Próxima cobrança em ${conta.proxima_cobranca_formatada}.`
                          : 'Mensalidade autenticada.'
                        : 'Enviar proposta espera esta confirmação.'}
                </small>
              </dd>
            </div>
          ) : null}
          {pagoAsaas && conta.pago_em ? (
            <div>
              <dt>Autenticado</dt>
              <dd>
                {formatDateTime(conta.pago_em)}
                {cortesia ? (
                  <small>
                    Meio OK · 1ª cobrança antecipada em{' '}
                    {conta.primeira_cobranca_formatada ?? conta.proxima_cobranca_formatada ?? '—'}
                  </small>
                ) : null}
              </dd>
            </div>
          ) : null}
          {pagoAsaas && conta.proxima_cobranca_formatada && !permanente && !cortesia ? (
            <div>
              <dt>Próxima</dt>
              <dd>
                {conta.proxima_cobranca_formatada}
                <small>{conta.periodicidade_label}</small>
              </dd>
            </div>
          ) : null}
        </dl>

        {erro ? (
          <div className="alert alert-error" role="alert">
            {erro}
          </div>
        ) : null}

        {retorno === 'asaas' && !pagoAsaas ? (
          <div className="alert alert-info" role="status">
            Você voltou do pagamento. Esta tela atualiza sozinha quando a confirmação chegar.
          </div>
        ) : null}
        {retorno === 'cancelado' && !pagoAsaas ? (
          <div className="alert alert-warning" role="status">
            Pagamento cancelado. Você pode abrir de novo quando quiser.
          </div>
        ) : null}
        {retorno === 'expirado' && !pagoAsaas ? (
          <div className="alert alert-warning" role="status">
            O link de pagamento expirou. Abra um novo quando estiver pronto.
          </div>
        ) : null}

        {suspensa ? (
          <>
            <div className="alert alert-warning" role="status">
              Mensalidade suspensa. O envio de propostas fica bloqueado até regularizar
              {ehInter ? ' com PIX' : ' com a TRIGGER'}.
            </div>
            {ehInter ? (
              <>
                {avisoPixExpirado}
                {blocoPix}
                {!pixCopia ? acoesPagar : null}
              </>
            ) : (
              acoesPagar
            )}
          </>
        ) : cortesia ? (
          <>
            {alertaCortesia && !pagoAsaas ? (
              <div
                className={`alert ${alertaNivel === 'urgent' ? 'alert-error' : alertaNivel === 'warning' ? 'alert-warning' : 'alert-info'}`}
                role="status"
              >
                {dias === 0
                  ? `Licença ativa · cortesia encerra hoje. 1ª mensalidade em ${primeiraFmt ?? 'hoje'}.`
                  : dias === 1
                    ? `Licença ativa · cortesia encerra amanhã. 1ª mensalidade em ${primeiraFmt ?? '—'}.`
                    : `Licença ativa · cortesia por mais ${dias ?? '—'} dias. 1ª mensalidade em ${primeiraFmt ?? '—'}.`}
              </div>
            ) : null}
            {!permanente ? (
              <div className="alert alert-cortesia" role="status">
                Licença ativa no período cortesia. Cadastre a empresa, envie o certificado digital e
                siga para o primeiro orçamento. A 1ª mensalidade ocorre no fim da cortesia.
              </div>
            ) : pagoAsaas ? (
              <div className="alert alert-info" role="status">
                Licença ativa · meio autenticado. 1ª cobrança em {primeiraFmt ?? '—'}; depois
                {ehInter ? ' um novo PIX a cada ciclo.' : ' o ASAAS renova no ciclo.'}
              </div>
            ) : (
              <div className="alert alert-cortesia" role="status">
                Licença ativa · cortesia TRIGGER até {conta.cortesia?.ate_formatada ?? '—'}. A
                mensalidade detalhada fica nesta tela quando quiser antecipar.
              </div>
            )}
            {!pagoAsaas ? (
              <>
                {avisoPixExpirado}
                {blocoPix}
                {!pixCopia ? acoesPagar : null}
              </>
            ) : null}
          </>
        ) : encerrada ? (
          <>
            <div className="alert alert-error" role="status">
              O período cortesia encerrou em {conta.cortesia?.ate_formatada ?? '—'}. Pague a
              mensalidade {ehInter ? 'via PIX' : 'antecipada no cartão'} para continuar enviando
              propostas.
            </div>
            {avisoPixExpirado}
            {blocoPix}
            {!pixCopia ? acoesPagar : null}
          </>
        ) : pagoAsaas ? (
          <>
            {permanente && ehInter && podeGerarPix ? (
              <>
                <div className="alert alert-info" role="status">
                  Ciclo próximo do vencimento. Gere o PIX para renovar a mensalidade.
                </div>
                {avisoPixExpirado}
                {blocoPix}
                {!pixCopia ? acoesPagar : null}
              </>
            ) : permanente ? null : (
              <div className="alert alert-success" role="status">
                Mensalidade confirmada. Cadastre a empresa (menu Empresas), envie o certificado
                digital e siga para o primeiro orçamento.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="alert alert-info" role="status">
              {ehInter
                ? 'Mensalidade via PIX: gere o QR Code, pague e aguarde a confirmação automática.'
                : 'Mensalidade antecipada: você paga o ciclo no cartão antes de usá-lo (ASAAS).'}
            </div>
            {avisoPixExpirado}
            {blocoPix}
            {!pixCopia ? acoesPagar : null}
            {!liberado && data.pode_confirmar_demo && data.billing_provider === 'mock' ? (
              <p className="ativacao-nota">
                Nesta demonstração a confirmação é simulada. Em produção você informa o cartão na
                página do ASAAS e volta para esta tela.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
