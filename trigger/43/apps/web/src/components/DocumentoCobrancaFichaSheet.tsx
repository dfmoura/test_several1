import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { TriggerAttribution } from './TriggerAttribution';
import type { Faturamento, Titulo } from '../lib/api';
import { BRAND } from '../lib/brand';
import { cobrancaVigente, nfeReferencia, saldoAberto } from '../lib/cobrancaUi';
import { formatCurrency, formatDate } from '../lib/format';
import { titStatusLabel } from '../lib/comprasUi';

type Props = {
  fat: Faturamento;
  titulo: Titulo;
  emitidoPor: string;
  emitidoEm: Date;
};

function Kv({ label, value }: { label: string; value?: string | null }) {
  const v = (value ?? '').trim();
  return (
    <div className="ficha-kv">
      <span className="ficha-kv-label">{label}</span>
      <strong className="ficha-kv-value">{v !== '' ? v : '—'}</strong>
    </div>
  );
}

export function DocumentoCobrancaFichaSheet({ fat, titulo, emitidoPor, emitidoEm }: Props) {
  const cob = cobrancaVigente(titulo);
  const aberto = saldoAberto(titulo);
  const pix = aberto ? cob?.pix_copia_cola ?? null : null;
  const linha = aberto ? cob?.linha_digitavel ?? null : null;
  const qrPronta = aberto ? cob?.pix_qr_base64 ?? null : null;
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const nfe = nfeReferencia(fat);
  const nParc = fat.titulos?.length ?? titulo.n_dup ?? 1;
  const parcela = titulo.parcela ?? 1;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pix) {
        setQrUrl(null);
        return;
      }
      if (qrPronta && qrPronta.length > 40) {
        setQrUrl(qrPronta.startsWith('data:') ? qrPronta : `data:image/png;base64,${qrPronta}`);
        return;
      }
      try {
        const url = await QRCode.toDataURL(pix, {
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
  }, [pix, qrPronta]);

  return (
    <article className="ficha-sheet ficha-sheet-cobranca" aria-label="Documento de cobrança">
      <header className="cobranca-head">
        <img src={BRAND.licensee.logo} alt="" className="cobranca-logo" />
        <div>
          <p className="cobranca-kicker">Documento de cobrança</p>
          <h1>
            <code>{titulo.codigo}</code>
          </h1>
          <p className="muted">
            {fat.codigo}
            {fat.pedido?.codigo ? ` · ${fat.pedido.codigo}` : ''}
            {` · parcela ${parcela}/${nParc}`}
          </p>
        </div>
      </header>

      <p className={`cobranca-banner${aberto ? '' : ' is-quitado'}`}>
        {aberto
          ? 'Cobrança do saldo do faturamento. Não é documento fiscal.'
          : 'Título sem saldo em aberto. Este papel é só o histórico da cobrança.'}
      </p>

      <div className="ficha-kv-grid cols-2">
        <Kv label="Destinatário" value={fat.parceiro?.razao_social ?? titulo.parceiro?.razao_social} />
        <Kv
          label="Natureza"
          value={
            titulo.natureza
              ? `${titulo.natureza.codigo_exibicao ?? titulo.natureza.codigo} · ${titulo.natureza.nome}`
              : null
          }
        />
        <Kv label="Emissão" value={titulo.emissao ? formatDate(titulo.emissao) : null} />
        <Kv label="Vencimento" value={titulo.vencimento ? formatDate(titulo.vencimento) : null} />
        <Kv label="Condição" value={fat.condicao_pagamento} />
        <Kv label="Forma" value={fat.forma_pagamento} />
      </div>

      <section className="cobranca-desc">
        <h2>Título</h2>
        <p>{titulo.observacao?.trim() || titulo.documento || `${fat.codigo} · parcela ${parcela}`}</p>
      </section>

      <div className="ficha-kv-grid cols-3 cobranca-valores">
        <Kv label="Valor do título" value={formatCurrency(titulo.valor)} />
        <Kv label="Adiantamento no FAT" value={formatCurrency(fat.valor_adiantamento)} />
        <div className="ficha-kv cobranca-saldo-kv">
          <span className="ficha-kv-label">Saldo em aberto</span>
          <strong className="ficha-kv-value cobranca-saldo">{formatCurrency(titulo.saldo)}</strong>
        </div>
      </div>

      <p className="cobranca-status">
        Situação: <strong>{titStatusLabel(titulo.status)}</strong>
        {cob ? ` · cobrança ${cob.codigo} (${cob.status})` : ' · sem PIX/boleto emitido'}
      </p>

      {pix || linha ? (
        <section className="cobranca-pay" aria-label="Instrumento de pagamento">
          {pix ? (
            <div className="cobranca-qr">
              {qrUrl ? <img src={qrUrl} alt="QR Code PIX" /> : <p className="muted">Gerando QR…</p>}
              <p className="cobranca-pay-label">PIX</p>
            </div>
          ) : null}
          <div className="cobranca-pay-txt">
            {pix ? (
              <>
                <p className="cobranca-pay-label">PIX copia e cola</p>
                <p className="cobranca-copia">{pix}</p>
              </>
            ) : null}
            {linha ? (
              <>
                <p className="cobranca-pay-label">Linha digitável</p>
                <p className="cobranca-copia">{linha}</p>
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="form-hint">
          {aberto
            ? 'Sem instrumento PIX/boleto nesta parcela (transferência ou cartão). O saldo acima é o que falta quitar.'
            : null}
        </p>
      )}

      {nfe ? (
        <p className="cobranca-nfe-ref">
          Referência fiscal
          {nfe.numero ? ` · NF-e nº ${nfe.numero}` : ''}
          {nfe.chave ? ` · chave ${nfe.chave}` : ''}
          . A nota é o outro documento deste faturamento.
        </p>
      ) : (
        <p className="cobranca-nfe-ref">NF-e deste faturamento ainda sem autorização. A cobrança não espera a nota.</p>
      )}

      <footer className="ficha-footer cobranca-foot">
        <span>
          Cobrança · {titulo.codigo} · {emitidoPor} · {emitidoEm.toLocaleString('pt-BR')}
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}
