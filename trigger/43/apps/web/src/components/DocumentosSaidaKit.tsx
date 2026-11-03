import type { PaEmbalagemResumo } from '../lib/api';
import {
  embalagensImprimiveis,
  hrefEtiquetasEmbalagem,
  hrefFichaCobranca,
  hrefFichaNfe,
} from '../lib/cobrancaUi';
import { hrefRomaneio } from '../lib/expedicaoUi';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatCurrency } from '../lib/format';

type TituloKit = {
  id: number;
  codigo: string;
  saldo: string;
};

type NfeKit = {
  faturamento_id: number;
  documento_id: number;
  codigo?: string;
};

type Props = {
  entregaId?: number | null;
  faturamentoId?: number | null;
  nfe?: NfeKit | null;
  titulos?: TituloKit[] | null;
  embalagem?: PaEmbalagemResumo | null;
};

/**
 * Três papéis do despacho: romaneio, DANFE/prévia, cobrança + etiquetas BOB/CX.
 * Só abre fichas existentes. Não baixa título.
 * Etiquetas: um link por pa_embalagens (ADR — rota por embId).
 */
export function DocumentosSaidaKit({
  entregaId,
  faturamentoId,
  nfe,
  titulos,
  embalagem,
}: Props) {
  const fatId = faturamentoId ?? nfe?.faturamento_id ?? null;
  const cobrancas = fatId ? (titulos ?? []) : [];
  const embImprimir = embalagensImprimiveis(embalagem);
  const temAlgo = Boolean(entregaId || (fatId && nfe) || cobrancas.length || embImprimir.length);
  if (!temAlgo) {
    return null;
  }

  return (
    <div className="form-section" style={{ marginTop: '1rem' }}>
      <h3>Documentos da saída</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Embalagem no volume, nota e cobrança no envelope. Confirmar a entrega não quita o título.
      </p>
      <div className="btn-row" style={{ flexWrap: 'wrap' }}>
        {entregaId ? (
          <a
            href={hrefRomaneio(entregaId)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefRomaneio(entregaId))}
          >
            Imprimir romaneio
          </a>
        ) : null}
        {fatId && nfe ? (
          <a
            href={hrefFichaNfe(fatId, nfe.documento_id)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefFichaNfe(fatId, nfe.documento_id))}
          >
            Imprimir nota
          </a>
        ) : null}
        {embImprimir.map((emb) => {
          const href = hrefEtiquetasEmbalagem(emb.id);
          const rotulo =
            embImprimir.length === 1
              ? 'Etiquetas da embalagem'
              : `Etiquetas ${emb.codigo}`;
          return (
            <a
              key={emb.id}
              href={href}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, href)}
              title={emb.resumo}
            >
              {rotulo}
            </a>
          );
        })}
        {cobrancas.map((t) => (
          <a
            key={t.id}
            href={hrefFichaCobranca(fatId as number, t.id)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefFichaCobranca(fatId as number, t.id))}
          >
            Imprimir cobrança {t.codigo}
            {Number.parseFloat(t.saldo) > 0 ? ` · ${formatCurrency(t.saldo)}` : ''}
          </a>
        ))}
      </div>
      {embImprimir.length === 0 ? (
        <p className="form-hint">Confirme a embalagem na OP para imprimir BOB/CX neste kit.</p>
      ) : null}
      {fatId && !nfe ? (
        <p className="form-hint">Nota ainda sem documento neste faturamento.</p>
      ) : null}
    </div>
  );
}
