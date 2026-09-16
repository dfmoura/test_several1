import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { KeyboardEvent } from 'react';
import type { UseEstoqueQrFilaReturn } from '../hooks/useEstoqueQrFila';
import {
  estoqueQrStatusVolume,
  estoqueQrTemLocalErrado,
} from '../lib/estoqueQrFila';
import { formatDate, formatQty } from '../lib/format';

type Props = {
  qr: UseEstoqueQrFilaReturn;
  idPrefix?: string;
  /** Texto do botão de confirmação da fila (ex.: Guardar / Usar na contagem). */
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  /** Desabilita o botão de confirmação além das regras da fila. */
  confirmDisabled?: boolean;
  /** Rótulo curto do botão secundário explícito (opcional). */
  confirmSecondaryLabel?: string;
  hint?: ReactNode;
  /** Exibe alerta + CTA Guardar quando algum volume está em outro vão. */
  avisarLocalErrado?: boolean;
  /** Classe/estilo do card wrapper — null = sem card. */
  embedded?: boolean;
};

/**
 * Painel canônico: ordem Local↔Volume, fila multi-volume, local confirmado.
 * A leitura não grava — só o botão de confirmação (quando fornecido).
 */
export function EstoqueQrFilaPanel({
  qr,
  idPrefix = 'estoque_qr',
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  confirmSecondaryLabel,
  hint,
  avisarLocalErrado = true,
  embedded = false,
}: Props) {
  const {
    volRef,
    endRef,
    ordem,
    volumeQr,
    setVolumeQr,
    enderecoQr,
    setEnderecoQr,
    fila,
    endereco,
    error,
    msg,
    busy,
    canWrite,
    trocarOrdem,
    adicionarVolume,
    removerDaFila,
    resolverLocal,
    limparTudo,
    focusPrimeiro,
    setMsg,
  } = qr;

  const nFila = fila.length;
  const podeConfirmar = nFila > 0 && Boolean(endereco) && canWrite && !busy && !confirmDisabled;
  const temLocalErrado = avisarLocalErrado && estoqueQrTemLocalErrado(fila, endereco);

  const labelVol = ordem === 'vao_primeiro' ? '2. Incluir volume (VOL:…)' : '1. Incluir volume (VOL:…)';
  const labelEnd = ordem === 'vao_primeiro' ? '1. Local (END:…)' : '2. Local (END:…)';

  const submitLabel = busy
    ? 'Processando…'
    : volumeQr.trim()
      ? 'Incluir na fila'
      : podeConfirmar && confirmLabel
        ? confirmLabel
        : nFila === 0
          ? 'Inclua volumes na fila'
          : !endereco
            ? 'Confirme o local'
            : confirmLabel ?? 'Pronto';

  const submitDisabled =
    busy ||
    !canWrite ||
    (!volumeQr.trim() && !(podeConfirmar && onConfirm));

  const onVolKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void adicionarVolume(volumeQr);
    }
  };

  const onEndKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void resolverLocal(enderecoQr);
    }
  };

  const campoVolume = (
    <div className="form-group" key="vol">
      <label htmlFor={`${idPrefix}_volume_qr`}>{labelVol}</label>
      <input
        id={`${idPrefix}_volume_qr`}
        ref={volRef}
        value={volumeQr}
        onChange={(e) => setVolumeQr(e.target.value)}
        onKeyDown={onVolKey}
        placeholder="Leia o QR — Enter inclui na fila (ainda não grava)"
        autoComplete="off"
        disabled={busy || !canWrite}
      />
    </div>
  );

  const campoVao = (
    <div className="form-group" key="end">
      <label htmlFor={`${idPrefix}_endereco_qr`}>{labelEnd}</label>
      <input
        id={`${idPrefix}_endereco_qr`}
        ref={endRef}
        value={enderecoQr}
        onChange={(e) => setEnderecoQr(e.target.value)}
        onKeyDown={onEndKey}
        placeholder={
          endereco
            ? 'Local ativo — leia outro END para trocar'
            : 'Leia o QR do local (registro só ao confirmar)'
        }
        autoComplete="off"
        disabled={busy || !canWrite}
      />
    </div>
  );

  const previewVao = endereco ? (
    <div className="alert alert-info" style={{ margin: 0 }} key="end-prev">
      <strong>Local {endereco.codigo}</strong>
      <div className="muted">
        Prat. {endereco.prateleira} · Col. {endereco.coluna} · Local {endereco.vao}
        {nFila > 0 ? ` · ${nFila} volume${nFila === 1 ? '' : 's'} na fila` : ' · aguardando volumes'}
      </div>
    </div>
  ) : null;

  const listaFila =
    nFila > 0 ? (
      <div key="fila" style={{ display: 'grid', gap: '0.5rem' }}>
        <div className="muted" style={{ fontSize: '0.9rem' }}>
          Fila — {nFila} volume{nFila === 1 ? '' : 's'} (ainda sem registro
          {endereco ? `; local ${endereco.codigo}` : ''})
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Volume</th>
                <th>Produto</th>
                <th>Qtde</th>
                <th>Hoje / status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fila.map((v, idx) => {
                const st = estoqueQrStatusVolume(v, endereco);
                const statusTxt =
                  st === 'LOCAL_ERRADO'
                    ? `local errado (${v.endereco?.codigo ?? '—'})`
                    : st === 'ENCONTRADO'
                      ? endereco!.codigo
                      : (v.endereco?.codigo ?? 'sem local');
                return (
                  <tr key={v.lote_id}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{v.codigo}</strong>
                      {(v.nf_numero || v.data_entrada) && (
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          NF {v.nf_numero ?? '—'}
                          {v.data_entrada ? ` · ${formatDate(v.data_entrada)}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      {v.produto ? (
                        <>
                          <strong>{v.produto.codigo}</strong>
                          <div className="muted" style={{ fontSize: '0.85rem' }}>
                            {v.produto.descricao_fiscal}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {formatQty(v.qtde)} {v.unidade}
                    </td>
                    <td className={st === 'LOCAL_ERRADO' ? 'alert-error' : 'muted'}>{statusTxt}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => removerDaFila(v.lote_id)}
                        aria-label={`Remover volume ${v.codigo} da fila`}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <p className="muted" key="fila-vazia" style={{ margin: 0 }}>
        Nenhum volume na fila. Leia 1 ou mais QRs de volume (Enter) antes de confirmar o local.
      </p>
    );

  const campos =
    ordem === 'vao_primeiro'
      ? [campoVao, previewVao, campoVolume, listaFila]
      : [campoVolume, listaFila, campoVao, previewVao];

  const body = (
    <>
      <div className="tabs" role="tablist" aria-label="Ordem de leitura" style={{ maxWidth: '42rem' }}>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'volume_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'volume_primeiro'}
          onClick={() => trocarOrdem('volume_primeiro')}
        >
          Volume → local
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'vao_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'vao_primeiro'}
          onClick={() => trocarOrdem('vao_primeiro')}
        >
          Local → volume
        </button>
      </div>
      <p className="catalogo-tab-hint" style={{ maxWidth: '42rem', marginTop: '-0.5rem' }}>
        {ordem === 'vao_primeiro'
          ? 'Na estante: confirme o local, monte a fila de volumes e só então confirme.'
          : 'Com volumes em mãos: monte a fila, confirme o local e só então confirme.'}{' '}
        A leitura não grava — só o botão de confirmação.
      </p>

      {msg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {msg}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {temLocalErrado && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          Há volume(s) com <strong>local diferente</strong> do END lido. A quantidade entra na
          contagem; o endereço corrige-se no{' '}
          <Link to="/estoque/guardar">Guardar no local</Link> — não no ajuste.
        </div>
      )}

      <div
        className={embedded ? undefined : 'card'}
        style={embedded ? undefined : { maxWidth: '42rem', marginBottom: '1rem' }}
      >
        <div
          className={embedded ? undefined : 'card-body'}
          style={{ display: 'grid', gap: '1rem' }}
        >
          {campos}

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitDisabled}
              onClick={() => {
                if (volumeQr.trim()) {
                  void adicionarVolume(volumeQr);
                  return;
                }
                if (!endereco && enderecoQr.trim()) {
                  void resolverLocal(enderecoQr);
                  return;
                }
                if (onConfirm && podeConfirmar) {
                  void onConfirm();
                }
              }}
            >
              {submitLabel}
            </button>
            {onConfirm && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !podeConfirmar}
                onClick={() => {
                  void onConfirm();
                }}
                title={
                  !endereco
                    ? 'Confirme o local antes'
                    : nFila === 0
                      ? 'Inclua volumes na fila'
                      : undefined
                }
              >
                {confirmSecondaryLabel ??
                  (endereco && nFila > 0
                    ? nFila === 1
                      ? `Confirmar 1 volume em ${endereco.codigo}`
                      : `Confirmar ${nFila} volumes em ${endereco.codigo}`
                    : 'Confirmar fila')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                limparTudo();
                setMsg(null);
                focusPrimeiro();
              }}
            >
              Limpar
            </button>
          </div>

          {!canWrite && (
            <p className="muted" style={{ margin: 0 }}>
              Somente leitura — precisa de estoque.escrever.
            </p>
          )}
        </div>
      </div>

      {hint && (
        <p className="muted" style={{ maxWidth: '42rem' }}>
          {hint}
        </p>
      )}
    </>
  );

  return body;
}
